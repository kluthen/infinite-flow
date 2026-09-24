<script setup lang="ts">
/**
 * A generic, presentational stepper for a value drawn from a fixed, ordered catalog (tempo's
 * only first-release use). Props-in/events-out only. Read-only keeps the control focusable and
 * announced but suppresses every value change, matching the read-only behavior every other
 * generation control follows while a request is in flight.
 */
import { computed } from 'vue'

const props = defineProps<{
  modelValue: number
  values: readonly number[]
  readonly: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: number]
}>()

/** Intent: crash early when the current value is absent from its own catalog. */
const currentIndex = computed(() => {
  const index = props.values.indexOf(props.modelValue)
  if (index === -1) {
    throw new Error(`TempoStepper value ${props.modelValue} is not one of its catalog values.`)
  }
  return index
})

const min = computed(() => props.values[0])
const max = computed(() => props.values[props.values.length - 1])
const atMin = computed(() => currentIndex.value === 0)
const atMax = computed(() => currentIndex.value === props.values.length - 1)

/** Intent: move to the value at `index` unless read-only or the index is out of catalog bounds. */
function moveTo(index: number): void {
  if (props.readonly) return
  const next = props.values[index]
  if (next === undefined) return
  emit('update:modelValue', next)
}

/** Intent: step the current value toward the previous catalog entry. */
function decrement(): void {
  moveTo(currentIndex.value - 1)
}

/** Intent: step the current value toward the next catalog entry. */
function increment(): void {
  moveTo(currentIndex.value + 1)
}

/** Intent: spinbutton keyboard support -- Arrow keys step by one, Home/End jump to the bounds. */
function handleKeydown(event: KeyboardEvent): void {
  if (event.key === 'ArrowUp' || event.key === 'ArrowRight') {
    event.preventDefault()
    increment()
  } else if (event.key === 'ArrowDown' || event.key === 'ArrowLeft') {
    event.preventDefault()
    decrement()
  } else if (event.key === 'Home') {
    event.preventDefault()
    moveTo(0)
  } else if (event.key === 'End') {
    event.preventDefault()
    moveTo(props.values.length - 1)
  }
}
</script>

<template>
  <div
    class="input-stepper"
    role="spinbutton"
    tabindex="0"
    aria-label="Tempo"
    :aria-valuenow="modelValue"
    :aria-valuemin="min"
    :aria-valuemax="max"
    :aria-valuetext="`${modelValue} BPM`"
    :aria-readonly="readonly ? 'true' : undefined"
    @keydown="handleKeydown"
  >
    <button
      class="stepper-button"
      type="button"
      tabindex="-1"
      aria-label="Decrease tempo"
      :disabled="!readonly && atMin"
      :aria-disabled="readonly ? 'true' : undefined"
      @click="decrement"
    >
      &minus;
    </button>
    <span>{{ modelValue }} BPM</span>
    <button
      class="stepper-button"
      type="button"
      tabindex="-1"
      aria-label="Increase tempo"
      :disabled="!readonly && atMax"
      :aria-disabled="readonly ? 'true' : undefined"
      @click="increment"
    >
      &plus;
    </button>
  </div>
</template>
