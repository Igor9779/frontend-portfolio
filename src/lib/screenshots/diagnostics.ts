import 'server-only'

import type { ScreenshotErrorCode } from './errors'

export type ScreenshotStage = 'module-load' | 'authorization' | 'request' | 'url-policy' | 'dns'
  | 'proxy-start' | 'proxy-connection' | 'browser-executable' | 'browser-launch' | 'browser-context'
  | 'network-setup' | 'navigation' | 'redirect' | 'page-readiness' | 'screenshot' | 'output' | 'response'

const events: Record<ScreenshotStage, string> = {
  'module-load': 'SCREENSHOT_MODULE_LOAD_FAILED', authorization: 'SCREENSHOT_AUTHORIZATION_FAILED',
  request: 'SCREENSHOT_REQUEST_FAILED', 'url-policy': 'SCREENSHOT_URL_REJECTED', dns: 'SCREENSHOT_DNS_FAILED',
  'proxy-start': 'SCREENSHOT_PROXY_START_FAILED', 'proxy-connection': 'SCREENSHOT_PROXY_FAILED',
  'browser-executable': 'SCREENSHOT_BROWSER_EXECUTABLE_FAILED', 'browser-launch': 'SCREENSHOT_BROWSER_LAUNCH_FAILED',
  'browser-context': 'SCREENSHOT_BROWSER_CONTEXT_FAILED', 'network-setup': 'SCREENSHOT_NETWORK_SETUP_FAILED',
  navigation: 'SCREENSHOT_NAVIGATION_FAILED', redirect: 'SCREENSHOT_REDIRECT_REJECTED',
  'page-readiness': 'SCREENSHOT_READINESS_FAILED', screenshot: 'SCREENSHOT_GENERATION_FAILED',
  output: 'SCREENSHOT_OUTPUT_INVALID', response: 'SCREENSHOT_RESPONSE_FAILED',
}

const reasons = [
  'UNAVAILABLE', 'TLS_FAILED', 'CONNECT_REJECTED', 'CONNECT_DNS_FAILED', 'CONNECT_UPSTREAM_FAILED',
  'CONNECT_REMOTE_ADDRESS_REJECTED', 'CONNECT_TIMEOUT', 'PROXY_CONNECTION_CLOSED',
  'MAIN_DOCUMENT_REQUEST_FAILED', 'MAIN_DOCUMENT_HTTP_ERROR', 'MAIN_DOCUMENT_INVALID_CONTENT',
  'REQUEST_INTERCEPTION_FAILED', 'RESPONSE_INTERCEPTION_FAILED', 'RESPONSE_STATUS_INVALID',
  'REDIRECT_REJECTED', 'PAGE_GOTO_FAILED', 'NAVIGATION_TIMEOUT', 'TARGET_CLOSED',
] as const
export type ScreenshotReason = typeof reasons[number]

const modules = ['capture', 'chromium', 'network', 'proxy', 'policy', 'dns', 'node-builtins', '@sparticuz/chromium', 'playwright-core', 'ipaddr.js', 'tar-fs'] as const
const categories = ['MODULE_NOT_FOUND', 'PACKAGE_ASSET_MISSING', 'NATIVE_LOAD_FAILED', 'INCOMPATIBLE_RUNTIME', 'MODULE_FORMAT_ERROR', 'CHUNK_LOAD_FAILED', 'IMPORT_EVALUATION_FAILED'] as const
export type ScreenshotModule = typeof modules[number]
export type ScreenshotModuleFailure = { module: ScreenshotModule; category: typeof categories[number] }

// Inspect only to classify. Never emit the exception message, stack or path.
export function classifyScreenshotModule(error: unknown, fallback: ScreenshotModule): ScreenshotModuleFailure {
  const text = error instanceof Error ? error.message : ''
  const code = error instanceof Error && 'code' in error ? error.code : undefined
  const module = (['@sparticuz/chromium', 'playwright-core', 'ipaddr.js', 'tar-fs'] as const).find(name => text.includes(name)) ?? fallback
  const category = /browsers\.json|chromium\.br|fonts\.tar\.br|al2023\.tar\.br|swiftshader\.tar\.br/.test(text)
    && (code === 'ENOENT' || /Cannot find|does not exist|no such file/i.test(text)) ? 'PACKAGE_ASSET_MISSING'
    : /Loading chunk|ChunkLoadError|Cannot find.*chunks\//.test(text) ? 'CHUNK_LOAD_FAILED'
    : ['MODULE_NOT_FOUND', 'ERR_MODULE_NOT_FOUND', 'ERR_PACKAGE_PATH_NOT_EXPORTED'].includes(String(code)) || /Cannot find (?:module|package)/.test(text) ? 'MODULE_NOT_FOUND'
    : code === 'ERR_DLOPEN_FAILED' || /invalid ELF|wrong ELF|shared object|NODE_MODULE_VERSION/.test(text) ? 'NATIVE_LOAD_FAILED'
    : /requires Node\.js|Unsupported.*Node/i.test(text) ? 'INCOMPATIBLE_RUNTIME'
    : ['ERR_REQUIRE_ESM', 'ERR_REQUIRE_ASYNC_MODULE', 'ERR_UNKNOWN_FILE_EXTENSION'].includes(String(code)) ? 'MODULE_FORMAT_ERROR'
    : 'IMPORT_EVALUATION_FAILED'
  return { module, category }
}

export function classifyScreenshotReason(error: unknown, fallback: ScreenshotReason = 'UNAVAILABLE'): ScreenshotReason {
  if (error instanceof Error && 'reason' in error && reasons.includes(error.reason as ScreenshotReason)) return error.reason as ScreenshotReason
  const text = error instanceof Error ? error.message : ''
  if (/net::ERR_CERT_|net::ERR_SSL_/.test(text)) return 'TLS_FAILED'
  if (/net::ERR_TUNNEL_CONNECTION_FAILED|net::ERR_PROXY_CONNECTION_FAILED|net::ERR_CONNECTION_CLOSED|net::ERR_CONNECTION_RESET/.test(text)) return 'PROXY_CONNECTION_CLOSED'
  if (/net::ERR_NAME_NOT_RESOLVED/.test(text)) return 'CONNECT_DNS_FAILED'
  if (/Fetch\.continueResponse.*Invalid http status code or phrase/.test(text)) return 'RESPONSE_STATUS_INVALID'
  if (/Target.*closed|has been closed|Target crashed/i.test(text)) return 'TARGET_CLOSED'
  if (/net::ERR_TIMED_OUT/.test(text) || (error instanceof Error && error.name === 'TimeoutError')) return 'NAVIGATION_TIMEOUT'
  return fallback
}

// Never serialize an Error, URL, header, executable path or environment. Only
// enum values and a bounded numeric HTTP status can log. CDP/transport errors
// are classified before wrapping, so their safe reason survives normalization.
export function screenshotDiagnostic(stage: ScreenshotStage, code: ScreenshotErrorCode, error?: unknown) {
  const reason = classifyScreenshotReason(error)
  const status = error instanceof Error && 'httpStatus' in error ? error.httpStatus : undefined
  const httpStatus = typeof status === 'number' && Number.isInteger(status) && status >= 100 && status <= 599 ? status : undefined
  const failure = error instanceof Error && 'moduleFailure' in error ? error.moduleFailure as ScreenshotModuleFailure | undefined : undefined
  const moduleDetails = stage === 'module-load' && failure && modules.includes(failure.module) && categories.includes(failure.category)
    ? { module: failure.module, category: failure.category } : undefined
  console.warn(code === 'timeout' ? 'SCREENSHOT_TIMEOUT' : events[stage], { stage, code, reason,
    ...(httpStatus === undefined ? {} : { httpStatus }), ...(moduleDetails ?? {}) })
}
