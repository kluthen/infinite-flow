/**
 * The reading of the browser's storage estimate for Your data's "Space used": the part the app's
 * database takes, from the estimate the save policy reports. Loaded on demand with the Your data
 * sheet, never with the app's first load. Pure: no browser API.
 */

/** Intent: the space the app's database uses, from the browser's estimate; null if it can't say. */
// @spec-link [[req_your_data]]
export function databaseBytes(estimate: StorageEstimate): number | null {
  const details = (estimate as { readonly usageDetails?: Record<string, number> }).usageDetails
  if (details === undefined) return null
  return details.indexedDB ?? 0
}
