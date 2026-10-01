<script setup lang="ts">
/**
 * The connection sheet's `device-picker`: one `device-option` button per listed input, in the
 * list's order, with one roving tab stop (the device in use, else the first). Arrows only move
 * focus (Up/Left previous, Down/Right next, never past either end); Enter, Space or a click
 * chooses. An option that leaves the list while it holds the stop hands it to the next option, or
 * the previous when it was last, taking focus along if it had it.
 */
import { nextTick, ref, watch } from 'vue'

import type { MidiDevice } from '@/midi/midi-controller-state'

const props = defineProps<{
  devices: readonly MidiDevice[]
  /** The device currently in use (picker reached from Connected), marked "(in use)"; else null. */
  inUseId: string | null
  /** The id of the instruction line naming the group. */
  labelledby: string
}>()

const emit = defineEmits<{
  /** The player chose this listed device. */
  choose: [deviceId: string]
}>()

/** How far each arrow key moves focus: back for Up and Left, on for Down and Right. */
const ARROW_STEP: Readonly<Record<string, number>> = {
  ArrowUp: -1,
  ArrowLeft: -1,
  ArrowDown: 1,
  ArrowRight: 1,
}

const group = ref<HTMLElement | null>(null)

/** Intent: the option holding the tab stop at first: the device in use when listed, else the first. */
function initialStop(): string | null {
  const inUse = props.devices.find((device) => device.id === props.inUseId)
  return (inUse ?? props.devices[0])?.id ?? null
}

/** The id of the option holding the roving tab stop. */
const stopId = ref<string | null>(initialStop())

/** Intent: the rendered option buttons, in list order. */
function optionButtons(): HTMLButtonElement[] {
  if (group.value === null) throw new Error('device picker: the group did not render')
  return Array.from(group.value.querySelectorAll<HTMLButtonElement>('.device-option'))
}

/** Intent: move the tab stop and focus to the option at `index`. */
function moveTo(index: number): void {
  const device = props.devices[index]
  const button = optionButtons()[index]
  if (device === undefined || button === undefined) throw new Error(`device picker: no ${index}`)
  stopId.value = device.id
  button.focus()
}

/** Intent: arrows move focus to the previous or next option, clamped to the list's ends. */
// @spec-link [[req_midi_controller_input]]
function handleKeydown(event: KeyboardEvent, index: number): void {
  const step = ARROW_STEP[event.key]
  if (step === undefined) return
  event.preventDefault()
  moveTo(Math.min(Math.max(index + step, 0), props.devices.length - 1))
}

/**
 * Intent: when the option holding the stop leaves the list, the option now at its place (the next
 * one) takes the stop, else the new last one (the previous); focus follows when the leaving option
 * had it. Runs before the options re-render, while the leaving button is still in the page.
 */
// @spec-link [[rule_same_controller_reattaches]]
watch(
  () => props.devices,
  (next, previous) => {
    const held = stopId.value
    if (held === null || next.some((device) => device.id === held)) return
    const was = previous.findIndex((device) => device.id === held)
    const hadFocus = optionButtons()[was] === document.activeElement
    const place = previous.slice(0, was).filter((d) => next.some((n) => n.id === d.id)).length
    const index = Math.min(place, next.length - 1)
    stopId.value = next[index]?.id ?? null
    if (hadFocus && index >= 0) void nextTick(() => moveTo(index))
  },
  { flush: 'pre' },
)
</script>

<template>
  <div ref="group" class="device-picker" role="group" :aria-labelledby="labelledby">
    <button
      v-for="(device, index) in devices"
      :key="device.id"
      class="device-option"
      :class="{ 'is-selected': device.id === inUseId }"
      type="button"
      :tabindex="device.id === stopId ? 0 : -1"
      @keydown="handleKeydown($event, index)"
      @click="emit('choose', device.id)"
    >
      {{ device.name }}<template v-if="device.id === inUseId"> (in use)</template>
    </button>
  </div>
</template>
