/**
 * The connection sheet and the remembered controller: Requesting access goes straight to Connected
 * for the controller remembered when the sheet opened, among however many inputs, with its line
 * "This is the controller you chose last time."; the line leaves at the next state change. Without
 * a remembered controller, or with it absent, Requesting access resolves as in v2.
 */
import { describe, expect, it } from 'vitest'

import {
  initialSheetModel,
  type SheetModel,
} from '@/components/controller-connection/connection-sheet-model'

import { change, KEYS, PAD, run, selected } from './sheet-model-fixtures'

/** Intent: a sheet just opened at Requesting access with KEYS remembered, the controller asking. */
function openedRemembering(): SheetModel {
  return run(initialSheetModel(change({ kind: 'not-requested' }, [], KEYS)), {
    kind: 'open-requesting',
    controller: change({ kind: 'requesting' }, [], KEYS),
  }).model
}

// @test-link [[rule_last_controller_remembered]]
// @test-link [[rule_controller_connects_between_sessions]]
describe('connection sheet: Requesting access with a remembered controller', () => {
  it('goes straight to Connected for it, among several inputs, with its line and no check', () => {
    const { model, effects } = run(openedRemembering(), {
      kind: 'connect-settled',
      controller: change(selected('connected', KEYS), [PAD, KEYS], KEYS),
    })
    expect(model.stage).toEqual({ kind: 'connected', device: KEYS, rememberedLine: true })
    expect(effects).toEqual([])
  })

  it('resolves by the inputs as in v2 when the remembered controller is not among them', () => {
    const { model } = run(openedRemembering(), {
      kind: 'connect-settled',
      controller: change({ kind: 'choosing' }, [PAD, { ...KEYS, id: 'other' }], KEYS),
    })
    expect(model.stage).toEqual({ kind: 'picker', fromConnected: false })
  })

  it('resolves as in v2 when the remembered controller could not open', () => {
    const { model, effects } = run(openedRemembering(), {
      kind: 'connect-settled',
      controller: change(selected('away', KEYS), [KEYS], KEYS),
    })
    expect(model.stage).toEqual({ kind: 'check', device: KEYS, played: null })
    expect(effects).toEqual([{ kind: 'select', deviceId: KEYS.id }])
  })

  it('checks a device connected by this request when nothing was remembered at the open', () => {
    const opened = run(initialSheetModel(change({ kind: 'not-requested' })), {
      kind: 'open-requesting',
      controller: change({ kind: 'requesting' }),
    }).model
    const { model } = run(opened, {
      kind: 'connect-settled',
      controller: change(selected('connected', KEYS), [KEYS], KEYS),
    })
    expect(model.stage).toEqual({ kind: 'check', device: KEYS, played: null })
  })

  it('drops the line at the next state change, and Connected comes back without it', () => {
    const connected = run(openedRemembering(), {
      kind: 'connect-settled',
      controller: change(selected('connected', KEYS), [KEYS], KEYS),
    }).model
    const { model } = run(
      connected,
      { kind: 'action', action: 'run-check-again' },
      { kind: 'note-played', pitch: 60 },
      { kind: 'action', action: 'continue' },
    )
    expect(model.stage).toEqual({ kind: 'connected', device: KEYS })
  })

  it('keeps the line through a controller change that changes no state', () => {
    const connected = run(openedRemembering(), {
      kind: 'connect-settled',
      controller: change(selected('connected', KEYS), [KEYS], KEYS),
    }).model
    const { model } = run(connected, {
      kind: 'controller-changed',
      controller: change(selected('connected', KEYS), [KEYS, PAD], KEYS),
    })
    expect(model.stage).toEqual({ kind: 'connected', device: KEYS, rememberedLine: true })
  })
})
