import type {
  NominalCell,
  RhythmCandidate,
  RhythmValidationCode,
  UnindexedRhythmCandidate,
} from './rhythm-types'
import { normalizedRhythmIdentity } from './rhythm-identity'
import {
  activeAnchorRatioViolated,
  canonicalEndingSignature,
  lacksMetricalAnchor,
  sameAddress,
} from './rhythm-invariants'
import { attackBandFor, beatCellCatalog, varietyViolated } from './rhythm-variety'

function addressKey(address: {
  readonly barIndex: number
  readonly beatIndex: number
  readonly cellIndex: number
}): string {
  return `${address.barIndex}:${address.beatIndex}:${address.cellIndex}`
}

const CODE_ORDER: readonly RhythmValidationCode[] = [
  'invalid_measure_count',
  'invalid_measure_tiling',
  'invalid_phrase_duration',
  'non_positive_duration',
  'invalid_nominal_provenance',
  'density_attack_band_violation',
  'rhythmic_variety_violation',
  'silence_budget_violation',
  'silence_shape_violation',
  'all_rest_measure',
  'rest_duration_limit_violation',
  'syncopation_count_violation',
  'syncopation_type_violation',
  'transform_algebra_violation',
  'transform_overlap_violation',
  'attack_count_changed',
  'rest_total_changed',
  'metrical_anchor_missing',
  'first_note_off_downbeat',
  'active_anchor_ratio_violation',
  'invalid_tie_chain',
  'recurrence_witness_invalid',
  'answer_transform_count_violation',
  'answer_similarity_violation',
  'answer_variation_missing',
  'transform_order_violation',
  'candidate_identity_mismatch',
  'candidate_identity_duplicate',
  'candidate_index_invalid',
  'domain_replay_mismatch',
]

function restBudget(candidate: UnindexedRhythmCandidate): readonly [number, number] {
  return candidate.input.silenceDensity === 'Sparse'
    ? [4, 8]
    : candidate.input.silenceDensity === 'Conversational'
      ? [12, 20]
      : [24, 32]
}
function sameTerminal(
  left: { readonly kind: string; readonly durationTicks: number },
  right: { readonly kind: string; readonly durationTicks: number },
): boolean {
  return left.kind === right.kind && left.durationTicks === right.durationTicks
}

function hasValidNominalProvenance(candidate: UnindexedRhythmCandidate): boolean {
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

/** Replay each transform's local algebra from immutable source-cell coordinates. */
function hasRenderedTransformAlgebra(candidate: UnindexedRhythmCandidate): boolean {
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

/** Independently report every applicable invariant failure in policy-defined stable order. */
// @spec-link [[module_rhythm_domain_validation]]
// @spec-link [[rule_phrase_starts_on_downbeat]]
export function validateRhythmCandidate(
  candidate: UnindexedRhythmCandidate,
): readonly RhythmValidationCode[] {
  const failures = new Set<RhythmValidationCode>()
  if (candidate.bars.length !== 4) failures.add('invalid_measure_count')
  const events = candidate.bars.flatMap((bar) => bar.events)
  const nominalCells = events.flatMap((event) => event.sourceCells)
  for (const bar of candidate.bars) {
    if (
      bar.events.length === 0 ||
      bar.events[0]?.startTick !== 0 ||
      bar.events.at(-1)!.startTick + bar.events.at(-1)!.durationTicks !== 16 ||
      bar.events.some(
        (event, index) =>
          index > 0 &&
          event.startTick !==
            bar.events[index - 1]!.startTick + bar.events[index - 1]!.durationTicks,
      )
    )
      failures.add('invalid_measure_tiling')
    if (bar.events.some((event) => event.durationTicks <= 0)) failures.add('non_positive_duration')
    if (bar.events.every((event) => event.kind === 'rest')) failures.add('all_rest_measure')
    if (lacksMetricalAnchor(bar)) failures.add('metrical_anchor_missing')
    if (bar.barIndex === 0) {
      const firstEvent = bar.events[0]
      if (
        !firstEvent ||
        firstEvent.kind !== 'note' ||
        firstEvent.startTick !== 0 ||
        firstEvent.tieContinuation
      )
        failures.add('first_note_off_downbeat')
    }
    const attacks = bar.events.filter(
      (event) => event.kind === 'note' && !event.tieContinuation,
    ).length
    const [minimum, maximum] = attackBandFor(
      candidate.input.noteDensity,
      candidate.input.rhythmicVariety,
    )
    if (attacks < minimum || attacks > maximum) failures.add('density_attack_band_violation')
  }
  if (events.reduce((total, event) => total + event.durationTicks, 0) !== 64)
    failures.add('invalid_phrase_duration')
  const restTicks = events
    .filter((event) => event.kind === 'rest')
    .reduce((total, event) => total + event.durationTicks, 0)
  const [minimumRest, maximumRest] = restBudget(candidate)
  if (restTicks < minimumRest || restTicks > maximumRest) failures.add('silence_budget_violation')
  if (candidate.input.silenceDensity === 'Sparse' && !events.some((event) => event.kind === 'rest'))
    failures.add('silence_shape_violation')
  if (
    candidate.input.silenceDensity === 'Conversational' &&
    (events.filter((event) => event.kind === 'rest').length < 2 ||
      !events.some((event) => event.kind === 'rest' && event.durationTicks >= 2))
  )
    failures.add('silence_shape_violation')
  if (
    candidate.input.silenceDensity === 'Breath-heavy' &&
    (candidate.bars.some((bar) => !bar.events.some((event) => event.kind === 'rest')) ||
      events.filter((event) => event.kind === 'rest' && event.durationTicks >= 4).length < 2)
  )
    failures.add('silence_shape_violation')
  if (events.some((event) => event.kind === 'rest' && event.durationTicks > 8))
    failures.add('rest_duration_limit_violation')
  // @spec-link [[module_rhythm_variety_grammar]]
  if (varietyViolated(candidate)) failures.add('rhythmic_variety_violation')
  if (!hasValidNominalProvenance(candidate)) failures.add('invalid_nominal_provenance')
  const syncopationDescriptors = candidate.transforms.filter((descriptor) =>
    descriptor.roles.includes('syncopation'),
  )
  const expectedSyncopation: readonly [number, number] =
    candidate.input.syncopation === 'Straight'
      ? [0, 0]
      : candidate.input.syncopation === 'Occasional offbeats'
        ? [1, 2]
        : [4, 8]
  if (
    syncopationDescriptors.length < expectedSyncopation[0] ||
    syncopationDescriptors.length > expectedSyncopation[1]
  )
    failures.add('syncopation_count_violation')
  if (
    (candidate.input.syncopation === 'Straight' && syncopationDescriptors.length > 0) ||
    (candidate.input.syncopation !== 'Straight' &&
      syncopationDescriptors.some(
        (descriptor) => descriptor.delta === 0 && descriptor.case !== 'tied_sustain',
      ))
  )
    failures.add('syncopation_type_violation')
  const usedAddresses = new Set<string>()
  for (const descriptor of candidate.transforms) {
    if (
      descriptor.grammarVersion !== candidate.grammarVersion ||
      descriptor.transformedBoundaries.some((tick) => tick < 0 || tick > 16) ||
      (descriptor.case !== 'tied_sustain' &&
        descriptor.case !== 'swap_final_pattern' &&
        descriptor.transformedBoundaries[0] !== descriptor.boundaryTick + descriptor.delta) ||
      (descriptor.case === 'tied_sustain' &&
        descriptor.transformedBoundaries[0] !== descriptor.strongTick)
    )
      failures.add('transform_algebra_violation')
    for (const address of descriptor.affectedAddresses) {
      const key = `${address.barIndex}:${address.beatIndex}:${address.cellIndex}`
      if (usedAddresses.has(key)) failures.add('transform_overlap_violation')
      usedAddresses.add(key)
    }
  }
  if (!hasRenderedTransformAlgebra(candidate)) failures.add('transform_algebra_violation')
  const tiedSustains = candidate.transforms.filter(
    (descriptor) => descriptor.case === 'tied_sustain',
  )
  const swappedAddresses = new Set(
    candidate.transforms
      .filter((descriptor) => descriptor.case === 'swap_final_pattern')
      .flatMap((descriptor) => descriptor.affectedAddresses.map(addressKey)),
  )
  const hasRenderedTie = (barIndex: number, tieChainId: string | undefined) =>
    candidate.bars[barIndex]?.events.some(
      (event) => event.kind === 'note' && event.tieContinuation && event.tieChainId === tieChainId,
    )
  if (
    events.some(
      (event) =>
        event.kind === 'note' &&
        ((!event.tieContinuation &&
          event.sourceCells.length > 0 &&
          event.sourceCells.every((cell) => cell.kind === 'rest') &&
          !event.sourceCells.some((cell) => swappedAddresses.has(addressKey(cell.address)))) ||
          (event.tieContinuation &&
            !tiedSustains.some(
              (descriptor) =>
                descriptor.barIndex === event.sourceCells[0]?.address.barIndex &&
                descriptor.tieChainId === event.tieChainId,
            ))),
    ) ||
    tiedSustains.some((descriptor) => !hasRenderedTie(descriptor.barIndex, descriptor.tieChainId))
  )
    failures.add('attack_count_changed')
  const sourceRests = nominalCells
    .filter((cell) => cell.kind === 'rest')
    .reduce((total, cell) => total + cell.durationTicks, 0)
  if (restTicks !== sourceRests) failures.add('rest_total_changed')
  for (const bar of candidate.bars)
    for (let index = 0; index < bar.events.length; index += 1) {
      const event = bar.events[index]!
      if (!event.tieContinuation) continue
      const previous = bar.events[index - 1]
      if (
        event.kind !== 'note' ||
        !event.tieChainId ||
        !previous ||
        previous.kind !== 'note' ||
        previous.tieChainId !== event.tieChainId
      )
        failures.add('invalid_tie_chain')
    }
  const sourceCells =
    candidate.bars[0]?.events
      .flatMap((event) => event.sourceCells)
      .filter((cell) => cell.address.beatIndex === candidate.recurrence.sourceBeat) ?? []
  const targetCells =
    candidate.bars[1]?.events
      .flatMap((event) => event.sourceCells)
      .filter((cell) => cell.address.beatIndex === candidate.recurrence.targetBeat) ?? []
  const completeSourceWitness =
    sourceCells.length === candidate.recurrence.sourceCellAddresses.length &&
    sourceCells.every((cell, index) =>
      sameAddress(cell.address, candidate.recurrence.sourceCellAddresses[index]!),
    )
  const exactRecurrence =
    targetCells.length === sourceCells.length &&
    targetCells.every((cell, index) => sameTerminal(cell, sourceCells[index]!))
  const substitution =
    candidate.recurrence.kind === 'substitute' ? candidate.recurrence.substitution : undefined
  const validSubstitution =
    !!substitution &&
    targetCells.length === sourceCells.length &&
    targetCells.every((cell, index) => {
      const source = sourceCells[index]!
      if (cell.address.cellIndex !== substitution.targetCellOffset)
        return sameTerminal(cell, source)
      return (
        sameTerminal(source, substitution.before) &&
        sameTerminal(cell, substitution.after) &&
        source.durationTicks === cell.durationTicks &&
        source.kind !== cell.kind
      )
    })
  if (
    candidate.recurrence.sourceBar !== 0 ||
    candidate.recurrence.targetBar !== 1 ||
    !candidate.bars[0] ||
    !candidate.bars[1] ||
    candidate.recurrence.grammarVersion !== candidate.grammarVersion ||
    candidate.recurrence.targetBeat !== candidate.recurrence.sourceBeat ||
    !completeSourceWitness ||
    (candidate.recurrence.kind === 'exact' ? !exactRecurrence : !validSubstitution)
  )
    failures.add('recurrence_witness_invalid')
  const answerCount = candidate.transforms.filter((descriptor) =>
    descriptor.roles.includes('answer'),
  ).length
  const answerCountIsLegal =
    candidate.input.tensionArc === 'Settled' || candidate.input.tensionArc === 'Lift'
      ? answerCount === 1
      : answerCount === 1 || answerCount === 2
  if (!answerCountIsLegal) failures.add('answer_transform_count_violation')
  if (candidate.bars.length === 4) {
    const attackPositions = (bars: readonly UnindexedRhythmCandidate['bars'][number][]) =>
      bars.flatMap((bar, halfBarIndex) =>
        bar.events
          .filter((event) => event.kind === 'note' && !event.tieContinuation)
          .map((event) => `${halfBarIndex}:${event.startTick}`),
      )
    const gesture = attackPositions(candidate.bars.slice(0, 2))
    const answer = new Set(attackPositions(candidate.bars.slice(2)))
    const shared = gesture.filter((position) => answer.has(position)).length
    if (shared < Math.max(2, Math.ceil(gesture.length / 2)))
      failures.add('answer_similarity_violation')
    if (
      canonicalEndingSignature(candidate.bars[1]!) === canonicalEndingSignature(candidate.bars[3]!)
    )
      failures.add('answer_variation_missing')
  } else {
    failures.add('answer_similarity_violation')
    failures.add('answer_variation_missing')
  }
  const answerOnlyCount = candidate.transforms.filter(
    (descriptor) => descriptor.roles.length === 1 && descriptor.roles[0] === 'answer',
  ).length
  const ordered = candidate.transforms
    .slice(0, answerOnlyCount)
    .every(
      (descriptor, index, descriptors) =>
        index === 0 ||
        descriptors[index - 1]!.barIndex < descriptor.barIndex ||
        (descriptors[index - 1]!.barIndex === descriptor.barIndex &&
          descriptors[index - 1]!.boundaryTick <= descriptor.boundaryTick),
    )
  if (!ordered) failures.add('transform_order_violation')
  if (activeAnchorRatioViolated(candidate)) failures.add('active_anchor_ratio_violation')
  if ('identity' in candidate && candidate.identity !== normalizedRhythmIdentity(candidate))
    failures.add('candidate_identity_mismatch')
  return CODE_ORDER.filter((code) => failures.has(code))
}

/** Check the identity-bearing fields without mutating or canonicalizing the candidate. */
// @spec-link [[module_rhythm_domain_validation]]
export function hasValidRhythmCandidate(candidate: RhythmCandidate): boolean {
  return validateRhythmCandidate(candidate).length === 0
}
