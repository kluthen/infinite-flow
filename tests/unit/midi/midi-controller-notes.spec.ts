/**
 * The notes the MIDI controller reads: only the selected, connected port's messages count, on every
 * channel; only a note-on with non-zero velocity is played; every other message is ignored; onsets
 * and releases are placed on the audio clock through a fresh clock anchor per message.
 */
import { describe, expect, it } from 'vitest'

import type { ClockAnchor } from '@/audio/audio-ports'
import { makeConcertPitch } from '@/domain/events/concert-pitch'
import type { MidiControllerChange } from '@/midi/midi-controller-state'
import type { PlayedNoteEvent } from '@/midi/played-note-tracker'

import {
  createControllerRig,
  KEYS_A,
  PAD_B,
  type ControllerRigOptions,
} from './midi-controller-rig'

const C4 = makeConcertPitch(60)
const E4 = makeConcertPitch(64)

/** Intent: a rig connected to KEYS_A, the only device present. */
async function connectedRig(options: ControllerRigOptions = {}) {
  const rig = createControllerRig({ devices: [KEYS_A], ...options })
  await rig.controller.connect()
  return rig
}

// @test-link [[rule_only_note_on_counts_as_played]]
// @test-link [[req_midi_controller_input]]
describe('MidiController: played notes', () => {
  it('plays a note-on with non-zero velocity on channel 0 and on channel 15', async () => {
    const { midi, notes, at } = await connectedRig()
    midi.noteOn(KEYS_A.id, 60, 90, at(1), 0)
    midi.noteOn(KEYS_A.id, 64, 40, at(1.5), 15)
    expect(notes).toEqual([
      { kind: 'played', note: { pitch: C4, velocity: 90, onsetAt: 1 } },
      { kind: 'played', note: { pitch: E4, velocity: 40, onsetAt: 1.5 } },
    ])
  })

  it('ends a note on its note-off, and on a note-on with velocity 0', async () => {
    const { midi, notes, at } = await connectedRig()
    midi.noteOn(KEYS_A.id, 60, 90, at(1))
    midi.noteOn(KEYS_A.id, 64, 80, at(1.25), 3)
    notes.length = 0
    midi.noteOff(KEYS_A.id, 60, at(2))
    midi.send(KEYS_A.id, [0x93, 64, 0], at(2.5))
    expect(notes).toEqual([
      { kind: 'ended', note: { pitch: C4, velocity: 90, onsetAt: 1, releaseAt: 2 } },
      { kind: 'ended', note: { pitch: E4, velocity: 80, onsetAt: 1.25, releaseAt: 2.5 } },
    ])
  })

  it('ends a held pitch at the onset of a new note-on for it', async () => {
    const { midi, notes, at } = await connectedRig()
    midi.noteOn(KEYS_A.id, 60, 90, at(1))
    midi.noteOn(KEYS_A.id, 60, 100, at(2), 7)
    expect(notes.slice(1)).toEqual([
      { kind: 'ended', note: { pitch: C4, velocity: 90, onsetAt: 1, releaseAt: 2 } },
      { kind: 'played', note: { pitch: C4, velocity: 100, onsetAt: 2 } },
    ])
  })

  it('ignores control change, pitch bend, aftertouch, program change and SysEx', async () => {
    const { midi, notes, at } = await connectedRig()
    midi.send(KEYS_A.id, [0xb0, 2, 64], at(1)) // control change (breath)
    midi.send(KEYS_A.id, [0xe0, 0, 64], at(1)) // pitch bend
    midi.send(KEYS_A.id, [0xd0, 50], at(1)) // channel aftertouch
    midi.send(KEYS_A.id, [0xa0, 60, 50], at(1)) // polyphonic aftertouch
    midi.send(KEYS_A.id, [0xc0, 5], at(1)) // program change
    midi.send(KEYS_A.id, [0xf0, 0x7e, 0x7f, 0x06, 0x01, 0xf7], at(1)) // SysEx
    expect(notes).toEqual([])
  })

  it('ignores a port that is no longer the selected one', async () => {
    const { midi, controller, notes, at } = createControllerRig({ devices: [KEYS_A, PAD_B] })
    await controller.connect()
    await controller.select(PAD_B.id)
    await controller.select(KEYS_A.id)
    midi.noteOn(PAD_B.id, 60, 90, at(1))
    expect(notes).toEqual([])
  })

  it('stops reporting to a note listener once it unsubscribes', async () => {
    const { midi, controller, at } = await connectedRig()
    const seen: PlayedNoteEvent[] = []
    const unsubscribe = controller.onPlayedNote((event) => seen.push(event))
    midi.noteOn(KEYS_A.id, 60, 90, at(1))
    unsubscribe()
    midi.noteOff(KEYS_A.id, 60, at(2))
    expect(seen).toHaveLength(1)
  })
})

// @test-link [[rule_only_note_on_counts_as_played]]
describe('MidiController: onsets and releases on the audio clock', () => {
  it('maps a message stamp onto the audio time it was played at', async () => {
    const { midi, notes, at } = await connectedRig({ performanceOffsetMs: 7_654.321 })
    midi.noteOn(KEYS_A.id, 60, 90, at(1.25))
    midi.noteOff(KEYS_A.id, 60, at(1.875))
    const ended = notes[1]
    expect(ended?.kind).toBe('ended')
    if (ended?.kind !== 'ended') return
    expect(ended.note.onsetAt).toBeCloseTo(1.25, 9)
    expect(ended.note.releaseAt).toBeCloseTo(1.875, 9)
  })

  it('reads a fresh clock anchor for every message', async () => {
    const anchors: ClockAnchor[] = [
      { audioTime: 10, performanceTimeMs: 1_000 },
      { audioTime: 20, performanceTimeMs: 1_000 },
    ]
    let reads = 0
    const anchor = () => {
      const reading = anchors[Math.min(reads, anchors.length - 1)]
      reads += 1
      if (reading === undefined) throw new Error('no anchor')
      return reading
    }
    const { midi, notes } = await connectedRig({ anchor })
    midi.noteOn(KEYS_A.id, 60, 90, 1_500)
    midi.noteOn(KEYS_A.id, 64, 90, 1_500)
    expect(notes.map((event) => event.note.onsetAt)).toEqual([10.5, 20.5])
  })

  it('ends every held note at the time releaseHeld() is given, and reports it', async () => {
    const { midi, controller, notes, at } = await connectedRig()
    midi.noteOn(KEYS_A.id, 60, 90, at(1))
    midi.noteOn(KEYS_A.id, 64, 80, at(1.5))
    notes.length = 0
    const ended = controller.releaseHeld(4)
    const expected = [
      { kind: 'ended', note: { pitch: C4, velocity: 90, onsetAt: 1, releaseAt: 4 } },
      { kind: 'ended', note: { pitch: E4, velocity: 80, onsetAt: 1.5, releaseAt: 4 } },
    ]
    expect(ended).toEqual(expected)
    expect(notes).toEqual(expected)
  })
})

/** Two anchors read 3 ms apart in wall time, the second one 3 ms behind the first on the audio clock. */
const ANCHOR_BEFORE: ClockAnchor = { audioTime: 10, performanceTimeMs: 1_000 }
const ANCHOR_BEHIND: ClockAnchor = { audioTime: 9.997, performanceTimeMs: 1_000 }

/** Intent: a rig connected to KEYS_A (and PAD_B, unselected) whose anchor the test sets per message. */
async function rigWithSetAnchor() {
  let reading = ANCHOR_BEFORE
  const rig = await connectedRig({ devices: [KEYS_A, PAD_B], anchor: () => reading })
  await rig.controller.select(KEYS_A.id)
  return {
    ...rig,
    setAnchor: (anchor: ClockAnchor) => {
      reading = anchor
    },
  }
}

describe('MidiController: message order is kept on the audio clock', () => {
  // @test-link [[rule_only_note_on_counts_as_played]]
  it('ends a note at its onset when the note-off maps earlier through a later anchor', async () => {
    const { midi, notes, setAnchor } = await rigWithSetAnchor()
    midi.noteOn(KEYS_A.id, 60, 90, 1_500)
    setAnchor(ANCHOR_BEHIND)
    expect(() => midi.noteOff(KEYS_A.id, 60, 1_501)).not.toThrow()
    expect(notes).toEqual([
      { kind: 'played', note: { pitch: C4, velocity: 90, onsetAt: 10.5 } },
      { kind: 'ended', note: { pitch: C4, velocity: 90, onsetAt: 10.5, releaseAt: 10.5 } },
    ])
  })

  // @test-link [[rule_only_note_on_counts_as_played]]
  it('ends the earlier note at its onset when a re-note-on maps earlier through a later anchor', async () => {
    const { midi, notes, setAnchor } = await rigWithSetAnchor()
    midi.noteOn(KEYS_A.id, 60, 90, 1_500)
    setAnchor(ANCHOR_BEHIND)
    expect(() => midi.noteOn(KEYS_A.id, 60, 100, 1_501)).not.toThrow()
    expect(notes.slice(1)).toEqual([
      { kind: 'ended', note: { pitch: C4, velocity: 90, onsetAt: 10.5, releaseAt: 10.5 } },
      { kind: 'played', note: { pitch: C4, velocity: 100, onsetAt: 10.5 } },
    ])
  })

  // @test-link [[rule_only_note_on_counts_as_played]]
  it('ends held notes at the last onset when the unplug maps earlier through a later anchor', async () => {
    const { midi, notes, setAnchor } = await rigWithSetAnchor()
    midi.noteOn(KEYS_A.id, 60, 90, 1_500)
    setAnchor(ANCHOR_BEHIND)
    expect(() => midi.unplug(KEYS_A.id, 1_501)).not.toThrow()
    expect(notes.slice(1)).toEqual([
      { kind: 'ended', note: { pitch: C4, velocity: 90, onsetAt: 10.5, releaseAt: 10.5 } },
    ])
  })

  // @test-link [[rule_only_note_on_counts_as_played]]
  it('keeps the mapped times of messages that already map in order', async () => {
    const { midi, notes, setAnchor } = await rigWithSetAnchor()
    midi.noteOn(KEYS_A.id, 60, 90, 1_500)
    setAnchor(ANCHOR_BEHIND)
    midi.noteOff(KEYS_A.id, 60, 1_600)
    const ended = notes[1]
    expect(ended?.kind).toBe('ended')
    if (ended?.kind !== 'ended') return
    expect(ended.note.onsetAt).toBe(10.5)
    expect(ended.note.releaseAt).toBeCloseTo(10.597, 9)
  })

  // @test-link [[rule_only_note_on_counts_as_played]]
  it('starts the order afresh on a newly selected device', async () => {
    const { midi, controller, notes, setAnchor } = await rigWithSetAnchor()
    midi.noteOn(KEYS_A.id, 60, 90, 1_500)
    midi.noteOff(KEYS_A.id, 60, 1_600)
    await controller.select(PAD_B.id)
    setAnchor(ANCHOR_BEHIND)
    midi.noteOn(PAD_B.id, 64, 80, 1_550)
    expect(notes[2]?.note.onsetAt).toBeCloseTo(10.547, 9)
  })
})

/** Intent: run one fixed script of plugs, picks, notes and unplugs; return what was reported. */
async function runScript(): Promise<{
  changes: MidiControllerChange[]
  notes: PlayedNoteEvent[]
}> {
  const { midi, controller, changes, notes, at } = createControllerRig({
    devices: [KEYS_A, PAD_B],
  })
  await controller.connect()
  await controller.select(KEYS_A.id)
  midi.noteOn(KEYS_A.id, 60, 90, at(1))
  midi.noteOn(KEYS_A.id, 64, 70, at(1.5), 9)
  midi.noteOff(KEYS_A.id, 60, at(2))
  midi.unplug(KEYS_A.id, at(2.5))
  midi.plug(KEYS_A, at(3))
  midi.noteOn(KEYS_A.id, 60, 50, at(3.5))
  controller.releaseHeld(4)
  return { changes, notes }
}

// @test-link [[req_midi_controller_input]]
describe('MidiController: repeatability', () => {
  it('reports the same changes and notes for the same script run twice', async () => {
    const first = await runScript()
    const second = await runScript()
    expect(second).toEqual(first)
    expect(first.notes).toHaveLength(6)
  })
})
