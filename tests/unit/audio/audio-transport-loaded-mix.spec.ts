/**
 * The audio transport's starting mix: the saved mix the app loaded before its first draw, in
 * place of the design's first-load levels, read on first use and checked against the design's
 * range; with no loaded mix, the design's defaults, as before.
 */

import { describe, expect, it, vi } from 'vitest'

import type { AudioMix } from '@/audio/audio-mix'
import { createAudioTransport, type AudioTransport } from '@/audio/audio-transport'
import { createFakeAudioRig, type FakeAudioRig } from './fake-audio'
import { RIG_START, themeDesign } from './transport-rig'

/** A saved mix unlike the design's defaults: click off and quiet, backing on and soft. */
const LOADED_MIX: AudioMix = {
  clickOn: false,
  clickVolume: 0.35,
  backingOn: true,
  backingVolume: 0.25,
}

/** Intent: a transport on a fresh fake rig, starting from the mix `loadedMix` gives. */
function transportFrom(loadedMix: () => AudioMix): {
  readonly rig: FakeAudioRig
  readonly transport: AudioTransport
} {
  const rig = createFakeAudioRig({ startTime: RIG_START, outputLatency: 0 })
  const transport = createAudioTransport({
    openOutput: rig.openOutput,
    createWakeTimer: rig.createWakeTimer,
    readMixDesign: themeDesign,
    loadedMix,
  })
  return { rig, transport }
}

// @test-link [[req_session_audio_mix]]
// @test-link [[rule_first_phrase_waits_for_saved_settings]]
describe('the audio transport: the loaded mix', () => {
  // @test-link [[req_session_audio_mix]]
  // @test-link [[rule_settings_saved_on_change]]
  it('gives the loaded mix before unlock, reading it only on first use', () => {
    const loadedMix = vi.fn(() => LOADED_MIX)
    const { transport } = transportFrom(loadedMix)
    expect(loadedMix).not.toHaveBeenCalled()

    expect(transport.mix()).toEqual(LOADED_MIX)
    expect(transport.mix()).toEqual(LOADED_MIX)
    expect(loadedMix).toHaveBeenCalledOnce()
  })

  // @test-link [[req_session_audio_mix]]
  it("applies the loaded mix's gains at unlock", () => {
    const { rig, transport } = transportFrom(() => LOADED_MIX)
    transport.unlock()
    expect(rig.events()).toEqual([
      { kind: 'gain', gain: 'click-enable', value: 0, at: RIG_START, scheduledAt: RIG_START },
      { kind: 'gain', gain: 'click-volume', value: 0.35, at: RIG_START, scheduledAt: RIG_START },
      { kind: 'gain', gain: 'backing-enable', value: 1, at: RIG_START, scheduledAt: RIG_START },
      { kind: 'gain', gain: 'backing-volume', value: 0.25, at: RIG_START, scheduledAt: RIG_START },
    ])
  })

  // @test-link [[req_session_audio_mix]]
  // @test-link [[rule_click_volume_never_silent]]
  it("throws on a loaded volume outside the design's range", () => {
    const silentClick = transportFrom(() => ({ ...LOADED_MIX, clickVolume: 0 }))
    expect(() => silentClick.transport.mix()).toThrow(RangeError)
    const loudBacking = transportFrom(() => ({ ...LOADED_MIX, backingVolume: 1.5 }))
    expect(() => loudBacking.transport.unlock()).toThrow(RangeError)
    expect(loudBacking.rig.openOutputCalls()).toBe(0)
  })
})
