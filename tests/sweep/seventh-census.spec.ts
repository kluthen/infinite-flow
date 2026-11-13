// @vitest-environment node
/**
 * The seventh census's own tests (measurement tooling, run by `npm run measure:sevenths`): a
 * hand-built sweep fixture (a plan with seventh-form events and a chord held across a barline, its
 * triads-only fallback, a plan with no seventh drawn, a failed generation) is classified and
 * tallied exactly; a plan that is not serialized, or a draw it could not hold, is refused; a real
 * phrase generated at Off holds triads only, and one above Off has the sevenths its draw gave it
 * counted from the generator's own draw; over a reduced sweep at every level, the seventh share
 * never falls a step up, each phrase holds all its drawn sevenths or none, and every chord is a
 * triad or the seventh chord on its degree; and the level dimension refuses what cannot be
 * measured until the measurements open the levels (chunk 18).
 */

import { beforeAll, describe, expect, it } from 'vitest'

import type { ChordFamilyLevel } from '@/domain/chords/chord-families'
import { MUSICAL_PROFILES } from '@/domain/controls/generation-controls'
import type { GenerationIntent } from '@/domain/generation/generation-intent'
import { generatePhrase } from '@/domain/generation/orchestration/generation-orchestrator'
import type { GenerationOutcome } from '@/domain/generation/orchestration/orchestration-types'
import { makeHarmonyCollection } from '@/domain/harmony/collection'
import { chordTones } from '@/domain/harmony/harmony-types'
import { isSeventhDrawn } from '@/domain/harmony/seventh-draw'
import { chordPlan } from '../unit/domain/harmony/seventh-chord-fixtures'
import { buildIntent } from '../unit/domain/generation/carry-in/carry-in-fixture'
import { caseSettings, phraseOneIntent, sweepCases } from '../unit/session/deadline-sweep'
import { jamPhraseOneIntent, phraseOneLockGroup } from './jam-sweep-ladder'
import {
  SEVENTH_QUALITIES,
  classifyPlan,
  drawnSeventhsOf,
  seventhCensusOf,
  type FailedSeventhCensus,
  type PhraseSeventhCensus,
} from './seventh-census'
import { SeventhTally, censusPopulation, censusSettings } from './seventh-census-sweep'
import { chordFamiliesAt, seventhLevelsFrom } from './seventh-levels'

/**
 * C major, four events: C (beats 0-4), Fmaj7 (4-6), Dm7 held across the barline of bars 2 and 3
 * (6-10, one event), G7 (10-16).
 */
const WITH_SEVENTHS = chordPlan([
  { degree: 1, beat: 0, beats: 4 },
  { degree: 4, beat: 4, beats: 2, seventh: true },
  { degree: 2, beat: 6, beats: 4, seventh: true },
  { degree: 5, beat: 10, beats: 6, seventh: true },
])

/** The same plan as triads only: the variant a phrase falls back to. */
const TRIADS_ONLY = chordPlan([
  { degree: 1, beat: 0, beats: 4 },
  { degree: 4, beat: 4, beats: 2 },
  { degree: 2, beat: 6, beats: 4 },
  { degree: 5, beat: 10, beats: 6 },
])

const FAILED: FailedSeventhCensus = {
  kind: 'failed',
  code: 'search_limit_exceeded',
  level: 'favored',
  mode: 'Major',
}

describe('seventh census on hand-built plans', () => {
  it('names each event form, counts a chord held across a barline once, and finds no fallback', () => {
    expect(classifyPlan(WITH_SEVENTHS, 3, 'favored', 'Major')).toEqual({
      level: 'favored',
      mode: 'Major',
      events: [
        { barIndex: 0, startBeat: 0, durationBeats: 4, degree: 1, form: 'triad' },
        { barIndex: 1, startBeat: 0, durationBeats: 2, degree: 4, form: 'major-seventh' },
        { barIndex: 1, startBeat: 2, durationBeats: 4, degree: 2, form: 'minor-seventh' },
        { barIndex: 2, startBeat: 2, durationBeats: 6, degree: 5, form: 'dominant-seventh' },
      ],
      seventhEvents: 3,
      fallback: false,
    })
  })

  it('counts a triads-only plan with sevenths drawn as a fallback, and one with none drawn as not', () => {
    const fallback = classifyPlan(TRIADS_ONLY, 2, 'sometimes', 'Major')
    expect([fallback.seventhEvents, fallback.fallback]).toEqual([0, true])
    const undrawn = classifyPlan(TRIADS_ONLY, 0, 'sometimes', 'Major')
    expect([undrawn.seventhEvents, undrawn.fallback]).toEqual([0, false])
  })

  it('tallies the fixture sweep exactly: shares over events and over phrases generated', () => {
    const tally = new SeventhTally('fixture')
    tally.add(classifyPlan(WITH_SEVENTHS, 3, 'favored', 'Major'))
    tally.add(classifyPlan(TRIADS_ONLY, 2, 'favored', 'Major'))
    tally.add(FAILED)
    expect(tally.figures()).toEqual({
      label: 'fixture',
      cases: 3,
      phrases: 2,
      failedGenerations: { search_limit_exceeded: 1 },
      seventhEvents: { count: 3, total: 8, share: 0.375 },
      byQuality: {
        'major-seventh': 1,
        'minor-seventh': 1,
        'dominant-seventh': 1,
        'half-diminished-seventh': 0,
      },
      fallbacks: { count: 1, total: 2, share: 0.5 },
    })
  })

  it('refuses a held chord split in two, a plan that does not fill the phrase, and an impossible draw', () => {
    const split = chordPlan([
      { degree: 1, beat: 0, beats: 4 },
      { degree: 1, beat: 4, beats: 4 },
      { degree: 5, beat: 8, beats: 8 },
    ])
    expect(() => classifyPlan(split, 0, 'off', 'Major')).toThrow(/same chord/)
    const short = chordPlan([{ degree: 1, beat: 0, beats: 8 }])
    expect(() => classifyPlan(short, 0, 'off', 'Major')).toThrow(/lasts 8 beats/)
    expect(() => classifyPlan(TRIADS_ONLY, 1, 'off', 'Major')).toThrow(/Off draws no seventh/)
    expect(() => classifyPlan(WITH_SEVENTHS, 2, 'favored', 'Major')).toThrow(/only 2 were drawn/)
  })
})

describe('seventh census on a real generated phrase', () => {
  it('reads a phrase generated at Off as triads only, with no fallback', () => {
    const intent = buildIntent({
      controls: { noteDensity: 'Eighth', tension: 'Build', collection: 'Dorian' },
      musicalProfile: 'Jazz',
      seed: 7,
      label: 'seventh-census',
    })
    const outcome = generatePhrase(intent)
    if (outcome.kind !== 'generation_success')
      throw new Error(`Expected a generated phrase, got ${outcome.code}.`)
    const census = seventhCensusOf(intent, outcome)
    if ('kind' in census) throw new Error(`Expected a census, got ${census.code}.`)
    expect(census.events).toHaveLength(outcome.provenance.harmony.events.length)
    expect(census.events.map((event) => event.form)).toEqual(census.events.map(() => 'triad'))
    expect([census.level, census.mode, census.seventhEvents, census.fallback]).toEqual([
      'off',
      'Dorian',
      0,
      false,
    ])
  })

  it('counts the events the draw gave their seventh form first, above Off', () => {
    const built = buildIntent({ seed: 7, label: 'seventh-census' })
    for (const level of ['sometimes', 'favored', 'stronglyFavored'] as const) {
      const intent = { ...built, chordFamilies: chordFamiliesAt(level) }
      const outcome = generatePhrase(intent)
      if (outcome.kind !== 'generation_success')
        throw new Error(`Expected a generated phrase, got ${outcome.code}.`)
      const events = outcome.provenance.harmony.events
      const drawn = events.filter((event) => isSeventhDrawn(level, intent.seed, event)).length
      expect(drawnSeventhsOf(intent, outcome), level).toBe(drawn)
      const census = seventhCensusOf(intent, outcome)
      if ('kind' in census) throw new Error(`Expected a census, got ${census.code}.`)
      expect(census.fallback, level).toBe(drawn > 0 && census.seventhEvents === 0)
    }
    const strongly = { ...built, chordFamilies: chordFamiliesAt('stronglyFavored') }
    const outcome = generatePhrase(strongly)
    if (outcome.kind !== 'generation_success') throw new Error(outcome.code)
    expect(drawnSeventhsOf(strongly, outcome)).toBe(outcome.provenance.harmony.events.length)
  })
})

/** The levels above Off, in increasing order. */
const LEVELS_ABOVE_OFF = ['sometimes', 'favored', 'stronglyFavored'] as const

/** One phrase of the reduced sweep: its census and the sevenths its draw gave it. */
interface SweptPhrase {
  readonly intent: GenerationIntent
  readonly outcome: Extract<GenerationOutcome, { kind: 'generation_success' }>
  readonly census: PhraseSeventhCensus
  readonly drawn: number
}

/**
 * Intent: the reduced sweep: the census population's first cases (each under the nine modes and
 * both profiles) at one level, each phrase with a seed of its own (the census population's two
 * seeds would give the draw only sixteen bytes to read), generated and censused, failed
 * generations left out.
 */
function reducedSweep(level: ChordFamilyLevel): readonly SweptPhrase[] {
  const cases = sweepCases().slice(0, 8)
  const swept: SweptPhrase[] = []
  for (const musicalProfile of MUSICAL_PROFILES)
    censusPopulation(cases, {
      label: `${musicalProfile} at ${level}`,
      musicalProfile,
      level,
    }).forEach((censusCase, index) => {
      const built = buildIntent({
        controls: censusCase.controls,
        musicalProfile,
        seed: 1 + index,
        label: 'seventh-census-property',
      })
      const intent = { ...built, chordFamilies: chordFamiliesAt(level) }
      const outcome = generatePhrase(intent)
      if (outcome.kind !== 'generation_success') return
      const census = seventhCensusOf(intent, outcome)
      if ('kind' in census) return
      swept.push({ intent, outcome, census, drawn: drawnSeventhsOf(intent, outcome) })
    })
  return swept
}

/** Intent: the share of harmony events in their seventh form over a sweep. */
function seventhShare(swept: readonly SweptPhrase[]): number {
  const events = swept.reduce((sum, phrase) => sum + phrase.census.events.length, 0)
  const sevenths = swept.reduce((sum, phrase) => sum + phrase.census.seventhEvents, 0)
  return sevenths / events
}

// @test-link [[rule_seventh_chords_level_steps]]
// @test-link [[rule_triad_fallback_per_phrase]]
// @test-link [[rule_seventh_chords_diatonic_only]]
describe('the census over a reduced sweep, at every level', () => {
  const swept = new Map<ChordFamilyLevel, readonly SweptPhrase[]>()

  beforeAll(() => {
    for (const level of ['off', ...LEVELS_ABOVE_OFF] as const) swept.set(level, reducedSweep(level))
  }, 600_000)

  it('never makes the seventh share smaller a step up, from Off to Strongly favored', () => {
    const shares = (['off', ...LEVELS_ABOVE_OFF] as const).map((level) =>
      seventhShare(swept.get(level)!),
    )
    console.log(`SEVENTH-CENSUS-PROPERTY shares off..stronglyFavored: ${shares.join(' ')}`)
    expect(shares[0]).toBe(0)
    for (let index = 1; index < shares.length; index += 1)
      expect(shares[index]!).toBeGreaterThanOrEqual(shares[index - 1]!)
    expect(shares[1]!).toBeGreaterThan(0)
  })

  it('holds every phrase to all its drawn sevenths or all triads', () => {
    for (const level of LEVELS_ABOVE_OFF)
      for (const { census, drawn, intent } of swept.get(level)!)
        expect([0, drawn], `${level} ${intent.requestId}`).toContain(census.seventhEvents)
  })

  it("makes every chord above Off a triad or the seventh chord on its degree, of the key's qualities", () => {
    for (const level of LEVELS_ABOVE_OFF)
      for (const { intent, outcome } of swept.get(level)!) {
        const collection = makeHarmonyCollection(
          intent.controls.tonalCenter,
          intent.controls.collection,
        )
        for (const event of outcome.provenance.harmony.events) {
          const degree = event.triad.degree
          expect(event.triad).toEqual(collection.triads[degree - 1])
          if (event.seventh === undefined) continue
          const seventhChord = collection.seventhChords[degree - 1]!
          expect(chordTones(event)).toEqual(seventhChord.pitchClasses)
          expect(event.seventh.quality).toBe(seventhChord.quality)
          expect(SEVENTH_QUALITIES).toContain(event.seventh.quality)
        }
      }
  })
})

describe('the Seventh chords level as a measurement dimension', () => {
  it('measures Off by default, names each profile at it, and refuses a level not generated yet', () => {
    expect(seventhLevelsFrom('X', undefined)).toEqual(['off'])
    expect(seventhLevelsFrom('X', ' off ')).toEqual(['off'])
    expect(() => seventhLevelsFrom('X', 'stronglyFavored')).toThrow(/cannot be measured yet/)
    expect(() => seventhLevelsFrom('X', 'all')).toThrow(/cannot be measured yet/)
    expect(() => seventhLevelsFrom('X', 'often')).toThrow(/X names an unknown level "often"/)
    expect(censusSettings(['off']).map((setting) => setting.label)).toEqual([
      'Neutral at Off',
      'Jazz at Off',
    ])
  })

  it("gives a session case above Off session settings at its level, the sweep's phrase 1 and the Jam double's carrying it; at Off both are unchanged", () => {
    const [first] = sweepCases()
    const atOff = caseSettings(first!, 120)
    expect(caseSettings({ ...first!, seventhLevel: 'off' }, 120)).toEqual(atOff)
    expect(atOff.chordFamilies).toEqual(chordFamiliesAt('off'))
    expect(phraseOneIntent(atOff, first!.seed).chordFamilies).toEqual(chordFamiliesAt('off'))
    const lock = phraseOneLockGroup({ on: true, allowedChanges: [] })
    expect(jamPhraseOneIntent(atOff, first!.seed, { rhythmLock: lock }).chordFamilies).toEqual(
      chordFamiliesAt('off'),
    )
    for (const level of ['sometimes', 'favored', 'stronglyFavored'] as const) {
      const settings = caseSettings({ ...first!, seventhLevel: level }, 120)
      expect(settings).toEqual({ ...atOff, chordFamilies: chordFamiliesAt(level) })
      expect(phraseOneIntent(settings, first!.seed).chordFamilies).toEqual(chordFamiliesAt(level))
      expect(jamPhraseOneIntent(settings, first!.seed, {}).chordFamilies).toEqual(
        chordFamiliesAt(level),
      )
      expect(jamPhraseOneIntent(settings, first!.seed, { rhythmLock: lock }).chordFamilies).toEqual(
        chordFamiliesAt(level),
      )
    }
  })
})
