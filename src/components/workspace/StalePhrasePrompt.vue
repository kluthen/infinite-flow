<script setup lang="ts">
/**
 * The stale-phrase prompt (`screens/stale-phrase-prompt/`): the sheet Start, or the starting note,
 * opens when phrase 1 was generated under settings that differ from the current ones. It names
 * the changed settings by their controls' labels, in page order, and offers `Regenerate phrase`
 * (the header's Idle Regenerate, nothing starting) and `Start with this phrase` (the start click,
 * the start conditions checked again); `Close`, Escape and a press on the backdrop dismiss it. On
 * open it closes the Volume popover and puts focus on `Regenerate phrase`, trapped in the sheet;
 * on close focus goes where the design says for each answer, and, when it closes by itself (the
 * workspace leaving Ready), as after a dismissal. Loaded on demand, outside the entry chunk.
 */
import { onBeforeUnmount, onMounted, ref, useId } from 'vue'

import type { StaleSetting } from '@/session/stale-phrase-one'
import type { SessionEndFocusTarget } from './session-end-focus'
import type { SessionController } from './workspace-session-controller-types'
import type { StalePhrasePrompt } from './workspace-stale-phrase'

const props = defineProps<{
  /** The session controller, which shows the prompt and whose answers close it. */
  controller: SessionController
  /** The header's `Regenerate phrase`: the Idle Regenerate. */
  regenerate: () => unknown
  /**
   * What precedes a start inside its click, and the prompt's opening too: the Volume popover
   * closed, a late landing cleared.
   */
  prepareStart: () => void
  /** What follows a start inside its click: the start's one instant jump. */
  afterStart: () => void
  /** Move focus to one of the workspace's own targets. */
  focusTarget: (target: SessionEndFocusTarget) => void
  /** Move focus to the workspace's fallback: the session action, else the phrase action, else `controller-status`. */
  focusFallback: () => void
}>()

/** The visible label of each setting's control, in the order the controls appear on the page. */
const LABELS: readonly (readonly [StaleSetting, string])[] = [
  ['tonalCenter', 'Written key'],
  ['collection', 'Collection'],
  ['instrumentProfileId', 'Instrument profile'],
  ['harmonicMotion', 'Harmonic motion'],
  ['tension', 'Tension'],
  ['noteDensity', 'Note density'],
  ['rhythmicVariety', 'Rhythmic variety'],
  ['syncopation', 'Syncopation'],
  ['silenceDensity', 'Silence density'],
  ['contour', 'Contour'],
  ['register', 'Register'],
  ['leapiness', 'Leapiness'],
  ['arpeggioChaos', 'Arpeggio chaos'],
  ['passingTone', 'Passing tone'],
  ['accentedPassingTone', 'Accented passing tone'],
  ['neighborTone', 'Neighbor tone'],
  ['appoggiatura', 'Appoggiatura'],
  ['diatonicEnclosure', 'Diatonic enclosure'],
  ['chromaticApproach', 'Chromatic approach'],
  ['chromaticEnclosure', 'Chromatic enclosure'],
]

/**
 * Intent: the changed settings as the sentence names them: one, two joined by "and", three as
 * "A, B and C", four or more as the first two and the count of the rest.
 */
// @spec-link [[rule_stale_phrase_prompt_at_start]]
function changedSettingsText(changed: readonly StaleSetting[]): string {
  const labels = LABELS.filter(([setting]) => changed.includes(setting)).map(([, label]) => label)
  if (labels.length !== changed.length)
    throw new Error(`stale-phrase prompt: no label for one of ${changed.join(', ')}`)
  const [first, second, third] = labels
  if (first === undefined) throw new Error('stale-phrase prompt: no changed setting to name')
  if (second === undefined) return first
  if (third === undefined) return `${first} and ${second}`
  if (labels.length === 3) return `${first}, ${second} and ${third}`
  return `${first}, ${second} and ${labels.length - 2} other settings`
}

const titleId = useId()
const bodyId = useId()
const dialog = ref<HTMLElement | null>(null)
const regenerateButton = ref<HTMLButtonElement | null>(null)
/** Set once an answer closes the prompt, so its own close moves focus and the unmount does not. */
let answered = false

/**
 * Intent: the prompt the controller shows; this sheet is shown only while there is one. Its
 * changed settings were fixed as it opened.
 */
function shownPrompt(): StalePhrasePrompt {
  const prompt = props.controller.state.stalePhrasePrompt
  if (prompt === null) throw new Error('stale-phrase prompt: shown with no prompt')
  return prompt
}

const opened = shownPrompt()
const byNote = opened.opener === 'note'
const changedText = changedSettingsText(opened.changed)

/**
 * Intent: `Start with this phrase`, inside its click: the start, unless a start condition no
 * longer holds; started, focus is on the session action, now `Stop`; else the prompt closes with
 * nothing started, focus as after a dismissal.
 */
// @spec-link [[rule_stale_phrase_prompt_at_start]]
// @spec-link [[rule_session_start_conditions]]
// @spec-link [[service_workspace_session_flow]]
function handleUse(): void {
  answered = true
  props.prepareStart()
  if (!props.controller.useStalePhrase()) {
    props.focusFallback()
    return
  }
  props.afterStart()
  props.focusTarget('session-action')
}

/**
 * Intent: `Regenerate phrase`: close the prompt and run the Idle Regenerate, focus on the phrase
 * action as after a press on it in the header; nothing starts.
 */
// @spec-link [[rule_stale_phrase_prompt_at_start]]
function handleRegenerate(): void {
  answered = true
  props.controller.dismissStalePhrase()
  props.focusTarget('phrase-action')
  void props.regenerate()
}

/** Intent: `Close`, Escape or a press on the backdrop: nothing changes, nothing starts. */
// @spec-link [[rule_stale_phrase_prompt_at_start]]
function handleDismiss(): void {
  answered = true
  props.controller.dismissStalePhrase()
  props.focusFallback()
}

/** Intent: a press on the backdrop itself, not inside the sheet, dismisses it. */
function handleBackdropClick(event: MouseEvent): void {
  if (event.target === event.currentTarget) handleDismiss()
}

/** Intent: Tab and Shift+Tab cycle through the sheet's buttons, wrapping at both ends. */
function cycleFocus(direction: 1 | -1): void {
  if (dialog.value === null) throw new Error('stale-phrase prompt: the dialog is not rendered')
  const stops = Array.from(dialog.value.querySelectorAll<HTMLElement>('button:not([disabled])'))
  const at = stops.findIndex((stop) => stop === document.activeElement)
  const from = at === -1 ? (direction === 1 ? -1 : 0) : at
  const next = stops[(from + direction + stops.length) % stops.length]
  if (next === undefined) throw new Error('stale-phrase prompt: no tab stop')
  next.focus()
}

/** Intent: while the prompt shows, Escape dismisses it and Tab stays trapped in it. */
function handleKeydown(event: KeyboardEvent): void {
  if (event.key === 'Escape') {
    event.preventDefault()
    handleDismiss()
  } else if (event.key === 'Tab') {
    event.preventDefault()
    cycleFocus(event.shiftKey ? -1 : 1)
  }
}

/** Intent: on open, close the Volume popover, listen for keys and focus `Regenerate phrase`. */
onMounted(() => {
  props.prepareStart()
  document.addEventListener('keydown', handleKeydown)
  if (regenerateButton.value === null)
    throw new Error('stale-phrase prompt: Regenerate phrase is not rendered')
  regenerateButton.value.focus()
})

/**
 * Intent: stop listening for keys once the prompt leaves the page; closed by itself (no answer,
 * the controller having closed it), focus goes where a dismissal sends it.
 */
// @spec-link [[rule_stale_phrase_prompt_at_start]]
onBeforeUnmount(() => {
  document.removeEventListener('keydown', handleKeydown)
  if (!answered && props.controller.state.stalePhrasePrompt === null) props.focusFallback()
})
</script>

<template>
  <div class="sheet-backdrop" @click="handleBackdropClick">
    <div
      ref="dialog"
      class="sheet"
      role="alertdialog"
      aria-modal="true"
      :aria-labelledby="titleId"
      :aria-describedby="bodyId"
    >
      <div class="sheet-header">
        <h2 :id="titleId" class="sheet-title">This phrase is from before your changes</h2>
        <button class="btn sheet-close" type="button" @click="handleDismiss">Close</button>
      </div>
      <div :id="bodyId" class="sheet-body">
        <p v-if="byNote">
          Your note didn't start the session. Nothing you play will until you choose.
        </p>
        <p>Since it was made, you changed {{ changedText }}.</p>
        <p>
          Regenerate phrase makes a new phrase with your current settings. Start with this phrase
          plays this one first; the phrases after it use your current settings.
        </p>
        <p v-if="byNote" class="sheet-hint">
          A new phrase may start on a different note: the line above the staff names it.
        </p>
      </div>
      <div class="sheet-actions">
        <button
          ref="regenerateButton"
          class="btn btn-primary"
          type="button"
          @click="handleRegenerate"
        >
          Regenerate phrase
        </button>
        <button class="btn" type="button" @click="handleUse">Start with this phrase</button>
      </div>
    </div>
  </div>
</template>
