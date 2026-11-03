/**
 * A session started without phrase 1 runs as a Jam from phrase 1: none of session mode's options
 * (Vary settings, Tension across phrases, Rising tempo) runs in it whatever their saved choices
 * say, and the key and mode suggestion worked out at the doodle's end is kept with the session's
 * history beside the doodle. On the session controller rig's fake audio clock.
 */
import { describe, expect, it } from 'vitest'

import { makeQuantizedDoodle } from '@/domain/doodle/quantized-doodle'
import { DEFAULT_SESSION_OPTIONS } from '@/storage/records/setting-defaults'
import { startFresh } from './session-controller-fresh-start'
import { connectKeys } from './session-controller-midi'
import { controllerRig, playTo } from './session-controller-rig'

// @test-link [[rule_jam_runs_as_session_from_phrase_one]]
describe('session controller: a Jam from phrase 1', () => {
  // @test-link [[rule_jam_runs_as_session_from_phrase_one]]
  it('runs none of Vary settings, Tension across phrases and Rising tempo, all saved on', async () => {
    const rig = controllerRig(undefined, undefined, {
      savedSessionOptions: {
        ...DEFAULT_SESSION_OPTIONS,
        varySettings: true,
        tensionAcrossPhrases: true,
        risingTempo: true,
      },
    })
    await connectKeys(rig)
    startFresh(rig)
    expect(rig.runnerInputsWithoutPhraseOne).toHaveLength(1)
    const { start } = rig.runnerInputsWithoutPhraseOne[0]!
    expect(start.adaptiveTempo).toBe(false)
    expect(start.multiPhraseTensionArc).toBe(false)
    expect(start).not.toHaveProperty('varySettings')
    expect(start).not.toHaveProperty('mutation')
  })

  // @test-link [[module_key_suggestion]]
  it("keeps the suggestion worked out at the doodle's end beside the doodle", async () => {
    const rig = controllerRig()
    await connectKeys(rig)
    const fresh = startFresh(rig)
    const { countInEndsAt } = fresh.session.timeline
    await playTo(rig, countInEndsAt + 1.1)
    fresh.session.recordDoodle({
      doodle: makeQuantizedDoodle({
        measureCount: 1,
        notes: [{ startTick: 0, lengthTicks: 16, pitch: 67 }],
      }),
      captureTempo: rig.settings.controls.tempo,
      firstBarlineAt: countInEndsAt,
      endBarlineAt: countInEndsAt + 1,
      notes: [],
    })
    fresh.session.recordSuggestion({ kind: 'suggested', tonalCenter: 'G', collection: 'Major' })
    rig.controller.stop()
    expect(rig.controller.state.lastHistory?.suggestion()).toEqual({
      kind: 'suggested',
      tonalCenter: 'G',
      collection: 'Major',
    })
  })
})
