/**
 * The page's `Tension across phrases` flag through the session controller over real runners. The
 * flag is off at page load, kept from one session to the next and changed only outside a session;
 * a session's start carries it to the engine as its multi-phrase tension arc flag. With it on,
 * the phrases from 2 on are requested in groups of four around the player's tension (one step
 * tenser, as chosen, one step calmer, as chosen, never calmer than Settled), while the settings the read-only controls show
 * keep the player's own tension at every phrase start: the step is never shown. At 240 BPM
 * phrase n starts at 6.1 + 4(n - 1) s.
 */
import { describe, expect, it } from 'vitest'

import { SessionControllerError } from '@/components/workspace/workspace-session-controller-types'
import type { TensionArc } from '@/domain/controls/generation-controls'
import { controllerRig, outputsOf, playTo, type ControllerRig } from './session-controller-rig'

/** Intent: when phrase `n` of a 240 BPM rig session starts sounding. */
function phraseStart(n: number): number {
  return 6.1 + 4 * (n - 1)
}

/**
 * Intent: the tension each phrase number was requested with, from every request the session made;
 * every rung of a phrase is requested with that phrase's tension, so one entry per phrase.
 */
function requestedTension(rig: ControllerRig): ReadonlyMap<number, TensionArc> {
  const byPhrase = new Map<number, TensionArc>()
  for (const request of outputsOf(rig, 'request-generation')) {
    const tension = request.intent.controls.tension
    const earlier = byPhrase.get(request.phraseNumber)
    if (earlier !== undefined && earlier !== tension)
      throw new Error(`phrase ${request.phraseNumber} requested with ${earlier} and ${tension}`)
    byPhrase.set(request.phraseNumber, tension)
  }
  return byPhrase
}

// @test-link [[req_multi_phrase_tension_arc]]
// @test-link [[rule_ephemeral_session_state]]
describe('session controller: the Tension across phrases flag', () => {
  // @test-link [[req_multi_phrase_tension_arc]]
  it('is off at page load, and a session started then requests every phrase at the chosen tension', async () => {
    const rig = controllerRig()
    expect(rig.controller.state.tensionAcrossPhrases).toBe(false)
    rig.controller.start()
    expect(rig.runnerInputs[0]!.start.multiPhraseTensionArc).toBe(false)
    await playTo(rig, phraseStart(5) + 0.05)
    const requested = requestedTension(rig)
    expect([2, 3, 4, 5, 6].map((n) => requested.get(n))).toEqual(
      Array(5).fill(rig.settings.controls.tension),
    )
  })

  // @test-link [[req_multi_phrase_tension_arc]]
  // @test-link [[rule_session_settings_locked]]
  it('changes only outside a session, and is kept through every end and the next start', async () => {
    const rig = controllerRig()
    rig.controller.setTensionAcrossPhrases(true)
    rig.controller.start()
    expect(() => rig.controller.setTensionAcrossPhrases(false)).toThrow(SessionControllerError)
    await playTo(rig, phraseStart(2))
    expect(() => rig.controller.setTensionAcrossPhrases(false)).toThrow(SessionControllerError)
    rig.controller.stop()
    expect(rig.controller.state.tensionAcrossPhrases).toBe(true)
    expect(rig.controller.state.review?.showing).toBe(true)
    rig.controller.setTensionAcrossPhrases(false)
    rig.controller.setTensionAcrossPhrases(true)
    rig.controller.closeReview()
    rig.controller.start()
    expect(rig.runnerInputs.map((input) => input.start.multiPhraseTensionArc)).toEqual([true, true])
  })
})

// @test-link [[req_multi_phrase_tension_arc]]
// @test-link [[rule_multi_phrase_tension_arc_cycle]]
// @test-link [[rule_automatic_change_updates_controls_quietly]]
describe('session controller: a session with Tension across phrases on', () => {
  // @test-link [[req_multi_phrase_tension_arc]]
  // @test-link [[rule_multi_phrase_tension_arc_cycle]]
  // @test-link [[rule_automatic_change_updates_controls_quietly]]
  it('requests each group of four around the chosen tension, and the controls keep showing the choice', async () => {
    const rig = controllerRig()
    expect(rig.settings.controls.tension).toBe('Settled')
    rig.controller.setTensionAcrossPhrases(true)
    rig.controller.start()
    expect(rig.controller.state.shownSettings).toEqual(rig.settings)

    for (const n of [2, 3, 4, 5, 6]) {
      await playTo(rig, phraseStart(n) + 0.05)
      expect(rig.controller.state.shownSettings).toEqual(rig.settings)
    }

    const requested = requestedTension(rig)
    // Phrase 1, at Idle, is as chosen; phrase 4's step calmer stays at Settled, the calm end.
    expect([2, 3, 4, 5, 6, 7].map((n) => requested.get(n))).toEqual([
      'Lift',
      'Settled',
      'Settled',
      'Settled',
      'Lift',
      'Settled',
    ])
    expect(outputsOf(rig, 'settings-changed')).toEqual([])
    expect(rig.idle.controls.tension).toBe('Settled')
  })
})
