/**
 * End-to-end coverage of a phrase change and an overlay state naming the new phrase arriving in
 * the same tick, as when a session moves to its next phrase: the overlay state waits for the new
 * phrase's engraving instead of being drawn on the previous score, and lands on the new one.
 */
import { expect, test, type Page } from '@playwright/test'

import { DESKTOP_VIEWPORT, keyOf, openHarness } from './overlay-harness'

test.use({ baseURL: 'http://127.0.0.1:4174' })

/**
 * Intent: swap the harness phrase, phrase number and overlays in one tick, returning the
 * rejection's error name, or null when the new phrase was engraved with the overlays drawn.
 */
async function swapPhrase(
  page: Page,
  fixtureName: string,
  phraseNumber: number,
  overlays: NotationHarnessOverlays,
): Promise<string | null> {
  return page.evaluate(
    async ([fixture, number, state]) => {
      try {
        await window.__notationHarness.swapPhrase!(fixture, number, state)
        return null
      } catch (error) {
        return error instanceof Error ? error.name : String(error)
      }
    },
    [fixtureName, phraseNumber, overlays] as const,
  )
}

const SWAPS = [
  { name: 'a new phrase', fixture: 'dense' },
  { name: 'the same phrase under a new phrase number', fixture: 'simple' },
] as const

for (const { name, fixture } of SWAPS) {
  // @test-link [[module_notation_note_identity_overlays]]
  test(`${name} and its overlays in one tick land on the new score`, async ({ page }) => {
    await openHarness(page, DESKTOP_VIEWPORT, 'fixture=simple&width=1200')
    const acknowledged = [
      { phraseNumber: 2, measureIndex: 1, eventIndex: 1 },
      { phraseNumber: 2, measureIndex: 1, eventIndex: 4 },
    ] as const
    const overlays: NotationHarnessOverlays = {
      startMarker: { phraseNumber: 2, measureIndex: 0, eventIndex: 0 },
      playheadMeasure: 1,
      acknowledged,
    }

    expect(await swapPhrase(page, fixture, 2, overlays)).toBeNull()

    const harness = await page.evaluate(() => window.__notationHarness)
    expect(harness.state).toBe('ready')
    expect(harness.engraveCount).toBe(2)
    expect(harness.glyphIdentities![0]![0]).toEqual(overlays.startMarker)
    const lit = await page.$$eval('svg.staff-svg .note-ack', (elements) =>
      elements.map((element) => element.getAttribute('data-note-id')),
    )
    expect(new Set(lit)).toEqual(new Set(acknowledged.map(keyOf)))
    expect(await page.locator('svg.staff-svg .start-note-marker').count()).toBe(1)
    expect(await page.locator('svg.staff-svg .playhead-band').count()).toBe(1)
  })
}
