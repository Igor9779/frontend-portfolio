import type { ReactNode } from 'react'
import { AdminHeader } from '../../components/admin/AdminHeader'
import { AdminSidebar } from '../../components/admin/AdminSidebar'

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-[#f8f9fa] text-zinc-900">
      <AdminHeader />
      <div className="mx-auto flex min-h-[calc(100dvh-73px)] max-w-[1600px] flex-col md:flex-row">
        <AdminSidebar />
        <main className="min-w-0 flex-1 px-5 py-8 sm:px-8 lg:px-12 lg:py-10">{children}</main>
      </div>
    </div>
  )
}
