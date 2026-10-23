// @vitest-environment node
/**
 * The lock census's own tests (measurement tooling): a hand-written eight-phrase session holding
 * the locked phrase 1, a kept phrase, one change of each of the five kinds and one forced bend is
 * classified exactly; a change of a kind not allowed and a ties-only rewrite are bends; a re-lock
 * moves the reference; change availability is read from a small candidate list and stays cheap on
 * a domain-sized one; and the tally turns two sessions and a few draws into shares. The runner's
 * own pure plumbing (lock-census-sweep.ts) is checked too: its allowed lists, its choices, the
 * phrases that draw (repeats skipped), the draws' buckets and a setting group's tally (the preset
 * groups' seeds and the case labels: lock-census-seeds.spec.ts).
 */

import { describe, expect, it } from 'vitest'

import { RHYTHM_CHANGE_KINDS, type RhythmChangeKind } from '@/domain/generation/request-rhythm-lock'
import type { RhythmBar } from '@/domain/rhythm/rhythm-types'
import { phrase } from '../unit/domain/rhythm/rhythm-bar-fixture'
import {
  censusOfSession,
  changeAvailability,
  classifyLockedPhrase,
  LockCensusTally,
  type ChangeAvailability,
  type SessionPhraseRhythm,
} from './lock-census'
import {
  ALLOWED_SETS,
  AVAILABILITY_DIMENSIONS,
  LockGroupTally,
  SWEEP_GROUP,
  availabilityBuckets,
  drawingPhrases,
  lockCensusChoices,
  settingGroups,
} from './lock-census-sweep'

/**
 * The locked rhythm, chosen so every kind exists: measures 1 and 3 (indices 0 and 2) are four
 * quarter notes (a note start to move, a note to split, a note to turn into a rest), measure 2
 * holds two eighths to merge, and measure 4 a rest between two notes to move.
 */
const L0 = 'n4 n4 n4 n4'
const L1 = 'n4 n2 n2 n4 n4'
const L2 = 'n4 n4 n4 n4'
const L3 = 'n2 r2 n4 n4 n4'
const LOCKED = phrase([L0, L1, L2, L3])

/** Intent: one phrase of a hand-written session. */
function at(
  phraseNumber: number,
  bars: readonly RhythmBar[],
  relock?: boolean,
): SessionPhraseRhythm {
  return relock === undefined ? { phraseNumber, bars } : { phraseNumber, bars, relock }
}

/** The eight phrases: locked, one change of each kind, a kept phrase, and a forced bend. */
const EIGHT = [
  at(1, LOCKED),
  at(2, phrase(['n6 n2 n4 n4', L1, L2, L3])),
  at(3, phrase([L0, L1, L2, L3])),
  at(4, phrase([L0, L1, L2, 'n3 r2 n3 n4 n4'])),
  at(5, phrase(['n4 n2 n2 n4 n4', L1, 'n4 n2 n2 n4 n4', L3])),
  at(6, phrase([L0, 'n4 n4 n4 n4', L2, L3])),
  at(7, phrase(['n4 r4 n4 n4', L1, 'n4 r4 n4 n4', L3])),
  at(8, phrase(['n4 r4 n4 n4', 'n4 n4 n4 n4', L2, L3])),
]

describe('lock census: one hand-written eight-phrase session', () => {
  it('classifies every phrase and counts each class', () => {
    const census = censusOfSession(EIGHT, RHYTHM_CHANGE_KINDS)
    expect(census.phrases).toEqual([
      { phraseNumber: 1, lockClass: { kind: 'locked' } },
      {
        phraseNumber: 2,
        lockClass: {
          kind: 'change',
          change: {
            kind: 'move_note_start',
            form: 'one_measure',
            measures: [0],
            tick: 4,
            delta: 2,
          },
        },
      },
      { phraseNumber: 3, lockClass: { kind: 'kept' } },
      {
        phraseNumber: 4,
        lockClass: {
          kind: 'change',
          change: { kind: 'move_rest', form: 'one_measure', measures: [3], tick: 2, delta: 1 },
        },
      },
      {
        phraseNumber: 5,
        lockClass: {
          kind: 'change',
          change: { kind: 'split_note', form: 'repeated', measures: [0, 2], tick: 6, delta: 0 },
        },
      },
      {
        phraseNumber: 6,
        lockClass: {
          kind: 'change',
          change: { kind: 'merge_notes', form: 'one_measure', measures: [1], tick: 6, delta: 0 },
        },
      },
      {
        phraseNumber: 7,
        lockClass: {
          kind: 'change',
          change: { kind: 'note_rest', form: 'repeated', measures: [0, 2], tick: 4, delta: 0 },
        },
      },
      { phraseNumber: 8, lockClass: { kind: 'bend', distance: 2, reason: 'other' } },
    ])
    expect(census.counts).toEqual({
      kept: 1,
      changesByKind: {
        move_note_start: 1,
        move_rest: 1,
        split_note: 1,
        merge_notes: 1,
        note_rest: 1,
      },
      bends: 1,
      bendsByReason: { 'tie-only': 0, 'disallowed-change': 0, other: 1 },
      relocks: 0,
    })
  })

  it('rejects a session that does not start at phrase 1 or skips a phrase number', () => {
    expect(() => censusOfSession(EIGHT.slice(1), RHYTHM_CHANGE_KINDS)).toThrow(/phrase 1/)
    expect(() => censusOfSession([EIGHT[0]!, EIGHT[2]!], RHYTHM_CHANGE_KINDS)).toThrow(/number/)
    expect(() => censusOfSession([at(1, LOCKED, true)], RHYTHM_CHANGE_KINDS)).toThrow(/re-lock/)
  })
})

describe('lock census: bends', () => {
  it('a single change of a kind not allowed is a bend at its distance, with the change', () => {
    const turned = phrase(['n4 r4 n4 n4', L1, 'n4 r4 n4 n4', L3])
    expect(classifyLockedPhrase(LOCKED, turned, ['move_note_start', 'split_note'])).toEqual({
      kind: 'bend',
      distance: 2,
      reason: 'disallowed-change',
      change: { kind: 'note_rest', form: 'repeated', measures: [0, 2], tick: 4, delta: 0 },
    })
  })

  it('a ties-only rewrite is a bend at distance 0, whatever the list allows', () => {
    const tied = phrase(['n4 n2 ~n2 n4 n4', L1, L2, L3])
    expect(classifyLockedPhrase(LOCKED, tied, RHYTHM_CHANGE_KINDS)).toEqual({
      kind: 'bend',
      distance: 0,
      reason: 'tie-only',
    })
  })

  it('with an empty list, an allowed-looking change is still a bend', () => {
    const moved = phrase(['n6 n2 n4 n4', L1, L2, L3])
    expect(classifyLockedPhrase(LOCKED, moved, [])).toMatchObject({
      kind: 'bend',
      distance: 1,
      reason: 'disallowed-change',
    })
  })
})

describe('lock census: a re-lock moves the reference', () => {
  const RELOCKED = phrase(['n8 n8', 'n8 n8', 'n8 n8', 'n8 n8'])

  it('later phrases are read against the re-locked rhythm', () => {
    const census = censusOfSession(
      [
        at(1, LOCKED),
        at(2, LOCKED),
        at(3, RELOCKED, true),
        at(4, phrase(['n8 n8', 'n8 n8', 'n8 n8', 'n8 n8'])),
        at(5, phrase(['n8 r8', 'n8 n8', 'n8 r8', 'n8 n8'])),
        at(6, LOCKED),
      ],
      RHYTHM_CHANGE_KINDS,
    )
    expect(census.phrases.map((entry) => entry.lockClass)).toEqual([
      { kind: 'locked' },
      { kind: 'kept' },
      { kind: 'relock' },
      { kind: 'kept' },
      {
        kind: 'change',
        change: { kind: 'note_rest', form: 'repeated', measures: [0, 2], tick: 8, delta: 0 },
      },
      { kind: 'bend', distance: expect.any(Number), reason: 'other' },
    ])
    expect(census.counts.relocks).toBe(1)
    expect(census.counts.kept).toBe(2)
  })
})

/** Intent: an availability record with the named kinds available. */
function available(...kinds: RhythmChangeKind[]): ChangeAvailability {
  return Object.fromEntries(
    RHYTHM_CHANGE_KINDS.map((kind) => [kind, kinds.includes(kind)]),
  ) as ChangeAvailability
}

describe('lock census: change availability', () => {
  it('names the kinds some candidate reaches by exactly one change', () => {
    const candidates = [
      LOCKED,
      phrase(['n4 n2 n2 n4 n4', L1, 'n4 n2 n2 n4 n4', L3]),
      phrase(['n4 n2 n2 n4 n4', L1, 'n4 n2 n2 n4 n4', L3]),
      phrase(['n4 r4 n4 n4', 'n4 n4 n4 n4', L2, L3]),
      phrase([L0, L1, L2, 'n3 r2 n3 n4 n4']),
      phrase(['n4 n2 ~n2 n4 n4', L1, L2, L3]),
      phrase(['n4 r4 n4 n4', L1, 'n4 n4 r4 n4', L3]),
    ]
    expect(changeAvailability(LOCKED, candidates)).toEqual(available('split_note', 'move_rest'))
  })

  it('finds nothing in an empty domain', () => {
    expect(changeAvailability(LOCKED, [])).toEqual(available())
  })

  it('stays cheap on a domain of 3,000 candidates called a thousand times', () => {
    const variants = ['n4 n4 n4 n4', 'n8 n8', 'n4 r4 n8', 'n2 n2 n4 n8', 'n6 n2 n8', 'n16', 'n8 r8']
    const domain: (readonly RhythmBar[])[] = []
    for (const a of variants)
      for (const b of variants)
        for (const c of variants)
          for (const d of variants) domain.push(Object.freeze(phrase([a, b, c, d])))
    expect(domain).toHaveLength(2_401)
    while (domain.length < 3_000) domain.push(domain[domain.length % 2_401]!)
    const locked = phrase(['n8 n8', 'n8 n8', 'n8 n8', 'n8 n8'])
    const started = performance.now()
    let result = changeAvailability(locked, domain)
    for (let call = 1; call < 1_000; call += 1) result = changeAvailability(locked, domain)
    const elapsed = performance.now() - started
    console.log(
      `LOCK-CENSUS availability: 1,000 calls on 3,000 candidates in ${elapsed.toFixed(0)} ms`,
    )
    expect(result).toEqual(available('split_note', 'merge_notes', 'note_rest'))
    expect(elapsed).toBeLessThan(10_000)
  })
})

describe('lock census: the tally', () => {
  const X = phrase(['n8 n8', 'n8 n8', 'n8 n8', 'n8 n8'])
  const FIRST = censusOfSession(
    [
      at(1, LOCKED),
      at(2, LOCKED),
      at(3, phrase(['n4 r4 n4 n4', L1, 'n4 r4 n4 n4', L3])),
      at(4, X, true),
      at(5, phrase(['n8 n4 ~n4', 'n8 n8', 'n8 n8', 'n8 n8'])),
    ],
    RHYTHM_CHANGE_KINDS,
  )
  const SECOND = censusOfSession(EIGHT, RHYTHM_CHANGE_KINDS)

  /** Intent: a tally fed both sessions and four draws. */
  function tally(): LockCensusTally {
    const result = new LockCensusTally()
    result.addSession(FIRST)
    result.addSession(SECOND)
    result.addDraw(available('move_note_start'), RHYTHM_CHANGE_KINDS)
    result.addDraw(available(), RHYTHM_CHANGE_KINDS)
    result.addDraw(available('note_rest'), ['move_rest'])
    result.addDraw(available(...RHYTHM_CHANGE_KINDS), RHYTHM_CHANGE_KINDS)
    return result
  }

  it('gives the shares of phrases 2..n and of draws with no candidate', () => {
    const figures = tally().figures()
    expect(JSON.parse(JSON.stringify(figures))).toEqual(figures)
    expect(figures).toEqual({
      sessions: 2,
      classifiedPhrases: 10,
      relocks: 1,
      counts: {
        kept: 2,
        changesByKind: {
          move_note_start: 1,
          move_rest: 1,
          split_note: 1,
          merge_notes: 1,
          note_rest: 2,
        },
        bends: 2,
        bendsByReason: { 'tie-only': 1, 'disallowed-change': 0, other: 1 },
      },
      shares: {
        kept: 0.2,
        changed: 0.6,
        changedByKind: {
          move_note_start: 0.1,
          move_rest: 0.1,
          split_note: 0.1,
          merge_notes: 0.1,
          note_rest: 0.2,
        },
        bent: 0.2,
        bentByReason: { 'tie-only': 0.1, 'disallowed-change': 0, other: 0.1 },
      },
      draws: 4,
      noCandidate: {
        byKind: {
          move_note_start: 0.5,
          move_rest: 0.75,
          split_note: 0.75,
          merge_notes: 0.75,
          note_rest: 0.5,
        },
        anyAllowedKind: 0.5,
      },
    })
  })

  it('prints LOCK-CENSUS summary lines', () => {
    expect(tally().lines('Eighth Build')).toEqual([
      'LOCK-CENSUS [Eighth Build] 2 sessions, 10 phrases after phrase 1 classified, 1 re-locks',
      'LOCK-CENSUS [Eighth Build] kept 20.0 %, changed 60.0 %, bent 20.0 % ' +
        '(tie-only 10.0 %, disallowed-change 0.0 %, other 10.0 %)',
      'LOCK-CENSUS [Eighth Build] changed by kind: move_note_start 10.0 %, move_rest 10.0 %, ' +
        'split_note 10.0 %, merge_notes 10.0 %, note_rest 20.0 %',
      'LOCK-CENSUS [Eighth Build] 4 draws, no candidate: move_note_start 50.0 %, ' +
        'move_rest 75.0 %, split_note 75.0 %, merge_notes 75.0 %, note_rest 50.0 %, ' +
        'any allowed kind 50.0 %',
    ])
  })

  it('reports null shares and dashes before anything is added', () => {
    const empty = new LockCensusTally()
    expect(empty.figures().shares.kept).toBeNull()
    expect(empty.figures().noCandidate.anyAllowedKind).toBeNull()
    expect(empty.lines('none')[1]).toBe(
      'LOCK-CENSUS [none] kept - %, changed - %, bent - % ' +
        '(tie-only - %, disallowed-change - %, other - %)',
    )
  })

  it('rejects a draw read against an empty allowed list', () => {
    expect(() => new LockCensusTally().addDraw(available(), [])).toThrow(/allowed/)
  })
})

describe('lock census runner plumbing', () => {
  const RHYTHM = {
    noteDensity: 'Eighth',
    rhythmicVariety: 'Slightly varied',
    silenceDensity: 'Sparse',
    syncopation: 'Straight',
    tensionArc: 'Build',
  } as const

  it('classifies each change kind alone, then all five together', () => {
    expect(ALLOWED_SETS.map((set) => set.kinds)).toEqual([
      ...RHYTHM_CHANGE_KINDS.map((kind) => [kind]),
      RHYTHM_CHANGE_KINDS,
    ])
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

  it('draws from phrase 2 on, skipping a repeat', () => {
    const phrases = [
      { phraseNumber: 1, origin: 'idle' },
      { phraseNumber: 2, origin: 'carry-in' },
      { phraseNumber: 3, origin: 'repeat' },
      { phraseNumber: 4, origin: 'standalone' },
    ] as const
    expect(drawingPhrases(phrases).map((entry) => entry.phraseNumber)).toEqual([2, 4])
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

  it('tallies a setting group by Tension across phrases and allowed list, never an incomplete session', () => {
    const group = new LockGroupTally('sweep cases')
    const draws = [
      { phraseNumber: 2, rhythm: RHYTHM, availability: available('move_note_start') },
      { phraseNumber: 3, rhythm: RHYTHM, availability: available() },
    ]
    group.add({ completed: true, phrases: EIGHT, draws }, true)
    group.add({ completed: false, phrases: [], draws: [] }, false)
    expect([group.sessions, group.completed]).toEqual([2, 1])
    const figures = group.groups()
    expect(figures).toHaveLength(2 * ALLOWED_SETS.length)
    const allFiveArcOn = figures.find(
      (entry) => entry.tensionAcrossPhrases && entry.allowed === RHYTHM_CHANGE_KINDS,
    )!
    expect(allFiveArcOn.figures.sessions).toBe(1)
    expect(allFiveArcOn.figures.draws).toBe(2)
    expect(figures.find((entry) => !entry.tensionAcrossPhrases)!.figures.sessions).toBe(0)
    const pooled = group.availabilityFigures()
    expect(pooled.map((entry) => entry.dimension)).toEqual([...AVAILABILITY_DIMENSIONS])
    expect(pooled[0]!.draws).toBe(2)
    expect(pooled[0]!.availableByKind.move_note_start).toBe(0.5)
    expect(pooled[0]!.noCandidateByKind.split_note).toBe(1)
    expect(group.distinctLockedRhythms).toBe(1)
    group.add({ completed: true, phrases: EIGHT, draws: [] }, false)
    group.add({ completed: true, phrases: [at(1, EIGHT[1]!.bars)], draws: [] }, false)
    expect(group.distinctLockedRhythms).toBe(2)
  })
})
