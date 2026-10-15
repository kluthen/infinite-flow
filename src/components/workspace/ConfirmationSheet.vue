<script setup lang="ts">
/**
 * The shared confirmation sheet, in the confirmation pattern every confirmation follows: a modal
 * dialog over a dimming backdrop, named by its title (the question), its paragraphs (what goes
 * and, for a deletion, "This can't be undone."), then its confirming action and the way back, in
 * markup, visual and focus order; a deleting action takes `btn-error`, any other the primary
 * emphasis. On open, focus goes to the way back and stays trapped in the sheet. Escape, a press on
 * the backdrop and Close are the way back. A failure's error shows under the paragraphs, the
 * confirming action staying to try again; while its action runs, that button is busy. The host
 * shows and hides it, and moves focus once it closes.
 */
import { onBeforeUnmount, onMounted, ref, useId } from 'vue'

// @spec-link [[rule_kept_played_notes_deletable]]
defineProps<{
  /** The question the sheet asks. */
  title: string
  /** What the confirmation does, one paragraph each, in order. */
  paragraphs: readonly string[]
  /** The confirming action's label. */
  confirmLabel: string
  /** The way back's label. */
  cancelLabel: string
  /** The confirming action deletes something: it takes `btn-error`. */
  destructive: boolean
  /** The error of a failed confirmation; null when none. */
  error: string | null
  /** The confirming action runs: its button is busy and disabled. */
  busy: boolean
}>()

const emit = defineEmits<{
  /** The confirming action was pressed. */
  confirm: []
  /** The way back: the way-back action, Close, Escape or a press on the backdrop. */
  cancel: []
}>()

const titleId = useId()
const dialog = ref<HTMLElement | null>(null)
const wayBack = ref<HTMLButtonElement | null>(null)

/** Intent: a press on the backdrop itself, not inside the sheet, is the way back. */
function handleBackdropClick(event: MouseEvent): void {
  if (event.target === event.currentTarget) emit('cancel')
}

/** Intent: the sheet's enabled buttons, in order: Close, then the actions. */
function tabStops(): HTMLElement[] {
  if (dialog.value === null) throw new Error('confirmation sheet: the dialog is not rendered')
  return Array.from(dialog.value.querySelectorAll<HTMLElement>('button:not([disabled])'))
}

/** Intent: Tab and Shift+Tab cycle through the sheet's buttons, wrapping at both ends. */
function cycleFocus(direction: 1 | -1): void {
  const stops = tabStops()
  const at = stops.findIndex((stop) => stop === document.activeElement)
  const from = at === -1 ? (direction === 1 ? -1 : 0) : at
  const next = stops[(from + direction + stops.length) % stops.length]
  if (next === undefined) throw new Error('confirmation sheet: no tab stop (Close is missing)')
  next.focus()
}

/** Intent: while the sheet is open, Escape is the way back and Tab stays trapped in it. */
function handleKeydown(event: KeyboardEvent): void {
  if (event.key === 'Escape') {
    event.preventDefault()
    emit('cancel')
  } else if (event.key === 'Tab') {
    event.preventDefault()
    cycleFocus(event.shiftKey ? -1 : 1)
  }
}

/** Intent: on open, listen for Escape and Tab, and put focus on the way back. */
onMounted(() => {
  document.addEventListener('keydown', handleKeydown)
  if (wayBack.value === null) throw new Error('confirmation sheet: the way back is not rendered')
  wayBack.value.focus()
})

/** Intent: stop listening for keys once the sheet leaves the page. */
onBeforeUnmount(() => {
  document.removeEventListener('keydown', handleKeydown)
})
</script>

<template>
  <div class="sheet-backdrop" @click="handleBackdropClick">
    <div ref="dialog" class="sheet" role="dialog" aria-modal="true" :aria-labelledby="titleId">
      <div class="sheet-header">
        <h2 :id="titleId" class="sheet-title">{{ title }}</h2>
        <button class="btn sheet-close" type="button" @click="emit('cancel')">Close</button>
      </div>
      <div class="sheet-body">
        <p v-for="(paragraph, index) in paragraphs" :key="index">{{ paragraph }}</p>
        <div v-if="error !== null" class="inline-alert alert-error">
          <p>{{ error }}</p>
        </div>
      </div>
      <div class="sheet-actions">
        <button
          class="btn"
          :class="[destructive ? 'btn-error' : 'btn-primary', { 'is-loading': busy }]"
          type="button"
          :disabled="busy"
          @click="emit('confirm')"
        >
          {{ confirmLabel }}
        </button>
        <button ref="wayBack" class="btn" type="button" @click="emit('cancel')">
          {{ cancelLabel }}
        </button>
      </div>
    </div>
  </div>
</template>
