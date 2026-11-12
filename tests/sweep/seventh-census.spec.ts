// @vitest-environment node
/**
 * The seventh census's own tests (measurement tooling, run by `npm run measure:sevenths`): a
 * hand-built sweep fixture (a plan with seventh-form events and a chord held across a barline, its
 * triads-only fallback, a plan with no seventh drawn, a failed generation) is classified and
 * tallied exactly; a plan that is not serialized, or a draw it could not hold, is refused; a real
 * phrase generated at Off holds triads only; and the level dimension refuses what cannot be
 * measured before the generator reads the level.
 */

import { describe, expect, it } from 'vitest'

import { generatePhrase } from '@/domain/generation/orchestration/generation-orchestrator'
import { chordPlan } from '../unit/domain/harmony/seventh-chord-fixtures'
import { buildIntent } from '../unit/domain/generation/carry-in/carry-in-fixture'
import { caseSettings, sweepCases } from '../unit/session/deadline-sweep'
import { classifyPlan, seventhCensusOf, type FailedSeventhCensus } from './seventh-census'
import { SeventhTally, censusSettings } from './seventh-census-sweep'
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

  it('refuses a phrase above Off, whose draw it cannot read before chunk 12', () => {
    const built = buildIntent({ seed: 7, label: 'seventh-census' })
    const intent = { ...built, chordFamilies: chordFamiliesAt('sometimes') }
    expect(() => seventhCensusOf(intent, generatePhrase(intent))).toThrow(/chunk 12/)
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

  it('refuses a session case above Off, which a session cannot carry before chunk 16', () => {
    const [first] = sweepCases()
    expect(caseSettings({ ...first!, seventhLevel: 'off' }, 120)).toEqual(caseSettings(first!, 120))
    expect(() => caseSettings({ ...first!, seventhLevel: 'favored' }, 120)).toThrow(/chunk 16/)
  })
})
