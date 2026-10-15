/**
 * The workspace harness's session browser seams: the browser ports handed to the workspace
 * session, and the `window.__workspaceHarness.screenLocks` and `.page` APIs. The wake lock, the
 * orientation lock and the page visibility are the unit fakes (tests/unit/session/
 * fake-session-browser.ts), so a spec chooses how the browser answers each lock and hides the page
 * at will; the window shape is the production adapter, so a spec moves it for real with
 * `page.setViewportSize`, and `windowShape()` reads it as a session would; and the page activation
 * is the production adapter too, so a spec's real click, tap or key press is the page's first.
 */
import { createBrowserPageActivation } from '../../../src/components/workspace/browser-page-activation'
import { createBrowserWindowShape } from '../../../src/components/workspace/browser-window-shape'
import type { SessionBrowserPorts } from '../../../src/session/session-browser-ports'
import {
  createFakeOrientationLock,
  createFakePageVisibility,
  createFakeScreenWakeLock,
  type FakeScreenLockControls,
} from '../../unit/session/fake-session-browser'

/** The harness's session browser ports and the APIs published for specs. */
export interface HarnessSessionBrowser {
  readonly ports: SessionBrowserPorts
  readonly screenLocks: WorkspaceHarnessScreenLocksApi
  readonly page: WorkspaceHarnessPageApi
  readonly windowShape: () => WorkspaceHarnessWindowShape
}

/** Intent: one fake lock's controls as plain-JSON harness calls. */
function lockApi(lock: FakeScreenLockControls): WorkspaceHarnessScreenLockApi {
  return {
    setBehaviour: (behaviour) => lock.setBehaviour(behaviour),
    requests: () => lock.requests(),
    releases: () => lock.releases(),
    isHeld: () => lock.isHeld(),
    log: () => [...lock.log()],
    drop: () => lock.drop(),
  }
}

/**
 * Intent: build the harness's session browser: fake locks (granting until told otherwise), a fake
 * page visibility, and the real window shape, with the APIs a spec drives them through.
 */
// @test-link [[rule_screen_wake_lock_during_session]]
// @test-link [[rule_landscape_lock_during_session]]
// @test-link [[rule_hidden_tab_ends_session]]
export function createHarnessSessionBrowser(): HarnessSessionBrowser {
  const wakeLock = createFakeScreenWakeLock()
  const orientationLock = createFakeOrientationLock()
  const pageVisibility = createFakePageVisibility()
  const windowShape = createBrowserWindowShape()
  return {
    ports: {
      wakeLock,
      orientationLock,
      pageVisibility,
      windowShape,
      pageActivation: createBrowserPageActivation(),
    },
    screenLocks: { wake: lockApi(wakeLock), orientation: lockApi(orientationLock) },
    page: {
      setHidden: (hidden) => pageVisibility.setHidden(hidden),
      isHidden: () => pageVisibility.isHidden(),
    },
    windowShape: () => ({ ...windowShape.read() }),
  }
}
