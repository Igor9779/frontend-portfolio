import type { ProjectFormDraft, ProjectFormValues } from '../types/project-form'
import { deriveGithubRepo, projectLimits } from './project-validation'
import { parseGithubRepository } from './github-repository'

export const adminProjectDraftKey = 'portfolio:admin:add-project:v1'
type DraftStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>
const textLimits = {
  title: projectLimits.title, category: projectLimits.category,
  shortDescription: projectLimits.shortDescription, description: projectLimits.description,
  previewUrl: projectLimits.url, githubUrl: projectLimits.url,
  productionUrl: projectLimits.url, telegramUrl: projectLimits.url,
} as const

export function emptyProjectDraft(): ProjectFormDraft {
  return { values: { title: '', category: '', shortDescription: '', description: '', previewUrl: '',
    githubUrl: '', productionUrl: '', telegramUrl: '', technologies: [], visible: true },
  previewMode: 'keep', importedRepository: null }
}

function draftValues(input: unknown): ProjectFormValues | null {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return null
  const fields = input as Record<string, unknown>
  const values = {} as ProjectFormValues
  for (const [field, limit] of Object.entries(textLimits)) {
    const value = fields[field]
    // Drafts may be incomplete (including partial URLs). They are rendered only
    // in editable inputs, and still pass full server validation before Save.
    if (typeof value !== 'string' || value.length > limit || value.includes('\0')) return null
    if (field === 'previewUrl' && /^(blob|data):/i.test(value.trim())) return null
    values[field as keyof typeof textLimits] = value
  }
  if (typeof fields.visible !== 'boolean' || !Array.isArray(fields.technologies) || fields.technologies.length > projectLimits.technologies) return null
  const technologies: string[] = []
  const seen = new Set<string>()
  for (const value of fields.technologies) {
    if (typeof value !== 'string' || !value.trim() || value.length > projectLimits.technology || /\p{Cc}/u.test(value) || seen.has(value.toLowerCase())) return null
    technologies.push(value)
    seen.add(value.toLowerCase())
  }
  return { ...values, visible: fields.visible, technologies }
}

export function serializeProjectDraft(draft: ProjectFormDraft): string {
  const fields = draft.values
  // An explicit allowlist excludes files, blob previews, IDs, timestamps,
  // positions, auth/session data and arbitrary additional properties.
  return JSON.stringify({ version: 1, values: {
    title: fields.title, category: fields.category, shortDescription: fields.shortDescription,
    description: fields.description, previewUrl: fields.previewUrl,
    githubUrl: fields.githubUrl, productionUrl: fields.productionUrl, telegramUrl: fields.telegramUrl,
    technologies: fields.technologies, visible: fields.visible,
  }, previewMode: draft.previewMode, source: draft.importedRepository ? 'github' : 'manual',
  github_repo: draft.importedRepository ?? deriveGithubRepo(fields.githubUrl)?.toLowerCase() ?? null })
}

export function parseProjectDraft(raw: string | null): ProjectFormDraft | null {
  if (!raw || raw.length > 60_000) return null
  try {
    const data = JSON.parse(raw)
    if (!data || data.version !== 1 || (data.previewMode !== 'keep' && data.previewMode !== 'url')) return null
    const values = draftValues(data.values)
    if (!values || (data.source !== 'manual' && data.source !== 'github')) return null
    const repository = deriveGithubRepo(values.githubUrl)?.toLowerCase() ?? null
    if (data.github_repo !== repository) return null
    if (data.source === 'github' && (!repository || parseGithubRepository(values.githubUrl)?.repository !== repository)) return null
    return { values, previewMode: data.previewMode, importedRepository: data.source === 'github' ? repository : null }
  } catch { return null }
}

export function loadProjectDraft(storage: DraftStorage | null): ProjectFormDraft | null {
  try { return storage ? parseProjectDraft(storage.getItem(adminProjectDraftKey)) : null }
  catch { return null }
}

export function clearProjectDraft(storage: DraftStorage | null): boolean {
  try { if (!storage) return false; storage.removeItem(adminProjectDraftKey); return true }
  catch { return false }
}

export function persistProjectDraft(storage: DraftStorage | null, draft: ProjectFormDraft): boolean {
  try {
    if (!storage) return false
    const raw = serializeProjectDraft(draft)
    if (!parseProjectDraft(raw)) return false
    if (raw === serializeProjectDraft(emptyProjectDraft())) return clearProjectDraft(storage)
    storage.setItem(adminProjectDraftKey, raw)
    return true
  } catch { return false }
}
