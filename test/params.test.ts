import { describe, expect, it } from 'vitest'
import { clampAgents, isDimTier, isModeId, isOn, parseOptions } from '@/lib/params'

describe('isOn', () => {
  it('accepts the usual yes spellings', () => {
    for (const value of ['1', 'true', 'TRUE', 'on', 'yes']) expect(isOn(value)).toBe(true)
  })

  it('treats a bare key as yes and a missing value as no', () => {
    expect(isOn('')).toBe(true)
    expect(isOn(null)).toBe(false)
    expect(isOn('0')).toBe(false)
    expect(isOn('false')).toBe(false)
  })
})

describe('clampAgents', () => {
  it('keeps the count inside the stage', () => {
    expect(clampAgents(0)).toBe(1)
    expect(clampAgents(3.4)).toBe(3)
    expect(clampAgents(99)).toBe(12)
    expect(clampAgents(Number.NaN)).toBe(3)
  })
})

describe('parseOptions', () => {
  it('reads start from a query value', () => {
    expect(parseOptions('?start=1')).toEqual({ start: true })
    expect(parseOptions('?start=0')).toEqual({})
    expect(parseOptions('?auto=1')).toEqual({ start: true })
  })

  it('reads the hash form, which is easier to type', () => {
    expect(parseOptions('', '#start')).toEqual({ start: true })
    expect(parseOptions('', '#clock')).toEqual({ mode: 'clock' })
    expect(parseOptions('', '#deep')).toEqual({ dim: 'deep' })
    expect(parseOptions('', '#stars&start')).toEqual({ mode: 'stars', start: true })
  })

  it('turns mode=rotate into the rotate flag', () => {
    expect(parseOptions('?mode=rotate')).toEqual({ rotate: true })
    expect(parseOptions('?mode=ember')).toEqual({ mode: 'ember' })
  })

  it('reads the numeric and boolean options', () => {
    expect(parseOptions('?agents=7')).toEqual({ agents: 7 })
    expect(parseOptions('?agents=99')).toEqual({ agents: 12 })
    expect(parseOptions('?seconds=1')).toEqual({ seconds: true })
    expect(parseOptions('?rotate=0')).toEqual({ rotate: false })
    expect(parseOptions('?dim=deep')).toEqual({ dim: 'deep' })
  })

  it('ignores anything it does not know', () => {
    expect(parseOptions('?mode=turbo&dim=loud&agents=abc&nonsense=1', '#nope')).toEqual({})
    expect(parseOptions('')).toEqual({})
  })
})

describe('guards', () => {
  it('recognises the known modes and tiers only', () => {
    expect(isModeId('clock')).toBe(true)
    expect(isModeId('CLOCK')).toBe(false)
    expect(isDimTier('gentle')).toBe(true)
    expect(isDimTier('medium')).toBe(false)
  })
})
