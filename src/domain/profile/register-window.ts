/**
 * A resolved inclusive concert-MIDI register window — the immutable result of window derivation
 * (see ./register-window-derivation.ts). Structurally similar to an ActiveConcertRange (see
 * ./active-concert-range.ts) but kept as a distinct, differently-branded shape
 * (`kind: 'RegisterWindow'`) so a resolved window can never be confused with an unresolved active
 * range at the type level.
 */

import { deepFreeze } from '../events/deep-freeze'
import { type ActiveConcertRange } from './active-concert-range'

const MIDI_PITCH_MIN = 0
const MIDI_PITCH_MAX = 127

/** A resolved, immutable inclusive concert-MIDI register window [minMidi, maxMidi]. */
// @spec-link [[module_register_window_resolution_primitives]]
export interface RegisterWindow {
  readonly kind: 'RegisterWindow'
  readonly minMidi: number
  readonly maxMidi: number
}

/** Typed failure for an invalid attempt to construct a RegisterWindow. */
// @spec-link [[module_register_window_resolution_primitives]]
export class RegisterWindowError extends Error {
  readonly kind = 'RegisterWindowError' as const

  constructor(message: string) {
    super(message)
    this.name = 'RegisterWindowError'
  }
}

/**
 * Intent: construct an immutable, deep-frozen RegisterWindow from validated integer endpoints.
 * Rejects non-integer endpoints, minMidi > maxMidi, and endpoints outside the plausible MIDI
 * range [0, 127] as a typed failure; never clamps, defaults, or coerces.
 */
// @spec-link [[module_register_window_resolution_primitives]]
export function makeRegisterWindow(minMidi: number, maxMidi: number): RegisterWindow {
  if (!Number.isInteger(minMidi) || !Number.isInteger(maxMidi)) {
    throw new RegisterWindowError(
      `Register window bounds must be integers, got minMidi=${minMidi}, maxMidi=${maxMidi}.`,
    )
  }
  if (
    minMidi < MIDI_PITCH_MIN ||
    minMidi > MIDI_PITCH_MAX ||
    maxMidi < MIDI_PITCH_MIN ||
    maxMidi > MIDI_PITCH_MAX
  ) {
    throw new RegisterWindowError(
      `Register window bounds must be plausible MIDI values in [${MIDI_PITCH_MIN}, ${MIDI_PITCH_MAX}], got minMidi=${minMidi}, maxMidi=${maxMidi}.`,
    )
  }
  if (minMidi > maxMidi) {
    throw new RegisterWindowError(
      `Register window minMidi (${minMidi}) must be <= maxMidi (${maxMidi}).`,
    )
  }
  return deepFreeze({ kind: 'RegisterWindow', minMidi, maxMidi })
}

/** Intent: does the given concert pitch fall inside this window, inclusive of both edges? */
// @spec-link [[module_register_window_resolution_primitives]]
export function registerWindowContainsPitch(window: RegisterWindow, pitch: number): boolean {
  return pitch >= window.minMidi && pitch <= window.maxMidi
}

/** Intent: is this window fully contained within the given active concert range? */
// @spec-link [[module_register_window_resolution_primitives]]
export function registerWindowIsContainedIn(
  window: RegisterWindow,
  range: ActiveConcertRange,
): boolean {
  return window.minMidi >= range.minMidi && window.maxMidi <= range.maxMidi
}

/** Intent: do two register windows intersect (share at least one concert pitch)? */
// @spec-link [[module_register_window_resolution_primitives]]
export function registerWindowsIntersect(a: RegisterWindow, b: RegisterWindow): boolean {
  return a.minMidi <= b.maxMidi && b.minMidi <= a.maxMidi
}
