/**
 * The shell's side of Jam mode's Idle cue: what `session-cue-row` holds in `start-note-line`'s
 * place while Jam mode shows. Without a connected controller it is `jam-needs-controller`, which
 * `Start Jam` names; with one, while a Jam could start (a fresh Jam's start conditions, or with a
 * doodle kept a Jam on it's, ./session-action-policy.ts), it is the starting-note line naming the
 * starting note (the home note, or the kept doodle's phrase 1's first note, which the start
 * marker also shows on Jam's staff), from Jam's Idle note routing (src/jam/jam-idle-notes.ts),
 * reached through Jam's loaded code only; otherwise nothing. The row is given plain data, never
 * Jam's code. While `tap-tempo` listens (./use-tap-tempo-host.ts) the starting-note line hides,
 * as no note starts a Jam then. It also passes on what a played note means there, for the
 * controller's note route, hands that route's notes to Jam's Idle note routing (which taps with
 * them while tap tempo listens), and says whether `Start Jam` may start a Jam now. Nothing here
 * subscribes to the controller's notes, and a controller arriving or leaving never changes the
 * mode.
 */
import { computed, type ComputedRef } from 'vue'

import type { ExpectedNoteIdentity } from '@/domain/acknowledgement/expected-note'
import type { IdlePhraseStateView } from '@/composables/generation-session-types'
import type { WrittenPhrase } from '@/domain/notation/written-phrase-types'
import type { JamIdleNotes, JamInstrument, JamNoteMeaning } from '@/jam/jam-idle-notes'
import type { Collection, PitchClass } from '@/domain/controls/generation-controls'
import type { PlayedNoteEvent } from '@/midi/played-note-tracker'
import type { AudioTime } from '@/session/session-types'
import type { JamModeModule } from './load-jam-mode'
import {
  freshJamCanStart,
  keptDoodleJamCanStart,
  keptPhraseOneShown,
  type FreshJamStartFacts,
} from './session-action-policy'
import type { KeptDoodlePhraseResult } from './use-kept-doodle-phrase'

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

/** Jam's phrase 1 written from the kept doodle, as the cue reads it: its Idle state and staff. */
// @spec-link [[module_jam_idle_notes]]
export interface JamKeptPhraseCue {
  readonly state: IdlePhraseStateView<KeptDoodlePhraseResult>
  readonly written: WrittenPhrase | null
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
  /** Jam's phrase 1 written from the kept doodle; null while no doodle is kept. */
  readonly keptPhrase: () => JamKeptPhraseCue | null
  /** Whether `tap-tempo` listens at this instant. */
  readonly tapListening: () => boolean
  /** A controller tap, at the note's onset on the audio clock. */
  readonly tap: (at: AudioTime) => void
}

/** Jam's Idle cue: what the row holds, and whether `Start Jam` names `jam-needs-controller`. */
export interface JamIdleCue {
  /** What the cue row holds in `start-note-line`'s place; null outside Jam mode's Idle. */
  readonly cue: ComputedRef<JamCue | null>
  /** `jam-needs-controller` shows, so `Start Jam` names it with `aria-describedby`. */
  readonly needsController: ComputedRef<boolean>
  /**
   * What a controller note at this exact concert pitch means at Jam mode's Idle now: `tap` for
   * every note while tap tempo listens, else `start` for the named starting note, else (and before
   * Jam's code has loaded) `ignored`.
   */
  readonly meaningOf: (concertPitch: number) => JamNoteMeaning
  /**
   * A controller note's event at Jam mode's Idle, for Jam's Idle note routing: a note played as a
   * tap taps at its onset when it ends. Before Jam's code has loaded, nothing.
   */
  readonly hear: (event: PlayedNoteEvent) => void
  /**
   * A Jam could start now, as `Start Jam` and the starting note start it: a fresh Jam without a
   * doodle kept, or a Jam on the kept doodle with one.
   */
  readonly canStart: ComputedRef<boolean>
  /** The note of the kept doodle's phrase 1 the start marker points at; null with none named. */
  readonly startMarker: ComputedRef<ExpectedNoteIdentity | null>
}

/**
 * Intent: Jam mode's Idle cue. Outside Jam mode, during a session and while the review mode shows,
 * none. Without a connected controller (a selected one away counts as none), the needs-controller
 * line, in every idle state of Jam mode. Otherwise the starting-note line naming the starting note
 * exactly while a Jam could start (whenever `Start Jam` is enabled): the home note with no doodle
 * kept, else the first note of phrase 1 written from it, the start marker on it, and none while
 * tap tempo listens; from Jam's Idle note routing, built once Jam's code has loaded, which also
 * says what a played note means (every note a tap while tap tempo listens) and hears its taps.
 */
// @spec-link [[rule_jam_needs_controller]]
// @spec-link [[rule_jam_start_conditions]]
// @spec-link [[rule_jam_starting_note_is_home_note]]
// @spec-link [[rule_jam_on_held_doodle_skips_capture]]
// @spec-link [[module_jam_idle_notes]]
// @spec-link [[rule_jam_tap_in_listening]]
export function useJamIdleCue(deps: JamIdleCueDependencies): JamIdleCue {
  const canStart = computed(() => {
    if (!deps.jamShowing()) return false
    const facts = deps.startFacts()
    const kept = deps.keptPhrase()
    if (kept === null) return freshJamCanStart(facts)
    const phraseOneShown = keptPhraseOneShown(kept.state) && kept.written !== null
    return keptDoodleJamCanStart({ ...facts, phraseOneShown })
  })

  const idleNotes = computed<JamIdleNotes | null>(() => {
    const loaded = deps.jamModule()
    if (loaded === null) return null
    return loaded.createJamIdleNotes({
      writtenKey: () => deps.settings().tonalCenter,
      collection: () => deps.settings().collection,
      instrument: () => deps.settings(),
      canStart: () => canStart.value,
      pageAwaitsClick: deps.pageAwaitsClick,
      doodleKept: () => deps.keptPhrase() !== null,
      keptPhraseOne: () => {
        const kept = deps.keptPhrase()
        const result = kept?.state.result ?? null
        if (kept === null || result === null || kept.written === null) return null
        return { timeline: result.outcome.result.timeline, written: kept.written }
      },
      tapListening: deps.tapListening,
      tap: deps.tap,
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
    hear: (event) => idleNotes.value?.hear(event),
    canStart,
    startMarker: computed(() => {
      if (deps.keptPhrase() === null || cue.value?.kind !== 'starting-note') return null
      return idleNotes.value?.startingNote()?.identity ?? null
    }),
  }
}
