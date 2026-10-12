/**
 * The Idle background slot: the one place the Idle flow and the pre-generation queue meet. The
 * queue holds in it the abort of its background attempt in flight; the Idle flow yields to the
 * player through it before posting each of its own requests, which aborts that attempt. Kept tiny,
 * in the entry chunk: the queue itself loads with the session controller.
 */
import type { GenerationIntent } from '@/domain/generation/generation-intent'

/** Where the background attempt in flight is held, and how the player takes the worker back. */
// @spec-link [[module_idle_pregeneration_queue]]
export interface PregenerationSlot {
  /**
   * Hold the abort of the background attempt now in flight; throws while another is held. The
   * returned release empties the slot if it still holds this abort, and does nothing otherwise.
   */
  readonly hold: (abort: () => void) => () => void
  /** Abort the background attempt in flight, if any, and empty the slot. */
  readonly yieldToPlayer: () => void
}

/** Intent: an empty slot, holding at most one background attempt's abort at a time. */
// @spec-link [[module_idle_pregeneration_queue]]
export function createPregenerationSlot(): PregenerationSlot {
  let held: (() => void) | null = null
  return {
    hold: (abort) => {
      if (held !== null) throw new Error('pre-generation slot: an attempt is already in flight')
      held = abort
      return () => {
        if (held === abort) held = null
      }
    },
    yieldToPlayer: () => {
      const abort = held
      held = null
      abort?.()
    },
  }
}

/**
 * Intent: the Idle flow's generate seam over `generate`: each player request first yields to the
 * player, synchronously, aborting the background attempt in flight, then posts with no signal, so
 * it is never cancelled and never waits behind background work.
 */
// @spec-link [[rule_pregeneration_yields_to_player]]
// @spec-link [[module_idle_pregeneration_queue]]
export function yieldingToPlayer<T>(
  slot: PregenerationSlot,
  generate: (intent: GenerationIntent) => Promise<T>,
): (intent: GenerationIntent) => Promise<T> {
  return (intent) => {
    slot.yieldToPlayer()
    return generate(intent)
  }
}
