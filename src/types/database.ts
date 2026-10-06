export type DatabaseProject = {
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

// Only SELECT is available. Define mutation types when CRUD is authorized.
export interface Database {
  public: {
    Tables: {
      projects: {
        Row: DatabaseProject
        Insert: never
        Update: never
        Relationships: []
      }
      admin_users: {
        Row: { user_id: string; created_at: string }
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
