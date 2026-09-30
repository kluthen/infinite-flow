/**
 * A recording stand-in for the browser's audio context, for the Web Audio output tests. Every node
 * it creates remembers what it was connected to and every call made on its parameters, so a test
 * can read back the graph and the automation the output built. The context itself records the
 * name of every member read on it, so a test can prove nothing ever reached for suspend or close.
 */

import type { AudioOutput, MixGain } from '@/audio/audio-ports'
import type { WebAudioContextPort } from '@/audio/web-audio-output'
import type {
  WebAudioGainNodePort,
  WebAudioNodePort,
  WebAudioOscillatorNodePort,
  WebAudioParamPort,
} from '@/audio/web-audio-session-bus'

/** One call on a fake audio parameter: the method name and its two numeric arguments, or one. */
export type ParamCall = readonly [method: string, ...args: number[]]

/** A fake audio parameter that records every automation call made on it. */
export interface FakeParam extends WebAudioParamPort {
  readonly calls: ParamCall[]
}

/** A fake audio node: its label, the nodes it was connected to, and whether it was disconnected. */
export interface FakeNode extends WebAudioNodePort {
  readonly label: string
  readonly outputs: FakeNode[]
  readonly disconnected: () => boolean
}

/** A fake gain node. */
export interface FakeGainNode extends FakeNode, WebAudioGainNodePort {
  readonly gain: FakeParam
}

/** A fake oscillator: its start and stop times, and a way to fire its `ended` event. */
export interface FakeOscillatorNode extends FakeNode, WebAudioOscillatorNodePort {
  readonly frequency: FakeParam
  readonly startedAt: () => number | undefined
  readonly stoppedAt: () => number | undefined
  readonly end: () => void
}

/** The test's handle on a fake context: the port to hand to the output, and its recordings. */
export interface FakeWebAudioContext {
  readonly port: WebAudioContextPort
  readonly destination: FakeNode
  readonly gains: FakeGainNode[]
  readonly oscillators: FakeOscillatorNode[]
  readonly accessedMembers: Set<string | symbol>
  readonly resumeCalls: () => number
  readonly setCurrentTime: (seconds: number) => void
  readonly setOutputLatency: (seconds: number) => void
  readonly changeState: (state: string) => void
}

/** Intent: a fake parameter starting at `initial` that records every automation call. */
function fakeParam(initial: number): FakeParam {
  const calls: ParamCall[] = []
  return {
    value: initial,
    calls,
    cancelScheduledValues: (time) => calls.push(['cancelScheduledValues', time]),
    setValueAtTime: (value, time) => calls.push(['setValueAtTime', value, time]),
    linearRampToValueAtTime: (value, time) => calls.push(['linearRampToValueAtTime', value, time]),
    exponentialRampToValueAtTime: (value, time) =>
      calls.push(['exponentialRampToValueAtTime', value, time]),
  }
}

/** Intent: a fake node labelled `label` that records its connections and disconnection. */
function fakeNode(label: string): FakeNode {
  const outputs: FakeNode[] = []
  let disconnected = false
  return {
    label,
    outputs,
    disconnected: () => disconnected,
    connect: (destination: FakeNode) => {
      outputs.push(destination)
      return destination
    },
    disconnect: () => {
      disconnected = true
    },
  }
}

/** Intent: a fake oscillator that records its start and stop times and can fire `ended`. */
function fakeOscillator(label: string): FakeOscillatorNode {
  const endedListeners: (() => void)[] = []
  let startedAt: number | undefined
  let stoppedAt: number | undefined
  return {
    ...fakeNode(label),
    // A real oscillator starts as a sine; a fake one starts as a square, so a test sees the
    // output choose the waveform itself.
    type: 'square',
    frequency: fakeParam(440),
    startedAt: () => startedAt,
    stoppedAt: () => stoppedAt,
    start: (when) => {
      startedAt = when
    },
    stop: (when) => {
      stoppedAt = when
    },
    addEventListener: (_type, listener) => endedListeners.push(listener),
    end: () => endedListeners.forEach((listener) => listener()),
  }
}

/**
 * A real gain node starts at 1; a fake one starts at NaN, so a test sees that the output set every
 * starting gain it relies on instead of inheriting it.
 */
const UNSET_GAIN = Number.NaN

/** Intent: a fake audio context in `initialState`, with every member read on it recorded. */
export function createFakeWebAudioContext(initialState = 'running'): FakeWebAudioContext {
  const destination = fakeNode('destination')
  const gains: FakeGainNode[] = []
  const oscillators: FakeOscillatorNode[] = []
  const stateListeners: (() => void)[] = []
  const accessedMembers = new Set<string | symbol>()
  let resumeCalls = 0
  const context = {
    currentTime: 0,
    outputLatency: 0.02,
    state: initialState,
    destination,
    createGain: (): FakeGainNode => {
      const node = { ...fakeNode(`gain ${gains.length}`), gain: fakeParam(UNSET_GAIN) }
      gains.push(node)
      return node
    },
    createOscillator: (): FakeOscillatorNode => {
      const node = fakeOscillator(`oscillator ${oscillators.length}`)
      oscillators.push(node)
      return node
    },
    resume: (): Promise<void> => {
      resumeCalls += 1
      return Promise.resolve()
    },
    addEventListener: (_type: 'statechange', listener: () => void) => stateListeners.push(listener),
  }
  const port = new Proxy(context, {
    get: (target, member, receiver) => {
      accessedMembers.add(member)
      return Reflect.get(target, member, receiver)
    },
  })
  return {
    port,
    destination,
    gains,
    oscillators,
    accessedMembers,
    resumeCalls: () => resumeCalls,
    setCurrentTime: (seconds) => {
      context.currentTime = seconds
    },
    setOutputLatency: (seconds) => {
      context.outputLatency = seconds
    },
    changeState: (state) => {
      context.state = state
      stateListeners.forEach((listener) => listener())
    },
  }
}

/**
 * Intent: the chain of nodes from `node` to the destination, each hop being the node's one and
 * only output. Throws if a node on the way has no output or more than one.
 */
export function pathToDestination(node: FakeNode, destination: FakeNode): FakeNode[] {
  const path: FakeNode[] = [node]
  let current = node
  while (current !== destination) {
    if (current.outputs.length !== 1) {
      throw new Error(`${current.label} has ${current.outputs.length} outputs, expected 1`)
    }
    current = current.outputs[0]!
    path.push(current)
  }
  return path
}

/**
 * Intent: the one fake gain node behind the mix gain `gain`, found by the automation a probe
 * `setGain` call leaves on it; the probe's calls are then cleared. Throws unless exactly one node
 * took the probe.
 */
export function mixNode(
  output: AudioOutput,
  fake: FakeWebAudioContext,
  gain: MixGain,
): FakeGainNode {
  const probe = 0.123
  output.setGain(gain, probe, 0)
  const hits = fake.gains.filter((node) =>
    node.gain.calls.some(([method, value]) => method === 'setValueAtTime' && value === probe),
  )
  const [hit] = hits
  if (hits.length !== 1 || hit === undefined) {
    throw new Error(`${hits.length} gain nodes took the ${gain} probe, expected 1`)
  }
  hit.gain.calls.length = 0
  return hit
}

/** Intent: the envelope gain node a click's oscillator feeds. Throws if it feeds no gain node. */
export function envelopeOf(
  fake: FakeWebAudioContext,
  oscillator: FakeOscillatorNode,
): FakeGainNode {
  const envelope = fake.gains.find((node) => node === oscillator.outputs[0])
  if (envelope === undefined) throw new Error(`${oscillator.label} feeds no gain node`)
  return envelope
}
