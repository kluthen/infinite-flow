/**
 * The look-ahead deadline sweep's cases: every supported rhythm setting crossed with the seed
 * matrix's seeds, every value of every other generation control and both values of each session
 * flag assigned to them deterministically, and the chosen settings a case runs a session with.
 */

import {
  ARPEGGIO_CHAOS_VALUES,
  COLLECTIONS,
  CONTOURS,
  HARMONIC_MOTIONS,
  INSTRUMENT_PROFILE_IDS,
  LEAPINESS_VALUES,
  MUSICAL_PROFILES,
  PITCH_CLASSES,
  REGISTER_CHOICES,
  makeGenerationControls,
  type GenerationControls,
  type MusicalProfile,
} from '@/domain/controls/generation-controls'
import { isRhythmSettingBlocked } from '@/domain/controls/unsupported-rhythm-settings'
import { levelsForProfile, type FigureLevels } from '@/domain/figures/figure-levels'
import type { KeyAndModeRestriction } from '@/domain/presets/key-and-mode-restriction'
import type { PresetSelection } from '@/domain/presets/preset-selection'
import type { SessionSettings } from '@/session/session-types'
import { ALL_GROUPS_ALLOWED } from '@/session/settings-mutation'
import { SEEDS } from '../domain/generation/carry-in/carry-in-matrix'
import {
  allRhythmSettings,
  settingKey,
  type RhythmSetting,
} from '../domain/generation/orchestration/cold-generation-golden/cold-generation-golden-fixture'

/** The window every swept session runs in: at or above the tablet-landscape width. */
const WIDE_WINDOW = { belowTabletLandscape: false, sessionSteppedDown: false }

/** One case of the sweep: the chosen settings and flags of one session, and its seeds. */
export interface SweepCase {
  readonly index: number
  readonly label: string
  readonly rhythm: RhythmSetting
  /** The seed-matrix seed phrase 1 is first generated with at Idle. */
  readonly seed: number
  /** The session seed drawn with phrase 1: every seed the session uses derives from it. */
  readonly firstSessionSeed: number
  readonly controls: Omit<GenerationControls, 'tempo'>
  readonly musicalProfile: MusicalProfile
  /** The "Vary settings" flag: the settings mutation, on with its own seed, or off. */
  readonly varySettings: boolean
  /** The "Tension across phrases" flag: the multi-phrase tension arc. */
  readonly tensionAcrossPhrases: boolean
  /**
   * What a measured setting puts in place of the case's profile (the cost runner, M2): the figure
   * levels, the selection and the restriction in force at the session's start. Unset, the case runs
   * with its profile's levels, Custom based on the preset of that name, and no restriction.
   */
  readonly figureLevels?: FigureLevels
  readonly selection?: PresetSelection
  readonly restriction?: KeyAndModeRestriction
}

/** Intent: every rhythm setting of the 324-setting catalog that does not block generation. */
export function supportedRhythmSettings(): readonly RhythmSetting[] {
  return allRhythmSettings().filter((setting) => !isRhythmSettingBlocked(setting, WIDE_WINDOW))
}

/**
 * The generation controls and session flags outside the rhythm setting, each with every value it
 * can take. Tempo is not among them: each case runs at every sweep tempo.
 */
export const NON_RHYTHM_DIMENSIONS = {
  tonalCenter: PITCH_CLASSES,
  collection: COLLECTIONS,
  harmonicMotion: HARMONIC_MOTIONS,
  contour: CONTOURS,
  register: REGISTER_CHOICES,
  leapiness: LEAPINESS_VALUES,
  arpeggioChaos: ARPEGGIO_CHAOS_VALUES,
  instrumentProfileId: INSTRUMENT_PROFILE_IDS,
  musicalProfile: MUSICAL_PROFILES,
  varySettings: [false, true],
  tensionAcrossPhrases: [true, false],
} as const

/**
 * Intent: the value one dimension takes in case `index`, round-robin with a per-dimension shift
 * after each full turn, so every value appears within the first `values.length` cases and two
 * dimensions of the same size do not stay locked in the same pairs.
 */
function roundRobin<T>(values: readonly T[], index: number, shift: number): T {
  const turn = Math.floor(index / values.length)
  return values[(index + turn * shift) % values.length]!
}

/**
 * Intent: the sweep's cases, in a fixed order: each supported rhythm setting with each seed of the
 * seed matrix, and every other control and flag assigned round-robin over the case index.
 */
export function sweepCases(): readonly SweepCase[] {
  const d = NON_RHYTHM_DIMENSIONS
  return supportedRhythmSettings().flatMap((rhythm, settingIndex) =>
    SEEDS.map((seed, seedIndex): SweepCase => {
      const index = settingIndex * SEEDS.length + seedIndex
      const controls = {
        tonalCenter: roundRobin(d.tonalCenter, index, 1),
        collection: roundRobin(d.collection, index, 2),
        harmonicMotion: roundRobin(d.harmonicMotion, index, 1),
        tension: rhythm.tensionArc,
        noteDensity: rhythm.noteDensity,
        rhythmicVariety: rhythm.rhythmicVariety,
        syncopation: rhythm.syncopation,
        silenceDensity: rhythm.silenceDensity,
        contour: roundRobin(d.contour, index, 1),
        register: roundRobin(d.register, index, 2),
        leapiness: roundRobin(d.leapiness, index, 3),
        arpeggioChaos: roundRobin(d.arpeggioChaos, index, 2),
        instrumentProfileId: roundRobin(d.instrumentProfileId, index, 1),
      }
      const musicalProfile = roundRobin(d.musicalProfile, index, 0)
      const varySettings = roundRobin(d.varySettings, Math.floor(index / 2), 1)
      const tensionAcrossPhrases = roundRobin(d.tensionAcrossPhrases, Math.floor(index / 4), 1)
      const flags = `${varySettings ? 'vary' : 'fixed'}${tensionAcrossPhrases ? ' arc' : ''}`
      return {
        index,
        label: `#${index} ${settingKey(rhythm)} seed ${seed} ${controls.instrumentProfileId} ${controls.register} ${controls.tonalCenter} ${controls.collection} ${musicalProfile} ${flags}`,
        rhythm,
        seed,
        firstSessionSeed: 100_000 + 100 * index,
        controls,
        musicalProfile,
        varySettings,
        tensionAcrossPhrases,
      }
    }),
  )
}

/**
 * Intent: the chosen settings of a case at one tempo: the case's profile's figure levels, the
 * selection Custom based on the preset of that name, unless the case sets its own levels,
 * selection and restriction in force.
 */
export function caseSettings(sweepCase: SweepCase, tempo: number): SessionSettings {
  return {
    controls: makeGenerationControls({ ...sweepCase.controls, tempo }),
    figureLevels: sweepCase.figureLevels ?? levelsForProfile(sweepCase.musicalProfile),
    selection: sweepCase.selection ?? {
      kind: 'custom',
      baseId: sweepCase.musicalProfile === 'Jazz' ? 'jazz' : 'neutral',
    },
    ...(sweepCase.restriction === undefined ? {} : { restriction: sweepCase.restriction }),
    allowedGroups: ALL_GROUPS_ALLOWED,
    rhythmLockOn: false,
  }
}
