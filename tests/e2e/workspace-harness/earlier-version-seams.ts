/**
 * The workspace harness's seeds of an earlier version's data: kept sessions and settings records
 * written as v3.0 kept them (data version 1), or kept sessions as v3.1 kept them (data version 3),
 * each through a port opened as that version's tab opens the database, before the held load runs,
 * so the load's open upgrades them (`storage-seams.ts` publishes them on
 * `window.__workspaceHarnessHeldLoad`): from data version 1, steps 2 to 4; from data version 3,
 * step 4 only. The values are written as given, never through the save policy or a codec. The
 * earlier tab's port, opened on the first seed and shared by the seeds of its version, stays open,
 * as an earlier tab left open, until the upgrade's version change closes it; a seed of the other
 * earlier version then throws, since one database holds one version's data.
 */
import { PRODUCTION_MIGRATIONS, type MigrationStep } from '../../../src/storage/database'
import type { RecordVersions } from '../../../src/storage/record-envelope'
import {
  browserStorage,
  openStoragePort,
  type StorageChange,
  type StoragePort,
} from '../../../src/storage/storage-port'

/** An earlier version's tab: its name in messages, its app version and its migrations. */
interface EarlierTab {
  readonly name: 'v3.0' | 'v3.1'
  readonly appVersion: string
  readonly migrations: readonly MigrationStep[]
}

/** v3.0's tab: the database at data version 1. */
const V30_TAB: EarlierTab = {
  name: 'v3.0',
  appVersion: '3.0.0',
  migrations: PRODUCTION_MIGRATIONS.slice(0, 1),
}

/** v3.1's tab: the database at data version 3. */
const V31_TAB: EarlierTab = {
  name: 'v3.1',
  appVersion: '3.1.0',
  migrations: PRODUCTION_MIGRATIONS.slice(0, 3),
}

/** How many kept sessions one seeding batch writes. */
const SEED_BATCH = 50

/** The earlier versions' seeds, while seeding is allowed. */
export interface EarlierVersionSeeds {
  /** Write `count` copies of the kept session `template`, as v3.0 kept it. */
  readonly seedVersionOneSessions: (
    template: WorkspaceHarnessEarlierSession,
    count: number,
  ) => Promise<void>
  /** Write each settings record under its own `key`, as v3.0 stored it. */
  readonly seedVersionOneSettings: (
    records: readonly WorkspaceHarnessVersionOneSetting[],
  ) => Promise<void>
  /** Write `count` copies of the kept session `template`, as v3.1 kept it. */
  readonly seedVersionThreeSessions: (
    template: WorkspaceHarnessEarlierSession,
    count: number,
  ) => Promise<void>
}

/** Intent: a raw seeded value as a stored record; throws when it is not an object. */
function seededRecord(value: unknown, what: string): RecordVersions {
  if (typeof value !== 'object' || value === null) {
    throw new Error(`Workspace harness: the seeded ${what} is not a record`)
  }
  // Seeded raw on purpose: the earlier port checks only the envelope, the upgrade the rest.
  return value as RecordVersions
}

/**
 * Intent: the writes of copy `index` of an earlier version's kept session: its session-wide record
 * started `index` minutes after the template's, its session seed `index`, under
 * `session-{startedAt}-{sessionSeed}`; its body, and its played notes when given, as they are.
 */
function earlierCopy(template: WorkspaceHarnessEarlierSession, index: number): StorageChange[] {
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
 * Intent: the earlier versions' seeds: each writes through a port opened as that version's tab
 * opens the database (once, on the first seed, and shared by the seeds of that version), keeping
 * that port open: `count` copies of a kept session, in batches, or settings records, each under
 * its own key, in one batch. Each throws when `allowed()` is false (the load released, or the
 * app's port opened), for an invalid count or a record with no string key, when the earlier port
 * does not open `ready`, and when the other earlier version's port was opened first.
 */
export function createEarlierVersionSeeds(allowed: () => boolean): EarlierVersionSeeds {
  // The earlier tab's port, kept open; the upgrade closes it.
  let earlier: { readonly tab: EarlierTab; readonly port: StoragePort } | null = null

  /** Intent: `tab`'s port, opened on its first seed; throws once seeding is over. */
  async function openedEarlierPort(tab: EarlierTab, seed: string): Promise<StoragePort> {
    if (!allowed()) {
      throw new Error(`Workspace harness: ${seed} runs only while the load is held`)
    }
    if (earlier !== null && earlier.tab !== tab) {
      throw new Error(`Workspace harness: ${seed} after ${earlier.tab.name}'s seeds`)
    }
    earlier ??= {
      tab,
      port: await openStoragePort({
        ...browserStorage(),
        appVersion: tab.appVersion,
        migrations: tab.migrations,
      }),
    }
    if (earlier.port.status() !== 'ready') {
      throw new Error(`Workspace harness: the ${tab.name} port opened ${earlier.port.status()}`)
    }
    return earlier.port
  }

  /** Intent: write `count` copies of `template` through `tab`'s port, in batches. */
  async function seedSessions(
    tab: EarlierTab,
    seed: string,
    template: WorkspaceHarnessEarlierSession,
    count: number,
  ): Promise<void> {
    if (!Number.isInteger(count) || count < 0) {
      throw new Error(`Workspace harness: ${seed}(${count}) is invalid`)
    }
    const port = await openedEarlierPort(tab, seed)
    for (let first = 0; first < count; first += SEED_BATCH) {
      const last = Math.min(count, first + SEED_BATCH)
      const changes: StorageChange[] = []
      for (let index = first; index < last; index++) {
        changes.push(...earlierCopy(template, index))
      }
      await port.apply(changes)
    }
  }

  return {
    seedVersionOneSessions: (template, count) =>
      seedSessions(V30_TAB, 'seedVersionOneSessions', template, count),
    seedVersionOneSettings: async (records) => {
      const changes = records.map((record): StorageChange => {
        const { key } = record as { readonly key?: unknown }
        if (typeof key !== 'string') {
          throw new Error('Workspace harness: a seeded v3.0 settings record has no string key')
        }
        return { kind: 'write', store: 'settings', key, record: seededRecord(record, key) }
      })
      const port = await openedEarlierPort(V30_TAB, 'seedVersionOneSettings')
      await port.apply(changes)
    },
    seedVersionThreeSessions: (template, count) =>
      seedSessions(V31_TAB, 'seedVersionThreeSessions', template, count),
  }
}
