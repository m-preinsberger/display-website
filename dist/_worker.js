const encoder = new TextEncoder()
const hex = bytes => Array.from(new Uint8Array(bytes), b => b.toString(16).padStart(2, '0')).join('')
const unhex = value => Uint8Array.from(value.match(/../g), pair => parseInt(pair, 16))
async function hmacKey(secret) {
  return crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify'])
}

const cookieName = '__Host-grace'
const ttl = 60 * 60 * 12
function configured(env) {
  return typeof env.LEARNING_PASSWORD_HASH === 'string' && /^pbkdf2:100000:[a-f0-9]{32}:[a-f0-9]{64}$/.test(env.LEARNING_PASSWORD_HASH) && env.LEARNING_SESSION_SECRET?.length >= 32
}
async function verifyPassword(password, encoded) {
  if (typeof password !== 'string' || password.length > 256) return false
  const [, iterations, salt, hash] = encoded.split(':')
  const key = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, ['deriveBits'])
  const derived = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt: encoder.encode(salt), iterations: Number(iterations), hash: 'SHA-256' }, key, 256)
  // HMAC verification avoids a variable-time string comparison of password hashes.
  const comparisonKey = await hmacKey(hash)
  const signature = await crypto.subtle.sign('HMAC', comparisonKey, unhex(hash))
  return crypto.subtle.verify('HMAC', comparisonKey, signature, derived)
}
async function token(secret, now = Date.now()) {
  const expires = String(Math.floor(now / 1000) + ttl)
  return `${expires}.${hex(await crypto.subtle.sign('HMAC', await hmacKey(secret), encoder.encode(expires)))}`
}
async function authorized(request, secret, now = Date.now()) {
  const value = (request.headers.get('cookie') || '').split(';').map(s => s.trim()).find(s => s.startsWith(`${cookieName}=`))?.slice(cookieName.length + 1)
  if (!value || !/^\d{10}\.[a-f0-9]{64}$/.test(value)) return false
  const [expires, signature] = value.split('.')
  return Number(expires) > now / 1000 && crypto.subtle.verify('HMAC', await hmacKey(secret), unhex(signature), encoder.encode(expires))
}
function cookie(value, maxAge = ttl) {
  return `${cookieName}=${value}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${maxAge}`
}
function reply(body, status = 200, headers = {}) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex', ...headers } })
}
function sameOrigin(request) {
  return request.headers.get('origin') === new URL(request.url).origin
}
function validData(data) {
  if (!data || !Array.isArray(data.decks) || data.decks.length > 100) return false
  const ids = new Set()
  return data.decks.every(deck => {
    if (!deck || typeof deck.id !== 'string' || deck.id.length > 80 || ids.has(deck.id)) return false
    ids.add(deck.id)
    if (typeof deck.title !== 'string' || !deck.title.trim() || deck.title.length > 100 || ![1, 2, 3].includes(deck.year) || !Array.isArray(deck.cards) || deck.cards.length > 1000) return false
    const cardIds = new Set()
    return deck.cards.every(card => {
      if (!card || typeof card.id !== 'string' || card.id.length > 80 || cardIds.has(card.id)) return false
      cardIds.add(card.id)
      return ['term', 'definition'].every(k => typeof card[k] === 'string' && card[k].trim() && card[k].length <= 500) && Number.isInteger(card.level) && card.level >= 0 && card.level <= 6 && Number.isFinite(card.due) && card.due >= 0
    })
  })
}


async function database(env) {
  if (!env.LEARNING_DB) throw new Error('Missing database binding')
  // Force primary reads so another device immediately sees acknowledged writes.
  const db = env.LEARNING_DB.withSession ? env.LEARNING_DB.withSession('first-primary') : env.LEARNING_DB
  await db.batch([
    db.prepare('CREATE TABLE IF NOT EXISTS learning_workspace (id TEXT PRIMARY KEY, data TEXT NOT NULL, revision TEXT NOT NULL)'),
    db.prepare('CREATE TABLE IF NOT EXISTS learning_attempts (id TEXT PRIMARY KEY, attempts INTEGER NOT NULL, expires INTEGER NOT NULL)'),
  ])
  return db
}

async function handleAuth(request, env) {
  if (!configured(env)) return reply({ error: 'Der Lernbereich wird noch eingerichtet. Bitte versuche es später erneut.' }, 503)
  if (request.method === 'GET') return reply({ authenticated: await authorized(request, env.LEARNING_SESSION_SECRET) })
  if (!sameOrigin(request)) return reply({ error: 'Ungültige Anfrage.' }, 403)
  if (request.method === 'DELETE') return reply({ authenticated: false }, 200, { 'Set-Cookie': cookie('', 0) })
  if (request.method !== 'POST') return reply({ error: 'Methode nicht erlaubt.' }, 405)
  let body
  try {
    const text = await request.text()
    if (text.length > 1024) return reply({ error: 'Anfrage zu groß.' }, 413)
    body = JSON.parse(text)
    if (!body || typeof body.password !== 'string') return reply({ error: 'Ungültige Anfrage.' }, 400)
  } catch { return reply({ error: 'Ungültige Anfrage.' }, 400) }
  const db = await database(env)
  const minute = Math.floor(Date.now() / 60000)
  const ip = request.headers.get('CF-Connecting-IP') || 'local'
  const key = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`${env.LEARNING_SESSION_SECRET}:${ip}:${minute}`))), b => b.toString(16).padStart(2, '0')).join('')
  await db.prepare('DELETE FROM learning_attempts WHERE expires < ?').bind(minute).run()
  const attempt = await db.prepare('INSERT INTO learning_attempts (id, attempts, expires) VALUES (?, 1, ?) ON CONFLICT(id) DO UPDATE SET attempts = attempts + 1 RETURNING attempts').bind(key, minute + 2).first()
  if (attempt.attempts > 10) return reply({ error: 'Zu viele Versuche. Bitte warte eine Minute.' }, 429, { 'Retry-After': '60' })
  if (!await verifyPassword(body.password, env.LEARNING_PASSWORD_HASH)) return reply({ error: 'Das Passwort stimmt leider nicht.' }, 401)
  return reply({ authenticated: true }, 200, { 'Set-Cookie': cookie(await token(env.LEARNING_SESSION_SECRET)) })
}

async function handleData(request, env) {
  if (!configured(env)) return reply({ error: 'Der Lernbereich wird noch eingerichtet.' }, 503)
  if (!await authorized(request, env.LEARNING_SESSION_SECRET)) return reply({ error: 'Bitte melde dich erneut an.' }, 401)
  if (!['GET', 'PUT'].includes(request.method)) return reply({ error: 'Methode nicht erlaubt.' }, 405)
  if (request.method === 'PUT' && !sameOrigin(request)) return reply({ error: 'Ungültige Anfrage.' }, 403)
  const db = await database(env)
  if (request.method === 'GET') {
    const row = await db.prepare('SELECT data, revision FROM learning_workspace WHERE id = ?').bind('grace').first()
    return reply({ data: row ? JSON.parse(row.data) : { decks: [] }, revision: row?.revision || null })
  }
  const text = await request.text()
  if (new TextEncoder().encode(text).length > 1500000) return reply({ error: 'Die Sammlung ist zu groß (max. 1,5 MB).' }, 413)
  let body
  try { body = JSON.parse(text) } catch { return reply({ error: 'Ungültige Daten.' }, 400) }
  if (!validData(body?.data) || !(body.revision === null || typeof body.revision === 'string')) return reply({ error: 'Ungültige Lerndaten.' }, 400)
  const revision = crypto.randomUUID()
  const result = body.revision === null
    ? await db.prepare('INSERT INTO learning_workspace (id, data, revision) VALUES (?, ?, ?) ON CONFLICT(id) DO NOTHING').bind('grace', JSON.stringify(body.data), revision).run()
    : await db.prepare('UPDATE learning_workspace SET data = ?, revision = ? WHERE id = ? AND revision = ?').bind(JSON.stringify(body.data), revision, 'grace', body.revision).run()
  if (result.meta.changes !== 1) return reply({ error: 'Auf einem anderen Gerät wurde etwas geändert. Sichere deine Änderungen als Backup und lade die Seite neu.' }, 409)
  return reply({ revision })
}

export default {
  async fetch(request, env) {
    const path = new URL(request.url).pathname
    if (!path.startsWith('/api/learning/')) return env.ASSETS.fetch(request)
    try {
      if (path === '/api/learning/auth') return await handleAuth(request, env)
      if (path === '/api/learning/data') return await handleData(request, env)
      return reply({ error: 'Nicht gefunden.' }, 404)
    } catch { return reply({ error: 'Der Lernserver ist gerade nicht verfügbar. Bitte versuche es erneut.' }, 503) }
  },
}
