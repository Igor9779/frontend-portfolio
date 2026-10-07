import { isProjectId } from './project-validation'

export const previewBucket = 'project-previews'

export function managedPreviewPath(reference: string | null, projectId: string, supabaseUrl: string): string | null {
  if (!reference || !isProjectId(projectId)) return null
  // Exact canonical prefix and generated ASCII path: no URL normalization,
  // decoding, traversal, query strings or unrelated hosts/buckets/projects.
  const prefix = `${supabaseUrl.replace(/\/$/, '')}/storage/v1/object/public/${previewBucket}/`
  if (!reference.startsWith(prefix)) return null
  const path = reference.slice(prefix.length)
  const parts = path.split('/')
  if (parts.length !== 3 || parts[0] !== 'projects' || parts[1] !== projectId) return null
  const match = /^preview-([0-9a-f-]+)\.(jpg|png|webp)$/.exec(parts[2] ?? '')
  return match && isProjectId(match[1]) ? path : null
}
