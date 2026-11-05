/**
 * The shell's side of a Jam on the kept doodle (master spec C5.11, C5.13; the jam flow's "Jam on
 * the kept doodle"), and the one start `Start Jam` and the starting note take in Jam mode: with
 * no doodle kept, a fresh Jam's (./use-fresh-jam.ts); with one, a Jam on it, through the session
 * controller's start of a Jam on the kept doodle, a start as from Ready on Jam's phrase 1 written
 * from the kept doodle, at Jam's tempo now, with Jam's own queue's prepared phrases and no capture.
 * Then what its end leaves at Jam mode's Idle. Every end goes through the controller's one end
 * path. An end before phrase 1 sounds hands nothing: the doodle stays kept and Idle shows the same
 * phrase 1 again, nothing written. An end with a review hands the Jam part its review shows to
 * Jam's kept doodle (./use-fresh-jam.ts hands every Jam part on): the same doodle, now coming from
 * this session; here phrase 1 is then written again from it, once, with a fresh seed, out of sight
 * under the review. Session mode's Idle and its phrase are never touched. Jam's code is reached
 * through the workspace's hold on it only.
 */
import { watch } from 'vue'

import type { StaffLayout } from '@/notation/notation-layout-policy'
import type { ReadyPhrase } from '@/session/session-ready-phrases'
import type { JamKeptDoodle } from '@/jam/use-kept-doodle'
import type { JamKeptPhraseCue } from './use-jam-idle-cue'
import type { WorkspaceKeptDoodlePhrase } from './use-kept-doodle-phrase'
import type { SessionController, SessionEndSummary } from './workspace-session-controller-types'

/** What the shell's Jam on the kept doodle reads, every reading current when called. */
// @spec-link [[rule_jam_on_held_doodle_skips_capture]]
export interface KeptDoodleJamSeams {
  /** The loaded session controller; a start before it loads is a defect, so this throws. */
  readonly controller: () => SessionController
  /** The doodle Jam mode keeps; null when none is. */
  readonly kept: () => JamKeptDoodle | null
  /** Jam's phrase 1 at Idle written from the kept doodle: its state, its written phrase, a rewrite. */
  readonly phrase: Pick<WorkspaceKeptDoodlePhrase, 'state' | 'written' | 'writeAgain'>
  /** Jam's tempo now; null before Jam's settings exist. */
  readonly tempo: () => number | null
  /** The take of Jam's own queue's prepared phrases for the staff layout a session holds. */
  readonly take: (heldLayout: StaffLayout) => readonly ReadyPhrase[]
  /** The summary of the last session's end; null before any (and before the controller loads). */
  readonly lastEnd: () => SessionEndSummary | null
  /** Start a fresh Jam, the start with no doodle kept (./use-fresh-jam.ts). */
  readonly startFresh: () => void
}

/** The shell's Jam on the kept doodle: Jam mode's start, and phrase 1 as Jam's Idle cue reads it. */
// @spec-link [[rule_jam_on_held_doodle_skips_capture]]
export interface WorkspaceKeptDoodleJam {
  /**
   * Start the Jam `Start Jam` names now, synchronously inside the Start click or the starting
   * note's callback: on the kept doodle when one is kept, else a fresh Jam.
   */
  readonly start: () => void
  /** Phrase 1 written from the kept doodle, for Jam's Idle cue; null while none is kept. */
  readonly phraseCue: () => JamKeptPhraseCue | null
}

/**
 * Intent: whether an ended session was a Jam on the kept doodle that reached phrase 1: its end
 * hands a Jam part with no count-in its played notes count from.
 */
// @spec-link [[rule_jam_on_held_doodle_skips_capture]]
function endedJamOnKeptDoodle(end: SessionEndSummary | null): boolean {
  return end?.jam !== undefined && end.jam.part.countInStartAt === null
}

/**
 * Intent: the shell's Jam on the kept doodle over its seams. A start with no doodle kept is a
 * fresh Jam's. With one, a start (whose conditions the caller has judged: a controller connected
 * and phrase 1 shown with nothing running, failed or noticed on it) hands the controller phrase 1
 * with its written phrase, Jam's tempo, Jam's queue's take and the kept doodle (its suggestion,
 * decline and readings with it). An end with a review of a Jam on the kept doodle writes phrase 1
 * again from it, once; any other end writes nothing.
 */
// @spec-link [[rule_jam_on_held_doodle_skips_capture]]
// @spec-link [[rule_session_end_generates_next_phrase_one]]
// @spec-link [[module_kept_doodle]]
export function useKeptDoodleJam(seams: KeptDoodleJamSeams): WorkspaceKeptDoodleJam {
  /** Intent: start a Jam on the kept doodle: its phrase 1 written and Jam's tempo must be there. */
  function startOnKeptDoodle(kept: JamKeptDoodle): void {
    const phraseOne = seams.phrase.state.result
    const written = seams.phrase.written.value
    const tempo = seams.tempo()
    if (phraseOne === null || written === null || tempo === null) {
      throw new Error('workspace shell: a Jam on the kept doodle starts with no phrase 1 shown')
    }
    seams.controller().startOnKeptDoodle({
      phraseOne,
      tempo,
      written,
      take: seams.take,
      keptDoodle: {
        doodle: kept.doodle,
        captureTempo: kept.captureTempo,
        suggestion: kept.suggestion,
        suggestionDeclined: kept.suggestionDeclined,
        readings: kept.readings,
      },
    })
  }

  // Its end with a review: phrase 1 written again from the doodle kept, with a fresh seed.
  watch(
    seams.lastEnd,
    (end) => {
      if (endedJamOnKeptDoodle(end)) seams.phrase.writeAgain()
    },
    { flush: 'sync' },
  )

  return {
    start: () => {
      const kept = seams.kept()
      if (kept === null) seams.startFresh()
      else startOnKeptDoodle(kept)
    },
    phraseCue: () =>
      seams.kept() === null
        ? null
        : { state: seams.phrase.state, written: seams.phrase.written.value },
  }
}
