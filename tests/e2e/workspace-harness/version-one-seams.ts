/**
 * The workspace harness's data version 1 seed: kept sessions written as v3.0 kept them, through a
 * port opened as a v3.0 tab opens the database (at data version 1), before the held load runs, so
 * the load's open upgrades them to data version 2 (`storage-seams.ts` publishes it on
 * `window.__workspaceHarnessHeldLoad`). The values are written as given, never through the save
 * policy or a codec; the v3.0 port stays open, as a v3.0 tab left open, until the upgrade's
 * version change closes it.
 */
import { PRODUCTION_MIGRATIONS } from '../../../src/storage/database'
import type { RecordVersions } from '../../../src/storage/record-envelope'
import {
  browserStorage,
  openStoragePort,
  type StorageChange,
  type StoragePort,
} from '../../../src/storage/storage-port'

/** The data version 1 migrations: the database a v3.0 tab opens. */
const VERSION_ONE_MIGRATIONS = PRODUCTION_MIGRATIONS.slice(0, 1)

/** The app version of the v3.0 tab that seeds the data version 1 kept sessions. */
const VERSION_ONE_APP_VERSION = '3.0.0'

/** How many kept sessions one seeding batch writes. */
const SEED_BATCH = 50

/** The data version 1 seed: `count` copies of `template`, while seeding is allowed. */
export type VersionOneSeed = (
  template: WorkspaceHarnessVersionOneSession,
  count: number,
) => Promise<void>

/** Intent: a raw seeded value as a stored record; throws when it is not an object. */
function seededRecord(value: unknown, what: string): RecordVersions {
  if (typeof value !== 'object' || value === null) {
    throw new Error(`Workspace harness: the seeded ${what} is not a record`)
  }
  // Seeded raw on purpose: the v3.0 port checks only the envelope, the upgrade the rest.
  return value as RecordVersions
}

/**
 * Intent: the writes of copy `index` of a data version 1 kept session: its session-wide record
 * started `index` minutes after the template's, its session seed `index`, under
 * `session-{startedAt}-{sessionSeed}`; its body, and its played notes when given, as they are.
 */
function versionOneCopy(
  template: WorkspaceHarnessVersionOneSession,
  index: number,
): StorageChange[] {
  const summary = seededRecord(template.summary, 'session-wide record')
  const { startedAt } = summary as { readonly startedAt?: unknown }
  if (typeof startedAt !== 'number') {
    throw new Error('Workspace harness: the seeded session-wide record has no numeric start')
  }
  const copyStartedAt = startedAt + index * 60_000
  const key = `session-${copyStartedAt}-${index}`
  const copied: RecordVersions & { readonly startedAt: number; readonly sessionSeed: number } = {
    ...summary,
    startedAt: copyStartedAt,
    sessionSeed: index,
  }
  const changes: StorageChange[] = [
    { kind: 'write', store: 'sessionSummaries', key, record: copied },
    {
      kind: 'write',
      store: 'sessionBodies',
      key,
      record: seededRecord(template.body, 'body'),
    },
  ]
  if (template.playedNotes !== undefined) {
    changes.push({
      kind: 'write',
      store: 'playedNotes',
      key,
      record: seededRecord(template.playedNotes, 'played notes'),
    })
  }
  return changes
}

/**
 * Intent: the data version 1 seed: it writes `count` copies of a data version 1 kept session
 * through a port opened as a v3.0 tab opens it (once, on the first seed), in batches, keeping that
 * port open; it throws when `allowed()` is false (the load released, or the app's port opened), for
 * an invalid count, and when the v3.0 port does not open `ready`.
 */
export function createVersionOneSeed(allowed: () => boolean): VersionOneSeed {
  // The v3.0 tab's port, kept open; the upgrade closes it.
  let versionOnePort: StoragePort | null = null
  return async (template, count) => {
    if (!allowed()) {
      throw new Error('Workspace harness: seedVersionOneSessions runs only while the load is held')
    }
    if (!Number.isInteger(count) || count < 0) {
      throw new Error(`Workspace harness: seedVersionOneSessions(${count}) is invalid`)
    }
    versionOnePort ??= await openStoragePort({
      ...browserStorage(),
      appVersion: VERSION_ONE_APP_VERSION,
      migrations: VERSION_ONE_MIGRATIONS,
    })
    if (versionOnePort.status() !== 'ready') {
      throw new Error(`Workspace harness: the v3.0 port opened ${versionOnePort.status()}`)
    }
    for (let first = 0; first < count; first += SEED_BATCH) {
      const last = Math.min(count, first + SEED_BATCH)
      const changes: StorageChange[] = []
      for (let index = first; index < last; index++) {
        changes.push(...versionOneCopy(template, index))
      }
      await versionOnePort.apply(changes)
    }
  }
}
