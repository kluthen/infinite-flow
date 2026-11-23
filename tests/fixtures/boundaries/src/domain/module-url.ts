/** A module's URL, built from a path that leaves the library set. */
export function sessionWorkerUrl(): URL {
  return new URL('../session/session-worker.ts', import.meta.url)
}
