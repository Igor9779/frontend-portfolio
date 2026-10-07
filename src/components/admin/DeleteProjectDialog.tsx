'use client'

import type { AdminProject } from '../../types/admin-project'
import { deleteProject } from '../../app/admin/project-actions'
import { ProjectDeleteDialog } from './ProjectDeleteDialog'

export function DeleteProjectDialog({ project, onClose, onDeleted }: {
  project: AdminProject
  onClose: () => void
  onDeleted: (id: string) => void
}) {
  return <ProjectDeleteDialog project={project} onClose={onClose} onDeleted={onDeleted} onDelete={deleteProject} />
}
