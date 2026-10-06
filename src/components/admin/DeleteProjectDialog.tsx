'use client'

import { useId } from 'react'
import type { AdminProject } from '../../types/admin-project'
import { Dialog } from './Dialog'
import { Icon } from './Icon'

export function DeleteProjectDialog({ project, onClose }: { project: AdminProject; onClose: () => void }) {
  const id = useId()
  return (
    <Dialog onClose={onClose} titleId={`${id}-title`} descriptionId={`${id}-description`} compact>
      <div className="max-h-[calc(100dvh-32px)] overflow-y-auto p-6">
        <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg border border-red-100 bg-red-50 text-red-600"><Icon name="trash" className="h-5 w-5" /></div>
        <h2 id={`${id}-title`} className="text-lg font-semibold tracking-tight">Delete project?</h2>
        <p id={`${id}-description`} className="mt-2 text-sm leading-6 text-zinc-600">Deleting <strong className="font-medium text-zinc-900">“{project.title}”</strong> would permanently remove it from your portfolio.</p>
        <p id={`${id}-notice`} className="mt-4 rounded-md border border-zinc-200 bg-zinc-50 p-3 text-xs leading-5 text-zinc-500">Deletion is unavailable in this read-only preview. The project will stay in your portfolio.</p>
        <div className="mt-6 flex justify-end gap-2">
          <button type="button" data-dialog-focus onClick={onClose} className="rounded-md border border-zinc-300 px-4 py-2.5 text-xs font-medium hover:bg-zinc-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900">Cancel</button>
          <button type="button" disabled aria-describedby={`${id}-notice`} className="cursor-not-allowed rounded-md bg-red-600 px-4 py-2.5 text-xs font-medium text-white opacity-35">Delete project</button>
        </div>
      </div>
    </Dialog>
  )
}
