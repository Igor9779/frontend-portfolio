export interface ProjectLink {
  label: string
  href: string
}

export interface Project {
  id?: string
  title: string
  type: string
  description: string
  image: string
  imageAlt: string
  tags: string[]
  links: ProjectLink[]
}
