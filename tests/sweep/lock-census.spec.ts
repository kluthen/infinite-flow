// @vitest-environment node
/**
 * The lock census's own tests (measurement tooling). The bars classifier reads a change of a kind
 * not allowed and a ties-only rewrite as bends; change availability is read from a small candidate
 * list and stays cheap on a domain-sized one. The session census classes each phrase by the lock
 * outcome its provenance records (a re-lock by the history's mark), the bars only cross-checking
 * it: a hand-written eight-phrase session holding the locked phrase 1, a kept phrase, one change of
 * each kind and one forced bend is classified exactly; a forced bend one allowed change away is a
 * bend tallied apart; a re-lock moves the reference; a repeat is not classified; every mismatch
 * kind is reported; and the tally turns sessions and draws into shares (drawn normal and tenser,
 * the no-change split, per tension and per tension step). The runner (lock-census-sweep.ts) is
 * checked in lock-census-runner.spec.ts and lock-census-seeds.spec.ts.
 */

import { describe, expect, it } from 'vitest'

import { RHYTHM_CHANGE_KINDS } from '@/domain/generation/request-rhythm-lock'
import type { RhythmBar } from '@/domain/rhythm/rhythm-types'
import { phrase } from '../unit/domain/rhythm/rhythm-bar-fixture'
import { censusOfSession, changeAvailability, classifyLockedPhrase } from './lock-census'
import {
  L1,
  L2,
  L3,
  LOCKED,
  MOVED,
  REST_MOVED,
  SPLIT,
  TURNED,
  FAR,
  RELOCKED,
  RELOCKED_TURNED,
  RELOCKED_TIED,
  at,
  kept,
  changed,
  bent,
  EIGHT,
  MISMATCHES,
  available,
  tensed,
} from './lock-census-fixture'
import { LockCensusTally } from './lock-census-tally'

describe('lock census: one hand-written eight-phrase session', () => {
  it('classes every phrase by its provenance and counts each class', () => {
    const census = censusOfSession(EIGHT, RHYTHM_CHANGE_KINDS)
    expect(census.phrases.map((entry) => entry.lockClass)).toEqual([
      { kind: 'locked' },
      { kind: 'change', changeKind: 'move_note_start' },
      { kind: 'kept' },
      { kind: 'change', changeKind: 'move_rest' },
      { kind: 'change', changeKind: 'split_note' },
      { kind: 'change', changeKind: 'merge_notes' },
      { kind: 'change', changeKind: 'note_rest' },
      { kind: 'bend', distance: 2, reason: 'other' },
    ])
    expect(census.phrases[1]!.bars).toEqual({
      kind: 'change',
      change: { kind: 'move_note_start', form: 'one_measure', measures: [0], tick: 4, delta: 2 },
    })
    expect(census.phrases[0]!.previousTension).toBeUndefined()
    expect(census.phrases[1]).toMatchObject({
      drew: true,
      noChangeAvailable: false,
      tension: 'Build',
      previousTension: 'Build',
      tenserPhrase: false,
    })
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
      bendsByReason: { 'tie-only': 0, 'disallowed-change': 0, other: 1, 'one-allowed-change': 0 },
      relocks: 0,
      repeats: 0,
      eligible: 7,
      eligibleTenser: 0,
      drew: 5,
      drewTenser: 0,
      noChangeAvailable: 0,
      mismatches: [],
    })
  })

  it('rejects a session that does not start at phrase 1, skips a number or is not four measures', () => {
    expect(() => censusOfSession(EIGHT.slice(1), RHYTHM_CHANGE_KINDS)).toThrow(/phrase 1/)
    expect(() => censusOfSession([EIGHT[0]!, EIGHT[2]!], RHYTHM_CHANGE_KINDS)).toThrow(/number/)
    expect(() => censusOfSession([at(1, LOCKED, { relock: true })], RHYTHM_CHANGE_KINDS)).toThrow(
      /re-lock/,
    )
    expect(() => censusOfSession([at(1, LOCKED.slice(1))], RHYTHM_CHANGE_KINDS)).toThrow(/four/)
  })
})

describe('lock census: the provenance names the class, the bars cross-check it', () => {
  it('a forced bend one allowed change away is a bend, tallied apart, with no mismatch', () => {
    const census = censusOfSession(
      [at(1, LOCKED), bent(2, MOVED, { rhythmChange: 'no_change_available' })],
      RHYTHM_CHANGE_KINDS,
    )
    expect(census.phrases[1]!.lockClass).toEqual({
      kind: 'bend',
      distance: 1,
      reason: 'one-allowed-change',
      change: { kind: 'move_note_start', form: 'one_measure', measures: [0], tick: 4, delta: 2 },
    })
    expect(census.counts.bends).toBe(1)
    expect(census.counts.bendsByReason['one-allowed-change']).toBe(1)
    expect(census.counts.changesByKind.move_note_start).toBe(0)
    expect(census.counts.mismatches).toEqual([])
  })

  it('a bend keeps the bars reading its reason: ties only, or a change of a kind not allowed', () => {
    const census = censusOfSession(
      [at(1, LOCKED), bent(2, phrase(['n4 n2 ~n2 n4 n4', L1, L2, L3])), bent(3, TURNED)],
      ['move_note_start'],
    )
    expect(census.phrases.slice(1).map((entry) => entry.lockClass)).toEqual([
      { kind: 'bend', distance: 0, reason: 'tie-only' },
      {
        kind: 'bend',
        distance: 2,
        reason: 'disallowed-change',
        change: { kind: 'note_rest', form: 'repeated', measures: [0, 2], tick: 4, delta: 0 },
      },
    ])
    expect(census.counts.mismatches).toEqual([])
  })

  it('with nothing allowed (the strict lock), kept phrases and bends are classed and none draws', () => {
    const census = censusOfSession([at(1, LOCKED), kept(2, LOCKED), bent(3, MOVED)], [])
    expect(census.phrases.map((entry) => entry.lockClass.kind)).toEqual(['locked', 'kept', 'bend'])
    expect(census.phrases[2]!.lockClass).toMatchObject({ reason: 'disallowed-change' })
    expect(census.counts).toMatchObject({ kept: 1, bends: 1, eligible: 0, drew: 0 })
    expect(census.counts.mismatches).toEqual([])
  })
})

describe('lock census: a re-lock comes from the mark and moves the reference', () => {
  it('later phrases are read against the re-locked rhythm', () => {
    const census = censusOfSession(
      [
        at(1, LOCKED),
        kept(2, LOCKED),
        bent(3, RELOCKED, { relock: true }),
        kept(4, RELOCKED),
        changed(5, RELOCKED_TURNED, 'note_rest'),
        bent(6, LOCKED),
      ],
      RHYTHM_CHANGE_KINDS,
    )
    expect(census.phrases.map((entry) => entry.lockClass)).toEqual([
      { kind: 'locked' },
      { kind: 'kept' },
      { kind: 'relock' },
      { kind: 'kept' },
      { kind: 'change', changeKind: 'note_rest' },
      { kind: 'bend', distance: expect.any(Number), reason: 'other' },
    ])
    expect(census.counts).toMatchObject({ relocks: 1, kept: 2, bends: 1, eligible: 4 })
    expect(census.counts.mismatches).toEqual([])
  })

  it('a re-lock whose provenance says locked_bars is still a re-lock, never a kept phrase', () => {
    const census = censusOfSession(
      [at(1, LOCKED), kept(2, RELOCKED, { relock: true }), kept(3, RELOCKED)],
      RHYTHM_CHANGE_KINDS,
    )
    expect(census.phrases.map((entry) => entry.lockClass.kind)).toEqual([
      'locked',
      'relock',
      'kept',
    ])
    expect(census.counts).toMatchObject({ relocks: 1, kept: 1, bends: 0 })
    expect(census.counts.mismatches).toEqual([])
  })
})

describe('lock census: a repeat', () => {
  it('is counted, never classified, and its copied record is not a draw of its own', () => {
    const census = censusOfSession(
      [
        at(1, LOCKED),
        changed(2, TURNED, 'note_rest'),
        changed(3, TURNED, 'note_rest', { repeat: true }),
        kept(4, LOCKED),
      ],
      RHYTHM_CHANGE_KINDS,
    )
    expect(census.phrases[2]).toMatchObject({
      lockClass: { kind: 'repeat' },
      drew: false,
      noChangeAvailable: false,
    })
    expect(census.counts).toMatchObject({ repeats: 1, eligible: 2, drew: 1, kept: 1 })
    expect(census.counts.changesByKind.note_rest).toBe(1)
    expect(census.counts.mismatches).toEqual([])
  })
})

describe('lock census: mismatches are reported, never thrown', () => {
  it.each(MISMATCHES)('%s', (_name, second, allowed) => {
    const census = censusOfSession([at(1, LOCKED), second], allowed)
    expect(census.counts.mismatches).toHaveLength(1)
    expect(census.counts.mismatches[0]).toMatch(/^phrase 2: /)
  })

  it('a draw or a lock outcome on phrase 1', () => {
    const drew = censusOfSession(
      [at(1, LOCKED, { rhythmChange: 'no_change_available' })],
      RHYTHM_CHANGE_KINDS,
    )
    const outcome = censusOfSession(
      [at(1, LOCKED, { rhythmLockOutcome: 'locked_bars' })],
      RHYTHM_CHANGE_KINDS,
    )
    for (const census of [drew, outcome]) {
      expect(census.counts.mismatches).toHaveLength(1)
      expect(census.counts.mismatches[0]).toMatch(/^phrase 1: /)
      expect(census.phrases[0]!.lockClass).toEqual({ kind: 'locked' })
    }
  })

  it('a phrase with no outcome or no change kind is left unclassified', () => {
    const census = censusOfSession(
      [at(1, LOCKED), at(2, LOCKED), at(3, MOVED, { rhythmLockOutcome: 'rhythm_change' })],
      RHYTHM_CHANGE_KINDS,
    )
    expect(census.phrases.slice(1).map((entry) => entry.lockClass)).toEqual([
      { kind: 'unreadable' },
      { kind: 'unreadable' },
    ])
    expect(census.counts).toMatchObject({ kept: 0, bends: 0, eligible: 2 })
    expect(census.counts.mismatches).toHaveLength(2)
  })
})

describe('lock census: bends', () => {
  it('a single change of a kind not allowed is a bend at its distance, with the change', () => {
    expect(classifyLockedPhrase(LOCKED, TURNED, ['move_note_start', 'split_note'])).toEqual({
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
    expect(classifyLockedPhrase(LOCKED, MOVED, [])).toMatchObject({
      kind: 'bend',
      distance: 1,
      reason: 'disallowed-change',
    })
  })
})

describe('lock census: change availability', () => {
  it('names the kinds some candidate reaches by exactly one change', () => {
    const candidates = [
      LOCKED,
      SPLIT,
      SPLIT,
      FAR,
      REST_MOVED,
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
    const started = performance.now()
    let result = changeAvailability(RELOCKED, domain)
    for (let call = 1; call < 1_000; call += 1) result = changeAvailability(RELOCKED, domain)
    const elapsed = performance.now() - started
    console.log(
      `LOCK-CENSUS availability: 1,000 calls on 3,000 candidates in ${elapsed.toFixed(0)} ms`,
    )
    expect(result).toEqual(available('split_note', 'merge_notes', 'note_rest'))
    expect(elapsed).toBeLessThan(10_000)
  })
})

describe('lock census: the tally', () => {
  /**
   * A session with a draw and no change, a tenser change by the arc (Settled to Lift), a forced
   * bend one allowed change away that drew and could not change, a repeat, a re-lock by a Vary
   * step, a ties-only bend at a Vary step (Build to Edge), and a tenser kept phrase.
   */
  const FIRST = censusOfSession(
    [
      tensed(at(1, LOCKED), 'Settled'),
      tensed(kept(2, LOCKED, { rhythmChange: 'no_change_available' }), 'Settled'),
      tensed(changed(3, TURNED, 'note_rest', { tenserPhrase: true }), 'Lift'),
      tensed(bent(4, MOVED, { rhythmChange: 'no_change_available' }), 'Lift'),
      tensed(bent(5, MOVED, { repeat: true, rhythmChange: 'no_change_available' }), 'Lift'),
      tensed(bent(6, RELOCKED, { relock: true }), 'Build', 'Lift'),
      tensed(bent(7, RELOCKED_TIED), 'Edge', 'Build'),
      tensed(kept(8, RELOCKED, { tenserPhrase: true }), 'Edge'),
    ],
    RHYTHM_CHANGE_KINDS,
  )
  const SECOND = censusOfSession(EIGHT, RHYTHM_CHANGE_KINDS)

  /** Intent: a tally fed both sessions and four draws, two of which drew and found no change. */
  function tally(): LockCensusTally {
    const result = new LockCensusTally()
    result.addSession(FIRST)
    result.addSession(SECOND)
    const noChange = { drew: true, noChangeAvailable: true }
    result.addDraw(available('move_note_start'), RHYTHM_CHANGE_KINDS, noChange)
    result.addDraw(available(), RHYTHM_CHANGE_KINDS, noChange)
    result.addDraw(available('note_rest'), ['move_rest'], { drew: false, noChangeAvailable: false })
    result.addDraw(available(...RHYTHM_CHANGE_KINDS), RHYTHM_CHANGE_KINDS)
    return result
  }

  it('classes the first session with no mismatch', () => {
    expect(FIRST.counts.mismatches).toEqual([])
    expect(FIRST.phrases.map((entry) => entry.lockClass.kind)).toEqual([
      'locked',
      'kept',
      'change',
      'bend',
      'repeat',
      'relock',
      'bend',
      'kept',
    ])
  })

  it('gives the shares of the classified phrases, the draws, the tensions and the tension steps', () => {
    const figures = tally().figures()
    expect(JSON.parse(JSON.stringify(figures))).toEqual(figures)
    expect(figures).toEqual({
      sessions: 2,
      classifiedPhrases: 12,
      relocks: 1,
      repeats: 1,
      counts: {
        kept: 3,
        changesByKind: {
          move_note_start: 1,
          move_rest: 1,
          split_note: 1,
          merge_notes: 1,
          note_rest: 2,
        },
        bends: 3,
        bendsByReason: { 'tie-only': 1, 'disallowed-change': 0, other: 1, 'one-allowed-change': 1 },
      },
      shares: {
        kept: 0.25,
        changed: 0.5,
        changedByKind: {
          move_note_start: 1 / 12,
          move_rest: 1 / 12,
          split_note: 1 / 12,
          merge_notes: 1 / 12,
          note_rest: 2 / 12,
        },
        bent: 0.25,
        bentByReason: {
          'tie-only': 1 / 12,
          'disallowed-change': 0,
          other: 1 / 12,
          'one-allowed-change': 1 / 12,
        },
      },
      bentOneAllowedChangeAway: 1 / 3,
      drawn: {
        eligible: 12,
        drew: 8,
        share: 8 / 12,
        normal: { eligible: 10, drew: 7, share: 0.7 },
        tenser: { eligible: 2, drew: 1, share: 0.5 },
      },
      changedOfEligible: 0.5,
      noChange: {
        drew: 8,
        noChangeAvailable: { count: 2, share: 0.25 },
        noCandidate: { count: 1, share: 0.125 },
        candidatesFailed: { count: 1, share: 0.125 },
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
      byTension: {
        Settled: { phrases: 1, bends: 0, bendRate: 0 },
        Lift: { phrases: 2, bends: 1, bendRate: 0.5 },
        Build: { phrases: 7, bends: 1, bendRate: 1 / 7 },
        Edge: { phrases: 2, bends: 1, bendRate: 0.5 },
      },
      tensionSteps: {
        'Settled→Lift arc': { phrases: 1, bends: 0, bendRate: 0 },
        'Build→Edge vary': { phrases: 1, bends: 1, bendRate: 1 },
      },
      mismatches: { count: 0, first: [] },
    })
  })

  it('prints LOCK-CENSUS summary lines', () => {
    expect(tally().lines('Eighth Build')).toEqual(
      [
        '2 sessions, 12 phrases after phrase 1 classified, 1 re-locks, 1 repeats',
        'kept 25.0 %, changed 50.0 %, bent 25.0 % (tie-only 8.3 %, disallowed-change 0.0 %, ' +
          'other 8.3 %, one-allowed-change 8.3 %)',
        'changed by kind: move_note_start 8.3 %, move_rest 8.3 %, split_note 8.3 %, ' +
          'merge_notes 8.3 %, note_rest 16.7 %',
        '4 draws, no candidate: move_note_start 50.0 %, move_rest 75.0 %, split_note 75.0 %, ' +
          'merge_notes 75.0 %, note_rest 50.0 %, any allowed kind 50.0 %',
        'drew a change: 66.7 % of 12 eligible (normal 70.0 % of 10, tenser 50.0 % of 2), ' +
          'changed of eligible 50.0 %',
        'no change available: 2 of 8 that drew (25.0 %): no candidate 12.5 %, ' +
          'candidates failed 12.5 %',
        'bends one allowed change away: 1 of 3 (33.3 %)',
        'bend rate by tension: Settled 0.0 % of 1, Lift 50.0 % of 2, Build 14.3 % of 7, ' +
          'Edge 50.0 % of 2',
        'tension step Build→Edge vary: 1 phrases, bends 100.0 %',
        'tension step Settled→Lift arc: 1 phrases, bends 0.0 %',
        'mismatches: 0',
      ].map((line) => `LOCK-CENSUS [Eighth Build] ${line}`),
    )
  })

  it('reports null shares and dashes before anything is added', () => {
    const empty = new LockCensusTally()
    const figures = empty.figures()
    expect(figures.shares.kept).toBeNull()
    expect(figures.noCandidate.anyAllowedKind).toBeNull()
    expect(figures.drawn.share).toBeNull()
    expect(figures.noChange.noCandidate.share).toBeNull()
    expect(figures.bentOneAllowedChangeAway).toBeNull()
    expect(empty.lines('none')[1]).toBe(
      'LOCK-CENSUS [none] kept - %, changed - %, bent - % ' +
        '(tie-only - %, disallowed-change - %, other - %, one-allowed-change - %)',
    )
  })

  it('keeps the mismatch count and the first ten lines', () => {
    const result = new LockCensusTally()
    const broken = censusOfSession([at(1, LOCKED), at(2, LOCKED)], RHYTHM_CHANGE_KINDS)
    for (let session = 0; session < 11; session += 1) result.addSession(broken)
    const { mismatches } = result.figures()
    expect(mismatches.count).toBe(11)
    expect(mismatches.first).toHaveLength(10)
    expect(mismatches.first[0]).toMatch(/^session 1, phrase 2: /)
    expect(result.lines('broken').at(-1)).toBe('LOCK-CENSUS [broken] mismatches: 11')
  })

  it('rejects a draw read against an empty allowed list', () => {
    expect(() => new LockCensusTally().addDraw(available(), [])).toThrow(/allowed/)
  })
})
