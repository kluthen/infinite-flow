/**
 * Byte-identical golden fixture for Step 9's canonical-rhythm-domain memo: eight real intents
 * (built with `createGenerationIntent`), recorded against the pre-Step-9 baseline orchestrator
 * (`makeRhythmCandidateDomain` + `materializeRankedRhythmCache`, no memo) via
 * `fnv1a32(JSON.stringify(outcome))`. Covers Quarter/Straight/Sparse, Eighth/Occasional
 * offbeats/Conversational (Jazz), Sixteenth/Straight/Conversational, Mixed/Occasional
 * offbeats/Sparse, Mixed/Active displacement/Conversational (the worst-case grammar expansion), a
 * Varying register case, a second Jazz/Edge-tension case, and one no_legal_rhythm_plan failure
 * (Quarter/Sparse/Active displacement, a documented unsupported rhythm setting). Every adopted
 * instrument profile (c-keyboard, bb-tenor, eb-alto) appears at least once. `generation-outcome-
 * golden.spec.ts` asserts the post-memo orchestrator reproduces these hashes exactly, cold and
 * warm.
 *
 * Version history:
 * - v1: recorded from the pre-Step-9 baseline orchestrator (above).
 * - v2: signed-off tension-binding correction (option A). Figure binding now honours the
 *   documented `maximumResolutionDelay` with rests allowed between a figure and its target, and
 *   allows a rest between a preparation and its figure (including Build's two-note approach).
 *   Exactly two hashes changed, both because the search now selects a rest-crossing two-note
 *   approach it could not bind before: eighth-occasional-conversational-jazz (1260875452 ->
 *   3547197893) and mixed-active-conversational-worst-case (1219559637 -> 2424973756). The
 *   other six hashes are unchanged from v1.
 */

import type { GenerationControls } from '@/domain/controls/generation-controls'
import type { GenerationIntentInput } from '@/domain/generation/generation-intent'

export interface GoldenCase {
  readonly name: string
  readonly seed: number
  readonly musicalProfile: GenerationIntentInput['musicalProfile']
  readonly controls: GenerationControls
  readonly expectedKind: 'generation_success' | 'generation_failure'
  readonly expectedCode?: string
  readonly expectedHash: number
}

export const GENERATION_OUTCOME_GOLDEN_V2: readonly GoldenCase[] = [
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
      syncopation: 'Straight',
      silenceDensity: 'Sparse',
      contour: 'Arch',
      register: 'Middle',
      leapiness: 'Shaped',
      arpeggioChaos: 'Predictable',
      instrumentProfileId: 'c-keyboard',
    },
    expectedKind: 'generation_success',
    expectedHash: 2143631357,
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
      syncopation: 'Occasional offbeats',
      silenceDensity: 'Conversational',
      contour: 'Arch',
      register: 'Low',
      leapiness: 'Shaped',
      arpeggioChaos: 'Predictable',
      instrumentProfileId: 'bb-tenor',
    },
    expectedKind: 'generation_success',
    expectedHash: 3547197893,
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
      syncopation: 'Straight',
      silenceDensity: 'Conversational',
      contour: 'Arch',
      register: 'High',
      leapiness: 'Shaped',
      arpeggioChaos: 'Predictable',
      instrumentProfileId: 'eb-alto',
    },
    expectedKind: 'generation_success',
    expectedHash: 93194286,
  },
  {
    name: 'mixed-occasional-sparse',
    seed: 4,
    musicalProfile: { musicalProfile: 'Neutral', isCustom: true },
    controls: {
      tempo: 90,
      tonalCenter: 'C',
      collection: 'Major',
      harmonicMotion: 'Gentle diatonic',
      tension: 'Lift',
      noteDensity: 'Mixed',
      syncopation: 'Occasional offbeats',
      silenceDensity: 'Sparse',
      contour: 'Arch',
      register: 'Middle',
      leapiness: 'Shaped',
      arpeggioChaos: 'Predictable',
      instrumentProfileId: 'c-keyboard',
    },
    expectedKind: 'generation_success',
    expectedHash: 826975471,
  },
  {
    name: 'mixed-active-conversational-worst-case',
    seed: 5,
    musicalProfile: { musicalProfile: 'Neutral', isCustom: true },
    controls: {
      tempo: 90,
      tonalCenter: 'C',
      collection: 'Major',
      harmonicMotion: 'Gentle diatonic',
      tension: 'Build',
      noteDensity: 'Mixed',
      syncopation: 'Active displacement',
      silenceDensity: 'Conversational',
      contour: 'Arch',
      register: 'Middle',
      leapiness: 'Shaped',
      arpeggioChaos: 'Predictable',
      instrumentProfileId: 'bb-tenor',
    },
    expectedKind: 'generation_success',
    expectedHash: 2424973756,
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
      syncopation: 'Straight',
      silenceDensity: 'Sparse',
      contour: 'Arch',
      register: 'Varying',
      leapiness: 'Shaped',
      arpeggioChaos: 'Predictable',
      instrumentProfileId: 'eb-alto',
    },
    expectedKind: 'generation_success',
    expectedHash: 4224242317,
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
      syncopation: 'Occasional offbeats',
      silenceDensity: 'Breath-heavy',
      contour: 'Arch',
      register: 'Middle',
      leapiness: 'Shaped',
      arpeggioChaos: 'Predictable',
      instrumentProfileId: 'c-keyboard',
    },
    expectedKind: 'generation_success',
    expectedHash: 3807563902,
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
