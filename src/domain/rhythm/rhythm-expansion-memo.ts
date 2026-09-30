/**
 * Per-expansion memos and the per-bar, per-list checks the rhythm derivation runs from them. Every
 * cache is keyed by bar or descriptor objects that are never mutated and holds pure results, so a
 * cached value is the value a fresh computation would return. Applied bars are left unfrozen: the
 * planner deep-freezes a candidate, and so every bar it shares, only when it publishes it.
 */
import type { Syncopation } from '../controls/generation-controls'
import {
  activeAnchorRatioViolatedBy,
  answerSimilarityViolatedBy,
  attackTicks,
  canonicalEndingSignature,
  lacksMetricalAnchor,
  soundingAnchorCount,
} from './rhythm-invariants'
import type { RhythmBar, RhythmTransformDescriptor } from './rhythm-types'
import {
  applyTransformSet,
  type SyncopationSelectorMemo,
  type TransformResult,
} from './syncopation'

/** Both transform stages build unfrozen bars; only published candidates are deep-frozen. */
const leaveUnfrozen = <T>(value: T): T => value

/** The shared empty sequence of a bar no descriptor touches (never mutated nor published). */
const NO_DESCRIPTORS: readonly RhythmTransformDescriptor[] = []

/** One step of an applied-descriptor trie: the result for the path so far, and its extensions. */
interface AppliedNode {
  result?: TransformResult
  next?: WeakMap<RhythmTransformDescriptor, AppliedNode>
}

/** Metrical facts of one applied bar that the enumeration prefilter reads. */
interface BarFacts {
  readonly lacksAnchor: boolean
  readonly anchors: number
  readonly attackTicks: readonly number[]
}

/**
 * Per-expansion memos. `answerApplied` and `syncApplied` memoize applying an ordered descriptor
 * sequence to one bar in the answer stage and the syncopation stage, so equal inputs share one
 * result bar. `selectors` memoizes the syncopation selectors, `facts` and `endings` the prefilter's
 * per-bar facts, `addressKeys` each descriptor's source-cell keys, and `singletons` each
 * descriptor's one-element sequence.
 */
export interface ExpansionMemo {
  readonly answerApplied: WeakMap<RhythmBar, AppliedNode>
  readonly syncApplied: WeakMap<RhythmBar, AppliedNode>
  readonly selectors: SyncopationSelectorMemo
  readonly facts: WeakMap<RhythmBar, BarFacts>
  readonly endings: WeakMap<RhythmBar, string>
  readonly addressKeys: WeakMap<RhythmTransformDescriptor, readonly string[]>
  readonly singletons: WeakMap<RhythmTransformDescriptor, readonly RhythmTransformDescriptor[]>
}

/** A fresh, empty memo set for one rhythm expansion. */
// @spec-link [[api_rhythm_domain_expansion]]
export function createExpansionMemo(): ExpansionMemo {
  return {
    answerApplied: new WeakMap(),
    syncApplied: new WeakMap(),
    selectors: new WeakMap(),
    facts: new WeakMap(),
    endings: new WeakMap(),
    addressKeys: new WeakMap(),
    singletons: new WeakMap(),
  }
}

/** The recorded order of a phrase's transform list (bar, boundary, case name, delta). */
// @spec-link [[api_rhythm_domain_expansion]]
export function descriptorOrder(
  left: RhythmTransformDescriptor,
  right: RhythmTransformDescriptor,
): number {
  return (
    left.barIndex - right.barIndex ||
    left.boundaryTick - right.boundaryTick ||
    left.case.localeCompare(right.case) ||
    left.delta - right.delta
  )
}

/**
 * `applyTransformSet(bar, descriptors)` building unfrozen bars, memoized by the bar and the ordered
 * descriptor sequence. An empty sequence leaves the bar itself, exactly as `applyTransformSet` does.
 */
function applyMemoized(
  memo: WeakMap<RhythmBar, AppliedNode>,
  bar: RhythmBar,
  descriptors: readonly RhythmTransformDescriptor[],
): TransformResult {
  if (descriptors.length === 0) return { ok: true, bar }
  let node = memo.get(bar)
  if (!node) {
    node = {}
    memo.set(bar, node)
  }
  for (const descriptor of descriptors) {
    node.next ??= new WeakMap()
    let child = node.next.get(descriptor)
    if (!child) {
      child = {}
      node.next.set(descriptor, child)
    }
    node = child
  }
  node.result ??= applyTransformSet(bar, descriptors, leaveUnfrozen)
  return node.result
}

/** Apply each bar's own answer-only descriptors, in list order; undefined when one fails. */
// @spec-link [[api_rhythm_domain_expansion]]
export function answerStageBars(
  memo: ExpansionMemo,
  bars: readonly RhythmBar[],
  answerOnly: readonly RhythmTransformDescriptor[],
): readonly RhythmBar[] | undefined {
  const next: RhythmBar[] = []
  for (const bar of bars) {
    const own = descriptorsOnBar(memo, bar.barIndex, answerOnly)
    const result = applyMemoized(memo.answerApplied, bar, own)
    if (!result.ok) return undefined
    next.push(result.bar)
  }
  return next
}

/** The descriptor's cached one-element sequence, so a single-descriptor bar allocates nothing. */
function singleton(
  memo: ExpansionMemo,
  descriptor: RhythmTransformDescriptor,
): readonly RhythmTransformDescriptor[] {
  let sequence = memo.singletons.get(descriptor)
  if (!sequence) {
    sequence = [descriptor]
    memo.singletons.set(descriptor, sequence)
  }
  return sequence
}

/** How many of the descriptors apply to the bar. */
function countOnBar(descriptors: readonly RhythmTransformDescriptor[], barIndex: number): number {
  let count = 0
  for (const descriptor of descriptors) if (descriptor.barIndex === barIndex) count += 1
  return count
}

/** The descriptors on the bar, in their order; zero or one reuses a shared sequence. */
function descriptorsOnBar(
  memo: ExpansionMemo,
  barIndex: number,
  descriptors: readonly RhythmTransformDescriptor[],
): readonly RhythmTransformDescriptor[] {
  const count = countOnBar(descriptors, barIndex)
  if (count === 0) return NO_DESCRIPTORS
  if (count === 1)
    return singleton(
      memo,
      descriptors.find((descriptor) => descriptor.barIndex === barIndex)!,
    )
  return descriptors.filter((descriptor) => descriptor.barIndex === barIndex)
}

/**
 * One bar's syncopation-stage descriptors: its duals, then its template descriptors, stably sorted
 * by `descriptorOrder`. Zero or one descriptor needs no sort and reuses a shared sequence.
 */
function ownSyncDescriptors(
  memo: ExpansionMemo,
  barIndex: number,
  duals: readonly RhythmTransformDescriptor[],
  template: readonly RhythmTransformDescriptor[],
): readonly RhythmTransformDescriptor[] {
  const count = countOnBar(duals, barIndex) + countOnBar(template, barIndex)
  if (count === 0) return NO_DESCRIPTORS
  if (count === 1) {
    const only =
      duals.find((descriptor) => descriptor.barIndex === barIndex) ??
      template.find((descriptor) => descriptor.barIndex === barIndex)
    return singleton(memo, only!)
  }
  const own: RhythmTransformDescriptor[] = []
  for (const descriptor of duals) if (descriptor.barIndex === barIndex) own.push(descriptor)
  for (const descriptor of template) if (descriptor.barIndex === barIndex) own.push(descriptor)
  return own.sort(descriptorOrder)
}

/**
 * Apply the syncopation stage (the list's dual-role descriptors, then the template) bar by bar.
 * Each bar receives its own descriptors in `descriptorOrder`, stably sorted from the dual-then-
 * template sequence: the same order a filter of the whole stably sorted stage gives. Undefined when
 * one bar fails.
 */
// @spec-link [[api_rhythm_domain_expansion]]
export function syncStageBars(
  memo: ExpansionMemo,
  bars: readonly RhythmBar[],
  duals: readonly RhythmTransformDescriptor[],
  template: readonly RhythmTransformDescriptor[],
): readonly RhythmBar[] | undefined {
  const next: RhythmBar[] = []
  for (const bar of bars) {
    const own = ownSyncDescriptors(memo, bar.barIndex, duals, template)
    const result = applyMemoized(memo.syncApplied, bar, own)
    if (!result.ok) return undefined
    next.push(result.bar)
  }
  return next
}

/** The descriptor's `bar:beat:cell` source-cell keys, the phrase-level overlap identity. */
function addressKeys(
  memo: ExpansionMemo,
  descriptor: RhythmTransformDescriptor,
): readonly string[] {
  let keys = memo.addressKeys.get(descriptor)
  if (!keys) {
    keys = descriptor.affectedAddresses.map(
      (address) => `${address.barIndex}:${address.beatIndex}:${address.cellIndex}`,
    )
    memo.addressKeys.set(descriptor, keys)
  }
  return keys
}

/** The source-cell keys an answer list touches, or undefined when the list overlaps itself. */
// @spec-link [[api_rhythm_domain_expansion]]
export function listAddressKeys(
  memo: ExpansionMemo,
  groups: readonly (readonly RhythmTransformDescriptor[])[],
): ReadonlySet<string> | undefined {
  const seen = new Set<string>()
  for (const group of groups)
    for (const descriptor of group)
      for (const key of addressKeys(memo, descriptor)) {
        if (seen.has(key)) return undefined
        seen.add(key)
      }
  return seen
}

/** Whether a template descriptor before position `end` has the key. */
function earlierTemplateHas(
  memo: ExpansionMemo,
  template: readonly RhythmTransformDescriptor[],
  end: number,
  key: string,
): boolean {
  for (let position = 0; position < end; position += 1)
    if (addressKeys(memo, template[position]!).includes(key)) return true
  return false
}

/**
 * Whether the list's descriptors (their keys from `listAddressKeys`) and the template's touch no
 * source cell twice: exactly the phrase-level overlap test over the list plus the template. Each
 * key is checked against the list, its own descriptor's earlier keys and every earlier template
 * descriptor, with no per-template allocation.
 */
// @spec-link [[api_rhythm_domain_expansion]]
export function disjointFromList(
  memo: ExpansionMemo,
  listKeys: ReadonlySet<string> | undefined,
  template: readonly RhythmTransformDescriptor[],
): boolean {
  if (!listKeys) return false
  for (let position = 0; position < template.length; position += 1) {
    const keys = addressKeys(memo, template[position]!)
    for (let index = 0; index < keys.length; index += 1) {
      const key = keys[index]!
      if (listKeys.has(key) || keys.indexOf(key) < index) return false
      if (earlierTemplateHas(memo, template, position, key)) return false
    }
  }
  return true
}

/** The applied bar's cached metrical facts. */
function barFacts(memo: ExpansionMemo, bar: RhythmBar): BarFacts {
  let facts = memo.facts.get(bar)
  if (!facts) {
    facts = {
      lacksAnchor: lacksMetricalAnchor(bar),
      anchors: soundingAnchorCount(bar),
      attackTicks: attackTicks(bar),
    }
    memo.facts.set(bar, facts)
  }
  return facts
}

/** The applied bar's cached `canonicalEndingSignature`, built once per bar. */
function endingSignature(memo: ExpansionMemo, bar: RhythmBar): string {
  let signature = memo.endings.get(bar)
  if (signature === undefined) {
    signature = canonicalEndingSignature(bar)
    memo.endings.set(bar, signature)
  }
  return signature
}

/**
 * The part of `quickRejectRhythmCandidate` that needs no assembled candidate: a bar without a
 * metrical anchor, bar 4 repeating bar 2's ending, or a violated Active anchor ratio, read from
 * cached per-bar facts. `syncopated` is every syncopation-role descriptor of the phrase, in any
 * order. Together with `varietyViolated` on the assembled candidate it rejects exactly the set
 * `quickRejectRhythmCandidate` rejects.
 */
// @spec-link [[module_rhythm_domain_validation]]
// @spec-link [[api_rhythm_domain_expansion]]
export function rejectsBeforeAssembly(
  memo: ExpansionMemo,
  syncopation: Syncopation,
  bars: readonly RhythmBar[],
  syncopated: readonly RhythmTransformDescriptor[],
): boolean {
  if (bars.some((bar) => barFacts(memo, bar).lacksAnchor)) return true
  if (bars.length === 4 && endingSignature(memo, bars[1]!) === endingSignature(memo, bars[3]!))
    return true
  return (
    syncopation === 'Active displacement' &&
    activeAnchorRatioViolatedBy(bars, syncopated, (bar) => barFacts(memo, bar).anchors)
  )
}

/**
 * `answer_similarity_violation` on the final four bars, read from each bar's cached attack ticks:
 * the fast path's stand-in for that part of `validateRhythmCandidate`, which it no longer calls.
 */
// @spec-link [[api_rhythm_domain_expansion]]
export function failsAnswerSimilarity(memo: ExpansionMemo, bars: readonly RhythmBar[]): boolean {
  return answerSimilarityViolatedBy(bars, (bar) => barFacts(memo, bar).attackTicks)
}
