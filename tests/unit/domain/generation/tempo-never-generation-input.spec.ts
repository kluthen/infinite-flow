/**
 * Tempo is transport only. Type level: no field named `tempo` exists anywhere inside the values
 * the planners and the join consume (the resolved request, the carry-in, the bound pitch-planner
 * input, the harmony planner input and the rhythm-domain key); the detector is proved live on the
 * outer intent, whose control policy still records the chosen tempo for the transport. Property:
 * across seeds, settings, with and without carry-in, every tempo yields the identical outcome.
 */

import { describe, expect, it } from 'vitest'

import { TEMPO_VALUES, type GenerationControls } from '@/domain/controls/generation-controls'
import type { CarryIn } from '@/domain/generation/carry-in/carry-in'
import type { GenerationIntent } from '@/domain/generation/generation-intent'
import type { GenerationRequest } from '@/domain/generation/generation-request'
import type { CanonicalRhythmDomainMemo } from '@/domain/generation/orchestration/canonical-rhythm-domain'
import { generatePhrase } from '@/domain/generation/orchestration/generation-orchestrator'
import type { HarmonyPlannerInput } from '@/domain/harmony/harmony-types'
import type { BoundPitchPlannerInput } from '@/domain/pitch/pitch-types'
import { buildIntent, carryInAfter, generateSuccess } from './carry-in/carry-in-fixture'

/** Every string key reachable inside `T`, through objects and arrays, to a bounded depth. */
type DeepKeys<T, Depth extends readonly unknown[] = []> = Depth['length'] extends 10
  ? never
  : T extends readonly (infer Element)[]
    ? DeepKeys<Element, [...Depth, unknown]>
    : T extends object
      ? { [K in keyof T & string]: K | DeepKeys<T[K], [...Depth, unknown]> }[keyof T & string]
      : never

/** `true` exactly when no key named `tempo` is reachable inside `T`. */
type TempoFree<T> = 'tempo' extends DeepKeys<T> ? false : true

type RhythmDomainKey = Parameters<CanonicalRhythmDomainMemo['lookup']>[0]

const requestIsTempoFree: TempoFree<GenerationRequest> = true
const carryInIsTempoFree: TempoFree<CarryIn> = true
const pitchInputIsTempoFree: TempoFree<BoundPitchPlannerInput> = true
const harmonyInputIsTempoFree: TempoFree<HarmonyPlannerInput> = true
const rhythmKeyIsTempoFree: TempoFree<RhythmDomainKey> = true
const intentStillRecordsTempo: TempoFree<GenerationIntent> = false

const SETTINGS: readonly Partial<GenerationControls>[] = [
  {},
  { leapiness: 'Angular', arpeggioChaos: 'Chaotic', noteDensity: 'Eighth' },
  { collection: 'Dorian', harmonicMotion: 'Active diatonic', register: 'Varying' },
]

// @test-link [[rule_tempo_never_affects_generation]]
describe('tempo never reaches generation', () => {
  it('is absent from every planner and join input type', () => {
    expect([
      requestIsTempoFree,
      carryInIsTempoFree,
      pitchInputIsTempoFree,
      harmonyInputIsTempoFree,
      rhythmKeyIsTempoFree,
      intentStillRecordsTempo,
    ]).toEqual([true, true, true, true, true, false])
  })

  it.each(SETTINGS.map((controls, index) => ({ controls, index })))(
    'gives the same phrase at every tempo, with and without carry-in (settings $index)',
    ({ controls }) => {
      for (const seed of [3, 5]) {
        const standalone = TEMPO_VALUES.map((tempo) =>
          generatePhrase(buildIntent({ seed, controls: { ...controls, tempo }, label: 'tempo' })),
        )
        for (const outcome of standalone) expect(outcome).toEqual(standalone[0])

        const firstIntent = buildIntent({ seed, controls, label: 'tempo-first' })
        const carryIn = carryInAfter(firstIntent, generateSuccess(firstIntent), 1)
        const continued = TEMPO_VALUES.map((tempo) =>
          generatePhrase(
            buildIntent({
              seed: seed + 1,
              controls: { ...controls, tempo },
              carryIn,
              label: 'tempo',
            }),
          ),
        )
        for (const outcome of continued) expect(outcome).toEqual(continued[0])
      }
    },
  )
})
