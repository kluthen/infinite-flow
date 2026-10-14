/**
 * A save policy double recording the saves, holds, releases and session saves that reach it, in
 * order; every other member throws, as the callers under test must never use it.
 */
import type { SavePolicy, SessionChanges } from '@/storage/save-policy'
import type { StorageChange } from '@/storage/storage-port'

/** One call that reached the fake policy. */
export type PolicyCall =
  | { readonly method: 'save'; readonly changes: readonly StorageChange[] }
  | { readonly method: 'hold' }
  | { readonly method: 'release' }
  | { readonly method: 'saveSession'; readonly changes: SessionChanges }

/** Intent: a member of the fake policy the saver must never call. */
export function notUsed(name: string): () => never {
  return () => {
    throw new Error(`fake save policy: ${name} is not used`)
  }
}

/** Intent: a save policy recording the saves, holds, releases and session saves, in order. */
export function recordingPolicy(): { readonly policy: SavePolicy; readonly calls: PolicyCall[] } {
  const calls: PolicyCall[] = []
  const policy: SavePolicy = {
    state: notUsed('state'),
    onStateChange: notUsed('onStateChange'),
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
    saveSession: (changes) => {
      calls.push({ method: 'saveSession', changes })
      return Promise.resolve({ status: 'refused', kind: 'quota' })
    },
    onFailure: notUsed('onFailure'),
    requestProtection: notUsed('requestProtection'),
    estimate: notUsed('estimate'),
    persisted: notUsed('persisted'),
    deleteEverything: notUsed('deleteEverything'),
  }
  return { policy, calls }
}
