import 'server-only'

import type { DatabaseProject } from '../types/database'
import type { AdminProject } from '../types/admin-project'
import type { Project, ProjectLink } from '../types/project'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '../types/database'
import { requireAdmin } from './auth'
import { supabase } from './supabase/public'

type ProjectRow = Pick<
  DatabaseProject,
  | 'id'
  | 'title'
  | 'category'
  | 'short_description'
  | 'description'
  | 'preview_url'
  | 'github_url'
  | 'production_url'
  | 'telegram_url'
  | 'technologies'
  | 'position'
  | 'visible'
>

export const projectColumns = 'id, title, category, short_description, description, preview_url, github_url, production_url, telegram_url, technologies, position, visible'

export function toAdminProject(row: ProjectRow): AdminProject {
  return {
    id: row.id,
    title: row.title,
    category: row.category,
    shortDescription: row.short_description,
    description: row.description,
    previewUrl: row.preview_url,
    githubUrl: row.github_url,
    productionUrl: row.production_url,
    telegramUrl: row.telegram_url,
    technologies: row.technologies,
    position: row.position,
    visible: row.visible,
  }
}

function toProject(row: ProjectRow): Project {
  const links: ProjectLink[] = []

  // Preserve the portfolio's existing button labels and order.
  if (row.production_url) links.push({ label: 'View project →', href: row.production_url })
  if (row.github_url) links.push({ label: 'GitHub →', href: row.github_url })
  if (row.telegram_url) links.push({ label: 'Telegram →', href: row.telegram_url })

  return {
    id: row.id,
    title: row.title,
    type: row.category,
    description: row.description,
    image: row.preview_url ?? '',
    imageAlt: `${row.title} project preview`,
    tags: row.technologies,
    links,
  }
}

async function readProjectRows(client: SupabaseClient<Database>, { visibleOnly }: { visibleOnly: boolean }): Promise<ProjectRow[]> {
  const query = client
    .from('projects')
    .select(projectColumns)
    .order('position', { ascending: true })
    .order('id', { ascending: true })

  if (visibleOnly) query.eq('visible', true)

  const { data, error } = await query
    .abortSignal(AbortSignal.timeout(10_000))

  if (error) {
    // Do not include raw SDK errors, URLs, headers or credentials in logs/UI.
    const code = /^[A-Z0-9]{5}$/.test(error.code) ? ` (${error.code})` : ''
    throw new Error(
      `Unable to load portfolio projects from Supabase${code}. Check connectivity, the public.projects table, SELECT grants and its RLS policy.`,
    )
  }

  if (!data) throw new Error('Supabase returned no project data. Expected an array from public.projects.')
  return data
}

export async function getProjects(): Promise<Project[]> {
  const rows = await readProjectRows(supabase, { visibleOnly: true })
  return rows.map(toProject)
}

// Verified administrators read visible and hidden rows using their own session.
export async function getAdminProjects(): Promise<AdminProject[]> {
  const { supabase: adminClient } = await requireAdmin()
  const rows = await readProjectRows(adminClient, { visibleOnly: false })
  return rows.map(toAdminProject)
}
