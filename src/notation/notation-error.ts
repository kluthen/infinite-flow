/**
 * The typed failure surfaced by the notation layout and the engraving adapter when a written
 * phrase cannot be shown right now. None of them reflect a corrupt written model. Two codes are the
 * staff layout's own failures, told apart (see `isStaffLayoutFailure`) so a caller can handle them differently:
 * `notation_no_room` (the window cannot hold the staff at the legibility floor, whatever the phrase;
 * only a window change cures it) and `notation_notes_too_wide` (the window has room, but this
 * phrase's measures need more width; another phrase may fit). The other codes are transient
 * environment or library conditions (font loading, container measurement, an engraving-library
 * failure, content wider than its container) that retrying the same engraving can cure.
 */

/** The staff layout's two failure reasons: the window, or this phrase. */
export type StaffLayoutFailureCode = 'notation_no_room' | 'notation_notes_too_wide'

/** The closed set of notation failure reasons. */
export type NotationErrorCode =
  | StaffLayoutFailureCode
  | 'notation_bounds_exceeded'
  | 'notation_font_unavailable'
  | 'notation_container_unavailable'
  | 'notation_engraving_failed'

/**
 * Typed failure for a written phrase that cannot be engraved right now. `cause` (the
 * standard `Error` option) carries the original thrown value when this error wraps an unexpected
 * failure from the underlying engraving library, so nothing is ever silently swallowed.
 */
// @spec-link [[module_notation_layout_preflight]]
export class NotationError extends Error {
  readonly kind = 'NotationError' as const
  readonly code: NotationErrorCode
  readonly details: Readonly<Record<string, number>>

  constructor(
    code: NotationErrorCode,
    message: string,
    details: Readonly<Record<string, number>>,
    cause?: unknown,
  ) {
    super(message, cause === undefined ? undefined : { cause })
    this.name = 'NotationError'
    this.code = code
    this.details = details
  }
}

/** Intent: tell the staff layout's two failures apart from a notation error a retry can cure. */
// @spec-link [[module_notation_layout_preflight]]
export function isStaffLayoutFailure(
  error: NotationError,
): error is NotationError & { readonly code: StaffLayoutFailureCode } {
  return error.code === 'notation_no_room' || error.code === 'notation_notes_too_wide'
}
