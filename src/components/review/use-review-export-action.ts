/**
 * One Review export button's own state, shared by `Export generated notes` and `Export played
 * notes`: the button is loading and disabled while its file is built, the other button staying
 * live; a failure sets the Review's one export error, which the next export of either content
 * removes as it starts; success says nothing, the browser's download being the confirmation; once
 * the build ends, focus returns to the button if it was there or fell to the page meanwhile.
 */
import { nextTick, onBeforeUnmount, ref, type Ref } from 'vue'

/** What one export button runs with. */
export interface ReviewExportActionOptions {
  /** The button, once mounted; null while it is not rendered. */
  readonly button: Readonly<Ref<HTMLButtonElement | null>>
  /** The Review's one export error, shared by every export button. */
  readonly failed: Ref<boolean>
  /** Build the file and hand it to the browser; rejects on failure. */
  readonly build: () => Promise<void>
}

/** One export button's state and action. */
export interface ReviewExportAction {
  /** The button's file is being built: it is loading and disabled. */
  readonly running: Readonly<Ref<boolean>>
  /** Build the button's file, unless one is already being built. */
  readonly start: () => Promise<void>
}

/**
 * Intent: the state and action of one export button of the mounted Review panel; call it from the
 * panel's setup.
 */
// @spec-link [[req_session_export]]
// @spec-link [[req_played_notes_export]]
export function useReviewExportAction(options: ReviewExportActionOptions): ReviewExportAction {
  const running = ref(false)
  let unmounted = false
  onBeforeUnmount(() => {
    unmounted = true
  })

  /**
   * Intent: once the export ends, give focus back to the enabled button if it was there, or fell
   * to the page while the button was disabled; focus the player moved elsewhere stays there.
   */
  function returnFocus(): void {
    const button = options.button.value
    if (button === null) return
    const active = document.activeElement
    if (active === null || active === document.body || active === button) button.focus()
  }

  /** Intent: build the file, the error leaving as it starts and showing if it fails. */
  async function start(): Promise<void> {
    if (running.value) return
    options.failed.value = false
    running.value = true
    try {
      await options.build()
    } catch {
      // The failure is the player's to see: the error stays until the next export starts.
      options.failed.value = true
    } finally {
      running.value = false
    }
    if (unmounted) return
    await nextTick()
    returnFocus()
  }

  return { running, start }
}
