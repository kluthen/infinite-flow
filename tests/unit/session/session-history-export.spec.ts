/**
 * What the session history hands the MusicXML and MIDI encoders: for every record, its phrase
 * number, the stored shown phrase (never a regenerated one) and its tempo, and nothing else, so
 * the repeat mark never reaches a file and a repeat encodes exactly like the phrase it repeats.
 * An empty history or records of two instruments are refused. A full recorded session and both
 * encodings touch no browser storage and make no network request.
 */

import { afterEach, describe, expect, it, vi } from 'vitest'

import { makeConcertPitch } from '@/domain/events/concert-pitch'
import { notationInputFromOutcome } from '@/domain/notation/notation-input'
import { transformToWrittenPhrase } from '@/domain/notation/written-phrase'
import { encodeGeneratedNotesMidi } from '@/export/midi/midi-encoder'
import type { GeneratedNotesMidiInput } from '@/export/midi/midi-export-input'
import { encodePlayedNotesMidi } from '@/export/midi/played-notes-midi-encoder'
import { encodeGeneratedNotesMusicXml } from '@/export/musicxml/musicxml-encoder'
import type { GeneratedNotesMusicXmlInput } from '@/export/musicxml/musicxml-export-input'
import { createSessionHistory, type SessionHistoryRecord } from '@/session/session-history'
import {
  SessionHistoryExportError,
  midiInputFromHistory,
  musicXmlInputFromHistory,
  playedNotesMidiInputFromHistory,
} from '@/session/session-history-export'
import { notesOf, rawChunks, readSmf } from '../export/midi/smf-reader'
import {
  idlePhraseOne,
  recordRunnerSession,
  regenerate,
  regeneratedMidi,
  regeneratedMusicXml,
} from './history-recording'
import { SessionDriver, fixedWallClock, phraseOneFor, sessionSettings } from './session-harness'

/** Intent: the recorded phrases of a driven session, fed every output the driver logged. */
function recordedPhrases(driver: SessionDriver): readonly SessionHistoryRecord[] {
  const history = createSessionHistory(driver.settings, fixedWallClock)
  for (const output of driver.log) history.record(output)
  return history.phrases()
}

/** Intent: a driver at 240 BPM (a 1 s measure) for the given instrument, started at 0. */
function fastDriver(instrumentProfileId: 'c-keyboard' | 'bb-tenor' = 'bb-tenor'): SessionDriver {
  const settings = sessionSettings({ tempo: 240, instrumentProfileId })
  return new SessionDriver({ at: 0, settings, phraseOne: phraseOneFor(settings) })
}

/** Intent: three phrases generated with carry-in, the last accepted in time, then Stop. */
function threePhraseSession(instrumentProfileId?: 'c-keyboard' | 'bb-tenor'): SessionDriver {
  const driver = fastDriver(instrumentProfileId)
  driver.accept(0.5)
  driver.countInOver(1)
  driver.sounding(5, 2)
  driver.accept(5.5)
  driver.sounding(9, 3)
  driver.end(10)
  return driver
}

/**
 * Intent: phrase 2 missing its deadline, so the failure ladder repeats phrase 1 as phrase 2, then
 * phrase 3 generated with carry-in and accepted in time, then Stop.
 */
function sessionWithRepeat(): SessionDriver {
  const driver = fastDriver()
  driver.tick(1)
  driver.countInOver(1)
  driver.sounding(5, 2)
  driver.accept(5.5)
  driver.sounding(9, 3)
  driver.end(10)
  return driver
}

/** Intent: the same records with the repeat mark removed, as if every phrase were generated. */
function unmarked(records: readonly SessionHistoryRecord[]): readonly SessionHistoryRecord[] {
  return records.map((record) => {
    const { repeatOf, ...rest } = record
    void repeatOf
    return { ...rest, isRepeat: false }
  })
}

/** Intent: one phrase of a MusicXML input alone, numbered as phrase 1. */
function musicXmlPhraseAlone(
  input: GeneratedNotesMusicXmlInput,
  position: number,
): GeneratedNotesMusicXmlInput {
  return { instrument: input.instrument, phrases: [{ ...input.phrases[position]!, number: 1 }] }
}

/** Intent: one phrase of a MIDI input alone, numbered as phrase 1. */
function midiPhraseAlone(
  input: GeneratedNotesMidiInput,
  position: number,
): GeneratedNotesMidiInput {
  return { phrases: [{ ...input.phrases[position]!, number: 1 }], backing: null }
}

// @test-link [[service_session_history]]
describe('the encoder inputs a history hands over', () => {
  // @test-link [[service_session_history]]
  it("gives each phrase its record's number, stored shown phrase and tempo, and nothing else", () => {
    const records = recordedPhrases(threePhraseSession())

    const musicXml = musicXmlInputFromHistory(records)
    const midi = midiInputFromHistory(records, null)

    expect(musicXml.instrument).toBe(records[0]!.intent.instrumentProfile)
    expect(midi.backing).toBeNull()
    records.forEach((record, position) => {
      const written = musicXml.phrases[position]!
      const sounded = midi.phrases[position]!
      expect(Object.keys(written).sort()).toEqual(['number', 'tempo', 'writtenPhrase'])
      expect(Object.keys(sounded).sort()).toEqual(['number', 'tempo', 'timeline'])
      expect([written.number, sounded.number]).toEqual([record.phraseNumber, record.phraseNumber])
      expect([written.tempo, sounded.tempo]).toEqual([240, 240])
      expect(sounded.timeline).toBe(record.outcome.result.timeline)
      expect(written.writtenPhrase).toEqual(
        transformToWrittenPhrase(notationInputFromOutcome(record.outcome, record.intent)),
      )
    })
    expect(musicXml.phrases).toHaveLength(3)
    expect(midi.phrases).toHaveLength(3)
  })

  // @test-link [[service_session_history]]
  it('passes the backing the caller asked for on to the MIDI input unchanged', () => {
    const records = recordedPhrases(threePhraseSession())
    const backing = records.map((record) => ({ number: record.phraseNumber, notes: [] }))

    expect(midiInputFromHistory(records, backing).backing).toBe(backing)
  })

  // @test-link [[service_session_history]]
  it('refuses an empty history, which has nothing to export', () => {
    expect(() => musicXmlInputFromHistory([])).toThrow(SessionHistoryExportError)
    expect(() => midiInputFromHistory([], null)).toThrow(SessionHistoryExportError)
  })

  // @test-link [[service_session_history]]
  it('refuses records whose phrases were generated for different instruments', () => {
    const [tenorOne] = recordedPhrases(threePhraseSession('bb-tenor'))
    const [, keyboardTwo] = recordedPhrases(threePhraseSession('c-keyboard'))
    const mixed = [tenorOne!, keyboardTwo!]

    expect(() => musicXmlInputFromHistory(mixed)).toThrow(SessionHistoryExportError)
    expect(() => midiInputFromHistory(mixed, null)).toThrow(SessionHistoryExportError)
  })
})

/**
 * Intent: the records of the three-phrase session (phrases at 1, 5 and 9 s, 4 s each) with five
 * played notes: one in the count-in, one in each phrase (the last held past the end at 13 s), and
 * one after the end, which the history gives the last phrase.
 */
function playedThreePhraseRecords(): readonly SessionHistoryRecord[] {
  const driver = threePhraseSession()
  const history = createSessionHistory(driver.settings, fixedWallClock)
  const played: readonly (readonly [number, number, number, number])[] = [
    [60, 40, 0.5, 0.75],
    [62, 50, 1.25, 1.5],
    [64, 60, 6, 7],
    [65, 70, 12.5, 14],
    [67, 80, 13.5, 13.75],
  ]
  for (const [pitch, velocity, onsetAt, releaseAt] of played)
    history.recordPlayedNote({ pitch: makeConcertPitch(pitch), velocity, onsetAt, releaseAt })
  for (const output of driver.log) history.record(output)
  return history.phrases()
}

// @test-link [[service_session_history]]
// @test-link [[req_played_notes_export]]
// @test-link [[rule_session_history_records_played_notes]]
describe('the played-notes input a history hands over', () => {
  // @test-link [[service_session_history]]
  // @test-link [[req_played_notes_export]]
  // @test-link [[rule_session_history_records_played_notes]]
  it("gives each phrase its record's number, tempo, start and played notes, and nothing else", () => {
    const records = playedThreePhraseRecords()

    const input = playedNotesMidiInputFromHistory(records)

    expect(Object.keys(input)).toEqual(['phrases'])
    expect(input.phrases).toHaveLength(3)
    records.forEach((record, position) => {
      const phrase = input.phrases[position]!
      expect(Object.keys(phrase).sort()).toEqual(['number', 'playedNotes', 'startedAt', 'tempo'])
      expect([phrase.number, phrase.tempo, phrase.startedAt]).toEqual([
        record.phraseNumber,
        240,
        record.startedAt,
      ])
      expect(phrase.playedNotes).toEqual(record.playedNotes)
      phrase.playedNotes.forEach((note) =>
        expect(Object.keys(note).sort()).toEqual(['onsetAt', 'pitch', 'releaseAt', 'velocity']),
      )
    })
    expect(input.phrases.map((phrase) => phrase.startedAt)).toEqual([1, 5, 9])
    expect(input.phrases.map((phrase) => phrase.playedNotes.map((note) => note.pitch))).toEqual([
      [62],
      [64],
      [65, 67],
    ])
  })

  // @test-link [[service_session_history]]
  // @test-link [[req_played_notes_export]]
  it('refuses an empty history, which has nothing to export', () => {
    expect(() => playedNotesMidiInputFromHistory([])).toThrow(SessionHistoryExportError)
  })

  // @test-link [[req_played_notes_export]]
  // @test-link [[rule_played_notes_export_aligns_with_generated_midi]]
  it("encodes to a file whose conductor track is the generated-notes file's, byte for byte", () => {
    const records = playedThreePhraseRecords()

    const played = encodePlayedNotesMidi(playedNotesMidiInputFromHistory(records))
    const generated = encodeGeneratedNotesMidi(midiInputFromHistory(records, null))

    expect(rawChunks(played).division).toBe(rawChunks(generated).division)
    expect(rawChunks(played).tracks[0]).toEqual(rawChunks(generated).tracks[0])
    // At 240 BPM one second is 3840 MIDI ticks; each phrase is 15360.
    expect(
      notesOf(readSmf(played).tracks[1]!).map((note) => [
        note.pitch,
        note.velocity,
        note.startTick,
        note.endTick,
      ]),
    ).toEqual([
      [62, 50, 960, 1920],
      [64, 60, 19200, 23040],
      [65, 70, 44160, 46080],
    ])
  })
})

// @test-link [[rule_repeat_phrase_marked_internally_only]]
describe('a repeat in the export', () => {
  // @test-link [[rule_repeat_phrase_marked_internally_only]]
  it('encodes to the bytes of the same phrases unmarked and of the regenerated phrases', () => {
    const records = recordedPhrases(sessionWithRepeat())
    expect(records.map((record) => record.isRepeat)).toEqual([false, true, false])
    const regenerated = records.map(regenerate)

    const musicXml = encodeGeneratedNotesMusicXml(musicXmlInputFromHistory(records))
    const midi = encodeGeneratedNotesMidi(midiInputFromHistory(records, null))

    expect(musicXml).toBe(encodeGeneratedNotesMusicXml(musicXmlInputFromHistory(unmarked(records))))
    expect(midi).toEqual(encodeGeneratedNotesMidi(midiInputFromHistory(unmarked(records), null)))
    expect(musicXml).toBe(
      regeneratedMusicXml(records, regenerated, records[0]!.intent.instrumentProfile),
    )
    expect(midi).toEqual(regeneratedMidi(records, regenerated))
  })

  // @test-link [[rule_repeat_phrase_marked_internally_only]]
  it('encodes the repeat exactly like the phrase it repeats, apart from its number', () => {
    const records = recordedPhrases(sessionWithRepeat())
    const musicXml = musicXmlInputFromHistory(records)
    const midi = midiInputFromHistory(records, null)

    expect(encodeGeneratedNotesMusicXml(musicXmlPhraseAlone(musicXml, 1))).toBe(
      encodeGeneratedNotesMusicXml(musicXmlPhraseAlone(musicXml, 0)),
    )
    expect(encodeGeneratedNotesMidi(midiPhraseAlone(midi, 1))).toEqual(
      encodeGeneratedNotesMidi(midiPhraseAlone(midi, 0)),
    )
    expect(musicXml.phrases[1]!.number).toBe(2)
    expect(midi.phrases[1]!.number).toBe(2)
  })
})

/** The browser storage and network globals a session and its export must never touch. */
const GUARDED_GLOBALS: readonly string[] = [
  'localStorage',
  'sessionStorage',
  'indexedDB',
  'caches',
  'fetch',
  'XMLHttpRequest',
  'WebSocket',
]

/**
 * Intent: replace a global by a trap that logs every property read, call and construction into
 * `touched`; the original comes back with `vi.unstubAllGlobals`.
 */
function trapGlobal(name: string, touched: string[]): void {
  const target = function guarded(): void {}
  const trap = new Proxy(target, {
    get: (_target, property) => {
      touched.push(`${name}.${String(property)}`)
      return undefined
    },
    apply: () => {
      touched.push(`${name}()`)
      return undefined
    },
    construct: () => {
      touched.push(`new ${name}()`)
      return {}
    },
  })
  vi.stubGlobal(name, trap)
}

// @test-link [[rule_session_data_never_sent_or_stored]]
// @test-link [[specification_ephemeral_state_verification]]
describe('storage and network during a recorded session and its export', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  // @test-link [[rule_session_data_never_sent_or_stored]]
  // @test-link [[specification_ephemeral_state_verification]]
  it('touches no browser storage and makes no network request', async () => {
    const touched: string[] = []
    for (const name of GUARDED_GLOBALS) trapGlobal(name, touched)
    const cookieWrite = vi.spyOn(document, 'cookie', 'set')

    const settings = sessionSettings({ instrumentProfileId: 'eb-alto' })
    const history = await recordRunnerSession({
      settings,
      phraseOne: idlePhraseOne(settings, 21),
      firstSeed: 7000,
      phraseCount: 4,
    })
    const records = history.phrases()
    const musicXml = encodeGeneratedNotesMusicXml(musicXmlInputFromHistory(records))
    const midi = encodeGeneratedNotesMidi(midiInputFromHistory(records, null))

    expect(records).toHaveLength(4)
    expect(musicXml.length).toBeGreaterThan(0)
    expect(midi.length).toBeGreaterThan(0)
    expect(touched).toEqual([])
    expect(cookieWrite).not.toHaveBeenCalled()

    void window.localStorage.length
    expect(touched, 'the storage trap is live').toEqual(['localStorage.length'])
  })
})
