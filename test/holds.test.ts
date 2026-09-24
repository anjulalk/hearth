import { describe, expect, it } from 'vitest'
import { holdStatus, type HoldInput } from '@/lib/holds'

const base: HoldInput = {
  running: true,
  visible: true,
  wakeLock: 'held',
  media: 'strong',
  needsGesture: false,
  miniHeld: false,
}

describe('when nothing is running', () => {
  it('says so plainly', () => {
    const status = holdStatus({ ...base, running: false })
    expect(status.level).toBe('off')
    expect(status.tone).toBe('off')
    expect(status.note).toBeNull()
  })
})

describe('the strong hold', () => {
  it('reports the screen lock while the tab is visible', () => {
    const status = holdStatus(base)
    expect(status.level).toBe('screen')
    expect(status.tone).toBe('on')
    expect(status.short).toBe('screen lock held')
    expect(status.note).toBeNull()
  })

  it('keeps the strong hold when the mini window carries it', () => {
    const status = holdStatus({ ...base, visible: false, wakeLock: 'released', miniHeld: true })
    expect(status.level).toBe('screen')
    expect(status.detail).toContain('mini window')
  })

  it('asks for one click when the audio track is still waiting', () => {
    const status = holdStatus({ ...base, media: 'silent', needsGesture: true })
    expect(status.level).toBe('screen')
    expect(status.detail).toContain('Click the page once')
  })
})

describe('the media hold', () => {
  it('is honest that the tab is in the background', () => {
    const status = holdStatus({ ...base, visible: false, wakeLock: 'released' })
    expect(status.level).toBe('media')
    expect(status.tone).toBe('warn')
    expect(status.title).toBe('In the background')
    expect(status.note).toBe('background · media hold')
    expect(status.detail).toContain('released the screen lock')
  })

  it('says the lock is missing when the tab is visible', () => {
    const status = holdStatus({ ...base, wakeLock: 'released' })
    expect(status.level).toBe('media')
    expect(status.title).toBe('Media hold only')
  })
})

describe('the weak hold', () => {
  it('asks for a click when only the silent stream is running', () => {
    const status = holdStatus({
      ...base,
      visible: false,
      wakeLock: 'released',
      media: 'silent',
      needsGesture: true,
    })
    expect(status.level).toBe('weak')
    expect(status.tone).toBe('warn')
    expect(status.note).toBe('weak hold · may be frozen')
    expect(status.detail).toContain('Click or tap the page once')
  })

  it('blames the setting when the media hold is off', () => {
    const status = holdStatus({ ...base, wakeLock: 'unsupported', media: 'off' })
    expect(status.level).toBe('weak')
    expect(status.detail).toContain('switched off')
    expect(status.detail).toContain('no screen wake lock')
  })

  it('blames the browser when the stream was blocked and no lock is held', () => {
    const status = holdStatus({ ...base, wakeLock: 'released', media: 'blocked' })
    expect(status.level).toBe('weak')
    expect(status.detail).toContain('refused to play')
  })

  it('warns that the fallback is missing while the lock is held', () => {
    const status = holdStatus({ ...base, media: 'blocked' })
    expect(status.level).toBe('screen')
    expect(status.detail).toContain('no second hold')
  })

  it('names a refused lock', () => {
    const status = holdStatus({ ...base, wakeLock: 'denied', media: 'off' })
    expect(status.title).toBe('Screen lock refused')
  })
})
