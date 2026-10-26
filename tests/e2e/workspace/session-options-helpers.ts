/**
 * Shared helpers for the v3.2 "During a session" specs on the workspace harness (port 4175): the
 * `Rhythm lock` and `Vary settings` switches, their dependents' toggle lists (`Allowed rhythm
 * changes`, `What may vary`) and the player's choices the session controller holds, read through
 * `window.__workspaceHarness.session.state()`; a session played phrase by phrase on the fake audio
 * clock, each phrase readied before the clock reaches it; and the Vary settings groups each
 * setting of a shown setting set or a generation request belongs to.
 */
import { expect, type Locator, type Page } from '@playwright/test'

import { radio } from './helpers'
import { untilReady } from '../session/rolling-helpers'
import { clockTo, phraseStartsAt } from '../session/session-midi-helpers'
import { sessionState } from '../session/session-helpers'

/** The five allowed rhythm changes, in the order the list shows them and a record stores them. */
export const RHYTHM_CHANGES = [
  { kind: 'move_note_start', label: 'Move a note' },
  { kind: 'move_rest', label: 'Move a rest' },
  { kind: 'split_note', label: 'Split a note' },
  { kind: 'merge_notes', label: 'Merge two notes' },
  { kind: 'note_rest', label: 'Add or remove a rest' },
] as const

/** One allowed rhythm change's toggle name. */
export type RhythmChangeLabel = (typeof RHYTHM_CHANGES)[number]['label']

/** Vary settings' six groups, in the order What may vary shows them and a record stores them. */
export const VARY_GROUPS = [
  { group: 'keyAndMode', label: 'Key and mode' },
  { group: 'harmony', label: 'Harmony' },
  { group: 'tension', label: 'Tension' },
  { group: 'rhythm', label: 'Rhythm' },
  { group: 'melodyShape', label: 'Melody shape' },
  { group: 'figures', label: 'Embellishments' },
] as const

/** One of Vary settings' six groups. */
export type VaryGroup = (typeof VARY_GROUPS)[number]['group']

/** One group's toggle name. */
export type VaryGroupLabel = (typeof VARY_GROUPS)[number]['label']

/** All six groups on: the default. */
export const ALL_GROUPS_ON: Readonly<Record<VaryGroup, boolean>> = {
  keyAndMode: true,
  harmony: true,
  tension: true,
  rhythm: true,
  melodyShape: true,
  figures: true,
}

/** The `Vary settings` note, as the phrase-workspace handoff words it for v3.2. */
export const VARY_SETTINGS_NOTE =
  'Every 2 to 4 phrases, one setting from the groups below moves one step. Never the instrument or the tempo. Keys and modes stay within what your preset is meant for. Your settings come back when the session ends.'

/** Why `Vary settings` cannot be turned on while no move is possible. */
export const UNAVAILABLE_NOTE =
  'Nothing is allowed to vary with these choices. Turn on another group below.'

/** Why the `Rhythm` group cannot be changed while the rhythm lock is on. */
export const RHYTHM_LOCKED_NOTE = 'The rhythm lock holds the rhythm.'

/**
 * The group each mutable control belongs to (the session's MUTABLE_SETTING_GROUPS); the figure
 * levels are the Figures group, shown as Embellishments.
 */
const CONTROL_GROUPS: Readonly<Record<string, VaryGroup>> = {
  tonalCenter: 'keyAndMode',
  collection: 'keyAndMode',
  harmonicMotion: 'harmony',
  tension: 'tension',
  noteDensity: 'rhythm',
  rhythmicVariety: 'rhythm',
  syncopation: 'rhythm',
  silenceDensity: 'rhythm',
  contour: 'melodyShape',
  register: 'melodyShape',
  leapiness: 'melodyShape',
  arpeggioChaos: 'melodyShape',
}

/** The player's v3.2 session choices the controller holds, with Vary settings and its move. */
export interface SessionOptionChoices {
  readonly rhythmLockOn: boolean
  readonly allowedRhythmChanges: readonly string[]
  readonly allowedGroups: Readonly<Record<string, boolean>>
  readonly varySettings: boolean
  readonly varySettingsAvailable: boolean
}

/** Intent: the player's v3.2 session choices as the session controller holds them now. */
export async function sessionChoices(page: Page): Promise<SessionOptionChoices> {
  const state = await sessionState(page)
  return {
    rhythmLockOn: state.rhythmLockOn,
    allowedRhythmChanges: state.allowedRhythmChanges,
    allowedGroups: state.allowedGroups,
    varySettings: state.varySettings,
    varySettingsAvailable: state.varySettingsAvailable,
  }
}

/** Intent: the "During a session" control group. */
export function sessionGroup(page: Page): Locator {
  return page.locator('.control-group-session')
}

/** Intent: the `Allowed rhythm changes` toggle list, by its accessible name. */
export function allowedChangesList(page: Page): Locator {
  return page.getByRole('group', { name: 'Allowed rhythm changes', exact: true })
}

/** Intent: the `What may vary` toggle list, by its accessible name. */
export function whatMayVaryList(page: Page): Locator {
  return page.getByRole('group', { name: 'What may vary', exact: true })
}

/** Intent: one allowed rhythm change's toggle, by its name. */
export function changeToggle(page: Page, label: RhythmChangeLabel): Locator {
  return allowedChangesList(page).getByRole('button', { name: label, exact: true })
}

/** Intent: one Vary settings group's toggle, by its name. */
export function groupToggle(page: Page, label: VaryGroupLabel): Locator {
  return whatMayVaryList(page).getByRole('button', { name: label, exact: true })
}

/** Intent: the label of a radiogroup's checked segment, or null when none is checked. */
export async function checkedIn(page: Page, name: string): Promise<string | null> {
  const checked = page
    .getByRole('radiogroup', { name, exact: true })
    .locator('[role="radio"][aria-checked="true"]')
  return (await checked.count()) === 0 ? null : checked.innerText()
}

/**
 * Intent: each toggle of a toggle list as `{name}: {aria-pressed}`, plus `(disabled)` for a
 * natively disabled one, in the order shown; the hidden on/off word is left out of the name.
 */
export function toggleStates(list: Locator): Promise<string[]> {
  return list.getByRole('button').evaluateAll((buttons) =>
    buttons.map((button) => {
      const name = [...button.childNodes]
        .filter((node) => node.nodeType === Node.TEXT_NODE)
        .map((node) => node.textContent ?? '')
        .join('')
        .trim()
      const disabled = (button as HTMLButtonElement).disabled ? ' (disabled)' : ''
      return `${name}: ${button.getAttribute('aria-pressed')}${disabled}`
    }),
  )
}

/** Intent: turn `Rhythm lock` on or off with a click, waiting until the controller holds it. */
export async function setRhythmLock(page: Page, on: boolean): Promise<void> {
  await radio(page, 'Rhythm lock', on ? 'On' : 'Off').click()
  await expect.poll(async () => (await sessionChoices(page)).rhythmLockOn).toBe(on)
}

/** Intent: turn `Vary settings` on or off with a click, waiting until the controller holds it. */
export async function setVarySettings(page: Page, on: boolean): Promise<void> {
  await radio(page, 'Vary settings', on ? 'On' : 'Off').click()
  await expect.poll(async () => (await sessionChoices(page)).varySettings).toBe(on)
}

/** Intent: flip one allowed rhythm change with a click, waiting until its toggle shows it. */
export async function flipChange(page: Page, label: RhythmChangeLabel): Promise<void> {
  const toggle = changeToggle(page, label)
  const pressed = await toggle.getAttribute('aria-pressed')
  await toggle.click()
  await expect(toggle).toHaveAttribute('aria-pressed', pressed === 'true' ? 'false' : 'true')
}

/** Intent: flip one Vary settings group with a click, waiting until its toggle shows it. */
export async function flipGroup(page: Page, label: VaryGroupLabel): Promise<void> {
  const toggle = groupToggle(page, label)
  const pressed = await toggle.getAttribute('aria-pressed')
  await toggle.click()
  await expect(toggle).toHaveAttribute('aria-pressed', pressed === 'true' ? 'false' : 'true')
}

/**
 * Intent: move the fake clock to just past phrase `phraseNumber`'s start, after waiting until the
 * session has readied it: a generation slower than the fake clock would otherwise be cancelled
 * before its phrase sounds. Call it phrase after phrase from 2.
 */
export async function toPhraseStart(page: Page, phraseNumber: number): Promise<void> {
  await untilReady(page, phraseNumber)
  await clockTo(page, (await phraseStartsAt(page, phraseNumber)) + 0.1)
}

/**
 * Intent: the Vary settings groups whose settings differ between two shown setting sets: each
 * mutable control by its group, the figure levels as the Figures group.
 */
export function movedGroups(
  before: WorkspaceHarnessSettings,
  after: WorkspaceHarnessSettings,
): VaryGroup[] {
  const moved = new Set<VaryGroup>()
  for (const [control, group] of Object.entries(CONTROL_GROUPS)) {
    if (before.controls[control] !== after.controls[control]) moved.add(group)
  }
  if (JSON.stringify(before.figureLevels) !== JSON.stringify(after.figureLevels)) {
    moved.add('figures')
  }
  return VARY_GROUPS.map(({ group }) => group).filter((group) => moved.has(group))
}

/**
 * Intent: what a generation request carries of one group's settings, as one comparable string:
 * Key and mode by the written key and the collection (its tonal center is in concert pitch), the
 * Figures group by the figure levels, any other group by its controls.
 */
export function requestGroupValue(
  request: WorkspaceHarnessGenerationRequest,
  group: VaryGroup,
): string {
  if (group === 'keyAndMode') {
    return `${request.writtenTonalCenter} ${String(request.controls.collection)}`
  }
  if (group === 'figures') return JSON.stringify(request.figureLevels)
  return Object.entries(CONTROL_GROUPS)
    .filter(([, owner]) => owner === group)
    .map(([control]) => `${control}=${String(request.controls[control])}`)
    .join(' ')
}
