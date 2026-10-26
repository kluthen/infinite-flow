/**
 * Random session settings for the Vary settings property tests: every mutable control and figure
 * level drawn at random, a Custom selection, a restriction holding the current key and mode (or
 * none), any subset of the six groups and the rhythm lock on or off.
 */

import {
  ARPEGGIO_CHAOS_VALUES,
  COLLECTIONS,
  CONTOURS,
  HARMONIC_MOTIONS,
  LEAPINESS_VALUES,
  NOTE_DENSITIES,
  PITCH_CLASSES,
  REGISTER_CHOICES,
  RHYTHMIC_VARIETIES,
  SILENCE_DENSITIES,
  SYNCOPATIONS,
  TENSION_ARCS,
  type Collection,
  type GenerationControls,
  type PitchClass,
} from '@/domain/controls/generation-controls'
import { DEFAULT_GENERATION_CONTROLS } from '@/domain/controls/profile-selection'
import { FIGURE_LEVEL_IDS, type FigureLevels } from '@/domain/figures/figure-levels'
import { BUILT_IN_PRESET_IDS } from '@/domain/presets/built-in-presets'
import {
  makeKeyAndModeRestriction,
  type KeyAndModeRestriction,
  type RestrictionHalf,
} from '@/domain/presets/key-and-mode-restriction'
import type { Mulberry32Generator } from '@/domain/random/prng'
import type { SessionSettings } from '@/session/session-types'
import { EVERY_GROUP_SUBSET, pick } from './vary-settings-groups-cases'

/** Intent: a restriction half: any, or the current value with up to two others. */
function randomHalf<T extends string>(
  random: Mulberry32Generator,
  catalog: readonly T[],
  current: T,
): RestrictionHalf<T> {
  if (random.nextFloat() < 1 / 3) return 'any'
  const others = Array.from({ length: Math.floor(random.nextFloat() * 3) }, () =>
    pick(catalog, random.nextFloat()),
  ).filter((value, at, all) => value !== current && all.indexOf(value) === at)
  return [current, ...others]
}

/**
 * Intent: a restriction holding the current key and mode, as one frozen at a session's start
 * does, or none when both halves allow anything.
 */
function randomRestriction(
  random: Mulberry32Generator,
  tonalCenter: PitchClass,
  collection: Collection,
): KeyAndModeRestriction | undefined {
  const keys = randomHalf(random, PITCH_CLASSES, tonalCenter)
  const modes = randomHalf(random, COLLECTIONS, collection)
  if (keys === 'any' && modes === 'any') return undefined
  return makeKeyAndModeRestriction({ keys, modes })
}

/** Intent: settings with every mutable control and figure level drawn at random. */
export function randomSettings(random: Mulberry32Generator): SessionSettings {
  /** Intent: one value of a catalog, drawn at random. */
  const draw = <T>(catalog: readonly T[]): T => pick(catalog, random.nextFloat())
  const controls: GenerationControls = {
    ...DEFAULT_GENERATION_CONTROLS,
    tonalCenter: draw(PITCH_CLASSES),
    collection: draw(COLLECTIONS),
    harmonicMotion: draw(HARMONIC_MOTIONS),
    tension: draw(TENSION_ARCS),
    noteDensity: draw(NOTE_DENSITIES),
    rhythmicVariety: draw(RHYTHMIC_VARIETIES),
    syncopation: draw(SYNCOPATIONS),
    silenceDensity: draw(SILENCE_DENSITIES),
    contour: draw(CONTOURS),
    register: draw(REGISTER_CHOICES),
    leapiness: draw(LEAPINESS_VALUES),
    arpeggioChaos: draw(ARPEGGIO_CHAOS_VALUES),
  }
  const figureLevels: FigureLevels = {
    passingTone: draw(FIGURE_LEVEL_IDS),
    accentedPassingTone: draw(FIGURE_LEVEL_IDS),
    neighborTone: draw(FIGURE_LEVEL_IDS),
    appoggiatura: draw(FIGURE_LEVEL_IDS),
    diatonicEnclosure: draw(FIGURE_LEVEL_IDS),
    chromaticApproach: draw(FIGURE_LEVEL_IDS),
    chromaticEnclosure: draw(FIGURE_LEVEL_IDS),
  }
  const restriction = randomRestriction(random, controls.tonalCenter, controls.collection)
  return {
    controls,
    figureLevels,
    selection: { kind: 'custom', baseId: draw(BUILT_IN_PRESET_IDS) },
    ...(restriction === undefined ? {} : { restriction }),
    allowedGroups: draw(EVERY_GROUP_SUBSET),
    rhythmLockOn: random.nextFloat() < 0.5,
    allowedRhythmChanges: [],
  }
}
