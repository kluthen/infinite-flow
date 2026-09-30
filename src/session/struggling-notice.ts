/**
 * The struggling-generator notice as a pure reducer over the session's decided phrases. Repeats
 * are counted consecutively in decision order: the second repeat in a row shows the notice when it
 * is decided, further repeats keep it, a generated phrase (carry-in or standalone) resets the count
 * and clears the notice when it starts sounding, and the end of the session clears it.
 */

import type { SessionOutput, SessionPhraseOrigin } from './session-types'

/** How many repeats in a row show the notice. */
// @spec-link [[rule_struggling_generator_notice]]
export const REPEATS_BEFORE_NOTICE = 2

/** The notice's state: the current run of consecutive repeats, and whether it is shown. */
// @spec-link [[rule_struggling_generator_notice]]
// @spec-link [[service_session_engine]]
export interface StrugglingNotice {
  readonly consecutiveRepeats: number
  readonly visible: boolean
}

/** A notice state together with the outputs its change produced. */
// @spec-link [[rule_struggling_generator_notice]]
export interface NoticeStep {
  readonly notice: StrugglingNotice
  readonly outputs: readonly SessionOutput[]
}

/** The notice at the start of a session: hidden, with no repeat counted. */
// @spec-link [[rule_struggling_generator_notice]]
export const NOTICE_AT_START: StrugglingNotice = Object.freeze({
  consecutiveRepeats: 0,
  visible: false,
})

/** Intent: whether a phrase of this origin was newly generated during the session. */
function isGenerated(origin: SessionPhraseOrigin): boolean {
  return origin === 'carry-in' || origin === 'standalone'
}

/**
 * Intent: account for one decided phrase: a repeat extends the run and shows the notice when the
 * run reaches two; a generated phrase ends the run and leaves the notice as it is until it sounds.
 */
// @spec-link [[rule_struggling_generator_notice]]
export function noticeOnDecision(
  notice: StrugglingNotice,
  origin: SessionPhraseOrigin,
): NoticeStep {
  if (origin !== 'repeat') return { notice: { ...notice, consecutiveRepeats: 0 }, outputs: [] }
  const consecutiveRepeats = notice.consecutiveRepeats + 1
  const shows = !notice.visible && consecutiveRepeats >= REPEATS_BEFORE_NOTICE
  return {
    notice: { consecutiveRepeats, visible: notice.visible || shows },
    outputs: shows ? [{ kind: 'struggling-notice', visible: true }] : [],
  }
}

/** Intent: clear a shown notice when a newly generated phrase starts sounding. */
// @spec-link [[rule_struggling_generator_notice]]
export function noticeOnSounding(
  notice: StrugglingNotice,
  origin: SessionPhraseOrigin,
): NoticeStep {
  if (!notice.visible || !isGenerated(origin)) return { notice, outputs: [] }
  return {
    notice: { ...notice, visible: false },
    outputs: [{ kind: 'struggling-notice', visible: false }],
  }
}

/** Intent: clear a shown notice when the session ends. */
// @spec-link [[rule_struggling_generator_notice]]
export function noticeAtEnd(notice: StrugglingNotice): readonly SessionOutput[] {
  return notice.visible ? [{ kind: 'struggling-notice', visible: false }] : []
}
