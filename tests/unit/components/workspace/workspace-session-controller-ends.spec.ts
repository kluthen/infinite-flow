/**
 * Every way a session ends besides Stop, in its count-in and while it runs: the page hidden, a
 * portrait-shaped view, a held layout left too narrow (or, below bp-tablet-landscape, too short), an
 * audio interruption, and the engraving of phrase 1 failing at a new size. Each ends like Stop, once,
 * releasing both locks, stopping the audio and removing every listener. On the fake audio clock at
 * 240 BPM from 5 s: the count-in runs from 5.1 s to 6.1 s, when phrase 1 starts sounding. The rig's
 * fixed parts make one system need 140 px of container width, a split system 100 px, and the split
 * layout's positions 160 px of height budget; 1 rem is 16 px, so bp-tablet-landscape is 1024 px.
 */
import { describe, expect, it } from 'vitest'

import { NotationError } from '@/notation/notation-error'
import type { SessionEndCause } from '@/session/session-types'
import { controllerRig, playTo, WIDE_STAFF, type ControllerRig } from './session-controller-rig'

/** A moment of each phase: inside the count-in, and once phrase 1 sounds. */
const PHASE_TIMES = { 'count-in': 5.5, running: 6.6 } as const

type Phase = keyof typeof PHASE_TIMES

/** One way a session ends on its own. */
interface EndSample {
  readonly name: string
  readonly cause: SessionEndCause
  /** Prepare the window and the staff before the start (the held layout follows from them). */
  readonly before?: (rig: ControllerRig) => void
  readonly trigger: (rig: ControllerRig) => void
  /** Whether the audio was still running when it ended, so the controller faded it out. */
  readonly fades: boolean
}

/** Intent: a landscape window below bp-tablet-landscape, its staff split with room to spare. */
function phoneWindow(rig: ControllerRig): void {
  rig.browser.windowShape.resize({ widthPx: 900, smallHeightPx: 500, remPx: 16 })
  rig.staff.layoutInputs({
    containerWidthPx: 800,
    viewport: { layout: 'split', heightBudgetPx: 250 },
  })
}

const END_SAMPLES: readonly EndSample[] = [
  {
    name: 'the page hidden',
    cause: 'hidden-tab',
    trigger: (rig) => rig.browser.pageVisibility.setHidden(true),
    fades: true,
  },
  {
    name: 'a portrait-shaped view below bp-desktop',
    cause: 'staff-not-shown',
    trigger: (rig) =>
      rig.browser.windowShape.resize({ widthPx: 800, smallHeightPx: 1200, remPx: 16 }),
    fades: true,
  },
  {
    name: 'the held one-system layout too narrow at the new size',
    cause: 'staff-not-shown',
    trigger: (rig) => {
      rig.browser.windowShape.resize({ widthPx: 700, smallHeightPx: 400, remPx: 16 })
      rig.staff.layoutInputs({
        containerWidthPx: 120,
        viewport: { layout: 'split', heightBudgetPx: 250 },
      })
    },
    fades: true,
  },
  {
    name: 'the held split layout too short below bp-tablet-landscape',
    cause: 'staff-not-shown',
    before: phoneWindow,
    trigger: (rig) => {
      rig.browser.windowShape.resize({ widthPx: 900, smallHeightPx: 480, remPx: 16 })
      rig.staff.layoutInputs({
        containerWidthPx: 800,
        viewport: { layout: 'split', heightBudgetPx: 150 },
      })
    },
    fades: true,
  },
  {
    name: 'an audio interruption',
    cause: 'stop',
    trigger: (rig) => rig.audioRig.interrupt(),
    fades: false,
  },
  {
    name: 'phrase 1 too wide to engrave at the new size',
    cause: 'staff-not-shown',
    trigger: (rig) =>
      rig.staff.notationError(new NotationError('notation_notes_too_wide', 'too wide', {})),
    fades: true,
  },
  {
    name: 'phrase 1 failing to engrave',
    cause: 'staff-not-shown',
    trigger: (rig) =>
      rig.staff.notationError(new NotationError('notation_engraving_failed', 'failed', {})),
    fades: true,
  },
]

/** Intent: a rig whose session has reached `phase`, after `before` set the window up. */
async function sessionIn(phase: Phase, before?: (rig: ControllerRig) => void) {
  const rig = controllerRig()
  before?.(rig)
  rig.controller.start()
  await playTo(rig, PHASE_TIMES[phase])
  expect(rig.controller.state.phase).toBe(phase)
  return rig
}

/** Intent: the end events the controller sent its runners. */
function endEvents(rig: ControllerRig) {
  return rig.events.filter((event) => event.kind === 'end')
}

// @test-link [[rule_stop_ends_session]]
// @test-link [[rule_count_in_ending_returns_to_idle]]
describe('session controller: the other ends', () => {
  for (const sample of END_SAMPLES) {
    for (const phase of ['count-in', 'running'] as const) {
      // @test-link [[rule_hidden_tab_ends_session]]
      // @test-link [[rule_session_ends_on_portrait_view]]
      // @test-link [[rule_session_ends_when_staff_too_small]]
      // @test-link [[rule_screen_wake_lock_during_session]]
      // @test-link [[rule_landscape_lock_during_session]]
      // @test-link [[rule_session_never_pauses]]
      it(`ends on ${sample.name} in the ${phase}, like Stop, removing every listener`, async () => {
        const rig = await sessionIn(phase, sample.before)
        expect(rig.browser.pageVisibility.listenerCount()).toBe(1)
        expect(rig.browser.windowShape.listenerCount()).toBe(2)

        sample.trigger(rig)

        expect(endEvents(rig)).toEqual([
          { kind: 'end', at: PHASE_TIMES[phase], cause: sample.cause },
        ])
        expect(rig.controller.state.lastEnd).toEqual({
          cause: sample.cause,
          phase,
          soundedPhraseCount: phase === 'running' ? 1 : 0,
        })
        expect(rig.controller.state.phase).toBe('idle')
        expect(rig.controller.state.heldLayout).toBeNull()
        expect(rig.transport.isRunning()).toBe(false)
        const fades = rig.audioRig.events().filter((event) => event.kind === 'fade')
        expect(fades).toHaveLength(sample.fades ? 1 : 0)
        expect(rig.browser.wakeLock.log()).toEqual(['request', 'grant', 'release'])
        expect(rig.browser.orientationLock.log()).toEqual(['request', 'grant', 'release'])
        expect(rig.timers.map((timer) => timer.running())).toEqual([false])
        expect(rig.browser.pageVisibility.listenerCount()).toBe(0)
        expect(rig.browser.windowShape.listenerCount()).toBe(1)
        rig.idleReports.length = 0
        rig.staff.engraved()
        expect(rig.idleReports).toEqual([{ kind: 'engraved' }])
      })
    }
  }

  // @test-link [[rule_hidden_tab_ends_session]]
  // @test-link [[rule_session_ends_on_portrait_view]]
  it('ends once when two causes arrive in the same tick', async () => {
    const rig = await sessionIn('running')

    rig.browser.pageVisibility.setHidden(true)
    rig.browser.windowShape.resize({ widthPx: 800, smallHeightPx: 1200, remPx: 16 })
    rig.audioRig.interrupt()

    expect(endEvents(rig)).toEqual([{ kind: 'end', at: PHASE_TIMES.running, cause: 'hidden-tab' }])
    expect(rig.browser.wakeLock.releases()).toBe(1)
    expect(rig.browser.orientationLock.releases()).toBe(1)
    expect(rig.controller.state.lastEnd?.cause).toBe('hidden-tab')
  })

  // @test-link [[rule_hidden_tab_ends_session]]
  it('hears a later hidden page or interruption only in a later session', async () => {
    const rig = await sessionIn('count-in')
    rig.controller.stop()
    rig.browser.pageVisibility.setHidden(true)
    rig.browser.pageVisibility.setHidden(false)
    expect(endEvents(rig)).toHaveLength(1)

    rig.controller.start()
    rig.audioRig.interrupt()

    expect(endEvents(rig).map((event) => event.cause)).toEqual(['stop', 'stop'])
    expect(rig.controller.state.phase).toBe('idle')
  })

  // @test-link [[rule_session_ends_when_staff_too_small]]
  it('judges the held layout once phrase 1 fixed parts are measured, but a portrait view at once', async () => {
    let measured: (parts: { leadingWidth: number; systemPadding: number }) => void = () => {
      throw new Error('not requested yet')
    }
    const rig = controllerRig(undefined, () => new Promise((resolve) => (measured = resolve)))
    rig.controller.start()
    rig.staff.layoutInputs({
      containerWidthPx: 130,
      viewport: { layout: 'one-system', heightBudgetPx: null },
    })
    expect(rig.controller.state.phase).toBe('count-in')
    expect(rig.fixedPartsRequests()).toBe(1)

    measured({ leadingWidth: 60, systemPadding: 60 })
    await playTo(rig, 5.2)

    expect(rig.controller.state.lastEnd?.cause).toBe('staff-not-shown')

    const second = controllerRig(undefined, () => new Promise(() => undefined))
    second.controller.start()
    second.browser.windowShape.resize({ widthPx: 800, smallHeightPx: 1200, remPx: 16 })
    expect(second.controller.state.lastEnd?.cause).toBe('staff-not-shown')
  })
})

// @test-link [[rule_session_layout_fixed_at_start]]
describe('session controller: window changes that end nothing', () => {
  for (const phase of ['count-in', 'running'] as const) {
    // @test-link [[rule_session_ends_when_staff_too_small]]
    it(`ends nothing when only a browser toolbar shows or hides, in the ${phase}`, async () => {
      for (const before of [undefined, phoneWindow]) {
        const rig = await sessionIn(phase, before)
        const reading = rig.browser.windowShape.read()

        rig.browser.windowShape.resize({ ...reading })
        rig.browser.windowShape.resize({ ...reading })

        expect(rig.controller.state.phase).toBe(phase)
        expect(endEvents(rig)).toEqual([])
      }
    })

    // @test-link [[rule_session_layout_fixed_at_start]]
    it(`ends nothing on a resize that keeps room, keeping the held layout, in the ${phase}`, async () => {
      const rig = await sessionIn(phase)
      expect(rig.controller.state.heldLayout).toBe('one-system')

      rig.browser.windowShape.resize({ widthPx: 1100, smallHeightPx: 700, remPx: 16 })
      rig.staff.layoutInputs({
        containerWidthPx: 1000,
        viewport: { layout: 'one-system', heightBudgetPx: null },
      })

      expect(rig.controller.state.phase).toBe(phase)
      expect(rig.controller.state.heldLayout).toBe('one-system')
    })

    // @test-link [[rule_session_layout_fixed_at_start]]
    it(`judges a split layout held across bp-tablet-landscape as split, in the ${phase}`, async () => {
      const rig = await sessionIn(phase, phoneWindow)
      expect(rig.controller.state.heldLayout).toBe('split')

      rig.browser.windowShape.resize({ widthPx: 1200, smallHeightPx: 800, remPx: 16 })
      // Room for a split system (100 px) but not for one system (140 px).
      rig.staff.layoutInputs({
        containerWidthPx: 120,
        viewport: { layout: 'one-system', heightBudgetPx: null },
      })

      expect(rig.controller.state.phase).toBe(phase)
      expect(rig.controller.state.heldLayout).toBe('split')
    })
  }

  // @test-link [[rule_session_ends_when_staff_too_small]]
  it('waits for the staff to re-measure after a breakpoint crossing before judging its width', async () => {
    const rig = await sessionIn('count-in')

    rig.browser.windowShape.resize({ widthPx: 700, smallHeightPx: 400, remPx: 16 })
    expect(rig.controller.state.phase).toBe('count-in')

    rig.staff.layoutInputs({
      containerWidthPx: 120,
      viewport: { layout: 'split', heightBudgetPx: 250 },
    })
    expect(rig.controller.state.lastEnd?.cause).toBe('staff-not-shown')
  })
})

// @test-link [[rule_count_in_ending_returns_to_idle]]
describe('session controller: the Idle layout hand-off', () => {
  // @test-link [[rule_count_in_ending_returns_to_idle]]
  it('keeps every staff report from the Idle machinery during the session and re-applies the latest at its end', async () => {
    const rig = await sessionIn('count-in')
    const resized = {
      containerWidthPx: 1000,
      viewport: { layout: 'one-system', heightBudgetPx: null },
    } as const

    rig.browser.windowShape.resize({ widthPx: 1100, smallHeightPx: 700, remPx: 16 })
    rig.staff.layoutInputs(resized)
    rig.staff.engraved()
    await playTo(rig, 7)
    expect(rig.idleReports).toEqual([])

    rig.controller.stop()

    expect(rig.idleReports).toEqual([
      { kind: 'layout-inputs', inputs: resized },
      { kind: 'engraved' },
    ])
  })

  // @test-link [[rule_count_in_ending_returns_to_idle]]
  it('re-applies the latest inputs alone when the staff reported nothing during the session', async () => {
    const rig = await sessionIn('running')

    rig.browser.pageVisibility.setHidden(true)

    expect(rig.idleReports).toEqual([{ kind: 'layout-inputs', inputs: WIDE_STAFF }])
  })

  // @test-link [[rule_session_ends_when_staff_too_small]]
  it('hands a failed engraving of phrase 1 to the Idle machinery only once the session has ended', async () => {
    const rig = await sessionIn('count-in')
    const error = new NotationError('notation_no_room', 'no room', {})
    let phaseWhenReported: string | null = null
    const push = rig.idleReports.push.bind(rig.idleReports)
    rig.idleReports.push = (...reports) => {
      phaseWhenReported ??= rig.controller.state.phase
      return push(...reports)
    }

    rig.staff.notationError(error)

    expect(phaseWhenReported).toBe('idle')
    expect([...rig.idleReports]).toEqual([
      { kind: 'layout-inputs', inputs: WIDE_STAFF },
      { kind: 'notation-error', error },
    ])
  })
})

// @test-link [[rule_phrase_one_is_idle_phrase]]
describe('session controller: the phrase a session played', () => {
  // @test-link [[rule_phrase_one_is_idle_phrase]]
  it('blocks Start after any end once phrase 1 sounded, until a new Idle phrase replaces it', async () => {
    const rig = await sessionIn('running')

    rig.browser.pageVisibility.setHidden(true)

    expect(rig.controller.state.startBlocker).toBe('phrase_already_played')
    expect(rig.controller.state.lastHistory?.phrases().map((r) => r.phraseNumber)).toEqual([1])
    rig.idle.result = { ...rig.phraseOne }
    expect(rig.controller.state.canStart).toBe(true)
  })

  // @test-link [[rule_count_in_ending_returns_to_idle]]
  it('keeps phrase 1 startable after an end in the count-in', async () => {
    const rig = await sessionIn('count-in')

    rig.browser.pageVisibility.setHidden(true)

    expect(rig.controller.state.lastEnd?.phase).toBe('count-in')
    expect(rig.controller.state.canStart).toBe(true)
    expect(rig.idle.result).toBe(rig.phraseOne)
  })
})
