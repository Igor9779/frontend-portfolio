import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { dirname, resolve, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import { test } from 'node:test'
import ts from 'typescript'

const root = fileURLToPath(new URL('../', import.meta.url))
const source = path => readFileSync(resolve(root, path), 'utf8')
const moduleUrl = code => 'data:text/javascript;base64,' + Buffer.from(code).toString('base64')
function compile(path, replacements = {}) {
  return moduleUrl(ts.transpileModule(source(path), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
    transformers: { before: [context => file => ts.visitNode(file, function visit(node) {
      if (ts.isImportDeclaration(node) && replacements[node.moduleSpecifier.text]) return ts.factory.updateImportDeclaration(
        node, node.modifiers, node.importClause, ts.factory.createStringLiteral(replacements[node.moduleSpecifier.text]), node.attributes)
      return ts.visitEachChild(node, visit, context)
    })] },
  }).outputText)
}
const validationUrl = compile('src/lib/project-validation.ts')
const orderUrl = compile('src/lib/project-order.ts', { './project-validation': validationUrl })
const demoUrl = compile('src/lib/cms-demo.ts', { './project-order': orderUrl, './project-validation': validationUrl })
const { createDemoState, saveDemoProject, deleteDemoProject, changeDemoOrder, saveDemoOrder, serializeDemoState, parseDemoState, DemoPreviewUrls, demoStorageKey } = await import(demoUrl)
const { projectOrderControls } = await import(orderUrl)
const { validatePreviewFile, previewMaxBytes } = await import(compile('src/lib/preview-file.ts'))
const ids = ['6dc6783d-f730-5c9b-8de8-a437f1b75412', 'a283d434-9e23-5d38-944e-dbf661854220', '6f590764-f51a-54c3-bc18-924fc41c9172']
const originals = ids.map((id, position) => ({ id, position, title: 'Demo ' + position, category: 'Developer tools',
  shortDescription: null, description: 'Public project description', previewUrl: '/assets/preview.png',
  githubUrl: 'https://github.com/example/repo', productionUrl: '/projects/livestopair/', telegramUrl: null, technologies: ['React'], visible: true }))
const added = { ...originals[0], id: '182eb617-dd4a-5766-b956-dcfd0041c8bc', title: 'Local project', position: 3, visible: false }
const snapshot = structuredClone(originals)

test('initial demo state clones presentation data, normalized order and arrays', () => {
  const demo = createDemoState(originals)
  assert.deepEqual(demo.projects, originals)
  assert.deepEqual(demo.order.savedOrder, ids)
  assert.deepEqual(demo.order.draftOrder, ids)
  demo.projects[0].technologies.push('Local only')
  assert.deepEqual(originals, snapshot)
  assert.notEqual(demo.order.savedOrder, demo.order.draftOrder)
})

test('Add, Edit, visibility changes and Delete affect local state only', () => {
  const initial = createDemoState(originals)
  const created = saveDemoProject(initial, added)
  assert.equal(created.projects.length, 4)
  assert.equal(created.projects.at(-1).position, 3)
  const edited = saveDemoProject(created, { ...added, title: 'Edited locally', visible: true, technologies: ['WebP'] })
  assert.equal(edited.projects.at(-1).id, added.id)
  assert.equal(edited.projects.at(-1).visible, true)
  assert.equal(created.projects.at(-1).visible, false)
  const deleted = deleteDemoProject(edited, added.id)
  assert.deepEqual(deleted, initial)
  assert.deepEqual(originals, snapshot)
})

test('drag and Move Up/Down change draft only; Reset restores last locally saved order', () => {
  const initial = createDemoState(originals)
  const drag = changeDemoOrder(initial, { type: 'drop', id: ids[0], targetId: ids[1], blocked: false })
  assert.deepEqual(drag.order.draftOrder, [ids[1], ids[0], ids[2]])
  assert.deepEqual(drag.order.savedOrder, ids)
  assert.deepEqual(drag.projects, initial.projects)
  const down = changeDemoOrder(drag, { type: 'move', id: ids[1], direction: 1, blocked: false })
  assert.deepEqual(down.order.draftOrder, ids)
  const up = changeDemoOrder(initial, { type: 'move', id: ids[1], direction: -1, blocked: false })
  assert.deepEqual(up.order.draftOrder, drag.order.draftOrder)
  assert.deepEqual(changeDemoOrder(up, { type: 'reset', ids }).order, initial.order)
})

test('Save demo order normalizes positions locally and establishes a new reset baseline', () => {
  const draft = changeDemoOrder(createDemoState(originals), { type: 'move', id: ids[0], direction: 1, blocked: false })
  const saved = saveDemoOrder(draft)
  assert.deepEqual(saved.projects.map(project => project.id), [ids[1], ids[0], ids[2]])
  assert.deepEqual(saved.projects.map(project => project.position), [0, 1, 2])
  assert.deepEqual(saved.order.draftOrder, saved.order.savedOrder)
  const next = changeDemoOrder(saved, { type: 'move', id: ids[2], direction: -1, blocked: false })
  assert.deepEqual(changeDemoOrder(next, { type: 'reset', ids: saved.order.savedOrder }), saved)
  assert.deepEqual(originals, snapshot)
})

test('dirty order blocks local CRUD; search disables every reorder control', () => {
  const draft = changeDemoOrder(createDemoState(originals), { type: 'move', id: ids[0], direction: 1, blocked: false })
  assert.equal(projectOrderControls(draft.order, '', false).crudDisabled, true)
  assert.equal(saveDemoProject(draft, added), draft)
  assert.equal(deleteDemoProject(draft, ids[0]), draft)
  const controls = projectOrderControls(draft.order, 'React', false)
  assert.equal(controls.reorderDisabled, true)
  assert.equal(controls.saveDisabled, true)
  assert.equal(controls.resetDisabled, true)
  assert.deepEqual(changeDemoOrder(draft, { type: 'drop', id: ids[0], targetId: ids[2], blocked: true }), draft)
})

test('Reset demo discards local projects, edits, visibility and unsaved ordering', () => {
  let demo = saveDemoProject(createDemoState(originals), added)
  demo = saveDemoProject(demo, { ...demo.projects[0], visible: false, title: 'Temporary edit' })
  demo = changeDemoOrder(demo, { type: 'move', id: added.id, direction: -1, blocked: false })
  assert.notDeepEqual(demo, createDemoState(originals))
  assert.deepEqual(createDemoState(originals).projects, snapshot)
})

test('tab storage round-trip preserves text, visibility, saved and draft ordering', () => {
  let demo = saveDemoProject(createDemoState(originals), added)
  demo = changeDemoOrder(demo, { type: 'move', id: ids[0], direction: 1, blocked: false })
  assert.deepEqual(parseDemoState(serializeDemoState(demo)), demo)
  assert.equal(demoStorageKey, 'portfolio:cms-demo:v1')
})

test('stored local images fall back to prior stable URL; blob references are never serialized', () => {
  const demo = saveDemoProject(createDemoState(originals), { ...originals[0], previewUrl: 'blob:browser-only', localPreviewFallback: '/assets/preview.png' })
  const raw = serializeDemoState(demo)
  assert.equal(raw.includes('blob:'), false)
  assert.equal(raw.includes('localPreviewFallback'), false)
  assert.equal(parseDemoState(raw).projects[0].previewUrl, '/assets/preview.png')
  const created = saveDemoProject(demo, { ...added, previewUrl: 'blob:new-local-image', localPreviewFallback: null })
  assert.equal(parseDemoState(serializeDemoState(created)).projects.at(-1).previewUrl, null)
})

test('session parsing rejects corrupted, unsafe, oversized and inconsistent data', () => {
  for (const raw of [null, '{', '{}', 'null', 'x'.repeat(2_000_001)]) assert.equal(parseDemoState(raw), null)
  const valid = JSON.parse(serializeDemoState(createDemoState(originals)))
  for (const mutate of [
    value => { value.version = 999 },
    value => { value.projects[0].id = 'invalid' },
    value => { value.projects.push(value.projects[0]) },
    value => { value.projects[0].previewUrl = 'blob:expired' },
    value => { value.projects[0].githubUrl = 'javascript:alert(1)' },
    value => { value.projects[0].technologies = ['x'.repeat(51)] },
    value => { value.projects[0].visible = 'true' },
    value => { value.draftOrder[0] = added.id },
    value => { value.savedOrder.pop() },
    value => { value.draftOrder[0] = value.draftOrder[1] },
  ]) {
    const changed = structuredClone(valid); mutate(changed)
    assert.equal(parseDemoState(JSON.stringify(changed)), null)
  }
  const extra = structuredClone(valid)
  extra.projects[0].source = 'INTERNAL_SENTINEL'
  extra.projects[0].position = -500
  const parsed = parseDemoState(JSON.stringify(extra))
  assert.equal(JSON.stringify(parsed).includes('INTERNAL_SENTINEL'), false)
  assert.equal(parsed.projects[0].position, 0)
})

test('browser preview URLs survive form close and are released on replacement/delete/reset/unmount', () => {
  let counter = 0
  const revoked = []
  const previews = new DemoPreviewUrls({ createObjectURL: () => 'blob:demo-' + counter++, revokeObjectURL: url => revoked.push(url) })
  const first = previews.create(new File(['bytes'], 'demo.png'))
  previews.releaseUnused([{ ...originals[0], previewUrl: first }])
  assert.deepEqual(revoked, [])
  const replacement = previews.create(new File(['bytes'], 'replacement.webp'))
  previews.releaseUnused([{ ...originals[0], previewUrl: replacement }])
  assert.deepEqual(revoked, [first])
  previews.releaseUnused(originals)
  assert.deepEqual(revoked, [first, replacement])
  const last = previews.create(new File(['bytes'], 'last.jpg'))
  previews.dispose(); previews.dispose()
  assert.deepEqual(revoked, [first, replacement, last])
  assert.equal(revoked.includes('/assets/preview.png'), false)
})

test('demo preview validation accepts JPEG/PNG/WebP and rejects SVG, oversized and empty files', async () => {
  for (const [extension, type] of [['jpg', 'image/jpeg'], ['png', 'image/png'], ['webp', 'image/webp']]) {
    const file = new File([readFileSync(resolve(root, 'tests/fixtures/preview.' + extension))], 'demo.' + extension, { type })
    assert.equal((await validatePreviewFile(file)).success, true)
  }
  for (const file of [new File(['<svg/>'], 'demo.svg', { type: 'image/svg+xml' }),
    new File(['<html/>'], 'demo.png', { type: 'image/png' }),
    new File([new Uint8Array(previewMaxBytes + 1)], 'demo.png', { type: 'image/png' }),
    new File([], 'demo.png', { type: 'image/png' })]) assert.equal((await validatePreviewFile(file)).success, false)
})

function clientImportGraph(entry) {
  const visited = new Set(), packages = new Set()
  function visit(path) {
    if (visited.has(path)) return
    visited.add(path)
    const file = ts.createSourceFile(path, readFileSync(path, 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
    function inspect(node) {
      if (ts.isImportDeclaration(node) && !node.importClause?.isTypeOnly) {
        if (node.importClause?.namedBindings && ts.isNamedImports(node.importClause.namedBindings)
          && node.importClause.namedBindings.elements.every(item => item.isTypeOnly)) return
        const specifier = node.moduleSpecifier.text
        if (specifier.startsWith('.')) {
          const base = resolve(dirname(path), specifier)
          const target = [base + '.tsx', base + '.ts', base].find(existsSync)
          assert.ok(target, 'Every relative client import must resolve')
          visit(target)
        } else packages.add(specifier)
      }
      assert.ok(!(ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword), 'Review dynamic client imports explicitly')
      ts.forEachChild(node, inspect)
    }
    inspect(file)
  }
  visit(resolve(root, entry))
  return { paths: [...visited].map(path => relative(root, path)), packages: [...packages] }
}

test('demo client import graph cannot reach real actions, auth, Supabase clients, Storage or RPC helpers', () => {
  const graph = clientImportGraph('src/components/demo/CmsDemo.tsx')
  for (const path of graph.paths) {
    assert.ok(!path.startsWith('src/app/admin/'), path)
    assert.ok(!/src\/lib\/(auth|supabase\/|project-previews|projects\.ts)/.test(path), path)
    assert.ok(!/GithubImport|github-import|github-projects|github-actions/.test(path), path)
    assert.ok(!/['"]use server['"]/.test(source(path)), path)
    assert.ok(!/\.(rpc|auth|storage)\b|\bfetch\s*\(/.test(source(path)), path)
  }
  assert.ok(!graph.packages.some(name => name.includes('supabase')))
  for (const shared of ['ProjectFormDialog', 'ProjectDeleteDialog', 'AdminProjectCard', 'ProjectDragHandle', 'PreviewImageInput', 'TechnologyInput', 'Dialog'])
    assert.ok(graph.paths.includes('src/components/admin/' + shared + '.tsx'))
  assert.match(source('src/components/admin/ProjectForm.tsx'), /from '..\/..\/app\/admin\/project-actions'/)
  assert.match(source('src/components/admin/DeleteProjectDialog.tsx'), /from '..\/..\/app\/admin\/project-actions'/)
})

test('demo route stays anonymous and reads only visible public presentation fields', async () => {
  assert.match(source('src/proxy.ts'), /matcher: \['\/admin\/:path\*'\]/)
  assert.ok(!/requireAdmin|admin\/actions|cookies\(/.test(source('src/app/cms-demo/page.tsx')))
  assert.match(source('src/app/cms-demo/page.tsx'), /await getDemoProjects\(\)/)
  const calls = []
  const publicClient = { from(table) {
    calls.push(['from', table])
    return { select(columns) {
      calls.push(['select', columns])
      return { order(column) { calls.push(['order', column]); return this }, eq(column, value) { calls.push(['eq', column, value]); return this },
        async abortSignal() { return { data: [Object.fromEntries(Object.entries({
          id: ids[0], title: 'Visible', category: 'Public', short_description: null, description: 'Public description', preview_url: '/assets/preview.png',
          github_url: null, production_url: null, telegram_url: null, technologies: [], position: 0, visible: true,
        }))], error: null } } }
    } }
  } }
  globalThis.demoPublicReadFixture = publicClient
  const { getDemoProjects } = await import(compile('src/lib/projects.ts', {
    'server-only': moduleUrl(''), './auth': moduleUrl('export async function requireAdmin() { throw new Error("Demo must not authorize") }'),
    './supabase/public': moduleUrl('export const supabase = globalThis.demoPublicReadFixture'),
  }))
  const result = await getDemoProjects()
  assert.deepEqual(calls.filter(call => call[0] === 'eq'), [['eq', 'visible', true]])
  assert.equal(result.length, 1)
  assert.equal(result[0].visible, true)
  for (const internal of ['source', 'github_repo', 'created_at', 'updated_at']) assert.equal(internal in result[0], false)
})
