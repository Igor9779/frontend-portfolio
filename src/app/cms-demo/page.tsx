import type { Metadata } from 'next'
import { connection } from 'next/server'
import { getDemoProjects } from '../../lib/projects'
import { CmsDemo } from '../../components/demo/CmsDemo'
import { Icon } from '../../components/admin/Icon'

export const metadata: Metadata = {
  title: 'Portfolio CMS Demo — Igor Bondarenko',
  robots: { index: false, follow: false },
}

export default async function CmsDemoPage() {
  await connection()
  const projects = await getDemoProjects()
  return (
    <div className="min-h-screen bg-[#f8f9fa] text-zinc-900">
      <header className="border-b border-zinc-200 bg-white"><div className="mx-auto flex max-w-[1600px] flex-wrap items-center justify-between gap-3 px-5 py-4 sm:px-8">
        <div className="flex items-center gap-3"><span aria-hidden="true" className="flex h-8 w-8 items-center justify-center rounded-md bg-zinc-900 text-sm font-semibold text-white">P</span><span className="text-sm font-semibold tracking-tight">Portfolio CMS</span></div>
        <a href="/" className="inline-flex min-h-9 items-center gap-2 rounded-md px-2 text-xs font-medium text-zinc-600 hover:bg-zinc-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900"><Icon name="arrowUp" className="h-3 w-3 -rotate-90" />Back to portfolio</a>
      </div></header>
      <div className="mx-auto flex min-h-[calc(100dvh-73px)] max-w-[1600px] flex-col md:flex-row">
        <aside className="border-b border-zinc-200 bg-[#fafafa] p-4 md:w-48 md:shrink-0 md:border-r md:border-b-0 md:p-5"><nav aria-label="Demo navigation"><a href="/cms-demo" aria-current="page" className="flex min-h-10 items-center gap-2.5 rounded-md bg-zinc-200/60 px-3 text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900"><Icon name="folder" />Projects</a></nav></aside>
        <main className="min-w-0 flex-1 px-5 py-8 sm:px-8 lg:px-12 lg:py-10"><CmsDemo initialProjects={projects} /></main>
      </div>
    </div>
  )
}
