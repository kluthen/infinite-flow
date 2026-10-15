<script setup lang="ts">
/**
 * The connection sheet's `sheet-body`: exactly one state's block (screen handoff, Layout Tree and
 * States), copy verbatim, with the device-change line above it when the state was reached because
 * the chosen device was unplugged. Only the picker is interactive; its choice goes up as `choose`.
 */
import { computed } from 'vue'

import { judgeTranspositionCheck } from '@/domain/controller-check/transposition-check'
import {
  transpositionCheckCopy,
  type TranspositionCheckCopy,
} from '@/domain/controller-check/transposition-check-copy'
import type { InstrumentClef } from '@/domain/profile/instrument-clef'
import type { InstrumentProfile } from '@/domain/profile/instrument-profile'
import CheckNote from './CheckNote.vue'
import DevicePicker from './DevicePicker.vue'
import type { SheetModel } from './connection-sheet-model'

const props = defineProps<{
  model: SheetModel
  /** The current instrument profile, which the transposition check reads in. */
  profile: InstrumentProfile
  /** The current instrument's clef, the staff the check's note is drawn on. */
  clef: InstrumentClef
  /** The instrument profiles the check may suggest instead of the current one. */
  profiles: readonly InstrumentProfile[]
}>()

const emit = defineEmits<{
  /** The player chose this device in the picker. */
  choose: [deviceId: string]
}>()

const PICKER_LABEL_ID = 'device-picker-label'

const stage = computed(() => props.model.stage)

/**
 * Intent: "{device name} was unplugged." while the picker or No device found shows because the
 * chosen device was unplugged during the check or at Connected; else null.
 */
// @spec-link [[rule_same_controller_reattaches]]
const unpluggedLine = computed<string | null>(() => {
  const unplugged = props.model.unplugged
  const kind = stage.value.kind
  if (unplugged === null || (kind !== 'picker' && kind !== 'no-device')) return null
  return `${unplugged.device.name} was unplugged.`
})

/** Intent: in a picker reached from Connected, the id of the device in use, marked; else null. */
// @spec-link [[req_midi_controller_input]]
const inUseId = computed<string | null>(() => {
  const state = props.model.controller.state
  if (stage.value.kind !== 'picker' || !stage.value.fromConnected) return null
  return state.kind === 'connected' || state.kind === 'opening' ? state.device.id : null
})

/** Intent: the check result's copy, judged on the played note for the current profile; else null. */
// @spec-link [[rule_controller_transposition_check]]
const checkCopy = computed<TranspositionCheckCopy | null>(() => {
  const current = stage.value
  if (current.kind !== 'check' || current.played === null) return null
  const report = judgeTranspositionCheck(props.profile, current.played, props.profiles)
  return transpositionCheckCopy(report, props.profile)
})
</script>

<template>
  <div class="sheet-body">
    <div v-if="unpluggedLine !== null" class="inline-alert alert-notice">{{ unpluggedLine }}</div>
    <template v-if="stage.kind === 'requesting' && !stage.waiting">
      <p>Looking for your controller…</p>
    </template>
    <template v-else-if="stage.kind === 'requesting'">
      <p>
        Your browser is asking whether this page may use MIDI devices. Choose Allow in its prompt,
        near the address bar.
      </p>
      <p class="sheet-hint">You can also close this and practice without a controller.</p>
    </template>
    <template v-else-if="stage.kind === 'unsupported'">
      <p>This browser can't see MIDI controllers. Practicing without one works exactly the same.</p>
      <p class="sheet-hint">
        To use a controller, open Infinite Flow in a Chromium-based browser such as Chrome or Edge.
      </p>
    </template>
    <template v-else-if="stage.kind === 'denied'">
      <div class="inline-alert alert-error">
        Your browser has blocked MIDI devices for this page, so the app can't ask again by itself.
      </div>
      <p>
        To allow it: click the site-settings icon at the left of the address bar, set MIDI devices
        to Allow, then choose Check again.
      </p>
    </template>
    <template v-else-if="stage.kind === 'no-device'">
      <div class="inline-alert alert-notice">
        No MIDI controller is plugged in. Plug one in and switch it on, or continue without one.
      </div>
    </template>
    <template v-else-if="stage.kind === 'picker'">
      <p :id="PICKER_LABEL_ID">Several MIDI devices are plugged in. Choose the one you play.</p>
      <DevicePicker
        :devices="model.pickerDevices"
        :in-use-id="inUseId"
        :labelledby="PICKER_LABEL_ID"
        @choose="(deviceId) => emit('choose', deviceId)"
      />
    </template>
    <template v-else-if="stage.kind === 'check'">
      <CheckNote :profile="profile" :clef="clef" />
      <div v-if="checkCopy !== null" class="inline-alert alert-notice">
        <p>{{ checkCopy.result }}</p>
        <p>{{ checkCopy.suggestion }}</p>
        <p v-if="checkCopy.profileSuggestion !== null">{{ checkCopy.profileSuggestion }}</p>
      </div>
      <template v-else>
        <p>Play this note on your controller.</p>
        <p class="sheet-hint">Playing it here won't start a session.</p>
      </template>
    </template>
    <template v-else-if="stage.kind === 'connected'">
      <p>
        <span class="status-dot is-success" aria-hidden="true"></span>
        {{ stage.device.name }} is connected.
      </p>
      <p v-if="stage.rememberedLine === true" class="sheet-hint">
        This is the controller you chose last time. Run the check again if you have changed its
        settings.
      </p>
    </template>
  </div>
</template>
