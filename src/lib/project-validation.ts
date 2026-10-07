import type { ProjectFieldErrors, ProjectFormValues } from '../types/project-form'

export const projectLimits = {
  title: 160,
  category: 120,
  shortDescription: 500,
  description: 10_000,
  url: 2048,
  technologies: 30,
  technology: 50,
} as const

type ValidatedProject = Omit<ProjectFormValues, 'shortDescription' | 'previewUrl' | 'githubUrl' | 'productionUrl' | 'telegramUrl'> & {
  shortDescription: string | null
  previewUrl: string | null
  githubUrl: string | null
  productionUrl: string | null
  telegramUrl: string | null
}

type ValidationResult =
  | { success: true; project: ValidatedProject }
  | { success: false; errors: ProjectFieldErrors }

function hasControlCharacters(value: string) {
  return Array.from(value).some((character) => character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127)
}

function isAllowedUrl(value: string, localPrefix?: string) {
  if (/[\s\\]/.test(value) || hasControlCharacters(value) || /%(?![0-9a-f]{2})/i.test(value)) return false
  try {
    if (localPrefix && value.startsWith(localPrefix)) {
      const url = new URL(value, 'https://portfolio.invalid')
      const decodedPath = decodeURIComponent(url.pathname)
      return url.origin === 'https://portfolio.invalid'
        && decodedPath.startsWith(localPrefix)
        && !decodedPath.includes('\\') && !hasControlCharacters(decodedPath)
        && !decodedPath.split('/').some((part) => part === '.' || part === '..')
    }
    if (!/^https?:\/\//i.test(value)) return false
    const url = new URL(value)
    return (url.protocol === 'http:' || url.protocol === 'https:')
      && Boolean(url.hostname) && !url.username && !url.password
  } catch {
    return false
  }
}

export function validateProject(input: unknown): ValidationResult {
  const errors: ProjectFieldErrors = {}
  const fields = input && typeof input === 'object' && !Array.isArray(input)
    ? input as Record<string, unknown>
    : {}

  function text(field: keyof ProjectFormValues, maxLength: number, required = false) {
    const raw = fields[field]
    if (raw != null && typeof raw !== 'string') {
      errors[field] = 'Enter a text value.'
      return ''
    }
    const value = typeof raw === 'string' ? raw.trim() : ''
    if (required && !value) errors[field] = 'This field is required.'
    else if (value.length > maxLength) errors[field] = `Use ${maxLength} characters or fewer.`
    else if (value.includes('\0')) errors[field] = 'Remove invalid characters.'
    return value
  }

  const title = text('title', projectLimits.title, true)
  const category = text('category', projectLimits.category, true)
  const shortDescription = text('shortDescription', projectLimits.shortDescription) || null
  const description = text('description', projectLimits.description, true)

  function url(field: 'previewUrl' | 'githubUrl' | 'productionUrl' | 'telegramUrl', localPrefix?: string) {
    const value = text(field, projectLimits.url)
    if (value && !errors[field] && !isAllowedUrl(value, localPrefix)) {
      errors[field] = localPrefix
        ? `Enter an HTTP(S) URL or a path starting with ${localPrefix}.`
        : 'Enter a valid HTTP(S) URL.'
    }
    return value || null
  }

  const previewUrl = url('previewUrl', '/assets/')
  const githubUrl = url('githubUrl')
  const productionUrl = url('productionUrl', '/projects/')
  const telegramUrl = url('telegramUrl')
  const technologies: string[] = []
  const seen = new Set<string>()
  if (!Array.isArray(fields.technologies) || fields.technologies.length > projectLimits.technologies) {
    errors.technologies = `Use an array of up to ${projectLimits.technologies} technologies.`
  } else {
    for (const raw of fields.technologies) {
      if (typeof raw !== 'string') {
        errors.technologies = 'Each technology must be a text value.'
        break
      }
      const value = raw.trim()
      if (!value) continue
      if (value.length > projectLimits.technology || hasControlCharacters(value)) {
        errors.technologies = `Use ${projectLimits.technology} characters or fewer per technology, without invalid characters.`
        break
      }
      if (!seen.has(value.toLowerCase())) technologies.push(value)
      seen.add(value.toLowerCase())
    }
  }
  if (typeof fields.visible !== 'boolean') errors.visible = 'Choose whether the project is visible.'

  if (Object.keys(errors).length) return { success: false, errors }
  return { success: true, project: { title, category, shortDescription, description, previewUrl, githubUrl, productionUrl, telegramUrl, technologies, visible: fields.visible as boolean } }
}

export function isProjectId(value: unknown): value is string {
  return typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)
}

export function deriveGithubRepo(value: string | null): string | null {
  if (!value) return null
  try {
    const url = new URL(value)
    if (url.hostname !== 'github.com' || url.username || url.password) return null
    const parts = url.pathname.replace(/\/$/, '').slice(1).split('/')
    const owner = parts[0]
    const repo = parts[1]?.replace(/\.git$/i, '')
    if (parts.length !== 2 || !owner || !repo) return null
    if (!/^[a-z0-9-]+$/i.test(owner) || !/^[a-z0-9_.-]+$/i.test(repo) || repo === '.' || repo === '..') return null
    return `${owner}/${repo}`
  } catch {
    return null
  }
}
