import type { StorageLike } from './prefs'

const DAY_KEY = 'hearth.day'
const SESSION_KEY = 'hearth.session'

export interface WatchDay {
  /** A local calendar day, `YYYY-MM-DD`. */
  d: string
  ms: number
}

export function localDay(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day}`
}

/** The day's total, reset when the date turns over. */
export function readWatch(store: StorageLike | undefined, now = new Date()): WatchDay {
  const empty: WatchDay = { d: localDay(now), ms: 0 }
  if (!store) return empty

  try {
    const raw = store.getItem(DAY_KEY)
    if (!raw) return empty
    const data: unknown = JSON.parse(raw)
    if (typeof data !== 'object' || data === null) return empty
    const record = data as Record<string, unknown>
    if (typeof record.d !== 'string' || typeof record.ms !== 'number') return empty
    if (record.d !== empty.d) return empty
    if (!Number.isFinite(record.ms) || record.ms < 0) return empty
    return { d: record.d, ms: record.ms }
  } catch {
    return empty
  }
}

export function addWatch(ms: number, store: StorageLike | undefined, now = new Date()): WatchDay {
  const current = readWatch(store, now)
  const next: WatchDay = { d: current.d, ms: current.ms + Math.max(0, Math.round(ms)) }
  if (store) {
    try {
      store.setItem(DAY_KEY, JSON.stringify(next))
    } catch {
      /* see writePrefs */
    }
  }
  return next
}

export interface SessionState {
  /** When this watch started counting. */
  startedAt: number
  /** The last moment the page was known to be up, so a gap can be seen. */
  seenAt: number
}

/**
 * A reload should not restart the clock, and a browser that was closed should
 * not silently end the watch: the session is kept, and `seenAt` is touched
 * whenever the page goes away so a long gap can be told from a quick refresh.
 */
export function readSession(store: StorageLike | undefined, now = Date.now()): SessionState | null {
  if (!store) return null
  try {
    const raw = store.getItem(SESSION_KEY)
    if (!raw) return null
    const data: unknown = JSON.parse(raw)
    if (typeof data !== 'object' || data === null) return null
    const record = data as Record<string, unknown>
    const startedAt = record.startedAt
    const seenAt = typeof record.seenAt === 'number' ? record.seenAt : startedAt
    if (typeof startedAt !== 'number' || typeof seenAt !== 'number') return null
    if (!Number.isFinite(startedAt) || !Number.isFinite(seenAt)) return null
    if (startedAt > now || seenAt > now) return null
    if (now - startedAt > 7 * 24 * 3600_000) return null
    return { startedAt, seenAt }
  } catch {
    return null
  }
}

export function writeSession(session: SessionState, store: StorageLike | undefined): void {
  if (!store) return
  try {
    store.setItem(SESSION_KEY, JSON.stringify(session))
  } catch {
    /* see writePrefs */
  }
}

export function clearSession(store: StorageLike | undefined): void {
  if (!store) return
  try {
    if (store.removeItem) store.removeItem(SESSION_KEY)
    else store.setItem(SESSION_KEY, JSON.stringify({ startedAt: 0 }))
  } catch {
    /* see writePrefs */
  }
}
