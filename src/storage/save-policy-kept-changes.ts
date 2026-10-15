/**
 * The save policy's changes to kept sessions after their own save: a change reads what it rewrites
 * at the change, through a reader over the port, once no session holds the saves and no flush is
 * being applied, then applies the batch it built from what it read in one transaction; a read of
 * the kept sessions alone (whether played notes are kept, at the switch) waits the same way. A
 * session started while it read makes it wait for that session's end and read again; saving off
 * makes it read and apply nothing. The read and the batch are separate transactions. A refusal,
 * of the read or of the batch, never rejects: it resolves to the caller, and is also told to the
 * policy's failure listener when the caller asks for it. The policy runs these one after the
 * other with the session saves (./save-policy.ts).
 *
 * Pure: the port is injected, and it keeps no clock.
 */

import {
  StorageError,
  type StorageChange,
  type StorageErrorKind,
  type StoragePort,
  type StoredEntry,
  type StoreName,
} from './storage-port'

/** Why a change was refused, as resolved: a lack of space, or any other storage failure. */
// @spec-link [[module_kept_session_changes]]
export type KeptRefusalKind = Exclude<StorageErrorKind, 'outdated'>

/**
 * What a change reads at the change: one record by its key (`undefined` when none is stored),
 * every entry of a store with its key, or only the keys a store holds, so deleting every played
 * note never reads a played note.
 */
// @spec-link [[module_kept_session_changes]]
// @spec-link [[module_save_policy]]
export interface KeptRecordsReader {
  read(store: StoreName, key: string): Promise<unknown>
  readKeyed(store: StoreName): Promise<readonly StoredEntry[]>
  readKeys(store: StoreName): Promise<readonly string[]>
}

/**
 * A change to kept sessions: its batch, built from what it reads at the change, only the player's
 * change applied to what was read. An empty batch changes nothing: what it would change is no
 * longer stored or cannot be read. A read the device refuses rejects with its `StorageError`.
 */
// @spec-link [[module_kept_session_changes]]
export type KeptChanges = (reader: KeptRecordsReader) => Promise<readonly StorageChange[]>

/** A read of the kept sessions at a change, giving `T`. */
// @spec-link [[module_kept_session_changes]]
export type KeptRead<T> = (reader: KeptRecordsReader) => Promise<T>

/**
 * Whether a refusal is also told to the failure listener (`notice`: the notice row tells it once
 * the player is back at Idle) or resolved to the caller alone (`caller`: a deletion's own sheet
 * tells it).
 */
// @spec-link [[module_kept_session_changes]]
export type KeptRefusal = 'notice' | 'caller'

/**
 * What became of a change: saved; nothing to change (no longer stored, or unreadable); refused by
 * the device, its read or its batch, with the refusal's kind; or not attempted because saving is
 * off for the visit (a refusal as outdated, which turns it off, included).
 */
// @spec-link [[module_kept_session_changes]]
// @spec-link [[rule_failed_save_never_disturbs_session]]
export type KeptChangeOutcome =
  | { readonly status: 'saved' }
  | { readonly status: 'unchanged' }
  | { readonly status: 'refused'; readonly kind: KeptRefusalKind }
  | { readonly status: 'saving-off' }

/** What became of a read at a change: its value, its refusal, or nothing read with saving off. */
// @spec-link [[module_kept_session_changes]]
export type KeptReadOutcome<T> =
  | { readonly status: 'read'; readonly value: T }
  | { readonly status: 'refused'; readonly kind: KeptRefusalKind }
  | { readonly status: 'saving-off' }

/** What the changes need of the save policy: its port, its saving state, its hold and its reports. */
export interface KeptChangeContext {
  readonly port: StoragePort
  /** Whether saving is on now. */
  readonly isOn: () => boolean
  /** Whether a session holds the saves. */
  readonly isHeld: () => boolean
  /** Resolves once no session holds the saves. */
  readonly whenNotHeld: () => Promise<void>
  /** The flush of a release being applied; null when none is. */
  readonly releasing: () => Promise<unknown> | null
  /** Take a refusal of the port: outdated turns saving off; another is told when `tell` is true. */
  readonly refused: (kind: StorageErrorKind, tell: boolean) => void
  /** A change reached the device: the run of refusals is over. */
  readonly succeeded: () => void
}

/** The policy's changes and reads of kept sessions, before it queues them. */
export interface KeptChangeRunner {
  readonly change: (changes: KeptChanges, refusal: KeptRefusal) => Promise<KeptChangeOutcome>
  readonly read: <T>(read: KeptRead<T>, refusal: KeptRefusal) => Promise<KeptReadOutcome<T>>
}

const SAVED: KeptChangeOutcome = Object.freeze({ status: 'saved' })
const UNCHANGED: KeptChangeOutcome = Object.freeze({ status: 'unchanged' })
const SAVING_OFF = Object.freeze({ status: 'saving-off' } as const)

/** A step that found a session started, or a flush under way, after its read: it reads again. */
const READ_AGAIN: unique symbol = Symbol('read again')

/**
 * Intent: the changes and reads of kept sessions over the policy's `context`, each run once no
 * session holds the saves and no flush is being applied.
 */
// @spec-link [[module_kept_session_changes]]
// @spec-link [[module_save_policy]]
// @spec-link [[rule_no_save_during_session]]
export function createKeptChangeRunner(context: KeptChangeContext): KeptChangeRunner {
  const { port } = context
  const reader: KeptRecordsReader = {
    read: (store, key) => port.read(store, key),
    readKeyed: (store) => port.readKeyed(store),
    readKeys: (store) => port.readKeys(store),
  }

  /** Intent: whether a session started, or a flush began, since the step's read. */
  const busy = (): boolean => context.isHeld() || context.releasing() !== null

  /**
   * Intent: what a refusal of the device becomes: saving off for an outdated one, else the
   * refusal resolved to the caller and told when asked. Anything else is a defect and goes on.
   */
  const refusedAs = (error: unknown, refusal: KeptRefusal) => {
    if (!(error instanceof StorageError)) throw error
    context.refused(error.kind, refusal === 'notice')
    if (error.kind === 'outdated') return SAVING_OFF
    return Object.freeze({ status: 'refused', kind: error.kind } as const)
  }

  /**
   * Intent: run `step` once no session holds the saves and no flush is being applied, saving
   * still on; a step that asks to read again waits for that session or flush, then runs again.
   */
  const whenFree = async <T>(step: () => Promise<T | typeof READ_AGAIN>): Promise<T | 'off'> => {
    for (;;) {
      await context.whenNotHeld()
      const flushing = context.releasing()
      if (flushing !== null) {
        await flushing
        continue
      }
      if (!context.isOn()) return 'off'
      const outcome = await step()
      if (outcome !== READ_AGAIN) return outcome
    }
  }

  /** Intent: read with the reader, then apply the batch built from it, unless a session started. */
  // @spec-link [[module_kept_session_changes]]
  const change = async (changes: KeptChanges, refusal: KeptRefusal): Promise<KeptChangeOutcome> => {
    const outcome = await whenFree(async (): Promise<KeptChangeOutcome | typeof READ_AGAIN> => {
      let batch: readonly StorageChange[]
      try {
        batch = await changes(reader)
      } catch (error) {
        return refusedAs(error, refusal)
      }
      if (busy()) return READ_AGAIN
      if (!context.isOn()) return SAVING_OFF
      if (batch.length === 0) return UNCHANGED
      try {
        await port.apply(batch)
      } catch (error) {
        return refusedAs(error, refusal)
      }
      context.succeeded()
      return SAVED
    })
    return outcome === 'off' ? SAVING_OFF : outcome
  }

  /** Intent: read with the reader, unless a session started meanwhile; then read again. */
  // @spec-link [[module_kept_session_changes]]
  const read = async <T>(
    reading: KeptRead<T>,
    refusal: KeptRefusal,
  ): Promise<KeptReadOutcome<T>> => {
    const outcome = await whenFree(async (): Promise<KeptReadOutcome<T> | typeof READ_AGAIN> => {
      let value: T
      try {
        value = await reading(reader)
      } catch (error) {
        return refusedAs(error, refusal)
      }
      if (busy()) return READ_AGAIN
      return Object.freeze({ status: 'read', value } as const)
    })
    return outcome === 'off' ? SAVING_OFF : outcome
  }

  return { change, read }
}
