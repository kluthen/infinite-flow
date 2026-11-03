/**
 * The key and mode suggestion a fresh Jam worked out at its doodle's end, kept in the session
 * history beside the doodle, once, before the end, and read back frozen.
 */
import { describe, expect, it } from 'vitest'

import { makeQuantizedDoodle } from '@/domain/doodle/quantized-doodle'
import { makeConcertPitch } from '@/domain/events/concert-pitch'
import {
  SessionHistoryError,
  createSessionHistory,
  type RecordedDoodle,
  type SessionHistory,
} from '@/session/session-history'
import { DEFAULT_SESSION_SEED, fixedWallClock, sessionSettings } from './session-harness'

/** A one-measure doodle of two notes at 240 BPM, its first barline at 1 s. */
const DOODLE: RecordedDoodle = {
  doodle: makeQuantizedDoodle({
    measureCount: 1,
    notes: [
      { startTick: 0, lengthTicks: 4, pitch: 60 },
      { startTick: 8, lengthTicks: 8, pitch: 62 },
    ],
  }),
  captureTempo: 240,
  firstBarlineAt: 1,
  endBarlineAt: 2,
  notes: [
    { pitch: makeConcertPitch(60), onsetAt: 1 },
    { pitch: makeConcertPitch(62), onsetAt: 1.5 },
  ],
}

/** Intent: a fresh history at 240 BPM, nothing recorded yet. */
function freshHistory(): SessionHistory {
  return createSessionHistory(
    sessionSettings({ tempo: 240 }),
    fixedWallClock,
    DEFAULT_SESSION_SEED,
    'treble',
  )
}

// @test-link [[module_key_suggestion]]
describe("a fresh Jam's suggestion in the session history", () => {
  // @test-link [[module_key_suggestion]]
  it('holds none until one is recorded, then keeps it beside the doodle, frozen', () => {
    const history = freshHistory()
    expect(history.suggestion()).toBeNull()
    history.recordDoodle(DOODLE)
    const suggestion = { kind: 'suggested', tonalCenter: 'G', collection: 'Major' } as const
    history.recordSuggestion(suggestion)
    expect(history.suggestion()).toEqual(suggestion)
    expect(Object.isFrozen(history.suggestion())).toBe(true)
    expect(history.doodle()?.doodle).toEqual(DOODLE.doodle)
  })

  // @test-link [[module_key_suggestion]]
  it('refuses a suggestion with no doodle, and a second one', () => {
    const history = freshHistory()
    expect(() => history.recordSuggestion({ kind: 'nothing' })).toThrow(SessionHistoryError)
    history.recordDoodle(DOODLE)
    history.recordSuggestion({ kind: 'no_fit' })
    expect(() => history.recordSuggestion({ kind: 'nothing' })).toThrow(SessionHistoryError)
    expect(history.suggestion()).toEqual({ kind: 'no_fit' })
  })
})
