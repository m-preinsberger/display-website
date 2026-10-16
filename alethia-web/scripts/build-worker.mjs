import { readFile, writeFile } from 'node:fs/promises'
// Keep the Cloudflare Worker self-contained, with no Node.js runtime dependency.
const security = await readFile(new URL('../server/security.mjs', import.meta.url), 'utf8')
const worker = await readFile(new URL('../server/worker.mjs', import.meta.url), 'utf8')
await writeFile(new URL('../dist/_worker.js', import.meta.url), security.replaceAll('export ', '') + '\n' + worker.replace(/^import .*\r?\n/, '').replaceAll('export async function', 'async function'))
