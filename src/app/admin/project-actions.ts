'use server'

import { randomUUID } from 'node:crypto'
import { revalidatePath } from 'next/cache'
import { requireAdmin } from '../../lib/auth'
import { deriveGithubRepo, isProjectId, validateProject } from '../../lib/project-validation'
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
  const validated = validateProject(input)
  if (!validated.success) return { success: false, message: 'Please correct the highlighted fields.', errors: validated.errors }

  let saved: AdminProject
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
    const { data, error } = await supabase.from('projects').insert({
      ...fields,
      id: randomUUID(),
      source: 'manual',
      position,
      created_at: fields.updated_at,
    }).select(projectColumns).abortSignal(AbortSignal.timeout(10_000)).single()
    if (error || !data) {
      logFailure('create', error ?? undefined)
      return { success: false, message: 'Unable to save the project. Please try again.' }
    }
    saved = toAdminProject(data)
  } catch {
    logFailure('create')
    return { success: false, message: 'Unable to save the project. Please try again.' }
  }
  refreshProjects()
  return { success: true, project: saved }
}

export async function updateProject(id: unknown, input: unknown): Promise<ProjectSaveResult> {
  const { supabase } = await requireAdmin()
  if (!isProjectId(id)) return { success: false, message: 'This project is unavailable. Refresh the list and try again.' }
  const validated = validateProject(input)
  if (!validated.success) return { success: false, message: 'Please correct the highlighted fields.', errors: validated.errors }

  let saved: AdminProject
  try {
    // Explicit field mapping excludes id, source, created_at and position,
    // including any position displayed by the local ordering preview.
    const { data, error } = await supabase.from('projects')
      .update(databaseFields(validated.project)).eq('id', id)
      .select(projectColumns).abortSignal(AbortSignal.timeout(10_000)).maybeSingle()
    if (error) {
      logFailure('update', error)
      return { success: false, message: 'Unable to save the project. Please try again.' }
    }
    if (!data) return { success: false, message: 'This project is unavailable. Refresh the list and try again.' }
    saved = toAdminProject(data)
  } catch {
    logFailure('update')
    return { success: false, message: 'Unable to save the project. Please try again.' }
  }
  refreshProjects()
  return { success: true, project: saved }
}

export async function deleteProject(id: unknown): Promise<ProjectDeleteResult> {
  const { supabase } = await requireAdmin()
  if (!isProjectId(id)) return { success: false, message: 'This project is unavailable. Refresh the list and try again.' }
  try {
    const { data, error } = await supabase.from('projects').delete().eq('id', id)
      .select('id').abortSignal(AbortSignal.timeout(10_000)).maybeSingle()
    if (error) {
      logFailure('delete', error)
      return { success: false, message: 'Unable to delete the project. Please try again.' }
    }
    if (!data) return { success: false, message: 'This project is unavailable. Refresh the list and try again.' }
  } catch {
    logFailure('delete')
    return { success: false, message: 'Unable to delete the project. Please try again.' }
  }
  refreshProjects()
  return { success: true, id }
}
