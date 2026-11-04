<script setup lang="ts">
/**
 * `jam-capture`: the cue row's part during a fresh Jam's capture. Its label ("Your doodle", or
 * "Doodle" below bp-tablet-landscape, the stylesheet showing one), then the count-in's four beats
 * read as the doodle's measures, 1 to 4: all unlit until the doodle's first note, then the
 * doodle's current measure lit (`is-current`), the ones before it `is-past`, those after it
 * unlit. It shows where the doodle is, never its notes. Not a live region, nothing announced, no
 * animation. Part of Jam's code (src/jam/), which the cue row reaches through Jam's loaded code.
 */
import type { DoodleMeasureCount } from '@/domain/doodle/quantized-doodle'

// @spec-link [[module_jam_capture]]
// @spec-link [[rule_jam_live_view_never_shows_doodle]]
defineProps<{
  /** The doodle's measure now, 1 to 4; null before its first note. */
  doodleMeasure: DoodleMeasureCount | null
}>()

/** The doodle's measures, one beat item each. */
const MEASURES: readonly DoodleMeasureCount[] = [1, 2, 3, 4]
</script>

<template>
  <!-- Below bp-tablet-landscape the stylesheet shows the narrow label instead of the wide one. -->
  <div class="jam-capture">
    <span class="cue-label-wide">Your doodle</span><span class="cue-label-narrow">Doodle</span>
    <ol class="count-in">
      <li
        v-for="measure in MEASURES"
        :key="measure"
        class="count-in-beat"
        :class="{
          'is-current': measure === doodleMeasure,
          'is-past': doodleMeasure !== null && measure < doodleMeasure,
        }"
      >
        {{ measure }}
      </li>
    </ol>
  </div>
</template>
