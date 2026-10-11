/**
 * The generated-notes export file built from a session history: the MusicXML and MIDI bytes are
 * exactly the encoders' output for the history's adapters, a second build gives the same bytes,
 * the MIDI backing track goes in only when asked for and holds the backing renderer's notes, no
 * played note ever reaches either file, and the file name carries the session's local start.
 */

import { beforeAll, describe, expect, it } from 'vitest'

import { makeConcertPitch } from '@/domain/events/concert-pitch'
import { renderBacking } from '@/domain/backing/backing-renderer'
import { FOUR_FOUR_METER } from '@/domain/generation/generation-request'
import type { InstrumentProfileId } from '@/domain/profile/instrument-profiles'
import {
  GeneratedNotesFileError,
  backingForExport,
  buildGeneratedNotesFile,
  generatedNotesFileName,
  type GeneratedNotesRequest,
} from '@/export/generated-notes-file'
import { encodeGeneratedNotesMidi } from '@/export/midi/midi-encoder'
import { encodeGeneratedNotesMusicXml } from '@/export/musicxml/musicxml-encoder'
import {
  createSessionHistory,
  type SessionHistory,
  type SessionHistoryRecord,
} from '@/session/session-history'
import {
  SessionHistoryExportError,
  midiInputFromHistory,
  musicXmlInputFromHistory,
} from '@/session/session-history-export'
import type { SessionOutput } from '@/session/session-types'
import { idlePhraseOne, recordRunnerSession } from '../session/history-recording'
import {
  DEFAULT_SESSION_SEED,
  SESSION_START_EPOCH_MS,
  SessionDriver,
  fixedWallClock,
  phraseOneFor,
  sessionSettings,
} from '../session/session-harness'
import { notesOf, readSmf } from './midi/smf-reader'

/** Every request the player can make: both formats, both backing settings. */
const EVERY_REQUEST: readonly GeneratedNotesRequest[] = [
  { format: 'musicxml', backingTrack: false },
  { format: 'musicxml', backingTrack: true },
  { format: 'midi', backingTrack: false },
  { format: 'midi', backingTrack: true },
]

/** MIDI ticks in a whole note (four quarter notes at 960 each) and in a four-measure phrase. */
const TICKS_PER_WHOLE_NOTE = 3840
const TICKS_PER_PHRASE = 4 * TICKS_PER_WHOLE_NOTE

/** Intent: a real session of `phraseCount` phrases recorded through the session runner. */
function recordedSession(
  instrumentProfileId: InstrumentProfileId,
  seed: number,
  phraseCount: number,
  tempo = 120,
): Promise<SessionHistory> {
  const settings = sessionSettings({ tempo, instrumentProfileId })
  return recordRunnerSession({
    settings,
    phraseOne: idlePhraseOne(settings, seed),
    firstSeed: seed * 100,
    phraseCount,
  })
}

/** Intent: a backing note's tick span in the file, from its phrase's position and its own times. */
function expectedBackingNotes(records: readonly SessionHistoryRecord[]) {
  return records.flatMap((record, position) => {
    const { bass, chords } = renderBacking(
      record.outcome.provenance.harmony.events,
      FOUR_FOUR_METER,
    )
    return [...bass, ...chords].map((note) => {
      const startTick =
        position * TICKS_PER_PHRASE +
        (note.start.numerator / note.start.denominator) * TICKS_PER_WHOLE_NOTE
      const length = (note.duration.numerator / note.duration.denominator) * TICKS_PER_WHOLE_NOTE
      return { pitch: note.pitch as number, startTick, endTick: startTick + length }
    })
  })
}

/** Intent: a list of tick spans in one canonical order, for comparing as sets. */
function sortedSpans(spans: readonly { pitch: number; startTick: number; endTick: number }[]) {
  return [...spans].sort(
    (a, b) => a.startTick - b.startTick || a.pitch - b.pitch || a.endTick - b.endTick,
  )
}

// @test-link [[req_session_export]]
describe('buildGeneratedNotesFile on a recorded session', () => {
  let history: SessionHistory
  let records: readonly SessionHistoryRecord[]

  beforeAll(async () => {
    history = await recordedSession('bb-tenor', 31, 4)
    records = history.phrases()
  })

  // @test-link [[rule_generated_notes_musicxml_export]]
  it("writes the MusicXML encoder's output for the history's adapter, as UTF-8", () => {
    const file = buildGeneratedNotesFile(history, { format: 'musicxml', backingTrack: false })

    const expected = encodeGeneratedNotesMusicXml(musicXmlInputFromHistory(records))
    expect(file.mimeType).toBe('application/vnd.recordare.musicxml+xml')
    expect(file.fileName).toMatch(/^infinite-flow-\d{4}-\d{2}-\d{2}-\d{6}-generated\.musicxml$/u)
    expect(file.bytes).toEqual(new TextEncoder().encode(expected))
    expect(new TextDecoder().decode(file.bytes)).toBe(expected)
  })

  // @test-link [[rule_generated_notes_musicxml_export]]
  it('ignores the backing-track choice for MusicXML', () => {
    const off = buildGeneratedNotesFile(history, { format: 'musicxml', backingTrack: false })
    const on = buildGeneratedNotesFile(history, { format: 'musicxml', backingTrack: true })

    expect(on).toEqual(off)
  })

  // @test-link [[rule_generated_notes_midi_export]]
  it("writes the MIDI encoder's output without backing: two tracks, backing off", () => {
    const file = buildGeneratedNotesFile(history, { format: 'midi', backingTrack: false })

    expect(file.mimeType).toBe('audio/midi')
    expect(file.fileName).toMatch(/^infinite-flow-\d{4}-\d{2}-\d{2}-\d{6}-generated\.mid$/u)
    expect(file.bytes).toEqual(encodeGeneratedNotesMidi(midiInputFromHistory(records, null)))
    expect(readSmf(file.bytes).tracks).toHaveLength(2)
  })

  // @test-link [[rule_generated_notes_midi_export]]
  it("adds a third track holding renderBacking's notes, phrase by phrase, when asked for", () => {
    const file = buildGeneratedNotesFile(history, { format: 'midi', backingTrack: true })

    const smf = readSmf(file.bytes)
    expect(smf.tracks).toHaveLength(3)
    expect(file.bytes).toEqual(
      encodeGeneratedNotesMidi(midiInputFromHistory(records, backingForExport(records))),
    )
    const backing = notesOf(smf.tracks[2]!)
    expect(backing.every((note) => note.channel === 1)).toBe(true)
    expect(
      sortedSpans(backing.map(({ pitch, startTick, endTick }) => ({ pitch, startTick, endTick }))),
    ).toEqual(sortedSpans(expectedBackingNotes(records)))
  })

  // @test-link [[req_session_export]]
  it('gives identical bytes when the same file is built a second time', () => {
    for (const request of EVERY_REQUEST) {
      const first = buildGeneratedNotesFile(history, request)
      const second = buildGeneratedNotesFile(history, request)
      expect(second, `${request.format}, backing ${request.backingTrack}`).toEqual(first)
    }
  })

  // @test-link [[req_session_export]]
  it("lets the history adapters' typed error through for an empty history", () => {
    const empty = { phrases: () => [], startedAt: SESSION_START_EPOCH_MS }

    for (const request of EVERY_REQUEST) {
      expect(() => buildGeneratedNotesFile(empty, request)).toThrow(SessionHistoryExportError)
    }
  })
})

// @test-link [[rule_generated_notes_midi_export]]
describe('the backing track of recorded sessions', () => {
  // @test-link [[rule_generated_notes_midi_export]]
  it.each<[InstrumentProfileId, number]>([
    ['c-keyboard', 41],
    ['bb-tenor', 42],
    ['eb-alto', 43],
  ])(
    'passes the encoder check (no same-pitch overlap) over an eight-phrase %s session',
    async (instrumentProfileId, seed) => {
      const history = await recordedSession(instrumentProfileId, seed, 8, 200)

      const file = buildGeneratedNotesFile(history, { format: 'midi', backingTrack: true })

      expect(notesOf(readSmf(file.bytes).tracks[2]!)).toHaveLength(
        expectedBackingNotes(history.phrases()).length,
      )
    },
  )
})

/** Played notes at fixed onsets, one or more inside every phrase of the three-phrase session. */
const PLAYED_ONSETS: readonly number[] = [1.25, 2.5, 5.1, 6, 9.2]

/**
 * Intent: a real three-phrase session at 240 BPM (a 1 s measure: phrase 1 from 1 s, phrase 2 from
 * 5 s, phrase 3 from 9 s, Stop at 10 s), its outputs fed in order into a fresh history, with the
 * given played notes recorded before the end.
 */
function historyOfDriver(
  outputs: readonly SessionOutput[],
  driver: SessionDriver,
  playedOnsets: readonly number[],
): SessionHistory {
  const history = createSessionHistory(driver.settings, fixedWallClock, DEFAULT_SESSION_SEED)
  for (const output of outputs) {
    if (output.kind === 'ended') {
      playedOnsets.forEach((onsetAt, index) =>
        history.recordPlayedNote({
          pitch: makeConcertPitch(60 + index),
          velocity: 90,
          onsetAt,
          releaseAt: onsetAt + 0.4,
        }),
      )
    }
    history.record(output)
  }
  return history
}

/** Intent: the outputs of a three-phrase session at 240 BPM, each phrase accepted in time. */
function threePhraseDriver(): SessionDriver {
  const settings = sessionSettings({ tempo: 240, instrumentProfileId: 'eb-alto' })
  const driver = new SessionDriver({ at: 0, settings, phraseOne: phraseOneFor(settings) })
  driver.accept(0.5)
  driver.countInOver(1)
  driver.sounding(5, 2)
  driver.accept(5.5)
  driver.sounding(9, 3)
  driver.end(10)
  return driver
}

// @test-link [[rule_optional_midi_privacy]]
// @test-link [[req_session_export]]
describe('played notes in the generated-notes file', () => {
  // @test-link [[rule_optional_midi_privacy]]
  // @test-link [[req_session_export]]
  it('never travel: every format and backing setting gives the bytes of the same session without them', () => {
    const driver = threePhraseDriver()
    const withPlayed = historyOfDriver(driver.log, driver, PLAYED_ONSETS)
    const without = historyOfDriver(driver.log, driver, [])
    expect(withPlayed.phrases().map((record) => record.playedNotes.length)).toEqual([2, 2, 1])
    expect(without.phrases().every((record) => record.playedNotes.length === 0)).toBe(true)

    for (const request of EVERY_REQUEST) {
      expect(
        buildGeneratedNotesFile(withPlayed, request),
        `${request.format}, backing ${request.backingTrack}`,
      ).toEqual(buildGeneratedNotesFile(without, request))
    }
  })
})

// @test-link [[req_session_export]]
describe('generatedNotesFileName', () => {
  // @test-link [[req_session_export]]
  it("names both formats from the session's start in local time", () => {
    const start = new Date(2026, 9, 2, 18, 47, 31, 900).getTime()

    expect(generatedNotesFileName(start, 'musicxml')).toBe(
      'infinite-flow-2026-10-02-184731-generated.musicxml',
    )
    expect(generatedNotesFileName(start, 'midi')).toBe(
      'infinite-flow-2026-10-02-184731-generated.mid',
    )
  })

  // @test-link [[req_session_export]]
  it.each([
    [
      'Asia/Kathmandu',
      Date.UTC(2026, 8, 30, 12, 0, 0),
      'infinite-flow-2026-09-30-174500-generated',
    ],
    [
      'Pacific/Honolulu',
      Date.UTC(2026, 0, 1, 5, 4, 3),
      'infinite-flow-2025-12-31-190403-generated',
    ],
  ])('names a fixed epoch in the %s time zone by its local date and time', (zone, epoch, stem) => {
    const previous = process.env.TZ
    process.env.TZ = zone
    try {
      expect(generatedNotesFileName(epoch, 'musicxml')).toBe(`${stem}.musicxml`)
      expect(generatedNotesFileName(epoch, 'midi')).toBe(`${stem}.mid`)
    } finally {
      if (previous === undefined) delete process.env.TZ
      else process.env.TZ = previous
    }
  })

  // @test-link [[req_session_export]]
  it('zero-pads the month, day, hours, minutes and seconds', () => {
    const start = new Date(2027, 0, 5, 7, 3, 9).getTime()

    expect(generatedNotesFileName(start, 'midi')).toBe(
      'infinite-flow-2027-01-05-070309-generated.mid',
    )
    expect(generatedNotesFileName(new Date(2027, 0, 1, 0, 0, 0).getTime(), 'musicxml')).toBe(
      'infinite-flow-2027-01-01-000000-generated.musicxml',
    )
  })

  // @test-link [[req_session_export]]
  it("uses the history's recorded start, not the time of the export", () => {
    const history = {
      phrases: () => threeRecords(),
      startedAt: new Date(2026, 8, 30, 9, 5, 0).getTime(),
    }

    expect(buildGeneratedNotesFile(history, { format: 'midi', backingTrack: false }).fileName).toBe(
      'infinite-flow-2026-09-30-090500-generated.mid',
    )
  })

  // @test-link [[req_session_export]]
  it('refuses a start time that is not finite epoch milliseconds', () => {
    expect(() => generatedNotesFileName(Number.NaN, 'midi')).toThrow(GeneratedNotesFileError)
    expect(() => generatedNotesFileName(Number.POSITIVE_INFINITY, 'musicxml')).toThrow(
      GeneratedNotesFileError,
    )
  })
})

/** Intent: the records of the three-phrase session, without played notes. */
function threeRecords(): readonly SessionHistoryRecord[] {
  const driver = threePhraseDriver()
  return historyOfDriver(driver.log, driver, []).phrases()
}
