/**
 * The settings-mutation engine's decisions, as pure seeded functions: on which phrase mutation k
 * lands, and what it changes. No clock, browser or session state is read: the session passes the
 * settings in effect, what it knows about the window and its step-down memory, its mutation seed
 * and the mutation's number, and gets the same answer for the same inputs every time.
 */

import { isRhythmSettingBlocked } from '../domain/controls/unsupported-rhythm-settings'
import { deepFreeze } from '../domain/events/deep-freeze'
import type { Seed } from '../domain/random/seed'
import { deriveIndexedStream, type IndexedStream } from '../domain/random/streams'
import { freezeSessionSettings } from './session-intents'
import type { SessionSettings } from './session-types'
import {
  MUTABLE_SETTINGS,
  MUTATION_SCALES,
  SettingsMutationError,
  scaleNeighbours,
  type MutableSetting,
  type MutableValue,
  type MutationContext,
  type MutationScaleEntry,
} from './settings-mutation-scales'

export {
  MUTABLE_SETTINGS,
  MUTATION_SCALES,
  SettingsMutationError,
  scaleNeighbours,
  type MutableSetting,
  type MutableValue,
  type MutationContext,
  type MutationScale,
  type MutationScaleEntry,
  type MutationScaleTable,
} from './settings-mutation-scales'

/** The fewest phrases between two mutations, and before the first one (D176). */
// @spec-link [[req_settings_mutation_flag]]
// @spec-link [[module_settings_mutation]]
export const MUTATION_GAP_MIN = 2

/** The most phrases between two mutations, and before the first one (D176). */
// @spec-link [[req_settings_mutation_flag]]
// @spec-link [[module_settings_mutation]]
export const MUTATION_GAP_MAX = 4

/** The settings-mutation flag: off, or on with the seed the session's mutations replay from. */
// @spec-link [[req_settings_mutation_flag]]
// @spec-link [[module_settings_mutation]]
export type SettingsMutationFlag =
  { readonly kind: 'off' } | { readonly kind: 'on'; readonly seed: Seed }

/** Intent: the flag turned off. */
// @spec-link [[req_settings_mutation_flag]]
export const SETTINGS_MUTATION_OFF: SettingsMutationFlag = deepFreeze<SettingsMutationFlag>({
  kind: 'off',
})

/** Intent: the flag's default: off (D176). */
// @spec-link [[req_settings_mutation_flag]]
export const SETTINGS_MUTATION_DEFAULT: SettingsMutationFlag = SETTINGS_MUTATION_OFF

/** A decided mutation: the setting changed, the value it stepped from and to, and the new settings. */
// @spec-link [[module_settings_mutation]]
// @spec-link [[rule_mutation_draws_setting_then_direction]]
export interface SettingsMutationResult {
  readonly setting: MutableSetting
  readonly from: string
  readonly to: string
  readonly settings: SessionSettings
}

/** One step the draw may land on, and whether the generator supports where it lands. */
// @spec-link [[module_settings_mutation]]
// @spec-link [[rule_mutation_rerolls_unsupported_combination]]
export interface MutationCandidate extends SettingsMutationResult {
  readonly supported: boolean
}

/** Upper bound on redraws, far beyond any real need; reaching it means the stream is broken. */
const MAX_MUTATION_DRAWS = 10_000

/** Intent: crash on a number that cannot be a mutation or phrase number (an integer from 1). */
function requirePositiveInteger(value: number, name: string): void {
  if (!Number.isSafeInteger(value) || value < 1)
    throw new SettingsMutationError(`${name} must be an integer ≥ 1, got ${value}.`)
}

/**
 * Intent: the number of phrases before mutation k (k = 1, 2, …), counted from phrase 1 for k = 1
 * and from mutation k - 1 otherwise: from 2 to 4, from a stream of (seed, k) alone, so each
 * landing phrase is known without replaying earlier mutations.
 */
// @spec-link [[rule_mutation_lands_on_scheduled_phrase]]
// @spec-link [[req_settings_mutation_flag]]
// @spec-link [[module_settings_mutation]]
export function mutationGap(seed: Seed, k: number): number {
  requirePositiveInteger(k, 'A mutation number')
  const stream = deriveIndexedStream(seed, 'settings-mutation-gap', k)
  const span = MUTATION_GAP_MAX - MUTATION_GAP_MIN + 1
  return MUTATION_GAP_MIN + Math.floor(stream.nextFloat() * span)
}

/** Intent: the phrase mutation k lands on: p(1) = 1 + g(1), p(k + 1) = p(k) + g(k + 1). */
// @spec-link [[rule_mutation_lands_on_scheduled_phrase]]
// @spec-link [[module_settings_mutation]]
export function mutationPhrase(seed: Seed, k: number): number {
  requirePositiveInteger(k, 'A mutation number')
  let phrase = 1
  for (let index = 1; index <= k; index += 1) phrase += mutationGap(seed, index)
  return phrase
}

/** Intent: the number k of the mutation landing on a phrase, or undefined when none lands there. */
// @spec-link [[rule_mutation_lands_on_scheduled_phrase]]
// @spec-link [[module_settings_mutation]]
export function mutationIndexLandingOn(seed: Seed, phraseNumber: number): number | undefined {
  requirePositiveInteger(phraseNumber, 'A phrase number')
  let phrase = 1
  for (let k = 1; phrase < phraseNumber; k += 1) {
    phrase += mutationGap(seed, k)
    if (phrase === phraseNumber) return k
  }
  return undefined
}

/**
 * Intent: whether the generator supports where a step lands: its rhythm combination, judged on
 * the density generated with, is not blocked, and a note-density step does not land on
 * `Sixteenth` while it is unavailable (below the width, or once the session stepped down; D177).
 */
// @spec-link [[rule_mutation_rerolls_unsupported_combination]]
// @spec-link [[rule_mutation_sixteenth_blocked_after_step_down]]
function isSupportedStep(
  setting: MutableSetting,
  to: string,
  settings: SessionSettings,
  context: MutationContext,
): boolean {
  const sixteenthUnavailable = context.belowTabletLandscape || context.sessionSteppedDown
  if (setting === 'noteDensity' && to === 'Sixteenth' && sixteenthUnavailable) return false
  return !isRhythmSettingBlocked(settings.controls, context)
}

/** Intent: every step of one setting from its current value, each with its landed settings. */
function settingCandidates<K extends MutableSetting>(
  setting: K,
  settings: SessionSettings,
  context: MutationContext,
): readonly MutationCandidate[] {
  const entry: MutationScaleEntry<MutableValue<K>> = MUTATION_SCALES[setting]
  const from = entry.from(settings, context)
  return scaleNeighbours(entry.scale, from).map((to) => {
    const landed = freezeSessionSettings(entry.apply(settings, to))
    return {
      setting,
      from,
      to,
      settings: landed,
      supported: isSupportedStep(setting, to, landed, context),
    }
  })
}

/**
 * Intent: every step a mutation of these settings could take, setting by setting in
 * `MUTABLE_SETTINGS` order and neighbour by neighbour, each marked supported or not. Unsupported
 * steps are listed too: the draw lands on them and redraws.
 */
// @spec-link [[rule_mutation_draws_setting_then_direction]]
// @spec-link [[rule_mutation_rerolls_unsupported_combination]]
// @spec-link [[module_settings_mutation]]
export function mutationCandidates(
  settings: SessionSettings,
  context: MutationContext,
): readonly MutationCandidate[] {
  return MUTABLE_SETTINGS.flatMap((setting) => settingCandidates(setting, settings, context))
}

/** Intent: one item drawn uniformly from a non-empty list. */
function drawFrom<T>(stream: IndexedStream, items: readonly T[]): T {
  const item = items[Math.floor(stream.nextFloat() * items.length)]
  if (item === undefined) throw new SettingsMutationError('Cannot draw from an empty list.')
  return item
}

/**
 * Intent: draw mutation k from its candidates: one setting uniformly among those with a step, then
 * one of its steps uniformly, redrawn both from the same (seed, k) stream while the step lands on
 * something unsupported. Crashes up front when no candidate is supported, rather than looping.
 */
// @spec-link [[rule_mutation_draws_setting_then_direction]]
// @spec-link [[rule_mutation_rerolls_unsupported_combination]]
// @spec-link [[module_settings_mutation]]
export function drawMutation(
  candidates: readonly MutationCandidate[],
  seed: Seed,
  k: number,
): SettingsMutationResult {
  requirePositiveInteger(k, 'A mutation number')
  if (!candidates.some((candidate) => candidate.supported))
    throw new SettingsMutationError('No mutation of these settings lands on a supported one.')
  const eligible = MUTABLE_SETTINGS.filter((setting) =>
    candidates.some((candidate) => candidate.setting === setting),
  )
  const stream = deriveIndexedStream(seed, 'settings-mutation', k)
  for (let draw = 0; draw < MAX_MUTATION_DRAWS; draw += 1) {
    const setting = drawFrom(stream, eligible)
    const step = drawFrom(
      stream,
      candidates.filter((candidate) => candidate.setting === setting),
    )
    if (step.supported)
      return deepFreeze({ setting, from: step.from, to: step.to, settings: step.settings })
  }
  throw new SettingsMutationError(`No supported mutation came up in ${MAX_MUTATION_DRAWS} draws.`)
}

/**
 * Intent: decide mutation k of a session: from the settings in effect, change exactly one eligible
 * setting by one grade, never tempo or the instrument, landing on a supported combination. The
 * result is a pure function of its inputs. Settings that are unsupported to begin with are a
 * caller bug and throw.
 */
// @spec-link [[module_settings_mutation]]
// @spec-link [[rule_mutation_draws_setting_then_direction]]
// @spec-link [[rule_mutation_rerolls_unsupported_combination]]
// @spec-link [[req_settings_mutation_flag]]
export function mutateSettings(
  settings: SessionSettings,
  context: MutationContext,
  seed: Seed,
  k: number,
): SettingsMutationResult {
  requirePositiveInteger(k, 'A mutation number')
  const current = freezeSessionSettings(settings)
  if (isRhythmSettingBlocked(current.controls, context))
    throw new SettingsMutationError('The settings to mutate are already unsupported.')
  return drawMutation(mutationCandidates(current, context), seed, k)
}
