/**
 * The settings-mutation draw for tests whose settings always have a move to make: the real draw,
 * its result narrowed to a move, crashing loudly on a dead end, which such a test never expects.
 */

import {
  drawMutation,
  isMutationDeadEnd,
  mutateSettings,
  type MutationDeadEnd,
  type SettingsMutationResult,
} from '@/session/settings-mutation'

/** Intent: a drawn mutation as the move it must be, crashing on a dead end. */
export function moveOf(drawn: SettingsMutationResult | MutationDeadEnd): SettingsMutationResult {
  if (isMutationDeadEnd(drawn)) throw new Error('The mutation met a dead end; a move was expected.')
  return drawn
}

/** Intent: `mutateSettings`, its result a move, crashing on a dead end. */
export function mutatedMove(...args: Parameters<typeof mutateSettings>): SettingsMutationResult {
  return moveOf(mutateSettings(...args))
}

/** Intent: `drawMutation`, its result a move, crashing on a dead end. */
export function drawnMove(...args: Parameters<typeof drawMutation>): SettingsMutationResult {
  return moveOf(drawMutation(...args))
}
