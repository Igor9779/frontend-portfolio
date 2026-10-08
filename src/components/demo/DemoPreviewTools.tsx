'use client'

import { useEffect, useRef, useState } from 'react'
import type { ProjectPreviewToolsProps } from '../../types/project-form'
import { findDemoPreview } from '../../lib/cms-demo-fixtures'
import { createDemoPreview } from '../../lib/cms-demo-preview'
import { DemoSimulation, demoDelays, waitForDemo } from '../../lib/cms-demo-simulation'

export function DemoPreviewTools({ disabled, productionUrl, autoCapture, previewRevision, onAccept, onPendingChange }: ProjectPreviewToolsProps) {
  const [operation] = useState(() => new DemoSimulation())
  const [pending, setPending] = useState(false)
  const [feedback, setFeedback] = useState('')
  const handled = useRef(0)
  const mounted = useRef(true)
  const current = useRef({ productionUrl, previewRevision, onAccept, onPendingChange, revision: 0, sequence: autoCapture?.sequence ?? 0 })
  useEffect(() => {
    const revision = current.current.revision + Number(current.current.productionUrl !== productionUrl || current.current.previewRevision !== previewRevision)
    current.current = { productionUrl, previewRevision, onAccept, onPendingChange, revision, sequence: autoCapture?.sequence ?? 0 }
  })
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; operation.cancel() } }, [operation])

  async function simulate(url: string) {
    if (disabled) return
    if (!findDemoPreview(url)) {
      setFeedback(url ? 'Sample previews are available for the MUSE example. Choose a file for other projects.' : 'No Production URL. Choose a file or import the MUSE example.')
      onPendingChange(false); return
    }
    const token = operation.begin()
    if (!token) return
    const expected = { ...current.current }
    setPending(true); setFeedback('Preparing sample preview…'); onPendingChange(true)
    try {
      if (!await waitForDemo(demoDelays.preview, token.signal)) return
      const file = await createDemoPreview()
      if (!mounted.current || !operation.current(token)) return
      if (current.current.revision !== expected.revision || current.current.sequence !== expected.sequence
        || !current.current.onAccept(file, url, expected.previewRevision)) {
        setFeedback('The URL or preview changed. Retake to select the sample.'); return
      }
      setFeedback('Sample preview selected. This is a local demo image, not a website capture.')
    } catch {
      if (mounted.current && operation.current(token)) setFeedback('Sample preview unavailable. Choose a file; the current preview is unchanged.')
    } finally {
      if (operation.finish(token) && mounted.current) { setPending(false); current.current.onPendingChange(false) }
    }
  }

  useEffect(() => {
    if (!autoCapture || handled.current === autoCapture.sequence || disabled || operation.pending) return
    let cancelled = false
    void Promise.resolve().then(() => {
      if (cancelled || !mounted.current || handled.current === autoCapture.sequence) return
      handled.current = autoCapture.sequence
      void simulate(autoCapture.url)
    })
    return () => { cancelled = true }
  })

  return <div className="mt-4 border-t border-zinc-100 pt-3">
    <button type="button" disabled={disabled || pending || !findDemoPreview(productionUrl)} onClick={() => { void simulate(productionUrl) }} className="min-h-9 rounded-md border border-zinc-300 bg-white px-3 py-2 text-xs font-medium hover:bg-zinc-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900 disabled:cursor-not-allowed disabled:opacity-50">{pending ? 'Preparing…' : 'Retake sample preview'}</button>
    <p className="mt-2 text-[11px] leading-5 text-zinc-500">Uses the bundled MUSE sample. Your files stay on this device.</p>
    <p role="status" aria-live="polite" className={feedback ? 'mt-2 text-xs leading-5 text-zinc-600' : 'sr-only'}>{feedback}</p>
  </div>
}
