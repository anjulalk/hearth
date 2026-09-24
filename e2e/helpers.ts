import type { Page } from '@playwright/test'

/** Every visual test runs at the same minute, so the clock is comparable. */
export const FIXED_TIME = new Date('2026-09-25T21:04:00')

/** A known settings state, written before the app boots. */
export const PREFERENCES = {
  mode: 'clock',
  rotate: false,
  dim: 'gentle',
  pixelShift: false,
  seconds: false,
  hour24: true,
  warm: true,
  fullscreen: false,
  media: true,
  miniWindow: false,
  agents: 3,
}

export interface PanelOptions {
  query?: string
  prefs?: Partial<typeof PREFERENCES>
  /**
   * A wake lock and a battery that always answer the same way. Screenshots need
   * that; the behaviour tests use the real browser instead. `deny-lock` is the
   * case worth testing by hand: a browser that refuses the strong hold.
   */
  stub?: boolean | 'deny-lock'
  /**
   * `fixed` freezes the clock, which makes screenshots comparable. `running`
   * installs a clock the test can push forward, for the timers.
   */
  clock?: 'fixed' | 'running'
}

export async function openPanel(page: Page, options: PanelOptions = {}): Promise<void> {
  const prefs = { ...PREFERENCES, ...options.prefs }
  await page.addInitScript((state: typeof prefs) => {
    window.localStorage.setItem('hearth.prefs', JSON.stringify(state))
    window.localStorage.setItem('hearth.appearance', 'light')
    window.localStorage.removeItem('hearth.session')
    window.localStorage.removeItem('hearth.day')
  }, prefs)

  if (options.stub) {
    await page.addInitScript((deny: boolean) => {
      const sentinel = {
        released: false,
        addEventListener() {},
        removeEventListener() {},
        release: async () => undefined,
      }
      Object.defineProperty(navigator, 'wakeLock', {
        configurable: true,
        value: {
          request: deny
            ? async () => {
                throw new DOMException('The battery saver refused the lock.', 'NotAllowedError')
              }
            : async () => sentinel,
        },
      })
      Object.defineProperty(navigator, 'getBattery', {
        configurable: true,
        value: async () => ({
          level: 0.82,
          charging: true,
          addEventListener() {},
          removeEventListener() {},
        }),
      })
    }, options.stub === 'deny-lock')
  }

  if (options.clock === 'running') await page.clock.install({ time: FIXED_TIME })
  else await page.clock.setFixedTime(FIXED_TIME)
  await page.goto(`/${options.query ?? ''}`)
  await page.evaluate(() => document.fonts.ready)
}

export async function startWatch(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Start keeping the screen on' }).click()
  await page.locator('.stage').waitFor()
}

/** The stage bar only appears once the pointer moves, the way it does for a person. */
export async function showStageBar(page: Page): Promise<void> {
  await page.mouse.move(640, 450)
  await page.mouse.move(641, 452)
  await page.locator('.stage-bar.is-visible').waitFor()
}

/** The tab icon is the one signal that survives a tab strip, so tests read it. */
export async function favicon(page: Page): Promise<string> {
  const href = await page.locator('link[rel="icon"]').getAttribute('href')
  return decodeURIComponent(href ?? '')
}

export function holdLevelFromTitle(title: string): 'lit' | 'dim' | 'out' {
  if (title.startsWith('screen lock held')) return 'lit'
  if (title.startsWith('in the background') || title.startsWith('media hold only')) return 'dim'
  return 'out'
}
