/**
 * The settings-mutation engine's decisions, as pure seeded functions: on which phrase mutation k
 * lands, and what it changes. No clock, browser or session state is read: the session passes the
 * settings in effect, what it knows about the window and its step-down memory, its mutation seed
 * and the mutation's number, and gets the same answer for the same inputs every time.
 */

import type { GenerationControls } from '../domain/controls/generation-controls'
import { isRhythmSettingBlocked } from '../domain/controls/unsupported-rhythm-settings'
import { deepFreeze } from '../domain/events/deep-freeze'
import { FIGURE_IDS, type FigureId } from '../domain/figures/figure-levels'
import {
  allowsKeyAndMode,
  isAnyKeyAndMode,
  makeKeyAndModeRestriction,
} from '../domain/presets/key-and-mode-restriction'
import { restrictionInForce, type Preset } from '../domain/presets/preset-selection'
import type { Seed } from '../domain/random/seed'
import { deriveIndexedStream, type IndexedStream } from '../domain/random/streams'
import { freezeSessionSettings } from './session-intents'
import type { SessionSettings } from './session-types'
import {
  MUTABLE_SETTING_GROUPS,
  MUTABLE_SETTINGS,
  MUTATION_SCALES,
  SettingsMutationError,
  isGroupAllowed,
  scaleNeighbours,
  type ControlScaleTable,
  type MutableControl,
  type MutableSetting,
  type MutationContext,
  type MutationScaleEntry,
} from './settings-mutation-scales'

export {
  ALL_GROUPS_ALLOWED,
  MUTABLE_SETTING_GROUPS,
  MUTABLE_SETTINGS,
  MUTATION_SCALES,
  SettingsMutationError,
  VARY_SETTINGS_GROUPS,
  isGroupAllowed,
  scaleNeighbours,
  type AllowedGroups,
  type ControlScaleTable,
  type FigureStepEntry,
  type MutableControl,
  type MutableSetting,
  type MutableValue,
  type MutationContext,
  type MutationScale,
  type MutationScaleEntry,
  type MutationScaleTable,
  type VarySettingsGroup,
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

/**
 * A decided mutation: the setting changed, the value it stepped from and to, and the new settings.
 * A figure step names the figure it moved, and its from and to are that figure's levels; no other
 * step has a figure.
 */
// @spec-link [[module_settings_mutation]]
// @spec-link [[rule_mutation_draws_setting_then_direction]]
export interface SettingsMutationResult {
  readonly setting: MutableSetting
  readonly figure?: FigureId
  readonly from: string
  readonly to: string
  readonly settings: SessionSettings
}

/**
 * One step the draw may land on, and whether it may land there: the generator supports it, a key
 * or mode step stays inside the restriction frozen at the session's start, and its setting's group
 * is allowed (the Rhythm group not while the rhythm lock is on).
 */
// @spec-link [[module_settings_mutation]]
// @spec-link [[rule_mutation_rerolls_unsupported_combination]]
// @spec-link [[rule_vary_settings_stays_inside_restriction]]
export interface MutationCandidate extends SettingsMutationResult {
  readonly supported: boolean
}

/**
 * A mutation with no move to make: no step of the settings is a supported one inside the allowed
 * groups. The module returns it instead of a result and throws nothing; the session skips that
 * mutation.
 */
// @spec-link [[module_settings_mutation]]
export interface MutationDeadEnd {
  readonly kind: 'dead-end'
}

/** Intent: the one dead end every mutation with no move returns, the same for the same inputs. */
// @spec-link [[module_settings_mutation]]
export const MUTATION_DEAD_END: MutationDeadEnd = deepFreeze<MutationDeadEnd>({ kind: 'dead-end' })

/** Intent: whether a drawn mutation is the dead end rather than a move. */
// @spec-link [[module_settings_mutation]]
export function isMutationDeadEnd(
  drawn: SettingsMutationResult | MutationDeadEnd,
): drawn is MutationDeadEnd {
  return 'kind' in drawn && drawn.kind === 'dead-end'
}

/** Upper bound on redraws, far beyond any real need; reaching it means the stream is broken. */
const MAX_MUTATION_DRAWS = 10_000

/**
 * Told, once a mutation is drawn, how many draws it took, the first included: 1 when the first
 * draw landed on a supported step, more for each redraw. An injected seam: the draw is the same
 * with or without it.
 */
// @spec-link [[rule_mutation_rerolls_unsupported_combination]]
// @spec-link [[rule_vary_settings_stays_inside_restriction]]
export type MutationDrawsObserver = (draws: number) => void

/**
 * Intent: the session's start settings with the restriction in force frozen into them, worked out
 * from their selection, written key and collection against the presets the session knows: the
 * selected preset's, or Custom's base's, while the key and mode are inside it. None in force, or
 * one that allows every key and mode, leaves the settings without one, so a session started there
 * is not bounded. Any restriction the settings already carried is replaced.
 */
// @spec-link [[rule_vary_settings_stays_inside_restriction]]
// @spec-link [[rule_restriction_in_force]]
export function withRestrictionAtStart(
  settings: SessionSettings,
  presets: readonly Preset[],
): SessionSettings {
  const { restriction: carried, ...rest } = settings
  void carried
  const { selection, controls } = settings
  const inForce = restrictionInForce(selection, controls.tonalCenter, controls.collection, presets)
  if (inForce === null || isAnyKeyAndMode(inForce)) return rest
  return { ...rest, restriction: makeKeyAndModeRestriction(inForce) }
}

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
 * Intent: whether a key or mode step lands outside the restriction frozen at the session's start.
 * Settings carrying none bound nothing; no other step moves the key or the mode.
 */
// @spec-link [[rule_vary_settings_stays_inside_restriction]]
function leavesRestriction(setting: MutableSetting, settings: SessionSettings): boolean {
  if (settings.restriction === undefined) return false
  if (setting !== 'tonalCenter' && setting !== 'collection') return false
  const { tonalCenter, collection } = settings.controls
  return !allowsKeyAndMode(settings.restriction, tonalCenter, collection)
}

/**
 * Intent: whether a step may land where it does: its setting's group is allowed (the Rhythm group
 * not while the rhythm lock is on), its rhythm combination, judged on the density generated with,
 * is not blocked, a note-density step does not land on `Sixteenth` while it is unavailable (below
 * the width, or once the session stepped down; D177), and a key or mode step stays inside the
 * restriction frozen at the session's start. A step that may not is drawn again, a step of a group
 * not allowed by the same route as an unsupported landing, so the stream is consumed alike.
 */
// @spec-link [[rule_mutation_rerolls_unsupported_combination]]
// @spec-link [[rule_mutation_sixteenth_blocked_after_step_down]]
// @spec-link [[rule_vary_settings_stays_inside_restriction]]
function isSupportedStep(
  setting: MutableSetting,
  to: string,
  settings: SessionSettings,
  context: MutationContext,
): boolean {
  if (!isGroupAllowed(MUTABLE_SETTING_GROUPS[setting], settings)) return false
  const sixteenthUnavailable = context.belowTabletLandscape || context.sessionSteppedDown
  if (setting === 'noteDensity' && to === 'Sixteenth' && sixteenthUnavailable) return false
  if (leavesRestriction(setting, settings)) return false
  return !isRhythmSettingBlocked(settings.controls, context)
}

/** Intent: one step landing on `settings`, frozen and marked supported or not, figure kept. */
function candidateOf(
  step: { readonly setting: MutableSetting; readonly figure?: FigureId },
  from: string,
  to: string,
  settings: SessionSettings,
  context: MutationContext,
): MutationCandidate {
  const landed = freezeSessionSettings(settings)
  return {
    setting: step.setting,
    ...(step.figure === undefined ? {} : { figure: step.figure }),
    from,
    to,
    settings: landed,
    supported: isSupportedStep(step.setting, to, landed, context),
  }
}

/** Intent: every step of one control from its current value, each with its landed settings. */
function controlCandidates<K extends MutableControl>(
  setting: K,
  settings: SessionSettings,
  context: MutationContext,
): readonly MutationCandidate[] {
  const table: ControlScaleTable = MUTATION_SCALES
  const entry: MutationScaleEntry<GenerationControls[K]> = table[setting]
  const from = entry.from(settings, context)
  return scaleNeighbours(entry.scale, from).map((to) =>
    candidateOf({ setting }, from, to, entry.apply(settings, to), context),
  )
}

/**
 * Intent: every figure step from the current levels, figure by figure in FIGURE_IDS order and
 * level by level: one figure one level up or down, never past Off or Strongly favored.
 */
// @spec-link [[rule_vary_settings_figure_step]]
function figureCandidates(
  settings: SessionSettings,
  context: MutationContext,
): readonly MutationCandidate[] {
  const entry = MUTATION_SCALES.figureLevels
  return entry.figures.flatMap((figure) => {
    const from = entry.from(settings, figure)
    return scaleNeighbours(entry.scale, from).map((to) =>
      candidateOf(
        { setting: 'figureLevels', figure },
        from,
        to,
        entry.apply(settings, figure, to),
        context,
      ),
    )
  })
}

/**
 * Intent: every step a mutation of these settings could take, setting by setting in
 * `MUTABLE_SETTINGS` order and neighbour by neighbour (the figure levels' figure by figure), each
 * marked supported or not. Unsupported
 * steps are listed too: the draw lands on them and redraws.
 */
// @spec-link [[rule_mutation_draws_setting_then_direction]]
// @spec-link [[rule_mutation_rerolls_unsupported_combination]]
// @spec-link [[module_settings_mutation]]
export function mutationCandidates(
  settings: SessionSettings,
  context: MutationContext,
): readonly MutationCandidate[] {
  return MUTABLE_SETTINGS.flatMap((setting) =>
    setting === 'figureLevels'
      ? figureCandidates(settings, context)
      : controlCandidates(setting, settings, context),
  )
}

/** Intent: one item drawn uniformly from a non-empty list. */
function drawFrom<T>(stream: IndexedStream, items: readonly T[]): T {
  const item = items[Math.floor(stream.nextFloat() * items.length)]
  if (item === undefined) throw new SettingsMutationError('Cannot draw from an empty list.')
  return item
}

/**
 * Intent: the figure steps a draw chooses among: one figure drawn uniformly among the figures
 * with a step, then that figure's steps. Only a figure-levels draw calls it, so every other
 * setting's draw takes exactly the floats it took when the musical profile held this place.
 */
// @spec-link [[rule_vary_settings_figure_step]]
function drawnFigureSteps(
  stream: IndexedStream,
  steps: readonly MutationCandidate[],
): readonly MutationCandidate[] {
  const figures = FIGURE_IDS.filter((figure) => steps.some((step) => step.figure === figure))
  const figure = drawFrom(stream, figures)
  return steps.filter((step) => step.figure === figure)
}

/** Intent: the result a drawn step gives: the step without its support mark, frozen. */
function resultOf(step: MutationCandidate): SettingsMutationResult {
  const { setting, from, to, settings } = step
  return deepFreeze({
    setting,
    ...(step.figure === undefined ? {} : { figure: step.figure }),
    from,
    to,
    settings,
  })
}

/**
 * Intent: draw mutation k from its candidates: one setting uniformly among those with a step;
 * for the figure levels, one figure uniformly among those with a step; then one of its steps
 * uniformly; all redrawn from the same (seed, k) stream while the step lands on something
 * unsupported, outside the restriction frozen at the session's start, or moves a setting whose
 * group is not allowed (each marked unsupported among the candidates, so every setting with a step
 * keeps its place in the draw). When no candidate is supported, the mutation is a dead end: the
 * dead end is returned up front, nothing drawn, `observe` not told and nothing thrown. No supported
 * draw within a fixed bound of draws throws rather than looping. `observe`, when given, is told
 * how many draws a move took.
 */
// @spec-link [[rule_mutation_draws_setting_then_direction]]
// @spec-link [[rule_mutation_rerolls_unsupported_combination]]
// @spec-link [[rule_vary_settings_figure_step]]
// @spec-link [[rule_vary_settings_stays_inside_restriction]]
// @spec-link [[module_settings_mutation]]
export function drawMutation(
  candidates: readonly MutationCandidate[],
  seed: Seed,
  k: number,
  observe?: MutationDrawsObserver,
): SettingsMutationResult | MutationDeadEnd {
  requirePositiveInteger(k, 'A mutation number')
  if (!candidates.some((candidate) => candidate.supported)) return MUTATION_DEAD_END
  const eligible = MUTABLE_SETTINGS.filter((setting) =>
    candidates.some((candidate) => candidate.setting === setting),
  )
  const stream = deriveIndexedStream(seed, 'settings-mutation', k)
  for (let draw = 0; draw < MAX_MUTATION_DRAWS; draw += 1) {
    const setting = drawFrom(stream, eligible)
    const ofSetting = candidates.filter((candidate) => candidate.setting === setting)
    const steps = setting === 'figureLevels' ? drawnFigureSteps(stream, ofSetting) : ofSetting
    const step = drawFrom(stream, steps)
    if (step.supported) {
      observe?.(draw + 1)
      return resultOf(step)
    }
  }
  throw new SettingsMutationError(`No supported mutation came up in ${MAX_MUTATION_DRAWS} draws.`)
}

/**
 * Intent: decide mutation k of a session: from the settings in effect, change exactly one eligible
 * setting by one grade (a figure step, one figure by one level), never tempo or the instrument,
 * landing on a supported combination, a key or mode step inside the restriction the settings
 * carry from the session's start (none bounds nothing), and only a setting of an allowed group,
 * never the Rhythm group while the rhythm lock is on; a step of a preset-held setting marks the
 * selection Custom, a key or mode step never does. When no step is a supported one inside the
 * allowed groups (exactly when `hasLegalMove` is false), the mutation is a dead end, returned
 * instead of a move, throwing nothing. The result, move or dead end, is a pure function of its
 * inputs; `observe`, when given, is told how many draws a move took. Settings that are
 * unsupported to begin with are a caller bug and throw.
 */
// @spec-link [[module_settings_mutation]]
// @spec-link [[rule_mutation_draws_setting_then_direction]]
// @spec-link [[rule_mutation_rerolls_unsupported_combination]]
// @spec-link [[rule_vary_settings_stays_inside_restriction]]
// @spec-link [[req_settings_mutation_flag]]
export function mutateSettings(
  settings: SessionSettings,
  context: MutationContext,
  seed: Seed,
  k: number,
  observe?: MutationDrawsObserver,
): SettingsMutationResult | MutationDeadEnd {
  requirePositiveInteger(k, 'A mutation number')
  const current = freezeSessionSettings(settings)
  if (isRhythmSettingBlocked(current.controls, context))
    throw new SettingsMutationError('The settings to mutate are already unsupported.')
  return drawMutation(mutationCandidates(current, context), seed, k, observe)
}

/**
 * Intent: the legal-move check: whether at least one step from the settings in effect lands on a
 * supported combination inside the allowed groups, under this mutation context. The Rhythm group
 * does not count while the rhythm lock is on, and a key or mode step counts only inside the
 * restriction the settings carry. False exactly when a mutation of these settings is a dead end.
 * Settings unsupported to begin with are judged by their steps like any others: a rhythm step
 * leading out of the block counts.
 */
// @spec-link [[rule_vary_settings_needs_legal_move]]
// @spec-link [[module_settings_mutation]]
export function hasLegalMove(settings: SessionSettings, context: MutationContext): boolean {
  return mutationCandidates(freezeSessionSettings(settings), context).some(
    (candidate) => candidate.supported,
  )
}
