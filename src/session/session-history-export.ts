/**
 * What the session history hands the export encoders: the generated-notes MusicXML and MIDI
 * inputs of a recorded session, built from the stored shown phrases and never from a regenerated
 * one, and its played-notes MIDI input. Each generated-notes phrase carries only its phrase number,
 * its shown phrase (the written phrase for MusicXML, the concert timeline for MIDI) and the tempo
 * it played at; the internal repeat mark never travels, so a repeat encodes exactly like any other
 * phrase. Each played-notes phrase carries only its phrase number, tempo, start on the audio clock
 * and the played notes placed in it. Pure: no browser API, no storage, no network.
 */

import { notationInputFromOutcome } from '../domain/notation/notation-input'
import { transformToWrittenPhrase } from '../domain/notation/written-phrase'
import { BUILT_IN_INSTRUMENT_CLEF } from '../domain/profile/instrument-clef'
import type { InstrumentProfile } from '../domain/profile/instrument-profile'
import type { GeneratedNotesMidiInput, MidiBackingPhrase } from '../export/midi/midi-export-input'
import type { PlayedNotesMidiInput } from '../export/midi/played-notes-midi-input'
import type { GeneratedNotesMusicXmlInput } from '../export/musicxml/musicxml-export-input'
import type { ReviewedPhrase } from './session-history'

/** Typed failure for a history that cannot be exported: empty, or spanning two instruments. */
// @spec-link [[service_session_history]]
export class SessionHistoryExportError extends Error {
  readonly kind = 'SessionHistoryExportError' as const

  constructor(message: string) {
    super(message)
    this.name = 'SessionHistoryExportError'
  }
}

/**
 * Intent: the one instrument every recorded phrase was generated for. A history with no phrase
 * has nothing to export, and records of two instruments cannot come from one session, whose
 * settings are locked at start; both are caller bugs.
 */
function sessionInstrument(records: readonly ReviewedPhrase[]): InstrumentProfile {
  const first = records[0]
  if (first === undefined)
    throw new SessionHistoryExportError('The session history has no phrase to export.')
  const instrument = first.intent.instrumentProfile
  for (const record of records) {
    const other = record.intent.instrumentProfile
    if (other.id !== instrument.id)
      throw new SessionHistoryExportError(
        `Phrase ${record.phraseNumber} was generated for ${other.id}, not ${instrument.id}.`,
      )
  }
  return instrument
}

/**
 * Intent: the MusicXML encoder input of a recorded session: the session's instrument and, for
 * every record in order, its phrase number, its stored phrase written as the staff showed it and
 * its tempo. Throws a SessionHistoryExportError on an empty history or records of two instruments.
 */
// @spec-link [[service_session_history]]
export function musicXmlInputFromHistory(
  records: readonly ReviewedPhrase[],
): GeneratedNotesMusicXmlInput {
  const instrument = sessionInstrument(records)
  return {
    instrument,
    phrases: records.map((record) => ({
      number: record.phraseNumber,
      writtenPhrase: transformToWrittenPhrase(
        // The clef this record carries, which chunk 17 adds to the record.
        notationInputFromOutcome(record.outcome, record.intent, BUILT_IN_INSTRUMENT_CLEF),
      ),
      tempo: record.tempo,
    })),
  }
}

/**
 * Intent: the MIDI encoder input of a recorded session: for every record in order, its phrase
 * number, its stored concert timeline and its tempo, with the backing the caller asked for
 * (`null` when left off). Throws a SessionHistoryExportError on an empty history or records of two
 * instruments.
 */
// @spec-link [[service_session_history]]
export function midiInputFromHistory(
  records: readonly ReviewedPhrase[],
  backing: readonly MidiBackingPhrase[] | null,
): GeneratedNotesMidiInput {
  sessionInstrument(records)
  return {
    phrases: records.map((record) => ({
      number: record.phraseNumber,
      timeline: record.outcome.result.timeline,
      tempo: record.tempo,
    })),
    backing,
  }
}

/**
 * Intent: the played-notes MIDI encoder input of a recorded session: for every record in order,
 * its phrase number, its tempo, the audio-clock time it started sounding and the played notes the
 * history placed in it, each as its pitch, velocity, onset and release, and nothing else. Throws a
 * SessionHistoryExportError on an empty history or records of two instruments.
 */
// @spec-link [[service_session_history]]
// @spec-link [[req_played_notes_export]]
// @spec-link [[rule_session_history_records_played_notes]]
export function playedNotesMidiInputFromHistory(
  records: readonly ReviewedPhrase[],
): PlayedNotesMidiInput {
  sessionInstrument(records)
  return {
    phrases: records.map((record) => ({
      number: record.phraseNumber,
      tempo: record.tempo,
      startedAt: record.startedAt,
      playedNotes: record.playedNotes.map(({ pitch, velocity, onsetAt, releaseAt }) => ({
        pitch,
        velocity,
        onsetAt,
        releaseAt,
      })),
    })),
  }
}
