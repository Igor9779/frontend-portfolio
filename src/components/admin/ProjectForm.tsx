'use client'

import { useId, useState } from 'react'
import type { AdminProject } from '../../types/admin-project'
import { Dialog } from './Dialog'
import { Icon } from './Icon'
import { TechnologyInput } from './TechnologyInput'

const inputClass = 'w-full min-w-0 rounded-md border border-zinc-300 bg-white px-3 py-2.5 text-sm text-zinc-900 outline-none placeholder:text-zinc-400 focus:border-zinc-600 focus:ring-2 focus:ring-zinc-900/10'

export function ProjectForm({ mode, initialProject, onClose }: {
  mode: 'add' | 'edit'
  initialProject?: AdminProject
  onClose: () => void
}) {
  const id = useId()
  const [technologies, setTechnologies] = useState(initialProject?.technologies ?? [])
  const [visible, setVisible] = useState(initialProject?.visible ?? true)
  const links = [
    { name: 'previewUrl', label: 'Preview URL', value: initialProject?.previewUrl, type: 'text', placeholder: '/assets/project-preview.png' },
    { name: 'productionUrl', label: 'Production URL', value: initialProject?.productionUrl, type: 'text', placeholder: 'https:// or /projects/…' },
    { name: 'githubUrl', label: 'GitHub URL', value: initialProject?.githubUrl, type: 'url', placeholder: 'https://github.com/owner/repository' },
    { name: 'telegramUrl', label: 'Telegram URL', value: initialProject?.telegramUrl, type: 'url', placeholder: 'https://t.me/…' },
  ]

  return (
    <Dialog onClose={onClose} titleId={`${id}-title`} descriptionId={`${id}-description`}>
      <form onSubmit={(event) => event.preventDefault()} className="flex max-h-[calc(100dvh-32px)] flex-col">
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-zinc-200 px-5 py-5 sm:px-7">
          <div>
            <h2 id={`${id}-title`} className="text-lg font-semibold tracking-tight">{mode === 'edit' ? 'Edit project' : 'Add project'}</h2>
            <p id={`${id}-description`} className="mt-1 text-xs text-zinc-500">Explore the form. Changes are discarded when you close it.</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close project form" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-zinc-500 hover:bg-zinc-100 focus-visible:outline-2 focus-visible:outline-zinc-900"><Icon name="close" /></button>
        </div>

        <div className="min-h-0 overflow-y-auto overscroll-contain px-5 py-6 sm:px-7">
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <div>
              <label htmlFor={`${id}-name`} className="mb-2 block text-xs font-medium text-zinc-700">Title <span aria-hidden="true">*</span></label>
              <input id={`${id}-name`} name="title" required data-dialog-focus defaultValue={initialProject?.title ?? ''} placeholder="Project name" className={inputClass} />
            </div>
            <div>
              <label htmlFor={`${id}-category`} className="mb-2 block text-xs font-medium text-zinc-700">Category <span aria-hidden="true">*</span></label>
              <input id={`${id}-category`} name="category" required defaultValue={initialProject?.category ?? ''} placeholder="e.g. Developer tools" className={inputClass} />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor={`${id}-short`} className="mb-2 block text-xs font-medium text-zinc-700">Short description <span className="font-normal text-zinc-500">optional</span></label>
              <textarea id={`${id}-short`} name="shortDescription" rows={2} defaultValue={initialProject?.shortDescription ?? ''} placeholder="A brief overview of the project" className={`${inputClass} resize-y`} />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor={`${id}-full`} className="mb-2 block text-xs font-medium text-zinc-700">Description <span aria-hidden="true">*</span></label>
              <textarea id={`${id}-full`} name="description" required rows={3} defaultValue={initialProject?.description ?? ''} placeholder="What does the project do?" className={`${inputClass} resize-y`} />
            </div>
            {links.map((field) => (
              <div key={field.name} className="min-w-0">
                <label htmlFor={`${id}-${field.name}`} className="mb-2 block text-xs font-medium text-zinc-700">{field.label} <span className="font-normal text-zinc-500">optional</span></label>
                <input id={`${id}-${field.name}`} name={field.name} type={field.type} inputMode="url" defaultValue={field.value ?? ''} placeholder={field.placeholder} className={inputClass} />
              </div>
            ))}
            <div className="sm:col-span-2"><TechnologyInput values={technologies} onChange={setTechnologies} /></div>
            <label className="flex cursor-pointer items-start gap-3 rounded-md border border-zinc-200 bg-zinc-50 p-4 sm:col-span-2">
              <input type="checkbox" name="visible" checked={visible} onChange={(event) => setVisible(event.target.checked)} className="mt-0.5 h-4 w-4 shrink-0 accent-zinc-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900" />
              <span><span className="block text-xs font-medium">Visible on portfolio</span><span className="mt-1 block text-[11px] text-zinc-500">{visible ? 'Published' : 'Hidden'} · Preview only</span></span>
            </label>
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-zinc-200 bg-zinc-50/70 px-5 py-4 sm:px-7">
          <p id={`${id}-save-note`} className="flex items-center gap-1.5 text-[11px] text-zinc-500"><Icon name="lock" className="h-3 w-3" /> Saving is unavailable in this preview.</p>
          <div className="flex items-center gap-2">
            <button type="button" onClick={onClose} className="rounded-md border border-zinc-300 bg-white px-4 py-2.5 text-xs font-medium hover:bg-zinc-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900">Cancel</button>
            <button type="submit" disabled aria-describedby={`${id}-save-note`} className="cursor-not-allowed rounded-md bg-zinc-900 px-4 py-2.5 text-xs font-medium text-white opacity-35">Save project</button>
          </div>
        </div>
      </form>
    </Dialog>
  )
}
