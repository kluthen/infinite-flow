// @vitest-environment node
/**
 * A favored figure is never a quota, end to end: standalone phrases generated over the small fixed
 * grid with one written free figure Strongly favored (every other figure as today) are compared,
 * grid point by grid point, with the same grid under every figure as today. Raising the level
 * never fails a result validation, never loses a phrase, never changes which harmony, rhythm and
 * Tension binding the search settles on nor how many it visits on the way (a level adds no
 * rejection and no retry), and never makes the figure rarer over the grid.
 */

import { describe, expect, it } from 'vitest'

import type { FigureId, FigureLevels } from '@/domain/figures/figure-levels'
import type { GenerationIntent } from '@/domain/generation/generation-intent'
import { generatePhrase } from '@/domain/generation/orchestration/generation-orchestrator'
import type {
  GenerationOutcome,
  WindowDiagnostics,
} from '@/domain/generation/orchestration/orchestration-types'
import { censusOfOutcome, type FreeFigure, type PhraseCensus } from '../../../sweep/figure-census'
import { GRID, everyFigureAt, gridIntent, type GridPoint } from './figure-levels-grid'

/** Each grid is generated cold once per levels value; a loaded machine can take several times its ~2 s. */
const GRID_TIMEOUT_MS = 120_000

const ALL_AS_TODAY = everyFigureAt('asToday')

/** The five written free figures, each with its census label. */
const WRITTEN: readonly (readonly [FigureId, FreeFigure])[] = [
  ['passingTone', 'passing_tone'],
  ['accentedPassingTone', 'accented_passing_tone'],
  ['neighborTone', 'neighbor_tone'],
  ['chromaticApproach', 'chromatic_approach'],
  ['chromaticEnclosure', 'chromatic_enclosure'],
]

/** One grid point's outcome under some levels, with its census when it generated a phrase. */
interface GridOutcome {
  readonly point: GridPoint
  readonly outcome: GenerationOutcome
  readonly census?: PhraseCensus
}

/** The outcome of one grid point under the levels, with its census when it succeeded. */
function outcomeAt(point: GridPoint, figureLevels: FigureLevels): GridOutcome {
  const intent: GenerationIntent = gridIntent(point, figureLevels, 'figure-levels-never-a-quota')
  const outcome = generatePhrase(intent)
  if (outcome.kind !== 'generation_success') return { point, outcome }
  const census = censusOfOutcome(intent, outcome)
  if ('kind' in census) throw new Error(`census failed: ${census.code}`)
  return { point, outcome, census }
}

const grids = new Map<string, readonly GridOutcome[]>()

/** Every grid point's outcome under the levels, generated once per levels value. */
function gridUnder(figureLevels: FigureLevels): readonly GridOutcome[] {
  const key = JSON.stringify(figureLevels)
  const known = grids.get(key)
  if (known) return known
  const outcomes = GRID.map((point) => outcomeAt(point, figureLevels))
  grids.set(key, outcomes)
  return outcomes
}

/** The search facts of one window a level must not change: no extra rejection, no retry. */
function searchFacts(window: WindowDiagnostics) {
  return {
    register: window.register,
    outcome: window.outcome,
    pairsVisited: window.pairsVisited,
    bindingsAttempted: window.bindingsAttempted,
    harmonyIdentity: window.harmonyIdentity,
    rhythmIdentity: window.rhythmIdentity,
    bindingIdentity: window.bindingIdentity,
  }
}

/** A grid point as a short readable label. */
function pointLabel(point: GridPoint): string {
  return `seed ${point.seed} ${point.arpeggioChaos} ${point.noteDensity} ${point.collection} ${point.tension}`
}

/** The share of a grid's generated phrases holding at least one instance of the label. */
function share(outcomes: readonly GridOutcome[], label: FreeFigure): number {
  const phrases = outcomes.flatMap((entry) => (entry.census === undefined ? [] : [entry.census]))
  return phrases.filter((census) => census.counts[label] > 0).length / phrases.length
}

/** Every window whose search facts differ between two outcomes of a point, with both fuel figures. */
function diagnosticsMismatches(base: GridOutcome, raised: GridOutcome): readonly string[] {
  const left = base.outcome.diagnostics.windows
  const right = raised.outcome.diagnostics.windows
  const count = Math.max(left.length, right.length)
  const mismatches: string[] = []
  for (let index = 0; index < count; index += 1) {
    const [before, after] = [left[index], right[index]]
    const same =
      before !== undefined &&
      after !== undefined &&
      JSON.stringify(searchFacts(before)) === JSON.stringify(searchFacts(after))
    if (!same)
      mismatches.push(
        `${pointLabel(base.point)} window ${index}: as today ${JSON.stringify(before && { ...searchFacts(before), fuelUsed: before.fuelUsed, fuelAllowance: before.fuelAllowance })} / raised ${JSON.stringify(after && { ...searchFacts(after), fuelUsed: after.fuelUsed, fuelAllowance: after.fuelAllowance })}`,
      )
  }
  return mismatches
}

// @test-link [[rule_figure_level_never_a_quota]]
// @test-link [[rule_figure_level_orders_search]]
describe('a Strongly favored figure is never a quota', () => {
  for (const [figure, label] of WRITTEN)
    it(
      `${figure} strongly favored: no failed validation, no lost phrase, the same search, no rarer figure`,
      () => {
        const base = gridUnder(ALL_AS_TODAY)
        const raised = gridUnder({ ...ALL_AS_TODAY, [figure]: 'stronglyFavored' })
        const failedValidation = [...base, ...raised].filter(
          (entry) =>
            entry.outcome.kind === 'generation_failure' &&
            entry.outcome.code === 'result_validation_failed',
        )
        expect(failedValidation.map((entry) => pointLabel(entry.point))).toEqual([])
        const lost = base
          .filter((entry, index) => entry.census !== undefined && !raised[index]!.census)
          .map((entry) => pointLabel(entry.point))
        expect(lost).toEqual([])
        const mismatches = base.flatMap((entry, index) =>
          diagnosticsMismatches(entry, raised[index]!),
        )
        expect(mismatches).toEqual([])
        expect(base.some((entry) => entry.census !== undefined)).toBe(true)
        expect(share(raised, label)).toBeGreaterThanOrEqual(share(base, label))
      },
      GRID_TIMEOUT_MS,
    )
})
