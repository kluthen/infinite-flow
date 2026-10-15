<script setup lang="ts">
/**
 * One semitone stepper of the My instrument sheet (`input-stepper note-stepper`): a whole number
 * between its own bounds, one tab stop on the `spinbutton`, Up and Right one step up, Down and
 * Left one step down, Home and End to its bounds; its buttons take no tab stop, and the one toward
 * a bound it has reached is disabled. Disabled, it keeps its value shown and changes nothing.
 * Props-in/events-out: the parent holds the value.
 */
import { computed } from 'vue'

// @spec-link [[req_my_instrument]]
const props = defineProps<{
  modelValue: number
  min: number
  max: number
  /** The spinbutton's accessible name ("Lowest note", "Sounds"). */
  label: string
  /** The value as shown: a note name with its octave, or the transposition in words. */
  valueText: string
  /** The value as announced: `aria-valuetext`. */
  valueA11yText: string
  /** The two buttons' accessible names: one step down, one step up. */
  downLabel: string
  upLabel: string
  disabled: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: number]
}>()

const atMin = computed(() => props.modelValue <= props.min)
const atMax = computed(() => props.modelValue >= props.max)

/** Intent: move to `value` unless disabled, or `value` lies beyond the stepper's own bounds. */
function moveTo(value: number): void {
  if (props.disabled || value < props.min || value > props.max) return
  emit('update:modelValue', value)
}

/** Intent: the spinbutton's keys: arrows step by one, Home and End jump to the bounds. */
function handleKeydown(event: KeyboardEvent): void {
  const moves: Record<string, () => number> = {
    ArrowUp: () => props.modelValue + 1,
    ArrowRight: () => props.modelValue + 1,
    ArrowDown: () => props.modelValue - 1,
    ArrowLeft: () => props.modelValue - 1,
    Home: () => props.min,
    End: () => props.max,
  }
  const move = moves[event.key]
  if (move === undefined) return
  event.preventDefault()
  moveTo(move())
}
</script>

<template>
  <div
    class="input-stepper note-stepper"
    role="spinbutton"
    tabindex="0"
    :aria-label="label"
    :aria-valuenow="modelValue"
    :aria-valuemin="min"
    :aria-valuemax="max"
    :aria-valuetext="valueA11yText"
    :aria-disabled="disabled ? 'true' : undefined"
    @keydown="handleKeydown"
  >
    <button
      class="stepper-button"
      type="button"
      tabindex="-1"
      :aria-label="downLabel"
      :disabled="disabled || atMin"
      @click="moveTo(modelValue - 1)"
    >
      &minus;
    </button>
    <span class="input-stepper-value">{{ valueText }}</span>
    <button
      class="stepper-button"
      type="button"
      tabindex="-1"
      :aria-label="upLabel"
      :disabled="disabled || atMax"
      @click="moveTo(modelValue + 1)"
    >
      &plus;
    </button>
  </div>
</template>
