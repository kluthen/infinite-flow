/**
 * The session controller's side of a stale phrase 1 (master spec §16): at Idle an ordinary edit
 * never regenerates the phrase on screen, so it can have been generated under settings that
 * differ from the current ones. Start, or the starting note, once every start condition holds,
 * then opens the stale-phrase prompt instead of starting: nothing sounds, no lock is asked for,
 * no count-in. The prompt's Use it is the start click, the conditions checked again; dismissing
 * it, or a start condition no longer holding while it shows, closes it, starting nothing. While it
 * shows, no MIDI note starts anything (the controller hides the starting note). Loaded with the
 * controller, never in the entry chunk.
 */
import { watch } from 'vue'

import type { GenerationSessionState } from '@/composables/use-generation-session'
import type { WorkspaceSessionResult } from '@/composables/workspace-session-result'
import { MY_INSTRUMENT_ID } from '@/domain/profile/instrument-profiles'
import type { SessionStartBlocker } from '@/session/session-start-conditions'
import type { SessionSettings } from '@/session/session-types'
import { phraseOneSettings, staleSettingsOf, type StaleSetting } from '@/session/stale-phrase-one'
import { SessionControllerError } from './workspace-session-controller-types'

/** What opened the prompt: the Start click, or the starting note played on the controller. */
// @spec-link [[rule_stale_phrase_prompt_at_start]]
export type StalePhraseOpener = 'start' | 'note'

/**
 * The prompt while it shows: what opened it, and every setting whose value differs from phrase
 * 1's, fixed as it opens (nothing behind it can change a setting while it shows).
 */
// @spec-link [[rule_stale_phrase_prompt_at_start]]
export interface StalePhrasePrompt {
  readonly opener: StalePhraseOpener
  readonly changed: readonly StaleSetting[]
}

/**
 * What the stale start reads and writes: the Idle state, the controller's state (the prompt it
 * publishes), its start blocker and its own start, which throws when blocked.
 */
// @spec-link [[service_session_start]]
export interface StalePhraseStartDependencies {
  readonly idle: Readonly<GenerationSessionState<WorkspaceSessionResult>>
  readonly state: { stalePhrasePrompt: StalePhrasePrompt | null }
  readonly startBlocker: () => SessionStartBlocker | null
  readonly start: () => void
}

/** The controller's stale-aware start and the prompt's answers. */
// @spec-link [[service_session_start]]
export interface StalePhraseStart {
  /**
   * Start, or open the prompt with a stale phrase 1 (`asked`); throws when blocked. While the
   * prompt already shows (a second press before its sheet has loaded), it asks again, changing
   * nothing.
   */
  readonly request: (opener: StalePhraseOpener) => 'started' | 'asked'
  /** Use it: close the prompt and start, unless a start condition no longer holds. */
  readonly use: () => boolean
  /** Close the prompt, starting nothing. */
  readonly dismiss: () => void
  /** Stop watching the start conditions; call once. */
  readonly dispose: () => void
}

/**
 * Intent: the current settings as the generation reads them: the controls, the profile selection
 * and, while the controls name my instrument, its profile as saved now, whose range and
 * transposition phrase 1's are compared with.
 */
// @spec-link [[rule_stale_phrase_prompt_at_start]]
function currentSettings(
  idle: Readonly<GenerationSessionState<WorkspaceSessionResult>>,
): SessionSettings {
  const settings = { controls: idle.controls, musicalProfile: idle.profileSelection }
  if (idle.controls.instrumentProfileId !== MY_INSTRUMENT_ID) return settings
  if (idle.myInstrument === null)
    throw new SessionControllerError(
      'stale phrase: the controls name my instrument, but none exists',
    )
  return { ...settings, instrumentProfile: idle.myInstrument.profile }
}

/**
 * Intent: the settings phrase 1 differs in from the current ones, at the tempo in effect (the
 * tempo never counts); none when it is not stale. Asking with no phrase 1 is a defect.
 */
// @spec-link [[rule_stale_phrase_prompt_at_start]]
function staleSettingsNow(
  idle: Readonly<GenerationSessionState<WorkspaceSessionResult>>,
): readonly StaleSetting[] {
  const result = idle.result
  if (result === null) throw new SessionControllerError('stale phrase: no phrase 1 to compare')
  const phraseOne = phraseOneSettings(result.settings, result.intent, idle.controls.tempo)
  return staleSettingsOf(phraseOne, currentSettings(idle))
}

/**
 * Intent: build the controller's stale-aware start over `deps`. A start while a start condition
 * fails goes to the controller's start, which refuses it as before: the prompt is no start
 * condition and never replaces one. While the prompt shows, a start condition that stops holding
 * (the workspace leaving Ready) closes it as if dismissed.
 */
// @spec-link [[rule_stale_phrase_prompt_at_start]]
// @spec-link [[rule_session_start_conditions]]
// @spec-link [[service_workspace_session_flow]]
// @spec-link [[module_session_starting_note]]
export function createStalePhraseStart(deps: StalePhraseStartDependencies): StalePhraseStart {
  const { state } = deps

  /** Intent: the prompt must show: an answer with none is a defect. */
  function requireOpen(): void {
    if (state.stalePhrasePrompt === null)
      throw new SessionControllerError('stale phrase: no prompt shows')
  }

  const stopWatching = watch(
    () => deps.startBlocker() !== null,
    (blocked) => {
      if (blocked) state.stalePhrasePrompt = null
    },
  )

  return {
    request: (opener) => {
      if (state.stalePhrasePrompt !== null) return 'asked'
      if (deps.startBlocker() === null) {
        const changed = staleSettingsNow(deps.idle)
        if (changed.length > 0) {
          state.stalePhrasePrompt = { opener, changed }
          return 'asked'
        }
      }
      deps.start()
      return 'started'
    },
    use: () => {
      requireOpen()
      state.stalePhrasePrompt = null
      if (deps.startBlocker() !== null) return false
      deps.start()
      return true
    },
    dismiss: () => {
      requireOpen()
      state.stalePhrasePrompt = null
    },
    dispose: stopWatching,
  }
}
