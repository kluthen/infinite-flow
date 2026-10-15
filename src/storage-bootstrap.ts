/**
 * The load of the saved data, before the workspace is first drawn: it opens the storage port,
 * creates the visit's save policy and reads, through the port, the settings, my instrument, the
 * kept sessions' summaries and the remembered controller's record, under the start-up wait. The page shows only
 * its background until the load ends; the workspace is then drawn once, from what it gives.
 *
 * A read within the wait gives the saved settings, each checked on its own by the settings codec.
 * A read that fails, or has not finished when the wait ends, gives the defaults and stops saving
 * for the visit (`stopSavingUnreadable()`), so a failed read never overwrites what is kept; a read
 * that finishes later is ignored. A port that opens only after the wait gets its policy then, and
 * `stopSavingUnreadable()` at once; one that opened outdated keeps its policy `off-outdated`.
 *
 * My instrument's record is decoded by its own codec, within the wait; building my instrument is
 * loaded on demand, only when a record reads, so it stays out of the first load. A saved selection
 * of my instrument is kept only when my instrument itself loaded.
 *
 * The load outcome says which of the two the visit started from, which the saving state alone
 * cannot tell: `off-outdated` comes both with the saved data read and with the defaults on screen.
 */

import { readAudioMixDesign, type AudioMixDesign } from '@/audio/audio-mix'
import type { MyInstrument } from '@/domain/profile/my-instrument'
import { APP_VERSION } from '@/storage/app-version'
import { decodeMyInstrument } from '@/storage/records/my-instrument-record'
import { defaultSettings, type SavedSettings } from '@/storage/records/setting-defaults'
import { decodeSettings } from '@/storage/records/settings-record'
import { createSavePolicy, type SavePolicy } from '@/storage/save-policy'
import {
  browserStorage,
  openStoragePort,
  StorageError,
  type StoredEntry,
  type StoragePort,
} from '@/storage/storage-port'

/**
 * How long the first draw waits for the saved data before starting from the defaults, in
 * milliseconds: at most 2 s, well above the slowest read measured (`docs/storage.md`, M2).
 */
// @spec-link [[rule_first_phrase_waits_for_saved_settings]]
// @spec-link [[module_saved_data_loader]]
export const STARTUP_WAIT_MS = 2000

/**
 * Where the visit's settings came from: the saved data, read within the start-up wait (a first
 * visit with nothing saved included), or the defaults, because the read failed or outlasted it.
 */
// @spec-link [[rule_first_phrase_waits_for_saved_settings]]
// @spec-link [[module_saved_data_loader]]
export type LoadOutcome = 'saved-data-read' | 'started-from-defaults'

/** What the load gives the app before its first draw. */
// @spec-link [[rule_first_phrase_waits_for_saved_settings]]
// @spec-link [[rule_saved_settings_load_tolerantly]]
// @spec-link [[module_saved_data_loader]]
export interface SavedDataLoad {
  /** Whether the visit started from the saved data read or from the defaults. */
  readonly outcome: LoadOutcome
  /** Every setting the workspace is first drawn with: saved, or its default. */
  readonly settings: SavedSettings
  /** My instrument, when its record loaded; none otherwise, and in a visit started from defaults. */
  readonly myInstrument: MyInstrument | null
  /**
   * The kept sessions' summary records, each with its key, as stored and undecoded, in key order
   * (none when the visit started from defaults): their callers decode each value with the
   * kept-session codec and use the key to read that session's body or to delete it.
   */
  readonly keptSessionSummaries: readonly StoredEntry[]
  /** The remembered controller's records, as stored (none when the visit started from defaults). */
  readonly rememberedController: readonly unknown[]
  /**
   * The visit's save policy. Settled before the first draw when the port opened within the
   * start-up wait; otherwise once the port opens, saving already off.
   */
  readonly savePolicy: Promise<SavePolicy>
}

/** What the load runs on: the port's opening, the start-up wait and the mix design's tokens. */
// @spec-link [[rule_first_phrase_waits_for_saved_settings]]
export interface SavedDataLoadDependencies {
  /** Open the storage port; rejects only for a defect. */
  readonly openPort: () => Promise<StoragePort>
  /** Start the start-up wait; resolves when it ends. */
  readonly startupWait: () => Promise<void>
  /** The audio mix's design, for the mix's defaults and range. */
  readonly mixDesign: () => AudioMixDesign
}

/** The raw records the load reads. */
interface SavedRecords {
  readonly settings: readonly unknown[]
  readonly myInstrument: MyInstrument | null
  readonly keptSessionSummaries: readonly StoredEntry[]
  readonly rememberedController: readonly unknown[]
}

/** What a race against the start-up wait gives when the wait ended first. */
const WAIT_ENDED: unique symbol = Symbol('the start-up wait ended')

/** What the read gives when the port refused it. */
const READ_FAILED: unique symbol = Symbol('the read failed')

/**
 * Intent: read every record the load needs, in parallel, my instrument's decoded. A refusal of the
 * port is a failed read; any other error is a defect and rejects.
 */
async function readSavedRecords(port: StoragePort): Promise<SavedRecords | typeof READ_FAILED> {
  try {
    const [settings, myInstrument, keptSessionSummaries, rememberedController] = await Promise.all([
      port.readAll('settings'),
      port.readAll('instrument').then(decodeMyInstrument),
      port.readKeyed('sessionSummaries'),
      port.readAll('controller'),
    ])
    return { settings, myInstrument, keptSessionSummaries, rememberedController }
  } catch (error) {
    if (error instanceof StorageError) return READ_FAILED
    throw error
  }
}

/** Intent: a visit started from the defaults, read nothing, with the given policy. */
function fromDefaults(
  deps: SavedDataLoadDependencies,
  savePolicy: Promise<SavePolicy>,
): SavedDataLoad {
  return {
    outcome: 'started-from-defaults',
    settings: defaultSettings(deps.mixDesign().defaults),
    myInstrument: null,
    keptSessionSummaries: [],
    rememberedController: [],
    savePolicy,
  }
}

/** Intent: the policy of a port that opened after the start-up wait: saving off from its start. */
function lateOpenedPolicy(port: StoragePort): SavePolicy {
  const policy = createSavePolicy(port)
  policy.stopSavingUnreadable()
  return policy
}

/**
 * Intent: load the saved data under the start-up wait. Resolves with the saved settings when the
 * port opens and reads within the wait; with the defaults and saving off when the read fails or
 * the wait ends first. Rejects only for a defect, of the open or of the read.
 */
// @spec-link [[rule_first_phrase_waits_for_saved_settings]]
// @spec-link [[rule_saved_settings_load_tolerantly]]
// @spec-link [[rule_outdated_tab_reads_what_it_can]]
// @spec-link [[module_save_policy]]
// @spec-link [[module_saved_data_loader]]
// @spec-link [[entity_my_instrument_record]]
export async function loadSavedData(deps: SavedDataLoadDependencies): Promise<SavedDataLoad> {
  const waitEnded = deps.startupWait().then((): typeof WAIT_ENDED => WAIT_ENDED)
  const opening = deps.openPort()
  const opened = await Promise.race([opening, waitEnded])
  if (opened === WAIT_ENDED) return fromDefaults(deps, opening.then(lateOpenedPolicy))

  const policy = createSavePolicy(opened)
  const read = await Promise.race([readSavedRecords(opened), waitEnded])
  if (read === WAIT_ENDED || read === READ_FAILED) {
    policy.stopSavingUnreadable()
    return fromDefaults(deps, Promise.resolve(policy))
  }
  const mixDesign = deps.mixDesign()
  const myInstrumentLoaded = read.myInstrument !== null
  return {
    outcome: 'saved-data-read',
    settings: decodeSettings(read.settings, { mixDesign, myInstrumentLoaded }),
    myInstrument: read.myInstrument,
    keptSessionSummaries: read.keptSessionSummaries,
    rememberedController: read.rememberedController,
    savePolicy: Promise.resolve(policy),
  }
}

/** Intent: a start-up wait of `ms` on the browser's timer. */
function browserWait(ms: number): () => Promise<void> {
  return () => new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Intent: the load's dependencies in the app: the port over the browser's IndexedDB and storage
 * manager at the running app's version, the start-up wait on the browser's timer, and the mix
 * design from the loaded stylesheet's tokens.
 */
// @spec-link [[rule_first_phrase_waits_for_saved_settings]]
// @spec-link [[module_saved_data_loader]]
export function browserSavedDataLoad(): SavedDataLoadDependencies {
  return {
    openPort: () => openStoragePort({ ...browserStorage(), appVersion: APP_VERSION }),
    startupWait: browserWait(STARTUP_WAIT_MS),
    mixDesign: () => readAudioMixDesign(getComputedStyle(document.documentElement)),
  }
}
