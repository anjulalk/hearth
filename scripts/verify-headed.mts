// The two things a headless browser cannot check, because Chromium refuses the
// screen wake lock without a window and the mini window is a real second window:
//
//   1. that a normal browser grants the wake lock and the tab says so
//   2. that the mini window opens and holds its own lock, even while the main
//      tab is hidden, which is the whole point of it
//
// Run it by hand after touching awake.ts or mini.ts:
//
//   npm run verify:headed                          (against the live site)
//   SITE_URL=http://127.0.0.1:4173 npm run verify:headed   (against a local build)
//
// It opens a real window on the machine, drives it, prints what it found, and
// exits non-zero when the answer is wrong.
import { chromium } from '@playwright/test'

const SITE = process.env.SITE_URL ?? 'https://hearth.anjula.dev'
const problems: string[] = []
const check = (ok: boolean, message: string): void => {
  console.log(`${ok ? 'ok  ' : 'FAIL'}  ${message}`)
  if (!ok) problems.push(message)
}

const browser = await chromium.launch({ headless: false })
const page = await browser.newPage({ viewport: { width: 1100, height: 800 } })

try {
  await page.goto(SITE, { waitUntil: 'load' })
  await page.getByRole('button', { name: 'Start keeping the screen on' }).click()
  await page.locator('.stage').waitFor()
  await page.waitForFunction(() => document.title.includes('hearth'))
  const title = await page.title()
  check(title.startsWith('screen lock held'), `the wake lock is held (title: ${title})`)

  const supported = await page.evaluate(() => 'documentPictureInPicture' in window)
  if (!supported) {
    console.log('skip  this browser has no document picture-in-picture')
  } else {
    await page.mouse.move(550, 400)
    await page.mouse.move(551, 402)
    await page.locator('.stage-bar.is-visible').waitFor()
    await page.getByRole('button', { name: 'Mini window' }).click()
    await page.waitForFunction(
      () =>
        (
          window as unknown as {
            documentPictureInPicture?: { window: Window | null }
          }
        ).documentPictureInPicture?.window?.document.querySelector('.mini-status') !== null,
      undefined,
      { timeout: 10_000 },
    )

    const readMini = (): Promise<{ status: string | null; level: string | null }> =>
      page.evaluate(() => {
        const pip = (
          window as unknown as { documentPictureInPicture?: { window: Window | null } }
        ).documentPictureInPicture?.window
        const status = pip?.document.querySelector('.mini-status')
        return {
          status: status?.textContent?.trim() ?? null,
          level: status?.getAttribute('data-level') ?? null,
        }
      })

    const open = await readMini()
    check(open.level === 'screen', `the mini window holds its own lock (${open.status})`)

    // The state that costs the main tab its lock.
    await page.evaluate(() => {
      Object.defineProperty(document, 'visibilityState', { get: () => 'hidden', configurable: true })
      document.dispatchEvent(new Event('visibilitychange'))
    })
    await page.waitForTimeout(2000)
    const hidden = await readMini()
    check(hidden.level === 'screen', `the mini window still holds it while the tab is hidden (${hidden.status})`)
  }
} catch (error) {
  problems.push(error instanceof Error ? error.message : String(error))
} finally {
  await browser.close()
}

if (problems.length > 0) {
  console.error('\nThe headed checks did not pass:')
  for (const problem of problems) console.error(`- ${problem}`)
  process.exit(1)
}
console.log('\nThe strong hold works in a real window.')
