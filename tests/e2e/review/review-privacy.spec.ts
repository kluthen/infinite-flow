/**
 * v2.0 chunk 20, item 13: a network and storage spy across a full MIDI session with played notes,
 * its Review and every export, on the workspace harness's fake audio clock and fake MIDI access
 * (port 4175, which has no service worker). Nothing about the session is sent or stored:
 *
 * - **Network.** Every request the browser context makes (the page, its Workers) is a GET with no
 *   body for one of the app's own static files on the harness's origin: the harness document the
 *   test navigates to, and the built files under `/assets/` (entry, lazy chunks, Worker scripts,
 *   styles, fonts), never with a query string; no WebSocket is opened. In the page, no network API
 *   is called at all: `fetch`, `XMLHttpRequest`, `navigator.sendBeacon`, `WebSocket`,
 *   `EventSource`, `RTCPeerConnection`.
 * - **Storage** (the v3.0 interim guarantee of chunk 7b, widened by chunk 10 to the kept session
 *   and rewritten by chunk 11). Since v3.0 the app opens its one IndexedDB database at every load
 *   and saves the player's settings there, the review's preferences changed here among them. In
 *   the page, the only storage API called is `indexedDB.open`: no `Storage` write (localStorage
 *   and sessionStorage), no `indexedDB.deleteDatabase`, no `caches.open`/`delete` nor any `Cache`
 *   write, no `document.cookie` setter, no `cookieStore` write, no origin-private file system and
 *   no `navigator.storage.persist`. The end state catches whatever the wrappers cannot see (a
 *   Worker, a property assignment, a write through the opened database): the only IndexedDB
 *   database is the app's (`infinite-flow`); since chunk 10 it keeps the session that ended last,
 *   one session-wide record and one body under the same key, with its played notes not kept (the
 *   record says so, the body holds none and the `playedNotes` store is empty), and every
 *   `settings` record is one the settings codec reads back, so nothing else of the session, and no
 *   played note, is stored; both Storage areas, Cache Storage and cookies are empty, and no
 *   service worker is registered.
 * - **Played notes** (rule_optional_midi_privacy). They were recorded (the history holds three),
 *   shown and hidden with the Review's `Played notes` switch, yet none is sent or stored, and the
 *   only files that leave the machine are the downloads the player triggered, one per export
 *   click. Only the played-notes file the player asked for carries them; no generated-notes file
 *   does: each is byte for byte the file of the same session played silently, whose Review offers
 *   no played-notes export.
 */
import { expect, test, type BrowserContext, type Page, type Request } from '@playwright/test'

import { watchPageErrors } from '../controller/controller-helpers'
import { sessionState } from '../session/session-helpers'
import { untilStored } from '../storage/storage-helpers'
import {
  STEM,
  backingTrackToggle,
  collectDownloads,
  exportEach,
  exportOnce,
  exportPlayedButton,
  pickFormat,
  playedNotesToggle,
  reviewItems,
  reviewOfSession,
  type Downloads,
} from './review-helpers'

// The export file names are the session's start in the player's local time: fix the zone.
test.use({ timezoneId: 'Europe/Paris' })

let expectNoPageErrors: () => void

test.beforeEach(({ page }) => {
  expectNoPageErrors = watchPageErrors(page)
})

test.afterEach(() => expectNoPageErrors())

/** The in-page spy: each wrapper it put in place, and each wrapped call the page made. */
interface PrivacySpy {
  readonly installed: string[]
  readonly calls: string[]
}

type PrivacySpyWindow = Window & { __privacySpy: PrivacySpy }

/** Every wrapper the in-page spy must have put in place in Chromium. */
const SPIED_APIS = [
  'Storage.setItem',
  'Storage.removeItem',
  'Storage.clear',
  'indexedDB.open',
  'indexedDB.deleteDatabase',
  'caches.open',
  'caches.delete',
  'Cache.put',
  'Cache.add',
  'Cache.addAll',
  'Cache.delete',
  'document.cookie=',
  'navigator.storage.getDirectory',
  'navigator.storage.persist',
  'fetch',
  'XMLHttpRequest.open',
  'XMLHttpRequest.send',
  'navigator.sendBeacon',
  'WebSocket',
  'EventSource',
  'RTCPeerConnection',
]

/**
 * Intent: before any page script runs, wrap every browser storage write and every network API the
 * page could call, so each call is recorded in `window.__privacySpy.calls`; `installed` names each
 * wrapper put in place, so a test can prove the spy was armed.
 */
async function installPrivacySpy(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const spy = { installed: [] as string[], calls: [] as string[] }
    Object.defineProperty(window, '__privacySpy', { value: spy })

    /** Record each call of `owner[key]`, then make it. */
    const wrapMethod = (owner: object | undefined, key: string, label: string): void => {
      if (owner === undefined) return
      const original: unknown = Reflect.get(owner, key)
      if (typeof original !== 'function') return
      Reflect.set(owner, key, function (this: unknown, ...args: unknown[]) {
        spy.calls.push(label)
        return Reflect.apply(original, this, args) as unknown
      })
      spy.installed.push(label)
    }

    /** Record each construction of the global constructor `name`, then make it. */
    const wrapConstructor = (name: string): void => {
      const original: unknown = Reflect.get(window, name)
      if (typeof original !== 'function') return
      Reflect.set(
        window,
        name,
        new Proxy(original as new (...args: unknown[]) => object, {
          construct(target, args, newTarget) {
            spy.calls.push(name)
            return Reflect.construct(target, args, newTarget)
          },
        }),
      )
      spy.installed.push(name)
    }

    for (const key of ['setItem', 'removeItem', 'clear']) {
      wrapMethod(Storage.prototype, key, `Storage.${key}`)
    }
    for (const key of ['open', 'deleteDatabase']) {
      wrapMethod(IDBFactory.prototype, key, `indexedDB.${key}`)
    }
    for (const key of ['open', 'delete']) wrapMethod(CacheStorage.prototype, key, `caches.${key}`)
    for (const key of ['put', 'add', 'addAll', 'delete']) {
      wrapMethod(Cache.prototype, key, `Cache.${key}`)
    }
    const cookie = Object.getOwnPropertyDescriptor(Document.prototype, 'cookie')
    if (cookie?.set !== undefined && cookie.get !== undefined) {
      const { get, set } = cookie
      Object.defineProperty(Document.prototype, 'cookie', {
        configurable: true,
        enumerable: cookie.enumerable ?? true,
        get,
        set(this: Document, value: string) {
          spy.calls.push('document.cookie=')
          set.call(this, value)
        },
      })
      spy.installed.push('document.cookie=')
    }
    const cookieStore: unknown = Reflect.get(window, 'cookieStore')
    if (typeof cookieStore === 'object' && cookieStore !== null) {
      const prototype = Object.getPrototypeOf(cookieStore) as object
      for (const key of ['set', 'delete']) wrapMethod(prototype, key, `cookieStore.${key}`)
    }
    for (const key of ['getDirectory', 'persist']) {
      wrapMethod(StorageManager.prototype, key, `navigator.storage.${key}`)
    }

    wrapMethod(window, 'fetch', 'fetch')
    for (const key of ['open', 'send']) {
      wrapMethod(XMLHttpRequest.prototype, key, `XMLHttpRequest.${key}`)
    }
    wrapMethod(Navigator.prototype, 'sendBeacon', 'navigator.sendBeacon')
    for (const name of ['WebSocket', 'EventSource', 'RTCPeerConnection']) wrapConstructor(name)
  })
}

/** Intent: the in-page spy's wrappers and recorded calls. */
function readPrivacySpy(page: Page): Promise<PrivacySpy> {
  return page.evaluate(() => (window as unknown as PrivacySpyWindow).__privacySpy)
}

/** One request the browser context made, as the network spy saw it. */
interface SeenRequest {
  readonly url: string
  readonly method: string
  readonly resourceType: string
  readonly hasBody: boolean
}

/** Every request and WebSocket the browser context makes, from when `spyOnNetwork` is called. */
interface NetworkSpy {
  readonly requests: SeenRequest[]
  readonly webSockets: string[]
}

/**
 * Intent: record every request the browser context makes from now on (the page's and its
 * Workers'), and every WebSocket the page opens.
 */
function spyOnNetwork(context: BrowserContext, page: Page): NetworkSpy {
  const spy: NetworkSpy = { requests: [], webSockets: [] }
  context.on('request', (request: Request) => {
    spy.requests.push({
      url: request.url(),
      method: request.method(),
      resourceType: request.resourceType(),
      hasBody: request.postDataBuffer() !== null,
    })
  })
  page.on('websocket', (socket) => spy.webSockets.push(socket.url()))
  return spy
}

/** The resource types a static file of the app is fetched as; never xhr, fetch, ping or the like. */
const STATIC_RESOURCE_TYPES = new Set([
  'document',
  'script',
  'stylesheet',
  'font',
  'image',
  'other',
])

/**
 * Intent: the requests that are not one of the app's own static files: on the page's origin, a GET
 * with no body, of a static resource type, for the document itself (the path `/`, as the test
 * navigates to it) or for a built file under `/assets/` with no query string.
 */
function offendingRequests(requests: readonly SeenRequest[], origin: string): string[] {
  return requests
    .filter((request) => {
      const url = new URL(request.url)
      if (url.origin !== origin || request.method !== 'GET' || request.hasBody) return true
      if (!STATIC_RESOURCE_TYPES.has(request.resourceType)) return true
      if (request.resourceType === 'document') return url.pathname !== '/'
      return !/^\/assets\/[\w.-]+$/.test(url.pathname) || url.search !== ''
    })
    .map((request) => `${request.method} ${request.resourceType} ${request.url}`)
}

/** What the origin holds in browser storage, read from the page at the end. */
interface StoredState {
  readonly localStorageLength: number
  readonly sessionStorageLength: number
  readonly indexedDbNames: (string | undefined)[]
  readonly cacheNames: string[]
  readonly documentCookie: string
  readonly serviceWorkers: number
}

/** Intent: everything this origin holds in browser storage now. */
function readStoredState(page: Page): Promise<StoredState> {
  return page.evaluate(async () => ({
    localStorageLength: localStorage.length,
    sessionStorageLength: sessionStorage.length,
    indexedDbNames: (await indexedDB.databases()).map((database) => database.name),
    cacheNames: await caches.keys(),
    documentCookie: document.cookie,
    serviceWorkers: (await navigator.serviceWorker.getRegistrations()).length,
  }))
}

/** The wrapped network APIs; every other wrapped API is a storage one. */
const NETWORK_APIS = new Set([
  'fetch',
  'XMLHttpRequest.open',
  'XMLHttpRequest.send',
  'navigator.sendBeacon',
  'WebSocket',
  'EventSource',
  'RTCPeerConnection',
])

/**
 * Intent: the in-page spy is armed and saw no network call, and no storage call but the app's
 * opening of its database (`indexedDB.open`, at least once).
 */
async function expectNothingSentOrStored(page: Page): Promise<void> {
  const spy = await readPrivacySpy(page)
  expect(spy.installed).toEqual(expect.arrayContaining(SPIED_APIS))
  expect(spy.calls.filter((call) => NETWORK_APIS.has(call))).toEqual([])
  const storageCalls = spy.calls.filter((call) => !NETWORK_APIS.has(call))
  expect([...new Set(storageCalls)]).toEqual(['indexedDB.open'])
}

/**
 * Intent: the app's database holds the session that ended last and the settings, and nothing
 * else: one session-wide record and one body under the same key, the record saying its played
 * notes are not kept and the body holding none, no played notes record, and every settings record
 * one the settings codec reads back. Read through the harness's storage seam, once the session's
 * save has landed.
 */
async function expectOnlyKeptSessionAndSettingsStored(page: Page): Promise<void> {
  /** Intent: what the kept-session stores and the settings hold now. */
  const read = () =>
    page.evaluate(async () => {
      const { storage } = window.__workspaceHarness
      const summaries = await storage.keyedRecords('sessionSummaries')
      const bodies = await storage.keyedRecords('sessionBodies')
      return {
        summaryKeys: summaries.map(({ key }) => key),
        bodyKeys: bodies.map(({ key }) => key),
        playedNotesKept: summaries.map(
          ({ value }) => (value as { playedNotesKept?: unknown }).playedNotesKept,
        ),
        bodyHoldsPlayedNotes: bodies.some(({ value }) =>
          JSON.stringify(value).includes('"playedNotes"'),
        ),
        playedNotes: (await storage.records('playedNotes')).length,
        settingsNotReadBack: await storage.settingsNotReadBack(),
      }
    })
  await expect.poll(async () => (await read()).summaryKeys.length).toBe(1)
  const stored = await read()
  expect(stored).toEqual({
    summaryKeys: [expect.stringMatching(/^session-\d+-\d+$/)],
    bodyKeys: stored.summaryKeys,
    playedNotesKept: [false],
    bodyHoldsPlayedNotes: false,
    playedNotes: 0,
    settingsNotReadBack: [],
  })
}

// @test-link [[rule_session_data_never_sent_or_stored]]
// @test-link [[rule_optional_midi_privacy]]
test.describe('a session under a network and storage spy', () => {
  // @test-link [[rule_session_data_never_sent_or_stored]]
  // @test-link [[rule_optional_midi_privacy]]
  test('a MIDI session with played notes, its Review and every export send nothing and store only the kept session, without its played notes', async ({
    context,
    page,
  }) => {
    test.setTimeout(180_000)
    await installPrivacySpy(page)
    const network = spyOnNetwork(context, page)
    const downloads: Downloads = collectDownloads(page)

    // The session: the keyboard connected, three notes played (the history holds them), Stop.
    await reviewOfSession(page, true)
    await expect(reviewItems(page)).toHaveCount(2)
    await expect(reviewItems(page).first().locator('.review-staff svg').first()).toBeAttached({
      timeout: 30_000,
    })
    // Every export: MusicXML, MIDI and MIDI with the backing track, each twice, then the played
    // notes once; and the Played notes switch on, then off.
    const played = await exportEach(page, downloads)
    const playedFile = await exportOnce(page, downloads, exportPlayedButton(page))
    expect(playedFile.fileName).toBe(`${STEM}-played.mid`)
    for (const pressed of ['true', 'false']) {
      await playedNotesToggle(page).click()
      await expect(playedNotesToggle(page)).toHaveAttribute('aria-pressed', pressed)
    }
    await expectNothingSentOrStored(page)
    await expectOnlyKeptSessionAndSettingsStored(page)
    expect(
      (await sessionState(page)).lastHistoryPhrases?.flatMap((p) => p.playedNotes),
    ).toHaveLength(3)
    // The export's choices are saved preferences: put them back to their first-load values, and
    // wait until they are stored, so the silent session's Review starts from them as this one did.
    await backingTrackToggle(page).click()
    await pickFormat(page, 'MusicXML')
    await untilStored(page, { 'review.format': 'musicxml', 'review.backingTrack': false })

    // The same session played silently, on a fresh page under the same spies.
    const silentDownloads = collectDownloads(page)
    await reviewOfSession(page, false)
    await expect(exportPlayedButton(page)).toHaveCount(0)
    await expect(playedNotesToggle(page)).toHaveCount(0)
    const silent = await exportEach(page, silentDownloads)
    await expectNothingSentOrStored(page)

    const origin = new URL(page.url()).origin
    expect(network.requests.length).toBeGreaterThan(0)
    expect(offendingRequests(network.requests, origin)).toEqual([])
    expect(network.webSockets).toEqual([])
    await expectOnlyKeptSessionAndSettingsStored(page)
    expect(await readStoredState(page)).toEqual({
      localStorageLength: 0,
      sessionStorageLength: 0,
      indexedDbNames: ['infinite-flow'],
      cacheNames: [],
      documentCookie: '',
      serviceWorkers: 0,
    })
    expect(await context.cookies()).toEqual([])

    // The only files that left: one download per export click (six generated-notes files per
    // session, and the one played-notes file the player asked for), and no generated-notes file
    // holds a played note: each is the very file of the same session played silently.
    expect(downloads.all).toHaveLength(13)
    expect(silentDownloads.all).toHaveLength(6)
    expect(downloads.all.map((download) => download.suggestedFilename()).sort()).toEqual([
      ...Array.from({ length: 8 }, () => `${STEM}-generated.mid`),
      ...Array.from({ length: 4 }, () => `${STEM}-generated.musicxml`),
      `${STEM}-played.mid`,
    ])
    expect(silent.musicXml.equals(played.musicXml), 'MusicXML').toBe(true)
    expect(silent.midi.equals(played.midi), 'MIDI').toBe(true)
    expect(silent.midiWithBacking.equals(played.midiWithBacking), 'MIDI with backing').toBe(true)
  })
})
