'use client'

import { useRef, type PointerEvent } from 'react'
import { Icon } from './Icon'

export function ProjectDragHandle({ id, title, disabled, onDrop, onMove, onDragChange }: {
  id: string
  title: string
  disabled: boolean
  onDrop: (targetId: string) => void
  onMove: (direction: -1 | 1) => void
  onDragChange: (targetId: string | null, active: boolean) => void
}) {
  const drag = useRef<{ x: number; y: number; active: boolean; target: string | null } | null>(null)

  function cancel() {
    drag.current = null
    onDragChange(null, false)
  }

  function move(event: PointerEvent<HTMLButtonElement>) {
    const current = drag.current
    if (!current || disabled) return
    if (!current.active && Math.hypot(event.clientX - current.x, event.clientY - current.y) < 6) return
    current.active = true
    const list = event.currentTarget.closest('ul')
    const row = document.elementFromPoint(event.clientX, event.clientY)?.closest<HTMLElement>('[data-project-id]')
    current.target = row && list?.contains(row) ? row.dataset.projectId ?? null : null
    onDragChange(current.target, true)
    // Scroll only while deliberately dragging by the handle. Touch scrolling
    // elsewhere on the row and the accessible button fallback remain available.
    if (event.clientY < 48) window.scrollBy({ top: -24, behavior: 'instant' })
    else if (event.clientY > window.innerHeight - 48) window.scrollBy({ top: 24, behavior: 'instant' })
  }

  return (
    <button type="button" data-drag-handle={id} disabled={disabled}
      aria-label={`Drag to reorder ${title}`} aria-describedby="project-order-instructions"
      title="Drag to reorder · Arrow Up/Down also move this project"
      className="inline-flex h-9 w-9 shrink-0 touch-none items-center justify-center rounded-md border border-zinc-200 bg-white text-zinc-500 select-none enabled:cursor-grab enabled:hover:bg-zinc-50 enabled:active:cursor-grabbing focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900 disabled:cursor-not-allowed disabled:opacity-30"
      onPointerDown={(event) => {
        if (disabled || event.button !== 0) return
        event.currentTarget.focus()
        event.currentTarget.setPointerCapture(event.pointerId)
        drag.current = { x: event.clientX, y: event.clientY, active: false, target: null }
      }}
      onPointerMove={move}
      onPointerUp={(event) => {
        const current = drag.current
        cancel()
        if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId)
        if (!disabled && current?.active && current.target && current.target !== id) onDrop(current.target)
      }}
      onPointerCancel={cancel} onLostPointerCapture={cancel}
      onKeyDown={(event) => {
        if (event.key === 'Escape') cancel()
        if (!disabled && (event.key === 'ArrowUp' || event.key === 'ArrowDown')) {
          event.preventDefault()
          onMove(event.key === 'ArrowUp' ? -1 : 1)
        }
      }}>
      <Icon name="grip" className="h-4 w-4" />
    </button>
  )
}
