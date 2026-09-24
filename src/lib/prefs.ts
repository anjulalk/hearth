import { clampAgents, isDimTier, isModeId, type DimTier, type ModeId } from './params'

export type Appearance = 'auto' | 'light' | 'dark'

export interface Prefs {
  mode: ModeId
  rotate: boolean
  dim: DimTier
  pixelShift: boolean
  seconds: boolean
  hour24: boolean
  warm: boolean
  fullscreen: boolean
  media: boolean
  miniWindow: boolean
  agents: number
}

export interface StorageLike {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem?(key: string): void
}

const KEY = 'hearth.prefs'
const APPEARANCE_KEY = 'hearth.appearance'

const BOOLEAN_KEYS = [
  'rotate',
  'pixelShift',
  'seconds',
  'hour24',
  'warm',
  'fullscreen',
  'media',
  'miniWindow',
] as const

/** Local storage throws when a browser blocks it, which is not worth failing over. */
export function localStore(): StorageLike | undefined {
  try {
    return globalThis.localStorage ?? undefined
  } catch {
    return undefined
  }
}

function usesTwelveHourClock(): boolean {
  try {
    return new Intl.DateTimeFormat().resolvedOptions().hour12 === true
  } catch {
    return false
  }
}

export function defaultPrefs(): Prefs {
  return {
    mode: 'clock',
    rotate: false,
    dim: 'gentle',
    pixelShift: true,
    seconds: false,
    hour24: !usesTwelveHourClock(),
    warm: true,
    fullscreen: true,
    media: true,
    miniWindow: false,
    agents: 3,
  }
}

export function readPrefs(store: StorageLike | undefined = localStore()): Prefs {
  const prefs = defaultPrefs()
  if (!store) return prefs

  let raw: string | null = null
  try {
    raw = store.getItem(KEY)
  } catch {
    return prefs
  }
  if (!raw) return prefs

  let data: unknown
  try {
    data = JSON.parse(raw)
  } catch {
    return prefs
  }
  if (typeof data !== 'object' || data === null) return prefs
  const record = data as Record<string, unknown>

  if (typeof record.mode === 'string' && isModeId(record.mode)) prefs.mode = record.mode
  if (typeof record.dim === 'string' && isDimTier(record.dim)) prefs.dim = record.dim
  if (typeof record.agents === 'number') prefs.agents = clampAgents(record.agents)
  for (const key of BOOLEAN_KEYS) {
    const value = record[key]
    if (typeof value === 'boolean') prefs[key] = value
  }

  return prefs
}

export function writePrefs(prefs: Prefs, store: StorageLike | undefined = localStore()): void {
  if (!store) return
  try {
    store.setItem(KEY, JSON.stringify(prefs))
  } catch {
    /* a full or blocked store keeps the app working, just without memory */
  }
}

export function readAppearance(store: StorageLike | undefined = localStore()): Appearance {
  if (!store) return 'auto'
  try {
    const raw = store.getItem(APPEARANCE_KEY)
    return raw === 'light' || raw === 'dark' ? raw : 'auto'
  } catch {
    return 'auto'
  }
}

export function writeAppearance(value: Appearance, store: StorageLike | undefined = localStore()): void {
  if (!store) return
  try {
    store.setItem(APPEARANCE_KEY, value)
  } catch {
    /* see writePrefs */
  }
}
