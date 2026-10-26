/**
 * v3.1 chunk 13, the key and mode marks, on the workspace harness (port 4175). While a restriction
 * is in force, each half of it that is a list marks its control: the modes half marks Collection's
 * allowed segments with `is-marked`, a dot drawn as the segment's `::after` (a shape, never colour
 * alone, kept on the checked segment), and a `field-note` under the control, named by the
 * radiogroup's `aria-describedby`, says what the marks mean. A half that is "any" marks nothing
 * and has no note; no built-in restricts the key, so Written key is never marked. Leaving the
 * restriction for Custom removes the marks, coming back into it brings them back. No segment is
 * ever disabled for a restriction. During a session the marks keep what Start showed, a stale
 * phrase 1 used as it is included, and after Stop they follow the player's settings again.
 */
import { expect, test, type Locator, type Page } from '@playwright/test'

import { gotoWorkspaceHarness, harnessSnapshot } from '../release/harness-helpers'
import { toBarline, untilReady } from '../session/rolling-helpers'
import {
  gotoSessionHarness,
  readyToStart,
  sessionAction,
  sessionState,
  startSession,
  toCountInMiddle,
  toRunning,
} from '../session/session-helpers'
import { choosePreset, expectPresetShown, presetBox, presetDescription, radio } from './helpers'

const REEL_NOTE =
  'Reel is meant for Mixolydian or Dorian, marked. Any mode works; another one makes your settings Custom.'
const REEL_DESCRIPTION =
  'A fast folk dance in steady eighth notes, in Mixolydian or Dorian. Also try it in Ionian (a major key).'

/**
 * The eight built-ins in the box's order, each with the modes its restriction allows ("any" when
 * it allows every mode) and one mode outside it, or another mode when every mode is allowed.
 */
const BUILT_IN_MODES = [
  { name: 'Neutral', modes: 'any', other: 'Dorian' },
  { name: 'Gentle', modes: 'any', other: 'Dorian' },
  { name: 'Speed drill', modes: 'any', other: 'Dorian' },
  { name: 'Jazz', modes: 'any', other: 'Dorian' },
  { name: 'Bebop', modes: ['Major'], other: 'Locrian' },
  { name: 'Pop song', modes: ['Major'], other: 'Locrian' },
  { name: 'Reel', modes: ['Mixolydian', 'Dorian'], other: 'Locrian' },
  { name: 'Modal (Dorian)', modes: ['Dorian'], other: 'Locrian' },
] as const

/** Intent: the named key or mode radiogroup. */
function group(page: Page, label: 'Written key' | 'Collection'): Locator {
  return page.getByRole('radiogroup', { name: label, exact: true })
}

/** Intent: the labels of a group's marked segments, in the control's order. */
async function markedLabels(page: Page, label: 'Written key' | 'Collection'): Promise<string[]> {
  const texts = await group(page, label).locator('[role="radio"].is-marked').allInnerTexts()
  return texts.map((text) => text.trim())
}

/**
 * Intent: the group shows exactly `marked` marked and, when `note` is given, names a
 * `field-note` reading exactly `note` with its `aria-describedby`; with `note` null, nothing is
 * marked and the group names no description at all.
 */
async function expectMarks(
  page: Page,
  label: 'Written key' | 'Collection',
  marked: readonly string[],
  note: string | null,
): Promise<void> {
  await expect.poll(() => markedLabels(page, label)).toEqual(marked)
  const radiogroup = group(page, label)
  if (note === null) {
    await expect(radiogroup).not.toHaveAttribute('aria-describedby')
    return
  }
  const id = await radiogroup.getAttribute('aria-describedby')
  expect(id).not.toBeNull()
  const described = page.locator(`[id="${id}"]`)
  await expect(described).toHaveClass(/field-note/)
  await expect(described).toHaveText(note)
  await expect(radiogroup).toHaveAccessibleDescription(note)
}

/** Intent: Reel's marks: Mixolydian and Dorian on Collection with Reel's note, none on Written key. */
async function expectReelMarks(page: Page): Promise<void> {
  await expectMarks(page, 'Collection', ['Dorian', 'Mixolydian'], REEL_NOTE)
  await expectMarks(page, 'Written key', [], null)
}

/** Intent: the field holding the named key or mode radiogroup, with its notes. */
function field(page: Page, label: 'Written key' | 'Collection'): Locator {
  return page.locator('.field-group').filter({ has: group(page, label) })
}

/** Intent: no marks and no note on either control. */
async function expectNoMarks(page: Page): Promise<void> {
  await expectMarks(page, 'Collection', [], null)
  await expectMarks(page, 'Written key', [], null)
  for (const label of ['Collection', 'Written key'] as const) {
    await expect(field(page, label)).toHaveCount(1)
    await expect(
      field(page, label).locator('.field-note', { hasText: 'is meant for' }),
    ).toHaveCount(0)
  }
}

/** Intent: one radio is the checked option of its group. */
async function expectChecked(page: Page, label: string, option: string): Promise<void> {
  await expect(radio(page, label, option)).toHaveAttribute('aria-checked', 'true')
}

/** Intent: the box shows Reel with its description line. */
async function expectReelShown(page: Page): Promise<void> {
  await expectPresetShown(page, 'Reel')
  await expect(presetDescription(page)).toHaveText(REEL_DESCRIPTION)
}

/** What a segment's `::after` computes to, beside the mark size token resolved to pixels. */
interface MarkBox {
  readonly content: string
  readonly blockSize: string
  readonly inlineSize: string
  readonly token: string
}

/**
 * Intent: a segment's `::after` as computed, with `--segment-mark-size` resolved to pixels by a
 * probe sized with it, removed at once.
 */
function markBox(segment: Locator): Promise<MarkBox> {
  return segment.evaluate((element) => {
    const after = getComputedStyle(element, '::after')
    const probe = document.createElement('span')
    probe.style.display = 'block'
    probe.style.inlineSize = 'var(--segment-mark-size)'
    element.append(probe)
    const token = getComputedStyle(probe).inlineSize
    probe.remove()
    return {
      content: after.content,
      blockSize: after.blockSize,
      inlineSize: after.inlineSize,
      token,
    }
  })
}

// @test-link [[module_key_and_mode_marks]]
// @test-link [[ui_segmented_control_marked_option]]
// @test-link [[rule_restriction_in_force]]
test('Reel chosen through the box from C Ionian marks Mixolydian and Dorian on Collection, with a note the radiogroup names, and nothing on Written key', async ({
  page,
}) => {
  await gotoWorkspaceHarness(page)
  await expectChecked(page, 'Collection', 'Ionian')
  await expectNoMarks(page)

  await choosePreset(page, 'Reel')

  await expectChecked(page, 'Written key', 'C')
  await expectChecked(page, 'Collection', 'Mixolydian')
  await expectReelMarks(page)
})

// @test-link [[module_key_and_mode_marks]]
// @test-link [[rule_restriction_in_force]]
// @test-link [[rule_custom_names_its_base]]
test('choosing Ionian under Reel turns the box to Custom, based on Reel and removes the marks and the note; Dorian brings them back, the box staying Custom', async ({
  page,
}) => {
  await gotoWorkspaceHarness(page)
  await choosePreset(page, 'Reel')
  await expectReelMarks(page)

  await radio(page, 'Collection', 'Ionian').click()
  await expectChecked(page, 'Collection', 'Ionian')
  await expectPresetShown(page, 'Custom, based on Reel')
  await expectNoMarks(page)

  await radio(page, 'Collection', 'Dorian').click()
  await expectChecked(page, 'Collection', 'Dorian')
  await expectReelMarks(page)
  await expectPresetShown(page, 'Custom, based on Reel')
  expect((await harnessSnapshot(page)).selection).toEqual({ kind: 'custom', baseId: 'reel' })
})

for (const preset of BUILT_IN_MODES) {
  // @test-link [[rule_restriction_highlight_never_blocks]]
  // @test-link [[ui_segmented_control_marked_option]]
  test(`under ${preset.name}, every Written key and Collection segment is enabled, and another key and the mode ${preset.other} are taken when clicked`, async ({
    page,
  }) => {
    await gotoWorkspaceHarness(page)
    await choosePreset(page, preset.name)
    await expectMarks(
      page,
      'Collection',
      preset.modes === 'any'
        ? []
        : // The control's order, which the marks follow.
          ['Major', 'Dorian', 'Mixolydian'].filter((mode) =>
            (preset.modes as readonly string[]).includes(mode),
          ),
      preset.modes === 'any'
        ? null
        : `${preset.name} is meant for ${preset.modes.join(' or ')}, marked. Any mode works; another one makes your settings Custom.`,
    )

    for (const [label, count] of [
      ['Written key', 12],
      ['Collection', 9],
    ] as const) {
      const segments = group(page, label).getByRole('radio')
      await expect(segments).toHaveCount(count)
      for (let index = 0; index < count; index++) await expect(segments.nth(index)).toBeEnabled()
      await expect(
        group(page, label).locator('[role="radio"]:disabled, [aria-disabled="true"]'),
      ).toHaveCount(0)
    }

    await radio(page, 'Written key', 'F-sharp/G-flat').click()
    await expectChecked(page, 'Written key', 'F-sharp/G-flat')
    await radio(page, 'Collection', preset.other).click()
    await expectChecked(page, 'Collection', preset.other)
    await expectPresetShown(
      page,
      preset.modes === 'any' ? preset.name : `Custom, based on ${preset.name}`,
    )
  })
}

// @test-link [[ui_segmented_control_marked_option]]
test('a mark is a dot the size of --segment-mark-size drawn as the segment’s ::after, on the checked segment too, and an unmarked segment draws none', async ({
  page,
}) => {
  await gotoWorkspaceHarness(page)
  await choosePreset(page, 'Reel')
  await expectReelMarks(page)

  const checkedMarked = radio(page, 'Collection', 'Mixolydian')
  const marked = radio(page, 'Collection', 'Dorian')
  const unmarked = radio(page, 'Collection', 'Ionian')
  await expect(checkedMarked).toHaveAttribute('aria-checked', 'true')

  for (const segment of [checkedMarked, marked]) {
    const box = await markBox(segment)
    expect(box.content).not.toBe('none')
    expect(Number.parseFloat(box.token)).toBeGreaterThan(0)
    expect(box.blockSize).toBe(box.token)
    expect(box.inlineSize).toBe(box.token)
  }
  expect((await markBox(unmarked)).content).toBe('none')
  expect((await markBox(radio(page, 'Written key', 'C'))).content).toBe('none')
})

// @test-link [[module_key_and_mode_marks]]
// @test-link [[rule_restriction_in_force]]
// @test-link [[rule_restriction_highlight_never_blocks]]
test('during a session started under Reel at C Mixolydian the marks and the note keep their start state through the count-in and the running session, and after Stop follow the player’s settings again', async ({
  page,
}) => {
  test.setTimeout(90_000)
  await gotoSessionHarness(page)
  await choosePreset(page, 'Reel')
  await readyToStart(page)
  await expectReelMarks(page)

  await startSession(page)
  await expectReelMarks(page)
  await toCountInMiddle(page)
  await expectReelMarks(page)
  await toRunning(page)
  await expectReelMarks(page)
  await expectReelShown(page)

  await sessionAction(page).click()
  await expect.poll(async () => (await sessionState(page)).review?.showing).toBe(true)
  await expectChecked(page, 'Collection', 'Mixolydian')
  await expectReelMarks(page)
  // In the review mode the marks follow the player's settings: out of the restriction, none.
  await radio(page, 'Collection', 'Ionian').click()
  await expectPresetShown(page, 'Custom, based on Reel')
  await expectNoMarks(page)
})

// @test-link [[module_key_and_mode_marks]]
// @test-link [[rule_restriction_in_force]]
// @test-link [[rule_restriction_highlight_never_blocks]]
test('after Start with this phrase, phrase 1 made at C Ionian under Neutral shows Ionian checked through the count-in and phrase 1 while Reel’s marks and note stay as Start showed them', async ({
  page,
}) => {
  test.setTimeout(120_000)
  await gotoSessionHarness(page)
  await readyToStart(page)
  await expectChecked(page, 'Collection', 'Ionian')
  await expectNoMarks(page)
  await choosePreset(page, 'Reel')
  await expectChecked(page, 'Collection', 'Mixolydian')
  await expectReelMarks(page)

  await sessionAction(page).click()
  const prompt = page.getByRole('alertdialog', {
    name: 'This phrase is from before your changes',
  })
  await expect(prompt).toBeVisible()
  await prompt.getByRole('button', { name: 'Start with this phrase', exact: true }).click()
  await expect(prompt).toHaveCount(0)
  await expect(sessionAction(page)).toHaveText('Stop')
  expect((await sessionState(page)).phase).toBe('count-in')

  // The count-in shows phrase 1's mode, with the marks Start showed.
  await expectChecked(page, 'Collection', 'Ionian')
  await expectReelMarks(page)
  await expectReelShown(page)
  await expect(presetBox(page)).toHaveAttribute('aria-readonly', 'true')

  await untilReady(page, 2)
  await toBarline(page, 1, 3)
  await expectChecked(page, 'Collection', 'Ionian')
  await expectReelMarks(page)
  await expectReelShown(page)

  // Phrase 2, made under the session's settings, shows Reel's Mixolydian; the marks are unchanged.
  await toBarline(page, 2, 0)
  await expectChecked(page, 'Collection', 'Mixolydian')
  await expectReelMarks(page)
  await expectReelShown(page)
  await sessionAction(page).click()
})
