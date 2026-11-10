// @vitest-environment node
/**
 * A phrase 1 at Idle written by climbing a ladder (ladder-idle-phrase.ts), over fake staff seams:
 * a writing asked for before the staff has reported its layout waits for that report, and one
 * asked for while a phrase is drawn waits for the drawing to end, the latest asked for winning; a
 * clearing waits for a drawing too; a writing afresh checks the room first; a writing again under
 * the no-room notice checks the room before generating.
 */
import { OFF_CHORD_FAMILIES } from '@/domain/chords/chord-families'
import { describe, expect, it } from 'vitest'

import { createLadderIdlePhrase } from '@/composables/ladder-idle-phrase'
import { DEFAULT_GENERATION_CONTROLS } from '@/domain/controls/profile-selection'
import { NEUTRAL_FIGURE_LEVELS } from '@/domain/figures/figure-levels'
import {
  createGenerationIntent,
  type GenerationIntent,
} from '@/domain/generation/generation-intent'
import { makeRequestId } from '@/domain/generation/generation-request'
import { spellWrittenKey } from '@/domain/notation/pitch-spelling'
import { makeSeed } from '@/domain/random/seed'
import { NO_ROOM, ROOM, createFakeStaffFit } from './fake-staff-fit'
import { createDeferred, flushAsync } from './fit-session-harness'

/** Intent: a ladder phrase over fakes; drawings settle when the test says, or at once. */
function ladderPhrase() {
  const staff = createFakeStaffFit<GenerationIntent>()
  const log: string[] = []
  const drawings: ReturnType<typeof createDeferred<void>>[] = []
  const draw = { hold: false }
  let seed = 0
  const phrase = createLadderIdlePhrase<GenerationIntent, GenerationIntent>({
    ladder: {
      climb: () => ({
        intent: () =>
          createGenerationIntent({
            requestId: makeRequestId(`ladder-${seed + 1}`),
            seed: makeSeed(++seed),
            controls: DEFAULT_GENERATION_CONTROLS,
            figureLevels: NEUTRAL_FIGURE_LEVELS,
            chordFamilies: OFF_CHORD_FAMILIES,
          }),
        failed: () => false,
      }),
    },
    generate: (intent) => {
      log.push(`generate:${intent.seed}`)
      return Promise.resolve(intent)
    },
    checkFit: staff.checkFit,
    checkRoom: (signature) => {
      log.push('room')
      return staff.checkRoom(signature)
    },
    staffLayout: staff.staffLayout,
    notate: (result) => {
      log.push(`notate:${result.seed}`)
      if (!draw.hold) return Promise.resolve()
      const drawing = createDeferred<void>()
      drawings.push(drawing)
      return drawing.promise
    },
    clearPresentedPhrase: () => log.push('clear'),
    nextSessionSeed: () => makeSeed(900),
    withSessionSeed: (generated) => generated,
    keySignature: () => spellWrittenKey(0, 'Major').signature,
  })
  return { phrase, staff, log, drawings, draw }
}

// @test-link [[module_idle_fit_round]]
// @test-link [[rule_held_doodle_phrase_one_at_idle]]
describe('a ladder phrase 1 at Idle', () => {
  // @test-link [[rule_held_doodle_phrase_one_at_idle]]
  it("waits for the staff's first layout report, then writes afresh, the room checked first", async () => {
    const { phrase, staff, log } = ladderPhrase()

    phrase.write()
    await flushAsync()
    expect(log).toEqual([])

    staff.report(1000)
    await flushAsync()
    expect(log).toEqual(['clear', 'room', 'generate:1', 'notate:1'])
    expect(phrase.state.result?.seed).toBe(1)
  })

  // @test-link [[rule_jam_setting_change_rewrites_kept_phrase_one]]
  it('writes again once a drawing ends, the latest writing asked for winning', async () => {
    const built = ladderPhrase()
    const { phrase, staff, log, drawings, draw } = built
    staff.report(1000)
    draw.hold = true
    phrase.write()
    await flushAsync()
    expect(phrase.state.operation).toBe('notating')

    phrase.write()
    phrase.rewrite()
    await flushAsync()
    expect(log).toEqual(['clear', 'room', 'generate:1', 'notate:1'])

    draw.hold = false
    drawings[0]!.resolve()
    await flushAsync()
    await flushAsync()
    expect(log.slice(4)).toEqual(['generate:2', 'notate:2'])
    expect(phrase.state.result?.seed).toBe(2)
  })

  // @test-link [[rule_held_doodle_dropped_on_change]]
  it('clears once a drawing ends, nothing written after', async () => {
    const { phrase, staff, log, drawings, draw } = ladderPhrase()
    staff.report(1000)
    draw.hold = true
    phrase.write()
    await flushAsync()

    phrase.clear()
    drawings[0]!.resolve()
    await flushAsync()
    await flushAsync()

    expect(log.at(-1)).toBe('clear')
    expect(phrase.state.result).toBeNull()
    expect(phrase.state.operation).toBe('idle')
  })

  // @test-link [[rule_staff_needs_room_notice]]
  it('checks the room before writing again under the no-room notice', async () => {
    const { phrase, staff, log } = ladderPhrase()
    staff.report(1000)
    staff.setRoom(NO_ROOM)
    phrase.write()
    await flushAsync()
    expect(phrase.state.roomNotice).toBe('no_room')
    expect(log).toEqual(['clear', 'room', 'clear'])

    phrase.rewrite()
    await flushAsync()
    expect(log).toEqual(['clear', 'room', 'clear', 'room'])

    staff.setRoom(ROOM)
    phrase.rewrite()
    await flushAsync()
    expect(phrase.state.roomNotice).toBeNull()
    expect(phrase.state.result?.seed).toBe(1)
  })
})
