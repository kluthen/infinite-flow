declare global {
  interface Window {
    webkitAudioContext?: typeof AudioContext
  }
}

/** Intent: create each Web Audio context kind: the live context and the offline renderer. */
export function createAudioContexts(): { live: AudioContext; offline: OfflineAudioContext } {
  return {
    live: new AudioContext(),
    offline: new OfflineAudioContext(1, 44_100, 44_100),
  }
}

/** Intent: reach the prefixed legacy constructor older Chromium builds exposed. */
export function legacyAudioContextConstructor(): typeof AudioContext | undefined {
  return window.webkitAudioContext
}
