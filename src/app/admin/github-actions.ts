'use server'

import { unstable_rethrow } from 'next/navigation'
import { requireAdmin } from '../../lib/auth'
import { parseGithubRepository } from '../../lib/github-repository'
import { fetchGithubProject } from '../../lib/github-import'
import { findGithubProject } from '../../lib/github-projects'
import type { GithubImportResult } from '../../types/github-import'

export async function importGithubRepository(input: unknown): Promise<GithubImportResult> {
  const { supabase } = await requireAdmin()
  const parsed = parseGithubRepository(input)
  if (!parsed) return { success: false, message: 'Enter a GitHub repository URL such as https://github.com/owner/repository.' }
  try {
    const existing = await findGithubProject(supabase, parsed.repository)
    if (existing.error) return { success: false, message: 'Unable to check this repository. Please try again.' }
    if (existing.exists) return { success: false, message: 'This GitHub repository has already been added.' }
    const result = await fetchGithubProject(parsed.url)
    if (!result.success) return result
    // GitHub can return a canonical identity different from the submitted one.
    if (result.fields.githubRepository !== parsed.repository) {
      const canonical = await findGithubProject(supabase, result.fields.githubRepository)
      if (canonical.error) return { success: false, message: 'Unable to check this repository. Please try again.' }
      if (canonical.exists) return { success: false, message: 'This GitHub repository has already been added.' }
    }
    return result
  } catch (error) {
    unstable_rethrow(error)
    return { success: false, message: 'Unable to import from GitHub. Please try again.' }
  }
}
