import assert from 'node:assert/strict'
import { test } from 'node:test'
import { compile, moduleUrl, hookReact, hookHarness, nodes } from './cms-demo-test-helpers.mjs'

const draftModule = compile('src/lib/admin-project-draft.ts', {
  './project-validation': compile('src/lib/project-validation.ts'),
  './github-repository': compile('src/lib/github-repository.ts'),
})
const { adminProjectDraftKey, emptyProjectDraft, persistProjectDraft, loadProjectDraft } = await import(draftModule)
const { demoStorageKey } = await import(compile('src/lib/cms-demo.ts', {
  './project-order': compile('src/lib/project-order.ts', { './project-validation': compile('src/lib/project-validation.ts') }),
  './project-validation': compile('src/lib/project-validation.ts'),
}))
const navigation = moduleUrl('export function redirect(path) { throw Object.assign(new Error("Redirect"), { path }) }')
const server = moduleUrl('export async function createClient() { return globalThis.logoutFixture.client }')
const authModule = compile('src/lib/auth.ts', {
  'server-only': moduleUrl(''), '@supabase/supabase-js': import.meta.resolve('@supabase/supabase-js'),
  react: moduleUrl('export const cache = fn => fn'), 'next/navigation': navigation, './supabase/server': server,
})
const actionsModule = compile('src/app/admin/actions.ts', {
  'next/navigation': navigation, '../../lib/auth': authModule, '../../lib/supabase/server': server,
})
const { signOut } = await import(actionsModule)
const loginModule = compile('src/components/admin/LoginForm.tsx', {
  react: hookReact, '../../app/admin/actions': actionsModule, '../../lib/admin-project-draft': draftModule,
})
const { LoginForm } = await import(loginModule)
const { default: LoginPage } = await import(compile('src/app/admin/login/page.tsx', {
  'next/navigation': navigation, '../../../lib/auth': authModule,
  '../../../components/admin/LoginForm': loginModule,
  '../../../components/admin/Icon': moduleUrl('export function Icon() {}'),
}))

function storage() {
  const entries = new Map([[demoStorageKey, 'DEMO_STATE'], ['unrelated-tab-data', 'UNRELATED']])
  return { entries, getItem: key => entries.get(key) ?? null, setItem: (key, value) => entries.set(key, value), removeItem: key => entries.delete(key) }
}
const unfinished = { ...emptyProjectDraft(), values: { ...emptyProjectDraft().values, title: 'Unfinished project' } }
function withBrowserStorage(tab, task) {
  const previous = globalThis.window
  globalThis.window = { sessionStorage: tab,
    localStorage: { clear() { throw new Error('localStorage must remain untouched') } } }
  return Promise.resolve().then(task).finally(() => {
    if (previous === undefined) delete globalThis.window
    else globalThis.window = previous
  })
}
function client({ failure = null, throws = false } = {}) {
  let signedIn = true
  return {
    auth: {
      async signOut(options) {
        assert.deepEqual(options, { scope: 'local' })
        if (throws) throw new Error('SYNTHETIC_PRIVATE_ERROR')
        if (!failure) signedIn = false
        return { error: failure }
      },
      async getUser() { return { data: { user: signedIn ? { id: '88888888-8888-4888-8888-888888888888' } : null }, error: null } },
    },
  }
}

test('successful real logout keeps its redirect and the anonymous login clears only the admin draft', async () => {
  const tab = storage()
  persistProjectDraft(tab, unfinished)
  globalThis.logoutFixture = { client: client() }
  try {
    await withBrowserStorage(tab, async () => {
      await assert.rejects(signOut(), error => error.path === '/admin/login')
      assert.deepEqual(loadProjectDraft(tab), unfinished, 'Server code cannot access/clear browser storage')
      const page = await LoginPage({ searchParams: Promise.resolve({}) })
      const form = nodes(page).find(node => node.type === LoginForm)
      assert.equal(form.props.clearAdminDraft, true)
      hookHarness(LoginForm, form.props)
      assert.equal(tab.getItem(adminProjectDraftKey), null)
      assert.equal(tab.getItem(demoStorageKey), 'DEMO_STATE')
      assert.equal(tab.getItem('unrelated-tab-data'), 'UNRELATED')
    })
  } finally { delete globalThis.logoutFixture }
})

for (const options of [{ failure: { message: 'SYNTHETIC_PRIVATE_ERROR' } }, { throws: true }]) {
  test(`logout ${options.throws ? 'exception' : 'error'} retains the draft and does not redirect`, async () => {
    const tab = storage()
    persistProjectDraft(tab, unfinished)
    globalThis.logoutFixture = { client: client(options) }
    try {
      await withBrowserStorage(tab, async () => {
        assert.deepEqual(await signOut(), { error: 'Unable to sign out. Please try again.' })
        assert.deepEqual(loadProjectDraft(tab), unfinished)
        assert.equal(tab.entries.size, 3)
      })
    } finally { delete globalThis.logoutFixture }
  })
}

test('pending logout cannot clear a draft before the server acknowledges success', async () => {
  const tab = storage()
  persistProjectDraft(tab, unfinished)
  let complete
  globalThis.logoutFixture = { client: { auth: { signOut: () => new Promise(resolve => { complete = resolve }) } } }
  try {
    await withBrowserStorage(tab, async () => {
      const pending = signOut()
      await Promise.resolve()
      assert.deepEqual(loadProjectDraft(tab), unfinished)
      const redirect = assert.rejects(pending, error => error.path === '/admin/login')
      complete({ error: null })
      await redirect
    })
  } finally { delete globalThis.logoutFixture }
})

for (const status of ['denied', 'unavailable']) {
  test(`an unverified ${status} login cannot clear the draft`, async () => {
    const tab = storage()
    persistProjectDraft(tab, unfinished)
    const getAccess = moduleUrl(`export async function getAdminAccess() { return {status:'${status}'} }`)
    const { default: Page } = await import(compile('src/app/admin/login/page.tsx', {
      'next/navigation': navigation, '../../../lib/auth': getAccess,
      '../../../components/admin/LoginForm': loginModule,
      '../../../components/admin/Icon': moduleUrl('export function Icon() {}'),
    }))
    await withBrowserStorage(tab, async () => {
      const page = await Page({ searchParams: Promise.resolve({}) })
      const form = nodes(page).find(node => node.type === LoginForm)
      assert.equal(form.props.clearAdminDraft, false)
      hookHarness(LoginForm, form.props)
      assert.deepEqual(loadProjectDraft(tab), unfinished)
    })
  })
}

test('blocked browser storage does not prevent rendering the signed-out login', async () => {
  const tab = { removeItem() { throw new Error('Storage disabled') } }
  await withBrowserStorage(tab, async () => {
    assert.doesNotThrow(() => hookHarness(LoginForm, { clearAdminDraft: true }))
  })
})
