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
      if (card.example !== undefined && (typeof card.example !== 'string' || card.example.length > 500)) return false
      return ['term', 'definition'].every(k => typeof card[k] === 'string' && card[k].trim() && card[k].length <= 500) && Number.isInteger(card.level) && card.level >= 0 && card.level <= 6 && Number.isFinite(card.due) && card.due >= 0
    })
  })
}

async function hashPassword(password) {
  const salt = hex(crypto.getRandomValues(new Uint8Array(16)))
  const key = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, ['deriveBits'])
  return `pbkdf2:100000:${salt}:${hex(await crypto.subtle.deriveBits({ name: 'PBKDF2', salt: encoder.encode(salt), iterations: 100000, hash: 'SHA-256' }, key, 256))}`
}
async function accountToken(secret, user) {
  const payload = `${Math.floor(Date.now() / 1000) + ttl}.${user.id}.${user.version}`
  return `${payload}.${hex(await crypto.subtle.sign('HMAC', await hmacKey(secret), encoder.encode(payload)))}`
}
async function accountSession(request, secret) {
  const value = (request.headers.get('cookie') || '').split(';').map(s => s.trim()).find(s => s.startsWith(`${cookieName}=`))?.slice(cookieName.length + 1)
  if (!value || !/^\d{10}\.[a-z0-9-]{1,80}\.\d+\.[a-f0-9]{64}$/.test(value)) return null
  const [expires, id, version, signature] = value.split('.')
  const payload = `${expires}.${id}.${version}`
  return Number(expires) > Date.now() / 1000 && await crypto.subtle.verify('HMAC', await hmacKey(secret), unhex(signature), encoder.encode(payload)) ? { id, version: Number(version) } : null
}


async function database(env) {
  if (!env.LEARNING_DB) throw new Error('Missing database binding')
  // Force primary reads so another device immediately sees acknowledged writes.
  const db = env.LEARNING_DB.withSession ? env.LEARNING_DB.withSession('first-primary') : env.LEARNING_DB
  await db.batch([
    db.prepare('CREATE TABLE IF NOT EXISTS learning_workspace (id TEXT PRIMARY KEY, data TEXT NOT NULL, revision TEXT NOT NULL)'),
    db.prepare('CREATE TABLE IF NOT EXISTS learning_users (id TEXT PRIMARY KEY, username TEXT NOT NULL UNIQUE, name TEXT NOT NULL, password TEXT NOT NULL, role TEXT NOT NULL, disabled INTEGER NOT NULL DEFAULT 0, version INTEGER NOT NULL DEFAULT 1)'),
    db.prepare('CREATE TABLE IF NOT EXISTS learning_attempts (id TEXT PRIMARY KEY, attempts INTEGER NOT NULL, expires INTEGER NOT NULL)'),
  ])
  await db.prepare("INSERT INTO learning_users (id, username, name, password, role) VALUES ('grace', 'grace', 'Grace', ?, 'learner') ON CONFLICT DO NOTHING").bind(env.LEARNING_PASSWORD_HASH).run()
  return db
}

const publicUser = user => ({ id: user.id, username: user.username, name: user.name, role: user.role, disabled: Boolean(user.disabled) })
async function currentUser(request, env, db) {
  const session = await accountSession(request, env.LEARNING_SESSION_SECRET)
  if (!session) return null
  if (session.id === 'admin') return env.LEARNING_ADMIN_PASSWORD_HASH && session.version === 1 ? { id: 'admin', username: 'admin', name: 'Admin', role: 'admin', version: 1 } : null
  const user = await db.prepare('SELECT * FROM learning_users WHERE id = ?').bind(session.id).first()
  return user && !user.disabled && user.version === session.version ? user : null
}

async function handleUsers(request, env) {
  if (!configured(env)) return reply({ error: 'Der Lernbereich wird noch eingerichtet.' }, 503)
  const db = await database(env), admin = await currentUser(request, env, db)
  if (!admin) return reply({ error: 'Bitte melde dich erneut an.' }, 401)
  if (admin.role !== 'admin') return reply({ error: 'Nur für die Verwaltung.' }, 403)
  if (request.method === 'GET') {
    const result = await db.prepare('SELECT id, username, name, role, disabled FROM learning_users ORDER BY username').all()
    return reply({ users: result.results.map(publicUser) })
  }
  if (!sameOrigin(request)) return reply({ error: 'Ungültige Anfrage.' }, 403)
  if (!['POST', 'PUT'].includes(request.method)) return reply({ error: 'Methode nicht erlaubt.' }, 405)
  const text = await request.text()
  if (text.length > 4096) return reply({ error: 'Anfrage zu groß.' }, 413)
  let body
  try { body = JSON.parse(text) } catch { return reply({ error: 'Ungültige Anfrage.' }, 400) }
  const username = typeof body?.username === 'string' ? body.username.trim().toLowerCase() : ''
  const name = typeof body?.name === 'string' ? body.name.trim() : ''
  if (!/^[a-z0-9][a-z0-9._-]{2,39}$/.test(username) || username === 'admin' || !name || name.length > 80 || typeof body.password !== 'string' || (body.password && (body.password.length < 14 || body.password.length > 256)) || typeof body.disabled !== 'boolean') return reply({ error: 'Name, Benutzername (3–40 Zeichen) und Passwort (14–256 Zeichen) prüfen.' }, 400)
  const creating = request.method === 'POST'
  if (creating && !body.password) return reply({ error: 'Bitte ein Passwort festlegen.' }, 400)
  const existing = creating ? null : await db.prepare('SELECT * FROM learning_users WHERE id = ?').bind(typeof body.id === 'string' ? body.id : '').first()
  if (!creating && !existing) return reply({ error: 'Konto nicht gefunden.' }, 404)
  const duplicate = await db.prepare('SELECT id FROM learning_users WHERE username = ?').bind(username).first()
  if (duplicate && duplicate.id !== existing?.id) return reply({ error: 'Dieser Benutzername ist bereits vergeben.' }, 409)
  const password = body.password ? await hashPassword(body.password) : existing.password
  try {
    if (creating) await db.prepare("INSERT INTO learning_users (id, username, name, password, role, disabled) VALUES (?, ?, ?, ?, 'learner', ?)").bind(crypto.randomUUID(), username, name, password, Number(body.disabled)).run()
    else await db.prepare('UPDATE learning_users SET username = ?, name = ?, password = ?, disabled = ?, version = version + 1 WHERE id = ?').bind(username, name, password, Number(body.disabled), existing.id).run()
  } catch (e) { if (String(e).includes('UNIQUE')) return reply({ error: 'Dieser Benutzername ist bereits vergeben.' }, 409); throw e }
  return reply({ saved: true }, creating ? 201 : 200)
}

async function handleAuth(request, env) {
  if (!configured(env)) return reply({ error: 'Der Lernbereich wird noch eingerichtet. Bitte versuche es später erneut.' }, 503)
  if (request.method === 'GET') { const user = await currentUser(request, env, await database(env)); return reply({ authenticated: Boolean(user), user: user ? publicUser(user) : null }) }
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
  const username = typeof body.username === 'string' ? body.username.trim().toLowerCase() : 'grace'
  const user = username === 'admin'
    ? (env.LEARNING_ADMIN_PASSWORD_HASH ? { id: 'admin', username: 'admin', name: 'Admin', role: 'admin', version: 1, password: env.LEARNING_ADMIN_PASSWORD_HASH } : null)
    : await db.prepare('SELECT * FROM learning_users WHERE username = ?').bind(username).first()
  const matches = await verifyPassword(body.password, user?.password || env.LEARNING_PASSWORD_HASH)
  if (!user || user.disabled || !matches) return reply({ error: 'Benutzername oder Passwort stimmt leider nicht.' }, 401)
  return reply({ authenticated: true, user: publicUser(user) }, 200, { 'Set-Cookie': cookie(await accountToken(env.LEARNING_SESSION_SECRET, user)) })
}

async function handleData(request, env) {
  if (!configured(env)) return reply({ error: 'Der Lernbereich wird noch eingerichtet.' }, 503)
  const db = await database(env), user = await currentUser(request, env, db)
  if (!user) return reply({ error: 'Bitte melde dich erneut an.' }, 401)
  if (!['GET', 'PUT'].includes(request.method)) return reply({ error: 'Methode nicht erlaubt.' }, 405)
  if (request.method === 'PUT' && !sameOrigin(request)) return reply({ error: 'Ungültige Anfrage.' }, 403)
  if (user.role !== 'learner') return reply({ error: 'Bitte ein Lernkonto verwenden.' }, 403)
  if (request.method === 'GET') {
    const row = await db.prepare('SELECT data, revision FROM learning_workspace WHERE id = ?').bind(user.id).first()
    return reply({ data: row ? JSON.parse(row.data) : { decks: [] }, revision: row?.revision || null })
  }
  if (request.headers.get('X-Learning-User') !== user.id) return reply({ error: 'Das aktive Konto hat sich geändert. Bitte lade die Seite neu.' }, 409)
  const text = await request.text()
  if (new TextEncoder().encode(text).length > 1500000) return reply({ error: 'Die Sammlung ist zu groß (max. 1,5 MB).' }, 413)
  let body
  try { body = JSON.parse(text) } catch { return reply({ error: 'Ungültige Daten.' }, 400) }
  if (!validData(body?.data) || !(body.revision === null || typeof body.revision === 'string')) return reply({ error: 'Ungültige Lerndaten.' }, 400)
  const revision = crypto.randomUUID()
  const result = body.revision === null
    ? await db.prepare('INSERT INTO learning_workspace (id, data, revision) VALUES (?, ?, ?) ON CONFLICT(id) DO NOTHING').bind(user.id, JSON.stringify(body.data), revision).run()
    : await db.prepare('UPDATE learning_workspace SET data = ?, revision = ? WHERE id = ? AND revision = ?').bind(JSON.stringify(body.data), revision, user.id, body.revision).run()
  if (result.meta.changes !== 1) return reply({ error: 'Auf einem anderen Gerät wurde etwas geändert. Sichere deine Änderungen als Backup und lade die Seite neu.' }, 409)
  return reply({ revision })
}

export default {
  async fetch(request, env) {
    const path = new URL(request.url).pathname
    if (!path.startsWith('/api/learning/')) return env.ASSETS.fetch(request)
    try {
      if (path === '/api/learning/auth') return await handleAuth(request, env)
      if (path === '/api/learning/users') return await handleUsers(request, env)
      if (path === '/api/learning/data') return await handleData(request, env)
      return reply({ error: 'Nicht gefunden.' }, 404)
    } catch { return reply({ error: 'Der Lernserver ist gerade nicht verfügbar. Bitte versuche es erneut.' }, 503) }
  },
}
