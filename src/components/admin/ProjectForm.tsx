'use client'

import { useActionState, useId, useRef, useState } from 'react'
import { unstable_rethrow } from 'next/navigation'
import type { AdminProject } from '../../types/admin-project'
import type { ProjectFormValues, ProjectSaveResult } from '../../types/project-form'
import { createProject, updateProject } from '../../app/admin/project-actions'
import { projectLimits } from '../../lib/project-validation'
import { Dialog } from './Dialog'
import { Icon } from './Icon'
import { TechnologyInput } from './TechnologyInput'
import { PreviewImageInput } from './PreviewImageInput'

const inputClass = 'w-full min-w-0 rounded-md border border-zinc-300 bg-white px-3 py-2.5 text-sm text-zinc-900 outline-none placeholder:text-zinc-400 focus:border-zinc-600 focus:ring-2 focus:ring-zinc-900/10 aria-invalid:border-red-400'

export function ProjectForm({ mode, initialProject, onClose, onSaved }: {
  mode: 'add' | 'edit'
  initialProject?: AdminProject
  onClose: () => void
  onSaved: (project: AdminProject) => void
}) {
  const id = useId()
  const submitting = useRef(false)
  const [previewReady, setPreviewReady] = useState(true)
  const [previewMode, setPreviewMode] = useState<'keep' | 'url'>('keep')
  const [values, setValues] = useState<ProjectFormValues>({
    title: initialProject?.title ?? '',
    category: initialProject?.category ?? '',
    shortDescription: initialProject?.shortDescription ?? '',
    description: initialProject?.description ?? '',
    previewUrl: initialProject?.previewUrl ?? '',
    githubUrl: initialProject?.githubUrl ?? '',
    productionUrl: initialProject?.productionUrl ?? '',
    telegramUrl: initialProject?.telegramUrl ?? '',
    technologies: initialProject?.technologies ?? [],
    visible: initialProject?.visible ?? true,
  })
  const [result, save, pending] = useActionState<ProjectSaveResult | null, FormData>(async (_previous, formData) => {
    try {
      // Omit the native unselected-file placeholder before React serializes
      // FormData; its empty filename may otherwise become "undefined".
      const file = formData.get('previewFile')
      if (file instanceof File && file.size === 0 && file.name === '') formData.delete('previewFile')
      const response = mode === 'edit'
        ? await updateProject(initialProject?.id, formData)
        : await createProject(formData)
      if (response.success) onSaved(response.project)
      return response
    } catch (error) {
      unstable_rethrow(error)
      return { success: false, message: 'Unable to save the project. Please try again.' }
    } finally {
      submitting.current = false
    }
  }, null)
  const errors = result?.success === false ? result.errors : undefined
  function field<K extends keyof ProjectFormValues>(name: K, value: ProjectFormValues[K]) {
    setValues((current) => ({ ...current, [name]: value }))
  }
  function feedback(name: keyof ProjectFormValues) {
    return errors?.[name] ? <p id={`${id}-${name}-error`} className="mt-2 text-xs text-red-700">{errors[name]}</p> : null
  }
  const links = [
    { name: 'productionUrl', label: 'Production URL', type: 'text', placeholder: 'https:// or /projects/…' },
    { name: 'githubUrl', label: 'GitHub URL', type: 'url', placeholder: 'https://github.com/owner/repository' },
    { name: 'telegramUrl', label: 'Telegram URL', type: 'url', placeholder: 'https://t.me/…' },
  ] as const

  return (
    <Dialog onClose={onClose} busy={pending} titleId={`${id}-title`} descriptionId={`${id}-description`}>
      <form action={save} onSubmit={(event) => {
        if (submitting.current || !previewReady) event.preventDefault()
        else submitting.current = true
      }} onReset={(event) => event.preventDefault()} aria-busy={pending} className="flex max-h-[calc(100dvh-32px)] flex-col">
        <input type="hidden" name="previewMode" value={previewMode} />
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-zinc-200 px-5 py-5 sm:px-7">
          <div>
            <h2 id={`${id}-title`} className="text-lg font-semibold tracking-tight">{mode === 'edit' ? 'Edit project' : 'Add project'}</h2>
            <p id={`${id}-description`} className="mt-1 text-xs text-zinc-500">Save changes to your portfolio. Unsaved changes are discarded when you close.</p>
          </div>
          <button type="button" onClick={onClose} disabled={pending} aria-label="Close project form" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-zinc-500 hover:bg-zinc-100 focus-visible:outline-2 focus-visible:outline-zinc-900 disabled:opacity-40"><Icon name="close" /></button>
        </div>

        <div className="min-h-0 overflow-y-auto overscroll-contain px-5 py-6 sm:px-7">
          <fieldset disabled={pending} className="grid min-w-0 grid-cols-1 gap-5 sm:grid-cols-2">
            <div>
              <label htmlFor={`${id}-name`} className="mb-2 block text-xs font-medium text-zinc-700">Title <span aria-hidden="true">*</span></label>
              <input id={`${id}-name`} name="title" required maxLength={projectLimits.title} data-dialog-focus value={values.title} onChange={(event) => field('title', event.target.value)} aria-invalid={Boolean(errors?.title)} aria-describedby={errors?.title ? `${id}-title-error` : undefined} placeholder="Project name" className={inputClass} />
              {feedback('title')}
            </div>
            <div>
              <label htmlFor={`${id}-category`} className="mb-2 block text-xs font-medium text-zinc-700">Category <span aria-hidden="true">*</span></label>
              <input id={`${id}-category`} name="category" required maxLength={projectLimits.category} value={values.category} onChange={(event) => field('category', event.target.value)} aria-invalid={Boolean(errors?.category)} aria-describedby={errors?.category ? `${id}-category-error` : undefined} placeholder="e.g. Developer tools" className={inputClass} />
              {feedback('category')}
            </div>
            <div className="sm:col-span-2">
              <label htmlFor={`${id}-short`} className="mb-2 block text-xs font-medium text-zinc-700">Short description <span className="font-normal text-zinc-500">optional</span></label>
              <textarea id={`${id}-short`} name="shortDescription" rows={2} maxLength={projectLimits.shortDescription} value={values.shortDescription} onChange={(event) => field('shortDescription', event.target.value)} aria-invalid={Boolean(errors?.shortDescription)} aria-describedby={errors?.shortDescription ? `${id}-shortDescription-error` : undefined} placeholder="A brief overview of the project" className={`${inputClass} resize-y`} />
              {feedback('shortDescription')}
            </div>
            <div className="sm:col-span-2">
              <label htmlFor={`${id}-full`} className="mb-2 block text-xs font-medium text-zinc-700">Description <span aria-hidden="true">*</span></label>
              <textarea id={`${id}-full`} name="description" required rows={3} maxLength={projectLimits.description} value={values.description} onChange={(event) => field('description', event.target.value)} aria-invalid={Boolean(errors?.description)} aria-describedby={errors?.description ? `${id}-description-error` : undefined} placeholder="What does the project do?" className={`${inputClass} resize-y`} />
              {feedback('description')}
            </div>
            <div className="sm:col-span-2">
              <PreviewImageInput currentPreview={initialProject?.previewUrl ?? null} sourceUrl={values.previewUrl} onSourceChange={(value) => { field('previewUrl', value); setPreviewMode('url') }} onValidityChange={setPreviewReady} fileError={errors?.previewFile} urlError={errors?.previewUrl} />
            </div>
            {links.map((field) => (
              <div key={field.name} className="min-w-0">
                <label htmlFor={`${id}-${field.name}`} className="mb-2 block text-xs font-medium text-zinc-700">{field.label} <span className="font-normal text-zinc-500">optional</span></label>
                <input id={`${id}-${field.name}`} name={field.name} type={field.type} inputMode="url" maxLength={projectLimits.url} value={values[field.name]} onChange={(event) => setValues((current) => ({ ...current, [field.name]: event.target.value }))} aria-invalid={Boolean(errors?.[field.name])} aria-describedby={errors?.[field.name] ? `${id}-${field.name}-error` : undefined} placeholder={field.placeholder} className={inputClass} />
                {feedback(field.name)}
              </div>
            ))}
            <div className="sm:col-span-2">
              <TechnologyInput values={values.technologies} onChange={(value) => field('technologies', value)} error={errors?.technologies} />
              {values.technologies.map((value) => <input key={value} type="hidden" name="technologies" value={value} />)}
            </div>
            <label className="flex cursor-pointer items-start gap-3 rounded-md border border-zinc-200 bg-zinc-50 p-4 sm:col-span-2">
              <input type="checkbox" name="visible" checked={values.visible} onChange={(event) => field('visible', event.target.checked)} aria-invalid={Boolean(errors?.visible)} aria-describedby={errors?.visible ? `${id}-visible-error` : undefined} className="mt-0.5 h-4 w-4 shrink-0 accent-zinc-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900" />
              <span><span className="block text-xs font-medium">Visible on portfolio</span><span className="mt-1 block text-[11px] text-zinc-500">{values.visible ? 'Published · Appears on the public portfolio after saving' : 'Hidden · Only visible in the CMS after saving'}</span></span>
            </label>
            {errors?.visible && <div className="sm:col-span-2">{feedback('visible')}</div>}
          </fieldset>
        </div>

        <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-zinc-200 bg-zinc-50/70 px-5 py-4 sm:px-7">
          <div className="min-w-0 flex-1">
            {result?.success === false && <p role="alert" className="text-xs leading-5 text-red-700">{result.message}</p>}
            <p role="status" className="text-[11px] text-zinc-500">{pending ? 'Saving project…' : 'Project order is managed separately.'}</p>
          </div>
          <div className="flex items-center gap-2">
            <button type="button" onClick={onClose} disabled={pending} className="rounded-md border border-zinc-300 bg-white px-4 py-2.5 text-xs font-medium hover:bg-zinc-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900 disabled:opacity-40">Cancel</button>
            <button type="submit" disabled={pending || !previewReady} className="rounded-md bg-zinc-900 px-4 py-2.5 text-xs font-medium text-white hover:bg-zinc-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900 disabled:cursor-wait disabled:opacity-50">{pending ? 'Saving…' : 'Save project'}</button>
          </div>
        </div>
      </form>
    </Dialog>
  )
}
