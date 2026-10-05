/**
 * The rhythm validator's provenance replays: whether each rendered event's nominal source cells
 * are the grammar's own catalog cells, tiling every beat and bar exactly, and whether each
 * transform descriptor's local algebra replays from those immutable source-cell coordinates to
 * the rendered events. Both re-derive the candidate from its witnesses instead of trusting them.
 */
import type { NominalCell, UnindexedRhythmCandidate } from './rhythm-types'
import { sameAddress } from './rhythm-invariants'
import { beatCellCatalog } from './rhythm-variety'

/** Intent: the stable key of one source-cell address, as bar:beat:cell. */
// @spec-link [[module_rhythm_domain_validation]]
export function addressKey(address: {
  readonly barIndex: number
  readonly beatIndex: number
  readonly cellIndex: number
}): string {
  return `${address.barIndex}:${address.beatIndex}:${address.cellIndex}`
}

/** Intent: whether two terminals are the same kind of the same length. */
// @spec-link [[module_rhythm_domain_validation]]
export function sameTerminal(
  left: { readonly kind: string; readonly durationTicks: number },
  right: { readonly kind: string; readonly durationTicks: number },
): boolean {
  return left.kind === right.kind && left.durationTicks === right.durationTicks
}

/**
 * Intent: whether every event carries source cells, each one the catalog cell its address names
 * (same grammar version and density, in its own bar and beat, never used twice), tiling each beat
 * and each 16-tick bar exactly.
 */
// @spec-link [[module_rhythm_domain_validation]]
export function hasValidNominalProvenance(candidate: UnindexedRhythmCandidate): boolean {
  const seen = new Set<string>()
  for (const bar of candidate.bars) {
    let tick = 0
    const cells = bar.events.flatMap((event) => event.sourceCells)
    if (bar.events.some((event) => event.sourceCells.length === 0)) return false
    for (const cell of cells) {
      const key = addressKey(cell.address)
      const catalog = beatCellCatalog(candidate.input.noteDensity, candidate.input.rhythmicVariety)
      const beatCell = catalog[cell.catalog.catalogIndex]
      const expected = beatCell?.[cell.address.cellIndex]
      const expectedBeat = Math.floor(tick / 4)
      const expectedBeatTick = beatCell
        ?.slice(0, cell.address.cellIndex)
        .reduce((total, terminal) => total + terminal.durationTicks, 0)
      if (
        seen.has(key) ||
        cell.address.grammarVersion !== candidate.grammarVersion ||
        cell.catalog.grammarVersion !== candidate.grammarVersion ||
        cell.catalog.density !== candidate.input.noteDensity ||
        cell.address.barIndex !== bar.barIndex ||
        cell.address.beatIndex !== expectedBeat ||
        cell.address.cellIndex < 0 ||
        !Number.isInteger(cell.address.cellIndex) ||
        !beatCell ||
        beatCell.reduce((total, terminal) => total + terminal.durationTicks, 0) !== 4 ||
        !expected ||
        expectedBeatTick !== tick % 4 ||
        !sameTerminal(cell, expected) ||
        tick + cell.durationTicks > (expectedBeat + 1) * 4
      )
        return false
      seen.add(key)
      tick += cell.durationTicks
    }
    if (tick !== 16) return false
  }
  return true
}

/** Intent: the start tick of every source cell in `bar`, by address key, in nominal order. */
// @spec-link [[module_rhythm_domain_validation]]
function sourceCoordinates(bar: UnindexedRhythmCandidate['bars'][number]): Map<string, number> {
  const cells = new Map<string, NominalCell>()
  for (const event of bar.events)
    for (const cell of event.sourceCells) cells.set(addressKey(cell.address), cell)
  let tick = 0
  const coordinates = new Map<string, number>()
  for (const [key, cell] of [...cells.entries()].sort(
    ([, left], [, right]) =>
      left.address.beatIndex - right.address.beatIndex ||
      left.address.cellIndex - right.address.cellIndex,
  )) {
    coordinates.set(key, tick)
    tick += cell.durationTicks
  }
  return coordinates
}

/** Intent: replay each transform's local algebra from immutable source-cell coordinates. */
// @spec-link [[module_rhythm_domain_validation]]
export function hasRenderedTransformAlgebra(candidate: UnindexedRhythmCandidate): boolean {
  const coordinateCache = new Map<number, Map<string, number>>()
  for (const descriptor of candidate.transforms) {
    const bar = candidate.bars[descriptor.barIndex]
    if (!bar) return false
    let coordinates = coordinateCache.get(descriptor.barIndex)
    if (!coordinates) {
      coordinates = sourceCoordinates(bar)
      coordinateCache.set(descriptor.barIndex, coordinates)
    }
    const leftTick = coordinates.get(addressKey(descriptor.affectedAddresses[0]))
    const rightTick = coordinates.get(addressKey(descriptor.affectedAddresses[1]))
    if (leftTick === undefined || rightTick === undefined) return false
    const left = bar.events.find((event) =>
      event.sourceCells.some((cell) => sameAddress(cell.address, descriptor.affectedAddresses[0])),
    )
    const right = bar.events.find((event) =>
      event.sourceCells.some((cell) => sameAddress(cell.address, descriptor.affectedAddresses[1])),
    )
    if (!left || !right) return false
    if (descriptor.case === 'tied_sustain') {
      const chain = bar.events.filter((event) => event.tieChainId === descriptor.tieChainId)
      const sourceEnd = Math.max(
        ...descriptor.sourceSpan.map((address) => {
          const start = coordinates.get(addressKey(address))
          const cell = bar.events
            .flatMap((event) => event.sourceCells)
            .find((item) => sameAddress(item.address, address))
          return (start ?? -Infinity) + (cell?.durationTicks ?? 0)
        }),
      )
      if (
        chain.length !== 2 ||
        chain[0]!.startTick !== leftTick ||
        chain[0]!.durationTicks !== descriptor.strongTick - leftTick ||
        !chain[1]!.tieContinuation ||
        chain[1]!.startTick !== descriptor.strongTick ||
        chain[1]!.durationTicks !== sourceEnd - descriptor.strongTick
      )
        return false
      continue
    }
    if (descriptor.case === 'swap_final_pattern') {
      const leftCell = left.sourceCells.find((cell) =>
        sameAddress(cell.address, descriptor.sourceAddresses[0]),
      )
      const rightCell = right.sourceCells.find((cell) =>
        sameAddress(cell.address, descriptor.sourceAddresses[1]),
      )
      if (
        !leftCell ||
        !rightCell ||
        leftCell.kind === rightCell.kind ||
        leftCell.durationTicks !== rightCell.durationTicks ||
        rightCell.address.beatIndex !== 3 ||
        left.kind !== rightCell.kind ||
        right.kind !== leftCell.kind
      )
        return false
      continue
    }
    const boundary = leftTick + left.nominalDurationTicks
    if (descriptor.boundaryTick !== boundary) return false
    const renderedBoundary = left.startTick + left.durationTicks
    if (
      left.kind !== 'note' ||
      right.kind !== (descriptor.case === 'interior_rest' ? 'rest' : 'note') ||
      renderedBoundary !== boundary + descriptor.delta ||
      right.startTick !== renderedBoundary
    )
      return false
    if (descriptor.case === 'interior_rest') {
      const next = bar.events[bar.events.indexOf(right) + 1]
      const nextTick = coordinates.get(addressKey(descriptor.affectedAddresses[2]))
      if (
        !next ||
        next.kind !== 'note' ||
        nextTick === undefined ||
        !next.sourceCells.some((cell) =>
          sameAddress(cell.address, descriptor.affectedAddresses[2]),
        ) ||
        descriptor.transformedBoundaries[1] !==
          rightTick + right.nominalDurationTicks + descriptor.delta ||
        next.startTick !== descriptor.transformedBoundaries[1]
      )
        return false
    }
  }
  return true
}
