/**
 * Which session runner outputs announce a phrase replay key: a phrase readied with a carry-in or
 * standalone origin does, a repeat, the Idle phrase and every other output do not; every output is
 * forwarded unchanged either way, after its announcement.
 */
import { describe, expect, it } from 'vitest'

import {
  acceptedSessionPhrase,
  announcingSessionOutputs,
} from '@/components/workspace/phrase-replay-announcement'
import type { GenerationIntent } from '@/domain/generation/generation-intent'
import { decodePhraseReplayKey } from '@/generation-worker/phrase-replay-key-decode'
import type { SessionOutput, SessionPhrase, SessionPhraseOrigin } from '@/session/session-types'
import {
  buildIntent,
  carryInAfter,
  generateSuccess,
} from '../../domain/generation/carry-in/carry-in-fixture'

const PHRASE_ONE_INTENT = buildIntent({ seed: 21, label: 'announce' })
const PHRASE_ONE_OUTCOME = generateSuccess(PHRASE_ONE_INTENT)
const CARRY_IN_INTENT = buildIntent({
  seed: 22,
  label: 'announce',
  carryIn: carryInAfter(PHRASE_ONE_INTENT, PHRASE_ONE_OUTCOME, 1),
})
const STANDALONE_INTENT = buildIntent({ seed: 23, label: 'announce' })

/** Intent: a session phrase record with this number, origin and intent. */
function sessionPhrase(
  phraseNumber: number,
  origin: SessionPhraseOrigin,
  intent: GenerationIntent,
): SessionPhrase {
  return {
    phraseNumber,
    origin,
    intent,
    outcome: PHRASE_ONE_OUTCOME,
    ...(origin === 'repeat' ? { repeatOf: phraseNumber - 1 } : {}),
  }
}

/** Intent: the runner output readying a session phrase with this number, origin and intent. */
function readied(
  phraseNumber: number,
  origin: SessionPhraseOrigin,
  intent: GenerationIntent,
): SessionOutput {
  return { kind: 'phrase-ready', phrase: sessionPhrase(phraseNumber, origin, intent) }
}

/** Intent: run outputs through the announcing wrapper, recording the lines and forwarded outputs. */
function announce(outputs: readonly SessionOutput[]) {
  const lines: string[] = []
  const forwarded: SessionOutput[] = []
  const sink = announcingSessionOutputs(
    (output) => forwarded.push(output),
    (line) => lines.push(line),
  )
  for (const output of outputs) sink(output)
  return { lines, forwarded }
}

// @test-link [[module_phrase_replay_key]]
describe('session phrase replay-key announcement', () => {
  // @test-link [[module_phrase_replay_key]]
  it('names a readied carry-in phrase and a readied standalone phrase as accepted', () => {
    expect(acceptedSessionPhrase(readied(2, 'carry-in', CARRY_IN_INTENT))).toEqual({
      intent: CARRY_IN_INTENT,
      context: { source: 'session', phraseNumber: 2, origin: 'carry-in' },
    })
    expect(acceptedSessionPhrase(readied(5, 'standalone', STANDALONE_INTENT))).toEqual({
      intent: STANDALONE_INTENT,
      context: { source: 'session', phraseNumber: 5, origin: 'standalone' },
    })
  })

  // @test-link [[module_phrase_replay_key]]
  it('names no accepted phrase for a repeat, the Idle phrase or any other output', () => {
    const others: SessionOutput[] = [
      readied(3, 'repeat', CARRY_IN_INTENT),
      readied(1, 'idle', PHRASE_ONE_INTENT),
      {
        kind: 'phrase-sounding',
        at: 1,
        phrase: sessionPhrase(2, 'carry-in', CARRY_IN_INTENT),
        tempo: CARRY_IN_INTENT.controls.tempo,
      },
      {
        kind: 'request-generation',
        attemptId: 1,
        phraseNumber: 2,
        step: 'carry-in',
        retry: 0,
        intent: CARRY_IN_INTENT,
        deadline: 1,
      },
      { kind: 'wake-at', at: 1 },
      { kind: 'struggling-notice', visible: true },
    ]
    for (const output of others) expect(acceptedSessionPhrase(output)).toBeNull()
  })

  // @test-link [[module_phrase_replay_key]]
  it('announces each accepted phrase once, with its context and decodable key, before forwarding it', () => {
    const outputs = [
      readied(2, 'carry-in', CARRY_IN_INTENT),
      readied(4, 'standalone', STANDALONE_INTENT),
    ]

    const { lines, forwarded } = announce(outputs)

    expect(forwarded).toEqual(outputs)
    expect(forwarded[0]).toBe(outputs[0])
    expect(lines).toHaveLength(2)
    expect(lines[0]).toMatch(
      /^\[Infinite Flow\] phrase replay key · session phrase 2 \(carry-in\) · seed1-00000016 · ifk3\./u,
    )
    expect(lines[1]).toMatch(
      /^\[Infinite Flow\] phrase replay key · session phrase 4 \(standalone\) · seed1-00000017 · ifk3\./u,
    )
    const decoded = decodePhraseReplayKey(lines[0]!.split(' · ').at(-1)!)
    expect(decoded.intent).toEqual(CARRY_IN_INTENT)
    expect(decoded.phraseNumber).toBe(2)
  })

  // @test-link [[module_phrase_replay_key]]
  it('forwards a repeat, the Idle phrase and other outputs unchanged without announcing them', () => {
    const outputs: SessionOutput[] = [
      readied(3, 'repeat', CARRY_IN_INTENT),
      readied(1, 'idle', PHRASE_ONE_INTENT),
      { kind: 'wake-at', at: 2 },
    ]

    const { lines, forwarded } = announce(outputs)

    expect(lines).toEqual([])
    expect(forwarded).toEqual(outputs)
  })
})
