'use client'

import { useState, useSyncExternalStore } from 'react'
import type { AdminProject } from '../../types/admin-project'
import { clearProjectDraft, emptyProjectDraft, loadProjectDraft, persistProjectDraft } from '../../lib/admin-project-draft'
import { createProject, updateProject } from '../../app/admin/project-actions'
import { ProjectFormDialog } from './ProjectFormDialog'
import { ProjectPrefill } from './ProjectPrefill'
import { ProjectScreenshot } from './ProjectScreenshot'

const subscribe = () => () => {}

// Only the real administrator adapter imports mutation Server Actions.
export function ProjectForm({ mode, initialProject, onClose, onSaved }: {
  mode: 'add' | 'edit'
  initialProject?: AdminProject
  onClose: () => void
  onSaved: (project: AdminProject) => void
}) {
  const hydrated = useSyncExternalStore(subscribe, () => true, () => false)
  if (mode === 'add') return hydrated ? <AddProjectForm onClose={onClose} onSaved={onSaved} /> : null
  return <ProjectFormDialog mode={mode} initialProject={initialProject} onClose={onClose} onSaved={onSaved}
    previewTools={ProjectScreenshot} onSave={(formData) => updateProject(initialProject?.id, formData)} />
}

function AddProjectForm({ onClose, onSaved }: { onClose: () => void; onSaved: (project: AdminProject) => void }) {
  const [loaded] = useState(() => {
    let storage: Storage | null = null
    try { storage = window.sessionStorage } catch { /* Browser privacy settings may block storage. */ }
    return { storage, draft: loadProjectDraft(storage) ?? emptyProjectDraft() }
  })
  const [form, setForm] = useState({ draft: loaded.draft, version: 0 })
  const [persistent, setPersistent] = useState(Boolean(loaded.storage))
  return <ProjectFormDialog key={form.version} mode="add" initialDraft={form.draft} onClose={onClose}
    onDraftChange={(draft) => setPersistent(persistProjectDraft(loaded.storage, draft))} draftPersistent={persistent}
    onDiscardDraft={() => {
      setPersistent(clearProjectDraft(loaded.storage))
      // Remount only for an explicit discard, releasing the selected file/blob,
      // import feedback and validation state along with the serializable draft.
      setForm((current) => ({ draft: emptyProjectDraft(), version: current.version + 1 }))
    }}
    onSaved={(project) => { clearProjectDraft(loaded.storage); onSaved(project) }}
    prefill={ProjectPrefill} previewTools={ProjectScreenshot} onSave={createProject} />
}
