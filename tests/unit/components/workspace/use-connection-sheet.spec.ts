/**
 * The connection sheet's host when the lazily loaded sheet module fails to load: the sheet closes,
 * the failure propagates, and a MIDI request the click left in flight is abandoned, so the next
 * click adopts it instead of failing on a request already running.
 */
import { flushPromises } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { computed, defineComponent } from 'vue'

import { loadConnectionSheet } from '@/components/controller-connection/load-connection-sheet'
import { useConnectionSheet } from '@/components/workspace/use-connection-sheet'
import { C_KEYBOARD_PROFILE } from '@/domain/profile/instrument-profiles'
import type { ControllerStatusForm } from '@/midi/controller-status'
import { transportRig } from '../../audio/transport-rig'
import { createControllerRig, KEYS_A, type ControllerRig } from '../../midi/midi-controller-rig'

vi.mock('@/components/controller-connection/load-connection-sheet', () => ({
  loadConnectionSheet: vi.fn(),
}))

const loader = vi.mocked(loadConnectionSheet)
const SHEET_STUB = defineComponent({ render: () => null })

afterEach(() => {
  loader.mockReset()
})

/** Intent: the host over `rig`, between sessions, showing `form`. */
function hostOver(rig: ControllerRig, form: ControllerStatusForm = { kind: 'connect' }) {
  return useConnectionSheet({
    midi: rig.controller,
    audio: transportRig().transport,
    status: { form: computed(() => form), seenDeviceCount: computed(() => 0) },
    profile: () => C_KEYBOARD_PROFILE,
    clef: () => 'treble',
    myInstrument: () => null,
    sessionActive: () => false,
  })
}

/**
 * Intent: run `act` and return the rejections left unhandled meanwhile. While a listener of the
 * test's own is on the process, Vitest treats an unhandled rejection as handled by the test
 * instead of failing the run; the listener is removed afterwards.
 */
async function unhandledRejectionsDuring(act: () => Promise<void>): Promise<unknown[]> {
  const reasons: unknown[] = []
  const record = (reason: unknown) => reasons.push(reason)
  process.on('unhandledRejection', record)
  try {
    await act()
    await new Promise((resolve) => setTimeout(resolve, 0))
  } finally {
    process.off('unhandledRejection', record)
  }
  return reasons
}

// @test-link [[rule_controller_connects_between_sessions]]
describe('useConnectionSheet when the sheet fails to load', () => {
  it('abandons the request still in flight, so the next click adopts it', async () => {
    const rig = createControllerRig({ devices: [KEYS_A] })
    rig.midi.holdNextRequest()
    const host = hostOver(rig)
    const failure = new Error('chunk failed to load')
    loader.mockRejectedValueOnce(failure)

    const surfaced = await unhandledRejectionsDuring(async () => {
      host.open()
      await flushPromises()
    })

    expect(surfaced).toEqual([failure])
    expect(host.connectionSheetOpen.value).toBe(false)
    expect(rig.controller.state()).toEqual({ kind: 'requesting' })

    loader.mockResolvedValueOnce(SHEET_STUB)
    host.open()
    await flushPromises()
    const connecting = host.sheetProps.value?.connecting
    if (connecting === null || connecting === undefined) throw new Error('no connect attempt')
    rig.midi.releaseHeldRequest()

    await expect(connecting.settled).resolves.toBeUndefined()
    expect(rig.midi.requestCount()).toBe(1)
    expect(rig.controller.state()).toEqual({ kind: 'connected', device: KEYS_A })
  })

  it('abandons nothing once the request has settled', async () => {
    const rig = createControllerRig({ devices: [KEYS_A] })
    const host = hostOver(rig)
    const failure = new Error('chunk failed to load')
    let failLoad: (cause: unknown) => void = () => {}
    loader.mockReturnValueOnce(
      new Promise((_resolve, reject) => {
        failLoad = reject
      }),
    )

    const surfaced = await unhandledRejectionsDuring(async () => {
      host.open()
      await host.sheetProps.value?.connecting?.settled
      failLoad(failure)
      await flushPromises()
    })

    expect(surfaced).toEqual([failure])
    expect(host.connectionSheetOpen.value).toBe(false)
    expect(rig.controller.state()).toEqual({ kind: 'connected', device: KEYS_A })
  })
})
