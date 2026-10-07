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

export type ProjectFieldErrors = Partial<Record<keyof ProjectFormValues, string>>
export type ProjectSaveResult =
  | { success: true; project: AdminProject }
  | { success: false; message: string; errors?: ProjectFieldErrors }

export type ProjectDeleteResult =
  | { success: true; id: string }
  | { success: false; message: string }
