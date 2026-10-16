/**
 * The Review's system-position size (ux D290): the larger of the shared size and the size the
 * session's own instrument needs in the clef its phrases were played in.
 */
import { describe, expect, it } from 'vitest'

import { reviewSystemPositionUnits } from '@/components/review/review-system-size'
import { makeMyInstrument } from '@/domain/profile/my-instrument'
import { NOTATION_SYSTEM_POSITION_UNITS } from '@/notation/notation-layout-policy'
import { recordedRecords } from './review-fixtures'

/** My instrument written C2 to C4, in `clef`. */
function lowKeys(clef: 'treble' | 'bass') {
  return makeMyInstrument({
    template: 'c-keyboard',
    name: 'Low keys',
    clef,
    writtenRange: { minMidi: 36, maxMidi: 60 },
    transposition: { octaves: 0, semitones: 0, direction: 'same' },
  })
}

/** Intent: the recorded phrases as played with `instrument` in `clef`. */
function playedWith(instrument: ReturnType<typeof lowKeys>, clef: 'treble' | 'bass') {
  return recordedRecords().map((record) => ({
    ...record,
    intent: { ...record.intent, instrumentProfile: instrument.profile },
    clef,
  }))
}

// @test-link [[module_notation_layout_preflight]]
// @test-link [[req_kept_session_review]]
describe("the Review's system-position size", () => {
  it('takes the 19 staff spaces a session played in treble clef with written C2 to C4 needs, over a shared 16', () => {
    const treble = playedWith(lowKeys('treble'), 'treble')
    expect(reviewSystemPositionUnits(NOTATION_SYSTEM_POSITION_UNITS, treble)).toBe(190)
  })

  it('keeps the shared size when the session needs no more: the same range in bass clef, or a built-in', () => {
    const bass = playedWith(lowKeys('bass'), 'bass')
    expect(reviewSystemPositionUnits(NOTATION_SYSTEM_POSITION_UNITS, bass)).toBe(160)
    expect(reviewSystemPositionUnits(190, recordedRecords())).toBe(190)
  })
})
