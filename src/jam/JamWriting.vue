<script setup lang="ts">
/**
 * `jam-writing`: the cue row's part during a fresh Jam's generation measure and any extended wait
 * (and a barline with no note sounding during the capture, until a doodle note comes): one static
 * line, "Writing your first phrase", or "Writing" below bp-tablet-landscape, the stylesheet
 * showing one. No animation, no progress; not a live region, nothing announced. Part of Jam's code
 * (src/jam/), which the cue row reaches through Jam's loaded code.
 */
</script>

<template>
  <!-- @spec-link [[rule_jam_live_view_never_shows_doodle]] -->
  <!-- Below bp-tablet-landscape the stylesheet shows the narrow label instead of the wide one. -->
  <p class="jam-writing">
    <span class="cue-label-wide">Writing your first phrase</span
    ><span class="cue-label-narrow">Writing</span>
  </p>
</template>
