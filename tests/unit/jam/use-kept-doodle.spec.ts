// @vitest-environment node
/**
 * Jam mode's kept doodle in Jam's code (module_kept_doodle): at most one doodle, in memory only,
 * kept from a Jam part with the session it comes from, each keep replacing the one before; its
 * readings and suggestion taken from the part, or worked out from the doodle when a kept session
 * read back holds neither; the session it comes from moved to the latest one played on it; its
 * suggestion declined for good; and let go.
 */
import { describe, expect, it } from 'vitest'

import { makeQuantizedDoodle } from '@/domain/doodle/quantized-doodle'
import type { JamKeyAndMode } from '@/jam/key-suggestion/key-suggestion'
import { BB_TENOR_PROFILE, C_KEYBOARD_PROFILE } from '@/domain/profile/instrument-profiles'
import type { InstrumentProfile } from '@/domain/profile/instrument-profile'
import { deriveRegisterWindowCandidates } from '@/domain/profile/register-window-derivation'
import { readDoodleControls } from '@/jam/doodle-controls'
import { suggestKeyAndMode } from '@/jam/key-suggestion/key-suggestion'
import { useKeptDoodle, type KeptDoodleState } from '@/jam/use-kept-doodle'
import type { ReviewedJamPart } from '@/components/workspace/session-jam-part'

import { KEPT_DOODLE, reviewedJamPart } from '../components/workspace/reviewed-jam-part-fixture'

/** A one-measure doodle other than the fixture's. */
const OTHER_DOODLE = makeQuantizedDoodle({
  measureCount: 1,
  notes: [
    { startTick: 0, lengthTicks: 4, pitch: 60 },
    { startTick: 4, lengthTicks: 4, pitch: 64 },
    { startTick: 8, lengthTicks: 8, pitch: 67 },
  ],
})

/** Intent: a kept doodle over a fixed instrument and Jam key and mode, each changeable. */
function keptDoodle(
  instrument: InstrumentProfile = C_KEYBOARD_PROFILE,
  keyAndMode: JamKeyAndMode = { tonalCenter: 'C', collection: 'Major' },
): KeptDoodleState {
  return useKeptDoodle({ instrument: () => instrument, keyAndMode: () => keyAndMode })
}

/** Intent: a kept session's Jam part as read back: no suggestion, no controls. */
function readBack(part: ReviewedJamPart = reviewedJamPart()): ReviewedJamPart {
  return { ...part, suggestion: null, doodleControls: null }
}

// @test-link [[module_kept_doodle]]
describe("Jam's kept doodle", () => {
  // @test-link [[rule_held_doodle_in_memory_only]]
  it('keeps none at first', () => {
    expect(keptDoodle().kept.value).toBeNull()
  })

  it("keeps a Jam part's doodle, capture tempo, readings and suggestion with the session it comes from", () => {
    const doodle = keptDoodle()
    const part = reviewedJamPart()

    doodle.keep(part, 'session-1')

    const kept = doodle.kept.value
    expect(kept?.doodle).toBe(part.doodle.doodle)
    expect(kept?.captureTempo).toBe(KEPT_DOODLE.captureTempo)
    expect(kept?.readings).toBe(part.doodleControls)
    expect(kept?.suggestion).toBe(part.suggestion)
    expect(kept?.suggestionDeclined).toBe(false)
    expect(kept?.sessionKey).toBe('session-1')
    expect(Object.isFrozen(kept)).toBe(true)
  })

  // @test-link [[rule_jam_again_on_this_doodle]]
  it('replaces the doodle kept before', () => {
    const doodle = keptDoodle()
    doodle.keep(reviewedJamPart(), 'session-1')
    const other: ReviewedJamPart = {
      ...reviewedJamPart(),
      doodle: { ...reviewedJamPart().doodle, doodle: OTHER_DOODLE, captureTempo: 120 },
      suggestionDeclined: true,
    }

    doodle.keep(other, 'session-2')

    expect(doodle.kept.value?.doodle).toBe(OTHER_DOODLE)
    expect(doodle.kept.value?.captureTempo).toBe(120)
    expect(doodle.kept.value?.suggestionDeclined).toBe(true)
    expect(doodle.kept.value?.sessionKey).toBe('session-2')
  })

  it("works the readings out from the doodle, at no width, for a kept session's part that holds none", () => {
    const doodle = keptDoodle(BB_TENOR_PROFILE)

    doodle.keep(readBack(), 'session-1')

    expect(doodle.kept.value?.readings).toEqual(
      readDoodleControls(
        KEPT_DOODLE.quantized,
        deriveRegisterWindowCandidates(
          BB_TENOR_PROFILE.concertRange,
          BB_TENOR_PROFILE.registerWindows,
        ),
      ),
    )
  })

  it("works the suggestion out from the doodle, against Jam's key and mode, for a part that holds none", () => {
    const keyAndMode: JamKeyAndMode = { tonalCenter: 'F#', collection: 'Dorian' }
    const doodle = keptDoodle(BB_TENOR_PROFILE, keyAndMode)

    doodle.keep(readBack({ ...reviewedJamPart(), suggestionDeclined: true }), 'session-1')

    expect(doodle.kept.value?.suggestion).toEqual(
      suggestKeyAndMode(KEPT_DOODLE.quantized, keyAndMode, BB_TENOR_PROFILE),
    )
    expect(doodle.kept.value?.suggestionDeclined).toBe(true)
  })

  // @test-link [[rule_held_doodle_dropped_on_change]]
  it('moves the session it comes from to the latest one played on it, the doodle kept', () => {
    const doodle = keptDoodle()
    doodle.keep(reviewedJamPart(), 'session-1')
    const before = doodle.kept.value

    doodle.playedIn('session-2')

    expect(doodle.kept.value?.sessionKey).toBe('session-2')
    expect(doodle.kept.value?.doodle).toBe(before?.doodle)
    expect(doodle.kept.value?.readings).toBe(before?.readings)
  })

  // @test-link [[rule_suggestion_keep_mine]]
  it('declines its suggestion for good, all else kept; declined already, nothing changes', () => {
    const doodle = keptDoodle()
    doodle.keep(reviewedJamPart(), 'session-1')

    doodle.decline()
    const declined = doodle.kept.value
    doodle.decline()

    expect(declined?.suggestionDeclined).toBe(true)
    expect(declined?.sessionKey).toBe('session-1')
    expect(doodle.kept.value).toBe(declined)
  })

  // @test-link [[rule_held_doodle_dropped_on_change]]
  it('lets it go; with none kept, letting go changes nothing', () => {
    const doodle = keptDoodle()
    doodle.keep(reviewedJamPart(), 'session-1')

    doodle.letGo()
    expect(doodle.kept.value).toBeNull()
    doodle.letGo()
    expect(doodle.kept.value).toBeNull()
  })

  it('throws at a decline or a session moved with no doodle kept', () => {
    const doodle = keptDoodle()

    expect(() => doodle.decline()).toThrow(/no doodle is kept/)
    expect(() => doodle.playedIn('session-1')).toThrow(/no doodle is kept/)
  })
})
