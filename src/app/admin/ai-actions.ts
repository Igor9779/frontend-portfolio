'use server'

import { unstable_rethrow } from 'next/navigation'
import { requireAdmin } from '../../lib/auth'
import { parseGithubRepository } from '../../lib/github-repository'
import { fetchGithubContext } from '../../lib/github-context'
import { generateAiSuggestions, isAiAutofillConfigured } from '../../lib/ai-autofill'
import type { AiAutofillResult } from '../../types/ai-autofill'

export async function autofillProject(input: unknown): Promise<AiAutofillResult> {
  // This boundary must run before configuration, external reads or paid calls.
  // requireAdmin's navigation exceptions intentionally propagate to Next.js.
  await requireAdmin()
  const parsed = parseGithubRepository(input)
  if (!parsed) return { success: false, message: 'Enter a valid public GitHub repository URL.' }
  if (!isAiAutofillConfigured()) return { success: false, message: 'AI Auto-fill is not configured. Complete the fields manually.' }
  try {
    const signal = AbortSignal.timeout(45_000)
    const context = await fetchGithubContext(parsed.url, signal)
    if (!context.success) return context
    const result = await generateAiSuggestions(context.context, signal)
    return result.success ? { ...result, warnings: context.warnings } : result
  } catch (error) {
    unstable_rethrow(error)
    return { success: false, message: 'Unable to generate suggestions. Please try again.' }
  }
}
