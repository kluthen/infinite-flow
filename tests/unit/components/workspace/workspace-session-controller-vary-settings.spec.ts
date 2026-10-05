/**
 * The page's `Vary settings` flag and what the read-only controls show, through the session
 * controller over real runners. The flag is off at page load, kept from one session to the next
 * and changed only outside a session; a session started with it on runs the engine's mutations.
 * The controls show the start settings in the count-in, then what the phrase now sounding was
 * generated with: a change shows at the start of the phrase it applies to, on the audio clock.
 * The player's own controls are never written, and every end drops the session's settings before
 * Idle is asked for its fresh phrase. A settings change reads the rolling display: a look-ahead
 * phrase partly drawn stays and the change shows from the phrase after it; one with nothing drawn
 * and a measure left is discarded and readied again. At 240 BPM phrase n starts at 6.1 + 4(n - 1) s.
 */
import { describe, expect, it } from 'vitest'

import { SessionControllerError } from '@/components/workspace/workspace-session-controller-types'
import { makeSeed } from '@/domain/random/seed'
import { mutationPhrase } from '@/session/settings-mutation'
import type { SessionSettings } from '@/session/session-types'
import { sessionSettings } from '../../session/session-harness'
import { controllerRig, outputsOf, playTo, type ControllerRig } from './session-controller-rig'

/** Intent: when phrase `n` of a 240 BPM rig session starts sounding. */
function phraseStart(n: number): number {
  return 6.1 + 4 * (n - 1)
}

/**
 * Intent: a rig with `Vary settings` on and a session started: the phrase its first mutation lands
 * on, from the mutation seed, the seed drawn just before phrase 2's first attempt seed.
 */
function startedVarying(): { readonly rig: ControllerRig; readonly landsOn: number } {
  const rig = controllerRig()
  rig.controller.setVarySettings(true)
  rig.controller.start()
  const mutationSeed = outputsOf(rig, 'request-generation')[0]!.intent.seed - 1
  return { rig, landsOn: mutationPhrase(makeSeed(mutationSeed), 1) }
}

/** Intent: the rig's settings with one control changed, as an automatic change would give. */
function withLeapiness(rig: ControllerRig): SessionSettings {
  const leapiness = rig.settings.controls.leapiness === 'Angular' ? 'Smooth' : 'Angular'
  return {
    ...sessionSettings({ tempo: 240, leapiness }),
    musicalProfile: rig.settings.musicalProfile,
  }
}

// @test-link [[req_settings_mutation_flag]]
// @test-link [[rule_ephemeral_session_state]]
describe('session controller: the Vary settings flag', () => {
  // @test-link [[req_settings_mutation_flag]]
  it('is off at page load and a session started then runs no mutation', async () => {
    const rig = controllerRig()
    expect(rig.controller.state.varySettings).toBe(false)
    rig.controller.start()
    expect(rig.runnerInputs[0]!.start.varySettings).toBe(false)
    await playTo(rig, phraseStart(7))
    expect(outputsOf(rig, 'settings-changed')).toEqual([])
    expect(rig.controller.state.shownSettings).toEqual(rig.settings)
  })

  // @test-link [[req_settings_mutation_flag]]
  // @test-link [[rule_session_settings_locked]]
  it('changes only outside a session, and is kept through every end and the next start', async () => {
    const rig = controllerRig()
    rig.controller.setVarySettings(true)
    rig.controller.start()
    expect(() => rig.controller.setVarySettings(false)).toThrow(SessionControllerError)
    await playTo(rig, phraseStart(2))
    expect(() => rig.controller.setVarySettings(false)).toThrow(SessionControllerError)
    rig.controller.stop()
    expect(rig.controller.state.varySettings).toBe(true)
    expect(rig.controller.state.review?.showing).toBe(true)
    rig.controller.setVarySettings(false)
    rig.controller.setVarySettings(true)
    rig.controller.closeReview()
    rig.controller.start()
    expect(rig.runnerInputs.map((input) => input.start.varySettings)).toEqual([true, true])
  })

  // @test-link [[req_settings_mutation_flag]]
  // @test-link [[rule_mutation_lands_on_scheduled_phrase]]
  it('draws the mutation seed from the seed provider first, so its mutations replay from it', async () => {
    const { rig, landsOn } = startedVarying()
    await playTo(rig, phraseStart(6))
    const changes = outputsOf(rig, 'settings-changed')
    expect(changes[0]).toMatchObject({ phraseNumber: landsOn, cause: 'mutation' })
  })
})

// @test-link [[rule_automatic_change_updates_controls_quietly]]
// @test-link [[rule_mutation_reverts_at_session_end]]
describe('session controller: the settings the controls show', () => {
  // @test-link [[rule_automatic_change_updates_controls_quietly]]
  it('shows the start settings from the start, and a mutation only once its phrase starts sounding', async () => {
    expect(controllerRig().controller.state.shownSettings).toBeNull()
    const { rig, landsOn } = startedVarying()
    const playersControls = rig.idle.controls
    expect(rig.controller.state.shownSettings).toEqual(rig.settings)

    await playTo(rig, phraseStart(landsOn) - 0.05)
    const change = outputsOf(rig, 'settings-changed')[0]!
    expect(change).toMatchObject({ phraseNumber: landsOn, cause: 'mutation' })
    expect(rig.controller.state.shownSettings).toEqual(rig.settings)
    await playTo(rig, phraseStart(landsOn) + 0.05)
    expect(rig.controller.state.shownSettings).toEqual(change.settings)
    expect(rig.idle.controls).toBe(playersControls)
  })

  // @test-link [[rule_mutation_reverts_at_session_end]]
  // @test-link [[rule_session_end_generates_next_phrase_one]]
  it.each([
    ['Stop', (rig: ControllerRig) => rig.controller.stop()],
    ['a hidden tab', (rig: ControllerRig) => rig.browser.pageVisibility.setHidden(true)],
  ])(
    'drops the varied settings at an end by %s, before Idle is asked for its fresh phrase',
    async (_cause, endSession) => {
      const { rig, landsOn } = startedVarying()
      const playersControls = rig.idle.controls
      const playersProfile = rig.idle.profileSelection
      await playTo(rig, phraseStart(landsOn) + 0.05)
      const change = outputsOf(rig, 'settings-changed')[0]!
      expect(rig.controller.state.shownSettings).toEqual(change.settings)

      endSession(rig)

      expect(rig.controller.state.phase).toBe('idle')
      expect(rig.controller.state.shownSettings).toBeNull()
      expect(rig.freshPhraseRequests).toHaveLength(1)
      expect(rig.freshPhraseRequests[0]!.shownSettings).toBeNull()
      expect(rig.idle.controls).toBe(playersControls)
      expect(rig.idle.profileSelection).toBe(playersProfile)
      expect(rig.controller.state.varySettings).toBe(true)
    },
  )
})

// @test-link [[rule_session_change_applies_at_phrase_boundary]]
// @test-link [[module_session_rolling_display]]
describe('session controller: a settings change and the rolling display', () => {
  // @test-link [[rule_session_change_applies_at_phrase_boundary]]
  it('keeps a look-ahead phrase already drawn and shows the change from the phrase after it', async () => {
    const rig = controllerRig()
    rig.controller.start()
    await playTo(rig, phraseStart(2) + 0.5)
    expect(rig.controller.isPhraseOnScreen(3)).toBe(true)
    const drawn = rig.controller.state.sessionStaff
    const changed = withLeapiness(rig)

    rig.changeSettings(changed)

    expect(outputsOf(rig, 'phrase-discarded')).toEqual([])
    expect(outputsOf(rig, 'settings-changed')).toMatchObject([
      { phraseNumber: 4, cause: 'automatic' },
    ])
    expect(rig.controller.state.sessionStaff).toBe(drawn)
    await playTo(rig, phraseStart(3) + 0.05)
    expect(rig.controller.state.shownSettings).toEqual(rig.settings)
    await playTo(rig, phraseStart(4) + 0.05)
    expect(rig.controller.state.shownSettings).toEqual(changed)
    const requests = outputsOf(rig, 'request-generation')
    expect(requests.find((r) => r.phraseNumber === 3)!.intent.controls.leapiness).toBe(
      rig.settings.controls.leapiness,
    )
    expect(requests.find((r) => r.phraseNumber === 4)!.intent.controls.leapiness).toBe(
      changed.controls.leapiness,
    )
  })

  // @test-link [[rule_session_change_applies_at_phrase_boundary]]
  it('discards a decided look-ahead phrase none of which is drawn, and readies it again', async () => {
    const rig = controllerRig()
    rig.browser.windowShape.resize({ widthPx: 900, smallHeightPx: 500, remPx: 16 })
    rig.staff.layoutInputs({
      containerWidthPx: 800,
      viewport: { layout: 'split', heightBudgetPx: 250 },
    })
    rig.controller.start()
    expect(rig.controller.state.heldLayout).toBe('split')
    await playTo(rig, phraseStart(2) + 0.5)
    expect(rig.controller.state.latestReady).toBe(3)
    expect(rig.controller.isPhraseOnScreen(3)).toBe(false)
    const changed = withLeapiness(rig)

    rig.changeSettings(changed)

    expect(outputsOf(rig, 'phrase-discarded')).toEqual([
      { kind: 'phrase-discarded', phraseNumber: 3 },
    ])
    expect(outputsOf(rig, 'settings-changed')).toMatchObject([
      { phraseNumber: 3, cause: 'automatic' },
    ])
    expect(rig.controller.state.latestReady).toBe(2)
    await playTo(rig, phraseStart(2) + 1)
    expect(rig.controller.state.latestReady).toBe(3)
    await playTo(rig, phraseStart(3) + 0.05)
    expect(rig.controller.state.shownSettings).toEqual(changed)
    const readied = outputsOf(rig, 'phrase-ready').filter((o) => o.phrase.phraseNumber === 3)
    expect(readied).toHaveLength(2)
    expect(readied[1]!.phrase.intent.controls.leapiness).toBe(changed.controls.leapiness)
  })
})
