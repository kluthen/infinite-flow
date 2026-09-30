/**
 * Real phrase harmony for the backing specs, taken from the harmony planner, and the attacks the
 * backing renderer says each phrase plays, counted in beats from the phrase's start.
 */

import { renderBacking } from '@/domain/backing/backing-renderer'
import { FOUR_FOUR_METER } from '@/domain/generation/generation-request'
import { isNoLegalHarmonyPlan, makeHarmonyCandidateDomain } from '@/domain/harmony/harmony-planner'
import type { HarmonyEvent } from '@/domain/harmony/harmony-types'
import type { BackingVoice } from '@/audio/audio-ports'

/** One backing attack the renderer asks for, in beats from its phrase's start. */
export interface RenderedAttack {
  readonly voice: BackingVoice
  readonly pitch: number
  readonly startBeat: number
  readonly endBeat: number
}

/** Intent: whether a phrase's harmony changes chord on beat 3 of some measure. */
function hasTwoChordMeasure(harmony: readonly HarmonyEvent[]): boolean {
  return harmony.some((event) => event.startBeat === 2)
}

/**
 * Intent: two different real phrases in C major with active diatonic motion, the first with a
 * two-chord measure. Throws if the planner offers no such pair.
 */
// @test-link [[req_session_backing_track]]
export function twoPhraseHarmonies(): readonly [readonly HarmonyEvent[], readonly HarmonyEvent[]] {
  const domain = makeHarmonyCandidateDomain({
    tonalCenter: 'C',
    collection: 'Major',
    harmonicMotion: 'Active diatonic',
    tensionArc: 'Settled',
    profile: 'Neutral',
  })
  if (isNoLegalHarmonyPlan(domain)) throw new Error('no harmony for C major')
  const split = domain.candidates.find((candidate) => hasTwoChordMeasure(candidate.events))
  const other = domain.candidates.find((candidate) => candidate !== split)
  if (split === undefined || other === undefined) {
    throw new Error('the planner offers no two-chord phrase and another phrase')
  }
  return [split.events, other.events]
}

/** Intent: a whole-note time as quarter-note beats; throws off a whole beat. */
function beatsOf(time: { readonly numerator: number; readonly denominator: number }): number {
  const beats = (time.numerator * 4) / time.denominator
  if (!Number.isInteger(beats)) throw new Error(`${beats} is not a whole beat`)
  return beats
}

/** Intent: every attack the renderer gives `harmony`, bass first then chords, each in order. */
// @test-link [[req_session_backing_track]]
export function renderedAttacks(harmony: readonly HarmonyEvent[]): RenderedAttack[] {
  const rendered = renderBacking(harmony, FOUR_FOUR_METER)
  const attacks = (voice: BackingVoice, notes: typeof rendered.bass): RenderedAttack[] =>
    notes.map((note) => ({
      voice,
      pitch: Number(note.pitch),
      startBeat: beatsOf(note.start),
      endBeat: beatsOf(note.start) + beatsOf(note.duration),
    }))
  return [...attacks('bass', rendered.bass), ...attacks('chord', rendered.chords)]
}
