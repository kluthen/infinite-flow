/**
 * The connection sheet's driver on its own: it tells the host the sheet closed exactly once per
 * opening, after the closing step's effects, whatever the controller reports afterwards (a
 * Disconnect reporting synchronously, a controller change, a played note, a late connect outcome)
 * while the sheet is still mounted.
 */
import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h } from 'vue'

import type { SheetOpenAt } from '@/components/controller-connection/connection-sheet-contract'
import {
  useConnectionSheetDriver,
  type ConnectionSheetDriver,
} from '@/components/controller-connection/use-connection-sheet-driver'
import {
  createControllerRig,
  KEYS_A,
  PAD_B,
  type ControllerRig,
} from '../../midi/midi-controller-rig'

enableAutoUnmount(afterEach)

/**
 * Intent: mount a bare component driving the sheet over `rig` at `openAt` (making the click's
 * connect attempt at Requesting access), recording every `onClosed` call and the controller's
 * state at that moment.
 */
async function mountDriver(rig: ControllerRig, openAt: SheetOpenAt) {
  const connecting =
    openAt === 'requesting'
      ? { permission: rig.controller.permission(), settled: rig.controller.connect() }
      : null
  const onClosed = vi.fn(() => rig.controller.state().kind)
  let driver: ConnectionSheetDriver | undefined
  mount(
    defineComponent({
      setup() {
        driver = useConnectionSheetDriver({ midi: rig.controller, openAt, connecting }, onClosed)
        return () => h('div')
      },
    }),
  )
  await flushPromises()
  if (driver === undefined) throw new Error('driver not created')
  return { driver, onClosed }
}

// @test-link [[rule_controller_connects_between_sessions]]
describe('useConnectionSheetDriver close', () => {
  it('Disconnect tells the host once, after the controller has disconnected', async () => {
    const rig = createControllerRig({ devices: [KEYS_A] })
    await rig.controller.connect()
    const { driver, onClosed } = await mountDriver(rig, 'connected')

    driver.dispatch({ kind: 'action', action: 'disconnect' })

    expect(onClosed).toHaveBeenCalledTimes(1)
    expect(onClosed).toHaveReturnedWith('choosing')
    expect(driver.model.value.stage.kind).toBe('closed')
  })

  it('a controller change after Close does not tell the host again', async () => {
    const rig = createControllerRig({ devices: [KEYS_A] })
    const { driver, onClosed } = await mountDriver(rig, 'requesting')
    driver.dispatch({ kind: 'action', action: 'close' })

    rig.midi.plug(PAD_B, 10)

    expect(onClosed).toHaveBeenCalledTimes(1)
    expect(driver.model.value.stage.kind).toBe('closed')
  })

  it('a note played after Done does not tell the host again', async () => {
    const rig = createControllerRig({ devices: [KEYS_A] })
    await rig.controller.connect()
    const { driver, onClosed } = await mountDriver(rig, 'connected')
    driver.dispatch({ kind: 'action', action: 'done' })

    rig.midi.noteOn(KEYS_A.id, 60, 100, 10)

    expect(onClosed).toHaveBeenCalledTimes(1)
  })

  it('a connect outcome settling after Close does not tell the host again', async () => {
    const rig = createControllerRig({ devices: [KEYS_A] })
    rig.midi.holdNextRequest()
    const { driver, onClosed } = await mountDriver(rig, 'requesting')
    driver.dispatch({ kind: 'action', action: 'close' })

    rig.midi.releaseHeldRequest()
    await flushPromises()

    expect(onClosed).toHaveBeenCalledTimes(1)
  })
})
