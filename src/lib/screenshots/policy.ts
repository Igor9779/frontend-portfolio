import 'server-only'

import ipaddr from 'ipaddr.js'
import { ScreenshotError } from './errors'

const hostingSuffixes = ['vercel.app', 'netlify.app', 'pages.dev', 'github.io']
// Exact resource hosts, never arbitrary third-party URLs or wildcard CDNs.
export const screenshotAssetHosts = ['fonts.googleapis.com', 'fonts.gstatic.com', 'cdn.jsdelivr.net', 'cdnjs.cloudflare.com', 'images.unsplash.com']

export function hostnameIsValid(host: string) {
  return host.length <= 253 && host.includes('.') && !host.endsWith('.')
    && host.split('.').every(label => label.length >= 1 && label.length <= 63 && /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(label))
    && !ipaddr.isValid(host)
}

export function createScreenshotPolicy(ownedHosts: Iterable<string>) {
  const owned = new Set([...ownedHosts].map(host => host.toLowerCase()))
  function parse(input: unknown) {
    if (typeof input !== 'string' || !input || input.length > 2048 || input.includes('\\')
      || [...input].some(character => character.charCodeAt(0) <= 32 || character.charCodeAt(0) === 127)) throw new ScreenshotError('invalid')
    if (!/^https:\/\/[^/]+/i.test(input) || input.split('/')[2]?.includes('@') || /%(?:0[0-9a-f]|1[0-9a-f]|7f)/i.test(input)) throw new ScreenshotError('invalid')
    let url: URL
    try { url = new URL(input) } catch { throw new ScreenshotError('invalid') }
    if (url.protocol !== 'https:' || (url.port && url.port !== '443') || url.username || url.password) throw new ScreenshotError('invalid')
    if (!hostnameIsValid(url.hostname) || owned.has(url.hostname)) throw new ScreenshotError('unsafe')
    return url
  }
  function target(input: unknown) {
    const url = parse(input)
    if (!hostingSuffixes.some(suffix => url.hostname.endsWith('.' + suffix))) throw new ScreenshotError('unsupported')
    return url
  }
  function resource(input: unknown, approved: ReadonlySet<string>) {
    const url = parse(input)
    if (!approved.has(url.hostname)) throw new ScreenshotError('unsafe')
    return url
  }
  return { target, resource }
}

export function normalizedIp(input: string): string | null {
  try {
    let address = ipaddr.parse(input)
    if (address.kind() === 'ipv6' && (address as ipaddr.IPv6).isIPv4MappedAddress()) address = (address as ipaddr.IPv6).toIPv4Address()
    return address.toString()
  } catch { return null }
}

export function publicIp(input: string): string | null {
  try {
    // Zone identifiers are inappropriate for a public Internet destination.
    if (input.includes('%')) return null
    let address = ipaddr.parse(input)
    if (address.kind() === 'ipv6' && (address as ipaddr.IPv6).isIPv4MappedAddress()) address = (address as ipaddr.IPv6).toIPv4Address()
    if (address.range() !== 'unicast') return null
    if (address.kind() === 'ipv6') {
      const ipv6 = address as ipaddr.IPv6
      // Conservative global-unicast allowlist; reject transition/translation
      // forms even when an embedded IPv4 address happens to be public.
      if (!ipv6.match(ipaddr.parse('2000::') as ipaddr.IPv6, 3)) return null
      for (const range of ['2001::/23', '2001:db8::/32', '2002::/16', '3fff::/20']) {
        if (ipv6.match(ipaddr.parseCIDR(range) as [ipaddr.IPv6, number])) return null
      }
    }
    return address.toString()
  } catch { return null }
}
