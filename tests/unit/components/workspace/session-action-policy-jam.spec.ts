/**
 * When a fresh Jam (Jam mode at Idle, no doodle kept) could start: every condition of a session
 * start but the three that need a phrase, plus a connected controller. Each failing fact alone
 * blocks it; no phrase is ever asked for.
 */
import { describe, expect, it } from 'vitest'

import {
  freshJamCanStart,
  type FreshJamStartFacts,
} from '@/components/workspace/session-action-policy'

/** Jam mode at Idle with a controller connected: every condition holds. */
const STARTABLE: FreshJamStartFacts = {
  controllerLoaded: true,
  controllerConnected: true,
  sessionActive: false,
  reviewShowing: false,
  sheetOpen: false,
  orientationNoticeShown: false,
  jamStaffShown: true,
}

// @test-link [[rule_jam_start_conditions]]
describe('freshJamCanStart', () => {
  // @test-link [[rule_jam_start_conditions]]
  it('holds with no phrase on screen, when every other condition holds', () => {
    expect(freshJamCanStart(STARTABLE)).toBe(true)
  })

  // @test-link [[rule_jam_start_conditions]]
  // @test-link [[rule_jam_needs_controller]]
  it.each<[string, Partial<FreshJamStartFacts>]>([
    ['no controller connected', { controllerConnected: false }],
    ['the session controller not loaded', { controllerLoaded: false }],
    ['a session running', { sessionActive: true }],
    ['the review mode showing', { reviewShowing: true }],
    ['a sheet or confirmation open', { sheetOpen: true }],
    ['the rotate-device notice showing', { orientationNoticeShown: true }],
    ['the staff not shown (Needs more room or Notation error)', { jamStaffShown: false }],
  ])('fails with %s', (_name, change) => {
    expect(freshJamCanStart({ ...STARTABLE, ...change })).toBe(false)
  })
})
