/**
 * The played-notes file keeps every onset where it was played: a property test over random
 * sessions, each with random tempos (at least one tempo change) and random onsets and releases.
 * Every note is read back from the file and its tick converted to seconds from its phrase's
 * marker through the file's own tempo map, independently of the encoder's arithmetic.
 */
import { describe, expect, it } from 'vitest'

import { encodePlayedNotesMidi } from '@/export/midi/played-notes-midi-encoder'
import type { PlayedNotesMidiInput } from '@/export/midi/played-notes-midi-input'
import { phraseLength, playedSession, type PlayedOffsets } from './played-notes-fixtures'
import { metaTexts, notesOf, readSmf, tempoMap } from './smf-reader'

const MARKER = 0x06
const CASES = 500
const ONE_MILLISECOND = 0.001

/** Intent: a seeded pseudo-random generator (mulberry32) giving numbers in [0, 1). */
function mulberry32(seed: number): () => number {
  let state = seed >>> 0
  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let mixed = state
    mixed = Math.imul(mixed ^ (mixed >>> 15), mixed | 1)
    mixed ^= mixed + Math.imul(mixed ^ (mixed >>> 7), mixed | 61)
    return ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296
  }
}

/** Intent: a whole number from `low` to `high`, both included. */
function integerBetween(random: () => number, low: number, high: number): number {
  return low + Math.floor(random() * (high - low + 1))
}

/** Intent: random tempos from 60 to 240 BPM for `count` phrases, with at least one change. */
function randomTempos(random: () => number, count: number): number[] {
  const tempos = Array.from({ length: count }, () => integerBetween(random, 60, 240))
  if (tempos.every((tempo) => tempo === tempos[0])) tempos[count - 1] = tempos[0] === 60 ? 61 : 60
  return tempos
}

/**
 * Intent: one random session: two to four phrases from a random start, one to five notes in each,
 * every note of the session on its own pitch, onsets anywhere inside their phrase and releases up
 * to three seconds later (across phrase boundaries and tempo changes, or past the end).
 */
function randomSession(random: () => number): PlayedNotesMidiInput {
  const tempos = randomTempos(random, integerBetween(random, 2, 4))
  let pitch = 20
  const notes = tempos.map((tempo): PlayedOffsets[] =>
    Array.from({ length: integerBetween(random, 1, 5) }, () => {
      const onset = random() * phraseLength(tempo) * 0.9999
      pitch += 1
      return {
        pitch,
        velocity: integerBetween(random, 1, 127),
        onset,
        release: onset + random() * 3,
      }
    }),
  )
  return playedSession(random() * 100, tempos, notes)
}

/** Intent: seconds from the file's start to `tick`, through the file's own tempo map. */
function secondsAt(map: ReturnType<typeof tempoMap>, tick: number): number {
  let seconds = 0
  map.forEach((entry, index) => {
    const until = Math.min(tick, map[index + 1]?.tick ?? Number.POSITIVE_INFINITY)
    if (until > entry.tick) seconds += ((until - entry.tick) * entry.microsecondsPerQuarter) / 960e6
  })
  return seconds
}

/** The worst onset error found, with the case it was found in. */
interface WorstOnset {
  error: number
  case: number
}

// @test-link [[rule_played_notes_export_unquantized_timing]]
describe('encodePlayedNotesMidi: unquantized timing', () => {
  // @test-link [[rule_played_notes_export_unquantized_timing]]
  it('keeps every onset within 1 ms of where it was played, over random tempos and onsets', () => {
    const random = mulberry32(0x1f2e3d4c)
    const worst: WorstOnset = { error: 0, case: -1 }
    let checkedNotes = 0
    for (let index = 0; index < CASES; index += 1) {
      const session = randomSession(random)
      const file = readSmf(encodePlayedNotesMidi(session))
      const map = tempoMap(file.tracks[0]!)
      const markers = metaTexts(file.tracks[0]!, MARKER)
      const read = new Map(notesOf(file.tracks[1]!).map((note) => [note.pitch, note]))
      for (const phrase of session.phrases) {
        const phraseStart = secondsAt(map, markers[phrase.number - 1]!.tick)
        for (const note of phrase.playedNotes) {
          const found = read.get(note.pitch)
          expect(found, `case ${index}, pitch ${note.pitch}`).toBeDefined()
          const played = note.onsetAt - phrase.startedAt
          const error = Math.abs(secondsAt(map, found!.startTick) - phraseStart - played)
          if (error > worst.error) Object.assign(worst, { error, case: index })
          checkedNotes += 1
        }
      }
      expect(read.size).toBe(session.phrases.flatMap((phrase) => phrase.playedNotes).length)
    }
    expect(checkedNotes).toBeGreaterThan(CASES * 2)
    expect(worst.error, `worst onset error in case ${worst.case}`).toBeLessThanOrEqual(
      ONE_MILLISECOND,
    )
  })
})
