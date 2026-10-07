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
const { validateProject, deriveGithubRepo, isProjectId, projectLimits } = await import(validationUrl)
const authUrl = moduleUrl('export async function requireAdmin() { return globalThis.projectActionFixture.authorize() }')
const cacheUrl = moduleUrl('export function revalidatePath(path) { globalThis.projectActionFixture.revalidated.push(path) }')
const projectsUrl = compile('src/lib/projects.ts', {
  'server-only': moduleUrl(''), './auth': authUrl,
  './supabase/public': moduleUrl('export const supabase = {}'),
})
const actions = await import(compile('src/app/admin/project-actions.ts', {
  '../../lib/auth': authUrl, 'next/cache': cacheUrl,
  '../../lib/projects': projectsUrl, '../../lib/project-validation': validationUrl,
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
function setup({ allowed = true, rows = [row], error = null, throws = false } = {}) {
  const state = { rows: structuredClone(rows), queries: [], revalidated: [], authorizations: 0, error }
  const supabase = { from(table) {
    assert.equal(table, 'projects', 'Mutations must never query admin_users for writes.')
    const query = { operation: 'read', filter: null, payload: null, columns: '' }
    function execute() {
      state.queries.push(structuredClone(query))
      if (throws) throw new Error('PRIVATE_FIXTURE_NETWORK_DETAIL')
      if (state.error) return { data: null, error: { code: '42501', message: 'PRIVATE_FIXTURE_DATABASE_DETAIL' } }
      if (query.operation === 'read') {
        const highest = [...state.rows].sort((a, b) => b.position - a.position)[0]
        return { data: highest ? { position: highest.position } : null, error: null }
      }
      if (query.operation === 'insert') {
        state.rows.push(query.payload)
        return { data: query.payload, error: null }
      }
      const found = state.rows.find(item => item.id === query.filter)
      if (!found) return { data: null, error: null }
      if (query.operation === 'update') Object.assign(found, query.payload)
      if (query.operation === 'delete') state.rows = state.rows.filter(item => item.id !== query.filter)
      return { data: found, error: null }
    }
    const builder = {
      select(columns) { query.columns = columns; return builder },
      order() { return builder }, limit() { return builder }, abortSignal() { return builder },
      eq(column, value) { assert.equal(column, 'id'); query.filter = value; return builder },
      insert(payload) { query.operation = 'insert'; query.payload = payload; return builder },
      update(payload) { query.operation = 'update'; query.payload = payload; return builder },
      delete() { query.operation = 'delete'; return builder },
      async single() { return execute() }, async maybeSingle() { return execute() },
    }
    return builder
  } }
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
  const result = await actions.createProject({ ...input, id: fixtureId, source: 'attacker', position: -1, github_repo: 'attacker/repo', created_at: '2000', updated_at: '2000' })
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
  assert.equal((await actions.createProject({ ...input, title: '' })).success, false)
  assert.deepEqual(state.queries, [])
  assert.equal((await actions.createProject(input)).success, true)
  assert.equal(state.rows[0].position, 0)
})

test('updates preserve identity, source, created time and position despite tampered input', async () => {
  const state = setup()
  const result = await actions.updateProject(fixtureId, { ...input, id: 'bad', source: 'attacker', position: 0, created_at: '2000', updated_at: '2000' })
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
      for (const result of [await actions.createProject(input), await actions.updateProject(fixtureId, input), await actions.deleteProject(fixtureId)]) {
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
