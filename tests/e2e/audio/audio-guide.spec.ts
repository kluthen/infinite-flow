/**
 * The guide playback on the workspace harness (port 4175): the harness generates a phrase, the
 * player switches the guides from the toolbar's `Melody guide` and `Rhythm guide` toggles, and
 * the harness queues the shown phrase as the session's phrases. On the fake audio clock (the
 * default mode, where time moves only when the spec advances it, so every time is exact) a
 * count-in plus eight bars at 120 BPM checks that no guide note is scheduled with both guides
 * off, that each guide plays the shown phrase's notes from the count-in's end only while its
 * toggle is on, and that turning one off or stopping silences it; in real Chromium
 * (`?audio=real`) short runs at 90 and 240 BPM check the guides land on the real audio clock.
 */
import { expect, test, type Locator, type Page } from '@playwright/test'

import {
  BEAT_SECONDS,
  advanceAudio,
  advanceAudioTo,
  audibleBacking,
  audibleGuide,
  audioEvents,
  audioMix,
  audioNow,
  backingNotes,
  generateShownPhrase,
  gotoAudioHarness,
  guideNotes,
  queueBacking,
  scheduledClicks,
  startAudio,
  stopAudio,
} from './audio-harness-helpers'

/** Two audio times this close are the same time. */
const SAME_TIME = 1e-9

/** The seed of the phrase every run generates, so the guides are the same run to run. */
const PHRASE_SEED = 42

/** The count-in's four beats, and a phrase's four measures of four beats. */
const COUNT_IN_BEATS = 4
const PHRASE_BEATS = 16

/** The count-in plus two phrases: eight measures. */
const RUN_BEATS = COUNT_IN_BEATS + 2 * PHRASE_BEATS

/** How far ahead of the audio clock the transport plans sound, in seconds. */
const LOOK_AHEAD_SECONDS = 0.2

/** The toolbar's guide toggles' names, each with the guide it switches. */
const GUIDE_TOGGLES = [
  { role: 'melody-guide', name: 'Melody guide' },
  { role: 'rhythm-guide', name: 'Rhythm guide' },
] as const

/** One fresh attack of the shown phrase: where it starts, in beats from the phrase's start. */
interface PhraseAttack {
  readonly beat: number
  readonly pitch: number
}

/** The JSON shape of the shown phrase's concert timeline the spec reads. */
interface ShownTimelineJson {
  readonly measures: readonly {
    readonly events: readonly {
      readonly kind: 'note' | 'rest'
      readonly duration: { readonly numerator: number; readonly denominator: number }
      readonly pitch?: number
      readonly tieContinuation?: boolean
    }[]
  }[]
}

/** Intent: the toolbar's toggle of the guide named `name`. */
function guideToggle(page: Page, name: 'Melody guide' | 'Rhythm guide'): Locator {
  return page.locator('.score-toolbar').getByRole('button', { name, exact: true })
}

/** Intent: the toolbar's `Backing` toggle. */
function backingToggle(page: Page): Locator {
  return page.locator('.score-toolbar').getByRole('button', { name: 'Backing', exact: true })
}

/** Intent: press a toolbar toggle and wait until it shows `pressed`. */
async function pressToggle(toggle: Locator, pressed: boolean): Promise<void> {
  await toggle.click()
  await expect(toggle).toHaveAttribute('aria-pressed', pressed ? 'true' : 'false')
}

/**
 * Intent: the fresh attacks of the phrase the workspace shows, read from its concert timeline:
 * each note that is no tie continuation, at its start in beats and its concert pitch.
 */
async function shownAttacks(page: Page): Promise<readonly PhraseAttack[]> {
  const { timeline } = await page.evaluate(() => window.__workspaceHarness.snapshot())
  if (timeline === null) throw new Error('no phrase is shown')
  const parsed = JSON.parse(timeline) as ShownTimelineJson
  const attacks: PhraseAttack[] = []
  let beat = 0
  for (const measure of parsed.measures) {
    for (const event of measure.events) {
      if (event.kind === 'note' && event.tieContinuation !== true) {
        if (event.pitch === undefined) throw new Error('a note without a pitch')
        attacks.push({ beat, pitch: event.pitch })
      }
      beat += (event.duration.numerator * 4) / event.duration.denominator
    }
  }
  return attacks
}

/** Intent: the root pitch class of the harmony event sounding on beat `beat` of a phrase. */
function rootOnBeat(harmony: readonly WorkspaceHarnessQueuedHarmonyEvent[], beat: number): number {
  const event = harmony.find((e) => {
    const from = e.barIndex * 4 + e.startBeat
    return from <= beat && beat < from + e.durationBeats
  })
  if (event === undefined) throw new Error(`no harmony event sounds on phrase beat ${beat}`)
  return event.pitchClasses[0]
}

/** One expected guide note: the attack it plays and the audio time it starts at. */
interface ExpectedGuideNote {
  readonly beat: number
  readonly pitch: number
  readonly at: number
}

/**
 * Intent: the melody guide's expected notes over `phrases` phrases of the shown attacks, from the
 * count-in's end at `beatSeconds` per beat.
 */
function expectedMelody(
  attacks: readonly PhraseAttack[],
  countInEndsAt: number,
  beatSeconds: number,
  phrases: number,
): ExpectedGuideNote[] {
  const notes: ExpectedGuideNote[] = []
  for (let phrase = 0; phrase < phrases; phrase += 1) {
    for (const attack of attacks) {
      const beat = phrase * PHRASE_BEATS + attack.beat
      notes.push({ beat, pitch: attack.pitch, at: countInEndsAt + beat * beatSeconds })
    }
  }
  return notes
}

/**
 * Intent: check each scheduled note of one guide against the expected one at its index (its start
 * exact to `tolerance`), and that each melody note plays the attack's pitch, each rhythm note the
 * chord root in the C4-B4 octave.
 */
function expectNotesMatch(
  notes: readonly WorkspaceHarnessGuideNote[],
  expected: readonly ExpectedGuideNote[],
  harmony: readonly WorkspaceHarnessQueuedHarmonyEvent[],
  tolerance: number,
): void {
  notes.forEach((note, index) => {
    const want = expected[index]
    if (want === undefined) throw new Error(`guide note ${index} at ${note.at} was not expected`)
    expect(Math.abs(note.at - want.at), `${note.role} note ${index}`).toBeLessThanOrEqual(tolerance)
    expect(note.until).toBeGreaterThan(note.at)
    expect(note.scheduledAt).toBeLessThanOrEqual(note.at)
    if (note.role === 'melody-guide') {
      expect(note.pitch).toBe(want.pitch)
    } else {
      expect(note.pitch).toBeGreaterThanOrEqual(60)
      expect(note.pitch).toBeLessThanOrEqual(71)
      expect(note.pitch % 12).toBe(rootOnBeat(harmony, want.beat % PHRASE_BEATS))
    }
  })
}

/** Intent: the notes of one guide, in order. */
function ofRole(
  notes: readonly WorkspaceHarnessGuideNote[],
  role: WorkspaceHarnessGuideRole,
): WorkspaceHarnessGuideNote[] {
  return notes.filter((note) => note.role === role)
}

/**
 * Intent: on the fake clock, generate the phrase and, with the guides as `turnOn` asks (pressed
 * from the toolbar), start a session at 120 BPM from the Start click and queue the shown phrase
 * as phrases 1 and 2; return the timeline, the harmony and the shown attacks.
 */
async function startWithTwoPhrases(
  page: Page,
  turnOn: readonly ('Melody guide' | 'Rhythm guide')[],
): Promise<{
  readonly startAt: number
  readonly countInEndsAt: number
  readonly harmony: readonly WorkspaceHarnessQueuedHarmonyEvent[]
  readonly attacks: readonly PhraseAttack[]
}> {
  await gotoAudioHarness(page)
  await generateShownPhrase(page, PHRASE_SEED)
  for (const name of turnOn) await pressToggle(guideToggle(page, name), true)
  const { startAt, countInEndsAt } = await startAudio(page)
  const harmony = await queueBacking(page, 1)
  await queueBacking(page, 2)
  return { startAt, countInEndsAt, harmony, attacks: await shownAttacks(page) }
}

/** Intent: advance the fake clock past the end of the two queued phrases. */
async function playRun(page: Page, startAt: number): Promise<void> {
  await advanceAudioTo(page, startAt + RUN_BEATS * BEAT_SECONDS + 1)
}

// @test-link [[req_guide_playback]]
test.describe('the guides of two phrases at 120 BPM', () => {
  // @test-link [[req_guide_playback]]
  test('with both guides off, a session schedules no guide note', async ({ page }) => {
    const { startAt } = await startWithTwoPhrases(page, [])
    const mix = await audioMix(page)
    expect(mix.melodyGuideOn).toBe(false)
    expect(mix.rhythmGuideOn).toBe(false)
    for (const { name } of GUIDE_TOGGLES) {
      await expect(guideToggle(page, name)).toHaveAttribute('aria-pressed', 'false')
    }

    await playRun(page, startAt)

    expect((await backingNotes(page)).length).toBeGreaterThan(0)
    expect(await guideNotes(page)).toEqual([])
    expect(await audibleGuide(page)).toEqual([])
  })

  // @test-link [[req_guide_playback]]
  // @test-link [[rule_guide_plays_from_phrase_one]]
  // @test-link [[rule_guide_notes_placed_exactly]]
  test("switched on from their toggles, the guides play the shown phrase's notes from the count-in's end, on the clicks for on-beat notes", async ({
    page,
  }) => {
    const { startAt, countInEndsAt, harmony, attacks } = await startWithTwoPhrases(page, [
      'Melody guide',
      'Rhythm guide',
    ])
    await playRun(page, startAt)

    const notes = await guideNotes(page)
    const expected = expectedMelody(attacks, countInEndsAt, BEAT_SECONDS, 2)
    expect(attacks.length).toBeGreaterThan(0)
    const clickTimes = (await scheduledClicks(page)).map((click) => click.at)
    for (const { role } of GUIDE_TOGGLES) {
      const line = ofRole(notes, role)
      expect(line, role).toHaveLength(expected.length)
      expectNotesMatch(line, expected, harmony, SAME_TIME)
      expect(line.every((note) => note.at >= countInEndsAt - SAME_TIME)).toBe(true)
      line.forEach((note, index) => {
        if (!Number.isInteger(expected[index]!.beat)) return
        expect(clickTimes.some((at) => Math.abs(at - note.at) <= SAME_TIME)).toBe(true)
      })
    }
    expect(expected.some((note) => Number.isInteger(note.beat))).toBe(true)
    expect(await audibleGuide(page)).toHaveLength(notes.length)
  })

  // @test-link [[req_guide_playback]]
  // @test-link [[rule_guide_switch_takes_effect]]
  test('each line is scheduled only while its toggle is on; turning one off sets its enable gain to 0 and schedules none after', async ({
    page,
  }) => {
    const { startAt, countInEndsAt, harmony, attacks } = await startWithTwoPhrases(page, [
      'Melody guide',
    ])
    const expected = expectedMelody(attacks, countInEndsAt, BEAT_SECONDS, 2)

    const rhythmOnAt = countInEndsAt + 6 * BEAT_SECONDS + 0.13
    await advanceAudioTo(page, rhythmOnAt)
    await pressToggle(guideToggle(page, 'Rhythm guide'), true)
    const melodyOffAt = countInEndsAt + PHRASE_BEATS * BEAT_SECONDS + 3 * BEAT_SECONDS + 0.07
    await advanceAudioTo(page, melodyOffAt)
    await pressToggle(guideToggle(page, 'Melody guide'), false)
    await playRun(page, startAt)

    const notes = await guideNotes(page)
    const melody = ofRole(notes, 'melody-guide')
    const rhythm = ofRole(notes, 'rhythm-guide')

    const melodyOffGain = (await audioEvents(page)).filter(
      (event): event is Extract<WorkspaceHarnessAudioEvent, { kind: 'gain' }> =>
        event.kind === 'gain' && event.gain === 'melody-guide-enable',
    )
    expect(melodyOffGain.at(-1)).toMatchObject({ value: 0 })
    expect(Math.abs(melodyOffGain.at(-1)!.at - melodyOffAt)).toBeLessThanOrEqual(SAME_TIME)
    expect(melody.every((note) => note.scheduledAt <= melodyOffAt + SAME_TIME)).toBe(true)
    expect(melody.every((note) => note.at < melodyOffAt + LOOK_AHEAD_SECONDS)).toBe(true)
    expectNotesMatch(melody, expected, harmony, SAME_TIME)
    expect(melody.length).toBeGreaterThanOrEqual(
      expected.filter((note) => note.at < melodyOffAt).length,
    )
    expect(melody.length).toBeLessThan(expected.length)

    expect(rhythm.length).toBeGreaterThan(0)
    expect(rhythm.every((note) => note.at >= rhythmOnAt)).toBe(true)
    expect(rhythm.every((note) => note.scheduledAt >= rhythmOnAt - SAME_TIME)).toBe(true)
    const rhythmExpected = expected.filter((note) => note.at >= rhythm[0]!.at - SAME_TIME)
    expect(rhythm).toHaveLength(rhythmExpected.length)
    expectNotesMatch(rhythm, rhythmExpected, harmony, SAME_TIME)
    expect(rhythm[0]!.at).toBeLessThan(rhythmOnAt + LOOK_AHEAD_SECONDS + 2 * BEAT_SECONDS)

    const heardMelody = ofRole(await audibleGuide(page), 'melody-guide')
    expect(heardMelody.every((note) => note.at < melodyOffAt)).toBe(true)
    const heardRhythm = ofRole(await audibleGuide(page), 'rhythm-guide')
    expect(heardRhythm).toHaveLength(rhythm.length)
  })

  // @test-link [[req_guide_playback]]
  // @test-link [[rule_stop_ends_session]]
  test('after stop no guide note is scheduled, and none sounds from the fade on', async ({
    page,
  }) => {
    await startWithTwoPhrases(page, ['Melody guide', 'Rhythm guide'])
    await advanceAudio(page, 4.3)
    const stopAt = await audioNow(page)
    const heardBeforeStop = (await audibleGuide(page)).length
    const scheduledBeforeStop = (await guideNotes(page)).length
    expect(heardBeforeStop).toBeGreaterThan(0)

    await stopAudio(page)
    await advanceAudio(page, 3)

    const fades = (await audioEvents(page)).filter((event) => event.kind === 'fade')
    expect(fades).toEqual([
      { kind: 'fade', bus: 1, at: stopAt, duration: 0.1, scheduledAt: stopAt },
    ])
    const notes = await guideNotes(page)
    expect(notes).toHaveLength(scheduledBeforeStop)
    expect(notes.every((note) => note.scheduledAt <= stopAt)).toBe(true)
    expect((await audibleGuide(page)).filter((note) => note.at >= stopAt)).toEqual([])
    expect(await audibleGuide(page)).toHaveLength(heardBeforeStop)
  })
})

/** How close a scheduled note must fall to its expected time on the real clock, in seconds. */
const ON_TIME = 1e-6

/** The real runs' guide combinations: each guide alone, then both. */
const GUIDE_SETS = [
  { name: 'the melody guide alone', on: ['Melody guide'] },
  { name: 'the rhythm guide alone', on: ['Rhythm guide'] },
  { name: 'both guides', on: ['Melody guide', 'Rhythm guide'] },
] as const

/** Intent: the bus the latest session opened. */
async function latestBus(page: Page): Promise<number> {
  const opened = (await audioEvents(page)).filter((event) => event.kind === 'open-bus')
  const last = opened.at(-1)
  if (last === undefined) throw new Error('no session bus was opened')
  return last.bus
}

for (const tempo of [90, 240] as const) {
  for (const guides of GUIDE_SETS) {
    // @test-link [[req_guide_playback]]
    // @test-link [[rule_guide_notes_placed_exactly]]
    // @test-link [[rule_guide_plays_from_phrase_one]]
    test(`in real Chromium at ${tempo} BPM, ${guides.name} with the backing on then off: the guide notes are planned on the audio clock at their times, no error`, async ({
      page,
    }) => {
      const errors: string[] = []
      page.on('pageerror', (error) => errors.push(error.message))
      page.on('console', (message) => {
        if (message.type() === 'error') errors.push(message.text())
      })
      const beatSeconds = 60 / tempo
      await gotoAudioHarness(page, 'real')
      await generateShownPhrase(page, PHRASE_SEED)
      for (const name of guides.on) await pressToggle(guideToggle(page, name), true)
      const attacks = await shownAttacks(page)

      for (const backingOn of [true, false]) {
        if (!backingOn) await pressToggle(backingToggle(page), false)
        const { countInEndsAt } = await startAudio(page, tempo)
        const harmony = await queueBacking(page, 1)
        const bus = await latestBus(page)
        const twoBarsIn = countInEndsAt + 8 * beatSeconds
        await expect.poll(() => audioNow(page), { timeout: 20_000 }).toBeGreaterThan(twoBarsIn)

        const notes = (await guideNotes(page)).filter((note) => note.bus === bus)
        const expected = expectedMelody(attacks, countInEndsAt, beatSeconds, 1)
        const dueByNow = expected.filter((note) => note.at < twoBarsIn)
        expect(dueByNow.length).toBeGreaterThan(0)
        for (const { role, name } of GUIDE_TOGGLES) {
          const line = ofRole(notes, role)
          if (!(guides.on as readonly string[]).includes(name)) {
            expect(line, role).toEqual([])
            continue
          }
          expect(line.length, role).toBeGreaterThanOrEqual(dueByNow.length)
          expectNotesMatch(line, expected, harmony, ON_TIME)
          for (const note of line) {
            expect(note.at - note.scheduledAt).toBeLessThanOrEqual(LOOK_AHEAD_SECONDS + 1e-9)
          }
        }
        const backing = (await backingNotes(page)).filter((note) => note.bus === bus)
        const heardBacking = (await audibleBacking(page)).filter((note) => note.bus === bus)
        expect(backing.length).toBeGreaterThan(0)
        expect(heardBacking.length).toBe(backingOn ? backing.length : 0)
        expect((await audioMix(page)).backingOn).toBe(backingOn)

        await stopAudio(page)
      }
      expect(errors).toEqual([])
    })
  }
}
