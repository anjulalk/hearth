import { describe, expect, it } from 'vitest'
import type { StorageLike } from '@/lib/prefs'
import { addWatch, clearSession, localDay, readSession, readWatch, writeSession } from '@/lib/stats'

function fakeStore(seed: Record<string, string> = {}): StorageLike & { dump(): Record<string, string> } {
  const data = new Map(Object.entries(seed))
  return {
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => {
      data.set(key, value)
    },
    removeItem: (key) => {
      data.delete(key)
    },
    dump: () => Object.fromEntries(data),
  }
}

const friday = new Date(2026, 8, 25, 21, 4, 0)
const saturday = new Date(2026, 8, 26, 9, 0, 0)

describe('localDay', () => {
  it('writes a sortable local date', () => {
    expect(localDay(friday)).toBe('2026-09-25')
    expect(localDay(new Date(2026, 0, 3))).toBe('2026-01-03')
  })
})

describe('the day total', () => {
  it('starts empty', () => {
    expect(readWatch(undefined, friday)).toEqual({ d: '2026-09-25', ms: 0 })
    expect(readWatch(fakeStore(), friday).ms).toBe(0)
  })

  it('adds a watch up', () => {
    const store = fakeStore()
    addWatch(60_000, store, friday)
    const day = addWatch(30_000, store, friday)
    expect(day.ms).toBe(90_000)
    expect(readWatch(store, friday).ms).toBe(90_000)
  })

  it('forgets yesterday', () => {
    const store = fakeStore()
    addWatch(3600_000, store, friday)
    expect(readWatch(store, saturday)).toEqual({ d: '2026-09-26', ms: 0 })
  })

  it('ignores a value it cannot read', () => {
    expect(readWatch(fakeStore({ 'hearth.day': 'not json' }), friday).ms).toBe(0)
    expect(readWatch(fakeStore({ 'hearth.day': '{"d":5,"ms":"x"}' }), friday).ms).toBe(0)
    expect(readWatch(fakeStore({ 'hearth.day': '{"d":"2026-09-25","ms":-4}' }), friday).ms).toBe(0)
  })

  it('never subtracts', () => {
    const store = fakeStore()
    addWatch(-5000, store, friday)
    expect(readWatch(store, friday).ms).toBe(0)
  })
})

describe('the session', () => {
  it('round trips a start and a last seen', () => {
    const store = fakeStore()
    writeSession({ startedAt: friday.getTime(), seenAt: friday.getTime() }, store)
    expect(readSession(store, friday.getTime())).toEqual({
      startedAt: friday.getTime(),
      seenAt: friday.getTime(),
    })
  })

  it('carries a later seen time, which is how a gap is told from a refresh', () => {
    const store = fakeStore()
    writeSession({ startedAt: friday.getTime(), seenAt: friday.getTime() + 3600_000 }, store)
    expect(readSession(store, friday.getTime() + 3600_000)?.seenAt).toBe(friday.getTime() + 3600_000)
  })

  it('treats a file written before seenAt existed as seen at its start', () => {
    const store = fakeStore({
      'hearth.session': JSON.stringify({ startedAt: friday.getTime() }),
    })
    expect(readSession(store, friday.getTime())?.seenAt).toBe(friday.getTime())
  })

  it('refuses a start from the future, or from a week ago', () => {
    const store = fakeStore()
    writeSession({ startedAt: friday.getTime() + 60_000, seenAt: friday.getTime() }, store)
    expect(readSession(store, friday.getTime())).toBeNull()

    const old = fakeStore()
    writeSession({ startedAt: friday.getTime(), seenAt: friday.getTime() }, old)
    const week = friday.getTime() + 8 * 24 * 3600_000
    expect(readSession(old, week)).toBeNull()
  })

  it('clears', () => {
    const store = fakeStore()
    writeSession({ startedAt: friday.getTime(), seenAt: friday.getTime() }, store)
    clearSession(store)
    expect(readSession(store, friday.getTime())).toBeNull()
    expect(store.dump()['hearth.session']).toBeUndefined()
  })
})
