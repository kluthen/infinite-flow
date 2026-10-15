<script setup lang="ts">
/**
 * `sessions-panel`: the session list, the review mode's second level, in the Review's place. Its
 * title ("All sessions", a focus target never in the tab order), its intro, then one
 * `session-row` per kept session the controller holds a row for, newest first (./SessionRow.vue),
 * or its empty state: "No sessions are kept…", or, when the kept sessions could not be read in this
 * visit, "Kept sessions can't be read in this visit." It ships with the Review's code, loaded on
 * demand with the review area (./load-review-panel.ts). A `Delete` holding focus as saving turns
 * off, and so leaves, hands focus to the title.
 */
import { nextTick, ref, useId, watch } from 'vue'

import type { KeptSessionRow } from '@/components/workspace/use-kept-sessions'
import SessionRow from './SessionRow.vue'

const props = defineProps<{
  rows: readonly KeptSessionRow[]
  /** The most recent session's key, whose row says " · Last session"; null with none. */
  mostRecentKey: string | null
  /** The key whose opening's read runs; null with none. */
  openingKey: string | null
  savingOff: boolean
  /** The kept sessions could not be read in this visit. */
  unreadable: boolean
}>()

const emit = defineEmits<{
  open: [key: string]
  'toggle-pin': [key: string]
  delete: [key: string]
}>()

const titleId = useId()
const titleEl = ref<HTMLElement | null>(null)
/** The mounted rows, by their session's key (a `v-for` ref array keeps no order). */
const rowEls = new Map<string, InstanceType<typeof SessionRow>>()

/** Intent: keep the mounted row of the session under `key`, or forget it once unmounted. */
function setRow(key: string, element: unknown): void {
  if (element === null) rowEls.delete(key)
  else rowEls.set(key, element as InstanceType<typeof SessionRow>)
}

/** Intent: the mounted row of the session under `key`; throws when it has none. */
function rowOf(key: string): InstanceType<typeof SessionRow> {
  const element = rowEls.get(key)
  if (element === undefined) throw new Error(`session list: no row for the session "${key}"`)
  return element
}

/** Intent: move focus to the list's title (from the cue row, after a deletion, a failed open). */
// @spec-link [[req_kept_session_list]]
function focusTitle(): void {
  if (titleEl.value === null) throw new Error('session list: the title is not mounted')
  titleEl.value.focus()
}

defineExpose({
  focusTitle,
  focusOpen: (key: string) => rowOf(key).focusOpen(),
  focusPin: (key: string) => rowOf(key).focusPin(),
  focusDelete: (key: string) => rowOf(key).focusDelete(),
})

/**
 * Intent: a row's `Delete` leaving while it holds focus (saving turned off) hands focus to the
 * title; read before the button leaves the page, moved once it has.
 */
// @spec-link [[rule_outdated_tab_stops_saving]]
watch(
  () => props.savingOff,
  (off) => {
    if (!off || ![...rowEls.values()].some((row) => row.deleteFocused())) return
    void nextTick(focusTitle)
  },
  { flush: 'pre' },
)
</script>

<template>
  <section class="sessions-panel" :aria-labelledby="titleId">
    <div class="sessions-header">
      <h2 :id="titleId" ref="titleEl" class="review-title" tabindex="-1">All sessions</h2>
    </div>
    <p class="sessions-intro">
      Your most recent session is kept until your next one is saved. Pin a session to keep it for
      good.
    </p>
    <ol v-if="rows.length > 0" class="session-list">
      <SessionRow
        v-for="row in rows"
        :key="row.key"
        :ref="(element) => setRow(row.key, element)"
        :row="row"
        :most-recent="row.key === mostRecentKey"
        :opening="row.key === openingKey"
        :saving-off="savingOff"
        @open="emit('open', row.key)"
        @toggle-pin="emit('toggle-pin', row.key)"
        @delete="emit('delete', row.key)"
      />
    </ol>
    <p v-else class="sessions-empty">
      {{
        unreadable
          ? "Kept sessions can't be read in this visit."
          : 'No sessions are kept. Your next session will be kept here.'
      }}
    </p>
  </section>
</template>
