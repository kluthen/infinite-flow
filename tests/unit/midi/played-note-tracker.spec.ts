/**
 * The played-note tracker: a note-on starts a held note and reports it as played, a note-off ends
 * it, a new note-on for a held pitch ends the earlier one at the new onset, and releaseAll ends
 * every held note. Ended notes have the session history's recorded played-note shape.
 */
import { describe, expect, expectTypeOf, it } from 'vitest'

import type { NoteOnOnAudioClock } from '@/domain/acknowledgement/played-onset-latency'
import { makeConcertPitch } from '@/domain/events/concert-pitch'
import {
  createPlayedNoteTracker,
  PlayedNoteTrackerError,
  toNoteOnOnAudioClock,
  type PlayedNoteEvent,
} from '@/midi/played-note-tracker'
import type { RecordedPlayedNote } from '@/session/session-history'

const C4 = makeConcertPitch(60)
const E4 = makeConcertPitch(64)
const G4 = makeConcertPitch(67)

// @test-link [[rule_only_note_on_counts_as_played]]
describe('createPlayedNoteTracker: note-on and note-off', () => {
  it('reports a note-on as played and its note-off as the end of that note', () => {
    const tracker = createPlayedNoteTracker()
    expect(tracker.noteOn(C4, 90, 1)).toEqual([
      { kind: 'played', note: { pitch: C4, velocity: 90, onsetAt: 1 } },
    ])
    expect(tracker.held()).toEqual([{ pitch: C4, velocity: 90, onsetAt: 1 }])
    expect(tracker.noteOff(C4, 1.5)).toEqual([
      { kind: 'ended', note: { pitch: C4, velocity: 90, onsetAt: 1, releaseAt: 1.5 } },
    ])
    expect(tracker.held()).toEqual([])
  })

  it('ends a held pitch at the onset of a new note-on for the same pitch, then plays the new one', () => {
    const tracker = createPlayedNoteTracker()
    tracker.noteOn(C4, 80, 1)
    expect(tracker.noteOn(C4, 100, 2)).toEqual([
      { kind: 'ended', note: { pitch: C4, velocity: 80, onsetAt: 1, releaseAt: 2 } },
      { kind: 'played', note: { pitch: C4, velocity: 100, onsetAt: 2 } },
    ])
    expect(tracker.held()).toEqual([{ pitch: C4, velocity: 100, onsetAt: 2 }])
  })

  it('holds two different pitches together and ends each at its own note-off', () => {
    const tracker = createPlayedNoteTracker()
    tracker.noteOn(C4, 70, 1)
    tracker.noteOn(E4, 60, 1.25)
    expect(tracker.held()).toEqual([
      { pitch: C4, velocity: 70, onsetAt: 1 },
      { pitch: E4, velocity: 60, onsetAt: 1.25 },
    ])
    expect(tracker.noteOff(E4, 2)).toEqual([
      { kind: 'ended', note: { pitch: E4, velocity: 60, onsetAt: 1.25, releaseAt: 2 } },
    ])
    expect(tracker.held()).toEqual([{ pitch: C4, velocity: 70, onsetAt: 1 }])
  })

  it('returns no event for a note-off of a pitch that is not held', () => {
    const tracker = createPlayedNoteTracker()
    expect(tracker.noteOff(G4, 3)).toEqual([])
    tracker.noteOn(C4, 70, 4)
    tracker.noteOff(C4, 5)
    expect(tracker.noteOff(C4, 6)).toEqual([])
  })

  it('lets a note end at its own onset (zero length)', () => {
    const tracker = createPlayedNoteTracker()
    tracker.noteOn(C4, 70, 1)
    expect(tracker.noteOff(C4, 1)).toEqual([
      { kind: 'ended', note: { pitch: C4, velocity: 70, onsetAt: 1, releaseAt: 1 } },
    ])
  })
})

// @test-link [[rule_only_note_on_counts_as_played]]
describe('createPlayedNoteTracker: releaseAll', () => {
  it('ends every held note at the given time, in onset order, and holds nothing after', () => {
    const tracker = createPlayedNoteTracker()
    tracker.noteOn(G4, 50, 1.5)
    tracker.noteOn(C4, 70, 1)
    tracker.noteOn(E4, 60, 1.25)
    expect(tracker.releaseAll(3)).toEqual([
      { kind: 'ended', note: { pitch: C4, velocity: 70, onsetAt: 1, releaseAt: 3 } },
      { kind: 'ended', note: { pitch: E4, velocity: 60, onsetAt: 1.25, releaseAt: 3 } },
      { kind: 'ended', note: { pitch: G4, velocity: 50, onsetAt: 1.5, releaseAt: 3 } },
    ])
    expect(tracker.held()).toEqual([])
    expect(tracker.releaseAll(4)).toEqual([])
  })
})

// @test-link [[rule_only_note_on_counts_as_played]]
describe('createPlayedNoteTracker: contract violations', () => {
  it('throws when a note-off comes before its note-on', () => {
    const tracker = createPlayedNoteTracker()
    tracker.noteOn(C4, 70, 2)
    expect(() => tracker.noteOff(C4, 1.5)).toThrow(PlayedNoteTrackerError)
  })

  it('throws when a new note-on for a held pitch comes before the held onset', () => {
    const tracker = createPlayedNoteTracker()
    tracker.noteOn(C4, 70, 2)
    expect(() => tracker.noteOn(C4, 70, 1)).toThrow(PlayedNoteTrackerError)
  })

  it('throws when releaseAll comes before a held onset', () => {
    const tracker = createPlayedNoteTracker()
    tracker.noteOn(C4, 70, 2)
    expect(() => tracker.releaseAll(1)).toThrow(PlayedNoteTrackerError)
  })

  it.each([0, 128, 1.5, Number.NaN])('throws for a note-on velocity of %s', (velocity) => {
    expect(() => createPlayedNoteTracker().noteOn(C4, velocity, 1)).toThrow(PlayedNoteTrackerError)
  })

  it.each([Number.NaN, Number.POSITIVE_INFINITY])('throws for a time of %s', (at) => {
    const tracker = createPlayedNoteTracker()
    expect(() => tracker.noteOn(C4, 70, at)).toThrow(PlayedNoteTrackerError)
    expect(() => tracker.noteOff(C4, at)).toThrow(PlayedNoteTrackerError)
    expect(() => tracker.releaseAll(at)).toThrow(PlayedNoteTrackerError)
  })
})

// @test-link [[rule_only_note_on_counts_as_played]]
describe('played-note shapes', () => {
  it('ends notes with the session history recorded played-note shape', () => {
    expectTypeOf<
      Extract<PlayedNoteEvent, { kind: 'ended' }>['note']
    >().toEqualTypeOf<RecordedPlayedNote>()
    const tracker = createPlayedNoteTracker()
    tracker.noteOn(C4, 70, 1)
    const [ended] = tracker.noteOff(C4, 2)
    if (ended?.kind !== 'ended') throw new Error('expected an ended event')
    const recorded: RecordedPlayedNote = ended.note
    expect(recorded.releaseAt).toBe(2)
  })
})

// @test-link [[rule_played_onset_latency_compensation]]
describe('toNoteOnOnAudioClock', () => {
  it('carries the pitch and the audio-clock onset, uncorrected', () => {
    const result: NoteOnOnAudioClock = toNoteOnOnAudioClock({
      pitch: E4,
      velocity: 70,
      onsetAt: 2.75,
    })
    expect(result).toEqual({ pitch: E4, audioClockSeconds: 2.75 })
  })
})
