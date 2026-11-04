/**
 * The shell's side of Jam mode's Idle cue: what `session-cue-row` holds in `start-note-line`'s
 * place while Jam mode shows (no doodle kept yet). Without a connected controller it is
 * `jam-needs-controller`, which `Start Jam` names; with one, while a fresh Jam could start (its
 * start conditions, ./session-action-policy.ts), it is the starting-note line naming the home
 * note, from Jam's Idle note routing (src/jam/jam-idle-notes.ts), reached through Jam's loaded
 * code only; otherwise nothing. The row is given plain data, never Jam's code. It also passes on
 * what a played note means there, for the controller's note route. Nothing here listens to the
 * controller's notes, and a controller arriving or leaving never changes the mode.
 */
import { computed, type ComputedRef } from 'vue'

import type { JamIdleNotes, JamInstrument } from '@/jam/jam-idle-notes'
import type { Collection, PitchClass } from '@/domain/controls/generation-controls'
import type { JamModeModule } from './load-jam-mode'
import { freshJamCanStart, type FreshJamStartFacts } from './session-action-policy'

/** The id of `jam-needs-controller`, which `Start Jam`'s `aria-describedby` names. */
export const JAM_NEEDS_CONTROLLER_ID = 'jam-needs-controller'

/** The id of Jam's staff's `jam-notice`, which `Start Jam`'s `aria-describedby` names. */
export const JAM_NOTICE_ID = 'jam-notice'

/**
 * What the cue row holds in `start-note-line`'s place in Jam mode: the starting-note line naming
 * the home note (asking first for the page's first click while it waits for one), or
 * `jam-needs-controller`.
 */
// @spec-link [[rule_jam_starting_note_is_home_note]]
// @spec-link [[rule_jam_needs_controller]]
export type JamCue =
  | { readonly kind: 'starting-note'; readonly label: string; readonly awaitsClick: boolean }
  | { readonly kind: 'needs-controller' }

/** Jam's settings the home note is read from: Jam's written key, collection and instrument. */
export interface JamCueSettings extends JamInstrument {
  readonly tonalCenter: PitchClass
  readonly collection: Collection
}

/** What Jam's Idle cue reads, every reading reactive. */
// @spec-link [[rule_jam_start_conditions]]
export interface JamIdleCueDependencies {
  /** Jam's code, once loaded in this visit; null before. */
  readonly jamModule: () => JamModeModule | null
  /** Jam mode shows (its code loaded, not while it opens). */
  readonly jamShowing: () => boolean
  /** Jam's written key, collection and the instrument. */
  readonly settings: () => JamCueSettings
  /** The facts a fresh Jam's start is judged on. */
  readonly startFacts: () => FreshJamStartFacts
  /** The page still waits for its first click, tap or key press, the audio still locked. */
  readonly pageAwaitsClick: () => boolean
}

/** Jam's Idle cue: what the row holds, and whether `Start Jam` names `jam-needs-controller`. */
export interface JamIdleCue {
  /** What the cue row holds in `start-note-line`'s place; null outside Jam mode's Idle. */
  readonly cue: ComputedRef<JamCue | null>
  /** `jam-needs-controller` shows, so `Start Jam` names it with `aria-describedby`. */
  readonly needsController: ComputedRef<boolean>
  /**
   * What a controller note at this exact concert pitch means at Jam mode's Idle now: `start` for
   * the named home note, else (and before Jam's code has loaded) `ignored`.
   */
  readonly meaningOf: (concertPitch: number) => 'start' | 'ignored'
}

/**
 * Intent: Jam mode's Idle cue. Outside Jam mode, during a session and while the review mode shows,
 * none. Without a connected controller (a selected one away counts as none), the needs-controller
 * line, in every idle state of Jam mode. Otherwise the starting-note line naming the home note
 * exactly while a fresh Jam could start (whenever `Start Jam` is enabled), from Jam's Idle note
 * routing, built once Jam's code has loaded, which also says what a played note means.
 */
// @spec-link [[rule_jam_needs_controller]]
// @spec-link [[rule_jam_start_conditions]]
// @spec-link [[rule_jam_starting_note_is_home_note]]
// @spec-link [[module_jam_idle_notes]]
export function useJamIdleCue(deps: JamIdleCueDependencies): JamIdleCue {
  const idleNotes = computed<JamIdleNotes | null>(() => {
    const loaded = deps.jamModule()
    if (loaded === null) return null
    return loaded.createJamIdleNotes({
      writtenKey: () => deps.settings().tonalCenter,
      collection: () => deps.settings().collection,
      instrument: () => deps.settings(),
      canStart: () => deps.jamShowing() && freshJamCanStart(deps.startFacts()),
      pageAwaitsClick: deps.pageAwaitsClick,
    })
  })

  const cue = computed<JamCue | null>(() => {
    if (!deps.jamShowing()) return null
    const facts = deps.startFacts()
    if (facts.sessionActive || facts.reviewShowing) return null
    if (!facts.controllerConnected) return { kind: 'needs-controller' }
    const notes = idleNotes.value
    const starting = notes?.startingNote() ?? null
    if (notes === null || starting === null) return null
    return { kind: 'starting-note', label: starting.label, awaitsClick: notes.awaitsClick() }
  })

  return {
    cue,
    needsController: computed(() => cue.value?.kind === 'needs-controller'),
    meaningOf: (concertPitch) => idleNotes.value?.meaningOf(concertPitch) ?? 'ignored',
  }
}
