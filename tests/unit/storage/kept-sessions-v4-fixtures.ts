/**
 * Builders for the specs of the records v3.2 kept (the kept bodies at data version 4, the player
 * preset records at data version 3) and the upgrade step to data version 5: a session's records
 * as the current encoder writes them, turned into the bytes v3.2 wrote (the body at data version
 * 4, its intents without the Seventh chords level; the session-wide record and the played notes as
 * encoded, their shapes unchanged since v3.2); a player preset turned into v3.2's record (data
 * version 3, no level); and a database at data version 4, as a v3.2 tab opens it, seeded through
 * its port. v3.2 never stored a seventh chord or a level above Off, so building v3.2's bytes from
 * anything holding one is refused, never quietly dropped.
 */

import { isOffChordFamilies, type ChordFamilies } from '@/domain/chords/chord-families'
import type { Preset } from '@/domain/presets/preset-selection'
import { PRODUCTION_MIGRATIONS } from '@/storage/database'
import type { RecordVersions } from '@/storage/record-envelope'
import type { KeptSessionRecords, StoredKeptSession } from '@/storage/records/kept-session-record'
import { encodePresetRecord } from '@/storage/records/preset-record'
import { openStoragePort, type StorageChange, type StoragePort } from '@/storage/storage-port'
import { allKeys, storedRecords } from './kept-session-fixtures'

/** The app version of the v3.2 tab that kept the records. */
export const V32_APP_VERSION = '3.2.0-test'

/** The production migration steps of v3.2: a database at data version 4. */
const V3_2_MIGRATIONS = PRODUCTION_MIGRATIONS.slice(0, 4)

/** Intent: refuse, as a fixture defect, a value holding a seventh chord anywhere. */
function assertNoSeventh(value: unknown, what: string): void {
  if (allKeys(value).has('seventh'))
    throw new Error(`Fixture setup: v3.2 never stored a seventh chord, but ${what} holds one.`)
}

/**
 * Intent: a stored intent as v3.2 wrote it: the same keys in the same order without the Seventh
 * chords level. Throws for a level above Off, which v3.2 never stored.
 */
function v4Intent(intent: Record<string, unknown>): Record<string, unknown> {
  const { chordFamilies, ...earlier } = intent
  if (chordFamilies !== undefined && !isOffChordFamilies(chordFamilies as ChordFamilies))
    throw new Error('Fixture setup: v3.2 never stored a Seventh chords level above Off.')
  return earlier
}

/**
 * Intent: a stored body as v3.2 wrote it: the same keys in the same order at data version 4, each
 * phrase's intent without the Seventh chords level. Throws for a body holding a seventh chord or
 * a level above Off, which no v3.2 body held.
 */
export function v4Body(body: unknown): unknown {
  assertNoSeventh(body, 'the body')
  const copy = structuredClone(body) as { phrases: { intent: Record<string, unknown> }[] }
  copy.phrases.forEach((phrase) => {
    phrase.intent = v4Intent(phrase.intent)
  })
  return Object.fromEntries(
    Object.entries(copy).map(([key, value]) => [key, key === 'dataVersion' ? 4 : value]),
  )
}

/**
 * Intent: the stored values a session's records had when v3.2 kept them: its body at data version
 * 4, its session-wide record and played notes as encoded.
 */
export function v4Session(records: KeptSessionRecords): StoredKeptSession {
  const stored = storedRecords(records)
  return { ...stored, body: v4Body(stored.body) }
}

/**
 * Intent: a player preset's record as v3.2 wrote it: the same keys in the same order at data
 * version 3, without the Seventh chords level. Throws for a preset above Off.
 */
export function v3PresetRecord(
  preset: Preset,
  appVersion: string,
): RecordVersions & Readonly<Record<string, unknown>> {
  if (!isOffChordFamilies(preset.chordFamilies))
    throw new Error('Fixture setup: v3.2 never stored a preset above Off.')
  const record = structuredClone(encodePresetRecord(preset, appVersion))
  return Object.fromEntries(
    Object.entries(record)
      .filter(([key]) => key !== 'chordFamilies')
      .map(([key, value]) => [key, key === 'dataVersion' ? 3 : value]),
  ) as RecordVersions & Readonly<Record<string, unknown>>
}

/** Intent: a port over the factory's database at data version 4, as a v3.2 tab opens it. */
export function openV32Port(factory: IDBFactory): Promise<StoragePort> {
  return openStoragePort({ factory, appVersion: V32_APP_VERSION, migrations: V3_2_MIGRATIONS })
}

/**
 * Intent: create the database at data version 4 through a v3.2 tab's port and apply `changes` in
 * one batch; the port is returned still open, as a v3.2 tab left open.
 */
export async function seedVersion4(
  factory: IDBFactory,
  changes: readonly StorageChange[],
): Promise<StoragePort> {
  const port = await openV32Port(factory)
  if (port.status() !== 'ready')
    throw new Error(`Expected a ready v3.2 port, got ${port.status()}.`)
  await port.apply(changes)
  return port
}
