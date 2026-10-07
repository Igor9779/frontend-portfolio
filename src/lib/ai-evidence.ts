import 'server-only'

import type { GithubContext } from './github-context'
import type { AiProjectSuggestions } from '../types/ai-autofill'
import { normalizeAiTechnology } from './ai-suggestions'

// This conservative check catches explicit contradictions, not every possible
// hallucination. Administrator review remains necessary for semantic accuracy.
export function suggestionsMatchEvidence(context: GithubContext, suggestions: AiProjectSuggestions): boolean {
  const evidence = [context.metadata.description, context.readme, context.package?.description].filter(Boolean).join('\n')
  const output = [suggestions.title, suggestions.category, suggestions.shortDescription, suggestions.description, ...suggestions.technologies].join('. ')
  const rules = [
    { absent: /\b(?:no|without)\s+(?:a\s+)?back[ -]?end\b/i, claim: /\b(?:back[ -]?end|full[ -]stack|server-side service)\b/gi },
    { absent: /\b(?:no|without)\s+(?:a\s+)?database\b/i, claim: /\b(?:database(?:-backed)?|postgres(?:ql)?|sqlite|mongodb)\b/gi },
    { absent: /\b(?:no|without)\s+(?:user\s+)?authentication\b/i, claim: /\b(?:authentication|user accounts|sign-in system)\b/gi },
    { absent: /\b(?:no|without)\s+payments?\b/i, claim: /\b(?:payments?|checkout system)\b/gi },
    { absent: /\b(?:no|without)\s+(?:a\s+)?(?:live|real)\s+AI\s+(?:API|integration)\b/i,
      claim: /\b(?:(?:live|real)\s+AI(?:[- ]powered)?|AI[- ]powered\s+chat|OpenAI\s+(?:API|integration))\b/gi },
  ]
  for (const rule of rules) {
    if (!rule.absent.test(evidence)) continue
    for (const match of output.matchAll(rule.claim)) {
      const preceding = output.slice(Math.max(0, match.index - 60), match.index)
      // Permit direct statements of absence/mock status, rather than treating
      // "no backend" or "rather than a live AI API" as positive claims.
      if (!/\b(?:no|without|not|rather than|instead of|mock|scripted|simulated)\s+(?:(?:a|an|any|live|real|backend|database|authentication|payments?|or|and|AI|API)[,\s-]*){0,8}$/i.test(preceding)) return false
    }
  }
  if (/\b(?:mock|scripted|simulated)[^\n.]{0,40}\b(?:AI\s+)?chat\b|\bchat[^\n.]{0,40}\b(?:mock|scripted|simulated)\b/i.test(evidence)
    && /\bchat\b/i.test(output) && !/\b(?:mock|scripted|simulated)\b/i.test(output)) return false

  const dependencyAliases: Record<string, string> = { next: 'Next.js', tailwindcss: 'Tailwind CSS', '@tailwindcss/vite': 'Tailwind CSS', '@tailwindcss/postcss': 'Tailwind CSS' }
  const dependencyNames = [...(context.package?.dependencies ?? []), ...(context.package?.devDependencies ?? [])]
  const supported = [...context.metadata.languages, ...dependencyNames.map(name => dependencyAliases[name] ?? normalizeAiTechnology(name))]
  const compact = (text: string) => text.toLowerCase().replace(/[^a-z0-9+#]/g, '')
  return suggestions.technologies.every(technology => supported.some(name => compact(name) === compact(technology))
    || evidence.toLowerCase().includes(technology.toLowerCase()))
}
