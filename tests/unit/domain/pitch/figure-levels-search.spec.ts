// @vitest-environment node
/**
 * The search gated per figure, end to end: standalone phrases generated over a small fixed grid
 * under chosen figure levels and classified by the figure census. A figure set Off is never
 * written as a free figure, while the same grid under the levels it starts from does write it;
 * with every level Off a phrase holds no free figure and no chromatic note, and Tension's
 * scheduled figure, which reads no level, is still written wherever Tension requires it, and
 * under Settled and Lift wherever Neutral's levels place it.
 */

import { describe, expect, it } from 'vitest'

import type { TensionArc } from '@/domain/controls/generation-controls'
import {
  NEUTRAL_FIGURE_LEVELS,
  type FigureId,
  type FigureLevels,
} from '@/domain/figures/figure-levels'
import type { GenerationIntent } from '@/domain/generation/generation-intent'
import { generatePhrase } from '@/domain/generation/orchestration/generation-orchestrator'
import type { GenerationOutcome } from '@/domain/generation/orchestration/orchestration-types'
import { collectionPitchClasses } from '@/domain/pitch/pitch-harmony'
import { flattenNotes } from '@/domain/validation/generation-result-validator-checks'
import {
  censusOfOutcome,
  FREE_FIGURES,
  type FreeFigure,
  type PhraseCensus,
} from '../../../sweep/figure-census'
import type { SuccessOutcome } from '../generation/carry-in/carry-in-fixture'
import { GRID, TENSIONS, everyFigureAt, gridIntent, type GridPoint } from './figure-levels-grid'

/** The grid is generated cold once per levels value; a loaded machine can take several times its ~2 s. */
const GRID_TIMEOUT_MS = 30_000

/** One grid point's generated phrase, kept with its intent, its controls and its census. */
interface GridPhrase {
  readonly point: GridPoint
  readonly seed: number
  readonly tension: TensionArc
  readonly intent: GenerationIntent
  readonly outcome: SuccessOutcome
  readonly census: PhraseCensus
}

const ALL_AS_TODAY = everyFigureAt('asToday')
const ALL_OFF = everyFigureAt('off')

/** The phrase of one grid point under the levels, or undefined when it generates none. */
function phraseAt(point: GridPoint, figureLevels: FigureLevels): GridPhrase | undefined {
  const { seed, tension } = point
  const intent: GenerationIntent = gridIntent(point, figureLevels, 'figure-levels-search')
  const outcome: GenerationOutcome = generatePhrase(intent)
  if (outcome.kind !== 'generation_success') return undefined
  const census = censusOfOutcome(intent, outcome)
  if ('kind' in census) throw new Error(`census failed: ${census.code}`)
  return { point, seed, tension, intent, outcome, census }
}

const grids = new Map<string, readonly GridPhrase[]>()

/** The successful phrases of the whole grid under the levels, generated once per levels value. */
function gridUnder(figureLevels: FigureLevels): readonly GridPhrase[] {
  const key = JSON.stringify(figureLevels)
  const known = grids.get(key)
  if (known) return known
  const phrases = GRID.flatMap((point) => phraseAt(point, figureLevels) ?? [])
  grids.set(key, phrases)
  return phrases
}

/** The census label of each free figure the search gates through one level. */
const GATED: readonly (readonly [FigureId, FreeFigure])[] = [
  ['passingTone', 'passing_tone'],
  ['accentedPassingTone', 'accented_passing_tone'],
  ['neighborTone', 'neighbor_tone'],
  ['chromaticApproach', 'chromatic_approach'],
  ['chromaticEnclosure', 'chromatic_enclosure'],
]

/** The attack MIDIs of a phrase that lie outside its key and mode. */
function chromaticNotes(phrase: GridPhrase): readonly number[] {
  const collection = collectionPitchClasses(phrase.intent.controls)
  return flattenNotes(phrase.outcome.result.timeline.measures)
    .filter((ref) => !ref.event.tieContinuation)
    .map((ref) => ref.event.pitch)
    .filter((midi) => !collection.includes(((midi % 12) + 12) % 12))
}

/** True when the phrase holds Tension's scheduled figure. */
function holdsScheduledFigure(phrase: GridPhrase): boolean {
  return phrase.outcome.provenance.tensionBinding.attackIndices.length > 0
}

// @test-link [[rule_figure_level_orders_search]]
// @test-link [[rule_chromatic_notes_need_a_chromatic_figure]]
describe('the search writes no free figure whose level is off', () => {
  for (const [figureId, label] of GATED)
    it(
      `writes no free ${label} with ${figureId} off, though the base levels do`,
      () => {
        const base = gridUnder(ALL_AS_TODAY)
        expect(base.some((phrase) => phrase.census.counts[label] > 0)).toBe(true)
        const gated = gridUnder({ ...ALL_AS_TODAY, [figureId]: 'off' })
        expect(gated.length).toBeGreaterThan(0)
        for (const phrase of gated) {
          expect(phrase.census.counts[label]).toBe(0)
          expect(phrase.census.counts.unexplained).toBe(0)
        }
      },
      GRID_TIMEOUT_MS,
    )
})

// @test-link [[rule_levels_govern_free_figures_only]]
// @test-link [[rule_chromatic_notes_need_a_chromatic_figure]]
describe('every level off', () => {
  it(
    "writes no free figure and no chromatic note, yet keeps Tension's scheduled figure",
    () => {
      const phrases = gridUnder(ALL_OFF)
      for (const tension of TENSIONS)
        expect(phrases.some((phrase) => phrase.tension === tension)).toBe(true)
      for (const phrase of phrases) {
        for (const figure of FREE_FIGURES) expect(phrase.census.counts[figure]).toBe(0)
        expect(phrase.census.counts.unexplained).toBe(0)
        expect(chromaticNotes(phrase)).toEqual([])
        if (phrase.tension === 'Edge' || phrase.tension === 'Build')
          expect(holdsScheduledFigure(phrase)).toBe(true)
      }
    },
    GRID_TIMEOUT_MS,
  )

  it(
    "keeps Settled's and Lift's scheduled figure wherever Neutral's levels place one",
    () => {
      const neutral = gridUnder(NEUTRAL_FIGURE_LEVELS)
      const allOff = new Map(gridUnder(ALL_OFF).map((phrase) => [phrase.point, phrase]))
      for (const tension of ['Settled', 'Lift'] as const) {
        const neutralPhrases = neutral.filter((phrase) => phrase.tension === tension)
        expect(neutralPhrases.length).toBeGreaterThan(0)
        expect([...allOff.values()].some((phrase) => phrase.tension === tension)).toBe(true)
        for (const phrase of neutralPhrases.filter(holdsScheduledFigure)) {
          const off = allOff.get(phrase.point)
          expect(
            off,
            `${tension} seed ${phrase.seed} generates no phrase with every level off`,
          ).toBeDefined()
          if (off) expect(holdsScheduledFigure(off)).toBe(true)
        }
      }
    },
    GRID_TIMEOUT_MS,
  )
})
