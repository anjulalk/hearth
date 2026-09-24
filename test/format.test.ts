import { describe, expect, it } from 'vitest'
import { clockParts, dateLine, elapsed, elapsedShort, pad, percent } from '@/lib/format'

// 25 September 2026 is a Friday, and every date here is built in local time so
// the expectations hold wherever the suite runs.
const evening = new Date(2026, 8, 25, 21, 4, 37)
const morning = new Date(2026, 8, 25, 9, 4, 5)
const noon = new Date(2026, 8, 25, 12, 0, 0)
const midnight = new Date(2026, 8, 25, 0, 0, 0)

describe('pad', () => {
  it('always returns two digits', () => {
    expect(pad(0)).toBe('00')
    expect(pad(9)).toBe('09')
    expect(pad(37)).toBe('37')
  })
})

describe('clockParts', () => {
  it('reads a 24 hour evening', () => {
    expect(clockParts(evening, true)).toEqual({
      hour: '21',
      minute: '04',
      seconds: '37',
      meridiem: '',
      time: '21:04',
    })
  })

  it('reads a twelve hour morning', () => {
    expect(clockParts(morning, false)).toEqual({
      hour: '09',
      minute: '04',
      seconds: '05',
      meridiem: 'AM',
      time: '09:04',
    })
  })

  it('calls noon and midnight by their names', () => {
    expect(clockParts(noon, false).meridiem).toBe('PM')
    expect(clockParts(noon, false).hour).toBe('12')
    expect(clockParts(midnight, false).meridiem).toBe('AM')
    expect(clockParts(midnight, false).hour).toBe('12')
  })
})

describe('dateLine', () => {
  it('writes the day and the month out', () => {
    expect(dateLine(new Date(2026, 8, 25), 'en-GB')).toBe('Friday 25 September')
  })
})

describe('elapsed', () => {
  it('starts in seconds, moves to minutes, then hours', () => {
    expect(elapsed(0)).toBe('0s')
    expect(elapsed(48_000)).toBe('48s')
    expect(elapsed(65_000)).toBe('1m 05s')
    expect(elapsed(3 * 3600_000 + 12 * 60_000)).toBe('3h 12m')
  })

  it('never goes negative', () => {
    expect(elapsed(-5000)).toBe('0s')
  })
})

describe('elapsedShort', () => {
  it('drops the seconds once there is something bigger to say', () => {
    expect(elapsedShort(48_000)).toBe('48s')
    expect(elapsedShort(65_000)).toBe('1m')
    expect(elapsedShort(3 * 3600_000 + 12 * 60_000)).toBe('3h 12m')
  })
})

describe('percent', () => {
  it('rounds and clamps a battery level', () => {
    expect(percent(0.823)).toBe('82%')
    expect(percent(1.4)).toBe('100%')
    expect(percent(-1)).toBe('0%')
  })
})
