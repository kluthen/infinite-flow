/**
 * The "During a session" options of the workspace shell's controls: the page's `Vary settings`,
 * `Tension across phrases` and `Rising tempo` choices, read from the session controller, which
 * holds them, whether they are read-only, and the player's changes forwarded to it. While the
 * controller still loads, the first two show the player's saved choices, which the controller
 * starts from, so neither changes value when it arrives.
 */
import { computed, type ComputedRef } from 'vue'

import type { SessionOptionChoices } from '@/storage/records/setting-defaults'
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
}

/** The options' readings, all reactive, and the player's changes to them. */
// @spec-link [[req_settings_mutation_flag]]
// @spec-link [[req_multi_phrase_tension_arc]]
// @spec-link [[req_adaptive_tempo]]
export interface SessionOptions {
  readonly sessionOptionsReadonly: ComputedRef<boolean>
  readonly varySettings: ComputedRef<boolean>
  readonly tensionAcrossPhrases: ComputedRef<boolean>
  readonly risingTempo: RisingTempoControl
  readonly setVarySettings: (on: boolean) => void
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

  /** Intent: forward the player's `Rising tempo` choice to the controller, which holds it. */
  // @spec-link [[req_adaptive_tempo]]
  function setRisingTempo(on: boolean): void {
    deps.requireController().setAdaptiveTempo(on)
  }

  /**
   * Intent: forward the player's `Tension across phrases` choice to the controller, which holds it.
   */
  // @spec-link [[req_multi_phrase_tension_arc]]
  function setTensionAcrossPhrases(on: boolean): void {
    deps.requireController().setTensionAcrossPhrases(on)
  }

  /** Intent: forward the player's `Vary settings` choice to the controller, which holds it. */
  // @spec-link [[req_settings_mutation_flag]]
  function setVarySettings(on: boolean): void {
    deps.requireController().setVarySettings(on)
  }

  return {
    sessionOptionsReadonly,
    varySettings,
    tensionAcrossPhrases,
    risingTempo,
    setVarySettings,
    setTensionAcrossPhrases,
    setRisingTempo,
  }
}
