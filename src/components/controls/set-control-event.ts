/**
 * The shared typed `set-control` event payload every control-group component and ControlPanel
 * itself emits: one key from `GenerationControls`, excluding `instrumentProfileId` (which has its
 * own dedicated `select-instrument-profile` event because it is never preset-controlled), paired
 * with a value of exactly that key's own type. A mapped-type union keeps every emitter and
 * listener honest without a hand-written key/value pair per control.
 */
import type { GenerationControls } from '@/domain/controls/generation-controls'

export type SettableControlKey = Exclude<keyof GenerationControls, 'instrumentProfileId'>

export type SetControlPayload = {
  [K in SettableControlKey]: { readonly key: K; readonly value: GenerationControls[K] }
}[SettableControlKey]
