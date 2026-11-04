<script setup lang="ts">
/**
 * The workspace header: brand mark with the build beside it (version and short commit id),
 * `controller-status`, live meter/tempo context, the theme override, then its two action slots:
 * the phrase action and the session action (`Start session` / `Stop`, or `Close review` while the
 * last session's Review shows). This is the
 * one place the generate/regenerate/retry vocabulary, the session action's label and both slots'
 * disabled and emphasis policy live -- everything else reads the session's state directly. The
 * session action and `controller-status` only ask: the shell starts and stops the session, closes
 * the Review and opens the connection sheet. There is no independently
 * selectable display-notation control: the score is always shown in the active instrument
 * profile's own written pitch. After the brand sits the mode switch (./ModeSwitch.vue), whose
 * presses it only reports. While Jam mode opens both actions are disabled in place, their labels
 * and emphasis kept; in Jam mode without a kept doodle the phrase action reads `Generate phrase`,
 * disabled, secondary, and the session action `Start Jam`, primary, except while Jam's staff shows
 * a notation error: the phrase action then reads `Retry notation`, enabled and primary, and asks
 * the shell to engrave Jam's staff again. In Jam mode with a kept doodle every row of the action
 * table applies as in session mode, over Jam's phrase 1 (`jamPhrase`): `Regenerate phrase`,
 * `Retry generation` and `Retry notation` act on it, writing from the doodle, and no rhythm
 * combination ever blocks it. While the cue row holds `jam-needs-controller` (no
 * controller connected in Jam mode), `Start Jam` names it with `aria-describedby`, and
 * `jam-notice` while Jam's staff shows it. `Start Jam` is enabled exactly while a Jam could start
 * (a fresh Jam, or with a doodle kept a Jam on it), as the shell judges it.
 */
import { computed, ref } from 'vue'

import type { GenerationSession, ThemePreference } from '@/composables/use-generation-session'
import type { WorkspaceSessionResult } from '@/composables/workspace-session-result'
import { isRhythmSettingBlocked } from '@/domain/controls/unsupported-rhythm-settings'
import type { JamStaffState } from '@/jam/jam-view-types'
import type { KeptDoodlePhraseView } from './use-kept-doodle-phrase'
import type { ControllerStatusForm } from '@/midi/controller-status'
import { APP_VERSION } from '@/storage/app-version'
import { APP_COMMIT } from './build-id'
import ControllerStatus from './ControllerStatus.vue'
import ModeSwitch from './ModeSwitch.vue'
import ThemeControl from './ThemeControl.vue'
import { phraseActionDisabled, primaryHeaderAction } from './session-action-policy'
import { sheetCloseFocusTarget } from './sheet-close-focus'
import type { SessionController } from './workspace-session-controller-types'
import type { WorkspaceMode, WorkspaceModeView } from './use-workspace-mode'
import { JAM_NEEDS_CONTROLLER_ID, JAM_NOTICE_ID } from './use-jam-idle-cue'

const props = withDefaults(
  defineProps<{
    session: GenerationSession<WorkspaceSessionResult>
    /** The session controller; null while its lazy chunk loads, when `Start session` is disabled. */
    controller: SessionController | null
    /** The form `controller-status` shows (kept as a session started with, during it). */
    controllerStatus: ControllerStatusForm
    /** What the mode switch shows; session mode at Idle by default. */
    workspaceMode?: WorkspaceModeView
    /** What Jam's staff shows while Jam mode shows; null (the default) when unknown or absent. */
    jamStaffState?: JamStaffState | null
    /** The cue row holds `jam-needs-controller`, which `Start Jam` then names; false by default. */
    jamNeedsController?: boolean
    /**
     * A Jam could start now (a fresh Jam, or with a doodle kept a Jam on it): `Start Jam` is
     * enabled; false by default.
     */
    jamCanStart?: boolean
    /** Jam's staff shows `jam-notice`, which `Start Jam` then names; false by default. */
    jamNoticeShown?: boolean
    /** Jam's phrase 1 from the kept doodle while Jam mode shows; null (the default) otherwise. */
    jamPhrase?: KeptDoodlePhraseView | null
  }>(),
  {
    workspaceMode: () => ({ mode: 'session', checked: 'session', opening: false, readonly: false }),
    jamStaffState: null,
    jamNeedsController: false,
    jamCanStart: false,
    jamNoticeShown: false,
    jamPhrase: null,
  },
)

const emit = defineEmits<{
  /** The enabled `Start session` was clicked; the shell starts the session inside this click. */
  'start-session': []
  /** `Stop` was clicked. */
  'stop-session': []
  /** `Close review` was clicked; the shell closes the Review and moves focus. */
  'close-review': []
  /** The enabled `controller-status` was clicked; the shell opens the sheet inside this click. */
  'open-connection-sheet': []
  /** A segment of the mode switch was pressed outside read-only; the shell decides. */
  'select-mode': [mode: WorkspaceMode]
  /** The enabled `Retry notation` was clicked in Jam mode; the shell has Jam's staff redrawn. */
  'retry-jam-notation': []
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
 * Intent: Jam mode shows (not while it opens, when both actions keep session mode's labels and
 * emphasis).
 */
// @spec-link [[module_workspace_mode]]
const jamShowing = computed(() => props.workspaceMode.mode === 'jam')

/** Jam's phrase 1 from the kept doodle, while Jam mode shows with a doodle kept; null otherwise. */
// @spec-link [[module_workspace_mode]]
const jamPhrase = computed(() =>
  jamShowing.value && props.jamPhrase?.kept === true ? props.jamPhrase : null,
)

/**
 * Jam mode shows with no doodle kept: the phrase action, with nothing to generate, reads `Generate
 * phrase` in place, disabled.
 */
const jamWithoutDoodle = computed(() => jamShowing.value && jamPhrase.value === null)

/** The Idle phrase the phrase action acts on: Jam's phrase 1 from the kept doodle, or session mode's. */
const shownIdle = computed(() => jamPhrase.value?.state ?? state.value)

/**
 * Intent: name which of the four phrase-action labels the Idle phrase shown calls for. Under the
 * room notice no phrase is kept, yet the action is `Regenerate phrase` (a new phrase, which under
 * the too-many-notes cause starts a round), unless a generation-failure banner shows.
 */
// @spec-link [[rule_staff_needs_room_notice]]
// @spec-link [[user_story_controlled_phrase_generation]]
const primaryActionKind = computed<PrimaryActionKind>(() => {
  if (shownIdle.value.notationError !== null) return 'retry-notation'
  if (shownIdle.value.generationError !== null) return 'retry-generation'
  if (shownIdle.value.roomNotice !== null) return 'regenerate'
  if (shownIdle.value.result !== null) return 'regenerate'
  return 'generate'
})

/**
 * Intent: Jam's staff shows a notation error at Jam mode's Idle: the phrase action is `Retry
 * notation`, enabled and primary, as in the action table's Notation error row.
 */
// @spec-link [[module_workspace_mode]]
const jamRetriesNotation = computed(
  () =>
    jamWithoutDoodle.value &&
    props.jamStaffState === 'notation-error' &&
    !sessionActive.value &&
    !reviewShowing.value,
)

/** Intent: the phrase action's label; in Jam mode `Generate phrase`, or its notation retry. */
const primaryActionLabel = computed(() => {
  if (jamRetriesNotation.value) return PRIMARY_ACTION_LABEL['retry-notation']
  if (jamWithoutDoodle.value) return PRIMARY_ACTION_LABEL.generate
  return PRIMARY_ACTION_LABEL[primaryActionKind.value]
})

/** True while any operation is running: every configuration control, including notation mode, is read-only. */
const operationRunning = computed(() => shownIdle.value.operation !== 'idle')

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
    jamPhrase.value === null &&
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
/** Intent: the review mode shows: a Review, or the session list in its place. */
const reviewShowing = computed(
  () =>
    props.controller?.state.review?.showing === true ||
    props.controller?.state.listShowing === true,
)

/**
 * The phrase action is disabled while an operation runs, under an unsupported rhythm, in a
 * session, and in place while the Review shows.
 */
// @spec-link [[rule_session_settings_locked]]
// @spec-link [[req_last_session_review]]
const primaryActionDisabled = computed(() => {
  if (props.workspaceMode.opening) return true
  if (jamWithoutDoodle.value) return !jamRetriesNotation.value
  return phraseActionDisabled({
    operationRunning: operationRunning.value,
    blockedByUnsupportedRhythm: blockedByUnsupportedRhythm.value,
    sessionActive: sessionActive.value,
    reviewShowing: reviewShowing.value,
  })
})

/**
 * Intent: `Start session` is enabled only once the controller has loaded and every start
 * condition holds; `Stop` is always enabled during a session, and `Close review` while the
 * Review shows.
 */
// @spec-link [[rule_session_start_conditions]]
// @spec-link [[rule_stop_ends_session]]
// @spec-link [[req_last_session_review]]
const sessionActionDisabled = computed(() => {
  if (props.workspaceMode.opening || props.controller === null) return true
  if (sessionActive.value || reviewShowing.value) return false
  if (jamShowing.value) return !props.jamCanStart
  return !props.controller.state.canStart
})

/**
 * Intent: what `Start Jam` names with `aria-describedby` at Jam mode's Idle: `jam-needs-controller`
 * while the cue row holds it, else `jam-notice` while Jam's staff shows it; nothing otherwise.
 */
// @spec-link [[module_workspace_mode]]
const sessionActionDescribedBy = computed(() => {
  if (props.jamNeedsController) return JAM_NEEDS_CONTROLLER_ID
  const idle = jamShowing.value && !sessionActive.value && !reviewShowing.value
  return idle && props.jamNoticeShown ? JAM_NOTICE_ID : undefined
})

/** Intent: the session action's label: `Stop` in a session, `Close review` over the Review. */
// @spec-link [[req_last_session_review]]
const sessionActionLabel = computed(() => {
  if (sessionActive.value) return 'Stop'
  if (reviewShowing.value) return 'Close review'
  return jamShowing.value ? 'Start Jam' : 'Start session'
})

/**
 * Intent: which of the two slots carries the primary emphasis, by the handoff's action table; in
 * Jam mode without a kept doodle, the session action, unless Jam's staff shows a notation error.
 */
// @spec-link [[rule_session_start_conditions]]
const sessionActionPrimary = computed(() => {
  if (jamWithoutDoodle.value) return !jamRetriesNotation.value
  return (
    primaryHeaderAction({
      sessionActive: sessionActive.value,
      operationRunning: operationRunning.value,
      generationErrorShown: shownIdle.value.generationError !== null,
      notationErrorShown: shownIdle.value.notationError !== null,
      roomNoticeShown: shownIdle.value.roomNotice !== null,
      phraseShown: shownIdle.value.result !== null,
      reviewShowing: reviewShowing.value,
    }) === 'session'
  )
})

/** Intent: the tempo the header shows: the running session's locked tempo, else the control's. */
// @spec-link [[rule_session_settings_locked]]
const shownTempo = computed(
  () => props.controller?.state.sessionTempo ?? state.value.controls.tempo,
)

/** Intent: invoke whichever session action the current primary-action label calls for. */
// @spec-link [[user_story_controlled_phrase_generation]]
function handlePrimaryAction(): void {
  if (primaryActionDisabled.value) return
  if (jamRetriesNotation.value) {
    emit('retry-jam-notation')
    return
  }
  if (jamPhrase.value !== null) {
    actOnJamPhrase(jamPhrase.value.actions)
    return
  }
  const { actions } = props.session
  if (primaryActionKind.value === 'generate') void actions.generate()
  else if (primaryActionKind.value === 'regenerate') void actions.regenerate()
  else if (primaryActionKind.value === 'retry-generation') void actions.retryGeneration()
  else void actions.retryNotation()
}

/**
 * Intent: the phrase action on Jam's phrase 1, writing from the kept doodle: `Regenerate phrase`
 * (`Generate phrase` alike), `Retry generation` or `Retry notation`.
 */
// @spec-link [[user_story_controlled_phrase_generation]]
function actOnJamPhrase(actions: KeptDoodlePhraseView['actions']): void {
  if (primaryActionKind.value === 'retry-notation') void actions.retryNotation()
  else if (primaryActionKind.value === 'retry-generation') void actions.retryGeneration()
  else void actions.regenerate()
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
    <div class="brand">
      <h1 id="workspace-title" class="brand-mark">Infinite Flow</h1>
      <span class="build-id"
        >{{ APP_VERSION }}<span aria-hidden="true"> · </span>{{ APP_COMMIT }}</span
      >
    </div>
    <ModeSwitch :view="workspaceMode" @select="emit('select-mode', $event)" />
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
        :class="{
          'btn-primary': !sessionActionPrimary,
          'is-loading': operationRunning && !jamWithoutDoodle,
        }"
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
        :aria-describedby="sessionActionDescribedBy"
        @click="handleSessionAction"
      >
        {{ sessionActionLabel }}
      </button>
    </div>
  </header>
</template>
