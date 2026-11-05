/**
 * The shell's side of the kept doodle's bar (`jam-bar`, flows/jam/handoff.md, Routing Rules; the
 * phrase workspace's handoff, The kept doodle's bar): Jam's bar component (src/jam/JamBar.vue,
 * reached through Jam's loaded code only) while a doodle is kept, given the kept doodle, Jam's key
 * and mode and the selected instrument (as a Jam session's Review reads them, through the
 * workspace's Jam ports, ./review-jam-ports.ts), whether phrase 1 is in Loading, and whether a
 * session runs (one started from the kept doodle: the bar is held still). What its buttons do:
 * `New doodle` lets the doodle go, unconfirmed (its phrase 1, its generation in flight and Jam's
 * prepared phrases go with it), then moves focus to `Start Jam`, or to `controller-status` when
 * `Start Jam` is disabled, never to `mode-switch`; nothing is announced. `Jam in {answer}` sets
 * Jam's written key and collection as the review's does, the doodle kept (phrase 1 is then written
 * again from it). `Keep {key} {mode}` declines the kept doodle's suggestion for good, and with the
 * kept session it comes from (in memory only while saving is off). The shell makes the workspace's
 * Jam ports and the bar over them in one call (`useJamPortsAndBar`), providing the ports to a Jam
 * session's Review.
 */
import { computed, nextTick, provide, type Component, type ComputedRef } from 'vue'

import type { QuantizedDoodle } from '@/domain/doodle/quantized-doodle'
import type { InstrumentProfile } from '@/domain/profile/instrument-profile'
import type { JamKeyAndMode } from '@/jam/key-suggestion/key-suggestion'

import type { JamModeModule } from './load-jam-mode'
import {
  REVIEW_JAM_PORTS,
  workspaceReviewJamPorts,
  type ReviewJamPorts,
  type WorkspaceReviewJamDependencies,
} from './review-jam-ports'
import type { WorkspaceKeptDoodle } from './use-kept-doodle-host'
import type { SessionController } from './workspace-session-controller-types'

/** What the bar is given: the kept doodle, its suggestion's inputs, and its buttons' states. */
// @spec-link [[module_kept_doodle]]
export interface JamBarProps {
  readonly doodle: QuantizedDoodle
  readonly jam: JamKeyAndMode
  readonly instrument: Pick<InstrumentProfile, 'transposition'>
  readonly declined: boolean
  /** Phrase 1 is being written from the doodle: its buttons are disabled. */
  readonly loading: boolean
  /** A session runs on the doodle: the bar is held still, its buttons disabled. */
  readonly held: boolean
}

/** The bar as the score panel draws it: Jam's component, its props and its listeners. */
// @spec-link [[module_kept_doodle]]
export interface JamBarView {
  readonly component: Component
  readonly props: JamBarProps
  readonly listeners: {
    readonly 'new-doodle': () => void
    readonly use: (answer: JamKeyAndMode) => void
    readonly keep: () => void
    readonly 'focus-session-action': () => void
  }
}

/** The header's parts `New doodle`'s focus move reads and reaches. */
export interface JamBarHeader {
  readonly sessionActionEnabled: boolean
  readonly focusSessionAction: () => void
  readonly focusControllerStatus: () => void
}

/** What the bar reads and acts through, every reading current when called. */
// @spec-link [[module_kept_doodle]]
export interface JamBarSeams {
  /** Jam's code, once loaded in this visit; null before. */
  readonly jamModule: () => JamModeModule | null
  readonly keptDoodle: Pick<WorkspaceKeptDoodle, 'kept' | 'letGo' | 'decline'>
  /** The workspace's Jam ports: Jam's key and mode, the instrument, and `Jam in {answer}`. */
  readonly ports: Pick<ReviewJamPorts, 'keyAndMode' | 'instrument' | 'useAnswer'>
  /** Phrase 1 from the kept doodle is in Loading. */
  readonly loading: () => boolean
  /** A session runs, count-in included. */
  readonly sessionActive: () => boolean
  /** The loaded session controller; asking before it loads is a defect. */
  readonly controller: () => SessionController
  /** The mounted header. */
  readonly header: () => JamBarHeader
}

/**
 * Intent: the kept doodle's bar while Jam's code has loaded and a doodle is kept; null otherwise,
 * so it leaves as the doodle is let go.
 */
// @spec-link [[module_kept_doodle]]
// @spec-link [[rule_held_doodle_dropped_on_change]]
// @spec-link [[rule_suggestion_use_it]]
// @spec-link [[rule_suggestion_keep_mine]]
export function useJamBar(seams: JamBarSeams): ComputedRef<JamBarView | null> {
  const { keptDoodle, ports } = seams

  /** Intent: `New doodle`: the doodle let go; focus to `Start Jam`, else `controller-status`. */
  // @spec-link [[rule_held_doodle_dropped_on_change]]
  function newDoodle(): void {
    keptDoodle.letGo()
    void nextTick(() => {
      const header = seams.header()
      if (header.sessionActionEnabled) header.focusSessionAction()
      else header.focusControllerStatus()
    })
  }

  /** Intent: `Jam in {answer}`: Jam's key and mode set as the review's sets them; doodle kept. */
  // @spec-link [[rule_suggestion_use_it]]
  function useAnswer(answer: JamKeyAndMode): void {
    const loaded = seams.jamModule()
    if (loaded === null) throw new Error("jam bar: Jam in {answer} before Jam's code loaded")
    ports.useAnswer(loaded, answer)
  }

  /** Intent: `Keep {key} {mode}`: declined for good, on the doodle and its kept session. */
  // @spec-link [[rule_suggestion_keep_mine]]
  function keep(): void {
    const kept = keptDoodle.kept.value
    if (kept === null) throw new Error('jam bar: Keep with no doodle kept')
    keptDoodle.decline()
    void seams.controller().declineSuggestion(kept.sessionKey)
  }

  const listeners = Object.freeze({
    'new-doodle': newDoodle,
    use: useAnswer,
    keep,
    // A session started from a focused bar button: focus on the session action, now `Stop`.
    'focus-session-action': () => seams.header().focusSessionAction(),
  })

  return computed((): JamBarView | null => {
    const loaded = seams.jamModule()
    const kept = keptDoodle.kept.value
    if (loaded === null || kept === null) return null
    return {
      component: loaded.JamBar,
      props: {
        doodle: kept.doodle,
        jam: ports.keyAndMode(loaded),
        instrument: ports.instrument(),
        declined: kept.suggestionDeclined,
        loading: seams.loading(),
        held: seams.sessionActive(),
      },
      listeners,
    }
  })
}

/** What the workspace's Jam ports and the bar over them are made from. */
// @spec-link [[module_kept_doodle]]
export interface JamPortsAndBarSeams
  extends
    Omit<WorkspaceReviewJamDependencies, 'keptDoodleSession' | 'keepDoodle' | 'declineKeptDoodle'>,
    Omit<JamBarSeams, 'ports' | 'keptDoodle'> {
  readonly keptDoodle: Pick<WorkspaceKeptDoodle, 'kept' | 'keep' | 'letGo' | 'decline'>
}

/**
 * Intent: the workspace's Jam ports over the kept doodle, provided to a Jam session's Review
 * (`REVIEW_JAM_PORTS`), and the kept doodle's bar over the same ports. Called in a setup.
 */
// @spec-link [[module_kept_doodle]]
export function useJamPortsAndBar(seams: JamPortsAndBarSeams): ComputedRef<JamBarView | null> {
  const { keptDoodle } = seams
  const ports = workspaceReviewJamPorts({
    ...seams,
    keptDoodleSession: () => keptDoodle.kept.value?.sessionKey ?? null,
    keepDoodle: keptDoodle.keep,
    declineKeptDoodle: keptDoodle.decline,
  })
  provide(REVIEW_JAM_PORTS, ports)
  return useJamBar({ ...seams, ports })
}
