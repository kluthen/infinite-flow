/**
 * The player presets composable's test rig: a real Idle session (its seams faked, its saved
 * settings recorded: the settings-saver spy) started from two player presets, fake preset saves
 * recording each call and resolving the outcome a test sets, a controller phase and a saving
 * state the test sets, and the refused saves told.
 */
import { shallowRef } from 'vue'

import { usePlayerPresets } from '@/components/workspace/use-player-presets'
import type { SessionControllerPhase } from '@/components/workspace/workspace-session-controller-types'
import {
  makeGenerationControls,
  type GenerationControls,
} from '@/domain/controls/generation-controls'
import { DEFAULT_GENERATION_CONTROLS } from '@/domain/controls/profile-selection'
import { NEUTRAL_FIGURE_LEVELS } from '@/domain/figures/figure-levels'
import type { GenerationIntent } from '@/domain/generation/generation-intent'
import { builtInPreset } from '@/domain/presets/built-in-presets'
import { ANY_KEY_AND_MODE } from '@/domain/presets/key-and-mode-restriction'
import {
  makePreset,
  PRESET_HELD_CONTROL_KEYS,
  type Preset,
  type PresetId,
  type PresetSelection,
} from '@/domain/presets/preset-selection'
import type { SaveOutcome } from '@/storage/save-policy'
import type { PresetSaves } from '@/storage/settings-saver'

import { createFitSession, type Deferred } from '../../composables/fit-session-harness'

/** One call that reached the fake preset saves. */
export type SavesCall =
  | { readonly method: 'savePreset' | 'saveRenamedPreset'; readonly preset: Preset }
  | { readonly method: 'deletePreset'; readonly id: PresetId }

/**
 * Intent: preset saves recording each call and resolving `outcome` (saved unless set), or, while
 * `pending` holds a deferred, that deferred's outcome.
 */
export function fakePresetSaves() {
  const calls: SavesCall[] = []
  const control: { outcome: SaveOutcome; pending: Deferred<SaveOutcome> | null } = {
    outcome: 'saved',
    pending: null,
  }
  /** Intent: the outcome the next call resolves. */
  const respond = (): Promise<SaveOutcome> =>
    control.pending?.promise ?? Promise.resolve(control.outcome)
  const saves: PresetSaves = {
    savePreset: (preset) => {
      calls.push({ method: 'savePreset', preset })
      return respond()
    },
    saveRenamedPreset: (preset) => {
      calls.push({ method: 'saveRenamedPreset', preset })
      return respond()
    },
    deletePreset: (id) => {
      calls.push({ method: 'deletePreset', id })
      return respond()
    },
  }
  return { saves, calls, control }
}

/** A player preset: Jazz's controls with Tension at Build, Dorian only. */
export const LATE_NIGHT: Preset = makePreset({
  id: 'player-1',
  name: 'Late night',
  controls: { ...builtInPreset('jazz').controls, tension: 'Build' },
  levels: { ...NEUTRAL_FIGURE_LEVELS, chromaticApproach: 'favored' },
  restriction: { keys: 'any', modes: ['Dorian'] },
  kind: 'player',
})

/** A second player preset: Neutral's values, any key and mode. */
export const WARM_UP: Preset = makePreset({
  id: 'player-2',
  name: 'Warm-up',
  controls: builtInPreset('neutral').controls,
  levels: NEUTRAL_FIGURE_LEVELS,
  restriction: ANY_KEY_AND_MODE,
  kind: 'player',
})

/** The first-load controls in D Dorian with `preset`'s ten controls, and `changes`. */
export function controlsOf(
  preset: Preset,
  changes: Partial<GenerationControls> = {},
): GenerationControls {
  return makeGenerationControls({
    ...DEFAULT_GENERATION_CONTROLS,
    tonalCenter: 'D',
    collection: 'Dorian',
    ...preset.controls,
    ...changes,
  })
}

/** What a rig starts from. */
export interface RigStart {
  readonly controls?: GenerationControls
  readonly selection?: PresetSelection
  readonly playerPresets?: readonly Preset[]
  readonly generate?: (intent: GenerationIntent) => Promise<GenerationIntent> | undefined
}

/**
 * Intent: the composable over a real Idle session started from `start` (Late night and Warm-up
 * kept, Late night selected in D Dorian unless said otherwise), fake preset saves, a controller
 * phase and a saving state the test sets, ids `new-1`, `new-2`... and the refused saves told.
 */
export function rig(start: RigStart = {}) {
  const fit = createFitSession({
    ...(start.generate === undefined ? {} : { generate: start.generate }),
    initialSettings: {
      controls: start.controls ?? controlsOf(LATE_NIGHT),
      figureLevels: LATE_NIGHT.levels,
      selection: start.selection ?? { kind: 'preset', presetId: 'player-1' },
      playerPresets: start.playerPresets ?? [LATE_NIGHT, WARM_UP],
      theme: 'System',
      myInstrument: null,
    },
  })
  const phase = shallowRef<SessionControllerPhase | null>('idle')
  const savingOff = shallowRef(false)
  const fake = fakePresetSaves()
  const refused: string[] = []
  let ids = 0
  const presets = usePlayerPresets({
    session: fit.session,
    controllerPhase: () => phase.value,
    savingOff: () => savingOff.value,
    saves: fake.saves,
    nextPresetId: () => `new-${String(++ids)}`,
    tellRefusedSave: (name) => refused.push(name),
  })
  return { ...fit, state: fit.session.state, phase, savingOff, fake, refused, presets }
}

/** Intent: the ten preset-held controls of a set of controls. */
export function heldControls(controls: GenerationControls): Record<string, unknown> {
  return Object.fromEntries(PRESET_HELD_CONTROL_KEYS.map((key) => [key, controls[key]]))
}

/** Intent: `count` player presets, `p1`... named "Preset 1"..., Neutral's values. */
export function manyPresets(count: number): Preset[] {
  return Array.from({ length: count }, (_, index) =>
    makePreset({ ...WARM_UP, id: `p${String(index + 1)}`, name: `Preset ${String(index + 1)}` }),
  )
}
