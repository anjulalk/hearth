import { expect, test } from '@playwright/test'
import {
  favicon,
  holdLevelFromTitle,
  openPanel,
  showStageBar,
  startWatch,
} from './helpers'

const MODES = [
  { id: 'clock', selector: '.ss-time' },
  { id: 'ember', selector: '.ss-ember' },
  { id: 'stars', selector: '.ss-field' },
  { id: 'agents', selector: '.ss-agents' },
  { id: 'minimal', selector: '.ss-mini-dot' },
]

test.describe('the watch', () => {
  test('starts from the button into a true black stage', async ({ page }) => {
    await openPanel(page)
    await startWatch(page)

    const stage = page.locator('.stage')
    await expect(stage).toHaveCSS('background-color', 'rgb(0, 0, 0)')
    // Nothing on an OLED stage is pure white, and the clock is mono and dim.
    await expect(page.locator('.ss-time')).not.toHaveCSS('color', 'rgb(255, 255, 255)')
    await expect(page.locator('.ss-time')).toContainText('21:04')
    // The browser is asked for the real thing.
    expect(await page.evaluate(() => 'wakeLock' in navigator)).toBe(true)
    // And it does not take the screen: fullscreen is an explicit choice.
    expect(await page.evaluate(() => document.fullscreenElement === null)).toBe(true)
    // The controls stay out of the way until the pointer moves.
    await expect(page.locator('.stage-bar')).not.toHaveClass(/is-visible/)
  })

  test('picks a screensaver from the split button', async ({ page }) => {
    await openPanel(page, { stub: true })
    await startWatch(page)
    await showStageBar(page)

    const split = page.locator('.split')
    await expect(split.locator('.split-main')).toHaveText('Clock')

    await split.getByRole('button', { name: 'Choose a screensaver' }).click()
    await expect(page.getByRole('listbox', { name: 'Screensavers' })).toBeVisible()
    await page.getByRole('option', { name: 'Stars' }).click()
    await expect(page.locator('.ss-field')).toBeVisible()
    await expect(split.locator('.split-main')).toHaveText('Stars')
    await expect(page.getByRole('listbox', { name: 'Screensavers' })).toHaveCount(0)

    // The name half advances without the list.
    await split.locator('.split-main').click()
    await expect(split.locator('.split-main')).toHaveText('Agents')
  })

  test('keeps the regular screen one click away while it runs', async ({ page }) => {
    await openPanel(page, { stub: true })
    await startWatch(page)
    await showStageBar(page)

    await page.getByRole('button', { name: 'Panel', exact: true }).click()
    await expect(page.locator('.stage')).toHaveCount(0)
    await expect(page.getByRole('heading', { name: 'Screen lock held' })).toBeVisible()
    await expect(page.getByText('Kept watch')).toBeVisible()
    await expect(page).toHaveTitle(/· hearth$/)

    await page.getByRole('button', { name: 'Screensaver', exact: true }).click()
    await expect(page.locator('.stage')).toBeVisible()
  })

  test('brings a running watch back after a reload', async ({ page }) => {
    await openPanel(page, { stub: true, keepSession: true })
    await startWatch(page)
    await page.reload()
    await page.locator('.stage').waitFor()
    await expect(page).toHaveTitle(/· hearth$/)
    expect(await page.evaluate(() => localStorage.getItem('hearth.session'))).toBeTruthy()
  })

  test('keeps a media stream alive, with a video and an audio track', async ({ page }) => {
    await openPanel(page)
    await startWatch(page)

    const media = await page.evaluate(() => {
      const video = document.querySelector<HTMLVideoElement>('video[aria-hidden="true"]')
      if (!video) return null
      const stream = video.srcObject as MediaStream | null
      return {
        video: stream?.getVideoTracks().length ?? 0,
        audio: stream?.getAudioTracks().length ?? 0,
        playing: !video.paused,
      }
    })

    // This is the hold that outlives the tab: a live stream the browser counts
    // as playback, which is what keeps the tab out of the background freezer.
    expect(media).not.toBeNull()
    expect(media?.video).toBe(1)
    expect(media?.audio).toBe(1)
    expect(media?.playing).toBe(true)
  })

  test('tells the same story in the tab title and the favicon', async ({ page }) => {
    await openPanel(page)
    await startWatch(page)

    const title = await page.title()
    expect(title).toMatch(/^(Screen lock held|Media hold only|In the background|Weak hold) · hearth$/)

    const svg = await favicon(page)
    expect(svg).toContain('data:image/svg+xml')
    expect(svg).toContain('26241f')

    const level = holdLevelFromTitle(title)
    if (level === 'lit') expect(svg).toContain('stop-opacity="0.55"')
    else if (level === 'dim') expect(svg).toContain('stop-opacity="0.18"')
    else expect(svg).toContain('stop-opacity="0"')
  })

  test('comes back to the panel when the watch is stopped', async ({ page }) => {
    await openPanel(page)
    await startWatch(page)
    await showStageBar(page)
    await page.getByRole('button', { name: 'Stop' }).click()

    await expect(page.locator('.stage')).toHaveCount(0)
    await expect(page.getByText('Not holding the screen on')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Start keeping the screen on' })).toBeVisible()
    // Stopping really stops: the media element and its tracks go with it.
    expect(
      await page.evaluate(() => document.querySelector('video[aria-hidden="true"]') === null),
    ).toBe(true)
  })

  test('starts from a link, and a reload does not restart the clock', async ({ page }) => {
    await openPanel(page, { query: '?start=1', stub: true })
    await page.locator('.stage').waitFor()
    await expect(page).toHaveTitle(/· hearth$/)

    const before = await page.evaluate(() => localStorage.getItem('hearth.session'))
    expect(before).toBeTruthy()
    await page.reload()
    await page.locator('.stage').waitFor()
    expect(await page.evaluate(() => localStorage.getItem('hearth.session'))).toBe(before)
  })

  test('does not come back after it was stopped', async ({ page }) => {
    await openPanel(page, { stub: true })
    await startWatch(page)
    await showStageBar(page)
    await page.getByRole('button', { name: 'Stop' }).click()
    await page.reload()
    await expect(page.locator('.stage')).toHaveCount(0)
    await expect(page.getByText('Not holding the screen on')).toBeVisible()
  })

  test('drives the stage from the keyboard', async ({ page }) => {
    await openPanel(page, { stub: true })
    await startWatch(page)
    await showStageBar(page)

    const bar = page.locator('.stage-bar')
    await expect(bar.locator('.split-main')).toHaveText('Clock')

    await page.keyboard.press('m')
    await expect(bar.locator('.split-main')).toHaveText('Ember')
    await expect(page.locator('.ss-ember')).toBeVisible()

    await page.keyboard.press('d')
    await expect(bar.getByRole('button', { name: 'Dim deep' })).toBeVisible()

    await page.keyboard.press('v')
    await expect(page.locator('.stage')).toHaveCount(0)
    await expect(page.getByRole('heading', { name: 'Screen lock held' })).toBeVisible()

    await page.keyboard.press(' ')
    await expect(page.locator('.stage')).toHaveCount(0)
    await expect(page.getByText('Not holding the screen on')).toBeVisible()
  })

  test('previews a screensaver without holding anything', async ({ page }) => {
    await openPanel(page)
    await page.getByRole('button', { name: 'Preview' }).nth(2).click()

    await expect(page.locator('.stage')).toBeVisible()
    await expect(page.locator('.ss-field')).toBeVisible()
    await expect(page.getByText('Preview only, nothing is being held.')).toBeVisible()
    await expect(page.locator('.ss-meta').last()).toContainText('preview · nothing held')

    await page.mouse.click(200, 800)
    await expect(page.locator('.stage')).toHaveCount(0)
  })

  test('marks the stage when the strong hold is not the one holding', async ({ page }) => {
    await openPanel(page, { stub: 'deny-lock' })
    await startWatch(page)

    // The one thing a person has to be able to see from across the room: the
    // screen lock is not held, and the media stream is doing the work.
    await expect(page.locator('.stage-marks')).toContainText('media hold only')
    await expect(page.locator('.stage-marks [data-level="media"]')).toHaveCSS(
      'color',
      'rgb(211, 180, 92)',
    )
  })

  test('says a weak hold out loud, and stops asking once it cannot help', async ({ page }) => {
    await openPanel(page, { stub: 'deny-lock', prefs: { media: false } })
    await startWatch(page)

    await expect(page.locator('.stage-marks')).toContainText('weak hold')
    // With the media hold switched off, a click would not fix it, so the stage
    // does not ask for one.
    await expect(page.locator('.ss-meta').last()).toContainText('weak hold')
    await expect(page.getByText(/let the quiet audio track start/)).toHaveCount(0)
  })

  test('asks for the lock again when the browser lets it go', async ({ page }) => {
    await openPanel(page, { stub: 'releasable' })
    await startWatch(page)
    await expect(page).toHaveTitle(/^Screen lock held/)

    const requests = (): Promise<number> =>
      page.evaluate(() => (window as unknown as { __wake: { requests: number } }).__wake.requests)
    expect(await requests()).toBe(1)

    // A suspend, a battery saver, or memory pressure can take the lock without
    // the page ever going hidden.
    await page.evaluate(() => {
      const sentinel = (window as unknown as { __sentinel: { release: () => Promise<void> } })
        .__sentinel
      void sentinel.release()
    })

    // The backoff starts at a second, so this waits for the first retry.
    await page.waitForFunction(
      () => (window as unknown as { __wake: { requests: number } }).__wake.requests > 1,
      undefined,
      { timeout: 10_000 },
    )
    await expect(page).toHaveTitle(/^Screen lock held/)
  })

  test('offers the mini window exactly where the browser has it', async ({ page }) => {
    await openPanel(page, { stub: true, prefs: { whileRunning: 'panel' } })
    await page.getByRole('button', { name: 'Start keeping the screen on' }).click()

    const supported = await page.evaluate(() => 'documentPictureInPicture' in window)
    const segment = page
      .getByRole('group', { name: 'What to show while it runs' })
      .getByRole('button', { name: 'Mini window' })
    if (supported) await expect(segment).toBeEnabled()
    else await expect(segment).toBeDisabled()
  })

  test('dims in steps while nobody is there, and wakes on a move', async ({ page }) => {
    await openPanel(page, { stub: true, clock: 'running' })
    await startWatch(page)

    const content = page.locator('.stage-content')
    await expect(content).toHaveClass(/dim-0/)

    // Gentle: the first step is three minutes in, the second at fifteen.
    await page.clock.runFor(3 * 60_000 + 5_000)
    await expect(content).toHaveClass(/dim-1/)
    await page.clock.runFor(12 * 60_000)
    await expect(content).toHaveClass(/dim-2/)

    await page.mouse.move(320, 260)
    await expect(content).toHaveClass(/dim-0/)
  })

  test('shifts the whole stage every two minutes', async ({ page }) => {
    await openPanel(page, { stub: true, clock: 'running', prefs: { pixelShift: true } })
    await startWatch(page)

    const shift = page.locator('.stage-shift')
    const readShift = (): Promise<string> =>
      shift.evaluate((element) => getComputedStyle(element).getPropertyValue('--sx').trim())

    expect(await readShift()).toBe('0px')
    await page.clock.runFor(121_000)
    expect(await readShift()).not.toBe('0px')
  })

  test('says when the audio track is still waiting for a gesture', async ({ page }) => {
    await openPanel(page, { stub: true })
    await startWatch(page)

    // The hint is the app's own claim about the audio context, so it has to
    // agree with what a fresh context does in this browser.
    const suspended = await page.evaluate(() => new AudioContext().state === 'suspended')
    const hint = page.getByText(/let the quiet audio track start/)
    if (suspended) await expect(hint).toBeVisible()
    else await expect(hint).toHaveCount(0)
  })

  for (const mode of MODES) {
    test(`paints the ${mode.id} screensaver black and quiet`, async ({ page }) => {
      await openPanel(page, { query: `?mode=${mode.id}`, stub: true })
      await startWatch(page)

      await expect(page.locator(mode.selector)).toBeVisible()
      await expect(page.locator('.stage')).toHaveCSS('background-color', 'rgb(0, 0, 0)')
      await expect(page).toHaveScreenshot(`stage-${mode.id}.png`)
    })
  }
})
