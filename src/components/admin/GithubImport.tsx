'use client'

import { useEffect, useId, useRef, useState, useTransition } from 'react'
import { unstable_rethrow } from 'next/navigation'
import { importGithubRepository } from '../../app/admin/github-actions'
import type { ProjectFormPrefill } from '../../types/project-form'
import type { GithubImportResult } from '../../types/github-import'

// Real CMS only. The shared project form and public demo never import this.
export function GithubImport({ disabled, onStart, onApply, onPendingChange }: {
  disabled: boolean
  onStart: () => boolean
  onApply: (fields: ProjectFormPrefill) => void
  onPendingChange: (pending: boolean) => void
}) {
  const id = useId()
  const submitting = useRef(false)
  const mounted = useRef(true)
  useEffect(() => { mounted.current = true; return () => { mounted.current = false } }, [])
  const [url, setUrl] = useState('')
  const [result, setResult] = useState<GithubImportResult | null>(null)
  const [pending, startTransition] = useTransition()

  function importRepository() {
    if (submitting.current || disabled || !onStart()) return
    submitting.current = true
    onPendingChange(true)
    setResult(null)
    startTransition(async () => {
      try {
        const response = await importGithubRepository(url)
        if (!mounted.current) return
        if (response.success) onApply(response.fields)
        setResult(response)
      } catch (error) {
        unstable_rethrow(error)
        if (mounted.current) setResult({ success: false, message: 'Unable to import from GitHub. Please try again.' })
      } finally {
        submitting.current = false
        if (mounted.current) onPendingChange(false)
      }
    })
  }

  return (
    <section aria-label="GitHub import" aria-busy={pending} className="mb-6 rounded-md border border-zinc-200 bg-zinc-50 p-4">
      <label htmlFor={`${id}-repository`} className="mb-2 block text-xs font-medium text-zinc-700">GitHub repository</label>
      <div className="flex min-w-0 flex-col gap-2 sm:flex-row">
        <input id={`${id}-repository`} type="url" inputMode="url" autoComplete="off" maxLength={2048} value={url}
          onChange={(event) => { setUrl(event.target.value); setResult(null) }} disabled={disabled || pending}
          onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); importRepository() } }}
          aria-invalid={result?.success === false} aria-describedby={`${id}-feedback`}
          placeholder="https://github.com/owner/repository"
          className="min-w-0 flex-1 rounded-md border border-zinc-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-zinc-600 focus:ring-2 focus:ring-zinc-900/10 aria-invalid:border-red-400 disabled:opacity-60" />
        <button type="button" onClick={importRepository} disabled={disabled || pending || !url.trim()}
          className="shrink-0 rounded-md border border-zinc-300 bg-white px-3 py-2.5 text-xs font-medium hover:bg-zinc-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900 disabled:cursor-not-allowed disabled:opacity-50">
          {pending ? 'Importing…' : 'Import from GitHub'}
        </button>
      </div>
      <div id={`${id}-feedback`} className="mt-2 text-xs leading-5">
        {result?.success === false ? <p role="alert" className="text-red-700">{result.message}</p>
          : <p role="status" className="text-zinc-500">{pending ? 'Fetching repository details…' : result?.success ? 'Imported. Review the fields and choose a category before saving.' : 'Fill the form from a public repository. Nothing is saved until you save the project.'}</p>}
        {result?.success && result.warning && <p className="mt-1 text-zinc-700">{result.warning}</p>}
      </div>
    </section>
  )
}
