/**
 * The preset sheet's words (`screens/preset-sheet/`), on the sheet's lazy side: each mode's
 * title, the Key and mode options, the reason Save changes asks, the refused name's reason and the
 * delete confirmation's lines. A preset's name is shown as the player wrote it, in typographic
 * quotes; keys and modes in the controls' own labels. Pure: nothing here renders.
 */
import { RESTRICTION_LABELS } from '@/components/controls/preset-bar-model'
import {
  restrictionInWords,
  type KeyAndModeRestriction,
} from '@/domain/presets/key-and-mode-restriction'
import type { PresetNameCheck } from '@/domain/presets/preset-names'
import type { SaveRestrictionChoice } from '@/domain/presets/preset-save-choices'

/** The delete confirmation's two paragraphs, in order. */
export const DELETE_PARAGRAPHS: readonly string[] = [
  'Your settings stay as they are.',
  "This can't be undone.",
]

/** The line a failed deletion shows under the paragraphs. */
export const DELETE_FAILED_LINE = "That couldn't be deleted. Try again."

/** The note under Save as new's Key and mode label. */
export const KEY_AND_MODE_NOTE =
  'Which keys and modes this preset is meant for. Choosing it moves you inside them; nothing is ever blocked.'

/** Intent: a name in typographic quotes, as the player wrote it. */
function quoted(name: string): string {
  return `“${name}”`
}

/** Intent: a restriction in words, the sheet's way: "only {key} {mode}" for one pair. */
function inWords(restriction: KeyAndModeRestriction): string {
  return restrictionInWords(restriction, RESTRICTION_LABELS)
}

/** Intent: the words with their first letter capitalised, for an option's label. */
function capitalised(words: string): string {
  return `${words.charAt(0).toUpperCase()}${words.slice(1)}`
}

/** Intent: each mode's title, naming the preset acted on (none for Save as new). */
// @spec-link [[rule_preset_management_actions]]
export function presetSheetTitle(
  mode: 'save-as-new' | 'save-changes' | 'rename' | 'delete',
  name: string,
): string {
  if (mode === 'save-as-new') return 'Save as a new preset'
  if (mode === 'save-changes') return `Save changes to ${quoted(name)}`
  if (mode === 'rename') return `Rename ${quoted(name)}`
  return `Delete the preset ${quoted(name)}?`
}

/**
 * Intent: a Key and mode option's label, one line of plain words: "As now: {restriction in
 * words}", "Only {key} {mode}" or "Any key and mode".
 */
// @spec-link [[rule_saving_preset_asks_its_restriction]]
export function choiceLabel(choice: SaveRestrictionChoice): string {
  const words = inWords(choice.restriction)
  return choice.kind === 'asNow' ? `As now: ${words}` : capitalised(words)
}

/**
 * Intent: why Save changes asks: the current key and mode, which `current` holds alone, lie
 * outside what the preset named `name` is meant for, `restriction`.
 */
// @spec-link [[rule_save_changes_restriction]]
export function saveChangesReason(
  name: string,
  current: KeyAndModeRestriction,
  restriction: KeyAndModeRestriction,
): string {
  const keyAndMode = restrictionInWords(current, RESTRICTION_LABELS, { only: false })
  return `Your key and mode, ${keyAndMode}, are outside what ${quoted(name)} is meant for: ${inWords(restriction)}. Choose what it is meant for from now on.`
}

/**
 * Intent: the refused name's one reason, the first that applies; null for an accepted name. A
 * name too long cannot be typed (the field stops at 40 characters), so meeting one is a defect.
 */
// @spec-link [[rule_player_preset_names]]
export function nameAlertText(check: PresetNameCheck): string | null {
  if (check.ok) return null
  if (check.reason === 'empty') return 'Give it a name.'
  if (check.reason === 'reserved') return '“Custom” is used by the app. Choose another name.'
  if (check.reason === 'taken')
    return `There's already a preset called ${quoted(check.existingName)}.`
  throw new Error('preset sheet: a name over 40 characters reached the check')
}
