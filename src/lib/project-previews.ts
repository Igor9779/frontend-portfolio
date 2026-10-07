import 'server-only'

import { randomUUID } from 'node:crypto'
import { requireAdmin } from './auth'
import { isProjectId } from './project-validation'
import { validatePreviewFile, type PreviewExtension } from './preview-file'
import { managedPreviewPath, previewBucket } from './preview-path'
import { supabaseUrl } from './supabase/config'

export function createPreviewPath(projectId: string, extension: PreviewExtension): string {
  if (!isProjectId(projectId) || !['jpg', 'png', 'webp'].includes(extension)) throw new Error('Invalid managed preview path.')
  return `projects/${projectId}/preview-${randomUUID()}.${extension}`
}

function cleanupWarning() {
  console.warn('Managed preview cleanup was not completed. No project data was rolled back.')
}

export async function removeProjectPreview(projectId: string, reference: string | null): Promise<boolean> {
  const { supabase } = await requireAdmin()
  const path = managedPreviewPath(reference, projectId, supabaseUrl!)
  if (!path) return true
  try {
    // This also protects a committed row after an interrupted INSERT/UPDATE
    // response, and prevents deleting a preview another project still uses.
    const { data: referenced, error: referenceError } = await supabase.from('projects')
      .select('id').eq('preview_url', reference!).limit(1)
      .abortSignal(AbortSignal.timeout(10_000)).maybeSingle()
    if (referenceError) { cleanupWarning(); return false }
    if (referenced) return true
    const { error } = await supabase.storage.from(previewBucket).remove([path])
    if (error) { cleanupWarning(); return false }
    return true
  } catch {
    cleanupWarning()
    return false
  }
}

export async function uploadProjectPreview(projectId: string, file: unknown): Promise<
  { success: true; previewUrl: string } | { success: false; message: string }
> {
  const { supabase } = await requireAdmin()
  if (!isProjectId(projectId)) return { success: false, message: 'Unable to upload the preview. Please try again.' }
  const validated = await validatePreviewFile(file)
  if (!validated.success) return validated
  const path = createPreviewPath(projectId, validated.extension)
  const bucket = supabase.storage.from(previewBucket)
  const previewUrl = bucket.getPublicUrl(path).data.publicUrl
  try {
    const { error } = await bucket.upload(path, validated.file, {
      contentType: validated.contentType, cacheControl: '31536000', upsert: false,
    })
    if (!error) return { success: true, previewUrl }
  } catch {
    // A transport failure may occur after Storage accepted the object.
  }
  console.error('Managed preview upload failed.')
  await removeProjectPreview(projectId, previewUrl)
  return { success: false, message: 'Unable to upload the preview. Please try again.' }
}
