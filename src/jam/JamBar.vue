<script setup lang="ts">
/**
 * The kept doodle's bar (`jam-bar`, flows/jam/handoff.md, Routing Rules; the phrase workspace's
 * handoff, The kept doodle's bar), shown in Jam mode while a doodle is kept: its sentence, then
 * `New doodle` at its inline end, then the key and mode suggestion as Jam's Idle shows it
 * (./review/SuggestionRow.vue, `atIdle`): judged against Jam's key and mode as in the review,
 * offered while they are not among the close answers and the doodle's suggestion is not declined,
 * never in its no-fit form. After `Jam in {answer}` the row says it is set until Jam's key or mode
 * changes again, another doodle is kept, or a session started on the doodle has ended. During that
 * session the bar is held still: unchanged, its buttons disabled. `New doodle` is disabled in
 * Loading too. What each button changes is its host's: the bar asks (`new-doodle`, `use`, `keep`);
 * after `Keep {key} {mode}`, focus moves to its sentence (`tabindex="-1"`, never in the tab order)
 * once the row has left. Not a live region; nothing in it is announced. Part of Jam's code
 * (src/jam/), loaded on demand.
 */
import { nextTick, ref, watch } from 'vue'

import type { QuantizedDoodle } from '@/domain/doodle/quantized-doodle'
import type { InstrumentProfile } from '@/domain/profile/instrument-profile'

import type { JamKeyAndMode } from './key-suggestion/key-suggestion'
import SuggestionRow from './review/SuggestionRow.vue'

// @spec-link [[module_kept_doodle]]
const props = defineProps<{
  /** The kept doodle, quantized. */
  doodle: QuantizedDoodle
  /** Jam's written key and Collection now. */
  jam: JamKeyAndMode
  /** The selected instrument, whose transposition the written key is read in. */
  instrument: Pick<InstrumentProfile, 'transposition'>
  /** The kept doodle's suggestion was declined. */
  declined: boolean
  /** Phrase 1 is being written from the doodle (Loading). */
  loading: boolean
  /** A session started from the kept doodle runs: the bar is held still. */
  held: boolean
}>()

const emit = defineEmits<{
  /** `New doodle`: let the kept doodle go. */
  'new-doodle': []
  /** `Jam in {answer}`: set Jam's key and mode to the answer. */
  use: [answer: JamKeyAndMode]
  /** `Keep {key} {mode}`: decline the kept doodle's suggestion for good. */
  keep: []
}>()

const sentenceEl = ref<HTMLElement | null>(null)

/**
 * The suggestion row's round: a new one, with nothing set, for another doodle kept and once a
 * session on the doodle has ended.
 */
const rowRound = ref(0)

watch(
  () => props.doodle,
  () => {
    rowRound.value += 1
  },
)

/** Intent: a session on the doodle ended: the set sentence it held still goes. */
// @spec-link [[rule_suggestion_use_it]]
watch(
  () => props.held,
  (held, wasHeld) => {
    if (wasHeld && !held) rowRound.value += 1
  },
)

/** Intent: focus the bar's own sentence, once the row's change is drawn. */
function focusSentence(): void {
  void nextTick(() => sentenceEl.value?.focus())
}

/** Intent: `Keep {key} {mode}`: ask to decline; focus moves to the sentence as the row leaves. */
// @spec-link [[rule_suggestion_keep_mine]]
function keep(): void {
  emit('keep')
  focusSentence()
}
</script>

<template>
  <div class="jam-bar">
    <p ref="sentenceEl" tabindex="-1">
      Jamming again on your doodle: phrase 1 continues it. Leaving Jam mode lets it go.
    </p>
    <button type="button" class="btn" :disabled="loading || held" @click="emit('new-doodle')">
      New doodle
    </button>
    <SuggestionRow
      :key="rowRound"
      :doodle="doodle"
      :jam="jam"
      :instrument="instrument"
      :declined="declined"
      :disabled="held"
      at-idle
      @use="emit('use', $event)"
      @keep="keep"
      @focus-lost="focusSentence"
    />
  </div>
</template>
