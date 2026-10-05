/**
 * Fakes of the session's browser ports (src/session/session-browser-ports.ts) for unit tests and
 * the workspace harness: two screen locks whose answer the test chooses (granted, refused or
 * unsupported), that count and log every request and release and say whether the lock is held; a
 * page whose visibility the test sets; and a window whose shape the test resizes. They honour the
 * ports' contracts (a second request before a release throws) and settle at once, with no
 * browser. They import no Node module and no test framework, so the browser harness reuses them.
 */
import type {
  OrientationLock,
  PageVisibility,
  ScreenLockOutcome,
  ScreenWakeLock,
  SessionBrowserPorts,
  WindowShape,
  WindowShapeReading,
} from '../../../src/session/session-browser-ports'

/** How the fake browser answers the next lock requests. */
export type FakeScreenLockBehaviour = 'grant' | 'refuse' | 'unsupported'

/**
 * One logged lock event: a request, the browser's answer to it, a release call, or the browser
 * dropping a held lock on its own.
 */
export type FakeScreenLockEvent =
  'request' | 'grant' | 'refuse' | 'unsupported' | 'release' | 'drop'

/** The controls and readings both fake locks share. */
export interface FakeScreenLockControls {
  /** Choose how the browser answers every later request (`grant` until changed). */
  readonly setBehaviour: (behaviour: FakeScreenLockBehaviour) => void
  /** How many requests were made. */
  readonly requests: () => number
  /** How many release calls were made, whether or not they gave a lock back. */
  readonly releases: () => number
  /** Whether the lock is held now. */
  readonly isHeld: () => boolean
  /** Every event, in order. */
  readonly log: () => readonly FakeScreenLockEvent[]
  /** The browser drops the held lock on its own (a hidden page, a low battery). Throws if none. */
  readonly drop: () => void
}

/** A fake screen wake lock. */
export interface FakeScreenWakeLock extends ScreenWakeLock, FakeScreenLockControls {}

/** A fake landscape orientation lock. */
export interface FakeOrientationLock extends OrientationLock, FakeScreenLockControls {}

/** The request/release pair and controls of one fake lock, before naming its methods. */
interface FakeLockCore extends FakeScreenLockControls {
  readonly request: () => Promise<ScreenLockOutcome>
  readonly release: () => void
}

/** Intent: the outcome a behaviour answers with. */
function outcomeOf(behaviour: FakeScreenLockBehaviour): ScreenLockOutcome {
  if (behaviour === 'grant') return { kind: 'held' }
  if (behaviour === 'refuse') return { kind: 'refused', reason: 'NotAllowedError' }
  return { kind: 'unsupported' }
}

/** Intent: one fake lock named `name`, granting until told otherwise. */
// @test-link [[rule_screen_wake_lock_during_session]]
// @test-link [[rule_landscape_lock_during_session]]
function createFakeLockCore(name: string): FakeLockCore {
  let behaviour: FakeScreenLockBehaviour = 'grant'
  let open = false
  let held = false
  let requests = 0
  let releases = 0
  const log: FakeScreenLockEvent[] = []
  return {
    request: () => {
      if (open) throw new Error(`The ${name} was requested again before it was released.`)
      open = true
      requests += 1
      log.push('request', behaviour === 'grant' ? 'grant' : behaviour)
      held = behaviour === 'grant'
      return Promise.resolve(outcomeOf(behaviour))
    },
    release: () => {
      open = false
      held = false
      releases += 1
      log.push('release')
    },
    setBehaviour: (next) => {
      behaviour = next
    },
    requests: () => requests,
    releases: () => releases,
    isHeld: () => held,
    log: () => [...log],
    drop: () => {
      if (!held) throw new Error(`Fake ${name}: drop() needs a held lock.`)
      held = false
      log.push('drop')
    },
  }
}

/** Intent: a fake screen wake lock (`request` / `release`). */
// @test-link [[rule_screen_wake_lock_during_session]]
export function createFakeScreenWakeLock(): FakeScreenWakeLock {
  return createFakeLockCore('screen wake lock')
}

/** Intent: a fake landscape orientation lock (`lock` / `unlock`). */
// @test-link [[rule_landscape_lock_during_session]]
export function createFakeOrientationLock(): FakeOrientationLock {
  const core = createFakeLockCore('landscape orientation lock')
  return { ...core, lock: core.request, unlock: core.release }
}

/** A fake page whose visibility the test sets. */
export interface FakePageVisibility extends PageVisibility {
  /** Hide or show the page; a change to hidden tells every listener, as `visibilitychange` does. */
  readonly setHidden: (hidden: boolean) => void
  readonly isHidden: () => boolean
  readonly listenerCount: () => number
}

/** Intent: a fake visible page. */
// @test-link [[rule_hidden_tab_ends_session]]
export function createFakePageVisibility(): FakePageVisibility {
  let hidden = false
  const listeners = new Set<() => void>()
  return {
    onHidden: (listener) => {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
    setHidden: (next) => {
      const becameHidden = next && !hidden
      hidden = next
      if (becameHidden) for (const listener of [...listeners]) listener()
    },
    isHidden: () => hidden,
    listenerCount: () => listeners.size,
  }
}

/** A fake window whose shape the test sets. */
export interface FakeWindowShape extends WindowShape {
  /** Give the window a new shape and tell every subscriber, as `resize` does. */
  readonly resize: (reading: WindowShapeReading) => void
  readonly listenerCount: () => number
}

/** A desktop window: 1280 × 800 CSS px at a 16 px rem. */
export const FAKE_DESKTOP_WINDOW: WindowShapeReading = {
  widthPx: 1280,
  smallHeightPx: 800,
  remPx: 16,
}

/** Intent: a fake window of the given shape (a desktop window by default). */
// @test-link [[rule_session_ends_on_portrait_view]]
// @test-link [[rule_session_ends_when_staff_too_small]]
export function createFakeWindowShape(
  initial: WindowShapeReading = FAKE_DESKTOP_WINDOW,
): FakeWindowShape {
  let reading = initial
  const listeners = new Set<() => void>()
  return {
    read: () => reading,
    subscribe: (listener) => {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
    resize: (next) => {
      reading = next
      for (const listener of [...listeners]) listener()
    },
    listenerCount: () => listeners.size,
  }
}

/** Every fake session browser port, as `WorkspaceSession.browser` carries them. */
export interface FakeSessionBrowser extends SessionBrowserPorts {
  readonly wakeLock: FakeScreenWakeLock
  readonly orientationLock: FakeOrientationLock
  readonly pageVisibility: FakePageVisibility
  readonly windowShape: FakeWindowShape
}

/** Intent: a full set of fake session browser ports: locks granted, page visible, desktop window. */
// @test-link [[service_session_controller]]
export function createFakeSessionBrowser(): FakeSessionBrowser {
  return {
    wakeLock: createFakeScreenWakeLock(),
    orientationLock: createFakeOrientationLock(),
    pageVisibility: createFakePageVisibility(),
    windowShape: createFakeWindowShape(),
  }
}
