/**
 * The transposition check's `Use this for my instrument`, as pure data: the my instrument a check
 * result would save (the transposition that makes the written note asked for sound as the note the
 * controller sent, the written range and the clef kept), whether it is offered at all, and the
 * words of its confirmation (screens/controller-connection/handoff.md, States: Use for my
 * instrument). Loaded with the connection sheet, never in the entry chunk.
 */
import {
  noteName,
  intervalNameText,
  soundingC4Name,
} from '@/components/workspace/my-instrument-copy'
import { judgeTranspositionCheck } from '@/domain/controller-check/transposition-check'
import type { InstrumentProfile } from '@/domain/profile/instrument-profile'
import { MY_INSTRUMENT_ID } from '@/domain/profile/instrument-profiles'
import {
  findMyInstrumentRefusal,
  makeMyInstrument,
  myInstrumentDraftFromTemplate,
  type MyInstrument,
  type MyInstrumentInput,
} from '@/domain/profile/my-instrument'
import type { MyInstrumentTransposition } from '@/domain/profile/transposition-interval'

/** The name a my instrument made by the check is given. */
const MADE_NAME = 'My instrument'
const SEMITONES_PER_OCTAVE = 12

/**
 * Where the action starts from: no my instrument yet (`none`), one that exists while a built-in
 * was checked (`not-selected`), or my instrument itself checked (`selected`).
 */
// @spec-link [[rule_transposition_check_sets_my_instrument]]
export type UseForMyInstrumentStart = 'none' | 'not-selected' | 'selected'

/** What the action would do: the my instrument it saves, and where it starts from. */
// @spec-link [[rule_transposition_check_sets_my_instrument]]
export interface UseForMyInstrument {
  readonly instrument: MyInstrument
  readonly start: UseForMyInstrumentStart
  /** The built-in a new my instrument is made from, by its display name; null when one exists. */
  readonly templateName: string | null
}

/** The confirmation's body: its plain paragraphs, then its one `sheet-hint`, if any. */
export interface UseForMyInstrumentCopy {
  readonly paragraphs: readonly string[]
  readonly hint: string | null
}

/**
 * Intent: a transposition as entered from its chromatic count (written = concert + chromatic): a
 * positive count sounds lower, a negative one higher.
 */
function transpositionOfChromatic(chromatic: number): MyInstrumentTransposition {
  const size = Math.abs(chromatic)
  return {
    octaves: Math.floor(size / SEMITONES_PER_OCTAVE),
    semitones: size % SEMITONES_PER_OCTAVE,
    direction: chromatic > 0 ? 'lower' : chromatic < 0 ? 'higher' : 'same',
  }
}

/**
 * Intent: what the record keeps whatever the transposition: the existing my instrument's template,
 * name, clef and written range, or, with none yet, the checked built-in's template and written
 * range, named My instrument, in treble clef. My instrument checked while none is given is a
 * caller bug.
 */
function keptPart(
  profile: InstrumentProfile,
  myInstrument: MyInstrument | null,
): Omit<MyInstrumentInput, 'transposition'> {
  if (myInstrument !== null) {
    const { template, name, clef, writtenRange } = myInstrument
    return { template, name, clef, writtenRange }
  }
  if (profile.id === MY_INSTRUMENT_ID) {
    throw new Error('check for my instrument: my instrument was checked, but there is none')
  }
  const draft = myInstrumentDraftFromTemplate(profile.id)
  return {
    template: draft.template,
    name: MADE_NAME,
    clef: 'treble',
    writtenRange: draft.writtenRange,
  }
}

/**
 * Intent: what `Use this for my instrument` would save for the note `playedPitch` the controller
 * sent against `profile`, the instrument checked, or null when it is not offered: on a match, and
 * when the instrument it would make would sound outside MIDI notes 0 to 127 (its written range
 * moved by the new transposition). The new transposition is the semitones from the written note
 * asked for to the note sent; the written range and the clef are kept. Any other refusal of the
 * record is a defect: building it throws.
 */
// @spec-link [[rule_transposition_check_sets_my_instrument]]
export function useForMyInstrument(
  profile: InstrumentProfile,
  myInstrument: MyInstrument | null,
  playedPitch: number,
): UseForMyInstrument | null {
  const report = judgeTranspositionCheck(profile, playedPitch, [])
  if (report.kind === 'match') return null
  const input: MyInstrumentInput = {
    ...keptPart(profile, myInstrument),
    transposition: transpositionOfChromatic(profile.transposition.chromatic - report.offset),
  }
  if (findMyInstrumentRefusal(input)?.reason === 'sounds-outside-midi') return null
  const start: UseForMyInstrumentStart =
    myInstrument === null ? 'none' : profile.id === MY_INSTRUMENT_ID ? 'selected' : 'not-selected'
  const templateName = myInstrument === null ? profile.displayName : null
  return { instrument: makeMyInstrument(input), start, templateName }
}

/**
 * Intent: whether `use` changes the transposition of the my instrument that exists, `saved`: the
 * change that erases its kept sessions. Making a new one changes none.
 */
// @spec-link [[rule_transposition_check_sets_my_instrument]]
// @spec-link [[entity_my_instrument_record]]
export function changesSavedTransposition(
  use: UseForMyInstrument,
  saved: MyInstrument | null,
): boolean {
  if (use.start === 'none' || saved === null) return false
  return use.instrument.profile.transposition.chromatic !== saved.profile.transposition.chromatic
}

/**
 * Intent: the confirmation's words: the interval under the new transposition and the note a
 * written C4 will sound as, then what happens to my instrument (made from the profile, with the
 * hint that it can be changed later; or keeping its range and clef, becoming the selection when
 * it is not).
 */
// @spec-link [[rule_transposition_check_sets_my_instrument]]
export function useForMyInstrumentCopy(use: UseForMyInstrument): UseForMyInstrumentCopy {
  const { instrument } = use
  const count = -instrument.profile.transposition.chromatic
  const interval = `${intervalNameText(count)}: a written C4 will sound as ${soundingC4Name(count)}.`
  const low = noteName(instrument.writtenRange.minMidi)
  const high = noteName(instrument.writtenRange.maxMidi)
  if (use.start === 'none') {
    return {
      paragraphs: [
        interval,
        `My instrument will be made from the ${use.templateName} profile, named My instrument, in treble clef, with that profile's range: ${low} to ${high} in written notes.`,
      ],
      hint: 'You can change it later with Edit my instrument.',
    }
  }
  const kept = `${instrument.name} keeps its range, ${low} to ${high} in written notes, and its clef`
  const becomes = use.start === 'not-selected' ? ', and becomes the selected instrument' : ''
  return { paragraphs: [interval, `${kept}${becomes}.`], hint: null }
}
