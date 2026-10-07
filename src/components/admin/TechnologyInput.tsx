'use client'

import { useId, useRef, useState } from 'react'
import { Icon } from './Icon'

export function TechnologyInput({ values, onChange, error }: {
  values: string[]
  onChange: (values: string[]) => void
  error?: string
}) {
  const id = useId()
  const inputRef = useRef<HTMLInputElement>(null)
  const [draft, setDraft] = useState('')

  function addTechnology() {
    const existing = new Set(values.map((value) => value.toLowerCase()))
    const additions = draft.split(',').map((value) => value.trim()).filter((value) => {
      if (!value || existing.has(value.toLowerCase())) return false
      existing.add(value.toLowerCase())
      return true
    })
    onChange([...values, ...additions])
    setDraft('')
    inputRef.current?.focus()
  }

  return (
    <fieldset className="min-w-0">
      <legend className="mb-2 text-xs font-medium text-zinc-700">Technologies</legend>
      {values.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-2">
          {values.map((value) => (
            <span key={value} className="inline-flex max-w-full items-center gap-1 rounded-md border border-zinc-200 bg-zinc-50 py-1 pl-2.5 text-xs text-zinc-700">
              <span className="min-w-0 break-words">{value}</span>
              <button type="button" aria-label={`Remove ${value}`} onClick={() => { onChange(values.filter((item) => item !== value)); inputRef.current?.focus() }} className="flex h-7 w-7 shrink-0 items-center justify-center rounded text-zinc-400 hover:bg-zinc-200 hover:text-zinc-800 focus-visible:outline-2 focus-visible:outline-zinc-900">
                <Icon name="close" className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}
      <label htmlFor={id} className="sr-only">Add technology</label>
      <div className="flex gap-2">
        <input ref={inputRef} id={id} value={draft} onChange={(event) => setDraft(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ',') { event.preventDefault(); addTechnology() } }} placeholder="Add technology…" aria-invalid={Boolean(error)} aria-describedby={error ? `${id}-hint ${id}-error` : `${id}-hint`} className="min-w-0 flex-1 rounded-md border border-zinc-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-zinc-600 focus:ring-2 focus:ring-zinc-900/10" />
        <button type="button" onClick={addTechnology} disabled={!draft.trim()} className="rounded-md border border-zinc-300 px-3 text-xs font-medium hover:bg-zinc-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900 disabled:cursor-not-allowed disabled:opacity-40">Add</button>
      </div>
      <p id={`${id}-hint`} className="mt-2 text-[11px] text-zinc-500">Press Enter or Add. You can separate names with commas.</p>
      {error && <p id={`${id}-error`} className="mt-2 text-xs text-red-700">{error}</p>}
    </fieldset>
  )
}
