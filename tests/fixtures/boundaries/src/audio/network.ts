/** Intent: send a request over the network. */
export function sendOverNetwork(): Promise<Response> {
  return fetch('https://example.com/session', { method: 'POST' })
}
