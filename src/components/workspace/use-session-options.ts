/**
 * The "During a session" options of the workspace shell's controls: the page's `Rhythm lock` and
 * its allowed rhythm changes, `Rising tempo`, `Tension across phrases`, and `Vary settings` with
 * its allowed groups and whether it has a move, read from the session controller, which holds
 * them, whether they are read-only, and the player's changes forwarded to it and, once it accepted
 * them, saved. While the controller still loads, every choice but `Rising tempo` shows the
 * player's saved choice, which the controller starts from, so none changes value when it arrives,
 * and `Vary settings` shows available.
 */
import { computed, type ComputedRef } from 'vue'

import type { RhythmChangeKind } from '@/domain/generation/request-rhythm-lock'
import type { AllowedGroups } from '@/session/settings-mutation-scales'
import type { SessionOptionChoices } from '@/storage/records/setting-defaults'
import type { SaveSettings } from '@/storage/settings-saver'
import type { SessionController } from './workspace-session-controller-types'
import { useRisingTempoControl, type RisingTempoControl } from './use-rising-tempo-control'

/** What the options read and act through; every getter is read reactively. */
// @spec-link [[req_settings_mutation_flag]]
export interface SessionOptionsDeps {
  /** The session controller; null while its lazy chunk loads. */
  readonly controller: () => SessionController | null
  /** The loaded session controller; a change before it loads is a defect, so this throws. */
  readonly requireController: () => SessionController
  /** Whether the musical controls are read-only now. */
  readonly controlsReadonly: () => boolean
  /** The player's saved choices, loaded before the first draw, which the controller starts from. */
  // @spec-link [[rule_first_phrase_waits_for_saved_settings]]
  readonly savedSessionOptions: () => SessionOptionChoices
  /** Save the settings a player's change changed. */
  // @spec-link [[rule_settings_saved_on_change]]
  readonly saveSettings: SaveSettings
}

/** The options' readings, all reactive, and the player's changes to them. */
// @spec-link [[req_settings_mutation_flag]]
// @spec-link [[req_multi_phrase_tension_arc]]
// @spec-link [[req_adaptive_tempo]]
// @spec-link [[req_rhythm_lock]]
// @spec-link [[rule_vary_settings_allowed_groups]]
export interface SessionOptions {
  readonly sessionOptionsReadonly: ComputedRef<boolean>
  readonly varySettings: ComputedRef<boolean>
  readonly varySettingsAvailable: ComputedRef<boolean>
  readonly allowedGroups: ComputedRef<AllowedGroups>
  readonly rhythmLockOn: ComputedRef<boolean>
  readonly allowedRhythmChanges: ComputedRef<readonly RhythmChangeKind[]>
  readonly tensionAcrossPhrases: ComputedRef<boolean>
  readonly risingTempo: RisingTempoControl
  readonly setVarySettings: (on: boolean) => void
  readonly setAllowedGroups: (groups: AllowedGroups) => void
  readonly setRhythmLockOn: (on: boolean) => void
  readonly setAllowedRhythmChanges: (kinds: readonly RhythmChangeKind[]) => void
  readonly setTensionAcrossPhrases: (on: boolean) => void
  readonly setRisingTempo: (on: boolean) => void
}

/** Intent: the "During a session" options over `deps`; computed readings, no watcher. */
// @spec-link [[req_settings_mutation_flag]]
// @spec-link [[rule_first_phrase_waits_for_saved_settings]]
// @spec-link [[req_multi_phrase_tension_arc]]
// @spec-link [[req_adaptive_tempo]]
export function useSessionOptions(deps: SessionOptionsDeps): SessionOptions {
  /**
   * The "During a session" options take the same read-only treatment, and stay read-only while the
   * controller, which holds them, is still loading.
   */
  // @spec-link [[req_settings_mutation_flag]]
  // @spec-link [[rule_readonly_controls_keep_contrast]]
  const sessionOptionsReadonly = computed(
    () => deps.controlsReadonly() || deps.controller() === null,
  )

  /**
   * The page's `Vary settings` flag; while the controller loads, the saved choice it starts from.
   */
  // @spec-link [[req_settings_mutation_flag]]
  // @spec-link [[rule_first_phrase_waits_for_saved_settings]]
  const varySettings = computed(
    () => deps.controller()?.state.varySettings ?? deps.savedSessionOptions().varySettings,
  )

  /**
   * Whether `Vary settings` has a move, from the controller; while it loads, available, as nothing
   * can be chosen then (the options are read-only) and no session can start.
   */
  // @spec-link [[rule_vary_settings_needs_legal_move]]
  const varySettingsAvailable = computed(
    () => deps.controller()?.state.varySettingsAvailable ?? true,
  )

  /** The groups `Vary settings` may move; while the controller loads, the saved choice. */
  // @spec-link [[rule_vary_settings_allowed_groups]]
  // @spec-link [[rule_first_phrase_waits_for_saved_settings]]
  const allowedGroups = computed(
    () => deps.controller()?.state.allowedGroups ?? deps.savedSessionOptions().allowedGroups,
  )

  /** Session mode's rhythm lock; while the controller loads, the saved choice it starts from. */
  // @spec-link [[req_rhythm_lock]]
  // @spec-link [[rule_first_phrase_waits_for_saved_settings]]
  const rhythmLockOn = computed(
    () => deps.controller()?.state.rhythmLockOn ?? deps.savedSessionOptions().rhythmLockOn,
  )

  /** The rhythm changes the lock allows; while the controller loads, the saved choice. */
  // @spec-link [[rule_allowed_rhythm_changes]]
  // @spec-link [[rule_first_phrase_waits_for_saved_settings]]
  const allowedRhythmChanges = computed(
    () =>
      deps.controller()?.state.allowedRhythmChanges ??
      deps.savedSessionOptions().allowedRhythmChanges,
  )

  /**
   * The page's `Tension across phrases` flag; while the controller loads, the saved choice it
   * starts from. It only says whether the arc runs: the Tension control never shows a phrase's
   * step.
   */
  // @spec-link [[req_multi_phrase_tension_arc]]
  // @spec-link [[rule_first_phrase_waits_for_saved_settings]]
  const tensionAcrossPhrases = computed(
    () =>
      deps.controller()?.state.tensionAcrossPhrases ??
      deps.savedSessionOptions().tensionAcrossPhrases,
  )

  /**
   * The `Rising tempo` control and the reached-tempo note, read from the controller. While it
   * loads the control shows Off, unavailable: what it shows once the controller exists with no MIDI
   * controller attached, whatever the saved choice, so nothing changes value when it arrives.
   */
  // @spec-link [[req_adaptive_tempo]]
  const risingTempo = useRisingTempoControl(deps.controller)

  /**
   * Intent: forward the player's `Rising tempo` choice to the controller, which holds it, and save
   * it once accepted; a change the controller refuses throws there and saves nothing.
   */
  // @spec-link [[req_adaptive_tempo]]
  // @spec-link [[rule_settings_saved_on_change]]
  function setRisingTempo(on: boolean): void {
    deps.requireController().setAdaptiveTempo(on)
    deps.saveSettings({ 'sessionOptions.risingTempo': on })
  }

  /**
   * Intent: forward the player's `Tension across phrases` choice to the controller, which holds it,
   * and save it once accepted; a change the controller refuses throws there and saves nothing.
   */
  // @spec-link [[req_multi_phrase_tension_arc]]
  // @spec-link [[rule_settings_saved_on_change]]
  function setTensionAcrossPhrases(on: boolean): void {
    deps.requireController().setTensionAcrossPhrases(on)
    deps.saveSettings({ 'sessionOptions.tensionAcrossPhrases': on })
  }

  /**
   * Intent: forward the player's `Vary settings` choice to the controller, which holds it, and save
   * it once accepted; a change the controller refuses throws there and saves nothing.
   */
  // @spec-link [[req_settings_mutation_flag]]
  // @spec-link [[rule_settings_saved_on_change]]
  function setVarySettings(on: boolean): void {
    deps.requireController().setVarySettings(on)
    deps.saveSettings({ 'sessionOptions.varySettings': on })
  }

  /**
   * Intent: forward the player's allowed groups to the controller, which holds them, and save them
   * once accepted; a change the controller refuses throws there and saves nothing.
   */
  // @spec-link [[rule_vary_settings_allowed_groups]]
  // @spec-link [[rule_settings_saved_on_change]]
  function setAllowedGroups(groups: AllowedGroups): void {
    deps.requireController().setAllowedGroups(groups)
    deps.saveSettings({ 'sessionOptions.allowedGroups': groups })
  }

  /**
   * Intent: forward the player's `Rhythm lock` choice to the controller, which holds it, and save
   * it once accepted; a change the controller refuses throws there and saves nothing.
   */
  // @spec-link [[req_rhythm_lock]]
  // @spec-link [[rule_settings_saved_on_change]]
  function setRhythmLockOn(on: boolean): void {
    deps.requireController().setRhythmLockOn(on)
    deps.saveSettings({ 'sessionOptions.rhythmLockOn': on })
  }

  /**
   * Intent: forward the player's allowed rhythm changes to the controller, which holds them, and
   * save them once accepted; a change the controller refuses throws there and saves nothing.
   */
  // @spec-link [[rule_allowed_rhythm_changes]]
  // @spec-link [[rule_settings_saved_on_change]]
  function setAllowedRhythmChanges(kinds: readonly RhythmChangeKind[]): void {
    deps.requireController().setAllowedRhythmChanges(kinds)
    deps.saveSettings({ 'sessionOptions.allowedRhythmChanges': kinds })
  }

  return {
    sessionOptionsReadonly,
    varySettings,
    varySettingsAvailable,
    allowedGroups,
    rhythmLockOn,
    allowedRhythmChanges,
    tensionAcrossPhrases,
    risingTempo,
    setVarySettings,
    setAllowedGroups,
    setRhythmLockOn,
    setAllowedRhythmChanges,
    setTensionAcrossPhrases,
    setRisingTempo,
  }
}
