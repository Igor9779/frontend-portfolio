export interface AdminProject {
  id: string
  title: string
  category: string
  shortDescription: string | null
  description: string
  previewUrl: string | null
  githubUrl: string | null
  productionUrl: string | null
  telegramUrl: string | null
  technologies: string[]
  position: number
  visible: boolean
}
