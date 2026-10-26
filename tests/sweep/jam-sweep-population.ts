/**
 * What the Jam sweep runner plays (measurement tooling, `npm run measure:jam`): its configurations
 * and cases, read from the environment, and the loop that plays every run of them, note density by
 * note density with one outcome cache per density shared by every configuration (as the cost
 * runner keeps the heap in check).
 *
 * Env: `JAM_LIMIT` keeps N evenly spaced sweep cases (every k-th, so every note density shows);
 * `JAM_MODE` jam, session or both (default both); `JAM_TEMPOS` comma-separated BPM for every mode
 * (default 60,120,180 for a Jam, 60,120,240 for a session); `JAM_DOMAIN` warm, cold or both
 * (default both; a session runs warm only); `JAM_LOCK` off, on or both (default off; on plays the
 * allowed changes all on, then all off); `JAM_DOODLES` none or all (default none; all crosses each
 * Jam with every doodle of the doodle set).
 */

import { performance } from 'node:perf_hooks'

import { RHYTHM_CHANGE_KINDS } from '@/domain/generation/request-rhythm-lock'
import { OutcomeCache, type SweepCase } from '../unit/session/deadline-sweep'
import { loadDoodleSet } from '../unit/jam/doodle-set'
import { byNoteDensity } from './cost-guard'
import { ConfigurationTally, type ConfigurationKey } from './jam-sweep-figures'
import type { JamLock, RhythmDomainState } from './jam-sweep-ladder'
import { runJamCase, type JamDoodle, type JamMode } from './jam-sweep'

/** A Jam's tempos by default (M1: 240 BPM comes later). */
export const JAM_TEMPOS: readonly number[] = [60, 120, 180]

/** A session's tempos by default: v3.1's sweep's. */
export const SESSION_TEMPOS: readonly number[] = [60, 120, 240]

/** The runner's choices, as read from the environment. */
export interface JamSweepChoices {
  readonly limit: number | undefined
  readonly modes: readonly JamMode[]
  readonly tempos: { readonly jam: readonly number[]; readonly session: readonly number[] }
  readonly domains: readonly RhythmDomainState[]
  readonly locks: readonly JamLock[]
  readonly doodles: 'none' | 'all'
}

/** Intent: one of some allowed words, or the default when unset; anything else fails. */
function oneOf<T extends string>(
  name: string,
  raw: string | undefined,
  allowed: readonly T[],
  fallback: T,
): T {
  if (raw === undefined || raw.trim() === '') return fallback
  const value = raw.trim().toLowerCase()
  if (!(allowed as readonly string[]).includes(value))
    throw new Error(`${name} must be one of ${allowed.join(', ')}, got "${raw}".`)
  return value as T
}

/** Intent: a positive whole number from the environment, or none when unset. */
function positiveInteger(name: string, raw: string | undefined): number | undefined {
  if (raw === undefined || raw.trim() === '') return undefined
  const value = Number(raw)
  if (!Number.isInteger(value) || value <= 0)
    throw new Error(`${name} must be a positive integer, got "${raw}".`)
  return value
}

/** Intent: the tempos `JAM_TEMPOS` names, comma-separated, or none when unset. */
function tempoList(raw: string | undefined): readonly number[] | undefined {
  if (raw === undefined || raw.trim() === '') return undefined
  return raw.split(',').map((part) => {
    const tempo = Number(part.trim())
    if (!Number.isFinite(tempo) || tempo <= 0)
      throw new Error(`JAM_TEMPOS must list positive tempos, got "${part.trim()}".`)
    return tempo
  })
}

/** The locks `JAM_LOCK=on` plays: every change allowed, then none (a strict lock). */
const LOCKS_ON: readonly JamLock[] = [
  { on: true, allowedChanges: RHYTHM_CHANGE_KINDS },
  { on: true, allowedChanges: [] },
]

/** Intent: the runner's choices from an environment (`process.env` by default). */
export function jamSweepChoices(env: NodeJS.ProcessEnv = process.env): JamSweepChoices {
  const mode = oneOf('JAM_MODE', env.JAM_MODE, ['jam', 'session', 'both'], 'both')
  const domain = oneOf('JAM_DOMAIN', env.JAM_DOMAIN, ['warm', 'cold', 'both'], 'both')
  const lock = oneOf('JAM_LOCK', env.JAM_LOCK, ['off', 'on', 'both'], 'off')
  const tempos = tempoList(env.JAM_TEMPOS)
  return {
    limit: positiveInteger('JAM_LIMIT', env.JAM_LIMIT),
    modes: mode === 'both' ? ['jam', 'session'] : [mode],
    tempos: { jam: tempos ?? JAM_TEMPOS, session: tempos ?? SESSION_TEMPOS },
    domains: domain === 'both' ? ['warm', 'cold'] : [domain],
    locks: [
      ...(lock === 'on' ? [] : [{ on: false } as const]),
      ...(lock === 'off' ? [] : LOCKS_ON),
    ],
    doodles: oneOf('JAM_DOODLES', env.JAM_DOODLES, ['none', 'all'], 'none'),
  }
}

/** Intent: `limit` cases evenly spaced over the sweep's (every k-th), or all of them with none. */
export function evenlySpaced(
  cases: readonly SweepCase[],
  limit: number | undefined,
): readonly SweepCase[] {
  if (limit === undefined || limit >= cases.length) return cases
  return Array.from(
    { length: limit },
    (_, index) => cases[Math.floor((index * cases.length) / limit)]!,
  )
}

/**
 * Intent: every configuration the choices give, in run order: per mode, its tempos, the locks,
 * then the domains (warm only for a session). No configuration carries a steering block yet.
 */
export function configurations(choices: JamSweepChoices): readonly ConfigurationKey[] {
  return choices.modes.flatMap((mode) =>
    choices.tempos[mode].flatMap((tempo) =>
      choices.locks.flatMap((lock) =>
        (mode === 'jam' ? choices.domains : (['warm'] as const)).map(
          (domain): ConfigurationKey => ({ mode, tempo, lock, domain, steering: false }),
        ),
      ),
    ),
  )
}

/** Intent: the doodles a Jam is crossed with: none (one run, no doodle), or the whole doodle set. */
export function doodlesOf(choice: 'none' | 'all'): readonly (JamDoodle | undefined)[] {
  if (choice === 'none') return [undefined]
  const set = loadDoodleSet().map(({ name, quantized }) => ({ name, quantized }))
  if (set.length === 0)
    throw new Error('JAM_DOODLES=all: the doodle set is not available (no doodle file).')
  return set
}

/**
 * Intent: play every case under every configuration (a Jam once per doodle), density by density
 * with one outcome cache per density shared by every configuration and dropped after it, and add
 * each run to its configuration's tally. `onDensity` hears of each density finished.
 */
export async function playConfigurations(
  keys: readonly ConfigurationKey[],
  cases: readonly SweepCase[],
  doodles: readonly (JamDoodle | undefined)[],
  onDensity: (density: string, cases: number) => void = () => {},
): Promise<readonly ConfigurationTally[]> {
  const tallies = keys.map((key) => new ConfigurationTally(key))
  for (const group of byNoteDensity(cases)) {
    const outcomes = new OutcomeCache()
    for (const tally of tallies)
      for (const doodle of tally.key.mode === 'jam' ? doodles : [undefined])
        for (const sweepCase of group) {
          const startedAt = performance.now()
          const { mode, tempo, lock, domain } = tally.key
          const { record } = await runJamCase(
            { mode, tempo, lock, domain, sweepCase, ...(doodle === undefined ? {} : { doodle }) },
            outcomes,
          )
          tally.add(record, (performance.now() - startedAt) / 1000)
        }
    onDensity(group[0]!.rhythm.noteDensity, group.length)
  }
  return tallies
}
