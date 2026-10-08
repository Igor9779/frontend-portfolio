'use client'

import { useLocale } from '../../lib/use-locale'

import { useEffect, useId, useRef, useState } from 'react'
import type { ProjectFormPrefill } from '../../types/project-form'
import type { AiProjectSuggestions } from '../../types/ai-autofill'
import { parseGithubRepository } from '../../lib/github-repository'
import { demoAiSuggestions, demoImportFields, findDemoRepository, museDemoFixture } from '../../lib/cms-demo-fixtures'
import { DemoSimulation, demoDelays, waitForDemo } from '../../lib/cms-demo-simulation'

const buttonClass = 'min-h-10 rounded-md border border-zinc-300 bg-white px-3 py-2.5 text-xs font-medium hover:bg-zinc-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900 disabled:cursor-not-allowed disabled:opacity-50'

export function DemoProjectPrefill({ disabled, repositoryUrl, onApply, onApplySuggestions, onPendingChange }: {
  disabled: boolean
  repositoryUrl: string
  onApply: (fields: ProjectFormPrefill) => void
  onApplySuggestions: (suggestions: AiProjectSuggestions, expectedRepository: string) => boolean
  onPendingChange: (pending: boolean) => void
}) {
  const { t } = useLocale()
  const id = useId()
  const [url, setUrl] = useState('')
  const [pending, setPending] = useState<'import' | 'ai' | null>(null)
  const [importFeedback, setImportFeedback] = useState({ text: '', error: false })
  const [aiFeedback, setAiFeedback] = useState({ text: '', error: false })
  const [operation] = useState(() => new DemoSimulation())
  const current = useRef({ url, repositoryUrl, onApply, onApplySuggestions, onPendingChange, revision: 0 })
  const mounted = useRef(true)
  useEffect(() => {
    const revision = current.current.revision + Number(current.current.url !== url || current.current.repositoryUrl !== repositoryUrl)
    current.current = { url, repositoryUrl, onApply, onApplySuggestions, onPendingChange, revision }
  })
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; operation.cancel() } }, [operation])
  const aiFixture = findDemoRepository(repositoryUrl)

  async function simulate(kind: 'import' | 'ai') {
    if (disabled || (kind === 'ai' && !aiFixture)) return
    const token = operation.begin()
    if (!token) return
    const input = kind === 'import' ? url : repositoryUrl
    const revision = current.current.revision
    setPending(kind); onPendingChange(true)
    const feedback = kind === 'import' ? setImportFeedback : setAiFeedback
    feedback({ text: '', error: false })
    try {
      if (!await waitForDemo(demoDelays[kind], token.signal) || !mounted.current || !operation.current(token)) return
      if (current.current.revision !== revision) {
        feedback({ text: 'The repository changed. Try again with the current URL.', error: true }); return
      }
      const fixture = findDemoRepository(input)
      if (!fixture) {
        feedback({ text: parseGithubRepository(input) ? 'Demo Mode uses sample repository data. Try the MUSE example.' : 'Enter a GitHub repository URL such as https://github.com/owner/repository.', error: true }); return
      }
      if (kind === 'import') {
        current.current.onApply(demoImportFields(fixture))
        feedback({ text: 'Sample repository imported. Review and edit before saving.', error: false })
      } else {
        const applied = current.current.onApplySuggestions(demoAiSuggestions(fixture), fixture.repository)
        feedback({ text: applied ? 'Sample suggestions applied. Review and edit before saving.' : 'The repository changed. Try again with the current URL.', error: !applied })
      }
    } catch {
      feedback({ text: 'Unable to apply the sample. Your form is unchanged.', error: true })
    } finally {
      if (operation.finish(token) && mounted.current) { setPending(null); current.current.onPendingChange(false) }
    }
  }

  return <>
    <section aria-label={t("GitHub import")} aria-busy={pending === 'import'} className="mb-6 rounded-md border border-zinc-200 bg-zinc-50 p-4">
      <p className="mb-3 text-[11px] leading-5 text-zinc-500">{t("GitHub import, previews and AI suggestions are simulated locally.")}</p>
      <label htmlFor={`${id}-repository`} className="mb-2 block text-xs font-medium text-zinc-700">{t("GitHub repository")}</label>
      <div className="flex min-w-0 flex-col gap-2 sm:flex-row">
        <input id={`${id}-repository`} type="url" inputMode="url" autoComplete="off" maxLength={2048} value={url}
          onChange={event => { setUrl(event.target.value); setImportFeedback({ text: '', error: false }) }} disabled={disabled || Boolean(pending)}
          onKeyDown={event => { if (event.key === 'Enter') { event.preventDefault(); void simulate('import') } }}
          aria-invalid={importFeedback.error} aria-describedby={`${id}-import-feedback`} placeholder="https://github.com/owner/repository"
          className="min-w-0 flex-1 rounded-md border border-zinc-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-zinc-600 focus:ring-2 focus:ring-zinc-900/10 aria-invalid:border-red-400 disabled:opacity-60" />
        <button type="button" disabled={disabled || Boolean(pending) || !url.trim()} onClick={() => { void simulate('import') }} className={`${buttonClass} shrink-0`}>{pending === 'import' ? t("Importing…") : t("Import from GitHub")}</button>
      </div>
      <button type="button" disabled={disabled || Boolean(pending)} onClick={() => { setUrl(museDemoFixture.githubUrl); setImportFeedback({ text: 'MUSE example selected. Click Import from GitHub.', error: false }) }} className="mt-3 min-h-9 rounded px-1 text-xs font-medium text-zinc-600 underline underline-offset-4 hover:text-zinc-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900 disabled:opacity-50">{t("Use MUSE example")}</button>
      <p id={`${id}-import-feedback`} role={importFeedback.error ? 'alert' : 'status'} className={`mt-2 text-xs leading-5 ${importFeedback.error ? 'text-red-700' : 'text-zinc-500'}`}>{pending === 'import' ? t("Loading sample repository…") : t(importFeedback.text)}</p>
    </section>
    <section aria-label={t("Demo AI Auto-fill")} aria-busy={pending === 'ai'} className="mb-6 rounded-md border border-zinc-200 p-4">
      <div className="flex min-w-0 flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0"><p className="text-xs leading-5 text-zinc-600">{t("AI Auto-fill replaces title, category, descriptions and technologies.")}</p><p className="mt-1 text-[11px] leading-5 text-zinc-500">{t("Demo AI — simulated locally.")}</p></div>
        <button type="button" disabled={disabled || Boolean(pending) || !aiFixture} onClick={() => { void simulate('ai') }} aria-describedby={`${id}-ai-feedback`} className={`${buttonClass} shrink-0`}>{pending === 'ai' ? t("Generating…") : t("Demo AI Auto-fill")}</button>
      </div>
      <p id={`${id}-ai-feedback`} role={aiFeedback.error ? 'alert' : 'status'} className={`mt-2 text-xs leading-5 ${aiFeedback.error ? 'text-red-700' : 'text-zinc-500'}`}>{pending === 'ai' ? t("Preparing sample suggestions…") : (aiFeedback.text ? t(aiFeedback.text) : '') || (aiFixture ? t("Optional sample suggestions. Nothing is saved until Save project.") : t("Import the MUSE example to try sample suggestions."))}</p>
    </section>
  </>
}
