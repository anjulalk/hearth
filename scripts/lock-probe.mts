// A temporary diagnostic. Two questions: does a real, headed browser grant the
// screen wake lock, and why is the service worker not activating. Deleted once
// answered.
import { chromium } from '@playwright/test'

const SITE = process.env.SITE_URL ?? 'https://hearth.anjula.dev'

async function lockProbe(headless: boolean): Promise<void> {
  const browser = await chromium.launch({ headless })
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } })
  const errors: string[] = []
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text())
  })
  page.on('pageerror', (error) => errors.push(error.message))

  await page.goto(SITE, { waitUntil: 'load' })
  const direct = await page.evaluate(async () => {
    try {
      const sentinel = await navigator.wakeLock.request('screen')
      return { ok: true, released: sentinel.released, visibility: document.visibilityState }
    } catch (error) {
      return {
        ok: false,
        name: (error as DOMException).name,
        message: (error as Error).message,
        visibility: document.visibilityState,
      }
    }
  })
  console.log(`${headless ? 'headless' : 'headed  '} direct request: ${JSON.stringify(direct)}`)

  await page.getByRole('button', { name: 'Start keeping the screen on' }).click()
  await page.locator('.stage').waitFor()
  await page.waitForTimeout(2500)
  console.log(`${headless ? 'headless' : 'headed  '} after Start:    "${await page.title()}"`)
  if (errors.length > 0) console.log(`  console: ${errors.join(' | ')}`)
  await browser.close()
}

await lockProbe(true)
await lockProbe(false)

const browser = await chromium.launch()
const page = await browser.newPage()
page.on('console', (message) => console.log(`  page[${message.type()}] ${message.text()}`))
await page.goto(SITE, { waitUntil: 'load' })
await page.evaluate(() => {
  navigator.serviceWorker?.addEventListener('message', (event) => console.log('sw message', event.data))
})
for (const round of [0, 1, 2]) {
  await page.waitForTimeout(3000)
  const info = await page.evaluate(async () => {
    const registration = await navigator.serviceWorker.getRegistration()
    return {
      installing: registration?.installing?.state ?? null,
      waiting: registration?.waiting?.state ?? null,
      active: registration?.active?.state ?? null,
      controller: navigator.serviceWorker.controller?.state ?? null,
      caches: await caches.keys(),
    }
  })
  console.log(`service worker after ${(round + 1) * 3}s: ${JSON.stringify(info)}`)
  if (round === 0) await page.reload({ waitUntil: 'load' })
}
await browser.close()
