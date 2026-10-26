<script setup lang="ts">
/**
 * The "During a session" group's last field: `Vary settings`, `Off` or `On`, with its v3.2 note,
 * and under it its dependent `What may vary`: six toggles, the groups of settings Vary settings
 * may move. Unavailable for lack of a move (the parent says so): `On` is disabled and named by a
 * second note, `Off` shows checked and choosing it keeps a stored `On`, and What may vary stays
 * shown so the cause can be fixed. While the rhythm lock is on, the `Rhythm` toggle is disabled and
 * shown off, named by a note after the list, its stored choice kept. Props-in/events-out only:
 * each change is reported as the full new value; the parent makes the field read-only during a
 * generation and for a whole session, and says, during a session, the availability it started
 * with.
 */
import { computed, useId } from 'vue'

import {
  VARY_SETTINGS_GROUPS,
  type AllowedGroups,
  type VarySettingsGroup,
} from '@/session/settings-mutation-scales'
import FieldDependent from './FieldDependent.vue'
import SegmentedControl from './SegmentedControl.vue'
import ToggleList from './ToggleList.vue'
import { chosenOffOn, offOnOptions, shownOffOn } from './off-on-segments'
import type { ToggleListItem } from './toggle-list-item'

const props = defineProps<{
  varySettings: boolean
  /** Whether Vary settings has a move: while false its `On` cannot be chosen. */
  varySettingsAvailable: boolean
  /** The groups Vary settings may move, the Rhythm group's stored choice kept under the lock. */
  allowedGroups: AllowedGroups
  rhythmLockOn: boolean
  readonly: boolean
}>()

const emit = defineEmits<{
  'set-vary-settings': [on: boolean]
  'set-allowed-groups': [groups: AllowedGroups]
}>()

/** The `Vary settings` note, as the phrase-workspace handoff words it for v3.2. */
const VARY_SETTINGS_NOTE =
  'Every 2 to 4 phrases, one setting from the groups below moves one step. Never the instrument or the tempo. Keys and modes stay within what your preset is meant for. Your settings come back when the session ends.'

/** Why `Vary settings` cannot be turned on, shown while no move is possible. */
const VARY_SETTINGS_UNAVAILABLE_NOTE =
  'Nothing is allowed to vary with these choices. Turn on another group below.'

/** Why the `Rhythm` group cannot be changed, shown while the rhythm lock is on. */
const RHYTHM_GROUP_LOCKED_NOTE = 'The rhythm lock holds the rhythm.'

/** Each group's toggle name, as the phrase-workspace handoff words it. */
const GROUP_LABELS: Readonly<Record<VarySettingsGroup, string>> = {
  keyAndMode: 'Key and mode',
  harmony: 'Harmony',
  tension: 'Tension',
  rhythm: 'Rhythm',
  melodyShape: 'Melody shape',
  figures: 'Embellishments',
}

const varySettingsNoteId = useId()
const varySettingsUnavailableNoteId = useId()
const allowedGroupsLabelId = useId()
const rhythmGroupLockedNoteId = useId()

/** Intent: the `Vary settings` segments, `On` disabled and naming the reason while unavailable. */
// @spec-link [[rule_vary_settings_needs_legal_move]]
const varySettingsOptions = computed(() =>
  offOnOptions(props.varySettingsAvailable, varySettingsUnavailableNoteId),
)

/** Intent: the checked `Vary settings` segment: `Off` while unavailable, else the choice. */
// @spec-link [[rule_vary_settings_needs_legal_move]]
const shownVarySettings = computed(() =>
  shownOffOn(props.varySettings, props.varySettingsAvailable),
)

/**
 * Intent: whether What may vary shows: while Vary settings shows `On`, and while it is unavailable
 * for lack of a move, so the cause can be fixed.
 */
// @spec-link [[ui_field_dependent]]
// @spec-link [[rule_vary_settings_needs_legal_move]]
const allowedGroupsShown = computed(
  () => shownVarySettings.value === 'on' || !props.varySettingsAvailable,
)

/**
 * Intent: the six toggles in VARY_SETTINGS_GROUPS order, each pressed while its group is allowed;
 * under the rhythm lock, `Rhythm` disabled, shown off and naming the reason.
 */
// @spec-link [[rule_vary_settings_allowed_groups]]
// @spec-link [[req_rhythm_lock]]
const groupItems = computed((): readonly ToggleListItem[] =>
  VARY_SETTINGS_GROUPS.map((group) =>
    group === 'rhythm' && props.rhythmLockOn
      ? {
          value: group,
          label: GROUP_LABELS[group],
          pressed: false,
          disabled: true,
          describedBy: rhythmGroupLockedNoteId,
        }
      : { value: group, label: GROUP_LABELS[group], pressed: props.allowedGroups[group] },
  ),
)

/**
 * Intent: report the player's `Vary settings` choice. Choosing the `Off` that stands in for a kept
 * `On` while unavailable changes nothing, so the kept `On` shows again once a move exists.
 */
// @spec-link [[req_settings_mutation_flag]]
// @spec-link [[rule_vary_settings_needs_legal_move]]
function handleVarySettings(value: string): void {
  const on = chosenOffOn('Vary settings', value, props.varySettings, props.varySettingsAvailable)
  if (on !== null) emit('set-vary-settings', on)
}

/**
 * Intent: report the six groups with the toggled one flipped, the others as stored (a `Rhythm`
 * held by the lock included), refusing a value that is no group.
 */
// @spec-link [[rule_vary_settings_allowed_groups]]
function handleGroup(value: string): void {
  const toggled = VARY_SETTINGS_GROUPS.find((group) => group === value)
  if (toggled === undefined) throw new Error(`What may vary has no "${value}" toggle.`)
  emit('set-allowed-groups', { ...props.allowedGroups, [toggled]: !props.allowedGroups[toggled] })
}
</script>

<template>
  <!-- @spec-link [[req_settings_mutation_flag]] -->
  <div class="field-group" :class="{ 'is-readonly': readonly }">
    <span class="field-label">Vary settings</span>
    <SegmentedControl
      label="Vary settings"
      :options="varySettingsOptions"
      :model-value="shownVarySettings"
      :readonly="readonly"
      :described-by="varySettingsNoteId"
      @update:model-value="handleVarySettings"
    />
    <p :id="varySettingsNoteId" class="field-note">{{ VARY_SETTINGS_NOTE }}</p>
    <!-- @spec-link [[rule_vary_settings_needs_legal_move]] -->
    <p v-if="!varySettingsAvailable" :id="varySettingsUnavailableNoteId" class="field-note">
      {{ VARY_SETTINGS_UNAVAILABLE_NOTE }}
    </p>
    <!-- @spec-link [[ui_field_dependent]] -->
    <!-- @spec-link [[rule_vary_settings_allowed_groups]] -->
    <FieldDependent :shown="allowedGroupsShown" :readonly="readonly">
      <span :id="allowedGroupsLabelId" class="field-label">What may vary</span>
      <!-- @spec-link [[ui_toggle_list]] -->
      <ToggleList
        :labelled-by="allowedGroupsLabelId"
        :items="groupItems"
        :readonly="readonly"
        @toggle="handleGroup"
      />
      <p v-if="rhythmLockOn" :id="rhythmGroupLockedNoteId" class="field-note">
        {{ RHYTHM_GROUP_LOCKED_NOTE }}
      </p>
    </FieldDependent>
  </div>
</template>
