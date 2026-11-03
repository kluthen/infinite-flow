/**
 * Jam's side of the empty system its Idle staff shows: from Jam's written key and collection and
 * the selected instrument, what the notation engraver needs (the key signature, spelled as a
 * phrase's is, and the instrument's written range in its clef), the empty system's accessible name,
 * worded as a phrase's summary is, and the engraver itself, reached
 * through the lazy engraver chunk (src/notation/vexflow-engraver-loader.ts) once its notation fonts
 * have loaded. Part of Jam's code (src/jam/), loaded on demand.
 */
import {
  PITCH_CLASSES,
  type Collection,
  type PitchClass,
} from '@/domain/controls/generation-controls'
import type { PitchClassNumber } from '@/domain/harmony/harmony-types'
import { spellWrittenKey } from '@/domain/notation/pitch-spelling'
import { describeEmptySystem } from '@/domain/notation/score-description'
import type { WrittenKey } from '@/domain/notation/written-phrase-types'
import { instrumentClefOf } from '@/domain/profile/instrument-clef'
import {
  findBuiltInInstrumentProfile,
  MY_INSTRUMENT_ID,
  type InstrumentProfileId,
} from '@/domain/profile/instrument-profiles'
import type { MyInstrument } from '@/domain/profile/my-instrument'
import type { WrittenRangeInClef } from '@/notation/notation-layout-policy'
import type { StaffKeySignature } from '@/notation/staff-fit-types'
import type { EmptySystemStaff } from '@/notation/vexflow-empty-system-engraver'
import type { VexflowEngraverModule } from '@/notation/vexflow-engraver-loader'
import { loadVexflowEngraver } from '@/notation/vexflow-engraver-loader'
import type { JamStaffProps } from './jam-view-types'

/** The engraver of the empty system, as the lazy engraver chunk exports it. */
export type EmptySystemEngraver = VexflowEngraverModule['engraveEmptySystem']

/**
 * Intent: a written key and collection spelled exactly as a phrase in them is (the
 * fewest-accidental spelling, sharps on a tie).
 */
function jamWrittenKey(tonalCenter: PitchClass, collection: Collection): WrittenKey {
  const writtenTonic = PITCH_CLASSES.indexOf(tonalCenter) as PitchClassNumber
  return spellWrittenKey(writtenTonic, collection)
}

/**
 * Intent: the key signature of a written key and collection, spelled exactly as a phrase in them
 * is: the signature the empty system carries.
 */
// @spec-link [[rule_jam_idle_shows_no_phrase]]
export function jamKeySignature(
  tonalCenter: PitchClass,
  collection: Collection,
): StaffKeySignature {
  return jamWrittenKey(tonalCenter, collection).signature
}

/**
 * Intent: the selected instrument's written range in its clef, as a phrase drawn for it carries
 * them: my instrument's own range and clef when it is selected, else the built-in profile's concert
 * range moved by its transposition, in treble clef. A selection naming an instrument that does not
 * exist is a caller defect and throws.
 */
// @spec-link [[rule_jam_idle_shows_no_phrase]]
export function jamInstrumentRangeInClef(
  instrumentProfileId: InstrumentProfileId,
  myInstrument: MyInstrument | null,
): WrittenRangeInClef {
  const clef = instrumentClefOf(instrumentProfileId, myInstrument)
  if (instrumentProfileId === MY_INSTRUMENT_ID && myInstrument !== null) {
    return { writtenRange: myInstrument.writtenRange, clef }
  }
  const profile = findBuiltInInstrumentProfile(instrumentProfileId)
  if (profile === undefined) {
    throw new Error(`Jam's staff: no instrument profile is named ${instrumentProfileId}.`)
  }
  const { concertRange, transposition } = profile
  return {
    writtenRange: {
      minMidi: concertRange.minMidi + transposition.chromatic,
      maxMidi: concertRange.maxMidi + transposition.chromatic,
    },
    clef,
  }
}

/** Intent: what the empty system shows for Jam's settings: the instrument's staff and the key. */
// @spec-link [[rule_jam_idle_shows_no_phrase]]
export function emptySystemStaffOf(
  settings: Pick<
    JamStaffProps,
    'tonalCenter' | 'collection' | 'instrumentProfileId' | 'myInstrument'
  >,
): EmptySystemStaff {
  return {
    rangeInClef: jamInstrumentRangeInClef(settings.instrumentProfileId, settings.myInstrument),
    signature: jamKeySignature(settings.tonalCenter, settings.collection),
  }
}

/**
 * Intent: the empty system's accessible name for Jam's settings, worded as a phrase's summary is
 * but naming no measures: "Empty staff, bass clef, key signature 2 flats (B flat Ionian), 4/4 time."
 */
// @spec-link [[rule_jam_idle_shows_no_phrase]]
export function emptySystemNameOf(
  settings: Pick<
    JamStaffProps,
    'tonalCenter' | 'collection' | 'instrumentProfileId' | 'myInstrument'
  >,
): string {
  return describeEmptySystem(
    instrumentClefOf(settings.instrumentProfileId, settings.myInstrument),
    jamWrittenKey(settings.tonalCenter, settings.collection),
  )
}

/**
 * Intent: the empty system's engraver, once the lazy engraver chunk and its notation fonts have
 * loaded. A failed load or a missing font is the loader's or the font wait's own NotationError,
 * a failure a retry can cure; the loader retries a failed import on the next call.
 */
// @spec-link [[module_jam_code_boundary]]
export async function loadEmptySystemEngraver(): Promise<EmptySystemEngraver> {
  const engraver = await loadVexflowEngraver()
  await engraver.ensureNotationFonts()
  return engraver.engraveEmptySystem
}
