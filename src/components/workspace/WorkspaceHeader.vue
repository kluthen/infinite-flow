<script setup lang="ts">
/**
 * The workspace header: brand mark, `controller-status`, live meter/tempo context, the theme
 * override, then its two action slots: the phrase action and the session action (`Start session` /
 * `Stop`, or `Close review` while the last session's Review shows). This is the
 * one place the generate/regenerate/retry vocabulary, the session action's label and both slots'
 * disabled and emphasis policy live -- everything else reads the session's state directly. The
 * session action and `controller-status` only ask: the shell starts and stops the session, closes
 * the Review and opens the connection sheet. There is no independently
 * selectable display-notation control: the score is always shown in the active instrument
 * profile's own written pitch.
 */
import { computed, ref } from 'vue'

import type { GenerationSession, ThemePreference } from '@/composables/use-generation-session'
import type { WorkspaceSessionResult } from '@/composables/workspace-session-result'
import { isRhythmSettingBlocked } from '@/domain/controls/unsupported-rhythm-settings'
import type { ControllerStatusForm } from '@/midi/controller-status'
import ControllerStatus from './ControllerStatus.vue'
import ThemeControl from './ThemeControl.vue'
import { phraseActionDisabled, primaryHeaderAction } from './session-action-policy'
import { sheetCloseFocusTarget } from './sheet-close-focus'
import type { SessionController } from './workspace-session-controller-types'

const props = defineProps<{
  session: GenerationSession<WorkspaceSessionResult>
  /** The session controller; null while its lazy chunk loads, when `Start session` is disabled. */
  controller: SessionController | null
  /** The form `controller-status` shows (kept as a session started with, during it). */
  controllerStatus: ControllerStatusForm
}>()

const emit = defineEmits<{
  /** The enabled `Start session` was clicked; the shell starts the session inside this click. */
  'start-session': []
  /** `Stop` was clicked. */
  'stop-session': []
  /** `Close review` was clicked; the shell closes the Review and moves focus. */
  'close-review': []
  /** The enabled `controller-status` was clicked; the shell opens the sheet inside this click. */
  'open-connection-sheet': []
}>()

const phraseActionButton = ref<HTMLButtonElement | null>(null)
const sessionActionButton = ref<HTMLButtonElement | null>(null)
const controllerStatusButton = ref<InstanceType<typeof ControllerStatus> | null>(null)

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
// @spec-link [[service_session_controller]]
const sessionActive = computed(
  () => props.controller !== null && props.controller.state.phase !== 'idle',
)

/** True while the last session's Review shows, in place of the staff. */
// @spec-link [[req_last_session_review]]
const reviewShowing = computed(() => props.controller?.state.review?.showing === true)

/**
 * The phrase action is disabled while an operation runs, under an unsupported rhythm, in a
 * session, and in place while the Review shows.
 */
// @spec-link [[rule_session_settings_locked]]
// @spec-link [[req_last_session_review]]
const primaryActionDisabled = computed(() =>
  phraseActionDisabled({
    operationRunning: operationRunning.value,
    blockedByUnsupportedRhythm: blockedByUnsupportedRhythm.value,
    sessionActive: sessionActive.value,
    reviewShowing: reviewShowing.value,
  }),
)

/**
 * Intent: `Start session` is enabled only once the controller has loaded and every start
 * condition holds; `Stop` is always enabled during a session, and `Close review` while the
 * Review shows.
 */
// @spec-link [[rule_session_start_conditions]]
// @spec-link [[rule_stop_ends_session]]
// @spec-link [[req_last_session_review]]
const sessionActionDisabled = computed(() => {
  if (props.controller === null) return true
  if (sessionActive.value || reviewShowing.value) return false
  return !props.controller.state.canStart
})

/** Intent: the session action's label: `Stop` in a session, `Close review` over the Review. */
// @spec-link [[req_last_session_review]]
const sessionActionLabel = computed(() => {
  if (sessionActive.value) return 'Stop'
  return reviewShowing.value ? 'Close review' : 'Start session'
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
      reviewShowing: reviewShowing.value,
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

/**
 * Intent: ask for a session start (`Start session`), its end (`Stop`) or the Review's close
 * (`Close review`), synchronously in the click.
 */
// @spec-link [[rule_session_start_conditions]]
// @spec-link [[rule_stop_ends_session]]
// @spec-link [[req_last_session_review]]
function handleSessionAction(): void {
  if (sessionActionDisabled.value) return
  if (sessionActive.value) emit('stop-session')
  else if (reviewShowing.value) emit('close-review')
  else emit('start-session')
}

/**
 * Intent: ask for the connection sheet from `controller-status`, synchronously in the click. During
 * a session the button is disabled (a status display only), so no click reaches here.
 */
// @spec-link [[rule_controller_connects_between_sessions]]
function handleControllerStatus(): void {
  emit('open-connection-sheet')
}

/** Intent: move focus to an action slot's button, which is always rendered. */
function focusButton(button: HTMLButtonElement | null): void {
  if (button === null) throw new Error('workspace header: an action button is not mounted')
  button.focus()
}

/** Intent: move focus to `controller-status`, which is always rendered. */
function focusControllerStatus(): void {
  if (controllerStatusButton.value === null)
    throw new Error('workspace header: controller-status is not mounted')
  controllerStatusButton.value.focus()
}

/**
 * Intent: after the connection sheet closes, by any path, focus the first enabled of the session
 * action, the phrase action and `controller-status`; while the Review shows, that is `Close
 * review`, always enabled then.
 */
// @spec-link [[rule_controller_connects_between_sessions]]
function focusAfterConnectionSheet(): void {
  const target = sheetCloseFocusTarget({
    sessionActionEnabled: !sessionActionDisabled.value,
    phraseActionEnabled: !primaryActionDisabled.value,
  })
  if (target === 'session-action') focusButton(sessionActionButton.value)
  else if (target === 'phrase-action') focusButton(phraseActionButton.value)
  else focusControllerStatus()
}

defineExpose({
  /** Whether the session action is enabled now (`Close review` focus order). */
  sessionActionEnabled: computed(() => !sessionActionDisabled.value),
  /** Whether the phrase action is enabled now (`Close review` focus order). */
  phraseActionEnabled: computed(() => !primaryActionDisabled.value),
  /** Focus the session action (a session end; `Close review` while it stays enabled). */
  focusSessionAction: () => focusButton(sessionActionButton.value),
  /** Focus the phrase action (a `Close review` that leaves it the first enabled target). */
  focusPhraseAction: () => focusButton(phraseActionButton.value),
  /** Focus `controller-status` (a count-in end that regenerates phrase 1, or a `Close review`). */
  focusControllerStatus,
  /** Focus where the connection sheet's close sends it. */
  focusAfterConnectionSheet,
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
        <ControllerStatus
          ref="controllerStatusButton"
          :form="controllerStatus"
          :disabled="sessionActive"
          @open="handleControllerStatus"
        />
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
        {{ sessionActionLabel }}
      </button>
    </div>
  </header>
</template>
