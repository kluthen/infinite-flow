/**
 * The save policy: the one place that decides when a write reaches the storage port. Saving is on
 * for the visit, or off for the rest of it, either because a newer version of the app has written
 * data (`off-outdated`, final) or because the saved data could not be read at start-up
 * (`off-unreadable`); every write and delete is skipped while off. During a session the saves are
 * held: queued, coalesced to the latest change per record, and flushed in one transaction when the
 * session ends. A refused save never rejects: it resolves as failed and is reported, once per run
 * of refusals, to the one failure listener. The requests beyond saving (persistent storage, Your
 * data, Delete everything) are built in save-policy-requests.ts and defer to this policy's state.
 *
 * The policy is pure: the port is injected, and it keeps no clock.
 */

import type { RecordVersions } from './record-envelope'
import { createVisitRequests, type VisitRequests } from './save-policy-requests'
import {
  StorageError,
  type StorageChange,
  type StorageErrorKind,
  type StoragePort,
  type StoragePortStatus,
  type StoreName,
} from './storage-port'

/**
 * Whether the visit saves: `on`, or off for the rest of the visit because a newer version of the
 * app has written data (`off-outdated`, final) or the saved data could not be read at start-up
 * (`off-unreadable`, which a newer version's data still turns into `off-outdated`).
 */
// @spec-link [[rule_outdated_tab_stops_saving]]
// @spec-link [[rule_first_phrase_waits_for_saved_settings]]
export type SavingState = 'on' | 'off-outdated' | 'off-unreadable'

/**
 * What became of a write, delete or batch: saved by the port, held until the session ends,
 * skipped because saving is off (a refusal as outdated included), or failed and reported.
 */
// @spec-link [[rule_failed_save_never_disturbs_session]]
// @spec-link [[rule_no_save_during_session]]
export type SaveOutcome = 'saved' | 'held' | 'skipped' | 'failed'

/** Why a save failed, as reported: a lack of space, or any other storage failure. */
// @spec-link [[rule_failed_save_never_disturbs_session]]
export type SaveFailureKind = Exclude<StorageErrorKind, 'outdated'>

export type { ProtectionOutcome, VisitRequests } from './save-policy-requests'

/** The save policy the app writes through, with its requests beyond saving. */
// @spec-link [[rule_no_save_during_session]]
// @spec-link [[rule_failed_save_never_disturbs_session]]
export interface SavePolicy extends VisitRequests {
  /** Whether the visit saves. */
  state(): SavingState
  /** Be told of each change of the saving state; returns an unsubscribe. */
  onStateChange(listener: (state: SavingState) => void): () => void
  /** Stop saving for the visit: the start-up read failed or was too slow. Outdated stays outdated. */
  stopSavingUnreadable(): void
  /** Store a record under `key`: saved at once, held during a session, skipped while off. */
  write(store: StoreName, key: string, record: RecordVersions): Promise<SaveOutcome>
  /** Remove the record under `key`, like `write`. */
  delete(store: StoreName, key: string): Promise<SaveOutcome>
  /** Apply a batch of changes in one transaction, like `write`; an empty batch is a defect. */
  save(changes: readonly StorageChange[]): Promise<SaveOutcome>
  /** Hold every save from now on: a session starts. Holding twice is a defect. */
  hold(): void
  /**
   * Flush what was held in one transaction: the session ended. Resolves `saved` when nothing was
   * held, `skipped` when saving turned off meanwhile. Releasing without a hold is a defect, and so
   * is a defective change held, which surfaces here as a plain Error.
   */
  release(): Promise<SaveOutcome>
  /**
   * Be told the kind of each failed save; a run of refusals with no success between them is told
   * once, and a refusal made with no listener attached still counts toward its run. One listener
   * at a time: a second is a defect. Returns an unsubscribe.
   */
  onFailure(listener: (kind: SaveFailureKind) => void): () => void
}

/** Intent: the saving state a visit starts in, from the state the port opened in. */
function initialState(status: StoragePortStatus): SavingState {
  if (status === 'ready') return 'on'
  return status === 'outdated' ? 'off-outdated' : 'off-unreadable'
}

/** Intent: the key a held change is coalesced under: its store and its record's key. */
function recordKey(change: StorageChange): string {
  return `${change.store}\u0000${change.key}`
}

/**
 * Intent: the part of the policy that holds the saves of a session and lets the protection
 * request wait for its end.
 */
function createHold() {
  const queue = new Map<string, StorageChange>()
  const waiting: (() => void)[] = []
  let held = false

  return {
    queue,
    /** Intent: whether a session holds the saves. */
    isHeld: () => held,
    /** Intent: start holding; holding twice is a defect. */
    start: () => {
      if (held) throw new Error('save policy: hold() while already holding')
      held = true
    },
    /** Intent: stop holding and hand back what was held, latest change per record. */
    stop: (): StorageChange[] => {
      if (!held) throw new Error('save policy: release() without hold()')
      held = false
      const changes = [...queue.values()]
      queue.clear()
      return changes
    },
    /** Intent: queue a change in place of any earlier one to the same record. */
    keep: (change: StorageChange) => {
      const key = recordKey(change)
      queue.delete(key)
      queue.set(key, change)
    },
    /** Intent: let what waits for the session's end go on. */
    wakeWaiting: () => {
      for (const wake of waiting.splice(0)) wake()
    },
    /** Intent: resolve once no session holds the saves. */
    whenNotHeld: async () => {
      while (held) await new Promise<void>((resolve) => waiting.push(resolve))
    },
  }
}

/**
 * Intent: the save policy over `port`, starting in the saving state the port opened in and
 * turning off-outdated when the port reports a newer version of the app later in the visit.
 */
// @spec-link [[rule_no_save_during_session]]
// @spec-link [[rule_failed_save_never_disturbs_session]]
// @spec-link [[rule_outdated_tab_stops_saving]]
export function createSavePolicy(port: StoragePort): SavePolicy {
  const hold = createHold()
  const stateListeners = new Set<(state: SavingState) => void>()
  let saving = initialState(port.status())
  let failureListener: ((kind: SaveFailureKind) => void) | null = null
  let inFailureRun = false

  /** Intent: turn saving off for the visit, dropping what is held; outdated is final. */
  const turnOff = (next: Exclude<SavingState, 'on'>): void => {
    if (saving === next || saving === 'off-outdated') return
    saving = next
    hold.queue.clear()
    for (const listener of [...stateListeners]) listener(next)
  }
  port.onOutdated(() => turnOff('off-outdated'))

  /**
   * Intent: what a refusal of the port becomes: skipped and saving off for an outdated one,
   * failed and reported for the others, unless a refusal of the same run was reported already.
   */
  const refused = (kind: StorageErrorKind): SaveOutcome => {
    if (kind === 'outdated') {
      turnOff('off-outdated')
      return 'skipped'
    }
    if (!inFailureRun) {
      inFailureRun = true
      failureListener?.(kind)
    }
    return 'failed'
  }

  /** Intent: run a change of the port, never rejecting for a refusal; a defect goes through. */
  const attempt = async (change: () => Promise<void>): Promise<SaveOutcome> => {
    try {
      await change()
    } catch (error) {
      if (error instanceof StorageError) return refused(error.kind)
      throw error
    }
    inFailureRun = false
    return 'saved'
  }

  /** Intent: skip changes while off, hold them during a session, apply them otherwise. */
  const submit = async (
    changes: readonly StorageChange[],
    apply: () => Promise<void>,
  ): Promise<SaveOutcome> => {
    if (saving !== 'on') return 'skipped'
    if (!hold.isHeld()) return attempt(apply)
    for (const change of changes) hold.keep(change)
    return 'held'
  }

  const requests = createVisitRequests(port, {
    isOn: () => saving === 'on',
    isOutdated: () => saving === 'off-outdated',
    isHeld: hold.isHeld,
    whenNotHeld: hold.whenNotHeld,
  })

  return {
    ...requests,
    state: () => saving,
    onStateChange: (listener) => {
      stateListeners.add(listener)
      return () => stateListeners.delete(listener)
    },
    stopSavingUnreadable: () => turnOff('off-unreadable'),
    write: (store, key, record) =>
      submit([{ kind: 'write', store, key, record }], () => port.write(store, key, record)),
    delete: (store, key) => submit([{ kind: 'delete', store, key }], () => port.delete(store, key)),
    save: async (changes) => {
      if (changes.length === 0) throw new Error('save policy: a batch must hold a change')
      return submit(changes, () => port.apply(changes))
    },
    hold: () => hold.start(),
    // @spec-link [[rule_no_save_during_session]]
    // @spec-link [[rule_settings_saved_on_change]]
    release: async () => {
      const changes = hold.stop()
      try {
        if (saving !== 'on') return 'skipped'
        if (changes.length === 0) return 'saved'
        return await attempt(() => port.apply(changes))
      } finally {
        hold.wakeWaiting()
      }
    },
    onFailure: (listener) => {
      if (failureListener !== null) throw new Error('save policy: a failure listener is set')
      failureListener = listener
      return () => {
        if (failureListener === listener) failureListener = null
      }
    },
  }
}
