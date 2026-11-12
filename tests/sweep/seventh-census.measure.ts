// @vitest-environment node
/**
 * The seventh census sweep (v3.3 measurement M1), manual only, never in `npm run quality`: run via
 * `npm run measure:sevenths`. Every case of the look-ahead deadline sweep (each supported rhythm
 * setting with seeds 7 and 13) under each of the nine modes gives one standalone phrase per
 * setting, at 120 BPM with the case's controls and seed. The settings are each musical profile's
 * defaults (Neutral and Jazz) at each Seventh chords level measured. Each phrase's winning chord
 * plan is classified by the seventh census; per level, the sweep prints, per mode, per profile and
 * over the whole sweep, the share of harmony events in their seventh form and the share of phrases
 * that fell back to triads, as `SEVENTH-CENSUS` lines. It counts phrases generated, not attempts.
 *
 * It asserts that every case was taken, that no generation failed its result validation (only
 * search outcomes may fail a generation), that Off holds no seventh-form event and no fallback,
 * and that, in every mode, the seventh share never falls from one measured level to the next. The
 * 3 in 4 acceptance at Strongly favored (spec D281) is printed, not asserted: it is gate DP's.
 *
 * Env: `SEVENTHS_OUT` writes the full figures JSON (with the machine, the date and the run
 * duration) to that path; `SEVENTHS_LIMIT` keeps only the first N sweep cases, for a quick run;
 * `SEVENTHS_LEVELS` names the levels, comma-separated level ids (unset: every level measurable
 * today, Off only until v3.3 chunks 12 and 16 are in).
 */

import { writeFileSync } from 'node:fs'
import { performance } from 'node:perf_hooks'
import { describe, expect, it } from 'vitest'

import { COLLECTIONS, MUSICAL_PROFILES } from '@/domain/controls/generation-controls'
import { sweepCases } from '../unit/session/deadline-sweep'
import { machineBlock } from './figure-census-sweep'
import {
  LevelTally,
  censusPopulation,
  censusSettings,
  levelTableLines,
  percent,
  runSeventhCensusCase,
  type LevelFigures,
} from './seventh-census-sweep'
import { SEVENTH_LEVEL_NAMES, seventhLevelsFrom } from './seventh-levels'

/** The generation failure codes a search outcome gives; a failed result validation is not one. */
const SEARCH_OUTCOME_CODES: readonly string[] = [
  'no_legal_harmony_plan',
  'no_legal_rhythm_plan',
  'no_legal_pitch_plan',
  'no_eligible_register_window',
  'search_limit_exceeded',
]

/** Intent: the case limit `SEVENTHS_LIMIT` sets, or none; anything but a positive integer fails. */
function caseLimit(raw: string | undefined): number | undefined {
  if (raw === undefined || raw.trim() === '') return undefined
  const limit = Number(raw)
  if (!Number.isInteger(limit) || limit <= 0)
    throw new Error(`SEVENTHS_LIMIT must be a positive integer, got "${raw}".`)
  return limit
}

/** Intent: the seventh share of one mode at one level; fails when the mode generated nothing. */
function modeShare(figures: LevelFigures, mode: string): number {
  const share = figures.byMode.find((each) => each.label === mode)?.seventhEvents.share
  if (share === undefined || share === null)
    throw new Error(`${mode} generated no phrase at ${figures.level}.`)
  return share
}

describe('seventh census sweep (M1)', () => {
  it('reports, per level and mode, the share of seventh-form events and of triads-only fallbacks', () => {
    const startedAt = performance.now()
    const date = new Date().toISOString()
    const machine = machineBlock()
    const levels = seventhLevelsFrom('SEVENTHS_LEVELS', process.env.SEVENTHS_LEVELS)
    const cases = sweepCases().slice(0, caseLimit(process.env.SEVENTHS_LIMIT))
    const settings = censusSettings(levels)
    const tallies = new Map(levels.map((level) => [level, new LevelTally(level)]))
    let censusCases = 0
    for (const setting of settings)
      for (const censusCase of censusPopulation(cases, setting)) {
        tallies.get(setting.level)!.add(censusCase, runSeventhCensusCase(censusCase))
        censusCases += 1
      }
    const figures = [...tallies.values()].map((tally) => tally.figures())
    for (const level of figures) console.log(levelTableLines(level).join('\n'))
    const stronglyFavored = figures.find((level) => level.level === 'stronglyFavored')
    if (stronglyFavored !== undefined)
      console.log(
        `SEVENTH-CENSUS Strongly favored over the sweep: ${percent(stronglyFavored.overall.seventhEvents.share)} % of events in seventh form (acceptance: at least 75 %, spec D281)`,
      )

    const report = {
      date,
      durationSeconds: (performance.now() - startedAt) / 1000,
      machine,
      population: {
        description:
          'every supported rhythm setting with each seed, under each of the nine modes, one standalone phrase per case at 120 BPM; each musical profile default (Neutral, Jazz) at each level measured; harmony events as the plan serializes them (a chord held across a barline once); counted over phrases generated',
        sweepCases: cases.length,
        censusCases,
        settings: settings.map((setting) => setting.label),
      },
      levels: figures,
    }
    const outPath = process.env.SEVENTHS_OUT
    if (outPath !== undefined) writeFileSync(outPath, JSON.stringify(report, null, 2))

    expect(figures.map((level) => level.overall.cases)).toEqual(
      figures.map(() => cases.length * COLLECTIONS.length * MUSICAL_PROFILES.length),
    )
    expect(
      figures.map((level) => [
        level.level,
        Object.keys(level.overall.failedGenerations).filter(
          (code) => !SEARCH_OUTCOME_CODES.includes(code),
        ),
      ]),
    ).toEqual(figures.map((level) => [level.level, []]))
    const off = figures.find((level) => level.level === 'off')
    if (off !== undefined) {
      const rows = [...off.byMode, ...off.byProfile, off.overall]
      expect(
        rows.map((each) => [each.label, each.seventhEvents.count, each.fallbacks.count]),
      ).toEqual(rows.map((each) => [each.label, 0, 0]))
    }
    for (let index = 1; index < figures.length; index++) {
      const [lower, higher] = [figures[index - 1]!, figures[index]!]
      for (const { label } of higher.byMode)
        expect(
          modeShare(higher, label),
          `${label}: ${SEVENTH_LEVEL_NAMES[higher.level]} never below ${SEVENTH_LEVEL_NAMES[lower.level]}`,
        ).toBeGreaterThanOrEqual(modeShare(lower, label))
    }
  })
})
