/**
 * Shared helpers for the My instrument sheet specs (chunk 20b) on the workspace harness: the
 * sheet, its steppers and segments, the instrument control, the stored records, the staff's clef
 * and size, and the browser's persist requests.
 */
import { expect, type Locator, type Page } from '@playwright/test'

import { harnessSnapshot } from '../release/harness-helpers'
import { radio } from '../workspace/helpers'
import { generationRecords } from '../workspace/pregeneration-helpers'

/** The instrument control's radiogroup label. */
export const INSTRUMENT_GROUP = 'Instrument profile'
/** The built-in profiles' segments, in order; the B-flat tenor saxophone is the default. */
export const BUILT_IN_LABELS = [
  'C MIDI keyboard',
  'B-flat tenor saxophone',
  'E-flat alto saxophone',
]
export const TENOR_LABEL = 'B-flat tenor saxophone'
export const MY_INSTRUMENT_ID = 'my-instrument'

/** The SMuFL clef glyphs VexFlow draws as text: the G (treble) clef and the F (bass) clef. */
export const G_CLEF = ''
export const F_CLEF = ''

/** The span refusal's first sentence. */
export const SPAN_LEAD =
  'The range needs at least two octaves (24 semitones) between its lowest and highest notes.'
export const TREBLE_LEAD = 'In treble clef, the range must stay between C2 and C7.'
export const BASS_LEAD = 'In bass clef, the range must stay between E0 and E5.'

/** The session seed phrase 1 is published with in the pre-generation cases. */
export const SESSION_SEED = 4242

/** Intent: the `instrument-actions` button, `Create my instrument` or `Edit my instrument`. */
export function instrumentActions(page: Page): Locator {
  return page.locator('.instrument-actions button')
}

/** Intent: the My instrument sheet's dialog. */
export function mySheet(page: Page): Locator {
  return page.getByRole('dialog')
}

/** Intent: one of the sheet's semitone steppers, by its accessible name. */
export function stepper(page: Page, name: 'Lowest note' | 'Highest note' | 'Sounds'): Locator {
  return mySheet(page).getByRole('spinbutton', { name, exact: true })
}

/** Intent: one segment of one of the sheet's segmented controls ("Start from", "Clef"). */
export function sheetSegment(page: Page, group: 'Start from' | 'Clef', label: string): Locator {
  return mySheet(page)
    .getByRole('radiogroup', { name: group })
    .getByRole('radio', { name: label, exact: true })
}

/** Intent: one of the sheet's `sheet-actions` buttons, by its exact label. */
export function sheetActionButton(page: Page, label: string): Locator {
  return mySheet(page).locator('.sheet-actions').getByRole('button', { name: label, exact: true })
}

/** Intent: the sheet's name field. */
export function nameField(page: Page): Locator {
  return mySheet(page).getByRole('textbox', { name: 'Name' })
}

/** Intent: the range's refusal, shown while the range is refused. */
export function rangeAlert(page: Page): Locator {
  return mySheet(page).locator('.range-alert')
}

/** Intent: the transposition's interval note, under the "Sounds" stepper. */
export function transpositionNote(page: Page): Locator {
  return stepper(page, 'Sounds').locator(
    'xpath=following-sibling::p[contains(@class, "field-note")]',
  )
}

/** Intent: open the sheet from `instrument-actions` and wait until it shows. */
export async function openSheet(page: Page): Promise<void> {
  await instrumentActions(page).click()
  await expect(mySheet(page)).toBeVisible()
}

/** Intent: the value a stepper holds now. */
export async function stepperValue(
  page: Page,
  name: Parameters<typeof stepper>[1],
): Promise<number> {
  return Number(await stepper(page, name).getAttribute('aria-valuenow'))
}

/** Intent: step a stepper by keyboard, one semitone per arrow press, until it holds `value`. */
export async function stepTo(
  page: Page,
  name: Parameters<typeof stepper>[1],
  value: number,
): Promise<void> {
  const control = stepper(page, name)
  await control.focus()
  const from = await stepperValue(page, name)
  const key = value > from ? 'ArrowUp' : 'ArrowDown'
  for (let step = 0; step < Math.abs(value - from); step += 1) await page.keyboard.press(key)
  await expect(control).toHaveAttribute('aria-valuenow', String(value))
}

/** Intent: Save, and wait until the sheet has closed. */
export async function saveSheet(page: Page): Promise<void> {
  await sheetActionButton(page, 'Save').click()
  await expect(mySheet(page)).toHaveCount(0)
}

/** Intent: the instrument control's segments' labels, in order. */
export function instrumentLabels(page: Page): Promise<string[]> {
  return page
    .getByRole('radiogroup', { name: INSTRUMENT_GROUP })
    .getByRole('radio')
    .allTextContents()
    .then((labels) => labels.map((label) => label.trim()))
}

/** Intent: the records the `instrument` store holds now. */
export function instrumentRecords(page: Page): Promise<unknown[]> {
  return page.evaluate(() => window.__workspaceHarness.storage.records('instrument'))
}

/** Intent: the records the `controller` store holds now. */
export function controllerRecords(page: Page): Promise<unknown[]> {
  return page.evaluate(() => window.__workspaceHarness.storage.records('controller'))
}

/** Intent: the player's phrase requests (no abort signal) made since the page loaded. */
export async function idleRequests(page: Page): Promise<WorkspaceHarnessGenerationRequest[]> {
  return (await generationRecords(page)).filter((record) => !record.signal)
}

/** Intent: wait until Idle shows a drawn phrase and holds no generation or notation. */
export async function untilIdleDrawn(page: Page): Promise<void> {
  await expect
    .poll(async () => (await harnessSnapshot(page)).operation, { timeout: 30_000 })
    .toBe('idle')
  await expect(page.locator('.staff-frame')).toHaveClass(/staff-ready/)
}

/** Intent: the clef glyphs the workspace's staff draws now. */
export function staffClefs(page: Page): Promise<string[]> {
  return page
    .locator('.score-panel > .staff-viewport svg.staff-svg g.vf-clef > text')
    .evaluateAll((texts) => texts.map((text) => text.textContent ?? ''))
}

/** Intent: each workspace staff SVG's `viewBox` height: the shared system-position size. */
export function staffHeights(page: Page): Promise<number[]> {
  return page
    .locator('.score-panel > .staff-viewport svg.staff-svg')
    .evaluateAll((svgs) => svgs.map((svg) => Number(svg.getAttribute('viewBox')!.split(' ')[3])))
}

/** Semitones above C of each natural letter. */
export const LETTER_SEMITONES: Readonly<Record<string, number>> = {
  C: 0,
  D: 2,
  E: 4,
  F: 5,
  G: 7,
  A: 9,
  B: 11,
}

/**
 * Intent: the MIDI number of the first written note the staff's text description names (`B flat
 * 4 quarter`): the first token that is neither a chord announcement nor a rest.
 */
export async function firstWrittenNote(page: Page): Promise<number> {
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
  const match =
    note === undefined
      ? null
      : /^([A-G])(?: (double sharp|double flat|sharp|flat|natural))? (-?\d+) /u.exec(note)
  if (match === null) throw new Error(`no written note in the description: ${measures.join(' ')}`)
  const alter = { 'double flat': -2, flat: -1, sharp: 1, 'double sharp': 2 }[match[2] ?? ''] ?? 0
  return (Number(match[3]) + 1) * 12 + LETTER_SEMITONES[match[1]!]! + alter
}

/** Intent: the concert pitch of the first attacked note of a concert timeline (JSON). */
export function firstConcertNote(timeline: string): number {
  const parsed = JSON.parse(timeline) as {
    measures: { events: { kind: string; pitch?: number }[] }[]
  }
  for (const measure of parsed.measures) {
    for (const event of measure.events) {
      if (event.kind === 'note' && event.pitch !== undefined) return event.pitch
    }
  }
  throw new Error('no note in the timeline')
}

/** Intent: every attacked note's concert pitch in a concert timeline (JSON). */
export function timelinePitches(timeline: string): number[] {
  const parsed = JSON.parse(timeline) as {
    measures: { events: { kind: string; pitch?: number }[] }[]
  }
  return parsed.measures.flatMap((measure) =>
    measure.events.flatMap((event) =>
      event.kind === 'note' && event.pitch !== undefined ? [event.pitch] : [],
    ),
  )
}

/**
 * Intent: create my instrument through the sheet from `template`, with `name`, its written range
 * set by keyboard when given, and Save; wait until it is selected and Idle shows its phrase.
 */
export async function createThroughSheet(
  page: Page,
  options: {
    readonly template: string
    readonly name: string
    readonly range?: { readonly minMidi: number; readonly maxMidi: number }
  },
): Promise<void> {
  await expect(instrumentActions(page)).toHaveText('Create my instrument')
  await openSheet(page)
  await sheetSegment(page, 'Start from', options.template).click()
  await nameField(page).fill(options.name)
  if (options.range !== undefined) {
    await stepTo(page, 'Lowest note', options.range.minMidi)
    await stepTo(page, 'Highest note', options.range.maxMidi)
  }
  await saveSheet(page)
  await expect(radio(page, INSTRUMENT_GROUP, options.name)).toHaveAttribute('aria-checked', 'true')
  await untilIdleDrawn(page)
}

/** Intent: before any page script runs, count `navigator.storage.persist()` calls, never granted. */
export async function spyOnPersist(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const spied = window as unknown as { __persistCalls: number }
    spied.__persistCalls = 0
    StorageManager.prototype.persisted = () => Promise.resolve(false)
    StorageManager.prototype.persist = () => {
      spied.__persistCalls += 1
      return Promise.resolve(false)
    }
  })
}

/** Intent: the `navigator.storage.persist()` calls since the page loaded. */
export function persistCalls(page: Page): Promise<number> {
  return page.evaluate(() => (window as unknown as { __persistCalls: number }).__persistCalls)
}
