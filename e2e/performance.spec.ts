import { expect, test } from '@playwright/test'
import { openPanel, startWatch } from './helpers'

/**
 * The app makes two promises. One is that the screen stays on, which the rest of
 * the suite checks. The other is that holding it costs almost nothing, which is
 * this file: no animation frame loop, no polling, no work per frame. The stage
 * is CSS animations the compositor owns, and the only timer is the one the mode
 * asks for.
 */
test('costs almost nothing while it holds the screen on', async ({ page }) => {
  await openPanel(page, { stub: true, clock: 'fixed' })
  await startWatch(page)

  const client = await page.context().newCDPSession(page)
  await client.send('Performance.enable')
  const read = async (name: string): Promise<number> => {
    const { metrics } = await client.send('Performance.getMetrics')
    return metrics.find((metric) => metric.name === name)?.value ?? 0
  }

  await page.evaluate(() => {
    const counter = window as unknown as { __mutations: number }
    counter.__mutations = 0
    const observer = new MutationObserver((records) => {
      counter.__mutations += records.length
    })
    observer.observe(document.body, {
      subtree: true,
      childList: true,
      characterData: true,
      attributes: true,
    })
  })

  const scriptBefore = await read('ScriptDuration')
  await page.waitForTimeout(4000)
  const scripted = (await read('ScriptDuration')) - scriptBefore
  const mutations = await page.evaluate(
    () => (window as unknown as { __mutations: number }).__mutations,
  )

  // Four seconds of a running screensaver. A frame loop would show up in both
  // numbers: hundreds of callbacks and a good fraction of a second of script.
  expect(scripted).toBeLessThan(0.4)
  expect(mutations).toBeLessThan(30)

  console.log(`4s of stage: ${scripted.toFixed(3)}s of script, ${mutations} mutations`)
})
