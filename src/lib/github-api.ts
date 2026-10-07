import 'server-only'

import { parseGithubRepository } from './github-repository'

export const githubMessages = {
  unavailable: 'Unable to import from GitHub. Please try again.',
  rateLimit: 'GitHub API rate limit reached. Please try again later.',
  missing: 'Repository not found or unavailable. Use a public GitHub repository.',
  moved: 'Repository URL has moved. Use its current GitHub URL.',
}

const endpoints = { '': 262_144, '/languages': 32_768, '/readme': 131_072, '/contents/package.json': 131_072 } as const
type Endpoint = keyof typeof endpoints
type GithubResponse =
  | { success: true; data: unknown }
  | { success: false; reason: 'missing' | 'rate-limit' | 'invalid' | 'unavailable'; message: string }

// A streaming cap also protects responses without a trustworthy Content-Length.
async function readJson(response: Response, limit: number): Promise<unknown> {
  const length = Number(response.headers.get('content-length'))
  const contentType = response.headers.get('content-type')
  if (length > limit || !response.body || (contentType && !/\bjson\b/i.test(contentType))) {
    await response.body?.cancel().catch(() => {})
    throw new Error('Invalid GitHub response')
  }
  const reader = response.body.getReader()
  const chunks: Uint8Array[] = []
  let size = 0
  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      size += value.byteLength
      if (size > limit) throw new Error('Invalid GitHub response')
      chunks.push(value)
    }
  } finally {
    await reader.cancel().catch(() => {})
    reader.releaseLock()
  }
  const bytes = new Uint8Array(size)
  let offset = 0
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength }
  return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes)) as unknown
}

export async function requestGithub(repository: string, endpoint: Endpoint = '', signal?: AbortSignal): Promise<GithubResponse> {
  const parsed = parseGithubRepository(`https://github.com/${repository}`)
  if (!parsed || !Object.hasOwn(endpoints, endpoint)) return { success: false, reason: 'invalid', message: githubMessages.unavailable }
  try {
    const response = await fetch(`https://api.github.com/repos/${parsed.repository}${endpoint}`, {
      headers: { Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2026-03-10', 'User-Agent': 'Portfolio-CMS/1.0' },
      cache: 'no-store', credentials: 'omit', redirect: 'manual',
      signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(10_000)]) : AbortSignal.timeout(10_000),
    })
    if (!response.ok) await response.body?.cancel().catch(() => {})
    if (response.status === 429 || (response.status === 403 && (response.headers.get('x-ratelimit-remaining') === '0' || response.headers.has('retry-after')))) {
      return { success: false, reason: 'rate-limit', message: githubMessages.rateLimit }
    }
    if (response.status === 404) return { success: false, reason: 'missing', message: githubMessages.missing }
    if (response.status === 403) return { success: false, reason: 'unavailable', message: githubMessages.missing }
    if (response.status >= 300 && response.status < 400) return { success: false, reason: 'unavailable', message: githubMessages.moved }
    if (!response.ok) return { success: false, reason: 'unavailable', message: githubMessages.unavailable }
    try { return { success: true, data: await readJson(response, endpoints[endpoint]) } }
    catch { return { success: false, reason: 'invalid', message: githubMessages.unavailable } }
  } catch {
    return { success: false, reason: 'unavailable', message: githubMessages.unavailable }
  }
}
