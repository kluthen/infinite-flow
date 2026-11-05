/**
 * A Jam's doodle as its export files open with it (master spec C5.15; ux "A Jam's files open with
 * the doodle"): the section marked "Doodle", as many measures as the doodle, at its capture tempo,
 * from time zero. The generated-notes files hold the quantized doodle, what the app heard: the
 * MusicXML file written as the review engraves it (./../doodle-engraving.ts: written pitch, the
 * key signature the Jam started with, its clef, no chord symbol), the MIDI file at concert pitch.
 * Part of Jam's code (src/jam/), loaded with it: the export's file builders take the section as
 * data and never import Jam's code. Pure: no DOM, no clock read, no storage, no network.
 */
import type { ExportDoodleSection } from '@/export/export-file'
import type { MidiDoodleSection } from '@/export/midi/midi-export-input'
import type { MusicXmlDoodleSection } from '@/export/musicxml/musicxml-export-input'
import { deepFreeze } from '@/domain/events/deep-freeze'
import { makeRational } from '@/domain/time/rational'
import { TICKS_PER_BAR } from '@/domain/time/ticks'
import type { ReviewedPhrase } from '@/session/session-history'
import type { SessionDoodle } from '@/session/session-history-played-notes'
import { doodleEngravingContext, doodleWrittenPhrase } from '../doodle-engraving'

/**
 * Intent: the quantized doodle as the MusicXML file writes it: the doodle written as the review's
 * doodle section engraves it, in the context of the session's phrase 1 (the key and mode the Jam
 * started with, its instrument, its clef), at its capture tempo.
 */
// @spec-link [[rule_jam_exports_open_with_doodle]]
function musicXmlDoodle(
  doodle: SessionDoodle,
  phraseOne: Pick<ReviewedPhrase, 'intent' | 'clef'>,
): MusicXmlDoodleSection {
  return {
    measureCount: doodle.doodle.measureCount,
    writtenPhrase: doodleWrittenPhrase(doodle.doodle, doodleEngravingContext(phraseOne)),
    tempo: doodle.captureTempo,
  }
}

/**
 * Intent: the quantized doodle as the generated-notes MIDI file holds it: each note at its concert
 * pitch, its start and length (sixteenth-note ticks from the doodle's first barline) in whole
 * notes, at its capture tempo.
 */
// @spec-link [[rule_jam_exports_open_with_doodle]]
function midiDoodle(doodle: SessionDoodle): MidiDoodleSection {
  return {
    measureCount: doodle.doodle.measureCount,
    tempo: doodle.captureTempo,
    notes: doodle.doodle.notes.map((note) => ({
      pitch: note.pitch,
      start: makeRational(note.startTick, TICKS_PER_BAR),
      duration: makeRational(note.lengthTicks, TICKS_PER_BAR),
    })),
  }
}

/**
 * Intent: the doodle section a Jam's export files open with, from the Jam part's doodle and the
 * session's phrase 1 (whose key, instrument and clef the doodle is written in); the same doodle
 * and phrase always give the same section.
 */
// @spec-link [[rule_jam_exports_open_with_doodle]]
// @spec-link [[rule_jam_exports_line_up]]
// @spec-link [[module_jam_code_boundary]]
export function exportDoodleSection(
  doodle: SessionDoodle,
  phraseOne: Pick<ReviewedPhrase, 'intent' | 'clef'>,
): ExportDoodleSection {
  return deepFreeze({ musicXml: musicXmlDoodle(doodle, phraseOne), midi: midiDoodle(doodle) })
}
