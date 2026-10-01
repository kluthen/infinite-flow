/**
 * The header's `controller-status` as reactive state: the controller's changes folded into the
 * status facts, the one form the header shows, and how many devices were seen this page session.
 * During a session the header keeps the form it showed when the session started, so the header
 * never changes shape while the player is reading; the live form shows again once it ends.
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
  /** The form the header shows: the live one, or the one a running session started with. */
  readonly form: ComputedRef<ControllerStatusForm>
  /** How many distinct inputs were seen this page session. */
  readonly seenDeviceCount: ComputedRef<number>
}

/**
 * Intent: follow `midi` for as long as the calling scope lives (a component's setup), folding
 * every change it reports, the current one first. `sessionActive` is read reactively: the form is
 * frozen from its turning true until it turns false. No controller is lost in a session yet
 * (chunk 17 wires it), so the disconnected form never shows here.
 */
// @spec-link [[rule_same_controller_reattaches]]
// @spec-link [[rule_controller_connects_between_sessions]]
// @spec-link [[rule_midi_never_blocks_session]]
export function useControllerStatus(
  midi: MidiController,
  sessionActive: () => boolean,
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
    form: computed(() => sessionForm.value ?? liveForm.value),
    seenDeviceCount: computed(() => facts.value.seenDeviceIds.length),
  }
}
