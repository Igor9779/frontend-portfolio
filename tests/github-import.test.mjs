import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import ts from 'typescript'

const moduleUrl = code => 'data:text/javascript;base64,' + Buffer.from(code).toString('base64')
function compile(path, replacements = {}) {
  return moduleUrl(ts.transpileModule(readFileSync(new URL('../' + path, import.meta.url), 'utf8'), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
    transformers: { before: [context => source => ts.visitNode(source, function visit(node) {
      if (ts.isImportDeclaration(node) && replacements[node.moduleSpecifier.text]) return ts.factory.updateImportDeclaration(
        node, node.modifiers, node.importClause, ts.factory.createStringLiteral(replacements[node.moduleSpecifier.text]), node.attributes)
      return ts.visitEachChild(node, visit, context)
    })] },
  }).outputText)
}
const empty = moduleUrl('')
const repositoryUrl = compile('src/lib/github-repository.ts')
const validationUrl = compile('src/lib/project-validation.ts')
const fetchUrl = compile('src/lib/github-import.ts', { 'server-only': empty, './github-repository': repositoryUrl, './project-validation': validationUrl })
const projectsUrl = compile('src/lib/github-projects.ts', { 'server-only': empty })
const { parseGithubRepository } = await import(repositoryUrl)
const { fetchGithubProject, normalizeGithubLanguages } = await import(fetchUrl)
const { findGithubProject } = await import(projectsUrl)
const { importGithubRepository } = await import(compile('src/app/admin/github-actions.ts', {
  'next/navigation': moduleUrl('export function unstable_rethrow() {}'),
  '../../lib/auth': moduleUrl('export async function requireAdmin() { return globalThis.githubImportFixture.authorize() }'),
  '../../lib/github-repository': repositoryUrl, '../../lib/github-import': fetchUrl, '../../lib/github-projects': projectsUrl,
}))

const metadata = { name: 'Repository', full_name: 'Example/Repository', html_url: 'https://github.com/Example/Repository',
  private: false, description: '  A plain repository description.  ', homepage: 'https://example.test/', archived: false }
const json = (body, status = 200, headers = {}) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', ...headers } })

async function usingFetch(responses, run) {
  const original = globalThis.fetch
  const calls = []
  globalThis.fetch = async (url, options) => {
    calls.push({ url, options })
    const next = responses.shift()
    if (next instanceof Error) throw next
    assert.ok(next, 'No extra GitHub requests permitted')
    return next
  }
  try { return await run(calls) } finally { globalThis.fetch = original }
}

function setup({ allowed = true, repositories = [], fail = false } = {}) {
  const state = { authorizations: 0, reads: [] }
  const supabase = { from(table) {
    assert.equal(table, 'projects')
    let pattern
    const builder = {
      select(columns) { assert.equal(columns, 'id'); return builder },
      ilike(column, value) { assert.equal(column, 'github_repo'); pattern = value; return builder },
      limit(value) { assert.equal(value, 1); return builder }, abortSignal() { return builder },
      async maybeSingle() {
        state.reads.push(pattern)
        const name = pattern.replace(/\\([\\%_])/g, '$1').toLowerCase()
        return { data: repositories.some(repo => repo.toLowerCase() === name) ? { id: 'fixture' } : null, error: fail ? { message: 'PRIVATE_DATABASE_DETAIL' } : null }
      },
      // No mutation/Storage/RPC/Auth methods exist in this fixture. Imports
      // fail this test if they ever try to write or use a privileged boundary.
    }
    return builder
  } }
  globalThis.githubImportFixture = { async authorize() {
    state.authorizations++
    if (!allowed) throw new Error('Administrator access denied')
    return { supabase }
  } }
  return { state, supabase }
}

test('valid GitHub and .git URLs normalize a case-insensitive owner/repository', () => {
  for (const url of ['https://github.com/Example/Repository', ' https://github.com/Example/Repository.git/ ']) {
    assert.deepEqual(parseGithubRepository(url), { repository: 'example/repository', url: 'https://github.com/Example/Repository' })
  }
  assert.equal(parseGithubRepository('https://github.com/an-owner/repo_name.v2').repository, 'an-owner/repo_name.v2')
})

test('rejects malformed hosts, credentials, missing/extra segments, traversal and invalid names', () => {
  for (const url of [null, {}, '', 'not a URL', 'http://github.com/owner/repo', 'https://github.com.evil.test/owner/repo',
    'https://gitlab.com/owner/repo', 'https://user:password@github.com/owner/repo', 'https://github.com/owner',
    'https://github.com/owner/repo/issues', 'https://github.com/owner/repo?tab=readme', 'https://github.com/owner/repo#readme',
    'https://github.com/owner/%2e%2e', 'https://github.com/owner/../repo', 'https://github.com/owner/..',
    'https://github.com/-owner/repo', 'https://github.com/owner-/repo', 'https://github.com/ow--ner/repo',
    'https://github.com/owner/repo name', 'https://github.com/owner/.git', 'https://github.com:443/owner/repo',
    'https://github.com/' + 'a'.repeat(40) + '/repo', 'https://github.com/owner/' + 'a'.repeat(101),
    'https://github.com/owner/\\repo', 'https://github.com/owner/repo\nextra']) assert.equal(parseGithubRepository(url), null, String(url))
})

test('metadata normalization uses two fixed GitHub GETs without authentication or image fetching', async () => {
  await usingFetch([json(metadata), json({ TypeScript: 200, JavaScript: 50, CSS: 10 })], async calls => {
    const result = await fetchGithubProject('https://github.com/Example/Repository.git')
    assert.deepEqual(result, { success: true, fields: { title: 'Repository', shortDescription: 'A plain repository description.',
      description: 'A plain repository description.', githubUrl: metadata.html_url, githubRepository: 'example/repository',
      productionUrl: metadata.homepage, technologies: ['TypeScript', 'JavaScript', 'CSS'] } })
    assert.deepEqual(calls.map(call => call.url), ['https://api.github.com/repos/example/repository', 'https://api.github.com/repos/example/repository/languages'])
    for (const { options } of calls) {
      assert.equal(options.headers['X-GitHub-Api-Version'], '2026-03-10')
      assert.ok(options.headers['User-Agent'])
      assert.equal(new Headers(options.headers).has('authorization'), false)
      assert.equal(options.redirect, 'manual')
      assert.equal(options.credentials, 'omit')
      assert.equal(options.cache, 'no-store')
    }
    assert.equal('previewUrl' in result.fields, false)
    assert.equal('category' in result.fields, false)
  })
})

test('missing description, homepage and languages remain empty and editable', async () => {
  await usingFetch([json({ ...metadata, description: null, homepage: null }), json({})], async () => {
    const result = await fetchGithubProject(metadata.html_url)
    assert.equal(result.success, true)
    assert.equal(result.fields.description, '')
    assert.equal(result.fields.shortDescription, '')
    assert.equal(result.fields.productionUrl, '')
    assert.deepEqual(result.fields.technologies, [])
  })
})

test('language mapping is bounded, deterministic, de-duplicated and never infers frameworks', () => {
  assert.deepEqual(normalizeGithubLanguages({ ' TypeScript ': 5, JavaScript: 10, CSS: 5, typescript: 2, React: -1, bad: '200', 'Bad\nName': 10 }), ['JavaScript', 'CSS', 'TypeScript'])
  assert.deepEqual(normalizeGithubLanguages({ JavaScript: 10 }), ['JavaScript'])
  assert.equal(normalizeGithubLanguages(Object.fromEntries(Array.from({ length: 40 }, (_, i) => ['Language' + i, 1]))).length, 30)
})

test('archived repositories import with a non-blocking warning; unsafe homepages are omitted', async () => {
  for (const homepage of ['javascript:alert(1)', 'https://user:password@example.test/', '/projects/demo/', 'not a URL']) {
    await usingFetch([json({ ...metadata, archived: true, homepage, description: '\u0000 Plain\ntext ' }), json({})], async () => {
      const result = await fetchGithubProject(metadata.html_url)
      assert.equal(result.success, true)
      assert.ok(result.warning.includes('archived'))
      assert.equal(result.fields.productionUrl, '')
      assert.equal(result.fields.description, 'Plain text')
    })
  }
})

test('not-found, inaccessible/private and redirects return safe errors without following URLs', async () => {
  for (const status of [404, 403, 301]) {
    await usingFetch([json({ message: 'PRIVATE_GITHUB_DETAIL' }, status, { location: 'http://internal.test/' })], async calls => {
      const result = await fetchGithubProject(metadata.html_url)
      assert.equal(result.success, false)
      assert.equal(JSON.stringify(result).includes('PRIVATE_GITHUB_DETAIL'), false)
      assert.equal(calls.length, 1)
    })
  }
  await usingFetch([json({ ...metadata, private: true })], async calls => {
    assert.equal((await fetchGithubProject(metadata.html_url)).success, false)
    assert.equal(calls.length, 1)
  })
})

test('rate-limit responses from either endpoint produce a friendly error', async () => {
  for (const response of [json({}, 429), json({}, 403, { 'x-ratelimit-remaining': '0' }), json({}, 403, { 'retry-after': '60' })]) {
    await usingFetch([response], async () => assert.equal((await fetchGithubProject(metadata.html_url)).message, 'GitHub API rate limit reached. Please try again later.'))
  }
  await usingFetch([json(metadata), json({}, 429)], async () => assert.equal((await fetchGithubProject(metadata.html_url)).success, false))
})

test('network, oversized, malformed and unavailable responses never expose internal details', async () => {
  for (const response of [new Error('PRIVATE_NETWORK_DETAIL'), json({ detail: 'PRIVATE_BODY' }, 503), new Response('{'),
    json(metadata, 200, { 'content-length': '300000' }), new Response('x'.repeat(262145)), json([])]) {
    await usingFetch([response], async () => {
      const result = await fetchGithubProject(metadata.html_url)
      assert.equal(result.success, false)
      assert.equal(JSON.stringify(result).includes('PRIVATE_'), false)
    })
  }
})

test('import independently authorizes before URL validation, database reads or GitHub requests', async () => {
  const { state } = setup({ allowed: false })
  await usingFetch([], async calls => {
    await assert.rejects(importGithubRepository('bad URL'), /Administrator access denied/)
    assert.equal(state.authorizations, 1)
    assert.deepEqual(state.reads, [])
    assert.deepEqual(calls, [])
  })
})

test('duplicate detection handles legacy mixed case and checks canonical identities', async () => {
  setup({ repositories: ['Example/Repository'] })
  await usingFetch([], async calls => {
    assert.equal((await importGithubRepository(metadata.html_url)).message, 'This GitHub repository has already been added.')
    assert.deepEqual(calls, [])
  })
  const { state } = setup({ repositories: ['Example/Repository'] })
  await usingFetch([json(metadata), json({})], async () => {
    assert.equal((await importGithubRepository('https://github.com/old-owner/old-repo')).success, false)
    assert.deepEqual(state.reads, ['old-owner/old-repo', 'example/repository'])
  })
})

test('repository underscores are escaped for literal duplicate matching', async () => {
  const { state, supabase } = setup({ repositories: ['owner/repo_name'] })
  assert.equal((await findGithubProject(supabase, 'owner/repo_name')).exists, true)
  assert.deepEqual(state.reads, ['owner/repo\\_name'])
  assert.equal((await findGithubProject(supabase, 'owner/repoXname')).exists, false)
})

test('import is read-only, returns editable fields, and fails closed on duplicate-query errors', async () => {
  const { state } = setup()
  await usingFetch([json(metadata), json({ TypeScript: 1 })], async () => {
    assert.equal((await importGithubRepository(metadata.html_url)).success, true)
    assert.equal(state.authorizations, 1)
    assert.deepEqual(state.reads, ['example/repository'])
  })
  setup({ fail: true })
  await usingFetch([], async calls => {
    const result = await importGithubRepository(metadata.html_url)
    assert.equal(result.success, false)
    assert.equal(result.message.includes('PRIVATE_'), false)
    assert.deepEqual(calls, [])
  })
})
