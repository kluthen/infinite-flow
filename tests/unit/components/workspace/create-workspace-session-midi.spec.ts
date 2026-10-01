/**
 * The production workspace session's MIDI controller: `createWorkspaceSession` builds it on the
 * browser's Web MIDI (a hand-made fake navigator here, jsdom has none) without requesting access,
 * reads a browser without Web MIDI as unsupported, and places played notes on the clock anchor of
 * the session's own audio transport. No real browser `Worker` is ever constructed.
 */
import { afterEach, describe, expect, it, vi } from 'vitest'

import { createWorkspaceSession } from '@/components/workspace/create-workspace-session'
import type { PlayedNoteEvent } from '@/midi/played-note-tracker'
import type { WebMidiNavigatorPort } from '@/midi/web-midi-access'
import {
  createFakeWebMidiAccess,
  createFakeWebMidiNavigator,
  createFakeWebMidiPort,
} from '../../midi/fake-web-midi'

vi.mock('@/generation-worker/browser-generation-worker', () => ({
  createBrowserGenerationWorker: vi.fn(() => ({
    postMessage: vi.fn(),
    addEventListener: vi.fn(),
    terminate: vi.fn(),
  })),
}))

/** Intent: a jsdom stand-in for `window.matchMedia`, for a window wider than every breakpoint. */
function stubWideWindow(): void {
  vi.stubGlobal(
    'matchMedia',
    vi.fn((query: string) => ({
      media: query,
      matches: false,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
    })),
  )
}

/**
 * Intent: give jsdom's navigator (which has no Web MIDI) the fake browser's `requestMIDIAccess`,
 * removed again after each test.
 */
function stubRequestMidiAccess(browser: WebMidiNavigatorPort): void {
  Object.defineProperty(navigator, 'requestMIDIAccess', {
    configurable: true,
    value: browser.requestMIDIAccess,
  })
}

// @test-link [[req_midi_controller_input]]
// @test-link [[rule_controller_connects_between_sessions]]
describe('createWorkspaceSession: the MIDI controller', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    Reflect.deleteProperty(navigator, 'requestMIDIAccess')
  })

  // @test-link [[rule_controller_connects_between_sessions]]
  // @test-link [[rule_chromium_only_support]]
  it('builds a Web MIDI controller that never requests access until connect()', () => {
    stubWideWindow()
    const browser = createFakeWebMidiNavigator(() => Promise.resolve(createFakeWebMidiAccess([])))
    stubRequestMidiAccess(browser)
    const workspace = createWorkspaceSession({ prewarmPolicy: 'disabled' })

    expect(workspace.midi.state()).toEqual({ kind: 'not-requested' })
    expect(browser.calls).toEqual([])

    workspace.dispose()
    expect(browser.calls).toEqual([])
  })

  // @test-link [[rule_chromium_only_support]]
  // @test-link [[rule_midi_never_blocks_session]]
  it('reads a browser without Web MIDI as unsupported, without failing', () => {
    stubWideWindow()
    expect('requestMIDIAccess' in navigator).toBe(false)
    const workspace = createWorkspaceSession({ prewarmPolicy: 'disabled' })

    expect(workspace.midi.state()).toEqual({ kind: 'unsupported' })

    workspace.dispose()
  })

  // @test-link [[req_midi_controller_input]]
  // @test-link [[rule_only_note_on_counts_as_played]]
  it("places played notes on the clock anchor of the session's own audio transport", async () => {
    stubWideWindow()
    const port = createFakeWebMidiPort('keys')
    const browser = createFakeWebMidiNavigator(() =>
      Promise.resolve(createFakeWebMidiAccess([port])),
    )
    stubRequestMidiAccess(browser)
    const workspace = createWorkspaceSession({ prewarmPolicy: 'disabled' })
    const anchor = vi
      .spyOn(workspace.audio, 'clockAnchor')
      .mockReturnValue({ audioTime: 2, performanceTimeMs: 1000 })
    const notes: PlayedNoteEvent[] = []
    workspace.midi.onPlayedNote((event) => notes.push(event))

    await workspace.midi.connect()
    expect(workspace.midi.state()).toMatchObject({ kind: 'connected', device: { id: 'keys' } })
    port.emit(Uint8Array.of(0x90, 60, 100), 1500)

    expect(anchor).toHaveBeenCalledTimes(1)
    expect(notes).toEqual([{ kind: 'played', note: { pitch: 60, velocity: 100, onsetAt: 2.5 } }])
    expect(browser.calls).toHaveLength(1)

    workspace.dispose()
  })
})
