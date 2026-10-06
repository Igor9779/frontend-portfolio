export interface DatabaseProject {
  id: string
  title: string
  category: string
  short_description: string | null
  description: string
  preview_url: string | null
  github_url: string | null
  production_url: string | null
  telegram_url: string | null
  technologies: string[]
  position: number
  visible: boolean
  source: string
  github_repo: string | null
  created_at: string
  updated_at: string
}

// This stage exposes only reads. Define mutation types when the CMS is added.
export interface Database {
  public: {
    Tables: {
      projects: {
        Row: DatabaseProject
        Insert: never
        Update: never
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}
