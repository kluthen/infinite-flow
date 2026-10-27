/**
 * Phrase 1's join from the doodle (master spec C5.9): when a doodle ends (and for a kept doodle),
 * the quantized doodle's last note becomes the carry-in from no phrase that a Jam's phrase 1
 * continues from, the way one phrase joins the next. Only that note's concert pitch crosses, as if
 * reached by no interval and owing no recovery, with no chord; the window is the one the register
 * reading (doodle-controls.ts) carries, the window holding the last note, so the join and the
 * register input name the same window. With the last note outside the instrument's range or
 * every window, there is no join and phrase 1 is generated without one. Phrases 2 onward keep
 * v2's join from the phrase before; nothing here touches them. Pure, nothing saved; part of Jam's
 * code (src/jam/), loaded on demand.
 */
import type { QuantizedDoodle } from '@/domain/doodle/quantized-doodle'
import { deepFreeze } from '@/domain/events/deep-freeze'
import { makeCarryIn, type NoPhraseCarryIn } from '@/domain/generation/carry-in/carry-in'
import type { InstrumentProfile } from '@/domain/profile/instrument-profile'
import type { RegisterId } from '@/domain/profile/register-id'

import type { DoodleRegisterReading } from './doodle-controls'

/**
 * Why phrase 1 has no join: the doodle's last note lies outside the instrument's range, or inside
 * it but in no register window (the register reads Varying).
 */
// @spec-link [[rule_jam_phrase_one_joins_doodle]]
export type NoDoodleJoinReason = 'outside-range' | 'outside-windows'

/**
 * Phrase 1's join from the doodle: the carry-in from no phrase with the register whose window it
 * carries (the register input phrase 1 is requested with), or none, with why.
 */
// @spec-link [[rule_jam_phrase_one_joins_doodle]]
// @spec-link [[rule_jam_register_follows_doodle]]
export type DoodleJoin =
  | { readonly kind: 'join'; readonly register: RegisterId; readonly carryIn: NoPhraseCarryIn }
  | { readonly kind: 'none'; readonly reason: NoDoodleJoinReason }

/**
 * Intent: phrase 1's join from the doodle's last note, for the selected instrument and the
 * register the doodle reads (readDoodleRegister, for the same doodle and instrument). None when
 * the last note lies outside the instrument's range, or when the register reading carries no
 * window (no window holds the note). Otherwise the carry-in from no phrase: the note's concert
 * pitch, no arriving interval, no owed recovery, no chord, and the reading's window, the one
 * holding the note (nearest centre among several, Middle on a tie), with that window's register.
 * A reading whose window does not hold the note is a caller defect, refused as a CarryInError.
 */
// @spec-link [[rule_jam_phrase_one_joins_doodle]]
// @spec-link [[rule_jam_register_follows_doodle]]
// @spec-link [[rule_instrument_profile_range]]
export function doodleJoin(
  doodle: QuantizedDoodle,
  instrument: InstrumentProfile,
  register: DoodleRegisterReading,
): DoodleJoin {
  const last = doodle.notes[doodle.notes.length - 1]!.pitch
  const range = instrument.concertRange
  if (last < range.minMidi || last > range.maxMidi)
    return deepFreeze<DoodleJoin>({ kind: 'none', reason: 'outside-range' })
  if (register.window === null)
    return deepFreeze<DoodleJoin>({ kind: 'none', reason: 'outside-windows' })
  const carryIn = makeCarryIn({
    origin: 'none',
    lastPitch: { midi: last, arrivingInterval: null, recovery: { kind: 'settled' } },
    registerWindow: register.window.window,
    finalHarmony: null,
  })
  return deepFreeze<DoodleJoin>({ kind: 'join', register: register.window.id, carryIn })
}
