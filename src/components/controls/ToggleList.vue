<script setup lang="ts">
/**
 * A generic, presentational `toggle-list`: a `role="group"`, labelled and described by elements
 * its parent renders, holding one `btn toggle-button` per item, pressed while the item is on, its
 * state in words (`toggle-button-state`, hidden from assistive technology, which reads
 * `aria-pressed`), as the audio mix's toggles. Each toggle is its own tab stop; arrow keys do
 * nothing special. Props-in/events-out only: a toggle reports its item's value and the parent
 * decides the new state. Read-only, every toggle keeps its value, stays focusable and carries
 * `aria-disabled` while script refuses activation by click, Space or Enter. A disabled item is
 * natively disabled, without `aria-disabled`, and named by the element that says why.
 */
import type { ToggleListItem } from './toggle-list-item'

const props = defineProps<{
  /** The id of the element naming the group: its field's label. */
  labelledBy: string
  /** The id(s) of the element(s) describing the group, such as its field's note; none if absent. */
  describedBy?: string | undefined
  items: readonly ToggleListItem[]
  readonly: boolean
}>()

const emit = defineEmits<{
  toggle: [value: string]
}>()

/** Intent: report the toggled item unless the list is read-only or the item disabled. */
// @spec-link [[ui_toggle_list]]
function handleClick(item: ToggleListItem): void {
  if (props.readonly || item.disabled === true) return
  emit('toggle', item.value)
}

/**
 * Intent: while read-only, refuse the button's own activation by Space or Enter, so a focused
 * toggle cannot be changed from the keyboard either; any other key, and every key while editable,
 * is left alone.
 */
// @spec-link [[ui_toggle_list]]
// @spec-link [[rule_readonly_controls_keep_contrast]]
function handleKeydown(event: KeyboardEvent): void {
  if (props.readonly && (event.key === ' ' || event.key === 'Enter')) event.preventDefault()
}
</script>

<template>
  <!-- @spec-link [[ui_toggle_list]] -->
  <div
    class="toggle-list"
    :class="{ 'is-readonly': readonly }"
    role="group"
    :aria-labelledby="labelledBy"
    :aria-describedby="describedBy"
  >
    <button
      v-for="item in items"
      :key="item.value"
      type="button"
      class="btn toggle-button"
      :aria-pressed="item.pressed ? 'true' : 'false'"
      :disabled="item.disabled === true"
      :aria-disabled="readonly && item.disabled !== true ? 'true' : undefined"
      :aria-describedby="item.describedBy"
      @click="handleClick(item)"
      @keydown="handleKeydown"
    >
      {{ item.label }}
      <span class="toggle-button-state" aria-hidden="true">{{ item.pressed ? 'on' : 'off' }}</span>
    </button>
  </div>
</template>
