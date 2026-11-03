/**
 * The session seed plan: every seed a session uses after phrase 1 is derived from its one session
 * seed, drawn at Idle with phrase 1, by one fixed integer derivation: the session seed XOR the
 * FNV-1a 32-bit hash of a versioned label, forced to an unsigned 32-bit value. Each derived seed
 * depends only on the session seed and its label, never on which rungs ran, how earlier phrases
 * went, the tempo, the window or the clock, so a session replays from phrase 1 and its session
 * seed, and a skipped rung shifts no other seed. A fresh Jam, which has no phrase 1 at Idle, draws
 * its session seed at Start, and its phrase 1's attempts take seeds of their own labels.
 */

import { fnv1a32 } from '../domain/random/hash32'
import { makeSeed, type Seed } from '../domain/random/seed'
import { LADDER } from './failure-ladder'

/** The plan's version, part of every label: changing any derivation means a new version. */
// @spec-link [[module_session_seed_plan]]
export const SESSION_SEED_PLAN_VERSION = 1

/** The first phrase number with a derived seed: phrase 1 keeps the seed it was generated with. */
const FIRST_PLANNED_PHRASE = 2

/** The largest 32-bit unsigned value, the largest seed. */
const MAX_UNSIGNED_32 = 0xffffffff

/** The label prefix every derivation of this plan version shares. */
const LABEL_PREFIX = `session-seed-plan-v${SESSION_SEED_PLAN_VERSION}`

/**
 * How many attempts a fresh Jam's phrase 1 has labels for: rung 1's first attempt (0) and its
 * three retries (1 to 3), rung 2 (4) and rung 3 (5).
 */
// @spec-link [[module_session_seed_plan]]
export const JAM_PHRASE_ONE_ATTEMPTS = 6

/**
 * Typed failure for a derivation the plan does not cover: a phrase number below 2, a rung outside
 * the failure ladder or outside a fresh Jam's phrase 1 attempts, or a value that is not an
 * integer.
 */
// @spec-link [[module_session_seed_plan]]
export class SessionSeedPlanError extends Error {
  readonly kind = 'SessionSeedPlanError' as const

  constructor(message: string) {
    super(message)
    this.name = 'SessionSeedPlanError'
  }
}

/** Intent: refuse a session seed that is not a 32-bit unsigned integer, as no Seed can be. */
function assertSessionSeed(sessionSeed: Seed): void {
  if (!Number.isInteger(sessionSeed) || sessionSeed < 0 || sessionSeed > MAX_UNSIGNED_32)
    throw new SessionSeedPlanError(
      `The session seed must be a 32-bit unsigned integer, got ${sessionSeed}.`,
    )
}

/** Intent: the seed one label derives from the session seed: their XOR, unsigned 32-bit. */
function derive(sessionSeed: Seed, label: string): Seed {
  assertSessionSeed(sessionSeed)
  return makeSeed((sessionSeed ^ fnv1a32(label)) >>> 0)
}

/**
 * Intent: the seed of rung `rung` of phrase `phraseNumber`: the rung is the failure ladder's
 * index (0 the first carry-in attempt, 1 to 3 the carry-in retries, 4 the standalone attempt).
 * A phrase number below 2, a rung outside the ladder or a non-integer throws.
 */
// @spec-link [[module_session_seed_plan]]
export function phraseAttemptSeed(sessionSeed: Seed, phraseNumber: number, rung: number): Seed {
  if (!Number.isInteger(phraseNumber) || phraseNumber < FIRST_PLANNED_PHRASE)
    throw new SessionSeedPlanError(
      `A planned phrase number must be an integer of ${FIRST_PLANNED_PHRASE} or more, got ${phraseNumber}.`,
    )
  if (!Number.isInteger(rung) || rung < 0 || rung >= LADDER.length)
    throw new SessionSeedPlanError(
      `A rung must be an integer from 0 to ${LADDER.length - 1}, got ${rung}.`,
    )
  return derive(sessionSeed, `${LABEL_PREFIX}:phrase:${phraseNumber}:rung:${rung}`)
}

/**
 * Intent: the seed of attempt `rung` of a fresh Jam's phrase 1, from the session seed drawn at
 * Start: 0 for rung 1's first attempt (the doodle's join and the steering block), 1 to 3 for its
 * retries, 4 for rung 2 (the block, no join), 5 for rung 3 (the standalone phrase). An attempt
 * cancelled by a further doodle note and requested again on the longer doodle is still rung 0.
 * Any other rung, or a non-integer, throws; phrase 2 onward keep phraseAttemptSeed's labels.
 */
// @spec-link [[module_session_seed_plan]]
export function jamPhraseOneSeed(sessionSeed: Seed, rung: number): Seed {
  if (!Number.isInteger(rung) || rung < 0 || rung >= JAM_PHRASE_ONE_ATTEMPTS)
    throw new SessionSeedPlanError(
      `A Jam's phrase 1 rung must be an integer from 0 to ${JAM_PHRASE_ONE_ATTEMPTS - 1}, got ${rung}.`,
    )
  return derive(sessionSeed, `${LABEL_PREFIX}:jam-phrase-one:rung:${rung}`)
}

/**
 * Intent: the Vary settings mutation seed of the session, derived only when Vary settings is on
 * at Start; the mutation's indexed streams derive from it.
 */
// @spec-link [[module_session_seed_plan]]
export function settingsMutationSeed(sessionSeed: Seed): Seed {
  return derive(sessionSeed, `${LABEL_PREFIX}:settings-mutation`)
}
