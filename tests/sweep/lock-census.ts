/**
 * The lock census (measurement tooling, never product code): from the written bars of a session's
 * phrases, name how each phrase met the rhythm lock of the v3 master spec (C7.1-C7.5). Phrase 1 is
 * the locked rhythm; each later phrase keeps the locked bars, takes exactly one change of an
 * allowed kind, or takes a forced bend (anything else); a narrow-window step-down phrase re-locks.
 * Beside it, per draw, which kinds had a candidate one change away, and a tally turning many
 * sessions and draws into shares.
 *
 * The census reads written bars only, through the change kinds, bar keys and rhythm distance the
 * generator itself uses, so it classifies whatever produced the bars.
 */

import { RHYTHM_CHANGE_KINDS, type RhythmChangeKind } from '@/domain/generation/request-rhythm-lock'
import { measureBarKey, rhythmBarKey, rhythmStarts } from '@/domain/rhythm/rhythm-bars'
import { rhythmChangeBetween, type RhythmChange } from '@/domain/rhythm/rhythm-change-kinds'
import { rhythmDistance } from '@/domain/rhythm/rhythm-distance'
import type { RhythmBar } from '@/domain/rhythm/rhythm-types'

/** Why a phrase is a forced bend rather than a kept phrase or an allowed change. */
export type BendReason = 'tie-only' | 'disallowed-change' | 'other'

/** Every bend reason, in report order. */
export const BEND_REASONS: readonly BendReason[] = ['tie-only', 'disallowed-change', 'other']

/**
 * How a phrase after phrase 1 met the locked rhythm: kept it as written, took one allowed change,
 * or was bent (with its total edits from the locked rhythm and, for a single change of a kind not
 * allowed, that change).
 */
export type PhraseLockClass =
  | { readonly kind: 'kept' }
  | { readonly kind: 'change'; readonly change: RhythmChange }
  | {
      readonly kind: 'bend'
      readonly distance: number
      readonly reason: BendReason
      readonly change?: RhythmChange
    }

/** A phrase's class in a session: phrase 1 is the locked rhythm, a re-lock sets a new one. */
export type SessionPhraseClass =
  PhraseLockClass | { readonly kind: 'locked' } | { readonly kind: 'relock' }

/** One phrase of a session as written; `relock` marks the narrow-window step-down re-lock. */
export interface SessionPhraseRhythm {
  readonly phraseNumber: number
  readonly bars: readonly RhythmBar[]
  readonly relock?: boolean
}

/** The counts of one session's phrases after phrase 1. */
export interface LockCounts {
  readonly kept: number
  readonly changesByKind: Readonly<Record<RhythmChangeKind, number>>
  readonly bends: number
  readonly bendsByReason: Readonly<Record<BendReason, number>>
  readonly relocks: number
}

/** The census of one session: each phrase's class, in order, and the counts. */
export interface SessionLockCensus {
  readonly phrases: readonly {
    readonly phraseNumber: number
    readonly lockClass: SessionPhraseClass
  }[]
  readonly counts: LockCounts
}

/** Per kind, whether some candidate lay exactly one change of that kind from the locked bars. */
export type ChangeAvailability = Readonly<Record<RhythmChangeKind, boolean>>

/** The measures of a phrase the lock compares. */
const MEASURE_COUNT = 4

/**
 * The measures one change can touch, as bit masks of differing measures: one measure, or a
 * gesture measure (1 or 2) and its answer (3 or 4).
 */
const CHANGE_SPANS: ReadonlySet<number> = new Set([0b0001, 0b0010, 0b0100, 0b1000, 0b0101, 0b1010])

/** Intent: reject a rhythm that is not four measures, which only a caller bug can pass. */
function requireFourMeasures(bars: readonly RhythmBar[], what: string): void {
  if (bars.length !== MEASURE_COUNT)
    throw new Error(`${what} has ${bars.length} measures; the rhythm lock compares four.`)
}

/** Intent: reject an allowed list naming anything but the five change kinds. */
function requireKnownKinds(allowed: readonly RhythmChangeKind[]): void {
  for (const kind of allowed)
    if (!RHYTHM_CHANGE_KINDS.includes(kind))
      throw new Error(`Unknown rhythm change kind "${String(kind)}" in an allowed list.`)
}

/** Intent: a record holding, under every change kind, the value computed for that kind. */
function perKind<T>(value: (kind: RhythmChangeKind) => T): Record<RhythmChangeKind, T> {
  return Object.fromEntries(RHYTHM_CHANGE_KINDS.map((kind) => [kind, value(kind)])) as Record<
    RhythmChangeKind,
    T
  >
}

/** Intent: a record holding, under every bend reason, the value computed for that reason. */
function perReason<T>(value: (reason: BendReason) => T): Record<BendReason, T> {
  return Object.fromEntries(BEND_REASONS.map((reason) => [reason, value(reason)])) as Record<
    BendReason,
    T
  >
}

/**
 * Intent: how one phrase met the locked rhythm. Equal bar keys are `kept`; exactly one change
 * (C7.3) of an allowed kind is a `change`; anything else is a `bend` at the total edits between
 * the start lists: `tie-only` when the starts are equal (written with other ties, distance 0),
 * `disallowed-change` for a single change of a kind the list leaves out, else `other`.
 */
export function classifyLockedPhrase(
  locked: readonly RhythmBar[],
  phrase: readonly RhythmBar[],
  allowed: readonly RhythmChangeKind[],
): PhraseLockClass {
  requireFourMeasures(locked, 'The locked rhythm')
  requireFourMeasures(phrase, 'The phrase')
  requireKnownKinds(allowed)
  if (rhythmBarKey(locked) === rhythmBarKey(phrase)) return { kind: 'kept' }
  const change = rhythmChangeBetween(locked, phrase)
  if (change && allowed.includes(change.kind)) return { kind: 'change', change }
  const distance = rhythmDistance(rhythmStarts(locked), rhythmStarts(phrase))
  if (change) return { kind: 'bend', distance, reason: 'disallowed-change', change }
  return { kind: 'bend', distance, reason: distance === 0 ? 'tie-only' : 'other' }
}

/** Intent: reject a session whose phrases are not numbered 1, 2, 3 ... with no re-lock first. */
function requireSession(phrases: readonly SessionPhraseRhythm[]): void {
  if (phrases[0]?.phraseNumber !== 1)
    throw new Error('A session census starts at phrase 1, the locked rhythm.')
  if (phrases[0].relock === true)
    throw new Error('Phrase 1 is the locked rhythm; it cannot re-lock.')
  phrases.forEach((entry, index) => {
    if (entry.phraseNumber !== index + 1)
      throw new Error(
        `Phrase at position ${index} has number ${entry.phraseNumber}, not ${index + 1}.`,
      )
  })
}

/**
 * Intent: the census of one session. Phrase 1's bars are the locked rhythm and it is `locked`; a
 * phrase marked `relock` is `relock` and its bars are the locked rhythm from the next phrase on;
 * every other phrase is classified against the locked rhythm of its moment. Throws unless the
 * phrases are numbered 1, 2, 3 ... in order.
 */
export function censusOfSession(
  phrases: readonly SessionPhraseRhythm[],
  allowed: readonly RhythmChangeKind[],
): SessionLockCensus {
  requireSession(phrases)
  requireKnownKinds(allowed)
  const changesByKind = perKind(() => 0)
  const bendsByReason = perReason(() => 0)
  let [kept, bends, relocks] = [0, 0, 0]
  let locked = phrases[0]!.bars
  requireFourMeasures(locked, 'Phrase 1')
  const classes = phrases.map((entry) => {
    let lockClass: SessionPhraseClass
    if (entry.phraseNumber === 1) lockClass = { kind: 'locked' }
    else if (entry.relock === true) {
      requireFourMeasures(entry.bars, `Re-locking phrase ${entry.phraseNumber}`)
      locked = entry.bars
      relocks += 1
      lockClass = { kind: 'relock' }
    } else {
      lockClass = classifyLockedPhrase(locked, entry.bars, allowed)
      if (lockClass.kind === 'kept') kept += 1
      else if (lockClass.kind === 'change') changesByKind[lockClass.change.kind] += 1
      else {
        bends += 1
        bendsByReason[lockClass.reason] += 1
      }
    }
    return { phraseNumber: entry.phraseNumber, lockClass }
  })
  return { phrases: classes, counts: { kept, changesByKind, bends, bendsByReason, relocks } }
}

/** Measure keys by bars, for frozen bars only, so a domain is keyed once across many draws. */
const measureKeysByBars = new WeakMap<readonly RhythmBar[], readonly string[]>()

/** Intent: the measure keys of a rhythm, cached when its bars are frozen (and so cannot change). */
function measureKeysOf(bars: readonly RhythmBar[]): readonly string[] {
  const cached = measureKeysByBars.get(bars)
  if (cached) return cached
  requireFourMeasures(bars, 'A candidate')
  const keys = bars.map(measureBarKey)
  if (Object.isFrozen(bars)) measureKeysByBars.set(bars, keys)
  return keys
}

/**
 * Intent: per kind, whether some candidate differs from the locked bars by exactly one change of
 * that kind. One change leaves at least two measures written as locked, so a candidate is first
 * screened by which measures differ (one, or a gesture measure and its answer) and identical bars
 * are compared once; only the survivors go through the full change test. The scan is linear in the
 * candidates and stops once every kind is found; frozen candidate bars are keyed once and reused.
 */
export function changeAvailability(
  locked: readonly RhythmBar[],
  candidates: readonly (readonly RhythmBar[])[],
): ChangeAvailability {
  requireFourMeasures(locked, 'The locked rhythm')
  const lockedKeys = locked.map(measureBarKey)
  const available = perKind(() => false)
  const compared = new Set<string>()
  let missing = RHYTHM_CHANGE_KINDS.length
  for (const bars of candidates) {
    const keys = measureKeysOf(bars)
    let differing = 0
    for (let index = 0; index < MEASURE_COUNT; index += 1)
      if (keys[index] !== lockedKeys[index]) differing |= 1 << index
    if (!CHANGE_SPANS.has(differing)) continue
    const key = keys.join('|')
    if (compared.has(key)) continue
    compared.add(key)
    const change = rhythmChangeBetween(locked, bars)
    if (!change || available[change.kind]) continue
    available[change.kind] = true
    missing -= 1
    if (missing === 0) break
  }
  return Object.freeze(available)
}

/** The tally's figures, JSON-serialisable; a share is null when its denominator is zero. */
export interface LockCensusFigures {
  readonly sessions: number
  /** Phrases after phrase 1 that are neither re-locks: the denominator of the phrase shares. */
  readonly classifiedPhrases: number
  readonly relocks: number
  readonly counts: Omit<LockCounts, 'relocks'>
  readonly shares: {
    readonly kept: number | null
    readonly changed: number | null
    readonly changedByKind: Readonly<Record<RhythmChangeKind, number | null>>
    readonly bent: number | null
    readonly bentByReason: Readonly<Record<BendReason, number | null>>
  }
  readonly draws: number
  readonly noCandidate: {
    readonly byKind: Readonly<Record<RhythmChangeKind, number | null>>
    readonly anyAllowedKind: number | null
  }
}

/** Intent: a ratio, or null when its denominator is zero. */
function ratio(numerator: number, denominator: number): number | null {
  return denominator === 0 ? null : numerator / denominator
}

/** Intent: a share as a percentage to one decimal, or a dash when it is null. */
function percent(share: number | null): string {
  return `${share === null ? '-' : (share * 100).toFixed(1)} %`
}

/** Intent: one share per change kind, as `kind 12.5 %`, comma-separated. */
function kindShares(record: Readonly<Record<RhythmChangeKind, number | null>>): string {
  return RHYTHM_CHANGE_KINDS.map((kind) => `${kind} ${percent(record[kind])}`).join(', ')
}

/** The running lock census of many sessions and draws, fed one at a time. */
export class LockCensusTally {
  private sessions = 0
  private kept = 0
  private bends = 0
  private relocks = 0
  private readonly changes = perKind(() => 0)
  private readonly bendReasons = perReason(() => 0)
  private draws = 0
  private readonly missingByKind = perKind(() => 0)
  private missingAnyAllowed = 0

  /** Intent: add one session's census. */
  addSession(census: SessionLockCensus): void {
    const { counts } = census
    this.sessions += 1
    this.kept += counts.kept
    this.bends += counts.bends
    this.relocks += counts.relocks
    for (const kind of RHYTHM_CHANGE_KINDS) this.changes[kind] += counts.changesByKind[kind]
    for (const reason of BEND_REASONS) this.bendReasons[reason] += counts.bendsByReason[reason]
  }

  /**
   * Intent: add one draw's availability, read against the allowed list it was drawn with. Throws
   * on an empty list: with nothing allowed the lock is strict and no draw happens.
   */
  addDraw(availability: ChangeAvailability, allowed: readonly RhythmChangeKind[]): void {
    if (allowed.length === 0)
      throw new Error('A draw needs a non-empty allowed list; with none, nothing is drawn.')
    requireKnownKinds(allowed)
    this.draws += 1
    for (const kind of RHYTHM_CHANGE_KINDS) if (!availability[kind]) this.missingByKind[kind] += 1
    if (!allowed.some((kind) => availability[kind])) this.missingAnyAllowed += 1
  }

  /** Intent: the figures so far: counts, shares of the classified phrases, shares of the draws. */
  figures(): LockCensusFigures {
    const changed = RHYTHM_CHANGE_KINDS.reduce((sum, kind) => sum + this.changes[kind], 0)
    const classified = this.kept + changed + this.bends
    /** Intent: a count's share of the classified phrases. */
    const share = (count: number): number | null => ratio(count, classified)
    return {
      sessions: this.sessions,
      classifiedPhrases: classified,
      relocks: this.relocks,
      counts: {
        kept: this.kept,
        changesByKind: { ...this.changes },
        bends: this.bends,
        bendsByReason: { ...this.bendReasons },
      },
      shares: {
        kept: share(this.kept),
        changed: share(changed),
        changedByKind: perKind((kind) => share(this.changes[kind])),
        bent: share(this.bends),
        bentByReason: perReason((reason) => share(this.bendReasons[reason])),
      },
      draws: this.draws,
      noCandidate: {
        byKind: perKind((kind) => ratio(this.missingByKind[kind], this.draws)),
        anyAllowedKind: ratio(this.missingAnyAllowed, this.draws),
      },
    }
  }

  /** Intent: the readable summary of the figures, every line prefixed `LOCK-CENSUS [label]`. */
  lines(label: string): string[] {
    const figures = this.figures()
    const { shares, noCandidate } = figures
    const reasons = BEND_REASONS.map(
      (reason) => `${reason} ${percent(shares.bentByReason[reason])}`,
    ).join(', ')
    return [
      `${figures.sessions} sessions, ${figures.classifiedPhrases} phrases after phrase 1 classified, ${figures.relocks} re-locks`,
      `kept ${percent(shares.kept)}, changed ${percent(shares.changed)}, bent ${percent(shares.bent)} (${reasons})`,
      `changed by kind: ${kindShares(shares.changedByKind)}`,
      `${figures.draws} draws, no candidate: ${kindShares(noCandidate.byKind)}, any allowed kind ${percent(noCandidate.anyAllowedKind)}`,
    ].map((line) => `LOCK-CENSUS [${label}] ${line}`)
  }
}
