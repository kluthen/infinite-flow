<script setup lang="ts">
/**
 * A generic, presentational single-select radiogroup used by every discrete generation control.
 * Props-in/events-out only: no session or domain import, no internal notion of which musical
 * catalog it renders. Supports one deliberate exception to "always has a selection": a null
 * `modelValue` renders the group with no checked segment (the custom musical-preset state), with
 * its first option acting as the roving tab stop until a selection exists.
 */
import { computed, ref, watch } from 'vue'

import type { SegmentedControlOption } from './segmented-control-option'

const props = defineProps<{
  label: string
  options: readonly SegmentedControlOption[]
  modelValue: string | null
  readonly: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

/** Intent: locate the option index for a given value, or null when the value is unselected. */
function indexForValue(value: string | null): number | null {
  if (value === null) return null
  const index = props.options.findIndex((option) => option.value === value)
  if (index === -1) {
    throw new Error(`SegmentedControl "${props.label}" has no option for value "${value}".`)
  }
  return index
}

/** Intent: crash early on an unresolvable selection rather than rendering an inconsistent group. */
const checkedIndex = computed(() => indexForValue(props.modelValue))

/** Intent: track which option currently holds the roving tab stop, independent of selection. */
const rovingIndex = ref(checkedIndex.value ?? 0)

watch(checkedIndex, (next) => {
  rovingIndex.value = next ?? 0
})

/** Intent: emit the selected value unless the group is read-only, in which case selection is inert. */
function select(index: number): void {
  if (props.readonly) return
  const option = props.options[index]
  if (!option) return
  emit('update:modelValue', option.value)
}

/** Intent: move the roving tab stop to `index` and, unless read-only, also select it. */
function moveTo(index: number): void {
  rovingIndex.value = index
  select(index)
}

/** Intent: handle click selection on one segment; read-only groups accept focus but not selection. */
function handleClick(index: number): void {
  rovingIndex.value = index
  select(index)
}

/** Intent: roving-tabindex arrow/Home/End navigation that always moves focus, even when read-only. */
function handleKeydown(event: KeyboardEvent, index: number): void {
  const count = props.options.length
  let nextIndex: number | null = null
  if (event.key === 'ArrowRight' || event.key === 'ArrowDown') nextIndex = (index + 1) % count
  else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp')
    nextIndex = (index - 1 + count) % count
  else if (event.key === 'Home') nextIndex = 0
  else if (event.key === 'End') nextIndex = count - 1
  if (nextIndex === null) return
  event.preventDefault()
  moveTo(nextIndex)
  focusOption(nextIndex)
}

const optionRefs = ref<(HTMLButtonElement | null)[]>([])

/** Intent: move DOM focus onto the option at `index` after the roving tab stop changes. */
function focusOption(index: number): void {
  optionRefs.value[index]?.focus()
}
</script>

<template>
  <div
    class="segmented-control"
    :class="{ 'is-readonly': readonly }"
    role="radiogroup"
    :aria-label="label"
    :aria-readonly="readonly ? 'true' : undefined"
  >
    <button
      v-for="(option, index) in options"
      :key="option.value"
      :ref="(el) => (optionRefs[index] = el as HTMLButtonElement | null)"
      class="segment"
      :class="{ 'is-selected': index === checkedIndex }"
      type="button"
      role="radio"
      :aria-checked="index === checkedIndex ? 'true' : 'false'"
      :tabindex="index === rovingIndex ? 0 : -1"
      @click="handleClick(index)"
      @keydown="handleKeydown($event, index)"
    >
      {{ option.label }}
    </button>
  </div>
</template>
