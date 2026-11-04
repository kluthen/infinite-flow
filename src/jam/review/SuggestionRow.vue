<script setup lang="ts">
/**
 * The key and mode suggestion in a Jam's review (`suggestion-row`, last in `review-doodle`), about
 * Jam's key and mode, never session mode's (./use-key-suggestion.ts). Offering: "Your doodle
 * sounds like {answer}.", then `Jam in {answer}` and `Keep {key} {mode}`, two plain buttons. Set:
 * "Jams now play in {answer}.", which takes focus after `Jam in {answer}` (`tabindex="-1"`, never
 * in the tab order). No fit: one sentence naming no note, in a review only. Absent: nothing
 * rendered. Jam's Idle shows it too, in `jam-bar` (`atIdle`), its buttons disabled while the bar
 * is held still. What each button changes is its host's: this row asks (`use`, `keep`) and says.
 * When its buttons leave while one has focus, not by a press of theirs (a change of Jam's key or
 * mode), it hands focus back (`focus-lost`). Part of Jam's code (src/jam/), loaded on demand.
 */
import { nextTick, ref, watch } from 'vue'

import type { QuantizedDoodle } from '@/domain/doodle/quantized-doodle'
import type { InstrumentProfile } from '@/domain/profile/instrument-profile'

import type { JamKeyAndMode } from '../key-suggestion/key-suggestion'
import { useKeySuggestion } from './use-key-suggestion'

// @spec-link [[req_key_and_mode_suggestion]]
const props = defineProps<{
  /** The review's quantized doodle. */
  doodle: QuantizedDoodle
  /** Jam's written key and Collection now. */
  jam: JamKeyAndMode
  /** The selected instrument, whose transposition the written key is read in. */
  instrument: Pick<InstrumentProfile, 'transposition'>
  /** The player has declined this doodle's suggestion. */
  declined: boolean
  /** Shown at Jam's Idle, in `jam-bar`: no no-fit form, judged afresh after the set form. */
  atIdle?: boolean
  /** Its buttons are disabled (`jam-bar` held still during a session). */
  disabled?: boolean
}>()

const emit = defineEmits<{
  /** `Jam in {answer}`: set Jam's key and mode to the answer. */
  use: [answer: JamKeyAndMode]
  /** `Keep {key} {mode}`: decline this doodle's suggestion for good. */
  keep: []
  /** The row's focused buttons left by a change of Jam's key or mode: focus goes elsewhere. */
  'focus-lost': []
}>()

/** The sentence a doodle outside the app's keys and modes gets; it never names a note. */
const NO_FIT_SENTENCE =
  "Your doodle uses notes outside the app's keys and modes, so no key is suggested."

const suggestion = useKeySuggestion({
  doodle: () => props.doodle,
  jam: () => props.jam,
  instrument: () => props.instrument,
  declined: () => props.declined,
  atIdle: props.atIdle,
})
const form = suggestion.form

const rowEl = ref<HTMLElement | null>(null)
const setSentenceEl = ref<HTMLElement | null>(null)
/** A button of the row was pressed: its leaving moves focus by that press's rule. */
let pressed = false

/** Intent: `Jam in {answer}`: ask for it; the set sentence takes focus once it shows. */
// @spec-link [[rule_suggestion_use_it]]
function useAnswer(answer: JamKeyAndMode): void {
  pressed = true
  suggestion.used(answer)
  emit('use', answer)
  void nextTick(() => {
    pressed = false
  })
}

/**
 * Intent: the set sentence, which only `Jam in {answer}` brings, takes focus as it shows, so a
 * screen reader reads the confirmation.
 */
// @spec-link [[rule_suggestion_use_it]]
watch(
  () => form.value.kind,
  (kind) => {
    if (kind === 'set') setSentenceEl.value?.focus()
  },
  { flush: 'post' },
)

/** Intent: `Keep {key} {mode}`: ask to decline; the host moves focus as the row leaves. */
// @spec-link [[rule_suggestion_keep_mine]]
function keep(): void {
  pressed = true
  emit('keep')
  void nextTick(() => {
    pressed = false
  })
}

/**
 * Intent: the offering's buttons leaving while one holds focus, not by a press of theirs: read
 * before they leave the page, handed back once they have.
 */
watch(
  () => form.value.kind,
  (kind) => {
    if (kind === 'offering' || pressed) return
    const focused = document.activeElement
    if (rowEl.value === null || focused === null || !rowEl.value.contains(focused)) return
    void nextTick(() => emit('focus-lost'))
  },
  { flush: 'pre' },
)
</script>

<template>
  <div v-if="form.kind !== 'absent'" ref="rowEl" class="suggestion-row">
    <template v-if="form.kind === 'offering'">
      <p>Your doodle sounds like {{ form.answerName }}.</p>
      <button type="button" class="btn" :disabled="disabled" @click="useAnswer(form.answer)">
        Jam in {{ form.answerName }}
      </button>
      <button type="button" class="btn" :disabled="disabled" @click="keep">
        Keep {{ form.keepName }}
      </button>
    </template>
    <p v-else-if="form.kind === 'set'" ref="setSentenceEl" tabindex="-1">
      Jams now play in {{ form.answerName }}.
    </p>
    <p v-else>{{ NO_FIT_SENTENCE }}</p>
  </div>
</template>
