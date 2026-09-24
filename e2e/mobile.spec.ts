import { expect, test } from '@playwright/test'
import { openPanel, startWatch } from './helpers'

test('the panel fits a phone without sideways scrolling', async ({ page }) => {
  await openPanel(page, { stub: true })
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()

  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  )
  expect(overflow).toBeLessThanOrEqual(1)

  // One column, and every control reachable.
  await expect(page.getByRole('button', { name: 'Start keeping the screen on' })).toBeVisible()
  await expect(page.locator('.mode-tile')).toHaveCount(5)
  await expect(page).toHaveScreenshot('mobile-panel.png', { fullPage: true })
})

test('the stage fills a phone', async ({ page }) => {
  await openPanel(page, { stub: true })
  await startWatch(page)
  await expect(page.locator('.ss-time')).toContainText('21:04')
  await expect(page).toHaveScreenshot('mobile-stage.png')
})
