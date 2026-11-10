/**
 * The rhythm lock and Jam cases of the v3.2 replay-key corpus (./replay-key-corpus-v32-cases.ts),
 * each a request v3.2 introduced, built by the app's own builders where it has them.
 *
 * - **The rhythm lock in a session**, on three instruments: a heavily varied Sixteenth phrase 1
 *   whose bars use sixteenth notes; phrase 2 under the strict lock, keeping the bars (a locked
 *   phrase); phrase 3, a tenser phrase allowing every change, drawing one (a changed phrase);
 *   phrase 4 stepped down to Eighth under the re-lock group, whose bars its density cannot write
 *   (a forced bend).
 * - **A fresh Jam's phrase 1 by each rung**, on three instruments, doodles and drifts, the Jam's
 *   lock on or off: rung 1 (the doodle's join and the steering block), rung 2 (the block alone)
 *   and rung 3 (v2's standalone phrase), as `jamAttempt` builds them.
 * - **A Jam's later phrases**: from each rung-1 phrase 1, phrase 2 (and, on the C keyboard, phrase
 *   3) carrying the phrase before's carry-in and the steering block, and with the Jam's lock on the
 *   locked group of phrase 1's bars (locked Jam phrases); under drift Near or Free (drifted ones).
 * - **Phrase 1 written again from a kept doodle** after a Jam setting changed (the tempo and key,
 *   the drift and the lock), as `climbKeptDoodleLadder` builds its first attempt.
 *
 * Each seed is the first search seed giving the phrase the case needs: a lock outcome, a phrase 1
 * whose bars use sixteenth notes, or a phrase at all. Test plumbing: nothing in the app reads it.
 */

import { fileURLToPath } from 'node:url'

import { JAZZ_FIGURE_LEVELS, NEUTRAL_FIGURE_LEVELS } from '@/domain/figures/figure-levels'
import type { QuantizedDoodle } from '@/domain/doodle/quantized-doodle'
import { makeGenerationControls } from '@/domain/controls/generation-controls'
import { deriveCarryIn } from '@/domain/generation/carry-in/carry-in-derivation'
import type { GenerationIntent } from '@/domain/generation/generation-intent'
import { makeCarryInGenerationIntent } from '@/domain/generation/carry-in/carry-in-intent'
import { makeRequestId } from '@/domain/generation/generation-request'
import {
  makeRequestRhythmLock,
  RHYTHM_CHANGE_KINDS,
  type LockedRhythmMeasure,
  type RequestRhythmLock,
  type RhythmChangeKind,
} from '@/domain/generation/request-rhythm-lock'
import type { RhythmLockTier } from '@/domain/rhythm/rhythm-lock-order'
import { makeSeed } from '@/domain/random/seed'
import {
  BLOCK_ATTEMPT,
  doodleAttempts,
  jamAttempt,
  STANDALONE_ATTEMPT,
  type DoodleAttempts,
  type JamPhraseOneAttemptIndex,
  type JamPhraseOneSettings,
} from '@/jam/jam-phrase-one-attempts'
import { climbKeptDoodleLadder } from '@/jam/kept-doodle-phrase-one'
import type { JamDrift } from '@/jam/steering-block-builder'
import { barsUseSixteenthNotes, lockedBarsOfOutcome } from '@/session/rhythm-lock-session'
import { ALL_GROUPS_ALLOWED } from '@/session/settings-mutation-scales'
import type { SessionSettings } from '@/session/session-types'

import { readDoodleFile } from '../jam/doodle-set'
import {
  allowedRhythm,
  CHAIN_CONTROLS,
  corpusInstrument,
  corpusIntent,
  searchSeed,
  type CorpusControls,
  type CorpusInstrument,
  type ReplayKeyCorpusV32Case,
  type SuccessOutcome,
} from './replay-key-corpus-v32-builders'

/** The doodle set's directory, found from this file's own location. */
const DOODLES_DIR = fileURLToPath(new URL('../../fixtures/doodles/', import.meta.url))

/** A searched phrase: its case and the phrase it generated. */
interface Found {
  readonly corpusCase: ReplayKeyCorpusV32Case
  readonly outcome: SuccessOutcome
}

/** Intent: a predicate accepting a phrase whose rhythm lock outcome is the given one. */
function lockOutcomeIs(tier: RhythmLockTier): (outcome: SuccessOutcome) => boolean {
  return (outcome) => outcome.provenance.rhythmLockOutcome === tier
}

/** Intent: accept any phrase that generated. */
function anyPhrase(): boolean {
  return true
}

/** Intent: the locked group of the given bars, allowed changes and tenser flag. */
function lockedGroup(
  bars: readonly LockedRhythmMeasure[],
  allowedChanges: readonly RhythmChangeKind[],
  tenserPhrase: boolean,
): RequestRhythmLock {
  return makeRequestRhythmLock({ state: { kind: 'locked', bars }, allowedChanges, tenserPhrase })
}

/**
 * Intent: one searched case: the first search seed whose intent gives a phrase the predicate
 * accepts, as a case of the given label and phrase number.
 */
function found(
  label: string,
  phraseNumber: number,
  build: (seed: number) => GenerationIntent,
  accepts: (outcome: SuccessOutcome) => boolean,
): Found {
  const { intent, outcome } = searchSeed(label, build, accepts)
  return { corpusCase: { label, intent, phraseNumber }, outcome }
}

/** Intent: the carry-in a found phrase hands forward. */
function carryInAfter(phrase: Found) {
  return deriveCarryIn({
    intent: phrase.corpusCase.intent,
    outcome: phrase.outcome,
    phraseNumber: phrase.corpusCase.phraseNumber,
  })
}

/**
 * Intent: one session's rhythm lock chain on an instrument: a heavily varied Sixteenth phrase 1
 * with sixteenth bars, a locked phrase 2, a changed tenser phrase 3 allowing every change, and a
 * phrase 4 stepped down to Eighth under the re-lock group (no change allowed), which takes a
 * forced bend.
 */
function lockChain(instrument: CorpusInstrument): readonly ReplayKeyCorpusV32Case[] {
  const controls: CorpusControls = allowedRhythm({
    ...CHAIN_CONTROLS,
    tension: 'Lift',
    noteDensity: 'Sixteenth',
    rhythmicVariety: 'Heavily varied',
  })
  const levels = JAZZ_FIGURE_LEVELS
  const base = `${instrument.label}-lock`
  const options = { controls, levels, instrument }
  const first = found(
    `${base}-p1`,
    1,
    (seed) => corpusIntent({ ...options, label: `${base}-p1`, seed }),
    (outcome) => barsUseSixteenthNotes(lockedBarsOfOutcome(outcome)),
  )
  const bars = lockedBarsOfOutcome(first.outcome)
  const locked = found(
    `${base}-p2-locked`,
    2,
    (seed) =>
      corpusIntent({
        ...options,
        label: `${base}-p2-locked`,
        seed,
        carryIn: carryInAfter(first),
        rhythmLock: lockedGroup(bars, [], false),
      }),
    lockOutcomeIs('locked_bars'),
  )
  const changed = found(
    `${base}-p3-changed`,
    3,
    (seed) =>
      corpusIntent({
        ...options,
        label: `${base}-p3-changed`,
        seed,
        carryIn: carryInAfter(locked),
        rhythmLock: lockedGroup(bars, RHYTHM_CHANGE_KINDS, true),
      }),
    lockOutcomeIs('rhythm_change'),
  )
  const bent = found(
    `${base}-p4-forced-bend`,
    4,
    (seed) =>
      corpusIntent({
        ...options,
        controls: allowedRhythm({ ...controls, noteDensity: 'Eighth' }),
        label: `${base}-p4-forced-bend`,
        seed,
        carryIn: carryInAfter(changed),
        rhythmLock: lockedGroup(bars, [], false),
      }),
    lockOutcomeIs('forced_bend'),
  )
  return [first, locked, changed, bent].map((phrase) => phrase.corpusCase)
}

/** Intent: every rhythm lock case: a lock chain on three instruments. */
export function lockCases(): readonly ReplayKeyCorpusV32Case[] {
  return ['c-keyboard', 'eb-alto', 'my-baritone'].flatMap((label) =>
    lockChain(corpusInstrument(label)),
  )
}

/** One fresh Jam of the corpus: its instrument, doodle, drift and lock. */
interface CorpusJam {
  readonly instrument: string
  readonly doodle: string
  readonly drift: JamDrift
  readonly lockOn: boolean
  readonly allowedChanges: readonly RhythmChangeKind[]
  readonly controls: Partial<CorpusControls>
}

/** The three fresh Jams: each instrument, doodle and drift, the lock on (twice) or off. */
const JAMS: readonly CorpusJam[] = [
  {
    instrument: 'c-keyboard',
    doodle: 'eighth-offbeats',
    drift: 'Close',
    lockOn: true,
    allowedChanges: ['move_rest', 'split_note'],
    controls: { tonalCenter: 'G', collection: 'Mixolydian', tempo: 110 },
  },
  {
    instrument: 'bb-tenor',
    doodle: 'tresillo-leaps',
    drift: 'Near',
    lockOn: false,
    allowedChanges: [],
    controls: { tonalCenter: 'F', collection: 'Dorian', tempo: 150 },
  },
  {
    instrument: 'my-horn',
    doodle: 'sixteenth-bursts',
    drift: 'Free',
    lockOn: true,
    allowedChanges: [],
    controls: { tonalCenter: 'E', collection: 'Minor', tempo: 90 },
  },
]

/** Intent: a quantized doodle of the doodle set, by name. */
function doodleNamed(name: string): QuantizedDoodle {
  return readDoodleFile(`${DOODLES_DIR}${name}.json`).quantized
}

/** Intent: Jam's settings and drift as phrase 1 reads them, for one corpus Jam. */
function jamSettings(jam: CorpusJam): JamPhraseOneSettings {
  const instrument = corpusInstrument(jam.instrument)
  const settings: SessionSettings = {
    controls: makeGenerationControls({
      ...CHAIN_CONTROLS,
      ...jam.controls,
      instrumentProfileId: instrument.instrumentProfileId,
    }),
    figureLevels: NEUTRAL_FIGURE_LEVELS,
    selection: { kind: 'custom', baseId: null },
    ...(instrument.instrumentProfile === undefined
      ? {}
      : { instrumentProfile: instrument.instrumentProfile }),
    allowedGroups: ALL_GROUPS_ALLOWED,
    rhythmLockOn: jam.lockOn,
    allowedRhythmChanges: jam.allowedChanges,
  }
  return { settings, drift: jam.drift }
}

/** Intent: the intent of one ladder attempt under a search seed, at the widest window. */
function attemptIntent(
  attempts: DoodleAttempts,
  index: JamPhraseOneAttemptIndex,
  label: string,
  seed: number,
): GenerationIntent {
  return jamAttempt(attempts, index, {
    requestId: makeRequestId(`corpus-v32-${label}`),
    seed: makeSeed(seed),
    belowTabletLandscape: false,
    steppedDown: false,
  }).intent
}

/** The ladder's rungs by their first attempt: rung 1, rung 2, rung 3. */
const RUNG_ATTEMPTS: readonly (readonly [string, JamPhraseOneAttemptIndex])[] = [
  ['rung1', 0],
  ['rung2', BLOCK_ATTEMPT],
  ['rung3', STANDALONE_ATTEMPT],
]

/**
 * Intent: a Jam phrase after `previous`: its carry-in, the doodle's steering block and, with the
 * Jam's lock on, the locked group of phrase 1's bars, under the controls the doodle set.
 */
function laterJamPhrase(
  label: string,
  phraseNumber: number,
  attempts: DoodleAttempts,
  previous: Found,
  bars: readonly LockedRhythmMeasure[],
): Found {
  const { settings, steering, pendingLock } = attempts
  return found(
    label,
    phraseNumber,
    (seed) =>
      makeCarryInGenerationIntent({
        requestId: makeRequestId(`corpus-v32-${label}`),
        seed: makeSeed(seed),
        controls: settings.controls,
        figureLevels: settings.figureLevels,
        ...(settings.instrumentProfile === undefined
          ? {}
          : { instrumentProfile: settings.instrumentProfile }),
        ...(pendingLock === undefined
          ? {}
          : { rhythmLock: lockedGroup(bars, pendingLock.allowedChanges, false) }),
        steering,
        carryIn: carryInAfter(previous),
      }),
    anyPhrase,
  )
}

/**
 * Intent: one fresh Jam's cases: phrase 1 by each rung, then the Jam's phrase 2 after the rung-1
 * phrase 1 (and phrase 3 on the C keyboard), labelled locked when the Jam's lock is on and by the
 * drift when it is not Close.
 */
function freshJamCases(jam: CorpusJam): readonly ReplayKeyCorpusV32Case[] {
  const attempts = doodleAttempts(doodleNamed(jam.doodle), jamSettings(jam))
  if (attempts.join.kind !== 'join') {
    throw new Error(`Doodle ${jam.doodle} gives ${jam.instrument} no join for rung 1.`)
  }
  const base = `${jam.instrument}-jam-${jam.doodle}-${jam.drift.toLowerCase()}`
  const phraseOnes = RUNG_ATTEMPTS.map(([rung, index]) =>
    found(
      `${base}-${rung}-p1`,
      1,
      (seed) => attemptIntent(attempts, index, `${base}-${rung}-p1`, seed),
      anyPhrase,
    ),
  )
  const first = phraseOnes[0]!
  const bars = lockedBarsOfOutcome(first.outcome)
  const kind = `${jam.lockOn ? 'locked' : 'unlocked'}${jam.drift === 'Close' ? '' : '-drifted'}`
  const second = laterJamPhrase(`${base}-p2-${kind}`, 2, attempts, first, bars)
  const later =
    jam.instrument === 'c-keyboard'
      ? [laterJamPhrase(`${base}-p3-${kind}`, 3, attempts, second, bars)]
      : []
  return [...phraseOnes, second, ...later].map((phrase) => phrase.corpusCase)
}

/** A kept doodle written again after a Jam setting changed: the label and the changed Jam. */
const KEPT_DOODLE_CHANGES: readonly (readonly [string, CorpusJam])[] = [
  ['tempo-key', { ...JAMS[0]!, controls: { tonalCenter: 'D', collection: 'Ionian', tempo: 80 } }],
  ['drift-lock', { ...JAMS[1]!, drift: 'Close', lockOn: true, allowedChanges: ['merge_notes'] }],
]

/**
 * Intent: phrase 1 written again at Idle from a kept doodle after a Jam setting changed: the
 * climb's first attempt under the changed settings, with the first search seed that generates.
 */
function keptDoodleCases(): readonly ReplayKeyCorpusV32Case[] {
  return KEPT_DOODLE_CHANGES.map(([change, jam]) => {
    const label = `${jam.instrument}-jam-${jam.doodle}-kept-${change}-p1`
    return found(
      label,
      1,
      (seed) =>
        climbKeptDoodleLadder(doodleNamed(jam.doodle), jamSettings(jam), {
          nextRequestId: () => makeRequestId(`corpus-v32-${label}`),
          nextSeed: () => makeSeed(seed),
          isBelowTabletLandscape: () => false,
        }).attempt().intent,
      anyPhrase,
    ).corpusCase
  })
}

/** Intent: every Jam case: the three fresh Jams, then the kept doodles written again. */
export function jamCases(): readonly ReplayKeyCorpusV32Case[] {
  return [...JAMS.flatMap(freshJamCases), ...keptDoodleCases()]
}
