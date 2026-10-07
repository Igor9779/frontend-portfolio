// Repository identity is case-insensitive on GitHub. Validate the original
// path before URL parsing can normalize dot segments or encoded separators.
export function parseGithubRepository(input: unknown): { repository: string; url: string } | null {
  if (typeof input !== 'string' || input.length > 2048) return null
  const value = input.trim()
  const match = /^https:\/\/github\.com\/([a-z0-9-]+)\/([a-z0-9_.-]+)\/?$/i.exec(value)
  if (!match) return null
  const owner = match[1]
  const rawName = match[2]
  if (!owner || !rawName) return null
  const name = rawName.replace(/\.git$/i, '')
  if (owner.length > 39 || owner.startsWith('-') || owner.endsWith('-') || owner.includes('--')) return null
  if (!name || name.length > 100 || name === '.' || name === '..') return null
  return { repository: `${owner}/${name}`.toLowerCase(), url: `https://github.com/${owner}/${name}` }
}
