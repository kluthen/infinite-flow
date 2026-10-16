/**
 * Shared helpers for the connection sheet's component specs: open the real sheet over a MIDI
 * controller wired to the fake MIDI access (making the connect attempt the header click makes),
 * and read or drive what it shows.
 */
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'

import ConnectionSheet from '@/components/controller-connection/ConnectionSheet.vue'
import type {
  ConnectionSheetSessionsProps,
  SheetOpenAt,
} from '@/components/controller-connection/connection-sheet-contract'
import type { InstrumentClef } from '@/domain/profile/instrument-clef'
import type { InstrumentProfile } from '@/domain/profile/instrument-profile'
import {
  ADOPTED_INSTRUMENT_PROFILES,
  C_KEYBOARD_PROFILE,
} from '@/domain/profile/instrument-profiles'
import type { MyInstrument } from '@/domain/profile/my-instrument'
import type { ControllerRig } from '../../midi/midi-controller-rig'

/** How the sheet opens: where, for which profile, and how many inputs the page has seen. */
export interface OpenSheetOptions {
  readonly openAt?: SheetOpenAt
  readonly profile?: InstrumentProfile
  readonly clef?: InstrumentClef
  readonly seenDeviceCount?: number
  /** The saved my instrument, if any (none by default). */
  readonly myInstrument?: MyInstrument | null
  /** The kept sessions of my instrument counted (none by default). */
  readonly myInstrumentSessions?: ConnectionSheetSessionsProps['myInstrumentSessions']
  /** The `Use and erase` batch (one that is never expected by default). */
  readonly useAndErase?: ConnectionSheetSessionsProps['useAndErase']
}

/** No kept session of my instrument counted. */
export const NO_SESSIONS_COUNTED = Object.freeze({
  count: 0,
  reviewed: false,
  withheld: false,
  deletes: () => Promise.resolve([]),
  leave: () => undefined,
})

export type SheetWrapper = VueWrapper<InstanceType<typeof ConnectionSheet>>

/**
 * Intent: open the sheet as the header click does: at Requesting access the click has already
 * read the permission and started connect() (none on a browser without Web MIDI); at Connected
 * nothing is asked. Mounted into the document so focus can be read; promises are then flushed.
 */
// @test-link [[rule_controller_connects_between_sessions]]
export async function openSheet(
  rig: ControllerRig,
  options: OpenSheetOptions = {},
): Promise<SheetWrapper> {
  const openAt = options.openAt ?? 'requesting'
  const asks = openAt === 'requesting' && rig.controller.state().kind !== 'unsupported'
  const connecting = asks
    ? { permission: rig.controller.permission(), settled: rig.controller.connect() }
    : null
  const wrapper = mount(ConnectionSheet, {
    props: {
      midi: rig.controller,
      openAt,
      connecting,
      profile: options.profile ?? C_KEYBOARD_PROFILE,
      clef: options.clef ?? 'treble',
      profiles: ADOPTED_INSTRUMENT_PROFILES,
      seenDeviceCount: options.seenDeviceCount ?? 1,
      myInstrument: options.myInstrument ?? null,
      myInstrumentSessions: options.myInstrumentSessions ?? NO_SESSIONS_COUNTED,
      useAndErase:
        options.useAndErase ??
        (() => Promise.reject(new Error('connection sheet rig: no Use and erase is expected'))),
    },
    attachTo: document.body,
  })
  await flushPromises()
  return wrapper
}

/** Intent: the sheet's title text. */
export function title(wrapper: SheetWrapper): string {
  return wrapper.get('.sheet-title').text()
}

/** Intent: the sheet body's own paragraphs and alerts, as trimmed texts in order. */
export function bodyLines(wrapper: SheetWrapper): string[] {
  return wrapper.findAll('.sheet-body > p, .sheet-body > .inline-alert').map((el) => el.text())
}

/** Intent: the lines of the check result's alert, in order. */
export function resultLines(wrapper: SheetWrapper): string[] {
  return wrapper.findAll('.sheet-body > .inline-alert.alert-notice > p').map((el) => el.text())
}

/** Intent: the labels of the sheet's action buttons, in markup order. */
export function actionLabels(wrapper: SheetWrapper): string[] {
  return wrapper.findAll('.sheet-actions button').map((button) => button.text())
}

/** Intent: the labels of the sheet's primary action buttons. */
export function primaryLabels(wrapper: SheetWrapper): string[] {
  return wrapper.findAll('.sheet-actions button.btn-primary').map((button) => button.text())
}

/** Intent: the action button with this label; a missing one fails the test. */
export function action(wrapper: SheetWrapper, label: string): HTMLButtonElement {
  const found = wrapper.findAll('.sheet-actions button').find((button) => button.text() === label)
  if (found === undefined) throw new Error(`no sheet action labeled "${label}"`)
  return found.element as HTMLButtonElement
}

/** Intent: click the action with this label, then let the sheet react and move focus. */
export async function clickAction(wrapper: SheetWrapper, label: string): Promise<void> {
  action(wrapper, label).click()
  await flushPromises()
}

/** Intent: the picker's device options, in markup order. */
export function options(wrapper: SheetWrapper): HTMLButtonElement[] {
  return wrapper.findAll('.device-option').map((option) => option.element as HTMLButtonElement)
}

/** Intent: the picker's option labels, in markup order. */
export function optionLabels(wrapper: SheetWrapper): string[] {
  return options(wrapper).map((option) => option.textContent?.trim() ?? '')
}

/** Intent: the sheet's Close button. */
export function closeButton(wrapper: SheetWrapper): HTMLButtonElement {
  return wrapper.get('.sheet-close').element as HTMLButtonElement
}

/** Intent: press a key on the focused element (or the body), as a keyboard user would. */
export async function press(key: string, init: KeyboardEventInit = {}): Promise<void> {
  const target = document.activeElement ?? document.body
  target.dispatchEvent(
    new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...init }),
  )
  await flushPromises()
}

/** Intent: whether the sheet asked its host to close. */
export function closed(wrapper: SheetWrapper): boolean {
  return (wrapper.emitted('close') ?? []).length > 0
}
