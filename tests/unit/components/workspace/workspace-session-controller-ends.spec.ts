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

import { controllerRig, playTo } from './session-controller-rig'
import { END_SAMPLES, endEvents, PHASE_TIMES, sessionIn } from './session-end-samples'

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
