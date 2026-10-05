<script setup lang="ts">
/**
 * A generic, presentational single-select radiogroup used by every discrete generation control.
 * Props-in/events-out only: no session or domain import, no internal notion of which musical
 * catalog it renders. Supports one deliberate exception to "always has a selection": a null
 * `modelValue` renders the group with no checked segment (the custom musical-preset state), with
 * its first option acting as the roving tab stop until a selection exists. An option can be marked
 * unavailable (`disabled`): natively disabled, named by the element that says why, never checked,
 * and skipped by keyboard selection. The group can name an element describing it as a whole
 * (`describedBy`), such as a session option's note.
 */
import { computed, ref, watch } from 'vue'

import type { SegmentedControlOption } from './segmented-control-option'

const props = defineProps<{
  label: string
  options: readonly SegmentedControlOption[]
  modelValue: string | null
  readonly: boolean
  /** The id of an element describing the whole group, named by its `aria-describedby`. */
  describedBy?: string
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
  if (props.options[index]!.disabled === true) {
    throw new Error(
      `SegmentedControl "${props.label}" cannot check its unavailable option "${value}".`,
    )
  }
  return index
}

/** Intent: whether the option at `index` can take focus and be selected. */
function isAvailable(index: number): boolean {
  return props.options[index]?.disabled !== true
}

/**
 * Intent: the nearest available option from `start`, stepping by `step` (+1 or -1) and wrapping,
 * `start` included. Null only when no option is available.
 */
function nearestAvailable(start: number, step: 1 | -1): number | null {
  const count = props.options.length
  for (let offset = 0; offset < count; offset++) {
    const index = (((start + step * offset) % count) + count) % count
    if (isAvailable(index)) return index
  }
  return null
}

/** Intent: crash early on an unresolvable selection rather than rendering an inconsistent group. */
const checkedIndex = computed(() => indexForValue(props.modelValue))

/** Intent: track which option currently holds the roving tab stop, independent of selection. */
const rovingIndex = ref(checkedIndex.value ?? nearestAvailable(0, 1) ?? 0)

watch(checkedIndex, (next) => {
  rovingIndex.value = next ?? nearestAvailable(0, 1) ?? 0
})

/**
 * Intent: an option that becomes unavailable while it holds the roving tab stop (reached by arrow
 * keys while read-only) hands the stop back to the checked option, or the first available one, so
 * the group never loses its only tabbable segment.
 */
watch(
  () => props.options,
  () => {
    if (!isAvailable(rovingIndex.value))
      rovingIndex.value = checkedIndex.value ?? nearestAvailable(0, 1) ?? 0
  },
)

/** Intent: emit the selected value unless the group is read-only, in which case selection is inert. */
function select(index: number): void {
  if (props.readonly) return
  const option = props.options[index]
  if (!option || option.disabled === true) return
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

/**
 * Intent: roving-tabindex arrow/Home/End navigation that always moves focus, even when read-only,
 * skipping unavailable options.
 */
function handleKeydown(event: KeyboardEvent, index: number): void {
  let nextIndex: number | null = null
  if (event.key === 'ArrowRight' || event.key === 'ArrowDown')
    nextIndex = nearestAvailable(index + 1, 1)
  else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp')
    nextIndex = nearestAvailable(index - 1, -1)
  else if (event.key === 'Home') nextIndex = nearestAvailable(0, 1)
  else if (event.key === 'End') nextIndex = nearestAvailable(props.options.length - 1, -1)
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
  <!-- @spec-link [[rule_readonly_controls_keep_contrast]] -->
  <div
    class="segmented-control"
    :class="{ 'is-readonly': readonly }"
    role="radiogroup"
    :aria-label="label"
    :aria-readonly="readonly ? 'true' : undefined"
    :aria-describedby="describedBy"
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
      :disabled="option.disabled === true"
      :aria-describedby="option.describedBy"
      @click="handleClick(index)"
      @keydown="handleKeydown($event, index)"
    >
      {{ option.label }}
    </button>
  </div>
</template>
