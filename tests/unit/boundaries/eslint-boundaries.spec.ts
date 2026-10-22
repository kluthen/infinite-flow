// @vitest-environment node
/**
 * The boundary rules of the real `eslint.config.js`, exercised through the ESLint Node API. Each
 * fixture in `tests/fixtures/boundaries/src/` is linted as if it sat at the same path under the
 * application's `src/` (for example `src/audio/audio-context.ts` or `src/storage/indexed-db.ts`),
 * so the config's own `files` globs decide which rules apply; the fixtures themselves stay outside
 * `src/`.
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
const storageOutsideStorageDirectory =
  /IndexedDB and navigator\.storage may be used only under src\/storage\//
const networkAccess = /Network access is forbidden everywhere in src\//
const microphoneAccess = /Microphone\/camera access is forbidden everywhere in src\//
const cookieAccess = /Cookies are forbidden everywhere in src\//
const mediaElementPlayback = /Media-element playback is forbidden everywhere in src\//
const browserPersistence = /Browser persistence is outside the ephemeral-state boundary/
const cacheApi = /The Cache API is not available to authored application code/

/** Every directory an always-forbidden call is probed in, the three allowlisted ones included. */
const probedDirectories = ['audio', 'midi', 'storage', 'other'] as const

/** The directories, other than `storage/`, that the IndexedDB and storage-manager fixtures sit in. */
const directoriesOutsideStorage = ['audio', 'midi', 'session', 'export', 'components'] as const

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

  // @test-link [[req_on_device_storage]]
  test('indexedDB.open and navigator.storage.persist() are allowed under src/storage/', async () => {
    expect(await lintFixture('storage/indexed-db.ts')).toEqual([])
    expect(await lintFixture('storage/storage-persist.ts')).toEqual([])
  })

  // @test-link [[req_on_device_storage]]
  // @test-link [[specification_ephemeral_state_verification]]
  test.each(directoriesOutsideStorage)(
    'indexedDB.open and navigator.storage.persist() are rejected in src/%s/',
    async (directory) => {
      expectBoundaryErrors(
        await lintFixture(`${directory}/indexed-db.ts`),
        storageOutsideStorageDirectory,
        1,
      )
      expectBoundaryErrors(
        await lintFixture(`${directory}/storage-persist.ts`),
        storageOutsideStorageDirectory,
        1,
      )
    },
  )

  // @test-link [[specification_ephemeral_state_verification]]
  test('localStorage, sessionStorage and caches are rejected even inside src/storage/', async () => {
    expectBoundaryErrors(await lintFixture('storage/local-storage.ts'), browserPersistence, 1)
    expectBoundaryErrors(await lintFixture('storage/session-storage.ts'), browserPersistence, 1)
    expectBoundaryErrors(await lintFixture('storage/cache-api.ts'), cacheApi, 1)
  })

  // @test-link [[specification_browser_only_operation_verification]]
  test('document.cookie and cookieStore are rejected even inside src/storage/', async () => {
    expectBoundaryErrors(await lintFixture('storage/document-cookie.ts'), cookieAccess, 1)
    expectBoundaryErrors(await lintFixture('storage/cookie-store.ts'), cookieAccess, 1)
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
    { call: "cookieStore.set('k', 'v')", explanation: cookieAccess, count: 1 },
    { call: "window.cookieStore.get('k')", explanation: cookieAccess, count: 1 },
    { call: "new Audio('note.mp3')", explanation: mediaElementPlayback, count: 1 },
  ]
  const storageCalls = [
    { call: "localStorage.setItem('k', 'v')", explanation: browserPersistence },
    { call: "sessionStorage.setItem('k', 'v')", explanation: browserPersistence },
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

describe('eslint.config.js allows IndexedDB and the storage manager under src/storage/ only', () => {
  const storageDirectoryCalls = [
    "indexedDB.open('db')",
    "window.indexedDB.open('db')",
    "globalThis.indexedDB.deleteDatabase('db')",
    "self.indexedDB.open('db')",
    'navigator.storage.persist()',
    'navigator.storage.estimate()',
    'navigator?.storage.persist()',
  ]

  // @test-link [[req_on_device_storage]]
  test.each(storageDirectoryCalls)('%s is allowed in src/storage/', async (call) => {
    expect(await lintAsSource('storage/probe.ts', `export const probe = ${call}\n`)).toEqual([])
  })

  // @test-link [[req_on_device_storage]]
  // @test-link [[specification_ephemeral_state_verification]]
  test.each(
    ['audio', 'midi', 'other'].flatMap((directory) =>
      storageDirectoryCalls.map((call) => ({ directory, call })),
    ),
  )('$call is rejected in src/$directory/', async ({ directory, call }) => {
    const messages = await lintAsSource(`${directory}/probe.ts`, `export const probe = ${call}\n`)
    expectBoundaryErrors(messages, storageOutsideStorageDirectory, 1)
  })
})

describe('eslint.config.js keeps src/session/ and src/export/ from importing src/storage/', () => {
  const storageFreeImport =
    /src\/session\/ and src\/export\/ stay storage-free: they never import src\/storage\//
  const vexflowImport = /Only src\/notation\/vexflow-mapping\.ts/

  const storageImports = [
    "import { openStoragePort } from '@/storage/storage-port'",
    "import { openStoragePort } from '../storage/database'",
  ]

  /** Intent: lint a probe file that makes `importStatement` and re-exports what it imported. */
  async function lintImport(
    relativePath: string,
    importStatement: string,
  ): Promise<Linter.LintMessage[]> {
    return lintAsSource(relativePath, `${importStatement}\nexport const probe = openStoragePort\n`)
  }

  /** Intent: assert exactly one no-restricted-imports error carrying the expected explanation. */
  function expectRestrictedImport(messages: Linter.LintMessage[], explanation: RegExp): void {
    expect(messages).toHaveLength(1)
    const [message] = messages
    expect(message?.ruleId).toBe('no-restricted-imports')
    expect(message?.severity).toBe(2)
    expect(message?.message).toMatch(explanation)
  }

  // @test-link [[module_on_device_database]]
  test.each(
    ['session', 'export'].flatMap((directory) =>
      storageImports.map((importStatement) => ({ directory, importStatement })),
    ),
  )('$importStatement is rejected in src/$directory/', async ({ directory, importStatement }) => {
    expectRestrictedImport(
      await lintImport(`${directory}/x.ts`, importStatement),
      storageFreeImport,
    )
  })

  // @test-link [[module_on_device_database]]
  test.each(
    ['components', 'composables'].flatMap((directory) =>
      storageImports.map((importStatement) => ({ directory, importStatement })),
    ),
  )('$importStatement is allowed in src/$directory/', async ({ directory, importStatement }) => {
    expect(await lintImport(`${directory}/x.ts`, importStatement)).toEqual([])
  })

  test.each(['session', 'export'])('vexflow stays rejected in src/%s/', async (directory) => {
    const messages = await lintAsSource(
      `${directory}/x.ts`,
      "import { Stave } from 'vexflow'\nexport const probe = Stave\n",
    )
    expectRestrictedImport(messages, vexflowImport)
  })
})

describe('eslint.config.js keeps the doodle quantizer inside src/jam/', () => {
  const quantizerOutsideJam =
    /Only src\/jam\/ may import the doodle quantizer \(src\/jam\/doodle-quantizer\.ts\)\./

  const quantizerImportsFromOutside = [
    "import { quantizeDoodle } from '@/jam/doodle-quantizer'",
    "import { quantizeDoodle } from '../jam/doodle-quantizer'",
  ]
  const quantizerImportsFromJam = [
    "import { quantizeDoodle } from '@/jam/doodle-quantizer'",
    "import { quantizeDoodle } from './doodle-quantizer'",
  ]

  /** Intent: lint a probe file that makes `importStatement` and re-exports what it imported. */
  async function lintImport(
    relativePath: string,
    importStatement: string,
  ): Promise<Linter.LintMessage[]> {
    return lintAsSource(relativePath, `${importStatement}\nexport const probe = quantizeDoodle\n`)
  }

  /** Intent: assert exactly one typescript-eslint no-restricted-imports error for the quantizer. */
  function expectRestrictedQuantizerImport(messages: Linter.LintMessage[]): void {
    expect(messages).toHaveLength(1)
    const [message] = messages
    expect(message?.ruleId).toBe('@typescript-eslint/no-restricted-imports')
    expect(message?.severity).toBe(2)
    expect(message?.message).toMatch(quantizerOutsideJam)
  }

  // @test-link [[module_doodle_quantizer]]
  test.each(
    ['session', 'export', 'components', 'domain', 'midi'].flatMap((directory) =>
      quantizerImportsFromOutside.map((importStatement) => ({ directory, importStatement })),
    ),
  )('$importStatement is rejected in src/$directory/', async ({ directory, importStatement }) => {
    expectRestrictedQuantizerImport(await lintImport(`${directory}/x.ts`, importStatement))
  })

  // @test-link [[module_doodle_quantizer]]
  test.each(quantizerImportsFromJam)('%s is allowed in src/jam/', async (importStatement) => {
    expect(await lintImport('jam/x.ts', importStatement)).toEqual([])
  })
})
