/**
 * The save policy's requests beyond saving: persistent storage, asked for at most once per visit,
 * never while saving is off and never during a session; the space used and whether the saved data
 * is persistent, for Your data; and Delete everything, which a visit whose saved data could not be
 * read still offers but an outdated tab never does.
 */

import { StorageError, type StoragePort } from './storage-port'

/**
 * What became of a request for persistent storage: granted or refused by the browser, not needed
 * because the data already is persistent, not asked (saving is off, or the visit already asked),
 * or failed because the browser's storage manager refused the call.
 */
// @spec-link [[rule_persistent_storage_requested]]
export type ProtectionOutcome = 'granted' | 'refused' | 'already-protected' | 'not-asked' | 'failed'

/** What the requests need to know of the save policy: whether it saves, and whether it holds. */
// @spec-link [[rule_persistent_storage_requested]]
export interface SavingView {
  /** Whether saving is on. */
  readonly isOn: () => boolean
  /** Whether saving is off because a newer version of the app has written data. */
  readonly isOutdated: () => boolean
  /** Whether a session holds the saves. */
  readonly isHeld: () => boolean
  /** Resolves once no session holds the saves. */
  readonly whenNotHeld: () => Promise<void>
}

/** The requests of the save policy beyond saving. */
// @spec-link [[rule_persistent_storage_requested]]
// @spec-link [[req_your_data]]
// @spec-link [[rule_delete_everything]]
// @spec-link [[module_save_policy]]
export interface VisitRequests {
  /**
   * Ask the browser once per visit for persistent storage, unless it already is persistent. Not
   * asked while saving is off, which does not use up the visit's request; during a session the
   * request waits and runs right after the session's saves are flushed. A refusal of the storage
   * manager resolves as failed and is not reported as a failed save.
   */
  requestProtection(): Promise<ProtectionOutcome>
  /** The browser's estimate of the space used and available. */
  estimate(): Promise<StorageEstimate>
  /** Whether the browser keeps the saved data under storage pressure. */
  persisted(): Promise<boolean>
  /**
   * Remove the whole database, also when the saved data could not be read. Refused as outdated
   * in an outdated tab, without reaching the port; a defect during a session. Its refusal goes to
   * the caller, not to the failure listener.
   */
  deleteEverything(): Promise<void>
}

/**
 * Intent: the requests beyond saving over `port`, deferring to the save policy, through `view`,
 * on whether saving is on and whether a session runs.
 */
// @spec-link [[rule_persistent_storage_requested]]
// @spec-link [[req_your_data]]
// @spec-link [[rule_delete_everything]]
// @spec-link [[module_save_policy]]
export function createVisitRequests(port: StoragePort, view: SavingView): VisitRequests {
  let protectionAsked = false

  /** Intent: whether persistent storage may be asked for now: saving on and no session running. */
  const mayAsk = async (): Promise<boolean> => {
    await view.whenNotHeld()
    return view.isOn()
  }

  /** Intent: ask the browser for persistent storage unless it is already persistent. */
  const askForProtection = async (): Promise<ProtectionOutcome> => {
    try {
      if (!(await mayAsk())) return 'not-asked'
      if (await port.persisted()) return 'already-protected'
      if (!(await mayAsk())) return 'not-asked'
      return (await port.persist()) ? 'granted' : 'refused'
    } catch (error) {
      if (error instanceof StorageError) return 'failed'
      throw error
    }
  }

  return {
    requestProtection: async () => {
      if (!view.isOn() || protectionAsked) return 'not-asked'
      protectionAsked = true
      return askForProtection()
    },
    estimate: () => port.estimate(),
    persisted: () => port.persisted(),
    deleteEverything: async () => {
      if (view.isHeld()) throw new Error('save policy: delete everything during a session')
      if (view.isOutdated()) {
        throw new StorageError('outdated', 'a newer version of the app saves now')
      }
      await port.deleteEverything()
    },
  }
}
