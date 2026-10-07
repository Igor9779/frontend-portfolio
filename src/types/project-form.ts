import type { AdminProject } from './admin-project'

export interface ProjectFormValues {
  title: string
  category: string
  shortDescription: string
  description: string
  previewUrl: string
  githubUrl: string
  productionUrl: string
  telegramUrl: string
  technologies: string[]
  visible: boolean
}

// Presentation-only prefill data; no server handler is imported by the shared
// form used by the public demo.
export type ProjectFormPrefill = Pick<ProjectFormValues,
  'title' | 'shortDescription' | 'description' | 'githubUrl' | 'productionUrl' | 'technologies'
> & { githubRepository: string }

export type ProjectFieldErrors = Partial<Record<keyof ProjectFormValues | 'previewFile', string>>
export type ProjectSaveResult =
  | { success: true; project: AdminProject }
  | { success: false; message: string; errors?: ProjectFieldErrors }

export type ProjectDeleteResult =
  | { success: true; id: string }
  | { success: false; message: string }
