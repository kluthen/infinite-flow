/**
 * Lazy-loading boundary for Jam's code (src/jam/): nothing outside src/jam/ may import a src/jam/
 * module statically but this file (type-only imports aside, erased in the build; enforced by
 * ESLint), so Jam's code stays out of the entry chunk and session mode never pays for it.
 * `loadJamMode()` memoizes the import of Jam's code entry (src/jam/jam-mode.ts), so every caller
 * shares one fetch; a rejected import clears the memo before rethrowing, so the next attempt tries
 * again, under a fresh URL, since the browser never fetches a failed import's URL again.
 */

/** What Jam's code entry exports: Jam's views, its cue row parts and the rest of Jam's ports. */
export type JamModeModule = typeof import('@/jam/jam-mode')

let modulePromise: Promise<JamModeModule> | null = null
/** The URL of Jam's code entry whose fetch failed, without any query; null until one fails. */
let failedEntryUrl: string | null = null
/** How many retries have been made, so each one asks for a URL the browser has never failed. */
let retries = 0

/**
 * Intent: the URL of the module whose dynamic import failed, from the failure Chromium (the one
 * browser the app supports) reports, "Failed to fetch dynamically imported module: <url>", without
 * its query; null when the failure names none.
 */
// @spec-link [[module_jam_code_boundary]]
export function failedModuleUrl(cause: unknown): string | null {
  const message = cause instanceof Error ? cause.message : String(cause)
  const named = /(https?:\/\/\S+?\.js)(?:\?\S*)?\s*$/u.exec(message)
  return named?.[1] ?? null
}

/**
 * Intent: import Jam's code entry. The browser remembers a failed dynamic import for the rest of
 * the visit and never fetches its URL again, so once one has failed each retry imports the same
 * built file under a URL it has never seen (a `retry` query); the chunk's own imports are of the
 * entry chunk, already loaded.
 */
// @spec-link [[rule_jam_code_loaded_on_demand]]
function importJamEntry(): Promise<JamModeModule> {
  if (failedEntryUrl === null) return import('@/jam/jam-mode')
  retries += 1
  return import(/* @vite-ignore */ `${failedEntryUrl}?retry=${retries}`)
}

/** Intent: Jam's code, loaded once on demand and shared by every caller; a failed load is retried. */
// @spec-link [[module_jam_code_boundary]]
// @spec-link [[rule_jam_code_loaded_on_demand]]
export function loadJamMode(): Promise<JamModeModule> {
  modulePromise ??= importJamEntry().catch((cause: unknown) => {
    modulePromise = null
    failedEntryUrl = failedModuleUrl(cause) ?? failedEntryUrl
    throw cause
  })
  return modulePromise
}
