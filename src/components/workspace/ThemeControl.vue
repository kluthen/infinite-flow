<script setup lang="ts">
/**
 * The header's theme override: System/Light/Dark segmented control. Selecting a value here only
 * ever reports the choice upward -- routing it to the session's presentation-only `setTheme`
 * action (never generation or engraving) is the caller's responsibility, not this component's.
 */
import type { ThemePreference } from '@/composables/use-generation-session'
import SegmentedControl from '@/components/controls/SegmentedControl.vue'
import type { SegmentedControlOption } from '@/components/controls/segmented-control-option'

defineProps<{
  theme: ThemePreference
}>()

const emit = defineEmits<{
  select: [theme: ThemePreference]
}>()

const THEME_OPTIONS: readonly SegmentedControlOption[] = [
  { value: 'System', label: 'System' },
  { value: 'Light', label: 'Light' },
  { value: 'Dark', label: 'Dark' },
]

/** Intent: forward a theme segment selection, re-validated against the closed theme catalog. */
function handleSelect(value: string): void {
  const option = THEME_OPTIONS.find((candidate) => candidate.value === value)
  if (!option) throw new Error(`Unknown theme preference "${value}".`)
  emit('select', option.value as ThemePreference)
}
</script>

<template>
  <SegmentedControl
    class="theme-control"
    label="Presentation theme"
    :options="THEME_OPTIONS"
    :model-value="theme"
    :readonly="false"
    @update:model-value="handleSelect"
  />
</template>
