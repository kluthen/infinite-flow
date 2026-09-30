// @vitest-environment node
/**
 * The authored-source scan of `scripts/verify-boundaries.mjs`, run over the fixture tree in
 * `tests/fixtures/boundaries/src/`, which is laid out like the application's `src/` (an `audio/`, a
 * `midi/` and an `other/` directory) but lives outside it, so the real `npm run verify:boundaries`
 * scan never sees these deliberately forbidden calls. The build-output scan runs over file names
 * and over a throwaway directory tree made in the system temp directory.
 */
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { beforeAll, describe, expect, test } from 'vitest'

import {
  buildOutputBoundaryViolations,
  scanBuildOutputBoundaries,
  scanSourceBoundaries,
  sourceBoundaryViolations,
} from '../../../scripts/verify-boundaries.mjs'

const fixtureSourceRoot = fileURLToPath(new URL('../../fixtures/boundaries/src/', import.meta.url))

const audioOutsideAudioDirectory =
  'browser-only boundary: AudioContext is allowed only under src/audio/'
const midiOutsideMidiDirectory =
  'browser-only boundary: requestMIDIAccess is allowed only under src/midi/'
const alwaysForbidden =
  'browser-only boundary: network, cookie, microphone or media-element API found'
const persistence = 'ephemeral-state boundary: browser persistence API found'
const sampledAudio =
  'synthesized-backing boundary: sampled or decoded audio API found (voices are oscillators and gains only)'
const audioAsset = 'synthesized-backing boundary: audio or sample asset found in the build output'

/** Every directory an always-forbidden call is probed in, the two allowlisted ones included. */
const probedDirectories = ['audio', 'midi', 'other'] as const

describe('verify-boundaries source scan over the fixture tree', () => {
  let scan: Awaited<ReturnType<typeof scanSourceBoundaries>>

  beforeAll(async () => {
    scan = await scanSourceBoundaries(fixtureSourceRoot)
  })

  /** Intent: the boundaries one fixture file breaks; throws if the scan never saw that file. */
  function boundariesOf(file: string): string[] {
    if (!scan.files.includes(file)) {
      throw new Error(`fixture ${file} was not scanned; scanned: ${scan.files.join(', ')}`)
    }
    return scan.violations.filter((violation) => violation.file === file).map((v) => v.boundary)
  }

  // @test-link [[specification_browser_only_operation_verification]]
  test('AudioContext is allowed under the audio directory', () => {
    expect(boundariesOf('audio/audio-context.ts')).toEqual([])
  })

  // @test-link [[specification_browser_only_operation_verification]]
  test('AudioContext is rejected anywhere else, the MIDI directory included', () => {
    expect(boundariesOf('midi/audio-context.ts')).toEqual([audioOutsideAudioDirectory])
    expect(boundariesOf('other/audio-context.ts')).toEqual([audioOutsideAudioDirectory])
  })

  // @test-link [[specification_browser_only_operation_verification]]
  test('requestMIDIAccess is allowed under the MIDI directory', () => {
    expect(boundariesOf('midi/midi-access.ts')).toEqual([])
  })

  // @test-link [[specification_browser_only_operation_verification]]
  test('requestMIDIAccess is rejected anywhere else, the audio directory included', () => {
    expect(boundariesOf('audio/midi-access.ts')).toEqual([midiOutsideMidiDirectory])
    expect(boundariesOf('other/midi-access.ts')).toEqual([midiOutsideMidiDirectory])
  })

  // @test-link [[specification_browser_only_operation_verification]]
  test('a network call is rejected even inside the audio and MIDI directories', () => {
    expect(boundariesOf('audio/network.ts')).toEqual([alwaysForbidden])
    expect(boundariesOf('midi/network.ts')).toEqual([alwaysForbidden])
  })

  // @test-link [[specification_browser_only_operation_verification]]
  test('a microphone call is rejected even inside the audio and MIDI directories', () => {
    expect(boundariesOf('audio/microphone.ts')).toEqual([alwaysForbidden])
    expect(boundariesOf('midi/microphone.ts')).toEqual([alwaysForbidden])
  })

  // @test-link [[specification_ephemeral_state_verification]]
  test('a storage call is rejected even inside the audio and MIDI directories', () => {
    expect(boundariesOf('audio/storage.ts')).toEqual([persistence])
    expect(boundariesOf('midi/storage.ts')).toEqual([persistence])
  })
})

describe('verify-boundaries per-file check of every always-forbidden API', () => {
  const networkCookieMicrophoneAndMediaCalls = [
    'navigator.mediaDevices.getUserMedia({ audio: true })',
    'navigator.mediaDevices.enumerateDevices()',
    "fetch('/session')",
    'new XMLHttpRequest()',
    "new WebSocket('wss://example.com')",
    "new EventSource('/events')",
    "navigator.sendBeacon('/session')",
    'document.cookie',
    "new Audio('note.mp3')",
  ]
  const storageCalls = [
    "localStorage.setItem('k', 'v')",
    "sessionStorage.setItem('k', 'v')",
    "indexedDB.open('db')",
    "caches.open('c')",
  ]

  // @test-link [[specification_browser_only_operation_verification]]
  test.each(
    probedDirectories.flatMap((directory) =>
      networkCookieMicrophoneAndMediaCalls.map((call) => ({ directory, call })),
    ),
  )('$call is rejected in $directory/', ({ directory, call }) => {
    expect(
      sourceBoundaryViolations(`${directory}/probe.ts`, `export const probe = ${call}\n`),
    ).toEqual([alwaysForbidden])
  })

  // @test-link [[specification_ephemeral_state_verification]]
  test.each(
    probedDirectories.flatMap((directory) => storageCalls.map((call) => ({ directory, call }))),
  )('$call is rejected in $directory/', ({ directory, call }) => {
    expect(
      sourceBoundaryViolations(`${directory}/probe.ts`, `export const probe = ${call}\n`),
    ).toEqual([persistence])
  })

  const sampledAudioCalls = [
    'context.decodeAudioData(bytes)',
    'context.createBufferSource()',
    'context.createMediaElementSource(element)',
    'new AudioBuffer({ length: 1, sampleRate: 44100 })',
  ]

  // @test-link [[req_session_backing_track]]
  test.each(
    probedDirectories.flatMap((directory) =>
      sampledAudioCalls.map((call) => ({ directory, call })),
    ),
  )('$call is rejected in $directory/', ({ directory, call }) => {
    expect(
      sourceBoundaryViolations(`${directory}/probe.ts`, `export const probe = ${call}\n`),
    ).toEqual([sampledAudio])
  })

  // @test-link [[req_session_backing_track]]
  test('oscillators and gains are allowed under the audio directory', () => {
    const voice = 'const tone = context.createOscillator()\nconst level = context.createGain()\n'
    expect(sourceBoundaryViolations('audio/voice.ts', voice)).toEqual([])
  })
})

describe('verify-boundaries build-output check for audio and sample assets', () => {
  const audioAssets = [
    'assets/tone.wav',
    'assets/tone.mp3',
    'assets/tone.ogg',
    'assets/tone.oga',
    'assets/tone.opus',
    'assets/tone.flac',
    'assets/tone.aac',
    'assets/tone.m4a',
    'assets/tone.weba',
    'assets/song.mid',
    'assets/song.midi',
    'piano.sf2',
    'piano.sfz',
    'assets/TONE.WAV',
  ]

  // @test-link [[req_session_backing_track]]
  test.each(audioAssets)('%s is rejected in the build output', (file) => {
    expect(buildOutputBoundaryViolations(file)).toEqual([audioAsset])
  })

  // @test-link [[req_session_backing_track]]
  test.each([
    'index.html',
    'sw.js',
    'assets/index-abc.js',
    'assets/font.woff2',
    'manifest.webmanifest',
  ])('%s is allowed in the build output', (file) => {
    expect(buildOutputBoundaryViolations(file)).toEqual([])
  })

  // @test-link [[req_session_backing_track]]
  test('the scan walks nested build-output directories', async () => {
    const root = await mkdtemp(join(tmpdir(), 'verify-boundaries-'))
    try {
      await mkdir(join(root, 'assets', 'sounds'), { recursive: true })
      await writeFile(join(root, 'index.html'), '')
      await writeFile(join(root, 'assets', 'sounds', 'bass.ogg'), '')
      const scan = await scanBuildOutputBoundaries(root)
      expect(scan.files).toEqual(['assets/sounds/bass.ogg', 'index.html'])
      expect(scan.violations).toEqual([{ file: 'assets/sounds/bass.ogg', boundary: audioAsset }])
    } finally {
      await rm(root, { recursive: true, force: true })
    }
  })
})
