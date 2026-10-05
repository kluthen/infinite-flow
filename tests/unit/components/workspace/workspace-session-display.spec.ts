/**
 * One session's rolling display, on its own: the playhead read on heard time once a frame, the
 * staff it publishes from the held layout and the readied phrases (phrase 1 being the very phrase
 * Idle shows), the look-ahead fit check in the held viewport, the material check a layout report
 * runs, and its teardown. At 240 BPM a measure lasts 1 s; phrase 1's first barline is at 6.1 s.
 */
import { describe, expect, it } from 'vitest'

import {
  createSessionDisplay,
  type SessionDisplay,
} from '@/components/workspace/workspace-session-display'
import type { SessionStaff } from '@/components/notation/session-staff'
import { notationInputFromOutcome } from '@/domain/notation/notation-input'
import { transformToWrittenPhrase } from '@/domain/notation/written-phrase'
import type { WrittenPhrase } from '@/domain/notation/written-phrase-types'
import type { StaffLayout } from '@/notation/notation-layout-policy'
import type { StaffLayoutInputs } from '@/notation/staff-fit-types'
import { slotKey } from '@/session/rolling-display'
import type { SessionPhrase } from '@/session/session-types'
import { measureSeconds } from '@/session/session-timing'
import { phraseFirstBeat, phraseStartsAt } from '@/audio/backing-track'
import { createClickPlan, withTempoFrom } from '@/audio/click-track'
import { FIT_NO_ROOM, FITS, TOO_WIDE } from '../../composables/fake-staff-fit'
import { phraseOneFor, sessionSettings } from '../../session/session-harness'
import { createFakeFrames, createFakePlanner } from './fake-frames'

const FIRST_BARLINE = 6.1
const SETTINGS = sessionSettings({ tempo: 240 })

/** A wide window's staff: one system, no height budget. */
const WIDE: StaffLayoutInputs = {
  containerWidthPx: 1100,
  viewport: { layout: 'one-system', heightBudgetPx: null },
}

/** Intent: the session phrase `n`, a real phrase generated from its own seed. */
function sessionPhrase(n: number): SessionPhrase {
  const { intent, outcome } = phraseOneFor(SETTINGS, { seed: 100 + n })
  return { phraseNumber: n, origin: 'carry-in', intent, outcome }
}

/** Intent: the written phrase of a session phrase, as the display derives it. */
function writtenOf(phrase: Pick<SessionPhrase, 'intent' | 'outcome'>): WrittenPhrase {
  return transformToWrittenPhrase(notationInputFromOutcome(phrase.outcome, phrase.intent))
}

/** The session timing a display rig reads: its starting tempo and the transport's phrase starts. */
interface RigTiming {
  readonly startingTempo: number
  readonly phraseStartsAt: (phraseNumber: number) => number
}

/** At 240 BPM, phrase 1's first barline at 6.1 s; no other phrase's start is asked for. */
const AT_240: RigTiming = {
  startingTempo: 240,
  phraseStartsAt: (n) => {
    if (n !== 1) throw new Error(`only phrase 1's start is asked for, not ${n}`)
    return FIRST_BARLINE
  },
}

/** Intent: a display over a hand-set clock, stepped frames and a fake planner. */
function displayRig(
  heldLayout: StaffLayout = 'one-system',
  outputLatency = 0,
  timing: RigTiming = AT_240,
) {
  let now = 5.1
  let inputs: StaffLayoutInputs | null = WIDE
  const frames = createFakeFrames()
  const planner = createFakePlanner()
  const published: { staff: SessionStaff; latestReady: number }[] = []
  const failures: unknown[] = []
  const phraseOne = writtenOf(phraseOneFor(SETTINGS))
  const display: SessionDisplay = createSessionDisplay({
    audio: {
      now: () => now,
      outputLatency: () => outputLatency,
      phraseStartsAt: timing.phraseStartsAt,
    },
    frames: frames.port,
    startingTempo: timing.startingTempo,
    heldLayout,
    phraseOne,
    latestInputs: () => inputs,
    loadPlanner: planner.load,
    publish: (staff, latestReady) => published.push({ staff, latestReady }),
    fail: (error) => failures.push(error),
  })
  return {
    display,
    frames,
    planner,
    published,
    failures,
    phraseOne,
    /** The staff published last. */
    staff: () => published.at(-1)!.staff,
    /** Move the audio clock to `t` and run one frame. */
    frameAt: (t: number) => {
      now = t
      frames.run()
    },
    setInputs: (next: StaffLayoutInputs | null) => {
      inputs = next
    },
    /** Ready phrases 2..n in order. */
    readyThrough: (n: number) => {
      for (let k = (published.at(-1)?.latestReady ?? 1) + 1; k <= n; k += 1) {
        display.phraseReady(sessionPhrase(k))
      }
    },
  }
}

/** Intent: a staff's two positions as slot keys. */
function keys(staff: SessionStaff): [string | null, string | null] {
  return [staff.top && slotKey(staff.top), staff.bottom && slotKey(staff.bottom)]
}

// @test-link [[module_session_rolling_display]]
describe('session display: the staff it publishes', () => {
  // @test-link [[rule_phrase_one_is_idle_phrase]]
  // @test-link [[rule_session_layout_fixed_at_start]]
  it('publishes phrase 1, the very phrase Idle shows, in the held layout with no playhead at once', () => {
    for (const layout of ['one-system', 'split'] as const) {
      const rig = displayRig(layout)

      expect(rig.published).toHaveLength(1)
      expect(rig.published[0]!.latestReady).toBe(1)
      const staff = rig.staff()
      expect(staff.layout).toBe(layout)
      expect(staff.playhead).toBeNull()
      expect(staff.top?.phrase).toBe(rig.phraseOne)
      expect(keys(staff)).toEqual(
        layout === 'split' ? ['1:opening', '1:closing'] : ['1:whole', null],
      )
      if (layout === 'split') expect(staff.bottom?.phrase).toBe(rig.phraseOne)
      expect(rig.frames.pending()).toBe(1)
    }
  })

  // @test-link [[rule_look_ahead_deadline]]
  it('shows phrase 2 once readied: below in one system, on top from measure 3 when split', () => {
    const one = displayRig('one-system')
    one.readyThrough(2)
    expect(keys(one.staff())).toEqual(['1:whole', '2:whole'])
    expect(one.published.at(-1)!.latestReady).toBe(2)
    expect(one.staff().bottom?.phrase).toEqual(writtenOf(sessionPhrase(2)))

    const split = displayRig('split')
    split.readyThrough(2)
    expect(keys(split.staff())).toEqual(['1:opening', '1:closing'])
    split.frameAt(FIRST_BARLINE + 2)
    expect(keys(split.staff())).toEqual(['2:opening', '1:closing'])
  })

  // @test-link [[rule_look_ahead_deadline]]
  it('throws on a phrase readied out of order', () => {
    const rig = displayRig()
    expect(() => rig.display.phraseReady(sessionPhrase(3))).toThrow(/phrase 2/)
  })
})

// @test-link [[module_session_rolling_display]]
describe('session display: the playhead', () => {
  // @test-link [[rule_playhead_follows_audio_clock]]
  it('stays null in the count-in and steps exactly at each heard barline, the output latency included', () => {
    // A power of two, so adding it to a barline's time and taking it off again is exact.
    const latency = 0.0625
    const rig = displayRig('one-system', latency)
    rig.readyThrough(2)
    const before = rig.published.length
    /** The audio clock's time when barline k (phrase 1's first is 0) is heard. */
    const heardBarline = (k: number) => FIRST_BARLINE + k + latency

    rig.frameAt(heardBarline(0) - 1e-9)
    expect(rig.staff().playhead).toBeNull()
    rig.frameAt(heardBarline(0))
    expect(rig.staff().playhead).toEqual({ phraseNumber: 1, measureIndex: 0 })
    rig.frameAt(heardBarline(1) - 0.01)
    rig.frameAt(heardBarline(1) - 1e-9)
    expect(rig.published).toHaveLength(before + 1)
    rig.frameAt(heardBarline(1))
    expect(rig.staff().playhead).toEqual({ phraseNumber: 1, measureIndex: 1 })
    rig.frameAt(heardBarline(4))
    expect(rig.staff().playhead).toEqual({ phraseNumber: 2, measureIndex: 0 })
    expect(rig.published).toHaveLength(before + 3)
    expect(rig.frames.pending()).toBe(1)
    expect(rig.failures).toEqual([])
  })

  // @test-link [[rule_playhead_follows_audio_clock]]
  // @test-link [[module_session_rolling_display]]
  it("follows the transport's tempo map: phrases 1 and 2 at 90 BPM, phrase 3 on at 95", () => {
    const counted = createClickPlan(1, 90)
    const plan = withTempoFrom(counted, phraseFirstBeat(counted, 3), 95)
    const rig = displayRig('one-system', 0, {
      startingTempo: 90,
      phraseStartsAt: (n) => phraseStartsAt(plan, n),
    })
    rig.readyThrough(3)
    rig.display.phraseTempo(2, 90)
    rig.display.phraseTempo(3, 95)
    const [one, three] = [phraseStartsAt(plan, 1), phraseStartsAt(plan, 3)]
    const playheadAtTime = (t: number) => {
      rig.frameAt(t)
      return rig.staff().playhead
    }

    expect(playheadAtTime(one - 1e-9)).toBeNull()
    expect(playheadAtTime(one)).toEqual({ phraseNumber: 1, measureIndex: 0 })
    expect(playheadAtTime(one + 4 * measureSeconds(90))).toEqual({
      phraseNumber: 2,
      measureIndex: 0,
    })
    expect(playheadAtTime(three - 1e-9)).toEqual({ phraseNumber: 2, measureIndex: 3 })
    expect(playheadAtTime(three)).toEqual({ phraseNumber: 3, measureIndex: 0 })
    expect(playheadAtTime(three + measureSeconds(95) - 1e-9)).toEqual({
      phraseNumber: 3,
      measureIndex: 0,
    })
    expect(playheadAtTime(three + measureSeconds(95))).toEqual({ phraseNumber: 3, measureIndex: 1 })
    expect(playheadAtTime(three + 3 * measureSeconds(95))).toEqual({
      phraseNumber: 3,
      measureIndex: 3,
    })
    expect(rig.failures).toEqual([])
  })

  // @test-link [[module_session_rolling_display]]
  it('throws on a phrase tempo out of order', () => {
    const rig = displayRig()
    expect(() => rig.display.phraseTempo(3, 240)).toThrow(/phrase 2/)
    rig.display.phraseTempo(2, 240)
    expect(() => rig.display.phraseTempo(2, 240)).toThrow(/phrase 3/)
  })

  // @test-link [[rule_playhead_follows_audio_clock]]
  it('stops at teardown: the waiting frame cancelled, no frame requested again', () => {
    const rig = displayRig()

    rig.display.stop()

    expect(rig.frames.pending()).toBe(0)
    expect(rig.frames.cancelled()).toBe(1)
    expect(() => rig.display.stop()).toThrow(/stopped twice/)
  })

  // @test-link [[rule_playhead_follows_audio_clock]]
  it('hands a frame error to `fail` and requests no further frame', () => {
    const rig = displayRig()

    // Phrase 2 is due on screen, but none was readied: the plan rejects it.
    rig.frameAt(FIRST_BARLINE + 4)

    expect(rig.failures).toHaveLength(1)
    expect(rig.frames.pending()).toBe(0)
  })
})

// @test-link [[module_session_rolling_display]]
describe('session display: fit', () => {
  // @test-link [[rule_look_ahead_phrase_must_fit_staff]]
  // @test-link [[rule_session_layout_fixed_at_start]]
  it('checks a look-ahead phrase in the held viewport at the latest layout inputs', async () => {
    const rig = displayRig('split')
    const candidate = sessionPhrase(2)
    rig.setInputs({
      containerWidthPx: 1300,
      viewport: { layout: 'one-system', heightBudgetPx: null },
    })

    await expect(rig.display.checkFit(candidate, 2)).resolves.toBe(true)

    expect(rig.planner.plans).toEqual([
      {
        phrase: writtenOf(candidate),
        containerWidthPx: 1300,
        viewport: { layout: 'split', heightBudgetPx: null },
      },
    ])
  })

  // @test-link [[rule_look_ahead_phrase_must_fit_staff]]
  it('answers false for notes too wide or no room, and never shows the misfit', async () => {
    const rig = displayRig()
    rig.planner.queue(TOO_WIDE, FIT_NO_ROOM, FITS)

    await expect(rig.display.checkFit(sessionPhrase(2), 2)).resolves.toBe(false)
    await expect(rig.display.checkFit(sessionPhrase(2), 2)).resolves.toBe(false)
    await expect(rig.display.checkFit(sessionPhrase(2), 2)).resolves.toBe(true)

    expect(rig.published).toHaveLength(1)
    expect(rig.display.isPhraseOnScreen(2)).toBe(false)
  })

  // @test-link [[rule_look_ahead_phrase_must_fit_staff]]
  it('rejects a fit check before the staff ever reported its layout', async () => {
    const rig = displayRig()
    rig.setInputs(null)

    await expect(rig.display.checkFit(sessionPhrase(2), 2)).rejects.toThrow(/layout/)
  })

  // @test-link [[rule_session_ends_when_staff_too_small]]
  it('checks every phrase shown or waiting at a layout report, in the held viewport', async () => {
    const rig = displayRig('one-system', 0.25)
    rig.readyThrough(3)
    rig.frameAt(FIRST_BARLINE + 3.3)
    // The heard playhead is in phrase 1's last measure: 1 and 2 are shown, 3 waits.
    expect(keys(rig.staff())).toEqual(['1:whole', '2:whole'])
    const inputs: StaffLayoutInputs = {
      containerWidthPx: 700,
      viewport: { layout: 'split', heightBudgetPx: 300 },
    }

    await expect(rig.display.materialFits(inputs)).resolves.toBe(true)
    expect(rig.planner.plans.map((plan) => plan.phrase)).toEqual([
      rig.phraseOne,
      writtenOf(sessionPhrase(2)),
      writtenOf(sessionPhrase(3)),
    ])
    expect(rig.planner.plans[0]!.viewport).toEqual({ layout: 'one-system', heightBudgetPx: 300 })
    expect(rig.planner.plans[0]!.containerWidthPx).toBe(700)

    const waiting = writtenOf(sessionPhrase(3))
    rig.planner.answer((phrase) =>
      JSON.stringify(phrase) === JSON.stringify(waiting) ? TOO_WIDE : FITS,
    )
    await expect(rig.display.materialFits(inputs)).resolves.toBe(false)

    rig.planner.answer((phrase) => (phrase === rig.phraseOne ? FIT_NO_ROOM : FITS))
    await expect(rig.display.materialFits(inputs)).resolves.toBe(false)

    // Once the playhead is in phrase 2, phrase 1 is neither shown nor waiting.
    rig.frameAt(FIRST_BARLINE + 4.3)
    rig.planner.plans.length = 0
    await expect(rig.display.materialFits(inputs)).resolves.toBe(true)
    expect(rig.planner.plans.map((plan) => plan.phrase)).toEqual([
      writtenOf(sessionPhrase(2)),
      writtenOf(sessionPhrase(3)),
    ])
  })

  // @test-link [[module_session_rolling_display]]
  it('tells whether a phrase is on screen', () => {
    const rig = displayRig('split')
    rig.readyThrough(2)

    expect(rig.display.isPhraseOnScreen(1)).toBe(true)
    expect(rig.display.isPhraseOnScreen(2)).toBe(false)
    rig.frameAt(FIRST_BARLINE + 2)
    expect(rig.display.isPhraseOnScreen(2)).toBe(true)
    expect(() => rig.display.isPhraseOnScreen(0)).toThrow()
  })
})

// @test-link [[module_session_rolling_display]]
// @test-link [[rule_session_change_applies_at_phrase_boundary]]
describe('session display: a discarded look-ahead phrase', () => {
  // @test-link [[rule_session_change_applies_at_phrase_boundary]]
  it('takes back a readied phrase none of which is on screen, and readies its number again', () => {
    const rig = displayRig('split')
    rig.readyThrough(2)
    const before = rig.staff()
    expect(rig.display.isPhraseOnScreen(2)).toBe(false)

    rig.display.phraseDiscarded(2)
    expect(rig.published.at(-1)!.latestReady).toBe(1)
    expect(keys(rig.staff())).toEqual(keys(before))
    expect(rig.staff().top?.phrase).toBe(before.top?.phrase)

    const regenerated = phraseOneFor(SETTINGS, { seed: 999 })
    const again: SessionPhrase = { ...sessionPhrase(2), ...regenerated }
    rig.display.phraseReady(again)
    rig.frameAt(FIRST_BARLINE + 2)
    expect(keys(rig.staff())).toEqual(['2:opening', '1:closing'])
    expect(rig.staff().top?.phrase).toEqual(writtenOf(again))
  })

  // @test-link [[rule_session_change_applies_at_phrase_boundary]]
  it('refuses to discard a phrase on screen, phrase 1, or one that is not the latest readied', () => {
    const shown = displayRig('one-system')
    shown.readyThrough(2)
    expect(() => shown.display.phraseDiscarded(2)).toThrow(/on screen/)
    expect(() => shown.display.phraseDiscarded(1)).toThrow(/cannot be discarded/)

    const split = displayRig('split')
    split.readyThrough(3)
    expect(() => split.display.phraseDiscarded(2)).toThrow(/cannot be discarded/)
    expect(split.published.at(-1)!.latestReady).toBe(3)
  })
})
