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
 * panel, the header, the tab title, the favicon, the stage and the mini window
 * can never disagree. Copy stays short: one line of truth, not a paragraph.
 */
export function holdStatus(input: HoldInput): HoldStatus {
  if (!input.running) {
    return {
      level: 'off',
      tone: 'off',
      title: 'Not holding the screen on',
      detail: 'Nothing is held.',
      short: 'not holding',
      note: null,
    }
  }

  const lockHeld = input.wakeLock === 'held' || input.miniHeld

  if (lockHeld) {
    const source = input.miniHeld
      ? input.visible
        ? 'This tab and the mini window are both holding a lock.'
        : 'The mini window is holding the lock while you work elsewhere.'
      : 'This tab is visible, so the browser is holding the display on.'
    const background =
      input.media === 'strong'
        ? ' Switch away and the media stream takes over.'
        : input.media === 'blocked'
          ? ' The media stream was blocked, so there is no second hold.'
          : input.media === 'off'
            ? ' The media stream is off, so there is no second hold.'
            : ' Click once to let the quiet audio track start too.'
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
        ? 'No screen lock right now. The media stream is holding the tab.'
        : 'You switched away, so the lock was released. The media stream is holding the tab, and the lock returns with you.',
      short: input.visible ? 'media hold only' : 'in the background',
      note: input.visible ? 'media hold only' : 'background · media hold',
    }
  }

  const reason =
    input.media === 'off'
      ? 'The media hold is switched off.'
      : input.media === 'blocked'
        ? 'The browser refused the media stream.'
        : 'The media stream is running without its audio track.'

  const fix = input.needsGesture
    ? ' Click once to let it start.'
    : input.wakeLock === 'unsupported'
      ? ' This browser has no screen wake lock.'
      : ''

  return {
    level: 'weak',
    tone: 'warn',
    title: input.wakeLock === 'denied' ? 'Screen lock refused' : 'Weak hold',
    detail: `${reason}${fix}`,
    short: 'weak hold',
    // A click can only help while the page is on screen. Away from it, the
    // honest warning is that the browser may freeze the tab.
    note: !input.visible
      ? 'weak hold · may be frozen'
      : input.needsGesture
        ? 'weak hold · click once'
        : 'weak hold',
  }
}
