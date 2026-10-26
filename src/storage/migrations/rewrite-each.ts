/**
 * The guarded cursor walk the migration steps that rewrite records share: each record of a store
 * either is written back as its rewrite or stays as it was, and nothing a stored value holds can
 * make the walk throw. A throw from a cursor callback would escape the migration runner's guard
 * and abort the upgrade, and every later open of the database would then fail on the same record.
 * A failing request (a quota error, say) is not prevented: it aborts the upgrade, which a later
 * open then runs again.
 */

import type { StoreName } from '../database'

/**
 * How one store's records are rewritten: the store, and the rewrite of a stored value, null to
 * leave it as it is. The rewrite must never throw.
 */
export interface StoreRewrite {
  readonly store: StoreName
  readonly upgraded: (stored: unknown) => unknown
}

/**
 * Intent: write `next` over the record the cursor is on, and whether the write was requested; when
 * it cannot even be requested (the value cannot be stored, say), the record is left as it is.
 * Never throws.
 */
function updateOrLeave(cursor: IDBCursorWithValue, next: unknown): boolean {
  try {
    cursor.update(next)
    return true
  } catch {
    // A throw here would escape the migration runner's guard and abort the upgrade; the record
    // stays as it was instead, which the codec then reads as unreadable.
    return false
  }
}

/**
 * Intent: walk every record of `store`, writing back the rewrite `upgraded` gives of each one that
 * has one and leaving the others as they are, then call `done` when given. `upgraded` never
 * throws, and neither does the write; a failing request is left to abort the upgrade.
 */
// @spec-link [[module_kept_session_upgrade_step]]
// @spec-link [[module_kept_session_jam_upgrade_step]]
export function rewriteEach(
  store: IDBObjectStore,
  upgraded: (stored: unknown) => unknown,
  done?: () => void,
): void {
  const walk = store.openCursor()
  walk.onsuccess = () => {
    const cursor = walk.result
    if (cursor === null) {
      done?.()
      return
    }
    const next = upgraded(cursor.value)
    if (next !== null) updateOrLeave(cursor, next)
    cursor.continue()
  }
}

/**
 * Intent: walk the stores of `rewrites` one after the other, in order, inside `transaction`, each
 * with `rewriteEach`: a store's walk starts once the one before it has ended; call `done` once the
 * last has ended, every rewrite then requested.
 */
export function rewriteInOrder(
  transaction: IDBTransaction,
  rewrites: readonly StoreRewrite[],
  done: () => void,
): void {
  const [first, ...rest] = rewrites
  if (first === undefined) {
    done()
    return
  }
  rewriteEach(transaction.objectStore(first.store), first.upgraded, () =>
    rewriteInOrder(transaction, rest, done),
  )
}
