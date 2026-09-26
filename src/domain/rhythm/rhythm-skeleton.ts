import { deepFreeze } from '../events/deep-freeze'
import type { RhythmicVariety } from '../controls/generation-controls'
import { attackBandFor, beatCellCatalog, densityTicks } from './rhythm-variety'
import type {
  BarFormProvenance,
  BarIndex,
  GestureDerivation,
  GestureMergePlan,
  GestureBarIndex,
  NominalCell,
  NominalTerminal,
  NormalizedRhythmExpansionInput,
  RhythmBar,
  RhythmEvent,
  RhythmEventKind,
  RhythmSkeletonInput,
  V1BarForm,
} from './rhythm-types'

export const V1_BAR1_FORMS: readonly V1BarForm[] = deepFreeze([
  'xxxx',
  'xxxy',
  'xxyy',
  'xyxy',
  'xyyx',
])

/** Build one bar from source cells while retaining exact nominal provenance. */
// @spec-link [[module_rhythm_skeleton_allocator]]
export function makeBar(barIndex: BarIndex, cells: readonly NominalCell[]): RhythmBar {
  let tick = 0
  const events: RhythmEvent[] = []
  for (const cell of cells) {
    const previous = events.at(-1)
    if (cell.kind === 'rest' && previous?.kind === 'rest') {
      events[events.length - 1] = {
        ...previous,
        durationTicks: previous.durationTicks + cell.durationTicks,
        sourceCells: [...previous.sourceCells, cell],
      }
      tick += cell.durationTicks
      continue
    }
    const event = {
      kind: cell.kind,
      startTick: tick,
      durationTicks: cell.durationTicks,
      nominalDurationTicks: cell.durationTicks,
      sourceCells: [cell],
    }
    events.push(event)
    tick += cell.durationTicks
  }
  return deepFreeze({ barIndex, events })
}

function formIndices(form: V1BarForm, x: number, y?: number): readonly number[] {
  if (form === 'xxxx') return [x, x, x, x]
  if (form === 'xxxy') return [x, x, x, y!]
  if (form === 'xxyy') return [x, x, y!, y!]
  if (form === 'xyxy') return [x, y!, x, y!]
  return [x, y!, y!, x]
}

function materializeBeat(
  density: RhythmSkeletonInput['noteDensity'],
  variety: RhythmicVariety,
  catalogIndex: number,
  barIndex: BarIndex,
  beatIndex: number,
): readonly NominalCell[] {
  return beatCellCatalog(density, variety)[catalogIndex]!.map((source, cellIndex) =>
    deepFreeze({
      ...source,
      address: { grammarVersion: 'rhythm-mvp-v2', barIndex, beatIndex, cellIndex },
      catalog: { grammarVersion: 'rhythm-mvp-v2', density, catalogIndex },
    }),
  )
}

export interface V1Bar1Production {
  readonly cells: readonly NominalCell[]
  readonly bar: RhythmBar
  readonly provenance: BarFormProvenance
}

/**
 * Single isolated gate for the downbeat rule: the `x` catalog entry always covers beat 0 (see
 * formIndices), so rejecting rest-first entries here keeps every production opening on a downbeat
 * attack instead of generating and discarding rest starts. Deleting this predicate (and its one
 * call site) fully reverts bar-0 catalog selection to its pre-rule breadth.
 */
// @spec-link [[rule_phrase_starts_on_downbeat]]
function opensOnDownbeat(entry: readonly { readonly kind: 'note' | 'rest' }[]): boolean {
  return entry[0]?.kind === 'note'
}

/** Enumerate raw Bar1 productions before bars 1-2 feasibility pruning. */
// @spec-link [[module_rhythm_skeleton_allocator]]
export function* enumerateV1Bar1Productions(
  density: RhythmSkeletonInput['noteDensity'],
  variety: RhythmicVariety,
): IterableIterator<V1Bar1Production> {
  const catalog = beatCellCatalog(density, variety)
  for (const form of V1_BAR1_FORMS) {
    for (let x = 0; x < catalog.length; x += 1) {
      if (!opensOnDownbeat(catalog[x]!)) continue
      const ys = form === 'xxxx' ? [undefined] : Array.from({ length: catalog.length }, (_, y) => y)
      for (const y of ys) {
        if (y !== undefined && x === y) continue
        const indices = formIndices(form, x, y)
        const cells = indices.flatMap((catalogIndex, beatIndex) =>
          materializeBeat(density, variety, catalogIndex, 0, beatIndex),
        )
        const provenance: BarFormProvenance = deepFreeze({
          grammarVersion: 'rhythm-mvp-v2',
          form,
          catalogIndices: y === undefined ? [x] : [x, y],
        })
        yield deepFreeze({ cells, bar: makeBar(0, cells), provenance })
      }
    }
  }
}

function copyCells(
  cells: readonly NominalCell[],
  barIndex: GestureBarIndex,
): readonly NominalCell[] {
  return cells.map((cell) =>
    deepFreeze({
      ...cell,
      address: { ...cell.address, barIndex },
    }),
  )
}

function cellBeat(cells: readonly NominalCell[], beatIndex: number): readonly NominalCell[] {
  return cells.filter((cell) => cell.address.beatIndex === beatIndex)
}

function feasibleBar(
  bar: RhythmBar,
  density: RhythmSkeletonInput['noteDensity'],
  variety: RhythmicVariety,
): boolean {
  const attacks = bar.events.filter((event) => event.kind === 'note').length
  const [minimum, maximum] = attackBandFor(density, variety)
  return (
    attacks >= minimum &&
    attacks <= maximum &&
    bar.events.some(
      (event) => event.kind === 'note' && (event.startTick === 0 || event.startTick === 8),
    ) &&
    bar.events.some((event) => event.kind === 'note') &&
    bar.events.filter((event) => event.kind === 'rest').every((event) => event.durationTicks <= 8)
  )
}

function feasibleGesture(
  bars: readonly [RhythmBar, RhythmBar],
  input: RhythmSkeletonInput,
): boolean {
  if (!bars.every((bar) => feasibleBar(bar, input.noteDensity, input.rhythmicVariety))) return false
  const restEvents = bars.flatMap((bar) => bar.events.filter((event) => event.kind === 'rest'))
  const phraseRestTicks = restEvents.reduce((total, event) => total + event.durationTicks, 0) * 2
  if (input.silenceDensity === 'Sparse') return phraseRestTicks >= 4 && phraseRestTicks <= 8
  if (input.silenceDensity === 'Conversational')
    return (
      phraseRestTicks >= 12 &&
      phraseRestTicks <= 20 &&
      restEvents.some((event) => event.durationTicks >= 2)
    )
  // Breath-heavy requires "at least one rest in every bar" (docs/music/rhythm-phrase-structure.md:40),
  // not exactly two rests total; the gesture is mirrored into bars 3-4, so >=1 rest per bar here
  // already yields >=2 rests across the full phrase.
  return (
    phraseRestTicks >= 24 &&
    phraseRestTicks <= 32 &&
    bars.every((bar) => bar.events.some((event) => event.kind === 'rest')) &&
    restEvents.filter((event) => event.durationTicks >= 4).length >= 1
  )
}

/** Enumerate exact and one-cell recurrence variants before feasibility pruning. */
// @spec-link [[module_rhythm_skeleton_allocator]]
export function enumerateV1RecurrenceVariants(
  source: V1Bar1Production,
  input: RhythmSkeletonInput,
): IterableIterator<{
  readonly cells: readonly NominalCell[]
  readonly recurrence: GestureDerivation['recurrence']
}> {
  const sourceBeat = source.cells.find((cell) => cell.kind === 'note')?.address.beatIndex
  function* variants(): IterableIterator<{
    readonly cells: readonly NominalCell[]
    readonly recurrence: GestureDerivation['recurrence']
  }> {
    if (sourceBeat === undefined) return
    const sourceCells = cellBeat(source.cells, sourceBeat)
    const targetBase = copyCells(source.cells, 1)
    const common = {
      grammarVersion: input.grammarVersion as 'rhythm-mvp-v2',
      sourceBar: 0 as const,
      sourceBeat,
      sourceCellAddresses: sourceCells.map((cell) => cell.address),
      targetBar: 1 as const,
      targetBeat: sourceBeat,
    }
    yield { cells: targetBase, recurrence: deepFreeze({ kind: 'exact' as const, ...common }) }
    for (const target of cellBeat(targetBase, sourceBeat)) {
      const afterKind: RhythmEventKind = target.kind === 'note' ? 'rest' : 'note'
      const changedBeat: readonly NominalCell[] = cellBeat(targetBase, sourceBeat).map((cell) =>
        cell.address === target.address ? { ...cell, kind: afterKind } : cell,
      )
      const catalogIndex = beatCellCatalog(input.noteDensity, input.rhythmicVariety).findIndex(
        (beatCell) =>
          beatCell.length === changedBeat.length &&
          beatCell.every((terminal, index) => sameTerminal(terminal, changedBeat[index]!)),
      )
      if (catalogIndex < 0) continue
      const changed: readonly NominalCell[] = targetBase.map((cell) =>
        cell.address.beatIndex === sourceBeat
          ? deepFreeze({
              ...changedBeat[cell.address.cellIndex]!,
              catalog: { ...cell.catalog, catalogIndex },
            })
          : cell,
      )
      yield {
        cells: changed,
        recurrence: deepFreeze({
          kind: 'substitute' as const,
          ...common,
          substitution: {
            targetCellOffset: target.address.cellIndex,
            before: { kind: target.kind, durationTicks: target.durationTicks },
            after: { kind: afterKind, durationTicks: target.durationTicks },
          },
        }),
      }
    }
  }
  return variants()
}

function sameTerminal(left: NominalTerminal, right: NominalTerminal): boolean {
  return left.kind === right.kind && left.durationTicks === right.durationTicks
}

function makeMergedBar(
  barIndex: GestureBarIndex,
  cells: readonly NominalCell[],
  merge: GestureMergePlan,
): RhythmBar {
  if (merge.kind === 'none') return makeBar(barIndex, cells)
  let tick = 0
  const events: RhythmEvent[] = []
  for (let index = 0; index < cells.length; index += 1) {
    const cell = cells[index]!
    const next = cells[index + 1]
    const mergesHere = cell.address === merge.left && next?.address === merge.right
    const previous = events.at(-1)
    if (cell.kind === 'rest' && previous?.kind === 'rest') {
      events[events.length - 1] = {
        ...previous,
        durationTicks: previous.durationTicks + cell.durationTicks,
        sourceCells: [...previous.sourceCells, cell],
      }
    } else if (mergesHere) {
      events.push({
        kind: 'note',
        startTick: tick,
        durationTicks: cell.durationTicks + next.durationTicks,
        nominalDurationTicks: cell.durationTicks + next.durationTicks,
        sourceCells: [cell, next],
      })
      tick += cell.durationTicks + next.durationTicks
      index += 1
      continue
    } else {
      events.push({
        kind: cell.kind,
        startTick: tick,
        durationTicks: cell.durationTicks,
        nominalDurationTicks: cell.durationTicks,
        sourceCells: [cell],
      })
    }
    tick += cell.durationTicks
  }
  return deepFreeze({ barIndex, events })
}

/**
 * Bars 1-2 merge candidates: adjacent note cells may merge into one tied note, except a same-beat
 * pair where neither source cell is longer than the density value `q` -- merging two ordinary `q`
 * cells would just resynthesize a longer catalog cell, not add anything a plain beat-cell choice
 * couldn't already express. A same-beat pair is only a merge candidate once one side already comes
 * from a variety-extended "long" cell (§1, feasibility review); cross-beat pairs are never excluded.
 */
// @spec-link [[module_rhythm_skeleton_allocator]]
function mergePlans(
  cells: readonly NominalCell[],
  density: RhythmSkeletonInput['noteDensity'],
): IterableIterator<GestureMergePlan> {
  function* plans() {
    yield deepFreeze({ kind: 'none' as const })
    for (let index = 0; index < cells.length - 1; index += 1) {
      const left = cells[index]!
      const right = cells[index + 1]!
      const sameBeat =
        left.address.barIndex === right.address.barIndex &&
        left.address.beatIndex === right.address.beatIndex
      if (sameBeat && Math.max(left.durationTicks, right.durationTicks) <= densityTicks(density))
        continue
      if (left.kind === 'note' && right.kind === 'note')
        yield deepFreeze({ kind: 'merge' as const, left: left.address, right: right.address })
    }
  }
  return plans()
}

/** Replayable finite bars 1-2 derivations, ending before answer and syncopation transforms. */
// @spec-link [[module_rhythm_skeleton_allocator]]
export function* enumerateGestureDerivations(
  input: RhythmSkeletonInput,
): IterableIterator<GestureDerivation> {
  for (const source of enumerateV1Bar1Productions(input.noteDensity, input.rhythmicVariety)) {
    const sourceBar = source.bar
    if (!feasibleBar(sourceBar, input.noteDensity, input.rhythmicVariety)) continue
    for (const variant of enumerateV1RecurrenceVariants(source, input)) {
      const targetBar = makeBar(1, variant.cells)
      if (!feasibleGesture([sourceBar, targetBar], input)) continue
      for (const merge of mergePlans([...source.cells, ...variant.cells], input.noteDensity)) {
        const bars = [
          makeMergedBar(0, source.cells, merge),
          makeMergedBar(1, variant.cells, merge),
        ] as const
        yield deepFreeze({
          grammarVersion: input.grammarVersion,
          input,
          provenance: source.provenance,
          bars,
          recurrence: variant.recurrence,
          merge,
        })
      }
    }
  }
}

/** Compatibility seam until the answer-transform slice consumes gesture derivations directly. */
// @spec-link [[module_rhythm_skeleton_allocator]]
export function allocateNominalBars(input: NormalizedRhythmExpansionInput): readonly RhythmBar[] {
  const derivation = enumerateGestureDerivations(input).next()
  if (derivation.done) return deepFreeze([])
  const gesture = derivation.value
  const answer = gesture.bars.map((bar, index) =>
    makeBar(
      (index + 2) as BarIndex,
      bar.events.flatMap((event) => event.sourceCells),
    ),
  )
  return deepFreeze([...gesture.bars, ...answer])
}
