import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { test } from 'node:test'
import { compile } from './cms-demo-test-helpers.mjs'

const { default: config } = await import(compile('next.config.ts'))
const require = createRequire(import.meta.url)
// Use the framework's own path matcher, including the zero-segment root path
// and directory URLs served through rewrites, rather than a mock regex.
const { pathToRegexp } = require('next/dist/compiled/path-to-regexp')
const rules = await config.headers()
const expected = {
  'content-security-policy': "frame-ancestors 'none'",
  'x-frame-options': 'DENY',
  'x-content-type-options': 'nosniff',
  'permissions-policy': 'camera=(), microphone=(), geolocation=()',
  'referrer-policy': 'strict-origin-when-cross-origin',
}
function headersAt(path) {
  const headers = {}
  for (const rule of rules) {
    assert.equal(rule.has, undefined, 'Protection must not depend on request headers/cookies')
    assert.equal(rule.missing, undefined)
    if (pathToRegexp(rule.source).test(path)) {
      for (const header of rule.headers) headers[header.key.toLowerCase()] = header.value
    }
  }
  return headers
}

for (const path of ['/', '/cms-demo', '/admin', '/admin/login', '/admin/screenshot',
  '/projects/livestopair/', '/projects/livestopair/index.html', '/projects/wordsmaxlab/']) {
  test(`framing and conservative security headers cover ${path}`, () => {
    assert.deepEqual(headersAt(path), expected)
  })
}

test('global CSP restricts framing only and preserves static inline scripts/styles and blob previews', () => {
  for (const rule of rules) {
    for (const header of rule.headers) {
      if (header.key.toLowerCase() === 'content-security-policy') {
        assert.equal(header.value, "frame-ancestors 'none'")
        assert.ok(!/default-src|script-src|style-src|img-src|connect-src|sandbox/i.test(header.value))
      }
      assert.notEqual(header.key.toLowerCase(), 'strict-transport-security', 'TLS/HSTS remain platform-managed')
    }
  }
})

test('security header configuration preserves every legacy directory rewrite', async () => {
  assert.equal(config.skipTrailingSlashRedirect, true)
  assert.deepEqual(await config.rewrites(), ['livestopair', 'pagesmaxair', 'worksallsday', 'pathstopnow', 'wordsmaxlab']
    .map(name => ({ source: `/projects/${name}/`, destination: `/projects/${name}/index.html` })))
})
