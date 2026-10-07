import 'server-only'

import { parseGithubRepository } from './github-repository'
import { projectLimits, validateProject } from './project-validation'
import type { GithubImportResult } from '../types/github-import'
import { githubMessages, requestGithub } from './github-api'

const unavailable = githubMessages.unavailable

function record(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value))
}

function text(value: unknown, max: number) {
  return typeof value === 'string' ? value.replace(/\p{Cc}/gu, ' ').trim().slice(0, max) : ''
}

export function normalizeGithubLanguages(value: unknown): string[] {
  if (!record(value)) throw new Error('Invalid languages')
  const seen = new Set<string>()
  return Object.entries(value)
    .filter(([name, bytes]) => name.trim() && name.length <= projectLimits.technology && !/\p{Cc}/u.test(name) && typeof bytes === 'number' && Number.isFinite(bytes) && bytes > 0)
    .map(([name, bytes]) => [name.trim(), Number(bytes)] as const)
    .sort(([a, aBytes], [b, bBytes]) => Number(bBytes) - Number(aBytes) || a.localeCompare(b, 'en'))
    .map(([name]) => name)
    .filter(name => { const key = name.toLowerCase(); if (seen.has(key)) return false; seen.add(key); return true })
    .slice(0, projectLimits.technologies)
}

export async function fetchGithubProject(input: unknown): Promise<GithubImportResult> {
  const parsed = parseGithubRepository(input)
  if (!parsed) return { success: false, message: 'Enter a GitHub repository URL such as https://github.com/owner/repository.' }
  try {
    const metadata = await requestGithub(parsed.repository)
    if (!metadata.success) return metadata
    if (!record(metadata.data) || metadata.data.private !== false) return { success: false, message: 'Repository not found or unavailable. Use a public GitHub repository.' }
    const repo = metadata.data
    const canonical = parseGithubRepository(repo.html_url)
    if (!canonical || typeof repo.full_name !== 'string' || repo.full_name.toLowerCase() !== canonical.repository || typeof repo.name !== 'string' || !repo.name.trim()) throw new Error('Invalid repository')
    const languages = await requestGithub(canonical.repository, '/languages')
    if (!languages.success) return languages
    const description = text(repo.description, projectLimits.description)
    const homepage = typeof repo.homepage === 'string' ? repo.homepage.trim() : ''
    // Reuse the existing URL rules. Invalid homepages are omitted, never fetched.
    const homepageValid = homepage && validateProject({ title: 'Repository', category: 'Repository', description: 'Repository', productionUrl: homepage, technologies: [], visible: false }).success && /^https?:\/\//i.test(homepage)
    return {
      success: true,
      fields: {
        title: text(repo.name, projectLimits.title),
        shortDescription: description.slice(0, projectLimits.shortDescription),
        description,
        githubUrl: canonical.url,
        githubRepository: canonical.repository,
        productionUrl: homepageValid ? homepage : '',
        technologies: normalizeGithubLanguages(languages.data),
      },
      ...(repo.archived === true ? { warning: 'This repository is archived. Review it before saving.' } : {}),
    }
  } catch {
    return { success: false, message: unavailable }
  }
}
