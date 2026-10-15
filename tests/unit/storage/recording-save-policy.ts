/**
 * A save policy double recording the saves, holds, releases, session saves, changes to kept
 * sessions and persistent-storage requests that reach it, in order (and the signal of a page that
 * stays, for the session saves the callers hand it); its saving state stays on; every other member throws, as the
 * callers under test must never use it.
 */
import type {
  KeptChanges,
  KeptRead,
  KeptRefusal,
  PageGoingAway,
  SavePolicy,
  SessionChanges,
} from '@/storage/save-policy'
import type { StorageChange } from '@/storage/storage-port'

/** The page-leaving signal of a page that stays: a session's own save is never abandoned. */
export const PAGE_STAYS: PageGoingAway = () => false

/** One call that reached the fake policy. */
export type PolicyCall =
  | { readonly method: 'save'; readonly changes: readonly StorageChange[] }
  | { readonly method: 'hold' }
  | { readonly method: 'release' }
  | {
      readonly method: 'saveSession'
      readonly changes: SessionChanges
      readonly pageGoingAway: PageGoingAway
    }
  | { readonly method: 'changeKept'; readonly changes: KeptChanges; readonly refusal: KeptRefusal }
  | { readonly method: 'readKept'; readonly read: KeptRead<unknown>; readonly refusal: KeptRefusal }
  | { readonly method: 'requestProtection' }

/** Intent: a member of the fake policy the saver must never call. */
export function notUsed(name: string): () => never {
  return () => {
    throw new Error(`fake save policy: ${name} is not used`)
  }
}

/** Intent: a save policy recording the saves, holds, releases, session saves and kept changes. */
export function recordingPolicy(): { readonly policy: SavePolicy; readonly calls: PolicyCall[] } {
  const calls: PolicyCall[] = []
  const policy: SavePolicy = {
    // Saving stays on: the workspace follows the state, and it never changes here.
    state: () => 'on',
    onStateChange: () => () => {},
    stopSavingUnreadable: notUsed('stopSavingUnreadable'),
    write: notUsed('write'),
    delete: notUsed('delete'),
    save: (changes) => {
      calls.push({ method: 'save', changes })
      return Promise.resolve('saved')
    },
    hold: () => {
      calls.push({ method: 'hold' })
    },
    release: () => {
      calls.push({ method: 'release' })
      return Promise.resolve('saved')
    },
    saveSession: (changes, pageGoingAway) => {
      calls.push({ method: 'saveSession', changes, pageGoingAway })
      return Promise.resolve({ status: 'refused', kind: 'quota' })
    },
    changeKept: (changes, refusal) => {
      calls.push({ method: 'changeKept', changes, refusal })
      return Promise.resolve({ status: 'unchanged' })
    },
    readKept: (read, refusal) => {
      calls.push({ method: 'readKept', read, refusal })
      return Promise.resolve({ status: 'saving-off' })
    },
    onFailure: notUsed('onFailure'),
    requestProtection: () => {
      calls.push({ method: 'requestProtection' })
      return Promise.resolve('not-asked')
    },
    estimate: notUsed('estimate'),
    persisted: notUsed('persisted'),
    deleteEverything: notUsed('deleteEverything'),
    readKeptSession: notUsed('readKeptSession'),
  }
  return { policy, calls }
}
