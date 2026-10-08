import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import { compile, moduleUrl, hookReact, hookHarness, settled, source } from './cms-demo-test-helpers.mjs'

const parser = compile('src/lib/github-repository.ts')
const fixtures = compile('src/lib/cms-demo-fixtures.ts', { './github-repository': parser })
const simulations = compile('src/lib/cms-demo-simulation.ts')
const validation = compile('src/lib/project-validation.ts')
const previewValidation = compile('src/lib/preview-file.ts')
const merges = compile('src/lib/ai-suggestions.ts', { './github-repository': parser })
const { museDemoFixture, initialDemoProjects, findDemoRepository, findDemoPreview, demoImportFields, demoAiSuggestions } = await import(fixtures)
const { DemoSimulation, waitForDemo, demoDelays } = await import(simulations)
const { validateAiSuggestions, mergeAiSuggestions } = await import(merges)
const { DemoProjectPrefill } = await import(compile('src/components/demo/DemoProjectPrefill.tsx', {
  react: hookReact, '../../lib/github-repository': parser, '../../lib/cms-demo-fixtures': fixtures, '../../lib/cms-demo-simulation': simulations,
}))
const sampleBytes = readFileSync(new URL('../public/assets/cms-demo/muse-preview.jpg', import.meta.url))
const sampleFile = () => new File([sampleBytes], 'muse-demo-preview.jpg', { type: 'image/jpeg' })
const { DemoPreviewTools } = await import(compile('src/components/demo/DemoPreviewTools.tsx', {
  react: hookReact, '../../lib/cms-demo-fixtures': fixtures, '../../lib/cms-demo-simulation': simulations,
  '../../lib/cms-demo-preview': moduleUrl('export async function createDemoPreview(){return globalThis.demoUiFixture.loadPreview()}'),
}))
const { ProjectFormDialog } = await import(compile('src/components/admin/ProjectFormDialog.tsx', {
  react: hookReact, 'next/navigation': moduleUrl('export function unstable_rethrow(){}'),
  '../../lib/project-validation': validation, '../../lib/ai-suggestions': merges,
  '../../lib/pending-preview': compile('src/lib/pending-preview.ts'),
  './Dialog': moduleUrl('export function Dialog(){}'), './Icon': moduleUrl('export function Icon(){}'),
  './TechnologyInput': moduleUrl('export function TechnologyInput(){}'), './PreviewImageInput': moduleUrl('export function PreviewImageInput(){}'),
}))

function prefillHarness({ repositoryUrl = '', onApplySuggestions = () => true } = {}) {
  const applied = [], suggestions = [], pending = []
  const ui = hookHarness(DemoProjectPrefill, { disabled: false, repositoryUrl,
    onApply: fields => applied.push(fields), onApplySuggestions: (...args) => { suggestions.push(args); return onApplySuggestions(...args) },
    onPendingChange: value => pending.push(value) })
  return { ...ui, applied, suggestions, pending,
    button: name => ui.find(node => node.type === 'button' && node.props.children === name),
    input: () => ui.find(node => node.props?.type === 'url'),
    text: () => ['import', 'ai'].map(kind => ui.find(node => node.props?.id === `demo-fixture-${kind}-feedback`).props.children).join(' ') }
}
function previewHarness({ productionUrl = museDemoFixture.productionUrl, autoCapture = null, accept = true, loadPreview = async () => sampleFile() } = {}) {
  const accepted = [], pending = []
  const ui = hookHarness(DemoPreviewTools, { disabled: false, productionUrl, autoCapture, previewRevision: 0,
    onAccept: (...args) => { accepted.push(args); return accept }, onPendingChange: value => pending.push(value) }, { loadPreview })
  return { ...ui, accepted, pending, button: () => ui.find(node => node.type === 'button'),
    feedback: () => ui.find(node => node.props?.role === 'status').props.children }
}
function fakeClock(t) { t.mock.timers.enable({ apis: ['setTimeout'] }); return async ms => { t.mock.timers.tick(ms); await settled() } }

test('MUSE lookup normalizes case/.git; authored fields are independent and unsupported URLs fabricate nothing', () => {
  for (const url of [museDemoFixture.githubUrl, 'https://github.com/IGOR9779/AI-CREATOR.git']) assert.equal(findDemoRepository(url), museDemoFixture)
  for (const url of ['', 'https://github.com/example/unknown', 'https://internal.test/a/b', 'https://github.com/a/b/tree/main']) assert.equal(findDemoRepository(url), null)
  const fields = demoImportFields(museDemoFixture); fields.technologies.push('Mutated locally')
  assert.deepEqual(demoImportFields(museDemoFixture).technologies, ['TypeScript', 'CSS', 'HTML'])
  assert.equal(findDemoPreview(museDemoFixture.productionUrl), museDemoFixture)
  assert.equal(findDemoPreview('https://other.vercel.app/'), null)
})

test('Use MUSE example fills input; import has deterministic loading and duplicate/AI overlap protection', async t => {
  const tick = fakeClock(t), ui = prefillHarness()
  ui.button('Use MUSE example').props.onClick(); ui.render()
  assert.equal(ui.input().props.value, museDemoFixture.githubUrl)
  ui.button('Import from GitHub').props.onClick(); ui.button('Import from GitHub').props.onClick(); ui.render()
  assert.equal(ui.button('Importing…').props.disabled, true)
  assert.equal(ui.button('Demo AI Auto-fill').props.disabled, true)
  assert.deepEqual(ui.applied, [])
  await tick(649); assert.deepEqual(ui.applied, [])
  await tick(1); ui.render()
  assert.deepEqual(ui.applied, [demoImportFields(museDemoFixture)])
  assert.deepEqual(ui.pending, [true, false]); assert.match(ui.text(), /Sample repository imported/)
  ui.unmount()
})

test('invalid and unsupported imports show deterministic feedback without applying form data', async t => {
  const tick = fakeClock(t)
  for (const [url, expected] of [['https://github.com/example/unknown', /Try the MUSE example/], ['https://internal.test/a/b', /Enter a GitHub/]]) {
    const ui = prefillHarness(); ui.input().props.onChange({ target: { value: url } }); ui.render()
    ui.button('Import from GitHub').props.onClick(); await tick(650); ui.render()
    assert.deepEqual(ui.applied, []); assert.match(ui.text(), expected); ui.unmount()
  }
})

test('import input changes and unmount/reset cancellation reject pending results without waiting', async t => {
  const tick = fakeClock(t)
  for (const change of ['input', 'unmount']) {
    const ui = prefillHarness(); ui.button('Use MUSE example').props.onClick(); ui.render()
    ui.button('Import from GitHub').props.onClick()
    if (change === 'input') { ui.input().props.onChange({ target: { value: 'https://github.com/other/repo' } }); ui.render() }
    else ui.unmount()
    await tick(650); assert.deepEqual(ui.applied, [])
    if (change === 'input') { ui.render(); assert.match(ui.text(), /changed/); ui.unmount() }
  }
})

test('Demo AI waits 1100ms, requires supported identity and applies deterministic suggestions', async t => {
  const tick = fakeClock(t)
  const unknown = prefillHarness({ repositoryUrl: 'https://github.com/example/unknown' })
  assert.equal(unknown.button('Demo AI Auto-fill').props.disabled, true)
  unknown.button('Demo AI Auto-fill').props.onClick(); await tick(1100); assert.deepEqual(unknown.suggestions, []); unknown.unmount()
  const ui = prefillHarness({ repositoryUrl: museDemoFixture.githubUrl })
  ui.button('Demo AI Auto-fill').props.onClick(); ui.button('Demo AI Auto-fill').props.onClick(); ui.render()
  assert.equal(ui.button('Generating…').props.disabled, true)
  await tick(1099); assert.deepEqual(ui.suggestions, [])
  await tick(1); ui.render()
  assert.deepEqual(ui.suggestions, [[demoAiSuggestions(museDemoFixture), museDemoFixture.repository]])
  assert.deepEqual(ui.pending, [true, false]); ui.unmount()
})

test('AI URL round-trip, rejected merge and teardown leave current form unchanged', async t => {
  const tick = fakeClock(t)
  for (const change of ['roundtrip', 'reject', 'unmount']) {
    const ui = prefillHarness({ repositoryUrl: museDemoFixture.githubUrl, onApplySuggestions: () => change !== 'reject' })
    ui.button('Demo AI Auto-fill').props.onClick()
    if (change === 'roundtrip') { ui.props.repositoryUrl = 'https://github.com/other/repo'; ui.render(); ui.props.repositoryUrl = museDemoFixture.githubUrl; ui.render() }
    if (change === 'unmount') ui.unmount()
    await tick(1100)
    assert.equal(ui.suggestions.length, change === 'reject' ? 1 : 0)
    if (change !== 'unmount') { ui.render(); assert.match(ui.text(), /changed/); ui.unmount() }
  }
})

test('MUSE suggestions validate strictly and preserve explicit mock/no-backend evidence', () => {
  const authored = JSON.parse(source('tests/fixtures/muse-repository.json')).suggestions
  const values = museDemoFixture.suggestions
  assert.equal(values.shortDescription, authored.short_description)
  assert.match(values.description, /scripted mock chat/)
  assert.match(values.description, /without a backend, database, authentication or payments/)
  assert.match(values.description, /no live AI API/)
  assert.match(values.description, /Telegram Mini App/); assert.match(values.description, /EN\/UA\/RU/)
  assert.doesNotMatch(values.description, /live AI-powered chat|database-backed|authentication system|payment processing/)
  assert.ok(validateAiSuggestions({ title: values.title, category: values.category, short_description: values.shortDescription, description: values.description, technologies: values.technologies }))
})

test('AI merge changes exactly five fields; all links, preview mode, visibility and provenance stay intact', () => {
  const draft = { importedRepository: museDemoFixture.repository, previewMode: 'url', values: {
    title: 'Before', category: 'Before', shortDescription: 'Before', description: 'Before', technologies: ['Before'],
    githubUrl: museDemoFixture.githubUrl, productionUrl: museDemoFixture.productionUrl, telegramUrl: 'https://t.me/example', previewUrl: '/assets/custom.jpg', visible: false,
  } }
  const next = mergeAiSuggestions(draft, demoAiSuggestions(museDemoFixture), museDemoFixture.repository)
  assert.deepEqual(Object.keys(draft.values).filter(key => JSON.stringify(next.values[key]) !== JSON.stringify(draft.values[key])), ['title', 'category', 'shortDescription', 'description', 'technologies'])
  assert.equal(next.importedRepository, draft.importedRepository); assert.equal(next.previewMode, draft.previewMode)
})

test('automatic sample preview and Retake use File callbacks, bounded loading and no external target', async t => {
  const tick = fakeClock(t), ui = previewHarness({ autoCapture: { url: museDemoFixture.productionUrl, sequence: 1 } })
  await settled(); ui.render(); assert.equal(ui.button().props.disabled, true)
  await tick(899); assert.deepEqual(ui.accepted, [])
  await tick(1); ui.render(); assert.equal(ui.accepted.length, 1)
  assert.equal(ui.accepted[0][0].type, 'image/jpeg'); assert.match(ui.feedback(), /Sample preview selected/)
  ui.render(); await settled(); assert.equal(ui.accepted.length, 1)
  ui.button().props.onClick(); ui.button().props.onClick(); await tick(900); ui.render()
  assert.equal(ui.accepted.length, 2); assert.deepEqual(ui.pending, [true, false, true, false]); ui.unmount()
})

test('preview missing/unsupported URL skips safely; failures preserve the previous selection', async t => {
  const tick = fakeClock(t)
  for (const productionUrl of ['', 'https://other.vercel.app/']) {
    let loads = 0
    const ui = previewHarness({ productionUrl, autoCapture: { url: productionUrl, sequence: 1 }, loadPreview: async () => { loads++; return sampleFile() } })
    await settled(); ui.render(); assert.equal(loads, 0); assert.deepEqual(ui.accepted, []); assert.deepEqual(ui.pending, [false]); ui.unmount()
  }
  const ui = previewHarness({ loadPreview: async () => { throw new Error('INTERNAL_DETAIL') } })
  ui.button().props.onClick(); await tick(900); ui.render()
  assert.deepEqual(ui.accepted, []); assert.match(ui.feedback(), /current preview is unchanged/)
  assert.doesNotMatch(ui.feedback(), /INTERNAL/); ui.unmount()
})

test('manual selection, URL round-trip, rejected acceptance and unmount discard stale previews', async t => {
  const tick = fakeClock(t)
  for (const change of ['manual', 'url', 'roundtrip', 'reject', 'unmount']) {
    const ui = previewHarness({ accept: change !== 'reject' }); ui.button().props.onClick()
    if (change === 'manual') { ui.props.previewRevision++; ui.render() }
    if (change === 'url' || change === 'roundtrip') { ui.props.productionUrl = 'https://other.vercel.app/'; ui.render() }
    if (change === 'roundtrip') { ui.props.productionUrl = museDemoFixture.productionUrl; ui.render() }
    if (change === 'unmount') ui.unmount()
    await tick(900); assert.equal(ui.accepted.length, change === 'reject' ? 1 : 0)
    if (change !== 'unmount') { ui.render(); assert.match(ui.feedback(), /changed/); ui.unmount() }
  }
})

test('a newer automatic preview waits for the previous operation, which cannot overwrite it', async t => {
  const tick = fakeClock(t), ui = previewHarness({ autoCapture: { url: museDemoFixture.productionUrl, sequence: 1 } })
  await settled(); ui.render()
  ui.props.autoCapture = { url: museDemoFixture.productionUrl, sequence: 2 }; ui.render(); await settled()
  await tick(900); ui.render(); await settled(); assert.deepEqual(ui.accepted, [])
  await tick(900); ui.render(); assert.equal(ui.accepted.length, 1); ui.unmount()
})

test('simulation cancellation clears timers, settles waits, and old operations cannot finish new ones', async t => {
  const tick = fakeClock(t), operation = new DemoSimulation(), first = operation.begin()
  assert.equal(operation.begin(), null)
  const waiting = waitForDemo(650, first.signal)
  operation.cancel(); assert.equal(await waiting, false)
  const second = operation.begin(); assert.equal(operation.current(first), false); assert.equal(operation.finish(first), false)
  assert.equal(operation.current(second), true)
  const next = waitForDemo(1100, second.signal); await tick(1100); assert.equal(await next, true)
  assert.equal(operation.finish(second), true); assert.equal(operation.pending, false)
  assert.deepEqual(demoDelays, { import: 650, preview: 900, ai: 1100 })
})

test('preview transport permits one fixed local asset only, caches bytes offline and recognizes File identity', async () => {
  const { createDemoPreview, demoPreviewAsset, warmDemoPreview } = await import(compile('src/lib/cms-demo-preview.ts', { './cms-demo-fixtures': fixtures, './preview-file': previewValidation }))
  const original = globalThis.fetch, requests = []
  try {
    globalThis.fetch = async (url, options) => { requests.push([url, options]); return new Response(sampleBytes, { headers: { 'content-type': 'image/jpeg' } }) }
    warmDemoPreview(); await settled()
    const file = await createDemoPreview(); const again = await createDemoPreview()
    assert.equal(requests.length, 1); assert.equal(requests[0][0], '/assets/cms-demo/muse-preview.jpg')
    assert.equal(requests[0][1].redirect, 'error'); assert.equal(requests[0][1].credentials, 'omit')
    assert.equal(demoPreviewAsset(file), museDemoFixture.previewAsset); assert.equal(demoPreviewAsset(sampleFile()), null)
    assert.notEqual(file, again); assert.equal(file.type, 'image/jpeg')
    const data = new FormData(); data.set('previewFile', file); assert.equal(demoPreviewAsset(data.get('previewFile')), museDemoFixture.previewAsset)
    globalThis.fetch = () => assert.fail('All later previews must use cached bytes')
    assert.equal((await createDemoPreview()).size, sampleBytes.length)
  } finally { globalThis.fetch = original }
})

test('invalid local sample responses fail safely without marking files or poisoning the cache', async () => {
  const freshFixtures = moduleUrl(`export { museDemoFixture } from '${fixtures}'`)
  const { createDemoPreview } = await import(compile('src/lib/cms-demo-preview.ts', { './cms-demo-fixtures': freshFixtures, './preview-file': previewValidation }))
  const original = globalThis.fetch
  try {
    for (const response of [new Response('missing', { status: 404 }), new Response('<html/>', { headers: { 'content-type': 'text/html' } }),
      new Response('<html/>', { headers: { 'content-type': 'image/jpeg' } })]) {
      globalThis.fetch = async () => response
      await assert.rejects(createDemoPreview(), /Sample preview unavailable/)
    }
    globalThis.fetch = async () => new Response(sampleBytes, { headers: { 'content-type': 'image/jpeg' } })
    assert.equal((await createDemoPreview()).type, 'image/jpeg')
  } finally { globalThis.fetch = original }
})

function PrefillFixture() {}
function PreviewFixture() {}
test('shared form accepts sample File, AI preserves it, draft holds text only and Cancel saves nothing', () => {
  const changes = [], saved = [], ui = hookHarness(ProjectFormDialog, { mode: 'add', localOnly: true, prefill: PrefillFixture, previewTools: PreviewFixture,
    onClose() {}, onSaved() {}, onSave: data => saved.push(data), onDraftChange: draft => changes.push(draft) })
  const fields = demoImportFields(museDemoFixture)
  ui.find(node => node.type === PrefillFixture).props.onApply(fields); ui.render()
  const tools = ui.find(node => node.type === PreviewFixture).props
  assert.equal(tools.autoCapture.url, museDemoFixture.productionUrl)
  const file = sampleFile(); assert.equal(tools.onAccept(file, museDemoFixture.productionUrl, 0), true); ui.render()
  const selected = ui.find(node => node.type?.name === 'PreviewImageInput').props.selection
  assert.equal(selected.file, file)
  ui.find(node => node.type === PrefillFixture).props.onApplySuggestions(demoAiSuggestions(museDemoFixture), museDemoFixture.repository); ui.render()
  assert.equal(ui.find(node => node.type?.name === 'PreviewImageInput').props.selection, selected)
  assert.equal(changes.at(-1).values.title, museDemoFixture.suggestions.title)
  assert.ok(!/blob:|base64|previewFile/.test(JSON.stringify(changes)))
  ui.find(node => node.type === 'button' && node.props.children === 'Cancel').props.onClick()
  assert.deepEqual(saved, []); ui.unmount()
})

test('production adapters keep their real handlers while demo injects only local ones', () => {
  for (const [path, marker] of [
    ['src/components/admin/ProjectForm.tsx', /onSave=\{createProject\}/],
    ['src/components/admin/ProjectPrefill.tsx', /<GithubImport/],
    ['src/components/admin/AiAutofill.tsx', /await autofillProject\(parsed.url\)/],
    ['src/components/admin/ProjectScreenshot.tsx', /await requestScreenshot\(url/],
    ['src/app/admin/project-actions.ts', /create_project_first/],
  ]) assert.match(source(path), marker)
  assert.match(source('src/components/demo/CmsDemo.tsx'), /prefill=\{editor.mode === 'add' \? DemoProjectPrefill : undefined\}/)
  assert.match(source('src/components/demo/CmsDemo.tsx'), /previewTools=\{DemoPreviewTools\}/)
  assert.equal(initialDemoProjects.length, 3)
})
