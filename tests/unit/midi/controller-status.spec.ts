/**
 * The header controller-status form: facts folded from every controller change (ever connected,
 * blocked by the latest request, the inputs seen this page session), and the one form the header
 * shows from them, following the header-form table of the controller-connection flow.
 */
import { describe, expect, it } from 'vitest'

import {
  controllerStatusForm,
  foldControllerStatus,
  initialControllerStatusFacts,
  type ControllerStatusFacts,
} from '@/midi/controller-status'
import type {
  MidiControllerChange,
  MidiControllerState,
  MidiDevice,
} from '@/midi/midi-controller-state'

const KEYS: MidiDevice = { id: 'keys', name: 'Keys', manufacturer: 'Acme' }
const PAD: MidiDevice = { id: 'pad', name: 'Pad', manufacturer: 'Beta' }

const NOT_REQUESTED: MidiControllerState = { kind: 'not-requested' }
const REQUESTING: MidiControllerState = { kind: 'requesting' }
const DENIED: MidiControllerState = { kind: 'denied' }
const NO_DEVICE: MidiControllerState = { kind: 'no-device' }
const CHOOSING: MidiControllerState = { kind: 'choosing' }
const UNSUPPORTED: MidiControllerState = { kind: 'unsupported' }

/** Intent: a controller change with these devices present, nothing remembered unless given. */
function change(
  state: MidiControllerState,
  devices: readonly MidiDevice[] = [],
  remembered: Pick<MidiControllerChange, 'remembered' | 'reselectedAtLoad'> = {
    remembered: null,
    reselectedAtLoad: false,
  },
): MidiControllerChange {
  return { state, devices, ...remembered }
}

/** The remembered KEYS, reselected at load: MIDI access was already allowed. */
const RESELECTED = { remembered: KEYS, reselectedAtLoad: true } as const

/** Intent: fold a run of changes from not-requested, as the header sees them. */
function foldAll(...changes: MidiControllerChange[]): ControllerStatusFacts {
  return changes.reduce(foldControllerStatus, initialControllerStatusFacts(NOT_REQUESTED))
}

/** Intent: the header form between sessions (no loss in a running session). */
function formOf(facts: ControllerStatusFacts): ReturnType<typeof controllerStatusForm> {
  return controllerStatusForm(facts, { lostInSession: false })
}

// @test-link [[rule_controller_attached_definition]]
describe('controller status facts: what the header remembers from the controller', () => {
  it('starts from the given state, nothing seen', () => {
    expect(initialControllerStatusFacts(NOT_REQUESTED)).toEqual({
      state: NOT_REQUESTED,
      everConnected: false,
      blocked: false,
      reselectedAtLoad: false,
      seenDeviceIds: [],
    })
  })

  it('starts connected and blocked when the initial state says so', () => {
    const connected = { kind: 'connected', device: KEYS } as const
    expect(initialControllerStatusFacts(connected).everConnected).toBe(true)
    expect(initialControllerStatusFacts(DENIED).blocked).toBe(true)
  })

  it('keeps the latest state', () => {
    expect(foldAll(change(REQUESTING), change(NO_DEVICE)).state).toEqual(NO_DEVICE)
  })

  it('counts a controller as ever connected only once a state is connected', () => {
    expect(foldAll(change({ kind: 'opening', device: KEYS }, [KEYS])).everConnected).toBe(false)
    const facts = foldAll(
      change({ kind: 'connected', device: KEYS }, [KEYS]),
      change({ kind: 'away', device: KEYS }),
      change(NO_DEVICE),
    )
    expect(facts.everConnected).toBe(true)
  })

  it.each<MidiControllerState>([
    NO_DEVICE,
    CHOOSING,
    { kind: 'opening', device: KEYS },
    { kind: 'connected', device: KEYS },
    { kind: 'away', device: KEYS },
  ])('a granted state ($kind) clears blocked', (state) => {
    expect(foldAll(change(DENIED), change(state)).blocked).toBe(false)
  })

  it.each<MidiControllerState>([REQUESTING, NOT_REQUESTED, UNSUPPORTED])(
    '$kind leaves blocked unchanged',
    (state) => {
      expect(foldAll(change(DENIED), change(state)).blocked).toBe(true)
      expect(foldAll(change(state)).blocked).toBe(false)
    },
  )

  it('lists every device id seen, once, in first-seen order', () => {
    const facts = foldAll(
      change(CHOOSING, [PAD]),
      change(CHOOSING, [KEYS, PAD]),
      change(NO_DEVICE, []),
      change(CHOOSING, [KEYS]),
    )
    expect(facts.seenDeviceIds).toEqual(['pad', 'keys'])
  })

  it('never mutates the facts it folds', () => {
    const facts = foldAll(change(CHOOSING, [PAD]))
    foldControllerStatus(facts, change(DENIED, [KEYS]))
    expect(facts).toEqual({
      state: CHOOSING,
      everConnected: false,
      blocked: false,
      reselectedAtLoad: false,
      seenDeviceIds: ['pad'],
    })
  })
})

// @test-link [[rule_controller_attached_definition]]
// @test-link [[rule_same_controller_reattaches]]
// @test-link [[rule_midi_never_blocks_session]]
describe('controller status form: the header-form table', () => {
  it('shows Connect controller before any request', () => {
    expect(formOf(foldAll())).toEqual({ kind: 'connect' })
  })

  it.each<[string, MidiControllerChange[]]>([
    ['unsupported browser', [change(UNSUPPORTED)]],
    ['no device found', [change(REQUESTING), change(NO_DEVICE)]],
    ['a dismissal while requesting', [change(REQUESTING), change(NOT_REQUESTED)]],
    ['a picker left without choosing', [change(REQUESTING), change(CHOOSING, [KEYS, PAD])]],
  ])('stays on Connect controller after %s', (_label, changes) => {
    expect(formOf(foldAll(...changes))).toEqual({ kind: 'connect' })
  })

  it('shows the connected badge while connected', () => {
    const facts = foldAll(change(REQUESTING), change({ kind: 'connected', device: KEYS }, [KEYS]))
    expect(formOf(facts)).toEqual({ kind: 'connected', device: KEYS })
  })

  it.each<MidiControllerState>([
    { kind: 'opening', device: KEYS },
    { kind: 'away', device: KEYS },
  ])('does not count $kind as connected', (state) => {
    expect(formOf(foldAll(change(state)))).toEqual({ kind: 'connect' })
  })

  it('shows MIDI blocked when the latest request was refused', () => {
    expect(formOf(foldAll(change(REQUESTING), change(DENIED)))).toEqual({ kind: 'blocked' })
  })

  it('keeps MIDI blocked while a new request is in flight', () => {
    const facts = foldAll(change(DENIED), change(REQUESTING))
    expect(formOf(facts)).toEqual({ kind: 'blocked' })
  })

  it('replaces blocked by Connect controller on a later success with no prior connection', () => {
    const facts = foldAll(change(DENIED), change(REQUESTING), change(NO_DEVICE))
    expect(formOf(facts)).toEqual({ kind: 'connect' })
  })

  it('replaces blocked by the connected badge when the later success connects a device', () => {
    const facts = foldAll(change(DENIED), change({ kind: 'connected', device: KEYS }, [KEYS]))
    expect(formOf(facts)).toEqual({ kind: 'connected', device: KEYS })
  })

  it('replaces blocked by no-controller on a later success after a prior connection', () => {
    const facts = foldAll(
      change({ kind: 'connected', device: KEYS }, [KEYS]),
      change(NOT_REQUESTED),
      change(DENIED),
      change(REQUESTING),
      change(NO_DEVICE),
    )
    expect(formOf(facts)).toEqual({ kind: 'no-controller' })
  })

  it('shows no-controller after a disconnect, never Connect controller again', () => {
    const facts = foldAll(
      change({ kind: 'connected', device: KEYS }, [KEYS]),
      change(CHOOSING, [KEYS]),
      change(NOT_REQUESTED),
    )
    expect(formOf(facts)).toEqual({ kind: 'no-controller' })
  })

  it('shows no-controller while the selected controller is away between sessions', () => {
    const facts = foldAll(
      change({ kind: 'connected', device: KEYS }, [KEYS]),
      change({ kind: 'away', device: KEYS }),
    )
    expect(formOf(facts)).toEqual({ kind: 'no-controller' })
  })

  it('returns to the connected badge when the same controller reattaches by itself', () => {
    const facts = foldAll(
      change({ kind: 'connected', device: KEYS }, [KEYS]),
      change({ kind: 'away', device: KEYS }),
      change({ kind: 'opening', device: KEYS }, [KEYS]),
      change({ kind: 'connected', device: KEYS }, [KEYS]),
    )
    expect(formOf(facts)).toEqual({ kind: 'connected', device: KEYS })
  })

  it('shows disconnected while a controller is lost in a running session, before all else', () => {
    const facts = foldAll(change({ kind: 'connected', device: KEYS }, [KEYS]), change(DENIED))
    expect(controllerStatusForm(facts, { lostInSession: true })).toEqual({ kind: 'disconnected' })
    const connected = foldAll(change({ kind: 'connected', device: KEYS }, [KEYS]))
    expect(controllerStatusForm(connected, { lostInSession: true })).toEqual({
      kind: 'disconnected',
    })
  })
})

// @test-link [[rule_last_controller_remembered]]
// @test-link [[rule_controller_attached_definition]]
describe('controller status form: the remembered controller at load', () => {
  it('starts in the badge forms: no-controller while it is requested or away', () => {
    expect(formOf(foldAll(change(REQUESTING, [], RESELECTED)))).toEqual({ kind: 'no-controller' })
    const away = foldAll(
      change(REQUESTING, [], RESELECTED),
      change({ kind: 'away', device: KEYS }, [PAD], RESELECTED),
    )
    expect(formOf(away)).toEqual({ kind: 'no-controller' })
  })

  it('shows the connected badge once it is attached', () => {
    const facts = foldAll(
      change(REQUESTING, [], RESELECTED),
      change({ kind: 'opening', device: KEYS }, [KEYS], RESELECTED),
      change({ kind: 'connected', device: KEYS }, [KEYS], RESELECTED),
    )
    expect(formOf(facts)).toEqual({ kind: 'connected', device: KEYS })
  })

  it('leaves Connect controller when the load request fails, or nothing was requested', () => {
    const failed = foldAll(change(REQUESTING, [], RESELECTED), change(NOT_REQUESTED))
    expect(formOf(failed)).toEqual({ kind: 'connect' })
    const notAllowed = foldAll(
      change(NOT_REQUESTED, [], { remembered: KEYS, reselectedAtLoad: false }),
    )
    expect(formOf(notAllowed)).toEqual({ kind: 'connect' })
  })
})
