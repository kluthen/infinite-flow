/**
 * Shared steps of the score-overlay notation specs: open the notation harness ready at a viewport,
 * set its overlay state (identities and a measure index only, never a pitch), and name notes the
 * way the engraved score does.
 */
import { expect, type Page } from '@playwright/test'

export const DESKTOP_VIEWPORT = { width: 1280, height: 800 } as const
export const PHONE_VIEWPORT = { width: 740, height: 360 } as const
export const NONE: NotationHarnessOverlays = {
  startMarker: null,
  playheadMeasure: null,
  acknowledged: [],
}

export type Identity = NotationHarnessNoteIdentity

/** Intent: open the harness at a viewport with the given query and wait until it is ready. */
// @test-link [[module_notation_note_identity_overlays]]
export async function openHarness(
  page: Page,
  viewport: { width: number; height: number },
  query: string,
): Promise<NotationHarnessState> {
  await page.setViewportSize(viewport)
  await page.goto(`/?${query}`)
  await page.waitForFunction(
    () => window.__notationHarness && window.__notationHarness.state !== 'pending',
  )
  const harness = await page.evaluate(() => window.__notationHarness)
  expect(harness.state).toBe('ready')
  return harness
}

/** Intent: set the overlay state, returning the rejection's error name, or null when it drew. */
export async function setOverlays(
  page: Page,
  overlays: NotationHarnessOverlays,
): Promise<string | null> {
  return page.evaluate(async (state) => {
    try {
      await window.__notationHarness.setOverlays!(state)
      return null
    } catch (error) {
      return error instanceof Error ? error.name : String(error)
    }
  }, overlays)
}

/** Intent: the attribute value an identity is written as. */
export function keyOf(identity: Identity): string {
  return `${identity.phraseNumber}:${identity.measureIndex}:${identity.eventIndex}`
}

/** Intent: the first glyph identity whose written facts pass `match`, crashing when none does. */
export function findIdentity(
  harness: NotationHarnessState,
  match: (fact: NotationHarnessGlyphFact, identity: Identity, measureIndex: number) => boolean,
): Identity {
  for (const [measureIndex, measure] of harness.glyphIdentities!.entries()) {
    for (const [glyphIndex, identity] of measure.entries()) {
      const fact = harness.glyphFacts![measureIndex]![glyphIndex]!
      if (identity !== null && !fact.tieFromPrevious && match(fact, identity, measureIndex)) {
        return identity
      }
    }
  }
  throw new Error('The phrase has no glyph matching the case.')
}
