/**
 * Session mode's rhythm lock, its allowed rhythm changes and Vary settings' allowed groups, for the
 * session controller: the page's three choices, held in memory for the controller's life from the
 * player's saved choices, changed only outside a session; and the settings a session starts with,
 * built from them and the Idle state, which Start and the Idle pre-generation's start share, so a
 * pre-generated phrase's request is the one the session re-derives. Nothing here writes storage:
 * the player's change handler saves a change the controller accepted.
 */
import { shallowRef } from 'vue'

import type { GenerationSessionState } from '@/composables/use-generation-session'
import type { WorkspaceSessionResult } from '@/composables/workspace-session-result'
import { deepFreeze } from '@/domain/events/deep-freeze'
import type { GenerationIntent } from '@/domain/generation/generation-intent'
import { RHYTHM_CHANGE_KINDS, type RhythmChangeKind } from '@/domain/generation/request-rhythm-lock'
import { sessionSettingsAtStart } from '@/session/session-intents'
import type { SessionSettings } from '@/session/session-types'
import { withRestrictionAtStart } from '@/session/settings-mutation'
import { VARY_SETTINGS_GROUPS, type AllowedGroups } from '@/session/settings-mutation-scales'
import {
  SessionControllerError,
  type SessionControllerPhase,
} from './workspace-session-controller-types'

/** The three choices as a session takes them: the lock, its allowed changes, the groups. */
// @spec-link [[module_session_lock_and_groups_choices]]
export type LockAndGroupsChoices = Pick<
  SessionSettings,
  'rhythmLockOn' | 'allowedRhythmChanges' | 'allowedGroups'
>

/** The page's three choices: `current` is a reactive reading; each setter is the player's change. */
// @spec-link [[module_session_lock_and_groups_choices]]
export interface SessionLockAndGroups {
  readonly current: () => LockAndGroupsChoices
  readonly setRhythmLockOn: (on: boolean) => void
  readonly setAllowedRhythmChanges: (kinds: readonly RhythmChangeKind[]) => void
  readonly setAllowedGroups: (groups: AllowedGroups) => void
}

/**
 * Intent: a frozen copy of the allowed rhythm changes; a list that is not known kinds, each once,
 * in RHYTHM_CHANGE_KINDS order, is a caller defect and throws.
 */
function checkedRhythmChanges(kinds: readonly RhythmChangeKind[]): readonly RhythmChangeKind[] {
  const indexes = kinds.map((kind) => RHYTHM_CHANGE_KINDS.indexOf(kind))
  indexes.forEach((index, at) => {
    if (index === -1 || (at > 0 && index <= indexes[at - 1]!))
      throw new SessionControllerError(
        `allowed rhythm changes: ${kinds.join(', ')} are not known kinds, each once, in the order ${RHYTHM_CHANGE_KINDS.join(', ')}`,
      )
  })
  return deepFreeze([...kinds])
}

/** Intent: a frozen copy of the allowed groups; anything but the six, each a boolean, throws. */
function checkedGroups(groups: AllowedGroups): AllowedGroups {
  const keys = Object.keys(groups)
  const exact =
    keys.length === VARY_SETTINGS_GROUPS.length &&
    VARY_SETTINGS_GROUPS.every((group) => typeof groups[group] === 'boolean')
  if (!exact)
    throw new SessionControllerError(
      `allowed groups: they must be exactly ${VARY_SETTINGS_GROUPS.join(', ')}, each on or off`,
    )
  return deepFreeze({ ...groups })
}

/**
 * Intent: build the page's three choices over the session's phase, read reactively, starting from
 * `saved`: the player's saved choices, loaded before the first draw (the lock off, no change
 * allowed and all six groups allowed on a first visit or for an unreadable record). They are held
 * in memory for the controller's life, the page's, kept from one session to the next, and never
 * written to storage here. Each changes only outside a session (at Idle or while the Review
 * shows); any change during the count-in or a running session throws, as an invalid value does.
 */
// @spec-link [[module_session_lock_and_groups_choices]]
// @spec-link [[req_rhythm_lock]]
// @spec-link [[rule_allowed_rhythm_changes]]
// @spec-link [[rule_vary_settings_allowed_groups]]
// @spec-link [[rule_no_save_during_session]]
export function createSessionLockAndGroups(
  phase: () => SessionControllerPhase,
  saved: LockAndGroupsChoices,
): SessionLockAndGroups {
  const rhythmLockOn = shallowRef(saved.rhythmLockOn)
  const allowedRhythmChanges = shallowRef(checkedRhythmChanges(saved.allowedRhythmChanges))
  const allowedGroups = shallowRef(checkedGroups(saved.allowedGroups))

  /** Intent: refuse a change during the count-in or a running session. */
  function requireIdle(choice: string): void {
    if (phase() !== 'idle')
      throw new SessionControllerError(`${choice}: it cannot change during a session`)
  }

  return {
    current: () => ({
      rhythmLockOn: rhythmLockOn.value,
      allowedRhythmChanges: allowedRhythmChanges.value,
      allowedGroups: allowedGroups.value,
    }),
    setRhythmLockOn: (on) => {
      requireIdle('rhythm lock')
      if (typeof on !== 'boolean')
        throw new SessionControllerError(`rhythm lock: ${String(on)} is not on or off`)
      rhythmLockOn.value = on
    },
    setAllowedRhythmChanges: (kinds) => {
      requireIdle('allowed rhythm changes')
      allowedRhythmChanges.value = checkedRhythmChanges(kinds)
    },
    setAllowedGroups: (groups) => {
      requireIdle('allowed groups')
      allowedGroups.value = checkedGroups(groups)
    },
  }
}

/**
 * Intent: the settings a session started now would take: the Idle controls, figure levels and
 * preset selection with the three choices, my instrument's profile taken from phrase 1's intent,
 * which embeds it, and the restriction in force frozen in from the presets Idle knows. Start and
 * the Idle pre-generation's start both build theirs here, so they are equal; with the default
 * choices they are the settings a session had before v3.2.
 */
// @spec-link [[module_session_lock_and_groups_choices]]
// @spec-link [[rule_pregenerated_phrase_matches_session]]
export function chosenSessionSettings(
  idle: Pick<
    Readonly<GenerationSessionState<WorkspaceSessionResult>>,
    'controls' | 'figureLevels' | 'selection' | 'presets'
  >,
  choices: LockAndGroupsChoices,
  phraseOne: GenerationIntent,
): SessionSettings {
  return withRestrictionAtStart(
    sessionSettingsAtStart(
      {
        controls: idle.controls,
        figureLevels: idle.figureLevels,
        selection: idle.selection,
        allowedGroups: choices.allowedGroups,
        rhythmLockOn: choices.rhythmLockOn,
        allowedRhythmChanges: choices.allowedRhythmChanges,
      },
      phraseOne,
    ),
    idle.presets,
  )
}
