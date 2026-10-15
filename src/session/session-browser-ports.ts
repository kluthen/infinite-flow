/**
 * The browser capabilities a session uses around its run, as injected ports: the screen wake lock
 * and the landscape orientation lock held from Start to the end, the page becoming hidden (which
 * ends a session), the page going away (which stops that session's save), and the window's shape (which a session judges on every change). Production
 * supplies browser adapters (`src/components/workspace/browser-*.ts`); unit tests and the
 * workspace harness supply fakes (`tests/unit/session/fake-session-browser.ts`). No method here
 * shows anything to the player: a refused or unsupported lock is an outcome value, never an error.
 */

/**
 * The outcome of one lock request, as a value the caller may ignore (a refused or unsupported lock
 * changes nothing about the session and shows nothing):
 * - `held`: the browser granted the lock, and it is held until released;
 * - `refused`: the browser rejected the request (`reason` is its error name, for diagnostics);
 * - `unsupported`: the browser has no such API, so nothing was asked;
 * - `released-before-grant`: the lock was released while the request was still pending, and the
 *   lock the browser then granted was given back at once, so it is not held.
 */
// @spec-link [[rule_screen_wake_lock_during_session]]
// @spec-link [[rule_landscape_lock_during_session]]
export type ScreenLockOutcome =
  | { readonly kind: 'held' }
  | { readonly kind: 'refused'; readonly reason: string }
  | { readonly kind: 'unsupported' }
  | { readonly kind: 'released-before-grant' }

/**
 * The screen wake lock a session holds from its start to its end. `request` asks for it and
 * settles with the outcome, never rejecting; requesting again before `release` is a caller defect
 * and throws. `release` gives a held lock back, is a no-op when none is held, and makes a request
 * still pending give its lock back as soon as it is granted. A lock the browser drops on its own
 * (the page hidden, a low battery) is never asked for again by the adapter.
 */
// @spec-link [[rule_screen_wake_lock_during_session]]
export interface ScreenWakeLock {
  readonly request: () => Promise<ScreenLockOutcome>
  readonly release: () => void
}

/**
 * The landscape orientation lock a session asks for from its start to its end, with the same
 * contract as `ScreenWakeLock`: `lock` settles with the outcome and never rejects (a browser
 * refuses it outside fullscreen), locking again before `unlock` throws, and `unlock` releases a
 * held or still pending lock and is a no-op otherwise.
 */
// @spec-link [[rule_landscape_lock_during_session]]
export interface OrientationLock {
  readonly lock: () => Promise<ScreenLockOutcome>
  readonly unlock: () => void
}

/** The page becoming hidden (the tab switched away, the window minimised, the screen locked). */
// @spec-link [[rule_hidden_tab_ends_session]]
export interface PageVisibility {
  /**
   * Call `listener` each time the page becomes hidden, never when it becomes visible again.
   * Returns the function that stops it.
   */
  readonly onHidden: (listener: () => void) => () => void
}

/**
 * The page going away: reloaded, closed or left (the browser's `pagehide`). A session cut short
 * that way is lost: its save takes a watch as it starts, checks it before each of its steps and
 * stops with nothing written. A page the back-forward cache brings back is no longer going away,
 * so its later sessions save. A tab or app switch never counts.
 */
// @spec-link [[req_rolling_practice_session]]
export interface PageLeaving {
  /**
   * Take a watch on the page going away, from the call on. The returned check reads true at once
   * if the page is going away at the call; otherwise it reads true once a `pagehide` fires after
   * the call. Once true it stays true, even after the page comes back from the back-forward cache,
   * so a save the page's leaving reached is never resumed.
   */
  readonly watch: () => () => boolean
}

/**
 * The window's shape, in CSS px, as the session window rule (`src/session/session-window.ts`)
 * judges it. `smallHeightPx` is the small viewport height (100svh, browser toolbars showing), so a
 * toolbar showing or hiding never changes it; `remPx` is the browser's initial font size, the rem
 * media queries use to place the breakpoints.
 */
// @spec-link [[rule_session_ends_on_portrait_view]]
// @spec-link [[rule_session_ends_when_staff_too_small]]
export interface WindowShapeReading {
  readonly widthPx: number
  readonly smallHeightPx: number
  readonly remPx: number
}

/** The window's shape, read now or after each change of the window's size or orientation. */
// @spec-link [[rule_session_ends_on_portrait_view]]
// @spec-link [[rule_session_ends_when_staff_too_small]]
export interface WindowShape {
  readonly read: () => WindowShapeReading
  /**
   * Call `listener` after every change of the window's size, a turned device included (a toolbar
   * showing or hiding may call it too; the reading's `smallHeightPx` is unchanged then). Returns
   * the function that stops it.
   */
  readonly subscribe: (listener: () => void) => () => void
}

/**
 * The page's first click, tap or key press since it loaded, which browsers require before a page
 * may play sound. A MIDI note never counts.
 */
// @spec-link [[rule_starting_note_waits_for_first_gesture]]
export interface PageActivation {
  /** Whether the page has had its first click, tap or key press. */
  readonly hasBeenActive: () => boolean
  /**
   * Call `listener` once, at that first click, tap or key press (never when it already came).
   * Returns the function that stops it.
   */
  readonly onFirstActivation: (listener: () => void) => () => void
}

/** Every session browser port, as `WorkspaceSession` carries them. */
// @spec-link [[service_session_controller]]
export interface SessionBrowserPorts {
  readonly wakeLock: ScreenWakeLock
  readonly orientationLock: OrientationLock
  readonly pageVisibility: PageVisibility
  readonly pageLeaving: PageLeaving
  readonly windowShape: WindowShape
  readonly pageActivation: PageActivation
}
