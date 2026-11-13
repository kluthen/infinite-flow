/**
 * The join's fit check at every Seventh chords level: `carriedHarmonyFits` takes no level and
 * compares the carried chord's triad, role and endpoint, which no plan variant changes, so it gives
 * the same answer for a carried chord with and without its seventh, whatever the receiving
 * intent's level and seed; and the session's carry-in adaptation keeps or drops the same chords
 * as at Off.
 */

import { describe, expect, it } from 'vitest'

import {
  OFF_CHORD_FAMILIES,
  parseChordFamilies,
  type ChordFamilyLevel,
} from '@/domain/chords/chord-families'
import {
  COLLECTIONS,
  HARMONIC_MOTIONS,
  TENSION_ARCS,
  makeGenerationControls,
  type GenerationControls,
} from '@/domain/controls/generation-controls'
import { NEUTRAL_FIGURE_LEVELS } from '@/domain/figures/figure-levels'
import { makeCarryIn, type PhraseCarryIn } from '@/domain/generation/carry-in/carry-in'
import { carriedHarmonyFits } from '@/domain/generation/carry-in/carry-in-fit'
import { makeHarmonyCollection } from '@/domain/harmony/collection'
import type { CarriedHarmony } from '@/domain/harmony/harmony-join'
import { makeHarmonyCandidateDomain } from '@/domain/harmony/harmony-planner'
import { adaptCarryIn } from '@/session/carry-in-adaptation'
import type { SessionSettings } from '@/session/session-types'
import { ALL_GROUPS_ALLOWED } from '@/session/settings-mutation'
import { seventhOf } from '../../harmony/seventh-chord-fixtures'
import { BASE_CONTROLS, buildIntent, carryInAfter, generateSuccess } from './carry-in-fixture'

const LEVELS: readonly ChordFamilyLevel[] = ['off', 'sometimes', 'favored', 'stronglyFavored']
const SEEDS = [3, 2654435761] as const

/** The harmony controls of one receiving phrase, in C. */
interface HarmonySettings {
  readonly collection: (typeof COLLECTIONS)[number]
  readonly harmonicMotion: (typeof HARMONIC_MOTIONS)[number]
  readonly tension: (typeof TENSION_ARCS)[number]
}

/** Every mode, motion and tension, in C. */
const SETTINGS: readonly HarmonySettings[] = COLLECTIONS.flatMap((collection) =>
  HARMONIC_MOTIONS.flatMap((harmonicMotion) =>
    TENSION_ARCS.map((tension) => ({ collection, harmonicMotion, tension })),
  ),
)

/**
 * Intent: every chord some settings in C end a phrase on, with its role and endpoint class, each
 * once, as a triad and with its seventh: the rows of the fit matrix.
 */
function carriedChords(): readonly (readonly [CarriedHarmony, CarriedHarmony])[] {
  const seen = new Map<string, readonly [CarriedHarmony, CarriedHarmony]>()
  for (const { collection, harmonicMotion, tension } of SETTINGS) {
    const domain = makeHarmonyCandidateDomain({
      tonalCenter: 'C',
      collection,
      harmonicMotion,
      tensionArc: tension,
    })
    if (domain.kind !== 'harmony_candidate_domain') continue
    for (const candidate of domain.candidates) {
      const final = candidate.events.at(-1)!
      const triad: CarriedHarmony = {
        triad: final.triad,
        role: final.role,
        endpoint: candidate.endpoint,
      }
      const seventh = seventhOf(final.triad.degree, makeHarmonyCollection('C', collection))
      seen.set(JSON.stringify(triad), [triad, { ...triad, seventh }])
    }
  }
  return [...seen.values()]
}

/** Intent: the controls of the receiving phrase. */
function controlsOf(settings: HarmonySettings): GenerationControls {
  return makeGenerationControls({ ...BASE_CONTROLS, ...settings })
}

// @test-link [[rule_harmony_change_drops_unfit_harmonic_carry_in]]
describe('the fit check over the fit matrix, at every level and seed', () => {
  it(
    'gives the same answer for a carried chord with and without its seventh',
    { timeout: 30_000 },
    () => {
      const rows = carriedChords()
      const answers = new Set<boolean>()
      for (const settings of SETTINGS) {
        const controls = controlsOf(settings)
        const atOff = rows.map(([triad]) => carriedHarmonyFits(triad, { controls }))
        atOff.forEach((answer) => answers.add(answer))
        LEVELS.forEach((level, levelIndex) => {
          const seed = SEEDS[levelIndex % SEEDS.length]!
          const receiver = {
            ...buildIntent({ seed, controls: settings, label: 'fit-levels' }),
            chordFamilies: parseChordFamilies({ 'seventh-chords': level }),
          }
          const where = `${JSON.stringify(settings)} ${level} seed ${seed}`
          expect(
            rows.map(([triad]) => carriedHarmonyFits(triad, receiver)),
            where,
          ).toEqual(atOff)
          expect(
            rows.map(([, seventh]) => carriedHarmonyFits(seventh, receiver)),
            where,
          ).toEqual(atOff)
        })
      }
      expect([...answers].sort()).toEqual([false, true])
    },
  )
})

/** Intent: session settings in C, every other control the fixture's, the figure levels Neutral's. */
function sessionSettings(settings: HarmonySettings): SessionSettings {
  return {
    controls: controlsOf(settings),
    figureLevels: NEUTRAL_FIGURE_LEVELS,
    chordFamilies: OFF_CHORD_FAMILIES,
    selection: { kind: 'custom', baseId: 'neutral' },
    allowedGroups: ALL_GROUPS_ALLOWED,
    rhythmLockOn: false,
    allowedRhythmChanges: [],
  }
}

/** Intent: what an adaptation did to the carried chord: kept, dropped, or no carry-in left. */
function chordOutcome(adapted: ReturnType<typeof adaptCarryIn>): string {
  if (adapted.kind === 'standalone') return `standalone:${adapted.register}`
  return adapted.carryIn.finalHarmony === null ? 'dropped' : 'kept'
}

// @test-link [[rule_harmony_change_drops_unfit_harmonic_carry_in]]
describe("the session's carry-in adaptation with a carried seventh", () => {
  it('keeps or drops the same chords as for the same chord carried as a triad', () => {
    const outcomes = new Set<string>()
    for (const seed of [4, 5, 9]) {
      const before: HarmonySettings = {
        collection: 'Major',
        harmonicMotion: 'Gentle diatonic',
        tension: 'Settled',
      }
      const intent = buildIntent({
        seed,
        controls: before,
        label: 'fit-levels-session',
        chordFamilies: parseChordFamilies({ 'seventh-chords': 'stronglyFavored' }),
      })
      const carried: PhraseCarryIn = carryInAfter(intent, generateSuccess(intent), 1)
      const final = carried.finalHarmony!
      const withSeventh = makeCarryIn({
        ...carried,
        finalHarmony: { ...final, seventh: final.seventh ?? seventhOf(final.triad.degree) },
      })
      const triadOnly = { triad: final.triad, role: final.role, endpoint: final.endpoint }
      const asTriad = makeCarryIn({ ...carried, finalHarmony: triadOnly })
      for (const harmonicMotion of HARMONIC_MOTIONS)
        for (const tension of TENSION_ARCS) {
          const after = sessionSettings({ collection: 'Major', harmonicMotion, tension })
          const input = {
            before: sessionSettings(before),
            after,
            candidates: intent.registerIntent.candidates,
          }
          const outcome = chordOutcome(adaptCarryIn({ ...input, carryIn: asTriad }))
          outcomes.add(outcome)
          expect(chordOutcome(adaptCarryIn({ ...input, carryIn: withSeventh })), `${seed}`).toBe(
            outcome,
          )
        }
    }
    expect(outcomes.has('kept') && outcomes.has('dropped')).toBe(true)
  })
})
