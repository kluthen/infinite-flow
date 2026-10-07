/**
 * The session controller's rolling display: the staff it hands the screen from Start (phrase 1,
 * the very phrase Idle shows, in the held layout) to the end, the playhead following the heard
 * audio, each look-ahead attempt checked in the held viewport (a misfit is a failed attempt, never
 * shown), the material check of every staff layout report and the session staff failure (each
 * ending the session like Stop), and the teardown. On the fake audio clock at 240 BPM from 5 s:
 * the count-in runs from 5.1 s to 6.1 s, and phrase N starts sounding at 6.1 + 4 (N - 1) s.
 */
import { describe, expect, it } from 'vitest'

import type { SessionStaff } from '@/components/notation/session-staff'
import { notationInputFromOutcome } from '@/domain/notation/notation-input'
import { transformToWrittenPhrase } from '@/domain/notation/written-phrase'
import type { WrittenPhrase } from '@/domain/notation/written-phrase-types'
import { NotationError } from '@/notation/notation-error'
import type { StaffLayoutInputs } from '@/notation/staff-fit-types'
import { slotKey } from '@/session/rolling-display'
import type { SessionPhrase } from '@/session/session-types'
import { FIT_NO_ROOM, FITS, TOO_WIDE } from '../../composables/fake-staff-fit'
import {
  controllerRig,
  flush,
  outputsOf,
  playTo,
  WIDE_STAFF,
  type ControllerRig,
} from './session-controller-rig'

/** The wide staff, a little narrower: a report the window rule lets through. */
const NARROWER_STAFF: StaffLayoutInputs = { ...WIDE_STAFF, containerWidthPx: 1000 }

/** Intent: the staff the controller shows now; there must be one. */
function staffOf(rig: ControllerRig): SessionStaff {
  const staff = rig.controller.state.sessionStaff
  if (staff === null) throw new Error('no session staff')
  return staff
}

/** Intent: the staff's two positions as slot keys. */
function keys(staff: SessionStaff): [string | null, string | null] {
  return [staff.top && slotKey(staff.top), staff.bottom && slotKey(staff.bottom)]
}

/** Intent: the written phrase of a readied phrase or a checked attempt. */
function writtenOf(phrase: Pick<SessionPhrase, 'intent' | 'outcome'>): WrittenPhrase {
  return transformToWrittenPhrase(notationInputFromOutcome(phrase.outcome, phrase.intent))
}

/** Intent: the written phrases the staff shows now. */
function shownPhrases(rig: ControllerRig): WrittenPhrase[] {
  const staff = staffOf(rig)
  return [staff.top?.phrase, staff.bottom?.phrase].filter((p): p is WrittenPhrase => !!p)
}

/** Intent: the end events the controller sent its runners. */
function endEvents(rig: ControllerRig) {
  return rig.events.filter((event) => event.kind === 'end')
}

/** Intent: assert the session ended at `at` with `staff-not-shown`, torn down like Stop. */
function expectEndedLikeStop(rig: ControllerRig, at: number): void {
  expect(endEvents(rig)).toEqual([{ kind: 'end', at, cause: 'staff-not-shown' }])
  expect(rig.controller.state.lastEnd?.cause).toBe('staff-not-shown')
  expect(rig.controller.state.phase).toBe('idle')
  expect(rig.transport.isRunning()).toBe(false)
  expect(rig.browser.wakeLock.releases()).toBe(1)
  expect(rig.controller.state.sessionStaff).toBeNull()
  expect(rig.frames.pending()).toBe(0)
}

// @test-link [[module_session_rolling_display]]
// @test-link [[service_session_controller]]
describe('session controller: the rolling display', () => {
  // @test-link [[rule_phrase_one_is_idle_phrase]]
  // @test-link [[rule_session_layout_fixed_at_start]]
  it('shows phrase 1, the very phrase Idle shows, from the start, then phrase 2 below once readied', async () => {
    const rig = controllerRig()
    expect(rig.controller.state.sessionStaff).toBeNull()
    expect(rig.controller.state.latestReady).toBeNull()

    rig.controller.start()

    const atStart = staffOf(rig)
    expect(atStart.layout).toBe('one-system')
    expect(atStart.top?.phrase).toBe(rig.idleWritten)
    expect(keys(atStart)).toEqual(['1:whole', null])
    expect(atStart.playhead).toBeNull()
    expect(rig.controller.state.latestReady).toBe(1)

    await playTo(rig, 6)
    const phraseTwo = outputsOf(rig, 'phrase-ready')[0]!.phrase
    expect(keys(staffOf(rig))).toEqual(['1:whole', '2:whole'])
    expect(staffOf(rig).top?.phrase).toBe(rig.idleWritten)
    expect(staffOf(rig).bottom?.phrase).toEqual(writtenOf(phraseTwo))
    expect(staffOf(rig).playhead).toBeNull()
    expect(rig.controller.state.latestReady).toBe(2)
  })

  // @test-link [[rule_playhead_follows_audio_clock]]
  it('moves the playhead one measure at each barline of the heard audio, none in the count-in', async () => {
    const rig = controllerRig()
    rig.audioRig.setOutputLatency(0.125)
    rig.controller.start()

    await playTo(rig, 6.2)
    expect(staffOf(rig).playhead).toBeNull()
    await playTo(rig, 6.25)
    expect(staffOf(rig).playhead).toEqual({ phraseNumber: 1, measureIndex: 0 })
    await playTo(rig, 7.25)
    expect(staffOf(rig).playhead).toEqual({ phraseNumber: 1, measureIndex: 1 })
    await playTo(rig, 10.25)
    expect(staffOf(rig).playhead).toEqual({ phraseNumber: 2, measureIndex: 0 })
    expect(keys(staffOf(rig))).toEqual(['3:whole', '2:whole'])
  })

  // @test-link [[rule_session_layout_fixed_at_start]]
  // @test-link [[rule_look_ahead_phrase_must_fit_staff]]
  it('checks each look-ahead attempt in the held split layout, even once the window is wide', async () => {
    const rig = controllerRig()
    rig.browser.windowShape.resize({ widthPx: 900, smallHeightPx: 500, remPx: 16 })
    rig.staff.layoutInputs({
      containerWidthPx: 800,
      viewport: { layout: 'split', heightBudgetPx: 250 },
    })
    rig.controller.start()
    expect(rig.controller.state.heldLayout).toBe('split')

    rig.browser.windowShape.resize({ widthPx: 1400, smallHeightPx: 800, remPx: 16 })
    rig.staff.layoutInputs({
      containerWidthPx: 1300,
      viewport: { layout: 'one-system', heightBudgetPx: null },
    })
    await playTo(rig, 6)

    const check = outputsOf(rig, 'check-fit')[0]!
    const planned = rig.planner.plans.find((plan) => plan.phrase !== rig.idleWritten)
    expect(planned).toEqual({
      phrase: writtenOf(check),
      containerWidthPx: 1300,
      viewport: { layout: 'split', heightBudgetPx: null },
    })
    expect(rig.controller.state.phase).toBe('count-in')
  })

  // @test-link [[rule_look_ahead_phrase_must_fit_staff]]
  it('counts a misfit attempt as failed, and never shows it', async () => {
    for (const misfit of [TOO_WIDE, FIT_NO_ROOM]) {
      // At 120 BPM phrase 2's deadline leaves time for a carry-in retry; at 240 BPM its
      // standalone attempt goes first, with no rung after it.
      const rig = controllerRig(undefined, undefined, { tempo: 120 })
      rig.planner.queue(misfit)
      rig.controller.start()

      await playTo(rig, 6)

      const requests = outputsOf(rig, 'request-generation').filter((o) => o.phraseNumber === 2)
      expect(requests.map((request) => request.retry)).toEqual([0, 1])
      const rejected = rig.planner.plans[0]!.phrase
      const ready = outputsOf(rig, 'phrase-ready')[0]!.phrase
      expect(staffOf(rig).bottom?.phrase).toEqual(writtenOf(ready))
      expect(shownPhrases(rig)).not.toContainEqual(rejected)
    }
  })

  // @test-link [[rule_session_ends_when_staff_too_small]]
  it('ends like Stop when a layout report leaves a shown phrase misfit', async () => {
    const rig = controllerRig()
    rig.controller.start()
    await playTo(rig, 5.5)
    rig.planner.answer((phrase) => (phrase === rig.idleWritten ? TOO_WIDE : FITS))

    rig.staff.layoutInputs(NARROWER_STAFF)
    expect(rig.controller.state.phase).toBe('count-in')
    await flush()

    expectEndedLikeStop(rig, 5.5)
    expect(rig.controller.state.lastEnd?.phase).toBe('count-in')
  })

  // @test-link [[rule_session_ends_when_staff_too_small]]
  it('ends like Stop when a layout report leaves waiting material misfit', async () => {
    const rig = controllerRig()
    rig.audioRig.setOutputLatency(0.25)
    rig.controller.start()
    // Phrase 2 sounds from 10.1 s and phrase 3 is readied, but the heard playhead is still in
    // phrase 1's last measure: phrase 3 waits.
    await playTo(rig, 10.25)
    expect(staffOf(rig).playhead).toEqual({ phraseNumber: 1, measureIndex: 3 })
    expect(rig.controller.state.latestReady).toBe(3)
    const shown = shownPhrases(rig)
    rig.planner.answer((phrase) => (shown.includes(phrase) ? FITS : TOO_WIDE))

    rig.staff.layoutInputs(NARROWER_STAFF)
    await flush()

    expectEndedLikeStop(rig, 10.25)
    expect(rig.controller.state.lastEnd?.phase).toBe('running')
  })

  // @test-link [[rule_session_ends_when_staff_too_small]]
  it('keeps running when every phrase shown or waiting still fits at a layout report', async () => {
    const rig = controllerRig()
    rig.controller.start()
    await playTo(rig, 7)
    rig.planner.plans.length = 0

    rig.staff.layoutInputs(NARROWER_STAFF)
    await flush()

    expect(rig.planner.plans.map((plan) => plan.containerWidthPx)).toEqual([1000, 1000])
    expect(rig.controller.state.phase).toBe('running')
    expect(endEvents(rig)).toEqual([])
  })

  // @test-link [[rule_session_ends_when_staff_too_small]]
  it('ends like Stop on a session staff failure, which never reaches the Idle machinery', async () => {
    const rig = controllerRig()
    rig.controller.start()
    await playTo(rig, 7)

    rig.staff.sessionStaffFailed(new NotationError('notation_engraving_failed', 'failed', {}))

    expectEndedLikeStop(rig, 7)
    expect(rig.idleReports).toEqual([{ kind: 'layout-inputs', inputs: WIDE_STAFF }])
  })

  // @test-link [[rule_playhead_follows_audio_clock]]
  // @test-link [[rule_stop_ends_session]]
  it('stops the frame loop and leaves the staff to Idle at the end, and starts afresh next time', async () => {
    const rig = controllerRig()
    rig.controller.start()
    await playTo(rig, 5.5)
    expect(rig.frames.pending()).toBe(1)

    rig.controller.stop()

    expect(rig.frames.pending()).toBe(0)
    expect(rig.frames.cancelled()).toBe(1)
    expect(rig.controller.state.sessionStaff).toBeNull()
    expect(rig.controller.state.latestReady).toBeNull()

    rig.controller.start()
    expect(rig.frames.pending()).toBe(1)
    expect(staffOf(rig).top?.phrase).toBe(rig.idleWritten)
  })

  // @test-link [[module_session_rolling_display]]
  it('tells whether a phrase is on screen, never with no session', async () => {
    const rig = controllerRig()
    expect(rig.controller.isPhraseOnScreen(1)).toBe(false)
    rig.controller.start()
    expect(rig.controller.isPhraseOnScreen(1)).toBe(true)
    expect(rig.controller.isPhraseOnScreen(2)).toBe(false)

    await playTo(rig, 6)
    expect(rig.controller.isPhraseOnScreen(2)).toBe(true)

    rig.controller.stop()
    expect(rig.controller.isPhraseOnScreen(1)).toBe(false)
  })
})
