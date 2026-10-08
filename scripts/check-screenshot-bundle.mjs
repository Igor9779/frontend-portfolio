// Read-only build inspection. Never launches Chromium or captures a website.
import assert from 'node:assert/strict'
import { createReadStream, existsSync, readFileSync, statSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { createBrotliDecompress } from 'node:zlib'

const root = process.cwd()
const tracePath = resolve(root, '.next/server/app/admin/screenshot/route.js.nft.json')
assert.ok(existsSync(tracePath), 'Run the production build before inspecting the screenshot trace.')
const files = new Set([resolve(root, '.next/server/app/admin/screenshot/route.js')])
for (const trace of [tracePath, resolve(root, '.next/next-server.js.nft.json')]) {
  if (existsSync(trace)) for (const file of JSON.parse(readFileSync(trace, 'utf8')).files) files.add(resolve(dirname(trace), file))
}
for (const name of ['chromium.br', 'fonts.tar.br', 'al2023.tar.br', 'swiftshader.tar.br']) {
  assert.ok(files.has(resolve(root, 'node_modules/@sparticuz/chromium/bin', name)), `Missing bundled Chromium asset: ${name}`)
}
assert.ok([...files].every(file => !/\/(?:\.env(?:\.[^/]*)?)$/.test(file)), 'An environment file must never enter the Function trace.')
assert.ok([...files].every(file => !file.includes('/Applications/')), 'A local browser installation must never enter the Function trace.')
for (const file of files) {
  if (file.startsWith(resolve(root, '.next/server') + '/') && file.endsWith('.js')) {
    assert.ok(!readFileSync(file, 'utf8').includes('resolveLocalChromium'), 'Development-only browser discovery must be eliminated from the production Function.')
  }
}
const bytes = [...files].reduce((total, file) => total + (statSync(file).isFile() ? statSync(file).size : 0), 0)
assert.ok(bytes < 250 * 1024 * 1024, 'The conservative trace exceeds the standard 250 MiB Function limit.')
const playwright = JSON.parse(readFileSync(resolve(root, 'node_modules/playwright-core/package.json'), 'utf8'))
const chromium = JSON.parse(readFileSync(resolve(root, 'node_modules/@sparticuz/chromium/package.json'), 'utf8'))
const browser = JSON.parse(readFileSync(resolve(root, 'node_modules/playwright-core/browsers.json'), 'utf8')).browsers.find(browser => browser.name === 'chromium')
assert.equal(chromium.version.split('.')[0], browser.browserVersion.split('.')[0], 'Playwright and Chromium major versions must match.')
const [major, minor] = process.versions.node.split('.').map(Number)
assert.ok(major >= 24 || (major === 22 && minor >= 17), 'Use the approved Node 22.17+ or 24+ runtime.')
const header = await new Promise((resolveHeader, reject) => {
  const input = createReadStream(resolve(root, 'node_modules/@sparticuz/chromium/bin/chromium.br'))
  const decompressor = createBrotliDecompress()
  let done = false
  const stop = () => { input.destroy(); decompressor.destroy() }
  const error = error => { if (!done) { done = true; stop(); reject(error) } }
  input.on('error', error); decompressor.on('error', error)
  decompressor.once('data', chunk => { done = true; resolveHeader(chunk.subarray(0, 64)); stop() })
  input.pipe(decompressor)
})
assert.equal(header.subarray(0, 4).toString('hex'), '7f454c46', 'The packaged executable must be a Linux ELF binary.')
assert.equal(header.readUInt16LE(18), 62, 'The bundled executable targets Linux x86_64; verify the deployment architecture.')
console.log(`PASS: ${playwright.version} / Chromium ${chromium.version}; Linux x86_64 assets included.`)
console.log(`Conservative Next.js route + shared runtime trace: ${(bytes / 1024 / 1024).toFixed(2)} MiB, ${files.size} files.`)
console.log('Node configuration and trace checked. Actual Vercel packaging/launch requires a Preview deployment; this check does not deploy or run Chromium.')
