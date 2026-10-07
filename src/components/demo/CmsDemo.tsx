'use client'

import { useEffect, useId, useRef, useState, useSyncExternalStore } from 'react'
import type { AdminProject } from '../../types/admin-project'
import type { ProjectSaveResult } from '../../types/project-form'
import { changeDemoOrder, createDemoState, deleteDemoProject, DemoPreviewUrls, demoStorageKey, parseDemoState, saveDemoOrder, saveDemoProject, serializeDemoState, type DemoProject, type DemoState } from '../../lib/cms-demo'
import { projectOrderControls } from '../../lib/project-order'
import { parseProjectFormData } from '../../lib/project-validation'
import { validatePreviewFile } from '../../lib/preview-file'
import { AdminProjectCard } from '../admin/AdminProjectCard'
import { ProjectFormDialog } from '../admin/ProjectFormDialog'
import { ProjectDeleteDialog } from '../admin/ProjectDeleteDialog'
import { Dialog } from '../admin/Dialog'
import { Icon } from '../admin/Icon'

const subscribe = () => () => {}
type Editor = { mode: 'add' } | { mode: 'edit'; project: DemoProject }

export function CmsDemo({ initialProjects }: { initialProjects: AdminProject[] }) {
  // Mount the browser workspace after hydration; sessionStorage never changes
  // the server HTML or causes hydration mismatches.
  const hydrated = useSyncExternalStore(subscribe, () => true, () => false)
  return hydrated ? <DemoWorkspace initialProjects={initialProjects} /> : <p role="status" className="py-12 text-sm text-zinc-500">Loading demo workspace…</p>
}

function DemoWorkspace({ initialProjects }: { initialProjects: AdminProject[] }) {
  const [loaded] = useState(() => {
    try { return { state: parseDemoState(sessionStorage.getItem(demoStorageKey)) ?? createDemoState(initialProjects), persistent: true } }
    catch { return { state: createDemoState(initialProjects), persistent: false } }
  })
  const [demo, setDemo] = useState(loaded.state)
  const [persistent, setPersistent] = useState(loaded.persistent)
  const [previews] = useState(() => new DemoPreviewUrls())
  const [query, setQuery] = useState('')
  const [editor, setEditor] = useState<Editor | null>(null)
  const [deleting, setDeleting] = useState<DemoProject | null>(null)
  const [resetting, setResetting] = useState(false)
  const [notice, setNotice] = useState('')
  const [drag, setDrag] = useState<{ id: string; targetId: string | null } | null>(null)
  const list = useRef<HTMLUListElement>(null)
  const addButton = useRef<HTMLButtonElement>(null)
  const focusAfterDelete = useRef(false)
  const searchId = useId()
  const resetId = useId()
  const controls = projectOrderControls(demo.order, query, false)
  const byId = new Map(demo.projects.map((project) => [project.id, project]))
  const projects = demo.order.draftOrder.map((id, position) => ({ ...byId.get(id)!, position }))
  const normalizedQuery = query.trim().toLowerCase()
  const matching = projects.filter((project) => [project.title, project.category, ...project.technologies].some((value) => value.toLowerCase().includes(normalizedQuery)))

  useEffect(() => { previews.releaseUnused(demo.projects) }, [demo.projects, previews])
  useEffect(() => () => previews.dispose(), [previews])
  useEffect(() => {
    if (!deleting && focusAfterDelete.current) { addButton.current?.focus(); focusAfterDelete.current = false }
  }, [deleting])

  function commit(next: DemoState) {
    // This is the only persistence adapter for demo interactions: tab storage.
    try { sessionStorage.setItem(demoStorageKey, serializeDemoState(next)); setPersistent(true) }
    catch { setPersistent(false) }
    setDemo(next)
  }
  function reorder(id: string, action: Parameters<typeof changeDemoOrder>[1]) {
    const next = changeDemoOrder(demo, action)
    if (next.order === demo.order) return
    commit(next)
    setNotice(`${byId.get(id)?.title} moved to position ${next.order.draftOrder.indexOf(id)}. Demo order is not saved yet.`)
    requestAnimationFrame(() => list.current?.querySelector<HTMLButtonElement>(`[data-drag-handle="${id}"]`)?.focus())
  }

  async function saveProject(formData: FormData): Promise<ProjectSaveResult> {
    if (controls.crudDisabled || !editor) return { success: false, message: 'Save or Reset the current order first.' }
    const validated = parseProjectFormData(formData)
    if (!validated.success) return { success: false, message: 'Please correct the highlighted fields.', errors: validated.errors }
    if (validated.file) {
      const file = await validatePreviewFile(validated.file)
      if (!file.success) return { success: false, message: file.message, errors: { previewFile: file.message } }
    }
    const current = editor.mode === 'edit' ? byId.get(editor.project.id) : undefined
    const project: DemoProject = {
      ...validated.project, id: current?.id ?? crypto.randomUUID(), position: current?.position ?? demo.projects.length,
      previewUrl: validated.keepPreview ? current?.previewUrl ?? null : validated.project.previewUrl,
      localPreviewFallback: validated.keepPreview ? current?.localPreviewFallback : undefined,
    }
    if (validated.file) {
      project.previewUrl = previews.create(validated.file)
      project.localPreviewFallback = current?.previewUrl?.startsWith('blob:') ? current.localPreviewFallback ?? null : current?.previewUrl ?? null
    }
    const next = saveDemoProject(demo, project)
    if (next === demo) {
      previews.releaseUnused(demo.projects)
      return { success: false, message: 'This demo supports up to 100 projects. Delete a demo project or Reset demo to continue.' }
    }
    commit(next)
    return { success: true, project }
  }

  return (
    <section aria-labelledby="demo-projects-heading" className="mx-auto max-w-[1160px]">
      <div className="mb-7 flex flex-wrap items-start justify-between gap-4 rounded-md border border-blue-100 bg-blue-50/60 px-4 py-4">
        <div className="min-w-0 flex-1 basis-[220px]">
          <p className="text-xs font-semibold text-blue-900">Demo Mode · No sign-in required</p>
          <p className="mt-1 text-xs leading-5 text-zinc-600">Changes are temporary and do not affect the live portfolio.</p>
          <p className="mt-1 text-[11px] leading-5 text-zinc-500">{persistent ? 'Text and order stay in this tab until you Reset demo. Selected files reset on refresh.' : 'Browser storage is unavailable. Changes last until you refresh.'}</p>
        </div>
        <button type="button" onClick={() => setResetting(true)} className="min-h-9 rounded-md border border-blue-200 bg-white px-3 text-xs font-medium text-zinc-700 hover:bg-blue-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900">Reset demo</button>
      </div>
      <div className="mb-7 flex flex-wrap items-start justify-between gap-5">
        <div><h1 id="demo-projects-heading" className="text-[28px] font-semibold tracking-[-0.03em]">Projects</h1><p className="mt-2 text-sm text-zinc-500">Explore the portfolio CMS with your own temporary changes.</p></div>
        <button ref={addButton} type="button" disabled={controls.crudDisabled} title={controls.crudDisabled ? 'Save or Reset the current order first' : undefined} onClick={() => setEditor({ mode: 'add' })} className="inline-flex min-h-10 items-center gap-2 rounded-md bg-zinc-900 px-4 py-2.5 text-xs font-medium text-white hover:bg-zinc-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900 disabled:cursor-not-allowed disabled:opacity-40"><Icon name="plus" />Add project</button>
      </div>
      <p role="status" className={notice ? 'mb-4 text-xs leading-5 text-zinc-600' : 'sr-only'}>{notice}</p>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="relative w-full sm:max-w-[360px]">
          <label htmlFor={searchId} className="sr-only">Search projects</label>
          <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-zinc-400"><Icon name="search" /></span>
          <input id={searchId} type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search projects…" aria-describedby={`${searchId}-hint`} className="w-full rounded-md border border-zinc-200 bg-white py-2.5 pr-3 pl-10 text-xs outline-none focus:border-zinc-500 focus:ring-2 focus:ring-zinc-900/10" />
        </div>
        <p role="status" className="text-xs text-zinc-500">{normalizedQuery ? `${matching.length} of ${projects.length}` : projects.length} projects</p>
      </div>
      <p id={`${searchId}-hint`} className={normalizedQuery ? 'mb-4 text-[11px] text-zinc-500' : 'sr-only'}>{normalizedQuery ? 'Clear search to reorder projects.' : 'Search by title, category or technology.'}</p>
      <div className={`mb-4 flex flex-wrap items-center justify-between gap-3 rounded-md border px-4 py-3 text-xs ${controls.dirty ? 'border-amber-200 bg-amber-50 text-amber-900' : 'border-zinc-200 bg-white text-zinc-500'}`}>
        <div className="min-w-0 flex-1 basis-[200px]"><p className="font-medium">{controls.dirty ? 'Unsaved order changes' : 'Demo order is saved'}</p><p className="mt-1 text-[11px] leading-5">{controls.dirty ? 'Save or Reset the current order before adding, editing or deleting projects.' : 'Save order updates this demo only.'}</p></div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <button type="button" disabled={controls.resetDisabled} onClick={() => { commit(changeDemoOrder(demo, { type: 'reset', ids: demo.order.savedOrder })); setNotice('Last saved demo order restored.') }} className="min-h-9 rounded-md border border-zinc-300 bg-white px-3 font-medium text-zinc-700 hover:bg-zinc-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900 disabled:opacity-40">Reset order</button>
          <button type="button" disabled={controls.saveDisabled} onClick={() => { commit(saveDemoOrder(demo)); setNotice('Project order saved in this demo only.') }} className="min-h-9 rounded-md bg-zinc-900 px-3 font-medium text-white hover:bg-zinc-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900 disabled:opacity-40">Save order</button>
        </div>
      </div>
      <p id="project-order-instructions" className="sr-only">Drag by the handle or use Arrow Up/Down or the Move Up/Down buttons. Save order updates the demo only. Escape cancels a drag.</p>
      {matching.length ? <ul ref={list} aria-label="Portfolio projects" className="overflow-hidden rounded-lg border border-zinc-200 bg-white">
        {matching.map((project, index) => <AdminProjectCard key={project.id} project={project} canMoveUp={index > 0} canMoveDown={index < projects.length - 1}
          reorderDisabled={controls.reorderDisabled || Boolean(editor || deleting)} crudDisabled={controls.crudDisabled} dragging={drag?.id === project.id} dropTarget={drag?.targetId === project.id && drag.id !== project.id}
          onEdit={() => setEditor({ mode: 'edit', project })} onDelete={() => setDeleting(project)}
          onMove={(direction) => reorder(project.id, { type: 'move', id: project.id, direction, blocked: controls.reorderDisabled })}
          onDrop={(targetId) => reorder(project.id, { type: 'drop', id: project.id, targetId, blocked: controls.reorderDisabled })}
          onDragChange={(targetId, active) => setDrag(active ? { id: project.id, targetId } : null)} />)}
      </ul> : <div className="rounded-lg border border-dashed border-zinc-300 bg-white px-6 py-16 text-center"><h2 className="text-sm font-medium">{normalizedQuery ? 'No projects match your search.' : 'No demo projects yet.'}</h2><p className="mt-2 text-xs text-zinc-500">{normalizedQuery ? 'Try a different title, category or technology.' : 'Add a project or Reset demo to start again.'}</p></div>}
      {editor && <ProjectFormDialog key={editor.mode === 'edit' ? editor.project.id : 'new'} mode={editor.mode} initialProject={editor.mode === 'edit' ? editor.project : undefined} localOnly onClose={() => setEditor(null)} onSave={saveProject} onSaved={(project) => { setEditor(null); setQuery(''); setNotice(`${project.title} saved in this demo only.`) }} />}
      {deleting && <ProjectDeleteDialog project={deleting} localOnly onClose={() => setDeleting(null)} onDelete={async (id) => {
        if (controls.crudDisabled) return { success: false, message: 'Save or Reset the current order first.' }
        commit(deleteDemoProject(demo, id))
        return { success: true, id }
      }} onDeleted={() => { focusAfterDelete.current = true; setDeleting(null); setNotice('Project deleted from this demo only.') }} />}
      {resetting && <Dialog compact titleId={`${resetId}-title`} descriptionId={`${resetId}-description`} onClose={() => setResetting(false)}>
        <div className="p-6"><h2 id={`${resetId}-title`} className="text-lg font-semibold">Reset demo?</h2><p id={`${resetId}-description`} className="mt-2 text-sm leading-6 text-zinc-600">Discard your demo projects, edits, previews and order changes? The initial projects will be restored.</p><div className="mt-6 flex flex-wrap justify-end gap-2">
          <button type="button" data-dialog-focus onClick={() => setResetting(false)} className="min-h-10 rounded-md border border-zinc-300 px-4 text-xs font-medium focus-visible:outline-2 focus-visible:outline-zinc-900">Cancel</button>
          <button type="button" onClick={() => { commit(createDemoState(initialProjects)); setQuery(''); setDrag(null); setResetting(false); setNotice('Demo reset. Initial projects and order restored.') }} className="min-h-10 rounded-md bg-zinc-900 px-4 text-xs font-medium text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900">Reset demo</button>
        </div></div>
      </Dialog>}
    </section>
  )
}
