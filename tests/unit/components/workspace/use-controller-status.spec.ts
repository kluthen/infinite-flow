import { describe, expect, it } from 'vitest'
import { effectScope, ref } from 'vue'

import { useControllerStatus } from '@/components/workspace/use-controller-status'
import { createControllerRig, KEYS_A, PAD_B } from '../../midi/midi-controller-rig'

/**
 * Intent: run the composable in its own effect scope over `midi`, with a session flag and a
 * lost-in-session flag to flip.
 */
function statusOver(midi: ReturnType<typeof createControllerRig>['controller']) {
  const sessionActive = ref(false)
  const lostInSession = ref(false)
  const scope = effectScope()
  const status = scope.run(() =>
    useControllerStatus(
      midi,
      () => sessionActive.value,
      () => lostInSession.value,
    ),
  )
  if (status === undefined) throw new Error('the scope did not run')
  return { status, sessionActive, lostInSession, scope }
}

// @test-link [[rule_same_controller_reattaches]]
// @test-link [[rule_controller_connects_between_sessions]]
describe('useControllerStatus', () => {
  it('starts at Connect controller with no device seen', () => {
    const { controller } = createControllerRig({ devices: [KEYS_A] })
    const { status } = statusOver(controller)
    expect(status.form.value).toEqual({ kind: 'connect' })
    expect(status.seenDeviceCount.value).toBe(0)
  })

  it('follows the controller: connected, then no-controller once unplugged, connected again on replug', async () => {
    const { midi, controller, at } = createControllerRig({ devices: [KEYS_A] })
    const { status } = statusOver(controller)
    await controller.connect()
    expect(status.form.value).toEqual({ kind: 'connected', device: KEYS_A })
    midi.unplug(KEYS_A.id, at(1))
    expect(status.form.value).toEqual({ kind: 'no-controller' })
    midi.plug(KEYS_A, at(2))
    expect(status.form.value).toEqual({ kind: 'connected', device: KEYS_A })
  })

  it('counts every device seen once, gone or not', async () => {
    const { midi, controller, at } = createControllerRig({ devices: [KEYS_A] })
    const { status } = statusOver(controller)
    await controller.connect()
    midi.plug(PAD_B, at(1))
    midi.unplug(PAD_B.id, at(2))
    midi.plug(PAD_B, at(3))
    expect(status.seenDeviceCount.value).toBe(2)
  })

  // @test-link [[rule_midi_never_blocks_session]]
  it('freezes the form shown at a session start until it ends: a deny answered mid-session shows after', async () => {
    const { midi, controller } = createControllerRig({ devices: [KEYS_A] })
    const { status, sessionActive } = statusOver(controller)
    midi.denyNextRequest()
    midi.holdNextRequest()
    const pending = controller.connect()
    sessionActive.value = true
    midi.releaseHeldRequest()
    await pending
    expect(controller.state()).toEqual({ kind: 'denied' })
    expect(status.form.value).toEqual({ kind: 'connect' })
    sessionActive.value = false
    expect(status.form.value).toEqual({ kind: 'blocked' })
  })

  // @test-link [[rule_controller_loss_mid_session]]
  it('shows disconnected through the freeze while lost in a session, the frozen form once reattached', async () => {
    const { midi, controller, at } = createControllerRig({ devices: [KEYS_A] })
    const { status, sessionActive, lostInSession } = statusOver(controller)
    await controller.connect()
    sessionActive.value = true
    midi.unplug(KEYS_A.id, at(1))
    lostInSession.value = true
    expect(status.form.value).toEqual({ kind: 'disconnected' })
    midi.plug(KEYS_A, at(2))
    lostInSession.value = false
    expect(status.form.value).toEqual({ kind: 'connected', device: KEYS_A })
  })

  // @test-link [[rule_controller_loss_mid_session]]
  it('shows the live form after a session the controller was lost in', async () => {
    const { midi, controller, at } = createControllerRig({ devices: [KEYS_A] })
    const { status, sessionActive, lostInSession } = statusOver(controller)
    await controller.connect()
    sessionActive.value = true
    midi.unplug(KEYS_A.id, at(1))
    lostInSession.value = true
    sessionActive.value = false
    expect(status.form.value).toEqual({ kind: 'no-controller' })
  })

  it('stops following the controller once its scope is disposed', async () => {
    const { controller } = createControllerRig({ devices: [KEYS_A] })
    const { status, scope } = statusOver(controller)
    scope.stop()
    await controller.connect()
    expect(status.form.value).toEqual({ kind: 'connect' })
  })
})
