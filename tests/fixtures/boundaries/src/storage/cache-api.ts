/** Intent: open a Cache API cache. */
export function openCache(): Promise<Cache> {
  return caches.open('session')
}
