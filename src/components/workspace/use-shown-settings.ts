/**
 * What the workspace shell's musical controls show, for the shell: whether they are read-only, the
 * settings they show (the player's own, or during a session those of the phrase now sounding), and
 * whether the preset status announces. A session never writes the player's own settings, so every
 * end shows them, the starting tempo included, again.
 */
import { computed, ref, watch, type ComputedRef, type Ref } from 'vue'

import type { GenerationSessionState } from '@/composables/use-generation-session'
import type { WorkspaceSessionResult } from '@/composables/workspace-session-result'
import type { GenerationControls } from '@/domain/controls/generation-controls'
import type { ProfileSelection } from '@/domain/controls/profile-selection'
import type { SessionController } from './workspace-session-controller-types'

/** What the controls' readings follow; every getter is read reactively. */
// @spec-link [[rule_session_settings_locked]]
export interface ShownSettingsDeps {
  readonly idle: () => Readonly<GenerationSessionState<WorkspaceSessionResult>>
  /** The session controller; null while its lazy chunk loads. */
  readonly controller: () => SessionController | null
  /** True while a session runs, count-in included. */
  readonly sessionActive: () => boolean
}

/** The settings the controls show, as `ControlPanel` takes them. */
// @spec-link [[rule_automatic_change_updates_controls_quietly]]
export interface ShownSettings {
  readonly controls: GenerationControls
  readonly profileSelection: ProfileSelection
}

/** The controls' readings, all reactive. */
// @spec-link [[rule_session_settings_locked]]
// @spec-link [[rule_automatic_change_updates_controls_quietly]]
export interface ShownSettingsView {
  readonly controlsReadonly: ComputedRef<boolean>
  readonly shownSettings: ComputedRef<ShownSettings>
  readonly presetStatusLive: Readonly<Ref<'polite' | 'off'>>
}

/**
 * Intent: the controls' readings over `deps`, for as long as the calling scope lives (a
 * component's setup). The preset status's two watchers follow `sessionActive` from here, so the
 * caller registers this before any other watcher of a session's start or end.
 */
// @spec-link [[rule_session_settings_locked]]
// @spec-link [[rule_automatic_change_updates_controls_quietly]]
// @spec-link [[rule_mutation_reverts_at_session_end]]
export function useShownSettings(deps: ShownSettingsDeps): ShownSettingsView {
  /**
   * Every musical control, tempo included, is read-only for the whole lifetime of any Idle
   * operation and of a session, through the same read-only treatment (values at full contrast).
   */
  // @spec-link [[rule_session_settings_locked]]
  // @spec-link [[rule_readonly_controls_keep_contrast]]
  const controlsReadonly = computed(() => deps.idle().operation !== 'idle' || deps.sessionActive())

  /**
   * The settings the controls show: during a session, those the controller says the phrase now
   * sounding was generated with, at the exact tempo in effect (off the tempo control's list once a
   * rising tempo has moved it); otherwise the player's own, which a session never writes, so every
   * end shows the starting tempo again.
   */
  // @spec-link [[rule_automatic_change_updates_controls_quietly]]
  // @spec-link [[rule_mutation_reverts_at_session_end]]
  // @spec-link [[rule_adaptive_tempo_resets_after_session]]
  const shownSettings = computed(() => {
    const session = deps.controller()?.state.shownSettings ?? null
    if (session === null)
      return { controls: deps.idle().controls, profileSelection: deps.idle().profileSelection }
    const tempo = deps.controller()?.state.sessionTempo ?? null
    if (tempo === null) throw new Error('workspace shell: a session shows settings but no tempo')
    return { controls: { ...session.controls, tempo }, profileSelection: session.musicalProfile }
  })

  /**
   * The preset status's live announcement: off from a session's start, before its count-in renders
   * (a sync watcher), so no automatic change is announced; polite again only once the screen has
   * rendered the player's own values back at its end (a post-flush watcher), so neither is the
   * return.
   */
  // @spec-link [[rule_automatic_change_updates_controls_quietly]]
  const presetStatusLive = ref<'polite' | 'off'>('polite')
  watch(
    deps.sessionActive,
    (active) => {
      if (active) presetStatusLive.value = 'off'
    },
    { flush: 'sync' },
  )
  watch(
    deps.sessionActive,
    (active, wasActive) => {
      if (!active && wasActive) presetStatusLive.value = 'polite'
    },
    { flush: 'post' },
  )

  return { controlsReadonly, shownSettings, presetStatusLive }
}
