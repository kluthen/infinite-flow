/**
 * Shared cases for the Vary settings groups specs: the group each mutable setting belongs to, as
 * the spec lists it and independently of the code's own table; every subset of the six groups;
 * the session's start settings for each built-in preset; the mutation contexts; and the moves a
 * mutation may make, worked out from the steps the draw lists with every group allowed.
 */

import { DEFAULT_GENERATION_CONTROLS } from '@/domain/controls/profile-selection'
import { NEUTRAL_FIGURE_LEVELS } from '@/domain/figures/figure-levels'
import {
  BUILT_IN_PRESETS,
  builtInPreset,
  type BuiltInPresetId,
} from '@/domain/presets/built-in-presets'
import { choosePreset } from '@/domain/presets/preset-selection'
import { CANONICAL_REGISTER_ORDER } from '@/domain/profile/register-id'
import { freezeSessionSettings } from '@/session/session-intents'
import type { SessionSettings } from '@/session/session-types'
import {
  ALL_GROUPS_ALLOWED,
  mutationCandidates,
  withRestrictionAtStart,
  type AllowedGroups,
  type MutableSetting,
  type MutationCandidate,
  type MutationContext,
  type VarySettingsGroup,
} from '@/session/settings-mutation'

/** The six groups in the order the spec lists them. */
export const SPEC_GROUP_ORDER: readonly VarySettingsGroup[] = [
  'keyAndMode',
  'harmony',
  'tension',
  'rhythm',
  'melodyShape',
  'figures',
]

/** Each group's settings, as the spec lists them. */
export const SPEC_GROUP_SETTINGS: Readonly<Record<VarySettingsGroup, readonly MutableSetting[]>> = {
  keyAndMode: ['tonalCenter', 'collection'],
  harmony: ['harmonicMotion'],
  tension: ['tension'],
  rhythm: ['noteDensity', 'rhythmicVariety', 'syncopation', 'silenceDensity'],
  melodyShape: ['contour', 'register', 'leapiness', 'arpeggioChaos'],
  figures: ['figureLevels'],
}

/** Intent: the group the spec puts a setting in; a setting it does not list is a test bug. */
export function specGroupOf(setting: MutableSetting): VarySettingsGroup {
  const group = SPEC_GROUP_ORDER.find((each) => SPEC_GROUP_SETTINGS[each].includes(setting))
  if (group === undefined) throw new Error(`The spec puts ${setting} in no group.`)
  return group
}

/** Intent: the allowed groups with exactly the given groups on. */
export function groupsOn(on: readonly VarySettingsGroup[]): AllowedGroups {
  return {
    keyAndMode: on.includes('keyAndMode'),
    harmony: on.includes('harmony'),
    tension: on.includes('tension'),
    rhythm: on.includes('rhythm'),
    melodyShape: on.includes('melodyShape'),
    figures: on.includes('figures'),
  }
}

/** All 64 subsets of the six groups, from none on to all six on. */
export const EVERY_GROUP_SUBSET: readonly AllowedGroups[] = Array.from({ length: 64 }, (_, mask) =>
  groupsOn(SPEC_GROUP_ORDER.filter((_group, bit) => (mask & (1 << bit)) !== 0)),
)

/** Intent: the settings with these allowed groups and this lock state, the rest kept. */
export function withGroups(
  settings: SessionSettings,
  allowedGroups: AllowedGroups,
  rhythmLockOn: boolean,
): SessionSettings {
  return { ...settings, allowedGroups, rhythmLockOn }
}

/**
 * Intent: the session's start settings after choosing `presetId` at Idle from C Ionian with
 * Neutral's controls, levels and selection, the restriction in force frozen in, with every group
 * on and the lock off.
 */
export function presetStart(presetId: BuiltInPresetId): SessionSettings {
  const chosen = choosePreset(
    { controls: DEFAULT_GENERATION_CONTROLS, levels: NEUTRAL_FIGURE_LEVELS },
    { kind: 'preset', presetId: 'neutral' },
    builtInPreset(presetId),
  )
  return withRestrictionAtStart(
    {
      controls: chosen.settings.controls,
      figureLevels: chosen.settings.levels,
      selection: chosen.selection,
      allowedGroups: ALL_GROUPS_ALLOWED,
      rhythmLockOn: false,
    },
    BUILT_IN_PRESETS,
  )
}

/** Every window and step-down combination, under every resolved register. */
export const GROUP_CONTEXTS: readonly MutationContext[] = [false, true].flatMap(
  (belowTabletLandscape) =>
    [false, true].flatMap((sessionSteppedDown) =>
      CANONICAL_REGISTER_ORDER.map((resolvedRegister) => ({
        belowTabletLandscape,
        sessionSteppedDown,
        resolvedRegister,
      })),
    ),
)

/**
 * Intent: whether the spec lets Vary settings move a group: its switch is on, and it is not the
 * Rhythm group while the lock is on.
 */
export function specAllows(
  group: VarySettingsGroup,
  allowedGroups: AllowedGroups,
  rhythmLockOn: boolean,
): boolean {
  return allowedGroups[group] && !(group === 'rhythm' && rhythmLockOn)
}

/**
 * Intent: the steps the draw lists for these settings with every group on and the lock off, each
 * marked as the spec marks it for the settings' own groups and lock: supported, and of a group
 * the spec allows.
 */
export function specMarkedCandidates(
  settings: SessionSettings,
  context: MutationContext,
): readonly MutationCandidate[] {
  const everyGroup = freezeSessionSettings(withGroups(settings, ALL_GROUPS_ALLOWED, false))
  return mutationCandidates(everyGroup, context).map((candidate) => ({
    ...candidate,
    supported:
      candidate.supported &&
      specAllows(specGroupOf(candidate.setting), settings.allowedGroups, settings.rhythmLockOn),
  }))
}

/** Intent: one item of a non-empty list, drawn with a float in [0, 1). */
export function pick<T>(items: readonly T[], float: number): T {
  const item = items[Math.floor(float * items.length)]
  if (item === undefined) throw new Error('Cannot pick from an empty list.')
  return item
}
