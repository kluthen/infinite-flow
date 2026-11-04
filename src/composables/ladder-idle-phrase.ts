/**
 * A phrase 1 at Idle written by climbing a ladder of attempts, apart from session mode's Idle
 * session: Jam mode's phrase 1 from a kept doodle (module_kept_doodle). It runs the Idle rules
 * session mode's phrase 1 runs, over a state of its own: the fit run (./generation-session-fit-
 * round.ts, over the ladder: a generation failure moves on to the next attempt, a too-wide phrase
 * is replaced on the same one), the notation actions (./generation-session-notation.ts) and the
 * room-notice reactions (./generation-session-room-notice.ts), against the staff it is drawn on.
 * It writes only when asked: afresh (the phrase shown goes, the room checked first), again after
 * what it is written from changed (the phrase kept on screen meanwhile, or by the room notice), on
 * Regenerate and Retry generation. A writing waits while a phrase is being drawn, which cannot be
 * dropped, and until the staff has reported its layout once since it appeared; clearing waits for
 * a drawing too. Nothing here reads a doodle, a setting or a window: the ladder and the seams do.
 */
import { readonly, shallowReactive, watch } from 'vue'

import type { GenerationIntent } from '@/domain/generation/generation-intent'
import type {
  StaffFitVerdict,
  StaffKeySignature,
  StaffRoomVerdict,
} from '@/notation/staff-fit-types'
import {
  createFitRunner,
  type FitRunLadder,
  type FitRunStart,
} from './generation-session-fit-round'
import { createNotationActions } from './generation-session-notation'
import {
  createRoomNoticeReactions,
  type StaffLayoutReports,
} from './generation-session-room-notice'
import type { IdlePhraseState, IdlePhraseStateView } from './generation-session-types'
import type { Seed } from '@/domain/random/seed'

/** What a ladder phrase 1 is generated, checked, drawn and seeded with. */
// @spec-link [[module_idle_fit_round]]
// @spec-link [[rule_held_doodle_phrase_one_at_idle]]
export interface LadderIdlePhraseOptions<TResult, TGenerated> {
  /** The ladder each writing climbs, read as its attempts begin. */
  readonly ladder: FitRunLadder
  readonly generate: (intent: GenerationIntent) => Promise<TGenerated>
  readonly checkFit: (generated: TGenerated) => Promise<StaffFitVerdict>
  readonly checkRoom: (signature: StaffKeySignature) => Promise<StaffRoomVerdict>
  /** The staff's layout reports: every Idle room rule hears them. */
  readonly staffLayout: StaffLayoutReports
  readonly notate: (result: TResult) => Promise<void>
  readonly clearPresentedPhrase: () => void
  /** The session seed of a published phrase 1, drawn once per publishing run. */
  readonly nextSessionSeed: () => Seed
  readonly withSessionSeed: (generated: TGenerated, sessionSeed: Seed) => TResult
  /** The key signature the next phrase would have, which sets the staff's fixed parts' width. */
  readonly keySignature: () => StaffKeySignature
  /** Told the intent of every attempt that ends published; nothing by default. */
  readonly onPublished?: (intent: GenerationIntent) => void
}

/** A ladder phrase 1 at Idle: its state, its writings and the actions on what it shows. */
// @spec-link [[module_idle_fit_round]]
export interface LadderIdlePhrase<TResult> {
  readonly state: IdlePhraseStateView<TResult>
  /** Write phrase 1 afresh: the phrase shown goes, and the room is checked first. */
  readonly write: () => void
  /**
   * Write it again now that what it is written from changed: the phrase shown stays during the
   * Loading; under the room notice, by the notice's own rule (a round, or a room check first).
   */
  readonly rewrite: () => void
  /** `Regenerate phrase`, at idle only: a new phrase 1, the one shown kept meanwhile. */
  readonly regenerate: () => Promise<boolean>
  /** `Retry generation`, at idle after a generation failure only: written again from the ladder. */
  readonly retryGeneration: () => Promise<boolean>
  /** `Retry notation`, at idle after a notation failure only: the same phrase drawn again. */
  readonly retryNotation: () => Promise<boolean>
  /** A notation failure of the phrase on screen raised outside a run (a resize's redraw). */
  readonly reportNotationFailure: (error: Error) => boolean
  /** A redraw outside a run that succeeded after such a failure. */
  readonly reportNotationRecovered: () => boolean
  /** Stop any writing and show no phrase: the phrase, the notice and both errors go. */
  readonly clear: () => void
  /** The staff it is drawn on left: the next writing waits for its layout once it is back. */
  readonly staffGone: () => void
  readonly dispose: () => void
}

/** Intent: the state of a phrase 1 at Idle before anything is written: idle, nothing shown. */
function emptyState<TResult>(): IdlePhraseState<TResult> {
  return {
    latestIntent: null,
    result: null,
    operation: 'idle',
    generationError: null,
    notationError: null,
    resultEngraved: false,
    roomNotice: null,
    retriesRunning: false,
    roomNoticeAnnouncements: 0,
  }
}

/**
 * Intent: a phrase 1 at Idle written by climbing `options.ladder`. No rhythm combination ever
 * blocks it (its controls show no rhythm control), so it never gives way to Empty. A writing asked
 * for while a phrase is drawn, or before the staff has reported its layout, is owed, the latest
 * one asked for replacing any owed before it, and runs as soon as both allow.
 */
// @spec-link [[module_idle_fit_round]]
// @spec-link [[rule_held_doodle_phrase_one_at_idle]]
// @spec-link [[rule_jam_setting_change_rewrites_kept_phrase_one]]
export function createLadderIdlePhrase<TResult, TGenerated>(
  options: LadderIdlePhraseOptions<TResult, TGenerated>,
): LadderIdlePhrase<TResult> {
  const state = shallowReactive<IdlePhraseState<TResult>>(emptyState())
  /** Intent: no rhythm combination blocks it: its controls show no rhythm control. */
  const notBlocked = (): boolean => false

  const notation = createNotationActions<TResult>({
    state,
    notate: options.notate,
    clearPresentedPhrase: options.clearPresentedPhrase,
    routeLayoutFailure: (error) => roomNotice.routeLayoutFailure(error),
  })

  const fitRunner = createFitRunner<TResult, TGenerated>({
    state,
    generate: options.generate,
    checkFit: options.checkFit,
    nextSessionSeed: options.nextSessionSeed,
    withSessionSeed: options.withSessionSeed,
    notate: options.notate,
    clearPresentedPhrase: options.clearPresentedPhrase,
    ladder: options.ladder,
    isBlocked: notBlocked,
    checkRoom: () => options.checkRoom(options.keySignature()),
    showEmpty: notation.clearPhrase,
    onPublished: (intent) => options.onPublished?.(intent),
  })

  const roomNotice = createRoomNoticeReactions<TResult>({
    state,
    checkRoom: options.checkRoom,
    staffLayout: options.staffLayout,
    fitRunner,
    currentSignature: options.keySignature,
    isBlocked: notBlocked,
    showEmpty: notation.clearPhrase,
  })

  /** Whether the staff has reported its layout since it appeared. */
  let laidOut = false
  /** The writing or clearing asked for while it could not run yet; null with none. */
  let owed: { readonly writes: boolean; readonly act: () => void } | null = null

  /** Intent: do `act` now if nothing holds it, else owe it, replacing whatever was owed. */
  function whenFree(writes: boolean, act: () => void): void {
    if (state.operation === 'notating' || (writes && !laidOut)) owed = { writes, act }
    else {
      owed = null
      act()
    }
  }

  /** Intent: the owed act, once a drawing has ended and, for a writing, the staff is laid out. */
  function payOwed(): void {
    if (owed === null || state.operation === 'notating' || (owed.writes && !laidOut)) return
    const { act } = owed
    owed = null
    act()
  }

  /** Intent: one fit run, its outcome left to the state. */
  function runFrom(start: FitRunStart): void {
    void fitRunner.run(start)
  }

  const stopWatching = watch(() => state.operation, payOwed)
  const stopHearingLayout = options.staffLayout.subscribe(() => {
    laidOut = true
    payOwed()
  })

  return {
    state: readonly(state) as IdlePhraseStateView<TResult>,
    write: () => whenFree(true, () => runFrom('fresh')),
    rewrite: () =>
      whenFree(true, () => {
        if (state.roomNotice !== null) roomNotice.afterGenerationSettingChange()
        else runFrom('keep_screen')
      }),
    regenerate: () => {
      if (state.operation !== 'idle' || !laidOut) return Promise.resolve(false)
      return fitRunner.run('keep_screen')
    },
    retryGeneration: () => {
      if (state.operation !== 'idle' || state.generationError === null) {
        return Promise.resolve(false)
      }
      return fitRunner.run('keep_screen')
    },
    retryNotation: notation.retryNotation,
    reportNotationFailure: notation.reportNotationFailure,
    reportNotationRecovered: notation.reportNotationRecovered,
    clear: () =>
      whenFree(false, () => {
        fitRunner.stop()
        notation.clearPhrase()
      }),
    staffGone: () => {
      laidOut = false
    },
    dispose: () => {
      stopWatching()
      stopHearingLayout()
      roomNotice.dispose()
    },
  }
}
