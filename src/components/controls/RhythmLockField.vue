<script setup lang="ts">
/**
 * The "During a session" group's first field (v3.2): session mode's `Rhythm lock`, `Off` or `On`,
 * with its note, and under it, while it shows `On`, its dependent `Allowed rhythm changes`: five
 * toggles, the small rhythm edits the player allows on the locked rhythm. Hidden while the lock is
 * off, the list keeps its values, which come back with it. Props-in/events-out only: each change
 * is reported as the full new value; the parent makes the field read-only during a generation and
 * for a whole session.
 */
import { computed, useId } from 'vue'

import { RHYTHM_CHANGE_KINDS, type RhythmChangeKind } from '@/domain/generation/request-rhythm-lock'
import FieldDependent from './FieldDependent.vue'
import SegmentedControl from './SegmentedControl.vue'
import ToggleList from './ToggleList.vue'
import { isOn, OFF_ON_OPTIONS } from './off-on-segments'
import type { ToggleListItem } from './toggle-list-item'

const props = defineProps<{
  rhythmLockOn: boolean
  /** The allowed rhythm changes, in RHYTHM_CHANGE_KINDS order, kept while the lock is off. */
  allowedRhythmChanges: readonly RhythmChangeKind[]
  readonly: boolean
}>()

const emit = defineEmits<{
  'set-rhythm-lock': [on: boolean]
  'set-allowed-rhythm-changes': [kinds: readonly RhythmChangeKind[]]
}>()

/** The `Rhythm lock` note, as the phrase-workspace handoff words it. */
const RHYTHM_LOCK_NOTE =
  'Every phrase keeps the rhythm of the first one, so your eyes can stay on the notes.'

/** The `Allowed rhythm changes` note, as the phrase-workspace handoff words it. */
const ALLOWED_RHYTHM_CHANGES_NOTE =
  "Now and then one phrase changes the rhythm in one of these ways, and the next goes back to it. What's possible depends on your rhythm settings: with Strict variety and Straight syncopation, almost nothing."

/** Each allowed rhythm change's toggle name, as the phrase-workspace handoff words it. */
const RHYTHM_CHANGE_LABELS: Readonly<Record<RhythmChangeKind, string>> = {
  move_note_start: 'Move a note',
  move_rest: 'Move a rest',
  split_note: 'Split a note',
  merge_notes: 'Merge two notes',
  note_rest: 'Add or remove a rest',
}

const rhythmLockNoteId = useId()
const allowedRhythmChangesLabelId = useId()
const allowedRhythmChangesNoteId = useId()

/** Intent: the five toggles in RHYTHM_CHANGE_KINDS order, each pressed while it is allowed. */
// @spec-link [[rule_allowed_rhythm_changes]]
const rhythmChangeItems = computed((): readonly ToggleListItem[] =>
  RHYTHM_CHANGE_KINDS.map((kind) => ({
    value: kind,
    label: RHYTHM_CHANGE_LABELS[kind],
    pressed: props.allowedRhythmChanges.includes(kind),
  })),
)

/** Intent: report the player's `Rhythm lock` choice, refusing a value that is no segment. */
// @spec-link [[req_rhythm_lock]]
function handleRhythmLock(value: string): void {
  emit('set-rhythm-lock', isOn('Rhythm lock', value))
}

/**
 * Intent: report the allowed rhythm changes with the toggled kind flipped, in RHYTHM_CHANGE_KINDS
 * order, refusing a value that is no kind.
 */
// @spec-link [[rule_allowed_rhythm_changes]]
function handleRhythmChange(value: string): void {
  const toggled = RHYTHM_CHANGE_KINDS.find((kind) => kind === value)
  if (toggled === undefined) throw new Error(`Allowed rhythm changes has no "${value}" toggle.`)
  const allowed = props.allowedRhythmChanges
  emit(
    'set-allowed-rhythm-changes',
    RHYTHM_CHANGE_KINDS.filter((kind) =>
      kind === toggled ? !allowed.includes(kind) : allowed.includes(kind),
    ),
  )
}
</script>

<template>
  <!-- @spec-link [[req_rhythm_lock]] -->
  <div class="field-group" :class="{ 'is-readonly': readonly }">
    <span class="field-label">Rhythm lock</span>
    <SegmentedControl
      label="Rhythm lock"
      :options="OFF_ON_OPTIONS"
      :model-value="rhythmLockOn ? 'on' : 'off'"
      :readonly="readonly"
      :described-by="rhythmLockNoteId"
      @update:model-value="handleRhythmLock"
    />
    <p :id="rhythmLockNoteId" class="field-note">{{ RHYTHM_LOCK_NOTE }}</p>
    <!-- @spec-link [[ui_field_dependent]] -->
    <!-- @spec-link [[rule_allowed_rhythm_changes]] -->
    <FieldDependent :shown="rhythmLockOn" :readonly="readonly">
      <span :id="allowedRhythmChangesLabelId" class="field-label">Allowed rhythm changes</span>
      <!-- @spec-link [[ui_toggle_list]] -->
      <ToggleList
        :labelled-by="allowedRhythmChangesLabelId"
        :described-by="allowedRhythmChangesNoteId"
        :items="rhythmChangeItems"
        :readonly="readonly"
        @toggle="handleRhythmChange"
      />
      <p :id="allowedRhythmChangesNoteId" class="field-note">{{ ALLOWED_RHYTHM_CHANGES_NOTE }}</p>
    </FieldDependent>
  </div>
</template>
