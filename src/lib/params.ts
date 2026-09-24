/** The screensaver modes, in the order the panel shows them. */
export type ModeId = 'clock' | 'ember' | 'stars' | 'agents' | 'minimal'

/** How far the screensaver dims while nobody is touching the machine. */
export type DimTier = 'off' | 'gentle' | 'deep'

export interface UrlOptions {
  start?: boolean
  mode?: ModeId
  agents?: number
  dim?: DimTier
  seconds?: boolean
  rotate?: boolean
}

export const MODE_IDS: readonly ModeId[] = ['clock', 'ember', 'stars', 'agents', 'minimal']
export const DIM_TIERS: readonly DimTier[] = ['off', 'gentle', 'deep']

export function isModeId(value: string): value is ModeId {
  return (MODE_IDS as readonly string[]).includes(value)
}

export function isDimTier(value: string): value is DimTier {
  return (DIM_TIERS as readonly string[]).includes(value)
}

/** Values that mean yes: `1`, `true`, `on`, `yes`, or a bare key. */
export function isOn(value: string | null): boolean {
  if (value === null) return false
  if (value === '') return true
  return ['1', 'true', 'on', 'yes'].includes(value.toLowerCase())
}

export function clampAgents(value: number): number {
  if (!Number.isFinite(value)) return 3
  return Math.min(12, Math.max(1, Math.round(value)))
}

function flag(params: URLSearchParams, name: string): boolean | undefined {
  if (!params.has(name)) return undefined
  return isOn(params.get(name))
}

/**
 * The options a link can carry. `?start=1` puts hearth on watch, so one
 * bookmark can do the whole job. The hash is read as well: `#start` is quicker
 * to type, and it survives chat clients that mangle query strings.
 */
export function parseOptions(search: string, hash = ''): UrlOptions {
  const source = search.startsWith('?') ? search.slice(1) : search
  const params = new URLSearchParams(source)
  const options: UrlOptions = {}

  if (flag(params, 'start') ?? flag(params, 'auto') ?? false) options.start = true

  const rotate = flag(params, 'rotate')
  if (rotate !== undefined) options.rotate = rotate

  const seconds = flag(params, 'seconds')
  if (seconds !== undefined) options.seconds = seconds

  const mode = params.get('mode')
  if (mode !== null) {
    if (mode === 'rotate') options.rotate = true
    else if (isModeId(mode)) options.mode = mode
  }

  const dim = params.get('dim')
  if (dim !== null && isDimTier(dim)) options.dim = dim

  const agents = params.get('agents')
  if (agents !== null && agents !== '') {
    const count = Number.parseInt(agents, 10)
    if (Number.isFinite(count)) options.agents = clampAgents(count)
  }

  for (const token of hash.replace(/^#/, '').split(/[&,]/)) {
    const value = token.trim().toLowerCase()
    if (value === '') continue
    if (value === 'start' || value === 'auto' || value === 'wake') options.start = true
    else if (value === 'rotate') options.rotate = true
    else if (isModeId(value)) options.mode = value
    else if (isDimTier(value)) options.dim = value
  }

  return options
}
