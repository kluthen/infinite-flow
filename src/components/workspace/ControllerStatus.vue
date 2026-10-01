<script setup lang="ts">
/**
 * The header's `controller-status`: always one `btn controller-status` button, either the
 * `Connect controller` button or a badge (a decorative dot, then one fixed-width label). It only
 * shows the form it is given and asks for the connection sheet; the shell decides what a click
 * does. During a session it is disabled, a status display only, its classes unchanged.
 */
import { computed, ref } from 'vue'

import type { ControllerStatusForm } from '@/midi/controller-status'

// @spec-link [[rule_controller_connects_between_sessions]]
// @spec-link [[rule_readonly_controls_keep_contrast]]
const props = defineProps<{
  form: ControllerStatusForm
  /** True during a session (count-in or running): the badge keeps full strength. */
  disabled: boolean
}>()

const emit = defineEmits<{
  /** The enabled button was clicked: open the connection sheet. */
  open: []
}>()

const button = ref<HTMLButtonElement | null>(null)

type BadgeForm = Exclude<ControllerStatusForm, { readonly kind: 'connect' }>

const BADGE_DOT: Readonly<Record<BadgeForm['kind'], string>> = {
  connected: 'is-success',
  'no-controller': 'is-neutral',
  blocked: 'is-error',
  disconnected: 'is-error',
}

/** Intent: the badge's fixed label: the device's name when connected, else the form's words. */
// @spec-link [[rule_controller_connects_between_sessions]]
function badgeLabel(form: BadgeForm): string {
  if (form.kind === 'connected') return form.device.name
  if (form.kind === 'no-controller') return 'No controller'
  if (form.kind === 'blocked') return 'MIDI access blocked'
  return 'Controller disconnected'
}

/** The badge shown, or null for the `Connect controller` button. */
const badge = computed(() => {
  const form = props.form
  if (form.kind === 'connect') return null
  return {
    dot: BADGE_DOT[form.kind],
    label: badgeLabel(form),
    error: form.kind === 'blocked' || form.kind === 'disconnected',
    title: form.kind === 'connected' ? form.device.name : undefined,
  }
})

/** Intent: move focus to the button, which is always rendered. */
function focus(): void {
  if (button.value === null) throw new Error('controller status: the button is not mounted')
  button.value.focus()
}

defineExpose({ focus })
</script>

<template>
  <button
    ref="button"
    class="btn controller-status"
    type="button"
    :class="{ 'is-badge': badge !== null, 'is-error': badge?.error === true }"
    :title="badge?.title"
    :disabled="disabled"
    @click="emit('open')"
  >
    <template v-if="badge === null">Connect controller</template>
    <template v-else>
      <span class="status-dot" :class="badge.dot" aria-hidden="true"></span>
      <span class="controller-status-label">{{ badge.label }}</span>
    </template>
  </button>
</template>
