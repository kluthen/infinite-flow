/**
 * The session browser ports of this browser tab, the page activation aside: the screen wake lock,
 * the landscape orientation lock, the page becoming hidden, the page going away and the window's
 * shape. Only a session controller uses them, so `createWorkspaceSession` loads this module on
 * demand, as its own chunk, and builds the controller only once it has loaded: a lock asked for at
 * Start is still asked inside the Start click. The page activation stays in the entry chunk, as it
 * listens from the page's load for the first click, tap or key press.
 */
import type { PageActivation, SessionBrowserPorts } from '@/session/session-browser-ports'

import { createBrowserPageLeaving, createBrowserPageVisibility } from './browser-page-visibility'
import { createBrowserOrientationLock, createBrowserScreenWakeLock } from './browser-screen-locks'
import { createBrowserWindowShape } from './browser-window-shape'

/**
 * Intent: every session browser port of this tab over its browser adapter, with the page
 * activation the entry chunk built at the page's load. None asks or listens for anything until
 * used, but the page going away, which listens from this call on.
 */
// @spec-link [[service_session_controller]]
export function createBrowserSessionPorts(pageActivation: PageActivation): SessionBrowserPorts {
  return {
    wakeLock: createBrowserScreenWakeLock(),
    orientationLock: createBrowserOrientationLock(),
    pageVisibility: createBrowserPageVisibility(),
    pageLeaving: createBrowserPageLeaving(),
    windowShape: createBrowserWindowShape(),
    pageActivation,
  }
}
