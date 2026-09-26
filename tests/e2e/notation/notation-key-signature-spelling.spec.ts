/**
 * Engraving coverage for Open transposition and written/concert spelling divergence (Definition of
 * Done; gate report §4.1/§5): each fixture here runs the real `transformToWrittenPhrase` display
 * transform (tests/e2e/notation-harness/fixtures.ts) over an explicit concert timeline for a
 * written tonal-center/collection selection and an instrument transposition, then engraves the
 * result through the real VexFlow adapter, with no production code branching on any fixture. Key
 * signature accidental count is asserted by counting the `<text>` glyphs VexFlow draws inside the
 * `g.vf-keysignature` group (verified against the real rendered DOM; see notation-elements.spec.ts's
 * header comment for the VexFlow 5 SVG element vocabulary this relies on).
 */
import { expect, test } from '@playwright/test'

test.use({ baseURL: 'http://127.0.0.1:4174' })

/** Intent: wait until the harness publishes a settled (ready or error) engrave outcome. */
async function waitForHarnessSettled(page: import('@playwright/test').Page): Promise<void> {
  await page.waitForFunction(
    () => window.__notationHarness && window.__notationHarness.state !== 'pending',
  )
}

async function goToFixture(page: import('@playwright/test').Page, fixture: string): Promise<void> {
  await page.goto(`/?fixture=${fixture}&width=1200`)
  await waitForHarnessSettled(page)
  expect((await page.evaluate(() => window.__notationHarness)).state).toBe('ready')
}

async function keySignatureGlyphCount(page: import('@playwright/test').Page): Promise<number> {
  return page.evaluate(
    () => document.querySelectorAll('svg.staff-svg g.vf-keysignature text').length,
  )
}

// @test-link [[module_generation_request_construction]]
// @test-link [[entity_instrument_profile]]
test.describe('engraving: test-only instrument transposition (Open transposition)', () => {
  test('engraves a written C Ionian phrase with an empty key signature for a fabricated +2/+1 transposition', async ({
    page,
  }) => {
    await goToFixture(page, 'testProfilePlus2Plus1')
    await expect(page.locator('svg.staff-svg g.vf-keysignature')).toHaveCount(1)
    expect(await keySignatureGlyphCount(page)).toBe(0)
  })

  test('engraves a written C Ionian phrase with an empty key signature for a fabricated +21/+12 transposition', async ({
    page,
  }) => {
    await goToFixture(page, 'testProfilePlus21Plus12')
    await expect(page.locator('svg.staff-svg g.vf-keysignature')).toHaveCount(1)
    expect(await keySignatureGlyphCount(page)).toBe(0)
  })
})

// @test-link [[rule_notation_display_preserves_phrase]]
// @test-link [[module_generation_request_construction]]
test.describe('engraving: written/concert spelling divergence (gate report §5)', () => {
  test('engraves written F# Ionian on the B-flat tenor with a 6-sharp key signature, from the written selection', async ({
    page,
  }) => {
    await goToFixture(page, 'writtenSharpSideBbTenor')
    await expect(page.locator('svg.staff-svg g.vf-keysignature')).toHaveCount(1)
    expect(await keySignatureGlyphCount(page)).toBe(6)
  })

  test('engraves the written flat-side pitch class C# on the E-flat alto with a 5-flat (D-flat major) key signature', async ({
    page,
  }) => {
    await goToFixture(page, 'writtenFlatSideEbAlto')
    await expect(page.locator('svg.staff-svg g.vf-keysignature')).toHaveCount(1)
    expect(await keySignatureGlyphCount(page)).toBe(5)
  })
})
