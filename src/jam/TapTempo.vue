<script setup lang="ts">
/**
 * `tap-tempo` (the phrase-workspace handoff, `tap-tempo`; the Jam flow's handoff, Tap tempo): the
 * "Tap tempo" button after the tempo stepper in Jam's Tempo field and its `field-note`, a polite
 * live region the button names with `aria-describedby`. A fragment, the button and the note direct
 * children of the Tempo `field-group`, whose layout reads them there. The tap is the press, not the
 * release: a primary pointer's press, an Enter or Space key press (its repeats ignored), or a click
 * that follows neither (from assistive technology). `is-listening` shows while listening; no
 * `aria-pressed`, a press being a tap, never a toggle. While listening, a press of anything else
 * or a key pressed elsewhere, or the page hidden or left, ends it. Props-in/events-out only: the
 * taps, the tempo and the end of listening are tap tempo's (./use-tap-tempo.ts). Part of Jam's code
 * (src/jam/), loaded on demand.
 */
import { computed, onBeforeUnmount, ref, useId, watch } from 'vue'

import { JAM_TEMPO_VALUES } from './jam-settings'
import { tapTempoSentence, type TapTempoNote } from './tap-tempo'

// @spec-link [[rule_jam_tap_in_listening]]
const props = defineProps<{
  /** Whether tap tempo listens now. */
  listening: boolean
  /** What the field-note says. */
  note: TapTempoNote
  /** Whether a controller is connected: the rest wording names it only then. */
  controllerConnected: boolean
  /** Disabled during Loading and a session. */
  disabled: boolean
}>()

const emit = defineEmits<{
  /** A tap: the button pressed. */
  press: []
  /** While listening, anything else used or the page hidden or left: listening ends. */
  end: []
}>()

const noteId = useId()
const button = ref<HTMLButtonElement | null>(null)

/** Whether a pointer or key press has just tapped, so the click it brings taps nothing more. */
let tappedBeforeClick = false

/** The field-note's words for the state it is given. */
// @spec-link [[rule_jam_tap_in_listening]]
const sentence = computed(() =>
  tapTempoSentence(props.note, JAM_TEMPO_VALUES, props.controllerConnected),
)

/** Intent: a tap, unless the button is disabled; `fromPress` when a click is still to follow. */
function tap(fromPress: boolean): void {
  if (props.disabled) return
  tappedBeforeClick = fromPress
  emit('press')
}

/** Intent: a primary pointer's press is a tap. */
// @spec-link [[rule_jam_tap_in_listening]]
function handlePointerDown(event: PointerEvent): void {
  if (event.button !== 0 || !event.isPrimary) return
  tap(true)
}

/** Intent: Enter or Space pressed is a tap; its key repeats are prevented and tap nothing. */
// @spec-link [[rule_jam_tap_in_listening]]
function handleKeyDown(event: KeyboardEvent): void {
  if (event.key !== 'Enter' && event.key !== ' ') return
  if (event.repeat) {
    event.preventDefault()
    return
  }
  tap(true)
}

/**
 * Intent: a click that follows no pointer or key press (detail 0, from assistive technology) is a
 * tap; the click a press brings, or any other, taps nothing.
 */
// @spec-link [[rule_jam_tap_in_listening]]
function handleClick(event: MouseEvent): void {
  if (tappedBeforeClick) {
    tappedBeforeClick = false
    return
  }
  if (event.detail === 0) tap(false)
}

/** Intent: a press or key press outside the button ends listening. */
function handleElsewhere(event: Event): void {
  const target = event.target
  if (target instanceof Node && button.value?.contains(target)) return
  emit('end')
}

/** Intent: the page hidden ends listening. */
function handleVisibilityChange(): void {
  if (document.visibilityState === 'hidden') emit('end')
}

/** Intent: the page left ends listening. */
function handlePageHide(): void {
  emit('end')
}

/** Intent: listen to the page for what ends listening, only while listening. */
function attachEndListeners(): void {
  document.addEventListener('pointerdown', handleElsewhere, true)
  document.addEventListener('keydown', handleElsewhere, true)
  document.addEventListener('visibilitychange', handleVisibilityChange)
  window.addEventListener('pagehide', handlePageHide)
}

/** Intent: stop listening to the page. */
function detachEndListeners(): void {
  document.removeEventListener('pointerdown', handleElsewhere, true)
  document.removeEventListener('keydown', handleElsewhere, true)
  document.removeEventListener('visibilitychange', handleVisibilityChange)
  window.removeEventListener('pagehide', handlePageHide)
}

// @spec-link [[rule_jam_tap_in_listening]]
watch(
  () => props.listening,
  (listening) => {
    if (listening) attachEndListeners()
    else detachEndListeners()
  },
  { immediate: true },
)

onBeforeUnmount(detachEndListeners)
</script>

<template>
  <!-- @spec-link [[rule_jam_tap_in_listening]] -->
  <button
    ref="button"
    class="btn tap-tempo"
    :class="{ 'is-listening': listening }"
    type="button"
    :disabled="disabled"
    :aria-describedby="noteId"
    @pointerdown="handlePointerDown"
    @keydown="handleKeyDown"
    @click="handleClick"
  >
    Tap tempo
  </button>
  <p :id="noteId" class="field-note" aria-live="polite">{{ sentence }}</p>
</template>
