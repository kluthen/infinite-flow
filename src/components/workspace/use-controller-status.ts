/**
 * The header's `controller-status` as reactive state: the controller's changes folded into the
 * status facts, the one form the header shows, and how many devices were seen this page session.
 * During a session the header keeps the form it showed when the session started, so the header
 * never changes shape while the player is reading, except to show a controller lost in it; the live
 * form shows again once it ends.
 */
import { computed, onScopeDispose, shallowRef, watch, type ComputedRef } from 'vue'

import {
  controllerStatusForm,
  foldControllerStatus,
  initialControllerStatusFacts,
  type ControllerStatusForm,
} from '@/midi/controller-status'
import type { MidiController } from '@/midi/midi-controller-state'

/** What the header and the connection sheet's host read; reactive. */
// @spec-link [[rule_same_controller_reattaches]]
export interface ControllerStatusView {
  /**
   * The form the header shows: the live one, or in a running session the one it started with, or
   * `disconnected` while its controller is lost.
   */
  readonly form: ComputedRef<ControllerStatusForm>
  /** How many distinct inputs were seen this page session. */
  readonly seenDeviceCount: ComputedRef<number>
}

/**
 * Intent: follow `midi` for as long as the calling scope lives (a component's setup), folding
 * every change it reports, the current one first. `sessionActive` and `lostInSession` are read
 * reactively: the form is frozen from `sessionActive` turning true until it turns false, except
 * that `disconnected` shows through the freeze while `lostInSession` is true (the frozen form
 * returns once the same device reattaches); outside a session `lostInSession` is not read.
 */
// @spec-link [[rule_same_controller_reattaches]]
// @spec-link [[rule_controller_loss_mid_session]]
// @spec-link [[rule_controller_connects_between_sessions]]
// @spec-link [[rule_midi_never_blocks_session]]
export function useControllerStatus(
  midi: MidiController,
  sessionActive: () => boolean,
  lostInSession: () => boolean,
): ControllerStatusView {
  const facts = shallowRef(
    foldControllerStatus(initialControllerStatusFacts(midi.state()), {
      state: midi.state(),
      devices: midi.devices(),
    }),
  )
  const unsubscribe = midi.subscribe((change) => {
    facts.value = foldControllerStatus(facts.value, change)
  })
  onScopeDispose(unsubscribe)

  const liveForm = computed(() => controllerStatusForm(facts.value, { lostInSession: false }))

  // The form a running session started with; null outside a session. Taken synchronously as the
  // session starts, before any change folded during it.
  const sessionForm = shallowRef<ControllerStatusForm | null>(
    sessionActive() ? liveForm.value : null,
  )
  watch(
    sessionActive,
    (active) => {
      sessionForm.value = active ? liveForm.value : null
    },
    { flush: 'sync' },
  )

  return {
    form: computed(() => {
      if (sessionForm.value === null) return liveForm.value
      if (lostInSession()) return controllerStatusForm(facts.value, { lostInSession: true })
      return sessionForm.value
    }),
    seenDeviceCount: computed(() => facts.value.seenDeviceIds.length),
  }
}
