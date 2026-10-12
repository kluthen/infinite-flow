/**
 * The Idle background slot: it holds at most one background attempt's abort, the player's yield
 * runs and clears it, and the Idle flow's generate seam yields synchronously before posting each
 * player request, with no signal.
 */
import { describe, expect, it, vi } from 'vitest'

import {
  createPregenerationSlot,
  yieldingToPlayer,
} from '@/composables/generation-session-pregeneration'
import type { GenerationIntent } from '@/domain/generation/generation-intent'
import { phraseOneFor, sessionSettings } from '../session/session-harness'

// @test-link [[module_idle_pregeneration_queue]]
describe('Idle background slot', () => {
  // @test-link [[module_idle_pregeneration_queue]]
  it('runs and clears the held abort once on a yield, and holds a later one', () => {
    const slot = createPregenerationSlot()
    const first = vi.fn()
    const second = vi.fn()
    slot.yieldToPlayer()

    slot.hold(first)
    slot.yieldToPlayer()
    slot.yieldToPlayer()
    slot.hold(second)

    expect(first).toHaveBeenCalledOnce()
    expect(second).not.toHaveBeenCalled()
  })

  // @test-link [[module_idle_pregeneration_queue]]
  it('throws while an abort is held, and is emptied by its own release only', () => {
    const slot = createPregenerationSlot()
    const first = vi.fn()
    const releaseFirst = slot.hold(first)
    expect(() => slot.hold(vi.fn())).toThrow(/already in flight/)

    releaseFirst()
    const second = vi.fn()
    slot.hold(second)
    releaseFirst()
    slot.yieldToPlayer()

    expect(first).not.toHaveBeenCalled()
    expect(second).toHaveBeenCalledOnce()
  })
})

// @test-link [[rule_pregeneration_yields_to_player]]
describe('Idle generate seam yielding to the player', () => {
  // @test-link [[rule_pregeneration_yields_to_player]]
  it('aborts the background attempt before posting the player request, which carries no signal', async () => {
    const slot = createPregenerationSlot()
    const order: string[] = []
    const posted = vi.fn((...args: unknown[]) => {
      order.push(`posted with ${args.length} argument(s)`)
      return Promise.resolve('outcome')
    })
    slot.hold(() => order.push('background aborted'))
    const { intent } = phraseOneFor(sessionSettings())

    const answer = yieldingToPlayer(
      slot,
      posted as (intent: GenerationIntent) => Promise<string>,
    )(intent)

    expect(order).toEqual(['background aborted', 'posted with 1 argument(s)'])
    expect(posted).toHaveBeenCalledExactlyOnceWith(intent)
    await expect(answer).resolves.toBe('outcome')
  })
})
