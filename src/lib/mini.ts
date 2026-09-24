import { errorMessage } from './errors'
import { wakeLockApi, type WakeLockSentinelLike } from './wakelock'

export type MiniState = 'off' | 'opening' | 'open' | 'unsupported' | 'blocked'

export interface MiniReport {
  state: MiniState
  message: string | null
  lockHeld: boolean
}

export interface MiniOptions {
  onReport?: (report: MiniReport) => void
}

interface DocumentPictureInPictureLike {
  requestWindow(options?: { width?: number; height?: number }): Promise<Window>
}

/**
 * A tiny always-on-top window with its own document.
 *
 * This is the honest answer to the hard case. A screen wake lock belongs to a
 * document that is on screen, and the tab running the agents is the one on
 * screen, so the main tab loses its lock the moment the user switches to it.
 * The mini window is a second, visible document, so it can hold its own lock
 * while the user works elsewhere and the main tab is hidden.
 *
 * Chrome and Edge have document picture-in-picture; Safari and Firefox do not,
 * which is why this is an option and not the only path.
 */
export class MiniWindow {
  private api: DocumentPictureInPictureLike | null
  private win: Window | null = null
  private sentinel: WakeLockSentinelLike | null = null
  private handler: (() => void) | null = null
  private dispose: (() => void) | null = null
  private state: MiniState = 'off'
  private message: string | null = null
  private readonly options: MiniOptions

  constructor(options: MiniOptions = {}) {
    this.options = options
    const holder = window as Window & { documentPictureInPicture?: DocumentPictureInPictureLike }
    this.api = holder.documentPictureInPicture ?? null
  }

  static supported(): boolean {
    return typeof window !== 'undefined' && 'documentPictureInPicture' in window
  }

  isOpen(): boolean {
    return this.win !== null && !this.win.closed
  }

  lockHeld(): boolean {
    return this.sentinel !== null && !this.sentinel.released
  }

  report(): MiniReport {
    return { state: this.state, message: this.message, lockHeld: this.lockHeld() }
  }

  /** `render` mounts the mini screensaver into the new document and returns a disposer. */
  async open(render: (root: HTMLElement) => () => void): Promise<void> {
    if (this.isOpen()) {
      this.win?.focus()
      return
    }
    if (!this.api) {
      this.setState(
        'unsupported',
        'This browser has no document picture-in-picture, so the mini window cannot open. Chrome and Edge have it.',
      )
      return
    }

    this.setState('opening', null)
    try {
      const win = await this.api.requestWindow({ width: 320, height: 200 })
      this.win = win
      win.document.title = 'hearth'

      // The mini window is its own document, so it needs the stylesheet and the
      // root classes the app sets. In dev the styles are inline tags and in a
      // build they are linked, so both are copied.
      win.document.documentElement.className = document.documentElement.className
      for (const node of document.head.querySelectorAll('link[rel="stylesheet"], style')) {
        win.document.head.append(node.cloneNode(true))
      }
      win.document.body.style.margin = '0'
      win.document.body.style.background = '#000000'

      const root = win.document.createElement('div')
      root.style.height = '100dvh'
      win.document.body.append(root)
      this.dispose = render(root)

      win.addEventListener('pagehide', () => this.close())
      win.document.addEventListener('visibilitychange', () => {
        if (win.document.visibilityState === 'visible' && !this.lockHeld()) void this.hold()
      })
      this.setState('open', null)
      void this.hold()
    } catch (error) {
      this.win = null
      this.setState('blocked', errorMessage(error))
    }
  }

  close(): void {
    const dispose = this.dispose
    this.dispose = null
    if (dispose) dispose()

    const sentinel = this.sentinel
    const handler = this.handler
    this.sentinel = null
    this.handler = null
    if (sentinel && handler) sentinel.removeEventListener('release', handler)
    if (sentinel && !sentinel.released) void sentinel.release().catch(() => undefined)

    const win = this.win
    this.win = null
    if (win && !win.closed) win.close()
    if (this.state !== 'off') this.setState('off', null)
  }

  private async hold(): Promise<void> {
    const win = this.win
    if (!win) return
    const wakeLock = wakeLockApi(win.navigator)
    if (!wakeLock) {
      this.reportWith('This browser will not hold a screen lock from a mini window.')
      return
    }
    try {
      const sentinel = await wakeLock.request('screen')
      if (!this.win) {
        void sentinel.release()
        return
      }
      this.sentinel = sentinel
      this.handler = () => {
        this.sentinel = null
        this.reportWith(null)
      }
      sentinel.addEventListener('release', this.handler)
      this.reportWith(null)
    } catch (error) {
      this.reportWith(errorMessage(error))
    }
  }

  private setState(state: MiniState, message: string | null): void {
    this.state = state
    this.message = message
    this.reportWith(message)
  }

  private reportWith(message: string | null): void {
    this.message = message
    this.options.onReport?.({ state: this.state, message, lockHeld: this.lockHeld() })
  }
}
