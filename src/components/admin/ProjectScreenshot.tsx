'use client'

import { useLocale } from '../../lib/use-locale'

import { useEffect, useRef, useState } from 'react'
import type { ProjectPreviewToolsProps } from '../../types/project-form'
import { validatePreviewFile } from '../../lib/preview-file'
import { requestScreenshot, screenshotEligibility } from './screenshot-client'

export function ProjectScreenshot({ disabled, productionUrl, autoCapture, previewRevision, onAccept, onPendingChange }: ProjectPreviewToolsProps) {
  const { t } = useLocale()
  const [pending, setPending] = useState(false)
  const [feedback, setFeedback] = useState('')
  const mounted = useRef(true)
  const active = useRef<AbortController | null>(null)
  const generation = useRef(0)
  const handled = useRef(0)
  const provenance = useRef(0)
  const current = useRef({ productionUrl, previewRevision, onAccept, onPendingChange, importSequence: autoCapture?.sequence ?? 0 })
  // Updating the live callback lets an async response observe the current
  // form provenance and preview revision, rather than a stale render closure.
  useEffect(() => {
    if (current.current.productionUrl !== productionUrl || current.current.previewRevision !== previewRevision) provenance.current++
    current.current = { productionUrl, previewRevision, onAccept, onPendingChange, importSequence: autoCapture?.sequence ?? 0 }
  })
  useEffect(() => { mounted.current = true; return () => {
    mounted.current = false; active.current?.abort()
  } }, [])

  async function capture(url: string) {
    if (active.current || disabled) return
    const unavailable = screenshotEligibility(url)
    if (unavailable) { setFeedback(unavailable); current.current.onPendingChange(false); return }
    const request = ++generation.current
    const revision = current.current.previewRevision
    const expectedProvenance = provenance.current
    const expectedImport = autoCapture?.sequence ?? 0
    const controller = new AbortController()
    active.current = controller
    setPending(true); setFeedback('Capturing the first screen…')
    current.current.onPendingChange(true)
    const timeout = setTimeout(() => controller.abort(), 55_000)
    try {
      const file = await requestScreenshot(url, controller.signal)
      const validated = await validatePreviewFile(file)
      if (!mounted.current || request !== generation.current || controller.signal.aborted) return
      if (!validated.success) throw new Error('Unable to read the screenshot. The current preview is unchanged.')
      if (current.current.productionUrl !== url || current.current.previewRevision !== revision
        || provenance.current !== expectedProvenance || current.current.importSequence !== expectedImport
        || !current.current.onAccept(file, url, revision)) {
        setFeedback('The URL or preview changed. Retake to capture the current site.')
        return
      }
      setFeedback('Screenshot selected. Review the preview before saving.')
    } catch (error) {
      if (mounted.current && request === generation.current) setFeedback(controller.signal.aborted
        ? 'Screenshot capture timed out. The current preview is unchanged.'
        : error instanceof Error ? error.message : 'Unable to capture this site. The current preview is unchanged.')
    } finally {
      clearTimeout(timeout)
      if (mounted.current && request === generation.current) {
        active.current = null; setPending(false); current.current.onPendingChange(false)
      }
    }
  }

  useEffect(() => {
    if (!autoCapture || autoCapture.sequence === handled.current || disabled || active.current) return
    let cancelled = false
    // Start after the imported fields and callbacks have committed. Import
    // feedback stays independent of this bounded, abortable request.
    void Promise.resolve().then(() => {
      if (cancelled || !mounted.current || autoCapture.sequence === handled.current) return
      handled.current = autoCapture.sequence
      void capture(autoCapture.url)
    })
    return () => { cancelled = true }
  })

  return <div className="mt-4 border-t border-zinc-100 pt-3">
    <button type="button" disabled={disabled || pending || !productionUrl.trim()} onClick={() => { void capture(productionUrl) }}
      className="min-h-9 rounded-md border border-zinc-300 bg-white px-3 py-2 text-xs font-medium hover:bg-zinc-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900 disabled:cursor-not-allowed disabled:opacity-50">
      {pending ? t("Capturing…") : t("Retake Screenshot")}
    </button>
    <p className="mt-2 text-[11px] leading-5 text-zinc-500">{t("Uses the current Production URL. Supported HTTPS hosting only; nothing uploads until Save.")}</p>
    <p role="status" aria-live="polite" className={feedback ? 'mt-2 text-xs leading-5 text-zinc-600' : 'sr-only'}>{t(feedback)}</p>
  </div>
}
