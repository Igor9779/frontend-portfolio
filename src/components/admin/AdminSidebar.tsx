'use client'

import { useLocale } from '../../lib/use-locale'
import { Icon } from './Icon'

export function AdminSidebar() {
  const { t } = useLocale()
  return (
    <aside className="border-b border-zinc-200 bg-[#fafafa] p-4 md:w-48 md:shrink-0 md:border-r md:border-b-0 md:p-5">
      <p className="mb-4 hidden px-3 text-[10px] font-semibold tracking-[0.14em] text-zinc-500 uppercase md:block">{t("Workspace")}</p>
      <nav aria-label={t("CMS navigation")} className="flex gap-2 md:flex-col">
        <a href="/admin" aria-current="page" className="flex min-h-10 items-center gap-2.5 rounded-md bg-zinc-200/60 px-3 text-sm font-medium text-zinc-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900">
          <Icon name="folder" />{' '}{t("Projects")}</a>
        <a href="/cms-demo" className="flex min-h-10 items-center gap-2.5 rounded-md px-3 text-sm text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900">
          <Icon name="grid" />{' '}{t("CMS Demo")}</a>
      </nav>
    </aside>
  )
}
