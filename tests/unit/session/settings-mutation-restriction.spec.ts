/**
 * Vary settings inside the restriction in force at the session's start: the session freezes that
 * restriction into its start settings (nothing when none, or when it allows every key and mode),
 * and every key or mode move outside it is drawn again, as a move onto an unsupported combination
 * is. Under Reel the mode moves only between Mixolydian and Dorian; under a one-mode preset the
 * mode never moves while the key does; under a one-pair player preset neither moves; with none in
 * force the draws are v3.0's. The redraws a restriction adds stay far below the draw's bound.
 */

import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

import {
  NOTE_DENSITIES,
  RHYTHMIC_VARIETIES,
  SILENCE_DENSITIES,
  SYNCOPATIONS,
  type GenerationControls,
} from '@/domain/controls/generation-controls'
import { DEFAULT_GENERATION_CONTROLS } from '@/domain/controls/profile-selection'
import { isRhythmSettingBlocked } from '@/domain/controls/unsupported-rhythm-settings'
import { NEUTRAL_FIGURE_LEVELS } from '@/domain/figures/figure-levels'
import {
  BUILT_IN_PRESETS,
  builtInPreset,
  type BuiltInPresetId,
} from '@/domain/presets/built-in-presets'
import { allowsKeyAndMode, onlyKeyAndMode } from '@/domain/presets/key-and-mode-restriction'
import {
  choosePreset,
  makePreset,
  type Preset,
  type PresetSelection,
} from '@/domain/presets/preset-selection'
import { makeSeed } from '@/domain/random/seed'
import { landingMutation } from '@/session/session-mutation-step'
import { changedSettings } from '@/session/session-settings-change'
import type { SessionSettings } from '@/session/session-types'
import {
  ALL_GROUPS_ALLOWED,
  withRestrictionAtStart,
  type MutationContext,
  type SettingsMutationResult,
} from '@/session/settings-mutation'
import { mutatedMove } from './settings-mutation-moves'

const WIDE: MutationContext = {
  belowTabletLandscape: false,
  sessionSteppedDown: false,
  resolvedRegister: 'Middle',
}

const CONTEXTS: readonly MutationContext[] = [false, true].flatMap((belowTabletLandscape) =>
  [false, true].map((sessionSteppedDown) => ({
    belowTabletLandscape,
    sessionSteppedDown,
    resolvedRegister: 'Middle' as const,
  })),
)

/** Generous timeout for the tests that draw many mutations, on a loaded machine too. */
const MANY_DRAWS_TIMEOUT_MS = 60_000

/** The draw's bound on redraws, private to settings-mutation.ts (spec B12). */
const MAX_MUTATION_DRAWS = 10_000

/** The player preset kept to one written key and one mode: D Dorian. */
const ONE_PAIR: Preset = makePreset({
  ...builtInPreset('neutral'),
  id: 'player-d-dorian',
  name: 'D Dorian drill',
  kind: 'player',
  restriction: onlyKeyAndMode('D', 'Dorian'),
})

/** The presets the sessions here know: the built-ins and the one-pair player preset. */
const PRESETS: readonly Preset[] = [...BUILT_IN_PRESETS, ONE_PAIR]

/** The C Ionian settings with Neutral's levels, under the given selection. */
function cIonian(
  selection: PresetSelection,
  controls: Partial<GenerationControls> = {},
): SessionSettings {
  return {
    controls: { ...DEFAULT_GENERATION_CONTROLS, ...controls },
    figureLevels: NEUTRAL_FIGURE_LEVELS,
    selection,
    allowedGroups: ALL_GROUPS_ALLOWED,
    rhythmLockOn: false,
  }
}

/** Intent: the session's start settings after choosing `preset` from C Ionian at Idle. */
function startUnder(preset: Preset, controls: Partial<GenerationControls> = {}): SessionSettings {
  const before = cIonian({ kind: 'preset', presetId: 'neutral' }, controls)
  const chosen = choosePreset(
    { controls: before.controls, levels: before.figureLevels },
    before.selection,
    preset,
  )
  return withRestrictionAtStart(
    {
      controls: chosen.settings.controls,
      figureLevels: chosen.settings.levels,
      selection: chosen.selection,
      allowedGroups: ALL_GROUPS_ALLOWED,
      rhythmLockOn: false,
    },
    PRESETS,
  )
}

/** One mutation of a seeded session: the result, and the selection in effect before it. */
interface SessionMove {
  readonly result: SettingsMutationResult
  readonly selectionBefore: PresetSelection
}

/** The phrases each seeded session here runs through. */
const SESSION_PHRASES = 60

/** The mutation seeds of the seeded sessions here. */
const SESSION_SEEDS = Array.from({ length: 120 }, (_, index) => makeSeed(index * 104_729 + 3))

/**
 * Intent: the mutations of one seeded session from its start settings, as the engine's mutation
 * step lands them phrase after phrase, each from the settings the one before put in effect.
 */
function sessionMoves(start: SessionSettings, seed: ReturnType<typeof makeSeed>): SessionMove[] {
  const moves: SessionMove[] = []
  let settings = start
  for (let phraseNumber = 1; phraseNumber <= SESSION_PHRASES; phraseNumber += 1) {
    const landing = landingMutation({ kind: 'on', seed }, phraseNumber, settings, () => WIDE)
    if (landing === undefined) continue
    const { output } = landing
    if (output.kind !== 'settings-changed' || output.cause !== 'mutation')
      throw new Error('A mutation landing reports a mutation.')
    moves.push({
      result: {
        setting: output.setting,
        ...(output.figure === undefined ? {} : { figure: output.figure }),
        from: output.from,
        to: output.to,
        settings: output.settings,
      },
      selectionBefore: settings.selection,
    })
    settings = landing.settings
  }
  return moves
}

/** Intent: every mutation of every seeded session from these start settings. */
function everySessionMove(start: SessionSettings): SessionMove[] {
  return SESSION_SEEDS.flatMap((seed) => sessionMoves(start, seed))
}

/** Intent: the moves of one setting among these. */
function movesOf(moves: readonly SessionMove[], setting: string): SessionMove[] {
  return moves.filter((move) => move.result.setting === setting)
}

// @test-link [[rule_vary_settings_stays_inside_restriction]]
// @test-link [[rule_restriction_in_force]]
describe('the restriction frozen at Start', () => {
  // @test-link [[rule_vary_settings_stays_inside_restriction]]
  // @test-link [[rule_restriction_in_force]]
  it('carries the restriction in force, and nothing when none is in force or it allows every key and mode', () => {
    expect(startUnder(builtInPreset('reel')).restriction).toStrictEqual({
      keys: 'any',
      modes: ['Mixolydian', 'Dorian'],
    })
    expect(startUnder(ONE_PAIR).restriction).toStrictEqual(onlyKeyAndMode('D', 'Dorian'))
    for (const id of ['neutral', 'jazz', 'gentle', 'speed-drill'] as const)
      expect(Object.hasOwn(startUnder(builtInPreset(id)), 'restriction'), id).toBe(false)
    // Opted out of Reel by a mode outside it: Custom based on Reel, no restriction in force.
    const optedOut = withRestrictionAtStart(
      cIonian({ kind: 'custom', baseId: 'reel' }, { collection: 'Aeolian' }),
      PRESETS,
    )
    expect(Object.hasOwn(optedOut, 'restriction')).toBe(false)
    // Back inside by hand: Custom stays Custom, the base's restriction is in force again.
    const backInside = withRestrictionAtStart(
      cIonian({ kind: 'custom', baseId: 'reel' }, { collection: 'Dorian' }),
      PRESETS,
    )
    expect(backInside.restriction).toStrictEqual(builtInPreset('reel').restriction)
    expect(Object.isFrozen(backInside.restriction)).toBe(true)
  })
})

// @test-link [[rule_vary_settings_stays_inside_restriction]]
// @test-link [[module_session_settings_change]]
describe('the restriction through an automatic settings change', () => {
  // @test-link [[rule_vary_settings_stays_inside_restriction]]
  // @test-link [[module_session_settings_change]]
  it('keeps the one frozen at Start, whatever the change carries', () => {
    const inEffect = startUnder(builtInPreset('reel'))
    const next = { ...inEffect, controls: { ...inEffect.controls, leapiness: 'Angular' as const } }
    const { restriction, ...without } = next
    void restriction
    expect(changedSettings(inEffect, without).restriction).toStrictEqual(inEffect.restriction)
    const other = { ...next, restriction: onlyKeyAndMode('D', 'Dorian') }
    expect(changedSettings(inEffect, other).restriction).toStrictEqual(inEffect.restriction)
    const unbounded = cIonian({ kind: 'preset', presetId: 'neutral' })
    expect(Object.hasOwn(changedSettings(unbounded, other), 'restriction')).toBe(false)
  })
})

// @test-link [[rule_vary_settings_stays_inside_restriction]]
// @test-link [[rule_mutation_rerolls_unsupported_combination]]
// @test-link [[module_settings_mutation]]
// @test-link [[module_session_mutation_step]]
describe(
  'Vary settings over seeded sessions under a restriction',
  { timeout: MANY_DRAWS_TIMEOUT_MS },
  () => {
    // @test-link [[rule_vary_settings_stays_inside_restriction]]
    // @test-link [[module_session_mutation_step]]
    it('moves the mode only between Mixolydian and Dorian under Reel, the key freely', () => {
      const start = startUnder(builtInPreset('reel'))
      expect(start.controls.collection).toBe('Mixolydian')
      const moves = everySessionMove(start)
      const modeMoves = movesOf(moves, 'collection')
      expect(modeMoves.length).toBeGreaterThan(0)
      for (const { result } of modeMoves)
        expect([result.from, result.to].sort()).toStrictEqual(['Dorian', 'Mixolydian'])
      const keysReached = new Set(movesOf(moves, 'tonalCenter').map(({ result }) => result.to))
      expect(keysReached.size).toBeGreaterThan(2)
      for (const { result } of moves)
        expect(['Mixolydian', 'Dorian']).toContain(result.settings.controls.collection)
    })

    // @test-link [[rule_vary_settings_stays_inside_restriction]]
    // @test-link [[module_session_mutation_step]]
    it.each(['modal-dorian', 'pop-song', 'bebop'] as const satisfies readonly BuiltInPresetId[])(
      'never moves the mode under %s while the key moves',
      (id) => {
        const start = startUnder(builtInPreset(id))
        const moves = everySessionMove(start)
        expect(movesOf(moves, 'collection')).toStrictEqual([])
        expect(movesOf(moves, 'tonalCenter').length).toBeGreaterThan(0)
        for (const { result } of moves)
          expect(result.settings.controls.collection).toBe(start.controls.collection)
      },
    )

    // @test-link [[rule_vary_settings_stays_inside_restriction]]
    // @test-link [[module_session_mutation_step]]
    it('moves neither the key nor the mode under a one-pair player preset', () => {
      const start = startUnder(ONE_PAIR, { tonalCenter: 'D', collection: 'Dorian' })
      const moves = everySessionMove(start)
      expect(moves.length).toBeGreaterThan(0)
      expect(movesOf(moves, 'collection')).toStrictEqual([])
      expect(movesOf(moves, 'tonalCenter')).toStrictEqual([])
      for (const { result } of moves) {
        expect(result.settings.controls.tonalCenter).toBe('D')
        expect(result.settings.controls.collection).toBe('Dorian')
      }
    })

    // @test-link [[rule_vary_settings_stays_inside_restriction]]
    // @test-link [[rule_vary_settings_marks_custom]]
    it('never marks Custom after a key or mode move, and keeps the restriction for the whole session', () => {
      const start = startUnder(builtInPreset('reel'))
      const moves = everySessionMove(start)
      const keyOrMode = moves.filter(({ result }) =>
        ['tonalCenter', 'collection'].includes(result.setting),
      )
      expect(keyOrMode.length).toBeGreaterThan(0)
      expect(keyOrMode.some(({ selectionBefore }) => selectionBefore.kind === 'preset')).toBe(true)
      for (const { result, selectionBefore } of keyOrMode)
        expect(result.settings.selection).toStrictEqual(selectionBefore)
      for (const { result } of moves) {
        expect(result.settings.restriction).toStrictEqual(start.restriction)
        const { tonalCenter, collection } = result.settings.controls
        expect(allowsKeyAndMode(builtInPreset('reel').restriction, tonalCenter, collection)).toBe(
          true,
        )
      }
    })

    // @test-link [[rule_vary_settings_stays_inside_restriction]]
    it('bounds nothing in a session started with no restriction in force', () => {
      const optedOut = withRestrictionAtStart(
        cIonian({ kind: 'custom', baseId: 'reel' }, { collection: 'Ionian' }),
        PRESETS,
      )
      const moves = everySessionMove(optedOut)
      const modesReached = new Set(movesOf(moves, 'collection').map(({ result }) => result.to))
      expect([...modesReached]).toEqual(expect.arrayContaining(['Lydian', 'Mixolydian']))
    })
  },
)

/** One recorded v3.0 draw: the start, the seed number, k, and the setting, from and to drawn. */
type RecordedDraw = readonly [
  start: 'neutral' | 'jazz',
  seed: number,
  k: number,
  setting: string,
  from: string,
  to: string,
]

/** The v3.0 draws recorded before the figure step replaced the profile flip. */
const V30_DRAWS: {
  readonly context: MutationContext
  readonly rows: readonly RecordedDraw[]
} = JSON.parse(readFileSync('tests/fixtures/vary-settings/v3.0-mutation-draws.json', 'utf8'))

// @test-link [[rule_vary_settings_stays_inside_restriction]]
// @test-link [[module_settings_mutation]]
describe('Vary settings with no restriction in force', () => {
  // @test-link [[rule_vary_settings_stays_inside_restriction]]
  // @test-link [[module_settings_mutation]]
  it("draws v3.0's moves for the same seeds from start settings frozen at Start", () => {
    const starts = {
      neutral: withRestrictionAtStart(cIonian({ kind: 'preset', presetId: 'neutral' }), PRESETS),
      jazz: startUnder(builtInPreset('jazz')),
    }
    for (const start of Object.values(starts))
      expect(Object.hasOwn(start, 'restriction')).toBe(false)
    expect(V30_DRAWS.rows.length).toBeGreaterThan(0)
    for (const [start, seed, k, setting, from, to] of V30_DRAWS.rows) {
      if (setting === 'musicalProfile') continue
      const result = mutatedMove(starts[start], V30_DRAWS.context, makeSeed(seed), k)
      expect(
        { setting: result.setting, from: result.from, to: result.to },
        `${start} ${seed}/${k}`,
      ).toStrictEqual({ setting, from, to })
    }
  })
})

/** Intent: every chosen rhythm setting the four rhythm controls can form, note density outermost. */
function everyChosenRhythmSetting() {
  return NOTE_DENSITIES.flatMap((noteDensity) =>
    RHYTHMIC_VARIETIES.flatMap((rhythmicVariety) =>
      SILENCE_DENSITIES.flatMap((silenceDensity) =>
        SYNCOPATIONS.map((syncopation) => ({
          noteDensity,
          rhythmicVariety,
          silenceDensity,
          syncopation,
        })),
      ),
    ),
  )
}

// @test-link [[rule_vary_settings_stays_inside_restriction]]
// @test-link [[rule_mutation_rerolls_unsupported_combination]]
describe('the redraw bound under the worst restriction', () => {
  // @test-link [[rule_vary_settings_stays_inside_restriction]]
  // @test-link [[rule_mutation_rerolls_unsupported_combination]]
  it(
    'stays far below the bound under a one-pair restriction with every rhythm setting',
    () => {
      const base = startUnder(ONE_PAIR, { tonalCenter: 'D', collection: 'Dorian' })
      let mostRedraws = 0
      let mutations = 0
      // A fresh seed for every mutation, so each one draws from its own stream.
      let nextSeed = 0
      for (const context of CONTEXTS)
        for (const rhythm of everyChosenRhythmSetting()) {
          const settings: SessionSettings = { ...base, controls: { ...base.controls, ...rhythm } }
          if (isRhythmSettingBlocked(settings.controls, context)) continue
          for (let count = 0; count < 12; count += 1)
            for (const k of [1, 2, 3]) {
              nextSeed += 1
              const seed = makeSeed(nextSeed)
              const result = mutatedMove(settings, context, seed, k, (draws) => {
                mostRedraws = Math.max(mostRedraws, draws - 1)
              })
              mutations += 1
              expect(result.settings.controls.tonalCenter).toBe('D')
              expect(result.settings.controls.collection).toBe('Dorian')
            }
        }
      expect(mutations).toBeGreaterThan(1000)
      expect(mostRedraws).toBeGreaterThan(0)
      expect(mostRedraws).toBeLessThan(MAX_MUTATION_DRAWS / 100)
    },
    MANY_DRAWS_TIMEOUT_MS,
  )
})
