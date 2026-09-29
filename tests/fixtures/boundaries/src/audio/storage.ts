/** Intent: write to browser storage. */
export function storeInBrowser(): void {
  localStorage.setItem('session', 'played notes')
}
