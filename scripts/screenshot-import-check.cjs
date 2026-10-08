// Runs only in an isolated traced-file copy. No route handler is invoked, no
// browser/proxy/DNS work occurs, and no application credentials are inherited.
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')

async function main() {
  for (const name of ['playwright-core', '@sparticuz/chromium']) {
    try { await import(name) } catch (error) {
      // Output is fixed identifiers only, never an exception/path/body.
      const category = /browsers\.json/.test(error.message) ? 'PACKAGE_ASSET_MISSING' : 'IMPORT_FAILED'
      console.error('FAIL: traced-only module import', name, category)
      process.exitCode = 1
      return
    }
  }
  const entry = require('./.next/server/app/admin/screenshot/route.js')
  assert.ok(entry.routeModule)
  const runtimePath = './.next/server/webpack-runtime.js'
  if (fs.existsSync(runtimePath)) {
    const runtime = require(runtimePath)
    for (const name of fs.readdirSync('./.next/server/chunks')) {
      const file = path.join('.next/server/chunks', name)
      if (!name.endsWith('.js') || !fs.readFileSync(file, 'utf8').includes('portfolio-screenshot-')) continue
      runtime.C(require('./' + file))
    }
    const capture = Object.entries(runtime.m).find(([, factory]) => factory.toString().includes('portfolio-screenshot-'))
    assert.ok(capture, 'The production capture chunk must be traced.')
    const module = await runtime(Number(capture[0]))
    assert.equal(typeof module.captureWebsite, 'function')
    console.log('PASS: traced-only SDK imports and production capture module; no browser launched.')
  } else {
    console.log('PASS: traced-only SDK imports and Turbopack route entry; no browser launched.')
  }
}

main().catch(() => { console.error('FAIL: traced-only production module loading.'); process.exitCode = 1 })
