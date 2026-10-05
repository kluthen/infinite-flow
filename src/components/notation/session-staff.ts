/**
 * What PhraseScore shows while a practice session runs: the layout the session holds, the slot
 * each of the two system positions shows with its written phrase, and the playhead. Plus the small
 * pure rules the session staff's DOM code reads: the slots a staff shows at Idle, a position's slot
 * key, which phrase the hidden description follows, and the overlay state of one phrase on screen.
 */
import type { ExpectedNoteIdentity } from '@/domain/acknowledgement/expected-note'
import type { WrittenPhrase } from '@/domain/notation/written-phrase-types'
import type { StaffLayout, StaffViewport } from '@/notation/notation-layout-policy'
import type { ScoreOverlays } from '@/notation/score-overlays'
import {
  slotKey,
  type PlayheadPosition,
  type SystemPart,
  type SystemSlot,
} from '@/session/rolling-display'

/**
 * One system position's content during a session: a part of one phrase, with the written phrase
 * to engrave it from. Phrase 1 is the very phrase Idle shows, so a session start redraws nothing.
 */
// @spec-link [[module_session_rolling_display]]
export interface SessionSystem extends SystemSlot {
  readonly phrase: WrittenPhrase
}

/** The staff of a running session: its held layout, what each position shows, and the playhead. */
// @spec-link [[module_session_rolling_display]]
export interface SessionStaff {
  /** The layout held for the whole session. */
  readonly layout: StaffLayout
  readonly top: SessionSystem | null
  readonly bottom: SessionSystem | null
  /** The measure being played; null during the count-in. */
  readonly playhead: PlayheadPosition | null
}

/** One of the staff's two reserved system positions. */
export type StaffPosition = 'top' | 'bottom'

/** The positions in screen order, top first. */
export const STAFF_POSITIONS: readonly StaffPosition[] = ['top', 'bottom']

/** The part each position shows of the Idle phrase, by layout; null leaves the position blank. */
const IDLE_PARTS: Readonly<
  Record<StaffLayout, Readonly<Record<StaffPosition, SystemPart | null>>>
> = {
  'one-system': { top: 'whole', bottom: null },
  split: { top: 'opening', bottom: 'closing' },
}

/**
 * Intent: the slot a position shows at Idle: the phrase on the top system in the one-system
 * layout (the bottom position blank), or its opening above its closing in the split layout.
 */
// @spec-link [[module_session_staff_refill]]
// @spec-link [[rule_phrase_one_is_idle_phrase]]
export function idleSlot(
  phraseNumber: number,
  layout: StaffLayout,
  position: StaffPosition,
): SystemSlot | null {
  const part = IDLE_PARTS[layout][position]
  return part === null ? null : { phraseNumber, part }
}

/**
 * Intent: the comparison key of the inputs a system is engraved with: the container width and the
 * viewport drawn in, so an Idle engraving and a session's, in the same layout, compare equal.
 */
// @spec-link [[module_session_staff_refill]]
export function engravingKey(containerWidthPx: number, viewport: StaffViewport): string {
  return `${containerWidthPx}|${viewport.layout}|${viewport.heightBudgetPx ?? 'none'}`
}

/** Intent: the key of the slot a position shows, or null for a blank position. */
// @spec-link [[module_session_staff_refill]]
export function positionKey(slot: SystemSlot | null): string | null {
  return slot === null ? null : slotKey(slot)
}

/**
 * Intent: a system of the phrase the hidden score description follows: the playhead's phrase, or
 * the top system's during the count-in (null with a blank top). A playhead whose phrase no
 * position shows is the caller's error.
 */
// @spec-link [[module_session_staff_overlays]]
export function describedSessionSystem(staff: SessionStaff): SessionSystem | null {
  if (staff.playhead === null) return staff.top
  const phraseNumber = staff.playhead.phraseNumber
  const owner = [staff.top, staff.bottom].find((system) => system?.phraseNumber === phraseNumber)
  if (owner === undefined || owner === null) {
    throw new Error(`The playhead is in phrase ${phraseNumber}, which no system position shows.`)
  }
  return owner
}

/**
 * Intent: the overlay state of phrase `phraseNumber` on screen during a session: no start marker,
 * the playhead band only when the playhead is in this phrase, and the acknowledged notes the
 * caller found on its systems.
 */
// @spec-link [[module_session_staff_overlays]]
// @spec-link [[module_notation_note_identity_overlays]]
export function sessionPhraseOverlays(
  phraseNumber: number,
  playhead: PlayheadPosition | null,
  acknowledged: readonly ExpectedNoteIdentity[],
): ScoreOverlays {
  return {
    startMarker: null,
    playheadMeasure: playhead?.phraseNumber === phraseNumber ? playhead.measureIndex : null,
    acknowledged,
  }
}
