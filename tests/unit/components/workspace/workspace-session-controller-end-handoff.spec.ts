/**
 * What a session end hands back, and the window changes that end nothing: a browser toolbar showing
 * or hiding, or a resize that keeps room for the held layout, never ends a session; the staff's
 * reports are kept from the Idle machinery during a session and the latest are re-applied at its
 * end; and an end once phrase 1 sounded opens the Review and asks for a fresh phrase, while an end
 * in the count-in keeps phrase 1 startable. On the fake audio clock at 240 BPM from 5 s: the
 * count-in runs from 5.1 s to 6.1 s, when phrase 1 starts sounding. The rig's fixed parts make one
 * system need 140 px of container width and a split system 100 px; 1 rem is 16 px, so
 * bp-tablet-landscape is 1024 px.
 */
import { describe, expect, it } from 'vitest'

import { NotationError } from '@/notation/notation-error'
import { playTo, WIDE_STAFF } from './session-controller-rig'
import { END_SAMPLES, endEvents, phoneWindow, sessionIn } from './session-end-samples'

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

// @test-link [[module_session_staff_engraving_outcomes]]
describe('session controller: the Idle layout hand-off', () => {
  // @test-link [[module_session_staff_engraving_outcomes]]
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

  // @test-link [[module_session_staff_engraving_outcomes]]
  it('re-applies the latest inputs alone when the staff reported nothing during the session', async () => {
    const rig = await sessionIn('running')

    rig.browser.pageVisibility.setHidden(true)

    expect(rig.idleReports).toEqual([{ kind: 'layout-inputs', inputs: WIDE_STAFF }])
  })

  // @test-link [[module_session_staff_engraving_outcomes]]
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

// @test-link [[req_last_session_review]]
describe('session controller: what an end leaves behind', () => {
  for (const sample of END_SAMPLES) {
    // @test-link [[req_last_session_review]]
    // @test-link [[rule_session_end_generates_next_phrase_one]]
    it(`opens the Review and asks for a fresh phrase after ${sample.name} once phrase 1 sounded`, async () => {
      const rig = await sessionIn('running', sample.before)

      sample.trigger(rig)

      expect(rig.controller.state.startBlocker).toBe('review_showing')
      expect(rig.controller.state.review?.showing).toBe(true)
      expect(rig.controller.state.review?.history.phrases().map((r) => r.phraseNumber)).toEqual([1])
      expect(rig.freshPhraseRequests).toHaveLength(1)
    })
  }

  // @test-link [[rule_count_in_ending_returns_to_idle]]
  it('keeps phrase 1 startable after an end in the count-in, with no Review and no fresh phrase', async () => {
    const rig = await sessionIn('count-in')

    rig.browser.pageVisibility.setHidden(true)

    expect(rig.controller.state.lastEnd?.phase).toBe('count-in')
    expect(rig.controller.state.canStart).toBe(true)
    expect(rig.idle.result).toBe(rig.phraseOne)
    expect(rig.controller.state.review).toBeNull()
    expect(rig.freshPhraseRequests).toEqual([])
  })
})
