/**
 * A single real GenerationIntent, generated once via the harness's `source=generated` path, is
 * re-transformed through every notation display convention with `setMode`: the underlying
 * generation source (published as `sourceSnapshot`) must never change, while the engraved chord
 * symbols and key signature must change exactly as the written-phrase transform dictates for each
 * mode.
 */
import { expect, test } from '@playwright/test'

test.use({ baseURL: 'http://127.0.0.1:4174' })

/** Intent: wait until the harness publishes a settled (ready or error) engrave outcome. */
async function waitForHarnessSettled(page: import('@playwright/test').Page): Promise<void> {
  await page.waitForFunction(
    () => window.__notationHarness && window.__notationHarness.state !== 'pending',
  )
}

const GENERATED_URL =
  '/?source=generated&seed=11&mode=Concert&width=1400&tonal=C&collection=Major' +
  '&density=Eighth&syncopation=Occasional%20offbeats&silence=Conversational' +
  '&profile=c-keyboard&register=Middle'

// @test-link [[module_notation_layout_preflight]]
test('switching Concert -> B-flat tenor -> E-flat alto -> Concert never changes the generation source', async ({
  page,
}) => {
  await page.goto(GENERATED_URL)
  await waitForHarnessSettled(page)
  expect((await page.evaluate(() => window.__notationHarness)).state).toBe('ready')

  const sourceSnapshot = await page.evaluate(() => window.__notationHarness.sourceSnapshot)
  expect(sourceSnapshot).toBeTruthy()

  const concertChords = await page.evaluate(() =>
    Array.from(document.querySelectorAll('svg.staff-svg g.vf-chordsymbol')).map(
      (g) => g.textContent,
    ),
  )
  const concertLabel = await page.evaluate(() =>
    document.querySelector('svg.staff-svg')!.getAttribute('aria-label'),
  )

  for (const mode of ['B-flat tenor', 'E-flat alto', 'Concert'] as const) {
    await page.evaluate((nextMode) => {
      window.__notationHarness.setMode!(nextMode)
    }, mode)
    await waitForHarnessSettled(page)
    expect((await page.evaluate(() => window.__notationHarness)).state).toBe('ready')

    const currentSnapshot = await page.evaluate(() => window.__notationHarness.currentSnapshot!())
    expect(currentSnapshot).toBe(sourceSnapshot)

    const label = await page.evaluate(() =>
      document.querySelector('svg.staff-svg')!.getAttribute('aria-label'),
    )
    expect(label).toContain(mode)

    if (mode === 'Concert') {
      const chords = await page.evaluate(() =>
        Array.from(document.querySelectorAll('svg.staff-svg g.vf-chordsymbol')).map(
          (g) => g.textContent,
        ),
      )
      expect(chords).toEqual(concertChords)
      expect(label).toBe(concertLabel)
    }
  }
})
