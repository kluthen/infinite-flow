<script setup lang="ts">
/**
 * The controller-connection sheet: a centered modal dialog over a dimming backdrop, named by its
 * title, showing one state at a time (screens/controller-connection/handoff.md). It is driven by
 * the sheet reducer over the controller (see useConnectionSheetDriver). Focus moves to each new
 * state's main action (else Close) and is trapped in the sheet; Close, Escape and a backdrop click
 * close it from any state but the Use for my instrument confirmation, where they go back to the
 * check result. The host hides it on `close` and moves focus, and saves my instrument on
 * `use-for-my-instrument`.
 */
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'

import type { MyInstrument } from '@/domain/profile/my-instrument'
import { useForMyInstrument, type UseForMyInstrument } from './check-for-my-instrument'
import type { ConnectionSheetProps } from './connection-sheet-contract'
import {
  sheetActions,
  sheetFocusTarget,
  sheetTitle,
  type SheetButtonAction,
} from './connection-sheet-view'
import SheetStateBody from './SheetStateBody.vue'
import { useConnectionSheetDriver } from './use-connection-sheet-driver'

const props = defineProps<ConnectionSheetProps>()

const emit = defineEmits<{
  /** The sheet closed, by any path; the host hides it and moves focus. */
  close: []
  /** `Use for my instrument` was confirmed: the host saves this my instrument and selects it. */
  'use-for-my-instrument': [instrument: MyInstrument]
}>()

const { model, dispatch } = useConnectionSheetDriver(props, () => emit('close'))

const stage = computed(() => model.value.stage)

/**
 * Intent: what `Use this for my instrument` would save for the check's result, shown or being
 * confirmed; null when it is not offered (a match, or an instrument sounding outside MIDI notes 0
 * to 127) or no result shows.
 */
// @spec-link [[rule_transposition_check_sets_my_instrument]]
const use = computed<UseForMyInstrument | null>(() => {
  const current = stage.value
  if (current.kind !== 'check' && current.kind !== 'use') return null
  if (current.played === null) return null
  return useForMyInstrument(props.profile, props.myInstrument, current.played)
})

const actions = computed(() => sheetActions(stage.value, props.seenDeviceCount, use.value !== null))

const dialog = ref<HTMLElement | null>(null)
const closeButton = ref<HTMLButtonElement | null>(null)

/**
 * Intent: run a button's action (Close, Escape and the backdrop are `close`). The confirmed `Use
 * for my instrument` goes on to Connected and hands my instrument to the host to save.
 */
// @spec-link [[rule_controller_connects_between_sessions]]
// @spec-link [[rule_transposition_check_sets_my_instrument]]
function act(action: SheetButtonAction): void {
  if (action !== 'use-for-my-instrument') {
    dispatch({ kind: 'action', action })
    return
  }
  const confirmed = use.value
  if (confirmed === null) throw new Error('connection sheet: nothing to use for my instrument')
  dispatch({ kind: 'used', name: confirmed.instrument.name })
  emit('use-for-my-instrument', confirmed.instrument)
}

/** Intent: a click on the backdrop itself (not inside the sheet) closes the sheet. */
// @spec-link [[rule_controller_connects_between_sessions]]
function handleBackdropClick(event: MouseEvent): void {
  if (event.target === event.currentTarget) act('close')
}

/** Intent: the player chose a device in the picker. */
// @spec-link [[req_midi_controller_input]]
function choose(deviceId: string): void {
  dispatch({ kind: 'choose', deviceId })
}

/** Intent: the rendered dialog; asking for it while it is not rendered is a bug. */
function dialogElement(): HTMLElement {
  if (dialog.value === null) throw new Error('connection sheet: the dialog is not rendered')
  return dialog.value
}

/** Intent: the element the current state's focus goes to (see sheetFocusTarget). */
function mainFocusTarget(): HTMLElement | null {
  const target = sheetFocusTarget(stage.value, actions.value)
  switch (target.kind) {
    case 'picker':
      return dialogElement().querySelector<HTMLElement>('.device-option[tabindex="0"]')
    case 'action':
      return (
        dialogElement().querySelectorAll<HTMLElement>('.sheet-actions > button')[target.index] ??
        null
      )
    case 'close':
      return closeButton.value
  }
}

/** Intent: move focus to the current state's main action, else to Close. */
// @spec-link [[rule_controller_connects_between_sessions]]
function focusMain(): void {
  const target = mainFocusTarget()
  if (target === null) throw new Error(`connection sheet: no focus target at ${stage.value.kind}`)
  target.focus()
}

/** Intent: the sheet's tab stops, in order: Close, the body's tab stop, the actions. */
function tabStops(): HTMLElement[] {
  const selector = 'button:not([disabled]):not([tabindex="-1"])'
  return Array.from(dialogElement().querySelectorAll<HTMLElement>(selector))
}

/** Intent: Tab and Shift+Tab cycle through the sheet's tab stops, wrapping at both ends. */
// @spec-link [[rule_controller_connects_between_sessions]]
function cycleFocus(direction: 1 | -1): void {
  const stops = tabStops()
  const at = stops.findIndex((stop) => stop === document.activeElement)
  const from = at === -1 ? (direction === 1 ? -1 : 0) : at
  const next = stops[(from + direction + stops.length) % stops.length]
  if (next === undefined) throw new Error('connection sheet: no tab stop (Close is missing)')
  next.focus()
}

/** Intent: while the sheet is open, Escape closes it and Tab stays trapped in it. */
// @spec-link [[rule_controller_connects_between_sessions]]
function handleKeydown(event: KeyboardEvent): void {
  if (stage.value.kind === 'closed') return
  if (event.key === 'Escape') {
    event.preventDefault()
    act('close')
  } else if (event.key === 'Tab') {
    event.preventDefault()
    cycleFocus(event.shiftKey ? -1 : 1)
  }
}

/** Intent: on open, listen for Escape and Tab and focus the opening state's main action. */
onMounted(() => {
  document.addEventListener('keydown', handleKeydown)
  if (stage.value.kind !== 'closed') focusMain()
})

/** Intent: stop listening for keys once the sheet leaves the page. */
onBeforeUnmount(() => {
  document.removeEventListener('keydown', handleKeydown)
})

/** Intent: on every state change (a check result included), focus the new state's main action. */
// @spec-link [[rule_controller_connects_between_sessions]]
watch(
  stage,
  (next) => {
    if (next.kind !== 'closed') focusMain()
  },
  { flush: 'post' },
)
</script>

<template>
  <div v-if="stage.kind !== 'closed'" class="sheet-backdrop" @click="handleBackdropClick">
    <div ref="dialog" class="sheet" role="dialog" aria-modal="true" aria-labelledby="sheet-title">
      <div class="sheet-header">
        <h2 id="sheet-title" class="sheet-title">{{ sheetTitle(stage) }}</h2>
        <button ref="closeButton" class="btn sheet-close" type="button" @click="act('close')">
          Close
        </button>
      </div>
      <SheetStateBody
        :model="model"
        :profile="profile"
        :clef="clef"
        :profiles="profiles"
        :use="use"
        @choose="choose"
      />
      <div v-if="actions.length > 0" class="sheet-actions">
        <button
          v-for="button in actions"
          :key="button.action"
          class="btn"
          :class="{ 'btn-primary': button.primary }"
          type="button"
          @click="act(button.action)"
        >
          {{ button.label }}
        </button>
      </div>
    </div>
  </div>
</template>
