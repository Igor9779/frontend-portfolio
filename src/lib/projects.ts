import 'server-only'

import type { DatabaseProject } from '../types/database'
import type { AdminProject } from '../types/admin-project'
import type { Project, ProjectLink } from '../types/project'
import { supabase } from './supabase/server'

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

function toProject(row: ProjectRow): Project {
  const links: ProjectLink[] = []

  // Preserve the portfolio's existing button labels and order.
  if (row.production_url) links.push({ label: 'View project →', href: row.production_url })
  if (row.github_url) links.push({ label: 'GitHub →', href: row.github_url })
  if (row.telegram_url) links.push({ label: 'Telegram →', href: row.telegram_url })

  return {
    title: row.title,
    type: row.category,
    description: row.description,
    image: row.preview_url ?? '',
    imageAlt: `${row.title} project preview`,
    tags: row.technologies,
    links,
  }
}

async function readProjectRows({ visibleOnly }: { visibleOnly: boolean }): Promise<ProjectRow[]> {
  const query = supabase
    .from('projects')
    .select('id, title, category, short_description, description, preview_url, github_url, production_url, telegram_url, technologies, position, visible')
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
  const rows = await readProjectRows({ visibleOnly: true })
  return rows.map(toProject)
}

// Read every row available to the current client. Anonymous RLS still excludes
// hidden rows; authenticated all-project access is a later, separate stage.
export async function getAdminProjects(): Promise<AdminProject[]> {
  const rows = await readProjectRows({ visibleOnly: false })
  return rows.map((row) => ({
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
  }))
}
