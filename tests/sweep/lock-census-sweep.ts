/**
 * The lock census runner's plumbing (measurement tooling, v3.2 measurement M2, run by `npm run
 * measure:lock`): seeded eight-phrase sessions with the rhythm lock on, Tension across phrases on
 * and off, classified by the lock census (lock-census.ts) against phrase 1's rhythm for each
 * allowed list (each change kind alone, then all five); and, per draw (each phrase from 2 on that
 * is not a repeat), which kinds had a candidate one change from the locked rhythm in the phrase's
 * own rhythm domain: the canonical domain `generatePhrase` searched for that phrase, looked up in
 * the very memo it uses, by the very input it derives from the phrase's intent (its resolved
 * rhythm settings and tension).
 *
 * Timing plays no part: every attempt costs the flat modelled time and is generated, at 120 BPM.
 * Cases run density by density under a setting group: the sweep's own cases, or a built-in preset
 * applied to every case as the player gets it (cost-guard.ts), each case then with its own seeds, so
 * phrase 1 locks a rhythm of its own rather than one of the sweep's two seeds' rhythms. Each case
 * has an outcome cache of its own, shared by its two sessions and dropped after them: a preset
 * group's cases share no outcome (each has its own seeds), and a cache per density part held up to
 * ~4 MB per Sixteenth session, past Node's default heap at a full part of a preset group.
 */

import type { GenerationIntent } from '@/domain/generation/generation-intent'
import { SHARED_CANONICAL_RHYTHM_DOMAIN_MEMO } from '@/domain/generation/orchestration/canonical-rhythm-domain'
import { rhythmDomainInputOf } from '@/domain/generation/orchestration/generation-orchestrator'
import { RHYTHM_CHANGE_KINDS, type RhythmChangeKind } from '@/domain/generation/request-rhythm-lock'
import { rhythmBarKey } from '@/domain/rhythm/rhythm-bars'
import { isNoLegalRhythmPlan } from '@/domain/rhythm/rhythm-planner'
import type { RhythmBar, RhythmExpansionInput } from '@/domain/rhythm/rhythm-types'
import type { SessionPhraseOrigin } from '@/session/session-types'
import { SEEDS } from '../unit/domain/generation/carry-in/carry-in-matrix'
import {
  OutcomeCache,
  runTimedSession,
  type SweepCase,
  type TimedSession,
} from '../unit/session/deadline-sweep'
import { BUILT_IN_SETTINGS, byNoteDensity, type CostSetting } from './cost-guard'
import { generateEveryAttempt } from './deadline-sweep-measured'
import { soundedPhraseRhythms } from './jam-sweep'
import {
  LockCensusTally,
  censusOfSession,
  changeAvailability,
  type ChangeAvailability,
  type LockCensusFigures,
  type SessionPhraseRhythm,
} from './lock-census'

/** How many phrases each census session plays before Stop, phrase 1 included. */
export const LOCK_PHRASE_COUNT = 8

/** The tempo every census session plays at: timing plays no part in the census. */
export const LOCK_TEMPO = 120

/** Tension across phrases, in run order: each case plays once with it on, once with it off. */
export const TENSION_ACROSS_PHRASES: readonly boolean[] = [true, false]

/** One allowed list the census classifies a session with, by name. */
export interface AllowedSet {
  readonly label: string
  readonly kinds: readonly RhythmChangeKind[]
}

/** The allowed lists, in report order: each change kind alone, then all five together. */
export const ALLOWED_SETS: readonly AllowedSet[] = [
  ...RHYTHM_CHANGE_KINDS.map((kind) => ({ label: kind, kinds: [kind] })),
  { label: 'all five', kinds: RHYTHM_CHANGE_KINDS },
]

/** The setting group of the sweep's own cases, unchanged. */
export const SWEEP_GROUP: CostSetting = { label: 'sweep cases', apply: (sweepCase) => sweepCase }

/** Which setting groups a run measures: the sweep's cases, each built-in preset, or both. */
export type LockSettingsChoice = 'sweep' | 'builtin' | 'both'

/** The runner's choices, as read from the environment. */
export interface LockCensusChoices {
  readonly limit: number | undefined
  readonly settings: LockSettingsChoice
}

/**
 * Intent: the runner's choices from an environment: `LOCK_LIMIT` a positive whole number of
 * evenly spaced cases (none: every case), `LOCK_SETTINGS` sweep (default), builtin or both.
 * Anything else fails.
 */
export function lockCensusChoices(env: NodeJS.ProcessEnv = process.env): LockCensusChoices {
  const rawLimit = env.LOCK_LIMIT?.trim() ?? ''
  const limit = rawLimit === '' ? undefined : Number(rawLimit)
  if (limit !== undefined && (!Number.isInteger(limit) || limit <= 0))
    throw new Error(`LOCK_LIMIT must be a positive integer, got "${env.LOCK_LIMIT}".`)
  const settings = (env.LOCK_SETTINGS?.trim().toLowerCase() ?? '') || 'sweep'
  if (settings !== 'sweep' && settings !== 'builtin' && settings !== 'both')
    throw new Error(
      `LOCK_SETTINGS must be one of sweep, builtin, both, got "${env.LOCK_SETTINGS}".`,
    )
  return { limit, settings }
}

/** Intent: the setting groups a choice measures, the sweep's cases first, then the built-ins. */
export function settingGroups(choice: LockSettingsChoice): readonly CostSetting[] {
  return [
    ...(choice === 'builtin' ? [] : [SWEEP_GROUP]),
    ...(choice === 'sweep' ? [] : BUILT_IN_SETTINGS),
  ]
}

/** The first phrase-1 seed of a preset group's cases, and the stride between two cases. */
export const PER_CASE_SEED_BASE = 1_000
export const PER_CASE_SEED_STRIDE = 10

/** The session seed of a preset group's case 0; each case's sits 100 above the previous one. */
export const PER_CASE_SESSION_SEED_BASE = 500_000

/**
 * Intent: a preset group case's own seeds, from its sweep index: under a preset every case plays
 * the preset's rhythm setting, so the sweep's two seeds would give phrase 1, the locked rhythm,
 * about two rhythms per preset. The phrase-1 stride leaves room for every retry at Idle, and both
 * ranges sit clear of the sweep's seeds (7 and 13; sessions from 100,000).
 */
export function perCaseSeeds(index: number): Pick<SweepCase, 'seed' | 'firstSessionSeed'> {
  return {
    seed: PER_CASE_SEED_BASE + PER_CASE_SEED_STRIDE * index,
    firstSessionSeed: PER_CASE_SESSION_SEED_BASE + 100 * index,
  }
}

/**
 * Intent: the cases a setting group plays: the sweep group's unchanged, a preset group's with the
 * preset applied and each case's own seeds (`perCaseSeeds`), its label naming the seed it plays.
 */
export function lockGroupCases(
  group: CostSetting,
  cases: readonly SweepCase[],
): readonly SweepCase[] {
  if (group === SWEEP_GROUP) return cases
  return cases.map((sweepCase) => {
    const applied = group.apply(sweepCase)
    const seeds = perCaseSeeds(applied.index)
    const label = applied.label.replace(` seed ${applied.seed} `, ` seed ${seeds.seed} `)
    return { ...applied, ...seeds, label }
  })
}

/**
 * Intent: a case played with Tension across phrases on or off, its label's session flags (`vary`
 * or `fixed`, then `arc` when on) rewritten to match.
 */
export function withTensionAcrossPhrases(sweepCase: SweepCase, on: boolean): SweepCase {
  if (sweepCase.tensionAcrossPhrases === on) return sweepCase
  const label = sweepCase.label.replace(
    / (vary|fixed)(?: arc)?(?= as |$)/,
    (_, mutation: string) => ` ${mutation}${on ? ' arc' : ''}`,
  )
  return { ...sweepCase, label, tensionAcrossPhrases: on }
}

/** Intent: the seed scheme a run's setting groups play with, as the figures record it. */
export function seedScheme(choice: LockSettingsChoice): string {
  const sweep = `sweep (${SEEDS.join(', ')})`
  const perCase =
    `per case: phrase 1 ${PER_CASE_SEED_BASE} + ${PER_CASE_SEED_STRIDE} × case index, ` +
    `session ${PER_CASE_SESSION_SEED_BASE} + 100 × case index`
  if (choice === 'sweep') return sweep
  if (choice === 'builtin') return perCase
  return `${sweep} for the sweep cases; ${perCase} for the presets`
}

/** One phrase that sounded, as a draw reads it: where it came from and its intent. */
export interface SoundedPhrase {
  readonly phraseNumber: number
  readonly origin: SessionPhraseOrigin
  readonly intent: GenerationIntent
}

/**
 * Intent: the phrases that draw whether to change: from phrase 2 on, every phrase but a repeat,
 * which sounds an earlier phrase again and so draws nothing of its own.
 */
export function drawingPhrases<
  T extends { readonly phraseNumber: number; readonly origin: SessionPhraseOrigin },
>(phrases: readonly T[]): readonly T[] {
  return phrases.filter((entry) => entry.phraseNumber >= 2 && entry.origin !== 'repeat')
}

/** Intent: a rhythm setting with its tension, as one readable key. */
export function rhythmSettingKey(input: RhythmExpansionInput): string {
  return `${input.noteDensity}/${input.rhythmicVariety}/${input.silenceDensity}/${input.syncopation}/${input.tensionArc}`
}

/** The rhythm domains' written bars, by rhythm setting and tension: domains repeat a lot. */
const domainBarsByKey = new Map<string, readonly (readonly RhythmBar[])[]>()

/**
 * Intent: the written bars of every candidate of the rhythm domain a phrase was generated from:
 * the canonical domain of its intent's rhythm settings and tension, from the memo `generatePhrase`
 * uses by default, so exactly the candidates its search ranked. A phrase that sounded came from a
 * domain with candidates, so a domain with none fails.
 */
export function rhythmDomainBars(intent: GenerationIntent): readonly (readonly RhythmBar[])[] {
  const input = rhythmDomainInputOf(intent)
  const key = rhythmSettingKey(input)
  const cached = domainBarsByKey.get(key)
  if (cached !== undefined) return cached
  const domain = SHARED_CANONICAL_RHYTHM_DOMAIN_MEMO.lookup(input)
  if (isNoLegalRhythmPlan(domain))
    throw new Error(`A phrase sounded from rhythm setting ${key}, which has no rhythm.`)
  const bars = Object.freeze(domain.candidates.map((candidate) => candidate.bars))
  domainBarsByKey.set(key, bars)
  return bars
}

/** One draw of a session: the phrase, its rhythm setting and tension, and what was available. */
export interface LockDraw {
  readonly phraseNumber: number
  readonly rhythm: RhythmExpansionInput
  readonly availability: ChangeAvailability
}

/** One census session: whether it completed, the phrases that sounded, and its draws. */
export interface LockSession {
  readonly completed: boolean
  readonly phrases: readonly SessionPhraseRhythm[]
  readonly draws: readonly LockDraw[]
}

/** Intent: each phrase that sounded in a run, in phrase order, as its draw reads it. */
function soundedPhrases(run: TimedSession): SoundedPhrase[] {
  const byNumber = new Map<number, SoundedPhrase>()
  for (const { output } of run.outputs)
    if (output.kind === 'phrase-sounding') {
      const { phraseNumber, origin, intent } = output.phrase
      byNumber.set(phraseNumber, { phraseNumber, origin, intent })
    }
  return [...byNumber.values()].sort((a, b) => a.phraseNumber - b.phraseNumber)
}

/**
 * Intent: play one case's eight-phrase session with the rhythm lock on and Tension across phrases
 * as given (every attempt generated, at the flat modelled cost), and read its phrases' written
 * bars and, per draw, the kinds available one change from phrase 1's rhythm in the phrase's own
 * domain. It completed when it raised no error and all eight phrases sounded.
 */
export async function runLockSession(
  sweepCase: SweepCase,
  tensionAcrossPhrases: boolean,
  outcomes: OutcomeCache,
): Promise<LockSession> {
  const run = await runTimedSession(
    withTensionAcrossPhrases(sweepCase, tensionAcrossPhrases),
    LOCK_TEMPO,
    outcomes,
    generateEveryAttempt,
    undefined,
    undefined,
    { phraseCount: LOCK_PHRASE_COUNT, settings: { rhythmLockOn: true } },
  )
  const phrases = soundedPhraseRhythms(run)
  const completed = run.errors.length === 0 && phrases.length === LOCK_PHRASE_COUNT
  const locked = phrases[0]?.bars
  if (!completed || locked === undefined) return { completed: false, phrases, draws: [] }
  const draws = drawingPhrases(soundedPhrases(run)).map(({ phraseNumber, intent }) => ({
    phraseNumber,
    rhythm: rhythmDomainInputOf(intent),
    availability: changeAvailability(locked, rhythmDomainBars(intent)),
  }))
  return { completed, phrases, draws }
}

/** The dimensions draws are grouped by: the whole pool, each rhythm control, the whole setting. */
export const AVAILABILITY_DIMENSIONS = [
  'all',
  'noteDensity',
  'rhythmicVariety',
  'syncopation',
  'silenceDensity',
  'tension',
  'setting',
] as const

/** One dimension draws are grouped by. */
export type AvailabilityDimension = (typeof AVAILABILITY_DIMENSIONS)[number]

/** Intent: the value a draw's rhythm setting and tension takes in each dimension, in order. */
export function availabilityBuckets(
  rhythm: RhythmExpansionInput,
): readonly { readonly dimension: AvailabilityDimension; readonly value: string }[] {
  const values: Record<AvailabilityDimension, string> = {
    all: 'all',
    noteDensity: rhythm.noteDensity,
    rhythmicVariety: rhythm.rhythmicVariety,
    syncopation: rhythm.syncopation,
    silenceDensity: rhythm.silenceDensity,
    tension: rhythm.tensionArc,
    setting: rhythmSettingKey(rhythm),
  }
  return AVAILABILITY_DIMENSIONS.map((dimension) => ({ dimension, value: values[dimension] }))
}

/** One census group's figures: a setting group, Tension across phrases, an allowed list. */
export interface LockGroupFigures {
  readonly label: string
  readonly tensionAcrossPhrases: boolean
  readonly allowed: readonly RhythmChangeKind[]
  readonly figures: LockCensusFigures
}

/**
 * One availability bucket's figures, pooled over Tension across phrases on and off: its draws and,
 * per kind, the share of them with a candidate one change away and the share with none.
 */
export interface AvailabilityFigures {
  readonly label: string
  readonly dimension: AvailabilityDimension
  readonly value: string
  readonly draws: number
  readonly availableByKind: Readonly<Record<RhythmChangeKind, number | null>>
  readonly noCandidateByKind: Readonly<Record<RhythmChangeKind, number | null>>
}

/** Intent: a share as a percentage to one decimal, or a dash when it is null. */
function percent(share: number | null): string {
  return `${share === null ? '-' : (share * 100).toFixed(1)} %`
}

/**
 * The running census of one setting group: per Tension across phrases and allowed list a lock
 * census tally, per availability bucket a tally of draws only, and the sessions that completed.
 */
export class LockGroupTally {
  private readonly census = new Map<boolean, readonly LockCensusTally[]>(
    TENSION_ACROSS_PHRASES.map((on) => [on, ALLOWED_SETS.map(() => new LockCensusTally())]),
  )
  private readonly availability = new Map<
    string,
    { readonly dimension: AvailabilityDimension; readonly value: string; tally: LockCensusTally }
  >()
  private readonly lockedRhythms = new Set<string>()
  sessions = 0
  completed = 0

  /** Intent: a tally for one setting group, by its label. */
  constructor(readonly label: string) {}

  /** Intent: add one session; an incomplete one is counted, never classified. */
  add(session: LockSession, tensionAcrossPhrases: boolean): void {
    this.sessions += 1
    if (!session.completed) return
    this.completed += 1
    const locked = session.phrases[0]
    if (locked !== undefined) this.lockedRhythms.add(rhythmBarKey(locked.bars))
    const tallies = this.census.get(tensionAcrossPhrases)!
    ALLOWED_SETS.forEach(({ kinds }, index) => {
      const tally = tallies[index]!
      tally.addSession(censusOfSession(session.phrases, kinds))
      for (const draw of session.draws) tally.addDraw(draw.availability, kinds)
    })
    for (const draw of session.draws)
      for (const { dimension, value } of availabilityBuckets(draw.rhythm)) {
        const key = `${dimension}=${value}`
        const bucket = this.availability.get(key) ?? {
          dimension,
          value,
          tally: new LockCensusTally(),
        }
        this.availability.set(key, bucket)
        bucket.tally.addDraw(draw.availability, RHYTHM_CHANGE_KINDS)
      }
  }

  /** Intent: how many distinct rhythms phrase 1 locked across the completed sessions. */
  get distinctLockedRhythms(): number {
    return this.lockedRhythms.size
  }

  /** Intent: the census groups' figures, per Tension across phrases, then per allowed list. */
  groups(): readonly LockGroupFigures[] {
    return TENSION_ACROSS_PHRASES.flatMap((tensionAcrossPhrases) =>
      ALLOWED_SETS.map(({ kinds }, index) => ({
        label: this.label,
        tensionAcrossPhrases,
        allowed: kinds,
        figures: this.census.get(tensionAcrossPhrases)![index]!.figures(),
      })),
    )
  }

  /** Intent: the availability buckets' figures, in dimension order, then by value. */
  availabilityFigures(): readonly AvailabilityFigures[] {
    return [...this.availability.values()]
      .sort(
        (a, b) =>
          AVAILABILITY_DIMENSIONS.indexOf(a.dimension) -
            AVAILABILITY_DIMENSIONS.indexOf(b.dimension) || a.value.localeCompare(b.value),
      )
      .map(({ dimension, value, tally }) => {
        const { draws, noCandidate } = tally.figures()
        const availableByKind = Object.fromEntries(
          RHYTHM_CHANGE_KINDS.map((kind) => {
            const missing = noCandidate.byKind[kind]
            return [kind, missing === null ? null : 1 - missing]
          }),
        ) as Record<RhythmChangeKind, number | null>
        return {
          label: this.label,
          dimension,
          value,
          draws,
          availableByKind,
          noCandidateByKind: noCandidate.byKind,
        }
      })
  }

  /**
   * Intent: the readable `LOCK-CENSUS` lines: the sessions and distinct locked rhythms, each census
   * group's tally lines, then one line of availability per bucket of every dimension but the whole
   * setting.
   */
  lines(): readonly string[] {
    const header = `LOCK-CENSUS [${this.label}] ${this.sessions} sessions, ${this.completed} completed, ${this.distinctLockedRhythms} distinct locked rhythms`
    const census = TENSION_ACROSS_PHRASES.flatMap((on) =>
      ALLOWED_SETS.flatMap(({ label }, index) =>
        this.census.get(on)![index]!.lines(`${this.label} | arc ${on ? 'on' : 'off'} | ${label}`),
      ),
    )
    const availability = this.availabilityFigures()
      .filter(({ dimension }) => dimension !== 'setting')
      .map(({ dimension, value, draws, availableByKind }) => {
        const kinds = RHYTHM_CHANGE_KINDS.map((kind) => `${kind} ${percent(availableByKind[kind])}`)
        return `LOCK-CENSUS [${this.label} | ${dimension}=${value}] ${draws} draws, available: ${kinds.join(', ')}`
      })
    return [header, ...census, ...availability]
  }
}

/**
 * Intent: play every case under one setting group (`lockGroupCases`), Tension across phrases on
 * and off, density by density, each case with one outcome cache shared by its two sessions and
 * dropped after them (a wider cache saves next to nothing and holds the heap), and tally the
 * sessions. `onPart` hears of each density part finished.
 */
export async function censusOfGroup(
  group: CostSetting,
  cases: readonly SweepCase[],
  onPart: (density: string, cases: number) => void = () => {},
): Promise<LockGroupTally> {
  const tally = new LockGroupTally(group.label)
  for (const part of byNoteDensity(lockGroupCases(group, cases))) {
    for (const sweepCase of part) {
      const outcomes = new OutcomeCache()
      for (const tensionAcrossPhrases of TENSION_ACROSS_PHRASES)
        tally.add(
          await runLockSession(sweepCase, tensionAcrossPhrases, outcomes),
          tensionAcrossPhrases,
        )
    }
    onPart(part[0]!.rhythm.noteDensity, part.length)
  }
  return tally
}
