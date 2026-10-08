import 'server-only'

import { access } from 'node:fs/promises'
import { constants } from 'node:fs'
import { homedir } from 'node:os'
import { dirname, join } from 'node:path'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { ScreenshotError } from './errors'

const run = promisify(execFile)
const minimumMajor = 153 // Matches the pinned production Chromium/Playwright pair.

async function inspect(path: string) {
  try {
    await access(path, constants.X_OK)
    // Read installed app metadata without launching/downloading a browser.
    const { stdout } = await run('/usr/libexec/PlistBuddy', ['-c', 'Print :CFBundleShortVersionString', join(dirname(dirname(path)), 'Info.plist')], {
      timeout: 1000, maxBuffer: 1024, env: { PATH: '/usr/bin:/bin', NODE_ENV: 'development' },
    })
    const version = /^([0-9]{1,4})(?:[.][0-9]+)+$/.exec(stdout.trim())
    return version ? Number(version[1]) : null
  } catch { return null }
}

export async function resolveLocalChromium(expectedPath: string, dependencies = { inspect, home: homedir() }) {
  const candidates = [expectedPath,
    ...['/Applications', join(dependencies.home, 'Applications')].flatMap(directory => [
      join(directory, 'Google Chrome.app/Contents/MacOS/Google Chrome'),
      join(directory, 'Chromium.app/Contents/MacOS/Chromium'),
    ]),
  ]
  for (const path of [...new Set(candidates)]) {
    const major = await dependencies.inspect(path)
    if (major !== null && major >= minimumMajor) return path
  }
  throw new ScreenshotError('unavailable', 'browser-executable')
}
