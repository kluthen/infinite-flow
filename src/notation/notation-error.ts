/**
 * The typed failure surfaced by the notation layout preflight and the engraving adapter when a
 * written phrase cannot be safely shown at the current container width, fonts are not ready, or
 * the container itself is unusable. Every code here is retryable by nature: none of them reflect
 * a corrupt written model, only a transient environment condition (container width, font
 * loading) or a legibility budget that a later resize or a smaller phrase can satisfy, so callers
 * may always retry the same engraving after the triggering condition changes.
 */

/** The closed set of retryable notation failure reasons. */
export type NotationErrorCode =
  | 'notation_below_legibility_floor'
  | 'notation_bounds_exceeded'
  | 'notation_font_unavailable'
  | 'notation_container_unavailable'
  | 'notation_engraving_failed'

/**
 * Typed, retryable failure for a written phrase that cannot be engraved right now. `cause` (the
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
