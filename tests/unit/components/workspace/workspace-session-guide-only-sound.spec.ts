/**
 * The guides change only what is heard: one played session, run on fresh rigs with the same calls
 * in the same order, acknowledges, records, keeps and exports exactly the same with both guides on
 * (switched on before Start), with a guide switched on mid-session and off again later, and with
 * both off. The keyboard plays expected notes of phrase 1 at their onsets, one wrong pitch, and a
 * note of phrase 2. On the fake audio clock at 240 BPM from 5 s: the count-in runs from 5.1 s to
 * 6.1 s, phrase 1 sounds from 6.1 s, phrase 2 from 10.1 s.
 */
import { describe, expect, it, vi } from 'vitest'

import type { ExpectedNote, ExpectedNoteIdentity } from '@/domain/acknowledgement/expected-note'
import {
  buildGeneratedNotesFile,
  buildPlayedNotesFile,
  type ExportableHistory,
  type ExportFile,
} from '@/export/generated-notes-file'
import type { SessionHistory } from '@/session/session-history'
import type { StorageChange } from '@/storage/storage-port'
import {
  controllerRig,
  flush,
  outputsOf,
  playTo,
  type ControllerRig,
} from './session-controller-rig'
import { connectKeys, expectedNotesOf, lift, press } from './session-controller-midi'
import { endState, phraseStart } from './session-controller-timeline'

/** How the guides are switched in a run. */
type GuideMode = 'off' | 'on' | 'switched-mid-session'

/** How long each played note is held: well over the 38 ms the played-notes export drops. */
const HOLD = 0.1

/** How many expected notes of phrase 1 the keyboard plays. */
const PHRASE_ONE_PLAYED = 4

/** What a run left behind, for comparing runs. */
interface Run {
  readonly rig: ControllerRig
  /** The acknowledged notes the controller showed after each press, in order. */
  readonly acknowledged: (readonly ExpectedNoteIdentity[])[]
  readonly history: SessionHistory
  readonly batch: readonly StorageChange[]
}

/**
 * Intent: play `pitch` at `onset`, which is still to come, hold it for HOLD seconds, then release
 * it; snapshots what the screen acknowledged right after the press.
 */
async function playNote(
  rig: ControllerRig,
  pitch: number,
  onset: number,
  snapshots: Run['acknowledged'],
): Promise<void> {
  if (rig.audioRig.now() > onset) throw new Error(`the note at ${onset} s is already past`)
  await playTo(rig, onset)
  press(rig, pitch)
  snapshots.push(rig.controller.state.acknowledged)
  await playTo(rig, rig.audioRig.now() + HOLD)
  lift(rig, pitch)
}

/**
 * Intent: the first `count` expected notes to play, in order, each leaving room after the previous
 * one for its own hold and a wrong note's.
 */
function playable(notes: readonly ExpectedNote[], count: number): readonly ExpectedNote[] {
  const picked: ExpectedNote[] = []
  for (const note of notes) {
    const previous = picked.at(-1)
    if (previous !== undefined && note.onsetSeconds < previous.onsetSeconds + 2 * HOLD + 0.01)
      continue
    picked.push(note)
    if (picked.length === count) break
  }
  return picked
}

/**
 * Intent: play one session on a fresh rig with the guides switched as `mode` says, the keyboard's
 * notes the same in every mode: expected notes of phrase 1 at their onsets, a wrong pitch between
 * two of them, the first expected note of phrase 2; then play past phrase 2's start, Stop.
 */
async function run(mode: GuideMode): Promise<Run> {
  const rig = controllerRig(undefined, undefined, { savedKeepPlayedNotes: true })
  const acknowledged: Run['acknowledged'] = []
  await connectKeys(rig)
  if (mode === 'on') {
    rig.transport.setGuideOn('melody-guide', true)
    rig.transport.setGuideOn('rhythm-guide', true)
  }
  rig.controller.start()

  const phraseOne = expectedNotesOf(rig, 1, rig.phraseOne.outcome.result.timeline)
  const played = playable(phraseOne, PHRASE_ONE_PLAYED)
  const pitches = new Set(phraseOne.map((note) => note.pitch))
  const wrongPitch = Math.max(...pitches) + 1
  for (const [index, note] of played.entries()) {
    await playNote(rig, note.pitch, note.onsetSeconds, acknowledged)
    // Phrase 1 has started: the mid-session run switches the melody guide on here.
    if (index === 0 && mode === 'switched-mid-session') {
      rig.transport.setGuideOn('melody-guide', true)
    }
    if (index === 1) await playNote(rig, wrongPitch, rig.audioRig.now(), acknowledged)
  }

  await playTo(rig, 10)
  const [ready] = outputsOf(rig, 'phrase-ready')
  if (ready === undefined) throw new Error('phrase 2 was never readied')
  const [phraseTwoNote] = expectedNotesOf(rig, 2, ready.phrase.outcome.result.timeline)
  if (phraseTwoNote === undefined) throw new Error('phrase 2 has no expected note')
  await playNote(rig, phraseTwoNote.pitch, phraseTwoNote.onsetSeconds, acknowledged)
  // Later, in phrase 2: the mid-session run switches the melody guide off again.
  if (mode === 'switched-mid-session') rig.transport.setGuideOn('melody-guide', false)

  await playTo(rig, phraseStart(2) + 1.5)
  rig.controller.stop()
  await flush()

  const history = rig.controller.state.lastHistory
  if (history === null) throw new Error('the session left no history')
  // The session's save is asked for once its end settles, which may take more than one flush.
  await vi.waitFor(() => expect(rig.sessionSaves).toHaveLength(1))
  const save = rig.sessionSaves[0]
  if (save === undefined) throw new Error('no session save was asked for')
  return { rig, acknowledged, history, batch: save([]) }
}

/** Intent: what a run's history holds per phrase: acknowledgements, played notes, outcome. */
function phrasesOf(history: SessionHistory): unknown {
  return history.phrases().map((phrase) => ({
    acknowledgements: phrase.acknowledgements,
    playedNotes: phrase.playedNotes,
    outcome: phrase.outcome,
  }))
}

/** Intent: a run's four exports, as file names and plain byte lists for an exact comparison. */
function exportsOf(history: ExportableHistory): unknown {
  const files: Record<string, ExportFile> = {
    midi: buildGeneratedNotesFile(history, { format: 'midi', backingTrack: false }),
    midiWithBacking: buildGeneratedNotesFile(history, { format: 'midi', backingTrack: true }),
    musicXml: buildGeneratedNotesFile(history, { format: 'musicxml', backingTrack: false }),
    played: buildPlayedNotesFile(history),
  }
  return Object.fromEntries(
    Object.entries(files).map(([name, file]) => [
      name,
      { fileName: file.fileName, bytes: [...file.bytes] },
    ]),
  )
}

/** Intent: expect `run` to acknowledge, record and keep exactly what `off` did. */
function expectSameSession(run: Run, off: Run): void {
  expect(run.acknowledged).toEqual(off.acknowledged)
  expect(phrasesOf(run.history)).toEqual(phrasesOf(off.history))
  expect(run.batch).toEqual(off.batch)
}

// @test-link [[rule_guide_changes_only_sound]]
// @test-link [[rule_guide_never_exported]]
describe('session controller: the guides change only what is heard', () => {
  // @test-link [[rule_guide_changes_only_sound]]
  it('acknowledges, times, generates and keeps the same session with both guides on as off', async () => {
    const on = await run('on')
    const off = await run('off')

    expect(on.rig.audioRig.audibleGuide().map((note) => note.role)).toEqual(
      expect.arrayContaining(['melody-guide', 'rhythm-guide']),
    )
    expect(off.rig.audioRig.guideNotes()).toEqual([])
    expect(off.acknowledged.flat()).not.toEqual([])
    expect(off.history.phrases().flatMap((phrase) => phrase.acknowledgements)).not.toEqual([])
    // Phrase 1: its played expected notes and the wrong pitch; phrase 2: its one played note.
    expect(off.history.phrases().map((phrase) => phrase.playedNotes.length)).toEqual([
      PHRASE_ONE_PLAYED + 1,
      1,
    ])

    expectSameSession(on, off)
    expect(on.rig.outputs).toEqual(off.rig.outputs)
    expect(on.rig.events).toEqual(off.rig.events)
    expect(endState(on.rig)).toEqual(endState(off.rig))
    expect(on.rig.sessionSeedsDrawn).toEqual(off.rig.sessionSeedsDrawn)
  })

  // @test-link [[rule_guide_never_exported]]
  it('exports byte for byte the same generated-notes and played-notes files with both guides on as off', async () => {
    const on = await run('on')
    const off = await run('off')

    expect(on.rig.audioRig.audibleGuide()).not.toEqual([])
    // Equal bytes also show no MIDI file holds an extra (guide) track.
    expect(exportsOf(on.history)).toEqual(exportsOf(off.history))
  })

  // @test-link [[rule_guide_changes_only_sound]]
  // @test-link [[rule_guide_never_exported]]
  it('acknowledges, records and exports the same with a guide switched on mid-session and off later', async () => {
    const switched = await run('switched-mid-session')
    const off = await run('off')

    const heard = switched.rig.audioRig.audibleGuide()
    expect(heard).not.toEqual([])
    expect(heard.every((note) => note.role === 'melody-guide')).toBe(true)
    expectSameSession(switched, off)
    expect(switched.rig.outputs).toEqual(off.rig.outputs)
    expect(switched.rig.events).toEqual(off.rig.events)
    // Equal bytes also show no MIDI file holds an extra (guide) track.
    expect(exportsOf(switched.history)).toEqual(exportsOf(off.history))
  })
})
