<script setup lang="ts">
/**
 * The Your data sheet (ui_ux screens/your-data): what the app keeps on this device, the space it
 * uses and whether the browser protects it, with every all-at-once deletion. One modal dialog over
 * a dimming backdrop, its body the Overview or one Confirmation in its place, never both; a visit
 * that saves nothing shows its notice, the space and the protection only, with Delete everything
 * where it is still offered. Its model is ./use-your-data-sheet.ts and its words
 * ./your-data-copy.ts. Loaded on demand (./use-your-data.ts); the host shows it and hides it.
 * Focus moves to `Done` on open, to the way back when a Confirmation opens, back to the control
 * that opened it on the way back, and stays trapped in the sheet; Escape, the backdrop and Close
 * close the sheet from the Overview, go back from a Confirmation, and do nothing while a deletion
 * runs. Once the sheet has left, focus returns to its opener while that is still shown and
 * enabled, else to the workspace's fallback.
 */
import { computed, nextTick, onBeforeUnmount, onMounted, onUnmounted, ref, useId } from 'vue'

import type { MyInstrument } from '@/domain/profile/my-instrument'
import type { MidiController } from '@/midi/midi-controller-state'
import type { SavedDataLoad } from '@/storage-bootstrap'
import { injectSaveSettings } from './save-settings-injection'
import {
  CONTROLLER_HINT,
  confirmationCopy,
  controllerLine,
  DELETION_FAILED,
  INTRO,
  myInstrumentLines,
  PLAYED_NOTES_HINT,
  playedNotesLine,
  protectionLine,
  savingOffNotice,
  SESSIONS_HINT,
  SETTINGS_HINT,
  SETTINGS_LINE,
  sessionsLine,
  spaceLine,
  type YourDataConfirmationKind,
} from './your-data-copy'
import { useYourDataSheet } from './use-your-data-sheet'
import type { SessionController } from './workspace-session-controller-types'

// @spec-link [[req_your_data]]
const props = defineProps<{
  controller: SessionController
  savedData: Pick<SavedDataLoad, 'outcome' | 'savePolicy'>
  /** My instrument, as the workspace holds it; null with none. */
  myInstrument: MyInstrument | null
  /** The app's MIDI controller, whose remembered controller the sheet names. */
  midi: Pick<MidiController, 'change'>
  /** Reload the page, after Delete everything. */
  reloadPage: () => void
  /** Focus the workspace's fallback, when the opener is no longer shown once the sheet leaves. */
  focusFallback: () => void
}>()

const emit = defineEmits<{
  /** `Done`, or Close, Escape or the backdrop from the Overview. */
  close: []
}>()

/** The Overview's controls a Confirmation can be opened from, and `Done`. */
type Opener = 'every-session' | 'all-played-notes' | 'keep-played-notes' | 'everything' | 'done'

// The opener still holds focus while the sheet sets up: focus returns to it once the sheet leaves.
const opener = document.activeElement instanceof HTMLButtonElement ? document.activeElement : null
const rememberedControllerName = props.midi.change().remembered?.name ?? null
const titleId = useId()
const dialog = ref<HTMLElement | null>(null)
const buttons: Partial<Record<Opener, HTMLButtonElement>> = {}
const wayBackButton = ref<HTMLButtonElement | null>(null)
/** The control the open Confirmation was opened from. */
let openedFrom: Opener = 'done'

const model = useYourDataSheet({
  controller: props.controller,
  savedData: props.savedData,
  saveSettings: injectSaveSettings(),
  reloadPage: () => props.reloadPage(),
  forcedBack: () => focusAfterUpdate('done'),
})
const { form, sessions, playedNotesCount, keepPlayedNotes, space, protection, confirmation } = model

const instrumentLines = computed(() => myInstrumentLines(props.myInstrument))
const notice = computed(() => savingOffNotice(form.value))
const deleteEverythingOffered = computed(() => !form.value.startsWith('outdated'))
const copy = computed(() =>
  confirmation.value === null
    ? null
    : confirmationCopy(confirmation.value.kind, model.confirmationCount.value),
)
const title = computed(() => copy.value?.title ?? 'Your data')

/** Intent: keep the Overview's button `opener` to move focus to, or forget it once it leaves. */
function keep(opener: Opener, element: unknown): void {
  if (element instanceof HTMLButtonElement) buttons[opener] = element
  else delete buttons[opener]
}

/** Intent: once the sheet has rendered, focus the Overview's control `opener`, else `Done`. */
function focusAfterUpdate(opener: Opener): void {
  void nextTick(() => {
    const target = buttons[opener] ?? buttons.done
    if (target === undefined) throw new Error('your data: Done is not rendered')
    target.focus({ preventScroll: true })
  })
}

/** Intent: open the Confirmation `kind` from its Overview button; focus goes to its way back. */
function ask(kind: Exclude<YourDataConfirmationKind, 'kept-played-notes'>): void {
  openedFrom = kind
  model.ask(kind)
  void nextTick(() => wayBackButton.value?.focus())
}

/** Intent: `Keep my played notes` turned; its confirmation, if it opens, takes focus. */
async function toggleKeepPlayedNotes(): Promise<void> {
  if (await model.toggleKeepPlayedNotes()) {
    openedFrom = 'keep-played-notes'
    void nextTick(() => wayBackButton.value?.focus())
  }
}

/** Intent: the confirming action; on success, focus returns to its opener if still shown. */
async function confirm(): Promise<void> {
  const outcome = await model.confirm()
  if (outcome === 'overview') focusAfterUpdate(openedFrom)
}

/** Intent: the way back from a Confirmation, or closing the sheet from the Overview. */
function wayBack(): void {
  if (confirmation.value === null) {
    emit('close')
    return
  }
  if (model.back()) focusAfterUpdate(openedFrom)
}

/** Intent: a press on the backdrop itself, not inside the sheet, is the way back. */
function handleBackdropClick(event: MouseEvent): void {
  if (event.target === event.currentTarget) wayBack()
}

/** Intent: Tab and Shift+Tab cycle through the sheet's enabled buttons, wrapping at both ends. */
function cycleFocus(direction: 1 | -1): void {
  if (dialog.value === null) throw new Error('your data: the dialog is not rendered')
  const stops = Array.from(dialog.value.querySelectorAll<HTMLElement>('button:not([disabled])'))
  const at = stops.findIndex((stop) => stop === document.activeElement)
  const from = at === -1 ? (direction === 1 ? -1 : 0) : at
  const next = stops[(from + direction + stops.length) % stops.length]
  if (next === undefined) throw new Error('your data: no tab stop (Close is missing)')
  next.focus()
}

/** Intent: while the sheet is open, Escape is the way back and Tab stays trapped in it. */
function handleKeydown(event: KeyboardEvent): void {
  if (event.key === 'Escape') {
    event.preventDefault()
    wayBack()
  } else if (event.key === 'Tab') {
    event.preventDefault()
    cycleFocus(event.shiftKey ? -1 : 1)
  }
}

/** Intent: on open, listen for Escape and Tab, and focus `Done`, the sheet scrolled to its top. */
onMounted(() => {
  document.addEventListener('keydown', handleKeydown)
  dialog.value?.scrollTo({ top: 0 })
  focusAfterUpdate('done')
})

/** Intent: stop listening for keys once the sheet leaves the page. */
onBeforeUnmount(() => {
  document.removeEventListener('keydown', handleKeydown)
})

/** Intent: once the sheet has left, focus its opener if still shown and enabled, else the fallback. */
onUnmounted(() => {
  void nextTick(() => {
    if (opener !== null && opener.isConnected && !opener.disabled) opener.focus()
    else props.focusFallback()
  })
})
</script>

<template>
  <div class="sheet-backdrop" @click="handleBackdropClick">
    <div
      ref="dialog"
      class="sheet sheet-wide"
      role="dialog"
      aria-modal="true"
      :aria-labelledby="titleId"
    >
      <div class="sheet-header">
        <h2 :id="titleId" class="sheet-title">{{ title }}</h2>
        <button class="btn sheet-close" type="button" @click="wayBack">Close</button>
      </div>
      <div v-if="confirmation !== null && copy !== null" class="sheet-body">
        <p v-for="(paragraph, index) in copy.paragraphs" :key="index">{{ paragraph }}</p>
        <div v-if="confirmation.failed" class="inline-alert alert-error">
          <p>{{ DELETION_FAILED }}</p>
        </div>
      </div>
      <div v-else class="sheet-body">
        <p>{{ INTRO }}</p>
        <div v-if="notice !== null" class="inline-alert alert-notice">
          <p>{{ notice }}</p>
        </div>
        <template v-if="form === 'overview'">
          <section class="sheet-section">
            <h3>Settings</h3>
            <p>{{ SETTINGS_LINE }}</p>
            <p class="sheet-hint">{{ SETTINGS_HINT }}</p>
          </section>
          <section class="sheet-section">
            <h3>My instrument</h3>
            <p>{{ instrumentLines[0] }}</p>
            <p class="sheet-hint">{{ instrumentLines[1] }}</p>
          </section>
          <section class="sheet-section">
            <h3>Controller</h3>
            <p>{{ controllerLine(rememberedControllerName) }}</p>
            <p v-if="rememberedControllerName !== null" class="sheet-hint">
              {{ CONTROLLER_HINT }}
            </p>
          </section>
          <section class="sheet-section">
            <h3>Sessions</h3>
            <p>{{ sessionsLine(sessions.count, sessions.pinned, sessions.favorites) }}</p>
            <p class="sheet-hint">{{ SESSIONS_HINT }}</p>
            <!-- A plain wrapper: the section's grid would stretch the button (its own width). -->
            <div v-if="sessions.count > 0">
              <button
                :ref="(element) => keep('every-session', element)"
                type="button"
                class="btn"
                @click="ask('every-session')"
              >
                Delete every session
              </button>
            </div>
          </section>
          <section class="sheet-section">
            <h3>Played notes</h3>
            <div>
              <button
                :ref="(element) => keep('keep-played-notes', element)"
                type="button"
                class="btn toggle-button"
                :aria-pressed="keepPlayedNotes ? 'true' : 'false'"
                @click="toggleKeepPlayedNotes"
              >
                Keep my played notes
                <span class="toggle-button-state" aria-hidden="true">{{
                  keepPlayedNotes ? 'on' : 'off'
                }}</span>
              </button>
            </div>
            <p class="sheet-hint">{{ PLAYED_NOTES_HINT }}</p>
            <p>{{ playedNotesLine(playedNotesCount) }}</p>
            <div v-if="playedNotesCount > 0">
              <button
                :ref="(element) => keep('all-played-notes', element)"
                type="button"
                class="btn"
                @click="ask('all-played-notes')"
              >
                Delete all played notes
              </button>
            </div>
          </section>
        </template>
        <section class="sheet-section">
          <h3>Space used</h3>
          <p>{{ spaceLine(space) }}</p>
        </section>
        <section class="sheet-section">
          <h3>Protection</h3>
          <p>{{ protectionLine(protection) }}</p>
        </section>
        <div v-if="deleteEverythingOffered" class="sheet-actions-destructive">
          <button
            :ref="(element) => keep('everything', element)"
            type="button"
            class="btn btn-error"
            @click="ask('everything')"
          >
            Delete everything
          </button>
        </div>
      </div>
      <div v-if="confirmation !== null && copy !== null" class="sheet-actions">
        <button
          class="btn btn-error"
          :class="{ 'is-loading': confirmation.busy }"
          type="button"
          :disabled="confirmation.busy"
          @click="confirm"
        >
          {{ copy.confirmLabel }}
        </button>
        <button
          ref="wayBackButton"
          class="btn"
          type="button"
          :disabled="confirmation.busy"
          @click="wayBack"
        >
          {{ copy.cancelLabel }}
        </button>
      </div>
      <div v-else class="sheet-actions">
        <button
          :ref="(element) => keep('done', element)"
          class="btn btn-primary"
          type="button"
          @click="emit('close')"
        >
          Done
        </button>
      </div>
    </div>
  </div>
</template>
