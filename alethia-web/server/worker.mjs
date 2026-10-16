import { configured, verifyPassword, token, authorized, cookie, reply, sameOrigin, validData } from './security.mjs'

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

export async function handleAuth(request, env) {
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

export async function handleData(request, env) {
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
