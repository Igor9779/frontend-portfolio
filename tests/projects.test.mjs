import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test, mock } from 'node:test'
import ts from 'typescript'

// Compile the real TypeScript using the existing compiler; no test dependency,
// credentials, Next server or production Supabase connection is needed.
const moduleUrl = code => 'data:text/javascript;base64,' + Buffer.from(code).toString('base64')
function compile(path, replacements = {}) {
  const code = readFileSync(new URL('../' + path, import.meta.url), 'utf8')
  const { outputText } = ts.transpileModule(code, {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
    transformers: { before: [context => source => ts.visitNode(source, function visit(node) {
      if (ts.isImportDeclaration(node) && replacements[node.moduleSpecifier.text]) {
        return ts.factory.updateImportDeclaration(node, node.modifiers, node.importClause,
          ts.factory.createStringLiteral(replacements[node.moduleSpecifier.text]), node.attributes)
      }
      return ts.visitEachChild(node, visit, context)
    })] },
  })
  return moduleUrl(outputText)
}
const validationUrl = compile('src/lib/project-validation.ts')
const { validateProject, parseProjectFormData, deriveGithubRepo, isProjectId, projectLimits } = await import(validationUrl)
const authUrl = moduleUrl('export async function requireAdmin() { return globalThis.projectActionFixture.authorize() }')
const cacheUrl = moduleUrl('export function revalidatePath(path) { globalThis.projectActionFixture.revalidated.push(path) }')
const navigationUrl = moduleUrl('export function unstable_rethrow() {}')
const previewFileUrl = compile('src/lib/preview-file.ts')
const { validatePreviewFile, previewMaxBytes } = await import(previewFileUrl)
const previewPathUrl = compile('src/lib/preview-path.ts', { './project-validation': validationUrl })
const { managedPreviewPath, previewBucket } = await import(previewPathUrl)
const storageOrigin = 'https://storage.example.test'
const previewsUrl = compile('src/lib/project-previews.ts', {
  'server-only': moduleUrl(''), './auth': authUrl,
  './project-validation': validationUrl, './preview-file': previewFileUrl, './preview-path': previewPathUrl,
  './supabase/config': moduleUrl(`export const supabaseUrl = '${storageOrigin}'`),
})
const { createPreviewPath, uploadProjectPreview, removeProjectPreview } = await import(previewsUrl)
const projectsUrl = compile('src/lib/projects.ts', {
  'server-only': moduleUrl(''), './auth': authUrl,
  './supabase/public': moduleUrl('export const supabase = {}'),
})
const githubRepositoryUrl = compile('src/lib/github-repository.ts')
const githubProjectsUrl = compile('src/lib/github-projects.ts', { 'server-only': moduleUrl('') })
const actions = await import(compile('src/app/admin/project-actions.ts', {
  '../../lib/auth': authUrl, 'next/cache': cacheUrl,
  '../../lib/projects': projectsUrl, '../../lib/project-validation': validationUrl,
  'next/navigation': navigationUrl, '../../lib/preview-file': previewFileUrl, '../../lib/project-previews': previewsUrl,
  '../../lib/github-repository': githubRepositoryUrl, '../../lib/github-projects': githubProjectsUrl,
}))

const input = {
  title: 'Fixture project', category: 'Developer tools', shortDescription: '',
  description: 'A temporary test description.', previewUrl: '/assets/fixture.png',
  githubUrl: 'https://github.com/example/repository', productionUrl: '/projects/fixture/',
  telegramUrl: '', technologies: ['React', 'TypeScript'], visible: false,
}
const fixtureId = '27396196-5ed4-478b-ae41-61f813cf55a2'
const row = {
  id: fixtureId, title: 'Original fixture', category: 'Original category', short_description: null,
  description: 'Original description', preview_url: null, github_url: null, production_url: null,
  telegram_url: null, technologies: [], position: 7, visible: true, source: 'import', github_repo: null,
  created_at: '2025-01-01T00:00:00.000Z', updated_at: '2025-01-01T00:00:00.000Z',
}
function form(values = input, file = null, mode = 'url') {
  const data = new FormData()
  for (const [key, value] of Object.entries(values)) {
    if (key === 'technologies') for (const technology of value) data.append(key, technology)
    else if (key === 'visible') { if (value) data.set(key, 'on') }
    else if (value != null) data.set(key, String(value))
  }
  data.set('previewMode', mode)
  if (file) data.set('previewFile', file)
  return data
}
function image(format = 'png') {
  return new File([readFileSync(new URL('./fixtures/preview.' + (format === 'jpeg' ? 'jpg' : format), import.meta.url))], 'preview.' + (format === 'jpeg' ? 'jpg' : format), { type: 'image/' + format })
}
const storedPath = `projects/${fixtureId}/preview-413fe32f-09dc-4f71-a9f6-0a3b6e5fa16a.png`
const storedUrl = `${storageOrigin}/storage/v1/object/public/${previewBucket}/${storedPath}`
function setup({ allowed = true, rows = [row], error = null, throws = false, failOperation = '', uploadFails = false, removeFails = false, commitAndThrow = '', stalePreview = false } = {}) {
  const state = { rows: structuredClone(rows), queries: [], revalidated: [], authorizations: 0, error, storageOps: [], objects: new Map(), events: [] }
  const supabase = { from(table) {
    assert.equal(table, 'projects', 'Mutations must never query admin_users for writes.')
    const query = { operation: 'read', filters: {}, payload: null, columns: '', repository: null }
    function execute() {
      state.queries.push(structuredClone(query))
      state.events.push('database:' + query.operation)
      if (throws) throw new Error('PRIVATE_FIXTURE_NETWORK_DETAIL')
      if (state.error || failOperation === query.operation) return { data: null, error: { code: '42501', message: 'PRIVATE_FIXTURE_DATABASE_DETAIL' } }
      if (query.operation === 'read') {
        if (query.repository !== null) return { data: state.rows.find(item => item.github_repo?.toLowerCase() === query.repository) ?? null, error: null }
        if (query.columns !== 'position') return { data: state.rows.find(item => Object.entries(query.filters).every(([key, value]) => item[key] === value)) ?? null, error: null }
        const highest = [...state.rows].sort((a, b) => b.position - a.position)[0]
        return { data: highest ? { position: highest.position } : null, error: null }
      }
      if (query.operation === 'insert') {
        state.rows.push(query.payload)
        if (commitAndThrow === 'insert') throw new Error('PRIVATE_FIXTURE_NETWORK_DETAIL')
        return { data: query.payload, error: null }
      }
      if (stalePreview && query.operation === 'update') return { data: null, error: null }
      const found = state.rows.find(item => Object.entries(query.filters).every(([key, value]) => item[key] === value))
      if (!found) return { data: null, error: null }
      if (query.operation === 'update') Object.assign(found, query.payload)
      if (query.operation === 'update' && commitAndThrow === 'update') throw new Error('PRIVATE_FIXTURE_NETWORK_DETAIL')
      if (query.operation === 'delete') state.rows = state.rows.filter(item => item.id !== query.filters.id)
      return { data: found, error: null }
    }
    const builder = {
      select(columns) { query.columns = columns; return builder },
      order() { return builder }, limit() { return builder }, abortSignal() { return builder },
      eq(column, value) { assert.ok(['id', 'preview_url'].includes(column)); query.filters[column] = value; return builder },
      ilike(column, value) { assert.equal(column, 'github_repo'); query.repository = value.replace(/\\([\\%_])/g, '$1').toLowerCase(); return builder },
      is(column, value) { assert.equal(column, 'preview_url'); query.filters[column] = value; return builder },
      insert(payload) { query.operation = 'insert'; query.payload = payload; return builder },
      update(payload) { query.operation = 'update'; query.payload = payload; return builder },
      delete() { query.operation = 'delete'; return builder },
      async single() { return execute() }, async maybeSingle() { return execute() },
    }
    return builder
  }, storage: { from(bucket) {
    assert.equal(bucket, previewBucket)
    return {
      getPublicUrl(path) { return { data: { publicUrl: `${storageOrigin}/storage/v1/object/public/${bucket}/${path}` } } },
      async upload(path, file, options) {
        state.storageOps.push({ operation: 'upload', path, options })
        state.events.push('storage:upload')
        assert.equal(options.upsert, false)
        if (uploadFails) return { data: null, error: { message: 'PRIVATE_STORAGE_DETAIL' } }
        state.objects.set(path, file)
        return { data: { path }, error: null }
      },
      async remove(paths) {
        state.storageOps.push({ operation: 'remove', paths })
        state.events.push('storage:remove')
        if (removeFails) return { data: null, error: { message: 'PRIVATE_STORAGE_DETAIL' } }
        for (const path of paths) state.objects.delete(path)
        return { data: [], error: null }
      },
    }
  } } }
  globalThis.projectActionFixture = {
    revalidated: state.revalidated,
    async authorize() {
      state.authorizations++
      if (!allowed) throw new Error('Administrator access denied')
      return { supabase }
    },
  }
  return state
}

test('normalizes only allowed fields, optional blanks and technology duplicates', () => {
  const result = validateProject({ ...input, title: '  Fixture  ', technologies: [' React ', '', 'react', ' TypeScript '], source: 'attacker', position: -1 })
  assert.equal(result.success, true)
  assert.equal(result.project.title, 'Fixture')
  assert.equal(result.project.shortDescription, null)
  assert.equal(result.project.telegramUrl, null)
  assert.deepEqual(result.project.technologies, ['React', 'TypeScript'])
  assert.equal('source' in result.project, false)
  assert.equal('position' in result.project, false)
})

test('rejects missing fields, wrong types and non-boolean visibility', () => {
  for (const value of [null, [], 'invalid', {}]) assert.equal(validateProject(value).success, false)
  for (const [field, value] of [['title', '  '], ['category', 12], ['description', null], ['visible', 'true'], ['technologies', 'React'], ['technologies', [1]]]) {
    const result = validateProject({ ...input, [field]: value })
    assert.equal(result.success, false)
    assert.ok(result.errors[field])
  }
})

test('enforces text, URL and technology bounds', () => {
  for (const field of ['title', 'category', 'shortDescription', 'description']) {
    assert.equal(validateProject({ ...input, [field]: 'a'.repeat(projectLimits[field] + 1) }).success, false)
  }
  for (const values of [Array(31).fill('React'), ['a'.repeat(51)], ['React\nTypeScript']]) {
    assert.equal(validateProject({ ...input, technologies: values }).success, false)
  }
  assert.equal(validateProject({ ...input, description: 'a\0b' }).success, false)
  assert.equal(validateProject({ ...input, previewUrl: 'https://example.com/' + 'a'.repeat(2048) }).success, false)
})

test('blocks script URLs, credential URLs, malformed escapes and local path traversal', () => {
  const bad = ['javascript:alert(1)', 'data:text/html,test', '//evil.example/x', 'https://user:password@example.com/', 'https://example.com/%zz', 'https:example.com', 'https://example.com/\nfile']
  for (const field of ['previewUrl', 'githubUrl', 'productionUrl', 'telegramUrl']) {
    for (const url of bad) assert.equal(validateProject({ ...input, [field]: url }).success, false, field + ': ' + url)
  }
  for (const url of ['/assets/../admin', '/assets/%2e%2e/admin', '/assets/%2f../admin', '/assets/file%00.png', '/assets/\\evil']) {
    assert.equal(validateProject({ ...input, previewUrl: url }).success, false)
  }
  assert.equal(validateProject({ ...input, githubUrl: '/projects/local/' }).success, false)
  assert.equal(validateProject({ ...input, productionUrl: '/admin' }).success, false)
  assert.equal(validateProject({ ...input, previewUrl: '/assets/my%20preview.png', productionUrl: '/projects/fixture/index.html?section=1#content' }).success, true)
})

test('derives only normal GitHub repository paths and validates mutation UUIDs', () => {
  assert.equal(deriveGithubRepo('https://github.com/example/repository.git/'), 'example/repository')
  assert.equal(deriveGithubRepo('https://github.com/example/repository?tab=readme'), 'example/repository')
  for (const url of [null, 'https://github.com.evil.test/example/repo', 'https://github.com/example/repo/issues', 'https://user:password@github.com/example/repo', '/local']) assert.equal(deriveGithubRepo(url), null)
  assert.equal(isProjectId(fixtureId), true)
  for (const id of [null, 1, '', 'id; DELETE FROM projects', fixtureId + 'extra']) assert.equal(isProjectId(id), false)
})

test('each action independently denies unauthorized calls before validation or queries', async () => {
  const state = setup({ allowed: false })
  await assert.rejects(actions.createProject(null), /Administrator access denied/)
  await assert.rejects(actions.updateProject('bad-id', null), /Administrator access denied/)
  await assert.rejects(actions.deleteProject('bad-id'), /Administrator access denied/)
  assert.equal(state.authorizations, 3)
  assert.deepEqual(state.queries, [])
})

test('server controls create UUID, source, append position, repository and timestamps', async () => {
  const state = setup({ rows: [{ ...row, position: 50 }] })
  const result = await actions.createProject(form({ ...input, id: fixtureId, source: 'attacker', position: -1, github_repo: 'attacker/repo', created_at: '2000', updated_at: '2000' }))
  assert.equal(result.success, true)
  const created = state.rows.at(-1)
  assert.equal(isProjectId(created.id), true)
  assert.notEqual(created.id, fixtureId)
  assert.equal(created.source, 'manual')
  assert.equal(created.position, 51)
  assert.equal(created.github_repo, 'example/repository')
  assert.equal(created.created_at, created.updated_at)
  assert.ok(Number.isFinite(Date.parse(created.created_at)))
  assert.deepEqual(state.revalidated, ['/admin', '/'])
})

test('empty-table creates start at position zero; invalid input makes no query', async () => {
  const state = setup({ rows: [] })
  assert.equal((await actions.createProject(form({ ...input, title: '' }))).success, false)
  assert.deepEqual(state.queries, [])
  assert.equal((await actions.createProject(form())).success, true)
  assert.equal(state.rows[0].position, 0)
})

test('final create guard blocks mixed-case duplicate repositories before upload or INSERT', async () => {
  const state = setup({ rows: [{ ...row, github_repo: 'Example/Repository' }] })
  const result = await actions.createProject(form(input, image()))
  assert.equal(result.success, false)
  assert.equal(result.message, 'This GitHub repository has already been added.')
  assert.equal(state.rows.length, 1)
  assert.deepEqual(state.storageOps, [])
  assert.equal(state.queries.some(query => query.operation !== 'read'), false)
  assert.deepEqual(state.revalidated, [])
})

test('reviewed import uses server-derived github source and repository; arbitrary source is ignored', async () => {
  const state = setup()
  const data = form({ ...input, githubUrl: 'https://github.com/Example/Repository', source: 'ai' })
  data.set('importedGithubRepo', 'example/repository')
  assert.equal((await actions.createProject(data)).success, true)
  assert.equal(state.rows.at(-1).source, 'github')
  assert.equal(state.rows.at(-1).github_repo, 'example/repository')
})

test('mismatched import provenance fails before queries or uploads', async () => {
  const state = setup()
  const data = form(input, image())
  data.set('importedGithubRepo', 'someone/else')
  assert.equal((await actions.createProject(data)).success, false)
  assert.deepEqual(state.queries, [])
  assert.deepEqual(state.storageOps, [])
})

test('updates preserve identity, source, created time and position despite tampered input', async () => {
  const state = setup()
  const result = await actions.updateProject(fixtureId, form({ ...input, id: 'bad', source: 'attacker', position: 0, created_at: '2000', updated_at: '2000' }))
  assert.equal(result.success, true)
  assert.equal(state.rows[0].id, row.id)
  assert.equal(state.rows[0].source, row.source)
  assert.equal(state.rows[0].position, row.position)
  assert.equal(state.rows[0].created_at, row.created_at)
  assert.equal(state.rows[0].visible, false)
  assert.deepEqual(state.revalidated, ['/admin', '/'])
})

test('delete targets one UUID and missing rows do not report success', async () => {
  const state = setup()
  assert.equal((await actions.deleteProject('00000000-0000-0000-0000-000000000000')).success, false)
  assert.equal(state.rows.length, 1)
  assert.deepEqual(state.revalidated, [])
  assert.equal((await actions.deleteProject(fixtureId)).success, true)
  assert.equal(state.rows.length, 0)
  assert.deepEqual(state.revalidated, ['/admin', '/'])
})

test('database/network failures remain generic and never trigger successful revalidation', async () => {
  const logging = mock.method(console, 'error', () => {})
  try {
    for (const options of [{ error: true }, { throws: true }]) {
      const state = setup(options)
      for (const result of [await actions.createProject(form()), await actions.updateProject(fixtureId, form()), await actions.deleteProject(fixtureId)]) {
        assert.equal(result.success, false)
        assert.ok(!JSON.stringify(result).includes('PRIVATE_FIXTURE'))
      }
      assert.deepEqual(state.rows, [row])
      assert.deepEqual(state.revalidated, [])
    }
  } finally {
    logging.mock.restore()
  }
})

for (const format of ['jpeg', 'png', 'webp']) {
  test('accepts a real ' + format.toUpperCase() + ' with matching type and signature', async () => {
    const result = await validatePreviewFile(image(format))
    assert.equal(result.success, true)
    assert.equal(result.contentType, 'image/' + format)
    assert.equal(result.extension, format === 'jpeg' ? 'jpg' : format)
  })
}

test('rejects SVG, GIF, HTML, arbitrary binaries and spoofed MIME/extension pairs', async () => {
  const files = [
    new File(['<svg xmlns="http://www.w3.org/2000/svg"/>'], 'image.svg', { type: 'image/svg+xml' }),
    new File(['GIF89a'], 'image.gif', { type: 'image/gif' }),
    new File(['<html>Not an image</html>'], 'fake.png', { type: 'image/png' }),
    new File([new Uint8Array([0,1,2,3])], 'binary.webp', { type: 'image/webp' }),
    new File([await image('png').arrayBuffer()], 'mismatch.jpg', { type: 'image/jpeg' }),
    new File([await image('png').arrayBuffer()], 'mismatch.jpg', { type: 'image/png' }),
  ]
  for (const file of files) assert.equal((await validatePreviewFile(file)).success, false)
  assert.equal((await validatePreviewFile({ size: 100, type: 'image/png' })).success, false)
})

test('rejects an empty file and files over 5 MiB, and accepts the exact size boundary', async () => {
  assert.equal((await validatePreviewFile(new File([], 'empty.png', { type: 'image/png' }))).success, false)
  const jpeg = new Uint8Array(await image('jpeg').arrayBuffer())
  const boundary = new File([jpeg.slice(0, -2), new Uint8Array(previewMaxBytes - jpeg.length), jpeg.slice(-2)], 'large.jpg', { type: 'image/jpeg' })
  assert.equal((await validatePreviewFile(boundary)).success, true)
  const oversized = new File([boundary, 'x'], 'oversized.jpg', { type: 'image/jpeg' })
  assert.equal((await validatePreviewFile(oversized)).success, false)
})

test('rejects truncated headers and inconsistent WebP container lengths', async () => {
  const webp = new Uint8Array(await image('webp').arrayBuffer())
  webp[4] ^= 1
  assert.equal((await validatePreviewFile(new File([webp], 'bad.webp', { type: 'image/webp' }))).success, false)
  assert.equal((await validatePreviewFile(new File([[137,80,78,71].join('')], 'bad.png', { type: 'image/png' }))).success, false)
})

test('FormData parsing whitelists fields and rejects unsupported preview/file/visibility values', () => {
  assert.equal(parseProjectFormData(input).success, false)
  const valid = parseProjectFormData(form({ ...input, id: 'attacker-id', source: 'attacker', position: 1 }))
  assert.equal(valid.success, true)
  assert.equal('id' in valid.project, false)
  assert.equal('position' in valid.project, false)
  assert.equal('source' in valid.project, false)
  for (const [field, value] of [['previewFile', 'not-a-file'], ['previewMode', 'arbitrary'], ['visible', 'false']]) {
    const invalid = form()
    invalid.set(field, value)
    assert.equal(parseProjectFormData(invalid).success, false)
  }
  const emptySelection = form(input, new File([], '', { type: 'application/octet-stream' }))
  assert.equal(parseProjectFormData(emptySelection).file, null)
})

test('paths use fresh server UUIDs in the trusted project directory', () => {
  const paths = Array.from({ length: 10 }, () => createPreviewPath(fixtureId, 'png'))
  assert.equal(new Set(paths).size, 10)
  for (const path of paths) {
    assert.equal(managedPreviewPath(`${storageOrigin}/storage/v1/object/public/${previewBucket}/${path}`, fixtureId, storageOrigin), path)
    assert.ok(path.startsWith(`projects/${fixtureId}/preview-`))
  }
  assert.throws(() => createPreviewPath('../other-project', 'png'))
  assert.throws(() => createPreviewPath(fixtureId, 'svg'))
})

test('managed recognition rejects local assets and unrelated URLs, buckets, projects or paths', () => {
  assert.equal(managedPreviewPath(storedUrl, fixtureId, storageOrigin), storedPath)
  const bad = [null, '/assets/preview.png', storedPath, 'https://example.com/preview.png',
    storedUrl.replace('storage.example.test', 'other.example.test'), storedUrl.replace('project-previews', 'other-bucket'),
    storedUrl.replace(fixtureId, 'ad95a7bf-c128-491a-9e5d-5b4e033b13f8'), storedUrl + '?download=1', storedUrl + '#fragment',
    storedUrl.replace('/preview-', '/../preview-'), storedUrl.replace('/preview-', '/%2e%2e/preview-'),
    storedUrl.replace('preview-', 'arbitrary-'), storedUrl.replace('.png', '.svg'),
  ]
  for (const reference of bad) assert.equal(managedPreviewPath(reference, fixtureId, storageOrigin), null)
})

test('upload/removal helpers independently authorize before reading or mutating anything', async () => {
  const state = setup({ allowed: false })
  await assert.rejects(uploadProjectPreview(fixtureId, image()), /Administrator access denied/)
  await assert.rejects(removeProjectPreview(fixtureId, storedUrl), /Administrator access denied/)
  assert.equal(state.authorizations, 2)
  assert.deepEqual(state.queries, [])
  assert.deepEqual(state.storageOps, [])
})

test('invalid images cause no project or Storage queries', async () => {
  for (const file of [new File([], 'empty.png', { type: 'image/png' }), new File(['<html/>'], 'fake.png', { type: 'image/png' })]) {
    const state = setup()
    const result = await actions.createProject(form(input, file))
    assert.equal(result.success, false)
    assert.ok(result.errors.previewFile)
    assert.deepEqual(state.queries, [])
    assert.deepEqual(state.storageOps, [])
  }
})

test('create with preview uploads once with a generated path and stores the public URL', async () => {
  const state = setup()
  const result = await actions.createProject(form({ ...input, id: fixtureId, previewUrl: 'ignored' }, image(), 'keep'))
  assert.equal(result.success, true)
  const created = state.rows.at(-1)
  assert.notEqual(created.id, fixtureId)
  assert.equal(managedPreviewPath(created.preview_url, created.id, storageOrigin), state.storageOps[0].path)
  assert.equal(state.objects.size, 1)
  assert.equal(state.storageOps[0].options.contentType, 'image/png')
  assert.equal(state.storageOps[0].options.upsert, false)
  assert.ok(state.events.indexOf('storage:upload') < state.events.indexOf('database:insert'))
})

test('failed INSERT compensates by deleting only the newly uploaded object', async () => {
  const logging = mock.method(console, 'error', () => {})
  try {
    const state = setup({ failOperation: 'insert' })
    assert.equal((await actions.createProject(form(input, image()))).success, false)
    assert.deepEqual(state.rows, [row])
    assert.equal(state.objects.size, 0)
    assert.deepEqual(state.storageOps.map(operation => operation.operation), ['upload', 'remove'])
    assert.deepEqual(state.revalidated, [])
  } finally { logging.mock.restore() }
})

test('upload failure returns a safe error, attempts cleanup and never inserts a project', async () => {
  const logging = mock.method(console, 'error', () => {})
  try {
    const state = setup({ uploadFails: true })
    const result = await actions.createProject(form(input, image()))
    assert.equal(result.success, false)
    assert.ok(!JSON.stringify(result).includes('PRIVATE_STORAGE'))
    assert.ok(!state.queries.some(query => query.operation === 'insert'))
    assert.deepEqual(state.storageOps.map(operation => operation.operation), ['upload', 'remove'])
    assert.deepEqual(state.rows, [row])
  } finally { logging.mock.restore() }
})

test('replacement saves the new URL before deleting the previous managed object', async () => {
  const state = setup({ rows: [{ ...row, preview_url: storedUrl }] })
  state.objects.set(storedPath, image())
  const result = await actions.updateProject(fixtureId, form(input, image('webp')))
  assert.equal(result.success, true)
  assert.notEqual(result.project.previewUrl, storedUrl)
  assert.equal(state.objects.has(storedPath), false)
  assert.equal(state.objects.size, 1)
  assert.ok(state.events.indexOf('database:update') < state.events.indexOf('storage:remove'))
  assert.deepEqual(state.storageOps.at(-1).paths, [storedPath])
})

test('failed replacement removes the new object while preserving the old image and row', async () => {
  const logging = mock.method(console, 'error', () => {})
  try {
    const state = setup({ rows: [{ ...row, preview_url: storedUrl }], failOperation: 'update' })
    state.objects.set(storedPath, image())
    assert.equal((await actions.updateProject(fixtureId, form(input, image('webp')))).success, false)
    assert.equal(state.rows[0].preview_url, storedUrl)
    assert.deepEqual([...state.objects.keys()], [storedPath])
    assert.notEqual(state.storageOps.at(-1).paths[0], storedPath)
  } finally { logging.mock.restore() }
})

test('an unavailable project never uploads a replacement', async () => {
  const state = setup({ rows: [] })
  assert.equal((await actions.updateProject(fixtureId, form(input, image()))).success, false)
  assert.deepEqual(state.storageOps, [])
})

test('a concurrent preview change refuses the save and cleans only its new upload', async () => {
  const state = setup({ rows: [{ ...row, preview_url: storedUrl }], stalePreview: true })
  state.objects.set(storedPath, image())
  assert.equal((await actions.updateProject(fixtureId, form(input, image()))).success, false)
  assert.equal(state.rows[0].preview_url, storedUrl)
  assert.deepEqual([...state.objects.keys()], [storedPath])
})

test('keeping the current preview uses fresh database data rather than stale form URL input', async () => {
  const state = setup({ rows: [{ ...row, preview_url: storedUrl }] })
  const result = await actions.updateProject(fixtureId, form({ ...input, previewUrl: '/assets/stale.png' }, null, 'keep'))
  assert.equal(result.success, true)
  assert.equal(result.project.previewUrl, storedUrl)
  assert.deepEqual(state.storageOps, [])
})

test('local/external/other-project previews never cause Storage removal', async () => {
  for (const preview of ['/assets/original.png', 'https://images.example.test/original.png', storedUrl.replace(fixtureId, 'ad95a7bf-c128-491a-9e5d-5b4e033b13f8')]) {
    const state = setup({ rows: [{ ...row, preview_url: preview }] })
    assert.equal((await actions.deleteProject(fixtureId)).success, true)
    assert.deepEqual(state.storageOps, [])
  }
})

test('successful deletion removes the row before its managed preview', async () => {
  const state = setup({ rows: [{ ...row, preview_url: storedUrl }] })
  state.objects.set(storedPath, image())
  assert.equal((await actions.deleteProject(fixtureId)).success, true)
  assert.equal(state.rows.length, 0)
  assert.equal(state.objects.size, 0)
  assert.ok(state.events.indexOf('database:delete') < state.events.indexOf('storage:remove'))
})

test('cleanup failure does not undo a successful replacement or project deletion', async () => {
  const logging = mock.method(console, 'warn', () => {})
  try {
    const state = setup({ rows: [{ ...row, preview_url: storedUrl }], removeFails: true })
    state.objects.set(storedPath, image())
    const result = await actions.updateProject(fixtureId, form(input, image('webp')))
    assert.equal(result.success, true)
    assert.notEqual(state.rows[0].preview_url, storedUrl)
    assert.equal((await actions.deleteProject(fixtureId)).success, true)
    assert.equal(state.rows.length, 0)
    assert.deepEqual(state.revalidated, ['/admin', '/', '/admin', '/'])
    assert.ok(logging.mock.calls.length >= 2)
  } finally { logging.mock.restore() }
})

test('cleanup preserves managed objects still referenced by another project', async () => {
  const state = setup({ rows: [{ ...row, preview_url: storedUrl }, { ...row, id: 'ad95a7bf-c128-491a-9e5d-5b4e033b13f8', preview_url: storedUrl }] })
  state.objects.set(storedPath, image())
  assert.equal((await actions.deleteProject(fixtureId)).success, true)
  assert.equal(state.rows.length, 1)
  assert.equal(state.objects.has(storedPath), true)
  assert.deepEqual(state.storageOps, [])
})

test('interrupted database responses never delete a newly uploaded object already referenced by a committed row', async () => {
  const logging = mock.method(console, 'error', () => {})
  try {
    for (const operation of ['insert', 'update']) {
      const state = setup({ commitAndThrow: operation })
      const result = operation === 'insert' ? await actions.createProject(form(input, image())) : await actions.updateProject(fixtureId, form(input, image()))
      assert.equal(result.success, false)
      assert.equal(state.objects.size, 1)
      assert.equal(state.storageOps.filter(item => item.operation === 'remove').length, 0)
      assert.ok(state.rows.some(project => managedPreviewPath(project.preview_url, project.id, storageOrigin)))
    }
  } finally { logging.mock.restore() }
})
