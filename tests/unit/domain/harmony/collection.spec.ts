// @test-link [[module_harmony_candidate_domain]]
import { describe, expect, it } from 'vitest'

import { COLLECTION_OFFSETS, makeHarmonyCollection } from '@/domain/harmony/collection'
import { COLLECTIONS, PITCH_CLASSES } from '@/domain/controls/generation-controls'

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
    expect(() => {
      // @ts-expect-error collection pitch classes are readonly
      collection.pitchClasses[0] = 99
    }).toThrow()
  })
})
