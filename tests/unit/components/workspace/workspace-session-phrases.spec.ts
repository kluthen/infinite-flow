/**
 * A session's phrase steps on their own, over logging fakes: a readied phrase is shown at once and
 * kept; its tempo then queues its backing at that tempo, adds its expected notes at that tempo,
 * gives the display its tempo and schedules its starting to sound at the transport's start for it,
 * in that order. A phrase the engine discards before its tempo is taken back from the display and
 * readied again under the same number. Every step out of order throws before anything changes.
 */
import { describe, expect, it } from 'vitest'

import { createSessionPhrases } from '@/components/workspace/workspace-session-phrases'
import type { SessionPhrase } from '@/session/session-types'
import { phraseOneFor, sessionSettings } from '../../session/session-harness'

const SETTINGS = sessionSettings({ tempo: 90 })

/** Intent: the session phrase `n`, a real phrase generated from its own seed. */
function sessionPhrase(n: number, seed = 100 + n): SessionPhrase {
  const { intent, outcome } = phraseOneFor(SETTINGS, { seed })
  return { phraseNumber: n, origin: 'carry-in', intent, outcome }
}

/** Intent: phrase steps over fakes that log every call, in one list, in call order. */
function phrasesRig() {
  const calls: unknown[][] = []
  const scheduled: { at: number; action: () => void }[] = []
  const phrases = createSessionPhrases({
    audio: {
      queueBacking: (n, harmony, tempo) => calls.push(['queueBacking', n, harmony, tempo]),
      phraseStartsAt: (n) => 10 * n,
    },
    display: {
      phraseReady: (phrase) => calls.push(['display.phraseReady', phrase.phraseNumber]),
      phraseTempo: (n, tempo) => calls.push(['display.phraseTempo', n, tempo]),
      phraseDiscarded: (n) => calls.push(['display.phraseDiscarded', n]),
    },
    midi: {
      phraseReady: (n, timeline, tempo) => calls.push(['midi.phraseReady', n, timeline, tempo]),
    },
    agenda: { schedule: (at, action) => scheduled.push({ at, action }) },
    startedSounding: (n, at) => calls.push(['startedSounding', n, at]),
  })
  return { phrases, calls, scheduled }
}

// @test-link [[service_workspace_session_flow]]
describe('session phrase steps', () => {
  // @test-link [[service_workspace_session_flow]]
  it('shows a phrase at ready and schedules it all at its tempo, in that order', () => {
    const rig = phrasesRig()
    const two = sessionPhrase(2)

    rig.phrases.phraseReady(two)
    expect(rig.calls).toEqual([['display.phraseReady', 2]])

    rig.phrases.phraseTempo(2, 95)
    expect(rig.calls.slice(1)).toEqual([
      ['queueBacking', 2, two.outcome.provenance.harmony.events, 95],
      ['midi.phraseReady', 2, two.outcome.result.timeline, 95],
      ['display.phraseTempo', 2, 95],
    ])
    expect(rig.scheduled.map((entry) => entry.at)).toEqual([20])
    rig.scheduled[0]!.action()
    expect(rig.calls.at(-1)).toEqual(['startedSounding', 2, 20])
  })

  // @test-link [[service_workspace_session_flow]]
  it('keeps several readied phrases until each one tempo schedules it', () => {
    const rig = phrasesRig()
    const [two, three] = [sessionPhrase(2), sessionPhrase(3)]
    rig.phrases.phraseReady(two)
    rig.phrases.phraseReady(three)

    rig.phrases.phraseTempo(2, 90)
    rig.phrases.phraseTempo(3, 95)

    const queued = rig.calls.filter((call) => call[0] === 'queueBacking')
    expect(queued).toEqual([
      ['queueBacking', 2, two.outcome.provenance.harmony.events, 90],
      ['queueBacking', 3, three.outcome.provenance.harmony.events, 95],
    ])
  })

  // @test-link [[service_workspace_session_flow]]
  it('throws on a tempo before its phrase is ready, or out of order, changing nothing', () => {
    const rig = phrasesRig()
    expect(() => rig.phrases.phraseTempo(2, 90)).toThrow(/before it was ready/)
    rig.phrases.phraseReady(sessionPhrase(2))
    expect(() => rig.phrases.phraseTempo(3, 90)).toThrow(/phrase 2's tempo must come next/)
    expect(() => rig.phrases.phraseReady(sessionPhrase(4))).toThrow(/phrase 3 must be readied/)
    expect(rig.calls).toEqual([['display.phraseReady', 2]])
    expect(rig.scheduled).toEqual([])

    rig.phrases.phraseTempo(2, 90)
    expect(() => rig.phrases.phraseTempo(2, 90)).toThrow(/phrase 3's tempo must come next/)
  })

  // @test-link [[service_workspace_session_flow]]
  // @test-link [[rule_session_change_applies_at_phrase_boundary]]
  it('takes a discarded phrase back and readies the same number again, scheduling only the new one', () => {
    const rig = phrasesRig()
    const [two, three, threeAgain] = [sessionPhrase(2), sessionPhrase(3), sessionPhrase(3, 777)]
    rig.phrases.phraseReady(two)
    rig.phrases.phraseTempo(2, 90)
    rig.phrases.phraseReady(three)

    rig.phrases.phraseDiscarded(3)
    rig.phrases.phraseReady(threeAgain)
    rig.phrases.phraseTempo(3, 90)

    expect(rig.calls.filter((call) => String(call[0]).startsWith('display.phrase'))).toEqual([
      ['display.phraseReady', 2],
      ['display.phraseTempo', 2, 90],
      ['display.phraseReady', 3],
      ['display.phraseDiscarded', 3],
      ['display.phraseReady', 3],
      ['display.phraseTempo', 3, 90],
    ])
    expect(rig.calls.filter((call) => call[0] === 'queueBacking')).toEqual([
      ['queueBacking', 2, two.outcome.provenance.harmony.events, 90],
      ['queueBacking', 3, threeAgain.outcome.provenance.harmony.events, 90],
    ])
  })

  // @test-link [[service_workspace_session_flow]]
  it('throws on a discard of a phrase that is not the latest kept one, changing nothing', () => {
    const rig = phrasesRig()
    expect(() => rig.phrases.phraseDiscarded(2)).toThrow(/cannot be discarded/)
    rig.phrases.phraseReady(sessionPhrase(2))
    rig.phrases.phraseReady(sessionPhrase(3))
    expect(() => rig.phrases.phraseDiscarded(2)).toThrow(/cannot be discarded/)
    rig.phrases.phraseTempo(2, 90)
    rig.phrases.phraseTempo(3, 90)
    expect(() => rig.phrases.phraseDiscarded(3)).toThrow(/cannot be discarded/)
    expect(rig.calls.some((call) => call[0] === 'display.phraseDiscarded')).toBe(false)
  })
})
