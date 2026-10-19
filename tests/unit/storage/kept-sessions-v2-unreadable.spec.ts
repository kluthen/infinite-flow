// @vitest-environment node
/**
 * The upgrade step to data version 2 over records it cannot or need not rewrite: a database
 * holding a session in each of data version 1's three shapes and one damaged record opens at data
 * version 2, the three carried over and the damaged one left as stored; a database seeded with
 * malformed session-wide records and bodies of every kind still opens, each left as stored, and
 * the step's readers give nothing for them without ever throwing; a v3.0 tab open meanwhile
 * becomes outdated rather than block the upgrade.
 */

import { beforeAll, describe, expect, it } from 'vitest'

import type { ProfileSelection } from '@/domain/controls/profile-selection'
import { NEUTRAL_FIGURE_LEVELS } from '@/domain/figures/figure-levels'
import { upgradedKeptBody, upgradedKeptSummary } from '@/storage/migrations/kept-sessions-v2'
import { isKeptPhraseRefusal } from '@/storage/records/kept-phrase-parsers'
import {
  parseKeptSessionBodyV1,
  rewrittenKeptBodyRecord,
} from '@/storage/records/kept-session-body'
import {
  decodeKeptSession,
  encodeKeptSession,
  type KeptSessionFacts,
  type StoredKeptSession,
} from '@/storage/records/kept-session-record'
import {
  parseKeptSessionSummaryV1,
  rewrittenKeptSummaryRecord,
} from '@/storage/records/kept-session-summary'
import { edited, historyOf, recordedKeptSession, REMOVE } from './kept-session-fixtures'
import {
  databaseState,
  openUpgraded,
  openV30Port,
  rawSession,
  seedRaw,
  seedVersion1,
  sessionWrites,
  storedIntents,
  UPGRADING_APP_VERSION,
  V30_APP_VERSION,
  v1Session,
  type V1Shape,
} from './kept-sessions-v1-fixtures'
import { freshFactory, rawGet, withRawDatabase } from './storage-test-doubles'

/** The selections the sessions were kept with. */
const NEUTRAL: ProfileSelection = { musicalProfile: 'Neutral', isCustom: false }
const JAZZ: ProfileSelection = { musicalProfile: 'Jazz', isCustom: false }

/** The facts of a kept session with one favorite and its played notes kept. */
const FACTS: KeptSessionFacts = {
  pinned: false,
  favorites: [2],
  comment: 'A take.',
  playedNotesKept: true,
}

/** Intent: a three-phrase Neutral tenor session's values as data version 1 kept them in `shape`. */
function neutralSession(shape: V1Shape): StoredKeptSession {
  const phrases = recordedKeptSession('bb-tenor', 3).phrases()
  const records = encodeKeptSession(historyOf(phrases, 'bb-tenor', NEUTRAL), FACTS, V30_APP_VERSION)
  return v1Session(records, NEUTRAL, shape)
}

// @test-link [[module_kept_session_upgrade_step]]
// @test-link [[rule_earlier_kept_sessions_carried_over]]
describe('a data version 1 database holding all three phrase shapes and a damaged record', () => {
  const SHAPES: readonly V1Shape[] = ['v3.0', 'chunk 4', 'chunk 8']
  let factory: IDBFactory
  let seeded: Map<string, StoredKeptSession>
  let status: string

  beforeAll(async () => {
    factory = freshFactory()
    seeded = new Map(SHAPES.map((shape) => [shape, neutralSession(shape)]))
    const damaged = neutralSession('v3.0')
    seeded.set('damaged', {
      ...damaged,
      body: edited(damaged.body, ['phrases', 1, 'intent', 'seed'], 1.5),
    })
    await seedVersion1(
      factory,
      [...seeded].flatMap(([key, stored]) => sessionWrites({ key, stored })),
    )
    status = (await openUpgraded(factory)).status()
  })

  // @test-link [[module_kept_session_upgrade_step]]
  // @test-link [[module_on_device_database]]
  it('opens at data version 2, never rejected', async () => {
    expect(status).toBe('ready')
    expect((await databaseState(factory)).version).toBe(2)
  })

  // @test-link [[module_kept_session_upgrade_step]]
  // @test-link [[rule_earlier_kept_sessions_carried_over]]
  it.each(SHAPES)(
    'carries the %s-shaped session over, each phrase holding its levels only',
    async (shape) => {
      const after = await rawSession(factory, shape)
      const reading = decodeKeptSession(after)

      expect(reading.reading).toBe('current')
      for (const intent of storedIntents(after.body)) {
        expect(intent.figureLevels).toStrictEqual(NEUTRAL_FIGURE_LEVELS)
        expect(Object.hasOwn(intent, 'musicalProfile')).toBe(false)
      }
      expect(after.playedNotes).toStrictEqual(seeded.get(shape)!.playedNotes)
    },
  )

  // @test-link [[module_kept_session_upgrade_step]]
  it('leaves the damaged body as stored at data version 1, its session read as unreadable', async () => {
    const after = await rawSession(factory, 'damaged')
    const stored = seeded.get('damaged')!

    expect(after.body).toStrictEqual(stored.body)
    expect((after.body as { dataVersion: number }).dataVersion).toBe(1)
    expect(after.playedNotes).toStrictEqual(stored.playedNotes)
    expect((after.summary as { dataVersion: number }).dataVersion).toBe(2)
    expect(decodeKeptSession(after)).toEqual({ reading: 'unreadable' })
  })
})

/** Intent: a value nested `depth` objects deep. */
function nested(depth: number): unknown {
  let value: unknown = 'bottom'
  for (let level = 0; level < depth; level++) value = { inner: value }
  return value
}

/** Intent: the envelope of a data version 1 record around the given fields. */
function v1Envelope(fields: Record<string, unknown>): Record<string, unknown> {
  return { dataVersion: 1, appVersion: V30_APP_VERSION, ...fields }
}

/** Intent: the malformed values every store's record may be: not a record of any kind. */
function notRecords(): readonly (readonly [string, unknown])[] {
  return [
    ['a string', 'a kept session'],
    ['a number', 42],
    ['null', null],
    ['an array', [1, 2]],
    ['a Date', new Date(0)],
    ['a Map', new Map<string, unknown>([['dataVersion', 1]])],
  ]
}

/** Intent: every malformed session-wide record, by name, over a valid data version 1 one. */
function malformedSummaries(summary: unknown): readonly (readonly [string, unknown])[] {
  return [
    ...notRecords(),
    ['no envelope', edited(edited(summary, ['dataVersion'], REMOVE), ['appVersion'], REMOVE)],
    ['an ill-typed data version', edited(summary, ['dataVersion'], '1')],
    ['an empty app version', edited(summary, ['appVersion'], '')],
    ['an extra field', edited(summary, ['acknowledgements'], [])],
    ['a missing field', edited(summary, ['comment'], REMOVE)],
    ['a selection without isCustom', edited(summary, ['musicalProfile', 'isCustom'], REMOVE)],
    ['an unknown profile', edited(summary, ['musicalProfile', 'musicalProfile'], 'Bebop')],
    ['a Map as the selection', edited(summary, ['musicalProfile'], new Map([['isCustom', false]]))],
    ['a sparse array as the instrument', edited(summary, ['instrument'], new Array(2))],
    ['a deeply nested comment', edited(summary, ['comment'], nested(300))],
    ['a preset label in place of the selection', edited(summary, ['musicalProfile'], 'Neutral')],
  ]
}

/** Intent: every malformed body, by name, over a valid data version 1 one (v3.0's shape). */
function malformedBodies(body: unknown): readonly (readonly [string, unknown])[] {
  const disagreeing = v1Session(
    encodeKeptSession(
      historyOf(recordedKeptSession('bb-tenor', 3).phrases(), 'bb-tenor', NEUTRAL),
      FACTS,
      V30_APP_VERSION,
    ),
    JAZZ,
    'chunk 4',
  ).body
  return [
    ...notRecords(),
    ['no envelope', edited(edited(body, ['dataVersion'], REMOVE), ['appVersion'], REMOVE)],
    ['an ill-typed app version', edited(body, ['appVersion'], 3)],
    ['an extra field', edited(body, ['diagnostics'], {})],
    ['a missing field', edited(body, ['phrases'], REMOVE)],
    ['phrases that are no array', v1Envelope({ phrases: 'phrases' })],
    ['phrases that are a Map', v1Envelope({ phrases: new Map([[0, {}]]) })],
    ['levels that disagree with the profile', disagreeing],
    [
      'a profile without isCustom',
      edited(body, ['phrases', 0, 'intent', 'musicalProfile', 'isCustom'], REMOVE),
    ],
    ['an intent that is a Date', edited(body, ['phrases', 0, 'intent'], new Date(0))],
    ['phrases that are all holes', v1Envelope({ phrases: new Array(3) })],
    ['phrases with a hole', edited(body, ['phrases', 1], REMOVE)],
    ['a deeply nested timeline', edited(body, ['phrases', 0, 'timeline'], nested(300))],
  ]
}

// @test-link [[module_kept_session_upgrade_step]]
describe('the upgrade step over malformed stored session-wide records and bodies', () => {
  const valid = neutralSession('v3.0')
  const summaries = malformedSummaries(valid.summary)
  const bodies = malformedBodies(valid.body)

  // @test-link [[module_kept_session_upgrade_step]]
  it('reads the valid records it is built over, so each malformed one differs only as named', () => {
    expect(upgradedKeptSummary(valid.summary, UPGRADING_APP_VERSION)).not.toBeNull()
    expect(upgradedKeptBody(valid.body, UPGRADING_APP_VERSION)).not.toBeNull()
  })

  // @test-link [[module_kept_session_upgrade_step]]
  it.each(summaries)('gives no rewrite of a summary with %s, never throwing', (_, value) => {
    expect(upgradedKeptSummary(value, UPGRADING_APP_VERSION)).toBeNull()
  })

  // @test-link [[module_kept_session_upgrade_step]]
  it.each(bodies)('gives no rewrite of a body with %s, never throwing', (_, value) => {
    expect(upgradedKeptBody(value, UPGRADING_APP_VERSION)).toBeNull()
  })

  // @test-link [[module_kept_session_upgrade_step]]
  it('gives no rewrite when the rewrite fails with an error that is no refusal', () => {
    /** Intent: what `write` throws, null when it throws nothing. */
    const thrown = (write: () => unknown): unknown => {
      try {
        write()
        return null
      } catch (error) {
        return error
      }
    }
    const phrases = parseKeptSessionBodyV1(valid.body)
    const failures = [
      thrown(() => rewrittenKeptSummaryRecord(parseKeptSessionSummaryV1(valid.summary), '')),
      thrown(() => rewrittenKeptBodyRecord(phrases, () => false, '')),
    ]

    for (const failure of failures) {
      expect(failure).toBeInstanceOf(Error)
      expect(isKeptPhraseRefusal(failure)).toBe(false)
    }
    expect(upgradedKeptSummary(valid.summary, '')).toBeNull()
    expect(upgradedKeptBody(valid.body, '')).toBeNull()
  })

  // @test-link [[module_kept_session_upgrade_step]]
  // @test-link [[module_on_device_database]]
  it('opens a database seeded with all of them at data version 2, each left as stored', async () => {
    const factory = freshFactory()
    await openV30Port(factory)
    await seedRaw(factory, 'sessionSummaries', summaries)
    await seedRaw(factory, 'sessionBodies', bodies)

    const port = await openUpgraded(factory)

    expect(port.status()).toBe('ready')
    expect((await databaseState(factory)).version).toBe(2)
    await withRawDatabase(factory, async (database) => {
      for (const [name, value] of summaries)
        expect(await rawGet(database, 'sessionSummaries', name), name).toStrictEqual(value)
      for (const [name, value] of bodies)
        expect(await rawGet(database, 'sessionBodies', name), name).toStrictEqual(value)
    })
  })

  // @test-link [[module_kept_session_upgrade_step]]
  // @test-link [[rule_preset_label_kept_with_session]]
  it('leaves a summary whose selection lacks isCustom at data version 1, its session unreadable', async () => {
    const factory = freshFactory()
    const summary = edited(valid.summary, ['musicalProfile', 'isCustom'], REMOVE)
    await seedVersion1(factory, sessionWrites({ key: 'no-mark', stored: { ...valid, summary } }))

    await openUpgraded(factory)
    const after = await rawSession(factory, 'no-mark')

    expect(after.summary).toStrictEqual(summary)
    expect((after.body as { dataVersion: number }).dataVersion).toBe(2)
    expect(decodeKeptSession(after)).toEqual({ reading: 'unreadable' })
  })
})

// @test-link [[module_kept_session_upgrade_step]]
// @test-link [[module_on_device_database]]
describe('a v3.0 tab open while v3.1 upgrades the database to data version 2', () => {
  // @test-link [[module_kept_session_upgrade_step]]
  // @test-link [[module_on_device_database]]
  it('becomes outdated, the upgrade not blocked and the session carried over', async () => {
    const factory = freshFactory()
    const older = await seedVersion1(
      factory,
      sessionWrites({ key: 'kept', stored: neutralSession('v3.0') }),
    )
    let notices = 0
    older.onOutdated(() => {
      notices += 1
    })

    const newer = await openUpgraded(factory)

    expect(newer.status()).toBe('ready')
    expect(older.status()).toBe('outdated')
    expect(notices).toBe(1)
    expect((await databaseState(factory)).version).toBe(2)
    expect(decodeKeptSession(await rawSession(factory, 'kept')).reading).toBe('current')
  })
})
