import type { Metadata } from 'next'
import { connection } from 'next/server'
import { AdminProjects } from '../../../components/admin/AdminProjects'
import { getAdminProjects } from '../../../lib/projects'

export const metadata: Metadata = {
  title: 'Portfolio CMS — Igor Bondarenko',
  robots: { index: false, follow: false },
}

export default async function AdminPage() {
  await connection()
  const projects = await getAdminProjects()
  return <AdminProjects initialProjects={projects} />
}
