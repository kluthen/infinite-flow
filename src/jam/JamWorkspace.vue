<script setup lang="ts">
/**
 * Jam's workspace view, shown in the score panel's staff viewport while Jam mode is on. Part of
 * Jam's code (src/jam/): it loads through Jam's one loader
 * (src/components/workspace/load-jam-mode.ts), never in the first load. For now it holds only the
 * empty Jam staff frame, named by the score panel's title.
 */
</script>

<template>
  <!-- @spec-link [[module_jam_code_boundary]] -->
  <div class="staff-viewport">
    <div class="staff-frame staff-jam" aria-labelledby="score-panel-title"></div>
  </div>
</template>
