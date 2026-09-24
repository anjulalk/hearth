import { describe, expect, it } from 'vitest'
import { MODES, modeDef, nextMode, rotatedMode } from '@/lib/modes'

describe('the mode list', () => {
  it('is the order the panel shows', () => {
    expect(MODES.map((mode) => mode.id)).toEqual([
      'clock',
      'ember',
      'stars',
      'agents',
      'minimal',
    ])
  })

  it('gives the clock a second of resolution and the ember five', () => {
    expect(modeDef('clock').tickMs).toBe(1000)
    expect(modeDef('embers' as never).tickMs).toBe(1000)
    expect(modeDef('ember').tickMs).toBe(5000)
    expect(modeDef('stars').tickMs).toBe(5000)
    expect(modeDef('agents').tickMs).toBe(1000)
    expect(modeDef('minimal').tickMs).toBe(5000)
  })
})

describe('nextMode', () => {
  it('walks the list and wraps', () => {
    expect(nextMode('clock')).toBe('ember')
    expect(nextMode('minimal')).toBe('clock')
  })
})

describe('rotatedMode', () => {
  it('holds the chosen mode for the first interval', () => {
    expect(rotatedMode('clock', 0)).toBe('clock')
    expect(rotatedMode('clock', 9 * 60_000)).toBe('clock')
  })

  it('steps forward every interval and wraps', () => {
    expect(rotatedMode('clock', 10 * 60_000)).toBe('ember')
    expect(rotatedMode('stars', 20 * 60_000)).toBe('minimal')
    expect(rotatedMode('stars', 30 * 60_000)).toBe('clock')
  })

  it('does nothing when the interval is meaningless', () => {
    expect(rotatedMode('clock', 60 * 60_000, 0)).toBe('clock')
  })
})
