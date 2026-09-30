<script setup lang="ts">
/**
 * The score panel: its toolbar (title, the persistent generation-status and notation-status live
 * regions, and a generation-failure banner) plus the staff viewport, whose `staff-frame` always
 * holds `PhraseScore` and with it the two reserved staff system positions, in every state the
 * States table defines -- empty (the instruction laid over the blank positions), loading (with the
 * prior phrase still visible), ready, or a notation-error message laid over the still-mounted
 * `PhraseScore` so a later Retry notation can redraw the same instance rather than remounting it.
 */
import { computed, ref, watch } from 'vue'

import type { GenerationSession } from '@/composables/use-generation-session'
import type { WorkspaceSessionResult } from '@/composables/workspace-session-result'
import { generationFailureAlertText } from '@/composables/generation-failure-alert'
import PhraseScore from '@/components/notation/PhraseScore.vue'
import type { WrittenPhrase } from '@/domain/notation/written-phrase-types'
import type { NotationError } from '@/notation/notation-error'

const props = defineProps<{
  session: GenerationSession<WorkspaceSessionResult>
  pendingPhrase: WrittenPhrase | null
  handleEngraved: () => void
  handleNotationError: (error: NotationError) => void
}>()

const state = computed(() => props.session.state)

const statusText = ref('')

/**
 * True from the moment a whole generate/regenerate/retry-generation cycle starts until it next
 * returns to idle. Retry notation only ever passes through "notating" without ever setting this,
 * so it stays silent below -- matching the requirement that only a real generation cycle announces
 * its own completion.
 */
let announceOnIdle = false

/**
 * Intent: announce only the three defined generation-status transitions. Tracked with
 * `announceOnIdle` rather than the immediately-preceding operation value alone, because a
 * successful generate cycle passes through "notating" on its way back to idle -- an intermediate
 * step this watcher must see through, not treat as the end of the cycle.
 */
watch(
  () => state.value.operation,
  (next) => {
    if (next === 'generating') {
      statusText.value = 'Generating phrase'
      announceOnIdle = true
      return
    }
    if (next !== 'idle' || !announceOnIdle) return
    announceOnIdle = false
    if (state.value.generationError !== null) {
      statusText.value = 'Generation failed. Try again.'
      return
    }
    statusText.value = state.value.notationError !== null ? '' : 'Phrase ready'
  },
)

const notationStatusText = ref('')

/**
 * Intent: announce a notation failure whenever `notationError` becomes set, whatever set it -- a
 * fresh generation's own engraving step, Retry notation, or an out-of-band redraw -- by watching
 * the error itself rather than any call site. Recovery stays silent: a cleared error only empties
 * the region, never announces.
 */
// @spec-link [[service_workspace_session_flow]]
watch(
  () => state.value.notationError,
  (next) => {
    notationStatusText.value = next !== null ? 'Notation error. Try again.' : ''
  },
)

/**
 * The staff-frame state class the States table defines, in priority order. A retained result
 * that was never engraved (its notation error cleared by a later generation attempt that then
 * failed) falls back to `staff-error` rather than `staff-ready` -- but only while idle, since every
 * ordinary generation assigns a not-yet-engraved result just before its own engraving step runs.
 */
// @spec-link [[service_workspace_session_flow]]
const staffFrameStateClass = computed(() => {
  if (state.value.operation === 'generating') return 'staff-loading'
  if (state.value.notationError !== null) return 'staff-error'
  if (
    state.value.operation === 'idle' &&
    state.value.result !== null &&
    !state.value.resultEngraved
  ) {
    return 'staff-error'
  }
  if (state.value.result !== null) return 'staff-ready'
  return 'staff-empty'
})

/** True once a phrase has been presented for engraving; before that the frame shows its instruction. */
const hasPhrase = computed(() => props.pendingPhrase !== null)

/** Intent: surface the retained notation failure as the staff-frame's replacement error content. */
// @spec-link [[module_notation_layout_preflight]]
const notationErrorMessage = computed(() => state.value.notationError?.message ?? null)

/** Intent: the D29 alert-banner text, mapped by failure kind rather than a "Generation failed: " prefix concatenated onto the error's own message. */
// @spec-link [[rule_generation_failure_alert_copy]]
const generationErrorAlertText = computed(() =>
  state.value.generationError !== null
    ? generationFailureAlertText(state.value.generationError)
    : null,
)
</script>

<template>
  <div class="score-panel">
    <div class="score-toolbar">
      <h2 id="score-panel-title" class="score-context">Four-measure phrase</h2>
      <p class="generation-status" role="status" aria-live="polite" aria-atomic="true">
        {{ statusText }}
      </p>
      <p class="notation-status" role="status" aria-live="polite" aria-atomic="true">
        {{ notationStatusText }}
      </p>
    </div>
    <p v-if="generationErrorAlertText !== null" class="inline-alert alert-error">
      {{ generationErrorAlertText }}
    </p>
    <div class="staff-viewport">
      <div class="staff-frame" :class="staffFrameStateClass" aria-labelledby="score-panel-title">
        <!-- The idle phrase is the phrase a session starts with, phrase 1. -->
        <PhraseScore
          :phrase="pendingPhrase"
          :phrase-number="1"
          @engraved="handleEngraved"
          @notation-error="handleNotationError"
        >
          <p v-if="!hasPhrase" class="staff-empty-copy">Generate a phrase to begin.</p>
          <p v-if="notationErrorMessage !== null" class="inline-alert alert-error">
            Notation error: {{ notationErrorMessage }}
          </p>
        </PhraseScore>
      </div>
    </div>
  </div>
</template>
