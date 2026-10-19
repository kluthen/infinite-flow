// @vitest-environment node
/**
 * A decorating note lights for its exact pitch inside its window: in a real generated phrase
 * holding a free appoggiatura and a diatonic enclosure, each of their notes is acknowledged when
 * its exact concert pitch is played inside its window, and never a half step or an octave off.
 */

import { describe, expect, it } from 'vitest'

import { placeAcknowledgementWindows } from '@/domain/acknowledgement/acknowledgement-window'
import { deriveExpectedNotes } from '@/domain/acknowledgement/expected-note'
import { acknowledgePlayedNotes } from '@/domain/acknowledgement/note-matching'
import {
  compensatePlayedNote,
  latencyCorrectionFor,
  type PlayedNote,
} from '@/domain/acknowledgement/played-onset-latency'
import { makeConcertPitch } from '@/domain/events/concert-pitch'
import { generatePhrase } from '@/domain/generation/orchestration/generation-orchestrator'
import { flattenNotes } from '@/domain/validation/generation-result-validator-checks'
import { censusOfOutcome } from '../../../sweep/figure-census'
import { everyFigureAt, gridIntent } from '../pitch/figure-levels-grid'

/** Intent: a played note over USB at a concert pitch and an audio-clock time. */
function play(pitch: number, audioClockSeconds: number): PlayedNote {
  return compensatePlayedNote(
    { pitch: makeConcertPitch(pitch), audioClockSeconds },
    latencyCorrectionFor('usb'),
  )
}

/** Both new figures Strongly favored, every other figure as today. */
const LEVELS = {
  ...everyFigureAt('asToday'),
  appoggiatura: 'stronglyFavored',
  diatonicEnclosure: 'stronglyFavored',
} as const

/** Intent: the fixed phrase, its windowed expected notes, and the attacks of each new figure. */
function decoratedPhrase() {
  const intent = gridIntent(
    {
      seed: 7,
      arpeggioChaos: 'Varied',
      noteDensity: 'Quarter',
      collection: 'Major',
      tension: 'Settled',
    },
    LEVELS,
    'decorating-figure-acknowledgement',
  )
  const outcome = generatePhrase(intent)
  if (outcome.kind !== 'generation_success') throw new Error(`generation gave ${outcome.code}`)
  const census = censusOfOutcome(intent, outcome)
  if ('kind' in census) throw new Error(`census failed: ${census.code}`)
  /** The attacks of every instance of one figure. */
  const membersOf = (figure: string) =>
    census.instances
      .filter((instance) => instance.figure === figure)
      .flatMap((instance) => instance.attackIndices)
  const midis = flattenNotes(outcome.result.timeline.measures)
    .filter((ref) => !ref.event.tieContinuation)
    .map((ref) => ref.event.pitch)
  const expected = placeAcknowledgementWindows(
    deriveExpectedNotes(outcome.result.timeline, {
      phraseNumber: 1,
      startSeconds: 0,
      tempoBpm: 120,
    }),
  )
  return {
    midis,
    expected,
    appoggiatura: membersOf('appoggiatura'),
    enclosure: membersOf('diatonic_enclosure'),
  }
}

// @test-link [[rule_acknowledgement_exact_pitch]]
// @test-link [[rule_embellishment_figures_defined]]
describe('acknowledgement of a free appoggiatura and a diatonic enclosure', () => {
  const { midis, expected, appoggiatura, enclosure } = decoratedPhrase()

  it('finds both figures in the fixed phrase, one expected note per attack', () => {
    expect(appoggiatura.length).toBeGreaterThan(0)
    expect(enclosure.length).toBeGreaterThan(0)
    expect(expected.map((note) => note.pitch)).toEqual(midis)
  })

  it('acknowledges each figure note played at its exact pitch inside its window', () => {
    for (const index of [...appoggiatura, ...enclosure]) {
      const note = expected[index]!
      const { opensAtSeconds, closesAtSeconds } = note.window
      for (const time of [note.onsetSeconds, (opensAtSeconds + closesAtSeconds) / 2])
        expect(acknowledgePlayedNotes(expected, [play(note.pitch, time)])).toEqual([note.identity])
    }
  })

  it('never acknowledges a figure note played a half step or an octave off', () => {
    for (const index of [...appoggiatura, ...enclosure]) {
      const note = expected[index]!
      for (const offset of [-12, -1, 1, 12])
        expect(
          acknowledgePlayedNotes(expected, [play(note.pitch + offset, note.onsetSeconds)]),
        ).toEqual([])
    }
  })
})
