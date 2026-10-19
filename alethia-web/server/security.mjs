const encoder = new TextEncoder()
const hex = bytes => Array.from(new Uint8Array(bytes), b => b.toString(16).padStart(2, '0')).join('')
const unhex = value => Uint8Array.from(value.match(/../g), pair => parseInt(pair, 16))
async function hmacKey(secret) {
  return crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify'])
}

export const cookieName = '__Host-grace'
export const ttl = 60 * 60 * 12
export function configured(env) {
  return typeof env.LEARNING_PASSWORD_HASH === 'string' && /^pbkdf2:100000:[a-f0-9]{32}:[a-f0-9]{64}$/.test(env.LEARNING_PASSWORD_HASH) && env.LEARNING_SESSION_SECRET?.length >= 32
}
export async function verifyPassword(password, encoded) {
  if (typeof password !== 'string' || password.length > 256) return false
  const [, iterations, salt, hash] = encoded.split(':')
  const key = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, ['deriveBits'])
  const derived = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt: encoder.encode(salt), iterations: Number(iterations), hash: 'SHA-256' }, key, 256)
  // HMAC verification avoids a variable-time string comparison of password hashes.
  const comparisonKey = await hmacKey(hash)
  const signature = await crypto.subtle.sign('HMAC', comparisonKey, unhex(hash))
  return crypto.subtle.verify('HMAC', comparisonKey, signature, derived)
}
export async function token(secret, now = Date.now()) {
  const expires = String(Math.floor(now / 1000) + ttl)
  return `${expires}.${hex(await crypto.subtle.sign('HMAC', await hmacKey(secret), encoder.encode(expires)))}`
}
export async function authorized(request, secret, now = Date.now()) {
  const value = (request.headers.get('cookie') || '').split(';').map(s => s.trim()).find(s => s.startsWith(`${cookieName}=`))?.slice(cookieName.length + 1)
  if (!value || !/^\d{10}\.[a-f0-9]{64}$/.test(value)) return false
  const [expires, signature] = value.split('.')
  return Number(expires) > now / 1000 && crypto.subtle.verify('HMAC', await hmacKey(secret), unhex(signature), encoder.encode(expires))
}
export function cookie(value, maxAge = ttl) {
  return `${cookieName}=${value}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${maxAge}`
}
export function reply(body, status = 200, headers = {}) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex', ...headers } })
}
export function sameOrigin(request) {
  return request.headers.get('origin') === new URL(request.url).origin
}
export function validData(data) {
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
