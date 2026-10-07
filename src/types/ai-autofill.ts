import type { ProjectFormValues } from './project-form'

// Neutral presentation data only. No provider/action imports reach the demo.
export type AiProjectSuggestions = Pick<ProjectFormValues,
  'title' | 'category' | 'shortDescription' | 'description' | 'technologies'
>

export type AiAutofillResult =
  | { success: true; suggestions: AiProjectSuggestions; warnings: string[] }
  | { success: false; message: string }
