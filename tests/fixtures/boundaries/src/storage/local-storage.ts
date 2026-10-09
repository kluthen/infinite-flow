/** Intent: write to the browser's local storage. */
export function storeInBrowser(): void {
  localStorage.setItem('session', 'played notes')
}
