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

/**
 * A reload should not restart the clock. The session's start is kept so that
 * opening hearth again from a bookmark continues the watch that is running,
 * and so `?start=1` stays safe to click twice.
 */
export function readSession(store: StorageLike | undefined, now = Date.now()): number | null {
  if (!store) return null
  try {
    const raw = store.getItem(SESSION_KEY)
    if (!raw) return null
    const data: unknown = JSON.parse(raw)
    if (typeof data !== 'object' || data === null) return null
    const startedAt = (data as Record<string, unknown>).startedAt
    if (typeof startedAt !== 'number' || !Number.isFinite(startedAt)) return null
    if (startedAt > now || now - startedAt > 7 * 24 * 3600_000) return null
    return startedAt
  } catch {
    return null
  }
}

export function writeSession(startedAt: number, store: StorageLike | undefined): void {
  if (!store) return
  try {
    store.setItem(SESSION_KEY, JSON.stringify({ startedAt }))
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
