import { expect, test } from '@playwright/test'
import { openPanel } from './helpers'

test.describe('the panel', () => {
  test('says what it is and what it is not holding yet', async ({ page }) => {
    await openPanel(page)
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Keep the screen on')
    await expect(page.getByText('Not holding the screen on')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Start keeping the screen on' })).toBeVisible()
    await expect(page.getByText('Idle', { exact: true })).toBeVisible()
  })

  test('offers every screensaver, with the clock chosen', async ({ page }) => {
    await openPanel(page)
    await expect(page.locator('.mode-tile')).toHaveCount(5)
    for (const name of ['Clock', 'Ember', 'Stars', 'Agents', 'Minimal']) {
      await expect(page.getByRole('button', { name: `Use the ${name} screensaver` })).toBeVisible()
    }
    await expect(page.locator('.mode-tile[data-active="true"]')).toContainText('Clock')
  })

  test('wears the shared design tokens', async ({ page }) => {
    await openPanel(page)

    // Paper, ink and one clay accent, the same values as anjula.dev.
    await expect(page.locator('body')).toHaveCSS('background-color', 'rgb(250, 248, 243)')
    await expect(page.locator('.card').first()).toHaveCSS('background-color', 'rgb(255, 255, 255)')
    await expect(page.locator('h1')).toHaveCSS('font-family', /Source Serif 4/)
    await expect(page.getByRole('button', { name: 'Start keeping the screen on' })).toHaveCSS(
      'background-color',
      'rgb(193, 96, 60)',
    )
    // Compared numbers are mono, so they line up column to column.
    await expect(page.locator('.status-dot').first()).toHaveCSS('background-color', 'rgb(148, 142, 128)')

    const shell = await page.locator('main').boundingBox()
    expect(shell?.width ?? 0).toBeGreaterThan(600)
  })

  test('reads a link that carries a mode and a count', async ({ page }) => {
    await openPanel(page, { query: '?mode=stars&agents=5' })
    await expect(page.locator('.mode-tile[data-active="true"]')).toContainText('Stars')
    await expect(page.locator('.mode-tile[data-active="false"]')).toHaveCount(4)
    await expect(page.locator('.field-row').filter({ hasText: 'Agents on the stage' })).toContainText('5')
  })

  test('explains the honest limits', async ({ page }) => {
    await openPanel(page)
    await page.getByText('It still sleeps. What do I change?').click()
    await expect(page.getByText(/powercfg \/requests/)).toBeVisible()
    await page.getByText('Why does the wake lock go away when I switch tabs?').click()
    await expect(page.getByText(/only granted to a document that is on screen/)).toBeVisible()
  })

  test('keeps the console clean', async ({ page }) => {
    const errors: string[] = []
    page.on('console', (message) => {
      if (message.type() === 'error') errors.push(message.text())
    })
    page.on('pageerror', (error) => errors.push(error.message))
    await openPanel(page)
    await page.getByRole('button', { name: 'Use the Ember screensaver' }).click()
    await page.getByRole('button', { name: 'Use the Clock screensaver' }).click()
    expect(errors).toEqual([])
  })

  test('looks like itself', async ({ page }) => {
    // A full page of prose wraps a line or two differently between platforms,
    // and no tolerance can tell that apart from antialiasing. The stage shots
    // are geometry and compare everywhere; this one belongs to the runner, so
    // its baseline is generated on Linux (.github/workflows/baselines.yml).
    test.skip(
      process.platform !== 'linux',
      'the full page baseline is generated on the runner, see .github/workflows/baselines.yml',
    )
    await openPanel(page, { stub: true })
    await expect(page).toHaveScreenshot('panel.png', { fullPage: true, maxDiffPixelRatio: 0.02 })
  })
})
