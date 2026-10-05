/**
 * The "During a session" options of the workspace shell's controls: the page's `Vary settings`,
 * `Tension across phrases` and `Rising tempo` choices, read from the session controller, which
 * holds them, whether they are read-only, and the player's changes forwarded to it.
 */
import { computed, type ComputedRef } from 'vue'

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

  /** The page's `Vary settings` flag, off while the controller loads (as it is at page load). */
  // @spec-link [[req_settings_mutation_flag]]
  const varySettings = computed(() => deps.controller()?.state.varySettings ?? false)

  /**
   * The page's `Tension across phrases` flag, off while the controller loads (as it is at page
   * load). It only says whether the arc runs: the Tension control never shows a phrase's step.
   */
  // @spec-link [[req_multi_phrase_tension_arc]]
  const tensionAcrossPhrases = computed(
    () => deps.controller()?.state.tensionAcrossPhrases ?? false,
  )

  /** The `Rising tempo` control and the reached-tempo note, read from the controller. */
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
