import 'server-only'

import { requestGithub, githubMessages } from './github-api'
import { parseGithubRepository } from './github-repository'
import { normalizeGithubLanguages } from './github-import'

export const githubContextLimits = { readme: 32_768, package: 65_536, packageProjection: 8_192, metadataProjection: 4_096, total: 49_152 } as const
export interface GithubContext {
  repository: string
  metadata: { name: string; description: string; homepage: string; topics: string[]; languages: string[] }
  readme: string | null
  package: { name: string; description: string; dependencies: string[]; devDependencies: string[] } | null
}
type ContextResult = { success: true; context: GithubContext; warnings: string[] } | { success: false; message: string }
const limited = 'Some repository documentation was unavailable. Review suggestions carefully.'
const weak = 'This repository has too little descriptive context. Complete the fields manually.'
const record = (value: unknown): value is Record<string, unknown> => Boolean(value && typeof value === 'object' && !Array.isArray(value))
const byteLength = (value: unknown) => Buffer.byteLength(JSON.stringify(value), 'utf8')
const text = (value: unknown, limit: number) => typeof value === 'string' ? value.replace(/\p{Cc}/gu, ' ').trim().slice(0, limit) : ''

function homepage(value: unknown): string {
  if (typeof value !== 'string' || value.length > 2048) return ''
  try {
    const url = new URL(value)
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) return ''
    // Query strings/fragments are unnecessary evidence and can contain keys.
    return url.origin + url.pathname
  } catch { return '' }
}

function decodeFile(input: unknown, limit: number): string | null {
  if (!record(input) || input.type !== 'file' || input.encoding !== 'base64' || typeof input.content !== 'string'
    || typeof input.size !== 'number' || !Number.isInteger(input.size) || input.size < 1 || input.size > limit) return null
  const encoded = input.content.replace(/[\r\n]/g, '')
  if (!/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(encoded) || encoded.length > Math.ceil(limit / 3) * 4) return null
  const bytes = Buffer.from(encoded, 'base64')
  if (bytes.length !== input.size || bytes.length > limit) return null
  try {
    const decoded = new TextDecoder('utf-8', { fatal: true }).decode(bytes)
    if (!decoded.trim() || /\p{Cc}/u.test(decoded.replace(/[\n\r\t]/g, ''))) return null
    return decoded
  } catch { return null }
}

// Only names are evidence. Versions, scripts, URLs and arbitrary package
// values never enter the model request, and nothing is executed.
function projectPackage(input: string | null): GithubContext['package'] {
  if (!input) return null
  try {
    const value: unknown = JSON.parse(input)
    if (!record(value)) return null
    function dependencies(raw: unknown, development = false): string[] {
      if (!record(raw)) return []
      const usefulDevelopment = /^(typescript|vite|@vitejs\/plugin-react|tailwindcss|@tailwindcss\/|sass|less|webpack|rollup|esbuild|astro|svelte)/
      return Object.keys(raw).filter(name => name.length <= 100 && /^(?:@[a-z0-9_.-]+\/)?[a-z0-9_.-]+$/i.test(name)
        && (!development || usefulDevelopment.test(name))).sort().slice(0, 150)
    }
    const result = { name: text(value.name, 120), description: text(value.description, 1000),
      dependencies: dependencies(value.dependencies), devDependencies: dependencies(value.devDependencies, true) }
    return byteLength(result) <= githubContextLimits.packageProjection ? result : null
  } catch { return null }
}

export function serializeGithubContext(context: GithubContext): string | null {
  if (byteLength(context.metadata) > githubContextLimits.metadataProjection
    || (context.readme && Buffer.byteLength(context.readme) > githubContextLimits.readme)
    || (context.package && byteLength(context.package) > githubContextLimits.packageProjection)) return null
  const serialized = JSON.stringify(context)
  return Buffer.byteLength(serialized) <= githubContextLimits.total ? serialized : null
}

export async function fetchGithubContext(input: unknown, signal?: AbortSignal): Promise<ContextResult> {
  const parsed = parseGithubRepository(input)
  if (!parsed) return { success: false, message: 'Enter a valid public GitHub repository URL.' }
  try {
    const repository = await requestGithub(parsed.repository, '', signal)
    if (!repository.success) return { success: false, message: repository.message }
    const repo = repository.data
    if (!record(repo) || repo.private !== false || typeof repo.name !== 'string' || !repo.name.trim()) return { success: false, message: githubMessages.missing }
    const canonical = parseGithubRepository(repo.html_url)
    if (!canonical || canonical.repository !== parsed.repository || typeof repo.full_name !== 'string' || repo.full_name.toLowerCase() !== canonical.repository) {
      return { success: false, message: githubMessages.moved }
    }
    const [languages, readme, packageFile] = await Promise.all([
      requestGithub(canonical.repository, '/languages', signal), requestGithub(canonical.repository, '/readme', signal),
      requestGithub(canonical.repository, '/contents/package.json', signal),
    ])
    const rateLimit = [languages, readme, packageFile].find(result => !result.success && result.reason === 'rate-limit')
    if (rateLimit && !rateLimit.success) return { success: false, message: rateLimit.message }
    if (!languages.success) return { success: false, message: languages.message }
    if (signal?.aborted) return { success: false, message: 'Repository analysis timed out. Please try again.' }
    const readmeText = readme.success ? decodeFile(readme.data, githubContextLimits.readme) : null
    const packageText = packageFile.success ? decodeFile(packageFile.data, githubContextLimits.package) : null
    const packageProjection = projectPackage(packageText)
    const context: GithubContext = { repository: canonical.repository, metadata: {
      name: text(repo.name, 120), description: text(repo.description, 1000), homepage: homepage(repo.homepage),
      topics: Array.isArray(repo.topics) ? repo.topics.filter((topic): topic is string => typeof topic === 'string' && /^[a-z0-9-]{1,50}$/i.test(topic)).slice(0, 20) : [],
      languages: normalizeGithubLanguages(languages.data),
    }, readme: readmeText, package: packageProjection }
    // A name or a dependency list alone cannot explain what an app does.
    if (!readmeText && context.metadata.description.length < 20 && (!packageProjection || packageProjection.description.length < 20)) return { success: false, message: weak }
    if (!serializeGithubContext(context)) return { success: false, message: 'Repository context is too large. Complete the fields manually.' }
    return { success: true, context, warnings: !readmeText || !packageProjection ? [limited] : [] }
  } catch { return { success: false, message: 'Unable to read repository context. Please try again.' } }
}
