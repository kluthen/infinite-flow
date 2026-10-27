<script setup lang="ts">
/**
 * Jam's workspace view, shown in the score panel's staff viewport while Jam mode is on. Part of
 * Jam's code (src/jam/): it loads through Jam's one loader
 * (src/components/workspace/load-jam-mode.ts), never in the first load. At Jam mode's Idle with no
 * doodle kept it holds Jam's staff (./JamStaff.vue): the empty system in Jam's written key and
 * collection for the selected instrument, and the instruction. It passes on what the staff shows
 * (`staff-state`) and its `retryNotation()`, which the header's `Retry notation` calls. While it
 * shows, under the prewarm policy, it warms the generation worker for the rhythm values Jam's Idle
 * prewarms (./jam-idle-prewarm.ts): once on showing, and again after a change of that rhythm
 * setting; nothing else is generated or prepared.
 */
import { computed, ref, watch } from 'vue'

import JamStaff from './JamStaff.vue'
import { createJamIdlePrewarm } from './jam-idle-prewarm'
import type { JamStaffProps, JamStaffState, JamWorkspaceProps } from './jam-view-types'

// @spec-link [[module_jam_code_boundary]]
const props = defineProps<JamWorkspaceProps>()

const emit = defineEmits<{
  /** What Jam's staff shows changed. */
  'staff-state': [state: JamStaffState]
}>()

const jamStaff = ref<InstanceType<typeof JamStaff> | null>(null)

/** Intent: what Jam's staff is drawn from, and nothing else of what the view is given. */
const staffProps = computed<JamStaffProps>(() => ({
  tonalCenter: props.tonalCenter,
  collection: props.collection,
  instrumentProfileId: props.instrumentProfileId,
  myInstrument: props.myInstrument,
  systemPositionUnits: props.systemPositionUnits,
}))

/**
 * Intent: Jam's Idle prewarm, with a trigger of its own for as long as Jam mode shows: posted on
 * showing, then whenever what it reads changes the rhythm setting (the trigger dedupes the rest);
 * none while the prewarm policy is off.
 */
// @spec-link [[module_generation_prewarm]]
// @spec-link [[rule_jam_pregeneration_only_for_kept_doodle]]
const post = props.prewarm
if (post !== null) {
  const prewarm = createJamIdlePrewarm(post)
  watch(
    () => ({
      controls: props.controls,
      figureLevels: props.figureLevels,
      myInstrument: props.myInstrument,
    }),
    prewarm,
    { immediate: true },
  )
}

/** Intent: `Retry notation` in Jam mode: Jam's staff engraves the empty system again. */
// @spec-link [[rule_jam_idle_shows_no_phrase]]
function retryNotation(): void {
  if (jamStaff.value === null) throw new Error("Jam's view: its staff is not mounted.")
  jamStaff.value.retryNotation()
}

defineExpose({ retryNotation })
</script>

<template>
  <!-- @spec-link [[module_jam_code_boundary]] -->
  <div class="staff-viewport">
    <JamStaff ref="jamStaff" v-bind="staffProps" @staff-state="emit('staff-state', $event)" />
  </div>
</template>
