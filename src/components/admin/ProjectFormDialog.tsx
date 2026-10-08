'use client'

import { useLocale } from '../../lib/use-locale'

import { useActionState, useEffect, useId, useRef, useState } from 'react'
import type { ComponentType } from 'react'
import { unstable_rethrow } from 'next/navigation'
import type { AdminProject } from '../../types/admin-project'
import type { ProjectFormDraft, ProjectFormPrefill, ProjectFormValues, ProjectSaveResult, ProjectPreviewToolsProps } from '../../types/project-form'
import type { AiProjectSuggestions } from '../../types/ai-autofill'
import { mergeAiSuggestions } from '../../lib/ai-suggestions'
import { projectLimits } from '../../lib/project-validation'
import { Dialog } from './Dialog'
import { Icon } from './Icon'
import { TechnologyInput } from './TechnologyInput'
import { PreviewImageInput } from './PreviewImageInput'
import { PendingPreviewFiles } from '../../lib/pending-preview'
import type { PendingPreview } from '../../lib/pending-preview'

const inputClass = 'w-full min-w-0 rounded-md border border-zinc-300 bg-white px-3 py-2.5 text-sm text-zinc-900 outline-none placeholder:text-zinc-400 focus:border-zinc-600 focus:ring-2 focus:ring-zinc-900/10 aria-invalid:border-red-400'

export function ProjectFormDialog({ mode, initialProject, initialDraft, onDraftChange, onDiscardDraft, draftPersistent, onClose, onSaved, onSave, prefill: Prefill, previewTools: PreviewTools, localOnly = false }: {
  mode: 'add' | 'edit'
  onSave: (formData: FormData) => Promise<ProjectSaveResult>
  localOnly?: boolean
  initialProject?: AdminProject
  onClose: () => void
  onSaved: (project: AdminProject) => void
  initialDraft?: ProjectFormDraft
  onDraftChange?: (draft: ProjectFormDraft) => void
  onDiscardDraft?: () => void
  draftPersistent?: boolean
  previewTools?: ComponentType<ProjectPreviewToolsProps>
  prefill?: ComponentType<{ disabled: boolean; repositoryUrl: string; onApply: (fields: ProjectFormPrefill) => void;
    onApplySuggestions: (suggestions: AiProjectSuggestions, expectedRepository: string) => boolean;
    onPendingChange: (pending: boolean) => void }>
}) {
  const { t } = useLocale()
  const id = useId()
  const submitting = useRef(false)
  const [previewReady, setPreviewReady] = useState(true)
  const [prefillPending, setPrefillPending] = useState(false)
  const [screenshotPending, setScreenshotPending] = useState(false)
  const [autoCapture, setAutoCapture] = useState<ProjectPreviewToolsProps['autoCapture']>(null)
  const [previewFiles] = useState(() => new PendingPreviewFiles())
  const [selection, setSelection] = useState<PendingPreview | null>(null)
  useEffect(() => () => previewFiles.dispose(), [previewFiles])
  const [draft, setDraft] = useState<ProjectFormDraft>(() => initialDraft ?? { previewMode: 'keep', importedRepository: null, values: {
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
  } })
  const currentDraft = useRef(draft)
  const { values, previewMode, importedRepository } = draft
  const [result, save, pending] = useActionState<ProjectSaveResult | null, FormData>(async (_previous, formData) => {
    try {
      // Manual and generated files share exactly one pending-file source.
      // React/native file inputs cannot represent a server-generated File.
      if (previewFiles.selection) formData.set('previewFile', previewFiles.selection.file)
      else formData.delete('previewFile')
      // Omit the native unselected-file placeholder before React serializes
      // FormData; its empty filename may otherwise become "undefined".
      const file = formData.get('previewFile')
      if (file instanceof File && file.size === 0 && file.name === '') formData.delete('previewFile')
      const response = await onSave(formData)
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
  const busy = pending || prefillPending
  function changeDraft(next: ProjectFormDraft) {
    currentDraft.current = next
    setDraft(next)
    // Event-driven writes finish before dismissal or refresh; no effect can
    // later recreate a draft after a successful Save has cleared storage.
    onDraftChange?.(next)
  }
  function field<K extends keyof ProjectFormValues>(name: K, value: ProjectFormValues[K]) {
    changeDraft({ ...draft, values: { ...values, [name]: value } })
  }
  function feedback(name: keyof ProjectFormValues) {
    return errors?.[name] ? <p id={`${id}-${name}-error`} className="mt-2 text-xs text-red-700">{t(errors[name]!)}</p> : null
  }
  const links = [
    { name: 'productionUrl', label: 'Production URL', type: 'text', placeholder: 'https:// or /projects/…' },
    { name: 'githubUrl', label: 'GitHub URL', type: 'url', placeholder: 'https://github.com/owner/repository' },
    { name: 'telegramUrl', label: 'Telegram URL', type: 'url', placeholder: 'https://t.me/…' },
  ] as const

  return (
    <Dialog onClose={onClose} busy={busy} titleId={`${id}-title`} descriptionId={`${id}-description`}>
      <form action={save} onSubmit={(event) => {
        if (submitting.current || prefillPending || screenshotPending || !previewReady) event.preventDefault()
        else submitting.current = true
      }} onReset={(event) => event.preventDefault()} aria-busy={busy} className="flex max-h-[calc(100dvh-32px)] flex-col">
        <input type="hidden" name="previewMode" value={previewMode} />
        {importedRepository && <input type="hidden" name="importedGithubRepo" value={importedRepository} />}
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-zinc-200 px-5 py-5 sm:px-7">
          <div>
            <h2 id={`${id}-title`} className="text-lg font-semibold tracking-tight">{mode === 'edit' ? t("Edit project") : t("Add project")}</h2>
            <p id={`${id}-description`} className="mt-1 text-xs text-zinc-500">{localOnly ? t("Save changes in this demo only. The live portfolio stays unchanged.") : onDraftChange ? t("Closing keeps your draft in this tab. Preview files must be selected again after reopening.") : t("Save changes to your portfolio. Unsaved changes are discarded when you close.")}</p>
          </div>
          <button type="button" onClick={onClose} disabled={busy} aria-label={t("Close project form")} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-zinc-500 hover:bg-zinc-100 focus-visible:outline-2 focus-visible:outline-zinc-900 disabled:opacity-40"><Icon name="close" /></button>
        </div>

        <div className="min-h-0 overflow-y-auto overscroll-contain px-5 py-6 sm:px-7">
          {onDiscardDraft && <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <p role="status" className="min-w-0 flex-1 text-xs leading-5 text-zinc-500">{draftPersistent ? t("Draft kept in this tab until you save or discard.") : t("Browser storage is unavailable. Keep this form open to retain your draft.")}</p>
            <button type="button" onClick={onDiscardDraft} disabled={busy} className="min-h-9 shrink-0 rounded-md border border-zinc-300 px-3 text-xs font-medium hover:bg-zinc-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900 disabled:opacity-40">{t("Discard draft")}</button>
          </div>}
          {Prefill && <Prefill disabled={busy} repositoryUrl={values.githubUrl} onPendingChange={setPrefillPending}
            onApply={({ githubRepository, ...fields }) => {
              const current = currentDraft.current
              changeDraft({ ...current, values: { ...current.values, ...fields, technologies: [...fields.technologies] }, importedRepository: githubRepository })
              if (PreviewTools) {
                setScreenshotPending(true)
                setAutoCapture(request => ({ url: fields.productionUrl, sequence: (request?.sequence ?? 0) + 1 }))
              }
            }} onApplySuggestions={(suggestions, expectedRepository) => {
              // A pending response also belongs to the import provenance at
              // request time, even if a later URL edit identifies the same repo.
              if (currentDraft.current.importedRepository !== importedRepository) return false
              const next = mergeAiSuggestions(currentDraft.current, suggestions, expectedRepository)
              if (!next) return false
              changeDraft(next)
              return true
            }} />}
          <fieldset disabled={busy} className="grid min-w-0 grid-cols-1 gap-5 sm:grid-cols-2">
            <div>
              <label htmlFor={`${id}-name`} className="mb-2 block text-xs font-medium text-zinc-700">{t("Title")}{' '}<span aria-hidden="true">*</span></label>
              <input id={`${id}-name`} name="title" required maxLength={projectLimits.title} data-dialog-focus value={values.title} onChange={(event) => field('title', event.target.value)} aria-invalid={Boolean(errors?.title)} aria-describedby={errors?.title ? `${id}-title-error` : undefined} placeholder={t("Project name")} className={inputClass} />
              {feedback('title')}
            </div>
            <div>
              <label htmlFor={`${id}-category`} className="mb-2 block text-xs font-medium text-zinc-700">{t("Category")}{' '}<span aria-hidden="true">*</span></label>
              <input id={`${id}-category`} name="category" required maxLength={projectLimits.category} value={values.category} onChange={(event) => field('category', event.target.value)} aria-invalid={Boolean(errors?.category)} aria-describedby={errors?.category ? `${id}-category-error` : undefined} placeholder={t("e.g. Developer tools")} className={inputClass} />
              {feedback('category')}
            </div>
            <div className="sm:col-span-2">
              <label htmlFor={`${id}-short`} className="mb-2 block text-xs font-medium text-zinc-700">{t("Short description")}{' '}<span className="font-normal text-zinc-500">{t("optional")}</span></label>
              <textarea id={`${id}-short`} name="shortDescription" rows={2} maxLength={projectLimits.shortDescription} value={values.shortDescription} onChange={(event) => field('shortDescription', event.target.value)} aria-invalid={Boolean(errors?.shortDescription)} aria-describedby={errors?.shortDescription ? `${id}-shortDescription-error` : undefined} placeholder={t("A brief overview of the project")} className={`${inputClass} resize-y`} />
              {feedback('shortDescription')}
            </div>
            <div className="sm:col-span-2">
              <label htmlFor={`${id}-full`} className="mb-2 block text-xs font-medium text-zinc-700">{t("Description")}{' '}<span aria-hidden="true">*</span></label>
              <textarea id={`${id}-full`} name="description" required rows={3} maxLength={projectLimits.description} value={values.description} onChange={(event) => field('description', event.target.value)} aria-invalid={Boolean(errors?.description)} aria-describedby={errors?.description ? `${id}-description-error` : undefined} placeholder={t("What does the project do?")} className={`${inputClass} resize-y`} />
              {feedback('description')}
            </div>
            <div className="sm:col-span-2">
              <PreviewImageInput selection={selection} onFileChange={(file) => setSelection(previewFiles.replace(file))} localOnly={localOnly} currentPreview={initialProject?.previewUrl ?? null} sourceUrl={values.previewUrl} onSourceChange={(value) => {
                previewFiles.invalidate()
                changeDraft({ ...draft, values: { ...values, previewUrl: value }, previewMode: 'url' })
              }} onValidityChange={setPreviewReady} fileError={errors?.previewFile} urlError={errors?.previewUrl}>
                {PreviewTools && <PreviewTools disabled={busy} productionUrl={values.productionUrl} autoCapture={autoCapture}
                  previewRevision={previewFiles.revision} onPendingChange={setScreenshotPending}
                  onAccept={(file, expectedUrl, expectedRevision) => {
                    if (currentDraft.current.values.productionUrl !== expectedUrl || previewFiles.revision !== expectedRevision || submitting.current) return false
                    setSelection(previewFiles.replace(file)); setPreviewReady(true)
                    return true
                  }} />}
              </PreviewImageInput>
            </div>
            {links.map((field) => (
              <div key={field.name} className="min-w-0">
                <label htmlFor={`${id}-${field.name}`} className="mb-2 block text-xs font-medium text-zinc-700">{t(field.label)} <span className="font-normal text-zinc-500">{t("optional")}</span></label>
                <input id={`${id}-${field.name}`} name={field.name} type={field.type} inputMode="url" maxLength={projectLimits.url} value={values[field.name]} onChange={(event) => {
                  changeDraft({ ...draft, values: { ...values, [field.name]: event.target.value }, importedRepository: field.name === 'githubUrl' ? null : importedRepository })
                }} aria-invalid={Boolean(errors?.[field.name])} aria-describedby={errors?.[field.name] ? `${id}-${field.name}-error` : undefined} placeholder={t(field.placeholder)} className={inputClass} />
                {feedback(field.name)}
              </div>
            ))}
            <div className="sm:col-span-2">
              <TechnologyInput values={values.technologies} onChange={(value) => field('technologies', value)} error={errors?.technologies} />
              {values.technologies.map((value) => <input key={value} type="hidden" name="technologies" value={value} />)}
            </div>
            <label className="flex items-start gap-3 rounded-md border border-zinc-200 bg-zinc-50 p-4 sm:col-span-2">
              <input type="checkbox" name="visible" checked={values.visible} onChange={(event) => field('visible', event.target.checked)} aria-invalid={Boolean(errors?.visible)} aria-describedby={errors?.visible ? `${id}-visible-error` : undefined} className="mt-0.5 h-4 w-4 shrink-0 accent-zinc-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900" />
              <span><span className="block text-xs font-medium">{t("Visible on portfolio")}</span><span className="mt-1 block text-[11px] text-zinc-500">{localOnly ? (values.visible ? t("Published · Shown in this demo only") : t("Hidden · Hidden in this demo only")) : (values.visible ? t("Published · Appears on the public portfolio after saving") : t("Hidden · Only visible in the CMS after saving"))}</span></span>
            </label>
            {errors?.visible && <div className="sm:col-span-2">{feedback('visible')}</div>}
          </fieldset>
        </div>

        <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-zinc-200 bg-zinc-50/70 px-5 py-4 sm:px-7">
          <div className="min-w-0 flex-1 basis-[200px]">
            {result?.success === false && <p role="alert" className="text-xs leading-5 text-red-700">{t(result.message)}</p>}
            <p role="status" className="text-[11px] text-zinc-500">{pending ? t("Saving project…") : t("Project order is managed separately.")}</p>
          </div>
          <div className="flex max-w-full flex-wrap items-center gap-2">
            <button type="button" onClick={onClose} disabled={busy} className="rounded-md border border-zinc-300 bg-white px-4 py-2.5 text-xs font-medium hover:bg-zinc-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900 disabled:opacity-40">{t("Cancel")}</button>
            <button type="submit" disabled={busy || screenshotPending || !previewReady} className="rounded-md bg-zinc-900 px-4 py-2.5 text-xs font-medium text-white hover:bg-zinc-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900 disabled:cursor-wait disabled:opacity-50">{pending ? t("Saving…") : t("Save project")}</button>
          </div>
        </div>
      </form>
    </Dialog>
  )
}
