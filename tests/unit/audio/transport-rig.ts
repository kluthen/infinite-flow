/**
 * The audio transport specs' shared rig: a transport on the fake audio clock and output, its mix
 * design read from the real stylesheet's tokens. Unlike the fake itself, this helper reads the
 * stylesheet with Node, so it is for the unit specs only.
 */

import { readFileSync } from 'node:fs'

import { vi, type Mock } from 'vitest'

import { readAudioMixDesign, type AudioMixDesign, type DesignTokenSource } from '@/audio/audio-mix'
import type { AudioTime } from '@/audio/audio-ports'
import { createAudioTransport, type AudioTransport } from '@/audio/audio-transport'
import { createFakeAudioRig, type FakeAudioEvent, type FakeAudioRig } from './fake-audio'

/** Where every rig's clock starts: not zero, so no time is right by accident. */
export const RIG_START = 5

/** Seconds per beat at 120 BPM. */
export const BEAT = 0.5

/** Intent: the real stylesheet's `--mix-*` tokens, as a computed-style lookup would give them. */
export function themeMixTokens(): DesignTokenSource {
  const css = readFileSync('src/styles/theme.css', 'utf8')
  const tokens = new Map<string, string>()
  for (const match of css.matchAll(/(--mix-[a-z-]+)\s*:\s*([^;]+);/g)) {
    tokens.set(match[1] ?? '', match[2] ?? '')
  }
  return { getPropertyValue: (name) => tokens.get(name) ?? '' }
}

/** Intent: the mix design read from the real stylesheet's `--mix-*` tokens. */
export function themeDesign(): AudioMixDesign {
  return readAudioMixDesign(themeMixTokens())
}

/** A transport on a fake rig, with the design reader spied on. */
export interface TransportRig {
  readonly rig: FakeAudioRig
  readonly transport: AudioTransport
  readonly readMixDesign: Mock<() => AudioMixDesign>
}

/** Intent: a fresh transport on a fresh fake rig whose clock starts at `RIG_START`. */
// @test-link [[rule_audio_unlocked_by_player_click]]
export function transportRig(outputLatency = 0): TransportRig {
  const rig = createFakeAudioRig({ startTime: RIG_START, outputLatency })
  const readMixDesign = vi.fn(themeDesign)
  const transport = createAudioTransport({
    openOutput: rig.openOutput,
    createWakeTimer: rig.createWakeTimer,
    readMixDesign,
  })
  return { rig, transport, readMixDesign }
}

/** Intent: the moment beat `k` of a session started at `startAt` falls on, at 120 BPM. */
export function beat(startAt: AudioTime, k: number): AudioTime {
  return startAt + k * BEAT
}

/** Intent: every event other than a click, the calls a mix change may make. */
export function nonClickEvents(events: readonly FakeAudioEvent[]): FakeAudioEvent[] {
  return events.filter((event) => event.kind !== 'click')
}
