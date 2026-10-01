/**
 * End-to-end coverage of the engraver's two pure pre-draw checks and of the layout inputs
 * PhraseScore reports, against the notation harness (the real engraver, its real fonts, PhraseScore
 * inside a real `staff-frame`). The fit check runs the same planning code the drawing uses, so it
 * agrees with the engraving for the same inputs; the room check measures the fixed parts with a
 * key signature's own width. PhraseScore reports its layout inputs once at its first measurement
 * and again on every real change, with or without a phrase, and before it engraves.
 */
import { expect, test, type Page } from '@playwright/test'

test.use({ baseURL: 'http://127.0.0.1:4174' })

const PHONE_VIEWPORT = { width: 740, height: 360 } as const
const ONE_SYSTEM = { layout: 'one-system', heightBudgetPx: null } as const

/** C major: no accidentals. */
const C_MAJOR_SIGNATURE: NotationHarnessKeySignature = {
  accidental: null,
  count: 0,
  letters: [],
  ionianTonic: { letter: 'C', alter: 0 },
}

/** C-sharp major: seven sharps, the widest key signature. */
const C_SHARP_MAJOR_SIGNATURE: NotationHarnessKeySignature = {
  accidental: 'sharp',
  count: 7,
  letters: ['F', 'C', 'G', 'D', 'A', 'E', 'B'],
  ionianTonic: { letter: 'C', alter: 1 },
}

/** Intent: wait until the harness publishes a settled (ready or error) engrave outcome. */
async function waitForHarnessSettled(page: Page): Promise<void> {
  await page.waitForFunction(
    () => window.__notationHarness && window.__notationHarness.state !== 'pending',
  )
}

/** Intent: let two animation frames pass, so any coalesced layout check has run. */
async function settleFrames(page: Page): Promise<void> {
  await page.evaluate(
    () =>
      new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
      ),
  )
}

/** Intent: open the harness with no phrase and wait for PhraseScore's first layout report. */
async function openEmptyStaff(page: Page, width: number): Promise<void> {
  await page.setViewportSize(PHONE_VIEWPORT)
  await page.goto(`/?source=empty&width=${width}`)
  await page.waitForFunction(() => window.__notationLayoutInputs.length > 0)
}

// @test-link [[module_idle_fit_round]]
// @test-link [[module_notation_layout_preflight]]
test.describe('planWrittenPhraseFit: the fit check before drawing', () => {
  test('agrees with the engraving in one small container: the dense phrase is too wide, the sparse one fits', async ({
    page,
  }) => {
    await page.setViewportSize(PHONE_VIEWPORT)
    for (const [fixture, state, errorCode, verdict] of [
      ['dense', 'error', 'notation_notes_too_wide', { kind: 'notes_too_wide' }],
      ['simple', 'ready', undefined, { kind: 'fits' }],
    ] as const) {
      await page.goto(`/?fixture=${fixture}&width=400`)
      await waitForHarnessSettled(page)
      const result = await page.evaluate(async (name) => {
        const inputs = window.__notationLayoutInputs.at(-1)!
        return {
          harness: window.__notationHarness,
          verdict: await window.__notationChecks.planFit(
            name,
            inputs.containerWidthPx,
            inputs.viewport,
          ),
        }
      }, fixture)
      expect(result.harness.state, fixture).toBe(state)
      expect(result.harness.errorCode, fixture).toBe(errorCode)
      expect(result.verdict, fixture).toEqual(verdict)
    }
  })

  test('finds no room, too narrow, in a tiny width and, too short, with a small split height budget', async ({
    page,
  }) => {
    await openEmptyStaff(page, 700)
    const verdicts = await page.evaluate(async () => {
      const checks = window.__notationChecks
      return {
        narrow: await Promise.all(
          ['dense', 'simple'].map((name) =>
            checks.planFit(name, 120, { layout: 'one-system', heightBudgetPx: null }),
          ),
        ),
        short: await Promise.all(
          ['dense', 'simple'].map((name) =>
            checks.planFit(name, 700, { layout: 'split', heightBudgetPx: 100 }),
          ),
        ),
      }
    })
    expect(verdicts.narrow).toEqual([
      { kind: 'no_room', cause: 'too_narrow' },
      { kind: 'no_room', cause: 'too_narrow' },
    ])
    expect(verdicts.short).toEqual([
      { kind: 'no_room', cause: 'too_short' },
      { kind: 'no_room', cause: 'too_short' },
    ])
  })
})

// @test-link [[module_idle_fit_round]]
// @test-link [[module_notation_layout_preflight]]
test.describe('planStaffRoomForKey: room for the staff with a key signature, whatever the notes', () => {
  test('a seven-sharp key needs more width than C major: between the two, only C major has room', async ({
    page,
  }) => {
    await openEmptyStaff(page, 700)
    const found = await page.evaluate(
      async ({ plain, widest, viewport }) => {
        const checks = window.__notationChecks
        /** The narrowest whole-pixel width with room for the staff in this key. */
        const narrowestRoom = async (signature: NotationHarnessKeySignature): Promise<number> => {
          for (let width = 1; width <= 1000; width += 1) {
            if ((await checks.planRoom(signature, width, viewport)).kind === 'room') return width
          }
          throw new Error('No width up to 1000 px had room for the staff.')
        }
        const plainWidth = await narrowestRoom(plain)
        const widestWidth = await narrowestRoom(widest)
        return {
          plainWidth,
          widestWidth,
          plainVerdict: await checks.planRoom(plain, plainWidth, viewport),
          widestVerdict: await checks.planRoom(widest, plainWidth, viewport),
          plainBelow: await checks.planRoom(plain, plainWidth - 1, viewport),
          // The sparse fixture is in C major: where the room check finds none, neither does its fit.
          fitBelow: await checks.planFit('simple', plainWidth - 1, viewport),
        }
      },
      { plain: C_MAJOR_SIGNATURE, widest: C_SHARP_MAJOR_SIGNATURE, viewport: ONE_SYSTEM },
    )
    expect(found.widestWidth).toBeGreaterThan(found.plainWidth)
    expect(found.plainVerdict).toEqual({ kind: 'room' })
    expect(found.widestVerdict).toEqual({ kind: 'no_room', cause: 'too_narrow' })
    expect(found.plainBelow).toEqual({ kind: 'no_room', cause: 'too_narrow' })
    expect(found.fitBelow).toEqual({ kind: 'no_room', cause: 'too_narrow' })
  })
})

// @test-link [[module_idle_fit_round]]
test.describe('PhraseScore reports its layout inputs', () => {
  test('with no phrase: once at its first measurement, again when the container width changes, not when nothing changed', async ({
    page,
  }) => {
    await openEmptyStaff(page, 700)
    await settleFrames(page)
    const first = await page.evaluate(() => window.__notationLayoutInputs)
    expect(first).toHaveLength(1)
    expect(first[0]!.containerWidthPx).toBeGreaterThan(0)
    expect(first[0]!.viewport).toMatchObject({ layout: 'split' })

    await page.evaluate(() => {
      document.getElementById('app')!.style.width = '600px'
    })
    await page.waitForFunction(() => window.__notationLayoutInputs.length > 1)
    await settleFrames(page)
    const second = await page.evaluate(() => window.__notationLayoutInputs)
    expect(second).toHaveLength(2)
    expect(second[1]!.containerWidthPx).toBe(first[0]!.containerWidthPx - 100)
    expect(second[1]!.viewport).toEqual(first[0]!.viewport)

    // A viewport signal that changes no input (as a browser toolbar showing does) reports nothing.
    await page.evaluate(() => window.dispatchEvent(new Event('resize')))
    await settleFrames(page)
    expect(await page.evaluate(() => window.__notationLayoutInputs.length)).toBe(2)
  })

  test('with a phrase: once, before the engraving is reported', async ({ page }) => {
    await page.setViewportSize(PHONE_VIEWPORT)
    await page.goto('/?fixture=simple&width=700')
    await waitForHarnessSettled(page)
    await settleFrames(page)
    const result = await page.evaluate(() => ({
      harness: window.__notationHarness,
      reports: window.__notationLayoutInputs.length,
    }))
    expect(result.harness.state).toBe('ready')
    expect(result.harness.layoutInputsBeforeEngrave).toBe(1)
    expect(result.reports).toBe(1)
  })
})
