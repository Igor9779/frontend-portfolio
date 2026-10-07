import type { Metadata } from 'next'
import { connection } from 'next/server'
import { AdminProjects } from '../../../components/admin/AdminProjects'
import { getAdminProjects } from '../../../lib/projects'

// AI context/provider work is bounded to 45s after authorization; leave room
// for session verification and the response on the deployment platform.
export const maxDuration = 90

export const metadata: Metadata = {
  title: 'Portfolio CMS — Igor Bondarenko',
  robots: { index: false, follow: false },
}

export default async function AdminPage() {
  await connection()
  const projects = await getAdminProjects()
  return <AdminProjects initialProjects={projects} />
}
