'use client'

import { useEffect, useRef } from 'react'
import type { ReactNode } from 'react'

export function Dialog({ children, onClose, titleId, descriptionId, compact = false }: {
  children: ReactNode
  onClose: () => void
  titleId: string
  descriptionId: string
  compact?: boolean
}) {
  const dialogRef = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    const previousFocus = document.activeElement
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    dialog.showModal()
    dialog.querySelector<HTMLElement>('[data-dialog-focus]')?.focus()

    return () => {
      dialog.close()
      document.body.style.overflow = previousOverflow
      if (previousFocus instanceof HTMLElement && previousFocus.isConnected) previousFocus.focus()
    }
  }, [])

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      className={`m-auto max-h-[calc(100dvh-32px)] w-[calc(100%-32px)] overflow-hidden rounded-xl border border-zinc-200 bg-white p-0 text-zinc-900 shadow-xl backdrop:bg-zinc-950/35 ${compact ? 'max-w-md' : 'max-w-[720px]'}`}
      onCancel={(event) => { event.preventDefault(); onClose() }}
      onKeyDown={(event) => {
        if (event.key !== 'Tab' || event.ctrlKey || event.altKey || event.metaKey) return
        const controls = Array.from(event.currentTarget.querySelectorAll<HTMLElement>(
          'a[href], button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]',
        )).filter((element) => element.tabIndex >= 0 && element.getClientRects().length > 0)
        const first = controls[0]
        const last = controls.at(-1)
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault()
          last?.focus()
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault()
          first?.focus()
        }
      }}
      onClick={(event) => {
        if (event.target !== event.currentTarget) return
        const bounds = event.currentTarget.getBoundingClientRect()
        if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) onClose()
      }}
    >
      {children}
    </dialog>
  )
}
