import type { MediaState, WakeLockState } from './awake'

/** How well the screen is being held, in one word. */
export type HoldLevel = 'off' | 'weak' | 'media' | 'screen'

export interface HoldInput {
  running: boolean
  visible: boolean
  wakeLock: WakeLockState
  media: MediaState
  /** True when the quiet audio track is waiting for one click to start. */
  needsGesture: boolean
  /** True when the mini window is on screen and holding its own lock. */
  miniHeld: boolean
}

export interface HoldStatus {
  level: HoldLevel
  tone: 'on' | 'warn' | 'off'
  /** The one line that says what is happening. */
  title: string
  detail: string
  /** A short label for the tab title and the mini window. */
  short: string
  /** A line for the stage, shown only when the hold is not the strong one. */
  note: string | null
}

/**
 * The screen lock is the strong hold, and a browser only grants it to a
 * document that is on screen. Everything else is the media stream, which the
 * browser treats as playback: it keeps the tab out of the background freezer
 * and asks the system not to suspend.
 *
 * This function is the one place that decides which story the UI tells, so the
 * panel, the tab title, the favicon and the screensaver can never disagree.
 */
export function holdStatus(input: HoldInput): HoldStatus {
  if (!input.running) {
    return {
      level: 'off',
      tone: 'off',
      title: 'Not holding the screen on',
      detail: 'Nothing is being held, so the display can dim and sleep as usual.',
      short: 'not holding',
      note: null,
    }
  }

  const lockHeld = input.wakeLock === 'held' || input.miniHeld

  if (lockHeld) {
    const source = input.miniHeld
      ? input.visible
        ? 'Both this tab and the mini window are holding a screen lock.'
        : 'The mini window is on screen, so it is holding the screen lock while you work in another window.'
      : 'This tab is visible, so the browser is holding the display on.'
    const background =
      input.media === 'strong'
        ? ' Switch away from this tab and the media stream takes over.'
        : input.media === 'blocked'
          ? ' The media stream was blocked, so when you switch away there is no second hold.'
          : input.media === 'off'
            ? ' The media hold is switched off, so when you switch away there is no second hold.'
            : ' Click the page once to let the quiet audio track start, so there is a second hold when this one goes away.'
    return {
      level: 'screen',
      tone: 'on',
      title: 'Screen lock held',
      detail: `${source}${background}`,
      short: 'screen lock held',
      note: null,
    }
  }

  if (input.media === 'strong') {
    return {
      level: 'media',
      tone: 'warn',
      title: input.visible ? 'Media hold only' : 'In the background',
      detail: input.visible
        ? 'The browser is not holding a screen lock right now. The inaudible media stream is what is keeping the tab awake.'
        : 'You switched away, so the browser released the screen lock. The inaudible media stream is holding the tab awake, and the lock comes straight back when you return.',
      short: input.visible ? 'media hold only' : 'in the background',
      note: input.visible ? 'media hold only' : 'background · media hold',
    }
  }

  const reason =
    input.media === 'off'
      ? 'The media hold is switched off in the settings.'
      : input.media === 'blocked'
        ? 'The browser refused to play the media stream.'
        : 'The media stream is playing without its audio track, so the browser may freeze this tab in the background.'

  const fix = input.needsGesture
    ? ' Click or tap the page once to let the quiet audio track start.'
    : input.wakeLock === 'unsupported'
      ? ' This browser has no screen wake lock, so there is no second hold to fall back on.'
      : ''

  return {
    level: 'weak',
    tone: 'warn',
    title: input.wakeLock === 'denied' ? 'Screen lock refused' : 'Weak hold',
    detail: `${reason}${fix}`,
    short: 'weak hold',
    note: input.visible ? 'weak hold · click once' : 'weak hold · may be frozen',
  }
}
