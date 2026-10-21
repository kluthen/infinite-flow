/**
 * The words of the Your data sheet (ui_ux screens/your-data): its Overview's lines, the notices of
 * a visit that saves nothing, the space and protection lines, and its five confirmations, the
 * preset's in the preset sheet's words (./preset-sheet-copy.ts). Pure; loaded on demand with the
 * sheet (./YourDataSheet.vue), never by the first draw.
 */
import { findBuiltInInstrumentProfile } from '@/domain/profile/instrument-profiles'
import type { MyInstrument } from '@/domain/profile/my-instrument'
import { DELETE_PARAGRAPHS, presetSheetTitle } from './preset-sheet-copy'

/** Which form the sheet takes: the Overview, or one of a visit that saves nothing. */
// @spec-link [[req_your_data]]
export type YourDataForm = 'overview' | 'unreadable' | 'outdated' | 'outdated-defaults'

/** The five confirmations the sheet opens in place of its Overview. */
// @spec-link [[req_your_data]]
export type YourDataConfirmationKind =
  'every-session' | 'all-played-notes' | 'kept-played-notes' | 'preset' | 'everything'

/** The space line's reading: being measured, measured in bytes, or not measurable. */
export type SpaceReading =
  | { readonly kind: 'measuring' }
  | { readonly kind: 'measured'; readonly bytes: number }
  | { readonly kind: 'unmeasured' }

/** The protection line's reading: being checked, or what the browser said. */
export type ProtectionReading = 'checking' | 'protected' | 'not-protected'

/** The words of one confirmation: its question, what goes, and its two actions. */
export interface YourDataConfirmationCopy {
  readonly title: string
  readonly paragraphs: readonly string[]
  readonly confirmLabel: string
  readonly cancelLabel: string
}

export const INTRO =
  'Everything here is kept on this device, in this browser only, for anyone who opens the app in it. Nothing is ever sent anywhere.'
export const SETTINGS_LINE =
  "The phrase controls, the preset, the instrument choice, the theme, the audio mix, the During a session options and the review's choices. They come back as you left them."
export const SETTINGS_HINT = 'Delete everything returns them to their defaults.'
export const SESSIONS_HINT =
  'Your most recent session is kept until the next one is saved. Pinned sessions stay until you unpin or delete them.'
export const PLAYED_NOTES_HINT =
  "When this is on, the notes you play are kept with each session. When it's off, they're shown in the review of the session that just ended, then forgotten."
export const CONTROLLER_HINT = 'To forget it, choose Disconnect in the controller connection.'
export const DELETION_FAILED = "That couldn't be deleted. Try again."
export const CANNOT_BE_UNDONE = "This can't be undone."

/** The notice under the intro of each form that saves nothing. */
const SAVING_OFF_NOTICES: { readonly [F in Exclude<YourDataForm, 'overview'>]: string } = {
  unreadable:
    "Your saved data couldn't be read in this visit, so it isn't listed here. Reload the page to try again, or delete everything to start afresh.",
  outdated:
    "A newer version of the app saved this data, so it isn't listed here, and nothing can be deleted until the page is reloaded. Reload the page to see it.",
  'outdated-defaults':
    "Your saved data couldn't be read in this visit, so it isn't listed here. A newer version of the app has also saved data on this device, so nothing can be deleted until the page is reloaded. Reload the page to use the newer version.",
}

/** Intent: the notice of a form that saves nothing; none for the Overview. */
// @spec-link [[rule_outdated_tab_stops_saving]]
// @spec-link [[rule_failed_read_offers_only_delete_everything]]
export function savingOffNotice(form: YourDataForm): string | null {
  return form === 'overview' ? null : SAVING_OFF_NOTICES[form]
}

/** Intent: `count` with its noun, singular for one ("1 session", "3 favorite phrases"). */
function counted(count: number, singular: string, plural: string): string {
  return `${count} ${count === 1 ? singular : plural}`
}

/** Intent: the My instrument section's two lines, for my instrument or none. */
// @spec-link [[req_your_data]]
export function myInstrumentLines(instrument: MyInstrument | null): readonly [string, string] {
  if (instrument === null) return ['None.', 'Make one with Create my instrument, in the controls.']
  const template = findBuiltInInstrumentProfile(instrument.template)?.displayName
  if (template === undefined)
    throw new Error(`your data: my instrument's template "${instrument.template}" is no built-in`)
  return [
    `${instrument.name}, made from the ${template}.`,
    'Change or delete it with Edit my instrument, in the controls.',
  ]
}

/**
 * Intent: the Presets section's two lines, from the player presets the preset box lists: how many,
 * the singular for one, or none, with how to delete one or save one.
 */
// @spec-link [[req_your_data]]
export function presetsLines(count: number): readonly [string, string] {
  if (count === 0) return ['None.', 'Save one with Save as new preset, in the controls.']
  return [
    `${counted(count, 'preset', 'presets')} of your own.`,
    'Delete one here, or with Delete preset in the controls. Delete everything removes them all.',
  ]
}

/** Intent: the accessible name of a Presets row's `Delete`, naming its preset. */
// @spec-link [[req_your_data]]
export function presetDeleteLabel(name: string): string {
  return `Delete preset ${name}`
}

/** Intent: the words of a preset's confirmation, those of the preset sheet's Delete. */
// @spec-link [[req_your_data]]
// @spec-link [[rule_deleting_base_preset_leaves_custom]]
export function presetConfirmationCopy(name: string): YourDataConfirmationCopy {
  return {
    title: presetSheetTitle('delete', name),
    paragraphs: DELETE_PARAGRAPHS,
    confirmLabel: 'Delete preset',
    cancelLabel: 'Cancel',
  }
}

/** Intent: the Controller section's line, for the remembered controller's name or none. */
// @spec-link [[rule_last_controller_remembered]]
export function controllerLine(deviceName: string | null): string {
  if (deviceName === null) return 'None remembered.'
  return `${deviceName}. It reconnects by itself when it's plugged in.`
}

/** Intent: the Sessions section's line, from the sessions the list shows. */
// @spec-link [[req_your_data]]
// @spec-link [[req_kept_session_list]]
export function sessionsLine(count: number, pinned: number, favorites: number): string {
  if (count === 0) return 'No sessions kept yet.'
  const pins = pinned === 0 ? 'none pinned' : `${pinned} pinned`
  const marks =
    favorites === 0
      ? 'no favorite phrases'
      : counted(favorites, 'favorite phrase', 'favorite phrases')
  return `${counted(count, 'session', 'sessions')} kept: ${pins}, ${marks}.`
}

/** Intent: the Played notes section's line, from the sessions whose played notes are kept. */
// @spec-link [[rule_kept_played_notes_deletable]]
export function playedNotesLine(sessionCount: number): string {
  if (sessionCount === 0) return 'None kept.'
  return `Kept with ${counted(sessionCount, 'session', 'sessions')}.`
}

const KIB = 1024
const MIB = 1024 * KIB

/**
 * Intent: the Space used line: "Less than 1 KB", whole kilobytes, then megabytes with one decimal
 * under 10 MB and whole ones from 10 MB (binary units, 1 KB = 1024 bytes).
 */
// @spec-link [[req_your_data]]
export function spaceLine(space: SpaceReading): string {
  if (space.kind === 'measuring') return 'Measuring…'
  if (space.kind === 'unmeasured') return "Couldn't be measured."
  const { bytes } = space
  if (bytes < KIB) return 'Less than 1 KB'
  const kilobytes = Math.round(bytes / KIB)
  if (kilobytes < KIB) return `About ${kilobytes} KB`
  const megabytes = bytes / MIB
  if (Number(megabytes.toFixed(1)) < 10) return `About ${megabytes.toFixed(1)} MB`
  return `About ${Math.round(megabytes)} MB`
}

/** Intent: the Protection line: being checked, protected, or not (also when the browser can't say). */
// @spec-link [[rule_persistent_storage_requested]]
export function protectionLine(protection: ProtectionReading): string {
  if (protection === 'checking') return 'Checking…'
  if (protection === 'protected')
    return "Protected. The browser won't clear this data to free up space."
  return 'Not protected. The browser may clear this data if the device runs short of space. Export what you want to be sure to keep.'
}

/**
 * Intent: the words of a confirmation but a preset's, `count` being the sessions it concerns (kept
 * sessions, or sessions whose played notes are kept; unused for Delete everything).
 */
// @spec-link [[req_your_data]]
// @spec-link [[rule_delete_everything]]
// @spec-link [[rule_kept_played_notes_deletable]]
export function confirmationCopy(
  kind: Exclude<YourDataConfirmationKind, 'preset'>,
  count: number,
): YourDataConfirmationCopy {
  if (kind === 'every-session') {
    const goes =
      count === 1
        ? 'This deletes the one kept session, with its favorite phrases, comment and played notes.'
        : `This deletes all ${count} kept sessions, pinned ones included, with their favorite phrases, comments and played notes.`
    return {
      title: 'Delete every session?',
      paragraphs: [
        `${goes} Your settings, your instrument and the remembered controller stay.`,
        CANNOT_BE_UNDONE,
      ],
      confirmLabel: 'Delete every session',
      cancelLabel: 'Cancel',
    }
  }
  const sessions = counted(count, 'session', 'sessions')
  if (kind === 'all-played-notes')
    return {
      title: 'Delete all played notes?',
      paragraphs: [
        `This deletes the played notes kept with ${sessions}. The sessions stay, with their favorite phrases and comments.`,
        CANNOT_BE_UNDONE,
      ],
      confirmLabel: 'Delete all played notes',
      cancelLabel: 'Cancel',
    }
  if (kind === 'kept-played-notes')
    return {
      title: 'Delete the played notes already kept?',
      paragraphs: [
        `Your played notes won't be kept from now on. The ones already kept with ${sessions} can be deleted too; the sessions stay.`,
        CANNOT_BE_UNDONE,
      ],
      confirmLabel: 'Delete them',
      cancelLabel: 'Keep them',
    }
  return {
    title: 'Delete everything?',
    paragraphs: [
      'This deletes everything the app keeps on this device: your settings, your presets, your instrument, the remembered controller and every kept session, with its favorite phrases, comments and played notes. The page then reloads and starts as on a first visit.',
      CANNOT_BE_UNDONE,
    ],
    confirmLabel: 'Delete everything',
    cancelLabel: 'Cancel',
  }
}
