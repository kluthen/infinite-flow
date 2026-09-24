<script setup lang="ts">
/**
 * The workspace header: brand mark, live meter/tempo/notation-mode context, the theme override,
 * and the single primary phrase action. This is the one place the generate/regenerate/retry
 * vocabulary and its disabled policy live -- everything else reads the session's state directly.
 */
import { computed } from 'vue'

import type { GenerationSession, ThemePreference } from '@/composables/use-generation-session'
import type { WorkspaceSessionResult } from '@/composables/workspace-session-result'
import SegmentedControl from '@/components/controls/SegmentedControl.vue'
import type { SegmentedControlOption } from '@/components/controls/segmented-control-option'
import { isUnsupportedRhythmSetting } from '@/domain/controls/unsupported-rhythm-settings'
import type { NotationMode } from '@/domain/notation/notation-mode'
import ThemeControl from './ThemeControl.vue'

const props = defineProps<{
  session: GenerationSession<WorkspaceSessionResult>
}>()

const NOTATION_MODE_OPTIONS: readonly SegmentedControlOption[] = [
  { value: 'Concert', label: 'Concert' },
  { value: 'B-flat tenor', label: 'B-flat' },
  { value: 'E-flat alto', label: 'E-flat' },
]

type PrimaryActionKind = 'generate' | 'regenerate' | 'retry-generation' | 'retry-notation'

const PRIMARY_ACTION_LABEL: Readonly<Record<PrimaryActionKind, string>> = {
  generate: 'Generate phrase',
  regenerate: 'Regenerate phrase',
  'retry-generation': 'Retry generation',
  'retry-notation': 'Retry notation',
}

const state = computed(() => props.session.state)

/** Intent: name which of the four phrase-action labels the current session state calls for. */
const primaryActionKind = computed<PrimaryActionKind>(() => {
  if (state.value.notationError !== null) return 'retry-notation'
  if (state.value.generationError !== null) return 'retry-generation'
  if (state.value.result !== null) return 'regenerate'
  return 'generate'
})

const primaryActionLabel = computed(() => PRIMARY_ACTION_LABEL[primaryActionKind.value])

/** True while any operation is running: every configuration control, including notation mode, is read-only. */
const operationRunning = computed(() => state.value.operation !== 'idle')

/**
 * True while the current control combination cannot form a four-bar phrase. This blocks every
 * phrase action except Retry notation: retrying the engraving of an already-generated phrase
 * replays that phrase's own stored request, so it never depends on the current rhythm-control
 * combination the way starting a new generation does.
 */
// @spec-link [[rule_unsupported_rhythm_settings_block_generation]]
const blockedByUnsupportedRhythm = computed(
  () =>
    primaryActionKind.value !== 'retry-notation' &&
    isUnsupportedRhythmSetting(state.value.controls),
)

const primaryActionDisabled = computed(
  () => operationRunning.value || blockedByUnsupportedRhythm.value,
)

/** Intent: invoke whichever session action the current primary-action label calls for. */
// @spec-link [[user_story_controlled_phrase_generation]]
function handlePrimaryAction(): void {
  if (primaryActionDisabled.value) return
  const { actions } = props.session
  if (primaryActionKind.value === 'generate') void actions.generate()
  else if (primaryActionKind.value === 'regenerate') void actions.regenerate()
  else if (primaryActionKind.value === 'retry-generation') void actions.retryGeneration()
  else void actions.retryNotation()
}

/** Intent: apply a manual or system theme choice; the session enforces this never reaches generation or engraving. */
function handleThemeSelect(theme: ThemePreference): void {
  props.session.actions.setTheme(theme)
}

/** Intent: request a display-notation switch; ignored while read-only, mirroring every other control. */
function handleNotationModeSelect(value: string): void {
  void props.session.actions.setNotationMode(value as NotationMode)
}
</script>

<template>
  <header class="layout-header">
    <h1 id="workspace-title" class="brand-mark">Infinite Flow</h1>
    <div class="header-actions">
      <div class="context-group" aria-label="Score context">
        <div class="score-context">
          <span class="meter-badge">4/4</span>
          <span class="tempo-readout">{{ state.controls.tempo }} BPM</span>
          <SegmentedControl
            label="Display notation"
            :options="NOTATION_MODE_OPTIONS"
            :model-value="state.presentation.notationMode"
            :readonly="operationRunning"
            @update:model-value="handleNotationModeSelect"
          />
        </div>
        <ThemeControl :theme="state.presentation.theme" @select="handleThemeSelect" />
      </div>
      <button
        class="btn btn-primary btn-lg"
        type="button"
        :class="{ 'is-loading': operationRunning }"
        :disabled="primaryActionDisabled"
        @click="handlePrimaryAction"
      >
        {{ primaryActionLabel }}
      </button>
    </div>
  </header>
</template>
