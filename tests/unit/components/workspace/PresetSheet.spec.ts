/**
 * The preset sheet (`screens/preset-sheet/`), in its four modes: Save as new (the name, prefilled
 * and selected, then the Key and mode choice, "As now" by default and merged choices), Save
 * changes (the reason, then Key and mode, "Any key and mode" by default), Rename (the name only)
 * and the delete confirmation. The refused name's one reason in a polite `name-alert`, the main
 * action disabled meanwhile and Enter doing nothing; the choice list a radiogroup with one tab
 * stop and arrow keys; focus on open per mode and trapped; Escape, the backdrop and Close as
 * Cancel; a failed deletion keeping the confirmation with its error line, the way back inert while
 * it runs.
 */
import { mount, type VueWrapper } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { nextTick } from 'vue'

import PresetSheet from '@/components/workspace/PresetSheet.vue'
import type { PresetSheetOpening } from '@/components/workspace/load-preset-sheet'
import type { PresetDeletionOutcome } from '@/components/workspace/use-player-presets'
import { BUILT_IN_PRESETS, builtInPreset } from '@/domain/presets/built-in-presets'
import { checkPresetName } from '@/domain/presets/preset-names'
import { saveAsNewChoices, saveChangesQuestion } from '@/domain/presets/preset-save-choices'
import { makePreset, type Preset } from '@/domain/presets/preset-selection'

/** A player preset: Jazz's values, meant for Dorian in any key. */
const LATE_NIGHT: Preset = makePreset({
  ...builtInPreset('jazz'),
  id: 'player-1',
  name: 'Late night',
  restriction: { keys: 'any', modes: ['Dorian'] },
  kind: 'player',
})

const PRESETS: readonly Preset[] = [...BUILT_IN_PRESETS, LATE_NIGHT]

/** Save as new from Custom based on Reel, in D Dorian: "As now" is Mixolydian or Dorian. */
const SAVE_AS_NEW_FROM_REEL: PresetSheetOpening = {
  mode: 'save-as-new',
  suggestedName: 'My preset',
  choices: saveAsNewChoices({ kind: 'custom', baseId: 'reel' }, 'D', 'Dorian', PRESETS),
}

/** Intent: Save changes into Late night from G Ionian, outside its restriction. */
function saveChangesOpening(): PresetSheetOpening {
  const question = saveChangesQuestion(LATE_NIGHT, 'G', 'Ionian')
  if (!question.asks) throw new Error('Save changes from G Ionian must ask')
  return { mode: 'save-changes', preset: LATE_NIGHT, choices: question.choices }
}

let wrapper: VueWrapper | null = null

/** Intent: the sheet mounted on the page, opened as `opening`, its deletion resolving `deletion`. */
function mountSheet(
  opening: PresetSheetOpening,
  deletion: () => Promise<PresetDeletionOutcome> = () => Promise.resolve('deleted'),
) {
  const renaming = opening.mode === 'rename' ? opening.preset.id : undefined
  const deletePreset = vi.fn(deletion)
  wrapper = mount(PresetSheet, {
    props: {
      opening,
      checkName: (typed: string) => checkPresetName(typed, PRESETS, renaming),
      deletePreset,
    },
    attachTo: document.body,
  })
  return Object.assign(wrapper, { deletePreset })
}

/** Intent: the sheet's button whose text is `label`. */
function button(mounted: VueWrapper, label: string) {
  const found = mounted.findAll('button').find((candidate) => candidate.text() === label)
  if (found === undefined) throw new Error(`no "${label}" button`)
  return found
}

/** Intent: the name field. */
function nameField(mounted: VueWrapper): HTMLInputElement {
  return mounted.get('input.text-input').element as HTMLInputElement
}

/** Intent: type `text` into the name field, replacing what it holds. */
async function typeName(mounted: VueWrapper, text: string): Promise<void> {
  await mounted.get('input.text-input').setValue(text)
}

/** Intent: the Key and mode options' labels and checked states, in order. */
function choices(mounted: VueWrapper): string[] {
  return mounted
    .findAll('[role="radio"]')
    .map((option) => `${option.text()}${option.attributes('aria-checked') === 'true' ? ' *' : ''}`)
}

/** Intent: press a key on the document, as the player would anywhere in the page. */
function press(key: string, shiftKey = false): void {
  document.dispatchEvent(new KeyboardEvent('keydown', { key, shiftKey, bubbles: true }))
}

afterEach(() => {
  wrapper?.unmount()
  wrapper = null
  document.body.innerHTML = ''
})

// @test-link [[rule_preset_management_actions]]
describe('the preset sheet', () => {
  // @test-link [[rule_saving_preset_asks_its_restriction]]
  // @test-link [[rule_player_preset_names]]
  it('Save as new: the title, the name prefilled and selected with focus, the 40-character field, and "As now" checked first', () => {
    const sheet = mountSheet(SAVE_AS_NEW_FROM_REEL)

    expect(sheet.get('[role="dialog"]').attributes('aria-modal')).toBe('true')
    expect(sheet.get('.sheet-title').text()).toBe('Save as a new preset')
    const field = nameField(sheet)
    expect(field.value).toBe('My preset')
    expect(field.maxLength).toBe(40)
    expect(document.activeElement).toBe(field)
    expect([field.selectionStart, field.selectionEnd]).toEqual([0, 'My preset'.length])
    expect(sheet.get(`label[for="${field.id}"]`).text()).toBe('Name')
    expect(choices(sheet)).toEqual([
      'As now: Mixolydian or Dorian in any key *',
      'Only D Dorian',
      'Any key and mode',
    ])
    const group = sheet.get('[role="radiogroup"]')
    expect(document.getElementById(group.attributes('aria-labelledby') ?? '')?.textContent).toBe(
      'Key and mode',
    )
    expect(
      document.getElementById(group.attributes('aria-describedby') ?? '')?.textContent,
    ).toContain('Which keys and modes this preset is meant for.')
    expect(sheet.findAll('.sheet-actions button').map((found) => found.text())).toEqual([
      'Save',
      'Cancel',
    ])
    expect(sheet.find('.name-alert').exists()).toBe(false)
  })

  // @test-link [[rule_saving_preset_asks_its_restriction]]
  it('Save as new merges the choices that mean the same restriction, keeping the default first', () => {
    const anyNow = mountSheet({
      mode: 'save-as-new',
      suggestedName: 'My preset',
      choices: saveAsNewChoices({ kind: 'preset', presetId: 'neutral' }, 'C', 'Ionian', PRESETS),
    })
    expect(choices(anyNow)).toEqual(['Any key and mode *', 'Only C Ionian'])
    anyNow.unmount()

    const exactlyNow = makePreset({
      ...LATE_NIGHT,
      id: 'player-2',
      name: 'G Dorian only',
      restriction: { keys: ['G'], modes: ['Dorian'] },
    })
    const presets = [...PRESETS, exactlyNow]
    const onlyNow = mountSheet({
      mode: 'save-as-new',
      suggestedName: 'My preset',
      choices: saveAsNewChoices({ kind: 'preset', presetId: 'player-2' }, 'G', 'Dorian', presets),
    })
    expect(choices(onlyNow)).toEqual(['Only G Dorian *', 'Any key and mode'])
  })

  // @test-link [[rule_saving_preset_asks_its_restriction]]
  // @test-link [[rule_preset_management_actions]]
  it('Save reports the name as typed and the restriction choice checked', async () => {
    const sheet = mountSheet(SAVE_AS_NEW_FROM_REEL)
    await typeName(sheet, '  Evening reel ')
    await button(sheet, 'Save').trigger('click')
    expect(sheet.emitted('save-as-new')).toEqual([['  Evening reel ', 'asNow']])

    await sheet.findAll('[role="radio"]')[2]?.trigger('click')
    await button(sheet, 'Save').trigger('click')
    expect(sheet.emitted('save-as-new')?.[1]).toEqual(['  Evening reel ', 'anyKeyAndMode'])
  })

  // @test-link [[rule_player_preset_names]]
  it("names a refused name's first reason in a polite name-alert as it is typed, Save disabled meanwhile", async () => {
    const sheet = mountSheet(SAVE_AS_NEW_FROM_REEL)
    const reasons: [string, string][] = [
      ['', 'Give it a name.'],
      ['   ', 'Give it a name.'],
      ['cUsToM', '“Custom” is used by the app. Choose another name.'],
      ['  jazz ', "There's already a preset called “Jazz”."],
      ['late NIGHT', "There's already a preset called “Late night”."],
    ]
    for (const [typed, reason] of reasons) {
      await typeName(sheet, typed)
      const alert = sheet.get('.name-alert')
      expect(alert.classes()).toEqual(['inline-alert', 'alert-notice', 'name-alert'])
      expect(alert.attributes('role')).toBe('status')
      expect(alert.text(), typed).toBe(reason)
      expect(button(sheet, 'Save').attributes('disabled'), typed).toBeDefined()
    }

    await sheet.get('input.text-input').trigger('keydown', { key: 'Enter' })
    expect(sheet.emitted('save-as-new')).toBeUndefined()

    await typeName(sheet, 'Late nights')
    expect(sheet.find('.name-alert').exists()).toBe(false)
    expect(button(sheet, 'Save').attributes('disabled')).toBeUndefined()
    await sheet.get('input.text-input').trigger('keydown', { key: 'Enter' })
    expect(sheet.emitted('save-as-new')).toEqual([['Late nights', 'asNow']])
  })

  // @test-link [[rule_saving_preset_asks_its_restriction]]
  it('the Key and mode choice is one tab stop, the arrow keys checking and focusing the next option, wrapping', async () => {
    const sheet = mountSheet(SAVE_AS_NEW_FROM_REEL)
    /** Intent: the options as rendered now. */
    const options = () => sheet.findAll('[role="radio"]')
    expect(options().map((option) => option.attributes('tabindex'))).toEqual(['0', '-1', '-1'])

    await options()[0]?.trigger('keydown', { key: 'ArrowDown' })
    expect(choices(sheet)).toEqual([
      'As now: Mixolydian or Dorian in any key',
      'Only D Dorian *',
      'Any key and mode',
    ])
    expect(document.activeElement).toBe(options()[1]?.element)
    expect(options().map((option) => option.attributes('tabindex'))).toEqual(['-1', '0', '-1'])

    await options()[1]?.trigger('keydown', { key: 'ArrowRight' })
    await options()[2]?.trigger('keydown', { key: 'ArrowDown' })
    expect(choices(sheet)[0]).toBe('As now: Mixolydian or Dorian in any key *')
    await options()[0]?.trigger('keydown', { key: 'ArrowUp' })
    expect(choices(sheet)[2]).toBe('Any key and mode *')
    expect(document.activeElement).toBe(options()[2]?.element)
  })

  // @test-link [[rule_save_changes_restriction]]
  it('Save changes: the reason, "Any key and mode" checked and focused, no name field, and the answer reported', async () => {
    const sheet = mountSheet(saveChangesOpening())

    expect(sheet.get('.sheet-title').text()).toBe('Save changes to “Late night”')
    expect(sheet.get('.sheet-body > p').text()).toBe(
      'Your key and mode, G Ionian, are outside what “Late night” is meant for: Dorian in any key. Choose what it is meant for from now on.',
    )
    expect(sheet.find('input').exists()).toBe(false)
    expect(choices(sheet)).toEqual(['Any key and mode *', 'Only G Ionian'])
    expect(document.activeElement).toBe(sheet.findAll('[role="radio"]')[0]?.element)
    expect(sheet.findAll('.sheet-actions button').map((found) => found.text())).toEqual([
      'Save changes',
      'Cancel',
    ])

    await button(sheet, 'Save changes').trigger('click')
    await sheet.findAll('[role="radio"]')[0]?.trigger('keydown', { key: 'ArrowDown' })
    await button(sheet, 'Save changes').trigger('click')
    expect(sheet.emitted('save-changes')).toEqual([['anyKeyAndMode'], ['onlyThisKeyAndMode']])
  })

  // @test-link [[rule_player_preset_names]]
  it('Rename: the current name prefilled and selected with focus; a change of letter case alone is accepted', async () => {
    const sheet = mountSheet({ mode: 'rename', preset: LATE_NIGHT })

    expect(sheet.get('.sheet-title').text()).toBe('Rename “Late night”')
    const field = nameField(sheet)
    expect(field.value).toBe('Late night')
    expect(document.activeElement).toBe(field)
    expect([field.selectionStart, field.selectionEnd]).toEqual([0, 'Late night'.length])
    expect(sheet.find('[role="radiogroup"]').exists()).toBe(false)
    expect(sheet.find('.name-alert').exists()).toBe(false)

    await typeName(sheet, 'Bebop')
    expect(sheet.get('.name-alert').text()).toBe("There's already a preset called “Bebop”.")
    expect(button(sheet, 'Rename').attributes('disabled')).toBeDefined()

    await typeName(sheet, 'LATE NIGHT')
    expect(sheet.find('.name-alert').exists()).toBe(false)
    await button(sheet, 'Rename').trigger('click')
    expect(sheet.emitted('rename')).toEqual([['LATE NIGHT']])
  })

  // @test-link [[rule_preset_management_actions]]
  it('Escape, the backdrop, Close and Cancel each close it, reporting nothing else; Tab stays inside', async () => {
    const sheet = mountSheet(SAVE_AS_NEW_FROM_REEL)
    press('Escape')
    await sheet.get('.sheet-backdrop').trigger('click')
    await sheet.get('.sheet').trigger('click')
    await button(sheet, 'Close').trigger('click')
    await button(sheet, 'Cancel').trigger('click')
    expect(sheet.emitted('close')).toHaveLength(4)
    expect(sheet.emitted('save-as-new')).toBeUndefined()

    button(sheet, 'Cancel').element.focus()
    press('Tab')
    expect(document.activeElement).toBe(button(sheet, 'Close').element)
    press('Tab')
    expect(document.activeElement).toBe(nameField(sheet))
    press('Tab', true)
    press('Tab', true)
    expect(document.activeElement).toBe(button(sheet, 'Cancel').element)
  })

  // @test-link [[rule_deleting_base_preset_leaves_custom]]
  // @test-link [[rule_preset_management_actions]]
  it('the delete confirmation: its question and paragraphs, focus on Cancel, Delete preset in btn-error', () => {
    const sheet = mountSheet({ mode: 'delete', preset: LATE_NIGHT })

    expect(sheet.get('.sheet-title').text()).toBe('Delete the preset “Late night”?')
    expect(sheet.findAll('.sheet-body > p').map((found) => found.text())).toEqual([
      'Your settings stay as they are.',
      "This can't be undone.",
    ])
    expect(sheet.findAll('.sheet-actions button').map((found) => found.text())).toEqual([
      'Delete preset',
      'Cancel',
    ])
    expect(button(sheet, 'Delete preset').classes()).toContain('btn-error')
    expect(document.activeElement).toBe(button(sheet, 'Cancel').element)
  })

  // @test-link [[rule_deleting_base_preset_leaves_custom]]
  it('a failed deletion keeps the confirmation with its error line; the way back is inert while it runs, and a retry clears the line', async () => {
    /** Intent: settle the deletion running now with `outcome`. */
    let settle: (outcome: PresetDeletionOutcome) => void = () => {}
    const sheet = mountSheet(
      { mode: 'delete', preset: LATE_NIGHT },
      () =>
        new Promise((resolve) => {
          settle = resolve
        }),
    )

    await button(sheet, 'Delete preset').trigger('click')
    expect(sheet.deletePreset).toHaveBeenCalledTimes(1)
    expect(button(sheet, 'Delete preset').classes()).toContain('is-loading')
    press('Escape')
    await button(sheet, 'Cancel').trigger('click')
    expect(sheet.emitted('close')).toBeUndefined()

    settle('failed')
    await nextTick()
    await nextTick()
    expect(sheet.get('.inline-alert.alert-error').text()).toBe(
      "That couldn't be deleted. Try again.",
    )
    expect(sheet.get('.sheet-title').text()).toBe('Delete the preset “Late night”?')
    expect(button(sheet, 'Delete preset').attributes('disabled')).toBeUndefined()

    await button(sheet, 'Delete preset').trigger('click')
    expect(sheet.deletePreset).toHaveBeenCalledTimes(2)
    expect(sheet.find('.alert-error').exists()).toBe(false)
    settle('deleted')
    await nextTick()
    await nextTick()
    expect(sheet.find('.alert-error').exists()).toBe(false)

    await button(sheet, 'Cancel').trigger('click')
    expect(sheet.emitted('close')).toHaveLength(1)
  })
})
