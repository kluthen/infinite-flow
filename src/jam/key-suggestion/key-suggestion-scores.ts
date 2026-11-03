/**
 * The key and mode suggestion's scores (master spec C6.2, from the research note
 * docs/music/key-and-mode-estimation.md): every one of the 84 pairs, a home note C to B with a
 * mode Ionian to Locrian, gets a penalty, the sum over the quantized doodle's notes of the note's
 * role penalty in the pair times its weight, less the home-note cues of the first and last notes;
 * the lower, the likelier. The role penalties are the role shares as negative natural logarithms
 * in thousandths. A note's weight is its length in ticks clamped to half a beat and a beat and a
 * half, one and a half times on beat 1 or 3; that factor is taken by doubling the scale (eight
 * weight units a beat), so every weight stays whole. The cues are the research note's: the last
 * note's chance counts twice, the first's one and a half times, when it is the pair's home note,
 * a fixed −693 and −405 thousandths on the same scale. The kept candidates are at most three
 * pairs within 693 thousandths of the best (at least half its chance), in a fixed order. Pure,
 * whole numbers only, no restriction; part of Jam's code (src/jam/), loaded on demand.
 */
import type { DoodleNote, QuantizedDoodle } from '@/domain/doodle/quantized-doodle'
import { deepFreeze } from '@/domain/events/deep-freeze'
import { COLLECTION_OFFSETS } from '@/domain/harmony/collection'
import type { PitchClassNumber } from '@/domain/harmony/harmony-types'

/** The seven modes the suggestion scores, in its tie order (Major is Ionian, Minor Aeolian). */
// @spec-link [[rule_suggestion_candidates]]
export const KEY_MODES = deepFreeze([
  'Ionian',
  'Dorian',
  'Phrygian',
  'Lydian',
  'Mixolydian',
  'Aeolian',
  'Locrian',
] as const)

/** One of the seven modes the suggestion scores. */
// @spec-link [[rule_suggestion_candidates]]
export type KeyMode = (typeof KEY_MODES)[number]

/**
 * The role penalties, in thousandths: −ln of the role shares 0.200 (home note), 0.165 (fifth),
 * 0.145 (third), 0.1175 (each of the other four notes of the mode) and 0.004 (a note outside it).
 */
// @spec-link [[rule_suggestion_candidates]]
// @spec-link [[module_key_suggestion]]
export const ROLE_PENALTIES = deepFreeze({
  home: 1609,
  fifth: 1802,
  third: 1931,
  other: 2141,
  outside: 5521,
})

/** The last note's cue when it is the pair's home note, in thousandths: −ln 2. */
// @spec-link [[rule_suggestion_candidates]]
export const FINAL_HOME_CUE = 693

/** The first note's cue when it is the pair's home note, in thousandths: −ln 1.5. */
// @spec-link [[rule_suggestion_candidates]]
export const FIRST_HOME_CUE = 405

/** Weight units in a beat: four ticks, doubled so that one and a half times a weight stays whole. */
// @spec-link [[module_key_suggestion]]
export const WEIGHT_UNITS_PER_BEAT = 8

/** The widest gap to the best pair a candidate may have, in thousandths: −ln 0.5. */
// @spec-link [[rule_suggestion_candidates]]
export const KEPT_GAP = 693

/** The most candidates kept. */
// @spec-link [[rule_suggestion_candidates]]
export const MAX_KEPT_CANDIDATES = 3

/** The fewest pitch classes, notes and ticks of sounding time (2 beats) a suggestion needs. */
// @spec-link [[rule_suggestion_withheld]]
export const MATERIAL_THRESHOLDS = deepFreeze({ pitchClasses: 5, notes: 6, ticks: 8 })

/** A note's length counts between 2 ticks (half a beat) and 6 (a beat and a half). */
const MIN_WEIGHTED_TICKS = 2
const MAX_WEIGHTED_TICKS = 6

/** Beats 1 and 3 fall every 8 ticks (ticks 0 and 8 of a measure). */
const STRONG_BEAT_TICKS = 8

/** A pair: a home note in concert pitch and a mode. */
// @spec-link [[module_key_suggestion]]
export interface KeyModePair {
  readonly homeNote: PitchClassNumber
  readonly mode: KeyMode
}

/**
 * A scored pair. Its penalty is in thousandths with weights counted in eighths of a beat: divided
 * by WEIGHT_UNITS_PER_BEAT it is the research note's penalty, in thousandths.
 */
// @spec-link [[module_key_suggestion]]
export interface ScoredPair extends KeyModePair {
  readonly penalty: number
}

/** Intent: a pitch's pitch class, 0 (C) to 11 (B). */
function pitchClassOf(pitch: number): PitchClassNumber {
  return (pitch % 12) as PitchClassNumber
}

/**
 * Intent: a note's weight in eighths of a beat: its length clamped to 2–6 ticks, twice that, or
 * three times when it starts on beat 1 or 3.
 */
// @spec-link [[rule_suggestion_candidates]]
export function noteWeight(note: DoodleNote): number {
  const ticks = Math.min(MAX_WEIGHTED_TICKS, Math.max(MIN_WEIGHTED_TICKS, note.lengthTicks))
  return note.startTick % STRONG_BEAT_TICKS === 0 ? ticks * 3 : ticks * 2
}

/**
 * Intent: the role penalty of each of the twelve intervals above a mode's home note: home, the
 * fifth and third degrees, the other four degrees, and the five notes outside the mode.
 */
function rolePenaltiesOf(mode: KeyMode): readonly number[] {
  const offsets: readonly number[] = COLLECTION_OFFSETS[mode]
  return Array.from({ length: 12 }, (_, interval) => {
    if (interval === 0) return ROLE_PENALTIES.home
    if (interval === offsets[4]) return ROLE_PENALTIES.fifth
    if (interval === offsets[2]) return ROLE_PENALTIES.third
    return offsets.includes(interval) ? ROLE_PENALTIES.other : ROLE_PENALTIES.outside
  })
}

/** Each mode's role penalty by interval above its home note, built once. */
const ROLE_TABLES: readonly (readonly number[])[] = deepFreeze(KEY_MODES.map(rolePenaltiesOf))

/**
 * Intent: the 84 pairs' penalties for a doodle, home note C to B, each with the modes Ionian to
 * Locrian: each note's role penalty times its weight, less the cue of a first or last note that
 * is the pair's home note. A doodle has at least one note.
 */
// @spec-link [[rule_suggestion_candidates]]
// @spec-link [[module_key_suggestion]]
export function scorePairs(doodle: QuantizedDoodle): readonly ScoredPair[] {
  const notes = doodle.notes.map((note) => ({
    pitchClass: pitchClassOf(note.pitch),
    weight: noteWeight(note),
  }))
  const first = notes[0]!.pitchClass
  const last = notes[notes.length - 1]!.pitchClass
  const pairs: ScoredPair[] = []
  for (let home = 0; home < 12; home += 1) {
    const homeNote = home as PitchClassNumber
    const cues =
      (last === homeNote ? FINAL_HOME_CUE : 0) + (first === homeNote ? FIRST_HOME_CUE : 0)
    KEY_MODES.forEach((mode, modeIndex) => {
      const roles = ROLE_TABLES[modeIndex]!
      let penalty = -cues * WEIGHT_UNITS_PER_BEAT
      for (const note of notes) penalty += roles[(note.pitchClass - home + 12) % 12]! * note.weight
      pairs.push({ homeNote, mode, penalty })
    })
  }
  return deepFreeze(pairs)
}

/** Intent: the kept candidates' order: by penalty, then home note C to B, then mode. */
function comparePairs(a: ScoredPair, b: ScoredPair): number {
  return (
    a.penalty - b.penalty ||
    a.homeNote - b.homeNote ||
    KEY_MODES.indexOf(a.mode) - KEY_MODES.indexOf(b.mode)
  )
}

/**
 * Intent: the kept candidates: the pairs within 693 thousandths of the best, by penalty, then
 * home note C to B, then mode Ionian to Locrian, at most three. The first is the best pair.
 */
// @spec-link [[rule_suggestion_candidates]]
export function keptCandidates(scores: readonly ScoredPair[]): readonly ScoredPair[] {
  const ordered = [...scores].sort(comparePairs)
  const best = ordered[0]
  if (best === undefined) throw new Error('The key suggestion needs scored pairs to keep any.')
  const widest = best.penalty + KEPT_GAP * WEIGHT_UNITS_PER_BEAT
  return deepFreeze(ordered.filter((pair) => pair.penalty <= widest).slice(0, MAX_KEPT_CANDIDATES))
}

/**
 * Intent: whether the doodle has enough material to suggest from: at least 5 pitch classes,
 * 6 notes and 2 beats (8 ticks) of sounding time.
 */
// @spec-link [[rule_suggestion_withheld]]
export function hasEnoughMaterial(doodle: QuantizedDoodle): boolean {
  const pitchClasses = new Set(doodle.notes.map((note) => pitchClassOf(note.pitch)))
  const ticks = doodle.notes.reduce((sum, note) => sum + note.lengthTicks, 0)
  return (
    pitchClasses.size >= MATERIAL_THRESHOLDS.pitchClasses &&
    doodle.notes.length >= MATERIAL_THRESHOLDS.notes &&
    ticks >= MATERIAL_THRESHOLDS.ticks
  )
}

/**
 * Intent: whether at least 80 % of the doodle's weighted length lies in the pair's notes
 * (5 × fitting ≥ 4 × total); under it, the doodle fits no mode well enough.
 */
// @spec-link [[rule_doodle_outside_modes_told]]
export function fitsWell(doodle: QuantizedDoodle, pair: KeyModePair): boolean {
  const offsets: readonly number[] = COLLECTION_OFFSETS[pair.mode]
  let total = 0
  let fitting = 0
  for (const note of doodle.notes) {
    const weight = noteWeight(note)
    total += weight
    if (offsets.includes((pitchClassOf(note.pitch) - pair.homeNote + 12) % 12)) fitting += weight
  }
  return 5 * fitting >= 4 * total
}
