<script setup lang="ts">
/**
 * The transposition check's `check-note`: the one written note of the current instrument profile,
 * engraved on a short staff in the instrument's clef by the score's notation pipeline (never as a
 * letter name). The engraver loads lazily; a load, font or drawing failure propagates (crash
 * early).
 */
import { computed, onMounted, ref } from 'vue'

import { checkWrittenNote } from '@/domain/controller-check/transposition-check'
import type { InstrumentClef } from '@/domain/profile/instrument-clef'
import type { InstrumentProfile } from '@/domain/profile/instrument-profile'
import { loadVexflowEngraver } from '@/notation/vexflow-engraver-loader'

const props = defineProps<{
  /** The current instrument profile, whose check note is shown in its written pitch. */
  profile: InstrumentProfile
  /** The current instrument's clef, the staff the note is drawn on (my instrument's own). */
  clef: InstrumentClef
}>()

const box = ref<HTMLElement | null>(null)
const writtenMidi = computed(() => checkWrittenNote(props.profile))

/**
 * Intent: once mounted, load the engraver and the notation fonts, then draw the check note, unless
 * the sheet left the check meanwhile.
 */
// @spec-link [[rule_controller_transposition_check]]
onMounted(async () => {
  const engraver = await loadVexflowEngraver()
  await engraver.ensureNotationFonts()
  if (box.value !== null) engraver.engraveCheckNote(box.value, writtenMidi.value, props.clef)
})
</script>

<template>
  <div ref="box" class="check-note"></div>
</template>
