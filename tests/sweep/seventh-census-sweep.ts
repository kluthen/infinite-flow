/**
 * The seventh census sweep's plumbing (measurement tooling, run by `npm run measure:sevenths`): the
 * census population, each phrase with a seed of its own (spec D533), the settings it is measured
 * under (each musical profile's defaults, Neutral and Jazz, at each Seventh chords level measured),
 * one census per case, the running tally of the shares, and the readable table per level and mode
 * the sweep prints.
 */

import type { ChordFamilyLevel } from '@/domain/chords/chord-families'
import {
  COLLECTIONS,
  MUSICAL_PROFILES,
  makeGenerationControls,
  type Collection,
  type GenerationControls,
  type MusicalProfile,
} from '@/domain/controls/generation-controls'
import type { GenerationIntent } from '@/domain/generation/generation-intent'
import { generatePhrase } from '@/domain/generation/orchestration/generation-orchestrator'
import type { GenerationOutcome } from '@/domain/generation/orchestration/orchestration-types'
import { buildIntent } from '../unit/domain/generation/carry-in/carry-in-fixture'
import type { SweepCase } from '../unit/session/deadline-sweep'
import {
  SEVENTH_QUALITIES,
  seventhCensusOf,
  type FailedSeventhCensus,
  type PhraseSeventhCensus,
} from './seventh-census'
import {
  SEVENTH_LEVEL_NAMES,
  chordFamiliesAt,
  requireMeasurableSeventhLevel,
} from './seventh-levels'

/** The tempo every census phrase is generated at; tempo never reaches the search. */
const CENSUS_TEMPO = 120

/**
 * One phrase to take the census of: the sweep case it comes from, its controls, profile, seed and
 * Seventh chords level.
 */
export interface SeventhCensusCase {
  readonly label: string
  readonly caseIndex: number
  readonly seed: number
  readonly controls: GenerationControls
  readonly musicalProfile: MusicalProfile
  readonly level: ChordFamilyLevel
}

/** One setting the population is measured under: a profile's defaults at one level. */
export interface SeventhCensusSetting {
  readonly label: string
  readonly musicalProfile: MusicalProfile
  readonly level: ChordFamilyLevel
}

/**
 * Intent: the settings of the census at some levels, level by level: each musical profile's
 * defaults (Neutral, then Jazz) at that level. A level not measurable fails.
 */
export function censusSettings(
  levels: readonly ChordFamilyLevel[],
): readonly SeventhCensusSetting[] {
  levels.forEach(requireMeasurableSeventhLevel)
  return levels.flatMap((level) =>
    MUSICAL_PROFILES.map((musicalProfile) => ({
      label: `${musicalProfile} at ${SEVENTH_LEVEL_NAMES[level]}`,
      musicalProfile,
      level,
    })),
  )
}

/**
 * Intent: the seed of one census phrase (spec D533), from its sweep case's index, its mode's index
 * in COLLECTIONS and its profile's index in MUSICAL_PROFILES, numbered from 1: case by case, then
 * mode by mode, then profile by profile. It reads neither the level, so a phrase has the same seed
 * at the four levels, nor the cases kept, so a case limit changes no seed.
 */
export function censusSeed(
  caseIndex: number,
  collectionIndex: number,
  profileIndex: number,
): number {
  return (
    1 + (caseIndex * COLLECTIONS.length + collectionIndex) * MUSICAL_PROFILES.length + profileIndex
  )
}

/**
 * Intent: the census population of some sweep cases under one setting: each case under each of
 * the nine modes (Major, Minor and the seven modes), at the census tempo, with the case's controls,
 * the setting's profile and level, and a seed of its own (`censusSeed`), not the case's seed.
 */
export function censusPopulation(
  cases: readonly SweepCase[],
  setting: SeventhCensusSetting,
): readonly SeventhCensusCase[] {
  const profileIndex = MUSICAL_PROFILES.indexOf(setting.musicalProfile)
  return cases.flatMap((sweepCase) =>
    COLLECTIONS.map((collection, collectionIndex): SeventhCensusCase => {
      const seed = censusSeed(sweepCase.index, collectionIndex, profileIndex)
      return {
        label: `#${sweepCase.index} seed ${seed} ${collection} ${setting.label}`,
        caseIndex: sweepCase.index,
        seed,
        controls: makeGenerationControls({
          ...sweepCase.controls,
          collection,
          tempo: CENSUS_TEMPO,
        }),
        musicalProfile: setting.musicalProfile,
        level: setting.level,
      }
    }),
  )
}

/** One census case generated: the intent it asked with, the outcome it got, and its census. */
export interface GeneratedCensusCase {
  readonly intent: GenerationIntent
  readonly outcome: GenerationOutcome
  readonly census: PhraseSeventhCensus | FailedSeventhCensus
}

/**
 * Intent: generate one case's standalone phrase at its level and take its seventh census, keeping
 * the intent and the outcome for a replay sample.
 */
export function generateSeventhCensusCase(censusCase: SeventhCensusCase): GeneratedCensusCase {
  const intent = buildIntent({
    controls: censusCase.controls,
    musicalProfile: censusCase.musicalProfile,
    seed: censusCase.seed,
    label: 'seventh-census',
    chordFamilies: chordFamiliesAt(censusCase.level),
  })
  const outcome = generatePhrase(intent)
  return { intent, outcome, census: seventhCensusOf(intent, outcome) }
}

/** Intent: generate one case's standalone phrase at its level and take its seventh census. */
export function runSeventhCensusCase(
  censusCase: SeventhCensusCase,
): PhraseSeventhCensus | FailedSeventhCensus {
  return generateSeventhCensusCase(censusCase).census
}

/** A count over a total, with its share (null when the total is zero). */
export interface CensusShare {
  readonly count: number
  readonly total: number
  readonly share: number | null
}

/** Intent: a count over a total, with its share. */
function shareOf(count: number, total: number): CensusShare {
  return { count, total, share: total === 0 ? null : count / total }
}

/** The shares of one group of phrases: a level and mode, a level and profile, or a whole level. */
export interface SeventhFigures {
  readonly label: string
  readonly cases: number
  readonly phrases: number
  readonly failedGenerations: Readonly<Record<string, number>>
  /** Harmony events in their seventh form, over the harmony events of the phrases generated. */
  readonly seventhEvents: CensusShare
  /**
   * Harmony events the draw gave their seventh form first, over the harmony events of the phrases
   * generated, whatever the winning plans hold.
   */
  readonly drawnEvents: CensusShare
  /** Seventh-form events by quality. */
  readonly byQuality: Readonly<Record<string, number>>
  /** Phrases whose winning plan is a triads-only fallback, over the phrases generated. */
  readonly fallbacks: CensusShare
}

/** The running census of one group of phrases, fed one case at a time. */
export class SeventhTally {
  private cases = 0
  private phrases = 0
  private events = 0
  private sevenths = 0
  private drawn = 0
  private fallbacks = 0
  private readonly failures: Record<string, number> = {}
  private readonly qualities: Record<string, number> = Object.fromEntries(
    SEVENTH_QUALITIES.map((quality) => [quality, 0]),
  )

  /** Intent: start the tally of the group named `label`. */
  constructor(readonly label: string) {}

  /** Intent: add one case's census, or its failed generation. */
  add(census: PhraseSeventhCensus | FailedSeventhCensus): void {
    this.cases += 1
    if ('kind' in census) {
      this.failures[census.code] = (this.failures[census.code] ?? 0) + 1
      return
    }
    this.phrases += 1
    this.events += census.events.length
    this.sevenths += census.seventhEvents
    this.drawn += census.drawnSevenths
    if (census.fallback) this.fallbacks += 1
    for (const event of census.events)
      if (event.form !== 'triad') this.qualities[event.form] = (this.qualities[event.form] ?? 0) + 1
  }

  /** Intent: the group's shares so far. */
  figures(): SeventhFigures {
    return {
      label: this.label,
      cases: this.cases,
      phrases: this.phrases,
      failedGenerations: { ...this.failures },
      seventhEvents: shareOf(this.sevenths, this.events),
      drawnEvents: shareOf(this.drawn, this.events),
      byQuality: { ...this.qualities },
      fallbacks: shareOf(this.fallbacks, this.phrases),
    }
  }
}

/** The census of one level: its shares per mode, per profile and over the whole sweep. */
export interface LevelFigures {
  readonly level: ChordFamilyLevel
  readonly byMode: readonly SeventhFigures[]
  readonly byProfile: readonly SeventhFigures[]
  readonly overall: SeventhFigures
}

/** The tallies of one level: per mode, per profile and overall, fed one case at a time. */
export class LevelTally {
  private readonly modes = new Map<Collection, SeventhTally>(
    COLLECTIONS.map((mode) => [mode, new SeventhTally(mode)]),
  )
  private readonly profiles = new Map<MusicalProfile, SeventhTally>(
    MUSICAL_PROFILES.map((profile) => [profile, new SeventhTally(profile)]),
  )
  private readonly overall = new SeventhTally('all modes')

  /** Intent: start the tallies of `level`. */
  constructor(readonly level: ChordFamilyLevel) {}

  /** Intent: add one case's census to its mode's, its profile's and the overall tally. */
  add(censusCase: SeventhCensusCase, census: PhraseSeventhCensus | FailedSeventhCensus): void {
    if (censusCase.level !== this.level || census.level !== this.level)
      throw new Error(`${censusCase.label}: a census at ${census.level} added to ${this.level}.`)
    this.modes.get(census.mode)!.add(census)
    this.profiles.get(censusCase.musicalProfile)!.add(census)
    this.overall.add(census)
  }

  /** Intent: the level's figures so far. */
  figures(): LevelFigures {
    return {
      level: this.level,
      byMode: [...this.modes.values()].map((tally) => tally.figures()),
      byProfile: [...this.profiles.values()].map((tally) => tally.figures()),
      overall: this.overall.figures(),
    }
  }
}

/** Intent: a share as a percentage with one decimal, or a dash when it is null. */
export function percent(share: number | null): string {
  return share === null ? '-' : `${(share * 100).toFixed(1)}`
}

/** Intent: one table row of a group's figures. */
function row(figures: SeventhFigures): string {
  const failed = Object.values(figures.failedGenerations).reduce((sum, count) => sum + count, 0)
  return `${figures.label.padEnd(12)}${String(figures.phrases).padStart(9)}${String(failed).padStart(8)}${String(figures.seventhEvents.total).padStart(9)}${String(figures.seventhEvents.count).padStart(10)}${percent(figures.seventhEvents.share).padStart(10)}${percent(figures.drawnEvents.share).padStart(9)}${String(figures.fallbacks.count).padStart(11)}${percent(figures.fallbacks.share).padStart(12)}`
}

/** Intent: the readable table of one level, per mode then per profile then overall, `SEVENTH-CENSUS` lines. */
export function levelTableLines(figures: LevelFigures): readonly string[] {
  const prefix = `SEVENTH-CENSUS [${SEVENTH_LEVEL_NAMES[figures.level]}]`
  const header = `${'group'.padEnd(12)}${'phrases'.padStart(9)}${'failed'.padStart(8)}${'events'.padStart(9)}${'sevenths'.padStart(10)}${'share %'.padStart(10)}${'drawn %'.padStart(9)}${'fallbacks'.padStart(11)}${'fallback %'.padStart(12)}`
  const qualities = SEVENTH_QUALITIES.map(
    (quality) => `${quality} ${figures.overall.byQuality[quality] ?? 0}`,
  ).join(', ')
  return [
    header,
    ...figures.byMode.map(row),
    ...figures.byProfile.map(row),
    row(figures.overall),
    `seventh-form events by quality: ${qualities}`,
  ].map((line) => `${prefix} ${line}`)
}
