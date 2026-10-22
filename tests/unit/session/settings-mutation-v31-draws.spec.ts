/**
 * The v3.1 Vary settings draws corpus: every landing v3.1.0's sessions made with Vary settings on,
 * from each built-in preset's start, under each mutation context, for six session seeds. The
 * fixture was recorded once on v3.1.0 and is never regenerated; these sessions must keep landing
 * exactly the same moves on the same phrases, with the same draws and the same settings. A failure
 * is fixed in the code, never by re-recording. The sessions run with every allowed group on and
 * the rhythm lock off, Vary settings as v3.1.0 ran it.
 *
 * Since v3.2, `SessionSettings` holds keys v3.1.0's did not (the allowed groups, whether the
 * rhythm lock is on), so the starts check and each landing's settings hash compare the settings
 * projected onto the keys `SessionSettings` had in v3.1.0 (`projectOntoV310Keys`), each with only
 * its v3.1.0 keys, written out as explicit lists so a key added later never leaks in:
 * - `controls`: tempo, tonalCenter, collection, harmonicMotion, tension, noteDensity,
 *   rhythmicVariety, syncopation, silenceDensity, contour, register, leapiness, arpeggioChaos,
 *   instrumentProfileId;
 * - `figureLevels`: passingTone, accentedPassingTone, neighborTone, appoggiatura,
 *   diatonicEnclosure, chromaticApproach, chromaticEnclosure;
 * - `selection`: kind and presetId for a preset, kind and baseId for Custom;
 * - `instrumentProfile`, when present: kind, id, displayName, concertRange (kind, minMidi,
 *   maxMidi), registerWindows (algorithm, minimumSpan, widthNumerator, widthDenominator),
 *   transposition (chromatic, diatonic);
 * - `restriction`, when present: keys and modes.
 * Every row's move, draw count and selection are still compared exactly as recorded.
 */

import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

import { BUILT_IN_PRESET_IDS, builtInPreset } from '@/domain/presets/built-in-presets'

import {
  VARY_SETTINGS_DRAWS_V31_COLUMNS,
  VARY_SETTINGS_DRAWS_V31_CONTEXTS,
  VARY_SETTINGS_DRAWS_V31_LAST_PHRASE,
  VARY_SETTINGS_DRAWS_V31_PRESETS,
  VARY_SETTINGS_DRAWS_V31_SESSION_SEEDS,
  canonicalJson,
  mutationSeedOf,
  projectOntoV310Keys,
  sessionDrawRows,
  startSettings,
  type DrawsContext,
  type DrawsRow,
} from './vary-settings-draws-v31-cases'

/** The recorded corpus, as the fixture holds it. */
const CORPUS: {
  readonly recordedOn: string
  readonly recordedOnAppVersion: string
  readonly lastPhrase: number
  readonly seeds: readonly { readonly session: number; readonly mutation: number }[]
  readonly contexts: readonly DrawsContext[]
  readonly starts: Readonly<Record<string, unknown>>
  readonly columns: readonly string[]
  readonly rows: readonly DrawsRow[]
} = JSON.parse(readFileSync('tests/fixtures/vary-settings/v3.1-mutation-draws.json', 'utf8'))

/** The fewest landings any one session of the corpus holds. */
const MIN_LANDINGS_PER_SESSION = 8

/** Intent: the recorded rows of one session. */
function recordedRows(start: string, context: string, seed: number): DrawsRow[] {
  return CORPUS.rows.filter((row) => row[0] === start && row[1] === context && row[2] === seed)
}

// @test-link [[rule_vary_settings_figure_step]]
// @test-link [[rule_vary_settings_stays_inside_restriction]]
// @test-link [[module_settings_mutation]]
describe('the v3.1 Vary settings draws corpus', () => {
  // @test-link [[rule_vary_settings_figure_step]]
  // @test-link [[rule_vary_settings_stays_inside_restriction]]
  // @test-link [[module_settings_mutation]]
  it('covers every built-in preset under every context for every seed, recorded on v3.1.0', () => {
    expect(CORPUS.recordedOn).toBe('v3.1.0')
    expect(CORPUS.recordedOnAppVersion).toBe('3.1.0')
    expect(CORPUS.lastPhrase).toBe(VARY_SETTINGS_DRAWS_V31_LAST_PHRASE)
    expect(CORPUS.columns).toStrictEqual([...VARY_SETTINGS_DRAWS_V31_COLUMNS])
    expect(CORPUS.contexts).toStrictEqual(VARY_SETTINGS_DRAWS_V31_CONTEXTS)
    expect(Object.keys(CORPUS.starts)).toStrictEqual([...BUILT_IN_PRESET_IDS])
    expect(VARY_SETTINGS_DRAWS_V31_PRESETS).toStrictEqual(BUILT_IN_PRESET_IDS)
    expect(CORPUS.seeds.map(({ session }) => session)).toStrictEqual([
      ...VARY_SETTINGS_DRAWS_V31_SESSION_SEEDS,
    ])
    const contexts = CORPUS.contexts.map((context) => [
      context.belowTabletLandscape,
      context.steppedDownFromPhrase !== null,
    ])
    for (const kind of [
      [false, false],
      [false, true],
      [true, false],
      [true, true],
    ])
      expect(contexts).toContainEqual(kind)
    const restricted = BUILT_IN_PRESET_IDS.filter(
      (id) => builtInPreset(id).restriction.modes !== 'any',
    )
    expect(restricted.length).toBeGreaterThan(0)
    for (const id of restricted) expect(CORPUS.starts[id]).toHaveProperty('restriction')
    for (const start of BUILT_IN_PRESET_IDS)
      for (const context of CORPUS.contexts)
        for (const seed of VARY_SETTINGS_DRAWS_V31_SESSION_SEEDS)
          expect(
            recordedRows(start, context.id, seed).length,
            `${start} ${context.id} ${seed}`,
          ).toBeGreaterThanOrEqual(MIN_LANDINGS_PER_SESSION)
    const settings = new Set(CORPUS.rows.map((row) => row[5]))
    expect(settings).toContain('figureLevels')
    expect(settings).toContain('collection')
    expect(settings).toContain('tonalCenter')
  })

  // @test-link [[rule_vary_settings_stays_inside_restriction]]
  // @test-link [[module_settings_mutation]]
  it('builds the same start settings and mutation seeds as v3.1.0', () => {
    for (const presetId of VARY_SETTINGS_DRAWS_V31_PRESETS)
      expect(
        JSON.parse(canonicalJson(projectOntoV310Keys(startSettings(presetId)))),
        presetId,
      ).toStrictEqual(CORPUS.starts[presetId])
    for (const { session, mutation } of CORPUS.seeds)
      expect(mutationSeedOf(session), `session seed ${session}`).toBe(mutation)
  })

  // @test-link [[rule_vary_settings_figure_step]]
  // @test-link [[rule_vary_settings_stays_inside_restriction]]
  // @test-link [[module_settings_mutation]]
  it.each(VARY_SETTINGS_DRAWS_V31_PRESETS)(
    'lands every recorded move of the %s sessions exactly as v3.1.0 did',
    (presetId) => {
      const restriction = startSettings(presetId).restriction
      for (const context of VARY_SETTINGS_DRAWS_V31_CONTEXTS)
        for (const seed of VARY_SETTINGS_DRAWS_V31_SESSION_SEEDS) {
          const rows = sessionDrawRows(presetId, context, seed)
          expect(rows, `${presetId} ${context.id} ${seed}`).toStrictEqual(
            recordedRows(presetId, context.id, seed),
          )
          if (restriction === undefined || restriction.modes === 'any') continue
          const { modes } = restriction
          for (const [, , , , , setting, , , to] of rows)
            if (setting === 'collection') expect(modes.some((mode) => mode === to)).toBe(true)
        }
    },
  )
})
