/**
 * The plan variants of the Seventh chords level (spec §D5.3): from the ranked harmony order, the
 * list the window search walks. At Off it is the ranked order itself, object for object, and no
 * draw is made. Above Off, each plan with at least one drawn seventh (seventh-draw.ts) is replaced,
 * in its place, by two variants directly after each other: the plan with its drawn events in their
 * seventh form, then the plan as triads only, exactly as ranked. The variants keep each plan's
 * degrees, roles, templates, endpoint class and colour chords, so the plans and their order are
 * Off's. The orchestrator builds this list to search, and the result validator rebuilds it to
 * check a phrase's plan: both from the same plans, level and seed. Pure.
 */

import type { ChordFamilyLevel } from '../../chords/chord-families'
import { deepFreeze } from '../../events/deep-freeze'
import type {
  ChordSeventh,
  CollectionDegree,
  HarmonyCandidate,
  HarmonyCollection,
  HarmonyEvent,
} from '../../harmony/harmony-types'
import { isSeventhDrawn } from '../../harmony/seventh-draw'
import type { Seed } from '../../random/seed'

/**
 * Intent: what a seventh variant's identity gains after its plan's: this mark, then the indices of
 * its seventh-form events, comma-separated. A triads-only plan's identity never holds it.
 */
// @spec-link [[service_generation_orchestration]]
export const SEVENTHS_IDENTITY_MARK = '|sevenths:'

/** Intent: the seventh the collection gives on a degree: its pitch class and its quality. */
function seventhOnDegree(collection: HarmonyCollection, degree: CollectionDegree): ChordSeventh {
  const chord = collection.seventhChords[degree - 1]
  if (chord?.degree !== degree)
    throw new Error(`The collection has no seventh chord on degree ${degree}.`)
  return { pitchClass: chord.pitchClasses[3], quality: chord.quality }
}

/** Intent: the plan with each drawn event in its seventh form, its identity marked. */
function seventhVariant(
  candidate: HarmonyCandidate,
  drawn: readonly boolean[],
  collection: HarmonyCollection,
): HarmonyCandidate {
  const events = candidate.events.map((event, index): HarmonyEvent =>
    drawn[index] ? { ...event, seventh: seventhOnDegree(collection, event.triad.degree) } : event,
  )
  const indices = drawn.flatMap((isDrawn, index) => (isDrawn ? [index] : [])).join(',')
  return {
    ...candidate,
    identity: `${candidate.identity}${SEVENTHS_IDENTITY_MARK}${indices}`,
    events,
  }
}

/**
 * Intent: the harmony list searched at a Seventh chords level, from the ranked plans, the
 * collection they are built on and the phrase's seed. Off returns `ranked` itself and draws
 * nothing; above Off, each plan with a drawn seventh becomes its seventh variant then itself, a
 * plan with none stays as it is, so the list grows by at most one variant per plan.
 */
// @spec-link [[service_generation_orchestration]]
// @spec-link [[rule_triad_fallback_per_phrase]]
// @spec-link [[rule_seventh_chords_level_never_a_quota]]
// @spec-link [[rule_seventh_chords_keep_the_chord_plan]]
// @spec-link [[rule_seventh_chords_off_changes_nothing]]
export function harmonyPlanVariants(
  ranked: readonly HarmonyCandidate[],
  collection: HarmonyCollection,
  level: ChordFamilyLevel,
  seed: Seed,
): readonly HarmonyCandidate[] {
  if (level === 'off') return ranked
  return deepFreeze(
    ranked.flatMap((candidate) => {
      const drawn = candidate.events.map((event) => isSeventhDrawn(level, seed, event))
      return drawn.includes(true)
        ? [seventhVariant(candidate, drawn, collection), candidate]
        : [candidate]
    }),
  )
}
