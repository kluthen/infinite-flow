/**
 * The sentences of the no-room `room-notice`, shared by every place that shows it (the workspace
 * staff and the Review), so they always read the same. The stylesheet shows one of the two by the
 * notation layout's width query.
 */

/** From bp-tablet-landscape up: the window can grow. */
// @spec-link [[rule_staff_needs_room_notice]]
export const ROOM_NOTICE_WIDE = 'The staff needs more room. Make the window larger.'

/** Below bp-tablet-landscape: the screen itself is too small. */
// @spec-link [[rule_staff_needs_room_notice]]
export const ROOM_NOTICE_NARROW = 'This screen is too small to show the staff.'
