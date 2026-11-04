/**
 * When a fresh Jam (Jam mode at Idle, no doodle kept) could start: every condition of a session
 * start but the three that need a phrase, plus a connected controller. Each failing fact alone
 * blocks it; no phrase is ever asked for. When a Jam on the kept doodle could: as from Ready, its
 * phrase 1 written from the doodle shown with nothing running, failed or noticed on it, plus a
 * connected controller.
 */
import { describe, expect, it } from 'vitest'

import {
  freshJamCanStart,
  keptDoodleJamCanStart,
  keptPhraseOneShown,
  type FreshJamStartFacts,
  type KeptDoodleJamStartFacts,
} from '@/components/workspace/session-action-policy'
import type { IdlePhraseState } from '@/composables/generation-session-types'
import { NotationError } from '@/notation/notation-error'

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

/** Jam mode at Idle with a doodle kept, its phrase 1 shown, a controller connected. */
const KEPT_STARTABLE: KeptDoodleJamStartFacts = {
  controllerLoaded: true,
  controllerConnected: true,
  sessionActive: false,
  reviewShowing: false,
  sheetOpen: false,
  orientationNoticeShown: false,
  phraseOneShown: true,
}

/** Phrase 1 written from the kept doodle, shown as in Ready. */
const SHOWN: IdlePhraseState<object> = {
  latestIntent: null,
  result: {},
  operation: 'idle',
  generationError: null,
  notationError: null,
  resultEngraved: true,
  roomNotice: null,
  retriesRunning: false,
  roomNoticeAnnouncements: 0,
}

// @test-link [[rule_jam_on_held_doodle_skips_capture]]
describe('keptDoodleJamCanStart', () => {
  // @test-link [[rule_jam_on_held_doodle_skips_capture]]
  it('holds with phrase 1 shown and a controller connected, when every other condition holds', () => {
    expect(keptDoodleJamCanStart(KEPT_STARTABLE)).toBe(true)
  })

  // @test-link [[rule_jam_on_held_doodle_skips_capture]]
  // @test-link [[rule_jam_needs_controller]]
  it.each<[string, Partial<KeptDoodleJamStartFacts>]>([
    ['no controller connected', { controllerConnected: false }],
    ['the session controller not loaded', { controllerLoaded: false }],
    ['a session running', { sessionActive: true }],
    ['the review mode showing', { reviewShowing: true }],
    ['a sheet or confirmation open', { sheetOpen: true }],
    ['the rotate-device notice showing', { orientationNoticeShown: true }],
    ['phrase 1 not shown', { phraseOneShown: false }],
  ])('fails with %s', (_name, change) => {
    expect(keptDoodleJamCanStart({ ...KEPT_STARTABLE, ...change })).toBe(false)
  })
})

// @test-link [[rule_jam_on_held_doodle_skips_capture]]
describe('keptPhraseOneShown', () => {
  // @test-link [[rule_jam_on_held_doodle_skips_capture]]
  it.each<[string, Partial<IdlePhraseState<object>>]>([
    ['no phrase 1', { result: null }],
    ['phrase 1 not engraved yet', { resultEngraved: false }],
    ['Loading', { operation: 'generating' }],
    ['fit retries running', { retriesRunning: true }],
    ['a generation failure', { generationError: new Error('search_limit_exceeded') }],
    [
      'a notation error',
      { notationError: new NotationError('notation_engraving_failed', 'no', {}) },
    ],
    ['Needs more room', { roomNotice: 'no_room' }],
  ])('is false with %s, true as in Ready', (_name, change) => {
    expect(keptPhraseOneShown(SHOWN)).toBe(true)
    expect(keptPhraseOneShown({ ...SHOWN, ...change })).toBe(false)
  })
})
