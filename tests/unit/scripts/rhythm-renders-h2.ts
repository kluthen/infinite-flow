/**
 * The choices behind the v3.2 H2 renders (allowed rhythm changes): the real rhythm domain the
 * generator builds for the Pop song preset's rhythm settings, a locked rhythm of it that offers as
 * many of the five change kinds as possible among the domain's other candidates (and, when it
 * lacks some that other locked rhythms offer, further locked rhythms for those), and for each kind
 * a candidate one change away. Test tooling: the render script loads it through Vite's
 * runnerImport, so it imports by relative path; nothing in the app reads it.
 */

import type { TensionArc } from '../../../src/domain/controls/generation-controls'
import {
  RHYTHM_CHANGE_KINDS,
  type RhythmChangeKind,
} from '../../../src/domain/generation/request-rhythm-lock'
import { builtInPreset } from '../../../src/domain/presets/built-in-presets'
import { keyRhythmCandidates } from '../../../src/domain/rhythm/rhythm-bars'
import {
  rhythmChangeBetween,
  type RhythmChange,
} from '../../../src/domain/rhythm/rhythm-change-kinds'
import {
  isNoLegalRhythmPlan,
  makeRhythmCandidateDomain,
} from '../../../src/domain/rhythm/rhythm-planner'
import type {
  BarIndex,
  RhythmCandidate,
  RhythmExpansionInput,
} from '../../../src/domain/rhythm/rhythm-types'

/** The rhythm settings H2 uses, with the preset they are read from. */
export interface H2Setting extends RhythmExpansionInput {
  readonly presetName: string
  readonly tensionArc: TensionArc
}

/** One kind's change from the locked rhythm: the changed candidate and the change itself. */
export interface ChangePick {
  readonly candidate: RhythmCandidate
  readonly change: RhythmChange
}

/** One locked rhythm of the plan and the change of each kind it is used for. */
export interface LockPlan {
  readonly locked: RhythmCandidate
  readonly changes: ReadonlyMap<RhythmChangeKind, ChangePick>
}

/**
 * The H2 choice: the domain's size, the locked rhythms (the first offering the most kinds, the
 * others only for kinds the earlier ones lack) and the kinds no candidate offers.
 */
export interface H2Plan {
  readonly setting: H2Setting
  readonly domainSize: number
  readonly locks: readonly LockPlan[]
  readonly missing: readonly RhythmChangeKind[]
}

/** The measures one change can touch: one measure, or a gesture measure and its answer. */
const GROUPINGS: readonly (readonly BarIndex[])[] = [[0], [1], [2], [3], [0, 2], [1, 3]]

/** Intent: the Pop song preset's rhythm settings, read from the app's built-in presets. */
export function popSongRhythmSetting(): H2Setting {
  const preset = builtInPreset('pop-song')
  const { noteDensity, rhythmicVariety, silenceDensity, syncopation, tension } = preset.controls
  return {
    presetName: preset.name,
    noteDensity,
    rhythmicVariety,
    silenceDensity,
    syncopation,
    tensionArc: tension,
  }
}

/** Intent: the whole rhythm domain of a setting, in domain order; crashes when it has none. */
export function drainDomain(setting: RhythmExpansionInput): readonly RhythmCandidate[] {
  const result = makeRhythmCandidateDomain(setting)
  if (isNoLegalRhythmPlan(result)) throw new Error('The H2 setting has no rhythm domain.')
  return Object.freeze([...result.candidates()])
}

/** Intent: whether a change touches exactly the measures of a grouping. */
function touchesExactly(change: RhythmChange, grouping: readonly BarIndex[]): boolean {
  return (
    change.measures.length === grouping.length &&
    change.measures.every((measure, index) => measure === grouping[index])
  )
}

/**
 * Intent: the candidate positions grouped by how their measures outside `grouping` are written.
 * Two candidates differing by a change confined to `grouping` always fall in one group.
 */
function bucketsOutside(
  measureKeys: readonly (readonly string[])[],
  grouping: readonly BarIndex[],
): readonly (readonly number[])[] {
  const buckets = new Map<string, number[]>()
  measureKeys.forEach((keys, position) => {
    const outside = keys.filter((_, measure) => !grouping.includes(measure as BarIndex)).join('|')
    const bucket = buckets.get(outside)
    if (bucket) bucket.push(position)
    else buckets.set(outside, [position])
  })
  return [...buckets.values()]
}

/** Intent: whether a change pick is preferred to another: one measure first, then domain order. */
function preferred(next: ChangePick, held: ChangePick | undefined): boolean {
  if (held === undefined) return true
  const nextRepeated = next.change.form === 'repeated' ? 1 : 0
  const heldRepeated = held.change.form === 'repeated' ? 1 : 0
  if (nextRepeated !== heldRepeated) return nextRepeated < heldRepeated
  return next.candidate.candidateIndex < held.candidate.candidateIndex
}

/**
 * Intent: for every candidate of a domain, the preferred change of each kind it offers among the
 * domain's other candidates. Only pairs written alike outside a grouping are compared, and a change
 * counts only for the grouping it touches.
 */
export function changesOffered(
  candidates: readonly RhythmCandidate[],
): readonly ReadonlyMap<RhythmChangeKind, ChangePick>[] {
  const measureKeys = keyRhythmCandidates(candidates).keys.map((key) => key.split('|'))
  const offered = candidates.map(() => new Map<RhythmChangeKind, ChangePick>())
  for (const grouping of GROUPINGS)
    for (const bucket of bucketsOutside(measureKeys, grouping))
      for (const locked of bucket)
        addBucketChanges(candidates, grouping, bucket, locked, offered[locked]!)
  return offered
}

/**
 * Intent: add to `into` the preferred change of each kind, touching exactly `grouping`, from the
 * locked candidate to another candidate of its bucket.
 */
function addBucketChanges(
  candidates: readonly RhythmCandidate[],
  grouping: readonly BarIndex[],
  bucket: readonly number[],
  locked: number,
  into: Map<RhythmChangeKind, ChangePick>,
): void {
  for (const other of bucket) {
    if (locked === other) continue
    const change = rhythmChangeBetween(candidates[locked]!.bars, candidates[other]!.bars)
    if (!change || !touchesExactly(change, grouping)) continue
    const pick = { candidate: candidates[other]!, change }
    if (preferred(pick, into.get(change.kind))) into.set(change.kind, pick)
  }
}

/** Intent: the kinds of `kinds` an offer holds, and how many of them in one measure. */
function coverage(
  offer: ReadonlyMap<RhythmChangeKind, ChangePick>,
  kinds: readonly RhythmChangeKind[],
): { readonly kinds: number; readonly oneMeasure: number } {
  const held = kinds.flatMap((kind) => {
    const pick = offer.get(kind)
    return pick === undefined ? [] : [pick]
  })
  return {
    kinds: held.length,
    oneMeasure: held.filter((pick) => pick.change.form === 'one_measure').length,
  }
}

/**
 * Intent: the position of the candidate whose offer covers the most of `kinds`, then the most
 * kinds overall, then the most of `kinds` in one measure, then first in domain order.
 */
function bestCover(
  offered: readonly ReadonlyMap<RhythmChangeKind, ChangePick>[],
  kinds: readonly RhythmChangeKind[],
): number {
  let best = 0
  let bestScore = coverage(offered[0]!, kinds)
  offered.forEach((offer, index) => {
    const score = coverage(offer, kinds)
    const held = offered[best]!
    const better =
      score.kinds - bestScore.kinds ||
      offer.size - held.size ||
      score.oneMeasure - bestScore.oneMeasure
    if (better > 0) {
      best = index
      bestScore = score
    }
  })
  return best
}

/**
 * Intent: the H2 plan for a domain. The first locked rhythm offers the most kinds among the
 * domain's other candidates (all five if one does), then the most of them in one measure, then
 * comes first in domain order. While some kind is left that another locked rhythm offers, the next
 * locked rhythm is chosen the same way for the kinds left. Each locked rhythm holds the preferred
 * change of each kind it covers; the kinds no candidate offers are reported as missing.
 */
export function planChanges(setting: H2Setting, candidates: readonly RhythmCandidate[]): H2Plan {
  const offered = changesOffered(candidates)
  const locks: LockPlan[] = []
  let left = [...RHYTHM_CHANGE_KINDS]
  while (left.length > 0) {
    const index = bestCover(offered, left)
    const offer = offered[index]!
    const changes = new Map<RhythmChangeKind, ChangePick>()
    for (const kind of left) {
      const pick = offer.get(kind)
      if (pick !== undefined) changes.set(kind, pick)
    }
    if (changes.size === 0) break
    locks.push({ locked: candidates[index]!, changes })
    left = left.filter((kind) => !changes.has(kind))
  }
  return { setting, domainSize: candidates.length, locks, missing: left }
}
