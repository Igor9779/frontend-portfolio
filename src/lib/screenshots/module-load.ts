import 'server-only'

import { ScreenshotError } from './errors'
import { classifyScreenshotModule, type ScreenshotModule } from './diagnostics'

// Called only inside the already-authorized capture callback. These probes
// load packages, never resolve DNS, unpack/launch Chromium or capture a site.
export async function loadScreenshotCapture(dependencies = {
  playwright: () => import('playwright-core'),
  chromium: () => import('@sparticuz/chromium'),
  capture: () => import('./capture'),
}, nodeVersion = process.versions.node) {
  const [major = NaN, minor = NaN] = nodeVersion.split('.').map(Number)
  if (!(major >= 24 || (major === 22 && minor >= 17))) {
    throw new ScreenshotError('unavailable', 'module-load', undefined, undefined,
      { module: '@sparticuz/chromium', category: 'INCOMPATIBLE_RUNTIME' })
  }
  async function load<T>(module: ScreenshotModule, operation: () => Promise<T>): Promise<T> {
    try { return await operation() } catch (error) {
      throw new ScreenshotError('unavailable', 'module-load', undefined, undefined, classifyScreenshotModule(error, module))
    }
  }
  await load('playwright-core', dependencies.playwright)
  await load('@sparticuz/chromium', dependencies.chromium)
  return load('capture', dependencies.capture)
}
