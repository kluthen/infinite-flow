/**
 * Jam mode's kept doodle (master spec C5.11; module_kept_doodle), in one place of Jam's code so
 * everything that keeps it, reads it or lets it go agrees on which doodle Jam mode keeps. It holds
 * at most one doodle, in memory only (nothing here is ever saved, so after a reload none is kept):
 * the quantized doodle with the tempo it was captured at, the readings Jam's controls take from it
 * (which depend on no window width), its key and mode suggestion with whether it was declined, and
 * the session it comes from, the latest session played on it, by the key that session is kept
 * under. The workspace keeps one from the Jam part a Jam's end hands it and from `Jam again on this
 * doodle`, each replacing the one kept before, and lets it go on what the rule names; nothing here
 * listens to anything. Part of Jam's code (src/jam/), loaded on demand.
 */
import { shallowRef, type Ref } from 'vue'

import type { ReviewedJamPart } from '@/components/workspace/session-jam-part'
import type { QuantizedDoodle } from '@/domain/doodle/quantized-doodle'
import type { InstrumentProfile } from '@/domain/profile/instrument-profile'
import { deriveRegisterWindowCandidates } from '@/domain/profile/register-window-derivation'
import type { DoodleSuggestion } from '@/session/session-history'

import { readDoodleControls, type DoodleReadings } from './doodle-controls'
import { suggestKeyAndMode, type JamKeyAndMode } from './key-suggestion/key-suggestion'

/**
 * The doodle Jam mode keeps: the quantized doodle and its capture tempo, the readings taken from
 * it, its suggestion and whether the player declined it, and the key of the session it comes
 * from. Frozen; each change replaces it.
 */
// @spec-link [[module_kept_doodle]]
export interface JamKeptDoodle {
  readonly doodle: QuantizedDoodle
  readonly captureTempo: number
  readonly readings: DoodleReadings
  readonly suggestion: DoodleSuggestion
  readonly suggestionDeclined: boolean
  readonly sessionKey: string
}

/**
 * What the kept doodle reads, only to work out what a kept session read back does not hold: the
 * selected instrument (my instrument's profile when it is the one), whose register windows the
 * readings are taken for and whose transposition the suggestion is judged in, and Jam's written
 * key and Collection now, which the suggestion is judged against.
 */
// @spec-link [[module_kept_doodle]]
export interface KeptDoodleDependencies {
  readonly instrument: () => Pick<
    InstrumentProfile,
    'concertRange' | 'registerWindows' | 'transposition'
  >
  readonly keyAndMode: () => JamKeyAndMode
}

/** Jam mode's kept doodle: the one kept now, and what keeps it, changes it and lets it go. */
// @spec-link [[module_kept_doodle]]
export interface KeptDoodleState {
  /** The doodle kept now; null when none is. */
  readonly kept: Readonly<Ref<JamKeptDoodle | null>>
  /** Keep the doodle of `jam`, from the session under `sessionKey`, in place of any kept one. */
  readonly keep: (jam: ReviewedJamPart, sessionKey: string) => void
  /** The session under `sessionKey` was played on the kept doodle: the doodle now comes from it. */
  readonly playedIn: (sessionKey: string) => void
  /** Decline the kept doodle's suggestion for good (`Keep {key} {mode}`). */
  readonly decline: () => void
  /** Let the kept doodle go; with none kept, nothing changes. */
  readonly letGo: () => void
}

/**
 * Intent: the readings Jam's controls take from `jam`'s doodle: the ones its Jam recorded, or, for
 * a kept session read back, which holds none, the same reading made again from the quantized
 * doodle for the instrument's register windows, at no window width.
 */
// @spec-link [[rule_doodle_sets_jam_controls]]
function readingsOf(jam: ReviewedJamPart, deps: KeptDoodleDependencies): DoodleReadings {
  if (jam.doodleControls !== null) return jam.doodleControls
  const { concertRange, registerWindows } = deps.instrument()
  return readDoodleControls(
    jam.doodle.doodle,
    deriveRegisterWindowCandidates(concertRange, registerWindows),
  )
}

/**
 * Intent: `jam`'s key and mode suggestion: the one worked out at its doodle's end, or, for a kept
 * session read back, which holds none, worked out again from the doodle against Jam's key and mode
 * for the instrument's transposition, the same doodle giving the same answer.
 */
// @spec-link [[rule_suggestion_same_doodle_same_answer]]
function suggestionOf(jam: ReviewedJamPart, deps: KeptDoodleDependencies): DoodleSuggestion {
  if (jam.suggestion !== null) return jam.suggestion
  return suggestKeyAndMode(jam.doodle.doodle, deps.keyAndMode(), deps.instrument())
}

/**
 * Intent: Jam mode's kept doodle, none at first and held in memory only. A keep replaces whatever
 * was kept; a decline or a session moved while none is kept is a defect, and throws.
 */
// @spec-link [[module_kept_doodle]]
// @spec-link [[rule_held_doodle_in_memory_only]]
// @spec-link [[rule_held_doodle_dropped_on_change]]
export function useKeptDoodle(deps: KeptDoodleDependencies): KeptDoodleState {
  const kept = shallowRef<JamKeptDoodle | null>(null)

  /** Intent: the doodle kept now; asking with none kept is a defect. */
  function requireKept(what: string): JamKeptDoodle {
    if (kept.value === null) throw new Error(`kept doodle: ${what}, but no doodle is kept`)
    return kept.value
  }

  return {
    kept,
    keep: (jam, sessionKey) => {
      kept.value = Object.freeze({
        doodle: jam.doodle.doodle,
        captureTempo: jam.doodle.captureTempo,
        readings: readingsOf(jam, deps),
        suggestion: suggestionOf(jam, deps),
        suggestionDeclined: jam.suggestionDeclined,
        sessionKey,
      })
    },
    playedIn: (sessionKey) => {
      kept.value = Object.freeze({ ...requireKept('a session played on it'), sessionKey })
    },
    decline: () => {
      const doodle = requireKept('its suggestion declined')
      if (doodle.suggestionDeclined) return
      kept.value = Object.freeze({ ...doodle, suggestionDeclined: true })
    },
    letGo: () => {
      kept.value = null
    },
  }
}
