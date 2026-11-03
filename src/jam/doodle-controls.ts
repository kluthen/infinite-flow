/**
 * The controls read from the doodle: when a doodle ends (and for a kept doodle), the quantized
 * doodle becomes the seven ordinary control values a Jam is generated with, each with whether the
 * doodle showed it or it took session mode's first-visit value (master spec C5.16.1). The four
 * rhythm values come from doodle-rhythm-reading.ts, note density first; contour, leapiness and
 * the register are read here. The rhythm values then step to a supported combination, the note
 * density judged as read (a Sixteenth as Sixteenth at every width), raising rhythmic variety only,
 * and the rhythmic variety reading says whether the step raised it. No reading takes the window's
 * width, so a window crossing changes none. The register reading carries the register window it
 * names, the one phrase 1's join reads (C5.9). Pure, whole numbers only (no division), nothing
 * saved; part of Jam's code (src/jam/), loaded on demand.
 */
import { DEFAULT_GENERATION_CONTROLS } from '@/domain/controls/profile-selection'
import {
  RHYTHMIC_VARIETIES,
  type Contour,
  type Leapiness,
  type NoteDensity,
  type RhythmicVariety,
  type SilenceDensity,
  type Syncopation,
} from '@/domain/controls/generation-controls'
import type { NoteDensityContext } from '@/domain/controls/generated-note-density'
import {
  isRhythmSettingBlocked,
  type RhythmSetting,
} from '@/domain/controls/unsupported-rhythm-settings'
import type { QuantizedDoodle } from '@/domain/doodle/quantized-doodle'
import { deepFreeze } from '@/domain/events/deep-freeze'
import { registerWindowContainsPitch } from '@/domain/profile/register-window'
import type { RegisterWindowCandidate } from '@/domain/profile/register-window-derivation'
import type { RegisterChoice } from '@/domain/profile/register-intent'

import { readDoodleRhythmAim } from './doodle-rhythm-reading'

/** Where a reading's value comes from: the doodle, or session mode's first-visit value. */
// @spec-link [[rule_doodle_sets_jam_controls]]
export type DoodleReadingSource = 'doodle' | 'default'

/** One control read from the doodle: its value and where the value comes from. */
// @spec-link [[rule_doodle_sets_jam_controls]]
export interface DoodleReading<T> {
  readonly value: T
  readonly source: DoodleReadingSource
}

/**
 * The rhythmic variety read from the doodle, after the step to a supported combination: `raised`
 * is true exactly when the step gave a higher variety than the value read or the default, and
 * `source` stays the source of the value it was raised from.
 */
// @spec-link [[rule_doodle_controls_always_supported]]
// @spec-link [[module_doodle_controls]]
export interface DoodleVarietyReading extends DoodleReading<RhythmicVariety> {
  readonly raised: boolean
}

/**
 * The register read from the doodle: Low, Middle or High, the instrument's register window that
 * holds the doodle's last note (`window`, the very window phrase 1's join reads), or Varying with
 * no window when none holds it. Every doodle shows a register.
 */
// @spec-link [[rule_jam_register_follows_doodle]]
// @spec-link [[module_doodle_controls]]
export interface DoodleRegisterReading {
  readonly value: RegisterChoice
  readonly source: 'doodle'
  readonly window: RegisterWindowCandidate | null
}

/**
 * The seven controls read from a doodle, after the step to a supported combination, none of them
 * depending on the window's width. The note density is the one the doodle showed: a Sixteenth
 * stays Sixteenth here at every width, and only generates as Eighth below the tablet-landscape
 * width.
 */
// @spec-link [[rule_doodle_sets_jam_controls]]
// @spec-link [[module_doodle_controls]]
export interface DoodleReadings {
  readonly noteDensity: DoodleReading<NoteDensity>
  readonly rhythmicVariety: DoodleVarietyReading
  readonly syncopation: DoodleReading<Syncopation>
  readonly silenceDensity: DoodleReading<SilenceDensity>
  readonly contour: DoodleReading<Contour>
  readonly leapiness: DoodleReading<Leapiness>
  readonly register: DoodleRegisterReading
}

/**
 * The context the step judges the note density in: one that resolves every density unchanged, so
 * the density is judged as read, a Sixteenth as Sixteenth.
 */
const AS_READ: NoteDensityContext = { belowTabletLandscape: false, sessionSteppedDown: false }

/** Half a measure, in ticks: contour checkpoints sit at positions 0–7 and 8–15. */
const HALF_MEASURE_TICKS = 8

/** The narrowest leap and the narrowest wide leap Leapiness counts, in half steps. */
const LEAP_HALF_STEPS = 5
const WIDE_LEAP_HALF_STEPS = 7

/** Intent: a reading of the doodle's value, or of the first-visit value when it shows none. */
function reading<T>(shown: T | null, firstVisit: T): DoodleReading<T> {
  return shown === null
    ? { value: firstVisit, source: 'default' }
    : { value: shown, source: 'doodle' }
}

/**
 * Intent: the contour checkpoints: in each half measure of the doodle, in order, the pitch of the
 * first note starting in it; a half measure where none starts is skipped.
 */
function contourCheckpoints(doodle: QuantizedDoodle): number[] {
  const halves = Array.from({ length: 2 * doodle.measureCount }, (_, index) => index)
  return halves.flatMap((half) => {
    const from = half * HALF_MEASURE_TICKS
    const first = doodle.notes.find(
      (note) => note.startTick >= from && note.startTick < from + HALF_MEASURE_TICKS,
    )
    return first === undefined ? [] : [first.pitch]
  })
}

/**
 * Intent: the contour the doodle shows, from its checkpoints: Rising when they never go down and
 * the last is above the first; Falling, the mirror; Arch when one checkpoint is the single highest
 * and is neither the first nor the last; else Wandering. Null (not shown) for fewer than three
 * checkpoints or all equal.
 */
// @spec-link [[rule_doodle_contour_reading]]
export function doodleContour(doodle: QuantizedDoodle): Contour | null {
  const points = contourCheckpoints(doodle)
  const first = points[0]
  const last = points[points.length - 1]
  if (points.length < 3 || first === undefined || last === undefined) return null
  if (points.every((pitch) => pitch === first)) return null
  const moves = points.slice(1).map((pitch, index) => pitch - points[index]!)
  if (moves.every((move) => move >= 0) && last > first) return 'Rising'
  if (moves.every((move) => move <= 0) && last < first) return 'Falling'
  const highest = Math.max(...points)
  const peaks = points.flatMap((pitch, index) => (pitch === highest ? [index] : []))
  const peak = peaks[0]
  if (peaks.length === 1 && peak !== 0 && peak !== points.length - 1) return 'Arch'
  return 'Wandering'
}

/**
 * Intent: the leapiness the doodle shows, from the moves between neighbouring notes in half steps:
 * w the widest, L the number of 5 or more, K the number of 7 or more, the counts scaled to four
 * measures. Smooth when w ≤ 4; Shaped when w ≤ 7, 4 × L ≤ 2 × M and 4 × K ≤ M; Leaping when
 * w ≤ 10, 4 × L ≤ 4 × M and 4 × K ≤ 2 × M; else Angular. Null (not shown) for fewer than two notes.
 */
// @spec-link [[rule_doodle_leapiness_reading]]
export function doodleLeapiness(doodle: QuantizedDoodle): Leapiness | null {
  const { notes, measureCount } = doodle
  if (notes.length < 2) return null
  const moves = notes.slice(1).map((note, index) => Math.abs(note.pitch - notes[index]!.pitch))
  const widest = Math.max(...moves)
  const leaps = moves.filter((move) => move >= LEAP_HALF_STEPS).length
  const wideLeaps = moves.filter((move) => move >= WIDE_LEAP_HALF_STEPS).length
  if (widest <= 4) return 'Smooth'
  if (widest <= 7 && 4 * leaps <= 2 * measureCount && 4 * wideLeaps <= measureCount) {
    return 'Shaped'
  }
  if (widest <= 10 && 4 * leaps <= 4 * measureCount && 4 * wideLeaps <= 2 * measureCount) {
    return 'Leaping'
  }
  return 'Angular'
}

/**
 * Intent: how far a pitch lies from a window's centre, doubled so it stays a whole number:
 * |2 × pitch − (lowest + highest)|.
 */
function doubledCentreDistance(candidate: RegisterWindowCandidate, pitch: number): number {
  return Math.abs(2 * pitch - (candidate.window.minMidi + candidate.window.maxMidi))
}

/**
 * Intent: the register the doodle shows, from its last note and the selected instrument's three
 * register windows (as deriveRegisterWindowCandidates gives them): the window holding the last
 * note, the nearest by its centre when several do, Middle on a tie (Middle is always among the
 * tied, as the windows are derived); Varying, with no window, when none holds it. The reading
 * carries the window it names, which phrase 1's join reads.
 */
// @spec-link [[rule_jam_register_follows_doodle]]
// @spec-link [[module_doodle_controls]]
export function readDoodleRegister(
  doodle: QuantizedDoodle,
  windows: readonly RegisterWindowCandidate[],
): DoodleRegisterReading {
  const last = doodle.notes[doodle.notes.length - 1]!
  const [nearest] = windows
    .filter((candidate) => registerWindowContainsPitch(candidate.window, last.pitch))
    .sort(
      (a, b) =>
        doubledCentreDistance(a, last.pitch) - doubledCentreDistance(b, last.pitch) ||
        Number(b.id === 'Middle') - Number(a.id === 'Middle') ||
        a.canonicalIndex - b.canonicalIndex,
    )
  return nearest === undefined
    ? { value: 'Varying', source: 'doodle', window: null }
    : { value: nearest.id, source: 'doodle', window: nearest }
}

/**
 * Intent: the rhythmic variety that makes the four rhythm values a supported combination, judged
 * by the generator's own rule with the note density as read (a Sixteenth as Sixteenth, at no
 * window width): the given variety, stepped up (Strict to Slightly varied to Heavily varied) only
 * while the combination is unsupported. Heavily varied supports every combination, and no
 * combination at Eighth is unsupported, so the result stays supported when a Sixteenth generates
 * as Eighth below the tablet-landscape width.
 */
// @spec-link [[rule_doodle_controls_always_supported]]
// @spec-link [[rule_unsupported_rhythm_settings_block_generation]]
// @spec-link [[rule_doodle_sixteenth_on_narrow_screens]]
export function supportedRhythmicVariety(setting: RhythmSetting): RhythmicVariety {
  let step = RHYTHMIC_VARIETIES.indexOf(setting.rhythmicVariety)
  while (
    step < RHYTHMIC_VARIETIES.length - 1 &&
    isRhythmSettingBlocked({ ...setting, rhythmicVariety: RHYTHMIC_VARIETIES[step]! }, AS_READ)
  ) {
    step += 1
  }
  return RHYTHMIC_VARIETIES[step]!
}

/**
 * Intent: the seven controls read from a quantized doodle (after the very-short-note filter), for
 * the selected instrument's register windows, and no window context: note density first, then the
 * other rhythm values, contour, leapiness and register, each control the doodle cannot show taking
 * session mode's first-visit value, marked as such; then rhythmic variety steps up while the
 * rhythm values, with the note density as read, form an unsupported combination, the reading
 * keeping the source of the value it was raised from and marked raised exactly when the step moved
 * it. Nothing else moves; the same doodle and windows always give the same readings, at every
 * window width.
 */
// @spec-link [[rule_doodle_sets_jam_controls]]
// @spec-link [[rule_doodle_controls_always_supported]]
// @spec-link [[rule_doodle_sixteenth_on_narrow_screens]]
// @spec-link [[module_doodle_controls]]
export function readDoodleControls(
  doodle: QuantizedDoodle,
  windows: readonly RegisterWindowCandidate[],
): DoodleReadings {
  const firstVisit = DEFAULT_GENERATION_CONTROLS
  const aim = readDoodleRhythmAim(doodle)
  const noteDensity = reading(aim.noteDensity, firstVisit.noteDensity)
  const shownVariety = reading(aim.rhythmicVariety, firstVisit.rhythmicVariety)
  const syncopation = reading(aim.syncopation, firstVisit.syncopation)
  const silenceDensity = reading(aim.silenceDensity, firstVisit.silenceDensity)
  const rhythmicVariety = supportedRhythmicVariety({
    noteDensity: noteDensity.value,
    rhythmicVariety: shownVariety.value,
    syncopation: syncopation.value,
    silenceDensity: silenceDensity.value,
  })
  return deepFreeze({
    noteDensity,
    rhythmicVariety: {
      value: rhythmicVariety,
      source: shownVariety.source,
      raised: rhythmicVariety !== shownVariety.value,
    },
    syncopation,
    silenceDensity,
    contour: reading(doodleContour(doodle), firstVisit.contour),
    leapiness: reading(doodleLeapiness(doodle), firstVisit.leapiness),
    register: readDoodleRegister(doodle, windows),
  })
}
