/**
 * What the app saves the player's changes, my instrument, the player presets and the remembered
 * controller, and holds a session's saves, through, over the visit's save policy. The loader hands the policy over as a promise; calls made before it settles wait,
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
import { FIGURE_IDS, type FigureLevels } from '@/domain/figures/figure-levels'
import type { PresetSelection } from '@/domain/presets/preset-selection'

import { createMyInstrumentSaves, type MyInstrumentSaves } from './my-instrument-saves'
import { createPresetSaves, type PresetSaves } from './preset-saves'
import {
  CONTROLLER_RECORD_KEY,
  encodeControllerRecord,
  type RememberedControllerDevice,
} from './records/controller-record'
import {
  encodeSettingRecord,
  SETTING_KEYS,
  type SettingKey,
  type SettingValue,
} from './records/settings-record'
import type {
  KeptChangeOutcome,
  KeptChanges,
  KeptRead,
  KeptReadOutcome,
  KeptRefusal,
  PageGoingAway,
  SavePolicy,
  SessionChanges,
  SessionSaveOutcome,
} from './save-policy'
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

export type { MyInstrumentSaves } from './my-instrument-saves'
export type { PresetSaves } from './preset-saves'

/**
 * Hold every save while a session runs, and release them, in one transaction, when it ends; then,
 * at an end with a review, save the session itself.
 */
// @spec-link [[rule_no_save_during_session]]
// @spec-link [[module_save_policy]]
// @spec-link [[module_saved_data_loader]]
// @spec-link [[module_kept_session_save]]
export interface SessionSaveHold {
  /** A session starts: hold every save from now on. */
  readonly hold: () => void
  /** The session ended: flush what was held. */
  readonly release: () => void
  /**
   * Save the session that ended, after the release, unless the page goes away first (checked
   * before each of the save's transactions); resolves what became of that save.
   */
  readonly saveSession: (
    changes: SessionChanges,
    pageGoingAway: PageGoingAway,
  ) => Promise<SessionSaveOutcome>
}

/**
 * The changes to kept sessions after their own save, and the reads made at such a change, in the
 * line of the session saves; each resolves what became of it.
 */
// @spec-link [[module_kept_session_changes]]
export interface KeptSessionChanges {
  /** Read at the change, then apply the batch built from it (SavePolicy.changeKept). */
  readonly changeKept: (changes: KeptChanges, refusal: KeptRefusal) => Promise<KeptChangeOutcome>
  /** Read the kept sessions at a change (SavePolicy.readKept). */
  readonly readKept: <T>(read: KeptRead<T>, refusal: KeptRefusal) => Promise<KeptReadOutcome<T>>
}

/**
 * The saves of the remembered controller: its one record written when a different device counts as
 * connected, deleted by the player's Disconnect. Skipped by the policy in a visit that saves nothing.
 */
// @spec-link [[entity_remembered_controller_record]]
// @spec-link [[rule_last_controller_remembered]]
// @spec-link [[rule_disconnect_forgets_controller]]
export interface ControllerSaves {
  /** Write the remembered controller's record for `device`, replacing any earlier one. */
  readonly rememberController: (device: RememberedControllerDevice) => void
  /** Delete the remembered controller's record. */
  readonly forgetController: () => void
}

/**
 * The visit's saves of the player's settings, the hold of a session's saves, the changes to kept
 * sessions after their save, and the saves of my instrument, of the player presets and of the
 * remembered controller.
 */
export interface VisitSaves
  extends SessionSaveHold, KeptSessionChanges, MyInstrumentSaves, PresetSaves, ControllerSaves {
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
// @spec-link [[module_saved_data_loader]]
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

  /** Intent: call the policy in line, resolving what its call resolves (a defect rejects). */
  const resolved = <T>(call: (target: SavePolicy) => Promise<T>): Promise<T> =>
    new Promise((resolve, reject) => {
      submit((target) => {
        call(target).then(resolve, reject)
      })
    })

  const changeKept: KeptSessionChanges['changeKept'] = (changes, refusal) =>
    resolved((target) => target.changeKept(changes, refusal))

  return {
    saveSettings: (changes) => {
      const writes = settingWrites(changes, appVersion)
      if (writes.length === 0) return
      submit((target) => void target.save(writes))
    },
    hold: () => submit((target) => target.hold()),
    release: () => submit((target) => void target.release()),
    saveSession: (changes, pageGoingAway) =>
      resolved((target) => target.saveSession(changes, pageGoingAway)),
    changeKept,
    readKept: (read, refusal) => resolved((target) => target.readKept(read, refusal)),
    ...createMyInstrumentSaves(submit, changeKept, appVersion),
    ...createPresetSaves(submit, appVersion),
    // @spec-link [[rule_last_controller_remembered]]
    rememberController: (device) => {
      const record = encodeControllerRecord(device, appVersion)
      const change: StorageChange = {
        kind: 'write',
        store: 'controller',
        key: CONTROLLER_RECORD_KEY,
        record,
      }
      submit((target) => void target.save([change]))
    },
    // @spec-link [[rule_disconnect_forgets_controller]]
    forgetController: () => {
      const change: StorageChange = {
        kind: 'delete',
        store: 'controller',
        key: CONTROLLER_RECORD_KEY,
      }
      submit((target) => void target.save([change]))
    },
  }
}

/** A player's control choices, as the generation session holds them. */
interface ControlChoices {
  readonly controls: GenerationControls
  readonly figureLevels: FigureLevels
  readonly selection: PresetSelection
}

const CONTROL_PREFIX = 'controls.'

/** Intent: whether two preset selections are the same: the same kind naming the same preset. */
// @spec-link [[rule_settings_saved_on_change]]
export function sameSelection(left: PresetSelection, right: PresetSelection): boolean {
  if (left.kind === 'preset') return right.kind === 'preset' && right.presetId === left.presetId
  return right.kind === 'custom' && right.baseId === left.baseId
}

/**
 * Intent: the settings a player's control change changed: each control whose value differs, each
 * figure level that differs, and the preset selection when it differs. For the player's change
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
  for (const figure of FIGURE_IDS) {
    if (before.figureLevels[figure] !== after.figureLevels[figure]) {
      changed.push([`figureLevels.${figure}`, after.figureLevels[figure]])
    }
  }
  if (!sameSelection(before.selection, after.selection)) {
    changed.push(['presetSelection', after.selection])
  }
  return Object.fromEntries(changed) as SettingChanges
}
