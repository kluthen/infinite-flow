// @vitest-environment node
// @lint-ignore-atd measurement tooling run by `npm run test:sweep`: it checks the cost runner's settings and join-loss figures; no business rule
/**
 * The cost runner's own tests (measurement tooling, cost-guard.ts and cost-guard-figures.ts): every
 * one of v3.3's settings is measurable, Speed drill at Strongly favored first; the join-loss
 * figures (spec D530, D531) read from an attempt's intent whether it joins, whether its carry-in
 * owes a leap recovery, and whether only the tonic chord's seventh could repay it, and count the
 * failed joins by those causes; the standalone attempts (M2) are timed against the standalone
 * reserve; and the summary prints the productions, the failed joins and the standalone attempts.
 */

import { describe, expect, it } from 'vitest'

import type { GenerationControls } from '@/domain/controls/generation-controls'
import { makeConcertPitch } from '@/domain/events/concert-pitch'
import {
  CarryInError,
  makeCarryIn,
  type CarriedRecovery,
  type PhraseCarryIn,
} from '@/domain/generation/carry-in/carry-in'
import { owedRecoveryCanSettle } from '@/domain/generation/carry-in/phrase-ending-debt'
import { makeHarmonyCollection } from '@/domain/harmony/collection'
import {
  buildIntent,
  carryInAfter,
  generateSuccess,
} from '../unit/domain/generation/carry-in/carry-in-fixture'
import {
  PHRASE_PRODUCTIONS,
  type PhraseProduction,
} from '../unit/session/deadline-sweep-productions'
import { STANDALONE_RESERVE_SECONDS } from '@/session/session-timing'
import { failureOutcome } from '../unit/session/session-harness'
import {
  SEVENTH_SETTINGS,
  selectedSettings,
  settingSummaryLines,
  unmeasurableSeventhSettings,
  type SettingFigures,
} from './cost-guard'
import {
  TempoTally,
  attemptTime,
  failedJoinCounts,
  owedRecoveryOnlyOnSeventh,
  recoveryOnlyOnSeventhAt,
  splitTimes,
  standaloneAttempts,
  tempoSummaryLines,
  type AttemptTime,
} from './cost-guard-figures'

/** C major, the key of the joins built here. */
const C_MAJOR: Partial<GenerationControls> = { tonalCenter: 'C', collection: 'Major' }
/** The tonic chord's seventh chord in C major, C E G B. */
const C_MAJOR_SEVENTH = makeHarmonyCollection('C', 'Major').seventhChords[0]!.pitchClasses
/** The scale of C major. */
const C_MAJOR_SCALE = makeHarmonyCollection('C', 'Major').pitchClasses as readonly number[]
/** A wide window, holding every landing a recovery could reach from the pitches used here. */
const WIDE = { minMidi: 48, maxMidi: 96 }

/**
 * Intent: the real carry-in a C major phrase 1 hands forward (C keyboard, Middle: the window
 * 54-66), its harmony dropped (so its last pitch is never a tense note), with its last pitch moved
 * to `midi`, reached by a leap of seven
 * semitones in the owed direction, and `recovery` in force.
 */
function carryInAt(midi: number, recovery: CarriedRecovery): PhraseCarryIn {
  const intent = buildIntent({ seed: 11, controls: C_MAJOR })
  const carried = carryInAfter(intent, generateSuccess(intent), 1)
  const direction = recovery.kind === 'owed' ? recovery.leapDirection : 1
  return makeCarryIn({
    ...carried,
    finalHarmony: null,
    lastPitch: { midi: makeConcertPitch(midi), arrivingInterval: 7 * direction, recovery },
  })
}

/** Intent: an attempt record with the join facts given, the rest of it neutral. */
function attempt(facts: Partial<AttemptTime>): AttemptTime {
  return {
    seconds: 0.1,
    failureCode: null,
    tension: 'Settled',
    harmonyEvents: 4,
    seventhEvents: 0,
    fallback: false,
    join: false,
    joinOwesRecovery: false,
    recoveryOnlyOnSeventh: false,
    ...facts,
  }
}

describe("the cost runner's v3.3 settings", () => {
  it('measures every one of them, Speed drill at Strongly favored first', () => {
    expect(unmeasurableSeventhSettings()).toEqual([])
    expect(selectedSettings('sevenths')).toEqual(SEVENTH_SETTINGS)
    expect(selectedSettings(' Sevenths ').map((setting) => setting.label)[0]).toBe(
      'built-in Speed drill at seventh chords Strongly favored',
    )
    expect(SEVENTH_SETTINGS.map((setting) => setting.seventhLevel)).toEqual([
      'stronglyFavored',
      'off',
      'off',
      'sometimes',
      'sometimes',
      'favored',
      'favored',
      'stronglyFavored',
      'stronglyFavored',
      'stronglyFavored',
    ])
    expect(selectedSettings('Jazz at seventh chords Favored').map((each) => each.label)).toEqual([
      'Jazz at seventh chords Favored',
    ])
  })
})

describe('a recovery only the tonic chord seventh could repay (D530)', () => {
  it('holds when a recovery could land on the seventh and on no triad tone', () => {
    expect(recoveryOnlyOnSeventhAt(72, 1, C_MAJOR_SEVENTH, WIDE)).toBe(true)
    expect(recoveryOnlyOnSeventhAt(67, -1, C_MAJOR_SEVENTH, WIDE)).toBe(true)
  })

  it('fails with a triad tone among the landings, with no seventh among them, or with the seventh outside the window', () => {
    expect(recoveryOnlyOnSeventhAt(75, 1, C_MAJOR_SEVENTH, WIDE)).toBe(false)
    expect(recoveryOnlyOnSeventhAt(76, 1, C_MAJOR_SEVENTH, WIDE)).toBe(false)
    expect(recoveryOnlyOnSeventhAt(72, -1, C_MAJOR_SEVENTH, WIDE)).toBe(false)
    expect(recoveryOnlyOnSeventhAt(72, 1, C_MAJOR_SEVENTH, { minMidi: 72, maxMidi: 96 })).toBe(
      false,
    )
  })

  it('is false for an intent with no carry-in, a settled recovery, or a triad tone in reach', () => {
    expect(owedRecoveryOnlyOnSeventh(buildIntent({ seed: 1, controls: C_MAJOR }))).toBe(false)
    const settled = buildIntent({
      seed: 12,
      controls: C_MAJOR,
      carryIn: carryInAt(60, { kind: 'settled' }),
    })
    expect(owedRecoveryOnlyOnSeventh(settled)).toBe(false)
    const owed = buildIntent({
      seed: 12,
      controls: C_MAJOR,
      carryIn: carryInAt(64, { kind: 'owed', leapDirection: 1 }),
    })
    expect(owedRecoveryOnlyOnSeventh(owed)).toBe(false)
  })

  it('cannot hold for an intent the carry-in builder accepts: it refuses a recovery no tonic-triad tone repays', () => {
    const carryIn = carryInAt(60, { kind: 'owed', leapDirection: 1 })
    expect(recoveryOnlyOnSeventhAt(60, 1, C_MAJOR_SEVENTH, carryIn.registerWindow)).toBe(true)
    expect(owedRecoveryCanSettle(60, 1, C_MAJOR_SCALE, carryIn.registerWindow)).toBe(false)
    expect(() => buildIntent({ seed: 12, controls: C_MAJOR, carryIn })).toThrow(CarryInError)
  })
})

describe("the cost runner's failed joins", () => {
  it('reads the join facts of a measured attempt from its intent', () => {
    const owed = buildIntent({
      seed: 12,
      controls: C_MAJOR,
      carryIn: carryInAt(64, { kind: 'owed', leapDirection: 1 }),
    })
    expect(
      attemptTime(
        { outcome: failureOutcome('no_legal_pitch_plan'), seconds: 0.5, orderingSeconds: 0 },
        owed,
      ),
    ).toMatchObject({
      failureCode: 'no_legal_pitch_plan',
      join: true,
      joinOwesRecovery: true,
      recoveryOnlyOnSeventh: false,
    })
    const standalone = buildIntent({ seed: 12, controls: C_MAJOR })
    expect(
      attemptTime({ outcome: failureOutcome(), seconds: 0.5, orderingSeconds: 0 }, standalone),
    ).toMatchObject({
      join: false,
      joinOwesRecovery: false,
      recoveryOnlyOnSeventh: false,
    })
  })

  it('counts the failed joins, those owing a recovery, and those only the seventh could repay', () => {
    const failed = 'no_legal_pitch_plan' as const
    expect(
      failedJoinCounts([
        attempt({ join: true, failureCode: failed, joinOwesRecovery: true }),
        attempt({
          join: true,
          failureCode: failed,
          joinOwesRecovery: true,
          recoveryOnlyOnSeventh: true,
        }),
        attempt({ join: true, failureCode: failed }),
        attempt({ join: true, joinOwesRecovery: true }),
        attempt({ failureCode: failed }),
      ]),
    ).toEqual({ attempts: 3, owingRecovery: 2, recoveryOnlyOnSeventh: 1 })
    expect(new TempoTally(240).figures().failedJoins).toEqual({
      attempts: 0,
      owingRecovery: 0,
      recoveryOnlyOnSeventh: 0,
    })
  })

  it('prints the productions of phrases 2-6 and the failed joins', () => {
    const empty = new TempoTally(120).figures()
    const productions: Record<PhraseProduction, readonly number[]> = { ...empty.productions }
    PHRASE_PRODUCTIONS.forEach((production, index) => {
      productions[production] = [index, 0, 1, 0, 0]
    })
    const lines = tempoSummaryLines('fixture', {
      ...empty,
      productions,
      failedJoins: { attempts: 4, owingRecovery: 2, recoveryOnlyOnSeventh: 0 },
    })
    expect(lines).toContain(
      `COST-GUARD [fixture] 120 BPM productions phrases 2-6: ${PHRASE_PRODUCTIONS.map((production, index) => `${production} ${index + 1}`).join(', ')}`,
    )
    expect(lines).toContain(
      "COST-GUARD [fixture] 120 BPM failed joins: 4, owing a recovery 2, only the tonic chord's seventh to recover onto 0 (D530)",
    )
  })
})

describe("the cost runner's standalone attempts (M2)", () => {
  /** Some attempts: four standalone ones, two of them past the reserve, and three joins. */
  const attempts: readonly AttemptTime[] = [
    attempt({ seconds: 0.4 }),
    attempt({ seconds: STANDALONE_RESERVE_SECONDS }),
    attempt({ seconds: 1.2, failureCode: 'no_legal_pitch_plan' }),
    attempt({ seconds: 1.5 }),
    attempt({ seconds: 3, join: true }),
    attempt({ seconds: 2, join: true, failureCode: 'no_legal_pitch_plan' }),
    attempt({ seconds: 0.2, join: true }),
  ]

  it('times the attempts with no carry-in and counts those slower than the reserve', () => {
    const standalone = standaloneAttempts(attempts)
    expect(standalone.overReserve).toBe(2)
    expect(standalone.seconds).toEqual(splitTimes(attempts.filter((each) => !each.join)))
    expect(standalone.seconds.all).toEqual({ count: 4, slowestSeconds: 1.5, p95Seconds: 1.5 })
    expect(standalone.seconds.failures.count).toBe(1)
  })

  it('counts none with no standalone attempt', () => {
    expect(standaloneAttempts(attempts.filter((each) => each.join))).toEqual({
      seconds: splitTimes([]),
      overReserve: 0,
    })
    expect(new TempoTally(240).figures().standaloneAttempts.overReserve).toBe(0)
  })

  it('prints them for a tempo and for the distinct intents', () => {
    const standalone = standaloneAttempts(attempts)
    const empty = new TempoTally(120).figures()
    expect(tempoSummaryLines('fixture', { ...empty, standaloneAttempts: standalone })).toContain(
      'COST-GUARD [fixture] 120 BPM standalone attempts 4: slowest 1.500 s p95 1.500 s, over the 1.075 s reserve 2',
    )
    const figures: SettingFigures = {
      label: 'fixture',
      seventhLevel: 'off',
      durationSeconds: 1,
      distinctIntents: {
        failuresByCode: {},
        failuresByTension: {},
        seconds: splitTimes(attempts),
        sevenths: {
          seventhEvents: { count: 0, total: 0, share: null },
          fallbacks: { count: 0, total: 0, share: null },
        },
        standaloneAttempts: standalone,
      },
      tempos: [],
      fallbackAtFastestTempo: {
        tempo: 240,
        standalone: empty.standalone,
        productions: empty.productions,
      },
    }
    expect(settingSummaryLines(figures)).toContain(
      'COST-GUARD [fixture] distinct intents standalone attempts 4: slowest 1.500 s p95 1.500 s, over the 1.075 s reserve 2',
    )
  })
})
