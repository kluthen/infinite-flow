/**
 * What the Jam sweep runner plays (measurement tooling, `npm run measure:jam`): its configurations
 * and cases, read from the environment, and the loop that plays every run of them, case by case
 * and doodle by doodle with one outcome cache shared by every configuration of that case and
 * doodle and dropped after it: only those runs ask for the same intents (tempo never reaches
 * generation), so each intent is still generated and timed once, and the heap stays small.
 *
 * Env: `JAM_LIMIT` keeps N evenly spaced sweep cases (every k-th, so every note density shows);
 * `JAM_MODE` jam, session or both (default both); `JAM_TEMPOS` comma-separated BPM for every mode
 * (default 60,120,180 for a Jam, 60,120,240 for a session); `JAM_DOMAIN` warm, cold or both
 * (default both; a session runs warm only); `JAM_LOCK` off, on or both (default off; on plays the
 * allowed changes all on, then all off); `JAM_LADDER` double, real or baseline (default double: each
 * Jam steered by its doodle, phrase 1 through the double of Jam's ladder; real: the same, phrase 1
 * through chunk 18's real ladder, jam-sweep-real-ladder.ts; baseline: chunk 3's runs, rung 3 only,
 * no steering block); `JAM_DOODLES` none or all (default all with the double or the real ladder,
 * none with the baseline; all crosses each Jam with every doodle of the doodle set; the double and
 * the real ladder need them); `JAM_LEVELS` the Seventh chords levels, comma-separated level ids
 * (default all four, seventh-levels.ts); the double and the real ladder alike build Jam's phrase 1
 * at the case's level. A steered Jam's drift walks Close, Near, Free over the case and doodle
 * indices, so every doodle meets every drift.
 */

import { performance } from 'node:perf_hooks'

import type { ChordFamilyLevel } from '@/domain/chords/chord-families'
import { RHYTHM_CHANGE_KINDS } from '@/domain/generation/request-rhythm-lock'
import { JAM_DRIFTS, type JamDrift } from '@/jam/steering-block-builder'
import { OutcomeCache, type SweepCase } from '../unit/session/deadline-sweep'
import { loadDoodleSet } from '../unit/jam/doodle-set'
import { byNoteDensity } from './cost-guard'
import { ConfigurationTally, type ConfigurationKey } from './jam-sweep-figures'
import type { JamLock, PhraseOneLadder, RhythmDomainState } from './jam-sweep-ladder'
import { JAM_REAL_LADDER } from './jam-sweep-real-ladder'
import { runJamCase, type JamDoodle, type JamMode } from './jam-sweep'
import { JamReplaySampler } from './jam-sweep-replay'
import { seventhLevelsFrom } from './seventh-levels'

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
  /**
   * Whether a Jam is steered by its doodle with phrase 1 through the double of Jam's ladder or
   * chunk 18's real one, or plays the baseline.
   */
  readonly ladder: 'double' | 'real' | 'baseline'
  /** The Seventh chords levels every configuration is played at, in increasing order. */
  readonly levels: readonly ChordFamilyLevel[]
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
  const ladder = oneOf('JAM_LADDER', env.JAM_LADDER, ['double', 'real', 'baseline'], 'double')
  const steered = ladder !== 'baseline'
  const doodles = oneOf('JAM_DOODLES', env.JAM_DOODLES, ['none', 'all'], steered ? 'all' : 'none')
  if (steered && doodles === 'none' && mode !== 'session')
    throw new Error(
      `JAM_LADDER=${ladder} steers each Jam by its doodle: JAM_DOODLES=none has none.`,
    )
  const levels = seventhLevelsFrom('JAM_LEVELS', env.JAM_LEVELS)
  return {
    limit: positiveInteger('JAM_LIMIT', env.JAM_LIMIT),
    modes: mode === 'both' ? ['jam', 'session'] : [mode],
    tempos: { jam: tempos ?? JAM_TEMPOS, session: tempos ?? SESSION_TEMPOS },
    domains: domain === 'both' ? ['warm', 'cold'] : [domain],
    locks: [
      ...(lock === 'on' ? [] : [{ on: false } as const]),
      ...(lock === 'off' ? [] : LOCKS_ON),
    ],
    doodles,
    ladder,
    levels,
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
 * Intent: every configuration the choices give, in run order: per Seventh chords level, per mode,
 * its tempos, the locks, then the domains (warm only for a session). A Jam carries its doodle's
 * steering block with the double or the real ladder, none with the baseline; a session never does.
 */
export function configurations(choices: JamSweepChoices): readonly ConfigurationKey[] {
  return choices.levels.flatMap((level) =>
    choices.modes.flatMap((mode) =>
      choices.tempos[mode].flatMap((tempo) =>
        choices.locks.flatMap((lock) =>
          (mode === 'jam' ? choices.domains : (['warm'] as const)).map(
            (domain): ConfigurationKey => ({
              mode,
              tempo,
              lock,
              domain,
              steering: mode === 'jam' && choices.ladder !== 'baseline',
              level,
            }),
          ),
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
 * Intent: the ladder a steered Jam's phrase 1 goes through under the choices: chunk 18's real one
 * with `JAM_LADDER=real`, otherwise none named (runJamCase's own: the double for a steered Jam,
 * the baseline for the others).
 */
export function phraseOneLadderOf(choices: JamSweepChoices): PhraseOneLadder | undefined {
  return choices.ladder === 'real' ? JAM_REAL_LADDER : undefined
}

/** Intent: the drift of a steered Jam: Close, Near, Free in turn over the case and doodle. */
export function driftOf(sweepCase: SweepCase, doodleIndex: number): JamDrift {
  return JAM_DRIFTS[(sweepCase.index + doodleIndex) % JAM_DRIFTS.length]!
}

/** A configuration's tally, and the replay sample of its steered Jams. */
export interface PlayedConfiguration {
  readonly tally: ConfigurationTally
  readonly replays: JamReplaySampler
}

/**
 * Intent: play one case under one configuration, at its Seventh chords level, with the doodle at
 * its index (a session runs once per case, with the first doodle's turn; a Jam once per doodle,
 * steered with its drift when the configuration carries a block, its phrase 1 through
 * `phraseOneLadder` when one is named), and add the run to the configuration's tally and replay
 * sample.
 */
async function playOne(
  { tally, replays }: PlayedConfiguration,
  sweepCase: SweepCase,
  doodleIndex: number,
  doodle: JamDoodle | undefined,
  outcomes: OutcomeCache,
  phraseOneLadder: PhraseOneLadder | undefined,
): Promise<void> {
  if (tally.key.mode === 'session' && doodleIndex > 0) return
  const playedDoodle = tally.key.mode === 'jam' ? doodle : undefined
  const startedAt = performance.now()
  const { mode, tempo, lock, domain, steering, level } = tally.key
  if (steering && playedDoodle === undefined)
    throw new Error('A steered Jam configuration needs the doodle set.')
  const { record, session, phraseOneInput } = await runJamCase(
    {
      mode,
      tempo,
      lock,
      domain,
      sweepCase: { ...sweepCase, seventhLevel: level },
      ...(playedDoodle === undefined ? {} : { doodle: playedDoodle }),
      ...(steering ? { drift: driftOf(sweepCase, doodleIndex) } : {}),
      ...(steering && phraseOneLadder !== undefined ? { phraseOneLadder } : {}),
    },
    outcomes,
  )
  tally.add(record, (performance.now() - startedAt) / 1000)
  replays.addJam(record, session, phraseOneInput, sweepCase.firstSessionSeed)
}

/**
 * Intent: play every case under every configuration (a Jam once per doodle, steered by it with its
 * drift when the configuration carries a block), density by density, case by case and doodle by
 * doodle, with one outcome cache per case and doodle shared by every configuration and dropped
 * after it; add each run to its configuration's tally and offer it to its replay sample.
 * `onDensity` hears of each density finished; a steered Jam's phrase 1 goes through
 * `phraseOneLadder` when one is named (phraseOneLadderOf).
 */
export async function playConfigurations(
  keys: readonly ConfigurationKey[],
  cases: readonly SweepCase[],
  doodles: readonly (JamDoodle | undefined)[],
  onDensity: (density: string, cases: number) => void = () => {},
  phraseOneLadder?: PhraseOneLadder,
): Promise<readonly PlayedConfiguration[]> {
  const played = keys.map((key) => ({
    tally: new ConfigurationTally(key),
    replays: new JamReplaySampler(),
  }))
  const jamDoodles = [...doodles.entries()]
  const someJam = played.some(({ tally }) => tally.key.mode === 'jam')
  for (const group of byNoteDensity(cases)) {
    for (const sweepCase of group)
      for (const [doodleIndex, doodle] of someJam ? jamDoodles : [[0, undefined] as const]) {
        const outcomes = new OutcomeCache()
        for (const configuration of played)
          await playOne(configuration, sweepCase, doodleIndex, doodle, outcomes, phraseOneLadder)
      }
    onDensity(group[0]!.rhythm.noteDensity, group.length)
  }
  return played
}
