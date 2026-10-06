import 'server-only'

import type { DatabaseProject } from '../types/database'
import type { Project, ProjectLink } from '../types/project'
import { supabase } from './supabase/server'

type PortfolioRow = Pick<
  DatabaseProject,
  | 'title'
  | 'category'
  | 'description'
  | 'preview_url'
  | 'github_url'
  | 'production_url'
  | 'telegram_url'
  | 'technologies'
>

function toProject(row: PortfolioRow): Project {
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

export async function getProjects(): Promise<Project[]> {
  const { data, error } = await supabase
    .from('projects')
    .select('title, category, description, preview_url, github_url, production_url, telegram_url, technologies')
    .eq('visible', true)
    .order('position', { ascending: true })
    .order('id', { ascending: true })
    .abortSignal(AbortSignal.timeout(10_000))

  if (error) {
    // Do not include raw SDK errors, URLs, headers or credentials in logs/UI.
    const code = /^[A-Z0-9]{5}$/.test(error.code) ? ` (${error.code})` : ''
    throw new Error(
      `Unable to load portfolio projects from Supabase${code}. Check connectivity, the public.projects table, SELECT grants and its RLS policy.`,
    )
  }

  if (!data) throw new Error('Supabase returned no project data. Expected an array from public.projects.')
  return data.map(toProject)
}
