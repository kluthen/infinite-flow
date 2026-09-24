<script setup lang="ts">
/**
 * The below-bp-desktop portrait guard: entirely CSS-driven (see components.css's portrait media
 * rule, which hides `.layout-app` and reveals this instead), so this component has no responsive
 * logic of its own -- it only supplies the static copy the handoff defines.
 */
</script>

<template>
  <!-- @spec-link [[req_landscape_phrase_workspace]] -->
  <section class="orientation-notice">
    <p>Infinite Flow is designed for landscape reading. Rotate your device to view the phrase.</p>
  </section>
</template>
