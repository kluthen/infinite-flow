/**
 * The rhythm lock group of a generation request: the lock's state (on with nothing locked yet, or
 * on with the locked bars as written), the rhythm changes the player allows, and whether the
 * phrase is a tenser one. The group's absence means the lock is off. It serves session mode's lock
 * and Jam's alike, and every ordering and draw derived from it is computed inside generation. A
 * group is always constructed valid and deep-frozen in one canonical form, and an untrusted value
 * is parsed through the same constructor, refusing any missing or extra field at every level.
 */

import { deepFreeze } from '../events/deep-freeze'
import { TICKS_PER_BAR } from '../time/ticks'
import { PHRASE_MEASURE_COUNT } from './generation-request-envelope'

/** One kind of rhythm change the player may allow on a locked rhythm. */
// @spec-link [[entity_request_rhythm_lock]]
export type RhythmChangeKind =
  'move_note_start' | 'move_rest' | 'split_note' | 'merge_notes' | 'note_rest'

/** Every rhythm change kind, in the canonical order an allowed list must follow. */
// @spec-link [[entity_request_rhythm_lock]]
export const RHYTHM_CHANGE_KINDS: readonly RhythmChangeKind[] = deepFreeze([
  'move_note_start',
  'move_rest',
  'split_note',
  'merge_notes',
  'note_rest',
])

/**
 * One event of a locked measure, as the rhythm candidates write it: a note or a rest, its start
 * tick relative to its own measure (0-15, as a rhythm bar's events count it), its duration in
 * sixteenth ticks, and whether it continues a note tied over from before it.
 */
// @spec-link [[entity_request_rhythm_lock]]
export interface LockedRhythmEvent {
  readonly kind: 'note' | 'rest'
  readonly startTick: number
  readonly durationTicks: number
  readonly tieContinuation: boolean
}

/** One locked measure: its events in order, tiling the measure's sixteen ticks. */
// @spec-link [[entity_request_rhythm_lock]]
export type LockedRhythmMeasure = readonly LockedRhythmEvent[]

/**
 * The lock's state: on with nothing locked yet (a Jam's phrase 1), or on with the four locked
 * bars as written.
 */
// @spec-link [[entity_request_rhythm_lock]]
export type RhythmLockState =
  | { readonly kind: 'pending' }
  | { readonly kind: 'locked'; readonly bars: readonly LockedRhythmMeasure[] }

/** The rhythm lock group: the state, the allowed rhythm changes, and the tenser-phrase flag. */
// @spec-link [[entity_request_rhythm_lock]]
export interface RequestRhythmLock {
  readonly state: RhythmLockState
  readonly allowedChanges: readonly RhythmChangeKind[]
  readonly tenserPhrase: boolean
}

/** Typed failure for a malformed rhythm lock group, naming the field and the value. */
// @spec-link [[entity_request_rhythm_lock]]
export class RequestRhythmLockError extends Error {
  readonly kind = 'RequestRhythmLockError' as const

  constructor(message: string) {
    super(message)
    this.name = 'RequestRhythmLockError'
  }
}

const EVENT_KINDS: readonly string[] = ['note', 'rest']
const EVENT_KEYS = ['kind', 'startTick', 'durationTicks', 'tieContinuation'] as const
const CONTEXT = 'RequestRhythmLock'

/** Intent: refuse a value of the named field that is not an array. */
function requireArray(value: unknown, field: string): readonly unknown[] {
  if (!Array.isArray(value))
    throw new RequestRhythmLockError(`${field} must be an array, got ${JSON.stringify(value)}.`)
  return value
}

/** Intent: refuse a value of the named field that is not a non-null object. */
function requireObject(value: unknown, field: string): Record<string, unknown> {
  if (typeof value !== 'object' || value === null)
    throw new RequestRhythmLockError(`${field} must be an object, got ${JSON.stringify(value)}.`)
  return value as Record<string, unknown>
}

/** Intent: refuse a duration that is not a positive whole number of ticks. */
function requireDuration(value: unknown, field: string): number {
  if (typeof value !== 'number' || !Number.isInteger(value) || value <= 0)
    throw new RequestRhythmLockError(
      `${field} must be a positive whole number, got ${JSON.stringify(value)}.`,
    )
  return value
}

/**
 * Intent: a validated copy of one locked measure: at least one event, the first at tick 0, each
 * next one starting where the one before ends, the last ending on tick 16, each a note or a rest
 * with a boolean tie flag. The phrase's very first event cannot continue a tie.
 */
function copyMeasure(measure: unknown, measureIndex: number): LockedRhythmEvent[] {
  const field = `${CONTEXT}.state.bars[${measureIndex}]`
  const events = requireArray(measure, field)
  if (events.length === 0) throw new RequestRhythmLockError(`${field} must hold an event.`)
  let nextStart = 0
  const copy = events.map((entry, index) => {
    const eventField = `${field}[${index}]`
    const { kind, startTick, durationTicks, tieContinuation } = requireObject(entry, eventField)
    if (typeof kind !== 'string' || !EVENT_KINDS.includes(kind))
      throw new RequestRhythmLockError(
        `${eventField}.kind must be "note" or "rest", got ${JSON.stringify(kind)}.`,
      )
    if (startTick !== nextStart)
      throw new RequestRhythmLockError(
        `${eventField}.startTick must be ${nextStart} (measure-relative, where the event before ` +
          `ends), got ${JSON.stringify(startTick)}.`,
      )
    const duration = requireDuration(durationTicks, `${eventField}.durationTicks`)
    if (typeof tieContinuation !== 'boolean')
      throw new RequestRhythmLockError(
        `${eventField}.tieContinuation must be a boolean, got ${JSON.stringify(tieContinuation)}.`,
      )
    if (tieContinuation && measureIndex === 0 && index === 0)
      throw new RequestRhythmLockError(
        `${eventField}.tieContinuation must be false: nothing comes before the phrase's first event.`,
      )
    nextStart += duration
    return {
      kind: kind as LockedRhythmEvent['kind'],
      startTick: startTick as number,
      durationTicks: duration,
      tieContinuation,
    }
  })
  if (nextStart !== TICKS_PER_BAR)
    throw new RequestRhythmLockError(
      `${field} must fill ${TICKS_PER_BAR} ticks, its events end on tick ${nextStart}.`,
    )
  return copy
}

/** Intent: a validated copy of the lock's state: pending, or locked with exactly four bars. */
function copyState(input: unknown): RhythmLockState {
  const state = requireObject(input, `${CONTEXT}.state`)
  if (state.kind === 'pending') return { kind: 'pending' }
  if (state.kind !== 'locked')
    throw new RequestRhythmLockError(
      `${CONTEXT}.state.kind must be "pending" or "locked", got ${JSON.stringify(state.kind)}.`,
    )
  const bars = requireArray(state.bars, `${CONTEXT}.state.bars`)
  if (bars.length !== PHRASE_MEASURE_COUNT)
    throw new RequestRhythmLockError(
      `${CONTEXT}.state.bars must hold ${PHRASE_MEASURE_COUNT} measures, got ${bars.length}.`,
    )
  return { kind: 'locked', bars: bars.map(copyMeasure) }
}

/**
 * Intent: a validated copy of the allowed changes: known kinds, each once, in RHYTHM_CHANGE_KINDS
 * order. An out-of-order list is refused, never reordered, so the group has one canonical form.
 */
function copyAllowedChanges(input: unknown): RhythmChangeKind[] {
  const field = `${CONTEXT}.allowedChanges`
  let previousIndex = -1
  return requireArray(input, field).map((kind, index) => {
    const kindIndex = RHYTHM_CHANGE_KINDS.indexOf(kind as RhythmChangeKind)
    if (kindIndex === -1)
      throw new RequestRhythmLockError(
        `${field}[${index}] must be one of ${JSON.stringify(RHYTHM_CHANGE_KINDS)}, got ${JSON.stringify(kind)}.`,
      )
    if (kindIndex === previousIndex)
      throw new RequestRhythmLockError(`${field}[${index}] repeats ${JSON.stringify(kind)}.`)
    if (kindIndex < previousIndex)
      throw new RequestRhythmLockError(
        `${field}[${index}] ${JSON.stringify(kind)} is out of canonical order ${JSON.stringify(RHYTHM_CHANGE_KINDS)}.`,
      )
    previousIndex = kindIndex
    return kind as RhythmChangeKind
  })
}

/**
 * Intent: build one immutable rhythm lock group, a fresh deep-frozen copy of the input in field
 * order, refusing as a RequestRhythmLockError naming the field and value: an unknown state kind;
 * locked bars that are not four measures each tiling its sixteen ticks from tick 0 with positive
 * whole durations (an empty measure among them); an unknown event kind; a tie flag that is not a
 * boolean, or one set on the phrase's first event; an unknown, repeated or out-of-order allowed
 * change; a tenser-phrase flag that is not a boolean. An empty allowed list (a strict lock) is
 * allowed. Nothing is defaulted.
 */
// @spec-link [[entity_request_rhythm_lock]]
export function makeRequestRhythmLock(input: RequestRhythmLock): RequestRhythmLock {
  const state = copyState(input.state)
  const allowedChanges = copyAllowedChanges(input.allowedChanges)
  if (typeof input.tenserPhrase !== 'boolean')
    throw new RequestRhythmLockError(
      `${CONTEXT}.tenserPhrase must be a boolean, got ${JSON.stringify(input.tenserPhrase)}.`,
    )
  return deepFreeze({ state, allowedChanges, tenserPhrase: input.tenserPhrase })
}

/** Intent: narrow an untrusted value to a plain record holding exactly the expected keys. */
function exactRecord(
  input: unknown,
  keys: readonly string[],
  field: string,
): Record<string, unknown> {
  if (typeof input !== 'object' || input === null || Array.isArray(input))
    throw new RequestRhythmLockError(
      `${field} must be a plain object, got ${JSON.stringify(input)}.`,
    )
  const record = input as Record<string, unknown>
  for (const key of Object.keys(record))
    if (!keys.includes(key))
      throw new RequestRhythmLockError(`${field} has unknown field "${key}".`)
  for (const key of keys)
    if (!Object.hasOwn(record, key))
      throw new RequestRhythmLockError(`${field} is missing field "${key}".`)
  return record
}

/** Intent: parse an untrusted state: exactly a kind, plus the bars when it is locked. */
function parseState(input: unknown): RhythmLockState {
  const field = `${CONTEXT}.state`
  const kind = requireObject(input, field).kind
  const record = exactRecord(input, kind === 'pending' ? ['kind'] : ['kind', 'bars'], field)
  if (kind === 'pending') return { kind }
  const bars = requireArray(record.bars, `${field}.bars`).map((measure, measureIndex) =>
    requireArray(measure, `${field}.bars[${measureIndex}]`).map((event, index) =>
      exactRecord(event, EVENT_KEYS, `${field}.bars[${measureIndex}][${index}]`),
    ),
  )
  return { kind, bars } as RhythmLockState
}

/**
 * Intent: parse an untrusted value (a structured clone, which drops freezing) into a rhythm lock
 * group, refusing any missing or extra field at every level and any non-array list, then
 * re-validating it through `makeRequestRhythmLock`. Every refusal is a RequestRhythmLockError.
 */
// @spec-link [[entity_request_rhythm_lock]]
export function parseRequestRhythmLock(input: unknown): RequestRhythmLock {
  const record = exactRecord(input, ['state', 'allowedChanges', 'tenserPhrase'], CONTEXT)
  return makeRequestRhythmLock({
    state: parseState(record.state),
    allowedChanges: requireArray(
      record.allowedChanges,
      `${CONTEXT}.allowedChanges`,
    ) as readonly RhythmChangeKind[],
    tenserPhrase: record.tenserPhrase as boolean,
  })
}
