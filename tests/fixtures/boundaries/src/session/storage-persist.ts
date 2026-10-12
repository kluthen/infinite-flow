/** Intent: ask the browser to keep the app's storage when the device runs short of space. */
export function persistStorage(): Promise<boolean> {
  return navigator.storage.persist()
}
