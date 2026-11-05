// @vitest-environment node
/**
 * Tap tempo's stateful part: a press unlocks the audio, then taps at the audio clock's time and
 * starts or keeps listening; while listening, controller taps count; from the fourth tap of a run
 * Jam's tempo is set (never to the value it already has), each further tap updating it; listening
 * ends two seconds after the last tap on the audio clock, read lazily and by a wall-clock timer
 * that never ends a run early; the field-note's state through a run's end, a tempo changed another
 * way and leaving Jam mode. The audio clock here is a number the test moves, as the e2e harness's
 * is.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { createTapTempo, type TapTempo } from '@/jam/use-tap-tempo'

/** A tap tempo over a fake audio clock and a recorded tempo, the calls it made kept in order. */
interface Rig {
  readonly tapTempo: TapTempo
  readonly calls: string[]
  readonly setTempo: ReturnType<typeof vi.fn<(tempo: number) => void>>
  /** Move the audio clock to `seconds`. */
  readonly at: (seconds: number) => void
}

/** Intent: a tap tempo whose audio clock starts at 0 and whose Jam tempo starts at `tempo`. */
function rig(tempo = 90): Rig {
  let clock = 0
  let current = tempo
  const calls: string[] = []
  const setTempo = vi.fn((value: number) => {
    calls.push(`set ${value}`)
    current = value
  })
  const tapTempo = createTapTempo({
    unlockAudio: () => calls.push('unlock'),
    now: () => {
      calls.push('now')
      return clock
    },
    setTempo,
    tempo: () => current,
  })
  return {
    tapTempo,
    calls,
    setTempo,
    at: (seconds) => {
      clock = seconds
    },
  }
}

/** Intent: press the button at each of `times` on the audio clock. */
function pressAt(r: Rig, times: readonly number[]): void {
  for (const time of times) {
    r.at(time)
    r.tapTempo.press()
  }
}

let current: Rig | null = null

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  current?.tapTempo.dispose()
  current = null
  vi.useRealTimers()
})

/** Intent: a rig disposed after the test. */
function make(tempo?: number): Rig {
  current = rig(tempo)
  return current
}

// @test-link [[rule_jam_tap_in_listening]]
describe('createTapTempo', () => {
  // @test-link [[rule_jam_tap_in_listening]]
  it('rests, not listening, until a press; a press unlocks the audio, then taps and listens', () => {
    const r = make()
    expect(r.tapTempo.listening.value).toBe(false)
    expect(r.tapTempo.note.value).toEqual({ kind: 'rest' })
    expect(r.tapTempo.isListening()).toBe(false)

    r.tapTempo.press()
    expect(r.calls.slice(0, 2)).toEqual(['unlock', 'now'])
    expect(r.tapTempo.listening.value).toBe(true)
    expect(r.tapTempo.isListening()).toBe(true)
    expect(r.tapTempo.note.value).toEqual({ kind: 'counting' })
    expect(r.setTempo).not.toHaveBeenCalled()
  })

  // @test-link [[rule_jam_tempo_from_taps]]
  it('sets 120 BPM on the fourth press half a second apart, and a fifth updates it', () => {
    const r = make()
    pressAt(r, [0, 0.5, 1])
    expect(r.setTempo).not.toHaveBeenCalled()
    expect(r.tapTempo.note.value).toEqual({ kind: 'counting' })

    pressAt(r, [1.5])
    expect(r.setTempo.mock.calls).toEqual([[120]])
    expect(r.tapTempo.note.value).toEqual({ kind: 'set', tempo: 120 })

    // The last four now span 0.5 to 1.9 s: a beat of 0.467 s, 128.6 BPM, nearest 130.
    pressAt(r, [1.9])
    expect(r.setTempo.mock.calls).toEqual([[120], [130]])
    expect(r.tapTempo.note.value).toEqual({ kind: 'set', tempo: 130 })
  })

  // @test-link [[rule_jam_tempo_from_taps]]
  it('sets nothing when the taps give the tempo Jam already has, the note naming it', () => {
    const r = make(120)
    pressAt(r, [0, 0.5, 1, 1.5])
    expect(r.setTempo).not.toHaveBeenCalled()
    expect(r.tapTempo.note.value).toEqual({ kind: 'set', tempo: 120 })
  })

  // @test-link [[rule_jam_tap_in_listening]]
  it('counts controller taps only while listening, kept in time order', () => {
    const r = make()
    r.tapTempo.tap(0)
    r.tapTempo.tap(0.5)
    expect(r.tapTempo.listening.value).toBe(false)
    expect(r.tapTempo.note.value).toEqual({ kind: 'rest' })

    pressAt(r, [1])
    r.at(1.6)
    r.tapTempo.tap(1.5)
    // A held note reported at its release, its onset before the press that came after it.
    pressAt(r, [2.1])
    r.tapTempo.tap(1.95)
    // In time order 1, 1.5, 1.95, 2.1: a beat of 0.367 s, 163.6 BPM, nearest 160 (in the order
    // reported, 1 to 1.95, it would be 189.5, kept at 180).
    expect(r.setTempo.mock.calls).toEqual([[160]])
    r.at(2.6)
    r.tapTempo.tap(2.5)
    // The last four: 1.5, 1.95, 2.1, 2.5: a beat of 0.333 s, 180 BPM.
    expect(r.setTempo.mock.calls).toEqual([[160], [180]])
  })

  // @test-link [[rule_jam_tap_in_listening]]
  it('a note begun in an earlier run is not a tap of the next run, which a press starts', () => {
    const r = make()
    pressAt(r, [0])
    r.tapTempo.end()
    pressAt(r, [5, 5.5, 6])
    // A note held from the first run, reported at its release with its onset at 0.4.
    r.tapTempo.tap(0.4)
    expect(r.setTempo).not.toHaveBeenCalled()
    expect(r.tapTempo.note.value).toEqual({ kind: 'counting' })
  })

  // @test-link [[rule_jam_tap_in_listening]]
  it('stops listening two seconds after the last tap on the audio clock, read lazily', () => {
    const r = make()
    pressAt(r, [10])
    r.at(11.99)
    expect(r.tapTempo.isListening()).toBe(true)
    r.at(12)
    expect(r.tapTempo.listening.value, 'until something reads it').toBe(true)
    expect(r.tapTempo.isListening()).toBe(false)
    expect(r.tapTempo.listening.value).toBe(false)
    expect(r.tapTempo.note.value).toEqual({ kind: 'rest' })
    r.tapTempo.tap(12.1)
    expect(r.tapTempo.note.value).toEqual({ kind: 'rest' })
  })

  // @test-link [[rule_jam_tap_in_listening]]
  it('ends listening by its timer once both clocks pass, never early while the audio clock lags', () => {
    const r = make()
    pressAt(r, [0])
    // Two wall-clock seconds pass but the audio clock lags at 1.5 s: still listening, twice.
    r.at(1.5)
    vi.advanceTimersByTime(2000)
    expect(r.tapTempo.listening.value).toBe(true)
    vi.advanceTimersByTime(500)
    expect(r.tapTempo.listening.value).toBe(true)
    // The audio clock reaches the run's deadline, 2 s; the re-armed timer ends the run.
    r.at(2)
    vi.advanceTimersByTime(500)
    expect(r.tapTempo.listening.value).toBe(false)
    expect(r.tapTempo.note.value).toEqual({ kind: 'rest' })
  })

  // @test-link [[rule_jam_tap_in_listening]]
  it('every tap pushes the end back', () => {
    const r = make()
    pressAt(r, [0])
    r.at(1.5)
    vi.advanceTimersByTime(1500)
    pressAt(r, [1.5])
    r.at(3)
    vi.advanceTimersByTime(1500)
    expect(r.tapTempo.listening.value).toBe(true)
    r.at(3.5)
    vi.advanceTimersByTime(500)
    expect(r.tapTempo.listening.value).toBe(false)
  })

  // @test-link [[rule_jam_tap_in_listening]]
  it('ends at once when anything else is used: counting rests, a tempo set stays', () => {
    const r = make()
    pressAt(r, [0, 0.5])
    r.tapTempo.end()
    expect(r.tapTempo.listening.value).toBe(false)
    expect(r.tapTempo.isListening()).toBe(false)
    expect(r.tapTempo.note.value).toEqual({ kind: 'rest' })

    pressAt(r, [5, 5.5, 6, 6.5])
    r.tapTempo.end()
    expect(r.tapTempo.listening.value).toBe(false)
    expect(r.tapTempo.note.value).toEqual({ kind: 'set', tempo: 120 })
  })

  // @test-link [[rule_jam_tap_in_listening]]
  it('a tempo set stays until the tempo is changed another way', () => {
    const r = make()
    pressAt(r, [0, 0.5, 1, 1.5])
    r.tapTempo.end()
    r.tapTempo.tempoChanged(120)
    expect(r.tapTempo.note.value).toEqual({ kind: 'set', tempo: 120 })
    r.tapTempo.tempoChanged(130)
    expect(r.tapTempo.note.value).toEqual({ kind: 'rest' })
  })

  // @test-link [[rule_jam_tap_in_listening]]
  it('leaving Jam mode ends listening and rests the note', () => {
    const r = make()
    pressAt(r, [0, 0.5, 1, 1.5])
    r.tapTempo.leave()
    expect(r.tapTempo.listening.value).toBe(false)
    expect(r.tapTempo.note.value).toEqual({ kind: 'rest' })
    vi.advanceTimersByTime(5000)
    expect(r.tapTempo.listening.value).toBe(false)
  })

  // @test-link [[rule_jam_tempo_from_taps]]
  it('a new run counts from zero taps', () => {
    const r = make()
    pressAt(r, [0, 0.5, 1, 1.5])
    expect(r.setTempo.mock.calls).toEqual([[120]])
    r.at(10)
    expect(r.tapTempo.isListening()).toBe(false)

    pressAt(r, [10, 10.25, 10.5])
    expect(r.tapTempo.note.value).toEqual({ kind: 'counting' })
    expect(r.setTempo.mock.calls).toEqual([[120]])
    pressAt(r, [10.75])
    // 0.25 s beats: 240 BPM, kept at 180.
    expect(r.setTempo.mock.calls).toEqual([[120], [180]])
    expect(r.tapTempo.note.value).toEqual({ kind: 'set', tempo: 180 })
  })
})
