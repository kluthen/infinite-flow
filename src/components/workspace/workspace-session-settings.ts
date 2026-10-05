/**
 * The settings a running session shows in its read-only controls, for the session controller:
 * what the phrase now sounding was generated with. During the count-in that is the session's
 * start settings, the player's own. Each settings change the engine reports is kept until the
 * first phrase it applies to, or a later one, starts sounding as a generated phrase; it shows
 * from that instant, on the audio clock, never when it is decided. A repeat is the phrase before
 * it played again, generated with the settings already shown, so it shows nothing new, and a
 * change landing on it first shows with the next generated phrase. Nothing here writes the
 * player's own controls: the session's end drops what this shows, and the controls show the
 * player's choices again. It also holds the page's `Vary settings` flag, which a session reads at
 * its start.
 */
import { shallowRef } from 'vue'

import type { SessionPhrase, SessionSettings, SettingsChangedOutput } from '@/session/session-types'
import { SETTINGS_MUTATION_DEFAULT } from '@/session/settings-mutation'
import {
  SessionControllerError,
  type SessionControllerPhase,
} from './workspace-session-controller-types'

/** One reported change not yet shown: the settings and the first phrase they apply to. */
interface PendingChange {
  readonly phraseNumber: number
  readonly settings: SessionSettings
}

/** One session's shown settings, fed the engine's outputs. */
// @spec-link [[rule_automatic_change_updates_controls_quietly]]
export interface SessionShownSettings {
  /** The settings shown now. */
  readonly current: () => SessionSettings
  /** Keep a reported change until the phrase it applies to starts sounding. */
  readonly settingsChanged: (output: SettingsChangedOutput) => void
  /**
   * A phrase started sounding: a generated one shows the latest change applying to it or to an
   * earlier phrase, if any; a repeat shows nothing new. Returns the settings shown from now on.
   */
  readonly phraseSounding: (phrase: SessionPhrase) => SessionSettings
}

/**
 * Intent: one session's shown settings, starting from its start settings. A change is shown only
 * at a generated phrase's start; when several are pending for that phrase or earlier ones, the
 * latest reported wins, as it is the one that phrase was generated with.
 */
// @spec-link [[rule_automatic_change_updates_controls_quietly]]
// @spec-link [[rule_session_change_applies_at_phrase_boundary]]
export function createSessionShownSettings(start: SessionSettings): SessionShownSettings {
  let shown = start
  let pending: PendingChange[] = []

  /** Intent: keep a reported change, by the first phrase it applies to. */
  function settingsChanged(output: SettingsChangedOutput): void {
    pending.push({ phraseNumber: output.phraseNumber, settings: output.settings })
  }

  /** Intent: show, at a generated phrase's start, the latest change applying to it. */
  function phraseSounding(phrase: SessionPhrase): SessionSettings {
    if (phrase.origin === 'repeat') return shown
    const latest = pending.filter((change) => change.phraseNumber <= phrase.phraseNumber).at(-1)
    if (latest === undefined) return shown
    shown = latest.settings
    pending = pending.filter((change) => change.phraseNumber > phrase.phraseNumber)
    return shown
  }

  return { current: () => shown, settingsChanged, phraseSounding }
}

/** The page's `Vary settings` flag: `on` is a reactive reading; `set` is the player's on/off. */
// @spec-link [[req_settings_mutation_flag]]
export interface VarySettingsFlag {
  readonly on: () => boolean
  readonly set: (on: boolean) => void
}

/**
 * Intent: build the page's `Vary settings` flag, at the engine's default (off, spec D176), over
 * the session's phase, read reactively. It is held in memory for the controller's life, the
 * page's: no session's start or end resets it, and the restore at a session's end never touches
 * it. It changes only outside a session (at Idle or while the Review shows); any change during
 * the count-in or a running session throws.
 */
// @spec-link [[req_settings_mutation_flag]]
// @spec-link [[rule_session_settings_locked]]
// @spec-link [[rule_ephemeral_session_state]]
export function createVarySettingsFlag(phase: () => SessionControllerPhase): VarySettingsFlag {
  const on = shallowRef(SETTINGS_MUTATION_DEFAULT.kind === 'on')
  return {
    on: () => on.value,
    set: (next) => {
      if (phase() !== 'idle')
        throw new SessionControllerError('vary settings: it cannot change during a session')
      on.value = next
    },
  }
}
