// @vitest-environment node
/**
 * The lock census runner's own tests (measurement tooling, lock-census-sweep.ts and
 * lock-census-replay.ts). Its pure plumbing: the allowed lists (the strict lock first), its
 * choices, the phrases that draw (repeats and re-locks skipped, against the locked rhythm in
 * effect), the draws' buckets and a setting group's tally per Tension across phrases and allowed
 * list. Then one real sweep case, Tension across phrases on and off, with the strict lock and all
 * five kinds allowed: every session completes with no mismatch between record and bars, the strict
 * ones never draw, and sampled phrases replay from their `ifk4.` keys to the very result and
 * provenance the session sounded. The preset groups' seeds and the case labels:
 * lock-census-seeds.spec.ts.
 */

import { beforeAll, describe, expect, it } from 'vitest'

import { RHYTHM_CHANGE_KINDS } from '@/domain/generation/request-rhythm-lock'
import { OutcomeCache, sweepCases } from '../unit/session/deadline-sweep'
import {
  EIGHT,
  FAR,
  LOCKED,
  RELOCKED,
  TURNED,
  at,
  available,
  bent,
  changed,
  kept,
} from './lock-census-fixture'
import { REPLAY_CLASSES } from './lock-census-replay'
import {
  ALLOWED_SETS,
  AVAILABILITY_DIMENSIONS,
  LockGroupTally,
  SWEEP_GROUP,
  TENSION_ACROSS_PHRASES,
  availabilityBuckets,
  drawingPhrases,
  lockCensusChoices,
  runLockSession,
  settingGroups,
  type LockSession,
} from './lock-census-sweep'

/** The strict lock's place in the allowed lists, and all five kinds'. */
const STRICT = ALLOWED_SETS.findIndex((set) => set.kinds.length === 0)
const ALL_FIVE = ALLOWED_SETS.findIndex((set) => set.label === 'all five')

describe('lock census runner plumbing', () => {
  const RHYTHM = {
    noteDensity: 'Eighth',
    rhythmicVariety: 'Slightly varied',
    silenceDensity: 'Sparse',
    syncopation: 'Straight',
    tensionArc: 'Build',
  } as const

  it('plays the strict lock first, then each change kind alone, then all five together', () => {
    expect(ALLOWED_SETS.map((set) => set.kinds)).toEqual([
      [],
      ...RHYTHM_CHANGE_KINDS.map((kind) => [kind]),
      RHYTHM_CHANGE_KINDS,
    ])
    expect(ALLOWED_SETS[0]!.label).toBe('none (strict)')
    expect(ALLOWED_SETS.at(-1)!.label).toBe('all five')
  })

  it('reads its choices from the environment and refuses anything else', () => {
    expect(lockCensusChoices({})).toEqual({ limit: undefined, settings: 'sweep' })
    expect(lockCensusChoices({ LOCK_LIMIT: '6', LOCK_SETTINGS: 'Both' })).toEqual({
      limit: 6,
      settings: 'both',
    })
    expect(() => lockCensusChoices({ LOCK_LIMIT: '0' })).toThrow(/LOCK_LIMIT/)
    expect(() => lockCensusChoices({ LOCK_SETTINGS: 'presets' })).toThrow(/LOCK_SETTINGS/)
  })

  it('measures the sweep cases, the built-in presets, or both, the sweep cases first', () => {
    expect(settingGroups('sweep')).toEqual([SWEEP_GROUP])
    const builtIns = settingGroups('builtin')
    expect(builtIns.length).toBeGreaterThan(0)
    expect(builtIns.every((group) => group.label.startsWith('built-in '))).toBe(true)
    expect(settingGroups('both')).toEqual([SWEEP_GROUP, ...builtIns])
  })

  it('draws from phrase 2 on, skipping a repeat and a re-lock, against the locked rhythm in effect', () => {
    const phrases = [
      at(1, LOCKED),
      kept(2, LOCKED),
      kept(3, LOCKED, { repeat: true }),
      bent(4, RELOCKED, { relock: true }),
      kept(5, RELOCKED),
    ]
    expect(
      drawingPhrases(phrases, RHYTHM_CHANGE_KINDS).map(({ entry, locked }) => [
        entry.phraseNumber,
        locked,
      ]),
    ).toEqual([
      [2, LOCKED],
      [5, RELOCKED],
    ])
    expect(drawingPhrases(phrases, [])).toEqual([])
  })

  it('buckets a draw by the whole pool, each rhythm control and the whole setting', () => {
    expect(availabilityBuckets(RHYTHM)).toEqual([
      { dimension: 'all', value: 'all' },
      { dimension: 'noteDensity', value: 'Eighth' },
      { dimension: 'rhythmicVariety', value: 'Slightly varied' },
      { dimension: 'syncopation', value: 'Straight' },
      { dimension: 'silenceDensity', value: 'Sparse' },
      { dimension: 'tension', value: 'Build' },
      { dimension: 'setting', value: 'Eighth/Slightly varied/Sparse/Straight/Build' },
    ])
  })

  it('tallies a setting group per Tension across phrases and allowed list, the availability from all five only', () => {
    const group = new LockGroupTally('sweep cases')
    const allFive: LockSession = {
      completed: true,
      phrases: EIGHT,
      draws: [
        {
          phraseNumber: 2,
          rhythm: RHYTHM,
          availability: available('move_note_start'),
          drawn: { drew: true, noChangeAvailable: false },
        },
        {
          phraseNumber: 3,
          rhythm: RHYTHM,
          availability: available(),
          drawn: { drew: true, noChangeAvailable: true },
        },
      ],
      sounded: [],
    }
    const strict: LockSession = {
      completed: true,
      phrases: [at(1, LOCKED), kept(2, LOCKED), bent(3, FAR)],
      draws: [],
      sounded: [],
    }
    const noteRest = ALLOWED_SETS.findIndex((set) => set.label === 'note_rest')
    const turned: LockSession = {
      completed: true,
      phrases: [at(1, LOCKED), changed(2, TURNED, 'note_rest')],
      draws: [allFive.draws[0]!],
      sounded: [],
    }
    group.add(allFive, true, ALL_FIVE)
    group.add(strict, true, STRICT)
    group.add(turned, true, noteRest)
    group.add({ completed: false, phrases: [], draws: [], sounded: [] }, false, ALL_FIVE)
    expect([group.sessions, group.completed]).toEqual([4, 3])
    const figures = group.groups()
    expect(figures).toHaveLength(TENSION_ACROSS_PHRASES.length * ALLOWED_SETS.length)
    /** Intent: the figures of one allowed list with Tension across phrases on. */
    const arcOn = (index: number) =>
      figures.find(
        (entry) => entry.tensionAcrossPhrases && entry.allowed === ALLOWED_SETS[index]!.kinds,
      )!.figures
    expect(arcOn(ALL_FIVE).sessions).toBe(1)
    expect(arcOn(ALL_FIVE).draws).toBe(2)
    expect(arcOn(ALL_FIVE).noChange.noCandidate.count).toBe(1)
    expect(arcOn(STRICT)).toMatchObject({ sessions: 1, draws: 0, classifiedPhrases: 2 })
    expect(arcOn(STRICT).drawn.drew).toBe(0)
    expect(arcOn(noteRest).draws).toBe(1)
    expect(figures.find((entry) => !entry.tensionAcrossPhrases)!.figures.sessions).toBe(0)
    expect(group.mismatches()).toEqual({ count: 0, first: [] })
    const pooled = group.availabilityFigures()
    expect(pooled.map((entry) => entry.dimension)).toEqual([...AVAILABILITY_DIMENSIONS])
    expect(pooled[0]!.draws).toBe(2)
    expect(pooled[0]!.availableByKind.move_note_start).toBe(0.5)
    expect(pooled[0]!.noCandidateByKind.split_note).toBe(1)
    expect(group.distinctLockedRhythms).toBe(1)
    group.add({ ...allFive, phrases: [at(1, FAR)], draws: [] }, false, ALL_FIVE)
    expect(group.distinctLockedRhythms).toBe(2)
  })
})

describe('lock census runner: one real case, the strict lock and all five kinds', () => {
  /** A case whose all-five sessions both keep the locked bars and change them. */
  const sweepCase = sweepCases().find(
    ({ rhythm }) => rhythm.noteDensity === 'Eighth' && rhythm.rhythmicVariety === 'Slightly varied',
  )!
  const group = new LockGroupTally('smoke', 2)

  beforeAll(async () => {
    const outcomes = new OutcomeCache()
    for (const tensionAcrossPhrases of TENSION_ACROSS_PHRASES)
      for (const index of [STRICT, ALL_FIVE])
        group.add(
          await runLockSession(
            sweepCase,
            tensionAcrossPhrases,
            ALLOWED_SETS[index]!.kinds,
            outcomes,
          ),
          tensionAcrossPhrases,
          index,
        )
  }, 120_000)

  it('completes every session with no mismatch; the strict sessions never draw', () => {
    expect([group.sessions, group.completed]).toEqual([4, 4])
    expect(group.mismatches().count).toBe(0)
    const played = group.groups().filter((entry) => entry.figures.sessions > 0)
    expect(played.map((entry) => [entry.tensionAcrossPhrases, entry.allowed.length])).toEqual([
      [true, 0],
      [true, 5],
      [false, 0],
      [false, 5],
    ])
    for (const { allowed, figures } of played) {
      expect(figures.classifiedPhrases + figures.relocks + figures.repeats).toBe(7)
      if (allowed.length > 0) continue
      expect(figures.draws).toBe(0)
      expect(figures.drawn).toMatchObject({ eligible: 0, drew: 0 })
      expect(figures.shares.changed ?? 0).toBe(0)
    }
    const drawsOfAllFive = played
      .filter(({ allowed }) => allowed.length > 0)
      .reduce((sum, { figures }) => sum + figures.draws, 0)
    expect(group.availabilityFigures()[0]!.draws).toBe(drawsOfAllFive)
  })

  it('replays sampled phrases from their ifk4. keys to the result and provenance they sounded with', () => {
    const replay = group.replaySamples()
    const counts = REPLAY_CLASSES.map((lockClass) => replay.byClass[lockClass])
    expect(replay.byClass.kept.replayed).toBeGreaterThan(0)
    expect(replay.byClass.change.replayed).toBeGreaterThan(0)
    for (const { replayed, matched, sampleKey } of counts) {
      expect(replayed).toBeLessThanOrEqual(2)
      expect(matched).toBe(replayed)
      if (replayed > 0) expect(sampleKey).toMatch(/^ifk4\./)
    }
    expect(replay.mismatchedKeys).toEqual([])
    expect(group.lines().some((line) => line.startsWith('LOCK-CENSUS [smoke] replay: '))).toBe(true)
  })
})
