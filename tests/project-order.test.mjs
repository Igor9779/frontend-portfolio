import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test, mock } from 'node:test'
import ts from 'typescript'

const moduleUrl = code => 'data:text/javascript;base64,' + Buffer.from(code).toString('base64')
function compile(path, replacements = {}) {
  return moduleUrl(ts.transpileModule(readFileSync(new URL('../' + path, import.meta.url), 'utf8'), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
    transformers: { before: [context => source => ts.visitNode(source, function visit(node) {
      if (ts.isImportDeclaration(node) && replacements[node.moduleSpecifier.text]) {
        return ts.factory.updateImportDeclaration(node, node.modifiers, node.importClause,
          ts.factory.createStringLiteral(replacements[node.moduleSpecifier.text]), node.attributes)
      }
      return ts.visitEachChild(node, visit, context)
    })] },
  }).outputText)
}
const validationUrl = compile('src/lib/project-validation.ts')
const orderUrl = compile('src/lib/project-order.ts', { './project-validation': validationUrl })
const { createProjectOrder, projectOrderReducer, projectOrderControls, projectOrderPayload, validateProjectOrder } = await import(orderUrl)
const authUrl = moduleUrl('export async function requireAdmin() { return globalThis.orderActionFixture.authorize() }')
const cacheUrl = moduleUrl('export function revalidatePath(path) { globalThis.orderActionFixture.revalidated.push(path) }')
const navigationUrl = moduleUrl('export function unstable_rethrow() {}')
const { reorderProjects } = await import(compile('src/app/admin/order-actions.ts', {
  '../../lib/auth': authUrl, '../../lib/project-order': orderUrl,
  'next/cache': cacheUrl, 'next/navigation': navigationUrl,
}))
const ids = ['6dc6783d-f730-5c9b-8de8-a437f1b75412', 'a283d434-9e23-5d38-944e-dbf661854220', '6f590764-f51a-54c3-bc18-924fc41c9172']
const unknownId = '182eb617-dd4a-5766-b956-dcfd0041c8bc'
const reordered = [ids[1], ids[0], ids[2]]

function setup({ allowed = true, currentIds = ids, error = null, throws = false } = {}) {
  const rows = currentIds.map((id, index) => ({
    id, position: index * 3, visible: index !== 1, title: 'Fixture ' + index,
    preview_url: index === 0 ? '/assets/fixture.png' : `https://storage.example.test/storage/v1/object/public/project-previews/projects/${id}/preview-${unknownId}.webp`,
    updated_at: '2026-01-01T00:00:00Z', technologies: ['TypeScript'], source: 'manual',
  }))
  const state = { rows, calls: [], revalidated: [], authorizations: 0, authorized: false }
  globalThis.orderActionFixture = {
    revalidated: state.revalidated,
    async authorize() {
      state.authorizations++
      if (!allowed) throw new Error('Administrator access denied')
      state.authorized = true
      return { supabase: {
        rpc(name, payload) {
          assert.equal(state.authorized, true, 'Authorization must precede RPC invocation.')
          assert.equal(name, 'reorder_projects')
          state.calls.push(structuredClone(payload))
          return { async abortSignal(signal) {
            assert.ok(signal instanceof AbortSignal)
            if (throws) throw new Error('PRIVATE_BACKEND_DETAIL')
            if (error) return { error }
            // Isolated RPC contract fixture, not a production atomicity test.
            const current = [...state.rows].sort((a, b) => a.position - b.position).map(row => row.id)
            const { ordered_ids: ordered, expected_order: expected } = payload
            if (JSON.stringify(expected) !== JSON.stringify(current)
              || ordered.length !== current.length || new Set(ordered).size !== current.length
              || ordered.some(id => !current.includes(id))) {
              return { error: { code: '22023', message: 'PRIVATE_BACKEND_DETAIL' } }
            }
            for (const row of state.rows) row.position = ordered.indexOf(row.id)
            return { error: null }
          } }
        },
        from() { assert.fail('Ordering must use one RPC, never separate project updates.') },
        storage: { from() { assert.fail('Ordering must never access Storage.') } },
      } }
    },
  }
  return state
}

test('saved/draft start equal as independent arrays', () => {
  const state = createProjectOrder(ids)
  assert.deepEqual(state.savedOrder, ids)
  assert.deepEqual(state.draftOrder, ids)
  assert.notEqual(state.savedOrder, state.draftOrder)
  assert.equal(projectOrderControls(state, '', false).dirty, false)
  assert.equal(projectOrderControls(state, '', false).saveDisabled, true)
  assert.equal(projectOrderControls(state, '', false).resetDisabled, true)
})

test('drag changes only draft order and reset restores the saved order', () => {
  const initial = createProjectOrder(ids)
  const dragged = projectOrderReducer(initial, { type: 'drop', id: ids[0], targetId: ids[1], blocked: false })
  assert.deepEqual(dragged.savedOrder, ids)
  assert.deepEqual(dragged.draftOrder, reordered)
  assert.deepEqual(initial.draftOrder, ids)
  assert.deepEqual(projectOrderReducer(dragged, { type: 'reset', ids }), initial)
})

test('Move Up/Down changes draft only; boundaries and absent IDs do nothing', () => {
  const initial = createProjectOrder(ids)
  const down = projectOrderReducer(initial, { type: 'move', id: ids[0], direction: 1, blocked: false })
  assert.deepEqual(down.draftOrder, reordered)
  assert.deepEqual(down.savedOrder, ids)
  assert.deepEqual(projectOrderReducer(down, { type: 'move', id: ids[0], direction: -1, blocked: false }).draftOrder, ids)
  assert.equal(projectOrderReducer(initial, { type: 'move', id: ids[0], direction: -1, blocked: false }), initial)
  assert.equal(projectOrderReducer(initial, { type: 'move', id: ids.at(-1), direction: 1, blocked: false }), initial)
  assert.equal(projectOrderReducer(initial, { type: 'drop', id: ids[0], targetId: unknownId, blocked: false }), initial)
})

test('search and pending saves disable reorder; dirty state blocks CRUD', () => {
  const clean = createProjectOrder(ids)
  const dirty = projectOrderReducer(clean, { type: 'move', id: ids[0], direction: 1, blocked: false })
  assert.equal(projectOrderControls(clean, '', false).crudDisabled, false)
  const controls = projectOrderControls(dirty, 'TypeScript', false)
  for (const field of ['crudDisabled', 'reorderDisabled', 'saveDisabled', 'resetDisabled']) assert.equal(controls[field], true)
  assert.equal(projectOrderReducer(dirty, { type: 'move', id: ids[0], direction: 1, blocked: controls.reorderDisabled }), dirty)
  assert.equal(projectOrderReducer(dirty, { type: 'drop', id: ids[0], targetId: ids[2], blocked: controls.reorderDisabled }), dirty)
  assert.equal(projectOrderControls(dirty, '', true).reorderDisabled, true)
  assert.equal(projectOrderControls(dirty, '', true).crudDisabled, true)
  assert.equal(projectOrderControls(dirty, '', false).saveDisabled, false)
})

test('server refresh adopts clean lists but preserves dirty draft and stale baseline until Reset', () => {
  const clean = createProjectOrder(ids)
  assert.deepEqual(projectOrderReducer(clean, { type: 'sync', ids: reordered }), createProjectOrder(reordered))
  const dirty = projectOrderReducer(clean, { type: 'move', id: ids[0], direction: 1, blocked: false })
  assert.equal(projectOrderReducer(dirty, { type: 'sync', ids: [...ids, unknownId] }), dirty)
  assert.equal(projectOrderControls(dirty, '', false, [...ids, unknownId]).stale, true)
  assert.equal(projectOrderControls(dirty, '', false, [...ids, unknownId]).saveDisabled, true)
  assert.deepEqual(projectOrderReducer(dirty, { type: 'reset', ids: [...ids, unknownId] }), createProjectOrder([...ids, unknownId]))
})

test('Save payload contains complete IDs and baseline only, including hidden projects', () => {
  const draft = projectOrderReducer(createProjectOrder(ids), { type: 'drop', id: ids[0], targetId: ids[1], blocked: false })
  assert.deepEqual(projectOrderPayload(draft), { orderedIds: reordered, expectedOrder: ids })
  assert.deepEqual(projectOrderReducer(draft, { type: 'saved', ids: reordered }), createProjectOrder(reordered))
})

test('validation rejects malformed UUIDs, nulls, objects, duplicates and unequal sets', () => {
  for (const input of [null, {}, 'invalid', [null], [123], ['bad-uuid'], [...ids, ids[0]], [ids[0], ids[0].toUpperCase()], [ids[0], ids[1]], Array(10_001).fill(ids[0])]) {
    assert.equal(validateProjectOrder(input, ids).success, false)
    assert.equal(validateProjectOrder(ids, input).success, false)
  }
  assert.equal(validateProjectOrder([unknownId, ids[1], ids[2]], ids).success, false)
  assert.equal(validateProjectOrder(Array(1), Array(1)).success, false)
  assert.deepEqual(validateProjectOrder(ids.map(id => id.toUpperCase()), ids), { success: true, orderedIds: ids, expectedOrder: ids })
  assert.equal(validateProjectOrder([], []).success, true, 'RPC decides whether the actual table is empty.')
})

test('reorder independently denies unauthorized callers before validation or RPC', async () => {
  for (const ordered of [reordered, null]) {
    const state = setup({ allowed: false })
    await assert.rejects(reorderProjects(ordered, ids), /Administrator access denied/)
    assert.equal(state.authorizations, 1)
    assert.deepEqual(state.calls, [])
    assert.deepEqual(state.revalidated, [])
  }
})

test('invalid input never invokes RPC or revalidation', async () => {
  const state = setup()
  assert.equal((await reorderProjects(['bad-id'], ids)).success, false)
  assert.deepEqual(state.calls, [])
  assert.deepEqual(state.revalidated, [])
})

test('successful save uses exactly one authenticated RPC, normalizes order and preserves every non-position field', async () => {
  const state = setup()
  const before = state.rows.map(({ position, ...row }) => row)
  const result = await reorderProjects(reordered, ids)
  assert.deepEqual(result, { success: true, orderedIds: reordered })
  assert.equal(state.authorizations, 1)
  assert.deepEqual(state.calls, [{ ordered_ids: reordered, expected_order: ids }])
  assert.deepEqual([...state.rows].sort((a, b) => a.position - b.position).map(row => row.position), [0, 1, 2])
  assert.deepEqual(state.rows.map(({ position, ...row }) => row), before)
  assert.equal(state.calls[0].ordered_ids.includes(ids[1]), true, 'Hidden project must be included.')
  assert.deepEqual(state.revalidated, ['/admin', '/'])
})

test('RPC rejects stale, missing, unknown and empty non-empty-table sets without partial fixture updates', async () => {
  for (const [ordered, expected] of [[reordered, reordered], [[ids[0], ids[1]], [ids[0], ids[1]]], [[unknownId, ids[1], ids[2]], [unknownId, ids[1], ids[2]]], [[], []]]) {
    const state = setup()
    const before = structuredClone(state.rows)
    const result = await reorderProjects(ordered, expected)
    assert.equal(result.success, false)
    assert.equal(result.stale, true)
    assert.match(result.message, /Reset to the latest saved order/)
    assert.deepEqual(state.rows, before)
    assert.deepEqual(state.revalidated, [])
    assert.equal(JSON.stringify(result).includes('PRIVATE_BACKEND_DETAIL'), false)
  }
})

test('database and network failures stay generic and leave the submitted draft available for retry', async () => {
  const logger = mock.method(console, 'error', () => {})
  try {
    for (const options of [{ error: { code: '42501', message: 'PRIVATE_BACKEND_DETAIL' } }, { throws: true }]) {
      const state = setup(options)
      const draft = projectOrderReducer(createProjectOrder(ids), { type: 'drop', id: ids[0], targetId: ids[1], blocked: false })
      const input = projectOrderPayload(draft)
      const result = await reorderProjects(input.orderedIds, input.expectedOrder)
      assert.deepEqual(result, { success: false, message: 'Unable to save project order. Please try again.' })
      assert.deepEqual(projectOrderPayload(draft), input)
      assert.deepEqual(state.revalidated, [])
    }
    assert.equal(JSON.stringify(logger.mock.calls.map(call => call.arguments)).includes('PRIVATE_BACKEND_DETAIL'), false)
  } finally { logger.mock.restore() }
})
