/**
 * The My instrument sheet's model: the form the player edits (template, name, clef, written range
 * and transposition, as one count of semitones), what each step may reach, and what the form
 * shows from it (the refusals in note names, the windows, the staff-reach note, the transposition's
 * interval). The range is refused live and never clamped: the steppers stop only at the MIDI note
 * range of the note they sound. When editing, it also says whether a save changes how the
 * instrument sounds (its range or transposition), the change that erases its kept sessions, and
 * puts the sound back to the saved one. Loaded with the sheet, outside the entry chunk.
 */

import { computed, ref, type ComputedRef, type Ref } from 'vue'

import { profileRangeSummaryText } from '@/components/controls/control-options'
import { BUILT_IN_INSTRUMENT_CLEF, type InstrumentClef } from '@/domain/profile/instrument-clef'
import type { BuiltInInstrumentProfileId } from '@/domain/profile/instrument-profiles'
import {
  makeMyInstrument,
  myInstrumentDraftFromTemplate,
  type MyInstrument,
  type MyInstrumentInput,
} from '@/domain/profile/my-instrument'
import {
  countOfTransposition,
  rangeRefusalLines,
  staffReachNote,
  transpositionNoteText,
  transpositionOfCount,
  transpositionValueA11yText,
  transpositionValueText,
} from './my-instrument-copy'

/** The name a my instrument left unnamed is saved under. */
export const DEFAULT_MY_INSTRUMENT_NAME = 'My instrument'

const LOWEST_MIDI_NOTE = 0
const HIGHEST_MIDI_NOTE = 127

/** How the sheet opened: creating from the selected built-in, or editing the saved one. */
export type MyInstrumentFormStart =
  | { readonly mode: 'creating'; readonly template: BuiltInInstrumentProfileId }
  | { readonly mode: 'editing'; readonly saved: MyInstrument }

/** The lowest and highest value a stepper may reach now, both included. */
export interface StepperBounds {
  readonly min: number
  readonly max: number
}

/** The form, what each stepper may reach, and what the sheet shows from them. */
export interface MyInstrumentForm {
  readonly template: Ref<BuiltInInstrumentProfileId>
  readonly name: Ref<string>
  readonly clef: Ref<InstrumentClef>
  readonly lowest: Ref<number>
  readonly highest: Ref<number>
  /** The transposition, in semitones from a written note to the note it sounds: below 0 lower. */
  readonly count: Ref<number>
  readonly lowestBounds: ComputedRef<StepperBounds>
  readonly highestBounds: ComputedRef<StepperBounds>
  readonly countBounds: ComputedRef<StepperBounds>
  /** One line per reason the range is refused, the span first; empty while it is valid. */
  readonly refusals: ComputedRef<readonly string[]>
  /** The windows' summary while the range is valid; null while it is refused. */
  readonly rangeSummary: ComputedRef<string | null>
  /** The staff-reach note while the range is valid and needs a taller staff; null otherwise. */
  readonly staffReach: ComputedRef<string | null>
  readonly countText: ComputedRef<string>
  readonly countA11yText: ComputedRef<string>
  readonly transpositionNote: ComputedRef<string>
  /** Refill the range and the transposition from a built-in profile; the name and clef stay. */
  readonly chooseTemplate: (template: BuiltInInstrumentProfileId) => void
  /** My instrument as the form holds it, its name trimmed or the default; refused while invalid. */
  readonly instrument: () => MyInstrument
  /** Whether `instrument` sounds otherwise than the saved one: its range or transposition. */
  readonly changesSound: (instrument: MyInstrument) => boolean
  /** Put the range and the transposition back to the saved one's (editing only). */
  readonly restoreSound: () => void
}

/** Intent: the form's starting values: the template's own, or the saved instrument's. */
function startingValues(start: MyInstrumentFormStart): MyInstrumentInput {
  if (start.mode === 'editing') return start.saved
  const draft = myInstrumentDraftFromTemplate(start.template)
  return {
    template: draft.template,
    name: '',
    clef: BUILT_IN_INSTRUMENT_CLEF,
    writtenRange: draft.writtenRange,
    transposition: draft.transposition,
  }
}

/** Intent: the name the form saves: its text without spaces at either end, or the default. */
export function savedName(text: string): string {
  const trimmed = text.trim()
  return trimmed === '' ? DEFAULT_MY_INSTRUMENT_NAME : trimmed
}

/**
 * Intent: the sheet's form over `start`. Each range stepper's bounds keep the note it sounds, the
 * written note moved by the transposition, inside the MIDI note range; the transposition's keep
 * both range notes sounding inside it.
 */
// @spec-link [[req_my_instrument]]
// @spec-link [[rule_my_instrument_range_limits]]
// @spec-link [[rule_my_instrument_transposition_named_interval]]
export function useMyInstrumentForm(start: MyInstrumentFormStart): MyInstrumentForm {
  const initial = startingValues(start)
  const template = ref(initial.template as BuiltInInstrumentProfileId)
  const name = ref(start.mode === 'editing' ? start.saved.name : '')
  const clef = ref<InstrumentClef>(initial.clef)
  const lowest = ref(initial.writtenRange.minMidi)
  const highest = ref(initial.writtenRange.maxMidi)
  const count = ref(countOfTransposition(initial.transposition))

  const range = computed(() => ({ minMidi: lowest.value, maxMidi: highest.value }))
  const noteBounds = computed<StepperBounds>(() => ({
    min: LOWEST_MIDI_NOTE - count.value,
    max: HIGHEST_MIDI_NOTE - count.value,
  }))
  const countBounds = computed<StepperBounds>(() => ({
    min: LOWEST_MIDI_NOTE - Math.min(lowest.value, highest.value),
    max: HIGHEST_MIDI_NOTE - Math.max(lowest.value, highest.value),
  }))
  const refusals = computed(() => rangeRefusalLines(range.value, clef.value))

  /** Intent: what the form holds, as my instrument is built from it. */
  function input(): MyInstrumentInput {
    return {
      template: template.value,
      name: savedName(name.value),
      clef: clef.value,
      writtenRange: range.value,
      transposition: transpositionOfCount(count.value),
    }
  }

  const rangeSummary = computed(() =>
    refusals.value.length > 0 ? null : profileRangeSummaryText(makeMyInstrument(input()).profile),
  )
  const staffReach = computed(() =>
    refusals.value.length > 0 ? null : staffReachNote(range.value, clef.value),
  )

  return {
    template,
    name,
    clef,
    lowest,
    highest,
    count,
    lowestBounds: noteBounds,
    highestBounds: noteBounds,
    countBounds,
    refusals,
    rangeSummary,
    staffReach,
    countText: computed(() => transpositionValueText(count.value)),
    countA11yText: computed(() => transpositionValueA11yText(count.value)),
    transpositionNote: computed(() => transpositionNoteText(count.value)),
    chooseTemplate: (chosen) => {
      const draft = myInstrumentDraftFromTemplate(chosen)
      template.value = chosen
      lowest.value = draft.writtenRange.minMidi
      highest.value = draft.writtenRange.maxMidi
      count.value = countOfTransposition(draft.transposition)
    },
    instrument: () => makeMyInstrument(input()),
    changesSound: (instrument) => {
      if (start.mode !== 'editing') return false
      const { writtenRange, transposition } = start.saved
      return (
        instrument.writtenRange.minMidi !== writtenRange.minMidi ||
        instrument.writtenRange.maxMidi !== writtenRange.maxMidi ||
        countOfTransposition(instrument.transposition) !== countOfTransposition(transposition)
      )
    },
    restoreSound: () => {
      if (start.mode !== 'editing') return
      const { writtenRange, transposition } = start.saved
      lowest.value = writtenRange.minMidi
      highest.value = writtenRange.maxMidi
      count.value = countOfTransposition(transposition)
    },
  }
}
