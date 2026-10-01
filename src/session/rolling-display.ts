/**
 * The session's rolling display as a pure plan: which measure the playhead is on at a heard time,
 * what each of the staff's two system positions shows in the layout held for the session, which
 * readied material waits for a position, and how much is on screen ahead of the playhead. It
 * reads no time and touches no page; the caller supplies the heard time and the readiness.
 */

import type { MeasureIndex } from '../domain/events/measure'
import { PHRASE_MEASURE_COUNT } from '../domain/generation/generation-request'
import type { StaffLayout, SystemPart } from '../notation/notation-layout-policy'
import type { AudioTime } from './session-types'

export type { SystemPart }

/** One position's content: a part of one phrase. */
// @spec-link [[module_session_rolling_display]]
export interface SystemSlot {
  readonly phraseNumber: number
  readonly part: SystemPart
}

/** What the two system positions show; null is an empty position. */
// @spec-link [[module_session_rolling_display]]
export interface RollingSystems {
  readonly top: SystemSlot | null
  readonly bottom: SystemSlot | null
}

/** The measure being played: a phrase number and its 0-based measure. */
// @spec-link [[module_session_rolling_display]]
// @spec-link [[rule_playhead_follows_audio_clock]]
export interface PlayheadPosition {
  readonly phraseNumber: number
  readonly measureIndex: MeasureIndex
}

type Position = keyof RollingSystems

const PART_MEASURES: Readonly<
  Record<SystemPart, { readonly first: number; readonly last: number }>
> = {
  whole: { first: 0, last: 3 },
  opening: { first: 0, last: 1 },
  closing: { first: 2, last: 3 },
}

/** Intent: the time of barline k, by multiplication so no error accumulates over a session. */
function barlineAt(firstPhraseStartsAt: AudioTime, measureSeconds: number, k: number): AudioTime {
  return firstPhraseStartsAt + k * measureSeconds
}

/**
 * Intent: the measure being played at a heard time, or null before phrase 1's first barline (the
 * count-in). Barline k lies at `firstPhraseStartsAt + k * measureSeconds`; the floor estimate is
 * corrected against those very barline times, so exactly at a barline the playhead is on the new
 * measure whatever the rounding. Throws on non-finite inputs or a measure length that is not
 * positive.
 */
// @spec-link [[module_session_rolling_display]]
// @spec-link [[rule_playhead_follows_audio_clock]]
export function playheadAt(
  heardTime: AudioTime,
  firstPhraseStartsAt: AudioTime,
  measureSeconds: number,
): PlayheadPosition | null {
  if (!Number.isFinite(heardTime) || !Number.isFinite(firstPhraseStartsAt)) {
    throw new Error(`rolling display: time ${heardTime} or start ${firstPhraseStartsAt} not finite`)
  }
  if (!(Number.isFinite(measureSeconds) && measureSeconds > 0)) {
    throw new Error(`rolling display: measure length ${measureSeconds} is not a positive number`)
  }
  if (heardTime < firstPhraseStartsAt) return null
  let k = Math.max(0, Math.floor((heardTime - firstPhraseStartsAt) / measureSeconds))
  while (k > 0 && barlineAt(firstPhraseStartsAt, measureSeconds, k) > heardTime) k -= 1
  while (barlineAt(firstPhraseStartsAt, measureSeconds, k + 1) <= heardTime) k += 1
  return {
    phraseNumber: 1 + Math.floor(k / PHRASE_MEASURE_COUNT),
    measureIndex: (k % PHRASE_MEASURE_COUNT) as MeasureIndex,
  }
}

/** Intent: reject a phrase number that is not a positive integer, a caller bug. */
function assertPhraseNumber(phraseNumber: number, what: string): void {
  if (!(Number.isInteger(phraseNumber) && phraseNumber >= 1)) {
    throw new Error(`rolling display: ${what} ${phraseNumber} is not a phrase number`)
  }
}

/**
 * Intent: the phrase being played, 1 during the count-in, after rejecting the caller bugs: an
 * unknown layout, a malformed playhead, or a readiness behind the playhead's phrase.
 */
function currentPhrase(
  layout: StaffLayout,
  playhead: PlayheadPosition | null,
  latestReady: number,
): number {
  if (layout !== 'one-system' && layout !== 'split') {
    throw new Error(`rolling display: unknown layout ${String(layout)}`)
  }
  if (playhead !== null) {
    assertPhraseNumber(playhead.phraseNumber, 'playhead phrase')
    if (![0, 1, 2, 3].includes(playhead.measureIndex)) {
      throw new Error(`rolling display: measure index ${playhead.measureIndex} out of range`)
    }
  }
  const phrase = playhead?.phraseNumber ?? 1
  assertPhraseNumber(latestReady, 'latest readied phrase')
  if (latestReady < phrase) {
    throw new Error(`rolling display: latest readied phrase ${latestReady} is behind ${phrase}`)
  }
  return phrase
}

/**
 * Intent: what the two positions show. One system: phrase n lives on top when odd, below when
 * even; the phrase being played shows in its position, the other shows the next phrase once it is
 * readied. Split: in measures 1-2 (and the count-in) the phrase's opening is on top and its
 * closing below; from measure 3 the closing stays and the top takes the next phrase's opening once
 * it is readied. Nothing further ahead is ever shown. Throws on the caller bugs `currentPhrase`
 * rejects.
 */
// @spec-link [[module_session_rolling_display]]
// @spec-link [[rule_look_ahead_deadline]]
// @spec-link [[rule_session_layout_fixed_at_start]]
export function systemsAt(
  layout: StaffLayout,
  playhead: PlayheadPosition | null,
  latestReady: number,
): RollingSystems {
  const phrase = currentPhrase(layout, playhead, latestReady)
  const next = latestReady >= phrase + 1 ? phrase + 1 : null
  if (layout === 'one-system') {
    const current: SystemSlot = { phraseNumber: phrase, part: 'whole' }
    const other: SystemSlot | null = next === null ? null : { phraseNumber: next, part: 'whole' }
    return phrase % 2 === 1 ? { top: current, bottom: other } : { top: other, bottom: current }
  }
  const closing: SystemSlot = { phraseNumber: phrase, part: 'closing' }
  if ((playhead?.measureIndex ?? 0) < 2) {
    return { top: { phraseNumber: phrase, part: 'opening' }, bottom: closing }
  }
  return { top: next === null ? null : { phraseNumber: next, part: 'opening' }, bottom: closing }
}

/** Intent: the parts a layout splits a phrase into, in reading order. */
function partsOf(layout: StaffLayout): readonly SystemPart[] {
  return layout === 'one-system' ? ['whole'] : ['opening', 'closing']
}

/** Intent: a measure's 0-based position across the whole session. */
function absoluteMeasure(phraseNumber: number, measureIndex: number): number {
  return (phraseNumber - 1) * PHRASE_MEASURE_COUNT + measureIndex
}

/** Intent: the shown slots of a plan, top first. */
function shownSlots(systems: RollingSystems): SystemSlot[] {
  return [systems.top, systems.bottom].filter((slot): slot is SystemSlot => slot !== null)
}

/**
 * Intent: the readied material no position shows yet: every part of every readied phrase from the
 * one being played on that is neither shown nor already played, in phrase then part order. The
 * phrase after next can be readied while the heard playhead is still in the current phrase's last
 * measure; it waits here until the playhead reaches the phrase before it. Throws on the caller
 * bugs `systemsAt` rejects.
 */
// @spec-link [[module_session_rolling_display]]
// @spec-link [[rule_session_ends_when_staff_too_small]]
export function waitingMaterial(
  layout: StaffLayout,
  playhead: PlayheadPosition | null,
  latestReady: number,
): readonly SystemSlot[] {
  const shown = new Set(shownSlots(systemsAt(layout, playhead, latestReady)).map(slotKey))
  const playing =
    playhead === null ? 0 : absoluteMeasure(playhead.phraseNumber, playhead.measureIndex)
  const waiting: SystemSlot[] = []
  for (let phrase = playhead?.phraseNumber ?? 1; phrase <= latestReady; phrase += 1) {
    for (const part of partsOf(layout)) {
      const slot: SystemSlot = { phraseNumber: phrase, part }
      const played = absoluteMeasure(phrase, PART_MEASURES[part].last) < playing
      if (!played && !shown.has(slotKey(slot))) waiting.push(slot)
    }
  }
  return waiting
}

/**
 * Intent: the distinct phrase numbers, ascending, that are shown or waiting: the phrases whose fit
 * the held viewport must still guarantee. Throws on the caller bugs `systemsAt` rejects.
 */
// @spec-link [[module_session_rolling_display]]
// @spec-link [[rule_session_ends_when_staff_too_small]]
export function phrasesShownOrWaiting(
  layout: StaffLayout,
  playhead: PlayheadPosition | null,
  latestReady: number,
): readonly number[] {
  const slots = [
    ...shownSlots(systemsAt(layout, playhead, latestReady)),
    ...waitingMaterial(layout, playhead, latestReady),
  ]
  return [...new Set(slots.map((slot) => slot.phraseNumber))].sort((a, b) => a - b)
}

/** Intent: the position holding the playhead's measure in a layout. */
function positionOf(layout: StaffLayout, playhead: PlayheadPosition): Position {
  if (layout === 'one-system') return playhead.phraseNumber % 2 === 1 ? 'top' : 'bottom'
  return playhead.measureIndex < 2 ? 'top' : 'bottom'
}

/**
 * Intent: how many measures are on screen after the one being played: the rest of the playhead's
 * system, plus the other system's measures when it holds the slot that comes next in reading
 * order. Throws on the caller bugs `systemsAt` rejects.
 */
// @spec-link [[module_session_rolling_display]]
// @spec-link [[rule_look_ahead_deadline]]
export function readAheadMeasures(
  layout: StaffLayout,
  playhead: PlayheadPosition,
  latestReady: number,
): number {
  const systems = systemsAt(layout, playhead, latestReady)
  const here = positionOf(layout, playhead)
  const held = systems[here]
  if (held === null) throw new Error(`rolling display: the playhead's ${here} system is empty`)
  const heldLast = PART_MEASURES[held.part].last
  const other = systems[here === 'top' ? 'bottom' : 'top']
  const rest = heldLast - playhead.measureIndex
  if (other === null) return rest
  const { first, last } = PART_MEASURES[other.part]
  const follows =
    absoluteMeasure(other.phraseNumber, first) === absoluteMeasure(held.phraseNumber, heldLast) + 1
  return follows ? rest + last - first + 1 : rest
}

/**
 * Intent: whether any part of phrase `phraseNumber` is shown on either position. Throws on a
 * phrase number that is not a positive integer and on the caller bugs `systemsAt` rejects.
 */
// @spec-link [[module_session_rolling_display]]
export function isPhraseOnScreen(
  layout: StaffLayout,
  playhead: PlayheadPosition | null,
  latestReady: number,
  phraseNumber: number,
): boolean {
  assertPhraseNumber(phraseNumber, 'phrase')
  const shown = shownSlots(systemsAt(layout, playhead, latestReady))
  return shown.some((slot) => slot.phraseNumber === phraseNumber)
}

/** Intent: a slot's identity, `${phraseNumber}:${part}`, so a position can tell a refill. */
// @spec-link [[module_session_rolling_display]]
export function slotKey(slot: SystemSlot): string {
  return `${slot.phraseNumber}:${slot.part}`
}
