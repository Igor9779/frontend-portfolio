'use server'

import { revalidatePath } from 'next/cache'
import { unstable_rethrow } from 'next/navigation'
import { requireAdmin } from '../../lib/auth'
import { validateProjectOrder, type ProjectOrderResult } from '../../lib/project-order'

export async function reorderProjects(orderedIds: unknown, expectedOrder: unknown): Promise<ProjectOrderResult> {
  const { supabase } = await requireAdmin()
  const input = validateProjectOrder(orderedIds, expectedOrder)
  if (!input.success) return input

  try {
    const { error } = await supabase.rpc('reorder_projects', {
      ordered_ids: input.orderedIds,
      expected_order: input.expectedOrder,
    }).abortSignal(AbortSignal.timeout(10_000))
    if (error) {
      if (error.code === '22023') {
        return { success: false, stale: true, message: 'Project list or order changed. Reset to the latest saved order and try again.' }
      }
      const code = /^[A-Z0-9]{5,12}$/.test(error.code) ? ` (${error.code})` : ''
      console.error(`Project order save failed${code}.`)
      return { success: false, message: 'Unable to save project order. Please try again.' }
    }
  } catch (error) {
    unstable_rethrow(error)
    console.error('Project order save is unavailable.')
    return { success: false, message: 'Unable to save project order. Please try again.' }
  }

  revalidatePath('/admin')
  revalidatePath('/')
  return { success: true, orderedIds: input.orderedIds }
}
