/**
 * The one volume popover of the audio mix and the `Volume` buttons that open it: the toolbar's,
 * and, on the phone during a session, the compact one in the session cue row. Both name the same
 * popover; it opens anchored under whichever opened it. This controller holds which one did, the
 * DOM parts focus moves between, and the closing rules (Escape, a dismissal, a session start, a
 * session end); the components render it and route the browser's events here.
 */
import { reactive } from 'vue'

/** Which `Volume` button opened the popover: the toolbar's, or the phone's compact one. */
// @spec-link [[req_session_audio_mix]]
export type MixVolumeOpener = 'toolbar' | 'compact'

/** What the screen reads; reactive. */
// @spec-link [[req_session_audio_mix]]
export interface MixVolumePopoverState {
  /** The `Volume` the open popover belongs to; null while it is closed. */
  readonly openedBy: MixVolumeOpener | null
}

/** The volume popover a `Volume` button, the popover itself and the session flow drive. */
// @spec-link [[req_session_audio_mix]]
export interface MixVolumePopover {
  /** The popover element's id, which every `Volume` names in `aria-controls`. */
  readonly id: string
  readonly state: MixVolumePopoverState
  /** A mounted `Volume` button, which focus returns to. */
  readonly attachOpener: (opener: MixVolumeOpener, button: HTMLElement) => void
  /** Forget an opener leaving the page, closing the popover if it opened it. */
  readonly detachOpener: (opener: MixVolumeOpener) => void
  /** The popover element now in the page, held by whichever `Volume` shows it. */
  readonly attachPanel: (panel: HTMLElement) => void
  /** Forget a popover element leaving the page, unless another has replaced it already. */
  readonly detachPanel: (panel: HTMLElement) => void
  /** A `Volume` activation: close the popover if this opener has it open, open it from it otherwise. */
  readonly toggleFrom: (opener: MixVolumeOpener) => void
  /** Escape: close, and return focus to the `Volume` that opened it. */
  readonly escape: () => void
  /** An outside pointer press or Tab out of it: close, focus left where it is. */
  readonly dismiss: () => void
  /** Whether a press on `target` falls outside the popover and the `Volume` that opened it. */
  readonly isOutside: (target: Node) => boolean
  /**
   * A session start: close the popover if open, whichever `Volume` opened it; if focus was inside
   * it, return focus to that `Volume` without scrolling the page.
   */
  readonly closeForSessionStart: () => void
  /** A session end: close the popover if `opener` (the compact `Volume`) opened it. */
  readonly closeIfOpenedBy: (opener: MixVolumeOpener) => void
}

/**
 * Intent: build the closed volume popover named `id`. Focus moves only on Escape (to the opener)
 * and on a session start that closes it while focus was inside it (to the opener, unscrolled).
 */
// @spec-link [[req_session_audio_mix]]
export function createMixVolumePopover(id: string): MixVolumePopover {
  const state = reactive<{ openedBy: MixVolumeOpener | null }>({ openedBy: null })
  const openers: Record<MixVolumeOpener, HTMLElement | null> = { toolbar: null, compact: null }
  let panel: HTMLElement | null = null

  /** Intent: the button of the opener the popover is open from; throws if it is not mounted. */
  function openButton(): HTMLElement | null {
    if (state.openedBy === null) return null
    const button = openers[state.openedBy]
    if (button === null) throw new Error(`mix volume: the ${state.openedBy} Volume is not mounted`)
    return button
  }

  /** Intent: whether focus is inside the popover now. */
  function focusInside(): boolean {
    if (panel === null) return false
    return panel.contains(panel.ownerDocument.activeElement)
  }

  /** Intent: open the popover from `opener`; throws when that opener is not mounted. */
  function openFrom(opener: MixVolumeOpener): void {
    if (openers[opener] === null) throw new Error(`mix volume: the ${opener} Volume is not mounted`)
    state.openedBy = opener
  }

  return {
    id,
    state,
    attachOpener: (opener, button) => {
      openers[opener] = button
    },
    detachOpener: (opener) => {
      if (state.openedBy === opener) state.openedBy = null
      openers[opener] = null
    },
    attachPanel: (element) => {
      panel = element
    },
    detachPanel: (element) => {
      if (panel === element) panel = null
    },
    toggleFrom: (opener) => {
      if (state.openedBy === opener) state.openedBy = null
      else openFrom(opener)
    },
    escape: () => {
      const button = openButton()
      state.openedBy = null
      button?.focus()
    },
    dismiss: () => {
      state.openedBy = null
    },
    isOutside: (target) => {
      if (panel?.contains(target) === true) return false
      return openButton()?.contains(target) !== true
    },
    closeForSessionStart: () => {
      const button = openButton()
      if (button === null) return
      const returnFocus = focusInside()
      state.openedBy = null
      if (returnFocus) button.focus({ preventScroll: true })
    },
    closeIfOpenedBy: (opener) => {
      if (state.openedBy === opener) state.openedBy = null
    },
  }
}
