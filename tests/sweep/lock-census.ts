/**
 * The lock census (measurement tooling, never product code): name how each phrase of a session met
 * the rhythm lock of the v3 master spec (C7.1-C7.5). Phrase 1 is the locked rhythm; each later
 * phrase is classed by the lock outcome its provenance records (the locked bars, a drawn change, a
 * forced bend), a re-lock by the session history's own mark, and its written bars only cross-check
 * that record: a disagreement is a mismatch, reported and never thrown. Beside it, per draw, which
 * kinds had a candidate one change away; lock-census-tally.ts turns many sessions and draws into
 * shares.
 *
 * The bars are read through the change kinds, bar keys and rhythm distance the generator itself
 * uses (`classifyLockedPhrase`), so the cross-check is the generator's own measure.
 */

import type { TensionArc } from '@/domain/controls/generation-controls'
import type {
  RhythmChangeRecord,
  RhythmLockOutcome,
} from '@/domain/generation/orchestration/orchestration-types'
import { RHYTHM_CHANGE_KINDS, type RhythmChangeKind } from '@/domain/generation/request-rhythm-lock'
import { measureBarKey, rhythmBarKey, rhythmStarts } from '@/domain/rhythm/rhythm-bars'
import { rhythmChangeBetween, type RhythmChange } from '@/domain/rhythm/rhythm-change-kinds'
import { rhythmDistance } from '@/domain/rhythm/rhythm-distance'
import type { RhythmBar } from '@/domain/rhythm/rhythm-types'

/** Why the bars alone read a phrase as a bend rather than kept or one allowed change. */
export type BarsBendReason = 'tie-only' | 'disallowed-change' | 'other'

/**
 * Why a forced bend is one: what its bars read, or `one-allowed-change` when they read as one
 * change of an allowed kind (a forced bend that happens to land one allowed change away).
 */
export type BendReason = BarsBendReason | 'one-allowed-change'

/** Every bend reason, in report order. */
export const BEND_REASONS: readonly BendReason[] = [
  'tie-only',
  'disallowed-change',
  'other',
  'one-allowed-change',
]

/**
 * How a phrase's bars meet the locked rhythm: kept as written, one allowed change, or bent (with
 * its total edits from the locked rhythm and, for a single change of a kind not allowed, that
 * change).
 */
export type PhraseLockClass =
  | { readonly kind: 'kept' }
  | { readonly kind: 'change'; readonly change: RhythmChange }
  | {
      readonly kind: 'bend'
      readonly distance: number
      readonly reason: BarsBendReason
      readonly change?: RhythmChange
    }

/**
 * A phrase's class in a session. Phrase 1 is the locked rhythm; a repeat sounds an earlier phrase
 * again and is not classified; a re-lock sets a new locked rhythm; every other phrase is kept,
 * changed (by the kind its record names) or bent, as its provenance says, or `unreadable` when its
 * provenance names no class (a mismatch).
 */
export type CensusClass =
  | { readonly kind: 'locked' }
  | { readonly kind: 'repeat' }
  | { readonly kind: 'relock' }
  | { readonly kind: 'kept' }
  | { readonly kind: 'change'; readonly changeKind: RhythmChangeKind }
  | {
      readonly kind: 'bend'
      readonly distance: number
      readonly reason: BendReason
      readonly change?: RhythmChange
    }
  | { readonly kind: 'unreadable' }

/** A Vary settings tension step that landed on a phrase: the tension it stepped from and to. */
export interface VaryTensionStep {
  readonly from: string
  readonly to: string
}

/** One phrase that sounded, as the census reads it: its marks, its bars, its record, its tension. */
export interface CensusPhrase {
  readonly phraseNumber: number
  /** The phrase is a repeat (origin `repeat`): it carries the repeated phrase's record. */
  readonly repeat: boolean
  /** The session history's re-lock mark (SessionPhrase.relock). */
  readonly relock: boolean
  /** The written bars it sounded with (its provenance's rhythm candidate). */
  readonly bars: readonly RhythmBar[]
  readonly rhythmLockOutcome?: RhythmLockOutcome
  readonly rhythmChange?: RhythmChangeRecord
  /** The request's lock group tenser flag. */
  readonly tenserPhrase: boolean
  /** The tension in effect for the phrase. */
  readonly tension: TensionArc
  /** A Vary settings tension step that landed on this phrase, when one did. */
  readonly varyTensionStep?: VaryTensionStep
}

/** One phrase of a session's census: its class, what it drew, and its tension. */
export interface CensusEntry {
  readonly phraseNumber: number
  readonly lockClass: CensusClass
  /** The bars' own reading against the locked rhythm in effect, for a phrase classed from them. */
  readonly bars?: PhraseLockClass
  /** It recorded a draw (a change kind or "no change available"); never for a repeat. */
  readonly drew: boolean
  readonly noChangeAvailable: boolean
  readonly tension: TensionArc
  /** The previous phrase's tension; none for phrase 1. */
  readonly previousTension?: TensionArc
  readonly tenserPhrase: boolean
  readonly varyTensionStep?: VaryTensionStep
}

/** The counts of one session's phrases. */
export interface LockCounts {
  readonly kept: number
  readonly changesByKind: Readonly<Record<RhythmChangeKind, number>>
  readonly bends: number
  readonly bendsByReason: Readonly<Record<BendReason, number>>
  readonly relocks: number
  readonly repeats: number
  /** Phrases that could draw: phrase 2 on, not a repeat nor a re-lock, some kind allowed. */
  readonly eligible: number
  readonly eligibleTenser: number
  /** Eligible phrases that drew, and of them the tenser ones and those with no change available. */
  readonly drew: number
  readonly drewTenser: number
  readonly noChangeAvailable: number
  /** One readable line per phrase whose record and bars disagree, or whose record is malformed. */
  readonly mismatches: readonly string[]
}

/** The census of one session: each phrase's entry, in order, and the counts. */
export interface SessionLockCensus {
  readonly phrases: readonly CensusEntry[]
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
export function requireKnownKinds(allowed: readonly RhythmChangeKind[]): void {
  for (const kind of allowed)
    if (!RHYTHM_CHANGE_KINDS.includes(kind))
      throw new Error(`Unknown rhythm change kind "${String(kind)}" in an allowed list.`)
}

/** Intent: a record holding, under every change kind, the value computed for that kind. */
export function perKind<T>(value: (kind: RhythmChangeKind) => T): Record<RhythmChangeKind, T> {
  return Object.fromEntries(RHYTHM_CHANGE_KINDS.map((kind) => [kind, value(kind)])) as Record<
    RhythmChangeKind,
    T
  >
}

/** Intent: a record holding, under every bend reason, the value computed for that reason. */
export function perReason<T>(value: (reason: BendReason) => T): Record<BendReason, T> {
  return Object.fromEntries(BEND_REASONS.map((reason) => [reason, value(reason)])) as Record<
    BendReason,
    T
  >
}

/**
 * Intent: how one phrase's bars meet the locked rhythm. Equal bar keys are `kept`; exactly one
 * change (C7.3) of an allowed kind is a `change`; anything else is a `bend` at the total edits
 * between the start lists: `tie-only` when the starts are equal (written with other ties, distance
 * 0), `disallowed-change` for a single change of a kind the list leaves out, else `other`.
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
function requireSession(phrases: readonly CensusPhrase[]): void {
  if (phrases[0]?.phraseNumber !== 1)
    throw new Error('A session census starts at phrase 1, the locked rhythm.')
  if (phrases[0].relock) throw new Error('Phrase 1 is the locked rhythm; it cannot re-lock.')
  phrases.forEach((entry, index) => {
    if (entry.phraseNumber !== index + 1)
      throw new Error(
        `Phrase at position ${index} has number ${entry.phraseNumber}, not ${index + 1}.`,
      )
  })
}

/** Intent: whether a phrase's record names a change kind (not "no change available"). */
function isChangeKind(record: RhythmChangeRecord | undefined): record is RhythmChangeKind {
  return record !== undefined && record !== 'no_change_available'
}

/** Intent: the bars' reading in words, for a mismatch line. */
function barsInWords(reading: PhraseLockClass): string {
  if (reading.kind === 'kept') return 'the locked bars'
  if (reading.kind === 'change') return `one ${reading.change.kind} change`
  return `a ${reading.reason} bend at distance ${reading.distance}`
}

/** Intent: a `locked_bars` phrase: kept; its record names no kind and its bars are the locked ones. */
function readKept(entry: CensusPhrase, bars: PhraseLockClass, problems: string[]): CensusClass {
  if (isChangeKind(entry.rhythmChange))
    problems.push(`locked_bars recorded beside the change kind ${entry.rhythmChange}`)
  if (bars.kind !== 'kept') problems.push(`locked_bars, but the bars read ${barsInWords(bars)}`)
  return { kind: 'kept' }
}

/**
 * Intent: a `rhythm_change` phrase: changed by the kind its record names, which the allowed list
 * holds and the bars read as exactly one change of; with no kind recorded it is `unreadable`.
 */
function readChange(
  entry: CensusPhrase,
  bars: PhraseLockClass,
  allowed: readonly RhythmChangeKind[],
  problems: string[],
): CensusClass {
  const kind = entry.rhythmChange
  if (!isChangeKind(kind)) {
    problems.push(`rhythm_change recorded beside ${kind ?? 'no change kind'}`)
    return { kind: 'unreadable' }
  }
  if (!allowed.includes(kind)) problems.push(`rhythm_change of ${kind}, a kind not allowed`)
  if (bars.kind !== 'change' || bars.change.kind !== kind)
    problems.push(`rhythm_change of ${kind}, but the bars read ${barsInWords(bars)}`)
  return { kind: 'change', changeKind: kind }
}

/**
 * Intent: a `forced_bend` phrase: a bend with its bars' distance and reason, `one-allowed-change`
 * when they read as one allowed change; bars reading as the locked ones, or a kind recorded, is a
 * mismatch.
 */
function readBend(
  entry: CensusPhrase,
  locked: readonly RhythmBar[],
  bars: PhraseLockClass,
  problems: string[],
): CensusClass {
  if (isChangeKind(entry.rhythmChange))
    problems.push(`forced_bend recorded beside the change kind ${entry.rhythmChange}`)
  if (bars.kind === 'bend') return bars
  if (bars.kind === 'change') {
    const distance = rhythmDistance(rhythmStarts(locked), rhythmStarts(entry.bars))
    return { kind: 'bend', distance, reason: 'one-allowed-change', change: bars.change }
  }
  problems.push('forced_bend, but the bars are the locked ones')
  return { kind: 'bend', distance: 0, reason: 'other' }
}

/** A phrase's class and, for a phrase classed from its record, its bars' reading. */
interface PhraseReading {
  readonly lockClass: CensusClass
  readonly bars?: PhraseLockClass
}

/**
 * Intent: one phrase's class: phrase 1 is `locked` (holding no lock outcome), a repeat `repeat`, a
 * marked phrase `relock`, any other by the lock outcome its provenance records, cross-checked
 * against its bars read from the locked rhythm in effect.
 */
function readPhrase(
  entry: CensusPhrase,
  locked: readonly RhythmBar[],
  allowed: readonly RhythmChangeKind[],
  problems: string[],
): PhraseReading {
  if (entry.phraseNumber === 1) {
    if (entry.rhythmLockOutcome !== undefined)
      problems.push(`the locked phrase holds the lock outcome ${entry.rhythmLockOutcome}`)
    return { lockClass: { kind: 'locked' } }
  }
  if (entry.repeat) return { lockClass: { kind: 'repeat' } }
  if (entry.relock) {
    requireFourMeasures(entry.bars, `Re-locking phrase ${entry.phraseNumber}`)
    return { lockClass: { kind: 'relock' } }
  }
  const bars = classifyLockedPhrase(locked, entry.bars, allowed)
  switch (entry.rhythmLockOutcome) {
    case 'locked_bars':
      return { lockClass: readKept(entry, bars, problems), bars }
    case 'rhythm_change':
      return { lockClass: readChange(entry, bars, allowed, problems), bars }
    case 'forced_bend':
      return { lockClass: readBend(entry, locked, bars, problems), bars }
  }
  problems.push('no lock outcome recorded although the lock holds bars')
  return { lockClass: { kind: 'unreadable' }, bars }
}

/** What a phrase drew, and whether it could draw at all. */
interface PhraseDraw {
  readonly eligible: boolean
  readonly drew: boolean
  readonly noChangeAvailable: boolean
}

/**
 * Intent: what a phrase drew. A repeat carries the repeated phrase's record, so draws nothing of
 * its own; a phrase could draw from phrase 2 on, unless it re-locks or nothing is allowed, and a
 * record of a draw on a phrase that could not draw is a mismatch.
 */
function drawOf(
  entry: CensusPhrase,
  allowed: readonly RhythmChangeKind[],
  problems: string[],
): PhraseDraw {
  if (entry.repeat) return { eligible: false, drew: false, noChangeAvailable: false }
  const drew = entry.rhythmChange !== undefined
  const ineligible =
    entry.phraseNumber === 1
      ? 'the locked phrase'
      : entry.relock
        ? 'a re-lock'
        : allowed.length === 0
          ? 'an empty allowed list'
          : undefined
  if (drew && ineligible !== undefined)
    problems.push(`recorded a draw (${entry.rhythmChange}) on ${ineligible}`)
  return {
    eligible: ineligible === undefined,
    drew,
    noChangeAvailable: entry.rhythmChange === 'no_change_available',
  }
}

/** A session's counts while they are being added up. */
export interface RunningCounts {
  kept: number
  readonly changesByKind: Record<RhythmChangeKind, number>
  bends: number
  readonly bendsByReason: Record<BendReason, number>
  relocks: number
  repeats: number
  eligible: number
  eligibleTenser: number
  drew: number
  drewTenser: number
  noChangeAvailable: number
}

/** The plain counts of a session, beside the two per-kind and per-reason records. */
export const SCALAR_COUNTS = [
  'kept',
  'bends',
  'relocks',
  'repeats',
  'eligible',
  'eligibleTenser',
  'drew',
  'drewTenser',
  'noChangeAvailable',
] as const

/** Intent: add one session's counts to running counts. */
export function addCounts(into: RunningCounts, from: LockCounts): void {
  for (const key of SCALAR_COUNTS) into[key] += from[key]
  for (const kind of RHYTHM_CHANGE_KINDS) into.changesByKind[kind] += from.changesByKind[kind]
  for (const reason of BEND_REASONS) into.bendsByReason[reason] += from.bendsByReason[reason]
}

/** Intent: counts at zero. */
export function emptyCounts(): RunningCounts {
  return {
    kept: 0,
    changesByKind: perKind(() => 0),
    bends: 0,
    bendsByReason: perReason(() => 0),
    relocks: 0,
    repeats: 0,
    eligible: 0,
    eligibleTenser: 0,
    drew: 0,
    drewTenser: 0,
    noChangeAvailable: 0,
  }
}

/** Intent: count one phrase's class, and its draw when it could draw. */
function countPhrase(
  counts: RunningCounts,
  lockClass: CensusClass,
  tenser: boolean,
  draw: PhraseDraw,
): void {
  if (lockClass.kind === 'kept') counts.kept += 1
  else if (lockClass.kind === 'change') counts.changesByKind[lockClass.changeKind] += 1
  else if (lockClass.kind === 'relock') counts.relocks += 1
  else if (lockClass.kind === 'repeat') counts.repeats += 1
  else if (lockClass.kind === 'bend') {
    counts.bends += 1
    counts.bendsByReason[lockClass.reason] += 1
  }
  if (!draw.eligible) return
  counts.eligible += 1
  if (tenser) counts.eligibleTenser += 1
  if (!draw.drew) return
  counts.drew += 1
  if (tenser) counts.drewTenser += 1
  if (draw.noChangeAvailable) counts.noChangeAvailable += 1
}

/**
 * Intent: the census of one session. Phrase 1's bars are the locked rhythm; a phrase marked as
 * re-locking is `relock` and its bars are the locked rhythm from the next phrase on; a repeat is
 * counted only; every other phrase is classed by its provenance's lock outcome and cross-checked
 * against the locked rhythm of its moment. Each phrase whose record and bars disagree, or whose
 * record is malformed, adds one mismatch line. `allowed` may be empty (the strict lock). Throws
 * unless the phrases are numbered 1, 2, 3 ... in order, phrase 1 not a re-lock, four measures each.
 */
export function censusOfSession(
  phrases: readonly CensusPhrase[],
  allowed: readonly RhythmChangeKind[],
): SessionLockCensus {
  requireSession(phrases)
  requireKnownKinds(allowed)
  let locked = phrases[0]!.bars
  requireFourMeasures(locked, 'Phrase 1')
  const counts = emptyCounts()
  const mismatches: string[] = []
  const entries = phrases.map((entry, index): CensusEntry => {
    const problems: string[] = []
    const { lockClass, bars } = readPhrase(entry, locked, allowed, problems)
    if (lockClass.kind === 'relock') locked = entry.bars
    const draw = drawOf(entry, allowed, problems)
    countPhrase(counts, lockClass, entry.tenserPhrase, draw)
    if (problems.length > 0) mismatches.push(`phrase ${entry.phraseNumber}: ${problems.join('; ')}`)
    const previous = phrases[index - 1]
    return {
      phraseNumber: entry.phraseNumber,
      lockClass,
      ...(bars === undefined ? {} : { bars }),
      drew: draw.drew,
      noChangeAvailable: draw.noChangeAvailable,
      tension: entry.tension,
      ...(previous === undefined ? {} : { previousTension: previous.tension }),
      tenserPhrase: entry.tenserPhrase,
      ...(entry.varyTensionStep === undefined ? {} : { varyTensionStep: entry.varyTensionStep }),
    }
  })
  return { phrases: entries, counts: { ...counts, mismatches } }
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
