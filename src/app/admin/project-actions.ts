'use server'

import { randomUUID } from 'node:crypto'
import { revalidatePath } from 'next/cache'
import { unstable_rethrow } from 'next/navigation'
import { requireAdmin } from '../../lib/auth'
import { deriveGithubRepo, isProjectId, parseProjectFormData, validateProject } from '../../lib/project-validation'
import { validatePreviewFile } from '../../lib/preview-file'
import { removeProjectPreview, uploadProjectPreview } from '../../lib/project-previews'
import { projectColumns, toAdminProject } from '../../lib/projects'
import type { ProjectDeleteResult, ProjectSaveResult } from '../../types/project-form'
import type { AdminProject } from '../../types/admin-project'

function logFailure(operation: 'create' | 'update' | 'delete', error?: { code: string }) {
  const code = error && /^[A-Z0-9]{5,12}$/.test(error.code) ? ` (${error.code})` : ''
  console.error(`Project ${operation} failed${code}.`)
}

function refreshProjects() {
  revalidatePath('/admin')
  revalidatePath('/')
}

function databaseFields(project: Extract<ReturnType<typeof validateProject>, { success: true }>['project']) {
  return {
    title: project.title,
    category: project.category,
    short_description: project.shortDescription,
    description: project.description,
    preview_url: project.previewUrl,
    github_url: project.githubUrl,
    production_url: project.productionUrl,
    telegram_url: project.telegramUrl,
    technologies: project.technologies,
    visible: project.visible,
    github_repo: deriveGithubRepo(project.githubUrl),
    updated_at: new Date().toISOString(),
  }
}

export async function createProject(input: unknown): Promise<ProjectSaveResult> {
  // Authorization precedes even validation. Keep redirects outside the catch.
  const { supabase } = await requireAdmin()
  const validated = parseProjectFormData(input)
  if (!validated.success) return { success: false, message: 'Please correct the highlighted fields.', errors: validated.errors }
  if (validated.file) {
    const image = await validatePreviewFile(validated.file)
    if (!image.success) return { success: false, message: image.message, errors: { previewFile: image.message } }
  }

  const id = randomUUID()
  let uploaded: string | null = null
  let saved: AdminProject | undefined
  try {
    const { data: last, error: positionError } = await supabase
      .from('projects').select('position').order('position', { ascending: false })
      .limit(1).abortSignal(AbortSignal.timeout(10_000)).maybeSingle()
    if (positionError) {
      logFailure('create', positionError)
      return { success: false, message: 'Unable to save the project. Please try again.' }
    }
    const position = (last?.position ?? -1) + 1
    if (!Number.isSafeInteger(position) || position > 2_147_483_647) {
      logFailure('create')
      return { success: false, message: 'Unable to save the project. Please try again.' }
    }
    // Concurrent additions may share a position; the existing UUID secondary
    // ordering is deterministic. Persistent ordering/locking is a later stage.
    const fields = databaseFields(validated.project)
    if (validated.file) {
      const upload = await uploadProjectPreview(id, validated.file)
      if (!upload.success) return { success: false, message: upload.message, errors: { previewFile: upload.message } }
      uploaded = upload.previewUrl
      fields.preview_url = uploaded
    }
    const { data, error } = await supabase.from('projects').insert({
      ...fields,
      id,
      source: 'manual',
      position,
      created_at: fields.updated_at,
    }).select(projectColumns).abortSignal(AbortSignal.timeout(10_000)).single()
    if (error || !data) {
      logFailure('create', error ?? undefined)
      return { success: false, message: 'Unable to save the project. Please try again.' }
    }
    saved = toAdminProject(data)
  } catch (error) {
    unstable_rethrow(error)
    logFailure('create')
    return { success: false, message: 'Unable to save the project. Please try again.' }
  } finally {
    if (uploaded && !saved) await removeProjectPreview(id, uploaded)
  }
  refreshProjects()
  return { success: true, project: saved }
}

export async function updateProject(id: unknown, input: unknown): Promise<ProjectSaveResult> {
  const { supabase } = await requireAdmin()
  if (!isProjectId(id)) return { success: false, message: 'This project is unavailable. Refresh the list and try again.' }
  const validated = parseProjectFormData(input)
  if (!validated.success) return { success: false, message: 'Please correct the highlighted fields.', errors: validated.errors }
  if (validated.file) {
    const image = await validatePreviewFile(validated.file)
    if (!image.success) return { success: false, message: image.message, errors: { previewFile: image.message } }
  }

  let previousPreview: string | null
  let uploaded: string | null = null
  let saved: AdminProject | undefined
  try {
    const { data: current, error: readError } = await supabase.from('projects')
      .select('id, preview_url').eq('id', id).abortSignal(AbortSignal.timeout(10_000)).maybeSingle()
    if (readError) {
      logFailure('update', readError)
      return { success: false, message: 'Unable to save the project. Please try again.' }
    }
    if (!current) return { success: false, message: 'This project is unavailable. Refresh the list and try again.' }
    previousPreview = current.preview_url
    const fields = databaseFields(validated.project)
    if (validated.keepPreview) fields.preview_url = previousPreview
    if (validated.file) {
      const upload = await uploadProjectPreview(id, validated.file)
      if (!upload.success) return { success: false, message: upload.message, errors: { previewFile: upload.message } }
      uploaded = upload.previewUrl
      fields.preview_url = uploaded
    }
    // Explicit field mapping excludes id, source, created_at and position,
    // including any position displayed by the local ordering preview.
    let query = supabase.from('projects').update(fields).eq('id', id)
    // Refuse to overwrite a preview replaced between the read and this save.
    query = previousPreview === null ? query.is('preview_url', null) : query.eq('preview_url', previousPreview)
    const { data, error } = await query
      .select(projectColumns).abortSignal(AbortSignal.timeout(10_000)).maybeSingle()
    if (error) {
      logFailure('update', error)
      return { success: false, message: 'Unable to save the project. Please try again.' }
    }
    if (!data) return { success: false, message: 'This project changed or is unavailable. Refresh the list and try again.' }
    saved = toAdminProject(data)
  } catch (error) {
    unstable_rethrow(error)
    logFailure('update')
    return { success: false, message: 'Unable to save the project. Please try again.' }
  } finally {
    if (uploaded && !saved) await removeProjectPreview(id, uploaded)
  }
  if (previousPreview !== saved.previewUrl) await removeProjectPreview(id, previousPreview)
  refreshProjects()
  return { success: true, project: saved }
}

export async function deleteProject(id: unknown): Promise<ProjectDeleteResult> {
  const { supabase } = await requireAdmin()
  if (!isProjectId(id)) return { success: false, message: 'This project is unavailable. Refresh the list and try again.' }
  let preview: string | null
  try {
    const { data, error } = await supabase.from('projects').delete().eq('id', id)
      .select('id, preview_url').abortSignal(AbortSignal.timeout(10_000)).maybeSingle()
    if (error) {
      logFailure('delete', error)
      return { success: false, message: 'Unable to delete the project. Please try again.' }
    }
    if (!data) return { success: false, message: 'This project is unavailable. Refresh the list and try again.' }
    preview = data.preview_url
  } catch {
    logFailure('delete')
    return { success: false, message: 'Unable to delete the project. Please try again.' }
  }
  await removeProjectPreview(id, preview)
  refreshProjects()
  return { success: true, id }
}
