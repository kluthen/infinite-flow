/**
 * What the connection sheet shows for its current stage, as pure data: the title, the action
 * buttons (primary first) and which element takes focus when the stage is entered. Copy is the
 * screen handoff's, verbatim (screens/controller-connection/handoff.md, States and Named actions).
 */
import type { SheetEvent, SheetStage } from './connection-sheet-model'

/** A named action of the sheet, as the reducer takes it. */
export type SheetActionName = Extract<SheetEvent, { kind: 'action' }>['action']

/** One button of `sheet-actions`: what it does, its label, and whether it is the main action. */
export interface SheetActionButton {
  readonly action: SheetActionName
  readonly label: string
  readonly primary: boolean
}

/** Where focus goes when a stage is entered: the picker's tab stop, the first action, or Close. */
export type SheetFocusTarget = 'picker' | 'first-action' | 'close'

/** An open stage: every stage but `closed`, which shows nothing. */
export type OpenSheetStage = Exclude<SheetStage, { kind: 'closed' }>

const CONTINUE_WITHOUT: SheetActionButton = {
  action: 'close',
  label: 'Continue without a controller',
  primary: false,
}

/**
 * Intent: the title naming the stage in plain language; Requesting access has two (Checking, or
 * Waiting for your browser).
 */
// @spec-link [[rule_controller_connects_between_sessions]]
// @spec-link [[rule_chromium_only_support]]
export function sheetTitle(stage: OpenSheetStage): string {
  switch (stage.kind) {
    case 'requesting':
      return stage.waiting ? 'Allow MIDI access' : 'Connecting…'
    case 'unsupported':
      return "Controller connection isn't available here"
    case 'denied':
      return 'MIDI access is blocked'
    case 'no-device':
      return 'No controller found'
    case 'picker':
      return 'Choose a controller'
    case 'check':
      return 'Check your controller'
    case 'connected':
      return 'Controller connected'
  }
}

/**
 * Intent: the stage's action buttons, the primary one first. `Choose a different device` shows on
 * Connected only once more than one input has been seen this page session; Requesting access and
 * the check's Prompt have none; Unsupported browser has no retry.
 */
// @spec-link [[rule_controller_connects_between_sessions]]
// @spec-link [[rule_controller_transposition_check]]
export function sheetActions(
  stage: SheetStage,
  seenDeviceCount: number,
): readonly SheetActionButton[] {
  switch (stage.kind) {
    case 'unsupported':
      return [{ ...CONTINUE_WITHOUT, primary: true }]
    case 'denied':
      return [{ action: 'check-again', label: 'Check again', primary: true }, CONTINUE_WITHOUT]
    case 'no-device':
      return [{ action: 'try-again', label: 'Try again', primary: true }, CONTINUE_WITHOUT]
    case 'picker':
      return [CONTINUE_WITHOUT]
    case 'check':
      return stage.played === null ? [] : checkResultActions()
    case 'connected':
      return connectedActions(seenDeviceCount)
    case 'requesting':
    case 'closed':
      return []
  }
}

/** Intent: a check result's actions: Continue (main), Run check again. */
function checkResultActions(): readonly SheetActionButton[] {
  return [
    { action: 'continue', label: 'Continue', primary: true },
    { action: 'run-check-again', label: 'Run check again', primary: false },
  ]
}

/** Intent: Connected's actions: Done (main), Run check again, the conditional choice, Disconnect. */
function connectedActions(seenDeviceCount: number): readonly SheetActionButton[] {
  const choose: readonly SheetActionButton[] =
    seenDeviceCount > 1
      ? [{ action: 'choose-different', label: 'Choose a different device', primary: false }]
      : []
  return [
    { action: 'done', label: 'Done', primary: true },
    { action: 'run-check-again', label: 'Run check again', primary: false },
    ...choose,
    { action: 'disconnect', label: 'Disconnect', primary: false },
  ]
}

/**
 * Intent: the stage's main focus target: the picker's tab stop in the picker, the primary action
 * where there is one, else `sheet-close` (Requesting access, the check's Prompt).
 */
// @spec-link [[rule_controller_connects_between_sessions]]
export function sheetFocusTarget(
  stage: SheetStage,
  actions: readonly SheetActionButton[],
): SheetFocusTarget {
  if (stage.kind === 'picker') return 'picker'
  return actions[0]?.primary === true ? 'first-action' : 'close'
}
