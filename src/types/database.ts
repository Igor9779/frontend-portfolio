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

// Edits are limited to form fields and server-derived metadata. IDs, creation
// time, source and saved position are deliberately absent from Update.
export type DatabaseProjectUpdate = Partial<Pick<DatabaseProject,
  | 'title' | 'category' | 'short_description' | 'description' | 'preview_url'
  | 'github_url' | 'production_url' | 'telegram_url' | 'technologies' | 'visible'
  | 'github_repo' | 'updated_at'
>>
export interface Database {
  public: {
    Tables: {
      projects: {
        Row: DatabaseProject
        Insert: DatabaseProject
        Update: DatabaseProjectUpdate
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
    Functions: {
      reorder_projects: {
        Args: { ordered_ids: string[]; expected_order: string[] }
        Returns: undefined
      }
    }
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}
