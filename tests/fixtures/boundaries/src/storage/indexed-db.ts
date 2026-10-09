/** Intent: open the app's IndexedDB database. */
export function openDatabase(): IDBOpenDBRequest {
  return indexedDB.open('infinite-flow', 1)
}
