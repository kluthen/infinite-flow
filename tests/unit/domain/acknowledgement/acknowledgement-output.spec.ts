/**
 * The shape of what acknowledgement can ever report. The `expectTypeOf` assertions are checked by
 * the type checker (`npm run typecheck`, part of `npm run build`): if a miss list, a wrong-note
 * mark, a score or any other field were added to the output, these lines would stop compiling.
 * The runtime assertions check the same thing on real output.
 */
import { describe, expect, expectTypeOf, it } from 'vitest'

import { placeAcknowledgementWindows } from '@/domain/acknowledgement/acknowledgement-window'
import {
  deriveExpectedNotes,
  type ExpectedNoteIdentity,
} from '@/domain/acknowledgement/expected-note'
import {
  acknowledgePlayedNote,
  acknowledgePlayedNotes,
} from '@/domain/acknowledgement/note-matching'
import {
  compensatePlayedNote,
  latencyCorrectionFor,
} from '@/domain/acknowledgement/played-onset-latency'
import { makeConcertPitch } from '@/domain/events/concert-pitch'
import type { MeasureIndex } from '@/domain/events/measure'
import { phraseFromBars } from './acknowledgement-fixtures'

/** The whole of an acknowledgement: which note, nothing about how well or what else was played. */
interface ExactlyAnIdentity {
  readonly phraseNumber: number
  readonly measureIndex: MeasureIndex
  readonly eventIndex: number
}

// @test-link [[rule_no_grading_or_mismatch_signal]]
// @test-link [[rule_acknowledgement_exact_pitch]]
describe('acknowledgement output', () => {
  it('is typed as a list of note identities and nothing else', () => {
    expectTypeOf<ExpectedNoteIdentity>().toEqualTypeOf<ExactlyAnIdentity>()
    expectTypeOf<keyof ExpectedNoteIdentity>().toEqualTypeOf<
      'phraseNumber' | 'measureIndex' | 'eventIndex'
    >()
    expectTypeOf(acknowledgePlayedNotes).returns.toEqualTypeOf<readonly ExactlyAnIdentity[]>()
    expectTypeOf(acknowledgePlayedNote).returns.toEqualTypeOf<readonly ExactlyAnIdentity[]>()
  })

  it('carries only identities at run time, whatever was played', () => {
    const expected = placeAcknowledgementWindows(
      deriveExpectedNotes(phraseFromBars(['q q q q', 'w', 'w', 'w']), {
        phraseNumber: 1,
        startSeconds: 0,
        tempoBpm: 120,
      }),
    )
    const usb = latencyCorrectionFor('usb')
    const played = [60, 61, 62, 90].map((pitch, index) =>
      compensatePlayedNote({ pitch: makeConcertPitch(pitch), audioClockSeconds: index * 0.5 }, usb),
    )

    const acknowledged = acknowledgePlayedNotes(expected, played)

    expect(acknowledged.length).toBeGreaterThan(0)
    for (const each of acknowledged) {
      expect(Object.keys(each).sort()).toEqual(['eventIndex', 'measureIndex', 'phraseNumber'])
    }
  })
})
