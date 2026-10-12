/**
 * A workspace session wired to fakes for the Idle fit-run specs: counted seed and request-id
 * providers, a counted session-seed provider (from 700) whose seeds the published intents are
 * logged with in `seeded` (the result itself stays the intent), a fake window width, fake
 * staff-fit seams, and a `generate` seam that returns the intent it was given (so each result
 * carries its own seed) unless the test takes over a call.
 * Every seam call lands in one ordered log, so a test can assert what happened in which order,
 * and every intent the fit run reports accepted lands in `accepted`.
 */
import { createGenerationSession } from '@/composables/use-generation-session'
import type { GenerationIntent } from '@/domain/generation/generation-intent'
import { makeRequestId } from '@/domain/generation/generation-request'
import { makeSeed, type Seed } from '@/domain/random/seed'
import type {
  StaffFitVerdict,
  StaffKeySignature,
  StaffRoomVerdict,
} from '@/notation/staff-fit-types'
import { createFakeStaffFit } from './fake-staff-fit'
import { createFakeViewportWidth } from './fake-viewport-width'

/** A promise a test settles by hand. */
export interface Deferred<T> {
  readonly promise: Promise<T>
  readonly resolve: (value: T) => void
  readonly reject: (reason?: unknown) => void
}

/** Intent: build a promise whose settlement the test controls. */
export function createDeferred<T>(): Deferred<T> {
  let resolve: (value: T) => void = () => undefined
  let reject: (reason?: unknown) => void = () => undefined
  const promise = new Promise<T>((promiseResolve, promiseReject) => {
    resolve = promiseResolve
    reject = promiseReject
  })
  return { promise, resolve, reject }
}

/** What a test may take over when it builds a fit session. */
export interface FitSessionOptions {
  readonly belowTabletLandscape?: boolean
  /** Answer one generate call instead of echoing its intent; return undefined to echo it. */
  readonly generate?: (intent: GenerationIntent) => Promise<GenerationIntent> | undefined
  /** Answer one fit check instead of the fake's queue; return undefined to use the queue. */
  readonly checkFit?: (result: GenerationIntent) => Promise<StaffFitVerdict> | undefined
  /** Answer one room check instead of the fake's verdict; return undefined to use the verdict. */
  readonly checkRoom?: (signature: StaffKeySignature) => Promise<StaffRoomVerdict> | undefined
  /** Settle one notate call instead of succeeding; return undefined to succeed. */
  readonly notate?: (result: GenerationIntent) => Promise<void> | undefined
}

/** Intent: build one fit session and the fakes and log that observe it. */
export function createFitSession(options: FitSessionOptions = {}) {
  const viewport = createFakeViewportWidth(options.belowTabletLandscape ?? false)
  const staff = createFakeStaffFit<GenerationIntent>()
  const log: string[] = []
  const counts = { id: 0, seed: 0 }
  const generated: GenerationIntent[] = []
  const notated: GenerationIntent[] = []
  const accepted: GenerationIntent[] = []
  const sessionSeeds: Seed[] = []
  const seeded: { readonly result: GenerationIntent; readonly sessionSeed: Seed }[] = []
  const session = createGenerationSession<GenerationIntent>({
    providers: {
      nextRequestId: () => makeRequestId(`fit-${++counts.id}`),
      nextSeed: () => makeSeed(++counts.seed),
    },
    nextSessionSeed: () => {
      const sessionSeed = makeSeed(700 + sessionSeeds.length)
      sessionSeeds.push(sessionSeed)
      return sessionSeed
    },
    withSessionSeed: (result, sessionSeed) => {
      seeded.push({ result, sessionSeed })
      return result
    },
    viewport,
    generate: (intent) => {
      log.push(`generate:${intent.seed}`)
      generated.push(intent)
      return options.generate?.(intent) ?? Promise.resolve(intent)
    },
    checkFit: (result) => {
      log.push(`check:${result.seed}`)
      return options.checkFit?.(result) ?? staff.checkFit(result)
    },
    checkRoom: (signature) => options.checkRoom?.(signature) ?? staff.checkRoom(signature),
    staffLayout: staff.staffLayout,
    notate: (result) => {
      log.push(`notate:${result.seed}`)
      notated.push(result)
      return options.notate?.(result) ?? Promise.resolve()
    },
    clearPresentedPhrase: () => {
      log.push('clear')
    },
    onPhraseAccepted: (intent) => {
      accepted.push(intent)
    },
  })
  return {
    session,
    viewport,
    staff,
    log,
    counts,
    generated,
    notated,
    accepted,
    sessionSeeds,
    seeded,
  }
}

/** Intent: let every already-settled promise continuation run, so fire-and-forget work lands. */
export async function flushAsync(): Promise<void> {
  await new Promise<void>((resolve) => setTimeout(resolve, 0))
}
