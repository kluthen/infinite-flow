/**
 * Hand-written sessions for the lock census's own tests (measurement tooling): a locked rhythm in
 * which every change kind exists, one allowed change from it of each kind, a bend, a far rhythm to
 * re-lock to; builders of census phrases by the lock outcome their provenance records; the
 * eight-phrase session; every mismatch a phrase 2 can show; and availability and tension helpers.
 */

import type { TensionArc } from '@/domain/controls/generation-controls'
import { RHYTHM_CHANGE_KINDS, type RhythmChangeKind } from '@/domain/generation/request-rhythm-lock'
import type { RhythmBar } from '@/domain/rhythm/rhythm-types'
import { phrase } from '../unit/domain/rhythm/rhythm-bar-fixture'
import type { CensusPhrase, ChangeAvailability } from './lock-census'

/**
 * The locked rhythm, chosen so every kind exists: measures 1 and 3 (indices 0 and 2) are four
 * quarter notes (a note start to move, a note to split, a note to turn into a rest), measure 2
 * holds two eighths to merge, and measure 4 a rest between two notes to move.
 */
const L0 = 'n4 n4 n4 n4'
export const L1 = 'n4 n2 n2 n4 n4'
export const L2 = 'n4 n4 n4 n4'
export const L3 = 'n2 r2 n4 n4 n4'
export const LOCKED = phrase([L0, L1, L2, L3])

/** One allowed change from LOCKED of each kind, and a bend two edits away. */
export const MOVED = phrase(['n6 n2 n4 n4', L1, L2, L3])
export const REST_MOVED = phrase([L0, L1, L2, 'n3 r2 n3 n4 n4'])
export const SPLIT = phrase(['n4 n2 n2 n4 n4', L1, 'n4 n2 n2 n4 n4', L3])
const MERGED = phrase([L0, 'n4 n4 n4 n4', L2, L3])
export const TURNED = phrase(['n4 r4 n4 n4', L1, 'n4 r4 n4 n4', L3])
export const FAR = phrase(['n4 r4 n4 n4', 'n4 n4 n4 n4', L2, L3])

/** A rhythm far from LOCKED, re-locked to; a note_rest change from it; a tie-only rewrite of it. */
export const RELOCKED = phrase(['n8 n8', 'n8 n8', 'n8 n8', 'n8 n8'])
export const RELOCKED_TURNED = phrase(['n8 r8', 'n8 n8', 'n8 r8', 'n8 n8'])
export const RELOCKED_TIED = phrase(['n8 n4 ~n4', 'n8 n8', 'n8 n8', 'n8 n8'])

/** What a hand-written phrase may set beyond its number and bars. */
type Extra = Partial<Omit<CensusPhrase, 'phraseNumber' | 'bars'>>

/** Intent: one phrase of a hand-written session: no repeat, no re-lock, at Build, not tenser. */
export function at(
  phraseNumber: number,
  bars: readonly RhythmBar[],
  extra: Extra = {},
): CensusPhrase {
  return {
    phraseNumber,
    repeat: false,
    relock: false,
    bars,
    tenserPhrase: false,
    tension: 'Build',
    ...extra,
  }
}

/** Intent: a phrase whose provenance says it kept the locked bars. */
export function kept(
  phraseNumber: number,
  bars: readonly RhythmBar[],
  extra: Extra = {},
): CensusPhrase {
  return at(phraseNumber, bars, { rhythmLockOutcome: 'locked_bars', ...extra })
}

/** Intent: a phrase whose provenance says it took a drawn change of the given kind. */
export function changed(
  phraseNumber: number,
  bars: readonly RhythmBar[],
  kind: RhythmChangeKind,
  extra: Extra = {},
): CensusPhrase {
  return at(phraseNumber, bars, {
    rhythmLockOutcome: 'rhythm_change',
    rhythmChange: kind,
    ...extra,
  })
}

/** Intent: a phrase whose provenance says it took a forced bend. */
export function bent(
  phraseNumber: number,
  bars: readonly RhythmBar[],
  extra: Extra = {},
): CensusPhrase {
  return at(phraseNumber, bars, { rhythmLockOutcome: 'forced_bend', ...extra })
}

/** The eight phrases: locked, one change of each kind, a kept phrase, and a forced bend. */
export const EIGHT: readonly CensusPhrase[] = [
  at(1, LOCKED),
  changed(2, MOVED, 'move_note_start'),
  kept(3, LOCKED),
  changed(4, REST_MOVED, 'move_rest'),
  changed(5, SPLIT, 'split_note'),
  changed(6, MERGED, 'merge_notes'),
  changed(7, TURNED, 'note_rest'),
  bent(8, FAR),
]

/** Every mismatch a phrase 2 can show, by name, with the allowed list it is read against. */
export const MISMATCHES: readonly (readonly [string, CensusPhrase, readonly RhythmChangeKind[]])[] =
  [
    [
      'a recorded change whose bars are not that change',
      changed(2, LOCKED, 'note_rest'),
      RHYTHM_CHANGE_KINDS,
    ],
    [
      'a recorded change of another kind than the bars',
      changed(2, MOVED, 'note_rest'),
      RHYTHM_CHANGE_KINDS,
    ],
    [
      'a recorded change of a kind not allowed',
      changed(2, MOVED, 'move_note_start'),
      ['note_rest'],
    ],
    ['locked_bars with other bars', kept(2, MOVED), RHYTHM_CHANGE_KINDS],
    ['a forced bend whose bars are the locked ones', bent(2, LOCKED), RHYTHM_CHANGE_KINDS],
    ['a missing outcome', at(2, LOCKED), RHYTHM_CHANGE_KINDS],
    [
      'a change outcome with no change kind',
      at(2, MOVED, { rhythmLockOutcome: 'rhythm_change' }),
      RHYTHM_CHANGE_KINDS,
    ],
    [
      'no change available beside a change',
      at(2, MOVED, { rhythmLockOutcome: 'rhythm_change', rhythmChange: 'no_change_available' }),
      RHYTHM_CHANGE_KINDS,
    ],
    [
      'a change kind beside the locked bars',
      kept(2, LOCKED, { rhythmChange: 'note_rest' }),
      RHYTHM_CHANGE_KINDS,
    ],
    [
      'a change kind beside a forced bend',
      bent(2, FAR, { rhythmChange: 'note_rest' }),
      RHYTHM_CHANGE_KINDS,
    ],
    [
      'a draw on a re-lock',
      bent(2, RELOCKED, { relock: true, rhythmChange: 'no_change_available' }),
      RHYTHM_CHANGE_KINDS,
    ],
    ['a draw with nothing allowed', kept(2, LOCKED, { rhythmChange: 'no_change_available' }), []],
  ]

/** Intent: an availability record with the named kinds available. */
export function available(...kinds: RhythmChangeKind[]): ChangeAvailability {
  return Object.fromEntries(
    RHYTHM_CHANGE_KINDS.map((kind) => [kind, kinds.includes(kind)]),
  ) as ChangeAvailability
}

/** Intent: the same phrase at another tension, with a Vary settings step from `vary` when given. */
export function tensed(entry: CensusPhrase, tension: TensionArc, vary?: TensionArc): CensusPhrase {
  const step = vary === undefined ? {} : { varyTensionStep: { from: vary, to: tension } }
  return { ...entry, tension, ...step }
}
