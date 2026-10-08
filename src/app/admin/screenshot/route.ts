import { requireAdmin } from '../../../lib/auth'
import { screenshotResponse } from '../../../lib/screenshots/http'
import { ScreenshotError } from '../../../lib/screenshots/errors'

export const runtime = 'nodejs'
export const maxDuration = 60

export async function POST(request: Request) {
  return screenshotResponse(request, { authorize: requireAdmin, capture: async (url, ownedHosts, signal) => {
    const { captureWebsite } = await import('../../../lib/screenshots/capture').catch(() => {
      throw new ScreenshotError('unavailable', 'module-load')
    })
    return captureWebsite(url, ownedHosts, signal)
  } })
}
