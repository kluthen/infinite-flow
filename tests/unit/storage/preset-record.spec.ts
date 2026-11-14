// @vitest-environment node
import { describe, expect, it } from 'vitest'

import {
  CHORD_FAMILY_LEVEL_IDS,
  OFF_CHORD_FAMILIES,
  type ChordFamilies,
} from '@/domain/chords/chord-families'
import { DEFAULT_GENERATION_CONTROLS } from '@/domain/controls/profile-selection'
import { FIGURE_IDS, NEUTRAL_FIGURE_LEVELS } from '@/domain/figures/figure-levels'
import { BUILT_IN_PRESETS, builtInPreset } from '@/domain/presets/built-in-presets'
import { ANY_KEY_AND_MODE } from '@/domain/presets/key-and-mode-restriction'
import {
  makePreset,
  PRESET_HELD_CONTROL_KEYS,
  type Preset,
} from '@/domain/presets/preset-selection'
import { createMulberry32 } from '@/domain/random/prng'
import type { StoredEntry } from '@/storage/database'
import {
  carriedOverPresetRecord,
  decodePlayerPresets,
  encodePresetRecord,
  FIGURE_INTRODUCED_AT,
  missingLevel,
  PRESET_RECORD_DATA_VERSION,
} from '@/storage/records/preset-record'

const APP_VERSION = '3.1.0-test'

/** A player preset every field of which differs from the first-load values. */
const PLAYER: Preset = makePreset({
  id: 'player-1',
  name: 'Late night',
  controls: {
    harmonicMotion: 'Active diatonic',
    tension: 'Build',
    noteDensity: 'Sixteenth',
    rhythmicVariety: 'Heavily varied',
    syncopation: 'Active displacement',
    silenceDensity: 'Breath-heavy',
    contour: 'Falling',
    register: 'High',
    leapiness: 'Angular',
    arpeggioChaos: 'Chaotic',
  },
  levels: {
    passingTone: 'favored',
    accentedPassingTone: 'off',
    neighborTone: 'stronglyFavored',
    appoggiatura: 'asToday',
    diatonicEnclosure: 'favored',
    chromaticApproach: 'stronglyFavored',
    chromaticEnclosure: 'asToday',
  },
  chordFamilies: { 'seventh-chords': 'stronglyFavored' },
  restriction: { keys: ['D', 'A'], modes: ['Dorian', 'Mixolydian'] },
  kind: 'player',
})

/** PLAYER's controls and figure levels as a record's JSON holds them. */
const PLAYER_CONTROLS_AND_LEVELS_JSON =
  '"controls":{"harmonicMotion":"Active diatonic","tension":"Build","noteDensity":"Sixteenth",' +
  '"rhythmicVariety":"Heavily varied","syncopation":"Active displacement",' +
  '"silenceDensity":"Breath-heavy","contour":"Falling","register":"High","leapiness":"Angular",' +
  '"arpeggioChaos":"Chaotic"},"levels":{"passingTone":"favored","accentedPassingTone":"off",' +
  '"neighborTone":"stronglyFavored","appoggiatura":"asToday","diatonicEnclosure":"favored",' +
  '"chromaticApproach":"stronglyFavored","chromaticEnclosure":"asToday"},'

/** PLAYER's record exactly as v3.3 writes it: data version 5, its Seventh chords level at Always. */
const PLAYER_RECORD_JSON =
  '{"dataVersion":5,"appVersion":"3.1.0-test","id":"player-1","name":"Late night",' +
  PLAYER_CONTROLS_AND_LEVELS_JSON +
  '"chordFamilies":{"seventh-chords":"stronglyFavored"},' +
  '"restriction":{"keys":["D","A"],"modes":["Dorian","Mixolydian"]}}'

/** PLAYER's record at Off exactly as v3.2 wrote it: data version 3, no Seventh chords level. */
const V32_RECORD_JSON =
  '{"dataVersion":3,"appVersion":"3.1.0-test","id":"player-1","name":"Late night",' +
  PLAYER_CONTROLS_AND_LEVELS_JSON +
  '"restriction":{"keys":["D","A"],"modes":["Dorian","Mixolydian"]}}'

/** PLAYER at a given Seventh chords level. */
function playerAt(chordFamilies: ChordFamilies): Preset {
  return makePreset({ ...PLAYER, chordFamilies })
}

type Stored = Record<string, unknown>

/** Intent: PLAYER's record as stored: a plain, mutable copy a test may damage. */
function storedPlayer(): Stored {
  return structuredClone(encodePresetRecord(PLAYER, APP_VERSION)) as unknown as Stored
}

/** Intent: the one preset decoded from one stored value under `key`, undefined when not listed. */
function decodeOne(value: unknown, key = PLAYER.id): Preset | undefined {
  const presets = decodePlayerPresets([{ key, value }])
  expect(presets.length).toBeLessThanOrEqual(1)
  return presets[0]
}

/** Intent: PLAYER's stored record with the field at `path` replaced (or deleted for REMOVE). */
function edited(path: readonly string[], value: unknown): Stored {
  const record = storedPlayer()
  let target: Record<string, unknown> = record
  for (const step of path.slice(0, -1)) target = target[step] as Record<string, unknown>
  const last = path.at(-1)!
  if (value === REMOVE) delete target[last]
  else target[last] = value
  return record
}

const REMOVE = Symbol('remove the field')

describe('the player preset record', () => {
  // @test-link [[entity_player_preset_record]]
  // @test-link [[rule_player_presets_saved_on_device]]
  it('writes and reads back the same id, name, ten controls, seven levels, Seventh chords level and restriction', () => {
    const record = encodePresetRecord(PLAYER, APP_VERSION)

    expect(record).toEqual({
      dataVersion: PRESET_RECORD_DATA_VERSION,
      appVersion: APP_VERSION,
      id: PLAYER.id,
      name: PLAYER.name,
      controls: PLAYER.controls,
      levels: PLAYER.levels,
      chordFamilies: PLAYER.chordFamilies,
      restriction: PLAYER.restriction,
    })
    expect(Object.keys(record.controls)).toEqual(PRESET_HELD_CONTROL_KEYS)
    expect(Object.keys(record.levels)).toEqual(FIGURE_IDS)
    expect(record.chordFamilies).not.toBe(PLAYER.chordFamilies)
    expect(record.restriction.keys).not.toBe(PLAYER.restriction.keys)
    expect(decodeOne(structuredClone(record))).toEqual(PLAYER)

    const anywhere = makePreset({ ...PLAYER, restriction: ANY_KEY_AND_MODE })
    expect(decodeOne(structuredClone(encodePresetRecord(anywhere, APP_VERSION)))).toEqual(anywhere)
    expect(PRESET_RECORD_DATA_VERSION).toBe(5)
  })

  // @test-link [[entity_player_preset_record]]
  it('refuses to store a built-in preset, or a record without an app version', () => {
    expect(() => encodePresetRecord(builtInPreset('jazz'), APP_VERSION)).toThrow(/player preset/)
    expect(() => encodePresetRecord(PLAYER, '')).toThrow(/app version/)
  })

  // @test-link [[entity_player_preset_record]]
  it('reads each entry on its own, in entry order, every one a frozen player preset', () => {
    const second = makePreset({ ...PLAYER, id: 'player-2', name: 'Early morning' })
    const entries: StoredEntry[] = [
      { key: 'player-2', value: structuredClone(encodePresetRecord(second, APP_VERSION)) },
      { key: 'broken', value: 'not a record' },
      { key: 'player-1', value: storedPlayer() },
    ]

    const presets = decodePlayerPresets(entries)

    expect(presets).toEqual([second, PLAYER])
    for (const preset of presets) {
      expect(preset.kind).toBe('player')
      expect(Object.isFrozen(preset)).toBe(true)
    }
  })
})

describe('the player preset record and the Seventh chords level', () => {
  // @test-link [[entity_player_preset_record]]
  // @test-link [[req_seventh_chords_level]]
  it('writes a preset at Always byte for byte, the level by family id after the figure levels, and a read and rewrite gives the same bytes', () => {
    const written = JSON.stringify(encodePresetRecord(PLAYER, APP_VERSION))
    expect(written).toBe(PLAYER_RECORD_JSON)

    const reread = decodeOne(JSON.parse(written))!
    expect(reread.chordFamilies).toEqual({ 'seventh-chords': 'stronglyFavored' })
    expect(JSON.stringify(encodePresetRecord(reread, APP_VERSION))).toBe(PLAYER_RECORD_JSON)
  })

  // @test-link [[entity_player_preset_record]]
  // @test-link [[rule_player_presets_saved_on_device]]
  // @test-link [[req_seventh_chords_level]]
  it.each(CHORD_FAMILY_LEVEL_IDS)('stores a preset at %s and loads it with that level', (level) => {
    const preset = playerAt({ 'seventh-chords': level })

    const loaded = decodeOne(structuredClone(encodePresetRecord(preset, APP_VERSION)))

    expect(loaded).toEqual(preset)
    expect(Object.isFrozen(loaded!.chordFamilies)).toBe(true)
  })

  // @test-link [[entity_player_preset_record]]
  // @test-link [[module_presets_and_kept_sessions_upgrade_step]]
  it("reads a record in v3.2's shape, at data version 3, as unreadable: only the upgrade step reads it", () => {
    expect(decodePlayerPresets([{ key: PLAYER.id, value: JSON.parse(V32_RECORD_JSON) }])).toEqual(
      [],
    )
  })

  // @test-link [[entity_player_preset_record]]
  // @test-link [[module_presets_and_kept_sessions_upgrade_step]]
  // @test-link [[rule_presets_load_tolerantly]]
  it("carries a record in v3.2's shape over at data version 5, every field as stored, the level at Off, loading as before", () => {
    const stored = JSON.parse(V32_RECORD_JSON) as Stored

    const carried = carriedOverPresetRecord(stored, PLAYER.id, '3.3.0-test')

    expect(carried).toStrictEqual({
      ...stored,
      dataVersion: 5,
      appVersion: '3.3.0-test',
      chordFamilies: OFF_CHORD_FAMILIES,
    })
    expect(Object.keys(carried!)).toEqual([...Object.keys(stored), 'chordFamilies'])
    expect(decodeOne(structuredClone(carried))).toEqual(playerAt(OFF_CHORD_FAMILIES))
    expect(stored).toStrictEqual(JSON.parse(V32_RECORD_JSON))
  })

  // @test-link [[entity_player_preset_record]]
  // @test-link [[module_presets_and_kept_sessions_upgrade_step]]
  it('keeps every stored field of a carried-over record as it is, even one a read would change', () => {
    const stored = { ...(JSON.parse(V32_RECORD_JSON) as Stored), name: '  Late night  ', tempo: 9 }

    expect(carriedOverPresetRecord(stored, PLAYER.id, APP_VERSION)).toMatchObject({
      name: '  Late night  ',
      tempo: 9,
    })
  })

  // @test-link [[entity_player_preset_record]]
  // @test-link [[module_presets_and_kept_sessions_upgrade_step]]
  it('gives no carried-over record of one it cannot read at data version 3, and refuses an empty app version', () => {
    const stored = JSON.parse(V32_RECORD_JSON) as Stored
    const unreadable: readonly (readonly [unknown, IDBValidKey])[] = [
      [null, PLAYER.id],
      ['player-1', PLAYER.id],
      [{ ...stored, dataVersion: 2 }, PLAYER.id],
      [{ ...stored, dataVersion: 4 }, PLAYER.id],
      [JSON.parse(PLAYER_RECORD_JSON), PLAYER.id],
      [{ ...stored, appVersion: '' }, PLAYER.id],
      [stored, 'player-2'],
      [stored, 7],
      [{ ...stored, id: 'jazz' }, 'jazz'],
    ]
    for (const [value, key] of unreadable)
      expect(carriedOverPresetRecord(value, key, APP_VERSION)).toBeNull()
    expect(() => carriedOverPresetRecord(stored, PLAYER.id, '')).toThrow(/app version/u)
  })
})

describe('reading a player preset field by field', () => {
  // @test-link [[rule_presets_load_tolerantly]]
  // @test-link [[entity_player_preset_record]]
  it('reads an invalid control as its first-load value, every other field kept', () => {
    for (const invalid of ['Lifted', '', 3, null, [], {}]) {
      expect(decodeOne(edited(['controls', 'tension'], invalid))).toEqual({
        ...PLAYER,
        controls: { ...PLAYER.controls, tension: DEFAULT_GENERATION_CONTROLS.tension },
      })
    }
  })

  // @test-link [[rule_presets_load_tolerantly]]
  it('reads a circular or BigInt control as its first-load value, never throwing', () => {
    const circular: Stored = {}
    circular.self = circular
    for (const invalid of [circular, 10n]) {
      expect(decodeOne(edited(['controls', 'contour'], invalid))?.controls.contour).toBe(
        DEFAULT_GENERATION_CONTROLS.contour,
      )
    }
  })

  // @test-link [[rule_presets_load_tolerantly]]
  it('reads a missing control as its first-load value', () => {
    expect(decodeOne(edited(['controls', 'register'], REMOVE))).toEqual({
      ...PLAYER,
      controls: { ...PLAYER.controls, register: DEFAULT_GENERATION_CONTROLS.register },
    })
  })

  // @test-link [[rule_presets_load_tolerantly]]
  it('reads every control as its first-load value when the controls are not an object', () => {
    const firstLoad = Object.fromEntries(
      PRESET_HELD_CONTROL_KEYS.map((key) => [key, DEFAULT_GENERATION_CONTROLS[key]]),
    )
    for (const invalid of [null, 'Build', ['Build'], 7, REMOVE]) {
      expect(decodeOne(edited(['controls'], invalid))).toEqual({ ...PLAYER, controls: firstLoad })
    }
  })

  // @test-link [[rule_presets_load_tolerantly]]
  it('reads an unknown or ill-typed level as its first-load level', () => {
    for (const invalid of ['favoured', 'Off', null, 2, {}]) {
      expect(decodeOne(edited(['levels', 'appoggiatura'], invalid))).toEqual({
        ...PLAYER,
        levels: { ...PLAYER.levels, appoggiatura: NEUTRAL_FIGURE_LEVELS.appoggiatura },
      })
    }
  })

  // @test-link [[rule_presets_load_tolerantly]]
  it("reads a level missing for a figure that existed at the record's data version as its first-load level", () => {
    expect(decodeOne(edited(['levels', 'passingTone'], REMOVE))).toEqual({
      ...PLAYER,
      levels: { ...PLAYER.levels, passingTone: NEUTRAL_FIGURE_LEVELS.passingTone },
    })
    expect(decodeOne(edited(['levels'], 'all of them'))).toEqual({
      ...PLAYER,
      levels: NEUTRAL_FIGURE_LEVELS,
    })
  })

  // @test-link [[rule_presets_load_tolerantly]]
  // @test-link [[entity_player_preset_record]]
  it("reads a level missing for a figure introduced after the record's data version as Off", () => {
    for (const figure of FIGURE_IDS) {
      const introduced = FIGURE_INTRODUCED_AT[figure]
      expect(introduced).toBe(3)
      expect(missingLevel(figure, introduced - 1)).toBe('off')
      expect(missingLevel(figure, introduced)).toBe(NEUTRAL_FIGURE_LEVELS[figure])
      expect(missingLevel(figure, introduced + 1)).toBe(NEUTRAL_FIGURE_LEVELS[figure])
    }
    expect(missingLevel('passingTone', 2)).toBe('off')
    expect(NEUTRAL_FIGURE_LEVELS.passingTone).not.toBe('off')
  })

  // @test-link [[rule_presets_load_tolerantly]]
  it('drops an unknown key or mode from a restriction list, its order and first occurrence kept', () => {
    const restriction = { keys: ['Q', 'A', 'D', 'A', 7], modes: ['Dorian', 'Klingon', 'Ionian'] }

    expect(decodeOne(edited(['restriction'], restriction))?.restriction).toEqual({
      keys: ['A', 'D'],
      modes: ['Dorian', 'Ionian'],
    })
  })

  // @test-link [[rule_presets_load_tolerantly]]
  it('reads an emptied list, or a half that is neither any nor a list, as any', () => {
    expect(decodeOne(edited(['restriction', 'keys'], ['Q', null]))?.restriction).toEqual({
      keys: 'any',
      modes: PLAYER.restriction.modes,
    })
    for (const invalid of [[], 'Dorian', null, {}, 3, REMOVE]) {
      expect(decodeOne(edited(['restriction', 'modes'], invalid))?.restriction).toEqual({
        keys: PLAYER.restriction.keys,
        modes: 'any',
      })
    }
  })

  // @test-link [[rule_presets_load_tolerantly]]
  it('reads a missing or ill-typed restriction as any key and mode', () => {
    for (const invalid of [REMOVE, null, 'any', [['D'], ['Dorian']]]) {
      expect(decodeOne(edited(['restriction'], invalid))).toEqual({
        ...PLAYER,
        restriction: ANY_KEY_AND_MODE,
      })
    }
  })

  // @test-link [[rule_presets_load_tolerantly]]
  it('keeps a valid name trimmed', () => {
    expect(decodeOne(edited(['name'], '  Late night  '))?.name).toBe('Late night')
  })

  // @test-link [[rule_presets_load_tolerantly]]
  it('numbers a missing, invalid or reserved name, never repeating a name already there', () => {
    /** Intent: PLAYER's stored record under `id`, holding `name`. */
    const named = (id: string, name: unknown): StoredEntry => ({
      key: id,
      value: { ...storedPlayer(), id, name },
    })
    /** Intent: PLAYER's stored record under `id`, holding no name. */
    const nameless = (id: string): StoredEntry => {
      const value = storedPlayer()
      delete value.name
      return { key: id, value: { ...value, id } }
    }
    const entries: StoredEntry[] = [
      nameless('a'),
      named('b', 'custom'),
      named('c', 'My preset'),
      named('d', '   '),
      named('e', 'x'.repeat(41)),
      named('f', 7),
      named('g', 'My preset 3'),
    ]

    const presets = decodePlayerPresets(entries)

    expect(presets.map((preset) => [preset.id, preset.name])).toEqual([
      ['a', 'My preset 2'],
      ['b', 'My preset 4'],
      ['c', 'My preset'],
      ['d', 'My preset 5'],
      ['e', 'My preset 6'],
      ['f', 'My preset 7'],
      ['g', 'My preset 3'],
    ])
    const builtInNames = new Set(BUILT_IN_PRESETS.map((preset) => preset.name.toLowerCase()))
    const names = presets.map((preset) => preset.name.toLowerCase())
    expect(new Set(names).size).toBe(names.length)
    expect(names.some((name) => builtInNames.has(name))).toBe(false)
  })

  // @test-link [[rule_presets_load_tolerantly]]
  // @test-link [[req_seventh_chords_level]]
  it('reads a missing, unknown or invalid Seventh chords level as Off, every other field kept', () => {
    const invalid = [REMOVE, 'favored', null, 3, [], {}, { 'seventh-chords': 'often' }]
    const invalidLevel = [REMOVE, 'Mostly', 'off ', null, 2, {}, ['favored']]
    for (const value of invalid)
      expect(decodeOne(edited(['chordFamilies'], value))).toEqual(playerAt(OFF_CHORD_FAMILIES))
    for (const value of invalidLevel) {
      expect(decodeOne(edited(['chordFamilies', 'seventh-chords'], value))).toEqual(
        playerAt(OFF_CHORD_FAMILIES),
      )
    }
  })

  // @test-link [[rule_presets_load_tolerantly]]
  it('ignores extra fields at the top level and inside the controls and levels', () => {
    const record = storedPlayer()
    const extra = {
      ...record,
      kind: 'builtIn',
      tempo: 200,
      controls: { ...(record.controls as Stored), tempo: 200, tonalCenter: 'C' },
      levels: { ...(record.levels as Stored), trill: 'favored' },
      chordFamilies: { ...(record.chordFamilies as Stored), 'ninth-chords': 'favored' },
    }

    expect(decodeOne(extra)).toEqual(PLAYER)
  })
})

describe('a record that cannot be read at all', () => {
  // @test-link [[entity_player_preset_record]]
  // @test-link [[rule_presets_load_tolerantly]]
  it('is not listed, the others still are, and no stored entry is changed', () => {
    const record = storedPlayer()
    const unreadable: StoredEntry[] = [
      { key: 'player-1', value: null },
      { key: 'player-1', value: 'player-1' },
      { key: 'player-1', value: [record] },
      { key: 'player-1', value: { ...record, dataVersion: 2 } },
      { key: 'player-1', value: { ...record, dataVersion: 3 } },
      { key: 'player-1', value: { ...record, dataVersion: 4 } },
      { key: 'player-1', value: { ...record, dataVersion: '5' } },
      { key: 'player-1', value: { ...record, appVersion: '' } },
      { key: 'player-1', value: edited(['appVersion'], REMOVE) },
      { key: 'player-1', value: { ...record, dataVersion: 6 } },
      { key: 'player-1', value: edited(['id'], REMOVE) },
      { key: 'player-1', value: { ...record, id: '' } },
      { key: 'player-1', value: { ...record, id: 7 } },
      { key: 'player-2', value: record },
      { key: 'jazz', value: { ...record, id: 'jazz' } },
    ]
    const entries = [...unreadable, { key: 'player-1', value: storedPlayer() }]
    const before = structuredClone(entries)

    for (const entry of unreadable) {
      expect(decodePlayerPresets([entry]), JSON.stringify(entry)).toEqual([])
    }
    expect(decodePlayerPresets(entries)).toEqual([PLAYER])
    expect(entries).toStrictEqual(before)
  })
})

/** The values a random corruption puts in place of a field. */
const JUNK: readonly unknown[] = [
  null,
  undefined,
  0,
  42,
  -1.5,
  '',
  'junk',
  'Build',
  'favored',
  'any',
  'Custom',
  [],
  ['D', 'Q'],
  {},
  { keys: 'any' },
]

/** One place a corruption can hit: a path into the record, and the field it marks touched. */
interface Spot {
  readonly path: readonly (string | number)[]
  readonly touches: string
}

/** Every place a corruption can hit, top-level fields and the fields inside them. */
const SPOTS: readonly Spot[] = [
  ...[
    'id',
    'name',
    'controls',
    'levels',
    'chordFamilies',
    'restriction',
    'dataVersion',
    'appVersion',
    'extra',
  ].map((field) => ({ path: [field], touches: field })),
  { path: ['chordFamilies', 'seventh-chords'], touches: 'chordFamilies.seventh-chords' },
  ...PRESET_HELD_CONTROL_KEYS.map((key) => ({
    path: ['controls', key],
    touches: `controls.${key}`,
  })),
  ...FIGURE_IDS.map((figure) => ({ path: ['levels', figure], touches: `levels.${figure}` })),
  ...['keys', 'modes'].map((half) => ({
    path: ['restriction', half],
    touches: `restriction.${half}`,
  })),
  { path: ['restriction', 'keys', 0], touches: 'restriction.keys' },
  { path: ['restriction', 'modes', 1], touches: 'restriction.modes' },
]

/** Intent: apply one deletion or replacement at `path`, when the path still leads somewhere. */
function corruptAt(record: Stored, path: Spot['path'], value: unknown, remove: boolean): void {
  let target: unknown = record
  for (const step of path.slice(0, -1)) {
    if (typeof target !== 'object' || target === null) return
    target = (target as Record<string | number, unknown>)[step]
  }
  if (typeof target !== 'object' || target === null) return
  const container = target as Record<string | number, unknown>
  const last = path.at(-1)!
  if (remove) delete container[last]
  else container[last] = value
}

/** Intent: whether a field, or the field holding it, was touched. */
function touched(spots: ReadonlySet<string>, field: string): boolean {
  const [top] = field.split('.')
  return spots.has(field) || spots.has(top!)
}

describe('a randomly corrupted record', () => {
  // @test-link [[rule_presets_load_tolerantly]]
  // @test-link [[entity_player_preset_record]]
  it('never makes reading throw or list an invalid preset, and keeps every untouched field', () => {
    const random = createMulberry32(0x9e5e7)
    const next = random.nextFloat
    /** Intent: one of `values`, drawn from `next`. */
    const pick = <T>(values: readonly T[]): T => values[Math.floor(next() * values.length)]!

    for (let round = 0; round < 400; round += 1) {
      const record = storedPlayer()
      const hits = new Set<string>()
      const count = 1 + Math.floor(next() * 4)
      for (let hit = 0; hit < count; hit += 1) {
        const spot = pick(SPOTS)
        corruptAt(record, spot.path, pick(JUNK), next() < 0.3)
        hits.add(spot.touches)
      }
      const stored = structuredClone(record)

      const presets = decodePlayerPresets([{ key: PLAYER.id, value: record }])

      expect(record, `round ${round}`).toStrictEqual(stored)
      const envelopeIntact = !['id', 'dataVersion', 'appVersion'].some((field) => hits.has(field))
      if (envelopeIntact) expect(presets, `round ${round}`).toHaveLength(1)
      for (const preset of presets) {
        expect(makePreset(preset)).toEqual(preset)
        expect(preset.kind).toBe('player')
        expect(preset.id).toBe(PLAYER.id)
        if (!hits.has('name')) expect(preset.name).toBe(PLAYER.name)
        for (const key of PRESET_HELD_CONTROL_KEYS) {
          if (!touched(hits, `controls.${key}`)) {
            expect(preset.controls[key], `round ${round}`).toBe(PLAYER.controls[key])
          }
        }
        for (const figure of FIGURE_IDS) {
          if (!touched(hits, `levels.${figure}`)) {
            expect(preset.levels[figure], `round ${round}`).toBe(PLAYER.levels[figure])
          }
        }
        if (!touched(hits, 'chordFamilies.seventh-chords'))
          expect(preset.chordFamilies, `round ${round}`).toEqual(PLAYER.chordFamilies)
        for (const half of ['keys', 'modes'] as const) {
          if (!touched(hits, `restriction.${half}`)) {
            expect(preset.restriction[half], `round ${round}`).toEqual(PLAYER.restriction[half])
          }
        }
      }
    }
  })
})
