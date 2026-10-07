'use client'

import { useEffect, useId, useRef, useState } from 'react'
import type { AdminProject } from '../../types/admin-project'
import { AdminProjectCard } from './AdminProjectCard'
import { DeleteProjectDialog } from './DeleteProjectDialog'
import { Icon } from './Icon'
import { ProjectForm } from './ProjectForm'

type Editor = { mode: 'add' } | { mode: 'edit'; project: AdminProject }

export function AdminProjects({ initialProjects }: { initialProjects: AdminProject[] }) {
  const searchId = useId()
  const addButton = useRef<HTMLButtonElement>(null)
  const focusAfterDelete = useRef(false)
  // Server props stay authoritative after CRUD revalidation. Only the ordering
  // preview is kept locally, so refreshed titles/visibility cannot become stale.
  const [previewOrder, setPreviewOrder] = useState<string[] | null>(null)
  const [query, setQuery] = useState('')
  const [editor, setEditor] = useState<Editor | null>(null)
  const [deleting, setDeleting] = useState<AdminProject | null>(null)
  const [orderNotice, setOrderNotice] = useState('')
  const [mutationNotice, setMutationNotice] = useState('')

  useEffect(() => {
    // Wait for the dialog's cleanup before moving focus outside the modal.
    if (!deleting && focusAfterDelete.current) {
      addButton.current?.focus()
      focusAfterDelete.current = false
    }
  }, [deleting])

  const projectById = new Map(initialProjects.map((project) => [project.id, project]))
  const previewIds = previewOrder?.filter((id) => projectById.has(id))
  const projects = previewIds
    ? [...previewIds.map((id) => projectById.get(id)!), ...initialProjects.filter((project) => !previewIds.includes(project.id))]
        .map((project, position) => ({ ...project, position }))
    : initialProjects
  const normalizedQuery = query.trim().toLowerCase()
  const matchingProjects = projects.filter((project) => [project.title, project.category, ...project.technologies].some((value) => value.toLowerCase().includes(normalizedQuery)))
  const orderChanged = projects.some((project, index) => project.id !== initialProjects[index]?.id)

  function moveProject(id: string, direction: -1 | 1) {
    const index = projects.findIndex((project) => project.id === id)
    const nextIndex = index + direction
    if (index < 0 || nextIndex < 0 || nextIndex >= projects.length || normalizedQuery) return
    const reordered = [...projects]
    const project = reordered[index]
    const neighbor = reordered[nextIndex]
    if (!project || !neighbor) return
    reordered[index] = neighbor
    reordered[nextIndex] = project
    const nextOrder = reordered.map((item) => item.id)
    setPreviewOrder(nextOrder.every((id, position) => id === initialProjects[position]?.id) ? null : nextOrder)
    setOrderNotice(`${project.title} moved to position ${nextIndex}. This order is a local preview.`)
  }

  function saved(project: AdminProject) {
    setEditor(null)
    setPreviewOrder(null)
    setQuery('')
    setOrderNotice('')
    setMutationNotice(`${project.title} saved. Showing the saved project order.`)
  }

  function deleted() {
    focusAfterDelete.current = true
    setDeleting(null)
    setPreviewOrder(null)
    setOrderNotice('')
    setMutationNotice('Project deleted. Showing the saved project order.')
  }

  return (
    <section aria-labelledby="admin-projects-heading" className="mx-auto max-w-[1160px]">
      <div className="mb-7 flex flex-wrap items-start justify-between gap-5">
        <div>
          <h1 id="admin-projects-heading" className="text-[28px] leading-tight font-semibold tracking-[-0.03em]">Projects</h1>
          <p className="mt-2 text-sm text-zinc-500">Manage projects displayed in your portfolio.</p>
        </div>
        <button ref={addButton} type="button" onClick={() => setEditor({ mode: 'add' })} className="inline-flex min-h-10 items-center gap-2 rounded-md bg-zinc-900 px-4 py-2.5 text-xs font-medium text-white hover:bg-zinc-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900"><Icon name="plus" />Add project</button>
      </div>

      <div className="mb-6 flex items-start gap-3 rounded-md border border-zinc-200 bg-white px-4 py-3 text-xs leading-5 text-zinc-500">
        <Icon name="lock" className="mt-0.5 h-4 w-4 shrink-0 text-zinc-400" />
        <p><span className="font-medium text-zinc-700">Administrator workspace.</span> Add, edit and delete portfolio projects. Move Up/Down changes are preview-only.</p>
      </div>
      {mutationNotice && <p role="status" className="mb-4 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs text-emerald-800">{mutationNotice}</p>}

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="relative w-full sm:max-w-[360px]">
          <label htmlFor={searchId} className="sr-only">Search projects</label>
          <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-zinc-400"><Icon name="search" /></span>
          <input id={searchId} type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search projects…" aria-describedby={`${searchId}-hint`} className="w-full rounded-md border border-zinc-200 bg-white py-2.5 pr-3 pl-10 text-xs outline-none placeholder:text-zinc-400 focus:border-zinc-500 focus:ring-2 focus:ring-zinc-900/10" />
        </div>
        <p role="status" className="text-xs text-zinc-500">{normalizedQuery ? `${matchingProjects.length} of ${projects.length}` : projects.length} {projects.length === 1 ? 'project' : 'projects'}</p>
      </div>
      <p id={`${searchId}-hint`} className={normalizedQuery ? 'mb-4 text-[11px] text-zinc-500' : 'sr-only'}>{normalizedQuery ? 'Search matches titles, categories and technologies. Clear search to change order.' : 'Search by title, category or technology.'}</p>

      {orderChanged && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-md border border-amber-200 bg-amber-50 px-4 py-2.5 text-xs text-amber-800">
          <p>Order changes are preview-only. Refreshing restores the saved order.</p>
          <button type="button" onClick={() => { setPreviewOrder(null); setOrderNotice('Original project order restored.') }} className="min-h-8 rounded px-2 font-medium underline underline-offset-2 focus-visible:outline-amber-800">Reset order</button>
        </div>
      )}
      <p role="status" className="sr-only">{orderNotice}</p>

      {matchingProjects.length > 0 ? (
        <ul aria-label="Portfolio projects" className="overflow-hidden rounded-lg border border-zinc-200 bg-white">
          {matchingProjects.map((project) => (
            <AdminProjectCard key={project.id} project={project} canMoveUp={project.id !== projects[0]?.id} canMoveDown={project.id !== projects.at(-1)?.id} searching={Boolean(normalizedQuery)} onEdit={() => setEditor({ mode: 'edit', project })} onDelete={() => setDeleting(project)} onMove={(direction) => moveProject(project.id, direction)} />
          ))}
        </ul>
      ) : (
        <div className="rounded-lg border border-dashed border-zinc-300 bg-white px-6 py-16 text-center">
          <div className="mx-auto mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-zinc-100 text-zinc-400"><Icon name="search" className="h-5 w-5" /></div>
          <h2 className="text-sm font-medium">{normalizedQuery ? 'No projects match your search.' : 'No projects available yet.'}</h2>
          <p className="mt-2 text-xs text-zinc-500">{normalizedQuery ? 'Try a different title, category or technology.' : 'Projects will appear here when they are available to this workspace.'}</p>
          {normalizedQuery && <button type="button" onClick={() => setQuery('')} className="mt-4 min-h-9 rounded-md border border-zinc-200 px-3 text-xs font-medium hover:bg-zinc-50 focus-visible:outline-2 focus-visible:outline-zinc-900">Clear search</button>}
        </div>
      )}
      <p className="mt-5 text-[11px] leading-5 text-zinc-500">Showing published and hidden projects available to your administrator account.</p>

      {editor && <ProjectForm key={editor.mode === 'edit' ? editor.project.id : 'new'} mode={editor.mode} initialProject={editor.mode === 'edit' ? editor.project : undefined} onClose={() => setEditor(null)} onSaved={saved} />}
      {deleting && <DeleteProjectDialog project={deleting} onClose={() => setDeleting(null)} onDeleted={deleted} />}
    </section>
  )
}
