/** Intent: write to the browser's per-tab session storage. */
export function storeForTab(): void {
  sessionStorage.setItem('session', 'played notes')
}
