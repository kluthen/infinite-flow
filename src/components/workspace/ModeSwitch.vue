<script setup lang="ts">
/**
 * The header's mode switch: the radiogroup "Mode", `Session` then `Jam`, over the workspace's mode
 * (./use-workspace-mode.ts). It only reports a press upward; the workspace decides. Read-only
 * (never disabled) while Loading, a session and the review mode; `is-loading` with `aria-busy`
 * while Jam's code loads, `Session` still pressable. Focus stays on the segment pressed.
 */
import SegmentedControl from '@/components/controls/SegmentedControl.vue'
import type { SegmentedControlOption } from '@/components/controls/segmented-control-option'
import type { WorkspaceMode, WorkspaceModeView } from './use-workspace-mode'

defineProps<{
  /** What the switch shows: the segment checked, the opening and the read-only. */
  view: WorkspaceModeView
}>()

const emit = defineEmits<{
  /** A segment was pressed (or reached by an arrow key) outside read-only. */
  select: [mode: WorkspaceMode]
}>()

const MODE_OPTIONS: readonly SegmentedControlOption[] = [
  { value: 'session', label: 'Session' },
  { value: 'jam', label: 'Jam' },
]

/** Intent: forward a segment's press as the mode it names, re-validated against the two modes. */
// @spec-link [[module_workspace_mode]]
function handleSelect(value: string): void {
  if (value !== 'session' && value !== 'jam') throw new Error(`Unknown workspace mode "${value}".`)
  emit('select', value)
}
</script>

<template>
  <!-- @spec-link [[rule_mode_button_at_idle_only]] -->
  <SegmentedControl
    class="mode-switch"
    :class="{ 'is-loading': view.opening }"
    :aria-busy="view.opening ? 'true' : undefined"
    label="Mode"
    :options="MODE_OPTIONS"
    :model-value="view.checked"
    :readonly="view.readonly"
    @update:model-value="handleSelect"
  />
</template>
