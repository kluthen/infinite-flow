/**
 * The save policy: the one place that decides when a write reaches the storage port. Saving is on
 * for the visit, or off for the rest of it, either because a newer version of the app has written
 * data (`off-outdated`, final) or because the saved data could not be read at start-up
 * (`off-unreadable`); every write and delete is skipped while off. During a session the saves are
 * held: queued, coalesced to the latest change per record, and flushed in one transaction when the
 * session ends. A refused save never rejects: it resolves as failed and is reported to the one
 * failure listener at the first refusal of a run of refusals, and again each time the kind differs
 * from the last one reported in the run. The session's own save, at the end of a session with a
 * review, is a call of its own that resolves its outcome to its caller: it reads the kept
 * sessions' summaries at the save and applies the caller's changes in one transaction, after the
 * held settings are flushed; only its refusal for lack of space is also told to the failure
 * listener. A change to a kept session after its own save, and a read of the kept sessions at such
 * a change, run in the same line as the session saves (built in save-policy-kept-changes.ts). The
 * requests beyond saving (persistent storage, Your data, Delete everything) are built in
 * save-policy-requests.ts and defer to this policy's state.
 *
 * The policy is pure: the port is injected, and it keeps no clock.
 */

import type { RecordVersions } from './record-envelope'
import {
  createKeptChangeRunner,
  type KeptChangeOutcome,
  type KeptChanges,
  type KeptRead,
  type KeptReadOutcome,
  type KeptRefusal,
} from './save-policy-kept-changes'
import { createVisitRequests, type VisitRequests } from './save-policy-requests'
import {
  StorageError,
  type StorageChange,
  type StorageErrorKind,
  type StoragePort,
  type StoragePortStatus,
  type StoredEntry,
  type StoreName,
} from './storage-port'

/**
 * Whether the visit saves: `on`, or off for the rest of the visit because a newer version of the
 * app has written data (`off-outdated`, final) or the saved data could not be read at start-up
 * (`off-unreadable`, which a newer version's data still turns into `off-outdated`).
 */
// @spec-link [[rule_outdated_tab_stops_saving]]
// @spec-link [[rule_first_phrase_waits_for_saved_settings]]
// @spec-link [[module_save_policy]]
export type SavingState = 'on' | 'off-outdated' | 'off-unreadable'

/**
 * What became of a write, delete or batch: saved by the port, held until the session ends,
 * skipped because saving is off (a refusal as outdated included), or failed and reported.
 */
// @spec-link [[rule_failed_save_never_disturbs_session]]
// @spec-link [[rule_no_save_during_session]]
// @spec-link [[module_save_policy]]
export type SaveOutcome = 'saved' | 'held' | 'skipped' | 'failed'

/** Why a save failed, as reported: a lack of space, or any other storage failure. */
// @spec-link [[rule_failed_save_never_disturbs_session]]
export type SaveFailureKind = Exclude<StorageErrorKind, 'outdated'>

export type { ProtectionOutcome, VisitRequests } from './save-policy-requests'
export type {
  KeptChangeOutcome,
  KeptChanges,
  KeptRead,
  KeptReadOutcome,
  KeptRecordsReader,
  KeptRefusal,
  KeptRefusalKind,
} from './save-policy-kept-changes'

/**
 * What became of the session's own save: saved; refused by the port, with the refusal's kind; or
 * not attempted because saving is off for the visit (a refusal as outdated, which turns it off,
 * included). Resolved to the caller, apart from the failure listener.
 */
// @spec-link [[module_kept_session_save]]
// @spec-link [[rule_failed_save_never_disturbs_session]]
// @spec-link [[module_save_policy]]
export type SessionSaveOutcome =
  | { readonly status: 'saved' }
  | { readonly status: 'refused'; readonly kind: SaveFailureKind }
  | { readonly status: 'saving-off' }

/**
 * The changes of the session's own save, from the kept sessions' summaries read at the save, each
 * with its key (none when that read was refused): the new session's records, and the deletions.
 */
// @spec-link [[module_kept_session_save]]
export type SessionChanges = (keptSummaries: readonly StoredEntry[]) => readonly StorageChange[]

/** The save policy the app writes through, with its requests beyond saving. */
// @spec-link [[rule_no_save_during_session]]
// @spec-link [[rule_failed_save_never_disturbs_session]]
// @spec-link [[module_save_policy]]
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
   * The session's own save, at a session's end with a review. Once no session holds the saves and
   * the held ones are flushed, it reads the kept sessions' summaries with their keys (a refused
   * read gives none, so nothing is deleted), then applies `changes` of them in one transaction.
   * Session saves run one after the other. Never rejects for a refusal: a refusal for lack of
   * space is also told to the failure listener, any other is not. While saving is off it reads
   * and applies nothing. Changes holding no change are a defect.
   */
  saveSession(changes: SessionChanges): Promise<SessionSaveOutcome>
  /**
   * A change to kept sessions after their own save, in the same line as the session saves (so a
   * change made while a session's own save runs applies after it): once no session holds the
   * saves and the held ones are flushed, `changes` reads what it rewrites, then its batch is
   * applied in one transaction; an empty batch writes nothing. A session started while it read
   * makes it read again after that session. Never rejects for a refusal, of its read or its
   * batch: the refusal resolves, and is also told to the failure listener under `notice`. While
   * saving is off it reads and applies nothing.
   */
  changeKept(changes: KeptChanges, refusal: KeptRefusal): Promise<KeptChangeOutcome>
  /** A read of the kept sessions at a change, in the same line and on the same terms. */
  readKept<T>(read: KeptRead<T>, refusal: KeptRefusal): Promise<KeptReadOutcome<T>>
  /**
   * Be told of failed saves. A run of refusals with no success between them is told at its first
   * refusal (`startsRun` true), and again each time a refusal's kind differs from the last one told
   * in the run (`startsRun` false); a refusal made with no listener attached still counts toward
   * its run. One listener at a time: a second is a defect. Returns an unsubscribe.
   */
  onFailure(listener: SaveFailureListener): () => void
}

/**
 * Told of a failed save: its kind, and whether it starts a run of refusals (the visit's first, or
 * the first after a success) rather than changing the kind within one.
 */
// @spec-link [[rule_failed_save_never_disturbs_session]]
// @spec-link [[module_save_policy]]
export type SaveFailureListener = (kind: SaveFailureKind, startsRun: boolean) => void

/** Intent: the saving state a visit starts in, from the state the port opened in. */
function initialState(status: StoragePortStatus): SavingState {
  if (status === 'ready') return 'on'
  return status === 'outdated' ? 'off-outdated' : 'off-unreadable'
}

const SESSION_SAVED: SessionSaveOutcome = Object.freeze({ status: 'saved' })
const SESSION_SAVING_OFF: SessionSaveOutcome = Object.freeze({ status: 'saving-off' })

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
// @spec-link [[module_save_policy]]
export function createSavePolicy(port: StoragePort): SavePolicy {
  const hold = createHold()
  const stateListeners = new Set<(state: SavingState) => void>()
  let saving = initialState(port.status())
  let failureListener: SaveFailureListener | null = null
  // The kind last reported in the current run of refusals; null when no run is under way.
  let lastReportedInRun: SaveFailureKind | null = null
  // The flush of a release still being applied; null when none is.
  let releasing: Promise<SaveOutcome> | null = null
  // The latest session save, which the next one waits for.
  let sessionSaves: Promise<unknown> = Promise.resolve()

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
   * failed for the others, reported unless the last one reported in its run had the same kind.
   */
  const refused = (kind: StorageErrorKind): SaveOutcome => {
    if (kind === 'outdated') {
      turnOff('off-outdated')
      return 'skipped'
    }
    if (lastReportedInRun !== kind) {
      const startsRun = lastReportedInRun === null
      lastReportedInRun = kind
      failureListener?.(kind, startsRun)
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
    lastReportedInRun = null
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

  /**
   * Intent: the kept sessions' summaries with their keys, read at the save; none when the port
   * refuses the read, so a refused read deletes nothing. A defect goes through.
   */
  const keptSummaries = async (): Promise<readonly StoredEntry[]> => {
    try {
      return await port.readKeyed('sessionSummaries')
    } catch (error) {
      if (error instanceof StorageError) return []
      throw error
    }
  }

  /**
   * Intent: apply the session's changes and say what became of them: a refusal as outdated turns
   * saving off, one for lack of space is told to the failure listener as any refusal is, and any
   * other is the caller's alone, leaving the run of refusals as it was.
   */
  const applySession = async (changes: readonly StorageChange[]): Promise<SessionSaveOutcome> => {
    if (changes.length === 0) throw new Error('save policy: a session save must hold a change')
    try {
      await port.apply(changes)
    } catch (error) {
      if (!(error instanceof StorageError)) throw error
      if (error.kind === 'outdated') {
        turnOff('off-outdated')
        return SESSION_SAVING_OFF
      }
      if (error.kind === 'quota') refused('quota')
      return Object.freeze({ status: 'refused', kind: error.kind })
    }
    lastReportedInRun = null
    return SESSION_SAVED
  }

  /**
   * Intent: the session's save, once no session holds the saves and no flush is being applied:
   * the summaries read, then the changes applied. A session started meanwhile makes it wait for
   * that session's end and read again; saving off makes it read and apply nothing.
   */
  // @spec-link [[module_kept_session_save]]
  // @spec-link [[rule_no_save_during_session]]
  const runSessionSave = async (changes: SessionChanges): Promise<SessionSaveOutcome> => {
    for (;;) {
      await hold.whenNotHeld()
      if (releasing !== null) {
        await releasing
        continue
      }
      if (saving !== 'on') return SESSION_SAVING_OFF
      const kept = await keptSummaries()
      if (hold.isHeld() || releasing !== null) continue
      if (saving !== 'on') return SESSION_SAVING_OFF
      return applySession(changes(kept))
    }
  }

  const keptChanges = createKeptChangeRunner({
    port,
    isOn: () => saving === 'on',
    isHeld: hold.isHeld,
    whenNotHeld: hold.whenNotHeld,
    releasing: () => releasing,
    refused: (kind, tell) => {
      if (kind === 'outdated' || tell) refused(kind)
    },
    succeeded: () => {
      lastReportedInRun = null
    },
  })

  /** Intent: run `task` in the line of the session saves, after every one asked for before it. */
  const inLine = <T>(task: () => Promise<T>): Promise<T> => {
    // A defect of one rejects every later one too: it surfaces, never swallowed.
    const queued = sessionSaves.then(task)
    sessionSaves = queued
    return queued
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
    release: () => {
      const flushing = (async (): Promise<SaveOutcome> => {
        const changes = hold.stop()
        try {
          if (saving !== 'on') return 'skipped'
          if (changes.length === 0) return 'saved'
          return await attempt(() => port.apply(changes))
        } finally {
          hold.wakeWaiting()
        }
      })()
      releasing = flushing
      // Settled or not, the flush is over for the session save; its outcome goes to the caller.
      const over = () => {
        if (releasing === flushing) releasing = null
      }
      void flushing.then(over, over)
      return flushing
    },
    // @spec-link [[module_kept_session_save]]
    // @spec-link [[rule_failed_save_never_disturbs_session]]
    // @spec-link [[module_save_policy]]
    saveSession: (changes) => inLine(() => runSessionSave(changes)),
    // @spec-link [[module_kept_session_changes]]
    // @spec-link [[module_save_policy]]
    changeKept: (changes, refusal) => inLine(() => keptChanges.change(changes, refusal)),
    // @spec-link [[module_kept_session_changes]]
    readKept: (read, refusal) => inLine(() => keptChanges.read(read, refusal)),
    onFailure: (listener) => {
      if (failureListener !== null) throw new Error('save policy: a failure listener is set')
      failureListener = listener
      return () => {
        if (failureListener === listener) failureListener = null
      }
    },
  }
}
