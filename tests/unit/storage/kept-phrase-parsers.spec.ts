import { beforeAll, describe, expect, it } from 'vitest'

import {
  GenerationControlError,
  makeGenerationControls,
} from '@/domain/controls/generation-controls'
import { PROFILE_BUNDLES, type ProfileSelection } from '@/domain/controls/profile-selection'
import { deepEqual } from '@/domain/events/deep-equal'
import {
  FigureLevelsError,
  JAZZ_FIGURE_LEVELS,
  NEUTRAL_FIGURE_LEVELS,
  type FigureLevels,
} from '@/domain/figures/figure-levels'
import { CarryInError } from '@/domain/generation/carry-in/carry-in'
import {
  createGenerationIntent,
  type GenerationIntent,
} from '@/domain/generation/generation-intent'
import { GenerationRequestError, makeRequestId } from '@/domain/generation/generation-request'
import type { HarmonyCandidate } from '@/domain/harmony/harmony-types'
import { InstrumentProfileParseError } from '@/domain/profile/instrument-profile'
import { makeMyInstrument } from '@/domain/profile/my-instrument'
import { makeSeed, SeedConstructionError } from '@/domain/random/seed'
import type { SessionHistoryRecord } from '@/session/session-history'
import type { SessionSettings } from '@/session/session-types'
import {
  isKeptPhraseRefusal,
  KeptRecordError,
  parseKeptHarmony,
  parseKeptIntent,
} from '@/storage/records/kept-phrase-parsers'

import { idlePhraseOne, recordRunnerSession } from '../session/history-recording'
import { sessionSettings } from '../session/session-harness'

/** The value a field is set to in order to remove it from a stored copy. */
const REMOVE = Symbol('remove')

/** One step of a path into a JSON-shaped value: a field name or an array index. */
type Step = string | number

/** Intent: a stored copy of a value, as a kept session's JSON-shaped record holds it. */
function stored(value: unknown): Record<string, unknown> {
  return JSON.parse(JSON.stringify(value)) as Record<string, unknown>
}

/** Intent: a stored copy of a value with the field at a path replaced, or removed. */
function edited(value: unknown, path: readonly Step[], replacement: unknown): unknown {
  const copy = stored(value)
  const parent = path
    .slice(0, -1)
    .reduce<Record<Step, unknown>>((node, step) => node[step] as Record<Step, unknown>, copy)
  const last = path.at(-1)!
  if (replacement === REMOVE) Reflect.deleteProperty(parent, last)
  else parent[last] = replacement
  return copy
}

/** Intent: whether a value and every object or array reachable from it is frozen. */
function isDeepFrozen(value: unknown): boolean {
  if (typeof value !== 'object' || value === null) return true
  if (!Object.isFrozen(value)) return false
  return Object.values(value).every(isDeepFrozen)
}

/** Intent: Jazz session settings for the E-flat alto, as selecting Jazz gives them. */
function jazzSettings(): SessionSettings {
  return {
    controls: makeGenerationControls({
      ...sessionSettings().controls,
      ...PROFILE_BUNDLES.Jazz,
      instrumentProfileId: 'eb-alto',
    }),
    musicalProfile: { musicalProfile: 'Jazz', isCustom: false },
  }
}

/** The recorded sessions the round trips read: the three built-in instruments, and Jazz. */
const SESSIONS: readonly { readonly settings: SessionSettings; readonly seed: number }[] = [
  { settings: sessionSettings({ instrumentProfileId: 'c-keyboard' }), seed: 21 },
  { settings: sessionSettings({ instrumentProfileId: 'bb-tenor' }), seed: 22 },
  { settings: sessionSettings({ instrumentProfileId: 'eb-alto' }), seed: 23 },
  { settings: jazzSettings(), seed: 24 },
]

let records: readonly SessionHistoryRecord[] = []

beforeAll(async () => {
  const histories = await Promise.all(
    SESSIONS.map(({ settings, seed }) =>
      recordRunnerSession({
        settings,
        phraseOne: idlePhraseOne(settings, seed),
        firstSeed: seed * 100,
        phraseCount: 3,
      }),
    ),
  )
  records = histories.flatMap((history) => history.phrases())
}, 60_000)

/** Intent: the first recorded phrase of the given instrument that holds a carry-in. */
function carriedIntentOf(instrumentProfileId: string): GenerationIntent {
  const record = records.find(
    (entry) =>
      entry.intent.controls.instrumentProfileId === instrumentProfileId &&
      entry.intent.carryIn !== undefined,
  )
  if (record === undefined) throw new Error(`No carried ${instrumentProfileId} phrase recorded.`)
  return record.intent
}

/** Intent: the first recorded phrase's harmony. */
function firstHarmony(): HarmonyCandidate {
  return records[0]!.outcome.provenance.harmony
}

/** One refused stored value: what is wrong, where, its replacement and the refusal expected. */
type Refusal = readonly [string, readonly Step[], unknown, abstract new (...args: never[]) => Error]

const HARMONY_REFUSALS: readonly Refusal[] = [
  ['a missing identity', ['identity'], REMOVE, KeptRecordError],
  ['an extra field', ['score'], 1, KeptRecordError],
  ['a negative candidate index', ['candidateIndex'], -1, KeptRecordError],
  ['a fractional candidate index', ['candidateIndex'], 1.5, KeptRecordError],
  ['an empty identity', ['identity'], '', KeptRecordError],
  ['an empty template id', ['templateId'], '', KeptRecordError],
  ['a degree beyond the seventh', ['degreeSequence', 0], 8, KeptRecordError],
  ['no events', ['events'], [], KeptRecordError],
  ['a fifth bar', ['events', 0, 'barIndex'], 4, KeptRecordError],
  ['a start on beat 1', ['events', 0, 'startBeat'], 1, KeptRecordError],
  ['an odd duration', ['events', 0, 'durationBeats'], 3, KeptRecordError],
  ['a zero duration', ['events', 0, 'durationBeats'], 0, KeptRecordError],
  ['a pitch class 12', ['events', 0, 'triad', 'pitchClasses', 0], 12, KeptRecordError],
  ['a two-note triad', ['events', 0, 'triad', 'pitchClasses'], [0, 4], KeptRecordError],
  ['a repeated pitch class', ['events', 0, 'triad', 'pitchClasses'], [0, 0, 7], KeptRecordError],
  ['an augmented triad', ['events', 0, 'triad', 'quality'], 'augmented', KeptRecordError],
  ['an extra triad field', ['events', 0, 'triad', 'root'], 'C', KeptRecordError],
  ['an unknown role', ['events', 0, 'role'], 'dominant', KeptRecordError],
  ['an empty event template id', ['events', 0, 'templateId'], '', KeptRecordError],
  ['no bar roles', ['events', 0, 'barRoles'], [], KeptRecordError],
  ['an unknown bar role', ['events', 0, 'barRoles', 0, 'role'], 'dominant', KeptRecordError],
  ['a bar role on bar 5', ['events', 0, 'barRoles', 0, 'barIndex'], 4, KeptRecordError],
  ['an unknown endpoint', ['endpoint', 'kind'], 'tonic_arrival', KeptRecordError],
  ['an endpoint on degree 1', ['endpoint', 'degree'], 1, KeptRecordError],
  ['an unknown tension arc', ['tensionRequirement', 'arc'], 'Calm', GenerationControlError],
  ['a figure in bar 4', ['tensionRequirement', 'allowedBars'], [3], KeptRecordError],
  ['an unknown figure', ['tensionRequirement', 'permittedFigureKinds'], ['trill'], KeptRecordError],
  ['two required figures', ['tensionRequirement', 'requiredFigureCount'], 2, KeptRecordError],
  ['two allowed figures', ['tensionRequirement', 'maximumFigureCount'], 2, KeptRecordError],
  [
    'an unknown resolution delay',
    ['tensionRequirement', 'maximumResolutionDelay'],
    'never',
    KeptRecordError,
  ],
  [
    'an unresolved final figure',
    ['tensionRequirement', 'mustResolveBeforeFinalSoundingEvent'],
    false,
    KeptRecordError,
  ],
  [
    'a missing resolution preference',
    ['tensionRequirement', 'resolutionPreference'],
    REMOVE,
    KeptRecordError,
  ],
]

// @test-link [[module_kept_session_codec]]
describe('parseKeptHarmony', () => {
  // @test-link [[module_kept_session_codec]]
  it('reads back every real harmony it was stored from, for each built-in instrument and Jazz', () => {
    expect(records).toHaveLength(SESSIONS.length * 3)
    for (const record of records) {
      const harmony = record.outcome.provenance.harmony

      expect(parseKeptHarmony(stored(harmony))).toEqual(harmony)
    }
  })

  // @test-link [[module_kept_session_codec]]
  it('returns a fresh deep-frozen harmony, never the stored value itself', () => {
    const input = stored(firstHarmony())
    const parsed = parseKeptHarmony(input)

    expect(parsed).not.toBe(input)
    expect(isDeepFrozen(parsed)).toBe(true)
    ;(input.events as Record<string, unknown>[])[0]!.role = 'modal_color'
    expect(parsed).toEqual(firstHarmony())
  })

  // @test-link [[module_kept_session_codec]]
  it.each(HARMONY_REFUSALS)('refuses %s, never repairing it', (_, path, replacement, refusal) => {
    const input = edited(firstHarmony(), path, replacement)

    expect(() => parseKeptHarmony(input)).toThrow(refusal)
    expect(isKeptPhraseRefusal(catchError(() => parseKeptHarmony(input)))).toBe(true)
  })

  // @test-link [[module_kept_session_codec]]
  it('refuses a value that is not a plain object', () => {
    for (const input of [null, 'harmony', [], 3]) {
      expect(() => parseKeptHarmony(input)).toThrow(KeptRecordError)
    }
  })
})

/** Intent: the error a call throws; fails the test when it throws nothing. */
function catchError(call: () => unknown): unknown {
  try {
    call()
  } catch (error) {
    return error
  }
  throw new Error('Expected the call to throw.')
}

const INTENT_REFUSALS: readonly Refusal[] = [
  ['a missing request id', ['requestId'], REMOVE, KeptRecordError],
  ['a request id as a number', ['requestId'], 7, GenerationRequestError],
  ['a blank request id', ['requestId'], '  ', GenerationRequestError],
  ['an extra field', ['theme'], 'Dark', KeptRecordError],
  ['a seed beyond 32 bits', ['seed'], 2 ** 32, SeedConstructionError],
  ['a seed written as text', ['seed'], '12', KeptRecordError],
  ['eight measures', ['measureCount'], 8, KeptRecordError],
  ['a 3/4 meter', ['meter', 'beatsPerMeasure'], 3, GenerationRequestError],
  ['an unknown collection', ['controls', 'collection'], 'Blues', GenerationControlError],
  ['an off-grid tempo', ['controls', 'tempo'], 95, GenerationControlError],
  ['an extra control', ['controls', 'swing'], true, KeptRecordError],
  ['a missing control', ['controls', 'contour'], REMOVE, KeptRecordError],
  ['an unknown written tonal center', ['writtenTonalCenter'], 'H', GenerationControlError],
  [
    'a concert tonal center that is not the written one transposed',
    ['controls', 'tonalCenter'],
    'C',
    KeptRecordError,
  ],
  [
    "an instrument id unlike the profile's",
    ['controls', 'instrumentProfileId'],
    'eb-alto',
    KeptRecordError,
  ],
  ['an unknown instrument id', ['controls', 'instrumentProfileId'], 'oboe', GenerationControlError],
  [
    'an empty concert range',
    ['instrumentProfile', 'concertRange', 'maxMidi'],
    0,
    InstrumentProfileParseError,
  ],
  ['an extra profile field', ['instrumentProfile', 'family'], 'reeds', KeptRecordError],
  [
    'an extra transposition field',
    ['instrumentProfile', 'transposition', 'octaves'],
    0,
    InstrumentProfileParseError,
  ],
  ['a mislabelled profile', ['instrumentProfile', 'kind'], 'Instrument', KeptRecordError],
  [
    'a mislabelled concert range',
    ['instrumentProfile', 'concertRange', 'kind'],
    'RegisterWindow',
    KeptRecordError,
  ],
  [
    'an unknown requested register',
    ['registerIntent', 'requestedRegister'],
    'Top',
    GenerationControlError,
  ],
  [
    'a requested register unlike the controls',
    ['registerIntent', 'requestedRegister'],
    'High',
    KeptRecordError,
  ],
  [
    'a register window the profile does not give',
    ['registerIntent', 'candidates', 0, 'window', 'maxMidi'],
    127,
    KeptRecordError,
  ],
  ['an unknown register id', ['registerIntent', 'candidates', 0, 'id'], 'Bass', KeptRecordError],
  ['a missing register policy', ['registerIntent', 'policyVersion'], REMOVE, KeptRecordError],
  ['a carry-in of phrase 0', ['carryIn', 'phraseNumber'], 0, CarryInError],
  ['a carry-in with an extra field', ['carryIn', 'tempo'], 120, CarryInError],
]

// @test-link [[module_kept_session_codec]]
describe('parseKeptIntent', () => {
  // @test-link [[module_kept_session_codec]]
  it('reads back every real intent it was stored from, carry-ins included', () => {
    const instruments = new Set(records.map((record) => record.intent.controls.instrumentProfileId))
    expect([...instruments].sort()).toEqual(['bb-tenor', 'c-keyboard', 'eb-alto'])
    expect(
      records.some((record) => deepEqual(record.intent.figureLevels, JAZZ_FIGURE_LEVELS)),
    ).toBe(true)
    expect(records.filter((record) => record.intent.carryIn !== undefined).length).toBeGreaterThan(
      0,
    )
    for (const record of records) {
      const parsed = parseKeptIntent(stored(record.intent))

      expect(parsed).toEqual(record.intent)
      expect('carryIn' in parsed).toBe(record.intent.carryIn !== undefined)
    }
  })

  // @test-link [[module_kept_session_codec]]
  it('returns a fresh deep-frozen intent, never the stored value itself', () => {
    const intent = carriedIntentOf('bb-tenor')
    const input = stored(intent)
    const parsed = parseKeptIntent(input)

    expect(parsed).not.toBe(input)
    expect(isDeepFrozen(parsed)).toBe(true)
    ;(input.controls as Record<string, unknown>).collection = 'Dorian'
    expect(parsed).toEqual(intent)
  })

  // @test-link [[module_kept_session_codec]]
  it("reads my instrument's intent from the profile data it holds, never from its id", () => {
    const mine = makeMyInstrument({
      template: 'c-keyboard',
      name: 'Fourth-lower horn',
      clef: 'bass',
      writtenRange: { minMidi: 50, maxMidi: 76 },
      transposition: { octaves: 0, semitones: 5, direction: 'lower' },
    })
    const intent = createGenerationIntent({
      requestId: makeRequestId('kept-mine'),
      seed: makeSeed(5),
      controls: makeGenerationControls({
        ...sessionSettings().controls,
        instrumentProfileId: 'my-instrument',
      }),
      musicalProfile: { musicalProfile: 'Neutral', isCustom: false },
      instrumentProfile: mine.profile,
    })

    const parsed = parseKeptIntent(stored(intent))

    expect(parsed).toEqual(intent)
    expect(parsed.instrumentProfile).toEqual(mine.profile)
    expect(parsed.instrumentProfile.id).toBe('my-instrument')
  })

  // @test-link [[module_kept_session_codec]]
  it("keeps a built-in instrument's stored profile data, never the table's current entry", () => {
    const intent = carriedIntentOf('eb-alto')
    const input = edited(intent, ['instrumentProfile', 'displayName'], 'Alto sax (2026)')

    expect(parseKeptIntent(input).instrumentProfile.displayName).toBe('Alto sax (2026)')
  })

  // @test-link [[module_kept_session_codec]]
  it.each(INTENT_REFUSALS)('refuses %s, never repairing it', (_, path, replacement, refusal) => {
    const input = edited(carriedIntentOf('bb-tenor'), path, replacement)

    expect(() => parseKeptIntent(input)).toThrow(refusal)
    expect(isKeptPhraseRefusal(catchError(() => parseKeptIntent(input)))).toBe(true)
  })

  // @test-link [[module_kept_session_codec]]
  it('refuses a carry-in field that holds nothing, rather than reading it as absent', () => {
    const input = { ...stored(carriedIntentOf('c-keyboard')), carryIn: undefined }

    expect(() => parseKeptIntent(input)).toThrow(CarryInError)
  })

  // @test-link [[module_kept_session_codec]]
  it('reports an error that is not a refusal of the stored value as no refusal', () => {
    expect(isKeptPhraseRefusal(new TypeError('defect'))).toBe(false)
    expect(isKeptPhraseRefusal('text')).toBe(false)
  })
})

/** The levels each musical profile stands for. */
const PROFILE_LEVELS: Readonly<Record<'Neutral' | 'Jazz', FigureLevels>> = {
  Neutral: NEUTRAL_FIGURE_LEVELS,
  Jazz: JAZZ_FIGURE_LEVELS,
}

/** Intent: the first recorded phrase intent generated with the given musical profile's levels. */
function intentOfProfile(musicalProfile: 'Neutral' | 'Jazz'): GenerationIntent {
  const record = records.find((entry) =>
    deepEqual(entry.intent.figureLevels, PROFILE_LEVELS[musicalProfile]),
  )
  if (record === undefined) throw new Error(`No ${musicalProfile} phrase recorded.`)
  return record.intent
}

/**
 * Intent: a stored copy of an intent as v3.0 kept it: its musical profile selection in place of
 * its levels.
 */
function v30Shaped(intent: GenerationIntent, selection: ProfileSelection): Record<string, unknown> {
  const { figureLevels, ...rest } = stored(intent)
  void figureLevels
  return { ...rest, musicalProfile: { ...selection } }
}

/** Intent: a stored copy of an intent as chunk 4's code kept it: its levels and a profile. */
function chunk4Shaped(
  intent: GenerationIntent,
  selection: ProfileSelection,
): Record<string, unknown> {
  return { ...stored(intent), musicalProfile: { ...selection } }
}

/** Each stored profile selection, customized or not, and the levels it stands for. */
const SELECTIONS: readonly (readonly [ProfileSelection, FigureLevels])[] = [
  [{ musicalProfile: 'Neutral', isCustom: false }, NEUTRAL_FIGURE_LEVELS],
  [{ musicalProfile: 'Neutral', isCustom: true }, NEUTRAL_FIGURE_LEVELS],
  [{ musicalProfile: 'Jazz', isCustom: false }, JAZZ_FIGURE_LEVELS],
  [{ musicalProfile: 'Jazz', isCustom: true }, JAZZ_FIGURE_LEVELS],
]

// @test-link [[module_kept_session_codec]]
describe("parseKeptIntent: figure levels, in each of data version 1's three shapes", () => {
  // @test-link [[module_kept_session_codec]]
  // @test-link [[rule_kept_session_content]]
  it.each(['Neutral', 'Jazz'] as const)(
    'reads a %s intent holding its levels only back, with no musical profile',
    (musicalProfile) => {
      const intent = intentOfProfile(musicalProfile)
      expect('musicalProfile' in intent).toBe(false)

      const parsed = parseKeptIntent(stored(intent))

      expect(parsed.figureLevels).toStrictEqual(PROFILE_LEVELS[musicalProfile])
      expect(parsed).toEqual(intent)
      expect(Object.keys(parsed)).toEqual(Object.keys(intent))
      expect('musicalProfile' in parsed).toBe(false)
    },
  )

  // @test-link [[module_kept_session_codec]]
  // @test-link [[module_stored_profile_to_levels]]
  it.each(SELECTIONS)(
    "reads a v3.0-shaped intent of %j, which holds no levels, with its profile's levels",
    (selection, levels) => {
      const intent = intentOfProfile(selection.musicalProfile)
      const input = v30Shaped(intent, selection)
      expect('figureLevels' in input).toBe(false)

      const parsed = parseKeptIntent(input)

      expect(parsed.figureLevels).toStrictEqual(levels)
      expect(parsed).toEqual(intent)
      expect(Object.keys(parsed)).toEqual(Object.keys(intent))
      expect('musicalProfile' in parsed).toBe(false)
    },
  )

  // @test-link [[module_kept_session_codec]]
  it.each(SELECTIONS)(
    'reads a chunk-4-shaped intent of %j holding its profile and equal levels with those levels',
    (selection, levels) => {
      const intent = intentOfProfile(selection.musicalProfile)

      const parsed = parseKeptIntent(chunk4Shaped(intent, selection))

      expect(parsed.figureLevels).toStrictEqual(levels)
      expect(parsed).toEqual(intent)
      expect('musicalProfile' in parsed).toBe(false)
    },
  )

  // @test-link [[module_kept_session_codec]]
  it.each([
    ["Neutral with Jazz's levels", 'Jazz', { musicalProfile: 'Neutral', isCustom: false }],
    ["Jazz with Neutral's levels", 'Neutral', { musicalProfile: 'Jazz', isCustom: true }],
  ] as const)(
    'refuses a chunk-4-shaped intent naming %s as unreadable',
    (_, generatedUnder, selection) => {
      const input = chunk4Shaped(intentOfProfile(generatedUnder), selection)

      expect(() => parseKeptIntent(input)).toThrow(KeptRecordError)
      expect(isKeptPhraseRefusal(catchError(() => parseKeptIntent(input)))).toBe(true)
    },
  )

  // @test-link [[module_kept_session_codec]]
  it('refuses an intent holding neither levels nor a musical profile as unreadable', () => {
    const input = edited(intentOfProfile('Neutral'), ['figureLevels'], REMOVE)

    expect(() => parseKeptIntent(input)).toThrow(KeptRecordError)
    expect(isKeptPhraseRefusal(catchError(() => parseKeptIntent(input)))).toBe(true)
  })

  // @test-link [[module_kept_session_codec]]
  it.each([
    ['an unknown musical profile', ['musicalProfile', 'musicalProfile'], 'Rock'],
    ['a customized flag as text', ['musicalProfile', 'isCustom'], 'yes'],
    ['a missing customized flag', ['musicalProfile', 'isCustom'], REMOVE],
    ['an extra profile selection field', ['musicalProfile', 'label'], 'x'],
  ] as const)('refuses a stored profile selection with %s, in either shape', (_, path, value) => {
    const intent = intentOfProfile('Neutral')
    const selection: ProfileSelection = { musicalProfile: 'Neutral', isCustom: false }
    for (const shaped of [v30Shaped(intent, selection), chunk4Shaped(intent, selection)]) {
      const input = edited(shaped, path, value)

      expect(() => parseKeptIntent(input)).toThrow(KeptRecordError)
    }
  })

  // @test-link [[module_kept_session_codec]]
  it.each([
    ['a missing figure', ['figureLevels', 'appoggiatura'], REMOVE],
    ['an unknown figure', ['figureLevels', 'blueNote'], 'off'],
    ['an unknown level', ['figureLevels', 'passingTone'], 'often'],
    ['levels that are not an object', ['figureLevels'], 'asToday'],
  ] as const)('refuses levels with %s as unreadable', (_, path, replacement) => {
    const input = edited(intentOfProfile('Neutral'), path, replacement)

    expect(() => parseKeptIntent(input)).toThrow(FigureLevelsError)
    expect(isKeptPhraseRefusal(catchError(() => parseKeptIntent(input)))).toBe(true)
  })
})
