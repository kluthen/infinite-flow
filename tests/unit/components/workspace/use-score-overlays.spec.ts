/**
 * The score panel's overlays: the start marker over the starting note at Idle and the running
 * session's acknowledged notes, as one object kept while neither changes.
 */
import { shallowRef } from 'vue'
import { describe, expect, it } from 'vitest'

import { useScoreOverlays } from '@/components/workspace/use-score-overlays'
import type { SessionController } from '@/components/workspace/workspace-session-controller-types'
import type { ExpectedNoteIdentity } from '@/domain/acknowledgement/expected-note'
import { makeConcertPitch } from '@/domain/events/concert-pitch'
import type { MeasureIndex } from '@/domain/events/measure'
import type { StartingNote } from '@/session/starting-note'
import { createFakeSessionController } from './fake-session-controller'

const FIRST_NOTE: ExpectedNoteIdentity = {
  phraseNumber: 1,
  measureIndex: 0 as MeasureIndex,
  eventIndex: 0,
}
const SECOND_NOTE: ExpectedNoteIdentity = {
  phraseNumber: 1,
  measureIndex: 0 as MeasureIndex,
  eventIndex: 1,
}
const NOTHING = { startMarker: null, playheadMeasure: null, acknowledged: [] }

/** Intent: a starting note at `identity` (a fresh object each call, as the controller recomputes it). */
function startingNoteAt(identity: ExpectedNoteIdentity): StartingNote {
  return { identity: { ...identity }, concertPitch: makeConcertPitch(60), label: 'C4' }
}

// @test-link [[module_notation_note_identity_overlays]]
// @test-link [[rule_acknowledgement_highlights_expected_note_only]]
// @test-link [[rule_no_grading_or_mismatch_signal]]
describe('useScoreOverlays', () => {
  it('marks nothing before the controller has loaded, nor at Idle with no starting note', () => {
    const controller = shallowRef<SessionController | null>(null)
    const overlays = useScoreOverlays(() => controller.value)
    expect(overlays.value).toEqual(NOTHING)

    controller.value = createFakeSessionController().controller
    expect(overlays.value).toEqual(NOTHING)
  })

  // @test-link [[rule_starting_note_named]]
  it('puts the start marker on the starting note while one would start a session', () => {
    const fake = createFakeSessionController({ startingNote: startingNoteAt(FIRST_NOTE) })
    const overlays = useScoreOverlays(() => fake.controller)
    expect(overlays.value).toEqual({
      startMarker: FIRST_NOTE,
      playheadMeasure: null,
      acknowledged: [],
    })

    fake.state.startingNote = null

    expect(overlays.value.startMarker).toBeNull()
  })

  // @test-link [[rule_acknowledgement_highlights_expected_note_only]]
  it("lights the running session's acknowledged notes, with no playhead (the session staff draws it)", () => {
    const fake = createFakeSessionController({ phase: 'running' })
    const overlays = useScoreOverlays(() => fake.controller)
    const acknowledged = [FIRST_NOTE, SECOND_NOTE]

    fake.state.acknowledged = acknowledged

    expect(overlays.value.acknowledged).toBe(acknowledged)
    expect(overlays.value.playheadMeasure).toBeNull()
  })

  // @test-link [[rule_no_grading_or_mismatch_signal]]
  it('keeps the same object while neither the marker nor the acknowledged notes change', () => {
    const fake = createFakeSessionController({ startingNote: startingNoteAt(FIRST_NOTE) })
    const overlays = useScoreOverlays(() => fake.controller)
    const before = overlays.value

    fake.state.startingNote = startingNoteAt(FIRST_NOTE)
    fake.state.acknowledged = []
    fake.state.strugglingNotice = true
    expect(overlays.value).toBe(before)

    fake.state.acknowledged = [FIRST_NOTE]
    const lit = overlays.value
    expect(lit).not.toBe(before)
    expect(lit.acknowledged).toEqual([FIRST_NOTE])

    fake.state.startingNote = startingNoteAt(SECOND_NOTE)
    expect(overlays.value).not.toBe(lit)
    expect(overlays.value.startMarker).toEqual(SECOND_NOTE)
  })
})
