/**
 * A session-seed provider for an Idle session test that is not about session seeds: a plain
 * counter, so every published phrase 1 still gets its own session seed.
 */
import { makeSeed, type Seed } from '@/domain/random/seed'

/** Intent: a session-seed provider counting up from 1. */
export function countingSessionSeeds(): () => Seed {
  let counter = 0
  return () => makeSeed(++counter)
}
