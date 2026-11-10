import { describe, expect, it } from 'vitest'

import {
  COLLECTION_OFFSETS,
  deriveSeventhQuality,
  makeHarmonyCollection,
} from '@/domain/harmony/collection'
import { isNoLegalHarmonyPlan, makeHarmonyCandidateDomain } from '@/domain/harmony/harmony-planner'
import {
  chordTones,
  type HarmonyCandidate,
  type PitchClassNumber,
  type SeventhQuality,
} from '@/domain/harmony/harmony-types'
import {
  COLLECTIONS,
  HARMONIC_MOTIONS,
  PITCH_CLASSES,
  TENSION_ARCS,
  type Collection,
  type PitchClass,
} from '@/domain/controls/generation-controls'

import { chordPlan, seventhChordEvent } from './seventh-chord-fixtures'

const EXPECTED_OFFSETS = {
  Major: [0, 2, 4, 5, 7, 9, 11],
  Minor: [0, 2, 3, 5, 7, 8, 10],
  Ionian: [0, 2, 4, 5, 7, 9, 11],
  Dorian: [0, 2, 3, 5, 7, 9, 10],
  Phrygian: [0, 1, 3, 5, 7, 8, 10],
  Lydian: [0, 2, 4, 6, 7, 9, 11],
  Mixolydian: [0, 2, 4, 5, 7, 9, 10],
  Aeolian: [0, 2, 3, 5, 7, 8, 10],
  Locrian: [0, 1, 3, 5, 6, 8, 10],
} as const

const MAJ7 = 'major-seventh'
const M7 = 'minor-seventh'
const DOM7 = 'dominant-seventh'
const M7B5 = 'half-diminished-seventh'

/** Research table A (docs/music/chord-research.md), degrees 1 to 7, one row per mode. */
const TABLE_A_QUALITIES: Record<Collection, readonly SeventhQuality[]> = {
  Major: [MAJ7, M7, M7, MAJ7, DOM7, M7, M7B5],
  Ionian: [MAJ7, M7, M7, MAJ7, DOM7, M7, M7B5],
  Dorian: [M7, M7, MAJ7, DOM7, M7, M7B5, MAJ7],
  Phrygian: [M7, MAJ7, DOM7, M7, M7B5, MAJ7, M7],
  Lydian: [MAJ7, DOM7, M7, M7B5, MAJ7, M7, M7],
  Mixolydian: [DOM7, M7, M7B5, MAJ7, M7, M7, MAJ7],
  Minor: [M7, M7B5, MAJ7, M7, M7, MAJ7, DOM7],
  Aeolian: [M7, M7B5, MAJ7, M7, M7, MAJ7, DOM7],
  Locrian: [M7B5, MAJ7, M7, M7, MAJ7, DOM7, M7],
}

type FourPitchClasses = readonly [
  PitchClassNumber,
  PitchClassNumber,
  PitchClassNumber,
  PitchClassNumber,
]

function transpose(shape: FourPitchClasses, root: number): FourPitchClasses {
  const [first, third, fifth, seventh] = shape
  return [
    (first + root) % 12,
    (third + root) % 12,
    (fifth + root) % 12,
    (seventh + root) % 12,
  ] as FourPitchClasses
}

/** Every planner candidate for a tonic, over every collection, motion and arc with a legal plan. */
function everyPlannerCandidate(tonic: PitchClass): HarmonyCandidate[] {
  const candidates: HarmonyCandidate[] = []
  for (const collection of COLLECTIONS) {
    for (const harmonicMotion of HARMONIC_MOTIONS) {
      for (const tensionArc of TENSION_ARCS) {
        const domain = makeHarmonyCandidateDomain({
          tonalCenter: tonic,
          collection,
          harmonicMotion,
          tensionArc,
        })
        if (!isNoLegalHarmonyPlan(domain)) candidates.push(...domain.candidates)
      }
    }
  }
  return candidates
}

const C_MAJOR_ACTIVE_SETTLED_FIRST_CANDIDATE =
  '{"candidateIndex":0,"identity":"{\\"version\\":\\"harmony-domain-v1\\",\\"collection\\"' +
  ':\\"Major\\",\\"tonalCenter\\":\\"C\\",\\"motion\\":\\"Active diatonic\\",\\"templateId\\":\\"' +
  'tonal-active-1\\",\\"degrees\\":[1,3,2,5],\\"boundaries\\":[[0,0,4],[1,0,4],[2,0,4],[' +
  '3,0,4]],\\"tensionRequirement\\":{\\"mustResolveBeforeFinalSoundingEvent\\":true,\\"m' +
  'aximumFigureCount\\":1,\\"arc\\":\\"Settled\\",\\"allowedBars\\":[0,1,2],\\"maximumResol' +
  'utionDelay\\":\\"next_strong_sounding_onset\\",\\"permittedFigureKinds\\":[\\"diatonic' +
  '_passing_or_neighbor\\",\\"appoggiatura\\"],\\"requiredFigureCount\\":0,\\"resolutionP' +
  'reference\\":\\"ordinary\\"}}","templateId":"tonal-active-1","degreeSequence":[1,3,' +
  '2,5],"events":[{"barIndex":0,"startBeat":0,"durationBeats":4,"triad":{"degree":1' +
  ',"pitchClasses":[0,4,7],"quality":"major"},"role":"tonic","templateId":"tonal-ac' +
  'tive-1","barRoles":[{"barIndex":0,"role":"tonic","degree":1}]},{"barIndex":1,"st' +
  'artBeat":0,"durationBeats":4,"triad":{"degree":3,"pitchClasses":[4,7,11],"qualit' +
  'y":"minor"},"role":"tonic_prolongation","templateId":"tonal-active-1","barRoles"' +
  ':[{"barIndex":1,"role":"tonic_prolongation","degree":3}]},{"barIndex":2,"startBe' +
  'at":0,"durationBeats":4,"triad":{"degree":2,"pitchClasses":[2,5,9],"quality":"mi' +
  'nor"},"role":"predominant","templateId":"tonal-active-1","barRoles":[{"barIndex"' +
  ':2,"role":"predominant","degree":2}]},{"barIndex":3,"startBeat":0,"durationBeats' +
  '":4,"triad":{"degree":5,"pitchClasses":[7,11,2],"quality":"major"},"role":"open_' +
  'arrival","templateId":"tonal-active-1","barRoles":[{"barIndex":3,"role":"open_ar' +
  'rival","degree":5}]}],"endpoint":{"kind":"tonal_degree_five_chord_tone","degree"' +
  ':5},"tensionRequirement":{"mustResolveBeforeFinalSoundingEvent":true,"maximumFig' +
  'ureCount":1,"arc":"Settled","allowedBars":[0,1,2],"maximumResolutionDelay":"next' +
  '_strong_sounding_onset","permittedFigureKinds":["diatonic_passing_or_neighbor","' +
  'appoggiatura"],"requiredFigureCount":0,"resolutionPreference":"ordinary"}}'

// @test-link [[module_harmony_candidate_domain]]
describe('harmony collection vocabulary', () => {
  it('uses every documented collection offset table exactly', () => {
    expect(COLLECTION_OFFSETS).toEqual(EXPECTED_OFFSETS)
  })

  it.each(PITCH_CLASSES)(
    'reconstructs every collection and seven root-position triads for %s',
    (tonic) => {
      for (const collectionName of COLLECTIONS) {
        const collection = makeHarmonyCollection(tonic, collectionName)
        const tonicPitchClass = PITCH_CLASSES.indexOf(tonic)
        const expectedPitchClasses = EXPECTED_OFFSETS[collectionName].map(
          (offset) => (tonicPitchClass + offset) % 12,
        )

        expect(collection.pitchClasses).toEqual(expectedPitchClasses)
        expect(collection.triads).toHaveLength(7)
        for (const triad of collection.triads) {
          const degreeIndex = triad.degree - 1
          expect(triad.pitchClasses).toEqual([
            expectedPitchClasses[degreeIndex],
            expectedPitchClasses[(degreeIndex + 2) % 7],
            expectedPitchClasses[(degreeIndex + 4) % 7],
          ])
        }
      }
    },
  )

  it('derives triad qualities from collection pitch classes without manufacturing a dominant', () => {
    expect(makeHarmonyCollection('C', 'Major').triads.map((triad) => triad.quality)).toEqual([
      'major',
      'minor',
      'minor',
      'major',
      'major',
      'minor',
      'diminished',
    ])
    expect(makeHarmonyCollection('C', 'Minor').triads[4]).toMatchObject({
      degree: 5,
      pitchClasses: [7, 10, 2],
      quality: 'minor',
    })
  })

  it('returns deeply frozen serializable collection data', () => {
    const collection = makeHarmonyCollection('C', 'Dorian')

    expect(JSON.parse(JSON.stringify(collection))).toEqual(collection)
    expect(Object.isFrozen(collection)).toBe(true)
    expect(Object.isFrozen(collection.pitchClasses)).toBe(true)
    expect(Object.isFrozen(collection.triads[0])).toBe(true)
    expect(Object.isFrozen(collection.seventhChords)).toBe(true)
    expect(collection.seventhChords).toHaveLength(7)
    expect(Object.isFrozen(collection.seventhChords[0])).toBe(true)
    expect(Object.isFrozen(collection.seventhChords[0]?.pitchClasses)).toBe(true)
    expect(() => {
      // @ts-expect-error collection pitch classes are readonly
      collection.pitchClasses[0] = 99
    }).toThrow()
  })
})

// @test-link [[rule_seventh_chords_diatonic_only]]
describe('diatonic seventh chords', () => {
  it.each(PITCH_CLASSES)(
    'builds the seventh chord on every degree of every collection for %s',
    (tonic) => {
      for (const collectionName of COLLECTIONS) {
        const collection = makeHarmonyCollection(tonic, collectionName)
        const degrees = collection.pitchClasses

        expect(collection.seventhChords).toHaveLength(7)
        expect(collection.seventhChords.map((chord) => chord.degree)).toEqual([1, 2, 3, 4, 5, 6, 7])
        for (const [index, chord] of collection.seventhChords.entries()) {
          expect(chord.pitchClasses).toEqual([
            degrees[index],
            degrees[(index + 2) % 7],
            degrees[(index + 4) % 7],
            degrees[(index + 6) % 7],
          ])
          expect(chord.pitchClasses.slice(0, 3)).toEqual(collection.triads[index]!.pitchClasses)
        }
        expect(collection.seventhChords.map((chord) => chord.quality)).toEqual(
          TABLE_A_QUALITIES[collectionName],
        )
      }
    },
  )

  it.each([
    [[0, 4, 7, 11], MAJ7],
    [[0, 3, 7, 10], M7],
    [[0, 4, 7, 10], DOM7],
    [[0, 3, 6, 10], M7B5],
  ] as const)('derives the quality of %j as %s, on C and transposed', (shape, quality) => {
    expect(deriveSeventhQuality(shape)).toBe(quality)
    expect(deriveSeventhQuality(transpose(shape, 9))).toBe(quality)
    expect(deriveSeventhQuality(transpose(shape, 5))).toBe(quality)
  })

  it.each([
    ['a diminished seventh', [0, 3, 6, 9]],
    ['a minor-major seventh', [0, 3, 7, 11]],
    ['an augmented major seventh', [0, 4, 8, 11]],
    ['an augmented seventh', [0, 4, 8, 10]],
    ['a sixth chord', [0, 4, 7, 9]],
  ] as const)('refuses %s', (_name, shape) => {
    expect(() => deriveSeventhQuality(shape)).toThrow(/seventh chord/)
    expect(() => deriveSeventhQuality(transpose(shape, 9))).toThrow(/seventh chord/)
  })
})

// @test-link [[module_harmony_candidate_domain]]
describe('harmony event chord tones', () => {
  it('gives the triad for a triad-form event and the triad plus seventh for a seventh-form one', () => {
    const [triadForm] = chordPlan([{ degree: 5, beat: 0, beats: 4 }])
    const seventhForm = seventhChordEvent(5, 4, 4)

    expect('seventh' in triadForm!).toBe(false)
    expect(chordTones(triadForm!)).toEqual([7, 11, 2])
    expect(seventhForm.seventh).toEqual({ pitchClass: 5, quality: DOM7 })
    expect(seventhForm.triad).toEqual(triadForm!.triad)
    expect(chordTones(seventhForm)).toEqual([7, 11, 2, 5])
  })

  it('serializes a planner candidate byte for byte as before', () => {
    const domain = makeHarmonyCandidateDomain({
      tonalCenter: 'C',
      collection: 'Major',
      harmonicMotion: 'Active diatonic',
      tensionArc: 'Settled',
    })
    if (isNoLegalHarmonyPlan(domain)) throw new Error('Expected a harmony candidate domain.')

    expect(JSON.stringify(domain.candidates[0])).toBe(C_MAJOR_ACTIVE_SETTLED_FIRST_CANDIDATE)
  })

  it.each(['C', 'F#'] as const)('keeps every planner candidate in triad form for %s', (tonic) => {
    const candidates = everyPlannerCandidate(tonic)
    for (const candidate of candidates) {
      for (const event of candidate.events) expect('seventh' in event).toBe(false)
    }
    expect(candidates.length).toBeGreaterThan(0)
  })
})
