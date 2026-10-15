<script setup lang="ts">
/**
 * The My instrument sheet (`screens/my-instrument/`): a modal `sheet sheet-wide` where the player
 * makes their instrument from a built-in template, or changes or deletes the one they made. The
 * form holds the template (creating only), the name, the clef, the written range (two semitone
 * steppers, refused live in note names, never clamped) and the transposition (one stepper counting
 * semitones across octaves, its interval named beside it); the windows and the staff-reach note
 * follow the range. `Save` is disabled only while the range is refused; an unchanged save just
 * closes. The delete confirmation asks once. Escape, the backdrop and `Close` do what the way back
 * does; focus stays trapped in the sheet. The host applies what it reports and moves focus once
 * it closes. Loaded on demand.
 */
import { computed, nextTick, onBeforeUnmount, onMounted, ref, useId } from 'vue'

import SegmentedControl from '@/components/controls/SegmentedControl.vue'
import { instrumentProfileOptions } from '@/components/controls/control-options'
import { isInstrumentClef } from '@/domain/profile/instrument-clef'
import {
  findBuiltInInstrumentProfile,
  isBuiltInInstrumentProfileId,
} from '@/domain/profile/instrument-profiles'
import type { MyInstrument } from '@/domain/profile/my-instrument'
import NoteStepper from './NoteStepper.vue'
import { noteName } from './my-instrument-copy'
import { useMyInstrumentForm, type MyInstrumentFormStart } from './use-my-instrument'

const props = defineProps<{
  /** Creating from the selected built-in, or editing the saved my instrument. */
  start: MyInstrumentFormStart
  /** Whether my instrument is the selected instrument now. */
  selected: boolean
}>()

const emit = defineEmits<{
  /** Save this my instrument (it differs from the saved one, or none exists). */
  save: [instrument: MyInstrument]
  /** Delete my instrument, confirmed. */
  delete: []
  /** Leave the sheet with nothing saved: the way back, or a Save that changed nothing. */
  close: []
}>()

const CLEF_OPTIONS = [
  { value: 'treble', label: 'Treble clef' },
  { value: 'bass', label: 'Bass clef' },
] as const

const form = useMyInstrumentForm(props.start)
const titleId = useId()
const nameId = useId()
const dialog = ref<HTMLElement | null>(null)
const nameInput = ref<HTMLInputElement | null>(null)
const templateField = ref<HTMLElement | null>(null)
const deleteButton = ref<HTMLButtonElement | null>(null)
const confirmWayBack = ref<HTMLButtonElement | null>(null)
const confirming = ref(false)

const editing = computed(() => props.start.mode === 'editing')
const title = computed(() => {
  if (confirming.value) return 'Delete my instrument?'
  return editing.value ? 'My instrument' : 'Create my instrument'
})

/** Intent: the display name of a built-in profile. */
function builtInName(id: string): string {
  const profile = findBuiltInInstrumentProfile(id)
  if (profile === undefined) throw new Error(`my instrument sheet: no built-in "${id}"`)
  return profile.displayName
}

const madeFrom = computed(() => `Made from: ${builtInName(form.template.value)}`)
const canSave = computed(() => form.refusals.value.length === 0)

/** The delete confirmation's first paragraph: what goes, and where the selection returns. */
const deleteWhat = computed(() => {
  if (props.start.mode !== 'editing') return ''
  const { name, template } = props.start.saved
  const goes = `${name} will be deleted, with its clef, range and transposition.`
  return props.selected
    ? `${goes} The instrument goes back to ${builtInName(template)}, the profile it was made from.`
    : goes
})

/** Intent: whether `instrument` holds what the saved one holds, so saving it changes nothing. */
function unchanged(instrument: MyInstrument): boolean {
  if (props.start.mode !== 'editing') return false
  const saved = props.start.saved
  return (
    instrument.name === saved.name &&
    instrument.clef === saved.clef &&
    instrument.writtenRange.minMidi === saved.writtenRange.minMidi &&
    instrument.writtenRange.maxMidi === saved.writtenRange.maxMidi &&
    instrument.transposition.octaves === saved.transposition.octaves &&
    instrument.transposition.semitones === saved.transposition.semitones &&
    instrument.transposition.direction === saved.transposition.direction
  )
}

/** Intent: `Save`: report my instrument as the form holds it; an unchanged one only closes. */
// @spec-link [[req_my_instrument]]
function save(): void {
  if (!canSave.value) return
  const instrument = form.instrument()
  if (unchanged(instrument)) emit('close')
  else emit('save', instrument)
}

/** Intent: a template chosen: refill the range and the transposition from it. */
function chooseTemplate(value: string): void {
  if (!isBuiltInInstrumentProfileId(value)) throw new Error(`my instrument sheet: "${value}"`)
  form.chooseTemplate(value)
}

/** Intent: a clef chosen: the range is checked again against it at once. */
function chooseClef(value: string): void {
  if (!isInstrumentClef(value)) throw new Error(`my instrument sheet: no clef "${value}"`)
  form.clef.value = value
}

/** Intent: open the delete confirmation, focus on its way back. */
async function askToDelete(): Promise<void> {
  confirming.value = true
  await nextTick()
  confirmWayBack.value?.focus()
}

/** Intent: leave the delete confirmation for the form, focus back on its Delete button. */
async function backToForm(): Promise<void> {
  confirming.value = false
  await nextTick()
  deleteButton.value?.focus()
}

/** Intent: the way back: from the confirmation to the form, from the form out of the sheet. */
function wayBack(): void {
  if (confirming.value) void backToForm()
  else emit('close')
}

/** Intent: a press on the backdrop itself, not inside the sheet, is the way back. */
function handleBackdropClick(event: MouseEvent): void {
  if (event.target === event.currentTarget) wayBack()
}

/**
 * Intent: the name field's text goes into the form as `v-model` would put it: at every input,
 * except while an input method is composing, whose text lands once the composition ends.
 */
function handleNameText(event: Event): void {
  if (event.type === 'input' && (event as InputEvent).isComposing) return
  form.name.value = (event.target as HTMLInputElement).value
}

/** Intent: Enter in the name field does what `Save` does when it is enabled. */
function handleNameEnter(event: KeyboardEvent): void {
  event.preventDefault()
  save()
}

/** Intent: the sheet's tab stops, in order. */
function tabStops(): HTMLElement[] {
  if (dialog.value === null) throw new Error('my instrument sheet: the dialog is not rendered')
  return Array.from(
    dialog.value.querySelectorAll<HTMLElement>(
      'button:not([disabled]):not([tabindex="-1"]), input:not([disabled]), [tabindex="0"]',
    ),
  )
}

/** Intent: Tab and Shift+Tab cycle through the sheet's tab stops, wrapping at both ends. */
function cycleFocus(direction: 1 | -1): void {
  const stops = tabStops()
  const at = stops.findIndex((stop) => stop === document.activeElement)
  const from = at === -1 ? (direction === 1 ? -1 : 0) : at
  const next = stops[(from + direction + stops.length) % stops.length]
  if (next === undefined) throw new Error('my instrument sheet: no tab stop (Close is missing)')
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

/** Intent: on open, listen for Escape and Tab; focus the template (creating) or the name. */
onMounted(() => {
  document.addEventListener('keydown', handleKeydown)
  if (editing.value) {
    nameInput.value?.focus()
    return
  }
  templateField.value?.querySelector<HTMLElement>('[role="radio"][tabindex="0"]')?.focus()
})

/** Intent: stop listening for keys once the sheet leaves the page. */
onBeforeUnmount(() => {
  document.removeEventListener('keydown', handleKeydown)
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
      <div v-if="confirming" class="sheet-body">
        <p>{{ deleteWhat }}</p>
        <p>This can't be undone.</p>
      </div>
      <div v-else class="sheet-body">
        <div v-if="!editing" ref="templateField" class="field-group">
          <span class="field-label">Start from</span>
          <SegmentedControl
            label="Start from"
            :options="instrumentProfileOptions()"
            :model-value="form.template.value"
            :readonly="false"
            @update:model-value="chooseTemplate"
          />
          <p class="field-note">Fills in the range and the transposition below.</p>
        </div>
        <p v-else class="sheet-hint">{{ madeFrom }}</p>
        <div class="field-group">
          <label class="field-label" :for="nameId">Name</label>
          <input
            :id="nameId"
            ref="nameInput"
            :value="form.name.value"
            class="text-input"
            type="text"
            maxlength="30"
            @input="handleNameText"
            @compositionend="handleNameText"
            @keydown.enter="handleNameEnter"
          />
          <p class="field-note">Left empty, it is called My instrument.</p>
        </div>
        <div class="field-group">
          <span class="field-label">Clef</span>
          <SegmentedControl
            label="Clef"
            :options="CLEF_OPTIONS"
            :model-value="form.clef.value"
            :readonly="false"
            @update:model-value="chooseClef"
          />
          <p class="field-note">
            Bass clef suits low instruments. The clef changes where notes are drawn, never which
            notes.
          </p>
        </div>
        <section class="sheet-section">
          <h3>Range</h3>
          <p class="sheet-hint">In written notes, the way you read them. C4 is middle C.</p>
          <div class="range-row">
            <div class="field-group">
              <span class="field-label">Lowest note</span>
              <NoteStepper
                v-model="form.lowest.value"
                :min="form.lowestBounds.value.min"
                :max="form.lowestBounds.value.max"
                label="Lowest note"
                :value-text="noteName(form.lowest.value)"
                :value-a11y-text="noteName(form.lowest.value)"
                down-label="Lowest note one semitone down"
                up-label="Lowest note one semitone up"
                :disabled="false"
              />
            </div>
            <div class="field-group">
              <span class="field-label">Highest note</span>
              <NoteStepper
                v-model="form.highest.value"
                :min="form.highestBounds.value.min"
                :max="form.highestBounds.value.max"
                label="Highest note"
                :value-text="noteName(form.highest.value)"
                :value-a11y-text="noteName(form.highest.value)"
                down-label="Highest note one semitone down"
                up-label="Highest note one semitone up"
                :disabled="false"
              />
            </div>
          </div>
          <div
            v-if="form.refusals.value.length > 0"
            class="inline-alert alert-notice range-alert"
            role="status"
          >
            <p v-for="line in form.refusals.value" :key="line">{{ line }}</p>
          </div>
          <p v-else class="profile-range-summary">{{ form.rangeSummary.value }}</p>
          <p v-if="form.staffReach.value !== null" class="field-note">
            {{ form.staffReach.value }}
          </p>
        </section>
        <section class="sheet-section">
          <h3>Transposition</h3>
          <div class="field-group">
            <span class="field-label">Sounds</span>
            <NoteStepper
              v-model="form.count.value"
              :min="form.countBounds.value.min"
              :max="form.countBounds.value.max"
              label="Sounds"
              :value-text="form.countText.value"
              :value-a11y-text="form.countA11yText.value"
              down-label="One semitone lower"
              up-label="One semitone higher"
              :disabled="false"
            />
            <p class="field-note">{{ form.transpositionNote.value }}</p>
          </div>
        </section>
        <div v-if="editing" class="sheet-actions-destructive">
          <button ref="deleteButton" class="btn btn-error" type="button" @click="askToDelete">
            Delete my instrument
          </button>
        </div>
      </div>
      <div v-if="confirming" class="sheet-actions">
        <button class="btn btn-error" type="button" @click="emit('delete')">
          Delete my instrument
        </button>
        <button ref="confirmWayBack" class="btn" type="button" @click="backToForm">Cancel</button>
      </div>
      <div v-else class="sheet-actions">
        <button class="btn btn-primary" type="button" :disabled="!canSave" @click="save">
          Save
        </button>
        <button class="btn" type="button" @click="emit('close')">Cancel</button>
      </div>
    </div>
  </div>
</template>
