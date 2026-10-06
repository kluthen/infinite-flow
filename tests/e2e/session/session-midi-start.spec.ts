/**
 * v2.0 chunk 17, item 17: the starting note, on the workspace harness's fake audio clock and fake
 * MIDI access. At Ready with a controller connected, the start line names phrase 1's first
 * attacked note in the profile's written pitch (as the staff spells it), and playing that note at
 * its exact concert pitch starts the count-in, as Start does, shown beat by beat with its clicks
 * and phrase 1's first measure in view throughout. Any other pitch, the same pitch an
 * octave off, a note with no controller attached (never connected, or away), and the note played
 * in the item-22 states (a generation running, the generation-failure banner, a notation error,
 * the room notice) start nothing and change nothing, and the line is absent in each.
 */
import { expect, test, type Page } from '@playwright/test'

import { audioEvents } from '../audio/audio-harness-helpers'
import {
  FORM,
  chooseProfile,
  clickControllerStatus,
  sheet,
  sheetAction,
  statusForm,
  watchPageErrors,
} from '../controller/controller-helpers'
import {
  awaitIdle,
  failNextGeneration,
  failNextNotation,
  holdGeneration,
  queueSeeds,
  releaseGeneration,
  roomNotice,
} from '../release/harness-helpers'
import {
  expectCountInWithClicks,
  gotoSessionHarness,
  phraseAction,
  readyToStart,
  sessionAction,
  sessionState,
  sessionTimeline,
} from './session-helpers'
import {
  KEYS,
  PAD,
  connectDevice,
  firstAttack,
  midiKind,
  noteOff,
  noteOn,
  plugIn,
  startLine,
  tap,
  unplugNow,
} from './session-midi-helpers'

let expectNoPageErrors: () => void

test.beforeEach(({ page }) => {
  expectNoPageErrors = watchPageErrors(page)
})

test.afterEach(() => expectNoPageErrors())

/** Semitones above C of each natural letter. */
const LETTER_SEMITONES: Readonly<Record<string, number>> = {
  C: 0,
  D: 2,
  E: 4,
  F: 5,
  G: 7,
  A: 9,
  B: 11,
}

/** Intent: the MIDI number of a label such as `B♭4` (octave 4 starting on middle C, MIDI 60). */
function labelMidi(label: string): number {
  const match = /^([A-G])(𝄫|𝄪|♭|♯)?(-?\d+)$/u.exec(label)
  if (match === null) throw new Error(`not a pitch label: "${label}"`)
  const alter = { '𝄫': -2, '♭': -1, '♯': 1, '𝄪': 2 }[match[2] ?? ''] ?? 0
  return (Number(match[3]) + 1) * 12 + LETTER_SEMITONES[match[1]!]! + alter
}

/** Intent: a label in the words the staff's text description uses (`B♭4` → `B flat 4`). */
function labelWords(label: string): string {
  return label
    .replace(/𝄪/gu, ' double sharp ')
    .replace(/𝄫/gu, ' double flat ')
    .replace(/♯/gu, ' sharp ')
    .replace(/♭/gu, ' flat ')
    .replace(/([A-G])(\d)/u, '$1 $2')
    .replace(/\s+/gu, ' ')
    .trim()
}

/**
 * Intent: the first written note the staff shows, as its text description words it (`B flat 4`):
 * the first token of the measures that is neither a chord announcement nor a rest, without its
 * duration or a displayed natural.
 */
async function staffFirstNoteWords(page: Page): Promise<string> {
  const measures = await page.locator('.staff-frame .score-description li').allTextContents()
  const tokens = measures.flatMap((text) =>
    text
      .replace(/^Measure \d: /u, '')
      .replace(/\.$/u, '')
      .split(/; |, /u),
  )
  const note = tokens.find(
    (token) => !/^(chord |rest |tied to next)/u.test(token) && /\d/u.test(token),
  )
  const match = note === undefined ? null : /^(.+?) (-?\d+) /u.exec(note)
  if (match === null) throw new Error(`no written note in the description: ${measures.join(' ')}`)
  return `${match[1]!.replace(/ natural$/u, '')} ${match[2]}`
}

/**
 * Intent: what the workspace shows and holds, to compare before and after a note: the phrase,
 * the operation, the engravings, the header actions, the session's state and every recorded audio
 * call (a start schedules count-in clicks).
 */
async function workspaceState(page: Page): Promise<unknown> {
  const snapshot = await page.evaluate(() => window.__workspaceHarness.snapshot())
  const state = await sessionState(page)
  return {
    seed: snapshot.seed,
    requestId: snapshot.requestId,
    timeline: snapshot.timeline,
    operation: snapshot.operation,
    engravings: await page.evaluate(() => window.__workspaceHarness.engravings()),
    phraseAction: await phraseAction(page).textContent(),
    sessionAction: await sessionAction(page).textContent(),
    phase: state.phase,
    countIn: state.countIn,
    lastEnd: state.lastEnd,
    startingNote: state.startingNote,
    cueRow: await page.locator('.session-cue-row').innerHTML(),
    audio: await audioEvents(page),
    running: await page.evaluate(() => window.__workspaceHarness.audio.isRunning()),
  }
}

/** Intent: play `pitches` on `device`, one tap each, now, and assert nothing changed at all. */
async function expectNotesChangeNothing(
  page: Page,
  device: WorkspaceHarnessMidiDevice,
  pitches: readonly number[],
): Promise<void> {
  const before = await workspaceState(page)
  for (const pitch of pitches) {
    await tap(page, device, pitch)
    expect(await workspaceState(page), `after pitch ${pitch}`).toEqual(before)
  }
  expect((await sessionState(page)).phase).toBe('idle')
  await expect(page.locator('ol.count-in')).toHaveCount(0)
}

/** The two profiles checked: the default B-flat tenor saxophone (transposing) and a C keyboard. */
const PROFILES = [
  { name: null, title: 'B-flat tenor saxophone', chromatic: 14 },
  { name: 'C MIDI keyboard', title: 'C MIDI keyboard', chromatic: 0 },
] as const

// @test-link [[rule_midi_starting_note]]
// @test-link [[rule_starting_note_named]]
test.describe('the starting note at Ready with a controller connected', () => {
  for (const profile of PROFILES) {
    // @test-link [[rule_midi_starting_note]]
    // @test-link [[rule_starting_note_named]]
    test(`${profile.title}: the line names phrase 1's first note, which starts the count-in`, async ({
      page,
    }) => {
      await gotoSessionHarness(page)
      if (profile.name !== null) await chooseProfile(page, profile.name)
      await connectDevice(page, KEYS)
      await readyToStart(page)
      const first = await firstAttack(page)

      const { startingNote } = await sessionState(page)
      expect(startingNote?.identity).toEqual(first.identity)
      expect(startingNote?.concertPitch).toBe(first.pitch)
      const label = startingNote?.label ?? ''
      // Named in written pitch: the concert pitch transposed by the profile, spelled as the staff.
      expect(labelMidi(label)).toBe(first.pitch + profile.chromatic)
      expect(labelWords(label)).toBe(await staffFirstNoteWords(page))
      await expect(startLine(page)).toHaveText(`Play this note to start: ${label}`)
      await expect(startLine(page).locator('strong')).toHaveText(label)
      await expect(page.locator('.staff-frame .start-note-marker')).toHaveCount(1)

      const playedAt = await noteOn(page, KEYS, first.pitch)

      await expect(sessionAction(page)).toHaveText('Stop')
      const state = await sessionState(page)
      expect(state.phase).toBe('count-in')
      expect(state.sessionHasController).toBe(true)
      await expect(page.locator('ol.count-in')).toBeVisible()
      await expect(startLine(page)).toHaveCount(0)
      await expect(page.locator('.staff-frame .start-note-marker')).toHaveCount(0)
      expect((await sessionTimeline(page)).startAt).toBeGreaterThanOrEqual(playedAt)
      expect(await page.evaluate(() => window.__workspaceHarness.audio.isRunning())).toBe(true)
      await noteOff(page, KEYS, first.pitch)
      await sessionAction(page).click()
    })
  }

  // @test-link [[rule_midi_starting_note]]
  test('another pitch, or the starting pitch an octave off, starts nothing', async ({ page }) => {
    await gotoSessionHarness(page)
    await connectDevice(page, KEYS)
    await readyToStart(page)
    const { pitch } = await firstAttack(page)
    await expect(startLine(page)).toBeVisible()

    await expectNotesChangeNothing(page, KEYS, [pitch + 1, pitch - 1, pitch + 12, pitch - 12])

    await expect(startLine(page)).toBeVisible()
  })
})

// @test-link [[rule_count_in_shown_on_screen]]
// @test-link [[rule_midi_starting_note]]
test('a count-in started by the starting note lights beat by beat with its clicks, phrase 1 in view', async ({
  page,
}) => {
  await gotoSessionHarness(page)
  await connectDevice(page, KEYS)
  await readyToStart(page)
  const first = await firstAttack(page)

  await tap(page, KEYS, first.pitch)

  await expect(sessionAction(page)).toHaveText('Stop')
  expect((await sessionState(page)).phase).toBe('count-in')
  await expectCountInWithClicks(page)
  await sessionAction(page).click()
  expect((await sessionState(page)).phase).toBe('idle')
})

// @test-link [[rule_midi_starting_note]]
// @test-link [[rule_starting_note_named]]
test.describe('no controller attached: no line, and no note starts anything', () => {
  // @test-link [[rule_midi_starting_note]]
  // @test-link [[rule_starting_note_named]]
  test('a device plugged in but never connected: its notes never reach the page', async ({
    page,
  }) => {
    await gotoSessionHarness(page)
    await plugIn(page, KEYS)
    await readyToStart(page)
    const { pitch } = await firstAttack(page)
    const before = await workspaceState(page)

    expect((await sessionState(page)).startingNote).toBeNull()
    await expect(startLine(page)).toHaveCount(0)
    // As in a browser, a port the page never opened delivers nothing (stamped at 0: no
    // connection unlocked the audio clock).
    await expect(tap(page, KEYS, pitch, 0)).rejects.toThrow(/not open/)
    expect(await workspaceState(page)).toEqual(before)
    expect(await page.evaluate(() => window.__workspaceHarness.midi.playedNotes())).toEqual([])
  })

  // @test-link [[rule_midi_starting_note]]
  // @test-link [[rule_starting_note_named]]
  test('disconnected by the player, its port still open', async ({ page }) => {
    await gotoSessionHarness(page)
    await connectDevice(page, KEYS)
    await readyToStart(page)
    const { pitch } = await firstAttack(page)
    await expect(startLine(page)).toBeVisible()

    await clickControllerStatus(page)
    await sheetAction(page, 'Disconnect').click()
    await expect(sheet(page)).toBeHidden()
    await expect.poll(() => statusForm(page)).toEqual(FORM.noController)

    expect((await sessionState(page)).startingNote).toBeNull()
    await expect(startLine(page)).toHaveCount(0)
    await expect(page.locator('.staff-frame .start-note-marker')).toHaveCount(0)
    await expectNotesChangeNothing(page, KEYS, [pitch])
  })

  // @test-link [[rule_midi_starting_note]]
  // @test-link [[rule_starting_note_named]]
  test('the selected device away, another open one played', async ({ page }) => {
    await gotoSessionHarness(page)
    // The pad was connected first, then the keyboard chosen: the pad's port stays open, unread.
    await connectDevice(page, PAD)
    await plugIn(page, KEYS)
    await page.evaluate((id) => window.__workspaceHarness.midi.select(id), KEYS.id)
    await expect.poll(() => midiKind(page)).toBe('connected')
    await readyToStart(page)
    const { pitch } = await firstAttack(page)
    await expect(startLine(page)).toBeVisible()

    await unplugNow(page, KEYS)
    await expect.poll(() => midiKind(page)).toBe('away')

    expect((await sessionState(page)).startingNote).toBeNull()
    await expect(startLine(page)).toHaveCount(0)
    await expect(page.locator('.staff-frame .start-note-marker')).toHaveCount(0)
    await expectNotesChangeNothing(page, PAD, [pitch])
    expect(await page.evaluate(() => window.__workspaceHarness.midi.state())).toEqual({
      kind: 'away',
      device: KEYS,
    })
  })
})

/** One item-22 state: how to reach it from Ready, and how to leave it. */
interface BlockedState {
  readonly name: string
  readonly reach: (page: Page) => Promise<void>
  readonly leave?: (page: Page) => Promise<void>
}

const ITEM_22_STATES: readonly BlockedState[] = [
  {
    name: 'a generation running (Loading)',
    reach: async (page) => {
      await holdGeneration(page)
      await queueSeeds(page, [8])
      await phraseAction(page).click()
      await expect
        .poll(
          async () => (await page.evaluate(() => window.__workspaceHarness.snapshot())).operation,
        )
        .toBe('generating')
    },
    leave: async (page) => {
      await releaseGeneration(page)
      await awaitIdle(page)
    },
  },
  {
    name: 'the generation-failure banner over the retained phrase',
    reach: async (page) => {
      await failNextGeneration(page, 'search_limit_exceeded')
      await phraseAction(page).click()
      await expect(page.locator('.score-panel > .inline-alert.alert-error')).toBeVisible()
      await awaitIdle(page)
    },
  },
  {
    name: 'a notation error',
    reach: async (page) => {
      await failNextNotation(page)
      await page.setViewportSize({ width: 1100, height: 720 })
      await expect(page.locator('.staff-frame')).toHaveClass(/staff-error/)
    },
  },
  {
    name: 'the room notice',
    reach: async (page) => {
      await failNextNotation(page, 'notation_no_room')
      await page.setViewportSize({ width: 1200, height: 800 })
      await expect(roomNotice(page)).toBeVisible()
      await awaitIdle(page)
    },
  },
]

// @test-link [[rule_midi_starting_note]]
// @test-link [[rule_starting_note_named]]
test.describe('item 22: with Start session disabled, no line and no note starts anything', () => {
  for (const blocked of ITEM_22_STATES) {
    // @test-link [[rule_midi_starting_note]]
    // @test-link [[rule_starting_note_named]]
    test(blocked.name, async ({ page }) => {
      await gotoSessionHarness(page)
      await connectDevice(page, KEYS)
      await readyToStart(page)
      const { pitch } = await firstAttack(page)
      await expect(startLine(page)).toBeVisible()

      await blocked.reach(page)

      await expect(sessionAction(page)).toBeDisabled()
      expect((await sessionState(page)).startingNote).toBeNull()
      await expect(startLine(page)).toHaveCount(0)
      await expectNotesChangeNothing(page, KEYS, [pitch, pitch + 12])
      await blocked.leave?.(page)
    })
  }
})
