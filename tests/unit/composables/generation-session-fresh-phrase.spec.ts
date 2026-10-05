/**
 * The fresh phrase a session end asks for, once phrase 1 has sounded: the phrase on screen leaves at
 * once, with no score shown meanwhile, and a new phrase is generated from the current controls with a
 * fresh seed and no carry-in, through the Idle fit run and its fresh-seed retries. The staff's room
 * is checked first: with no room nothing is generated and the no-room notice shows, the new phrase
 * coming only when it clears; a staff not laid out (behind the rotate-device notice) counts as no
 * room at every step of that run. A blocked rhythm combination gives no phrase at all, as at Idle.
 */
import { describe, expect, it } from 'vitest'

import { NotationError } from '@/notation/notation-error'
import type { GenerationIntent } from '@/domain/generation/generation-intent'
import { NO_ROOM, ROOM, TOO_WIDE } from './fake-staff-fit'
import {
  createDeferred,
  createFitSession,
  type Deferred,
  type FitSessionOptions,
  flushAsync,
} from './fit-session-harness'

/** A Sixteenth combination blocked from `bp-tablet-landscape` up. */
const SIXTEENTH_ONLY_BLOCKED = {
  noteDensity: 'Sixteenth',
  rhythmicVariety: 'Strict',
  silenceDensity: 'Sparse',
  syncopation: 'Active displacement',
} as const

/** Intent: a session at Ready on phrase seed 1, drawn on a staff that reported its width. */
async function atReady(options: FitSessionOptions = {}) {
  const built = createFitSession(options)
  built.staff.report(500)
  expect(await built.session.actions.generate()).toBe(true)
  expect(built.session.state.result?.seed).toBe(1)
  built.log.length = 0
  return built
}

// @test-link [[rule_session_end_generates_next_phrase_one]]
// @test-link [[module_idle_fresh_run]]
describe('a fresh phrase at a session end', () => {
  // @test-link [[rule_session_end_generates_next_phrase_one]]
  it('drops the phrase on screen at once, then draws a new one with a fresh seed and no carry-in', async () => {
    const built = await atReady()
    const roomChecksBefore = built.staff.roomChecks.length

    const running = built.session.actions.startFreshPhrase()

    expect(built.session.state.result).toBeNull()
    expect(built.session.state.resultEngraved).toBe(false)
    expect(built.session.state.operation).toBe('generating')
    expect(built.log).toEqual(['clear'])
    expect(await running).toBe(true)
    expect(built.staff.roomChecks.length).toBe(roomChecksBefore + 1)
    expect(built.log).toEqual(['clear', 'generate:2', 'check:2', 'notate:2'])
    expect(built.session.state.result?.seed).toBe(2)
    expect(built.session.state.result?.carryIn).toBeUndefined()
    expect(built.session.state.operation).toBe('idle')
    expect(built.accepted.map((intent) => intent.seed)).toEqual([1, 2])
  })

  // @test-link [[rule_session_end_generates_next_phrase_one]]
  it('replaces a phrase too wide with fresh-seed retries, as an Idle regeneration does', async () => {
    const built = await atReady()
    built.staff.queueFit(TOO_WIDE, TOO_WIDE)

    expect(await built.session.actions.startFreshPhrase()).toBe(true)

    expect(built.generated.map((intent) => intent.seed)).toEqual([1, 2, 3, 4])
    expect(built.notated.map((intent) => intent.seed)).toEqual([1, 4])
    expect(built.session.state.result?.seed).toBe(4)
    expect(built.session.state.retriesRunning).toBe(false)
  })

  // @test-link [[rule_session_end_generates_next_phrase_one]]
  // @test-link [[rule_staff_notice_gives_way_to_new_phrase]]
  it('generates nothing while the staff has no room, then a fresh phrase, never the old one, once it clears', async () => {
    const built = await atReady()
    built.staff.setRoom(NO_ROOM)

    expect(await built.session.actions.startFreshPhrase()).toBe(false)

    expect(built.generated.map((intent) => intent.seed)).toEqual([1])
    expect(built.session.state.result).toBeNull()
    expect(built.session.state.roomNotice).toBe('no_room')
    expect(built.session.state.operation).toBe('idle')

    built.staff.setRoom(ROOM)
    built.staff.report(700)
    await flushAsync()

    expect(built.notated.map((intent) => intent.seed)).toEqual([1, 2])
    expect(built.session.state.result?.seed).toBe(2)
    expect(built.session.state.roomNotice).toBeNull()
  })

  // @test-link [[rule_session_end_generates_next_phrase_one]]
  // @test-link [[rule_staff_notice_gives_way_to_new_phrase]]
  // @test-link [[module_idle_fresh_run]]
  it('treats a staff not laid out (behind the rotate-device notice) as no room, at each step', async () => {
    const notLaidOut = () =>
      Promise.reject(new NotationError('notation_container_unavailable', 'no width', {}))
    for (const step of ['room', 'fit', 'draw'] as const) {
      let laidOut = false
      const built = await atReady({
        checkRoom: () => (step === 'room' && !laidOut ? notLaidOut() : undefined),
        checkFit: (result) => (step === 'fit' && result.seed === 2 ? notLaidOut() : undefined),
        notate: (result) => (step === 'draw' && result.seed === 2 ? notLaidOut() : undefined),
      })

      expect(await built.session.actions.startFreshPhrase(), step).toBe(false)

      expect(built.session.state, step).toMatchObject({
        result: null,
        notationError: null,
        roomNotice: 'no_room',
        operation: 'idle',
      })
      expect(built.generated.length, step).toBe(step === 'room' ? 1 : 2)

      laidOut = true
      built.staff.report(700)
      await flushAsync()

      expect(built.session.state.roomNotice, step).toBeNull()
      expect(built.notated.at(-1)?.seed, step).toBe(built.generated.at(-1)?.seed)
      expect(built.session.state.result?.seed, step).toBe(step === 'room' ? 2 : 3)
    }
  })

  // @test-link [[rule_session_end_generates_next_phrase_one]]
  // @test-link [[module_idle_fresh_run]]
  it('keeps an unmeasurable staff a retryable notation error outside a fresh phrase', async () => {
    const built = await atReady({
      checkFit: (result) =>
        result.seed === 2
          ? Promise.reject(new NotationError('notation_container_unavailable', 'no width', {}))
          : undefined,
    })

    expect(await built.session.actions.regenerate()).toBe(true)

    expect(built.session.state.notationError).toMatchObject({
      code: 'notation_container_unavailable',
    })
    expect(built.session.state.roomNotice).toBeNull()
  })

  // @test-link [[rule_session_end_generates_next_phrase_one]]
  it('keeps a no-room notice already showing, announcing it no more, and generates nothing', async () => {
    const built = await atReady()
    built.staff.setRoom(NO_ROOM)
    built.session.actions.reportNotationFailure(
      new NotationError('notation_no_room', 'no room', {}),
    )
    expect(built.session.state.roomNotice).toBe('no_room')
    const announcements = built.session.state.roomNoticeAnnouncements

    expect(await built.session.actions.startFreshPhrase()).toBe(false)

    expect(built.generated).toHaveLength(1)
    expect(built.session.state.roomNotice).toBe('no_room')
    expect(built.session.state.roomNoticeAnnouncements).toBe(announcements)
  })

  // @test-link [[rule_session_end_generates_next_phrase_one]]
  // @test-link [[rule_unsupported_rhythm_gives_way_to_no_phrase]]
  it('gives no phrase at all, generating nothing, under a blocked rhythm combination', async () => {
    const built = await atReady()
    for (const [key, value] of Object.entries(SIXTEENTH_ONLY_BLOCKED)) {
      built.session.actions.setControl(key as keyof typeof SIXTEENTH_ONLY_BLOCKED, value)
    }
    const roomChecksBefore = built.staff.roomChecks.length

    expect(await built.session.actions.startFreshPhrase()).toBe(false)

    expect(built.generated).toHaveLength(1)
    expect(built.staff.roomChecks.length).toBe(roomChecksBefore)
    expect(built.session.state).toMatchObject({
      result: null,
      latestIntent: null,
      roomNotice: null,
      operation: 'idle',
      generationError: null,
    })
  })

  // @test-link [[rule_session_end_generates_next_phrase_one]]
  it('ends on the initial generation error when the fresh phrase fails to generate', async () => {
    let calls = 0
    const built = await atReady({
      generate: () => {
        calls += 1
        return calls === 2 ? Promise.reject(new Error('no phrase')) : undefined
      },
    })

    expect(await built.session.actions.startFreshPhrase()).toBe(false)

    expect(built.session.state.result).toBeNull()
    expect(built.session.state.generationError?.message).toBe('no phrase')
  })

  // @test-link [[rule_session_end_generates_next_phrase_one]]
  it('refuses, at once, to drop a phrase still being drawn: that caller is defective', async () => {
    const drawing = createDeferred<void>()
    const built = createFitSession({ notate: () => drawing.promise })
    built.staff.report(500)
    const running = built.session.actions.generate()
    await flushAsync()
    expect(built.session.state.operation).toBe('notating')

    expect(() => built.session.actions.startFreshPhrase()).toThrow(
      'startFreshPhrase cannot drop a phrase still being drawn.',
    )
    expect(built.session.state.operation).toBe('notating')

    drawing.resolve()
    expect(await running).toBe(true)
  })

  // @test-link [[rule_session_end_generates_next_phrase_one]]
  it('supersedes a replacement run already in flight: its late answer changes nothing', async () => {
    const pending: Deferred<GenerationIntent>[] = []
    const built = await atReady({
      generate: (intent) => {
        if (intent.seed !== 2) return undefined
        const deferred = createDeferred<GenerationIntent>()
        pending.push(deferred)
        return deferred.promise
      },
    })
    built.session.actions.reportNotationFailure(
      new NotationError('notation_notes_too_wide', 'too wide', {}),
    )
    await flushAsync()
    expect(built.session.state.operation).toBe('generating')
    expect(pending).toHaveLength(1)

    const fresh = built.session.actions.startFreshPhrase()
    expect(await fresh).toBe(true)
    expect(built.session.state.result?.seed).toBe(3)

    pending[0]?.resolve(built.generated[1] as GenerationIntent)
    await flushAsync()

    expect(built.notated.map((intent) => intent.seed)).toEqual([1, 3])
    expect(built.session.state.result?.seed).toBe(3)
    expect(built.session.state.operation).toBe('idle')
  })
})
