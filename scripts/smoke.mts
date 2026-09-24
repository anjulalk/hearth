// Shakes hands with the deployed site. The interface tests run against a local
// build; this runs against the real one, over the real domain, with the real
// service worker, which is the only way to catch a CNAME, a header or a cache
// that only exists in production.
//
// Run after a deploy:  npm run smoke
import { chromium } from '@playwright/test'

const SITE = process.env.SITE_URL ?? 'https://hearth.anjula.dev'

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } })

const problems: string[] = []
page.on('pageerror', (error) => problems.push(`page error: ${error.message}`))
page.on('console', (message) => {
  if (message.type() === 'error') problems.push(`console: ${message.text()}`)
})

try {
  const response = await page.goto(`${SITE}/?start=1`, { waitUntil: 'domcontentloaded' })
  console.log(`${response?.status() ?? 'no'} ${SITE}/?start=1`)

  await page.locator('.stage').waitFor({ timeout: 30_000 })
  const title = await page.title()
  const hold = await page.evaluate(() => {
    const video = document.querySelector<HTMLVideoElement>('video[aria-hidden="true"]')
    const stream = video?.srcObject as MediaStream | null
    return {
      video: stream?.getVideoTracks().length ?? 0,
      audio: stream?.getAudioTracks().length ?? 0,
      playing: video ? !video.paused : false,
      wakeLock: 'wakeLock' in navigator,
      background: getComputedStyle(document.querySelector('.stage') as Element).backgroundColor,
    }
  })
  console.log(`title: ${title}`)
  console.log(`stage background: ${hold.background}`)
  console.log(`media stream: ${hold.video} video, ${hold.audio} audio, playing ${hold.playing}`)
  console.log(`screen wake lock available: ${hold.wakeLock}`)

  if (hold.background !== 'rgb(0, 0, 0)') problems.push(`the stage is ${hold.background}, not black`)
  if (hold.video !== 1 || hold.audio !== 1) problems.push('the media stream is missing a track')
  if (!hold.playing) problems.push('the media stream is not playing')
  if (!/· hearth$/.test(title)) problems.push(`the tab title does not report the hold: ${title}`)

  // The bookmark path is the one people use, so it has to work twice.
  const before = await page.evaluate(() => localStorage.getItem('hearth.session'))
  await page.reload({ waitUntil: 'domcontentloaded' })
  await page.locator('.stage').waitFor({ timeout: 30_000 })
  const after = await page.evaluate(() => localStorage.getItem('hearth.session'))
  if (!before || before !== after) problems.push('a reload restarted the watch instead of continuing it')

  const sw = await page.evaluate(async () => {
    const registration = await navigator.serviceWorker.getRegistration()
    return registration?.active?.state ?? null
  })
  if (sw === null) {
    // Registration happens on load, and activation a moment later.
    await page.waitForTimeout(3000)
    const settled = await page.evaluate(async () => {
      const registration = await navigator.serviceWorker.getRegistration()
      return registration?.active?.state ?? null
    })
    console.log(`service worker: ${settled ?? 'not registered'}`)
    if (settled === null) problems.push('the service worker never activated')
  } else {
    console.log(`service worker: ${sw}`)
  }
} catch (error) {
  problems.push(error instanceof Error ? error.message : String(error))
} finally {
  await browser.close()
}

if (problems.length > 0) {
  console.error('\nThe live site did not answer as expected:')
  for (const problem of problems) console.error(`- ${problem}`)
  process.exit(1)
}
console.log('\nThe live site is holding the screen on.')
