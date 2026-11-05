/**
 * What an Idle staff frame shows for a phrase 1 at Idle, from its state alone: the staff-frame
 * state class the States table defines, and whether the notation error or the room notice shows.
 * Shared by session mode's staff and Jam's staff for the kept doodle's phrase 1, so both read the
 * same Idle states the same way. Pure.
 */
import type { IdlePhraseStateView } from '@/composables/generation-session-types'

/**
 * Intent: the staff-frame state class, in priority order, the room notice first: it holds the
 * frame through a round under it, dimmed as the Loading it is. A retained result never engraved
 * (its notation error cleared by a later attempt that then failed) falls back to `staff-error`,
 * but only while idle, since every ordinary generation assigns a not-yet-engraved result just
 * before its own engraving step runs.
 */
// @spec-link [[service_idle_generation_session]]
// @spec-link [[rule_staff_needs_room_notice]]
export function idleStaffFrameClass(state: IdlePhraseStateView<unknown>): string {
  if (state.roomNotice !== null) {
    return state.operation === 'idle' ? 'staff-no-room' : 'staff-no-room staff-loading'
  }
  if (state.operation === 'generating') return 'staff-loading'
  if (state.notationError !== null) return 'staff-error'
  if (state.operation === 'idle' && state.result !== null && !state.resultEngraved) {
    return 'staff-error'
  }
  if (state.result !== null) return 'staff-ready'
  return 'staff-empty'
}
