<script setup lang="ts">
/**
 * A generic, presentational `field-dependent`: the nested `field-group` under a field's own note
 * that holds an option depending on that field, rendered only while `shown`. It appears and leaves
 * at once, with no transition; what it holds lives in its parent's props, so a hidden dependent
 * loses nothing. Read-only with the field it sits in (the parent passes the field's state), the
 * dashed ring drawn once, around the outer field. Props-in only; its content is the slot.
 */
defineProps<{
  /** Whether the dependent is rendered: its condition holds, usually its switch shows `On`. */
  shown: boolean
  /** Whether the field it sits in is read-only. */
  readonly: boolean
}>()
</script>

<template>
  <!-- @spec-link [[ui_field_dependent]] -->
  <div v-if="shown" class="field-dependent">
    <div class="field-group" :class="{ 'is-readonly': readonly }">
      <slot />
    </div>
  </div>
</template>
