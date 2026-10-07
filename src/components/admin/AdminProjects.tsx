'use client'

import { useEffect, useId, useReducer, useRef, useState, useTransition } from 'react'
import { unstable_rethrow, useRouter } from 'next/navigation'
import { reorderProjects } from '../../app/admin/order-actions'
import { createProjectOrder, projectOrderControls, projectOrderPayload, projectOrderReducer, sameProjectOrder } from '../../lib/project-order'
import type { AdminProject } from '../../types/admin-project'
import { AdminProjectCard } from './AdminProjectCard'
import { DeleteProjectDialog } from './DeleteProjectDialog'
import { Icon } from './Icon'
import { ProjectForm } from './ProjectForm'

type Editor = { mode: 'add' } | { mode: 'edit'; project: AdminProject }

export function AdminProjects({ initialProjects }: { initialProjects: AdminProject[] }) {
  const router = useRouter()
  const searchId = useId()
  const list = useRef<HTMLUListElement>(null)
  const addButton = useRef<HTMLButtonElement>(null)
  const focusAfterDelete = useRef(false)
  const submitting = useRef(false)
  const serverIds = initialProjects.map((project) => project.id)
  const [lastServerIds, setLastServerIds] = useState(serverIds)
  const [order, dispatchOrder] = useReducer(projectOrderReducer, serverIds, createProjectOrder)
  const [pending, startTransition] = useTransition()
  const [query, setQuery] = useState('')
  const [editor, setEditor] = useState<Editor | null>(null)
  const [deleting, setDeleting] = useState<AdminProject | null>(null)
  const [orderNotice, setOrderNotice] = useState('')
  const [mutationNotice, setMutationNotice] = useState('')
  const [orderError, setOrderError] = useState('')
  const [drag, setDrag] = useState<{ id: string; targetId: string | null } | null>(null)

  // Adjust only when server props change. A dirty draft keeps its original
  // expected_order; Reset explicitly adopts the newest server snapshot.
  if (!sameProjectOrder(lastServerIds, serverIds)) {
    setLastServerIds(serverIds)
    dispatchOrder({ type: 'sync', ids: serverIds })
  }

  useEffect(() => {
    // Wait for the dialog's cleanup before moving focus outside the modal.
    if (!deleting && focusAfterDelete.current) {
      addButton.current?.focus()
      focusAfterDelete.current = false
    }
  }, [deleting])

  const projectById = new Map(initialProjects.map((project) => [project.id, project]))
  const controls = projectOrderControls(order, query, pending, serverIds)
  const draftIds = order.draftOrder.filter((id) => projectById.has(id))
  const projects = [...draftIds.map((id) => projectById.get(id)!), ...initialProjects.filter((project) => !draftIds.includes(project.id))]
    .map((project, position) => controls.dirty ? { ...project, position } : project)
  const normalizedQuery = query.trim().toLowerCase()
  const matchingProjects = projects.filter((project) => [project.title, project.category, ...project.technologies].some((value) => value.toLowerCase().includes(normalizedQuery)))

  function focusHandle(id: string) {
    requestAnimationFrame(() => list.current?.querySelector<HTMLButtonElement>(`[data-drag-handle="${id}"]`)?.focus())
  }

  function changedOrder(id: string, next: typeof order) {
    if (next === order) return
    setOrderError('')
    setMutationNotice('')
    setOrderNotice(`${projectById.get(id)?.title ?? 'Project'} moved to position ${next.draftOrder.indexOf(id)}. Order is not saved yet.`)
    focusHandle(id)
  }

  function moveProject(id: string, direction: -1 | 1) {
    const action = { type: 'move' as const, id, direction, blocked: controls.reorderDisabled || Boolean(editor || deleting) }
    changedOrder(id, projectOrderReducer(order, action))
    dispatchOrder(action)
  }

  function dropProject(id: string, targetId: string) {
    const action = { type: 'drop' as const, id, targetId, blocked: controls.reorderDisabled || Boolean(editor || deleting) }
    changedOrder(id, projectOrderReducer(order, action))
    dispatchOrder(action)
  }

  function resetOrder() {
    if (controls.resetDisabled) return
    dispatchOrder({ type: 'reset', ids: serverIds })
    setOrderError('')
    setMutationNotice('')
    setOrderNotice('Latest saved project order restored. No changes were sent.')
  }

  function saveOrder() {
    if (controls.saveDisabled || submitting.current) return
    submitting.current = true
    const input = projectOrderPayload(order)
    setOrderError('')
    setMutationNotice('')
    startTransition(async () => {
      try {
        const result = await reorderProjects(input.orderedIds, input.expectedOrder)
        if (result.success) {
          dispatchOrder({ type: 'saved', ids: result.orderedIds })
          setOrderNotice('')
          setMutationNotice('Project order saved.')
        } else {
          setOrderError(result.message)
          // Fetch the authoritative list without discarding the failed draft.
          router.refresh()
        }
      } catch (error) {
        unstable_rethrow(error)
        setOrderError('Unable to save project order. Please try again.')
        router.refresh()
      } finally {
        submitting.current = false
      }
    })
  }

  function saved(project: AdminProject) {
    setEditor(null)
    setQuery('')
    setOrderNotice('')
    setMutationNotice(`${project.title} saved. Showing the saved project order.`)
  }

  function deleted() {
    focusAfterDelete.current = true
    setDeleting(null)
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
        <button ref={addButton} type="button" disabled={controls.crudDisabled} title={controls.crudDisabled ? 'Save or Reset the current order first' : undefined} onClick={() => { if (!controls.crudDisabled) setEditor({ mode: 'add' }) }} className="inline-flex min-h-10 items-center gap-2 rounded-md bg-zinc-900 px-4 py-2.5 text-xs font-medium text-white hover:bg-zinc-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900 disabled:cursor-not-allowed disabled:opacity-40"><Icon name="plus" />Add project</button>
      </div>

      <div className="mb-6 flex items-start gap-3 rounded-md border border-zinc-200 bg-white px-4 py-3 text-xs leading-5 text-zinc-500">
        <Icon name="lock" className="mt-0.5 h-4 w-4 shrink-0 text-zinc-400" />
        <p><span className="font-medium text-zinc-700">Administrator workspace.</span> Manage portfolio projects. Drag or use Move Up/Down, then Save order to publish the new order.</p>
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
      <p id={`${searchId}-hint`} className={normalizedQuery ? 'mb-4 text-[11px] text-zinc-500' : 'sr-only'}>{normalizedQuery ? 'Clear search to reorder projects.' : 'Search by title, category or technology.'}</p>

      <div aria-busy={pending} className={`mb-4 flex flex-wrap items-center justify-between gap-3 rounded-md border px-4 py-3 text-xs ${controls.dirty ? 'border-amber-200 bg-amber-50 text-amber-900' : 'border-zinc-200 bg-white text-zinc-500'}`}>
        <div className="min-w-0 flex-1 basis-[200px]">
          <p className="font-medium">{pending ? 'Saving project order…' : controls.dirty ? 'Unsaved order changes' : 'Project order is saved'}</p>
          <p className="mt-1 text-[11px] leading-5">{controls.dirty ? 'Save or Reset the current order before adding, editing or deleting projects.' : 'Changes stay in this draft until you select Save order.'}</p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <button type="button" disabled={controls.resetDisabled} onClick={resetOrder} className="min-h-9 rounded-md border border-zinc-300 bg-white px-3 font-medium text-zinc-700 hover:bg-zinc-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900 disabled:cursor-not-allowed disabled:opacity-40">Reset order</button>
          <button type="button" disabled={controls.saveDisabled} onClick={saveOrder} className="min-h-9 rounded-md bg-zinc-900 px-3 font-medium text-white hover:bg-zinc-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900 disabled:cursor-not-allowed disabled:opacity-40">{pending ? 'Saving…' : 'Save order'}</button>
        </div>
      </div>
      {controls.stale && <p role="status" className="mb-4 text-xs leading-5 text-amber-800">The saved project list or order changed. Reset to the latest saved order before continuing.</p>}
      {orderError && <p role="alert" className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-xs leading-5 text-red-700">{orderError}</p>}
      <p id="project-order-instructions" className="sr-only">Drag by the handle, or use Arrow Up and Arrow Down on the handle or the Move Up/Down buttons. Select Save order to persist changes. Escape cancels a drag.</p>
      <p role="status" className="sr-only">{orderNotice}</p>

      {matchingProjects.length > 0 ? (
        <ul ref={list} aria-label="Portfolio projects" className="overflow-hidden rounded-lg border border-zinc-200 bg-white">
          {matchingProjects.map((project) => (
            <AdminProjectCard key={project.id} project={project} canMoveUp={project.id !== projects[0]?.id} canMoveDown={project.id !== projects.at(-1)?.id}
              reorderDisabled={controls.reorderDisabled || Boolean(editor || deleting)} crudDisabled={controls.crudDisabled}
              dragging={drag?.id === project.id} dropTarget={drag?.targetId === project.id && drag.id !== project.id}
              onEdit={() => { if (!controls.crudDisabled) setEditor({ mode: 'edit', project }) }}
              onDelete={() => { if (!controls.crudDisabled) setDeleting(project) }}
              onMove={(direction) => moveProject(project.id, direction)} onDrop={(targetId) => dropProject(project.id, targetId)}
              onDragChange={(targetId, active) => setDrag(active ? { id: project.id, targetId } : null)} />
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
