/** Intent: write a cookie through the Cookie Store API. */
export function storeCookie(): Promise<void> {
  return cookieStore.set('session', 'played notes')
}
