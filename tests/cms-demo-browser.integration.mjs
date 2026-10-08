// Explicit local UI verification, outside the normal mocked test suite.
// Start localhost:3000, then: node --test tests/cms-demo-browser.integration.mjs
// Only localhost requests are allowed. No admin session or provider is used.
import assert from 'node:assert/strict'
import { after, test } from 'node:test'
import { readFileSync } from 'node:fs'
import { chromium } from 'playwright-core'

const origin = process.env.PORTFOLIO_QA_ORIGIN ?? 'http://localhost:3000'
assert.equal(new URL(origin).hostname, 'localhost')
const seedTitles = ['AI Radar', 'Deutsch Word App', 'Domens Tools']
const muse = 'MUSE — AI Creator Showcase'
const browser = await chromium.launch({
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true,
  env: { PATH: process.env.PATH ?? '', TMPDIR: '/private/tmp' },
})

after(async () => { await browser.close() })
for (const width of [320, 375, 768, 1024, 1440]) test(`anonymous demo workflow at ${width}px stays local and restores its seed`, async () => {
    const context = await browser.newContext({ viewport: { width, height: 1000 }, reducedMotion: 'reduce', serviceWorkers: 'block' })
    const forbidden = [], requests = [], errors = []
    await context.route('**/*', route => {
      const request = route.request(), url = new URL(request.url())
      requests.push({ url: request.url(), method: request.method() })
      if (url.origin !== origin || url.pathname.startsWith('/admin') || !['GET', 'HEAD'].includes(request.method())) {
        forbidden.push({ url: request.url(), method: request.method() }); return route.abort()
      }
      return route.continue()
    })
    const page = await context.newPage()
    page.on('pageerror', error => errors.push(error.message))
    page.on('console', message => { if (message.type() === 'error') errors.push(message.text()) })
    const titles = () => page.locator('li[data-project-id] h2').allTextContents()
    const assertTitles = async expected => {
      // Local React action transitions may close a dialog before the list's
      // next commit. Wait for observable list state, not just dialog teardown.
      await page.waitForFunction(value => JSON.stringify(Array.from(document.querySelectorAll('li[data-project-id] h2'), node => node.textContent)) === JSON.stringify(value), expected)
      assert.deepEqual(await titles(), expected)
    }
    const stored = () => page.evaluate(() => JSON.parse(sessionStorage.getItem('portfolio:cms-demo:v1')))
    const assertFits = async () => assert.equal(await page.evaluate(() => {
      const form = document.querySelector('dialog[open]')
      return document.documentElement.scrollWidth <= innerWidth && (!form || form.scrollWidth <= form.clientWidth)
    }), true)
    try {
      assert.deepEqual(await context.cookies(), [])
      await page.goto(origin + '/cms-demo')
      await page.getByRole('button', { name: 'Add project', exact: true }).waitFor()
      await assertTitles(seedTitles); await assertFits()
      await page.getByRole('button', { name: 'Add project', exact: true }).click()
      const dialog = page.getByRole('dialog')
      await page.waitForFunction(() => performance.getEntriesByType('resource').some(entry => entry.name.endsWith('/assets/cms-demo/muse-preview.jpg') && entry.responseEnd > 0))
      // Once page/assets are loaded, even Import and AI run fully offline.
      await context.setOffline(true)
      await page.getByRole('button', { name: 'Use MUSE example' }).focus()
      await page.keyboard.press('Enter')
      assert.equal(await page.getByLabel('GitHub repository', { exact: true }).inputValue(), 'https://github.com/Igor9779/ai-creator')
      await page.getByRole('button', { name: 'Import from GitHub', exact: true }).click()
      await page.getByRole('button', { name: 'Importing…', exact: true }).waitFor()
      await page.getByText('Sample repository imported. Review and edit before saving.', { exact: true }).waitFor()
      assert.equal(await page.getByLabel(/^Title/).inputValue(), 'ai-creator')
      await page.getByText('Sample preview selected. This is a local demo image, not a website capture.', { exact: true }).waitFor()
      assert.equal(await page.getByAltText('Selected preview image').evaluate(image => image.complete && image.naturalWidth > 0), true)
      await page.getByLabel(/^Telegram URL/).fill('https://t.me/demo_example')
      await page.getByLabel('Visible on portfolio').uncheck()
      const selectedBeforeAi = await page.getByAltText('Selected preview image').getAttribute('src')
      await page.getByRole('button', { name: 'Demo AI Auto-fill', exact: true }).click()
      await page.getByRole('button', { name: 'Generating…', exact: true }).waitFor()
      await page.getByText('Sample suggestions applied. Review and edit before saving.', { exact: true }).waitFor()
      assert.equal(await page.getByLabel(/^Title/).inputValue(), muse)
      assert.equal(await page.getByLabel(/^Category/).inputValue(), 'Frontend Showcase')
      assert.match(await page.getByLabel(/^Description/).inputValue(), /no live AI API/)
      assert.equal(await page.getByLabel(/^Production URL/).inputValue(), 'https://muse-ai-creator-showcase.vercel.app/')
      assert.equal(await page.getByLabel(/^Telegram URL/).inputValue(), 'https://t.me/demo_example')
      assert.equal(await page.getByLabel('Visible on portfolio').isChecked(), false)
      assert.equal(await page.getByAltText('Selected preview image').getAttribute('src'), selectedBeforeAi)
      await assertFits()
      // Native picker cancellation must leave the mounted form/preview intact.
      await page.locator('input[type=file]').dispatchEvent('cancel', { bubbles: true })
      assert.equal(await page.getByLabel(/^Title/).inputValue(), muse)
      assert.equal(await page.getByAltText('Selected preview image').getAttribute('src'), selectedBeforeAi)
      await page.locator('input[type=file]').setInputFiles({ name: 'manual.png', mimeType: 'image/png', buffer: readFileSync(new URL('./fixtures/preview.png', import.meta.url)) })
      await page.getByText('manual.png', { exact: true }).waitFor()
      assert.notEqual(await page.getByAltText('Selected preview image').getAttribute('src'), selectedBeforeAi)
      assert.equal(await page.getByLabel(/^Title/).inputValue(), muse)
      // Cached fixture bytes support a simulated Retake without any network.
      await context.setOffline(true)
      await page.getByRole('button', { name: 'Retake sample preview' }).click()
      await page.getByText('Sample preview selected. This is a local demo image, not a website capture.', { exact: true }).waitFor()
      await page.getByText('muse-demo-preview.jpg', { exact: true }).waitFor()
      await context.setOffline(false)
      await dialog.locator('div.overflow-y-auto').evaluate(element => { element.scrollTop = 0 })
      await page.screenshot({ path: `/private/tmp/stage13-${width}.png` })
      // Tab stays inside the dialog and keyboard Save uses the local callback.
      await page.getByRole('button', { name: 'Save project', exact: true }).focus()
      await page.keyboard.press('Tab')
      assert.equal(await dialog.evaluate(element => element.contains(document.activeElement)), true)
      await page.getByRole('button', { name: 'Save project', exact: true }).click()
      await dialog.waitFor({ state: 'hidden' })
      await assertTitles([muse, ...seedTitles])
      let state = await stored()
      assert.equal(state.projects[0].previewUrl, '/assets/cms-demo/muse-preview.jpg')
      assert.deepEqual(state.savedOrder, state.draftOrder)
      assert.equal(JSON.stringify(state).includes('blob:'), false)
      await page.reload(); await page.getByRole('button', { name: 'Add project', exact: true }).waitFor()
      await assertTitles([muse, ...seedTitles])
      assert.equal(await page.locator('li[data-project-id]').first().locator('img').getAttribute('src'), '/assets/cms-demo/muse-preview.jpg')
      await page.getByRole('button', { name: `Move ${muse} down`, exact: true }).click()
      assert.equal(await page.getByRole('button', { name: 'Add project', exact: true }).isDisabled(), true)
      await page.getByRole('button', { name: 'Reset order', exact: true }).click()
      await assertTitles([muse, ...seedTitles])
      await page.getByRole('button', { name: `Move ${muse} down`, exact: true }).click()
      await page.getByRole('button', { name: 'Save order', exact: true }).click()
      await assertTitles([seedTitles[0], muse, ...seedTitles.slice(1)])
      await page.getByRole('searchbox', { name: 'Search projects' }).fill('MUSE')
      await page.getByText('Clear search to reorder projects.', { exact: true }).waitFor()
      assert.equal(await page.getByRole('button', { name: `Move ${muse} up`, exact: true }).isDisabled(), true)
      await page.getByRole('searchbox', { name: 'Search projects' }).fill('')
      await page.getByRole('button', { name: `Edit ${muse}`, exact: true }).click()
      await page.getByLabel(/^Title/).fill(muse + ' Demo Edit')
      await page.getByRole('button', { name: 'Save project', exact: true }).click()
      await dialog.waitFor({ state: 'hidden' })
      await assertTitles([seedTitles[0], muse + ' Demo Edit', ...seedTitles.slice(1)])
      await page.getByRole('button', { name: `Delete ${muse} Demo Edit`, exact: true }).click()
      await page.getByRole('button', { name: 'Delete project', exact: true }).click()
      await dialog.waitFor({ state: 'hidden' }); await assertTitles(seedTitles)
      // Reset also restores edits to the original bundled seed.
      await page.getByRole('button', { name: 'Edit AI Radar', exact: true }).click()
      await page.getByLabel(/^Title/).fill('Temporary seed edit')
      await page.getByRole('button', { name: 'Save project', exact: true }).click(); await dialog.waitFor({ state: 'hidden' })
      await page.getByRole('button', { name: 'Reset demo', exact: true }).click()
      await dialog.getByRole('button', { name: 'Reset demo', exact: true }).click(); await dialog.waitFor({ state: 'hidden' })
      await assertTitles(seedTitles); await assertFits()
      state = await stored(); assert.equal(state.projects.length, 3); assert.deepEqual(state.savedOrder, state.draftOrder)
      assert.deepEqual(forbidden, []); assert.deepEqual(errors, [])
      assert.ok(requests.every(request => request.url.startsWith(origin) && ['GET', 'HEAD'].includes(request.method)))
      console.log(JSON.stringify({ width, seedRestored: true, externalRequests: forbidden.length, consoleErrors: errors.length, sameOriginRequests: requests.length }))
    } finally { await context.close() }
})
