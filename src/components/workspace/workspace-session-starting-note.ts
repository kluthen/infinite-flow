/**
 * The session MIDI side's starting note at Idle: the note that would start a session if played
 * now, named exactly while Start may be clicked, the MIDI controller is connected, no sheet and no
 * stale-phrase prompt is open and the staff shows Idle's phrase; and whether it waits for the
 * page's first click, tap or key press, which a played note never is. Split out of
 * ./workspace-session-midi.ts, whose MIDI side reads it. Loaded with the controller.
 */
import { computed, shallowRef } from 'vue'

import type { MidiControllerState } from '@/midi/midi-controller-state'
import { startingNoteOf, type StartingNote } from '@/session/starting-note'
import type { SessionMidiDependencies } from './workspace-session-midi'

/** What the starting note reads: the MIDI side's dependencies and its MIDI state (reactive). */
// @spec-link [[service_session_midi]]
export interface IdleStartingNoteDependencies extends Pick<
  SessionMidiDependencies,
  'audio' | 'pageActivation' | 'connectionSheetOpen' | 'canStart' | 'idleResult' | 'idlePhrase'
> {
  readonly midiState: () => MidiControllerState
}

/** The starting note's readings, all reactive, and the end of its listening. */
// @spec-link [[service_session_midi]]
export interface IdleStartingNote {
  /** The note that would start a session if played now; null when none would. */
  readonly startingNote: () => StartingNote | null
  /** Whether the named starting note waits for the page's first click, tap or key press. */
  readonly awaitsClick: () => boolean
  /** Whether the page has had its first click, tap or key press. */
  readonly pageActivated: () => boolean
  readonly dispose: () => void
}

/**
 * Intent: name the starting note from phrase 1's first fresh attack while a session may start, the
 * controller is connected, nothing is open over the workspace (a sheet, or the stale-phrase prompt,
 * while which no note starts anything) and the staff shows Idle's phrase; and follow the page's
 * first activation until `dispose`. It waits for that activation while the audio is still locked.
 */
// @spec-link [[service_session_midi]]
// @spec-link [[rule_midi_starting_note]]
// @spec-link [[module_session_starting_note]]
// @spec-link [[rule_stale_phrase_prompt_at_start]]
export function createIdleStartingNote(deps: IdleStartingNoteDependencies): IdleStartingNote {
  const startingNote = computed(() => {
    if (!deps.canStart() || deps.midiState().kind !== 'connected' || deps.connectionSheetOpen())
      return null
    const result = deps.idleResult()
    const written = deps.idlePhrase()
    if (result === null || written === null) return null
    return startingNoteOf(result.outcome.result.timeline, written)
  })

  const pageActivated = shallowRef(deps.pageActivation.hasBeenActive())
  const stopWaitingForActivation = deps.pageActivation.onFirstActivation(() => {
    pageActivated.value = true
  })

  /**
   * Intent: whether the named starting note waits for the page's first click: the audio is still
   * locked and the page has had none (any click that unlocks the audio is one).
   */
  // @spec-link [[rule_midi_starting_note]]
  const awaitsClick = computed(
    () => startingNote.value !== null && !pageActivated.value && !deps.audio.isUnlocked(),
  )

  return {
    startingNote: () => startingNote.value,
    awaitsClick: () => awaitsClick.value,
    pageActivated: () => pageActivated.value,
    dispose: stopWaitingForActivation,
  }
}
