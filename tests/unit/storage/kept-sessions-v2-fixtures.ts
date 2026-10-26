/**
 * Builders for the specs of the kept sessions kept at data version 2 (v3.1) and the upgrade step
 * to data version 4: a session's records as the current encoder writes them, turned into the
 * shapes v3.1 wrote (the body at data version 2, which never held a doodle; the session-wide
 * record at data version 2, which never held the Jam mark; the played notes as encoded); a stored
 * request given a v3.2 group no v3.1 request
 * held; and a database at data version 3, as a v3.1 tab opens it, seeded through its port.
 */

import { PRODUCTION_MIGRATIONS } from '@/storage/database'
import type { KeptSessionRecords, StoredKeptSession } from '@/storage/records/kept-session-record'
import { openStoragePort, type StorageChange, type StoragePort } from '@/storage/storage-port'
import { SAMPLE_RHYTHM_LOCK, SAMPLE_STEERING } from '../domain/generation/request-inputs-fixture'
import { edited, storedRecords } from './kept-session-fixtures'

/** The app version of the v3.1 tab that kept the sessions. */
export const V31_APP_VERSION = '3.1.0'

/** The production migration steps of v3.1: a database at data version 3. */
const V3_1_MIGRATIONS = PRODUCTION_MIGRATIONS.slice(0, 3)

/**
 * Intent: a stored body as v3.1 wrote it: the same keys in the same order, at data version 2.
 * Throws for a body holding a doodle, which no v3.1 body held.
 */
export function v2Body(body: unknown): unknown {
  const copy = structuredClone(body) as Record<string, unknown>
  if (Object.hasOwn(copy, 'doodle')) throw new Error('Fixture setup: a v3.1 body holds no doodle.')
  return Object.fromEntries(
    Object.entries(copy).map(([key, value]) => [key, key === 'dataVersion' ? 2 : value]),
  )
}

/**
 * Intent: a stored session-wide record as v3.1 wrote it: the same keys in the same order, at data
 * version 2, without the Jam mark. Throws for a Jam's record, which no v3.1 record was.
 */
export function v2Summary(summary: unknown): unknown {
  const copy = structuredClone(summary) as Record<string, unknown>
  if (copy.isJam !== false) throw new Error('Fixture setup: a v3.1 session is no Jam.')
  return Object.fromEntries(
    Object.entries(copy)
      .filter(([key]) => key !== 'isJam')
      .map(([key, value]) => [key, key === 'dataVersion' ? 2 : value]),
  )
}

/**
 * Intent: the stored values a session's records had when v3.1 kept them: its body and its
 * session-wide record at data version 2, its played notes as encoded, their shape unchanged since
 * v3.1.
 */
export function v2Session(records: KeptSessionRecords): StoredKeptSession {
  const stored = storedRecords(records)
  return { ...stored, summary: v2Summary(stored.summary), body: v2Body(stored.body) }
}

/** The v3.2 groups a stored request may be given, each as built by its own constructor. */
export const REQUEST_GROUPS = {
  rhythmLock: SAMPLE_RHYTHM_LOCK,
  steering: SAMPLE_STEERING,
} as const

/** Intent: a stored body whose phrase at `index` has its request given the v3.2 group named. */
export function withRequestGroup(
  body: unknown,
  index: number,
  group: keyof typeof REQUEST_GROUPS,
): unknown {
  return edited(body, ['phrases', index, 'request', group], structuredClone(REQUEST_GROUPS[group]))
}

/** Intent: a port over the factory's database at data version 3, as a v3.1 tab opens it. */
export function openV31Port(factory: IDBFactory): Promise<StoragePort> {
  return openStoragePort({ factory, appVersion: V31_APP_VERSION, migrations: V3_1_MIGRATIONS })
}

/**
 * Intent: create the database at data version 3 through a v3.1 tab's port and apply `changes` in
 * one batch; the port is returned still open, as a v3.1 tab left open.
 */
export async function seedVersion3(
  factory: IDBFactory,
  changes: readonly StorageChange[],
): Promise<StoragePort> {
  const port = await openV31Port(factory)
  if (port.status() !== 'ready')
    throw new Error(`Expected a ready v3.1 port, got ${port.status()}.`)
  await port.apply(changes)
  return port
}
