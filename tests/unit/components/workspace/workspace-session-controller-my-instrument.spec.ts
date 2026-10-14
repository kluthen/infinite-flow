/**
 * The session controller's Start with my instrument selected: the session's settings take my
 * instrument's profile from phrase 1's intent, which embeds it, and every generation the running
 * session requests is built with that profile. No Idle path selects my instrument yet (chunk 20),
 * so the rig's Idle state is set to a my-instrument phrase 1 by hand.
 */
import { describe, expect, it } from 'vitest'

import { makeGenerationControls } from '@/domain/controls/generation-controls'
import { createGenerationIntent } from '@/domain/generation/generation-intent'
import { makeRequestId } from '@/domain/generation/generation-request'
import { makeMyInstrument } from '@/domain/profile/my-instrument'
import { makeSeed } from '@/domain/random/seed'
import { BASE_CONTROLS, generateSuccess } from '../../domain/generation/carry-in/carry-in-fixture'
import {
  controllerRig,
  outputsOf,
  playTo,
  RIG_SESSION_SEED,
  RIG_TEMPO,
} from './session-controller-rig'

/** My instrument written C3 to C6, sounding a minor third lower. */
const MY_PROFILE = makeMyInstrument({
  template: 'c-keyboard',
  name: 'My horn in A',
  clef: 'treble',
  writtenRange: { minMidi: 48, maxMidi: 84 },
  transposition: { octaves: 0, semitones: 3, direction: 'lower' },
}).profile

// @test-link [[service_session_engine]]
// @test-link [[entity_my_instrument]]
describe('session controller: Start with my instrument', () => {
  // @test-link [[service_session_engine]]
  it('takes the profile from phrase 1’s intent and requests every phrase with it', async () => {
    const rig = controllerRig()
    const controls = makeGenerationControls({
      ...BASE_CONTROLS,
      tempo: RIG_TEMPO,
      tonalCenter: 'D',
      instrumentProfileId: 'my-instrument',
    })
    const intent = createGenerationIntent({
      requestId: makeRequestId('my-instrument-idle'),
      seed: makeSeed(11),
      controls,
      musicalProfile: rig.idle.profileSelection,
      instrumentProfile: MY_PROFILE,
    })
    rig.idle.controls = controls
    rig.idle.latestIntent = intent
    rig.idle.result = { intent, outcome: generateSuccess(intent), sessionSeed: RIG_SESSION_SEED }

    rig.controller.start()
    expect(rig.runnerInputs[0]?.start.settings.instrumentProfile).toStrictEqual(MY_PROFILE)
    await playTo(rig, 10.2)

    const requests = outputsOf(rig, 'request-generation')
    expect(requests.length).toBeGreaterThan(1)
    for (const request of requests)
      expect(request.intent.instrumentProfile).toStrictEqual(MY_PROFILE)
    expect(outputsOf(rig, 'phrase-sounding').length).toBeGreaterThan(0)
  })
})
