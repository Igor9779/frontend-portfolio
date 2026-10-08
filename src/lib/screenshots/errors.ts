import 'server-only'
import type { ScreenshotModuleFailure, ScreenshotReason, ScreenshotStage } from './diagnostics'

export type ScreenshotErrorCode = 'invalid' | 'unsupported' | 'unsafe' | 'dns' | 'redirect' | 'timeout' | 'unavailable' | 'too-large' | 'busy'

const messages: Record<ScreenshotErrorCode, string> = {
  invalid: 'Enter a valid HTTPS Production URL.',
  unsupported: 'Automatic previews support Vercel, Netlify, Cloudflare Pages and GitHub Pages. Choose a file for this site.',
  unsafe: 'This URL is unavailable for automatic capture. Choose a preview file instead.',
  dns: 'Unable to resolve this site safely. Choose a file or try again later.',
  redirect: 'This site redirects outside the supported capture policy. Choose a preview file instead.',
  timeout: 'Screenshot capture timed out. The current preview is unchanged.',
  unavailable: 'Unable to capture this site. Choose a file or try again later.',
  'too-large': 'The screenshot is too large. Choose a preview file instead.',
  busy: 'A screenshot is already running. Please try again shortly.',
}

export class ScreenshotError extends Error {
  readonly code: ScreenshotErrorCode
  readonly stage?: ScreenshotStage
  readonly reason?: ScreenshotReason
  readonly httpStatus?: number
  readonly moduleFailure?: ScreenshotModuleFailure
  constructor(code: ScreenshotErrorCode, stage?: ScreenshotStage, reason?: ScreenshotReason, httpStatus?: number, moduleFailure?: ScreenshotModuleFailure) {
    super(messages[code])
    this.name = 'ScreenshotError'
    this.code = code
    this.stage = stage
    this.reason = reason
    this.httpStatus = httpStatus
    this.moduleFailure = moduleFailure
  }
}

export function screenshotFailure(error: unknown) {
  const safe = error instanceof ScreenshotError ? error : new ScreenshotError('unavailable')
  return { code: safe.code, message: safe.message }
}
