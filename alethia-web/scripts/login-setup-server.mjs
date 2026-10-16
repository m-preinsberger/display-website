import { createServer } from 'node:http'
import { readFile } from 'node:fs/promises'
const page = await readFile(new URL('./login-setup.html', import.meta.url))
createServer((request, response) => {
  if (request.method !== 'GET' || request.headers.host !== '127.0.0.1:4178' || request.url !== '/') { response.writeHead(404); response.end(); return }
  response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', 'X-Frame-Options': 'DENY', 'Referrer-Policy': 'no-referrer', 'Content-Security-Policy': "default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; connect-src 'none'; form-action 'none'; frame-ancestors 'none'" })
  response.end(page)
}).listen(4178, '127.0.0.1', () => console.log('Private setup helper ready at http://127.0.0.1:4178/'))
