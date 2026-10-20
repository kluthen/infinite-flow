/**
 * The workspace's session runner: the player's `Vary settings` choice becomes the engine's
 * settings-mutation flag, its seed derived from the start's session seed (and nothing derived
 * when it is off), no seed drawn from any provider; the multi-phrase tension arc flag is passed
 * on as it is;
 * the display reading the caller passes is the one the engine reads for a settings change; every
 * output, a settings change's included, reaches the caller.
 */

import { describe, expect, it } from 'vitest'

import {
  mutationFlagFor,
  startWorkspaceSessionRunner,
} from '@/components/workspace/workspace-session-runner'
import { makeSeed } from '@/domain/random/seed'
import { phraseAttemptSeed, settingsMutationSeed } from '@/session/session-seed-plan'
import type { SessionOutput, SessionSettings } from '@/session/session-types'
import { mutationPhrase, SETTINGS_MUTATION_OFF } from '@/session/settings-mutation'
import {
  fakeDisplay,
  fakeViewport,
  phraseOneFor,
  queuedProviders,
  realOutcomeFor,
  sessionSettings,
  UNREAD_DISPLAY,
} from '../../session/session-harness'

/** Intent: let every settled seam promise run its continuation. */
function settle(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0))
}

/** The session seed every rig starts from. */
const SESSION_SEED = makeSeed(0x51ed5eed)

/** Phrase n's start on a 240 BPM session whose count-in ends at 1 s: a phrase is 4 s. */
function phraseStart(phraseNumber: number): number {
  return 1 + 4 * (phraseNumber - 1)
}

/**
 * Intent: a 240 BPM workspace runner on real generation, its outputs and errors logged, with the
 * multi-phrase tension arc as `multiPhraseTensionArc` says (off unless given).
 */
function runnerRig(varySettings: boolean, display = UNREAD_DISPLAY, multiPhraseTensionArc = false) {
  const settings = sessionSettings({ tempo: 240 })
  const clock = { at: 0 }
  const outputs: SessionOutput[] = []
  const errors: unknown[] = []
  const providers = queuedProviders()
  const runner = startWorkspaceSessionRunner(
    {
      generate: (intent) => Promise.resolve(realOutcomeFor(intent)),
      checkFit: () => Promise.resolve(true),
      now: () => clock.at,
      providers,
      viewport: fakeViewport(false),
      display,
      onOutput: (output) => outputs.push(output),
      onError: (error) => errors.push(error),
    },
    {
      at: 0,
      settings,
      phraseOne: phraseOneFor(settings),
      sessionSeed: SESSION_SEED,
      adaptiveTempo: false,
      varySettings,
      multiPhraseTensionArc,
    },
  )
  return { runner, settings, clock, outputs, errors, providers }
}

/** Intent: play phrases 1 to `last` on the rig's clock, letting each request settle. */
async function playTo(rig: ReturnType<typeof runnerRig>, last: number): Promise<void> {
  await settle()
  rig.clock.at = 1
  rig.runner.dispatch({ kind: 'count-in-over', at: rig.clock.at })
  for (let phraseNumber = 2; phraseNumber <= last; phraseNumber += 1) {
    rig.clock.at = phraseStart(phraseNumber)
    rig.runner.dispatch({ kind: 'phrase-started-sounding', at: rig.clock.at, phraseNumber })
    await settle()
  }
}

// @test-link [[service_workspace_session_runner_factory]]
// @test-link [[req_settings_mutation_flag]]
// @test-link [[req_multi_phrase_tension_arc]]
describe('the workspace session runner', () => {
  // @test-link [[req_settings_mutation_flag]]
  // @test-link [[module_session_seed_plan]]
  it("maps the choice to the flag, on with the session seed's planned mutation seed", () => {
    expect(mutationFlagFor(false, SESSION_SEED)).toBe(SETTINGS_MUTATION_OFF)
    expect(mutationFlagFor(true, SESSION_SEED)).toEqual({
      kind: 'on',
      seed: settingsMutationSeed(SESSION_SEED),
    })
  })

  // @test-link [[req_settings_mutation_flag]]
  it('runs a long session with the flag off: no setting changes, no seed for mutations', async () => {
    const rig = runnerRig(false)
    await playTo(rig, 12)
    expect(rig.errors).toEqual([])
    const requests = rig.outputs.filter((output) => output.kind === 'request-generation')
    expect(requests.map((request) => request.phraseNumber).at(-1)).toBe(13)
    for (const request of requests) expect(request.intent.controls).toEqual(rig.settings.controls)
    expect(rig.outputs.some((output) => output.kind === 'settings-changed')).toBe(false)
    // At 240 BPM phrase 2's standalone attempt goes first, with the standalone rung's planned
    // seed; no seed is drawn from the provider, for a mutation or an attempt.
    expect(requests[0]).toMatchObject({ phraseNumber: 2, step: 'standalone', retry: 4 })
    expect(requests[0]!.intent.seed).toBe(phraseAttemptSeed(SESSION_SEED, 2, 4))
    expect(rig.providers.seedsHandedOut).toEqual([])
  })

  // @test-link [[req_multi_phrase_tension_arc]]
  it('passes the multi-phrase tension arc on: each phrase requested at its step, no setting changed', async () => {
    const rig = runnerRig(false, UNREAD_DISPLAY, true)
    expect(rig.settings.controls.tension).toBe('Settled')
    await playTo(rig, 5)
    expect(rig.errors).toEqual([])
    const requests = rig.outputs.filter((output) => output.kind === 'request-generation')
    const tensionOf = (phraseNumber: number) =>
      requests.find((request) => request.phraseNumber === phraseNumber)!.intent.controls.tension
    expect([2, 3, 4, 5, 6].map(tensionOf)).toEqual([
      'Lift',
      'Settled',
      'Settled',
      'Settled',
      'Lift',
    ])
    expect(rig.outputs.some((output) => output.kind === 'settings-changed')).toBe(false)
  })

  // @test-link [[req_settings_mutation_flag]]
  // @test-link [[rule_mutation_lands_on_scheduled_phrase]]
  // @test-link [[module_session_seed_plan]]
  it('with the flag on, derives the mutation seed from the session seed and mutates on the phrase it schedules', async () => {
    const rig = runnerRig(true)
    const mutationSeed = settingsMutationSeed(SESSION_SEED)
    const requests = () => rig.outputs.filter((output) => output.kind === 'request-generation')
    // Phrase 2's standalone attempt goes first at 240 BPM, with the standalone rung's planned seed.
    expect(requests()[0]).toMatchObject({ phraseNumber: 2, step: 'standalone', retry: 4 })
    expect(requests()[0]!.intent.seed).toBe(phraseAttemptSeed(SESSION_SEED, 2, 4))
    expect(rig.providers.seedsHandedOut).toEqual([])
    const landsOn = mutationPhrase(mutationSeed, 1)

    await playTo(rig, landsOn)

    expect(rig.errors).toEqual([])
    const changes = rig.outputs.filter((output) => output.kind === 'settings-changed')
    expect(changes).toHaveLength(1)
    expect(changes[0]).toMatchObject({ phraseNumber: landsOn, cause: 'mutation' })
    const changed: SessionSettings = changes[0]!.settings
    const mutated = requests().find((request) => request.phraseNumber === landsOn)!
    const before = requests().find((request) => request.phraseNumber === landsOn - 1)!
    expect(rig.outputs.indexOf(changes[0]!)).toBe(rig.outputs.indexOf(mutated) - 1)
    const writtenControls = (request: typeof mutated) => ({
      ...request.intent.controls,
      tonalCenter: request.intent.writtenTonalCenter,
    })
    expect(writtenControls(mutated)).toEqual(changed.controls)
    expect(mutated.intent.figureLevels).toEqual(changed.figureLevels)
    expect(writtenControls(before)).toEqual(rig.settings.controls)
    expect(changed).not.toEqual(rig.settings)
  })

  // @test-link [[rule_session_change_applies_at_phrase_boundary]]
  it('reads the display it is given for a settings change and forwards both outputs', async () => {
    const display = fakeDisplay(false)
    const rig = runnerRig(false, display)
    await playTo(rig, 2)
    const changed = sessionSettings({ tempo: 240, leapiness: 'Angular' })

    rig.clock.at = phraseStart(2) + 0.5
    rig.runner.dispatch({ kind: 'settings-change', at: rig.clock.at, settings: changed })

    expect(display.asked).toEqual([3])
    const kinds = rig.outputs.slice(-4).map((output) => output.kind)
    expect(kinds).toEqual(['phrase-discarded', 'settings-changed', 'request-generation', 'wake-at'])
    expect(rig.outputs.at(-3)).toMatchObject({ phraseNumber: 3, cause: 'automatic' })
  })
})
