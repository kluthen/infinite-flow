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
 * - **Storage** (rewritten by v3.0 chunk 11, from chunk 7b's interim guarantee widened by chunk 10
 *   to the kept session). Since v3.0 the app opens its one IndexedDB database at every load and
 *   saves there what the player keeps: the settings (the review's preferences changed here among
 *   them), my instrument, the remembered controller, and the session that ended last; played notes
 *   only once the player opts in with `Keep my played notes`, off here. In the page, the only
 *   storage API called is `indexedDB.open`: no `Storage` write (localStorage and sessionStorage),
 *   no `indexedDB.deleteDatabase`, no `caches.open`/`delete` nor any `Cache` write, no
 *   `document.cookie` setter, no `cookieStore` write, no origin-private file system and no
 *   `navigator.storage.persist`. Every record written through the opened database lands in an
 *   allowed store (`meta` at the database's creation, `settings`, `instrument`, `controller`,
 *   `sessionSummaries`, `sessionBodies`), never in `playedNotes` while the switch is off (a
 *   session's save still deletes an older unpinned session's played notes, if any). The end
 *   state catches whatever the wrappers cannot see (a Worker, a property assignment): the only
 *   IndexedDB database is the app's (`infinite-flow`); it keeps the session that ended last, one
 *   session-wide record and one body under the same key, with its played notes not kept (the
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
 * - **With every kind of record stored** (v3.0 release gate, definition of done item 5). The
 *   network half again, watched from before the first load, over a database holding every kind of
 *   record: non-default settings with `Keep my played notes` on, my instrument selected, the
 *   remembered controller, three kept sessions with their played notes (one pinned by a favorite
 *   and commented, one pinned, the most recent), one whose session-wide record cannot be read and
 *   one whose body is damaged. A second visit reads it all, opens Your data, the session list and a
 *   kept session's Review, exports it in every way, then plays and exports a new session with
 *   played notes: still nothing but the app's own static files is fetched, no WebSocket opens.
 *   Two player presets are saved there too, through the preset bar, one meant only for the key and
 *   mode in force, and the sessions play under one of them (v3.1 release gate, definition of done
 *   item 21): none is sent.
 */
import {
  expect,
  test,
  type BrowserContext,
  type Locator,
  type Page,
  type Request,
} from '@playwright/test'

import {
  KEYS,
  clickControllerStatus,
  gotoControllerHarness,
  midiState,
  sheet as controllerSheet,
  sheetClose,
  watchPageErrors,
} from '../controller/controller-helpers'
import { sessionAction, sessionState } from '../session/session-helpers'
import { noteOff, noteOn } from '../session/session-midi-helpers'
import { INSTRUMENT_GROUP, MY_INSTRUMENT_ID } from '../storage/my-instrument-sheet-helpers'
import {
  harnessReady,
  seedMyInstrument,
  seedSettings,
  untilStored,
} from '../storage/storage-helpers'
import { LOW_TENOR, closeWithDone, openYourData } from '../storage/your-data-helpers'
import { expectPresetShown, radio } from '../workspace/helpers'
import {
  keyAndModeOptions,
  nameField,
  openSheet,
  presetSheet,
  saveAsNew,
  sheetButton,
  yourPresetNames,
} from '../workspace/preset-management-helpers'
import {
  HELD_NOTE_SECONDS,
  STEM,
  backingTrackToggle,
  collectDownloads,
  exportEach,
  exportOnce,
  exportPlayedButton,
  formatOption,
  keepPlayedNotesToggle,
  pickFormat,
  playedNotesToggle,
  reviewItems,
  reviewOfSession,
  reviewPanel,
  reviewTitle,
  sessionEndedAfter,
  type Downloads,
} from './review-helpers'
import { keyedRecords, pinButton, star, summaryOf } from './review-tools-helpers'
import {
  keyStartedAt,
  rowOpen,
  rows,
  seedCopy,
  sessionDateOf,
  showListFromCueRow,
  startAt,
} from './session-list-helpers'

// The export file names are the session's start in the player's local time: fix the zone.
test.use({ timezoneId: 'Europe/Paris' })

let expectNoPageErrors: () => void

test.beforeEach(({ page }) => {
  expectNoPageErrors = watchPageErrors(page)
})

test.afterEach(() => expectNoPageErrors())

/**
 * The in-page spy: each wrapper it put in place, each wrapped call the page made, and the store
 * of each record written (`put`, `add`) through an opened IndexedDB database.
 */
interface PrivacySpy {
  readonly installed: string[]
  readonly calls: string[]
  readonly storeWrites: string[]
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
  'IDBObjectStore.put',
  'IDBObjectStore.add',
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
 * page could call, so each call is recorded in `window.__privacySpy.calls`, and every record
 * written through an opened IndexedDB database, so its store is recorded in `storeWrites`;
 * `installed` names each wrapper put in place, so a test can prove the spy was armed.
 */
async function installPrivacySpy(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const spy = { installed: [] as string[], calls: [] as string[], storeWrites: [] as string[] }
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
    for (const key of ['put', 'add']) {
      const original: unknown = Reflect.get(IDBObjectStore.prototype, key)
      if (typeof original !== 'function') continue
      Reflect.set(
        IDBObjectStore.prototype,
        key,
        function (this: IDBObjectStore, ...args: unknown[]) {
          spy.storeWrites.push(this.name)
          return Reflect.apply(original, this, args) as unknown
        },
      )
      spy.installed.push(`IDBObjectStore.${key}`)
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
 * The stores the app may write to with `Keep my played notes` off: `meta` at the database's
 * creation, then what the player keeps (my instrument and the remembered controller included),
 * never `playedNotes`.
 */
const ALLOWED_STORES = new Set([
  'meta',
  'settings',
  'instrument',
  'controller',
  'sessionSummaries',
  'sessionBodies',
])

/**
 * Intent: the in-page spy is armed and saw no network call, no storage call but the app's
 * opening of its database (`indexedDB.open`, at least once), and records written in the allowed
 * stores only: no played note reaches storage while `Keep my played notes` is off.
 */
async function expectNothingSentOrStored(page: Page): Promise<void> {
  const spy = await readPrivacySpy(page)
  expect(spy.installed).toEqual(expect.arrayContaining(SPIED_APIS))
  expect(spy.calls.filter((call) => NETWORK_APIS.has(call))).toEqual([])
  const storageCalls = spy.calls.filter((call) => !NETWORK_APIS.has(call))
  expect([...new Set(storageCalls)]).toEqual(['indexedDB.open'])
  expect(spy.storeWrites.length).toBeGreaterThan(0)
  expect([...new Set(spy.storeWrites)].filter((store) => !ALLOWED_STORES.has(store))).toEqual([])
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

/** Intent: the in-page spy is armed and saw the page call no network API since its load. */
async function expectNoNetworkCall(page: Page): Promise<void> {
  const spy = await readPrivacySpy(page)
  expect(spy.installed).toEqual(expect.arrayContaining([...NETWORK_APIS]))
  expect(spy.calls.filter((call) => NETWORK_APIS.has(call))).toEqual([])
}

/** The fake browser's MIDI state at every load: access already allowed, the keyboard plugged in. */
const KEYS_ALLOWED = { atLoad: { permission: 'granted' as const, devices: [KEYS] } }

/**
 * The settings the full database holds, none at its first-load value: my instrument selected, the
 * theme, the Review's preferences, and `Keep my played notes` on.
 */
const SAVED_SETTINGS = {
  theme: 'Dark',
  'controls.instrumentProfileId': MY_INSTRUMENT_ID,
  'review.format': 'midi',
  'review.backingTrack': true,
  'review.playedNotesShown': true,
  keepPlayedNotes: true,
}

/** The comment the first kept session holds. */
const COMMENT = 'Slower next time.'

/** The key of the seeded kept session whose session-wide record cannot be read. */
const UNREADABLE_KEY = 'session-1-1'
/** The key of the seeded kept session whose body is damaged. */
const DAMAGED_BODY_KEY = 'session-copy-damaged'

/** The player preset saved with the sheet's default key and mode choice. */
const EVENING_PRESET = 'Evening practice'
/** The player preset saved meant only for the key and mode in force; the sessions play under it. */
const ONLY_HERE_PRESET = 'Only here'

/** Every store of the app's database the harness reads. */
const STORES: readonly WorkspaceHarnessStoreName[] = [
  'settings',
  'presets',
  'instrument',
  'controller',
  'sessionSummaries',
  'sessionBodies',
  'playedNotes',
]

/** Intent: how many records each store of the app's database holds now, read through the seam. */
function storeCounts(page: Page): Promise<Record<string, number>> {
  return page.evaluate(async (stores) => {
    const { storage } = window.__workspaceHarness
    const counts = await Promise.all(
      stores.map(async (store) => [store, (await storage.records(store)).length] as const),
    )
    return Object.fromEntries(counts)
  }, STORES)
}

/** Intent: the keys of the kept sessions stored now, sorted. */
async function keptKeys(page: Page): Promise<string[]> {
  return (await keyedRecords(page, 'sessionSummaries')).map(({ key }) => key).sort()
}

/**
 * Intent: the export files' name stem of the session started at `startAt(n)`, in a spec run with
 * `timezoneId: 'Europe/Paris'`: 12:05 on October `n + 1`, 2026.
 */
function stemAt(n: number): string {
  return `infinite-flow-2026-10-${String(n + 1).padStart(2, '0')}-120500`
}

/**
 * Intent: leave the Review if it shows, then play a two-phrase session (phrase 1 seeded 7) started
 * at `startAt(n)` on the wall clock, one note held on the keyboard while phrase 2 sounds, then
 * Stop: the Review shows, with its played note. Resolves the key it is kept under.
 */
async function sessionWithPlayedNoteAt(page: Page, n: number): Promise<string> {
  if ((await sessionAction(page).textContent())?.trim() === 'Close review') {
    await expect
      .poll(() => page.evaluate(() => window.__workspaceHarness.snapshot().operation))
      .toBe('idle')
    await sessionAction(page).click()
    await expect(sessionAction(page)).toHaveText('Start session')
  }
  await page.evaluate((at) => window.__workspaceHarness.setWallClock(at), startAt(n))
  await sessionEndedAfter(page, 2, 7, async () => {
    const onset = await noteOn(page, KEYS, 30)
    await noteOff(page, KEYS, 30, onset + HELD_NOTE_SECONDS)
  })
  await expect(playedNotesToggle(page)).toBeVisible()
  return keyStartedAt(page, startAt(n))
}

/** Intent: one of the Review's export scope choices. */
function scopeOption(page: Page, label: 'Whole session' | 'Favorites only'): Locator {
  return reviewPanel(page)
    .getByRole('radiogroup', { name: 'Export' })
    .getByRole('radio', { name: label, exact: true })
}

// @test-link [[rule_session_data_never_sent_or_stored]]
// @test-link [[rule_optional_midi_privacy]]
// @test-link [[rule_played_notes_kept_only_after_opt_in]]
test.describe('a session under a network and storage spy', () => {
  // @test-link [[rule_session_data_never_sent_or_stored]]
  // @test-link [[rule_optional_midi_privacy]]
  // @test-link [[rule_played_notes_kept_only_after_opt_in]]
  test('a MIDI session with played notes, its Review and every export send nothing and store only allowed data, no played note while Keep my played notes is off', async ({
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
    // Keep my played notes is off, as at a first visit.
    await expect(keepPlayedNotesToggle(page)).toHaveAttribute('aria-pressed', 'false')
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

  // @test-link [[rule_session_data_never_sent_or_stored]]
  // @test-link [[rule_optional_midi_privacy]]
  test('with every kind of record stored, a visit reading them, opening kept sessions, playing a session with played notes and every export sends nothing', async ({
    context,
    page,
  }) => {
    test.setTimeout(300_000)
    await installPrivacySpy(page)
    const network = spyOnNetwork(context, page)
    const downloads: Downloads = collectDownloads(page)
    /** Intent: export once with `button` (`Export generated notes` unless given); its file name. */
    const exportAs = async (button?: Locator): Promise<string> =>
      (await exportOnce(page, downloads, button)).fileName

    // The first visit fills the database. The keyboard connected through the connection sheet is
    // the remembered controller; my instrument and the settings are seeded, then read by a reload.
    await gotoControllerHarness(page, KEYS_ALLOWED)
    await clickControllerStatus(page)
    await sheetClose(page).click()
    await expect(controllerSheet(page)).toBeHidden()
    await expect.poll(async () => (await storeCounts(page)).controller).toBe(1)
    await seedMyInstrument(page, LOW_TENOR)
    await seedSettings(page, SAVED_SETTINGS)
    await expectNoNetworkCall(page)
    await page.reload()
    await harnessReady(page)
    await expect.poll(() => midiState(page)).toEqual({ kind: 'connected', device: KEYS })
    await expect(radio(page, INSTRUMENT_GROUP, LOW_TENOR.name)).toHaveAttribute(
      'aria-checked',
      'true',
    )
    // Two player presets saved as a player does, through the preset bar: one with the sheet's
    // default choice, one meant only for the key and mode in force, which stays selected.
    await saveAsNew(page, EVENING_PRESET)
    await openSheet(page, 'Save as new preset', 'Save as a new preset')
    await nameField(page).fill(ONLY_HERE_PRESET)
    const onlyChoice = keyAndModeOptions(page).filter({ hasText: /^\s*Only / })
    await onlyChoice.click()
    await expect(onlyChoice).toHaveAttribute('aria-checked', 'true')
    await sheetButton(page, 'Save').click()
    await expect(presetSheet(page)).toHaveCount(0)
    await expectPresetShown(page, ONLY_HERE_PRESET)
    await expect.poll(async () => (await storeCounts(page)).presets).toBe(2)

    // Three sessions played with my instrument, each with a played note kept: the first with a
    // favorite (which pins it) and a comment, the second pinned, the third the most recent.
    const first = await sessionWithPlayedNoteAt(page, 1)
    await expect(keepPlayedNotesToggle(page)).toHaveAttribute('aria-pressed', 'true')
    await star(page, 2).click()
    const comment = reviewPanel(page).locator('.review-comment')
    await comment.getByRole('button', { name: 'Add a comment', exact: true }).click()
    await page.keyboard.insertText(COMMENT)
    await comment.getByRole('button', { name: 'Done', exact: true }).click()
    await expect
      .poll(() => summaryOf(page, first))
      .toMatchObject({ pinned: true, favoritesCount: 1, comment: COMMENT })
    const second = await sessionWithPlayedNoteAt(page, 2)
    await pinButton(page).click()
    await expect.poll(async () => (await summaryOf(page, second))?.pinned).toBe(true)
    const third = await sessionWithPlayedNoteAt(page, 3)
    // Two damaged kept sessions: one whose session-wide record cannot be read, and a copy of the
    // second, started a day before the first, whose body is damaged.
    await seedCopy(page, second, DAMAGED_BODY_KEY, { startedAt: startAt(0), newer: false })
    await page.evaluate(
      (key) => window.__workspaceHarness.storage.seedDamagedKeptBody(key),
      DAMAGED_BODY_KEY,
    )
    await page.evaluate(
      (key) => window.__workspaceHarness.storage.seedUnreadableKeptSession(key),
      UNREADABLE_KEY,
    )

    // Every store holds records: the settings, the two player presets, my instrument, the
    // remembered controller, five kept sessions (two damaged) and the three readable ones' played
    // notes.
    await expect
      .poll(() => storeCounts(page))
      .toMatchObject({
        presets: 2,
        instrument: 1,
        controller: 1,
        sessionSummaries: 5,
        sessionBodies: 5,
        playedNotes: 3,
      })
    expect((await storeCounts(page)).settings).toBeGreaterThanOrEqual(
      Object.keys(SAVED_SETTINGS).length,
    )
    for (const key of [first, second, third]) {
      expect(await summaryOf(page, key)).toMatchObject({ playedNotesKept: true })
    }
    expect(await summaryOf(page, third)).toMatchObject({ pinned: false })

    // The second visit reads that full database: the controller reattaches, my instrument, the
    // theme and the player presets come back, and the unreadable session goes at load.
    await expectNoNetworkCall(page)
    await page.reload()
    await harnessReady(page)
    await expect.poll(() => midiState(page)).toEqual({ kind: 'connected', device: KEYS })
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
    await expect(radio(page, INSTRUMENT_GROUP, LOW_TENOR.name)).toHaveAttribute(
      'aria-checked',
      'true',
    )
    await expect.poll(() => keptKeys(page)).toEqual([first, second, third, DAMAGED_BODY_KEY].sort())
    await expectPresetShown(page, ONLY_HERE_PRESET)
    expect((await yourPresetNames(page)).sort()).toEqual([EVENING_PRESET, ONLY_HERE_PRESET].sort())

    // Your data, then the session list: the damaged body's row leaves once opened.
    await openYourData(page)
    await closeWithDone(page)
    await showListFromCueRow(page)
    await expect(rows(page)).toHaveCount(4)
    await rowOpen(page, await sessionDateOf(page, startAt(0))).click()
    await expect(rows(page)).toHaveCount(3)
    await expect.poll(() => keptKeys(page)).toEqual([first, second, third].sort())

    // The first kept session's Review, its played note shown, its favorite and comment read back;
    // every export: generated notes in each format and played notes, whole and favorites only.
    const firstDate = await sessionDateOf(page, startAt(1))
    await rowOpen(page, firstDate).click()
    await expect(reviewTitle(page)).toBeFocused()
    await expect(reviewTitle(page)).toHaveText(firstDate)
    await expect(playedNotesToggle(page)).toHaveAttribute('aria-pressed', 'true')
    await expect(reviewPanel(page).locator('.played-note')).toHaveCount(1)
    await expect(comment.locator('p')).toHaveText(COMMENT)
    await expect(formatOption(page, 'MIDI')).toHaveAttribute('aria-checked', 'true')
    await expect(backingTrackToggle(page)).toHaveAttribute('aria-pressed', 'true')
    const kept: string[] = [await exportAs()]
    await backingTrackToggle(page).click()
    kept.push(await exportAs())
    await pickFormat(page, 'MusicXML')
    kept.push(await exportAs(), await exportAs(exportPlayedButton(page)))
    await scopeOption(page, 'Favorites only').click()
    await expect(scopeOption(page, 'Favorites only')).toHaveAttribute('aria-checked', 'true')
    kept.push(await exportAs())
    await pickFormat(page, 'MIDI')
    kept.push(await exportAs(), await exportAs(exportPlayedButton(page)))
    expect(kept).toEqual([
      `${stemAt(1)}-generated.mid`,
      `${stemAt(1)}-generated.mid`,
      `${stemAt(1)}-generated.musicxml`,
      `${stemAt(1)}-played.mid`,
      `${stemAt(1)}-generated-favorites.musicxml`,
      `${stemAt(1)}-generated-favorites.mid`,
      `${stemAt(1)}-played-favorites.mid`,
    ])

    // A new session with a played note, and its exports: its save deletes the unpinned third.
    const fourth = await sessionWithPlayedNoteAt(page, 4)
    expect([await exportAs(), await exportAs(exportPlayedButton(page))]).toEqual([
      `${stemAt(4)}-generated.mid`,
      `${stemAt(4)}-played.mid`,
    ])
    await expect.poll(() => keptKeys(page)).toEqual([first, second, fourth].sort())

    // Nothing was sent, from before the first load on: only the app's own static files were
    // fetched, no WebSocket was opened, and the page called no network API.
    await expectNoNetworkCall(page)
    const origin = new URL(page.url()).origin
    expect(network.requests.length).toBeGreaterThan(0)
    expect(offendingRequests(network.requests, origin)).toEqual([])
    expect(network.webSockets).toEqual([])
    expect(downloads.all).toHaveLength(9)
  })
})
