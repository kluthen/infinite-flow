import { describe, expect, it } from 'vitest'

import {
  RegisterWindowError,
  makeRegisterWindow,
  registerWindowContainsPitch,
  registerWindowIsContainedIn,
  registerWindowsIntersect,
} from '@/domain/profile/register-window'
import { makeActiveConcertRange } from '@/domain/profile/active-concert-range'

// @test-link [[module_register_window_resolution_primitives]]
describe('makeRegisterWindow', () => {
  it('constructs a valid inclusive window', () => {
    const window = makeRegisterWindow(48, 60)
    expect(window.minMidi).toBe(48)
    expect(window.maxMidi).toBe(60)
  })

  it('is deep-frozen and cannot be mutated', () => {
    const window = makeRegisterWindow(48, 60)
    expect(() => {
      // @ts-expect-error minMidi is readonly
      window.minMidi = 0
    }).toThrow()
    expect(window.minMidi).toBe(48)
  })

  it('rejects a non-integer minMidi', () => {
    expect(() => makeRegisterWindow(48.5, 60)).toThrow(RegisterWindowError)
  })

  it('rejects a non-integer maxMidi', () => {
    expect(() => makeRegisterWindow(48, 60.5)).toThrow(RegisterWindowError)
  })

  it('rejects minMidi > maxMidi', () => {
    expect(() => makeRegisterWindow(60, 48)).toThrow(RegisterWindowError)
  })

  it('accepts minMidi === maxMidi (a degenerate single-pitch window)', () => {
    expect(() => makeRegisterWindow(60, 60)).not.toThrow()
  })

  it('rejects bounds below plausible MIDI', () => {
    expect(() => makeRegisterWindow(-1, 60)).toThrow(RegisterWindowError)
  })

  it('rejects bounds above plausible MIDI', () => {
    expect(() => makeRegisterWindow(48, 128)).toThrow(RegisterWindowError)
  })
})

// @test-link [[module_register_window_resolution_primitives]]
describe('registerWindowContainsPitch', () => {
  const window = makeRegisterWindow(48, 60)

  it('reports the low edge as inside', () => {
    expect(registerWindowContainsPitch(window, 48)).toBe(true)
  })

  it('reports the high edge as inside', () => {
    expect(registerWindowContainsPitch(window, 60)).toBe(true)
  })

  it('reports one semitone below the low edge as outside', () => {
    expect(registerWindowContainsPitch(window, 47)).toBe(false)
  })

  it('reports one semitone above the high edge as outside', () => {
    expect(registerWindowContainsPitch(window, 61)).toBe(false)
  })
})

// @test-link [[module_register_window_resolution_primitives]]
describe('registerWindowIsContainedIn', () => {
  it('reports a window fully inside the active range as contained', () => {
    const range = makeActiveConcertRange(48, 72)
    const window = makeRegisterWindow(48, 60)
    expect(registerWindowIsContainedIn(window, range)).toBe(true)
  })

  it('reports a window extending below the active range as not contained', () => {
    const range = makeActiveConcertRange(48, 72)
    const window = makeRegisterWindow(47, 60)
    expect(registerWindowIsContainedIn(window, range)).toBe(false)
  })

  it('reports a window extending above the active range as not contained', () => {
    const range = makeActiveConcertRange(48, 72)
    const window = makeRegisterWindow(60, 73)
    expect(registerWindowIsContainedIn(window, range)).toBe(false)
  })
})

// @test-link [[module_register_window_resolution_primitives]]
describe('registerWindowsIntersect', () => {
  it('reports two overlapping windows as intersecting', () => {
    const a = makeRegisterWindow(48, 60)
    const b = makeRegisterWindow(54, 66)
    expect(registerWindowsIntersect(a, b)).toBe(true)
  })

  it('reports two touching-at-one-point windows as intersecting', () => {
    const a = makeRegisterWindow(48, 60)
    const b = makeRegisterWindow(60, 72)
    expect(registerWindowsIntersect(a, b)).toBe(true)
  })

  it('reports two disjoint windows as not intersecting', () => {
    const a = makeRegisterWindow(48, 59)
    const b = makeRegisterWindow(61, 72)
    expect(registerWindowsIntersect(a, b)).toBe(false)
  })
})
