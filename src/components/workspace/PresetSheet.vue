<script setup lang="ts">
/**
 * The preset sheet (`screens/preset-sheet/`): one modal sheet in which a player preset is saved as
 * new (a name, then the Key and mode choice), saved with a new restriction (the reason, then Key
 * and mode), renamed (a name), or deleted, the last on the shared confirmation pattern
 * (./ConfirmationSheet.vue). A refused name shows its first reason in a polite `name-alert` and
 * keeps the main action disabled; Enter in the name field does what the main action does when it
 * is enabled. Key and mode is a radiogroup with one tab stop, arrow keys checking and focusing.
 * Focus goes to the name field (its text selected), the checked option, or the confirmation's way
 * back at open, and stays trapped; Escape, the backdrop and Close do what Cancel does. A deletion
 * shows its running state on its button, the way back inert meanwhile, and a failed one keeps the
 * confirmation with its error line. Props-in/events-out: the host applies what it reports, closes
 * the sheet and moves focus. Loaded on demand (./load-preset-sheet.ts).
 */
import { computed, onBeforeUnmount, onMounted, ref, useId } from 'vue'

import type {
  SaveRestrictionChoice,
  SaveRestrictionChoiceKind,
} from '@/domain/presets/preset-save-choices'
import ConfirmationSheet from './ConfirmationSheet.vue'
import type { PresetSheetProps } from './load-preset-sheet'
import {
  choiceLabel,
  DELETE_FAILED_LINE,
  DELETE_PARAGRAPHS,
  KEY_AND_MODE_NOTE,
  nameAlertText,
  presetSheetTitle,
  saveChangesReason,
} from './preset-sheet-copy'

const props = defineProps<PresetSheetProps>()

const emit = defineEmits<{
  /** Save as new under the name as typed, with the restriction choice checked. */
  'save-as-new': [name: string, choice: SaveRestrictionChoiceKind]
  /** Save changes with the restriction choice checked. */
  'save-changes': [choice: SaveRestrictionChoiceKind]
  /** Rename to the name as typed. */
  rename: [name: string]
  /** Cancel: the way back, Close, Escape or the backdrop; nothing saved. */
  close: []
}>()

const titleId = useId()
const nameId = useId()
const keyAndModeId = useId()
const noteId = useId()
const dialog = ref<HTMLElement | null>(null)
const nameInput = ref<HTMLInputElement | null>(null)
const optionRefs = ref<(HTMLButtonElement | null)[]>([])

const opening = props.opening
const presetName = opening.mode === 'save-as-new' ? '' : opening.preset.name
const title = presetSheetTitle(opening.mode, presetName)
const offered: readonly SaveRestrictionChoice[] =
  opening.mode === 'save-as-new' || opening.mode === 'save-changes' ? opening.choices : []
const asksName = opening.mode === 'save-as-new' || opening.mode === 'rename'
const mainLabel = { 'save-as-new': 'Save', 'save-changes': 'Save changes', rename: 'Rename' }

const name = ref(opening.mode === 'save-as-new' ? opening.suggestedName : presetName)
const checked = ref<number>(0)
const deleting = ref(false)
const deletionFailed = ref(false)

/** The refused name's reason, checked at every input, the prefilled value included; null when accepted. */
// @spec-link [[rule_player_preset_names]]
const nameAlert = computed(() => (asksName ? nameAlertText(props.checkName(name.value)) : null))

/** Why Save changes asks: the current key and mode lie outside the preset's restriction. */
// @spec-link [[rule_save_changes_restriction]]
const reason = computed(() => {
  if (opening.mode !== 'save-changes') return ''
  const current = offered.find((choice) => choice.kind === 'onlyThisKeyAndMode')
  if (current === undefined) throw new Error('preset sheet: Save changes offers no current pair')
  return saveChangesReason(presetName, current.restriction, opening.preset.restriction)
})

/** Intent: the kind of the checked restriction choice. */
function checkedKind(): SaveRestrictionChoiceKind {
  const choice = offered[checked.value]
  if (choice === undefined) throw new Error('preset sheet: no restriction choice is checked')
  return choice.kind
}

/**
 * Intent: the main action: Save, Save changes or Rename, reporting the name as typed (the host
 * trims and checks it) and the choice checked. While the name is refused it does nothing.
 */
// @spec-link [[rule_preset_management_actions]]
// @spec-link [[rule_saving_preset_asks_its_restriction]]
function confirm(): void {
  if (nameAlert.value !== null) return
  if (opening.mode === 'save-as-new') emit('save-as-new', name.value, checkedKind())
  else if (opening.mode === 'save-changes') emit('save-changes', checkedKind())
  else emit('rename', name.value)
}

/**
 * Intent: the confirmation's `Delete preset`: the deletion runs, its button busy and the way back
 * inert; a failure shows the error line, which leaves as the next try starts.
 */
// @spec-link [[rule_deleting_base_preset_leaves_custom]]
async function confirmDeletion(): Promise<void> {
  if (deleting.value) return
  deletionFailed.value = false
  deleting.value = true
  const outcome = await props.deletePreset()
  deleting.value = false
  deletionFailed.value = outcome === 'failed'
}

/** Intent: the way back: closes the sheet, except while a deletion runs. */
function cancel(): void {
  if (!deleting.value) emit('close')
}

/** Intent: a press on the backdrop itself, not inside the sheet, is the way back. */
function handleBackdropClick(event: MouseEvent): void {
  if (event.target === event.currentTarget) cancel()
}

/**
 * Intent: the name field's text, as `v-model` would put it: at every input, except while an input
 * method is composing, whose text lands once the composition ends.
 */
function handleNameText(event: Event): void {
  if (event.type === 'input' && (event as InputEvent).isComposing) return
  name.value = (event.target as HTMLInputElement).value
}

/** Intent: Enter in the name field does what the main action does when it is enabled. */
function handleNameEnter(event: KeyboardEvent): void {
  event.preventDefault()
  confirm()
}

/** Intent: check the option at `index` and move focus to it. */
function checkAndFocus(index: number): void {
  checked.value = index
  optionRefs.value[index]?.focus()
}

/** Intent: Up and Left check the previous option, Down and Right the next, wrapping. */
// @spec-link [[rule_saving_preset_asks_its_restriction]]
function handleChoiceKeydown(event: KeyboardEvent, index: number): void {
  const count = offered.length
  let step = 0
  if (event.key === 'ArrowDown' || event.key === 'ArrowRight') step = 1
  else if (event.key === 'ArrowUp' || event.key === 'ArrowLeft') step = -1
  if (step === 0) return
  event.preventDefault()
  checkAndFocus((index + step + count) % count)
}

/** Intent: the sheet's tab stops, in order: Close, the name field, the checked option, the actions. */
function tabStops(): HTMLElement[] {
  if (dialog.value === null) throw new Error('preset sheet: the dialog is not rendered')
  return Array.from(
    dialog.value.querySelectorAll<HTMLElement>(
      'button:not([disabled]):not([tabindex="-1"]), input:not([disabled])',
    ),
  )
}

/** Intent: Tab and Shift+Tab cycle through the sheet's tab stops, wrapping at both ends. */
function cycleFocus(direction: 1 | -1): void {
  const stops = tabStops()
  const at = stops.findIndex((stop) => stop === document.activeElement)
  const from = at === -1 ? (direction === 1 ? -1 : 0) : at
  const next = stops[(from + direction + stops.length) % stops.length]
  if (next === undefined) throw new Error('preset sheet: no tab stop (Close is missing)')
  next.focus()
}

/** Intent: while the sheet is open, Escape is the way back and Tab stays trapped in it. */
function handleKeydown(event: KeyboardEvent): void {
  if (event.key === 'Escape') {
    event.preventDefault()
    cancel()
  } else if (event.key === 'Tab') {
    event.preventDefault()
    cycleFocus(event.shiftKey ? -1 : 1)
  }
}

/**
 * Intent: on open (the confirmation handles its own keys and focus): listen for Escape and Tab,
 * and focus the name field with its text selected, or the checked option.
 */
onMounted(() => {
  if (opening.mode === 'delete') return
  document.addEventListener('keydown', handleKeydown)
  if (nameInput.value !== null) {
    nameInput.value.focus()
    nameInput.value.select()
  } else {
    optionRefs.value[checked.value]?.focus()
  }
})

/** Intent: stop listening for keys once the sheet leaves the page. */
onBeforeUnmount(() => {
  document.removeEventListener('keydown', handleKeydown)
})
</script>

<template>
  <ConfirmationSheet
    v-if="opening.mode === 'delete'"
    :title="title"
    :paragraphs="DELETE_PARAGRAPHS"
    confirm-label="Delete preset"
    cancel-label="Cancel"
    :destructive="true"
    :error="deletionFailed ? DELETE_FAILED_LINE : null"
    :busy="deleting"
    @confirm="confirmDeletion"
    @cancel="cancel"
  />
  <div v-else class="sheet-backdrop" @click="handleBackdropClick">
    <div ref="dialog" class="sheet" role="dialog" aria-modal="true" :aria-labelledby="titleId">
      <div class="sheet-header">
        <h2 :id="titleId" class="sheet-title">{{ title }}</h2>
        <button class="btn sheet-close" type="button" @click="cancel">Close</button>
      </div>
      <div class="sheet-body">
        <p v-if="opening.mode === 'save-changes'">{{ reason }}</p>
        <div v-if="asksName" class="field-group">
          <label class="field-label" :for="nameId">Name</label>
          <input
            :id="nameId"
            ref="nameInput"
            :value="name"
            class="text-input"
            type="text"
            maxlength="40"
            @input="handleNameText"
            @compositionend="handleNameText"
            @keydown.enter="handleNameEnter"
          />
          <!-- @spec-link [[rule_player_preset_names]] -->
          <div v-if="nameAlert !== null" class="inline-alert alert-notice name-alert" role="status">
            {{ nameAlert }}
          </div>
        </div>
        <div v-if="offered.length > 0" class="field-group">
          <span :id="keyAndModeId" class="field-label">Key and mode</span>
          <p v-if="opening.mode === 'save-as-new'" :id="noteId" class="field-note">
            {{ KEY_AND_MODE_NOTE }}
          </p>
          <!-- @spec-link [[rule_saving_preset_asks_its_restriction]] -->
          <div
            class="choice-list"
            role="radiogroup"
            :aria-labelledby="keyAndModeId"
            :aria-describedby="opening.mode === 'save-as-new' ? noteId : undefined"
          >
            <button
              v-for="(choice, index) in offered"
              :key="choice.kind"
              :ref="(element) => (optionRefs[index] = element as HTMLButtonElement | null)"
              class="choice-option"
              :class="{ 'is-selected': index === checked }"
              type="button"
              role="radio"
              :aria-checked="index === checked ? 'true' : 'false'"
              :tabindex="index === checked ? 0 : -1"
              @click="checked = index"
              @keydown="handleChoiceKeydown($event, index)"
            >
              {{ choiceLabel(choice) }}
            </button>
          </div>
        </div>
      </div>
      <div class="sheet-actions">
        <button
          class="btn btn-primary"
          type="button"
          :disabled="nameAlert !== null"
          @click="confirm"
        >
          {{ mainLabel[opening.mode] }}
        </button>
        <button class="btn" type="button" @click="cancel">Cancel</button>
      </div>
    </div>
  </div>
</template>
