/**
 * What a quantized doodle's rhythm shows, read once when the doodle ends: its note density (read
 * first, since every other rhythm reading and the doodle's rests follow its value), its rhythmic
 * variety, its syncopation and its silence density, each by its row of the doodle-to-controls
 * mapping (master spec C5.16.1), before any step to a supported combination; and the doodle's
 * rests (C5.9), which the silence reading counts and the steering block writes as rest starts,
 * both through doodleMeasureRests so the two always read the same rests. Pure, whole numbers only
 * (no division), part of Jam's code (src/jam/), loaded on demand.
 */
import { DEFAULT_GENERATION_CONTROLS } from '@/domain/controls/profile-selection'
import type {
  NoteDensity,
  RhythmicVariety,
  SilenceDensity,
  Syncopation,
} from '@/domain/controls/generation-controls'
import type { DoodleNote, QuantizedDoodle } from '@/domain/doodle/quantized-doodle'
import { QUARTER_TICKS, TICKS_PER_BAR } from '@/domain/time/ticks'

/**
 * The four rhythm values a doodle shows, before the step to a supported combination: null where
 * the doodle cannot show the control (fewer than two notes; fewer than three for the variety).
 */
// @spec-link [[module_doodle_controls]]
export interface DoodleRhythmAim {
  readonly noteDensity: NoteDensity | null
  readonly rhythmicVariety: RhythmicVariety | null
  readonly syncopation: Syncopation | null
  readonly silenceDensity: SilenceDensity | null
}

/** One rest of a doodle measure, in ticks from the measure's start: [startTick, endTick). */
// @spec-link [[module_steering_block_builder]]
// @spec-link [[rule_doodle_silence_density_reading]]
export interface DoodleRest {
  readonly startTick: number
  readonly endTick: number
}

/** The note density's value, in ticks: the grid its readings and the doodle's rests use. */
const NOTE_VALUE_TICKS: Readonly<Record<NoteDensity, number>> = {
  Quarter: 4,
  Eighth: 2,
  Sixteenth: 1,
}

/** Intent: a note's position: its start in ticks from the start of its measure. */
function positionOf(note: DoodleNote): number {
  return note.startTick % TICKS_PER_BAR
}

/** Intent: whether a note starts in the doodle measure `measureIndex` (counted from 0). */
function startsInMeasure(note: DoodleNote, measureIndex: number): boolean {
  const from = measureIndex * TICKS_PER_BAR
  return note.startTick >= from && note.startTick < from + TICKS_PER_BAR
}

/** Intent: the doodle's measure indices, 0 to M - 1. */
function measureIndices(doodle: QuantizedDoodle): number[] {
  return Array.from({ length: doodle.measureCount }, (_, index) => index)
}

/**
 * Intent: the note density the doodle shows, the finest grid at least a quarter of its note
 * starts need: Sixteenth when 4 × (starts at an odd position) ≥ n, else Eighth when 4 × (starts
 * at a position not divisible by 4) ≥ n, else Quarter; null (not shown) for fewer than two notes.
 */
// @spec-link [[rule_doodle_note_density_reading]]
export function doodleNoteDensity(doodle: QuantizedDoodle): NoteDensity | null {
  const count = doodle.notes.length
  if (count < 2) return null
  const positions = doodle.notes.map(positionOf)
  if (4 * positions.filter((position) => position % 2 !== 0).length >= count) return 'Sixteenth'
  if (4 * positions.filter((position) => position % 4 !== 0).length >= count) return 'Eighth'
  return 'Quarter'
}

/**
 * Intent: the value, in ticks, of the note density the doodle's readings and rests use: the one
 * it shows (4 for Quarter, 2 for Eighth, 1 for Sixteenth), or the first-visit value's (Quarter's)
 * when it shows none. Never the density a phrase generates with: a Sixteenth read on a narrow
 * screen still counts 1.
 */
// @spec-link [[rule_doodle_note_density_reading]]
// @spec-link [[rule_doodle_sixteenth_on_narrow_screens]]
export function doodleNoteValueTicks(doodle: QuantizedDoodle): number {
  return NOTE_VALUE_TICKS[doodleNoteDensity(doodle) ?? DEFAULT_GENERATION_CONTROLS.noteDensity]
}

/** Intent: which ticks of one doodle measure a note sounds in, a held note's carried ones too. */
function soundingTicks(doodle: QuantizedDoodle, measureIndex: number): boolean[] {
  const from = measureIndex * TICKS_PER_BAR
  const sounding = Array.from({ length: TICKS_PER_BAR }, () => false)
  for (const note of doodle.notes) {
    const start = Math.max(note.startTick - from, 0)
    const end = Math.min(note.startTick + note.lengthTicks - from, TICKS_PER_BAR)
    for (let tick = start; tick < end; tick += 1) sounding[tick] = true
  }
  return sounding
}

/**
 * Intent: the silences of one doodle measure, each a stretch [startTick, endTick) in which no note
 * sounds; one crossing a barline starts again at the measure's tick 0.
 */
function measureSilences(doodle: QuantizedDoodle, measureIndex: number): DoodleRest[] {
  const sounding = soundingTicks(doodle, measureIndex)
  const silences: DoodleRest[] = []
  sounding.forEach((isSounding, tick) => {
    const last = silences[silences.length - 1]
    if (isSounding) return
    if (last !== undefined && last.endTick === tick) {
      silences[silences.length - 1] = { startTick: last.startTick, endTick: tick + 1 }
    } else {
      silences.push({ startTick: tick, endTick: tick + 1 })
    }
  })
  return silences
}

/**
 * Intent: the rest a silence holds (C5.9): from the first multiple of the note value at which a
 * whole rest of that value fits in the silence, to the silence's end; none when no such span fits,
 * the shorter silence then being part of the note before it.
 */
function restIn(silence: DoodleRest, value: number): DoodleRest | null {
  const gridTick = silence.startTick + ((value - (silence.startTick % value)) % value)
  return gridTick + value <= silence.endTick
    ? { startTick: gridTick, endTick: silence.endTick }
    : null
}

/**
 * Intent: the rests of one doodle measure (`measureIndex` from 0), as C5.9 defines them: in each
 * silence of the measure, a rest from the first grid tick of the doodle's note value at which a
 * whole rest of that value fits, to the silence's end. A shorter silence, and the part of a
 * silence before that tick, hold none. The one reading both the steering block's rest starts and
 * the silence reading's R use.
 */
// @spec-link [[module_steering_block_builder]]
// @spec-link [[rule_doodle_silence_density_reading]]
// @spec-link [[rule_jam_steering_block]]
export function doodleMeasureRests(
  doodle: QuantizedDoodle,
  measureIndex: number,
): readonly DoodleRest[] {
  const value = doodleNoteValueTicks(doodle)
  return measureSilences(doodle, measureIndex).flatMap((silence) => {
    const rest = restIn(silence, value)
    return rest === null ? [] : [rest]
  })
}

/**
 * Intent: the rhythmic variety the doodle shows: a gap (from a note's start to the next one's)
 * counts as the main value when it equals the note value, or is twice it with the note sounding
 * no longer than the value. Strict when every gap does; Slightly varied when 4 × (gaps that do) ≥
 * 3 × (gaps); else Heavily varied. Null (not shown) for fewer than three notes.
 */
// @spec-link [[rule_doodle_rhythmic_variety_reading]]
export function doodleRhythmicVariety(doodle: QuantizedDoodle): RhythmicVariety | null {
  const { notes } = doodle
  if (notes.length < 3) return null
  const value = doodleNoteValueTicks(doodle)
  const gaps = notes.slice(0, -1).map((note, index) => ({
    gap: notes[index + 1]!.startTick - note.startTick,
    length: note.lengthTicks,
  }))
  const main = gaps.filter(
    ({ gap, length }) => gap === value || (gap === 2 * value && length <= value),
  ).length
  if (main === gaps.length) return 'Strict'
  return 4 * main >= 3 * gaps.length ? 'Slightly varied' : 'Heavily varied'
}

/**
 * Intent: whether a note makes its measure syncopated: it starts off the note density's grid
 * (under Sixteenth never), or starts off a beat and still sounds at the next beat.
 */
function isSyncopatedNote(note: DoodleNote, value: number): boolean {
  const position = positionOf(note)
  if (position % value !== 0) return true
  const offBeat = position % QUARTER_TICKS
  if (offBeat === 0) return false
  return note.startTick + note.lengthTicks > note.startTick - offBeat + QUARTER_TICKS
}

/**
 * Intent: the syncopation the doodle shows: a measure is syncopated when a note starting in it is
 * (isSyncopatedNote). Straight when none is; Occasional offbeats when at least one is and 2 ×
 * (syncopated measures) ≤ M; else Active displacement. Null (not shown) for fewer than two notes.
 */
// @spec-link [[rule_doodle_syncopation_reading]]
export function doodleSyncopation(doodle: QuantizedDoodle): Syncopation | null {
  if (doodle.notes.length < 2) return null
  const value = doodleNoteValueTicks(doodle)
  const syncopated = measureIndices(doodle).filter((measureIndex) =>
    doodle.notes.some(
      (note) => startsInMeasure(note, measureIndex) && isSyncopatedNote(note, value),
    ),
  ).length
  if (syncopated === 0) return 'Straight'
  return 2 * syncopated <= doodle.measureCount ? 'Occasional offbeats' : 'Active displacement'
}

/**
 * Intent: R, the ticks of the doodle's rests (doodleMeasureRests), each from its start to its
 * silence's end; a silence holding no rest counts nothing.
 */
// @spec-link [[rule_doodle_silence_density_reading]]
export function doodleRestTicks(doodle: QuantizedDoodle): number {
  return measureIndices(doodle)
    .flatMap((measureIndex) => doodleMeasureRests(doodle, measureIndex))
    .reduce((sum, rest) => sum + rest.endTick - rest.startTick, 0)
}

/**
 * Intent: the silence density the doodle shows, R scaled to a phrase's four measures against the
 * midpoints between the bands of 4–8, 12–20 and 24–32 ticks: Sparse when 4 × R ≤ 10 × M;
 * Conversational when 4 × R ≤ 22 × M; else Breath-heavy. Null (not shown) for fewer than two notes.
 */
// @spec-link [[rule_doodle_silence_density_reading]]
export function doodleSilenceDensity(doodle: QuantizedDoodle): SilenceDensity | null {
  if (doodle.notes.length < 2) return null
  const scaledRest = 4 * doodleRestTicks(doodle)
  if (scaledRest <= 10 * doodle.measureCount) return 'Sparse'
  return scaledRest <= 22 * doodle.measureCount ? 'Conversational' : 'Breath-heavy'
}

/**
 * Intent: the four rhythm values the doodle shows, note density first, before the step to a
 * supported combination; null for each it cannot show.
 */
// @spec-link [[module_doodle_controls]]
// @spec-link [[rule_doodle_note_density_reading]]
export function readDoodleRhythmAim(doodle: QuantizedDoodle): DoodleRhythmAim {
  return {
    noteDensity: doodleNoteDensity(doodle),
    rhythmicVariety: doodleRhythmicVariety(doodle),
    syncopation: doodleSyncopation(doodle),
    silenceDensity: doodleSilenceDensity(doodle),
  }
}
