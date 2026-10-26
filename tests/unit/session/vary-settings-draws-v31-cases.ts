/**
 * The sessions of the v3.1 Vary settings draws corpus, shared by its recording script and its
 * spec. Each session starts from one built-in preset chosen at Idle from C Ionian with Neutral, its
 * restriction frozen into the start settings as Start freezes it, runs with Vary settings on under
 * one mutation context, and lands every scheduled mutation phrase after phrase through the
 * session's own mutation step, each landing's settings the next phrase's settings. Every landing
 * becomes one row: the phrase, the mutation number, the move, the draws it took, the selection and
 * a hash of the settings it put in effect. On v3.1, which recorded the corpus, these rows were
 * written to `tests/fixtures/vary-settings/v3.1-mutation-draws.json`; the spec replays the same
 * sessions, with every allowed group on and the rhythm lock off, and compares. Since v3.2 the
 * settings carry keys v3.1.0's did not (the allowed groups, the lock state), so the starts and the
 * hash compare the settings projected onto the keys `SessionSettings` had in v3.1.0
 * (`projectOntoV310Keys`); the hash of a v3.1.0 landing is then the hash of its full settings.
 */

import { createHash } from 'node:crypto'

import { DEFAULT_GENERATION_CONTROLS } from '@/domain/controls/profile-selection'
import { NEUTRAL_FIGURE_LEVELS } from '@/domain/figures/figure-levels'
import {
  BUILT_IN_PRESETS,
  BUILT_IN_PRESET_IDS,
  builtInPreset,
  type BuiltInPresetId,
} from '@/domain/presets/built-in-presets'
import { choosePreset, type PresetSelection } from '@/domain/presets/preset-selection'
import type { RegisterId } from '@/domain/profile/register-id'
import { makeSeed, type Seed } from '@/domain/random/seed'
import { landingMutation } from '@/session/session-mutation-step'
import { settingsMutationSeed } from '@/session/session-seed-plan'
import type { SessionSettings } from '@/session/session-types'
import {
  ALL_GROUPS_ALLOWED,
  mutationIndexLandingOn,
  withRestrictionAtStart,
  type MutationContext,
} from '@/session/settings-mutation'
import { mutatedMove } from './settings-mutation-moves'

/** The last phrase each session runs to; mutations can land from phrase 3 on. */
export const VARY_SETTINGS_DRAWS_V31_LAST_PHRASE = 31

/** The session seeds of the corpus; each session's mutation seed derives from its session seed. */
export const VARY_SETTINGS_DRAWS_V31_SESSION_SEEDS = [1, 2, 3, 4, 5, 6] as const

/** The presets the sessions start from: the eight built-ins, in id order. */
export const VARY_SETTINGS_DRAWS_V31_PRESETS: readonly BuiltInPresetId[] = BUILT_IN_PRESET_IDS

/**
 * One mutation context of the corpus, as data: whether the window is below tablet landscape, the
 * phrase from which the session has stepped down (null: never), and the register a Varying
 * register resolved to.
 */
export interface DrawsContext {
  readonly id: string
  readonly belowTabletLandscape: boolean
  readonly steppedDownFromPhrase: number | null
  readonly resolvedRegister: RegisterId
}

/**
 * The contexts every session runs under: a wide window that never steps down, a session stepped
 * down from its first mutation on, a narrow window, a narrow window stepped down, and a wide
 * window that steps down mid-session. The resolved register differs between them so that the
 * Varying presets' register moves start from each register.
 */
export const VARY_SETTINGS_DRAWS_V31_CONTEXTS: readonly DrawsContext[] = [
  {
    id: 'normal',
    belowTabletLandscape: false,
    steppedDownFromPhrase: null,
    resolvedRegister: 'Middle',
  },
  {
    id: 'stepped-down',
    belowTabletLandscape: false,
    steppedDownFromPhrase: 2,
    resolvedRegister: 'High',
  },
  {
    id: 'narrow',
    belowTabletLandscape: true,
    steppedDownFromPhrase: null,
    resolvedRegister: 'Low',
  },
  {
    id: 'narrow-stepped-down',
    belowTabletLandscape: true,
    steppedDownFromPhrase: 2,
    resolvedRegister: 'Middle',
  },
  {
    id: 'steps-down-mid-session',
    belowTabletLandscape: false,
    steppedDownFromPhrase: 14,
    resolvedRegister: 'Middle',
  },
]

/**
 * One recorded landing: the session's start, context and session seed, the phrase it landed on,
 * its mutation number k, the setting, figure (null for a setting that is not a figure step), from
 * and to it drew, the draws it took, the selection after it and the hash of its settings.
 */
export type DrawsRow = readonly [
  start: BuiltInPresetId,
  context: string,
  seed: number,
  phrase: number,
  k: number,
  setting: string,
  figure: string | null,
  from: string,
  to: string,
  draws: number,
  selection: string,
  settingsHash: string,
]

/** The fixture's column names, in row order. */
export const VARY_SETTINGS_DRAWS_V31_COLUMNS = [
  'start',
  'context',
  'seed',
  'phrase',
  'k',
  'setting',
  'figure',
  'from',
  'to',
  'draws',
  'selection',
  'settingsHash',
] as const

/** Intent: the mutation context in effect on a phrase of a session run under `context`. */
export function contextOnPhrase(context: DrawsContext, phraseNumber: number): MutationContext {
  const from = context.steppedDownFromPhrase
  return {
    belowTabletLandscape: context.belowTabletLandscape,
    sessionSteppedDown: from !== null && phraseNumber >= from,
    resolvedRegister: context.resolvedRegister,
  }
}

/** Intent: the Vary settings mutation seed of the session with this session seed. */
export function mutationSeedOf(sessionSeed: number): Seed {
  return settingsMutationSeed(makeSeed(sessionSeed))
}

/**
 * Intent: the session's start settings after choosing `presetId` at Idle from C Ionian with
 * Neutral's controls, levels and selection, with the restriction in force frozen in as Start
 * freezes it against the built-in presets, every allowed group on and the rhythm lock off, which
 * is Vary settings as v3.1.0 ran it.
 */
export function startSettings(presetId: BuiltInPresetId): SessionSettings {
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
      allowedRhythmChanges: [],
    },
    BUILT_IN_PRESETS,
  )
}

/**
 * Intent: a value as canonical JSON: object keys sorted, keys holding undefined left out, arrays
 * kept in order, so equal values always give the same text.
 */
export function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map((item) => canonicalJson(item)).join(',')}]`
  if (value !== null && typeof value === 'object') {
    const entries = Object.entries(value)
      .filter(([, item]) => item !== undefined)
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
      .map(([key, item]) => `${JSON.stringify(key)}:${canonicalJson(item)}`)
    return `{${entries.join(',')}}`
  }
  return JSON.stringify(value)
}

/** The keys `GenerationControls` had in v3.1.0. */
const V310_CONTROL_KEYS = [
  'tempo',
  'tonalCenter',
  'collection',
  'harmonicMotion',
  'tension',
  'noteDensity',
  'rhythmicVariety',
  'syncopation',
  'silenceDensity',
  'contour',
  'register',
  'leapiness',
  'arpeggioChaos',
  'instrumentProfileId',
] as const

/** The keys `FigureLevels` had in v3.1.0: the seven figures. */
const V310_FIGURE_KEYS = [
  'passingTone',
  'accentedPassingTone',
  'neighborTone',
  'appoggiatura',
  'diatonicEnclosure',
  'chromaticApproach',
  'chromaticEnclosure',
] as const

/** A settings value projected onto v3.1.0's keys: plain data, compared as canonical JSON only. */
export type V310Projection = Readonly<Record<string, unknown>>

/** Intent: the listed keys of a value and nothing else; a listed key it lacks is a test bug. */
function onlyKeys(value: object, keys: readonly string[], what: string): V310Projection {
  const entries = Object.entries(value)
  return Object.fromEntries(
    keys.map((key) => {
      const entry = entries.find(([name]) => name === key)
      if (entry === undefined) throw new Error(`${what} has no ${key}, a key it had in v3.1.0.`)
      return entry
    }),
  )
}

/**
 * Intent: settings projected onto the keys `SessionSettings` had in v3.1.0, each with only its
 * v3.1.0 keys, so a key added since never reaches the comparison:
 * - `controls`: tempo, tonalCenter, collection, harmonicMotion, tension, noteDensity,
 *   rhythmicVariety, syncopation, silenceDensity, contour, register, leapiness, arpeggioChaos,
 *   instrumentProfileId;
 * - `figureLevels`: passingTone, accentedPassingTone, neighborTone, appoggiatura,
 *   diatonicEnclosure, chromaticApproach, chromaticEnclosure;
 * - `selection`: kind and presetId for a preset, kind and baseId for Custom;
 * - `instrumentProfile`, when present: kind, id, displayName, concertRange (kind, minMidi,
 *   maxMidi), registerWindows (algorithm, minimumSpan, widthNumerator, widthDenominator) and
 *   transposition (chromatic, diatonic);
 * - `restriction`, when present: keys and modes, each `any` or its list.
 */
export function projectOntoV310Keys(settings: SessionSettings): V310Projection {
  const { controls, figureLevels, selection, instrumentProfile, restriction } = settings
  const profile = instrumentProfile
  return {
    controls: onlyKeys(controls, V310_CONTROL_KEYS, 'The controls'),
    figureLevels: onlyKeys(figureLevels, V310_FIGURE_KEYS, 'The figure levels'),
    selection:
      selection.kind === 'preset'
        ? onlyKeys(selection, ['kind', 'presetId'], 'The selection')
        : onlyKeys(selection, ['kind', 'baseId'], 'The selection'),
    ...(profile === undefined
      ? {}
      : {
          instrumentProfile: {
            ...onlyKeys(profile, ['kind', 'id', 'displayName'], 'The instrument profile'),
            concertRange: onlyKeys(
              profile.concertRange,
              ['kind', 'minMidi', 'maxMidi'],
              'The concert range',
            ),
            registerWindows: onlyKeys(
              profile.registerWindows,
              ['algorithm', 'minimumSpan', 'widthNumerator', 'widthDenominator'],
              'The register-window policy',
            ),
            transposition: onlyKeys(
              profile.transposition,
              ['chromatic', 'diatonic'],
              'The transposition',
            ),
          },
        }),
    ...(restriction === undefined
      ? {}
      : { restriction: onlyKeys(restriction, ['keys', 'modes'], 'The restriction') }),
  }
}

/**
 * Intent: the first 16 hex digits of the SHA-256 of the canonical JSON of the settings projected
 * onto v3.1.0's keys, which for settings v3.1.0 could hold is their full canonical JSON.
 */
export function settingsHash(settings: SessionSettings): string {
  const projected = canonicalJson(projectOntoV310Keys(settings))
  return createHash('sha256').update(projected, 'utf8').digest('hex').slice(0, 16)
}

/** Intent: a selection as short text: `preset:<id>`, or `custom:<base id>` (empty: no base). */
function selectionText(selection: PresetSelection): string {
  return selection.kind === 'preset'
    ? `preset:${selection.presetId}`
    : `custom:${selection.baseId ?? ''}`
}

/**
 * Intent: every landing of one seeded session, as rows: from the preset's start settings, phrase
 * after phrase from 2 to the last, the session's mutation step lands the scheduled mutation under
 * the context on that phrase, and its settings are the next phrase's settings. Each landing's
 * draws are counted by drawing the same mutation again with an observer; crashes when that draw
 * does not give the landing's settings.
 */
export function sessionDrawRows(
  presetId: BuiltInPresetId,
  context: DrawsContext,
  sessionSeed: number,
): DrawsRow[] {
  const seed = mutationSeedOf(sessionSeed)
  const rows: DrawsRow[] = []
  let settings = startSettings(presetId)
  for (let phrase = 2; phrase <= VARY_SETTINGS_DRAWS_V31_LAST_PHRASE; phrase += 1) {
    const mutationContext = contextOnPhrase(context, phrase)
    const landing = landingMutation({ kind: 'on', seed }, phrase, settings, () => mutationContext)
    if (landing === undefined) continue
    const { output } = landing
    if (output.kind !== 'settings-changed' || output.cause !== 'mutation')
      throw new Error(`The mutation on phrase ${phrase} met a dead end; v3.1.0 always moved.`)
    const k = mutationIndexLandingOn(seed, phrase)
    if (k === undefined) throw new Error(`No mutation is scheduled on phrase ${phrase}.`)
    let draws = 0
    const drawn = mutatedMove(settings, mutationContext, seed, k, (count) => {
      draws = count
    })
    if (canonicalJson(drawn.settings) !== canonicalJson(landing.settings))
      throw new Error(`The landing on phrase ${phrase} is not the mutation drawn for it.`)
    rows.push([
      presetId,
      context.id,
      sessionSeed,
      phrase,
      k,
      output.setting,
      output.figure ?? null,
      output.from,
      output.to,
      draws,
      selectionText(landing.settings.selection),
      settingsHash(landing.settings),
    ])
    settings = landing.settings
  }
  return rows
}

/** Intent: every session's rows: preset outermost, then context, then session seed. */
export function everySessionDrawRow(): DrawsRow[] {
  return VARY_SETTINGS_DRAWS_V31_PRESETS.flatMap((presetId) =>
    VARY_SETTINGS_DRAWS_V31_CONTEXTS.flatMap((context) =>
      VARY_SETTINGS_DRAWS_V31_SESSION_SEEDS.flatMap((seed) =>
        sessionDrawRows(presetId, context, seed),
      ),
    ),
  )
}
