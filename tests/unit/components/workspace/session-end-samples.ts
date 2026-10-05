/**
 * The ways a session ends besides Stop, shared by the session-end specs, on the session controller
 * rig (fake audio clock at 240 BPM from 5 s: the count-in runs from 5.1 s to 6.1 s, when phrase 1
 * starts sounding): the page hidden, a portrait-shaped view, a held layout left too narrow (or,
 * below bp-tablet-landscape, too short), an audio interruption, and the engraving of phrase 1
 * failing at a new size; plus a rig whose session has reached a given phase and the end events it
 * sent its runners.
 */
import { expect } from 'vitest'

import { NotationError } from '@/notation/notation-error'
import type { SessionEndCause } from '@/session/session-types'
import { controllerRig, playTo, type ControllerRig } from './session-controller-rig'

/** A moment of each phase: inside the count-in, and once phrase 1 sounds. */
export const PHASE_TIMES = { 'count-in': 5.5, running: 6.6 } as const

export type Phase = keyof typeof PHASE_TIMES

/** One way a session ends on its own. */
export interface EndSample {
  readonly name: string
  readonly cause: SessionEndCause
  /** Prepare the window and the staff before the start (the held layout follows from them). */
  readonly before?: (rig: ControllerRig) => void
  readonly trigger: (rig: ControllerRig) => void
  /** Whether the audio was still running when it ended, so the controller faded it out. */
  readonly fades: boolean
}

/** Intent: a landscape window below bp-tablet-landscape, its staff split with room to spare. */
export function phoneWindow(rig: ControllerRig): void {
  rig.browser.windowShape.resize({ widthPx: 900, smallHeightPx: 500, remPx: 16 })
  rig.staff.layoutInputs({
    containerWidthPx: 800,
    viewport: { layout: 'split', heightBudgetPx: 250 },
  })
}

/** Every way a session ends on its own, each with the window it needs and its trigger. */
export const END_SAMPLES: readonly EndSample[] = [
  {
    name: 'the page hidden',
    cause: 'hidden-tab',
    trigger: (rig) => rig.browser.pageVisibility.setHidden(true),
    fades: true,
  },
  {
    name: 'a portrait-shaped view below bp-desktop',
    cause: 'staff-not-shown',
    trigger: (rig) =>
      rig.browser.windowShape.resize({ widthPx: 800, smallHeightPx: 1200, remPx: 16 }),
    fades: true,
  },
  {
    name: 'the held one-system layout too narrow at the new size',
    cause: 'staff-not-shown',
    trigger: (rig) => {
      rig.browser.windowShape.resize({ widthPx: 700, smallHeightPx: 400, remPx: 16 })
      rig.staff.layoutInputs({
        containerWidthPx: 120,
        viewport: { layout: 'split', heightBudgetPx: 250 },
      })
    },
    fades: true,
  },
  {
    name: 'the held split layout too short below bp-tablet-landscape',
    cause: 'staff-not-shown',
    before: phoneWindow,
    trigger: (rig) => {
      rig.browser.windowShape.resize({ widthPx: 900, smallHeightPx: 480, remPx: 16 })
      rig.staff.layoutInputs({
        containerWidthPx: 800,
        viewport: { layout: 'split', heightBudgetPx: 150 },
      })
    },
    fades: true,
  },
  {
    name: 'an audio interruption',
    cause: 'stop',
    trigger: (rig) => rig.audioRig.interrupt(),
    fades: false,
  },
  {
    name: 'phrase 1 too wide to engrave at the new size',
    cause: 'staff-not-shown',
    trigger: (rig) =>
      rig.staff.notationError(new NotationError('notation_notes_too_wide', 'too wide', {})),
    fades: true,
  },
  {
    name: 'phrase 1 failing to engrave',
    cause: 'staff-not-shown',
    trigger: (rig) =>
      rig.staff.notationError(new NotationError('notation_engraving_failed', 'failed', {})),
    fades: true,
  },
]

/** Intent: a rig whose session has reached `phase`, after `before` set the window up. */
export async function sessionIn(phase: Phase, before?: (rig: ControllerRig) => void) {
  const rig = controllerRig()
  before?.(rig)
  rig.controller.start()
  await playTo(rig, PHASE_TIMES[phase])
  expect(rig.controller.state.phase).toBe(phase)
  return rig
}

/** Intent: the end events the controller sent its runners. */
export function endEvents(rig: ControllerRig) {
  return rig.events.filter((event) => event.kind === 'end')
}
