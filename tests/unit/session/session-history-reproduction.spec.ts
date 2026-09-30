/**
 * Reproducing a recorded session from the history's stored inputs. Over the seed matrix with
 * carry-in, each cell runs a real session of five phrases through the session runner with the
 * real generator, so every stored intent is the one the engine built, carry-in included. Every
 * record regenerates to the timeline it stored, and encoding the recorded session to MusicXML
 * and MIDI gives the same bytes as encoding the regenerated phrases, for each of the three
 * instrument templates. A phrase generated with Eighth after a step-down regenerates the same way.
 */

import { describe, expect, it } from 'vitest'

import type { InstrumentProfile } from '@/domain/profile/instrument-profile'
import {
  BB_TENOR_PROFILE,
  C_KEYBOARD_PROFILE,
  EB_ALTO_PROFILE,
  type InstrumentProfileId,
} from '@/domain/profile/instrument-profiles'
import { encodeGeneratedNotesMidi } from '@/export/midi/midi-encoder'
import { encodeGeneratedNotesMusicXml } from '@/export/musicxml/musicxml-encoder'
import type { SessionHistoryRecord } from '@/session/session-history'
import { midiInputFromHistory, musicXmlInputFromHistory } from '@/session/session-history-export'
import type { SuccessfulOutcome } from '@/session/session-types'
import {
  INSTRUMENT_PROFILE_IDS,
  buildMatrix,
  type MatrixCell,
} from '../domain/generation/carry-in/carry-in-matrix'
import {
  idlePhraseOne,
  recordRunnerSession,
  regenerate,
  regeneratedMidi,
  regeneratedMusicXml,
  settingsForCell,
} from './history-recording'
import { fakeViewport, sessionSettings } from './session-harness'

/** Phrases per recorded session: phrase 1, then four generated with carry-in. */
const PHRASE_COUNT = 5

const MATRIX = buildMatrix()

/** The instrument template each profile id stands for. */
const TEMPLATES: Readonly<Record<InstrumentProfileId, InstrumentProfile>> = {
  'c-keyboard': C_KEYBOARD_PROFILE,
  'bb-tenor': BB_TENOR_PROFILE,
  'eb-alto': EB_ALTO_PROFILE,
}

/** A recorded session of one cell and each record's phrase regenerated from its stored inputs. */
interface ReproducedSession {
  readonly records: readonly SessionHistoryRecord[]
  readonly regenerated: readonly SuccessfulOutcome[]
}

const reproduced = new Map<string, Promise<ReproducedSession>>()

/**
 * Intent: record one cell's session (phrase 1 from the cell's seed, later seeds queued from
 * 1000 above it) and regenerate every record; run once per cell and shared by the specs below.
 */
function reproducedSession(cell: MatrixCell): Promise<ReproducedSession> {
  const cached = reproduced.get(cell.label)
  if (cached !== undefined) return cached
  const settings = settingsForCell(cell)
  const session = recordRunnerSession({
    settings,
    phraseOne: idlePhraseOne(settings, cell.seed),
    firstSeed: cell.seed + 1000,
    phraseCount: PHRASE_COUNT,
  }).then((history) => {
    const records = history.phrases()
    return { records, regenerated: records.map(regenerate) }
  })
  reproduced.set(cell.label, session)
  return session
}

// @test-link [[rule_session_history_keeps_timeline_and_inputs]]
// @test-link [[rule_seeded_phrase_reproduction]]
describe('reproducing a recorded session over the seed matrix with carry-in', () => {
  // @test-link [[rule_seeded_phrase_reproduction]]
  it.each(MATRIX.map((cell) => ({ cell, label: cell.label })))(
    '$label: every recorded phrase regenerates to the timeline it stored',
    async ({ cell }) => {
      const { records, regenerated } = await reproducedSession(cell)

      expect(records.map((record) => record.phraseNumber)).toEqual([1, 2, 3, 4, 5])
      records.forEach((record, position) => {
        expect(record.isRepeat).toBe(false)
        expect(regenerated[position]!.result.timeline).toEqual(record.outcome.result.timeline)
        expect(regenerated[position]!.provenance.harmony).toEqual(record.outcome.provenance.harmony)
      })
    },
  )

  // @test-link [[rule_session_history_keeps_timeline_and_inputs]]
  it('stores the carry-in of every phrase after phrase 1 across the matrix', async () => {
    const afterPhraseOne = Array.from({ length: PHRASE_COUNT }, (_, position) => position > 0)
    for (const cell of MATRIX) {
      const { records } = await reproducedSession(cell)
      const carried = records.map((record) => record.intent.carryIn !== undefined)
      expect(carried, cell.label).toEqual(afterPhraseOne)
    }
  })
})

// @test-link [[rule_session_history_keeps_timeline_and_inputs]]
// @test-link [[rule_seeded_phrase_reproduction]]
describe('encoding a recorded session', () => {
  // @test-link [[rule_seeded_phrase_reproduction]]
  it.each(INSTRUMENT_PROFILE_IDS)(
    '%s: the recorded session and the regenerated phrases encode to the same bytes',
    async (instrumentProfileId) => {
      const cells = MATRIX.filter((cell) => cell.instrumentProfileId === instrumentProfileId)
      const template = TEMPLATES[instrumentProfileId]
      for (const cell of cells) {
        const { records, regenerated } = await reproducedSession(cell)

        const musicXml = encodeGeneratedNotesMusicXml(musicXmlInputFromHistory(records))
        const midi = encodeGeneratedNotesMidi(midiInputFromHistory(records, null))

        expect(musicXml, cell.label).toBe(regeneratedMusicXml(records, regenerated, template))
        expect(midi, cell.label).toEqual(regeneratedMidi(records, regenerated))
      }
    },
  )
})

// @test-link [[rule_session_density_only_steps_down]]
// @test-link [[rule_seeded_phrase_reproduction]]
describe('a recorded phrase generated with Eighth after a step-down', () => {
  // @test-link [[rule_session_density_only_steps_down]]
  it('regenerates from its stored Eighth intent to the timeline it stored', async () => {
    const settings = sessionSettings({ noteDensity: 'Sixteenth' })
    const history = await recordRunnerSession({
      settings,
      phraseOne: idlePhraseOne(settings, 11, 'Eighth'),
      firstSeed: 5000,
      phraseCount: 4,
      viewport: fakeViewport(true),
    })
    const records = history.phrases()

    expect(settings.controls.noteDensity).toBe('Sixteenth')
    for (const record of records) {
      expect(record.intent.controls.noteDensity).toBe('Eighth')
      expect(regenerate(record).result.timeline).toEqual(record.outcome.result.timeline)
    }
  })
})
