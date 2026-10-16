/**
 * The connection sheet's reducer around `Use this for my instrument` (screens/controller-connection
 * handoff, States: Use for my instrument; Device changes while the sheet is open): the
 * confirmation opened from a check result, `Back` and every dismiss path returning to the result,
 * the confirmed use reaching Connected with its line, played notes ignored, and the device being
 * checked unplugged and plugged back.
 */
import { describe, expect, it } from 'vitest'

import {
  ConnectionSheetError,
  reduceSheet,
  type SheetEvent,
  type SheetModel,
} from '@/components/controller-connection/connection-sheet-model'

import { change, checkSheet, KEYS, PAD, run, selected } from './sheet-model-fixtures'

type Action = Extract<SheetEvent, { kind: 'action' }>['action']

/** Intent: one named action as an event. */
function action(name: Action): SheetEvent {
  return { kind: 'action', action: name }
}

/** Intent: a sheet at the check's result for KEYS, the controller having sent `pitch`. */
function resultSheet(pitch = 62, devices = [KEYS]): SheetModel {
  return run(checkSheet(devices), { kind: 'note-played', pitch }).model
}

/** Intent: a sheet at the Use for my instrument confirmation, from a result for KEYS. */
function useSheet(devices = [KEYS]): SheetModel {
  return run(resultSheet(62, devices), action('use-this')).model
}

// @test-link [[rule_transposition_check_sets_my_instrument]]
describe('connection sheet: Use for my instrument', () => {
  it('opens from a check result, keeping the device and the note it sent, with no effect', () => {
    const step = reduceSheet(resultSheet(), action('use-this'))
    expect(step.model.stage).toEqual({ kind: 'use', device: KEYS, played: 62 })
    expect(step.effects).toEqual([])
  })

  it('is not offered before the check has a result', () => {
    expect(() => reduceSheet(checkSheet(), action('use-this'))).toThrow(ConnectionSheetError)
  })

  it('Back returns to the same result, marked as come back from the confirmation', () => {
    const step = reduceSheet(useSheet(), action('back'))
    expect(step.model.stage).toEqual({ kind: 'check', device: KEYS, played: 62, backFromUse: true })
    expect(step.effects).toEqual([])
  })

  it('Close, Escape and the backdrop do what Back does: the sheet stays open', () => {
    const step = reduceSheet(useSheet(), action('close'))
    expect(step.model.stage).toEqual({ kind: 'check', device: KEYS, played: 62, backFromUse: true })
    expect(step.effects).toEqual([])
  })

  it('confirmed, goes to Connected for the device, with the line naming my instrument', () => {
    const step = reduceSheet(useSheet(), { kind: 'used', name: 'My instrument' })
    expect(step.model.stage).toEqual({
      kind: 'connected',
      device: KEYS,
      matchedName: 'My instrument',
    })
    expect(step.effects).toEqual([])
  })

  it('a confirmation is the only stage a use is confirmed from', () => {
    expect(() => reduceSheet(resultSheet(), { kind: 'used', name: 'Mine' })).toThrow(
      ConnectionSheetError,
    )
  })

  it('its Continue and Run check again are not offered there', () => {
    expect(() => reduceSheet(useSheet(), action('continue'))).toThrow(ConnectionSheetError)
    expect(() => reduceSheet(useSheet(), action('run-check-again'))).toThrow(ConnectionSheetError)
    expect(() => reduceSheet(resultSheet(), action('back'))).toThrow(ConnectionSheetError)
  })

  it('a played note does nothing there', () => {
    const model = useSheet()
    expect(reduceSheet(model, { kind: 'note-played', pitch: 70 }).model).toEqual(model)
  })

  it('the device being checked unplugged: the picker with the line, nothing confirmed', () => {
    const { model, effects } = run(useSheet([KEYS, PAD]), {
      kind: 'controller-changed',
      controller: change(selected('away', KEYS), [PAD]),
    })
    expect(model.stage).toEqual({ kind: 'picker', fromConnected: false })
    expect(model.unplugged).toEqual({ device: KEYS, reachedConnected: false })
    expect(effects).toEqual([])
  })

  it('unplugged with none left, then plugged back: the check starts again at its Prompt', () => {
    const away = run(useSheet(), {
      kind: 'controller-changed',
      controller: change(selected('away', KEYS), []),
    }).model
    expect(away.stage).toEqual({ kind: 'no-device' })

    const back = run(away, {
      kind: 'controller-changed',
      controller: change(selected('opening', KEYS), [KEYS]),
    }).model
    expect(back.stage).toEqual({ kind: 'check', device: KEYS, played: null })
    expect(back.unplugged).toBeNull()
  })
})
