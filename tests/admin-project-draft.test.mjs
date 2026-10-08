import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import ts from 'typescript'

const source = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8')
const moduleUrl = code => 'data:text/javascript;base64,' + Buffer.from(code).toString('base64')
function compile(path, replacements = {}) {
  return moduleUrl(ts.transpileModule(source(path), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext, jsx: ts.JsxEmit.ReactJSX },
    transformers: { before: [context => file => ts.visitNode(file, function visit(node) {
      if (ts.isImportDeclaration(node) && replacements[node.moduleSpecifier.text]) return ts.factory.updateImportDeclaration(
        node, node.modifiers, node.importClause, ts.factory.createStringLiteral(replacements[node.moduleSpecifier.text]), node.attributes)
      return ts.visitEachChild(node, visit, context)
    })] },
  }).outputText.replace('from "react/jsx-runtime"', `from "${import.meta.resolve('react/jsx-runtime')}"`))
}
const validation = compile('src/lib/project-validation.ts')
const repository = compile('src/lib/github-repository.ts')
const suggestionsModule = compile('src/lib/ai-suggestions.ts', { './github-repository': repository })
const draftModule = compile('src/lib/admin-project-draft.ts', {
  './project-validation': validation, './github-repository': repository,
})
const { adminProjectDraftKey, emptyProjectDraft, serializeProjectDraft, parseProjectDraft, persistProjectDraft, loadProjectDraft, clearProjectDraft } = await import(draftModule)
const { Dialog } = await import(compile('src/components/admin/Dialog.tsx', {
  react: moduleUrl('export function useEffect() {}; export function useRef() { return { current: null } }'),
}))
const formReact = moduleUrl(`
  export function useId() { return 'form-fixture' }
  function slot(initial) {
    const fixture = globalThis.projectFormHooks, index = fixture.index++
    if (!(index in fixture.slots)) fixture.slots[index] = typeof initial === 'function' ? initial() : initial
    return [fixture.slots[index], value => { fixture.slots[index] = typeof value === 'function' ? value(fixture.slots[index]) : value }]
  }
  export const useState = slot
  export function useEffect() {}
  export function useRef(initial) { return slot({current:initial})[0] }
  export function useActionState(action, initial) { const [value,set] = slot(initial); return [value, async data => { const result = await action(value,data); set(result); return result }, false] }
  export function useSyncExternalStore(_subscribe, getSnapshot) { return getSnapshot() }
`)
const { ProjectFormDialog } = await import(compile('src/components/admin/ProjectFormDialog.tsx', {
  react: formReact, 'next/navigation': moduleUrl('export function unstable_rethrow() {}'),
  '../../lib/project-validation': validation,
  '../../lib/ai-suggestions': suggestionsModule,
  '../../lib/pending-preview': compile('src/lib/pending-preview.ts'),
  './Dialog': moduleUrl('export function Dialog() {}'), './Icon': moduleUrl('export function Icon() {}'),
  './TechnologyInput': moduleUrl('export function TechnologyInput() {}'), './PreviewImageInput': moduleUrl('export function PreviewImageInput() {}'),
}))
const { ProjectForm } = await import(compile('src/components/admin/ProjectForm.tsx', {
  react: formReact, '../../lib/admin-project-draft': draftModule,
  '../../app/admin/project-actions': moduleUrl('export async function createProject() { return globalThis.projectFormActionResult }; export async function updateProject() { throw new Error("Unexpected edit") }'),
  './ProjectFormDialog': moduleUrl('export function ProjectFormDialog() {}'), './ProjectPrefill': moduleUrl('export function ProjectPrefill() {}'),
  './ProjectScreenshot': moduleUrl('export function ProjectScreenshot() {}'),
}))
function formHarness(initialDraft = emptyProjectDraft()) {
  globalThis.projectFormHooks = { index: 0, slots: [] }
  let controls, element
  const changes = []
  function FixturePrefill() {}
  function render() {
    globalThis.projectFormHooks.index = 0
    element = ProjectFormDialog({ mode: 'add', initialDraft, onClose() {}, onSaved() {}, async onSave() { return {success:false,message:'Fixture'} },
      onDraftChange: draft => changes.push(draft), prefill: FixturePrefill })
    controls = nodes(element).find(node => node.type === FixturePrefill).props
  }
  function nodes(node) {
    if (!node || typeof node !== 'object') return []
    if (Array.isArray(node)) return node.flatMap(nodes)
    return [node, ...nodes(node.props?.children)]
  }
  function find(predicate) { const node = nodes(element).find(predicate); assert.ok(node); return node }
  render()
  return { changes, render, field(name) { return find(node => node.props?.name === name) },
    preview() { return find(node => node.type?.name === 'PreviewImageInput') }, import(fields) { controls.onApply(fields); render() },
    ai(fields, repository) { const applied = controls.onApplySuggestions(fields, repository); render(); return applied },
    controls() { return controls } }
}
function storage() {
  const entries = new Map()
  return { getItem: key => entries.get(key) ?? null, setItem: (key, value) => entries.set(key, value), removeItem: key => entries.delete(key) }
}
const draft = { values: { ...emptyProjectDraft().values, title: '  Unfinished title  ', category: '',
  shortDescription: 'Short draft', description: 'Work\nin progress', previewUrl: '/assets/example.png',
  githubUrl: 'https://github.com/Example/Repository', productionUrl: 'https://', telegramUrl: '',
  technologies: ['TypeScript', 'CSS'], visible: false }, previewMode: 'url', importedRepository: 'example/repository' }

test('file-picker cancel is ignored by the actual dialog handler, so the form is not unmounted', () => {
  let closed = 0, prevented = 0
  const element = Dialog({ children: null, onClose: () => closed++, titleId: 'title' })
  const dialog = {}, input = { type: 'file' }
  element.props.onCancel({ target: input, currentTarget: dialog, preventDefault: () => prevented++ })
  assert.equal(closed, 0)
  assert.equal(prevented, 0)
  element.props.onCancel({ target: dialog, currentTarget: dialog, preventDefault: () => prevented++ })
  assert.equal(closed, 1)
  assert.equal(prevented, 1)
})

test('the dialog still prevents Escape dismissal while a save is pending', () => {
  let closed = 0, prevented = 0
  const element = Dialog({ busy: true, children: null, onClose: () => closed++, titleId: 'title' })
  const dialog = {}
  element.props.onCancel({ target: dialog, currentTarget: dialog, preventDefault: () => prevented++ })
  assert.equal(closed, 0)
  assert.equal(prevented, 1)
})

test('preview selection/validation changes never reset entered text in the actual form component', () => {
  const form = formHarness()
  form.field('title').props.onChange({target:{value:'Entered title'}}); form.render()
  form.field('description').props.onChange({target:{value:'Entered description'}}); form.render()
  form.preview().props.onValidityChange(false); form.render()
  form.preview().props.onValidityChange(true); form.render()
  assert.equal(form.field('title').props.value, 'Entered title')
  assert.equal(form.field('description').props.value, 'Entered description')
  assert.equal(form.changes.at(-1).values.title, 'Entered title')
})

test('GitHub imported fields and provenance survive preview interactions and reach the draft callback', () => {
  const form = formHarness()
  form.import({title:'Imported repository',shortDescription:'Imported short description',description:'Imported description',
    githubUrl:'https://github.com/Example/Repository',githubRepository:'example/repository',productionUrl:'https://example.test/',technologies:['TypeScript']})
  form.preview().props.onValidityChange(false); form.render()
  form.preview().props.onValidityChange(true); form.render()
  assert.equal(form.field('title').props.value, 'Imported repository')
  assert.equal(form.field('description').props.value, 'Imported description')
  assert.equal(form.field('importedGithubRepo').props.value, 'example/repository')
  assert.deepEqual(form.changes.at(-1).values.technologies, ['TypeScript'])
  assert.equal(form.changes.at(-1).importedRepository, 'example/repository')
})

test('AI applies exactly five fields through the real dialog draft callback and preserves previews and provenance', () => {
  const form = formHarness(draft)
  const preview = form.preview()
  assert.equal(form.ai({title:'Suggested title',category:'Frontend',shortDescription:'Suggested short',description:'Suggested description',technologies:['React']},'example/repository'),true)
  const updated = form.changes.at(-1)
  assert.equal(updated.values.githubUrl,draft.values.githubUrl)
  assert.equal(updated.values.productionUrl,draft.values.productionUrl)
  assert.equal(updated.values.telegramUrl,draft.values.telegramUrl)
  assert.equal(updated.values.visible,false)
  assert.equal(updated.values.previewUrl,draft.values.previewUrl)
  assert.equal(updated.previewMode,draft.previewMode)
  assert.equal(updated.importedRepository,draft.importedRepository)
  assert.equal(form.preview().type,preview.type)
  assert.equal(form.preview().props.sourceUrl,preview.props.sourceUrl)
  const tab = storage()
  persistProjectDraft(tab,updated)
  assert.deepEqual(loadProjectDraft(tab),updated)
  assert.equal(loadProjectDraft(tab).values.title,'Suggested title')
})

test('stale AI callbacks cannot overwrite a changed repository or any draft fields', () => {
  const form = formHarness(draft)
  const oldCallback = form.controls().onApplySuggestions
  form.field('githubUrl').props.onChange({target:{value:'https://github.com/another/repository'}}); form.render()
  const before = structuredClone(form.changes.at(-1))
  assert.equal(oldCallback({title:'Stale',category:'Stale',shortDescription:'Stale',description:'Stale',technologies:[]},'example/repository'),false)
  form.render()
  assert.deepEqual(form.changes.at(-1),before)
  assert.equal(form.field('title').props.value,draft.values.title)
})

test('stale AI callbacks reject changed import provenance even when the repository identity is unchanged', () => {
  const form = formHarness(draft)
  const oldCallback = form.controls().onApplySuggestions
  form.field('githubUrl').props.onChange({target:{value:'https://github.com/Example/Repository.git'}}); form.render()
  const before = structuredClone(form.changes.at(-1))
  assert.equal(before.importedRepository,null)
  assert.equal(oldCallback({title:'Stale',category:'Stale',shortDescription:'Stale',description:'Stale',technologies:[]},'example/repository'),false)
  form.render()
  assert.deepEqual(form.changes.at(-1),before)
  assert.equal(form.field('title').props.value,draft.values.title)
})

test('prefill pending disables other imports and form edits without clearing the draft', () => {
  const form = formHarness(draft)
  form.controls().onPendingChange(true); form.render()
  assert.equal(form.controls().disabled,true)
  assert.equal(form.field('title').props.value,draft.values.title)
  form.controls().onPendingChange(false); form.render()
  assert.equal(form.controls().disabled,false)
  assert.equal(form.changes.length,0)
})

test('unfinished fields and GitHub metadata restore after reopening or refresh without full-form validity', () => {
  const tab = storage()
  assert.equal(persistProjectDraft(tab, draft), true)
  assert.deepEqual(loadProjectDraft(tab), draft)
  assert.deepEqual(loadProjectDraft(tab), draft)
  const serialized = JSON.parse(tab.getItem(adminProjectDraftKey))
  assert.equal(serialized.source, 'github')
  assert.equal(serialized.github_repo, 'example/repository')
  assert.equal(serialized.values.productionUrl, 'https://') // URL normalization is never applied to draft text.
})

test('success and explicit discard remove the stored draft; empty defaults do not resurrect it', () => {
  const tab = storage()
  persistProjectDraft(tab, draft)
  assert.equal(clearProjectDraft(tab), true)
  assert.equal(loadProjectDraft(tab), null)
  persistProjectDraft(tab, emptyProjectDraft())
  assert.equal(tab.getItem(adminProjectDraftKey), null)
  persistProjectDraft(tab, draft)
  clearProjectDraft(tab)
  assert.equal(loadProjectDraft(tab), null)
  // Successful creation clears before the parent closes. Persisting is invoked
  // by edit events only, so there is no post-save effect recreating the draft.
  assert.match(source('src/components/admin/ProjectForm.tsx'), /onSaved=\{\(project\) => \{ clearProjectDraft\(loaded.storage\); onSaved\(project\) \}\}/)
})

test('the real Add adapter clears its draft only after successful Create, before notifying the dashboard', async () => {
  const tab = storage()
  const previousWindow = globalThis.window
  globalThis.window = { sessionStorage: tab }
  try {
    for (const success of [false, true]) {
      persistProjectDraft(tab, draft)
      globalThis.projectFormHooks = { index: 0, slots: [] }
      const project = { id: '00000000-0000-0000-0000-000000000001', title: 'Created first', position: 0 }
      globalThis.projectFormActionResult = success ? { success: true, project } : { success: false, message: 'Unable to save the project. Please try again.' }
      let saved = 0
      const adapter = ProjectForm({ mode: 'add', onClose() {}, onSaved(value) {
        saved++
        assert.equal(loadProjectDraft(tab), null)
        assert.equal(value.position, 0)
      } })
      const presentation = adapter.type(adapter.props)
      const dialog = ProjectFormDialog(presentation.props)
      const response = await dialog.props.children.props.action(new FormData())
      assert.equal(response.success, success)
      assert.equal(saved, success ? 1 : 0)
      assert.deepEqual(loadProjectDraft(tab), success ? null : draft)
    }
  } finally {
    if (previousWindow === undefined) delete globalThis.window
    else globalThis.window = previousWindow
    delete globalThis.projectFormActionResult
  }
})

test('drafts serialize only whitelisted editable fields, excluding Files and sensitive/internal extras', () => {
  const raw = serializeProjectDraft({ ...draft, file: new File(['example'], 'preview.png'), accessToken: 'DO_NOT_PERSIST', values: { ...draft.values, password: 'DO_NOT_PERSIST', id: 'arbitrary', position: 99 } })
  assert.equal(raw.includes('DO_NOT_PERSIST'), false)
  assert.equal(raw.includes('preview.png'), false)
  assert.equal(raw.includes('position'), false)
  assert.equal(raw.includes('"id"'), false)
  assert.deepEqual(parseProjectDraft(raw), draft)
})

test('corrupted, oversized, invalid and mismatched import drafts are ignored safely', () => {
  for (const raw of [null, '', '{', 'null', '[]', '{}', 'x'.repeat(60001)]) assert.equal(parseProjectDraft(raw), null)
  for (const mutate of [
    value => { value.version = 2 }, value => { value.values.title = 3 },
    value => { value.values.visible = 'true' }, value => { value.values.description = 'x'.repeat(10001) },
    value => { value.values.technologies = ['TypeScript', 'typescript'] },
    value => { value.values.previewUrl = 'blob:obsolete' }, value => { value.values.previewUrl = 'data:image/png;base64,test' },
    value => { value.github_repo = 'another/repository' }, value => { value.source = 'ai' },
    value => { value.previewMode = 'file' }, value => { value.values.githubUrl = 'https://example.test/repository' },
  ]) {
    const value = JSON.parse(serializeProjectDraft(draft)); mutate(value)
    assert.equal(parseProjectDraft(JSON.stringify(value)), null)
  }
})

test('storage access failures do not prevent typing, discard or creation', () => {
  const blocked = { getItem() { throw new Error('blocked') }, setItem() { throw new Error('blocked') }, removeItem() { throw new Error('blocked') } }
  assert.equal(loadProjectDraft(blocked), null)
  assert.equal(persistProjectDraft(blocked, draft), false)
  assert.equal(clearProjectDraft(blocked), false)
  assert.equal(loadProjectDraft(null), null)
})

test('normal GitHub URL edits can remain manual and never inherit a stale import marker', () => {
  const manual = { ...draft, importedRepository: null }
  assert.deepEqual(parseProjectDraft(serializeProjectDraft(manual)), manual)
  const serialized = JSON.parse(serializeProjectDraft(manual))
  assert.equal(serialized.source, 'manual')
  assert.equal(serialized.github_repo, 'example/repository')
})
