'use client'

import { useLocale } from '../../lib/use-locale'

import type { AdminProject } from '../../types/admin-project'
import { Icon } from './Icon'
import { ProjectDragHandle } from './ProjectDragHandle'

const actionClass = 'inline-flex min-h-10 items-center justify-center gap-1.5 rounded-md border border-zinc-200 bg-white px-3 text-xs font-medium text-zinc-600 hover:border-zinc-300 hover:bg-zinc-50 hover:text-zinc-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900 disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:border-zinc-200 disabled:hover:bg-white'

export function AdminProjectCard({ project, canMoveUp, canMoveDown, reorderDisabled, crudDisabled, dragging, dropTarget, onEdit, onDelete, onMove, onDrop, onDragChange }: {
  project: AdminProject
  canMoveUp: boolean
  canMoveDown: boolean
  reorderDisabled: boolean
  crudDisabled: boolean
  dragging: boolean
  dropTarget: boolean
  onEdit: () => void
  onDelete: () => void
  onMove: (direction: -1 | 1) => void
  onDrop: (targetId: string) => void
  onDragChange: (targetId: string | null, active: boolean) => void
}) {
  const { t } = useLocale()
  const links = [
    { label: 'GitHub', href: project.githubUrl },
    { label: 'Website', href: project.productionUrl },
    ...(project.telegramUrl ? [{ label: 'Telegram', href: project.telegramUrl }] : []),
  ]

  return (
    <li data-project-id={project.id} className={`border-b border-zinc-200 p-4 last:border-b-0 sm:p-5 ${dropTarget ? 'bg-zinc-50 ring-2 ring-zinc-300 ring-inset' : ''} ${dragging ? 'opacity-60' : ''}`}>
      <article aria-label={project.title} className="grid grid-cols-[64px_minmax(0,1fr)] items-start gap-x-4 gap-y-4 sm:grid-cols-[88px_minmax(0,1fr)] xl:grid-cols-[88px_minmax(0,1fr)_auto]">
        <div>
          <div className="aspect-[4/3] overflow-hidden rounded-md border border-zinc-200 bg-zinc-100">
            {project.previewUrl ? <img src={project.previewUrl} alt="" loading="lazy" className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center text-zinc-400"><Icon name="folder" className="h-6 w-6" /></div>}
          </div>
          <p className="mt-2 text-center font-mono text-[10px] text-zinc-500">{t("Position")}{' '}{project.position}</p>
        </div>

        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
            <h2 className="min-w-0 text-sm font-semibold tracking-tight [overflow-wrap:anywhere] text-zinc-900 sm:text-[15px]">{project.title}</h2>
            <span className={`inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[10px] font-medium ${project.visible ? 'bg-emerald-50 text-emerald-700' : 'bg-zinc-100 text-zinc-500'}`}>
              <span aria-hidden="true" className={`h-1.5 w-1.5 rounded-full ${project.visible ? 'bg-emerald-600' : 'border border-zinc-400'}`} />{project.visible ? t("Published") : t("Hidden")}
            </span>
          </div>
          <p className="mt-1 text-[10px] tracking-wide text-zinc-500 [overflow-wrap:anywhere]">{project.category}</p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {project.technologies.map((technology) => <span key={technology} className="max-w-full rounded border border-zinc-200 bg-zinc-50 px-1.5 py-0.5 text-[10px] [overflow-wrap:anywhere] text-zinc-500">{technology}</span>)}
          </div>
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2">
            {links.map((link) => link.href ? (
              <a key={t(link.label)} href={link.href} target="_blank" rel="noopener noreferrer" aria-label={t("Open {0} {1}", [project.title, t(link.label)])} className="inline-flex items-center gap-1 text-[11px] font-medium text-zinc-600 hover:text-zinc-950 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900">{t(link.label)}<Icon name="external" className="h-3 w-3" /></a>
            ) : <span key={t(link.label)} className="text-[11px] text-zinc-500" title={t("No {0} linked", [t(link.label)])}>{t(link.label)} —</span>)}
          </div>
        </div>

        <div className="col-span-2 flex flex-wrap items-center justify-between gap-3 border-t border-zinc-100 pt-3 xl:col-span-1 xl:flex-col xl:items-end xl:border-0 xl:pt-0">
          <div className="flex gap-2">
            <button type="button" onClick={onEdit} disabled={crudDisabled} aria-label={t("Edit {0}", [project.title])} title={crudDisabled ? t("Save or Reset the current order first") : undefined} className={actionClass}><Icon name="edit" className="h-3.5 w-3.5" />{t("Edit")}</button>
            <button type="button" onClick={onDelete} disabled={crudDisabled} aria-label={t("Delete {0}", [project.title])} title={crudDisabled ? t("Save or Reset the current order first") : undefined} className={`${actionClass} hover:text-red-600`}><Icon name="trash" className="h-3.5 w-3.5" />{t("Delete")}</button>
          </div>
          <div className="flex gap-1.5">
            <ProjectDragHandle id={project.id} title={project.title} disabled={reorderDisabled} onDrop={onDrop} onMove={onMove} onDragChange={onDragChange} />
            <button type="button" onClick={() => onMove(-1)} disabled={!canMoveUp || reorderDisabled} aria-label={t("Move {0} up", [project.title])} title={t("Move up · Save order to persist")} className={`${actionClass} w-10 px-0`}><Icon name="arrowUp" className="h-3.5 w-3.5" /></button>
            <button type="button" onClick={() => onMove(1)} disabled={!canMoveDown || reorderDisabled} aria-label={t("Move {0} down", [project.title])} title={t("Move down · Save order to persist")} className={`${actionClass} w-10 px-0`}><Icon name="arrowDown" className="h-3.5 w-3.5" /></button>
          </div>
        </div>
      </article>
    </li>
  )
}
