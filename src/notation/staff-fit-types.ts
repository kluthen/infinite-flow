/**
 * The contract between the staff and the idle workspace for fitting a phrase to the room the
 * window gives it: the layout inputs the staff measures, and the verdicts of the two checks the
 * workspace runs before it draws anything (does this phrase fit, and is there room for the staff
 * at all). Types only; the checks live in the engraver, the decisions in the workspace session.
 */
import type { WrittenKey } from '@/domain/notation/written-phrase-types'
import type { StaffViewport } from './notation-layout-policy'

/**
 * The staff's current layout inputs, as PhraseScore measures them: container width and viewport,
 * and the shared system-position size it is drawn with. Every check planned from them plans with
 * that same size, so it always agrees with the staff.
 */
// @spec-link [[module_idle_fit_round]]
export interface StaffLayoutInputs {
  readonly containerWidthPx: number
  readonly viewport: StaffViewport
  /**
   * The shared system-position size, in engraving units (`planSystemPositionUnits`); absent means
   * the built-in size, `NOTATION_SYSTEM_POSITION_UNITS`.
   */
  readonly systemPositionUnits?: number
}

/** Why the window has no room for the staff: too narrow, or (in a window's height budget) too short. */
export type StaffNoRoomCause = 'too_narrow' | 'too_short'

/** Whether a generated phrase can be drawn at the legibility floor with the current inputs. */
// @spec-link [[module_idle_fit_round]]
export type StaffFitVerdict =
  | { readonly kind: 'fits' }
  | { readonly kind: 'no_room'; readonly cause: StaffNoRoomCause }
  | { readonly kind: 'notes_too_wide' }

/** Whether the window has room for the staff at all, whatever notes it holds. */
// @spec-link [[module_idle_fit_round]]
export type StaffRoomVerdict =
  { readonly kind: 'room' } | { readonly kind: 'no_room'; readonly cause: StaffNoRoomCause }

/** The key signature the staff's fixed parts are measured with (it sets their width). */
export type StaffKeySignature = WrittenKey['signature']

/**
 * The widths of the staff's fixed parts for one key signature, in engraving units at scale 1: the
 * leading clef, key signature and time signature, and the system padding. With the container
 * width, they are all the phrase-independent room check needs.
 */
// @spec-link [[rule_session_ends_when_staff_too_small]]
export interface StaffFixedParts {
  readonly leadingWidth: number
  readonly systemPadding: number
}
