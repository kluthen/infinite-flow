/**
 * The session seed at Start, through the session controller over real runners: the session takes
 * phrase 1 exactly as Idle published it and its session seed from the Idle result, hands that seed
 * to the runner's start, and holds it in the history's session-wide facts with nothing derived
 * from it beside it. At 240 BPM phrase n starts at 6.1 + 4(n - 1) s.
 */
import { describe, expect, it } from 'vitest'

import { phraseAttemptSeed } from '@/session/session-seed-plan'
import { controllerRig, outputsOf, playTo, RIG_SESSION_SEED } from './session-controller-rig'

// @test-link [[module_session_seed_plan]]
describe('session controller: the session seed at Start', () => {
  // @test-link [[module_session_seed_plan]]
  it("starts the runner from the Idle result's phrase 1 and session seed", () => {
    const rig = controllerRig()
    expect(rig.idle.result?.sessionSeed).toBe(RIG_SESSION_SEED)

    rig.controller.start()

    const { start } = rig.runnerInputs[0]!
    expect(start.sessionSeed).toBe(RIG_SESSION_SEED)
    expect(start.phraseOne.intent).toBe(rig.phraseOne.intent)
    expect(start.phraseOne.outcome).toBe(rig.phraseOne.outcome)
    const first = outputsOf(rig, 'request-generation')[0]!
    expect(first.intent.seed).toBe(phraseAttemptSeed(RIG_SESSION_SEED, 2, first.retry))
  })

  // @test-link [[module_session_seed_plan]]
  it('holds the session seed in the history from Start, with no derived seed beside it', async () => {
    const rig = controllerRig()
    rig.controller.start()
    await playTo(rig, 6.1 + 4 + 0.5)
    rig.controller.stop()

    const history = rig.controller.state.lastHistory!
    expect(history.sessionSeed).toBe(RIG_SESSION_SEED)
    expect(Object.keys(history).filter((key) => /seed/i.test(key))).toEqual(['sessionSeed'])
    expect(history.phrases().map((record) => record.intent.seed)).toEqual([
      rig.phraseOne.intent.seed,
      outputsOf(rig, 'phrase-sounding')[1]!.phrase.intent.seed,
    ])
  })
})
