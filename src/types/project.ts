export interface ProjectLink {
  label: string
  href: string
}

export interface Project {
  title: string
  type: string
  description: string
  image: string
  imageAlt: string
  tags: string[]
  links: ProjectLink[]
}
