import { makeHarmonyCollection } from '@/domain/harmony/collection'
import type {
  ChordSeventh,
  CollectionDegree,
  HarmonyCollection,
  HarmonyEvent,
} from '@/domain/harmony/harmony-types'

const C_MAJOR = makeHarmonyCollection('C', 'Major')

/** One chord of a hand-built plan; `beat` counts absolute beats from the start of the phrase. */
export interface PlannedChord {
  readonly degree: CollectionDegree
  readonly beat: number
  readonly beats: number
  readonly seventh?: true
}

/** The seventh a seventh-form event on `degree` adds to its triad, read from the collection. */
export function seventhOf(
  degree: CollectionDegree,
  collection: HarmonyCollection = C_MAJOR,
): ChordSeventh {
  const seventhChord = collection.seventhChords[degree - 1]
  if (seventhChord?.degree !== degree) {
    throw new Error(`Collection has no seventh chord on degree ${degree}.`)
  }
  return { pitchClass: seventhChord.pitchClasses[3], quality: seventhChord.quality }
}

/** The event in seventh form, holding the seventh of its triad's degree. */
export function withSeventh(
  event: HarmonyEvent,
  collection: HarmonyCollection = C_MAJOR,
): HarmonyEvent {
  const degree = event.triad.degree
  const triad = collection.triads[degree - 1]
  if (JSON.stringify(triad) !== JSON.stringify(event.triad)) {
    throw new Error(`Event triad is not the collection's triad on degree ${degree}.`)
  }
  if ('seventh' in event) throw new Error('Event is already in seventh form.')
  return { ...event, seventh: seventhOf(degree, collection) }
}

/** One triad-form event of the collection, built like the validation fixtures' `chord()`. */
function triadEvent(
  degree: CollectionDegree,
  beat: number,
  beats: number,
  collection: HarmonyCollection,
): HarmonyEvent {
  return {
    barIndex: Math.floor(beat / 4) as 0 | 1 | 2 | 3,
    startBeat: (beat % 4) as 0 | 2,
    durationBeats: beats,
    triad: collection.triads[degree - 1]!,
    role: 'tonic',
    templateId: 'fixture',
    barRoles: [],
  }
}

/** One seventh-form event; `beat` counts absolute beats from the start of the phrase. */
export function seventhChordEvent(
  degree: CollectionDegree,
  beat: number,
  beats: number,
  collection: HarmonyCollection = C_MAJOR,
): HarmonyEvent {
  return withSeventh(triadEvent(degree, beat, beats, collection), collection)
}

/** A hand-built plan mixing triad-form events and seventh-form events (`seventh: true`). */
export function chordPlan(
  chords: readonly PlannedChord[],
  collection: HarmonyCollection = C_MAJOR,
): readonly HarmonyEvent[] {
  return chords.map(({ degree, beat, beats, seventh }) =>
    seventh
      ? seventhChordEvent(degree, beat, beats, collection)
      : triadEvent(degree, beat, beats, collection),
  )
}
