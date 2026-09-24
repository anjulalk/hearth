import { errorMessage } from './errors'
import { wakeLockApi, type WakeLockSentinelLike } from './wakelock'

export type WakeLockState = 'idle' | 'held' | 'released' | 'unsupported' | 'denied'
export type MediaState = 'off' | 'silent' | 'strong' | 'blocked'

export interface AwakeState {
  running: boolean
  startedAt: number | null
  wakeLock: WakeLockState
  wakeLockError: string | null
  media: MediaState
  mediaError: string | null
  visible: boolean
  /** True when the quiet audio track is waiting for one click to start. */
  needsGesture: boolean
  /** Time in this watch when the document was hidden. */
  hiddenMs: number
  hiddenSince: number | null
  /** Time in this watch when the browser was actually holding the lock. */
  lockMs: number
  lockSince: number | null
}

export interface AwakeOptions {
  /** Hold the media stream as well as the lock. */
  media?: boolean
  onState?: (state: AwakeState) => void
  /** The length of the watch that just ended, so the day's total can be kept. */
  onStop?: (elapsedMs: number) => void
}

/**
 * The two holds.
 *
 * The screen lock is what the browser calls a screen wake lock: it stops the
 * display dimming and locking, and the browser only grants it to a document
 * that is visible. It is released the moment the tab goes away.
 *
 * The media hold is a two pixel canvas stream and a 40 Hz tone at about -80 dB,
 * attached to a hidden video element. A tab that is playing media is exempt
 * from the background freezer and from timer throttling, and the operating
 * system is asked not to suspend while it plays. That is what keeps the watch
 * going while the user is in the tab running the agents.
 *
 * Neither one is a power plan: a page cannot change what the operating system
 * does on its own schedule. What this class can do is hold both levers, and
 * report honestly which of them is doing the work.
 */
export class Hearth {
  private video: HTMLVideoElement | null = null
  private stream: MediaStream | null = null
  private context: CanvasRenderingContext2D | null = null
  private frameTimer: number | undefined
  private frame = 0
  private audio: AudioContext | null = null
  private sentinel: WakeLockSentinelLike | null = null
  private sentinelHandler: (() => void) | null = null
  private retryTimer: number | undefined
  private retries = 0
  private running = false
  private startedAt: number | null = null
  private wakeLock: WakeLockState = 'idle'
  private wakeLockError: string | null = null
  private media: MediaState = 'off'
  private mediaError: string | null = null
  private visible = true
  private needsGesture = false
  private hiddenMs = 0
  private hiddenSince: number | null = null
  private lockMs = 0
  private lockSince: number | null = null
  private mediaEnabled: boolean
  private readonly options: AwakeOptions

  constructor(options: AwakeOptions = {}) {
    this.options = options
    this.mediaEnabled = options.media !== false
    if (typeof document !== 'undefined') this.visible = document.visibilityState === 'visible'
  }

  isRunning(): boolean {
    return this.running
  }

  getState(now = Date.now()): AwakeState {
    return {
      running: this.running,
      startedAt: this.startedAt,
      wakeLock: this.wakeLock,
      wakeLockError: this.wakeLockError,
      media: this.media,
      mediaError: this.mediaError,
      visible: this.visible,
      needsGesture: this.needsGesture,
      hiddenMs: this.hiddenMs + (this.hiddenSince === null ? 0 : now - this.hiddenSince),
      hiddenSince: this.hiddenSince,
      lockMs: this.lockMs + (this.lockSince === null ? 0 : now - this.lockSince),
      lockSince: this.lockSince,
    }
  }

  setMedia(enabled: boolean): void {
    this.mediaEnabled = enabled
    if (!this.running) return
    if (enabled) this.startMedia()
    else this.stopMedia('off')
  }

  async start(startedAt = Date.now()): Promise<void> {
    if (this.running) {
      this.startedAt ??= startedAt
      this.emit()
      return
    }

    this.running = true
    this.startedAt = startedAt
    this.retries = 0
    this.hiddenMs = 0
    this.hiddenSince = null
    this.lockMs = 0
    this.lockSince = null
    this.visible = document.visibilityState === 'visible'
    document.addEventListener('visibilitychange', this.onVisibility)
    document.addEventListener('pointerdown', this.onGesture)
    document.addEventListener('keydown', this.onGesture)
    // A system suspend can take the lock without the page ever going hidden,
    // and a page restored from the back/forward cache starts over. Both are
    // worth asking again for.
    window.addEventListener('pageshow', this.onResume)
    window.addEventListener('focus', this.onResume)
    document.addEventListener('resume', this.onResume)
    this.emit()

    await this.acquireWakeLock()
    if (this.mediaEnabled) this.startMedia()
  }

  async stop(): Promise<number> {
    if (!this.running) return 0
    const elapsedMs = this.startedAt === null ? 0 : Date.now() - this.startedAt

    this.running = false
    this.startedAt = null
    this.clearRetry()
    document.removeEventListener('visibilitychange', this.onVisibility)
    document.removeEventListener('pointerdown', this.onGesture)
    document.removeEventListener('keydown', this.onGesture)
    window.removeEventListener('pageshow', this.onResume)
    window.removeEventListener('focus', this.onResume)
    document.removeEventListener('resume', this.onResume)
    await this.releaseWakeLock()
    this.stopMedia('off')
    this.wakeLock = 'idle'
    this.wakeLockError = null
    this.mediaError = null
    this.needsGesture = false
    this.emit()
    this.options.onStop?.(elapsedMs)
    return elapsedMs
  }

  private onVisibility = (): void => {
    this.visible = document.visibilityState === 'visible'
    if (!this.running) {
      this.emit()
      return
    }

    if (this.visible) {
      if (this.hiddenSince !== null) {
        this.hiddenMs += Date.now() - this.hiddenSince
        this.hiddenSince = null
      }
      this.retries = 0
      this.clearRetry()
      void this.acquireWakeLock()
    } else {
      if (this.hiddenSince === null) this.hiddenSince = Date.now()
      // The browser releases the lock itself when the document goes away.
      this.detachSentinel()
      this.wakeLock = 'released'
    }
    this.emit()
  }

  /**
   * Something that is not a visibility change may have taken the lock: a system
   * suspend, or a restore from the back/forward cache. Ask again, cheaply,
   * because acquireWakeLock does nothing while a lock is already held.
   */
  private onResume = (): void => {
    if (!this.running) return
    this.visible = document.visibilityState === 'visible'
    if (this.visible) {
      this.retries = 0
      this.clearRetry()
      void this.acquireWakeLock()
    }
    this.emit()
  }

  /** Browsers will not start unmuted media without one gesture. */
  private onGesture = (): void => {    if (!this.running) return
    const audio = this.audio
    if (audio && audio.state === 'suspended') {
      void audio
        .resume()
        .then(() => this.promote())
        .catch(() => undefined)
      return
    }
    this.promote()
  }

  private promote(): void {
    if (!this.running || !this.video || this.media === 'strong') return
    const hasAudio = (this.stream?.getAudioTracks().length ?? 0) > 0
    if (!hasAudio) return
    this.video.muted = false
    this.media = 'strong'
    this.needsGesture = false
    this.emit()
  }

  private async acquireWakeLock(): Promise<void> {
    if (!this.running) return
    if (this.sentinel && !this.sentinel.released) return

    const wakeLock = wakeLockApi(navigator)
    if (!wakeLock) {
      this.wakeLock = 'unsupported'
      this.emit()
      return
    }
    if (document.visibilityState !== 'visible') {
      this.wakeLock = 'released'
      this.emit()
      return
    }

    try {
      const sentinel = await wakeLock.request('screen')
      if (!this.running) {
        void sentinel.release()
        return
      }
      this.detachSentinel()
      this.sentinel = sentinel
      this.sentinelHandler = () => this.handleRelease(sentinel)
      sentinel.addEventListener('release', this.sentinelHandler)
      this.wakeLock = 'held'
      this.wakeLockError = null
      this.lockSince ??= Date.now()
    } catch (error) {
      this.wakeLock = 'denied'
      this.wakeLockError = errorMessage(error)
    }
    this.emit()
  }

  /** A sentinel we no longer track can let go later; only the live one counts. */
  private handleRelease(sentinel: WakeLockSentinelLike): void {
    if (this.sentinel !== sentinel) return
    this.detachSentinel()
    if (this.lockSince !== null) {
      this.lockMs += Date.now() - this.lockSince
      this.lockSince = null
    }
    if (!this.running) return
    this.wakeLock = 'released'
    this.emit()
    // The browser also drops the lock under memory pressure or on a low
    // battery. Ask again, with a backoff, so a refusal cannot become a loop.
    if (document.visibilityState === 'visible') this.scheduleRetry()
  }

  private detachSentinel(): void {
    if (this.sentinel && this.sentinelHandler) {
      this.sentinel.removeEventListener('release', this.sentinelHandler)
    }
    this.sentinel = null
    this.sentinelHandler = null
  }

  private scheduleRetry(): void {
    if (this.retryTimer !== undefined) return
    const delay = Math.min(30_000, 1000 * 2 ** this.retries)
    this.retries += 1
    this.retryTimer = window.setTimeout(() => {
      this.retryTimer = undefined
      void this.acquireWakeLock()
    }, delay)
  }

  private clearRetry(): void {
    if (this.retryTimer !== undefined) {
      clearTimeout(this.retryTimer)
      this.retryTimer = undefined
    }
  }

  private async releaseWakeLock(): Promise<void> {
    const sentinel = this.sentinel
    this.detachSentinel()
    if (this.lockSince !== null) {
      this.lockMs += Date.now() - this.lockSince
      this.lockSince = null
    }
    if (!sentinel || sentinel.released) return
    try {
      await sentinel.release()
    } catch {
      /* the lock is already gone */
    }
  }

  private startMedia(): void {
    if (this.video) return
    try {
      const canvas = document.createElement('canvas')
      canvas.width = 2
      canvas.height = 2
      this.context = canvas.getContext('2d')

      const stream = canvas.captureStream(1)
      this.stream = stream
      this.paintFrame()

      // The audio track is the part that keeps a hidden tab out of the freezer,
      // because a tab that is playing audio is exempt. It needs one gesture
      // before the browser lets the context run, which is what `promote` does.
      const Ctor =
        window.AudioContext ||
        (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
      if (Ctor) {
        const audio = new Ctor()
        const oscillator = audio.createOscillator()
        const gain = audio.createGain()
        const destination = audio.createMediaStreamDestination()
        oscillator.frequency.value = 40
        gain.gain.value = 0.0001
        oscillator.connect(gain).connect(destination)
        oscillator.start()
        const track = destination.stream.getAudioTracks()[0]
        if (track) {
          stream.addTrack(track)
          this.needsGesture = audio.state !== 'running'
        }
        this.audio = audio
      }

      const video = document.createElement('video')
      video.muted = true
      video.loop = true
      video.playsInline = true
      video.setAttribute('playsinline', '')
      video.setAttribute('aria-hidden', 'true')
      video.tabIndex = -1
      Object.assign(video.style, {
        position: 'fixed',
        left: '0',
        top: '0',
        width: '2px',
        height: '2px',
        opacity: '0.01',
        pointerEvents: 'none',
        zIndex: '-1',
      })
      video.srcObject = stream
      document.body.append(video)
      this.video = video
      this.media = 'silent'
      this.mediaError = null
      this.frameTimer = window.setInterval(() => this.paintFrame(), 1000)

      void video
        .play()
        .then(() => {
          if (this.audio && this.audio.state === 'running') this.promote()
          this.emit()
        })
        .catch((error: unknown) => {
          this.media = 'blocked'
          this.mediaError = errorMessage(error)
          this.emit()
        })
      this.emit()
    } catch (error) {
      this.media = 'blocked'
      this.mediaError = errorMessage(error)
      this.needsGesture = false
      this.emit()
    }
  }

  private paintFrame(): void {
    if (!this.context) return
    this.frame += 1
    this.context.fillStyle = this.frame % 2 === 0 ? '#000000' : '#010101'
    this.context.fillRect(0, 0, 2, 2)
    const track = this.stream?.getVideoTracks()[0] as
      | (MediaStreamTrack & { requestFrame?: () => void })
      | undefined
    track?.requestFrame?.()
  }

  private stopMedia(next: MediaState): void {
    if (this.frameTimer !== undefined) {
      clearInterval(this.frameTimer)
      this.frameTimer = undefined
    }
    if (this.video) {
      this.video.pause()
      this.video.srcObject = null
      this.video.remove()
      this.video = null
    }
    if (this.stream) {
      for (const track of this.stream.getTracks()) track.stop()
      this.stream = null
    }
    if (this.audio) {
      void this.audio.close().catch(() => undefined)
      this.audio = null
    }
    this.context = null
    this.media = next
    this.emit()
  }

  private emit(): void {
    this.options.onState?.(this.getState())
  }
}
