import { randomBytes, pbkdf2Sync } from 'node:crypto'
import { emitKeypressEvents } from 'node:readline'
// Read the password from stdin, never from command-line arguments or a tracked file.
let password = ''
if (process.stdin.isTTY) {
  process.stderr.write('Choose a unique password (14+ characters; input hidden): ')
  emitKeypressEvents(process.stdin)
  process.stdin.setRawMode(true)
  process.stdin.resume()
  password = await new Promise(resolve => {
    let value = ''
    const onKey = (text, key) => {
      if (key?.ctrl && key.name === 'c') { process.stdin.setRawMode(false); process.exit(1) }
      if (key?.name === 'return') { process.stdin.off('keypress', onKey); process.stdin.setRawMode(false); process.stdin.pause(); process.stderr.write('\n'); resolve(value) }
      else if (key?.name === 'backspace') value = value.slice(0, -1)
      else if (!key?.ctrl && !key?.meta && text && !/[\x00-\x1f\x7f]/.test(text)) value += text
    }
    process.stdin.on('keypress', onKey)
  })
} else {
  for await (const chunk of process.stdin) password += chunk
}
password = password.replace(/\r?\n$/, '')
if (password.length < 14 || password.length > 256) {
  console.error('Use a unique password between 14 and 256 characters. Supply it through stdin.')
  process.exit(1)
}
const salt = randomBytes(16).toString('hex')
const admin = process.argv.includes('--admin')
console.log(`${admin ? 'LEARNING_ADMIN_PASSWORD_HASH' : 'LEARNING_PASSWORD_HASH'}=pbkdf2:100000:${salt}:${pbkdf2Sync(password, salt, 100000, 32, 'sha256').toString('hex')}`)
if (!admin) console.log(`LEARNING_SESSION_SECRET=${randomBytes(48).toString('base64url')}`)
