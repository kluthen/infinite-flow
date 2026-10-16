<script setup lang="ts">
/**
 * The connection sheet's `sheet-body`: exactly one state's block (screen handoff, Layout Tree and
 * States), copy verbatim, with the device-change line above it when the state was reached because
 * the chosen device was unplugged. Only the picker is interactive; its choice goes up as `choose`.
 * The Use for my instrument confirmation shows the words of the use it is given, and, when my
 * instrument's kept sessions go with it, which, with the error line after a refused batch; a check
 * result whose use is withheld until a reload says so.
 */
import { computed } from 'vue'

import { judgeTranspositionCheck } from '@/domain/controller-check/transposition-check'
import {
  transpositionCheckCopy,
  type TranspositionCheckCopy,
} from '@/domain/controller-check/transposition-check-copy'
import type { InstrumentClef } from '@/domain/profile/instrument-clef'
import type { InstrumentProfile } from '@/domain/profile/instrument-profile'
import {
  checkEraseText,
  checkKeepSessionHint,
  ERASE_FAILED_LINE,
} from '@/components/workspace/my-instrument-sessions-copy'
import type { MyInstrumentSessionCount } from '@/components/workspace/workspace-session-controller-types'
import { useForMyInstrumentCopy, type UseForMyInstrument } from './check-for-my-instrument'
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
  /** What `Use this for my instrument` would save for the result; null when it is not offered. */
  use: UseForMyInstrument | null
  /** The kept sessions of my instrument the use erases; null when it erases none. */
  erased: MyInstrumentSessionCount | null
  /** The last `Use and erase` was refused: its error line shows. */
  eraseFailed: boolean
  /** The result's line saying the use waits for a reload; null when it is not withheld. */
  reloadLine: string | null
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

/** Intent: the Use for my instrument confirmation's words, while it shows; else null. */
// @spec-link [[rule_transposition_check_sets_my_instrument]]
const useCopy = computed(() => {
  if (stage.value.kind !== 'use') return null
  if (props.use === null) throw new Error('connection sheet: the confirmation has no use to show')
  return useForMyInstrumentCopy(props.use)
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
        <p v-if="reloadLine !== null">{{ reloadLine }}</p>
      </div>
      <template v-else>
        <p>Play this note on your controller.</p>
        <p class="sheet-hint">Playing it here won't start a session.</p>
      </template>
    </template>
    <template v-else-if="stage.kind === 'use' && useCopy !== null">
      <p v-for="paragraph in useCopy.paragraphs" :key="paragraph">{{ paragraph }}</p>
      <p v-if="useCopy.hint !== null" class="sheet-hint">{{ useCopy.hint }}</p>
      <template v-if="erased !== null">
        <p>{{ checkEraseText(erased.count, erased.reviewed) }}</p>
        <p>This can't be undone.</p>
        <p class="sheet-hint">{{ checkKeepSessionHint(erased.count) }}</p>
        <div v-if="eraseFailed" class="inline-alert alert-error">{{ ERASE_FAILED_LINE }}</div>
      </template>
    </template>
    <template v-else-if="stage.kind === 'connected'">
      <p>
        <span class="status-dot is-success" aria-hidden="true"></span>
        {{ stage.device.name }} is connected.
      </p>
      <p v-if="stage.matchedName !== undefined">
        {{ stage.matchedName }} now matches your controller.
      </p>
      <p v-if="stage.rememberedLine === true" class="sheet-hint">
        This is the controller you chose last time. Run the check again if you have changed its
        settings.
      </p>
    </template>
  </div>
</template>
