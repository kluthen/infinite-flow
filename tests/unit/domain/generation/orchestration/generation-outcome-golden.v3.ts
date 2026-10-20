/**
 * Byte-identical golden fixture for Step 9's canonical-rhythm-domain memo: eight real intents
 * (built with `createGenerationIntent`), recorded against the current orchestrator via
 * `fnv1a32(JSON.stringify(outcome))`. Covers Quarter/Straight/Sparse (Strict),
 * Eighth/Occasional offbeats/Conversational (Jazz, Slightly varied),
 * Sixteenth/Straight/Conversational (Strict), Sixteenth/Occasional offbeats/Sparse (Heavily
 * varied), Sixteenth/Active displacement/Sparse (Heavily varied, the worst-case grammar
 * expansion), a Varying register case, a second Jazz/Edge-tension case, and one
 * no_legal_rhythm_plan failure (Quarter/Sparse/Active displacement/Strict, a documented
 * unsupported rhythm setting). Every adopted instrument profile (c-keyboard, bb-tenor, eb-alto)
 * appears at least once. `generation-outcome-golden.spec.ts` asserts the orchestrator reproduces
 * these hashes exactly, cold and warm.
 *
 * Version history:
 * - v1: recorded from the pre-Step-9 baseline orchestrator.
 * - v2: signed-off tension-binding correction (option A): figure binding honours the documented
 *   `maximumResolutionDelay` with rests allowed between a figure and its target, and allows a
 *   rest between a preparation and its figure (including Build's two-note approach).
 * - v3: ISS-004, rhythmic variety. `NOTE_DENSITIES` drops `Mixed` and `GenerationControls` gains
 *   a required `rhythmicVariety`; the rhythm grammar bumps to `rhythm-mvp-v2`, whose candidate
 *   identity includes `rhythmicVariety`. Every hash moves, even for cases whose controls are
 *   otherwise unchanged, because the identity shape changed. The two `Mixed`-density cases are
 *   replaced with `Sixteenth`/`Heavily varied` cases (`sixteenth-heavily-occasional-sparse` and
 *   `sixteenth-heavily-active-sparse-worst-case`, the latter matching the re-measured browser
 *   worst-case scenario, ISS-004 feasibility review §6); the other six cases keep their density,
 *   silence, syncopation, and tension and are assigned a representative `rhythmicVariety`
 *   (`Strict` for the plain cases and the blocked-setting failure case, `Slightly varied` — the
 *   default — for the two Jazz cases and the register case).
 */

import type { GenerationControls } from '@/domain/controls/generation-controls'
import type { ProfileSelection } from '@/domain/controls/profile-selection'

export interface GoldenCase {
  readonly name: string
  readonly seed: number
  readonly musicalProfile: ProfileSelection
  readonly controls: GenerationControls
  readonly expectedKind: 'generation_success' | 'generation_failure'
  readonly expectedCode?: string
  readonly expectedHash: number
}

export const GENERATION_OUTCOME_GOLDEN_V3: readonly GoldenCase[] = [
  {
    name: 'quarter-straight-sparse',
    seed: 1,
    musicalProfile: { musicalProfile: 'Neutral', isCustom: true },
    controls: {
      tempo: 90,
      tonalCenter: 'C',
      collection: 'Major',
      harmonicMotion: 'Gentle diatonic',
      tension: 'Settled',
      noteDensity: 'Quarter',
      rhythmicVariety: 'Strict',
      syncopation: 'Straight',
      silenceDensity: 'Sparse',
      contour: 'Arch',
      register: 'Middle',
      leapiness: 'Shaped',
      arpeggioChaos: 'Predictable',
      instrumentProfileId: 'c-keyboard',
    },
    expectedKind: 'generation_success',
    expectedHash: 1769131728,
  },
  {
    name: 'eighth-occasional-conversational-jazz',
    seed: 2,
    musicalProfile: { musicalProfile: 'Jazz', isCustom: true },
    controls: {
      tempo: 120,
      tonalCenter: 'C',
      collection: 'Major',
      harmonicMotion: 'Active diatonic',
      tension: 'Build',
      noteDensity: 'Eighth',
      rhythmicVariety: 'Slightly varied',
      syncopation: 'Occasional offbeats',
      silenceDensity: 'Conversational',
      contour: 'Arch',
      register: 'Low',
      leapiness: 'Shaped',
      arpeggioChaos: 'Predictable',
      instrumentProfileId: 'bb-tenor',
    },
    expectedKind: 'generation_success',
    expectedHash: 3728982439,
  },
  {
    name: 'sixteenth-straight-conversational',
    seed: 3,
    musicalProfile: { musicalProfile: 'Neutral', isCustom: true },
    controls: {
      tempo: 100,
      tonalCenter: 'D',
      collection: 'Dorian',
      harmonicMotion: 'Static',
      tension: 'Lift',
      noteDensity: 'Sixteenth',
      rhythmicVariety: 'Strict',
      syncopation: 'Straight',
      silenceDensity: 'Conversational',
      contour: 'Arch',
      register: 'High',
      leapiness: 'Shaped',
      arpeggioChaos: 'Predictable',
      instrumentProfileId: 'eb-alto',
    },
    expectedKind: 'generation_success',
    expectedHash: 3744123783,
  },
  {
    name: 'sixteenth-heavily-occasional-sparse',
    seed: 4,
    musicalProfile: { musicalProfile: 'Neutral', isCustom: true },
    controls: {
      tempo: 90,
      tonalCenter: 'C',
      collection: 'Major',
      harmonicMotion: 'Gentle diatonic',
      tension: 'Lift',
      noteDensity: 'Sixteenth',
      rhythmicVariety: 'Heavily varied',
      syncopation: 'Occasional offbeats',
      silenceDensity: 'Sparse',
      contour: 'Arch',
      register: 'Middle',
      leapiness: 'Shaped',
      arpeggioChaos: 'Predictable',
      instrumentProfileId: 'c-keyboard',
    },
    expectedKind: 'generation_success',
    expectedHash: 1475833402,
  },
  {
    name: 'sixteenth-heavily-active-sparse-worst-case',
    seed: 5,
    musicalProfile: { musicalProfile: 'Neutral', isCustom: true },
    controls: {
      tempo: 90,
      tonalCenter: 'C',
      collection: 'Major',
      harmonicMotion: 'Gentle diatonic',
      tension: 'Build',
      noteDensity: 'Sixteenth',
      rhythmicVariety: 'Heavily varied',
      syncopation: 'Active displacement',
      silenceDensity: 'Sparse',
      contour: 'Arch',
      register: 'Middle',
      leapiness: 'Shaped',
      arpeggioChaos: 'Predictable',
      instrumentProfileId: 'bb-tenor',
    },
    expectedKind: 'generation_success',
    expectedHash: 124470598,
  },
  {
    name: 'varying-register',
    seed: 6,
    musicalProfile: { musicalProfile: 'Neutral', isCustom: true },
    controls: {
      tempo: 90,
      tonalCenter: 'G',
      collection: 'Mixolydian',
      harmonicMotion: 'Gentle diatonic',
      tension: 'Settled',
      noteDensity: 'Eighth',
      rhythmicVariety: 'Slightly varied',
      syncopation: 'Straight',
      silenceDensity: 'Sparse',
      contour: 'Arch',
      register: 'Varying',
      leapiness: 'Shaped',
      arpeggioChaos: 'Predictable',
      instrumentProfileId: 'eb-alto',
    },
    expectedKind: 'generation_success',
    expectedHash: 931098409,
  },
  {
    name: 'quarter-occasional-breath-heavy-jazz-edge',
    seed: 7,
    musicalProfile: { musicalProfile: 'Jazz', isCustom: true },
    controls: {
      tempo: 90,
      tonalCenter: 'C',
      collection: 'Major',
      harmonicMotion: 'Active diatonic',
      tension: 'Edge',
      noteDensity: 'Quarter',
      rhythmicVariety: 'Slightly varied',
      syncopation: 'Occasional offbeats',
      silenceDensity: 'Breath-heavy',
      contour: 'Arch',
      register: 'Middle',
      leapiness: 'Shaped',
      arpeggioChaos: 'Predictable',
      instrumentProfileId: 'c-keyboard',
    },
    expectedKind: 'generation_success',
    expectedHash: 365996511,
  },
  {
    name: 'no-legal-rhythm-plan-failure',
    seed: 8,
    musicalProfile: { musicalProfile: 'Neutral', isCustom: true },
    controls: {
      tempo: 90,
      tonalCenter: 'C',
      collection: 'Major',
      harmonicMotion: 'Gentle diatonic',
      tension: 'Settled',
      noteDensity: 'Quarter',
      rhythmicVariety: 'Strict',
      syncopation: 'Active displacement',
      silenceDensity: 'Sparse',
      contour: 'Arch',
      register: 'Middle',
      leapiness: 'Shaped',
      arpeggioChaos: 'Predictable',
      instrumentProfileId: 'bb-tenor',
    },
    expectedKind: 'generation_failure',
    expectedCode: 'no_legal_rhythm_plan',
    expectedHash: 1503321455,
  },
]
