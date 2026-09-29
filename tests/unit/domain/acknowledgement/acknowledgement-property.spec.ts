/**
 * The acknowledgement property over the whole fixture set, at every tempo the tempo control offers
 * and over both connection types: playing every expected note exactly on time acknowledges every
 * one, and playing each one a semitone off (above or below) acknowledges none. Each fixture is
 * also followed by the next fixture of the set as the next phrase, so the last note of every
 * phrase is bounded by a real next phrase.
 */
import { describe, expect, it } from 'vitest'

import { placeAcknowledgementWindows } from '@/domain/acknowledgement/acknowledgement-window'
import { deriveExpectedNotes, type ExpectedNote } from '@/domain/acknowledgement/expected-note'
import { acknowledgePlayedNotes } from '@/domain/acknowledgement/note-matching'
import {
  compensatePlayedNote,
  latencyCorrectionFor,
  type ControllerConnection,
  type PlayedNote,
} from '@/domain/acknowledgement/played-onset-latency'
import { makeConcertPitch } from '@/domain/events/concert-pitch'
import {
  ACKNOWLEDGEMENT_TEMPOS,
  acknowledgementFixtureSet,
  type AcknowledgementFixture,
} from './acknowledgement-fixtures'

const FIXTURES = acknowledgementFixtureSet()
const CONNECTIONS: readonly ControllerConnection[] = ['usb', 'bluetooth-le']
const PHRASE_START_SECONDS = 3.7

/** Intent: the expected notes of a fixture followed by the next fixture, at one tempo. */
function twoPhrases(
  fixture: AcknowledgementFixture,
  next: AcknowledgementFixture,
  tempoBpm: number,
): readonly ExpectedNote[] {
  const phraseSeconds = (4 * 4 * 60) / tempoBpm
  return [
    ...deriveExpectedNotes(fixture.timeline, {
      phraseNumber: 1,
      startSeconds: PHRASE_START_SECONDS,
      tempoBpm,
    }),
    ...deriveExpectedNotes(next.timeline, {
      phraseNumber: 2,
      startSeconds: PHRASE_START_SECONDS + phraseSeconds,
      tempoBpm,
    }),
  ]
}

/**
 * Intent: play each expected note at its exact onset, shifted by `semitones`, as a controller on
 * `connection` would deliver it: late on the audio clock by the shipped latency correction.
 */
function playEach(
  notes: readonly ExpectedNote[],
  semitones: number,
  connection: ControllerConnection,
): readonly PlayedNote[] {
  const correction = latencyCorrectionFor(connection)
  const delay = correction.outputLatencySeconds + correction.connectionLatencySeconds
  return notes.map((note) =>
    compensatePlayedNote(
      {
        pitch: makeConcertPitch(note.pitch + semitones),
        audioClockSeconds: note.onsetSeconds + delay,
      },
      correction,
    ),
  )
}

// @test-link [[rule_expected_note_window]]
// @test-link [[rule_acknowledgement_exact_pitch]]
// @test-link [[rule_played_onset_latency_compensation]]
describe('acknowledgement over the fixture set', () => {
  it('covers ties, rests, and notes closer than 150 ms at some tempo', () => {
    const timelines = FIXTURES.map((fixture) => fixture.timeline)
    const events = timelines.flatMap((timeline) => timeline.measures.flatMap((m) => m.events))

    expect(events.some((event) => event.kind === 'note' && event.tieContinuation)).toBe(true)
    expect(events.some((event) => event.kind === 'rest')).toBe(true)
    const sixteenths = FIXTURES.find((fixture) => fixture.name === 'sixteenth grid')!
    const fastest = deriveExpectedNotes(sixteenths.timeline, {
      phraseNumber: 1,
      startSeconds: 0,
      tempoBpm: 240,
    })
    expect(fastest[1]!.onsetSeconds - fastest[0]!.onsetSeconds).toBeLessThan(0.15)
  })

  describe.each(FIXTURES.map((fixture, index) => ({ fixture, index })))(
    '$fixture.name',
    ({ fixture, index }) => {
      const next = FIXTURES[(index + 1) % FIXTURES.length]!

      it('acknowledges every expected note played on time, at every tempo', () => {
        for (const tempoBpm of ACKNOWLEDGEMENT_TEMPOS) {
          const notes = twoPhrases(fixture, next, tempoBpm)
          const windowed = placeAcknowledgementWindows(notes)
          expect(notes.length).toBeGreaterThan(1)
          for (const connection of CONNECTIONS) {
            const acknowledged = acknowledgePlayedNotes(windowed, playEach(notes, 0, connection))

            expect(acknowledged, `${tempoBpm} BPM over ${connection}`).toEqual(
              notes.map((note) => note.identity),
            )
          }
        }
      })

      it('acknowledges nothing played a semitone off, at every tempo', () => {
        for (const tempoBpm of ACKNOWLEDGEMENT_TEMPOS) {
          const notes = twoPhrases(fixture, next, tempoBpm)
          const windowed = placeAcknowledgementWindows(notes)
          for (const connection of CONNECTIONS) {
            for (const semitones of [1, -1]) {
              const acknowledged = acknowledgePlayedNotes(
                windowed,
                playEach(notes, semitones, connection),
              )

              expect(acknowledged, `${semitones} at ${tempoBpm} BPM over ${connection}`).toEqual([])
            }
          }
        }
      })
    },
  )
})
