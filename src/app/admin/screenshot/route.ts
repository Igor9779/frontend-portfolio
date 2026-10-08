import { requireAdmin } from '../../../lib/auth'
import { screenshotResponse } from '../../../lib/screenshots/http'
import { loadScreenshotCapture } from '../../../lib/screenshots/module-load'

export const runtime = 'nodejs'
export const maxDuration = 60

export async function POST(request: Request) {
  return screenshotResponse(request, { authorize: requireAdmin, capture: async (url, ownedHosts, signal) => {
    const { captureWebsite } = await loadScreenshotCapture()
    return captureWebsite(url, ownedHosts, signal)
  } })
}
