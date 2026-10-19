import test from 'node:test'
import assert from 'node:assert/strict'
import { pbkdf2Sync } from 'node:crypto'
import { DatabaseSync } from 'node:sqlite'
import { authorized, token, cookie, configured, verifyPassword, validData } from '../server/security.mjs'
import worker from '../server/worker.mjs'
const secret = 'test-secret-that-is-at-least-thirty-two-characters'
const salt = 'a'.repeat(32)
const hash = `pbkdf2:100000:${salt}:${pbkdf2Sync('test-password', salt, 100000, 32, 'sha256').toString('hex')}`
function database() {
  const sqlite = new DatabaseSync(':memory:')
  return {
    withSession() { return this },
    prepare(sql) {
      let args = []
      return {
        bind(...values) { args = values; return this },
        async first() { return sqlite.prepare(sql).get(...args) || null },
        async run() { return { meta: { changes: sqlite.prepare(sql).run(...args).changes } } },
      }
    },
    async batch(statements) { for (const statement of statements) await statement.run() },
    close() { sqlite.close() },
  }
}
const env = () => ({ LEARNING_PASSWORD_HASH: hash, LEARNING_SESSION_SECRET: secret, LEARNING_DB: database() })
const req = (path, method = 'GET', body, session, origin = 'https://example.com') => new Request(`https://example.com/api/learning/${path}`, { method, headers: { origin, 'Content-Type': 'application/json', ...(session ? { cookie: session } : {}) }, body: body === undefined ? undefined : JSON.stringify(body) })
const card = { id: 'c', term: 'a', definition: 'b', example: 'An optional example', level: 0, due: 0 }
const deck = { id: 'd', title: 'Set', year: 1, cards: [card] }
test('signed sessions reject forgery, expiration, malformed cookies and rotated secrets', async () => {
  const now = 1800000000000, signed = await token(secret, now)
  const request = value => req('data', 'GET', undefined, `__Host-grace=${value}`)
  assert.equal(await authorized(request(signed), secret, now), true)
  assert.equal(await authorized(request(signed), secret, now + 13 * 3600000), false)
  assert.equal(await authorized(request(signed), secret + 'rotated', now), false)
  assert.equal(await authorized(request(signed.slice(0,-1) + (signed.endsWith('a') ? 'b' : 'a')), secret, now), false)
  assert.equal(await authorized(request('bad'), secret, now), false)
  assert.match(cookie(signed), /HttpOnly; Secure; SameSite=Strict/)
})
test('passwords use PBKDF2 and configuration fails closed', async () => {
  assert.equal(await verifyPassword('test-password', hash), true)
  assert.equal(await verifyPassword('wrong', hash), false)
  assert.equal(await verifyPassword({}, hash), false)
  assert.equal(configured({}), false)
  assert.ok(configured({ LEARNING_PASSWORD_HASH: hash, LEARNING_SESSION_SECRET: secret }))
})
test('login, save, reload, update and concurrent-device conflict use real SQLite statements', async () => {
  const bindings = env()
  try {
    assert.equal((await worker.fetch(req('data'), bindings)).status, 401)
    const login = await worker.fetch(req('auth', 'POST', { password: 'test-password' }), bindings)
    assert.equal(login.status, 200)
    const session = login.headers.get('set-cookie').split(';')[0]
    assert.deepEqual(await (await worker.fetch(req('data', 'GET', undefined, session), bindings)).json(), { data: { decks: [] }, revision: null })
    const first = await worker.fetch(req('data', 'PUT', { data: { decks: [deck] }, revision: null }, session), bindings)
    assert.equal(first.status, 200)
    const revision = (await first.json()).revision
    const reload = await (await worker.fetch(req('data', 'GET', undefined, session), bindings)).json()
    assert.equal(reload.data.decks[0].title, 'Set')
    assert.equal(reload.data.decks[0].cards[0].example, 'An optional example')
    assert.equal(reload.revision, revision)
    assert.equal((await worker.fetch(req('data', 'PUT', { data: { decks: [] }, revision: null }, session), bindings)).status, 409)
    assert.equal((await worker.fetch(req('data', 'PUT', { data: { decks: [] }, revision }, session), bindings)).status, 200)
    assert.equal((await worker.fetch(req('data', 'PUT', { data: { decks: [deck] }, revision }, session), bindings)).status, 409)
    assert.equal((await worker.fetch(req('data', 'PUT', { data: {} }, session), bindings)).status, 400)
    assert.equal((await worker.fetch(req('data', 'PUT', {}, session, 'https://evil.example'), bindings)).status, 403)
    assert.match((await worker.fetch(req('auth', 'DELETE', undefined, session), bindings)).headers.get('set-cookie'), /Max-Age=0/)
  } finally { bindings.LEARNING_DB.close() }
})
test('login rate limiter blocks attempt eleven with atomic database counting', async () => {
  const bindings = env()
  try {
    assert.equal((await worker.fetch(req('auth', 'POST', { password: 'test-password' }, undefined, 'https://evil.example'), bindings)).status, 403)
    for (let i = 0; i < 10; i++) assert.equal((await worker.fetch(req('auth', 'POST', { password: 'wrong' }), bindings)).status, 401)
    assert.equal((await worker.fetch(req('auth', 'POST', { password: 'test-password' }), bindings)).status, 429)
  } finally { bindings.LEARNING_DB.close() }
})
test('missing configuration, missing storage, and unknown endpoints fail safely', async () => {
  assert.equal((await worker.fetch(req('auth'), {})).status, 503)
  assert.equal((await worker.fetch(req('data'), {})).status, 503)
  assert.equal((await worker.fetch(req('auth', 'POST', { password: 'test-password' }), { LEARNING_PASSWORD_HASH: hash, LEARNING_SESSION_SECRET: secret })).status, 503)
  assert.equal((await worker.fetch(req('missing'), {})).status, 404)
  assert.equal((await worker.fetch(new Request('https://example.com/'), { ASSETS: { fetch: () => new Response('portfolio') } })).status, 200)
})
test('data validation rejects duplicate IDs, oversized cards and invalid progress', () => {
  assert.equal(validData({ decks: [deck] }), true)
  assert.equal(validData({ decks: [deck, deck] }), false)
  assert.equal(validData({ decks: [{ ...deck, cards: [card, card] }] }), false)
  assert.equal(validData({ decks: [{ ...deck, cards: [{ ...card, level: -1 }] }] }), false)
  assert.equal(validData({ decks: [{ ...deck, cards: [{ ...card, term: 'x'.repeat(501) }] }] }), false)
  assert.equal(validData({ decks: [{ ...deck, year: 4 }] }), false)
})
test('optional examples accept legacy cards and reject invalid or oversized examples', () => {
  const check = example => validData({ decks: [{ ...deck, cards: [{ ...card, example }] }] })
  assert.equal(check(undefined), true)
  assert.equal(check(''), true)
  assert.equal(check('x'.repeat(500)), true)
  assert.equal(check('x'.repeat(501)), false)
  assert.equal(check(null), false)
  assert.equal(check({ text: 'invalid' }), false)
})
