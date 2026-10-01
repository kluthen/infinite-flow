/**
 * The Web MIDI adapter: support is read without asking, access is requested (without SysEx) only
 * by request(), the browser's rejections map onto typed outcomes or a typed failure, and the
 * granted access is wrapped into the controller's port, inputs only, with stable port identity.
 */
import { describe, expect, expectTypeOf, it } from 'vitest'

import type { MidiAccessPort, MidiInputPort } from '@/midi/midi-access-port'
import {
  createWebMidiAccessProvider,
  WebMidiAccessError,
  WebMidiEventError,
  type WebMidiNavigatorPort,
} from '@/midi/web-midi-access'

import {
  createFakeWebMidiAccess,
  createFakeWebMidiNavigator,
  createFakeWebMidiPermissions,
  createFakeWebMidiPort,
  type FakeWebMidiAccess,
} from './fake-web-midi'

/** Intent: request access through the adapter from a navigator granting `fake`. */
async function grantedAccess(fake: FakeWebMidiAccess): Promise<MidiAccessPort> {
  const provider = createWebMidiAccessProvider(
    createFakeWebMidiNavigator(() => Promise.resolve(fake)),
  )
  const result = await provider.request()
  if (result.kind !== 'granted') throw new Error(`expected granted, got ${result.kind}`)
  return result.access
}

/** Intent: the outcome of a request the browser rejects with this DOMException name. */
function requestRejectedWith(name: string): Promise<unknown> {
  const navigator = createFakeWebMidiNavigator(() =>
    Promise.reject(new DOMException(`refused (${name})`, name)),
  )
  return createWebMidiAccessProvider(navigator).request()
}

// @test-link [[rule_chromium_only_support]]
// @test-link [[rule_controller_connects_between_sessions]]
describe('WebMidiAccessProvider: support and the one access request', () => {
  it('is supported when navigator has requestMIDIAccess, without calling it', () => {
    const navigator = createFakeWebMidiNavigator(() => Promise.resolve(createFakeWebMidiAccess([])))
    expect(createWebMidiAccessProvider(navigator).isSupported()).toBe(true)
    expect(navigator.calls).toEqual([])
  })

  it('is unsupported without requestMIDIAccess, and request() resolves unsupported', async () => {
    const provider = createWebMidiAccessProvider({})
    expect(provider.isSupported()).toBe(false)
    await expect(provider.request()).resolves.toEqual({ kind: 'unsupported' })
  })

  it('requests access once per request(), without SysEx, called on the navigator itself', async () => {
    const navigator = createFakeWebMidiNavigator(() => Promise.resolve(createFakeWebMidiAccess([])))
    const provider = createWebMidiAccessProvider(navigator)
    expect(navigator.calls).toEqual([])
    await provider.request()
    expect(navigator.calls).toHaveLength(1)
    expect(navigator.calls[0]?.options).toEqual({ sysex: false })
    expect(navigator.calls[0]?.self).toBe(navigator)
  })

  it('accepts the browser navigator as its navigator port', () => {
    expectTypeOf<Navigator>().toExtend<WebMidiNavigatorPort>()
  })
})

// @test-link [[rule_controller_connects_between_sessions]]
describe('WebMidiAccessProvider: the MIDI permission, read without prompting', () => {
  it.each(['granted', 'prompt', 'denied'] as const)(
    'answers %s as the browser reports it, querying "midi" and never requesting access',
    async (state) => {
      const navigator = createFakeWebMidiNavigator(() =>
        Promise.resolve(createFakeWebMidiAccess([])),
      )
      const permissions = createFakeWebMidiPermissions(() => Promise.resolve({ state }))
      const provider = createWebMidiAccessProvider({ ...navigator, permissions })
      await expect(provider.permission()).resolves.toBe(state)
      expect(permissions.queries).toEqual([{ name: 'midi' }])
      expect(navigator.calls).toEqual([])
    },
  )

  it('is unknown without navigator.permissions', async () => {
    await expect(createWebMidiAccessProvider({}).permission()).resolves.toBe('unknown')
  })

  it('is unknown when the browser does not know the "midi" permission name (TypeError)', async () => {
    const permissions = createFakeWebMidiPermissions(() =>
      Promise.reject(new TypeError("'midi' is not a valid PermissionName")),
    )
    await expect(createWebMidiAccessProvider({ permissions }).permission()).resolves.toBe('unknown')
  })

  it('propagates any other rejection of the query as it is', async () => {
    const failure = new DOMException('query refused', 'InvalidStateError')
    const permissions = createFakeWebMidiPermissions(() => Promise.reject(failure))
    await expect(createWebMidiAccessProvider({ permissions }).permission()).rejects.toBe(failure)
  })
})

// @test-link [[rule_midi_never_blocks_session]]
describe('WebMidiAccessProvider: the browser rejections', () => {
  it.each(['NotAllowedError', 'SecurityError'])('resolves denied on %s', async (name) => {
    await expect(requestRejectedWith(name)).resolves.toEqual({ kind: 'denied' })
  })

  it('resolves unsupported on NotSupportedError', async () => {
    await expect(requestRejectedWith('NotSupportedError')).resolves.toEqual({
      kind: 'unsupported',
    })
  })

  it('throws WebMidiAccessError, with the original name and message, on any other rejection', async () => {
    const failure = requestRejectedWith('AbortError')
    await expect(failure).rejects.toBeInstanceOf(WebMidiAccessError)
    await expect(failure).rejects.toMatchObject({
      rejectionName: 'AbortError',
      rejectionMessage: 'refused (AbortError)',
    })
  })

  it('throws WebMidiAccessError on a rejection that is not an error object', async () => {
    const navigator = createFakeWebMidiNavigator(() => Promise.reject(new Map()))
    await expect(createWebMidiAccessProvider(navigator).request()).rejects.toBeInstanceOf(
      WebMidiAccessError,
    )
  })
})

// @test-link [[req_midi_controller_input]]
describe('WebMidiAccessProvider: the granted access', () => {
  it('lists the inputs in the browser order, ignoring any output', async () => {
    const a = createFakeWebMidiPort('a')
    const out = createFakeWebMidiPort('out', 'output')
    const b = createFakeWebMidiPort('b', 'input', 'Pad', null)
    const access = await grantedAccess(createFakeWebMidiAccess([a, out, b]))
    expect(access.inputs().map((port) => [port.id, port.name, port.manufacturer])).toEqual([
      ['a', 'Name a', 'Maker a'],
      ['b', 'Pad', ''],
    ])
  })

  it('reads the live state and connection, and opens through the browser port', async () => {
    const a = createFakeWebMidiPort('a')
    const port = (await grantedAccess(createFakeWebMidiAccess([a]))).inputs()[0] as MidiInputPort
    expect([port.state(), port.connection()]).toEqual(['connected', 'closed'])
    await expect(port.open()).resolves.toBeUndefined()
    expect(a.opens()).toBe(1)
    expect(port.connection()).toBe('open')
    a.state = 'disconnected'
    a.connection = 'pending'
    expect([port.state(), port.connection()]).toEqual(['disconnected', 'pending'])
  })

  it('forwards each message with its data and timestamp', async () => {
    const a = createFakeWebMidiPort('a')
    const port = (await grantedAccess(createFakeWebMidiAccess([a]))).inputs()[0] as MidiInputPort
    const seen: [Uint8Array, number][] = []
    port.listen((data, timestampMs) => seen.push([data, timestampMs]))
    const data = Uint8Array.from([0x90, 60, 100])
    a.emit(data, 1234.5)
    expect(seen).toEqual([[data, 1234.5]])
    expect(seen[0]?.[0]).toBe(data)
  })

  it('throws WebMidiEventError on a message without data', async () => {
    const a = createFakeWebMidiPort('a')
    const port = (await grantedAccess(createFakeWebMidiAccess([a]))).inputs()[0] as MidiInputPort
    port.listen(() => undefined)
    expect(() => a.emit(null, 1)).toThrow(WebMidiEventError)
  })
})

// @test-link [[rule_same_controller_reattaches]]
// @test-link [[req_midi_controller_input]]
describe('WebMidiAccessProvider: input state changes', () => {
  it('keeps one port object per browser input across an unplug and a replug', async () => {
    const a = createFakeWebMidiPort('a')
    const fake = createFakeWebMidiAccess([a])
    const access = await grantedAccess(fake)
    const seen: [MidiInputPort, number][] = []
    access.onInputStateChange((port, timestampMs) => seen.push([port, timestampMs]))
    const before = access.inputs()[0]
    fake.unplug(a, 10)
    expect(access.inputs()).toEqual([])
    fake.plug(a, 20)
    expect(access.inputs()[0]).toBe(before)
    expect(seen).toEqual([
      [before, 10],
      [before, 20],
    ])
    expect(seen[0]?.[0]).toBe(before)
  })

  it('ignores the state change of an output', async () => {
    const fake = createFakeWebMidiAccess([])
    const access = await grantedAccess(fake)
    const seen: MidiInputPort[] = []
    access.onInputStateChange((port) => seen.push(port))
    fake.fireStateChange({ port: createFakeWebMidiPort('out', 'output'), timeStamp: 5 })
    expect(seen).toEqual([])
  })

  it('throws WebMidiEventError on a state change without a port', async () => {
    const fake = createFakeWebMidiAccess([])
    const access = await grantedAccess(fake)
    access.onInputStateChange(() => undefined)
    expect(() => fake.fireStateChange({ port: null, timeStamp: 5 })).toThrow(WebMidiEventError)
  })
})
