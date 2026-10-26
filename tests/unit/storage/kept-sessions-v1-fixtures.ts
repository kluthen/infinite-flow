/**
 * Builders for the specs of the kept sessions kept at data version 1 and the upgrade step to data
 * version 2: a session's records as the current encoder writes them, turned into the shapes data
 * version 1 held (v3.0's, chunk 4's and chunk 8's); a database created at data version 1, as a
 * v3.0 tab opens it, seeded with them through the port or raw; and the upgrading app's open (every
 * production step, or only up to step 2) and raw reads of what it then holds.
 */

import type { ProfileSelection } from '@/domain/controls/profile-selection'
import { PRODUCTION_MIGRATIONS, type StoreName } from '@/storage/database'
import type { RecordVersions } from '@/storage/record-envelope'
import type { KeptSessionRecords, StoredKeptSession } from '@/storage/records/kept-session-record'
import { openStoragePort, type StorageChange, type StoragePort } from '@/storage/storage-port'
import { storedRecords } from './kept-session-fixtures'
import { rawGet, rawPut, withRawDatabase } from './storage-test-doubles'

/** The app version of the v3.0 tab that created the database and kept the sessions. */
export const V30_APP_VERSION = '3.0.0'

/** The app version of the tab that upgrades the database. */
export const UPGRADING_APP_VERSION = '3.1.0-test'

/**
 * The three phrase shapes data version 1 held: v3.0's (a musical profile only), chunk 4's (its
 * levels and a profile) and chunk 8's (its levels only); the session-wide record holds the
 * musical profile selection in all three.
 */
export type V1Shape = 'v3.0' | 'chunk 4' | 'chunk 8'

/** A stored intent, as a plain record. */
type StoredIntent = Record<string, unknown>

/** Intent: a stored intent as v3.0 kept it: a profile selection in place of its levels. */
export function v30Intent(intent: StoredIntent, selection: ProfileSelection): StoredIntent {
  const { figureLevels, ...rest } = intent
  void figureLevels
  return { ...rest, musicalProfile: { ...selection } }
}

/** Intent: a stored intent as chunk 4's code kept it: its levels and a profile selection. */
export function chunk4Intent(intent: StoredIntent, selection: ProfileSelection): StoredIntent {
  return { ...intent, musicalProfile: { ...selection } }
}

/** Intent: the stored intent of every phrase of a stored body. */
export function storedIntents(body: unknown): readonly StoredIntent[] {
  return (body as { phrases: readonly { intent: StoredIntent }[] }).phrases.map(
    (phrase) => phrase.intent,
  )
}

/** Intent: a stored copy of a body with every phrase's intent edited by `reshape`. */
export function reshapedBody(
  body: unknown,
  reshape: (intent: StoredIntent, index: number) => StoredIntent,
): unknown {
  const copy = structuredClone(body) as { phrases: { intent: StoredIntent }[] }
  copy.phrases.forEach((phrase, index) => {
    phrase.intent = reshape(phrase.intent, index)
  })
  return copy
}

/**
 * Intent: a stored data version 2 session-wide record as data version 1 held it: its musical
 * profile selection in place of its preset label, at the same key position, at data version 1.
 */
export function v1Summary(summary: unknown, selection: ProfileSelection): unknown {
  const entries = Object.entries(structuredClone(summary) as Record<string, unknown>).map(
    ([key, value]): [string, unknown] => {
      if (key === 'presetLabel') return ['musicalProfile', { ...selection }]
      return key === 'dataVersion' ? [key, 1] : [key, value]
    },
  )
  return Object.fromEntries(entries)
}

/** Intent: a stored body at data version 1, every phrase's intent edited by `reshape`. */
export function v1Body(
  body: unknown,
  reshape: (intent: StoredIntent, index: number) => StoredIntent,
): unknown {
  return { ...(reshapedBody(body, reshape) as RecordVersions), dataVersion: 1 }
}

/** How each data version 1 phrase shape holds a phrase's intent. */
const V1_INTENTS: Readonly<
  Record<V1Shape, (intent: StoredIntent, selection: ProfileSelection) => StoredIntent>
> = {
  'v3.0': v30Intent,
  'chunk 4': chunk4Intent,
  'chunk 8': (intent) => ({ ...intent }),
}

/**
 * Intent: the stored values a session's records had when data version 1 kept them in `shape`, the
 * session's musical profile `selection` in its session-wide record (and in its phrases' intents
 * for the v3.0 and chunk 4 shapes); the played notes, whose shape never changed, as encoded.
 */
export function v1Session(
  records: KeptSessionRecords,
  selection: ProfileSelection,
  shape: V1Shape,
): StoredKeptSession {
  const stored = storedRecords(records)
  return {
    summary: v1Summary(stored.summary, selection),
    body: v1Body(stored.body, (intent) => V1_INTENTS[shape](intent, selection)),
    playedNotes: stored.playedNotes,
  }
}

/** A kept session's stored values and the key its records are stored under. */
export interface KeyedSession {
  readonly key: string
  readonly stored: StoredKeptSession
}

/** Intent: the writes storing a session's values under its key, its played notes when present. */
export function sessionWrites({ key, stored }: KeyedSession): StorageChange[] {
  /** Intent: the write of one of the session's values to its store, under the session's key. */
  const write = (store: StoreName, value: unknown): StorageChange => ({
    kind: 'write',
    store,
    key,
    record: value as RecordVersions,
  })
  const writes = [write('sessionSummaries', stored.summary), write('sessionBodies', stored.body)]
  if (stored.playedNotes !== undefined) writes.push(write('playedNotes', stored.playedNotes))
  return writes
}

/** Intent: a port over the factory's database at data version 1, as a v3.0 tab opens it. */
export function openV30Port(factory: IDBFactory): Promise<StoragePort> {
  return openStoragePort({
    factory,
    appVersion: V30_APP_VERSION,
    migrations: PRODUCTION_MIGRATIONS.slice(0, 1),
  })
}

/**
 * Intent: create the database at data version 1 through a v3.0 tab's port and apply `changes` in
 * one batch; the port is returned still open, as a v3.0 tab left open.
 */
export async function seedVersion1(
  factory: IDBFactory,
  changes: readonly StorageChange[],
): Promise<StoragePort> {
  const port = await openV30Port(factory)
  if (port.status() !== 'ready')
    throw new Error(`Expected a ready v3.0 port, got ${port.status()}.`)
  await port.apply(changes)
  return port
}

/**
 * Intent: store values straight into a store of the existing database, bypassing the port, so
 * values no port would write (no envelope, no object at all) can be stored.
 */
export async function seedRaw(
  factory: IDBFactory,
  store: StoreName,
  entries: readonly (readonly [string, unknown])[],
): Promise<void> {
  await withRawDatabase(factory, async (database) => {
    for (const [key, value] of entries) await rawPut(database, store, key, value)
  })
}

/**
 * Intent: the database opened with every production migration, at the code's data version, as the
 * upgrading tab runs them: a session kept at data version 1 reaches the current shapes through
 * step 2, then step 4.
 */
export function openUpgraded(factory: IDBFactory): Promise<StoragePort> {
  return openStoragePort({ factory, appVersion: UPGRADING_APP_VERSION })
}

/**
 * Intent: the database opened with the production migrations up to the step to data version 2
 * only, as the v3.1 tab of that step ran them, so what step 2 alone writes can be read.
 */
export function openAtVersion2(factory: IDBFactory): Promise<StoragePort> {
  return openStoragePort({
    factory,
    appVersion: UPGRADING_APP_VERSION,
    migrations: PRODUCTION_MIGRATIONS.slice(0, 2),
  })
}

/** Intent: a session's stored values, read raw; `playedNotes` undefined when none is stored. */
export function rawSession(factory: IDBFactory, key: string): Promise<StoredKeptSession> {
  return withRawDatabase(factory, async (database) => ({
    summary: await rawGet(database, 'sessionSummaries', key),
    body: await rawGet(database, 'sessionBodies', key),
    playedNotes: await rawGet(database, 'playedNotes', key),
  }))
}

/** Intent: the stored database's version and its `meta` record, read raw. */
export function databaseState(
  factory: IDBFactory,
): Promise<{ readonly version: number; readonly meta: unknown }> {
  return withRawDatabase(factory, async (database) => ({
    version: database.version,
    meta: await rawGet(database, 'meta', 'database'),
  }))
}
