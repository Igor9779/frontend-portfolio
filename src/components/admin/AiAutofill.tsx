'use client'

import { useEffect, useId, useRef, useState, useTransition } from 'react'
import { unstable_rethrow } from 'next/navigation'
import { autofillProject } from '../../app/admin/ai-actions'
import { parseGithubRepository } from '../../lib/github-repository'
import type { AiAutofillResult, AiProjectSuggestions } from '../../types/ai-autofill'

// Imported only by the real Add adapter, never by shared demo presentation.
export function AiAutofill({ repositoryUrl, disabled, onStart, onPendingChange, onApply }: {
  repositoryUrl: string
  disabled: boolean
  onStart: () => boolean
  onPendingChange: (pending: boolean) => void
  onApply: (suggestions: AiProjectSuggestions, expectedRepository: string) => boolean
}) {
  const id = useId()
  const active = useRef(false)
  const mounted = useRef(true)
  useEffect(() => { mounted.current = true; return () => { mounted.current = false } }, [])
  const [result, setResult] = useState<AiAutofillResult | null>(null)
  const [pending, startTransition] = useTransition()
  const parsed = parseGithubRepository(repositoryUrl)

  function autofill() {
    if (active.current || disabled || !parsed || !onStart()) return
    active.current = true
    onPendingChange(true)
    setResult(null)
    startTransition(async () => {
      try {
        // Only a URL is submitted. Neither the draft nor its file leaves the
        // browser through this action, and stale results cannot change a draft.
        const response = await autofillProject(parsed.url)
        if (!mounted.current) return
        if (response.success && !onApply(response.suggestions, parsed.repository)) {
          setResult({ success: false, message: 'The repository changed. Run AI Auto-fill again.' })
        } else setResult(response)
      } catch (error) {
        unstable_rethrow(error)
        if (mounted.current) setResult({ success: false, message: 'Unable to generate suggestions. Please try again.' })
      } finally {
        active.current = false
        if (mounted.current) onPendingChange(false)
      }
    })
  }

  return <section aria-label="AI Auto-fill" aria-busy={pending} className="mb-6 rounded-md border border-zinc-200 p-4">
    <div className="flex min-w-0 flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
      <p id={`${id}-explanation`} className="min-w-0 text-xs leading-5 text-zinc-600">AI Auto-fill replaces title, category, descriptions and technologies.</p>
      <button type="button" onClick={autofill} disabled={disabled || pending || !parsed}
        aria-describedby={`${id}-explanation ${id}-feedback`}
        className="min-h-10 shrink-0 rounded-md border border-zinc-300 bg-white px-3 py-2.5 text-xs font-medium hover:bg-zinc-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900 disabled:cursor-not-allowed disabled:opacity-50">
        {pending ? 'Generating…' : 'AI Auto-fill'}
      </button>
    </div>
    <div id={`${id}-feedback`} className="mt-2 text-xs leading-5">
      {result?.success === false ? <p role="alert" className="text-red-700">{result.message}</p>
        : <p role="status" className="text-zinc-500">{pending ? 'Analyzing repository evidence…' : result?.success ? 'Suggestions applied. Review and edit before saving.' : parsed ? 'Optional suggestions. Nothing is saved until you save the project.' : 'Import a repository or enter a valid GitHub URL in the form first.'}</p>}
      {result?.success && result.warnings.map(warning => <p key={warning} className="mt-1 text-zinc-600">{warning}</p>)}
    </div>
  </section>
}
