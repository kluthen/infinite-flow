/**
 * The workspace's side of the remembered controller: at setup it asks the MIDI controller to
 * reselect the controller loaded from the device, and from then on it saves the remembered
 * controller each time it changes: written when a different device counts as connected, deleted by
 * the player's Disconnect, left alone by an unplug and by a reattachment of the same device.
 */
import { flushPromises, mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { defineComponent } from 'vue'

import {
  useControllerConnection,
  type RememberedControllerStore,
} from '@/components/workspace/use-controller-connection'
import { ADOPTED_INSTRUMENT_PROFILES } from '@/domain/profile/instrument-profiles'
import type { MidiDevice } from '@/midi/midi-controller-state'
import { createTestWorkspace } from './test-workspace'
import { createControllerRig, KEYS_A, PAD_B } from '../../midi/midi-controller-rig'

/** Intent: a store of the remembered controller recording what is remembered and forgotten. */
function recordingStore(loaded: MidiDevice | null) {
  const saves: string[] = []
  const store: RememberedControllerStore = {
    loaded,
    remember: (device) => saves.push(`remember ${device.id}`),
    forget: () => saves.push('forget'),
  }
  return { store, saves }
}

/** Intent: run the composable in a mounted component over this rig and store. */
function mountConnection(
  rig: ReturnType<typeof createControllerRig>,
  store: RememberedControllerStore,
) {
  const workspace = createTestWorkspace()
  const Host = defineComponent({
    setup() {
      useControllerConnection({
        midi: rig.controller,
        audio: workspace.audio,
        profile: () => ADOPTED_INSTRUMENT_PROFILES[0]!,
        clef: () => 'treble',
        myInstrument: () => null,
        sessionActive: () => false,
        controllerLost: () => false,
        onOpenChange: () => {},
        rememberedController: store,
      })
      return () => null
    },
  })
  return mount(Host)
}

// @test-link [[rule_last_controller_remembered]]
// @test-link [[entity_remembered_controller_record]]
describe('useControllerConnection: the remembered controller', () => {
  it('reselects the loaded controller at setup, saving nothing when it reattaches', async () => {
    const rig = createControllerRig({ devices: [KEYS_A] })
    rig.midi.setPermission('granted')
    const { store, saves } = recordingStore(KEYS_A)

    mountConnection(rig, store)
    await flushPromises()

    expect(rig.controller.state()).toEqual({ kind: 'connected', device: KEYS_A })
    expect(rig.midi.requestCount()).toBe(1)
    expect(saves).toEqual([])
  })

  // @test-link [[rule_controller_connects_between_sessions]]
  it('with nothing loaded, requests nothing and reads no permission at setup', async () => {
    const rig = createControllerRig({ devices: [KEYS_A] })
    rig.midi.setPermission('granted')
    const { store, saves } = recordingStore(null)

    mountConnection(rig, store)
    await flushPromises()

    expect(rig.controller.state()).toEqual({ kind: 'not-requested' })
    expect(rig.midi.requestCount()).toBe(0)
    expect(saves).toEqual([])
  })

  it('remembers each different device that counts as connected, once', async () => {
    const rig = createControllerRig({ devices: [KEYS_A, PAD_B] })
    const { store, saves } = recordingStore(null)
    mountConnection(rig, store)

    await rig.controller.connect()
    await rig.controller.select(KEYS_A.id)
    rig.midi.unplug(KEYS_A.id, rig.at(1))
    rig.midi.plug(KEYS_A, rig.at(2))
    await flushPromises()
    await rig.controller.select(PAD_B.id)

    expect(saves).toEqual(['remember port-a', 'remember port-b'])
  })

  // @test-link [[rule_disconnect_forgets_controller]]
  it("forgets it at the player's Disconnect, never at an unplug", async () => {
    const rig = createControllerRig({ devices: [KEYS_A] })
    const { store, saves } = recordingStore(null)
    mountConnection(rig, store)
    await rig.controller.connect()
    rig.midi.unplug(KEYS_A.id, rig.at(1))
    expect(saves).toEqual(['remember port-a'])

    rig.controller.disconnect()

    expect(saves).toEqual(['remember port-a', 'forget'])
  })
})
