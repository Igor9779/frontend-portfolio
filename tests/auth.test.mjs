import assert from 'node:assert/strict'
import { test, mock } from 'node:test'
import { AuthSessionMissingError } from '@supabase/supabase-js'
import { compile, moduleUrl } from './cms-demo-test-helpers.mjs'

// Execute the actual helper, replacing only framework/request dependencies.
// The Supabase error classifier remains the real SDK implementation.
const auth = await import(compile('src/lib/auth.ts', {
  'server-only': moduleUrl(''),
  '@supabase/supabase-js': import.meta.resolve('@supabase/supabase-js'),
  react: moduleUrl('export const cache = fn => fn'),
  'next/navigation': moduleUrl('export function redirect(path) { throw Object.assign(new Error("Redirect"), { path }) }'),
  './supabase/server': moduleUrl('export async function createClient() { return globalThis.authorizationFixture.client }'),
}))
const user = { id: '88888888-8888-4888-8888-888888888888' }

function fixture({ identity = user, authError = null, membership = { user_id: user.id }, membershipError = null,
  authThrows = false, membershipThrows = false } = {}) {
  const calls = []
  const query = {
    select(column) { calls.push(['select', column]); return this },
    eq(column, value) { calls.push(['eq', column, value]); return this },
    abortSignal(signal) { assert.ok(signal instanceof AbortSignal); calls.push(['deadline']); return this },
    async maybeSingle() {
      calls.push(['membership'])
      if (membershipThrows) throw new Error('SYNTHETIC_PRIVATE_ERROR')
      return { data: membership, error: membershipError }
    },
  }
  const client = {
    auth: {
      async getUser() {
        calls.push(['getUser'])
        if (authThrows) throw new Error('SYNTHETIC_PRIVATE_ERROR')
        return { data: { user: identity }, error: authError }
      },
      // These deliberately contain a tempting administrator claim. Neither
      // getSession nor unverified/cached claims may authorize the caller.
      getSession() { throw new Error('Unverified session must not be used') },
      getClaims() { throw new Error('Cookie claims must not replace getUser') },
    },
    from(table) { calls.push(['from', table]); assert.equal(table, 'admin_users'); return query },
  }
  return { client, calls }
}

async function verify(options) {
  const state = fixture(options)
  const log = mock.method(console, 'error', () => {})
  try {
    const access = await auth.checkAdminAccess(state.client)
    return { ...state, access, diagnostics: log.mock.calls.map(call => call.arguments.join(' ')) }
  } finally { log.mock.restore() }
}

test('real authorization rejects a missing authenticated user without querying membership', async () => {
  const result = await verify({ identity: null })
  assert.deepEqual(result.access, { status: 'anonymous' })
  assert.deepEqual(result.calls, [['getUser']])
})

for (const error of [new AuthSessionMissingError(), { status: 401 }, { status: 403 }]) {
  test(`real authorization rejects missing/expired/invalid identity (${error.status ?? 'missing session'}) even if a user is returned`, async () => {
    const result = await verify({ authError: error })
    assert.deepEqual(result.access, { status: 'anonymous' })
    assert.deepEqual(result.calls, [['getUser']])
  })
}

for (const options of [{ authError: { status: 500, message: 'SYNTHETIC_PRIVATE_ERROR' } }, { authThrows: true }]) {
  test(`real authorization fails closed on Auth ${options.authThrows ? 'exception' : 'service failure'}`, async () => {
    const result = await verify(options)
    assert.deepEqual(result.access, { status: 'unavailable' })
    assert.deepEqual(result.calls, [['getUser']])
    assert.ok(result.diagnostics.length > 0)
    assert.ok(!result.diagnostics.join(' ').includes('SYNTHETIC_PRIVATE_ERROR'))
  })
}

test('a verified non-admin is denied using only their own membership', async () => {
  const result = await verify({ membership: null })
  assert.deepEqual(result.access, { status: 'denied' })
  assert.deepEqual(result.calls, [['getUser'], ['from', 'admin_users'], ['select', 'user_id'],
    ['eq', 'user_id', user.id], ['deadline'], ['membership']])
})

test('membership belonging to another user cannot authorize the current identity', async () => {
  const result = await verify({ membership: { user_id: '99999999-9999-4999-8999-999999999999' } })
  assert.deepEqual(result.access, { status: 'denied' })
})

for (const options of [
  { membershipError: { code: '42501', message: 'SYNTHETIC_PRIVATE_ERROR' } },
  { membershipError: { code: 'SYNTHETIC_PRIVATE_ERROR', message: 'SYNTHETIC_PRIVATE_ERROR' } },
  { membershipThrows: true },
]) {
  test(`membership ${options.membershipThrows ? 'exception' : options.membershipError.code} fails closed without raw errors`, async () => {
    const result = await verify(options)
    assert.deepEqual(result.access, { status: 'unavailable' })
    assert.ok(result.diagnostics.length > 0)
    assert.ok(!result.diagnostics.join(' ').includes('SYNTHETIC_PRIVATE_ERROR'))
    assert.ok(!result.diagnostics.join(' ').includes(user.id))
  })
}

test('verified identity plus exact current membership returns the authenticated admin client', async () => {
  const result = await verify({})
  assert.equal(result.access.status, 'admin')
  assert.equal(result.access.user, user)
  assert.equal(result.access.supabase, result.client)
  assert.equal(result.calls[0][0], 'getUser')
  assert.equal(result.calls.at(-1)[0], 'membership')
})

for (const [options, destination] of [
  [{ identity: null }, '/admin/login'],
  [{ membership: null }, '/admin/login?error=unauthorized'],
  [{ membershipError: { code: '42501' } }, '/admin/login?error=unavailable'],
]) {
  test(`real requireAdmin redirects instead of granting access (${destination})`, async () => {
    globalThis.authorizationFixture = fixture(options)
    const log = mock.method(console, 'error', () => {})
    try { await assert.rejects(auth.requireAdmin(), error => error.path === destination) }
    finally { log.mock.restore(); delete globalThis.authorizationFixture }
  })
}

test('real requireAdmin uses fresh request identity and membership rather than a prior administrator result', async () => {
  try {
    globalThis.authorizationFixture = fixture()
    assert.equal((await auth.requireAdmin()).status, 'admin')
    globalThis.authorizationFixture = fixture({ membership: null })
    await assert.rejects(auth.requireAdmin(), error => error.path === '/admin/login?error=unauthorized')
    assert.equal(globalThis.authorizationFixture.calls[0][0], 'getUser')
  } finally { delete globalThis.authorizationFixture }
})
