import type { ModeId } from './params'

export interface ModeDef {
  id: ModeId
  name: string
  blurb: string
  /**
   * How often the mode needs a new value, or 0 when the CSS animations carry
   * it alone. This is the app's only recurring timer, so it is per mode: the
   * ember does not need a tick every second to keep breathing.
   */
  tickMs: number
}

const CLOCK: ModeDef = {
  id: 'clock',
  name: 'Clock',
  blurb: 'The time, the date, and the watch length.',
  tickMs: 1000,
}

const EMBER: ModeDef = {
  id: 'ember',
  name: 'Ember',
  blurb: 'One small fire, breathing.',
  tickMs: 5000,
}

const STARS: ModeDef = {
  id: 'stars',
  name: 'Stars',
  blurb: 'Dim points, drifting upward.',
  tickMs: 5000,
}

const AGENTS: ModeDef = {
  id: 'agents',
  name: 'Agents',
  blurb: 'A tally of the jobs at work.',
  tickMs: 1000,
}

const MINIMAL: ModeDef = {
  id: 'minimal',
  name: 'Minimal',
  blurb: 'A dot and the elapsed time.',
  tickMs: 5000,
}

export const MODES: readonly ModeDef[] = [CLOCK, EMBER, STARS, AGENTS, MINIMAL]

const BY_ID = new Map<ModeId, ModeDef>(MODES.map((mode) => [mode.id, mode]))

export function modeDef(id: ModeId): ModeDef {
  return BY_ID.get(id) ?? CLOCK
}

export function nextMode(id: ModeId): ModeId {
  const index = MODES.findIndex((mode) => mode.id === id)
  const next = MODES[(index + 1) % MODES.length]
  return next ? next.id : CLOCK.id
}

/**
 * Rotation walks from the chosen mode, one step every interval. It is the
 * burn-in guard: a single pattern left on the same pixels for a whole night is
 * what a panel remembers.
 */
export function rotatedMode(base: ModeId, elapsedMs: number, everyMs = 10 * 60_000): ModeId {
  const start = MODES.findIndex((mode) => mode.id === base)
  if (start < 0 || everyMs <= 0) return base
  const step = Math.floor(Math.max(0, elapsedMs) / everyMs)
  const mode = MODES[(start + step) % MODES.length]
  return mode ? mode.id : base
}
