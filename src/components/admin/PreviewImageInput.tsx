'use client'

import { useEffect, useId, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import type { PendingPreview } from '../../lib/pending-preview'
import { previewMimeTypes, validatePreviewFile } from '../../lib/preview-file'
import { projectLimits } from '../../lib/project-validation'

export function PreviewImageInput({ currentPreview, selection, onFileChange, sourceUrl, onSourceChange, onValidityChange, fileError, urlError, children, localOnly = false }: {
  selection: PendingPreview | null
  onFileChange: (file: File | null) => void
  children?: ReactNode
  localOnly?: boolean
  currentPreview: string | null
  sourceUrl: string
  onSourceChange: (value: string) => void
  onValidityChange: (valid: boolean) => void
  fileError?: string
  urlError?: string
}) {
  const id = useId()
  const input = useRef<HTMLInputElement>(null)
  const generation = useRef(0)
  const [clientError, setClientError] = useState<{ message: string; selection: PendingPreview | null } | null>(null)
  const [checking, setChecking] = useState(false)

  useEffect(() => () => {
    generation.current++
  }, [])

  function clearSelection() {
    generation.current++
    if (input.current) input.current.value = ''
    onFileChange(null)
    setClientError(null)
    setChecking(false)
    onValidityChange(true)
  }

  async function selectFile() {
    const file = input.current?.files?.[0]
    // Native picker Cancel means no new file, not clear the active preview.
    if (!file) return
    const version = ++generation.current
    setChecking(true)
    setClientError(null)
    onValidityChange(false)
    const validated = await validatePreviewFile(file)
    if (version !== generation.current) return
    setChecking(false)
    if (!validated.success) {
      if (input.current) input.current.value = ''
      setClientError({ message: validated.message, selection })
      return
    }
    onFileChange(file)
    // File state, not the native FileList, is the Save source of truth.
    if (input.current) input.current.value = ''
    onValidityChange(true)
  }

  const feedback = (clientError?.selection === selection ? clientError?.message : '') || fileError
  const preview = selection?.src ?? currentPreview
  return (
    <fieldset className="min-w-0 rounded-lg border border-zinc-200 p-4">
      <legend className="px-1 text-xs font-medium text-zinc-700">Preview image <span className="font-normal text-zinc-500">optional</span></legend>
      {preview && (
        <div className="mb-4">
          <div className="aspect-video overflow-hidden rounded-md border border-zinc-200 bg-zinc-50">
            <img src={preview} alt={selection ? 'Selected preview image' : 'Current project preview'} className="h-full w-full object-contain" />
          </div>
          <p className="mt-2 text-[11px] text-zinc-500">{selection ? (localOnly ? 'Selected image · Stays in this demo' : 'Selected image · Uploads when you save') : 'Current preview · Kept unless replaced'}</p>
        </div>
      )}
      <label htmlFor={`${id}-file`} className="mb-2 block text-xs font-medium text-zinc-700">{currentPreview ? 'Replace preview' : 'Choose preview image'}</label>
      <input ref={input} id={`${id}-file`} name="previewFile" type="file" accept={previewMimeTypes.join(',')} onChange={selectFile} aria-invalid={Boolean(feedback)} aria-describedby={`${id}-hint${feedback ? ` ${id}-error` : ''}`} className="block w-full min-w-0 rounded-md border border-zinc-300 bg-white p-2 text-xs text-zinc-600 file:mr-3 file:rounded file:border-0 file:bg-zinc-100 file:px-3 file:py-2 file:text-xs file:font-medium file:text-zinc-800 hover:file:bg-zinc-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900" />
      <p id={`${id}-hint`} className="mt-2 text-[11px] leading-5 text-zinc-500">JPEG, PNG or WebP · Maximum 5 MB. {localOnly ? 'Files stay on your device; they are never uploaded.' : 'Selecting a file does not upload it.'}</p>
      <p role="status" className={checking || selection ? 'mt-2 text-xs break-all text-zinc-600' : 'sr-only'}>{checking ? 'Checking image…' : selection?.file.name ?? 'No replacement selected.'}</p>
      {feedback && <p id={`${id}-error`} role="alert" className="mt-2 text-xs text-red-700">{feedback}</p>}
      {(selection || clientError) && <button type="button" onClick={clearSelection} className="mt-3 min-h-8 rounded border border-zinc-200 px-2.5 text-xs font-medium text-zinc-600 hover:bg-zinc-50 focus-visible:outline-2 focus-visible:outline-zinc-900">Clear selection</button>}
      {children}
      <details open={urlError ? true : undefined} className="mt-4 border-t border-zinc-100 pt-3">
        <summary className="cursor-pointer rounded py-1 text-xs text-zinc-500 focus-visible:outline-2 focus-visible:outline-zinc-900">Use an existing URL or local asset</summary>
        <label htmlFor={`${id}-url`} className="mt-3 mb-2 block text-xs font-medium text-zinc-700">Preview URL</label>
        <input id={`${id}-url`} name="previewUrl" type="text" inputMode="url" maxLength={projectLimits.url} value={sourceUrl} onChange={(event) => onSourceChange(event.target.value)} disabled={Boolean(selection) || checking} aria-invalid={Boolean(urlError)} aria-describedby={urlError ? `${id}-url-error` : undefined} placeholder="https:// or /assets/…" className="w-full min-w-0 rounded-md border border-zinc-300 px-3 py-2.5 text-sm outline-none focus:border-zinc-600 focus:ring-2 focus:ring-zinc-900/10 disabled:bg-zinc-50 disabled:text-zinc-400" />
        {urlError && <p id={`${id}-url-error`} role="alert" className="mt-2 text-xs text-red-700">{urlError}</p>}
        <p className="mt-2 text-[11px] leading-5 text-zinc-500">Existing local images remain supported. A selected file replaces this source when saved.</p>
      </details>
    </fieldset>
  )
}
