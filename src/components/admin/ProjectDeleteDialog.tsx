'use client'

import { useLocale } from '../../lib/use-locale'

import { useActionState, useId, useRef } from 'react'
import { unstable_rethrow } from 'next/navigation'
import type { AdminProject } from '../../types/admin-project'
import type { ProjectDeleteResult } from '../../types/project-form'
import { Dialog } from './Dialog'
import { Icon } from './Icon'

export function ProjectDeleteDialog({ project, onClose, onDeleted, onDelete, localOnly = false }: { project: AdminProject; onClose: () => void; onDeleted: (id: string) => void; onDelete: (id: string) => Promise<ProjectDeleteResult>; localOnly?: boolean }) {
  const { t } = useLocale()
  const id = useId()
  const submitting = useRef(false)
  const [result, remove, pending] = useActionState<ProjectDeleteResult | null>(async () => {
    try {
      const response = await onDelete(project.id)
      if (response.success) onDeleted(response.id)
      return response
    } catch (error) {
      unstable_rethrow(error)
      return { success: false, message: 'Unable to delete the project. Please try again.' }
    } finally {
      submitting.current = false
    }
  }, null)
  return (
    <Dialog onClose={onClose} busy={pending} titleId={`${id}-title`} descriptionId={`${id}-description`} compact>
      <form action={remove} onSubmit={(event) => {
        if (submitting.current) event.preventDefault()
        else submitting.current = true
      }} aria-busy={pending} className="max-h-[calc(100dvh-32px)] overflow-y-auto p-6">
        <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg border border-red-100 bg-red-50 text-red-600"><Icon name="trash" className="h-5 w-5" /></div>
        <h2 id={`${id}-title`} className="text-lg font-semibold tracking-tight">{t("Delete project?")}</h2>
        <p id={`${id}-description`} className="mt-2 text-sm leading-6 text-zinc-600 [overflow-wrap:anywhere]">{t("Deleting")}{' '}<strong className="font-medium text-zinc-900">“{project.title}”</strong> {localOnly ? t("will remove it from this demo only. Reset demo restores the initial projects.") : t("will permanently remove it from your portfolio. This cannot be undone.")}</p>
        {result?.success === false && <p role="alert" className="mt-4 rounded-md border border-red-200 bg-red-50 p-3 text-xs leading-5 text-red-700">{t(result.message)}</p>}
        <p role="status" className="mt-4 text-xs text-zinc-500">{pending ? t("Deleting project…") : t("Select Delete project to confirm.")}</p>
        <div className="mt-6 flex justify-end gap-2">
          <button type="button" data-dialog-focus onClick={onClose} disabled={pending} className="rounded-md border border-zinc-300 px-4 py-2.5 text-xs font-medium hover:bg-zinc-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900 disabled:opacity-40">{t("Cancel")}</button>
          <button type="submit" disabled={pending} className="rounded-md bg-red-600 px-4 py-2.5 text-xs font-medium text-white hover:bg-red-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-700 disabled:cursor-wait disabled:opacity-50">{pending ? t("Deleting…") : t("Delete project")}</button>
        </div>
      </form>
    </Dialog>
  )
}
