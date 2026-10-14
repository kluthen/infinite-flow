/**
 * What the app saves the player's changes and holds a session's saves through, over the visit's
 * save policy. The loader hands the policy over as a promise; calls made before it settles wait,
 * in order, and every call reaches the policy in the order it was made. Once the policy has
 * loaded, calls reach it at once, so a hold made when a session starts takes effect right there.
 *
 * These are for the player's change handlers only, never for a watcher of control values: a
 * watcher would also save what Vary settings changed, what the end-of-session restore put back
 * and the rising tempo's reset, none of which the player chose.
 *
 * Pure: no browser API. The policy does the saving, holding and reporting.
 */

import type { GenerationControls } from '@/domain/controls/generation-controls'
import type { ProfileSelection } from '@/domain/controls/profile-selection'

import {
  encodeSettingRecord,
  SETTING_KEYS,
  type SettingKey,
  type SettingValue,
} from './records/settings-record'
import type { SavePolicy } from './save-policy'
import type { StorageChange } from './storage-port'

/**
 * The settings one change of the player's saves, by record key. Built by the player's change
 * handlers only, never by a watcher of control values.
 */
// @spec-link [[rule_settings_saved_on_change]]
// @spec-link [[rule_saved_setting_is_players_choice]]
// @spec-link [[module_save_policy]]
export type SettingChanges = { readonly [K in SettingKey]?: SettingValue<K> }

/** Save the settings one change of the player's changed, as one batch; nothing for none. */
// @spec-link [[rule_settings_saved_on_change]]
// @spec-link [[rule_saved_setting_is_players_choice]]
// @spec-link [[module_save_policy]]
export type SaveSettings = (changes: SettingChanges) => void

/** Hold every save while a session runs, and release them, in one transaction, when it ends. */
// @spec-link [[rule_no_save_during_session]]
// @spec-link [[module_save_policy]]
export interface SessionSaveHold {
  /** A session starts: hold every save from now on. */
  readonly hold: () => void
  /** The session ended: flush what was held. */
  readonly release: () => void
}

/** The visit's saves of the player's settings, and the hold of a session's saves. */
export interface VisitSaves extends SessionSaveHold {
  readonly saveSettings: SaveSettings
}

/** A call waiting for, or made to, the loaded policy. */
type PolicyCall = (policy: SavePolicy) => void

const SETTING_KEY_SET: ReadonlySet<string> = new Set(SETTING_KEYS)

/**
 * Intent: the batch of record writes for one change of the player's, one per setting. A key that
 * names no setting is a defect and throws.
 */
function settingWrites(changes: SettingChanges, appVersion: string): StorageChange[] {
  return Object.entries(changes).map(([key, value]) => {
    if (!SETTING_KEY_SET.has(key)) throw new Error(`settings saver: "${key}" is not a setting`)
    const settingKey = key as SettingKey
    const record = encodeSettingRecord(settingKey, value as SettingValue<SettingKey>, appVersion)
    return { kind: 'write', store: 'settings', key: settingKey, record }
  })
}

/**
 * Intent: the visit's saves over the policy the loader hands over. Every call reaches the policy
 * in the order made: queued until the policy loads and run in order then, at once after that. A
 * policy that fails to load is a defect and surfaces as a rejection, never swallowed. A save's
 * outcome is not awaited: the policy never rejects for a refusal, and reports it itself.
 */
// @spec-link [[rule_settings_saved_on_change]]
// @spec-link [[rule_saved_setting_is_players_choice]]
// @spec-link [[module_save_policy]]
export function createVisitSaves(policy: Promise<SavePolicy>, appVersion: string): VisitSaves {
  const pending: PolicyCall[] = []
  let loaded: SavePolicy | null = null
  let running = false

  /** Intent: run the waiting calls in order; a call made meanwhile joins the end of the line. */
  const runPending = (target: SavePolicy): void => {
    running = true
    try {
      for (let call = pending.shift(); call !== undefined; call = pending.shift()) call(target)
    } finally {
      running = false
    }
  }

  /** Intent: put a call in line, and run the line at once when the policy has loaded. */
  const submit = (call: PolicyCall): void => {
    pending.push(call)
    if (loaded !== null && !running) runPending(loaded)
  }

  void policy.then((resolved) => {
    loaded = resolved
    runPending(resolved)
  })

  return {
    saveSettings: (changes) => {
      const writes = settingWrites(changes, appVersion)
      if (writes.length === 0) return
      submit((target) => void target.save(writes))
    },
    hold: () => submit((target) => target.hold()),
    release: () => submit((target) => void target.release()),
  }
}

/** A player's control choices, as the generation session holds them. */
interface ControlChoices {
  readonly controls: GenerationControls
  readonly profileSelection: ProfileSelection
}

const CONTROL_PREFIX = 'controls.'

/**
 * Intent: the settings a player's control change changed: each control whose value differs, and
 * the profile selection when its profile or its customized flag differs. For the player's change
 * handlers only, never for a watcher of control values.
 */
// @spec-link [[rule_settings_saved_on_change]]
// @spec-link [[rule_saved_setting_is_players_choice]]
export function chosenControlChanges(
  before: ControlChoices,
  after: ControlChoices,
): SettingChanges {
  const changed: [SettingKey, unknown][] = []
  for (const key of SETTING_KEYS) {
    if (!key.startsWith(CONTROL_PREFIX)) continue
    const field = key.slice(CONTROL_PREFIX.length) as keyof GenerationControls
    if (before.controls[field] !== after.controls[field]) {
      changed.push([key, after.controls[field]])
    }
  }
  const { musicalProfile, isCustom } = after.profileSelection
  if (
    before.profileSelection.musicalProfile !== musicalProfile ||
    before.profileSelection.isCustom !== isCustom
  ) {
    changed.push(['profileSelection', { musicalProfile, isCustom }])
  }
  return Object.fromEntries(changed) as SettingChanges
}
