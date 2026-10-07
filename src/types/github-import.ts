import type { ProjectFormPrefill } from './project-form'

export type GithubImportResult =
  | { success: true; fields: ProjectFormPrefill; warning?: string }
  | { success: false; message: string }
