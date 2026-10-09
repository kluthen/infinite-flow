/** Intent: write a cookie through the document. */
export function storeCookie(): void {
  document.cookie = 'session=played notes'
}
