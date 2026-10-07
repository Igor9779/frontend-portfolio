import 'server-only'

import { parseGithubRepository } from './github-repository'
import { projectLimits, validateProject } from './project-validation'
import type { GithubImportResult } from '../types/github-import'

const unavailable = 'Unable to import from GitHub. Please try again.'
const rateLimit = 'GitHub API rate limit reached. Please try again later.'
const headers = {
  Accept: 'application/vnd.github+json',
  'X-GitHub-Api-Version': '2026-03-10',
  'User-Agent': 'Portfolio-CMS/1.0',
}

function record(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value))
}

function text(value: unknown, max: number) {
  return typeof value === 'string' ? value.replace(/\p{Cc}/gu, ' ').trim().slice(0, max) : ''
}

// Enforce the limit while streaming as well as from Content-Length. No error
// response bodies are read or passed to the browser.
async function readJson(response: Response, limit: number): Promise<unknown> {
  const length = Number(response.headers.get('content-length'))
  if (length > limit || !response.body) {
    await response.body?.cancel().catch(() => {})
    throw new Error('Invalid response')
  }
  const reader = response.body.getReader()
  const chunks: Uint8Array[] = []
  let size = 0
  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      size += value.byteLength
      if (size > limit) throw new Error('Invalid response')
      chunks.push(value)
    }
  } finally {
    await reader.cancel().catch(() => {})
    reader.releaseLock()
  }
  const bytes = new Uint8Array(size)
  let offset = 0
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength }
  return JSON.parse(new TextDecoder().decode(bytes)) as unknown
}

async function request(repository: string, languages = false) {
  // Only a validated GitHub identity can reach this constant API origin.
  const response = await fetch(`https://api.github.com/repos/${repository}${languages ? '/languages' : ''}`, {
    headers, cache: 'no-store', credentials: 'omit', redirect: 'manual', signal: AbortSignal.timeout(10_000),
  })
  if (!response.ok) await response.body?.cancel().catch(() => {})
  if (response.status === 429 || (response.status === 403 && (response.headers.get('x-ratelimit-remaining') === '0' || response.headers.has('retry-after')))) {
    return { success: false as const, message: rateLimit }
  }
  if (response.status === 404 || response.status === 403) return { success: false as const, message: 'Repository not found or unavailable. Use a public GitHub repository.' }
  if (response.status >= 300 && response.status < 400) return { success: false as const, message: 'Repository URL has moved. Use its current GitHub URL.' }
  if (!response.ok) return { success: false as const, message: unavailable }
  return { success: true as const, data: await readJson(response, languages ? 32_768 : 262_144) }
}

export function normalizeGithubLanguages(value: unknown): string[] {
  if (!record(value)) throw new Error('Invalid languages')
  const seen = new Set<string>()
  return Object.entries(value)
    .filter(([name, bytes]) => name.trim() && name.length <= projectLimits.technology && !/\p{Cc}/u.test(name) && typeof bytes === 'number' && Number.isFinite(bytes) && bytes > 0)
    .map(([name, bytes]) => [name.trim(), Number(bytes)] as const)
    .sort(([a, aBytes], [b, bBytes]) => Number(bBytes) - Number(aBytes) || a.localeCompare(b, 'en'))
    .map(([name]) => name)
    .filter(name => { const key = name.toLowerCase(); if (seen.has(key)) return false; seen.add(key); return true })
    .slice(0, projectLimits.technologies)
}

export async function fetchGithubProject(input: unknown): Promise<GithubImportResult> {
  const parsed = parseGithubRepository(input)
  if (!parsed) return { success: false, message: 'Enter a GitHub repository URL such as https://github.com/owner/repository.' }
  try {
    const metadata = await request(parsed.repository)
    if (!metadata.success) return metadata
    if (!record(metadata.data) || metadata.data.private !== false) return { success: false, message: 'Repository not found or unavailable. Use a public GitHub repository.' }
    const repo = metadata.data
    const canonical = parseGithubRepository(repo.html_url)
    if (!canonical || typeof repo.full_name !== 'string' || repo.full_name.toLowerCase() !== canonical.repository || typeof repo.name !== 'string' || !repo.name.trim()) throw new Error('Invalid repository')
    const languages = await request(canonical.repository, true)
    if (!languages.success) return languages
    const description = text(repo.description, projectLimits.description)
    const homepage = typeof repo.homepage === 'string' ? repo.homepage.trim() : ''
    // Reuse the existing URL rules. Invalid homepages are omitted, never fetched.
    const homepageValid = homepage && validateProject({ title: 'Repository', category: 'Repository', description: 'Repository', productionUrl: homepage, technologies: [], visible: false }).success && /^https?:\/\//i.test(homepage)
    return {
      success: true,
      fields: {
        title: text(repo.name, projectLimits.title),
        shortDescription: description.slice(0, projectLimits.shortDescription),
        description,
        githubUrl: canonical.url,
        githubRepository: canonical.repository,
        productionUrl: homepageValid ? homepage : '',
        technologies: normalizeGithubLanguages(languages.data),
      },
      ...(repo.archived === true ? { warning: 'This repository is archived. Review it before saving.' } : {}),
    }
  } catch {
    return { success: false, message: unavailable }
  }
}
