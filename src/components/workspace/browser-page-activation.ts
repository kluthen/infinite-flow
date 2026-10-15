/**
 * The browser adapter of the page-activation port: the page's first click, tap or key press,
 * noted from the input events that can activate a page (`keydown`, `mousedown`, `pointerdown`,
 * `pointerup`, `touchend`), listened to on the window in the capture phase. Browsers notify their
 * user activation before dispatching such an event, so an event counts only when
 * `navigator.userActivation` then reads active (a key the browser does not count, Escape, does
 * not); without that API, any of them counts. Creating it asks for nothing and creates no audio.
 */
import type { PageActivation } from '@/session/session-browser-ports'

/** The events a browser may count as the page's activation. */
const ACTIVATION_EVENTS = ['keydown', 'mousedown', 'pointerdown', 'pointerup', 'touchend'] as const

/** The slice of `navigator.userActivation` the adapter reads. */
// @spec-link [[rule_starting_note_waits_for_first_gesture]]
export interface UserActivationLike {
  readonly hasBeenActive: boolean
}

/**
 * Intent: adapt an event target (the window) and the browser's user activation to the
 * page-activation port: active from the first listed event the browser counted, or from the start
 * when it already counts the page active. Its listeners are removed once it is active.
 */
// @spec-link [[rule_starting_note_waits_for_first_gesture]]
export function createPageActivation(
  target: EventTarget,
  userActivation: UserActivationLike | undefined,
): PageActivation {
  let active = userActivation?.hasBeenActive === true
  const listeners = new Set<() => void>()
  const options = { capture: true, passive: true } as const

  /** Intent: note the activation once the browser counts this event as one. */
  const onInput = (): void => {
    if (active || (userActivation !== undefined && !userActivation.hasBeenActive)) return
    active = true
    for (const type of ACTIVATION_EVENTS) target.removeEventListener(type, onInput, options)
    for (const listener of [...listeners]) listener()
    listeners.clear()
  }

  if (!active) {
    for (const type of ACTIVATION_EVENTS) target.addEventListener(type, onInput, options)
  }
  return {
    hasBeenActive: () => active,
    onFirstActivation: (listener) => {
      if (!active) listeners.add(listener)
      return () => listeners.delete(listener)
    },
  }
}

/** Intent: the page activation of this browser tab. */
// @spec-link [[rule_starting_note_waits_for_first_gesture]]
export function createBrowserPageActivation(): PageActivation {
  return createPageActivation(window, navigator.userActivation)
}
