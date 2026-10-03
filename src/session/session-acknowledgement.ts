/**
 * Acknowledgement for one live session: the small stateful layer between the pure acknowledgement
 * pipeline (src/domain/acknowledgement/) and the session controller. Phrases are added in order as
 * they are generated; the windows are placed again over every expected note known so far, so the
 * last note of a phrase is bounded by the next phrase's first note. Each played note is compensated
 * for latency and matched once; a note that matches nothing leaves no trace. Notes that fell due
 * while the controller was away are passed over: never acknowledged afterwards. Pure: no clock, no
 * browser, no MIDI.
 */

import {
  placeAcknowledgementWindows,
  type WindowedExpectedNote,
} from '../domain/acknowledgement/acknowledgement-window'
import {
  deriveExpectedNotes,
  type ExpectedNote,
  type ExpectedNoteIdentity,
} from '../domain/acknowledgement/expected-note'
import { acknowledgePlayedNote } from '../domain/acknowledgement/note-matching'
import {
  compensatePlayedNote,
  type LatencyCorrection,
  type NoteOnOnAudioClock,
} from '../domain/acknowledgement/played-onset-latency'
import { deepFreeze } from '../domain/events/deep-freeze'
import type { ConcertEventTimeline } from '../domain/events/timeline'
import type { RecordedPlayedNote } from './session-history'
import type { AudioTime } from './session-types'

/** Typed failure for a call that breaks the session acknowledgement's contract. */
// @spec-link [[rule_acknowledgement_highlights_expected_note_only]]
export class SessionAcknowledgementError extends Error {
  readonly kind = 'SessionAcknowledgementError' as const

  constructor(message: string) {
    super(message)
    this.name = 'SessionAcknowledgementError'
  }
}

/**
 * What a session's acknowledgement needs once, at its start: the latency correction for the
 * attached controller (the caller picks it, e.g. `latencyCorrectionFor('usb')`). Tempo is per
 * phrase, given with each phrase added.
 */
// @spec-link [[rule_played_onset_latency_compensation]]
export interface SessionAcknowledgementOptions {
  readonly correction: LatencyCorrection
}

/**
 * The acknowledgement state of one session.
 * - addPhrase: add the next phrase (1, 2, 3… strictly in order) with its first downbeat on the
 *   audio clock and its own tempo in BPM; the windows are placed again over every expected note
 *   known so far.
 * - notePlayed: match one note-on on the audio clock; returns the identity it newly acknowledges
 *   (a list of one), or an empty list. Nothing is ever returned for a note that matches nothing.
 * - acknowledged: every identity acknowledged so far, in acknowledgement order.
 * - passDueBetween: pass over every expected note known now whose onset lies in `[from, to]` (both
 *   ends included; the span the controller was away): it is never acknowledged afterwards, even
 *   inside a window still open, and never listed by `acknowledged`. A note already acknowledged
 *   stays so; a phrase added later is unaffected. Throws on a non-finite or backwards range.
 * - compensatedRecord: a finished played note with its onset and release both shifted by the
 *   total latency correction, as the session history stores it.
 */
// @spec-link [[rule_acknowledgement_highlights_expected_note_only]]
// @spec-link [[rule_expected_note_window]]
// @spec-link [[rule_played_onset_latency_compensation]]
// @spec-link [[rule_no_grading_or_mismatch_signal]]
export interface SessionAcknowledgement {
  addPhrase(
    phraseNumber: number,
    timeline: ConcertEventTimeline,
    firstDownbeatAt: AudioTime,
    tempo: number,
  ): void
  notePlayed(noteOn: NoteOnOnAudioClock): readonly ExpectedNoteIdentity[]
  acknowledged(): readonly ExpectedNoteIdentity[]
  // @spec-link [[rule_controller_loss_mid_session]]
  passDueBetween(from: AudioTime, to: AudioTime): void
  compensatedRecord(ended: RecordedPlayedNote): RecordedPlayedNote
}

/**
 * Intent: an empty acknowledgement for one session, with its latency correction. Rejects a
 * correction with a negative or non-finite delay, before any note arrives. Each phrase's expected
 * notes are placed at that phrase's own tempo from its own first downbeat. A phrase out of order,
 * at a tempo that is not a positive finite BPM, or whose notes do not follow the previous phrase's
 * in time, throws and leaves the state unchanged. Passed-over notes are excluded from matching as
 * if taken, but kept apart from the acknowledged ones.
 */
// @spec-link [[rule_acknowledgement_highlights_expected_note_only]]
// @spec-link [[rule_expected_note_window]]
// @spec-link [[rule_played_onset_latency_compensation]]
// @spec-link [[rule_no_grading_or_mismatch_signal]]
// @spec-link [[rule_controller_loss_mid_session]]
export function createSessionAcknowledgement(
  options: SessionAcknowledgementOptions,
): SessionAcknowledgement {
  const { correction } = options
  assertCorrection(correction)
  let expected: readonly ExpectedNote[] = []
  let windowed: readonly WindowedExpectedNote[] = []
  const acknowledgedSoFar: ExpectedNoteIdentity[] = []
  const passedOver: ExpectedNoteIdentity[] = []
  let snapshot: readonly ExpectedNoteIdentity[] | undefined
  let phraseCount = 0

  return Object.freeze({
    addPhrase(
      phraseNumber: number,
      timeline: ConcertEventTimeline,
      firstDownbeatAt: AudioTime,
      tempo: number,
    ) {
      if (phraseNumber !== phraseCount + 1) {
        throw new SessionAcknowledgementError(
          `Phrase ${phraseNumber} was added; phrase ${phraseCount + 1} was next.`,
        )
      }
      if (!Number.isFinite(tempo) || tempo <= 0) {
        throw new SessionAcknowledgementError(
          `Phrase ${phraseNumber}'s tempo must be a positive BPM, got ${tempo}.`,
        )
      }
      const phraseNotes = deriveExpectedNotes(timeline, {
        phraseNumber,
        startSeconds: firstDownbeatAt,
        tempoBpm: tempo,
      })
      const nextExpected = [...expected, ...phraseNotes]
      const nextWindowed = placeAcknowledgementWindows(nextExpected)
      expected = nextExpected
      windowed = nextWindowed
      phraseCount = phraseNumber
    },
    notePlayed(noteOn: NoteOnOnAudioClock): readonly ExpectedNoteIdentity[] {
      const played = compensatePlayedNote(noteOn, correction)
      const taken = [...acknowledgedSoFar, ...passedOver]
      const newlyAcknowledged = acknowledgePlayedNote(windowed, taken, played)
      if (newlyAcknowledged.length > 0) {
        acknowledgedSoFar.push(...newlyAcknowledged)
        snapshot = undefined
      }
      return newlyAcknowledged
    },
    acknowledged(): readonly ExpectedNoteIdentity[] {
      snapshot ??= deepFreeze([...acknowledgedSoFar])
      return snapshot
    },
    passDueBetween(from: AudioTime, to: AudioTime): void {
      if (!Number.isFinite(from) || !Number.isFinite(to) || from > to) {
        throw new SessionAcknowledgementError(
          `Notes due between ${from} and ${to} cannot be passed over: the range must be finite and run forwards.`,
        )
      }
      expected
        .filter((note) => from <= note.onsetSeconds && note.onsetSeconds <= to)
        .forEach((note) => passedOver.push(note.identity))
    },
    compensatedRecord(ended: RecordedPlayedNote): RecordedPlayedNote {
      return compensateRecordedNote(ended, correction)
    },
  })
}

/**
 * Intent: reject a correction with a delay that is negative or not a finite number, as
 * compensatePlayedNote would, but at the session's start rather than at its first note.
 */
function assertCorrection(correction: LatencyCorrection): void {
  const { outputLatencySeconds, connectionLatencySeconds } = correction
  for (const [name, seconds] of [
    ['output latency', outputLatencySeconds],
    ['connection delay', connectionLatencySeconds],
  ] as const) {
    if (!Number.isFinite(seconds) || seconds < 0) {
      throw new SessionAcknowledgementError(
        `The ${name} must be a finite, non-negative number of seconds, got ${seconds}.`,
      )
    }
  }
}

/**
 * Intent: a finished played note with its onset and release shifted earlier by the same total
 * correction (output latency plus connection delay), so the history's played notes line up with
 * the generated notes the player heard. The onset is the very one matching used
 * (compensatePlayedNote); the release takes the same two delays off in the same order. Rejects
 * non-finite times and a release before the onset.
 */
function compensateRecordedNote(
  ended: RecordedPlayedNote,
  correction: LatencyCorrection,
): RecordedPlayedNote {
  if (!Number.isFinite(ended.onsetAt) || !Number.isFinite(ended.releaseAt)) {
    throw new SessionAcknowledgementError(
      `A played note's times must be finite, got onset ${ended.onsetAt} and release ${ended.releaseAt}.`,
    )
  }
  if (ended.releaseAt < ended.onsetAt) {
    throw new SessionAcknowledgementError(
      `A played note cannot be released at ${ended.releaseAt}, before its onset at ${ended.onsetAt}.`,
    )
  }
  return deepFreeze({
    ...ended,
    onsetAt: compensatePlayedNote(
      { pitch: ended.pitch, audioClockSeconds: ended.onsetAt },
      correction,
    ).onsetSeconds,
    releaseAt:
      ended.releaseAt - correction.outputLatencySeconds - correction.connectionLatencySeconds,
  })
}
