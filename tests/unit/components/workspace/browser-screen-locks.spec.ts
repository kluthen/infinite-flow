/**
 * The browser adapters of the session's two screen locks, on hand-rolled stand-ins of
 * `navigator.wakeLock` and `screen.orientation`: a granted lock is held until released, a refused,
 * throwing or missing API is an outcome value and never an error, a release with nothing held does
 * nothing, and a lock granted after its release is given back at once, so no lock outlives an end.
 * A wake lock the browser drops on its own while the session's lock is open and the page visible
 * is asked for again, silently.
 */
import { describe, expect, it } from 'vitest'

import {
  createWebOrientationLock,
  createWebScreenWakeLock,
  type ScreenOrientationLike,
  type VisibilityDocumentLike,
  type WakeLockNavigatorLike,
  type WakeLockSentinelLike,
} from '@/components/workspace/browser-screen-locks'

/** A promise and the functions that settle it, for a browser answer a test controls. */
interface Deferred<T> {
  readonly promise: Promise<T>
  readonly resolve: (value: T) => void
  readonly reject: (error: unknown) => void
}

/** Intent: a promise the test settles by hand. */
function deferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void
  let reject!: (error: unknown) => void
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

/** A stand-in wake lock sentinel that counts its releases and can be dropped by the browser. */
interface StandInSentinel extends WakeLockSentinelLike {
  readonly releases: () => number
  /** The browser drops the lock on its own: the sentinel fires `release`. */
  readonly drop: () => void
}

/**
 * Intent: a sentinel the browser would hand out, counting `release()` calls. Like a real one, it
 * fires `release` to its listeners when released, whether by the app or dropped by the browser.
 */
function standInSentinel(): StandInSentinel {
  let releases = 0
  const listeners = new Set<() => void>()
  const fireRelease = (): void => {
    for (const listener of [...listeners]) listener()
  }
  return {
    release: () => {
      releases += 1
      fireRelease()
      return Promise.resolve()
    },
    addEventListener: (_type, listener) => {
      listeners.add(listener)
    },
    removeEventListener: (_type, listener) => {
      listeners.delete(listener)
    },
    releases: () => releases,
    drop: fireRelease,
  }
}

/** Intent: a page whose visibility the test sets, visible to begin with. */
function standInDocument(): { visibilityState: DocumentVisibilityState } {
  return { visibilityState: 'visible' }
}

/** A visible page, for the tests where visibility plays no part. */
const visiblePage: VisibilityDocumentLike = { visibilityState: 'visible' }

/** Intent: let every browser answer already given reach the adapter. */
function settleAnswers(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0))
}

/** A stand-in navigator with a wake lock that answers each request with `answer()`. */
interface StandInWakeLockNavigator {
  readonly navigator: WakeLockNavigatorLike
  readonly requests: string[]
}

/** Intent: a navigator whose `wakeLock.request` records its type and answers with `answer()`. */
function wakeLockNavigator(answer: () => Promise<WakeLockSentinelLike>): StandInWakeLockNavigator {
  const requests: string[] = []
  return {
    requests,
    navigator: {
      wakeLock: {
        request: (type) => {
          requests.push(type)
          return answer()
        },
      },
    },
  }
}

// @test-link [[rule_screen_wake_lock_during_session]]
describe('createWebScreenWakeLock', () => {
  // @test-link [[rule_screen_wake_lock_during_session]]
  it('asks for a screen lock within the request call, holds it, and releases it once', async () => {
    const sentinel = standInSentinel()
    const browser = wakeLockNavigator(() => Promise.resolve(sentinel))
    const wakeLock = createWebScreenWakeLock(browser.navigator, visiblePage)

    const outcome = wakeLock.request()
    expect(browser.requests).toEqual(['screen'])
    expect(await outcome).toEqual({ kind: 'held' })
    expect(sentinel.releases()).toBe(0)

    wakeLock.release()
    wakeLock.release()
    expect(sentinel.releases()).toBe(1)
  })

  // @test-link [[rule_screen_wake_lock_during_session]]
  it('reads a rejected request as refused, without throwing, and releases nothing', async () => {
    const browser = wakeLockNavigator(() =>
      Promise.reject(new DOMException('battery saver', 'NotAllowedError')),
    )
    const wakeLock = createWebScreenWakeLock(browser.navigator, visiblePage)

    expect(await wakeLock.request()).toEqual({ kind: 'refused', reason: 'NotAllowedError' })
    expect(() => wakeLock.release()).not.toThrow()
  })

  // @test-link [[rule_screen_wake_lock_during_session]]
  it('reads a browser without the Wake Lock API as unsupported, asking nothing', async () => {
    const wakeLock = createWebScreenWakeLock({}, visiblePage)

    expect(await wakeLock.request()).toEqual({ kind: 'unsupported' })
    expect(() => wakeLock.release()).not.toThrow()
  })

  // @test-link [[rule_screen_wake_lock_during_session]]
  it('does nothing on a release with no lock requested', () => {
    const browser = wakeLockNavigator(() => Promise.resolve(standInSentinel()))
    const wakeLock = createWebScreenWakeLock(browser.navigator, visiblePage)

    expect(() => wakeLock.release()).not.toThrow()
    expect(browser.requests).toEqual([])
  })

  // @test-link [[rule_screen_wake_lock_during_session]]
  it('gives back at once a lock granted after its release, so it is not held after the end', async () => {
    const answer = deferred<WakeLockSentinelLike>()
    const sentinel = standInSentinel()
    const wakeLock = createWebScreenWakeLock(
      wakeLockNavigator(() => answer.promise).navigator,
      visiblePage,
    )

    const outcome = wakeLock.request()
    wakeLock.release()
    expect(sentinel.releases()).toBe(0)
    answer.resolve(sentinel)

    expect(await outcome).toEqual({ kind: 'released-before-grant' })
    expect(sentinel.releases()).toBe(1)
  })

  // @test-link [[rule_screen_wake_lock_during_session]]
  it('throws on a second request before a release, and asks again after one', async () => {
    const browser = wakeLockNavigator(() => Promise.resolve(standInSentinel()))
    const wakeLock = createWebScreenWakeLock(browser.navigator, visiblePage)

    await wakeLock.request()
    expect(() => wakeLock.request()).toThrow(/requested again before it was released/)
    wakeLock.release()

    expect(await wakeLock.request()).toEqual({ kind: 'held' })
    expect(browser.requests).toEqual(['screen', 'screen'])
  })
  // @test-link [[rule_screen_wake_lock_during_session]]
  it('asks again, silently, for a lock the browser drops while the page is visible', async () => {
    const sentinels = [standInSentinel(), standInSentinel(), standInSentinel()]
    let asked = 0
    const browser = wakeLockNavigator(() => Promise.resolve(sentinels[asked++]!))
    const wakeLock = createWebScreenWakeLock(browser.navigator, standInDocument())

    expect(await wakeLock.request()).toEqual({ kind: 'held' })
    sentinels[0]!.drop()
    expect(browser.requests).toEqual(['screen', 'screen'])
    await settleAnswers()

    sentinels[1]!.drop()
    expect(browser.requests).toEqual(['screen', 'screen', 'screen'])
    await settleAnswers()

    wakeLock.release()
    expect(sentinels.map((sentinel) => sentinel.releases())).toEqual([0, 0, 1])
    expect(browser.requests).toHaveLength(3)
  })

  // @test-link [[rule_screen_wake_lock_during_session]]
  it('does not ask again for a lock the browser drops while the page is hidden', async () => {
    const sentinel = standInSentinel()
    const browser = wakeLockNavigator(() => Promise.resolve(sentinel))
    const page = standInDocument()
    const wakeLock = createWebScreenWakeLock(browser.navigator, page)

    await wakeLock.request()
    page.visibilityState = 'hidden'
    sentinel.drop()
    await settleAnswers()

    expect(browser.requests).toEqual(['screen'])
    wakeLock.release()
    expect(sentinel.releases()).toBe(0)
  })

  // @test-link [[rule_screen_wake_lock_during_session]]
  it('does not ask again once the app has released the lock', async () => {
    const sentinel = standInSentinel()
    const browser = wakeLockNavigator(() => Promise.resolve(sentinel))
    const wakeLock = createWebScreenWakeLock(browser.navigator, standInDocument())

    await wakeLock.request()
    wakeLock.release()
    sentinel.drop()
    await settleAnswers()

    expect(sentinel.releases()).toBe(1)
    expect(browser.requests).toEqual(['screen'])
  })

  // @test-link [[rule_screen_wake_lock_during_session]]
  it('takes a refused second ask silently, and does not ask a third time', async () => {
    const sentinel = standInSentinel()
    const answers = [
      () => Promise.resolve<WakeLockSentinelLike>(sentinel),
      () => Promise.reject(new DOMException('battery saver', 'NotAllowedError')),
    ]
    let asked = 0
    const browser = wakeLockNavigator(() => answers[asked++]!())
    const wakeLock = createWebScreenWakeLock(browser.navigator, standInDocument())

    await wakeLock.request()
    sentinel.drop()
    await settleAnswers()

    expect(browser.requests).toEqual(['screen', 'screen'])
    expect(() => wakeLock.release()).not.toThrow()
    expect(sentinel.releases()).toBe(0)
  })

  // @test-link [[rule_screen_wake_lock_during_session]]
  it('gives back at once a lock asked for again and granted after the release', async () => {
    const first = standInSentinel()
    const second = standInSentinel()
    const lateAnswer = deferred<WakeLockSentinelLike>()
    const answers = [() => Promise.resolve<WakeLockSentinelLike>(first), () => lateAnswer.promise]
    let asked = 0
    const browser = wakeLockNavigator(() => answers[asked++]!())
    const wakeLock = createWebScreenWakeLock(browser.navigator, standInDocument())

    await wakeLock.request()
    first.drop()
    wakeLock.release()
    lateAnswer.resolve(second)
    await settleAnswers()

    expect(browser.requests).toEqual(['screen', 'screen'])
    expect(second.releases()).toBe(1)
    second.drop()
    await settleAnswers()
    expect(browser.requests).toHaveLength(2)
  })
})

/** A stand-in `screen.orientation` that records its calls and answers `lock` with `answer()`. */
interface StandInOrientation {
  readonly orientation: ScreenOrientationLike
  readonly calls: string[]
}

/** Intent: an orientation whose `lock` records its type and answers with `answer()`. */
function standInOrientation(answer: () => Promise<void>): StandInOrientation {
  const calls: string[] = []
  return {
    calls,
    orientation: {
      lock: (type) => {
        calls.push(`lock ${type}`)
        return answer()
      },
      unlock: () => {
        calls.push('unlock')
      },
    },
  }
}

// @test-link [[rule_landscape_lock_during_session]]
describe('createWebOrientationLock', () => {
  // @test-link [[rule_landscape_lock_during_session]]
  it('locks to landscape within the lock call, holds it, and unlocks once', async () => {
    const browser = standInOrientation(() => Promise.resolve())
    const lock = createWebOrientationLock({ orientation: browser.orientation })

    const outcome = lock.lock()
    expect(browser.calls).toEqual(['lock landscape'])
    expect(await outcome).toEqual({ kind: 'held' })

    lock.unlock()
    lock.unlock()
    expect(browser.calls).toEqual(['lock landscape', 'unlock'])
  })

  // @test-link [[rule_landscape_lock_during_session]]
  it('reads a rejected lock (outside fullscreen) as refused, and unlocks nothing', async () => {
    const browser = standInOrientation(() =>
      Promise.reject(new DOMException('not fullscreen', 'NotSupportedError')),
    )
    const lock = createWebOrientationLock({ orientation: browser.orientation })

    expect(await lock.lock()).toEqual({ kind: 'refused', reason: 'NotSupportedError' })
    lock.unlock()
    expect(browser.calls).toEqual(['lock landscape'])
  })

  // @test-link [[rule_landscape_lock_during_session]]
  it('reads a lock call that throws as refused, without throwing', async () => {
    const lock = createWebOrientationLock({
      orientation: {
        lock: () => {
          throw new TypeError('lock is not available')
        },
        unlock: () => undefined,
      },
    })

    expect(await lock.lock()).toEqual({ kind: 'refused', reason: 'TypeError' })
  })

  // @test-link [[rule_landscape_lock_during_session]]
  it('reads a missing Screen Orientation API, or one without lock, as unsupported', async () => {
    const noOrientation = createWebOrientationLock({})
    const noLock = createWebOrientationLock({ orientation: { unlock: () => undefined } })

    expect(await noOrientation.lock()).toEqual({ kind: 'unsupported' })
    expect(await noLock.lock()).toEqual({ kind: 'unsupported' })
    expect(() => noOrientation.unlock()).not.toThrow()
    expect(() => noLock.unlock()).not.toThrow()
  })

  // @test-link [[rule_landscape_lock_during_session]]
  it('does nothing on an unlock with no lock asked for', () => {
    const browser = standInOrientation(() => Promise.resolve())
    createWebOrientationLock({ orientation: browser.orientation }).unlock()
    expect(browser.calls).toEqual([])
  })

  // @test-link [[rule_landscape_lock_during_session]]
  it('unlocks at once on an unlock while pending, and again if the lock is then granted', async () => {
    const answer = deferred<void>()
    const browser = standInOrientation(() => answer.promise)
    const lock = createWebOrientationLock({ orientation: browser.orientation })

    const outcome = lock.lock()
    lock.unlock()
    expect(browser.calls).toEqual(['lock landscape', 'unlock'])
    answer.resolve()

    expect(await outcome).toEqual({ kind: 'released-before-grant' })
    expect(browser.calls).toEqual(['lock landscape', 'unlock', 'unlock'])
  })

  // @test-link [[rule_landscape_lock_during_session]]
  it('leaves a newer lock in place when a stale one is granted late', async () => {
    const answers = [deferred<void>(), deferred<void>()]
    let asked = 0
    const browser = standInOrientation(() => answers[asked++]!.promise)
    const lock = createWebOrientationLock({ orientation: browser.orientation })

    const stale = lock.lock()
    lock.unlock()
    const fresh = lock.lock()
    answers[0]!.resolve()
    expect(await stale).toEqual({ kind: 'released-before-grant' })
    answers[1]!.resolve()
    expect(await fresh).toEqual({ kind: 'held' })

    expect(browser.calls).toEqual(['lock landscape', 'unlock', 'lock landscape'])
  })
  // @test-link [[rule_landscape_lock_during_session]]
  it('never asks again for a held orientation lock on its own', async () => {
    const browser = standInOrientation(() => Promise.resolve())
    const lock = createWebOrientationLock({ orientation: browser.orientation })

    expect(await lock.lock()).toEqual({ kind: 'held' })
    await settleAnswers()

    expect(browser.calls).toEqual(['lock landscape'])
  })
})
