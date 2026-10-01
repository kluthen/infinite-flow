/**
 * The browser adapters of the session's two screen locks: the screen wake lock over
 * `navigator.wakeLock.request('screen')` and the landscape orientation lock over
 * `screen.orientation.lock('landscape')` / `unlock()`, read through structural slices so tests
 * supply hand-made stand-ins. Both share one lifecycle: a request asks the browser at once (inside
 * the Start click), its answer becomes an outcome value, a release gives back what is held, and a
 * lock granted after its release is given back as soon as it arrives, so no lock outlives an end.
 */
import type {
  OrientationLock,
  ScreenLockOutcome,
  ScreenWakeLock,
} from '@/session/session-browser-ports'

/** The slice of a `WakeLockSentinel` the adapter uses. */
// @spec-link [[rule_screen_wake_lock_during_session]]
export interface WakeLockSentinelLike {
  release(): Promise<void>
}

/** The slice of `navigator` the wake lock adapter reads; `wakeLock` is absent without the API. */
// @spec-link [[rule_screen_wake_lock_during_session]]
export interface WakeLockNavigatorLike {
  readonly wakeLock?: { request(type: 'screen'): Promise<WakeLockSentinelLike> }
}

/** The slice of `ScreenOrientation` the orientation adapter uses; `lock` is absent in some browsers. */
// @spec-link [[rule_landscape_lock_during_session]]
export interface ScreenOrientationLike {
  readonly lock?: (orientation: 'landscape') => Promise<void>
  readonly unlock?: () => void
}

/** The slice of `screen` the orientation adapter reads; `orientation` is absent without the API. */
// @spec-link [[rule_landscape_lock_during_session]]
export interface OrientationScreenLike {
  readonly orientation?: ScreenOrientationLike
}

/** How one kind of lock is asked for and given back, for the shared lifecycle. */
interface LockMechanism<H> {
  /** Ask the browser; null without the API. May throw, which counts as a refusal. */
  readonly ask: () => Promise<H> | null
  /** Give a granted lock back. */
  readonly giveBack: (handle: H) => void
  /** Stop a request still pending at release time, where the browser can. */
  readonly abortPending: () => void
  /**
   * Whether a stale lock granted late is given back even while a newer request is open: true for
   * independent handles (wake lock sentinels), false for the page's single orientation lock,
   * which the newer request wants held.
   */
  readonly independentHandles: boolean
}

/** The browser's answer to one request. */
type BrowserAnswer<H> =
  | { readonly kind: 'granted'; readonly handle: H }
  | { readonly kind: 'refused'; readonly reason: string }
  | { readonly kind: 'unsupported' }

/** One request, from `request` to `release`. */
interface LockAttempt<H> {
  released: boolean
  settled: boolean
  handle: H | null
}

/** The shared lifecycle both screen locks expose. */
interface HeldLock {
  readonly request: () => Promise<ScreenLockOutcome>
  readonly release: () => void
}

/** Intent: the name of a browser rejection (a DOMException's or an Error's), for diagnostics. */
function rejectionName(error: unknown): string {
  return error instanceof Error || error instanceof DOMException ? error.name : String(error)
}

/**
 * Intent: ask the browser for one lock and turn every answer into a value. The ask runs before the
 * first await, so it happens inside the caller's click. A refused lock changes nothing about the
 * session and shows nothing (rule_screen_wake_lock_during_session,
 * rule_landscape_lock_during_session), so a rejection, or an ask that throws, becomes a `refused`
 * outcome carrying the rejection's name instead of an error.
 */
// @spec-link [[rule_screen_wake_lock_during_session]]
// @spec-link [[rule_landscape_lock_during_session]]
async function askBrowser<H>(mechanism: LockMechanism<H>): Promise<BrowserAnswer<H>> {
  try {
    const pending = mechanism.ask()
    if (pending === null) return { kind: 'unsupported' }
    return { kind: 'granted', handle: await pending }
  } catch (error) {
    return { kind: 'refused', reason: rejectionName(error) }
  }
}

/**
 * Intent: the request/release lifecycle shared by both locks. A request opens an attempt and asks
 * the browser; a second request before a release is a caller defect and throws. A release closes
 * the attempt: it gives a held lock back, aborts a pending one, and marks it so the lock the
 * browser grants late is given back on arrival (an orientation lock only when no newer request
 * wants it). A lock the browser drops on its own is never asked for again.
 */
// @spec-link [[rule_screen_wake_lock_during_session]]
// @spec-link [[rule_landscape_lock_during_session]]
function createHeldLock<H>(name: string, mechanism: LockMechanism<H>): HeldLock {
  let current: LockAttempt<H> | null = null

  /** Intent: settle an attempt with the browser's answer, giving back a lock granted too late. */
  function settle(attempt: LockAttempt<H>, answer: BrowserAnswer<H>): ScreenLockOutcome {
    attempt.settled = true
    if (answer.kind !== 'granted') return answer
    if (!attempt.released) {
      attempt.handle = answer.handle
      return { kind: 'held' }
    }
    if (mechanism.independentHandles || current === null) mechanism.giveBack(answer.handle)
    return { kind: 'released-before-grant' }
  }

  return {
    request: () => {
      if (current !== null) {
        throw new Error(`The ${name} was requested again before it was released.`)
      }
      const attempt: LockAttempt<H> = { released: false, settled: false, handle: null }
      current = attempt
      return askBrowser(mechanism).then((answer) => settle(attempt, answer))
    },
    release: () => {
      const attempt = current
      current = null
      if (attempt === null) return
      attempt.released = true
      if (!attempt.settled) mechanism.abortPending()
      if (attempt.handle === null) return
      mechanism.giveBack(attempt.handle)
      attempt.handle = null
    },
  }
}

/**
 * Intent: the screen wake lock over `navigator.wakeLock` (production passes the real navigator).
 * A pending request cannot be cancelled, so a sentinel granted after the release is released on
 * arrival; each sentinel is independent.
 */
// @spec-link [[rule_screen_wake_lock_during_session]]
export function createWebScreenWakeLock(navigatorPort: WakeLockNavigatorLike): ScreenWakeLock {
  const held = createHeldLock<WakeLockSentinelLike>('screen wake lock', {
    ask: () => navigatorPort.wakeLock?.request('screen') ?? null,
    giveBack: (sentinel) => void sentinel.release(),
    abortPending: () => undefined,
    independentHandles: true,
  })
  return { request: held.request, release: held.release }
}

/**
 * Intent: the landscape orientation lock over `screen.orientation` (production passes the real
 * screen). Without `orientation` or its `lock` the lock is unsupported; an unlock while a lock is
 * pending calls the browser's `unlock()` at once, which aborts that lock in the browser.
 */
// @spec-link [[rule_landscape_lock_during_session]]
export function createWebOrientationLock(screenPort: OrientationScreenLike): OrientationLock {
  const orientation = screenPort.orientation

  /** Intent: the browser's unlock, or nothing without one. */
  function unlockBrowser(): void {
    orientation?.unlock?.()
  }

  const held = createHeldLock<true>('landscape orientation lock', {
    ask: () => {
      if (orientation?.lock === undefined) return null
      return orientation.lock('landscape').then(() => true as const)
    },
    giveBack: unlockBrowser,
    abortPending: unlockBrowser,
    independentHandles: false,
  })
  return { lock: held.request, unlock: held.release }
}

/** Intent: the screen wake lock of this browser tab. */
// @spec-link [[rule_screen_wake_lock_during_session]]
export function createBrowserScreenWakeLock(): ScreenWakeLock {
  return createWebScreenWakeLock(navigator)
}

/** Intent: the landscape orientation lock of this browser tab. */
// @spec-link [[rule_landscape_lock_during_session]]
export function createBrowserOrientationLock(): OrientationLock {
  return createWebOrientationLock(screen)
}
