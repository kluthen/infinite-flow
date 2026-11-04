/**
 * One Idle pre-generation queue, whichever mode's it is: session mode's (./workspace-pregeneration.ts)
 * or Jam's (./jam-pregeneration.ts), each its own instance over its own source. While its source
 * says it may run, it runs the pure pre-generation plan's attempts one at a time on the generation
 * worker client, each under its own abort signal held in the Idle background slot, checks each
 * success's fit in the layout a session would hold now, and keeps the phrases that fit (phrases 2
 * to 5) in memory only. It plans them from its source's phrase 1 and the start its source builds
 * from it. It watches its source's key and discards on any change of it, re-checks the queue on
 * every staff layout report, window-width crossing and saved change to my instrument (one seen
 * while its source holds re-checks back, such as during a session, waits until it may run again),
 * and hands the queue to Start. A background attempt is never an Idle operation: it changes no
 * Idle state. While it may not run, the attempt in flight is aborted, the ready phrases are kept,
 * nothing new is prepared and nothing is discarded on its own; once it may run again it resumes
 * after the last ready phrase. The two queues share the one background slot; neither ever runs
 * while the other may, and a queue that launches while the other's attempt is still in the slot
 * (in the very tick the mode changes) aborts that attempt first. Loaded with the session
 * controller, outside the entry chunk.
 */
import { watch } from 'vue'

import type { PregenerationSlot } from '@/composables/generation-session-pregeneration'
import type { GenerationIntent } from '@/domain/generation/generation-intent'
import type { GenerationOutcome } from '@/domain/generation/orchestration/orchestration-types'
import type { InstrumentClef } from '@/domain/profile/instrument-clef'
import {
  GenerationWorkerCrashError,
  GenerationWorkerTransportError,
} from '@/generation-worker/generation-worker-client'
import type { StaffLayout } from '@/notation/notation-layout-policy'
import type { StaffLayoutInputs } from '@/notation/staff-fit-types'
import type { WindowShapeReading } from '@/session/session-browser-ports'
import {
  createPregenerationPlan,
  revalidatedReadyPhrases,
  type PregenerationAttempt,
  type PregenerationPlan,
  type PregenerationResult,
  type PregenerationSeams,
  type PregenerationStart,
} from '@/session/session-pregeneration'
import type { ReadyPhrase } from '@/session/session-ready-phrases'
import { sessionLayoutAtStart } from '@/session/session-window'
import { fitsHeldLayout, writtenPhraseOf } from './held-layout-fit'
import type { IdleLayoutPort } from './idle-layout-gate'
import type { WorkspacePregenerationPolicy } from './prewarm-policy'
import type { StaffFitPlanner } from './workspace-session-controller-seams'

/** What the workspace composition binds: the worker client's seam, the slot and the policy. */
// @spec-link [[module_idle_pregeneration_queue]]
export interface PregenerationWorkspaceSeams extends PregenerationSeams {
  /** The generation worker client's `generate`; each background attempt passes its signal. */
  readonly generate: (intent: GenerationIntent, signal: AbortSignal) => Promise<GenerationOutcome>
  readonly slot: PregenerationSlot
  readonly policy: WorkspacePregenerationPolicy
}

/** One queue, as its holder holds it for its life. */
// @spec-link [[module_idle_pregeneration_queue]]
export interface WorkspacePregeneration {
  /**
   * Start's take: abort the attempt in flight and give the ready phrases, from phrase 2, up to the
   * first that does not fit `heldLayout` at the staff's latest inputs, synchronously. The queue
   * keeps them, so a count-in that ends back at Idle on the same phrase 1 reuses them.
   */
  readonly take: (heldLayout: StaffLayout) => readonly ReadyPhrase[]
  /** Re-check the ready phrases against the window and the layout a session would hold now. */
  readonly recheck: () => void
  /** Abort the attempt in flight and stop watching; call once. */
  readonly dispose: () => void
}

/**
 * What one queue is planned, run and keyed from, every reading current when called and reactive:
 * its phrase 1 (none: nothing to plan from), the parts of its key (any change of one discards),
 * whether it may run now and whether a re-check must wait until it may run again, the plan's start
 * from its phrase 1, the tempo in effect, the clef a session would draw its phrases in, whether the
 * window is below the tablet-landscape width, and my instrument, whose saved change re-checks.
 */
export interface PregenerationQueueSource<TPhraseOne> {
  readonly phraseOne: () => TPhraseOne | null
  readonly key: readonly (() => unknown)[]
  readonly runnable: () => boolean
  readonly recheckWaits: () => boolean
  readonly startOf: (phraseOne: TPhraseOne) => PregenerationStart
  readonly tempo: () => number
  readonly clef: () => InstrumentClef
  readonly belowTabletLandscape: () => boolean
  readonly myInstrument: () => unknown
}

/**
 * Everything one queue is built from: the composition's seams, its source, the window's shape,
 * the staff's latest layout inputs and their observer, the staff planner's loader, and where a
 * programming error is reported.
 */
export interface PregenerationQueueDependencies<TPhraseOne> extends PregenerationWorkspaceSeams {
  readonly source: PregenerationQueueSource<TPhraseOne>
  readonly windowShape: () => WindowShapeReading
  readonly idleLayout: Pick<IdleLayoutPort, 'latestInputs' | 'observeInputs'>
  readonly loadPlanner: () => Promise<StaffFitPlanner>
  readonly fail: (error: unknown) => void
}

/** One background attempt in flight: its abort controller and the release of its slot. */
interface Flight {
  readonly controller: AbortController
  release: () => void
}

/** Intent: whether a generate rejection is a worker failure, a failed attempt as in a session. */
function isWorkerFailure(error: unknown): boolean {
  return (
    error instanceof GenerationWorkerCrashError || error instanceof GenerationWorkerTransportError
  )
}

/**
 * Intent: the ready phrases with their intents at `tempo`. Tempo never affects generation and a
 * session's requests carry its starting tempo, so a ready phrase made before a tempo change is the
 * very phrase the session would build now: its intent is stamped with the tempo, nothing else.
 */
// @spec-link [[rule_pregeneration_discarded_on_change]]
function atTempo(readyPhrases: readonly ReadyPhrase[], tempo: number): readonly ReadyPhrase[] {
  return readyPhrases.map((ready) =>
    ready.intent.controls.tempo === tempo
      ? ready
      : { ...ready, intent: { ...ready.intent, controls: { ...ready.intent.controls, tempo } } },
  )
}

/** Intent: a queue under a disabled policy: it never runs, and Start takes nothing. */
function disabledPregeneration(): WorkspacePregeneration {
  return { take: () => [], recheck: () => undefined, dispose: () => undefined }
}

/**
 * Intent: build one queue and start it: it runs at once if its source says it may. A disabled
 * policy builds one that never runs. A programming error met while it runs (an unexpected
 * rejection, or a plan that cannot be built or stepped, a carry-in error included) goes to `fail`,
 * the attempt in flight aborted and the queue emptied; it then stays stopped, Start taking
 * nothing, until its key next changes. A layout re-check asked for while its source holds
 * re-checks back re-checks nothing then: it runs once the queue may run again.
 */
// @spec-link [[module_idle_pregeneration_queue]]
// @spec-link [[rule_pregeneration_discarded_on_change]]
// @spec-link [[rule_start_never_waits_for_pregeneration]]
// @spec-link [[module_generation_worker_cancellation]]
export function createPregenerationQueue<TPhraseOne>(
  deps: PregenerationQueueDependencies<TPhraseOne>,
): WorkspacePregeneration {
  if (deps.policy === 'disabled') return disabledPregeneration()
  if (deps.policy !== 'enabled') throw new Error(`pre-generation: unknown policy ${deps.policy}`)
  const { source } = deps
  const seams: PregenerationSeams = { providers: deps.providers, viewport: deps.viewport }
  let ready: readonly ReadyPhrase[] = []
  let flight: Flight | null = null
  let exhausted = false
  let planner: StaffFitPlanner | null = null
  let stalled = false
  let disposed = false
  /** A layout re-check was asked for while re-checks waited; it runs once the queue may run. */
  let recheckOnIdle = false

  /** Intent: the source's phrase 1; asking with none is a defect (the queue is emptied with it). */
  function phraseOne(): TPhraseOne {
    const current = source.phraseOne()
    if (current === null) throw new Error('pre-generation: no phrase 1 to plan from')
    return current
  }

  /**
   * Intent: the staff's latest layout inputs. Every run condition holding means phrase 1 was fit
   * and drawn, which takes the staff's inputs, and a phrase is ready only once checked against
   * them, so none at a check is a defect.
   */
  function requireInputs(): StaffLayoutInputs {
    const inputs = deps.idleLayout.latestInputs()
    if (inputs === null) throw new Error('pre-generation: the staff never reported its layout')
    return inputs
  }

  /** Intent: the layout a session started now would hold, from the window's shape now. */
  function layoutNow(): StaffLayout {
    const shape = deps.windowShape()
    return sessionLayoutAtStart(shape.widthPx, shape.remPx)
  }

  /** Intent: the longest prefix of `list` whose phrases all fit `heldLayout` now. */
  function fittingPrefix(list: readonly ReadyPhrase[], heldLayout: StaffLayout) {
    if (list.length === 0) return list
    if (planner === null) throw new Error('pre-generation: ready phrases with no staff planner')
    const plan = planner
    const inputs = requireInputs()
    const first = list.findIndex(
      (entry) => !fitsHeldLayout(plan, writtenPhraseOf(entry, source.clef()), heldLayout, inputs),
    )
    return first === -1 ? list : list.slice(0, first)
  }

  /** Intent: the ready phrases that still re-derive identically and fit, in order, now. */
  function keptReady(): readonly ReadyPhrase[] {
    if (ready.length === 0) return ready
    const current = atTempo(ready, source.tempo())
    const start = source.startOf(phraseOne())
    return fittingPrefix(revalidatedReadyPhrases(seams, start, current), layoutNow())
  }

  /** Intent: abort `aborted` if it is the attempt in flight, and empty the slot of it. */
  function abortFlight(aborted: Flight | null = flight): void {
    if (aborted === null || aborted !== flight) return
    flight = null
    aborted.release()
    aborted.controller.abort()
  }

  /**
   * Intent: stop on a programming error until the key changes, the attempt in flight aborted and
   * the queue emptied, and report it.
   */
  function breakDown(error: unknown): void {
    stalled = true
    abortFlight()
    ready = []
    deps.fail(error)
  }

  /** Intent: run `step`, which builds or steps the plan: any error in it stops it and is reported. */
  function guarded(step: () => void): void {
    try {
      step()
    } catch (error: unknown) {
      breakDown(error)
    }
  }

  /**
   * Intent: one attempt's result, or undefined once it is aborted, whatever it settles with: a
   * worker failure is a crash, a failed generation its code, and a success fits or not in the
   * layout a session would hold now. Any other rejection is a programming error and rejects.
   */
  // @spec-link [[module_generation_worker_cancellation]]
  async function resultOf(
    current: Flight,
    attempt: PregenerationAttempt,
  ): Promise<PregenerationResult | undefined> {
    const { signal } = current.controller
    let outcome: GenerationOutcome
    try {
      outcome = await deps.generate(attempt.intent, signal)
    } catch (error: unknown) {
      if (signal.aborted) return undefined
      if (isWorkerFailure(error)) return { kind: 'crash' }
      throw error
    }
    if (signal.aborted) return undefined
    if (outcome.kind === 'generation_failure')
      return { kind: 'generation-failure', code: outcome.code }
    const plan = planner ?? (planner = await deps.loadPlanner())
    if (signal.aborted) return undefined
    const written = writtenPhraseOf({ intent: attempt.intent, outcome }, source.clef())
    const fits = fitsHeldLayout(plan, written, layoutNow(), requireInputs())
    return fits ? { kind: 'fits', outcome } : { kind: 'not-fitting' }
  }

  /**
   * Intent: post the plan's attempt under a fresh abort signal held in the slot. The other queue's
   * attempt still in the slot, from the very tick its mode stopped showing, is aborted first: the
   * slot holds one attempt, and only this queue may run now.
   */
  // @spec-link [[rule_pregeneration_yields_to_player]]
  function launch(plan: PregenerationPlan, attempt: PregenerationAttempt): void {
    const current: Flight = { controller: new AbortController(), release: () => undefined }
    deps.slot.yieldToPlayer()
    current.release = deps.slot.hold(() => abortFlight(current))
    flight = current
    resultOf(current, attempt).then(
      (result) => {
        if (result !== undefined && flight === current)
          guarded(() => advance(current, plan, result))
      },
      (error: unknown) => {
        if (flight === current) breakDown(error)
      },
    )
  }

  /** Intent: take an attempt's result into the plan and post its next attempt, if any. */
  function advance(done: Flight, plan: PregenerationPlan, result: PregenerationResult): void {
    flight = null
    done.release()
    const next = plan.after(result)
    ready = next.readyPhrases
    if (next.stopped === 'ladder-exhausted') exhausted = true
    if (next.attempt !== undefined) launch(next, next.attempt)
  }

  /**
   * Intent: start the next attempt when nothing is in flight, the queue may run and the plan has
   * one: after the ready phrases still kept, re-validated and re-checked first unless `checked`
   * says the caller just did.
   */
  function pump(checked = false): void {
    if (stalled || disposed || flight !== null || exhausted) return
    if (!source.runnable()) return
    if (!checked) ready = keptReady()
    const plan = createPregenerationPlan(seams, source.startOf(phraseOne()), ready)
    if (plan.attempt !== undefined) launch(plan, plan.attempt)
  }

  /**
   * Intent: the window re-check: truncate the queue at its first phrase that no longer re-derives
   * or fits; abort the attempt in flight when the queue shrank or `staleFlight` (a width crossing
   * may have changed its request), then resume. A phrase that stopped the plan is tried again.
   * While re-checks wait (a session runs, or the queue's mode is held), it re-checks nothing and
   * leaves the ready phrases as they are: it runs once the queue may run again.
   */
  // @spec-link [[rule_pregeneration_discarded_on_change]]
  function reconsider(staleFlight: boolean): void {
    if (stalled || disposed) return
    if (source.recheckWaits()) {
      recheckOnIdle = true
      return
    }
    recheckOnIdle = false
    exhausted = false
    const before = ready.length
    ready = keptReady()
    if (staleFlight || ready.length < before) abortFlight()
    pump(true)
  }

  /**
   * Intent: a change of the queue's key, seen as it happens, so no phrase made for an old key is
   * ever kept or checked: abort, empty the queue, and start again once the change is over (an
   * Idle action may change several parts of the key in a row).
   */
  // @spec-link [[rule_pregeneration_discarded_on_change]]
  function discard(): void {
    abortFlight()
    ready = []
    exhausted = false
    stalled = false
    recheckOnIdle = false
    queueMicrotask(() => guarded(() => pump()))
  }

  const stops = [
    watch(source.runnable, (eligible) => {
      if (!eligible) abortFlight()
      else guarded(() => (recheckOnIdle ? reconsider(false) : pump()))
    }),
    watch([...source.key], discard, { flush: 'sync' }),
    watch(source.belowTabletLandscape, () => guarded(() => reconsider(true))),
    deps.idleLayout.observeInputs(() => guarded(() => reconsider(false))),
    // A saved change to my instrument may change the staff's shared size or the clef a session
    // draws in, without changing phrase 1: the ready phrases are checked again, as at a window
    // change (a change that replaces phrase 1 discards them through the key watcher).
    watch(source.myInstrument, () => guarded(() => reconsider(false))),
  ]
  guarded(() => pump())

  return {
    take: (heldLayout) => {
      if (disposed) throw new Error('pre-generation: disposed')
      abortFlight()
      // A start that ends, or fails, within this same task changes no run condition once the
      // watchers run: look again once it is over.
      queueMicrotask(() => guarded(() => pump()))
      ready = fittingPrefix(atTempo(ready, source.tempo()), heldLayout)
      return ready
    },
    recheck: () => guarded(() => reconsider(false)),
    dispose: () => {
      if (disposed) throw new Error('pre-generation: disposed twice')
      disposed = true
      abortFlight()
      for (const stop of stops) stop()
    },
  }
}
