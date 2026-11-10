import {
  COLLECTIONS,
  PITCH_CLASSES,
  type Collection,
  type PitchClass,
} from '../controls/generation-controls'
import { deepFreeze } from '../events/deep-freeze'
import type {
  CollectionDegree,
  DiatonicSeventhChord,
  DiatonicTriad,
  HarmonyCollection,
  PitchClassNumber,
  SeventhQuality,
  TriadQuality,
} from './harmony-types'

// @spec-link [[module_harmony_candidate_domain]]
export const COLLECTION_OFFSETS = deepFreeze({
  Major: [0, 2, 4, 5, 7, 9, 11],
  Minor: [0, 2, 3, 5, 7, 8, 10],
  Ionian: [0, 2, 4, 5, 7, 9, 11],
  Dorian: [0, 2, 3, 5, 7, 9, 10],
  Phrygian: [0, 1, 3, 5, 7, 8, 10],
  Lydian: [0, 2, 4, 6, 7, 9, 11],
  Mixolydian: [0, 2, 4, 5, 7, 9, 10],
  Aeolian: [0, 2, 3, 5, 7, 8, 10],
  Locrian: [0, 1, 3, 5, 6, 8, 10],
} as const satisfies Record<Collection, readonly number[]>)

function normalizePitchClass(value: number): PitchClassNumber {
  return (((value % 12) + 12) % 12) as PitchClassNumber
}

function deriveTriadQuality(pitchClasses: readonly PitchClassNumber[]): TriadQuality {
  const root = pitchClasses[0]!
  const third = normalizePitchClass(pitchClasses[1]! - root)
  const fifth = normalizePitchClass(pitchClasses[2]! - root)
  if (third === 4 && fifth === 7) return 'major'
  if (third === 3 && fifth === 7) return 'minor'
  if (third === 3 && fifth === 6) return 'diminished'
  throw new Error(
    `Selected collection cannot produce a root-position diatonic triad: ${third}/${fifth}.`,
  )
}

function deriveTriads(pitchClasses: readonly PitchClassNumber[]): readonly DiatonicTriad[] {
  return pitchClasses.map((_, index) => {
    const chordPitchClasses = [
      pitchClasses[index]!,
      pitchClasses[(index + 2) % 7]!,
      pitchClasses[(index + 4) % 7]!,
    ] as const
    return deepFreeze({
      degree: (index + 1) as CollectionDegree,
      pitchClasses: chordPitchClasses,
      quality: deriveTriadQuality(chordPitchClasses),
    })
  })
}

/** Derive a seventh chord's quality from its third, fifth and seventh above the root. */
// @spec-link [[rule_seventh_chords_diatonic_only]]
export function deriveSeventhQuality(
  pitchClasses: readonly [PitchClassNumber, PitchClassNumber, PitchClassNumber, PitchClassNumber],
): SeventhQuality {
  const root = pitchClasses[0]
  const third = normalizePitchClass(pitchClasses[1] - root)
  const fifth = normalizePitchClass(pitchClasses[2] - root)
  const seventh = normalizePitchClass(pitchClasses[3] - root)
  if (third === 4 && fifth === 7 && seventh === 11) return 'major-seventh'
  if (third === 3 && fifth === 7 && seventh === 10) return 'minor-seventh'
  if (third === 4 && fifth === 7 && seventh === 10) return 'dominant-seventh'
  if (third === 3 && fifth === 6 && seventh === 10) return 'half-diminished-seventh'
  throw new Error(
    `Selected collection cannot produce a diatonic seventh chord: ${third}/${fifth}/${seventh}.`,
  )
}

function deriveSeventhChords(
  pitchClasses: readonly PitchClassNumber[],
): readonly DiatonicSeventhChord[] {
  return pitchClasses.map((_, index) => {
    const chordPitchClasses = [
      pitchClasses[index]!,
      pitchClasses[(index + 2) % 7]!,
      pitchClasses[(index + 4) % 7]!,
      pitchClasses[(index + 6) % 7]!,
    ] as const
    return deepFreeze({
      degree: (index + 1) as CollectionDegree,
      pitchClasses: chordPitchClasses,
      quality: deriveSeventhQuality(chordPitchClasses),
    })
  })
}

/** Construct collection pitch classes, root-position diatonic triads and seventh chords. */
// @spec-link [[module_harmony_candidate_domain]]
export function makeHarmonyCollection(
  tonalCenter: PitchClass,
  collection: Collection,
): HarmonyCollection {
  if (!PITCH_CLASSES.includes(tonalCenter)) {
    throw new Error(`Unsupported tonal center ${JSON.stringify(tonalCenter)}.`)
  }
  if (!COLLECTIONS.includes(collection)) {
    throw new Error(`Unsupported collection ${JSON.stringify(collection)}.`)
  }
  const tonic = PITCH_CLASSES.indexOf(tonalCenter)
  const pitchClasses = COLLECTION_OFFSETS[collection].map((offset) =>
    normalizePitchClass(tonic + offset),
  )

  return deepFreeze({
    tonalCenter,
    collection,
    pitchClasses,
    triads: deriveTriads(pitchClasses),
    seventhChords: deriveSeventhChords(pitchClasses),
  })
}
