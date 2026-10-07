import type { AiProjectSuggestions } from '../types/ai-autofill'
import type { ProjectFormDraft } from '../types/project-form'
import { parseGithubRepository } from './github-repository'

export const aiSuggestionLimits = { title: 120, category: 80, short_description: 240, description: 1500, technologies: 15, technology: 50 } as const
const aliases: Record<string, string> = {
  react: 'React', reactjs: 'React', 'react.js': 'React', typescript: 'TypeScript', javascript: 'JavaScript',
  'next.js': 'Next.js', nextjs: 'Next.js', next: 'Next.js', 'node.js': 'Node.js', nodejs: 'Node.js',
  tailwindcss: 'Tailwind CSS', 'tailwind css': 'Tailwind CSS', vite: 'Vite', css: 'CSS', html: 'HTML',
  python: 'Python', vue: 'Vue', 'vue.js': 'Vue', express: 'Express', sqlite: 'SQLite', supabase: 'Supabase',
}

export function normalizeAiTechnology(value: string) { return aliases[value.trim().toLowerCase()] ?? value.trim() }

export function validateAiSuggestions(input: unknown): AiProjectSuggestions | null {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return null
  const value = input as Record<string, unknown>
  const keys = ['title', 'category', 'short_description', 'description', 'technologies']
  if (Object.keys(value).length !== keys.length || keys.some(key => !Object.hasOwn(value, key))) return null
  const strings = { title: '', category: '', short_description: '', description: '' }
  for (const key of ['title', 'category', 'short_description', 'description'] as const) {
    const text = value[key]
    if (typeof text !== 'string' || !text.trim() || text.length > aiSuggestionLimits[key] || /\p{Cc}/u.test(text)) return null
    strings[key] = text.trim()
  }
  if (!Array.isArray(value.technologies) || value.technologies.length > aiSuggestionLimits.technologies) return null
  const technologies: string[] = []
  for (const entry of value.technologies) {
    if (typeof entry !== 'string' || !entry.trim() || entry.length > aiSuggestionLimits.technology || /\p{Cc}/u.test(entry)) return null
    const name = normalizeAiTechnology(entry)
    if (!technologies.some(existing => existing.toLowerCase() === name.toLowerCase())) technologies.push(name)
  }
  return { title: strings.title, category: strings.category, shortDescription: strings.short_description, description: strings.description, technologies }
}

// Explicit field assignments preserve links, provenance and preview mode even
// if a callback is accidentally given an object containing additional fields.
export function mergeAiSuggestions(draft: ProjectFormDraft, suggestions: AiProjectSuggestions, expectedRepository: string): ProjectFormDraft | null {
  if (parseGithubRepository(draft.values.githubUrl)?.repository !== expectedRepository) return null
  return { ...draft, values: { ...draft.values,
    title: suggestions.title, category: suggestions.category, shortDescription: suggestions.shortDescription,
    description: suggestions.description, technologies: [...suggestions.technologies],
  } }
}
