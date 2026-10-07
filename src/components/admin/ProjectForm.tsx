'use client'

import type { AdminProject } from '../../types/admin-project'
import { createProject, updateProject } from '../../app/admin/project-actions'
import { ProjectFormDialog } from './ProjectFormDialog'

// Only the real administrator adapter imports mutation Server Actions.
export function ProjectForm({ mode, initialProject, onClose, onSaved }: {
  mode: 'add' | 'edit'
  initialProject?: AdminProject
  onClose: () => void
  onSaved: (project: AdminProject) => void
}) {
  return <ProjectFormDialog mode={mode} initialProject={initialProject} onClose={onClose} onSaved={onSaved}
    onSave={(formData) => mode === 'edit' ? updateProject(initialProject?.id, formData) : createProject(formData)} />
}
