/**
 * The connection sheet's reducer: how it opens, how Requesting access resolves, every named action
 * and its effects, the transposition check's played note, and the crash on an action its stage
 * does not offer. Device changes while the sheet is open have their own spec.
 */
import { describe, expect, it } from 'vitest'

import {
  ConnectionSheetError,
  initialSheetModel,
  reduceSheet,
  type SheetEvent,
  type SheetModel,
} from '@/components/controller-connection/connection-sheet-model'

import {
  change,
  checkSheet,
  connectedSheet,
  FLUTE,
  KEYS,
  PAD,
  pickerSheet,
  REQUESTING,
  requestingSheet,
  run,
  selected,
  settled,
} from './sheet-model-fixtures'

type Action = Extract<SheetEvent, { kind: 'action' }>['action']

/** Intent: dispatch one named action. */
function act(model: SheetModel, action: Action) {
  return reduceSheet(model, { kind: 'action', action })
}

// @test-link [[rule_controller_connects_between_sessions]]
describe('connection sheet: opening', () => {
  it('starts closed with the given snapshot', () => {
    const controller = change({ kind: 'not-requested' })
    expect(initialSheetModel(controller)).toEqual({
      stage: { kind: 'closed' },
      pickerDevices: [],
      unplugged: null,
      controller,
    })
  })

  it('opens at Requesting access (Checking) with no effect: the caller already connects', () => {
    const step = reduceSheet(initialSheetModel(change({ kind: 'not-requested' })), {
      kind: 'open-requesting',
      controller: REQUESTING,
    })
    expect(step.model.stage).toEqual({ kind: 'requesting', waiting: false })
    expect(step.model.controller).toEqual(REQUESTING)
    expect(step.effects).toEqual([])
  })

  it('opens at Connected from the connected badge', () => {
    const controller = change(selected('connected', KEYS), [KEYS])
    const step = reduceSheet(initialSheetModel(controller), { kind: 'open-connected', controller })
    expect(step.model.stage).toEqual({ kind: 'connected', device: KEYS })
    expect(step.effects).toEqual([])
  })

  it('throws when opened at Connected without a connected controller', () => {
    const controller = change(selected('away', KEYS))
    expect(() =>
      reduceSheet(initialSheetModel(controller), { kind: 'open-connected', controller }),
    ).toThrow(ConnectionSheetError)
  })

  it('throws when opened while already open', () => {
    expect(() =>
      reduceSheet(requestingSheet(), { kind: 'open-requesting', controller: REQUESTING }),
    ).toThrow(ConnectionSheetError)
  })
})

// @test-link [[rule_controller_connects_between_sessions]]
describe('connection sheet: Requesting access', () => {
  it("shows Waiting for your browser once the permission is known to be 'prompt'", () => {
    const step = reduceSheet(requestingSheet(), { kind: 'permission-known', permission: 'prompt' })
    expect(step.model.stage).toEqual({ kind: 'requesting', waiting: true })
  })

  it.each(['granted', 'denied', 'unknown'] as const)('stays Checking for %s', (permission) => {
    const step = reduceSheet(requestingSheet(), { kind: 'permission-known', permission })
    expect(step.model.stage).toEqual({ kind: 'requesting', waiting: false })
  })

  it('ignores the permission outside Requesting access', () => {
    const model = connectedSheet()
    expect(reduceSheet(model, { kind: 'permission-known', permission: 'prompt' }).model).toBe(model)
  })

  it.each([
    ['unsupported', change({ kind: 'unsupported' }), { kind: 'unsupported' }],
    ['denied', change({ kind: 'denied' }), { kind: 'denied' }],
    ['no input', change({ kind: 'no-device' }), { kind: 'no-device' }],
  ] as const)('resolves %s', (_label, controller, stage) => {
    const { model, effects } = settled(controller)
    expect(model.stage).toEqual(stage)
    expect(model.controller).toEqual(controller)
    expect(effects).toEqual([])
  })

  it('resolves exactly one input to the check, with no select when it is already selected', () => {
    for (const kind of ['opening', 'connected'] as const) {
      const { model, effects } = settled(change(selected(kind, KEYS), [KEYS]))
      expect(model.stage).toEqual({ kind: 'check', device: KEYS, played: null })
      expect(effects).toEqual([])
    }
  })

  it('resolves exactly one input to the check and selects it when another is selected', () => {
    const { model, effects } = settled(change(selected('away', PAD), [KEYS]))
    expect(model.stage).toEqual({ kind: 'check', device: KEYS, played: null })
    expect(effects).toEqual([{ kind: 'select', deviceId: 'keys' }])
  })

  it('resolves two or more inputs to the picker, in browser order', () => {
    const { model, effects } = settled(change({ kind: 'choosing' }, [PAD, KEYS, FLUTE]))
    expect(model.stage).toEqual({ kind: 'picker', fromConnected: false })
    expect(model.pickerDevices).toEqual([PAD, KEYS, FLUTE])
    expect(effects).toEqual([])
  })

  it.each([REQUESTING, change({ kind: 'not-requested' })])(
    'throws when connect settles with the controller $state.kind',
    (controller) => {
      expect(() => settled(controller)).toThrow(ConnectionSheetError)
    },
  )

  it('ignores a late answer after close: it opens nothing', () => {
    const closed = act(requestingSheet(), 'close').model
    const late = change(selected('connected', KEYS), [KEYS])
    const step = reduceSheet(closed, { kind: 'connect-settled', controller: late })
    expect(step.model.stage).toEqual({ kind: 'closed' })
    expect(step.model.controller).toEqual(late)
    expect(step.effects).toEqual([])
  })

  it('stores controller changes while requesting without resolving', () => {
    const controller = change({ kind: 'choosing' }, [KEYS, PAD])
    const { model } = run(requestingSheet(), { kind: 'controller-changed', controller })
    expect(model.stage).toEqual({ kind: 'requesting', waiting: false })
    expect(model.controller).toEqual(controller)
  })
})

// @test-link [[rule_controller_connects_between_sessions]]
// @test-link [[rule_controller_transposition_check]]
describe('connection sheet: named actions', () => {
  it('Check again from Permission denied returns to Requesting access and connects', () => {
    const step = act(settled(change({ kind: 'denied' })).model, 'check-again')
    expect(step.model.stage).toEqual({ kind: 'requesting', waiting: false })
    expect(step.effects).toEqual([{ kind: 'connect' }])
  })

  it('Try again from No device found returns to Requesting access and connects', () => {
    const step = act(settled(change({ kind: 'no-device' })).model, 'try-again')
    expect(step.model.stage).toEqual({ kind: 'requesting', waiting: false })
    expect(step.effects).toEqual([{ kind: 'connect' }])
  })

  it('Continue from a check result goes to Connected', () => {
    const result = run(checkSheet(), { kind: 'note-played', pitch: 62 }).model
    const step = act(result, 'continue')
    expect(step.model.stage).toEqual({ kind: 'connected', device: KEYS })
    expect(step.effects).toEqual([])
  })

  it('Run check again from a check result or Connected returns to the Prompt, no effect', () => {
    const result = run(checkSheet(), { kind: 'note-played', pitch: 62 }).model
    for (const model of [result, connectedSheet()]) {
      const step = act(model, 'run-check-again')
      expect(step.model.stage).toEqual({ kind: 'check', device: KEYS, played: null })
      expect(step.effects).toEqual([])
    }
  })

  it('Choose a different device opens the picker from Connected with the present inputs', () => {
    const step = act(connectedSheet([KEYS, PAD]), 'choose-different')
    expect(step.model.stage).toEqual({ kind: 'picker', fromConnected: true })
    expect(step.model.pickerDevices).toEqual([KEYS, PAD])
    expect(step.effects).toEqual([])
  })

  it('choosing in the picker goes to the check and selects the device', () => {
    const step = reduceSheet(pickerSheet([KEYS, PAD]), { kind: 'choose', deviceId: 'pad' })
    expect(step.model.stage).toEqual({ kind: 'check', device: PAD, played: null })
    expect(step.effects).toEqual([{ kind: 'select', deviceId: 'pad' }])
  })

  it('choosing the device in use again re-runs the check without selecting', () => {
    const picker = act(connectedSheet([KEYS, PAD]), 'choose-different').model
    const step = reduceSheet(picker, { kind: 'choose', deviceId: 'keys' })
    expect(step.model.stage).toEqual({ kind: 'check', device: KEYS, played: null })
    expect(step.effects).toEqual([])
  })

  it('throws when choosing a device the picker does not list', () => {
    expect(() =>
      reduceSheet(pickerSheet([KEYS, PAD]), { kind: 'choose', deviceId: 'flute' }),
    ).toThrow(ConnectionSheetError)
  })

  it('Disconnect from Connected closes and disconnects', () => {
    const step = act(connectedSheet(), 'disconnect')
    expect(step.model.stage).toEqual({ kind: 'closed' })
    expect(step.effects).toEqual([{ kind: 'disconnect' }])
  })

  it('Done from Connected closes, keeping the connection', () => {
    const step = act(connectedSheet(), 'done')
    expect(step.model.stage).toEqual({ kind: 'closed' })
    expect(step.effects).toEqual([])
  })

  it.each<[string, () => SheetModel]>([
    ['Unsupported browser', () => settled(change({ kind: 'unsupported' })).model],
    ['Permission denied', () => settled(change({ kind: 'denied' })).model],
    ['No device found', () => settled(change({ kind: 'no-device' })).model],
    ['Multi-device picker', () => pickerSheet([KEYS, PAD])],
    ['Transposition check', () => checkSheet()],
    ['Connected', () => connectedSheet()],
  ])('Close from %s closes with no effect', (_label, at) => {
    const step = act(at(), 'close')
    expect(step.model).toEqual({
      stage: { kind: 'closed' },
      pickerDevices: [],
      unplugged: null,
      controller: at().controller,
    })
    expect(step.effects).toEqual([])
  })

  it('Close while the controller is still requesting abandons the attempt', () => {
    const waiting = reduceSheet(requestingSheet(), {
      kind: 'permission-known',
      permission: 'prompt',
    }).model
    const step = act(waiting, 'close')
    expect(step.model.stage).toEqual({ kind: 'closed' })
    expect(step.effects).toEqual([{ kind: 'abandon-connect' }])
  })

  it('Close at Requesting access once the controller has answered abandons nothing', () => {
    const answered = run(requestingSheet(), {
      kind: 'controller-changed',
      controller: change({ kind: 'no-device' }),
    }).model
    expect(act(answered, 'close').effects).toEqual([])
  })

  it.each<[Action, string, () => SheetModel]>([
    ['check-again', 'No device found', () => settled(change({ kind: 'no-device' })).model],
    ['try-again', 'Permission denied', () => settled(change({ kind: 'denied' })).model],
    ['continue', 'the check Prompt', () => checkSheet()],
    ['continue', 'Connected', () => connectedSheet()],
    ['run-check-again', 'the check Prompt', () => checkSheet()],
    ['run-check-again', 'the picker', () => pickerSheet([KEYS, PAD])],
    ['choose-different', 'the check', () => checkSheet()],
    ['disconnect', 'the check', () => checkSheet()],
    ['done', 'Requesting access', () => requestingSheet()],
    ['close', 'a closed sheet', () => initialSheetModel(REQUESTING)],
  ])('throws on %s from %s', (action, _label, at) => {
    expect(() => act(at(), action)).toThrow(ConnectionSheetError)
  })

  it('throws on choose outside the picker', () => {
    expect(() => reduceSheet(checkSheet(), { kind: 'choose', deviceId: 'keys' })).toThrow(
      ConnectionSheetError,
    )
  })
})

// @test-link [[rule_controller_transposition_check]]
describe('connection sheet: the transposition check', () => {
  it('records the first played note as the result', () => {
    const { model } = run(
      checkSheet(),
      { kind: 'note-played', pitch: 74 },
      { kind: 'note-played', pitch: 60 },
    )
    expect(model.stage).toEqual({ kind: 'check', device: KEYS, played: 74 })
  })

  it('ignores played notes outside the check Prompt', () => {
    for (const model of [connectedSheet(), pickerSheet([KEYS, PAD]), requestingSheet()]) {
      expect(reduceSheet(model, { kind: 'note-played', pitch: 60 })).toEqual({ model, effects: [] })
    }
  })

  it('never mutates the model it reduces', () => {
    const model = checkSheet()
    run(model, { kind: 'note-played', pitch: 60 }, { kind: 'action', action: 'continue' })
    expect(model.stage).toEqual({ kind: 'check', device: KEYS, played: null })
  })
})
