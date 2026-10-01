/**
 * The audio mix in the score toolbar, on the workspace harness's fake audio clock: the `Backing`
 * and `Click` toggles and the `Volume` popover's two sliders set the transport's mix at every
 * landscape breakpoint; the popover opens, closes and moves focus as the design sets; the click
 * volume at its lowest step still sounds; the levels survive closing and reopening the popover;
 * and the mix takes its own toolbar line below `bp-tablet-landscape`, the trailing end from it up.
 */
import { expect, test, type Locator, type Page } from '@playwright/test'

import {
  advanceAudio,
  audibleClicks,
  audioMix,
  gotoAudioHarness,
  mixDesign,
  scheduledClicks,
  startAudio,
} from './audio-harness-helpers'

/** One viewport per landscape breakpoint the workspace supports. */
const VIEWPORTS = [
  { name: 'desktop', width: 1600, height: 900, ownLine: false },
  { name: 'tablet landscape', width: 1200, height: 800, ownLine: false },
  { name: 'mobile landscape', width: 740, height: 360, ownLine: true },
] as const

/** Intent: the toolbar toggle named `name` (its accessible name is the name alone). */
function toggleButton(page: Page, name: 'Backing' | 'Click'): Locator {
  return page.locator('.score-toolbar').getByRole('button', { name, exact: true })
}

/** Intent: the toolbar's `Volume` button. */
function volumeButton(page: Page): Locator {
  return page.locator('.score-toolbar').getByRole('button', { name: 'Volume', exact: true })
}

/** Intent: the volume popover. */
function popover(page: Page): Locator {
  return page.locator('#mix-volume-popover')
}

/** Intent: the slider labelled `name`. */
function slider(page: Page, name: 'Backing volume' | 'Click volume'): Locator {
  return page.getByRole('slider', { name, exact: true })
}

/** Intent: open the popover with a click on the toolbar's `Volume`, and wait for it to show. */
async function openPopover(page: Page): Promise<void> {
  await volumeButton(page).click()
  await expect(popover(page)).toBeVisible()
}

/** Intent: land on the harness at `size`, its audio API ready. */
async function gotoAt(page: Page, size: { width: number; height: number }): Promise<void> {
  await page.setViewportSize(size)
  await gotoAudioHarness(page)
}

for (const viewport of VIEWPORTS) {
  // @test-link [[req_session_audio_mix]]
  test.describe(`audio mix at ${viewport.name} (${viewport.width}x${viewport.height})`, () => {
    // @test-link [[req_session_audio_mix]]
    test('the Backing and Click toggles turn each channel off and on, at idle', async ({
      page,
    }) => {
      await gotoAt(page, viewport)
      for (const name of ['Backing', 'Click'] as const) {
        const button = toggleButton(page, name)
        await expect(button).toHaveAttribute('aria-pressed', 'true')
        await expect(button).toHaveText(`${name} on`)

        await button.click()
        await expect(button).toHaveAttribute('aria-pressed', 'false')
        const off = await audioMix(page)
        expect(name === 'Backing' ? off.backingOn : off.clickOn).toBe(false)

        await button.click()
        await expect(button).toHaveAttribute('aria-pressed', 'true')
        const on = await audioMix(page)
        expect(name === 'Backing' ? on.backingOn : on.clickOn).toBe(true)
      }
    })

    // @test-link [[req_session_audio_mix]]
    // @test-link [[rule_click_volume_never_silent]]
    test('both sliders set the transport mix, the click one down to its audible minimum', async ({
      page,
    }) => {
      await gotoAt(page, viewport)
      const { range, defaults } = await mixDesign(page)

      await openPopover(page)
      await expect(slider(page, 'Backing volume')).toBeFocused()
      await page.keyboard.press('ArrowLeft')
      expect((await audioMix(page)).backingVolume).toBeLessThan(defaults.backingVolume)
      await page.keyboard.press('Home')
      expect((await audioMix(page)).backingVolume).toBe(range.backingVolumeMin)

      await slider(page, 'Click volume').focus()
      await page.keyboard.press('Home')
      expect((await audioMix(page)).clickVolume).toBe(range.clickVolumeMin)
      await expect(slider(page, 'Click volume')).toHaveAttribute(
        'min',
        String(range.clickVolumeMin),
      )
      await page.keyboard.press('End')
      expect((await audioMix(page)).clickVolume).toBe(range.volumeMax)
    })

    // @test-link [[req_session_audio_mix]]
    test(`the mix sits ${viewport.ownLine ? 'on its own toolbar line' : "at the toolbar's trailing end"}`, async ({
      page,
    }) => {
      await gotoAt(page, viewport)
      const toolbar = await page.locator('.score-toolbar').boundingBox()
      const title = await page.locator('#score-panel-title').boundingBox()
      const mix = await page.locator('.mix-controls').boundingBox()
      if (toolbar === null || title === null || mix === null) throw new Error('toolbar not shown')

      if (viewport.ownLine) {
        expect(mix.y).toBeGreaterThanOrEqual(title.y + title.height)
        expect(Math.abs(mix.x - toolbar.x)).toBeLessThanOrEqual(1)
      } else {
        expect(mix.y).toBeLessThan(title.y + title.height)
        expect(Math.abs(mix.x + mix.width - (toolbar.x + toolbar.width))).toBeLessThanOrEqual(1)
      }
    })
  })
}

// @test-link [[req_session_audio_mix]]
test.describe('the Volume popover', () => {
  test.beforeEach(async ({ page }) => {
    await gotoAt(page, { width: 1600, height: 900 })
  })

  test('opening focuses the first slider; Escape closes it and returns focus to Volume', async ({
    page,
  }) => {
    await expect(popover(page)).toBeHidden()
    await expect(volumeButton(page)).toHaveAttribute('aria-expanded', 'false')
    await expect(volumeButton(page)).toHaveAttribute('aria-controls', 'mix-volume-popover')

    await openPopover(page)
    await expect(volumeButton(page)).toHaveAttribute('aria-expanded', 'true')
    await expect(slider(page, 'Backing volume')).toBeFocused()

    await page.keyboard.press('Escape')
    await expect(popover(page)).toBeHidden()
    await expect(volumeButton(page)).toHaveAttribute('aria-expanded', 'false')
    await expect(volumeButton(page)).toBeFocused()
  })

  test('a pointer press outside closes it without moving focus to Volume', async ({ page }) => {
    await openPopover(page)

    await page.locator('#score-panel-title').click()

    await expect(popover(page)).toBeHidden()
    await expect(volumeButton(page)).not.toBeFocused()
  })

  test('Tab out of it, either way, closes it', async ({ page }) => {
    await openPopover(page)
    await page.keyboard.press('Tab')
    await expect(slider(page, 'Click volume')).toBeFocused()
    await expect(popover(page)).toBeVisible()
    await page.keyboard.press('Tab')
    await expect(popover(page)).toBeHidden()

    await openPopover(page)
    await page.keyboard.press('Shift+Tab')
    await expect(popover(page)).toBeHidden()
    await expect(volumeButton(page)).toBeFocused()
  })

  test('a click on the open Volume closes it, and the levels survive reopening', async ({
    page,
  }) => {
    await openPopover(page)
    await page.keyboard.press('Home')
    await slider(page, 'Click volume').focus()
    await page.keyboard.press('End')
    const set = await audioMix(page)

    await volumeButton(page).click()
    await expect(popover(page)).toBeHidden()
    await openPopover(page)

    expect(Number(await slider(page, 'Backing volume').inputValue())).toBe(set.backingVolume)
    expect(Number(await slider(page, 'Click volume').inputValue())).toBe(set.clickVolume)
    expect(await audioMix(page)).toEqual(set)
  })
})

// @test-link [[rule_click_volume_never_silent]]
// @test-link [[req_session_audio_mix]]
test('the click at its lowest volume still sounds, and the mix stays live while audio runs', async ({
  page,
}) => {
  await gotoAt(page, { width: 1600, height: 900 })
  const { range } = await mixDesign(page)
  await openPopover(page)
  await slider(page, 'Click volume').focus()
  await page.keyboard.press('Home')
  await page.keyboard.press('Escape')

  await startAudio(page)
  await advanceAudio(page, 4)

  const scheduled = await scheduledClicks(page)
  const audible = await audibleClicks(page)
  expect(scheduled.length).toBeGreaterThan(4)
  expect(audible).toHaveLength(scheduled.length)
  for (const click of audible) expect(click.gain).toBe(range.clickVolumeMin)

  await toggleButton(page, 'Click').click()
  expect((await audioMix(page)).clickOn).toBe(false)
  await toggleButton(page, 'Click').click()
  expect((await audioMix(page)).clickOn).toBe(true)
})
