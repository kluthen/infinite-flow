// @vitest-environment node
/**
 * The boundary rules of the real `eslint.config.js`, exercised through the ESLint Node API. Each
 * fixture in `tests/fixtures/boundaries/src/` is linted as if it sat at the same path under the
 * application's `src/` (for example `src/audio/audio-context.ts`), so the config's own `files`
 * globs decide which rules apply; the fixtures themselves stay outside `src/`.
 */
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { ESLint, type Linter } from 'eslint'
import { beforeAll, describe, expect, test } from 'vitest'

const repositoryRoot = fileURLToPath(new URL('../../../', import.meta.url))
const fixtureSourceRoot = new URL('../../fixtures/boundaries/src/', import.meta.url)

const boundaryRules = new Set(['no-restricted-globals', 'no-restricted-properties'])

const audioOutsideAudioDirectory = /Web Audio contexts may be created only under src\/audio\//
const midiOutsideMidiDirectory = /MIDI access may be requested only under src\/midi\//
const networkAccess = /Network access is forbidden everywhere in src\//
const microphoneAccess = /Microphone\/camera access is forbidden everywhere in src\//
const cookieAccess = /Cookies are forbidden everywhere in src\//
const mediaElementPlayback = /Media-element playback is forbidden everywhere in src\//
const browserPersistence = /Browser persistence is outside the ephemeral-state boundary/
const cacheApi = /The Cache API is not available to authored application code/

/** Every directory an always-forbidden call is probed in, the two allowlisted ones included. */
const probedDirectories = ['audio', 'midi', 'other'] as const

let eslint: ESLint

beforeAll(() => {
  eslint = new ESLint({
    cwd: repositoryRoot,
    overrideConfigFile: join(repositoryRoot, 'eslint.config.js'),
  })
})

/** Intent: lint `code` as though it were the authored file at `src/<relativePath>`. */
async function lintAsSource(relativePath: string, code: string): Promise<Linter.LintMessage[]> {
  const [result] = await eslint.lintText(code, {
    filePath: join(repositoryRoot, 'src', relativePath),
  })
  if (result === undefined) throw new Error(`ESLint returned no result for src/${relativePath}`)
  return result.messages
}

/** Intent: lint one fixture file at its mirrored `src/` path. */
async function lintFixture(relativePath: string): Promise<Linter.LintMessage[]> {
  const code = await readFile(new URL(relativePath, fixtureSourceRoot), 'utf8')
  return lintAsSource(relativePath, code)
}

/**
 * Intent: assert that every message is a boundary-rule error carrying the expected explanation, and
 * that there are exactly `count` of them (so a parse error or an unrelated rule cannot pass).
 */
function expectBoundaryErrors(
  messages: Linter.LintMessage[],
  explanation: RegExp,
  count: number,
): void {
  expect(messages).toHaveLength(count)
  for (const message of messages) {
    expect(boundaryRules.has(message.ruleId ?? '')).toBe(true)
    expect(message.severity).toBe(2)
    expect(message.message).toMatch(explanation)
  }
}

describe('eslint.config.js boundary rules over the fixture tree', () => {
  // @test-link [[specification_browser_only_operation_verification]]
  test('AudioContext, OfflineAudioContext and webkitAudioContext are allowed under src/audio/', async () => {
    expect(await lintFixture('audio/audio-context.ts')).toEqual([])
  })

  // @test-link [[specification_browser_only_operation_verification]]
  test('the audio contexts are rejected anywhere else, src/midi/ included', async () => {
    expectBoundaryErrors(await lintFixture('midi/audio-context.ts'), audioOutsideAudioDirectory, 3)
    expectBoundaryErrors(await lintFixture('other/audio-context.ts'), audioOutsideAudioDirectory, 3)
  })

  // @test-link [[specification_browser_only_operation_verification]]
  test('requestMIDIAccess is allowed under src/midi/', async () => {
    expect(await lintFixture('midi/midi-access.ts')).toEqual([])
  })

  // @test-link [[specification_browser_only_operation_verification]]
  test('requestMIDIAccess is rejected anywhere else, src/audio/ included', async () => {
    expectBoundaryErrors(await lintFixture('audio/midi-access.ts'), midiOutsideMidiDirectory, 1)
    expectBoundaryErrors(await lintFixture('other/midi-access.ts'), midiOutsideMidiDirectory, 1)
  })

  // @test-link [[specification_browser_only_operation_verification]]
  test('a network call is rejected even inside src/audio/ and src/midi/', async () => {
    expectBoundaryErrors(await lintFixture('audio/network.ts'), networkAccess, 1)
    expectBoundaryErrors(await lintFixture('midi/network.ts'), networkAccess, 1)
  })

  // @test-link [[specification_browser_only_operation_verification]]
  test('a microphone call is rejected even inside src/audio/ and src/midi/', async () => {
    expectBoundaryErrors(await lintFixture('audio/microphone.ts'), microphoneAccess, 2)
    expectBoundaryErrors(await lintFixture('midi/microphone.ts'), microphoneAccess, 2)
  })

  // @test-link [[specification_ephemeral_state_verification]]
  test('a storage call is rejected even inside src/audio/ and src/midi/', async () => {
    expectBoundaryErrors(await lintFixture('audio/storage.ts'), browserPersistence, 1)
    expectBoundaryErrors(await lintFixture('midi/storage.ts'), browserPersistence, 1)
  })
})

describe('eslint.config.js rejects every always-forbidden API in every src/ directory', () => {
  const networkCookieMicrophoneAndMediaCalls = [
    {
      call: 'navigator.mediaDevices.getUserMedia({ audio: true })',
      explanation: microphoneAccess,
      count: 2,
    },
    { call: 'navigator.mediaDevices.enumerateDevices()', explanation: microphoneAccess, count: 1 },
    { call: "fetch('/session')", explanation: networkAccess, count: 1 },
    { call: 'new XMLHttpRequest()', explanation: networkAccess, count: 1 },
    { call: "new WebSocket('wss://example.com')", explanation: networkAccess, count: 1 },
    { call: "new EventSource('/events')", explanation: networkAccess, count: 1 },
    { call: "navigator.sendBeacon('/session')", explanation: networkAccess, count: 1 },
    { call: 'document.cookie', explanation: cookieAccess, count: 1 },
    { call: "new Audio('note.mp3')", explanation: mediaElementPlayback, count: 1 },
  ]
  const storageCalls = [
    { call: "localStorage.setItem('k', 'v')", explanation: browserPersistence },
    { call: "sessionStorage.setItem('k', 'v')", explanation: browserPersistence },
    { call: "indexedDB.open('db')", explanation: browserPersistence },
    { call: "caches.open('c')", explanation: cacheApi },
  ]

  // @test-link [[specification_browser_only_operation_verification]]
  test.each(
    probedDirectories.flatMap((directory) =>
      networkCookieMicrophoneAndMediaCalls.map((probe) => ({ directory, ...probe })),
    ),
  )('$call is rejected in src/$directory/', async ({ directory, call, explanation, count }) => {
    const messages = await lintAsSource(`${directory}/probe.ts`, `export const probe = ${call}\n`)
    expectBoundaryErrors(messages, explanation, count)
  })

  // @test-link [[specification_ephemeral_state_verification]]
  test.each(
    probedDirectories.flatMap((directory) =>
      storageCalls.map((probe) => ({ directory, ...probe })),
    ),
  )('$call is rejected in src/$directory/', async ({ directory, call, explanation }) => {
    const messages = await lintAsSource(`${directory}/probe.ts`, `export const probe = ${call}\n`)
    expectBoundaryErrors(messages, explanation, 1)
  })
})
