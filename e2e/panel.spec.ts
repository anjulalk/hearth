import { expect, test } from '@playwright/test'
import { openPanel } from './helpers'

test.describe('the panel', () => {
  test('says what it is and what it is not holding yet', async ({ page }) => {
    await openPanel(page)
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(/hearth/)
    await expect(page.locator('.intro-lede')).toContainText('keeps a screen on while a long job runs')
    await expect(page.getByText('Not holding the screen on')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Start keeping the screen on' })).toBeVisible()
    await expect(page.getByText('Idle', { exact: true })).toBeVisible()
  })

  test('wears the shared shell from the design system', async ({ page }) => {
    await openPanel(page)

    // Header: the reference's numbers, read off the blog. Wordmark Inter 600 at
    // 1.25rem on a 1.2 line with -0.011em tracking, menu at 0.875rem/500 on the
    // reading line, which is what keeps the menu from looking cramped.
    const wordmark = page.getByRole('heading', { level: 1 })
    await expect(wordmark).toHaveCSS('font-family', /Inter/)
    await expect(wordmark).toHaveCSS('font-size', '20px')
    await expect(wordmark).toHaveCSS('font-weight', '600')
    await expect(wordmark).toHaveCSS('line-height', '24px')
    await expect(wordmark).toHaveCSS('letter-spacing', '-0.22px')
    await expect(wordmark).toHaveCSS('color', 'rgb(68, 64, 58)')

    const source = page.getByRole('link', { name: 'Source', exact: true })
    await expect(source).toHaveCSS('font-family', /Inter/)
    await expect(source).toHaveCSS('font-size', '14px')
    await expect(source).toHaveCSS('font-weight', '500')
    await expect(source).toHaveCSS('line-height', '28px')

    // 1.75rem between menu items, from 640px.
    const second = page.getByRole('link', { name: 'Design system', exact: true })
    const sourceBox = await source.boundingBox()
    const secondBox = await second.boundingBox()
    const gap = (secondBox?.x ?? 0) - ((sourceBox?.x ?? 0) + (sourceBox?.width ?? 0))
    expect(gap).toBeGreaterThan(26)
    expect(gap).toBeLessThan(30)

    await expect(page.locator('header')).toHaveCSS('padding-bottom', '40px')

    // Intro: a lede in ink, a supporting line in ink-700 capped at 42rem.
    await expect(page.locator('.intro-lede')).toHaveCSS('font-size', '18px')
    await expect(page.locator('.intro-lede')).toHaveCSS('color', 'rgb(68, 64, 58)')
    await expect(page.locator('.intro-support')).toHaveCSS('color', 'rgb(95, 90, 81)')
    const support = await page.locator('.intro-support').boundingBox()
    expect(support?.width ?? 0).toBeLessThanOrEqual(672)

    // Footer: chrome, small, ink-500, no rule dividing it from the page, and no
    // licence or decision-making boilerplate.
    const footer = page.locator('footer')
    await expect(footer).toHaveCSS('font-family', /Inter/)
    await expect(footer).toHaveCSS('font-size', '14px')
    await expect(footer).toHaveCSS('color', 'rgb(118, 112, 100)')
    await expect(footer).toHaveCSS('border-top-width', '0px')
    await expect(page.locator('footer p.text-xs')).toHaveCSS('font-size', '12px')
    await expect(footer).toContainText('Built by')
    await expect(footer).not.toContainText('MIT')
    await expect(footer).not.toContainText('GitHub')
  })

  test('follows the system until the header control says otherwise', async ({ page }) => {
    await openPanel(page, { appearance: 'auto' })
    const html = page.locator('html')
    await expect(html).not.toHaveClass(/dark/)

    const control = page.locator('header').getByRole('button', { name: 'appearance switcher' })
    await expect(control).toBeVisible()
    const box = await control.boundingBox()
    expect(box?.width).toBe(32)
    expect(box?.height).toBe(32)

    // The bulb sits after the wordmark and before the menu.
    const wordmarkBox = await page.getByRole('heading', { level: 1 }).boundingBox()
    const menuBox = await page.getByRole('link', { name: 'Source', exact: true }).boundingBox()
    expect(box?.x ?? 0).toBeGreaterThanOrEqual((wordmarkBox?.x ?? 0) + (wordmarkBox?.width ?? 0))
    expect(box?.x ?? 0).toBeLessThan(menuBox?.x ?? 0)

    await control.click()
    await expect(html).toHaveClass(/dark/)
    await expect(page.locator('body')).toHaveCSS('background-color', 'rgb(40, 38, 34)')

    // The right click goes back to following the system, which is light here.
    await control.click({ button: 'right' })
    await expect(html).not.toHaveClass(/dark/)
  })

  test('offers every screensaver, with the clock chosen', async ({ page }) => {
    await openPanel(page)
    await expect(page.locator('.mode-tile')).toHaveCount(5)
    for (const name of ['Clock', 'Ember', 'Stars', 'Agents', 'Minimal']) {
      await expect(page.getByRole('button', { name: `Use the ${name} screensaver` })).toBeVisible()
    }
    await expect(page.locator('.mode-tile[data-active="true"]')).toContainText('Clock')
  })

  test('wears the paper palette', async ({ page }) => {
    await openPanel(page)

    // Paper, ink and one clay accent, the same values as anjula.dev.
    await expect(page.locator('body')).toHaveCSS('background-color', 'rgb(250, 248, 243)')
    await expect(page.locator('.card').first()).toHaveCSS('background-color', 'rgb(255, 255, 255)')
    // The primary action is clay text on a clay tint, which clears 4.5:1.
    await expect(page.getByRole('button', { name: 'Start keeping the screen on' })).toHaveCSS(
      'color',
      'rgb(158, 74, 45)',
    )
    await expect(page.locator('.status-dot').first()).toHaveCSS(
      'background-color',
      'rgb(148, 142, 128)',
    )

    // One column, the shared 80rem container, with the wide gutters.
    const shell = await page.locator('.shell').boundingBox()
    expect(shell?.width ?? 0).toBeGreaterThan(1000)
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
