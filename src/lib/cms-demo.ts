import type { AdminProject } from '../types/admin-project'
import { createProjectOrder, projectOrderReducer, sameProjectOrder, validateProjectOrder, type ProjectOrderState } from './project-order'
import { isProjectId, validateProject } from './project-validation'

export const demoStorageKey = 'portfolio:cms-demo:v1'
const maxDemoProjects = 100

export interface DemoProject extends AdminProject {
  // Used only while a browser-owned blob replaces a URL. Never serialized.
  localPreviewFallback?: string | null
}
export interface DemoState {
  projects: DemoProject[]
  order: ProjectOrderState
}

export function createDemoState(projects: readonly AdminProject[]): DemoState {
  return {
    projects: projects.map((project, position) => ({ ...project, technologies: [...project.technologies], position })),
    order: createProjectOrder(projects.map((project) => project.id)),
  }
}

export function saveDemoProject(state: DemoState, project: DemoProject): DemoState {
  if (!sameProjectOrder(state.order.savedOrder, state.order.draftOrder)) return state
  const existing = state.projects.some((item) => item.id === project.id)
  if (!existing && state.projects.length >= maxDemoProjects) return state
  const projects = existing ? state.projects.map((item) => item.id === project.id ? project : item) : [...state.projects, project]
  return { projects, order: createProjectOrder(projects.map((item) => item.id)) }
}

export function deleteDemoProject(state: DemoState, id: string): DemoState {
  if (!sameProjectOrder(state.order.savedOrder, state.order.draftOrder)) return state
  return createDemoState(state.projects.filter((project) => project.id !== id))
}

export function changeDemoOrder(state: DemoState, action: Parameters<typeof projectOrderReducer>[1]): DemoState {
  return { ...state, order: projectOrderReducer(state.order, action) }
}

export function saveDemoOrder(state: DemoState): DemoState {
  const byId = new Map(state.projects.map((project) => [project.id, project]))
  return createDemoState(state.order.draftOrder.map((id) => byId.get(id)!))
}

export function serializeDemoState(state: DemoState): string {
  const projects = state.projects.map((project) => ({
    id: project.id, title: project.title, category: project.category,
    shortDescription: project.shortDescription, description: project.description,
    previewUrl: project.previewUrl?.startsWith('blob:') ? project.localPreviewFallback ?? null : project.previewUrl,
    githubUrl: project.githubUrl, productionUrl: project.productionUrl, telegramUrl: project.telegramUrl,
    technologies: project.technologies, visible: project.visible,
  }))
  return JSON.stringify({ version: 1, projects, savedOrder: state.order.savedOrder, draftOrder: state.order.draftOrder })
}

// Treat browser storage as untrusted input. Rebuild only allowed presentation
// fields; never revive blob URLs, arbitrary links, internal fields or bad sets.
export function parseDemoState(raw: string | null): DemoState | null {
  if (!raw || raw.length > 2_000_000) return null
  try {
    const value = JSON.parse(raw)
    if (!value || value.version !== 1 || !Array.isArray(value.projects) || value.projects.length > maxDemoProjects) return null
    const projects: DemoProject[] = []
    const ids = new Set<string>()
    for (const item of value.projects) {
      if (!item || !isProjectId(item.id)) return null
      const id = item.id.toLowerCase()
      const validated = validateProject(item)
      if (!validated.success || ids.has(id)) return null
      ids.add(id)
      projects.push({ ...validated.project, id, position: 0 })
    }
    const order = validateProjectOrder(value.draftOrder, value.savedOrder)
    if (!order.success || order.orderedIds.length !== ids.size || order.orderedIds.some((id) => !ids.has(id))) return null
    const byId = new Map(projects.map((project) => [project.id, project]))
    return {
      projects: order.expectedOrder.map((id, position) => ({ ...byId.get(id)!, position })),
      order: { savedOrder: order.expectedOrder, draftOrder: order.orderedIds },
    }
  } catch {
    return null
  }
}

// The form owns its selection preview. Saved projects get a separate URL whose
// lifetime belongs to the workspace, so closing the form cannot break the row.
export class DemoPreviewUrls {
  private readonly owned = new Set<string>()
  private readonly urls: Pick<typeof URL, 'createObjectURL' | 'revokeObjectURL'>
  constructor(urls: Pick<typeof URL, 'createObjectURL' | 'revokeObjectURL'> = URL) { this.urls = urls }
  create(file: File) {
    const url = this.urls.createObjectURL(file)
    this.owned.add(url)
    return url
  }
  releaseUnused(projects: readonly AdminProject[]) {
    const used = new Set(projects.map((project) => project.previewUrl))
    for (const url of this.owned) {
      if (!used.has(url)) {
        this.urls.revokeObjectURL(url)
        this.owned.delete(url)
      }
    }
  }
  dispose() {
    for (const url of this.owned) this.urls.revokeObjectURL(url)
    this.owned.clear()
  }
}
