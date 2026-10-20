/**
 * v2.0 chunk 20, the last-session Review as a session end opens it, on the workspace harness's
 * fake audio clock and fake MIDI access: once phrase 1 has sounded, an end shows the Review in the
 * staff area's place, listing every phrase that started sounding, in order, with its number and
 * tempo, engraved from the stored timeline; a phrase only drawn as read-ahead is not in it, a
 * repeat looks like any other phrase, and no played note is drawn although the history holds
 * them. Meanwhile the hidden staff stays laid out (ux D149) and a fresh phrase is generated at
 * Idle, which the next session starts with. Its summary names the preset selected at Start. A
 * Review inflated to 2 000 phrases lists them all.
 * Nothing in the Review, control or text, grades or scores the playing, its favorites included.
 */
import { expect, test, type Locator, type Page } from '@playwright/test'

import { watchPageErrors } from '../controller/controller-helpers'
import {
  failNextGeneration,
  generationsSettled,
  harnessSnapshot,
  seedsDrawn,
} from '../release/harness-helpers'
import { toBarline, untilReady } from '../session/rolling-helpers'
import {
  cueRow,
  DESKTOP,
  gotoSessionHarness,
  PREGENERATION_OFF,
  readyToStart,
  sessionAction,
  sessionState,
  startSession,
  toRunning,
} from '../session/session-helpers'
import {
  KEYS,
  clockTo,
  connectDevice,
  expectedNotesOf,
  generatedTimelines,
  idleTimeline,
  phraseStartsAt,
  tap,
} from '../session/session-midi-helpers'
import { choosePreset } from '../workspace/helpers'
import {
  expectIdleReady,
  expectReviewShowing,
  playUntilPhrase,
  playedNotesToggle,
  reviewItems,
  reviewPanel,
  sessionEndedAfter,
  staffViewport,
} from './review-helpers'

let expectNoPageErrors: () => void

test.beforeEach(({ page }) => {
  expectNoPageErrors = watchPageErrors(page)
})

test.afterEach(() => expectNoPageErrors())

/** A concert timeline as `snapshot().timeline` serialises it. */
interface TimelineJson {
  readonly measures: readonly {
    readonly measureIndex: number
    readonly events: readonly { readonly kind: 'note' | 'rest' }[]
  }[]
}

/** Intent: how many events (notes and rests) a phrase's timeline holds. */
function eventCount(timeline: string): number {
  const parsed = JSON.parse(timeline) as TimelineJson
  return parsed.measures.reduce((sum, measure) => sum + measure.events.length, 0)
}

/** Intent: the `data-note-id` of every note event of phrase `phraseNumber`'s timeline. */
function noteIdsOf(timeline: string, phraseNumber: number): string[] {
  const parsed = JSON.parse(timeline) as TimelineJson
  return parsed.measures.flatMap((measure) =>
    measure.events.flatMap((event, index) =>
      event.kind === 'note' ? [`${phraseNumber}:${measure.measureIndex}:${index}`] : [],
    ),
  )
}

/** Intent: the review items' titles and tempos, in list order. */
async function listedPhrases(page: Page): Promise<string[][]> {
  return reviewItems(page)
    .locator('.review-phrase-header')
    .evaluateAll((headers) =>
      headers.map((header) => [
        header.querySelector('.review-phrase-title')?.textContent?.trim() ?? '',
        header.querySelector('.review-phrase-tempo')?.textContent?.trim() ?? '',
      ]),
    )
}

/** Intent: what one engraved review item draws: its stave notes and its notes' ids. */
function drawnNotes(item: Locator): Promise<{ staveNotes: number; noteIds: string[] }> {
  return item.locator('.review-staff').evaluate((staff) => ({
    staveNotes: staff.querySelectorAll('g.vf-stavenote').length,
    noteIds: [
      ...new Set(
        Array.from(staff.querySelectorAll('[data-note-id]')).map(
          (part) => part.getAttribute('data-note-id') ?? '',
        ),
      ),
    ],
  }))
}

/** Intent: wait until each of the first `count` review items has its staff engraved. */
async function untilEngraved(page: Page, count: number): Promise<void> {
  for (let index = 0; index < count; index += 1) {
    await expect(reviewItems(page).nth(index).locator('.review-staff svg').first()).toBeAttached({
      timeout: 30_000,
    })
  }
}

// @test-link [[req_last_session_review]]
// @test-link [[rule_no_grading_or_mismatch_signal]]
test.describe('the Review a session end opens', () => {
  // @test-link [[req_last_session_review]]
  // @test-link [[rule_no_grading_or_mismatch_signal]]
  test('lists the phrases that sounded, in order with number and tempo, never the read-ahead one, and no played note', async ({
    page,
  }) => {
    test.setTimeout(90_000)
    await gotoSessionHarness(page, DESKTOP, PREGENERATION_OFF)
    await connectDevice(page, KEYS)
    await readyToStart(page)
    const phraseOne = await idleTimeline(page)
    const generatedBefore = (await generatedTimelines(page)).length
    await startSession(page)

    // Phrase 1's first note as written, then a wrong pitch: both recorded, neither drawn. Phrase 2
    // is readied first: its deadline is phrase 1's start.
    await untilReady(page, 2)
    const [first, second] = expectedNotesOf(phraseOne, 1, await phraseStartsAt(page, 1))
    if (first === undefined || second === undefined) throw new Error('phrase 1 has two notes')
    await clockTo(page, first.onsetAt)
    await tap(page, KEYS, first.pitch, first.onsetAt)
    await clockTo(page, second.onsetAt)
    await tap(page, KEYS, second.pitch + 1, second.onsetAt)

    // Phrase 2 sounds, phrase 3 is readied and drawn as read-ahead, then Stop.
    await playUntilPhrase(page, 2)
    await tap(page, KEYS, 30)
    expect((await sessionState(page)).latestReady).toBe(3)
    const phraseTwo = (await generatedTimelines(page))[generatedBefore]
    if (phraseTwo === undefined) throw new Error('phrase 2 was not generated')
    await sessionAction(page).click()

    await expectReviewShowing(page, 2)
    const history = (await sessionState(page)).lastHistoryPhrases ?? []
    expect(history.map((phrase) => phrase.timeline)).toEqual([phraseOne, phraseTwo])
    expect(history.flatMap((phrase) => phrase.playedNotes).length).toBeGreaterThanOrEqual(3)

    await expect(reviewItems(page)).toHaveCount(2)
    expect(await listedPhrases(page)).toEqual([
      ['Phrase 1', '90 BPM'],
      ['Phrase 2', '90 BPM'],
    ])
    // The session date (en-US here), then the length (two 4-measure phrases at 90 BPM, under 30
    // seconds), the phrases, the instrument, the preset (the default one) and the favorites; the
    // keep line under it.
    await expect(reviewPanel(page).locator('.review-summary')).toHaveText(
      /^\w{3}, \w{3} \d{1,2}, \d{4}, \d{1,2}:\d{2}\s[AP]M · Under 1 min · 2 phrases · B-flat tenor saxophone · Neutral · No favorites$/u,
    )
    await expect(reviewPanel(page).locator('.review-keep-line')).toHaveText(
      'Not pinned: deleted when your next session is saved.',
    )

    await untilEngraved(page, 2)
    for (const [index, timeline] of [phraseOne, phraseTwo].entries()) {
      const drawn = await drawnNotes(reviewItems(page).nth(index))
      expect(drawn.staveNotes, `phrase ${index + 1}'s stave notes`).toBe(eventCount(timeline))
      expect(drawn.noteIds.sort(), `phrase ${index + 1}'s notes`).toEqual(
        noteIdsOf(timeline, index + 1).sort(),
      )
    }
    // Nothing of the session is drawn: no acknowledged note, start marker or playhead band.
    await expect(
      reviewPanel(page).locator('.note-ack, .start-note-marker, .playhead-band'),
    ).toHaveCount(0)
  })

  // @test-link [[rule_repeat_phrase_marked_internally_only]]
  test('a repeat is an ordinary item with its own number, drawn like the phrase it repeats', async ({
    page,
  }) => {
    test.setTimeout(90_000)
    await gotoSessionHarness(page, DESKTOP, PREGENERATION_OFF)
    await readyToStart(page)
    // Every rung of phrase 2's failure ladder fails: phrase 1 is repeated as phrase 2.
    const settledBefore = await generationsSettled(page)
    await failNextGeneration(page, 'search_limit_exceeded', 0, 5)
    await startSession(page)
    await expect.poll(() => generationsSettled(page), { timeout: 30_000 }).toBe(settledBefore + 5)
    await toBarline(page, 2, 0)
    await untilReady(page, 3)
    await sessionAction(page).click()

    await expectReviewShowing(page, 2)
    const [one, two] = (await sessionState(page)).lastHistoryPhrases ?? []
    expect(two?.timeline).toBe(one?.timeline)
    await untilEngraved(page, 2)

    expect(await listedPhrases(page)).toEqual([
      ['Phrase 1', '90 BPM'],
      ['Phrase 2', '90 BPM'],
    ])
    const markup = (item: Locator) =>
      item.evaluate((li) =>
        li.outerHTML
          .replace(/Phrase \d+/g, 'Phrase N')
          .replace(/Favorite phrase \d+/g, 'Favorite phrase N')
          .replace(/data-(note-id|chord-for)="\d+:/g, 'data-$1="N:')
          .replace(/data-phrase-number="\d+"/g, 'data-phrase-number="N"')
          .replace(/ id="[^"]*"/g, ''),
      )
    expect(await markup(reviewItems(page).nth(1))).toBe(await markup(reviewItems(page).nth(0)))
  })
})

// @test-link [[rule_session_end_generates_next_phrase_one]]
// @test-link [[rule_phrase_one_is_idle_phrase]]
test.describe('the next phrase', () => {
  // @test-link [[rule_session_end_generates_next_phrase_one]]
  // @test-link [[rule_phrase_one_is_idle_phrase]]
  // @test-link [[req_last_session_review]]
  test('is generated at the end under the Review, on a staff kept laid out, and starts the next session', async ({
    page,
  }) => {
    test.setTimeout(90_000)
    await gotoSessionHarness(page)
    await readyToStart(page)
    const before = await harnessSnapshot(page)
    await startSession(page)
    await toRunning(page)
    const seedsBefore = await seedsDrawn(page)

    await sessionAction(page).click()

    await expectReviewShowing(page, 1)
    await expectIdleReady(page)
    const fresh = await harnessSnapshot(page)
    expect(await seedsDrawn(page)).toBeGreaterThan(seedsBefore)
    expect(fresh.requestId).not.toBe(before.requestId)
    expect(fresh.seed).not.toBe(before.seed)

    // ux D149: out of sight and inert, yet laid out at its inline size, the new phrase engraved.
    await expect(staffViewport(page)).toHaveClass(/is-out-of-sight/)
    await expect(staffViewport(page)).toHaveAttribute('inert', '')
    await expect(staffViewport(page)).toBeHidden()
    const box = await staffViewport(page).evaluate((viewport) => {
      const rect = viewport.getBoundingClientRect()
      const svg = viewport.querySelector<SVGSVGElement>('.staff-frame svg.staff-svg')
      return {
        width: rect.width,
        height: rect.height,
        svgWidth: svg === null ? 0 : svg.getBBox().width,
      }
    })
    expect(box.width).toBeGreaterThan(0)
    expect(box.height).toBe(0)
    expect(box.svgWidth).toBeGreaterThan(0)
    await expect(cueRow(page)).toBeHidden()
    await expect(page.locator('#score-panel-title')).toBeHidden()

    // The keyboard route: Space closes the Review, focus stays on Start session, Space starts.
    await page.keyboard.press('Space')
    await expect(sessionAction(page)).toHaveText('Start session')
    await expect(sessionAction(page)).toBeFocused()
    await expect(staffViewport(page)).not.toHaveClass(/is-out-of-sight/)
    await page.keyboard.press('Space')
    await expect(sessionAction(page)).toHaveText('Stop')
    await toRunning(page)
    await sessionAction(page).click()

    await expectReviewShowing(page, 1)
    const [phraseOne] = (await sessionState(page)).lastHistoryPhrases ?? []
    expect(phraseOne?.timeline).toBe(fresh.timeline)
  })
})

// @test-link [[rule_preset_label_kept_with_session]]
test('the summary names the preset selected at Start', async ({ page }) => {
  test.setTimeout(90_000)
  await gotoSessionHarness(page)
  await choosePreset(page, 'Jazz')
  await readyToStart(page)
  await startSession(page)
  await toRunning(page)
  await sessionAction(page).click()

  await expectReviewShowing(page, 1)
  await expect(reviewPanel(page).locator('.review-summary')).toHaveText(
    /^\w{3}, \w{3} \d{1,2}, \d{4}, \d{1,2}:\d{2}\s[AP]M · Under 1 min · 1 phrase · B-flat tenor saxophone · Jazz · No favorites$/u,
  )
})

// @test-link [[req_last_session_review]]
test('a Review inflated to 2 000 phrases lists every one, numbered in order', async ({ page }) => {
  test.setTimeout(90_000)
  await gotoSessionHarness(page)
  await page.evaluate(() => window.__workspaceHarness.session.inflateHistory(2000))
  await sessionEndedAfter(page, 1)

  await expect(reviewItems(page)).toHaveCount(2000)
  // Every inflated phrase is the one real phrase, at its start: the length is that phrase's.
  await expect(reviewPanel(page).locator('.review-summary')).toHaveText(
    /^\w{3}, \w{3} \d{1,2}, \d{4}, \d{1,2}:\d{2}\s[AP]M · Under 1 min · 2000 phrases · B-flat tenor saxophone · Neutral · No favorites$/u,
  )
  await expect(reviewItems(page).last().locator('.review-phrase-title')).toHaveText('Phrase 2000')
  await untilEngraved(page, 1)
  // Only the controller's view is inflated: its history is the session's own.
  expect((await sessionState(page)).review).toEqual({ showing: true, phraseCount: 1 })
})

/**
 * Grading or scoring wording in any form: a score, a grade, accuracy, right or wrong, a mistake or
 * a miss, a rating, points, a percentage.
 */
const GRADING =
  /\b(?:scored?|scores|scoring|grade[ds]?|grading|accura\w*|correct(?:ly)?|incorrect|wrong|mistakes?|missed|rating|rated|points?)\b|\d\s*%/i

/** The roles a control or a label could take. */
const CONTROL_ROLES = [
  'button',
  'link',
  'checkbox',
  'switch',
  'radio',
  'menuitem',
  'tab',
  'option',
  'img',
] as const

// @test-link [[rule_no_grading_or_mismatch_signal]]
// @test-link [[req_favorite_phrases]]
test('the Review holds no grading or scoring wording, its favorites and played notes included', async ({
  page,
}) => {
  test.setTimeout(90_000)
  await gotoSessionHarness(page)
  await connectDevice(page, KEYS)
  // A played note too, so the Review renders every control it can offer.
  await sessionEndedAfter(page, 2, 7, async () => {
    await tap(page, KEYS, 60)
  })
  await untilEngraved(page, 2)
  // The Review offers its favorites and played-notes controls: the absence below is real.
  await expect(playedNotesToggle(page)).toBeVisible()
  const star = reviewPanel(page).getByRole('button', { name: 'Favorite phrase 1', exact: true })
  await star.click()
  await expect(star).toHaveAttribute('aria-pressed', 'true')
  await playedNotesToggle(page).click()
  await expect(reviewPanel(page).locator('.played-notes-lane')).toHaveCount(2)

  for (const role of CONTROL_ROLES) {
    await expect(reviewPanel(page).getByRole(role, { name: GRADING }), role).toHaveCount(0)
  }
  await expect(reviewPanel(page).getByTitle(GRADING)).toHaveCount(0)
  expect(await reviewPanel(page).innerText()).not.toMatch(GRADING)
})
