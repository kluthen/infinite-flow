/**
 * Phrase 1 written at Jam mode's Idle from the kept doodle (master spec C5.11; module_kept_doodle):
 * the attempts of one writing, climbing the same three rungs as a fresh Jam's phrase 1
 * (./jam-phrase-one-attempts.ts: the join and the steering block, the block alone, v2's standalone
 * phrase) with no deadline. It starts on rung 1, or rung 2 when the doodle gives no join; a
 * generation failure moves on as in a fresh Jam (./jam-phrase-one.ts, `attemptAfter`), a
 * `no_legal_pitch_plan` on rung 1 jumping to rung 2, and the standalone attempt's failure leaves
 * none. Each attempt asked for is built afresh: a new request id and seed (any phrase 1 at Idle
 * draws its seeds as it goes), the window's width as it stands then, never stepped down (Idle has no
 * session behind it). Pure but for its seams; part of Jam's code (src/jam/), loaded on demand.
 */
import type { QuantizedDoodle } from '@/domain/doodle/quantized-doodle'
import type { RequestId } from '@/domain/generation/generation-request-envelope'
import type { SteeringBlock } from '@/domain/generation/steering-block'
import type { Seed } from '@/domain/random/seed'
import type { PhraseOneAttemptResult } from '@/session/session-types'

import { attemptAfter } from './jam-phrase-one'
import {
  BLOCK_ATTEMPT,
  doodleAttempts,
  jamAttempt,
  type JamAttempt,
  type JamPhraseOneAttemptIndex,
  type JamPhraseOneSettings,
} from './jam-phrase-one-attempts'

/** What each attempt reads when it is built: the page-wide request ids, fresh seeds, the window. */
// @spec-link [[rule_held_doodle_phrase_one_at_idle]]
export interface KeptDoodleLadderSeams {
  readonly nextRequestId: () => RequestId
  readonly nextSeed: () => Seed
  readonly isBelowTabletLandscape: () => boolean
}

/** One attempt asked for: the ladder's, with its index and the steering block it carries or not. */
// @spec-link [[rule_held_doodle_phrase_one_at_idle]]
// @spec-link [[rule_every_jam_phrase_carries_doodle]]
export interface KeptDoodleAttempt extends JamAttempt {
  readonly index: JamPhraseOneAttemptIndex
  /** The block every phrase of a Jam on the kept doodle carries, whatever rung phrase 1 is on. */
  readonly steering: SteeringBlock
}

/**
 * One writing's climb: the attempt it stands on, built afresh at each call (a phrase too wide is
 * replaced on the same attempt, with a new seed), and the move on after its generation failed.
 */
// @spec-link [[rule_held_doodle_phrase_one_at_idle]]
export interface KeptDoodleClimb {
  readonly attempt: () => KeptDoodleAttempt
  /** The attempt's generation failed so: on to the next attempt (true), or none is left (false). */
  readonly failed: (result: PhraseOneAttemptResult) => boolean
}

/**
 * Intent: the climb of one writing of phrase 1 from `doodle` under Jam's settings and drift as
 * they are now: what the doodle gives every attempt read once, the first attempt rung 1's, or rung
 * 2's with no join; each failure moving on by `attemptAfter`, nothing ever being due at Idle.
 */
// @spec-link [[rule_held_doodle_phrase_one_at_idle]]
// @spec-link [[rule_jam_phrase_one_failure_ladder]]
// @spec-link [[rule_doodle_sets_jam_controls]]
export function climbKeptDoodleLadder(
  doodle: QuantizedDoodle,
  jam: JamPhraseOneSettings,
  seams: KeptDoodleLadderSeams,
): KeptDoodleClimb {
  const attempts = doodleAttempts(doodle, jam)
  let index: JamPhraseOneAttemptIndex = attempts.join.kind === 'join' ? 0 : BLOCK_ATTEMPT
  return {
    attempt: () => ({
      ...jamAttempt(attempts, index, {
        requestId: seams.nextRequestId(),
        seed: seams.nextSeed(),
        belowTabletLandscape: seams.isBelowTabletLandscape(),
        steppedDown: false,
      }),
      index,
      steering: attempts.steering,
    }),
    failed: (result) => {
      const next = attemptAfter(index, result, false)
      if (next === undefined) return false
      index = next
      return true
    },
  }
}
