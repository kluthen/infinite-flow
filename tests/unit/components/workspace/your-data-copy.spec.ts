// @vitest-environment node
/**
 * The Your data sheet's words (ui_ux screens/your-data): the counts in the singular for one, the
 * space line's rounding, the Settings line, the Presets lines and each row's Delete name, the notice
 * of each form that saves nothing, and the five confirmations; and the form the sheet takes from
 * the load's outcome and the saving state.
 */
import { describe, expect, it } from 'vitest'

import { yourDataForm } from '@/components/workspace/use-your-data-sheet'
import {
  confirmationCopy,
  controllerLine,
  playedNotesLine,
  presetConfirmationCopy,
  presetDeleteLabel,
  presetsLines,
  protectionLine,
  savingOffNotice,
  sessionsLine,
  SETTINGS_LINE,
  spaceLine,
} from '@/components/workspace/your-data-copy'

// @test-link [[req_your_data]]
describe('the Overview lines', () => {
  it('count sessions, pins and favorites, the singular for one and words for none', () => {
    expect(sessionsLine(0, 0, 0)).toBe('No sessions kept yet.')
    expect(sessionsLine(1, 0, 0)).toBe('1 session kept: none pinned, no favorite phrases.')
    expect(sessionsLine(3, 2, 1)).toBe('3 sessions kept: 2 pinned, 1 favorite phrase.')
    expect(sessionsLine(4, 1, 5)).toBe('4 sessions kept: 1 pinned, 5 favorite phrases.')
    expect(playedNotesLine(0)).toBe('None kept.')
    expect(playedNotesLine(1)).toBe('Kept with 1 session.')
    expect(playedNotesLine(2)).toBe('Kept with 2 sessions.')
    expect(controllerLine(null)).toBe('None remembered.')
    expect(controllerLine('Keys 49')).toBe("Keys 49. It reconnects by itself when it's plugged in.")
  })

  it('round the space used: under 1 KB, whole KB, MB with one decimal under 10 MB, whole MB after', () => {
    /** Intent: the line for `bytes` measured. */
    const measured = (bytes: number) => spaceLine({ kind: 'measured', bytes })
    expect(spaceLine({ kind: 'measuring' })).toBe('Measuring…')
    expect(spaceLine({ kind: 'unmeasured' })).toBe("Couldn't be measured.")
    expect(measured(0)).toBe('Less than 1 KB')
    expect(measured(1023)).toBe('Less than 1 KB')
    expect(measured(1024)).toBe('About 1 KB')
    expect(measured(400 * 1024)).toBe('About 400 KB')
    expect(measured(1024 * 1024 - 1)).toBe('About 1.0 MB')
    expect(measured(2.5 * 1024 * 1024)).toBe('About 2.5 MB')
    expect(measured(9.96 * 1024 * 1024)).toBe('About 10 MB')
    expect(measured(12.4 * 1024 * 1024)).toBe('About 12 MB')
  })

  // @test-link [[rule_persistent_storage_requested]]
  it('say whether the browser protects the data', () => {
    expect(protectionLine('checking')).toBe('Checking…')
    expect(protectionLine('protected')).toMatch(/^Protected\. /)
    expect(protectionLine('not-protected')).toMatch(/^Not protected\. /)
  })
})

// @test-link [[req_your_data]]
describe('the Settings and Presets sections', () => {
  // @test-link [[req_your_data]]
  it('name the preset among the settings', () => {
    expect(SETTINGS_LINE).toBe(
      "The phrase controls, the preset, the instrument choice, the theme, the audio mix, the During a session options and the review's choices. They come back as you left them.",
    )
    expect(SETTINGS_LINE).not.toContain('musical profile')
  })

  // @test-link [[req_your_data]]
  it('count the player presets, the singular for one, and say how to save one with none', () => {
    const hint =
      'Delete one here, or with Delete preset in the controls. Delete everything removes them all.'
    expect(presetsLines(0)).toEqual(['None.', 'Save one with Save as new preset, in the controls.'])
    expect(presetsLines(1)).toEqual(['1 preset of your own.', hint])
    expect(presetsLines(3)).toEqual(['3 presets of your own.', hint])
  })

  // @test-link [[req_your_data]]
  it("name each row's Delete by its preset", () => {
    expect(presetDeleteLabel('Late night')).toBe('Delete preset Late night')
  })
})

// @test-link [[rule_outdated_tab_stops_saving]]
// @test-link [[rule_failed_read_offers_only_delete_everything]]
describe('the forms that save nothing', () => {
  it('follow the load outcome and the saving state', () => {
    expect(yourDataForm('saved-data-read', 'on')).toBe('overview')
    expect(yourDataForm('started-from-defaults', 'off-unreadable')).toBe('unreadable')
    expect(yourDataForm('saved-data-read', 'off-outdated')).toBe('outdated')
    expect(yourDataForm('started-from-defaults', 'off-outdated')).toBe('outdated-defaults')
    expect(savingOffNotice('overview')).toBeNull()
    expect(savingOffNotice('unreadable')).toMatch(/delete everything to start afresh\.$/)
    expect(savingOffNotice('outdated')).toMatch(/^A newer version of the app saved this data/)
    expect(savingOffNotice('outdated-defaults')).toMatch(
      /Reload the page to use the newer version\.$/,
    )
  })
})

// @test-link [[req_your_data]]
// @test-link [[rule_delete_everything]]
// @test-link [[rule_kept_played_notes_deletable]]
describe('the confirmations', () => {
  it('ask their question, say what goes and end with "This can\'t be undone."', () => {
    const one = confirmationCopy('every-session', 1)
    expect(one.title).toBe('Delete every session?')
    expect(one.paragraphs[0]).toMatch(/^This deletes the one kept session, with its favorite/)
    expect(confirmationCopy('every-session', 3).paragraphs[0]).toMatch(
      /^This deletes all 3 kept sessions, pinned ones included/,
    )
    expect(confirmationCopy('kept-played-notes', 2)).toMatchObject({
      title: 'Delete the played notes already kept?',
      confirmLabel: 'Delete them',
      cancelLabel: 'Keep them',
    })
    expect(confirmationCopy('all-played-notes', 1).paragraphs[0]).toBe(
      'This deletes the played notes kept with 1 session. The sessions stay, with their favorite phrases and comments.',
    )
    expect(confirmationCopy('everything', 0).confirmLabel).toBe('Delete everything')
    for (const kind of [
      'every-session',
      'all-played-notes',
      'kept-played-notes',
      'everything',
    ] as const)
      expect(confirmationCopy(kind, 2).paragraphs[1]).toBe("This can't be undone.")
  })
})

// @test-link [[req_your_data]]
describe("the preset's confirmation", () => {
  // @test-link [[req_your_data]]
  it("asks in the preset sheet's words, its settings staying", () => {
    expect(presetConfirmationCopy('Late night')).toEqual({
      title: 'Delete the preset “Late night”?',
      paragraphs: ['Your settings stay as they are.', "This can't be undone."],
      confirmLabel: 'Delete preset',
      cancelLabel: 'Cancel',
    })
  })
})

// @test-link [[rule_delete_everything]]
describe("Delete everything's confirmation", () => {
  // @test-link [[rule_delete_everything]]
  it('names the presets among what goes', () => {
    expect(confirmationCopy('everything', 0).paragraphs[0]).toBe(
      'This deletes everything the app keeps on this device: your settings, your presets, your instrument, the remembered controller and every kept session, with its favorite phrases, comments and played notes. The page then reloads and starts as on a first visit.',
    )
  })
})
