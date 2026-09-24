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
   * that; the behaviour tests use the real browser instead. `deny-lock` is a
   * browser that refuses the strong hold, and `releasable` is one that hands it
   * over and then lets it go, so the retry can be watched.
   */
  stub?: boolean | 'deny-lock' | 'releasable'
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
    const mode = options.stub === true ? 'held' : options.stub
    await page.addInitScript((stubMode: string) => {
      const counts = { requests: 0 }
      ;(window as unknown as { __wake: typeof counts }).__wake = counts

      const makeSentinel = () => {
        const sentinel = new EventTarget() as EventTarget & {
          released: boolean
          release: () => Promise<void>
        }
        sentinel.released = false
        sentinel.release = async () => {
          sentinel.released = true
          sentinel.dispatchEvent(new Event('release'))
        }
        return sentinel
      }

      Object.defineProperty(navigator, 'wakeLock', {
        configurable: true,
        value: {
          request: async () => {
            counts.requests += 1
            if (stubMode === 'deny-lock') {
              throw new DOMException('The battery saver refused the lock.', 'NotAllowedError')
            }
            const sentinel = makeSentinel()
            ;(window as unknown as { __sentinel: unknown }).__sentinel = sentinel
            return sentinel
          },
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
    }, mode)
  }

  if (options.clock === 'running') await page.clock.install({ time: FIXED_TIME })
  else await page.clock.setFixedTime(FIXED_TIME)
  await page.goto(`/${options.query ?? ''}`)
  await page.evaluate(() => document.fonts.ready)
  await settle(page)
}

/**
 * Waits for every finite animation and transition to finish. The infinite ones
 * (the ember breathing, the stars twinkling, the colon blinking) are handled by
 * Playwright at screenshot time, which cancels them to their first frame.
 */
export async function settle(page: Page): Promise<void> {
  await page.evaluate(async () => {
    const finite = document.getAnimations().filter((animation) => {
      const timing = animation.effect?.getTiming()
      return timing?.iterations !== Infinity
    })
    await Promise.all(finite.map((animation) => animation.finished.catch(() => undefined)))
  })
}

export async function startWatch(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Start keeping the screen on' }).click()
  await page.locator('.stage').waitFor()
  // The stage must be painted before anything is measured or captured.
  await page.waitForFunction(() => {
    const stage = document.querySelector('.stage')
    return stage !== null && getComputedStyle(stage).opacity === '1'
  })
  await settle(page)
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
