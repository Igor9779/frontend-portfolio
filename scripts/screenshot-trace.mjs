import assert from 'node:assert/strict'
import { copyFile, lstat, mkdir, readFile, realpath, symlink } from 'node:fs/promises'
import { dirname, isAbsolute, join, relative, resolve } from 'node:path'

export const requiredScreenshotFiles = [
  ...['package.json', 'build/index.js', 'build/helper.js', 'build/paths.js', 'build/lambdafs.js',
    'bin/chromium.br', 'bin/fonts.tar.br', 'bin/al2023.tar.br', 'bin/swiftshader.tar.br'].map(file => 'node_modules/@sparticuz/chromium/' + file),
  ...['package.json', 'index.js', 'index.mjs', 'lib/bootstrap.js', 'lib/coreBundle.js', 'lib/utilsBundle.js',
    'browsers.json'].map(file => 'node_modules/playwright-core/' + file),
]

export async function screenshotTrace(root) {
  const route = resolve(root, '.next/server/app/admin/screenshot/route.js')
  const trace = route + '.nft.json'
  const read = async path => new Set(JSON.parse(await readFile(path, 'utf8')).files.map(file => resolve(dirname(path), file)))
  const routeFiles = await read(trace)
  const allFiles = new Set([route, ...routeFiles, ...await read(resolve(root, '.next/next-server.js.nft.json'))])
  return { routeFiles, allFiles }
}

export function assertScreenshotTrace(root, routeFiles) {
  // Check the route's own trace: a shared-server trace must not mask an omitted
  // package asset in the Vercel Function. Presence/size alone is insufficient.
  for (const file of requiredScreenshotFiles) assert.ok(routeFiles.has(resolve(root, file)), `Screenshot route trace missing: ${file}`)
  for (const file of routeFiles) {
    assert.ok(!/\/(?:\.env(?:\.[^/]*)?)$/.test(file), 'Environment files must not enter the screenshot trace.')
    assert.ok(!/\/Applications\/|chromium-local|\/tests\//.test(file), 'Development/browser fixture files must not enter the screenshot trace.')
  }
}

export async function copyScreenshotTrace(root, files, destination) {
  const local = path => {
    const name = relative(root, path)
    assert.ok(name !== '..' && !name.startsWith('../') && !isAbsolute(name), 'Traced files must stay within the project root.')
    return join(destination, name)
  }
  for (const file of files) {
    const details = await lstat(file)
    const target = local(file)
    if (details.isSymbolicLink()) {
      // Turbopack generates package aliases under .next/node_modules. Preserve
      // them, pointing ONLY into this isolated traced-file copy.
      const actual = local(await realpath(file))
      await mkdir(dirname(target), { recursive: true })
      await symlink(relative(dirname(target), actual), target)
    } else if (details.isFile()) {
      await mkdir(dirname(target), { recursive: true })
      await copyFile(file, target)
    }
  }
}
