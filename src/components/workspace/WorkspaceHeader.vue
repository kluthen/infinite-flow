<script setup lang="ts">
/**
 * The workspace header: brand mark, live meter/tempo context, the theme override, then its two
 * action slots: the phrase action and the session action (`Start session` / `Stop`). This is the
 * one place the generate/regenerate/retry vocabulary, the session action's label and both slots'
 * disabled and emphasis policy live -- everything else reads the session's state directly. The
 * session action only asks: the shell starts and stops the session. There is no independently
 * selectable display-notation control: the score is always shown in the active instrument
 * profile's own written pitch.
 */
import { computed, ref } from 'vue'

import type { GenerationSession, ThemePreference } from '@/composables/use-generation-session'
import type { WorkspaceSessionResult } from '@/composables/workspace-session-result'
import { isRhythmSettingBlocked } from '@/domain/controls/unsupported-rhythm-settings'
import ThemeControl from './ThemeControl.vue'
import { primaryHeaderAction } from './session-action-policy'
import type { SessionController } from './workspace-session-controller-types'

const props = defineProps<{
  session: GenerationSession<WorkspaceSessionResult>
  /** The session controller; null while its lazy chunk loads, when `Start session` is disabled. */
  controller: SessionController | null
}>()

const emit = defineEmits<{
  /** The enabled `Start session` was clicked; the shell starts the session inside this click. */
  'start-session': []
  /** `Stop` was clicked. */
  'stop-session': []
}>()

const phraseActionButton = ref<HTMLButtonElement | null>(null)
const sessionActionButton = ref<HTMLButtonElement | null>(null)

type PrimaryActionKind = 'generate' | 'regenerate' | 'retry-generation' | 'retry-notation'

const PRIMARY_ACTION_LABEL: Readonly<Record<PrimaryActionKind, string>> = {
  generate: 'Generate phrase',
  regenerate: 'Regenerate phrase',
  'retry-generation': 'Retry generation',
  'retry-notation': 'Retry notation',
}

const state = computed(() => props.session.state)

/**
 * Intent: name which of the four phrase-action labels the current session state calls for. Under
 * the room notice no phrase is kept, yet the action is `Regenerate phrase` (a new phrase, which
 * under the too-many-notes cause starts a round), unless a generation-failure banner shows.
 */
// @spec-link [[rule_staff_needs_room_notice]]
// @spec-link [[user_story_controlled_phrase_generation]]
const primaryActionKind = computed<PrimaryActionKind>(() => {
  if (state.value.notationError !== null) return 'retry-notation'
  if (state.value.generationError !== null) return 'retry-generation'
  if (state.value.roomNotice !== null) return 'regenerate'
  if (state.value.result !== null) return 'regenerate'
  return 'generate'
})

const primaryActionLabel = computed(() => PRIMARY_ACTION_LABEL[primaryActionKind.value])

/** True while any operation is running: every configuration control, including notation mode, is read-only. */
const operationRunning = computed(() => state.value.operation !== 'idle')

/**
 * True while the current control combination cannot form a four-bar phrase, judged on the note
 * density a phrase would be generated with at the window's current width. This blocks every
 * phrase action except Retry notation: retrying the engraving of an already-generated phrase
 * replays that phrase's own stored request, so it never depends on the current rhythm-control
 * combination the way starting a new generation does.
 */
// @spec-link [[rule_unsupported_rhythm_settings_block_generation]]
const blockedByUnsupportedRhythm = computed(
  () =>
    primaryActionKind.value !== 'retry-notation' &&
    isRhythmSettingBlocked(state.value.controls, state.value.noteDensityContext),
)

/** True while a session runs, count-in included. */
// @spec-link [[service_workspace_session_flow]]
const sessionActive = computed(
  () => props.controller !== null && props.controller.state.phase !== 'idle',
)

/** The phrase action is disabled while an operation runs, under an unsupported rhythm, and in a session. */
// @spec-link [[rule_session_settings_locked]]
const primaryActionDisabled = computed(
  () => operationRunning.value || blockedByUnsupportedRhythm.value || sessionActive.value,
)

/**
 * Intent: `Start session` is enabled only once the controller has loaded and every start
 * condition holds; `Stop` is always enabled during a session.
 */
// @spec-link [[rule_session_start_conditions]]
// @spec-link [[rule_stop_ends_session]]
const sessionActionDisabled = computed(() => {
  if (props.controller === null) return true
  return !sessionActive.value && !props.controller.state.canStart
})

/** Intent: which of the two slots carries the primary emphasis, by the handoff's action table. */
// @spec-link [[rule_session_start_conditions]]
const sessionActionPrimary = computed(
  () =>
    primaryHeaderAction({
      sessionActive: sessionActive.value,
      operationRunning: operationRunning.value,
      generationErrorShown: state.value.generationError !== null,
      notationErrorShown: state.value.notationError !== null,
      roomNoticeShown: state.value.roomNotice !== null,
      phraseShown: state.value.result !== null,
      phrasePlayedByLastSession: props.controller?.state.startBlocker === 'phrase_already_played',
    }) === 'session',
)

/** Intent: the tempo the header shows: the running session's locked tempo, else the control's. */
// @spec-link [[rule_session_settings_locked]]
const shownTempo = computed(
  () => props.controller?.state.sessionTempo ?? state.value.controls.tempo,
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

/** Intent: ask for a session start (`Start session`) or end (`Stop`), synchronously in the click. */
// @spec-link [[rule_session_start_conditions]]
// @spec-link [[rule_stop_ends_session]]
function handleSessionAction(): void {
  if (sessionActionDisabled.value) return
  if (sessionActive.value) emit('stop-session')
  else emit('start-session')
}

/** Intent: move focus to an action slot's button, which is always rendered. */
function focusButton(button: HTMLButtonElement | null): void {
  if (button === null) throw new Error('workspace header: an action button is not mounted')
  button.focus()
}

defineExpose({
  /** Focus the session action (a session end during the count-in). */
  focusSessionAction: () => focusButton(sessionActionButton.value),
  /** Focus the phrase action (a session end once phrase 1 has sounded, interim D-A). */
  focusPhraseAction: () => focusButton(phraseActionButton.value),
})

/** Intent: apply a manual or system theme choice; the session enforces this never reaches generation or engraving. */
function handleThemeSelect(theme: ThemePreference): void {
  props.session.actions.setTheme(theme)
}
</script>

<template>
  <header class="layout-header">
    <h1 id="workspace-title" class="brand-mark">Infinite Flow</h1>
    <div class="header-actions">
      <div class="context-group" aria-label="Score context">
        <div class="score-context">
          <span class="meter-badge">4/4</span>
          <span class="tempo-readout">{{ shownTempo }} BPM</span>
        </div>
        <ThemeControl :theme="state.presentation.theme" @select="handleThemeSelect" />
      </div>
      <button
        ref="phraseActionButton"
        class="btn btn-lg"
        type="button"
        :class="{ 'btn-primary': !sessionActionPrimary, 'is-loading': operationRunning }"
        :disabled="primaryActionDisabled"
        @click="handlePrimaryAction"
      >
        {{ primaryActionLabel }}
      </button>
      <button
        ref="sessionActionButton"
        class="btn btn-lg session-action"
        type="button"
        :class="{ 'btn-primary': sessionActionPrimary }"
        :disabled="sessionActionDisabled"
        @click="handleSessionAction"
      >
        {{ sessionActive ? 'Stop' : 'Start session' }}
      </button>
    </div>
  </header>
</template>
