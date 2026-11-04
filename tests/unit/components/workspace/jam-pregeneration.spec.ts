/**
 * Jam mode's own pre-generation queue (jam-pregeneration.ts), an instance apart from session
 * mode's: it prepares phrases 2 to 5 only while Jam mode shows with a doodle kept and its phrase 1
 * written and shown, nothing running or failed on it, no session running, no review and no
 * rotate-device notice; its attempts carry the kept doodle's steering block and are planned from
 * the start a Jam on the kept doodle takes, so a session started with the same block accepts its
 * phrases and one without refuses them; what that phrase 1 is written from (a Jam setting but the
 * tempo, the instrument), a new doodle, the doodle let go and a new phrase 1 discard them, the
 * tempo and a window crossing do not; and it shares the one background slot with session mode's
 * queue, neither touching the other's phrases.
 */
import { describe, expect, it } from 'vitest'

import { keptDoodleSessionStart } from '@/components/workspace/jam-pregeneration'
import { NotationError } from '@/notation/notation-error'
import { createPregenerationPlan, revalidatedReadyPhrases } from '@/session/session-pregeneration'
import { SETTINGS_MUTATION_OFF } from '@/session/settings-mutation'
import { KEPT_DOODLE } from '../../storage/kept-session-v32-fixtures'
import { planSeams, plannedReadyPhrases } from '../../session/pregeneration-harness'
import { withoutRequestIds } from '../../session/session-harness'
import {
  JAM_SHOWING,
  KEPT_STEERING,
  jamLikeSettings,
  jamPregenerationRig,
  keptPhraseFor,
  type JamPregenerationRig,
  type JamPregenerationRigOptions,
} from './jam-pregeneration-rig'
import {
  answer,
  answerAll,
  flush,
  inFlight,
  pregenerationRig,
  takenNumbers,
} from './pregeneration-rig'

/** Intent: Jam's phrase 1 the rig shows; it must be there. */
function shownPhrase(rig: JamPregenerationRig) {
  const result = rig.phrase.result
  if (result === null) throw new Error('no Jam phrase 1 is shown')
  return result
}

/** One state of Jam mode's Idle in which Jam's queue prepares nothing. */
interface Blocked {
  readonly name: string
  readonly options: JamPregenerationRigOptions
  readonly lift: (rig: JamPregenerationRig) => void
}

const BLOCKED: readonly Blocked[] = [
  {
    name: 'no doodle kept',
    options: { doodle: null },
    lift: (rig) => (rig.doodle.value = KEPT_DOODLE.quantized),
  },
  {
    name: 'no phrase 1 written yet',
    options: { phrase: { result: null } },
    lift: (rig) => (rig.phrase.result = keptPhraseFor()),
  },
  {
    name: 'phrase 1 not shown yet',
    options: { phrase: { resultEngraved: false } },
    lift: (rig) => (rig.phrase.resultEngraved = true),
  },
  {
    name: 'phrase 1 being written (Loading)',
    options: { phrase: { operation: 'generating' } },
    lift: (rig) => (rig.phrase.operation = 'idle'),
  },
  {
    name: 'fit retries running',
    options: { phrase: { retriesRunning: true } },
    lift: (rig) => (rig.phrase.retriesRunning = false),
  },
  {
    name: 'a generation failure shown',
    options: { phrase: { generationError: new Error('search_limit_exceeded') } },
    lift: (rig) => (rig.phrase.generationError = null),
  },
  {
    name: 'a notation error shown',
    options: {
      phrase: { notationError: new NotationError('notation_engraving_failed', 'no', {}) },
    },
    lift: (rig) => (rig.phrase.notationError = null),
  },
  {
    name: 'the room notice shown',
    options: { phrase: { roomNotice: 'no_room' } },
    lift: (rig) => (rig.phrase.roomNotice = null),
  },
  {
    name: 'session mode showing',
    options: { facts: { ...JAM_SHOWING, jamShowing: false } },
    lift: (rig) => (rig.facts.value = JAM_SHOWING),
  },
  {
    name: 'a session running',
    options: { facts: { ...JAM_SHOWING, sessionActive: true } },
    lift: (rig) => (rig.facts.value = JAM_SHOWING),
  },
  {
    name: 'a review showing',
    options: { facts: { ...JAM_SHOWING, reviewShowing: true } },
    lift: (rig) => (rig.facts.value = JAM_SHOWING),
  },
  {
    name: 'the rotate-device notice',
    options: { facts: { ...JAM_SHOWING, orientationNoticeShown: true } },
    lift: (rig) => (rig.facts.value = JAM_SHOWING),
  },
]

// @test-link [[rule_jam_pregeneration_only_for_kept_doodle]]
// @test-link [[module_kept_doodle]]
describe("Jam's own pre-generation queue", () => {
  // @test-link [[rule_jam_pregeneration_only_for_kept_doodle]]
  it("prepares phrases 2 to 5 at Jam mode's Idle with a doodle kept and its phrase 1 shown", async () => {
    const rig = jamPregenerationRig()

    await answerAll(rig)

    expect(takenNumbers(rig)).toEqual([2, 3, 4, 5])
    expect(rig.failures).toEqual([])
  })

  for (const blocked of BLOCKED) {
    // @test-link [[rule_jam_pregeneration_only_for_kept_doodle]]
    it(`prepares nothing with ${blocked.name}, and starts once it is over`, async () => {
      const rig = jamPregenerationRig(blocked.options)
      await flush()
      expect(rig.calls).toEqual([])

      blocked.lift(rig)
      await flush()

      expect(inFlight(rig).intent.steering).toEqual(KEPT_STEERING)
      expect(rig.failures).toEqual([])
    })
  }

  // @test-link [[rule_jam_pregeneration_only_for_kept_doodle]]
  it('stops while a review shows, keeping its phrases, and resumes after the last one', async () => {
    const rig = jamPregenerationRig()
    await answer(rig)
    await answer(rig)
    const stopped = inFlight(rig)

    rig.facts.value = { ...JAM_SHOWING, reviewShowing: true }
    await flush()
    expect(stopped.signal.aborted).toBe(true)
    rig.facts.value = JAM_SHOWING
    await answerAll(rig)

    expect(takenNumbers(rig)).toEqual([2, 3, 4, 5])
    expect(rig.calls).toHaveLength(5)
  })

  // @test-link [[rule_jam_pregeneration_only_for_kept_doodle]]
  // @test-link [[rule_pregenerated_phrase_matches_session]]
  it("puts the kept doodle's steering block on every attempt and prepares a Jam on it's phrases", async () => {
    const rig = jamPregenerationRig()
    await answerAll(rig)

    for (const call of rig.calls) expect(call.intent.steering).toEqual(KEPT_STEERING)
    const start = keptDoodleSessionStart(shownPhrase(rig), rig.tempo.value)
    expect(withoutRequestIds(rig.queue.take('one-system'))).toEqual(
      withoutRequestIds(plannedReadyPhrases(planSeams(), start)),
    )
  })

  // @test-link [[rule_pregenerated_phrase_matches_session]]
  it('prepares phrases a session started with the same steering block accepts, one without refuses', async () => {
    const rig = jamPregenerationRig()
    await answerAll(rig)
    const ready = rig.queue.take('one-system')
    const start = keptDoodleSessionStart(shownPhrase(rig), rig.tempo.value)
    const { steering, ...unsteered } = start
    expect(steering).toEqual(KEPT_STEERING)

    expect(revalidatedReadyPhrases(planSeams(), start, ready)).toEqual(ready)
    expect(revalidatedReadyPhrases(planSeams(), unsteered, ready)).toEqual([])
    expect(() => createPregenerationPlan(planSeams(), unsteered, ready)).toThrow(/re-derives/)
  })

  // @test-link [[rule_pregenerated_phrase_matches_session]]
  it("plans from a Jam's start: phrase 1's settings at Jam's tempo, no mutation, no tension arc, Jam's lock", async () => {
    const settings = { ...jamLikeSettings(), rhythmLockOn: true }
    const phraseOne = keptPhraseFor(settings)

    const start = keptDoodleSessionStart(phraseOne, 132)

    expect(start).toEqual({
      settings: { ...settings, controls: { ...settings.controls, tempo: 132 } },
      phraseOne: { intent: phraseOne.intent, outcome: phraseOne.outcome },
      sessionSeed: phraseOne.sessionSeed,
      mutation: SETTINGS_MUTATION_OFF,
      multiPhraseTensionArc: false,
      steering: KEPT_STEERING,
    })
    const rig = jamPregenerationRig({ phrase: { result: phraseOne } })
    await flush()
    expect(inFlight(rig).intent.rhythmLock).toBeDefined()
  })
})

/** One change at Jam mode's Idle that discards Jam's prepared phrases. */
interface Discarding {
  readonly name: string
  readonly apply: (rig: JamPregenerationRig) => void
}

const DISCARDING: readonly Discarding[] = [
  {
    name: 'a Jam setting but the tempo, or the shared instrument (what phrase 1 is written from)',
    apply: (rig) => (rig.writtenFrom.value = 'jam-settings-2'),
  },
  {
    name: 'a new doodle kept in its place',
    apply: (rig) => (rig.doodle.value = { ...KEPT_DOODLE.quantized }),
  },
  {
    name: 'the doodle let go',
    apply: (rig) => {
      rig.doodle.value = null
      rig.phrase.result = null
    },
  },
  {
    name: 'Regenerate (a new phrase 1 from the doodle)',
    apply: (rig) => (rig.phrase.result = keptPhraseFor(jamLikeSettings(), 12)),
  },
]

// @test-link [[rule_pregeneration_discarded_on_change]]
describe("what discards Jam's prepared phrases", () => {
  for (const change of DISCARDING) {
    // @test-link [[rule_pregeneration_discarded_on_change]]
    // @test-link [[rule_jam_pregeneration_only_for_kept_doodle]]
    it(`discards them for ${change.name}`, async () => {
      const rig = jamPregenerationRig()
      await answer(rig)
      await answer(rig)
      const discarded = inFlight(rig)

      change.apply(rig)

      expect(discarded.signal.aborted).toBe(true)
      expect(takenNumbers(rig)).toEqual([])
      expect(rig.failures).toEqual([])
    })
  }

  // @test-link [[rule_pregeneration_discarded_on_change]]
  it("keeps them for a tempo change, the take giving them Jam's tempo", async () => {
    const rig = jamPregenerationRig()
    await answer(rig)
    const kept = inFlight(rig)

    rig.tempo.value = 150
    await flush()

    expect(kept.signal.aborted).toBe(false)
    await answerAll(rig)
    const taken = rig.queue.take('one-system')
    expect(taken.map((ready) => ready.phraseNumber)).toEqual([2, 3, 4, 5])
    for (const ready of taken) expect(ready.intent.controls.tempo).toBe(150)
  })

  // @test-link [[rule_pregeneration_discarded_on_change]]
  it('keeps them across a window crossing that changes none of their requests', async () => {
    const rig = jamPregenerationRig()
    await answerAll(rig)
    const callsBefore = rig.calls.length

    rig.viewport.below = true
    rig.shared.noteDensityContext = { belowTabletLandscape: true, sessionSteppedDown: false }
    await flush()

    expect(takenNumbers(rig)).toEqual([2, 3, 4, 5])
    expect(rig.calls).toHaveLength(callsBefore)
  })
})

// @test-link [[module_kept_doodle]]
// @test-link [[rule_jam_pregeneration_only_for_kept_doodle]]
describe("Jam's queue and session mode's, apart over one background slot", () => {
  // @test-link [[module_kept_doodle]]
  // @test-link [[rule_pregeneration_discarded_on_change]]
  it("never touches session mode's phrases, nor session mode's its own", async () => {
    const session = pregenerationRig()
    await answerAll(session)
    const sessionCalls = session.calls.length
    session.sessionModeHeld.value = true
    const jam = jamPregenerationRig({ slot: session.slot })
    await answerAll(jam)
    expect(takenNumbers(jam)).toEqual([2, 3, 4, 5])

    jam.writtenFrom.value = 'jam-settings-2'
    await answerAll(jam)
    jam.doodle.value = { ...KEPT_DOODLE.quantized }
    await answerAll(jam)
    jam.phrase.result = keptPhraseFor(jamLikeSettings(), 12)
    await answerAll(jam)
    jam.doodle.value = null
    jam.phrase.result = null
    await flush()
    expect(takenNumbers(jam)).toEqual([])
    jam.doodle.value = KEPT_DOODLE.quantized
    jam.phrase.result = keptPhraseFor(jamLikeSettings(), 13)
    await answerAll(jam)
    expect(takenNumbers(session)).toEqual([2, 3, 4, 5])
    expect(session.calls).toHaveLength(sessionCalls)

    const jamCalls = jam.calls.length
    session.idle.controls = { ...session.idle.controls, contour: 'Arch' }
    session.queue.take('one-system')
    await flush()
    expect(takenNumbers(jam)).toEqual([2, 3, 4, 5])
    expect(jam.calls).toHaveLength(jamCalls)
    expect(session.failures).toEqual([])
    expect(jam.failures).toEqual([])
  })

  // @test-link [[module_kept_doodle]]
  it("takes the slot over from the other queue's attempt when the mode changes in one tick", async () => {
    const session = pregenerationRig()
    session.sessionModeHeld.value = true
    await flush()
    const jam = jamPregenerationRig({ slot: session.slot })
    await flush()
    const jamAttempt = inFlight(jam)

    jam.facts.value = { ...JAM_SHOWING, jamShowing: false }
    session.sessionModeHeld.value = false
    await flush()

    expect(jamAttempt.signal.aborted).toBe(true)
    expect(inFlight(session).signal.aborted).toBe(false)
    expect(session.failures).toEqual([])
    expect(jam.failures).toEqual([])
    jam.facts.value = JAM_SHOWING
    session.sessionModeHeld.value = true
    await flush()
    expect(inFlight(jam).signal.aborted).toBe(false)
    expect(session.failures).toEqual([])
    expect(jam.failures).toEqual([])
  })
})
