/**
 * The arranger on a hand-built phrase: one part per system voice in the fixed voice order, the
 * backing's and the guides' parts converted from their renderers' unchanged output, the four
 * accompaniment parts present and empty while their rules are unbuilt; pure, frozen and the same
 * for the same phrase; an unknown arranger version rejected.
 */

import { describe, expect, it } from 'vitest'

import {
  ARRANGER_VERSION,
  AccompanimentArrangerError,
  arrangeAccompaniment,
  type AccompanimentSettings,
} from '@/domain/backing/accompaniment-arranger'
import {
  ACCOMPANIMENT_VOICES,
  PART_VOICES,
  VOICE_PLACES,
  backingParts,
  guideParts,
  type ArrangerPhrase,
} from '@/domain/backing/accompaniment-part'
import { renderBacking } from '@/domain/backing/backing-renderer'
import { renderGuide } from '@/domain/backing/guide-renderer'
import { makeConcertPitch } from '@/domain/events/concert-pitch'
import { makeMeasure } from '@/domain/events/measure'
import { makeNoteEvent, makeRestEvent } from '@/domain/events/measure-event'
import { makeConcertEventTimeline } from '@/domain/events/timeline'
import { FOUR_FOUR_METER } from '@/domain/generation/generation-request'
import { makeHarmonyCollection } from '@/domain/harmony/collection'
import type { DiatonicTriad, HarmonyEvent } from '@/domain/harmony/harmony-types'
import { makeRegisterWindow } from '@/domain/profile/register-window'
import { makeSeed } from '@/domain/random/seed'
import { makeRational } from '@/domain/time/rational'

const C_MAJOR: DiatonicTriad = { degree: 1, pitchClasses: [0, 4, 7], quality: 'major' }
const G_MAJOR: DiatonicTriad = { degree: 5, pitchClasses: [7, 11, 2], quality: 'major' }

const SETTINGS: AccompanimentSettings = { arrangerVersion: ARRANGER_VERSION }

/** C major for three measures, G with its seventh for the last. */
const HARMONY: readonly HarmonyEvent[] = [
  {
    barIndex: 0,
    startBeat: 0,
    durationBeats: 12,
    triad: C_MAJOR,
    role: 'tonic',
    templateId: 'test',
    barRoles: [],
  },
  {
    barIndex: 3,
    startBeat: 0,
    durationBeats: 4,
    triad: G_MAJOR,
    seventh: { pitchClass: 5, quality: 'dominant-seventh' },
    role: 'open_arrival',
    templateId: 'test',
    barRoles: [],
  },
]

/** A phrase of half notes and half rests in C major, in the Middle window of a C keyboard. */
const PHRASE: ArrangerPhrase = {
  timeline: makeConcertEventTimeline(
    [0, 1, 2, 3].map((index) =>
      makeMeasure(index, [
        makeNoteEvent({
          duration: makeRational(1, 2),
          pitch: makeConcertPitch([60, 64, 67, 65][index]!),
          tieContinuation: false,
        }),
        makeRestEvent({ duration: makeRational(1, 2) }),
      ]),
    ),
  ),
  harmony: HARMONY,
  window: { register: 'Middle', range: makeRegisterWindow(57, 69) },
  scale: makeHarmonyCollection('C', 'Major'),
  seed: makeSeed(20261124),
}

describe('arrangeAccompaniment', () => {
  // @test-link [[module_accompaniment_arranger]]
  // @test-link [[entity_accompaniment_part]]
  it('gives one part per system voice, in voice order, each with its role and channel', () => {
    const parts = arrangeAccompaniment(PHRASE, SETTINGS)
    expect(parts.map((part) => part.voice)).toEqual([...ACCOMPANIMENT_VOICES])
    for (const part of parts) {
      expect({ role: part.role, channel: part.channel }).toEqual(VOICE_PLACES[part.voice])
    }
  })

  // @test-link [[module_accompaniment_arranger]]
  // @test-link [[req_session_backing_track]]
  // @test-link [[req_guide_playback]]
  it("carries the backing's and the guides' renderers' notes, converted unchanged", () => {
    const parts = arrangeAccompaniment(PHRASE, SETTINGS)
    expect(parts.slice(0, 2)).toEqual(backingParts(renderBacking(HARMONY, FOUR_FOUR_METER)))
    expect(parts.slice(2, 4)).toEqual(guideParts(renderGuide(PHRASE.timeline, HARMONY)))
    expect(parts[0]!.notes.length).toBeGreaterThan(0)
    expect(parts[2]!.notes).toHaveLength(4)
  })

  // @test-link [[rule_part_rests_when_no_note_fits]]
  // @test-link [[req_accompaniment_parts]]
  it('gives the four accompaniment parts, empty while their rules are unbuilt', () => {
    const parts = arrangeAccompaniment(PHRASE, SETTINGS)
    expect(parts.slice(4).map((part) => [part.voice, part.notes])).toEqual(
      PART_VOICES.map((voice) => [voice, []]),
    )
  })

  // @test-link [[rule_parts_deterministic]]
  // @test-link [[rule_parts_rendered_from_phrase_alone]]
  it('renders the same phrase to equal, frozen parts without mutating its input', () => {
    const snapshot = structuredClone(PHRASE)
    const first = arrangeAccompaniment(PHRASE, SETTINGS)
    expect(arrangeAccompaniment(structuredClone(PHRASE), { ...SETTINGS })).toEqual(first)
    expect(PHRASE).toEqual(snapshot)
    expect(Object.isFrozen(first)).toBe(true)
    expect(Object.isFrozen(first[0])).toBe(true)
    expect(Object.isFrozen(first[0]!.notes[0])).toBe(true)
  })

  // @test-link [[module_accompaniment_arranger]]
  it('rejects an arranger version it does not have', () => {
    const later = JSON.parse('{ "arrangerVersion": 2 }') as AccompanimentSettings
    expect(() => arrangeAccompaniment(PHRASE, later)).toThrow(AccompanimentArrangerError)
  })
})
