/**
 * The workspace harness's seeds of an earlier version's data: kept sessions and settings records
 * written as v3.0 kept them (data version 1), kept sessions as v3.1 kept them (data version 3), or
 * v3.2's settings, player presets and kept sessions (data version 4), each through a port opened
 * as that version's tab opens the database, before the held load runs, so the load's open
 * upgrades them (`storage-seams.ts` publishes them on `window.__workspaceHarnessHeldLoad`): from
 * data version 1, steps 2 to 5; from data version 3, steps 4 and 5; from data version 4, step 5
 * only. v3.0's and v3.1's values are written as given, never through the save policy or a codec;
 * v3.2's settings and player presets are encoded as v3.2 wrote them (no Seventh chords level, the
 * player preset record at data version 3), and its kept sessions are written as given once checked
 * to be data version 4's bytes, holding no seventh chord and no level. The earlier tab's port,
 * opened on the first seed and shared by the seeds of its version, stays open, as an earlier tab
 * left open, until the upgrade's version change closes it; a seed of another earlier version then
 * throws, since one database holds one version's data.
 */
import { OFF_CHORD_FAMILIES } from '../../../src/domain/chords/chord-families'
import { makePreset, type Preset } from '../../../src/domain/presets/preset-selection'
import { PRODUCTION_MIGRATIONS, type MigrationStep } from '../../../src/storage/database'
import type { RecordVersions } from '../../../src/storage/record-envelope'
import { encodePresetRecord } from '../../../src/storage/records/preset-record'
import {
  encodeSettingRecord,
  JAM_SETTING_KEYS,
  SETTING_KEYS,
  type SettingKey,
  type SettingValue,
} from '../../../src/storage/records/settings-record'
import {
  browserStorage,
  openStoragePort,
  type StorageChange,
  type StoragePort,
} from '../../../src/storage/storage-port'

/** An earlier version's tab: its name in messages, its app version and its migrations. */
interface EarlierTab {
  readonly name: 'v3.0' | 'v3.1' | 'v3.2'
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

/** v3.2's tab: the database at data version 4. */
const V32_TAB: EarlierTab = {
  name: 'v3.2',
  appVersion: '3.2.0',
  migrations: PRODUCTION_MIGRATIONS.slice(0, 4),
}

/** The data version v3.2 wrote its kept session-wide records and bodies at. */
const V32_KEPT_DATA_VERSION = 4

/** The data version v3.2 wrote its player preset records at. */
const V32_PRESET_DATA_VERSION = 3

/** The settings key prefix of the Seventh chords level, which v3.2 never stored. */
const LEVEL_KEY_PREFIX = 'chordFamilies.'

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
  /** Write `count` copies of the kept session `template`, as v3.2 kept it. */
  readonly seedVersionFourSessions: (
    template: WorkspaceHarnessEarlierSession,
    count: number,
  ) => Promise<void>
  /** Write each setting's record as v3.2 wrote it, in one batch. */
  readonly seedVersionFourSettings: (values: Readonly<Record<string, unknown>>) => Promise<void>
  /** Write each player preset's record as v3.2 wrote it, in one batch. */
  readonly seedVersionFourPresets: (
    presets: readonly WorkspaceHarnessPresetInput[],
  ) => Promise<void>
}

/** Intent: every object key anywhere in a value, nested objects and arrays included. */
function allKeys(value: unknown, into: Set<string> = new Set()): Set<string> {
  if (Array.isArray(value)) {
    for (const item of value) allKeys(item, into)
  } else if (typeof value === 'object' && value !== null) {
    for (const [key, field] of Object.entries(value)) {
      into.add(key)
      allKeys(field, into)
    }
  }
  return into
}

/**
 * Intent: refuse a kept session template that is not data version 4's bytes, as v3.2 wrote them:
 * its session-wide record and body at data version 4, its body holding no seventh chord and no
 * Seventh chords level, which no v3.2 body held.
 */
function checkVersionFourSession(template: WorkspaceHarnessEarlierSession): void {
  /** Intent: the data version a seeded record holds, whatever it is. */
  const versionOf = (record: unknown): unknown => (record as { dataVersion?: unknown }).dataVersion
  if (
    versionOf(template.summary) !== V32_KEPT_DATA_VERSION ||
    versionOf(template.body) !== V32_KEPT_DATA_VERSION
  ) {
    throw new Error('Workspace harness: a v3.2 kept session is at data version 4')
  }
  const keys = allKeys(template.body)
  if (keys.has('seventh') || keys.has('chordFamilies')) {
    throw new Error('Workspace harness: v3.2 never kept a seventh chord or a Seventh chords level')
  }
}

/**
 * Intent: a settings record as v3.2 wrote it: encoded by the settings codec at v3.2's app version,
 * whose shapes v3.2 shared; a key naming no setting v3.2 had, the Seventh chords level's
 * included, throws.
 */
function versionFourSetting(key: string, value: unknown): StorageChange {
  const known = [...SETTING_KEYS, ...JAM_SETTING_KEYS].includes(key as SettingKey)
  if (!known || key.startsWith(LEVEL_KEY_PREFIX)) {
    throw new Error(`Workspace harness: "${key}" names no setting v3.2 stored`)
  }
  // A seeded value is not checked, as storage.seedSettings's is not.
  const record = encodeSettingRecord(
    key as SettingKey,
    value as SettingValue<SettingKey>,
    V32_TAB.appVersion,
  )
  return { kind: 'write', store: 'settings', key, record }
}

/**
 * Intent: a player preset's record as v3.2 wrote it: built by the preset model (which refuses an
 * invalid one), encoded by the preset codec at v3.2's app version, then the same fields in the
 * same order without the Seventh chords level, at data version 3. A preset given a level throws:
 * v3.2 stored none.
 */
function versionFourPreset(input: WorkspaceHarnessPresetInput): StorageChange {
  if (input.chordFamilies !== undefined) {
    throw new Error('Workspace harness: a v3.2 player preset holds no Seventh chords level')
  }
  const preset = makePreset({ ...(input as unknown as Preset), chordFamilies: OFF_CHORD_FAMILIES })
  const encoded = encodePresetRecord(preset, V32_TAB.appVersion)
  const record = Object.fromEntries(
    Object.entries(encoded)
      .filter(([field]) => field !== 'chordFamilies')
      .map(([field, value]) => [field, field === 'dataVersion' ? V32_PRESET_DATA_VERSION : value]),
  ) as unknown as RecordVersions
  return { kind: 'write', store: 'presets', key: preset.id, record }
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
 * that port open: `count` copies of a kept session, in batches, or settings records or v3.2's
 * player presets, each under its own key, in one batch. Each throws when `allowed()` is false (the
 * load released, or the app's port opened), for an invalid count, a record with no string key or
 * a value v3.2 never stored, when the earlier port does not open `ready`, and when another earlier
 * version's port was opened first.
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

  /** Intent: write `changes` in one batch through v3.2's port. */
  async function seedVersionFour(seed: string, changes: readonly StorageChange[]): Promise<void> {
    const port = await openedEarlierPort(V32_TAB, seed)
    await port.apply(changes)
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
    seedVersionFourSessions: (template, count) => {
      checkVersionFourSession(template)
      return seedSessions(V32_TAB, 'seedVersionFourSessions', template, count)
    },
    seedVersionFourSettings: (values) =>
      seedVersionFour(
        'seedVersionFourSettings',
        Object.entries(values).map(([key, value]) => versionFourSetting(key, value)),
      ),
    seedVersionFourPresets: (presets) =>
      seedVersionFour('seedVersionFourPresets', presets.map(versionFourPreset)),
  }
}
