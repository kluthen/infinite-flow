// @vitest-environment node
/**
 * Headless phrase replay: a replayed key reproduces the phrase generation and the worker message
 * handler produce for the same intent (with and without a carry-in), its report is complete and
 * readable (every intent field, four 1-based bars, every event with concert and written pitch),
 * the carry-out matches the session's derivation, and key input is read strictly.
 */

import { describe, expect, it } from 'vitest'

import type { GenerationControls, MusicalProfile } from '@/domain/controls/generation-controls'
import { deriveCarryIn } from '@/domain/generation/carry-in/carry-in-derivation'
import type { GenerationIntent } from '@/domain/generation/generation-intent'
import { generatePhrase } from '@/domain/generation/orchestration/generation-orchestrator'
import type { GenerationOutcome } from '@/domain/generation/orchestration/orchestration-types'
import { handleGenerationWorkerMessage } from '@/generation-worker/generation-worker-handler'
import { encodePhraseReplayKey, PhraseReplayKeyError } from '@/generation-worker/phrase-replay-key'
import {
  extractPhraseReplayKey,
  replayDecodedPhraseKey,
  replayPhraseKey,
} from '@/generation-worker/phrase-replay'
import {
  buildPhraseReplayReport,
  type PhraseReplayReport,
  type PhraseReplaySuccessOutput,
} from '@/generation-worker/phrase-replay-report'
import { decodePhraseReplayKey } from '@/generation-worker/phrase-replay-key-decode'
import {
  buildIntent,
  carryInAfter,
  generateSuccess,
  keyChangeIntent,
} from '../domain/generation/carry-in/carry-in-fixture'

/** Generous per-test timeout: each case generates the same phrase three times. */
const TIMEOUT_MS = 120_000

/** The generation-intent fields the report's input must hold verbatim. */
const INTENT_FIELDS = [
  'requestId',
  'seed',
  'measureCount',
  'meter',
  'controls',
  'writtenTonalCenter',
  'musicalProfile',
  'instrumentProfile',
  'registerIntent',
  'carryIn',
] as const

/** A control setting replayed over the seed sample. */
interface ReplaySetting {
  readonly label: string
  readonly controls: Partial<GenerationControls>
  readonly musicalProfile?: MusicalProfile
  /** The sample is known to tie notes, so the tie restatement is exercised. */
  readonly expectsTies?: boolean
}

/** Control settings covering tonal centers, transposing profiles, Jazz and Varying register. */
const SETTINGS: readonly ReplaySetting[] = [
  { label: 'keyboard-c', controls: {} },
  { label: 'tenor-f', controls: { instrumentProfileId: 'bb-tenor', tonalCenter: 'F' } },
  {
    label: 'alto-jazz-varying',
    controls: { instrumentProfileId: 'eb-alto', tonalCenter: 'A', register: 'Varying' },
    musicalProfile: 'Jazz',
  },
  { label: 'keyboard-eb-minor', controls: { tonalCenter: 'D#', collection: 'Minor' } },
  {
    label: 'tenor-eighths-offbeats',
    controls: {
      instrumentProfileId: 'bb-tenor',
      tonalCenter: 'G',
      noteDensity: 'Eighth',
      silenceDensity: 'Conversational',
      syncopation: 'Occasional offbeats',
      tension: 'Lift',
    },
    expectsTies: true,
  },
]

/** The seed sample every setting is replayed over. */
const SEEDS = [1, 2, 3, 5, 8, 13, 21, 42] as const

/** Intent: the intent of one setting and seed. */
function settingIntent(setting: ReplaySetting, seed: number): GenerationIntent {
  return buildIntent({
    controls: setting.controls,
    ...(setting.musicalProfile === undefined ? {} : { musicalProfile: setting.musicalProfile }),
    seed,
    label: setting.label,
  })
}

/** Intent: the outcome the worker message handler answers for a JSON-cloned generate request. */
function handlerOutcome(intent: GenerationIntent): GenerationOutcome {
  const response = handleGenerationWorkerMessage(
    JSON.parse(JSON.stringify({ type: 'generate', id: 1, intent })),
  )
  if (response.type !== 'outcome') throw new Error(`Worker crashed: ${response.message}`)
  return response.outcome
}

/** Intent: assert a report's raw outcome equals direct generation and the worker handler's. */
function expectReplayEqualsGeneration(report: PhraseReplayReport, intent: GenerationIntent): void {
  if (report.output.kind === 'crash') throw new Error(`Replay crashed: ${report.output.message}`)
  const raw = JSON.stringify(report.output.raw)
  expect(raw).toBe(JSON.stringify(generatePhrase(intent)))
  expect(raw).toBe(JSON.stringify(handlerOutcome(intent)))
}

/** Intent: the success output of a report, failing the test loudly otherwise. */
function successOf(report: PhraseReplayReport): PhraseReplaySuccessOutput {
  if (report.output.kind !== 'generation_success')
    throw new Error(`Expected a successful replay, got ${report.output.kind}.`)
  return report.output
}

/** Intent: assert the input section holds every intent field verbatim plus the envelope. */
function expectCompleteInput(report: PhraseReplayReport, intent: GenerationIntent): void {
  for (const field of INTENT_FIELDS) {
    expect(report.input).toHaveProperty(field)
    expect(JSON.stringify(report.input[field])).toBe(JSON.stringify(intent[field] ?? null))
  }
  expect(report.input.seedCode).toMatch(/^seed1-[0-9a-f]{8}$/u)
  expect(report.input.workerRequest).toEqual({ type: 'generate', id: 1, intent })
}

/** Intent: assert the bars restate the timeline, harmony and notation completely. */
function expectCompleteBars(output: PhraseReplaySuccessOutput, intent: GenerationIntent): void {
  if (output.raw.kind !== 'generation_success') throw new Error('Expected a raw success outcome.')
  const { timeline } = output.raw.result
  expect(output.bars.map((bar) => bar.bar)).toEqual([1, 2, 3, 4])
  const chordCount = output.bars.reduce((sum, bar) => sum + bar.chords.length, 0)
  expect(chordCount).toBe(output.provenance.harmony.events.length)
  output.bars.forEach((bar, index) => {
    expect(bar.events).toHaveLength(timeline.measures[index]!.events.length)
    expect(bar.events.reduce((sum, event) => sum + event.duration.beats, 0)).toBe(4)
    bar.events.forEach((event, eventIndex) => {
      const previous = bar.events[eventIndex - 1]
      expect(event.index).toBe(eventIndex)
      expect(event.onsetBeat).toBe(
        previous === undefined ? 1 : previous.onsetBeat + previous.duration.beats,
      )
    })
    for (const event of bar.events) {
      if (event.kind !== 'note') continue
      expect(event.concert.name).toMatch(/^[A-G]/u)
      expect(event.written.name).toMatch(/^[A-G]/u)
      expect(event.written.midi - event.concert.midi).toBe(
        intent.instrumentProfile.transposition.chromatic,
      )
    }
  })
}

/** Intent: assert every tie flag pairs a note with a same-pitch continuation right after it. */
function expectConsistentTies(output: PhraseReplaySuccessOutput): number {
  const events = output.bars.flatMap((bar) => bar.events)
  let ties = 0
  events.forEach((event, index) => {
    const next = events[index + 1]
    const nextContinues = next?.kind === 'note' && next.tieContinuation
    if (event.kind !== 'note') return expect(nextContinues).toBe(false)
    expect(event.tiesIntoNext).toBe(nextContinues)
    if (next?.kind === 'note' && nextContinues) {
      expect(next.concert.midi).toBe(event.concert.midi)
      ties += 1
    }
  })
  return ties
}

describe('replayPhraseKey reproduces generation', () => {
  for (const setting of SETTINGS) {
    // @test-link [[service_headless_phrase_replay]]
    it(
      `replays ${setting.label} identically to generatePhrase and the worker handler`,
      () => {
        let ties = 0
        for (const seed of SEEDS) {
          const intent = settingIntent(setting, seed)
          const report = replayPhraseKey(encodePhraseReplayKey(intent, 1))
          expectReplayEqualsGeneration(report, intent)
          expectCompleteInput(report, intent)
          const output = successOf(report)
          expectCompleteBars(output, intent)
          ties += expectConsistentTies(output)
        }
        if (setting.expectsTies === true) expect(ties).toBeGreaterThan(0)
      },
      TIMEOUT_MS,
    )
  }

  // @test-link [[service_headless_phrase_replay]]
  // @test-link [[module_phrase_replay_key]]
  it(
    'replays a carry-in phrase identically and derives its carry-out with the key phrase number',
    () => {
      for (const seed of SEEDS.slice(0, 4)) {
        const first = settingIntent(SETTINGS[1]!, seed)
        const carryIn = carryInAfter(first, generateSuccess(first), 1)
        const second = buildIntent({ ...SETTINGS[1], seed: seed + 100, carryIn, label: 'second' })
        const report = replayPhraseKey(encodePhraseReplayKey(second, 2))
        expectReplayEqualsGeneration(report, second)
        expectCompleteInput(report, second)
        expect(report.phraseNumber).toBe(2)
        expect(report.input.carryInNames?.phraseNumber).toBe(1)
        const output = successOf(report)
        const outcome = generateSuccess(second)
        const expected = deriveCarryIn({ intent: second, outcome, phraseNumber: 2 })
        expect(JSON.stringify(output.carryOut?.carryIn)).toBe(JSON.stringify(expected))
        expect(output.carryOutAbsentReason).toBeNull()
        expect(output.request.carryIn).toEqual(carryIn)
      }
    },
    TIMEOUT_MS,
  )

  // @test-link [[rule_key_change_drops_harmonic_carry_in]]
  // @test-link [[module_phrase_replay_key]]
  it(
    'replays a phrase whose carry-in dropped its harmony after a key change identically',
    () => {
      for (const seed of [12, 13]) {
        const intent = keyChangeIntent(seed, 'replay-key-change')
        const report = replayPhraseKey(encodePhraseReplayKey(intent, 2))
        expectReplayEqualsGeneration(report, intent)
        expectCompleteInput(report, intent)
        expect(report.input.carryInNames?.finalChord).toBeNull()
        expect(successOf(report).request.carryIn).toEqual(intent.carryIn)
      }
    },
    TIMEOUT_MS,
  )

  // @test-link [[service_headless_phrase_replay]]
  it(
    'prints the same JSON when the same key is replayed twice',
    () => {
      const key = encodePhraseReplayKey(settingIntent(SETTINGS[2]!, 7), 1)
      expect(JSON.stringify(replayPhraseKey(key))).toBe(JSON.stringify(replayPhraseKey(key)))
    },
    TIMEOUT_MS,
  )
})

describe('the replay report', () => {
  // @test-link [[service_headless_phrase_replay]]
  it(
    'names the ending, the harmony and the resolved request',
    () => {
      const intent = settingIntent(SETTINGS[1]!, 42)
      const report = replayPhraseKey(encodePhraseReplayKey(intent, 1))
      const output = successOf(report)
      const { harmony } = output.provenance
      expect(output.harmony.templateId).toBe(harmony.templateId)
      expect(output.harmony.endpointClass).toBe(harmony.endpoint.kind)
      expect(output.ending.endpointClass).toBe(harmony.endpoint.kind)
      expect(output.ending.finalChord.degree).toBe(harmony.events.at(-1)!.triad.degree)
      expect(output.ending.lastSoundingNote?.concert.midi).toBe(
        output.carryOut?.carryIn.lastPitch.midi,
      )
      expect(output.request.registerWindowNames.minMidi).toBe(output.request.registerWindow.minMidi)
      expect(report.input.tonalCenters.written.pitchClass).toBe('F')
      expect(report.input.tonalCenters.concert.pitchClass).toBe(intent.controls.tonalCenter)
    },
    TIMEOUT_MS,
  )

  // @test-link [[service_headless_phrase_replay]]
  it('reports a worker crash with its name and message', () => {
    const intent = settingIntent(SETTINGS[0]!, 1)
    const key = encodePhraseReplayKey(intent, 1)
    const report = buildPhraseReplayReport(
      key,
      decodePhraseReplayKey(key),
      { type: 'generate', id: 1, intent },
      { type: 'crash', id: 1, name: 'RangeError', message: 'boom' },
    )
    expect(report.output).toEqual({ kind: 'crash', id: 1, name: 'RangeError', message: 'boom' })
    expect(report.input.requestId).toBe(intent.requestId)
  })
})

describe('reading a key', () => {
  const key = encodePhraseReplayKey(settingIntent(SETTINGS[0]!, 42), 1)

  // @test-link [[service_headless_phrase_replay]]
  // @test-link [[module_phrase_replay_key]]
  it('extracts a bare key and the key of a whole console line', () => {
    expect(extractPhraseReplayKey(key)).toBe(key)
    expect(extractPhraseReplayKey(`  ${key}\n`)).toBe(key)
    const line = `[Infinite Flow] phrase replay key · workspace phrase · seed1-0000002a · ${key}`
    expect(extractPhraseReplayKey(line)).toBe(key)
  })

  // @test-link [[service_headless_phrase_replay]]
  // @test-link [[module_phrase_replay_key]]
  it('rejects a text holding no key or several keys', () => {
    expect(() => extractPhraseReplayKey('no key here')).toThrow(PhraseReplayKeyError)
    expect(() => extractPhraseReplayKey(`${key} ${key}`)).toThrow(PhraseReplayKeyError)
  })

  // @test-link [[service_headless_phrase_replay]]
  // @test-link [[module_phrase_replay_key]]
  it('rejects a malformed or unsupported key with a typed error before generating', () => {
    expect(() => replayPhraseKey('ifk1.!!')).toThrow(PhraseReplayKeyError)
    expect(() => replayPhraseKey('ifk1.AAAA')).toThrow(PhraseReplayKeyError)
    expect(() => replayPhraseKey('ifk2.AAAA')).toThrow(/unsupported key version/u)
    expect(() => replayDecodedPhraseKey(key, decodePhraseReplayKey(key))).not.toThrow()
  })
})
