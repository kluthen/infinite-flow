/**
 * Shared builders for the session history reproduction and export specs: a real session run
 * through the session runner with the real `generatePhrase` as its generate seam (so every intent
 * is the one the engine built, carry-in included) and recorded into a history, the regeneration
 * of a record from its stored inputs, and the encoder inputs built independently from regenerated
 * phrases, for byte comparison with what the history hands the encoders.
 */

import { expect } from 'vitest'

import { makeGenerationControls } from '@/domain/controls/generation-controls'
import { PHRASE_MEASURE_COUNT } from '@/domain/generation/generation-request'
import { makeSeed } from '@/domain/random/seed'
import { generatePhrase } from '@/domain/generation/orchestration/generation-orchestrator'
import { notationInputFromOutcome } from '@/domain/notation/notation-input'
import { BUILT_IN_INSTRUMENT_CLEF } from '@/domain/profile/instrument-clef'
import { transformToWrittenPhrase } from '@/domain/notation/written-phrase'
import type { InstrumentProfile } from '@/domain/profile/instrument-profile'
import { encodeGeneratedNotesMidi } from '@/export/midi/midi-encoder'
import { encodeGeneratedNotesMusicXml } from '@/export/musicxml/musicxml-encoder'
import {
  createSessionHistory,
  type SessionHistory,
  type SessionHistoryRecord,
} from '@/session/session-history'
import { createSessionRunner } from '@/session/session-runner'
import { measureSeconds } from '@/session/session-timing'
import type { SessionSettings, SessionStart, SuccessfulOutcome } from '@/session/session-types'
import { buildIntent, generateSuccess } from '../domain/generation/carry-in/carry-in-fixture'
import type { MatrixCell } from '../domain/generation/carry-in/carry-in-matrix'
import { SETTINGS_MUTATION_OFF } from '@/session/settings-mutation'
import {
  UNREAD_DISPLAY,
  fakeViewport,
  fixedWallClock,
  queuedProviders,
  type FakeViewport,
} from './session-harness'

/** Intent: the settings a session of one seed-matrix cell starts from. */
export function settingsForCell(cell: MatrixCell): SessionSettings {
  return {
    controls: makeGenerationControls({
      ...cell.set.controls,
      register: cell.register,
      instrumentProfileId: cell.instrumentProfileId,
    }),
    musicalProfile: { musicalProfile: cell.set.musicalProfile, isCustom: true },
  }
}

/**
 * Intent: a real phrase 1 generated at Idle from the settings (with an optional density the Idle
 * window gave it) and a seed.
 */
export function idlePhraseOne(
  settings: SessionSettings,
  seed: number,
  noteDensity = settings.controls.noteDensity,
): SessionStart['phraseOne'] {
  const intent = buildIntent({
    controls: { ...settings.controls, noteDensity },
    musicalProfile: settings.musicalProfile.musicalProfile,
    seed,
    label: 'history-phrase-1',
  })
  return { intent, outcome: generateSuccess(intent) }
}

/** What a recorded session starts from; the viewport defaults to at/above tablet landscape. */
export interface RecordedSessionOptions {
  readonly settings: SessionSettings
  readonly phraseOne: SessionStart['phraseOne']
  /** The first seed the queued seed provider hands out for phrase 2 onward. */
  readonly firstSeed: number
  /** How many phrases start sounding before Stop, phrase 1 included. */
  readonly phraseCount: number
  readonly viewport?: FakeViewport
}

/** Intent: let every settled seam promise run its continuation. */
function settle(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0))
}

/**
 * Intent: run one session through the real session runner, generating with the real
 * `generatePhrase` and fitting every phrase, and record every output into a history. Each phrase
 * starts sounding one phrase after the one before, every generation comes back at once (so no
 * deadline passes and no repeat is inserted), and the session stops once `phraseCount` phrases
 * have sounded. A runner error fails the test.
 */
export async function recordRunnerSession(
  options: RecordedSessionOptions,
): Promise<SessionHistory> {
  const { settings, phraseOne, phraseCount } = options
  const history = createSessionHistory(settings, fixedWallClock, makeSeed(options.firstSeed))
  const errors: unknown[] = []
  const clock = { at: 0 }
  const runner = createSessionRunner(
    {
      generate: (intent) => Promise.resolve(generatePhrase(intent)),
      checkFit: () => Promise.resolve(true),
      now: () => clock.at,
      providers: queuedProviders(options.firstSeed),
      viewport: options.viewport ?? fakeViewport(false),
      display: UNREAD_DISPLAY,
      onOutput: (output) => history.record(output),
      onError: (error) => errors.push(error),
    },
    {
      at: 0,
      settings,
      phraseOne,
      sessionSeed: makeSeed(options.firstSeed),
      mutation: SETTINGS_MUTATION_OFF,
      adaptiveTempo: false,
      multiPhraseTensionArc: false,
    },
  )
  await settle()
  const measure = measureSeconds(settings.controls.tempo)
  const phraseStart = (phraseNumber: number): number =>
    measure * (1 + (phraseNumber - 1) * PHRASE_MEASURE_COUNT)
  clock.at = phraseStart(1)
  runner.dispatch({ kind: 'count-in-over', at: clock.at })
  for (let phraseNumber = 2; phraseNumber <= phraseCount; phraseNumber++) {
    clock.at = phraseStart(phraseNumber)
    runner.dispatch({ kind: 'phrase-started-sounding', at: clock.at, phraseNumber })
    await settle()
  }
  clock.at = phraseStart(phraseCount + 1)
  runner.dispatch({ kind: 'end', at: clock.at, cause: 'stop' })
  expect(errors).toEqual([])
  expect(history.phraseCount).toBe(phraseCount)
  return history
}

/** Intent: the phrase regenerated from a record's stored inputs, which must succeed. */
export function regenerate(record: SessionHistoryRecord): SuccessfulOutcome {
  const outcome = generatePhrase(record.intent)
  if (outcome.kind !== 'generation_success')
    throw new Error(`Phrase ${record.phraseNumber} did not regenerate: ${outcome.code}.`)
  return outcome
}

/**
 * Intent: the MusicXML of regenerated phrases, built without the history's adapter: numbered 1,
 * 2, 3 ... in order, each written from its regenerated outcome and stored intent, at the stored
 * tempo, for the given instrument.
 */
export function regeneratedMusicXml(
  records: readonly SessionHistoryRecord[],
  regenerated: readonly SuccessfulOutcome[],
  instrument: InstrumentProfile,
): string {
  return encodeGeneratedNotesMusicXml({
    instrument,
    phrases: records.map((record, position) => ({
      number: position + 1,
      writtenPhrase: transformToWrittenPhrase(
        notationInputFromOutcome(regenerated[position]!, record.intent, BUILT_IN_INSTRUMENT_CLEF),
      ),
      tempo: record.tempo,
    })),
  })
}

/**
 * Intent: the MIDI file of regenerated phrases, built without the history's adapter: numbered 1,
 * 2, 3 ... in order, each with its regenerated timeline at the stored tempo, without backing.
 */
export function regeneratedMidi(
  records: readonly SessionHistoryRecord[],
  regenerated: readonly SuccessfulOutcome[],
): Uint8Array {
  return encodeGeneratedNotesMidi({
    phrases: records.map((record, position) => ({
      number: position + 1,
      timeline: regenerated[position]!.result.timeline,
      tempo: record.tempo,
    })),
    backing: null,
  })
}
