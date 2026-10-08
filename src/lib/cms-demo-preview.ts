import { museDemoFixture } from './cms-demo-fixtures'
import { validatePreviewFile } from './preview-file'

let cached: Promise<Blob> | null = null
const fixtureFiles = new WeakMap<File, string>()

// The only demo fetch: one fixed, bundled, same-origin asset. No user URL or
// repository/production URL can reach this transport. Warm it on workspace load
// so import/retake use cached bytes, including offline after initial asset load.
function loadPreviewAsset(): Promise<Blob> {
  if (!cached) cached = (async () => {
    const response = await fetch(museDemoFixture.previewAsset, {
      credentials: 'omit', redirect: 'error', cache: 'force-cache', signal: AbortSignal.timeout(5000),
    })
    if (!response.ok || response.headers.get('content-type')?.split(';')[0] !== 'image/jpeg') throw new Error('Sample preview unavailable')
    const blob = await response.blob()
    const validated = await validatePreviewFile(new File([blob], 'muse-demo-preview.jpg', { type: 'image/jpeg' }))
    if (!validated.success) throw new Error('Sample preview unavailable')
    return blob
  })().catch(error => { cached = null; throw error })
  return cached
}

export function warmDemoPreview() { void loadPreviewAsset().catch(() => {}) }

export async function createDemoPreview(): Promise<File> {
  const file = new File([await loadPreviewAsset()], 'muse-demo-preview.jpg', { type: 'image/jpeg' })
  fixtureFiles.set(file, museDemoFixture.previewAsset)
  return file
}

// Identity, not a browser-provided filename, identifies an authored sample.
// Saved samples retain their stable local path; manual files retain blob UX.
export function demoPreviewAsset(file: File): string | null { return fixtureFiles.get(file) ?? null }
