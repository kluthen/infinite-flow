/**
 * End-to-end coverage of `engravePhraseSystem`, the per-system engraving a running session draws
 * its rolling display with, against the notation harness (the real engraver and its real fonts).
 * Each system part is drawn from the whole phrase's one plan, so the split layout's two halves
 * drawn separately match `engraveWrittenPhrase`'s two systems exactly: same scale, same size,
 * aligned measure columns, the same ties and the same note identities. A part that does not match
 * the layout is a caller error thrown before the host is touched; a layout failure throws its typed
 * NotationError and leaves the host empty.
 */
import { expect, test, type Page } from '@playwright/test'

test.use({ baseURL: 'http://127.0.0.1:4174' })

const PHONE_VIEWPORT = { width: 740, height: 360 } as const
const ONE_SYSTEM = { layout: 'one-system', heightBudgetPx: null } as const
const SPLIT = { layout: 'split', heightBudgetPx: null } as const
/** A phone-sized height budget: the two positions at 7.5 px a staff space (240 / 320 * 10). */
const PHONE_BUDGET_PX = 240
const SPLIT_ON_PHONE = { layout: 'split', heightBudgetPx: PHONE_BUDGET_PX } as const
/** The two system positions' height, in engraving units (NOTATION_SYSTEM_POSITION_UNITS each). */
const TWO_POSITIONS_UNITS = 2 * 160

/** Intent: open the harness with no phrase, so only the hook under test engraves. */
async function openHarness(page: Page): Promise<void> {
  await page.setViewportSize(PHONE_VIEWPORT)
  await page.goto('/?source=empty&width=700')
  await page.waitForFunction(() => window.__notationSystems !== undefined)
}

// @test-link [[module_session_rolling_display]]
// @test-link [[module_notation_layout_preflight]]
test.describe('engravePhraseSystem: one system of a phrase, from the whole phrase plan', () => {
  // @test-link [[module_session_rolling_display]]
  test('the split halves drawn separately equal engraveWrittenPhrase two systems', async ({
    page,
  }) => {
    await openHarness(page)
    for (const [fixture, width, viewport] of [
      ['denseTie', 900, SPLIT_ON_PHONE],
      ['denseTie', 1000, SPLIT],
      ['simple', 600, SPLIT_ON_PHONE],
      ['sharps6', 650, SPLIT],
    ] as const) {
      const label = `${fixture} at ${width}px, budget ${viewport.heightBudgetPx}`
      const drawn = await page.evaluate(
        async ([name, containerWidthPx, vp]) => ({
          phrase: await window.__notationSystems.engravePhrase(name, 3, containerWidthPx, vp),
          opening: await window.__notationSystems.engravePart(
            name,
            3,
            'opening',
            containerWidthPx,
            vp,
          ),
          closing: await window.__notationSystems.engravePart(
            name,
            3,
            'closing',
            containerWidthPx,
            vp,
          ),
        }),
        [fixture, width, viewport] as const,
      )
      const { phrase, opening, closing } = drawn
      expect(phrase.svgs, label).toHaveLength(2)
      for (const [system, index] of [
        [opening, 0],
        [closing, 1],
      ] as const) {
        expect(system.staffSpacePx, label).toBe(phrase.staffSpacePx)
        expect(system.widthPx, label).toBe(phrase.widthPx)
        expect(system.heightPx, label).toBe(phrase.heightPx)
        expect(system.positionBlockPx, label).toBe(phrase.positionBlockPx)
        expect(system.requiredUnits, label).toBe(phrase.requiredUnits)
        expect(system.measureBoxes, label).toEqual(
          phrase.measureBoxes.slice(index * 2, index * 2 + 2),
        )
        expect(system.svg.width, label).toBe(phrase.svgs[index]!.width)
        expect(system.svg.height, label).toBe(phrase.svgs[index]!.height)
        expect(system.svg.noteIds, label).toEqual(phrase.svgs[index]!.noteIds)
        expect(system.svg.markup, label).toBe(phrase.svgs[index]!.markup)
        expect(system.hostChildCount, label).toBe(1)
        expect(system.hostHoldsSvg, label).toBe(true)
      }
      expect(opening.svg.measureIndices, label).toEqual([0, 1])
      expect(opening.svg.systemIndices, label).toEqual([0, 0])
      expect(closing.svg.measureIndices, label).toEqual([2, 3])
      expect(closing.svg.systemIndices, label).toEqual([1, 1])
      // Aligned measure columns: bar 3 under bar 1, bar 4 under bar 2.
      expect(
        closing.measureBoxes.map((box) => box.x),
        label,
      ).toEqual(opening.measureBoxes.map((box) => box.x))
      if (fixture === 'denseTie') {
        // The tie across bars 2-3 is drawn as a partial tie on each half.
        expect(opening.svg.markup, label).toContain('vf-stavetie')
        expect(closing.svg.markup, label).toContain('vf-stavetie')
      }
    }
  })

  // @test-link [[module_session_rolling_display]]
  test('the whole part equals engraveWrittenPhrase one system', async ({ page }) => {
    await openHarness(page)
    for (const fixture of ['simple', 'dense', 'flats5'] as const) {
      const drawn = await page.evaluate(
        async ([name, vp]) => ({
          phrase: await window.__notationSystems.engravePhrase(name, 1, 1200, vp),
          whole: await window.__notationSystems.engravePart(name, 1, 'whole', 1200, vp),
        }),
        [fixture, ONE_SYSTEM] as const,
      )
      const { phrase, whole } = drawn
      expect(phrase.svgs, fixture).toHaveLength(1)
      expect(whole.staffSpacePx, fixture).toBe(phrase.staffSpacePx)
      expect(whole.widthPx, fixture).toBe(phrase.widthPx)
      expect(whole.heightPx, fixture).toBe(phrase.heightPx)
      expect(whole.positionBlockPx, fixture).toBe(phrase.positionBlockPx)
      expect(whole.requiredUnits, fixture).toBe(phrase.requiredUnits)
      expect(whole.measureBoxes, fixture).toEqual(phrase.measureBoxes)
      expect(whole.svg.markup, fixture).toBe(phrase.svgs[0]!.markup)
      expect(whole.svg.measureIndices, fixture).toEqual([0, 1, 2, 3])
      expect(whole.svg.systemIndices, fixture).toEqual([0, 0, 0, 0])
    }
  })

  // @test-link [[module_session_rolling_display]]
  // @test-link [[module_notation_layout_preflight]]
  test('a held layout draws at its own scale: one system capped by a phone budget, split at the width-only scale', async ({
    page,
  }) => {
    await openHarness(page)
    const drawn = await page.evaluate(
      async ([budget]) => {
        const heldOneSystem = { layout: 'one-system', heightBudgetPx: budget } as const
        const split = { layout: 'split', heightBudgetPx: null } as const
        const splitOnPhone = { layout: 'split', heightBudgetPx: budget } as const
        const systems = window.__notationSystems
        return {
          heldWhole: await systems.engravePart('simple', 1, 'whole', 900, heldOneSystem),
          heldPhrase: await systems.engravePhrase('simple', 1, 900, heldOneSystem),
          freeWhole: await systems.engravePart('simple', 1, 'whole', 900, {
            layout: 'one-system',
            heightBudgetPx: null,
          }),
          heldOpening: await systems.engravePart('simple', 1, 'opening', 600, split),
          heldSplitPhrase: await systems.engravePhrase('simple', 1, 600, split),
          phoneOpening: await systems.engravePart('simple', 1, 'opening', 600, splitOnPhone),
        }
      },
      [PHONE_BUDGET_PX] as const,
    )
    const heightCapped = (PHONE_BUDGET_PX / TWO_POSITIONS_UNITS) * 10
    expect(drawn.heldWhole.staffSpacePx).toBeCloseTo(heightCapped, 9)
    expect(drawn.heldWhole.svg.markup).toBe(drawn.heldPhrase.svgs[0]!.markup)
    expect(drawn.freeWhole.staffSpacePx).toBeGreaterThan(drawn.heldWhole.staffSpacePx)

    const widthOnly = Math.min(12, (600 / drawn.heldOpening.requiredUnits) * 10)
    expect(drawn.heldOpening.staffSpacePx).toBeCloseTo(widthOnly, 9)
    expect(drawn.heldOpening.svg.markup).toBe(drawn.heldSplitPhrase.svgs[0]!.markup)
    expect(drawn.phoneOpening.staffSpacePx).toBeCloseTo(heightCapped, 9)
    expect(drawn.heldOpening.staffSpacePx).toBeGreaterThan(drawn.phoneOpening.staffSpacePx)
  })

  // @test-link [[module_notation_layout_preflight]]
  test('a part that mismatches the layout throws before touching the host', async ({ page }) => {
    await openHarness(page)
    for (const [part, viewport] of [
      ['whole', SPLIT],
      ['whole', SPLIT_ON_PHONE],
      ['opening', ONE_SYSTEM],
      ['closing', ONE_SYSTEM],
    ] as const) {
      const label = `${part} in ${viewport.layout}`
      const outcome = await page.evaluate(
        ([p, vp]) => window.__notationSystems.engravePartFailure('simple', 1, p, 900, vp),
        [part, viewport] as const,
      )
      expect(outcome.thrown, label).not.toBeNull()
      expect(outcome.thrown!.name, label).toBe('Error')
      expect(outcome.thrown!.code, label).toBeNull()
      expect(outcome.sentinelKept, label).toBe(true)
      expect(outcome.hostChildCount, label).toBe(1)
    }
  })

  // @test-link [[module_notation_layout_preflight]]
  test('a layout failure throws its typed NotationError and leaves the host empty', async ({
    page,
  }) => {
    await openHarness(page)
    for (const [fixture, part, width, viewport, code] of [
      ['dense', 'opening', 400, SPLIT_ON_PHONE, 'notation_notes_too_wide'],
      ['dense', 'closing', 400, SPLIT_ON_PHONE, 'notation_notes_too_wide'],
      ['simple', 'whole', 100, ONE_SYSTEM, 'notation_no_room'],
      ['simple', 'opening', 600, { layout: 'split', heightBudgetPx: 100 }, 'notation_no_room'],
    ] as const) {
      const label = `${fixture} ${part} at ${width}px`
      const outcome = await page.evaluate(
        ([name, p, w, vp]) => window.__notationSystems.engravePartFailure(name, 1, p, w, vp),
        [fixture, part, width, viewport] as const,
      )
      expect(outcome.thrown?.name, label).toBe('NotationError')
      expect(outcome.thrown?.code, label).toBe(code)
      expect(outcome.sentinelKept, label).toBe(false)
      expect(outcome.hostChildCount, label).toBe(0)
    }
  })

  // @test-link [[module_session_rolling_display]]
  test('the note ids carry the given phrase number and the part own attacks', async ({ page }) => {
    await openHarness(page)
    const drawn = await page.evaluate(async () => ({
      opening: await window.__notationSystems.engravePart('simple', 7, 'opening', 600, {
        layout: 'split',
        heightBudgetPx: null,
      }),
      closing: await window.__notationSystems.engravePart('simple', 7, 'closing', 600, {
        layout: 'split',
        heightBudgetPx: null,
      }),
    }))
    const measureOf = (id: string): string => id.split(':')[1]!
    for (const system of [drawn.opening, drawn.closing]) {
      expect(system.svg.noteIds.length).toBeGreaterThan(0)
      for (const id of system.svg.noteIds) expect(id.split(':')[0], id).toBe('7')
    }
    for (const id of drawn.opening.svg.noteIds) expect(['0', '1'], id).toContain(measureOf(id))
    expect(drawn.closing.svg.noteIds.some((id) => ['2', '3'].includes(measureOf(id)))).toBe(true)
    // A closing-half id from bars 1-2 is a tie continuation: it names its attack, drawn above.
    for (const id of drawn.closing.svg.noteIds.filter(
      (each) => !['2', '3'].includes(measureOf(each)),
    )) {
      expect(drawn.opening.svg.noteIds, id).toContain(id)
    }
  })
})
