/**
 * v2.0 chunk 17, item 18: what a session started by the starting note records, on the workspace
 * harness's fake audio clock and fake MIDI access. The player starts with phrase 1's first note,
 * plays some of phrase 1's notes (one wrong pitch among them, and one held across into phrase 2)
 * and some of phrase 2's, then Stops. The closed history holds the starting note in no phrase, each
 * played note in the phrase its onset falls in with its pitch, velocity, onset and release, and
 * each phrase's acknowledgements. The same script on the fake clock and MIDI, run twice, records
 * the same history.
 */
import { expect, test, type Page } from '@playwright/test'

import { watchPageErrors } from '../controller/controller-helpers'
import { untilReady } from './rolling-helpers'
import { gotoSessionHarness, readyToStart, sessionAction, sessionState } from './session-helpers'
import {
  KEYS,
  clockTo,
  connectDevice,
  expectedNotesOf,
  generatedTimelines,
  idleTimeline,
  noteOff,
  noteOn,
  phraseStartsAt,
  type ExpectedNoteAt,
} from './session-midi-helpers'

let expectNoPageErrors: () => void

test.beforeEach(({ page }) => {
  expectNoPageErrors = watchPageErrors(page)
})

test.afterEach(() => expectNoPageErrors())

/** One note the script plays: pitch, velocity, onset and release on the audio clock. */
interface ScriptedNote {
  readonly pitch: number
  readonly velocity: number
  readonly onsetAt: number
  readonly releaseAt: number
}

/** What one run of the script played, and what the closed history recorded. */
interface ScriptRun {
  readonly startingNote: ScriptedNote
  readonly phraseOne: { readonly played: ScriptedNote[]; readonly acked: ExpectedNoteAt[] }
  readonly phraseTwo: { readonly played: ScriptedNote[]; readonly acked: ExpectedNoteAt[] }
  readonly timelines: readonly [string, string]
  /** When phrases 1 and 2 started, on the audio clock. */
  readonly phraseStarts: readonly [number, number]
  readonly history: readonly WorkspaceHarnessHistoryPhrase[]
  readonly lastEnd: WorkspaceHarnessSessionState['lastEnd']
}

/** Intent: play one note from its onset to its release, moving the clock to each. */
async function playNote(page: Page, note: ScriptedNote): Promise<void> {
  await clockTo(page, note.onsetAt)
  await noteOn(page, KEYS, note.pitch, { velocity: note.velocity, at: note.onsetAt })
  await clockTo(page, note.releaseAt)
  await noteOff(page, KEYS, note.pitch, note.releaseAt)
}

/** Intent: a played expected note: its pitch, at its onset, held `holdFor` seconds. */
function asPlayed(note: ExpectedNoteAt, velocity: number, holdFor = 0.1): ScriptedNote {
  return { pitch: note.pitch, velocity, onsetAt: note.onsetAt, releaseAt: note.onsetAt + holdFor }
}

/**
 * Intent: run the whole script on a fresh page: connect, start with the starting note (released
 * in the count-in), play phrase 1's first and third notes, a wrong pitch on its second, its last
 * note held into phrase 2, then phrase 2's second and third notes, and Stop.
 */
async function runScript(page: Page): Promise<ScriptRun> {
  await gotoSessionHarness(page)
  await connectDevice(page, KEYS)
  await readyToStart(page)
  const phraseOneTimeline = await idleTimeline(page)
  const generatedBefore = (await generatedTimelines(page)).length
  const starting = (await sessionState(page)).startingNote
  if (starting === null) throw new Error('no starting note is named')

  const startedAt = await noteOn(page, KEYS, starting.concertPitch, { velocity: 64 })
  expect((await sessionState(page)).phase).toBe('count-in')
  const startingNote = {
    pitch: starting.concertPitch,
    velocity: 64,
    onsetAt: startedAt,
    releaseAt: startedAt + 0.4,
  }
  await clockTo(page, startingNote.releaseAt)
  await noteOff(page, KEYS, starting.concertPitch, startingNote.releaseAt)

  await untilReady(page, 2)
  const phraseTwoTimeline = (await generatedTimelines(page))[generatedBefore]
  if (phraseTwoTimeline === undefined) throw new Error('phrase 2 was not generated')
  const phraseOneAt = await phraseStartsAt(page, 1)
  const phraseTwoAt = await phraseStartsAt(page, 2)
  const one = expectedNotesOf(phraseOneTimeline, 1, phraseOneAt)
  const two = expectedNotesOf(phraseTwoTimeline, 2, phraseTwoAt)
  expect(one.length).toBeGreaterThanOrEqual(5)
  expect(two.length).toBeGreaterThanOrEqual(3)

  const last = one.at(-1)!
  const phraseOne = {
    played: [
      asPlayed(one[0]!, 70),
      // A wrong pitch on the second note: recorded, never acknowledged.
      { ...asPlayed(one[1]!, 75), pitch: one[1]!.pitch + 1 },
      asPlayed(one[2]!, 80),
      // Held across the phrase boundary: its onset puts it in phrase 1.
      { ...asPlayed(last, 85), releaseAt: phraseTwoAt + 0.05 },
    ],
    acked: [one[0]!, one[2]!, last],
  }
  const phraseTwo = {
    played: [asPlayed(two[1]!, 90), asPlayed(two[2]!, 95)],
    acked: [two[1]!, two[2]!],
  }
  for (const note of [...phraseOne.played, ...phraseTwo.played]) await playNote(page, note)

  await sessionAction(page).click()
  await expect.poll(async () => (await sessionState(page)).phase).toBe('idle')
  const state = await sessionState(page)
  if (state.lastHistoryPhrases === null) throw new Error('no history was closed')
  return {
    startingNote,
    phraseOne,
    phraseTwo,
    timelines: [phraseOneTimeline, phraseTwoTimeline],
    phraseStarts: [phraseOneAt, phraseTwoAt],
    history: state.lastHistoryPhrases,
    lastEnd: state.lastEnd,
  }
}

/** Intent: assert recorded notes equal the scripted ones, times to within a microsecond. */
function expectNotes(
  recorded: readonly WorkspaceHarnessRecordedPlayedNote[],
  scripted: readonly ScriptedNote[],
  message: string,
): void {
  expect(
    recorded.map((n) => [n.pitch, n.velocity]),
    message,
  ).toEqual(scripted.map((n) => [n.pitch, n.velocity]))
  recorded.forEach((note, index) => {
    expect(note.onsetAt, `${message}, onset ${index}`).toBeCloseTo(scripted[index]!.onsetAt, 6)
    expect(note.releaseAt, `${message}, release ${index}`).toBeCloseTo(
      scripted[index]!.releaseAt,
      6,
    )
  })
}

/** Intent: a history with every time rounded to the nanosecond, to compare two runs. */
function rounded(history: readonly WorkspaceHarnessHistoryPhrase[]): unknown {
  const round = (t: number): number => Math.round(t * 1e9) / 1e9
  return history.map((phrase) => ({
    ...phrase,
    startedAt: round(phrase.startedAt),
    playedNotes: phrase.playedNotes.map((note) => ({
      ...note,
      onsetAt: round(note.onsetAt),
      releaseAt: round(note.releaseAt),
    })),
  }))
}

// @test-link [[rule_session_history_records_played_notes]]
// @test-link [[rule_starting_note_only_starts_count_in]]
test.describe('the history of a session started by the starting note', () => {
  // @test-link [[rule_session_history_records_played_notes]]
  // @test-link [[rule_starting_note_only_starts_count_in]]
  test('played notes and acknowledgements in their phrases, the starting note in none; twice the same', async ({
    page,
  }) => {
    test.setTimeout(120_000)
    const first = await runScript(page)

    expect(first.lastEnd).toEqual({ cause: 'stop', phase: 'running', soundedPhraseCount: 2 })
    expect(first.history.map((phrase) => phrase.phraseNumber)).toEqual([1, 2])
    expect(first.history.map((phrase) => phrase.timeline)).toEqual([...first.timelines])
    const [one, two] = first.history
    expect(one!.startedAt).toBeCloseTo(first.phraseStarts[0], 6)
    expect(two!.startedAt).toBeCloseTo(first.phraseStarts[1], 6)

    // The starting note's onset falls before phrase 1, so it is in no phrase.
    expect(first.startingNote.onsetAt).toBeLessThan(first.phraseStarts[0])
    for (const phrase of first.history) {
      expect(
        phrase.playedNotes.some(
          (note) => Math.abs(note.onsetAt - first.startingNote.onsetAt) < 1e-6,
        ),
        `phrase ${phrase.phraseNumber} holds no starting note`,
      ).toBe(false)
    }
    expectNotes(one!.playedNotes, first.phraseOne.played, 'phrase 1')
    expectNotes(two!.playedNotes, first.phraseTwo.played, 'phrase 2')
    expect(one!.acknowledgements).toEqual(first.phraseOne.acked.map((note) => note.identity))
    expect(two!.acknowledgements).toEqual(first.phraseTwo.acked.map((note) => note.identity))

    const second = await runScript(page)

    expect(second.lastEnd).toEqual(first.lastEnd)
    expect(rounded(second.history)).toEqual(rounded(first.history))
  })
})
