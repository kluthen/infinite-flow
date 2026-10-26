/**
 * The request-intent agreement of a kept phrase over v3.2's request inputs: a stored request and
 * intent that differ on whether they hold a rhythm lock group or a steering block, or on the
 * origin of their carry-in, make the session unreadable, as does a carry-in from no phrase on a
 * phrase other than 1; groups of differing values agree, presence alone being compared. The data
 * version 2 readers, which read v3.1's bodies for the upgrade, refuse a stored request or intent
 * holding either group, as v3.1's reader did.
 */

import { beforeAll, describe, expect, it } from 'vitest'

import { BUILT_IN_PRESETS } from '@/domain/presets/built-in-presets'
import type { SessionHistoryRecord } from '@/session/session-history'
import { upgradedKeptBodyV4 } from '@/storage/migrations/kept-sessions-v4'
import { isKeptPhraseRefusal, KeptRecordError } from '@/storage/records/kept-phrase-parsers'
import { parseKeptSessionBodyV1, parseKeptSessionBodyV2 } from '@/storage/records/kept-session-body'
import {
  decodeKeptSession,
  encodeKeptSession,
  type KeptSessionFacts,
  type StoredKeptSession,
} from '@/storage/records/kept-session-record'
import {
  APP_VERSION,
  edited,
  historyOf,
  recordedKeptSession,
  REMOVE,
  storedRecords,
  type Step,
} from './kept-session-fixtures'
import { jamSessionRecords, lockedSessionRecords } from './kept-session-v32-fixtures'
import { REQUEST_GROUPS, v2Body, v2Session, withRequestGroup } from './kept-sessions-v2-fixtures'

/** The facts of a kept session with no favorite, no comment, played notes not kept. */
const FACTS: KeptSessionFacts = {
  pinned: false,
  favorites: [],
  comment: '',
  playedNotesKept: false,
  presets: BUILT_IN_PRESETS,
}

/** Intent: the stored records of a session over recorded phrases on the C keyboard. */
function keptRecords(records: readonly SessionHistoryRecord[]): StoredKeptSession {
  return storedRecords(encodeKeptSession(historyOf(records, 'c-keyboard'), FACTS, APP_VERSION))
}

/** One edit of a stored body: the path into it and the replacement, or REMOVE. */
type Edit = readonly [readonly Step[], unknown]

/** Intent: a stored body with every edit applied in order. */
function editedBody(body: unknown, edits: readonly Edit[]): unknown {
  return edits.reduce((value, [path, replacement]) => edited(value, path, replacement), body)
}

/** Intent: the value at a path of a stored body. */
function valueAt(body: unknown, path: readonly Step[]): unknown {
  return path.reduce<unknown>((node, step) => (node as Record<Step, unknown>)[step], body)
}

/** Which kept session an edit is made on: the locked one or the Jam-style one. */
type SessionName = 'locked' | 'jam'

// @test-link [[module_kept_session_codec]]
describe("a kept phrase's request and intent over v3.2's request inputs", () => {
  const sessions = new Map<SessionName, StoredKeptSession>()

  beforeAll(() => {
    sessions.set('locked', keptRecords(lockedSessionRecords()))
    sessions.set('jam', keptRecords(jamSessionRecords()))
  }, 60_000)

  /** Intent: the stored session named, its body edited, decoded. */
  function decodeEdited(name: SessionName, edits: (body: unknown) => readonly Edit[]) {
    const stored = sessions.get(name)!
    return decodeKeptSession({ ...stored, body: editedBody(stored.body, edits(stored.body)) })
  }

  // @test-link [[module_kept_session_codec]]
  it('reads both sessions as they were kept, the edits below their only change', () => {
    for (const stored of sessions.values())
      expect(decodeKeptSession(stored).reading).toBe('current')
  })

  /** Each disagreement: what differs, the session, and the edits that make it. */
  const DISAGREEMENTS: readonly (readonly [string, SessionName, (body: unknown) => Edit[]])[] = [
    [
      'a request holding a rhythm lock group its intent lacks',
      'locked',
      () => [[['phrases', 1, 'intent', 'rhythmLock'], REMOVE]],
    ],
    [
      'an intent holding a rhythm lock group its request lacks',
      'locked',
      () => [[['phrases', 1, 'request', 'rhythmLock'], REMOVE]],
    ],
    [
      'a request holding a steering block its intent lacks',
      'jam',
      () => [[['phrases', 1, 'intent', 'steering'], REMOVE]],
    ],
    [
      'an intent holding a steering block its request lacks',
      'jam',
      () => [[['phrases', 1, 'request', 'steering'], REMOVE]],
    ],
    [
      'a request holding a carry-in from no phrase its intent lacks',
      'jam',
      () => [[['phrases', 0, 'intent', 'carryIn'], REMOVE]],
    ],
    [
      'an intent holding a carry-in from no phrase its request lacks',
      'jam',
      () => [[['phrases', 0, 'request', 'carryIn'], REMOVE]],
    ],
    [
      "a request's carry-in from a phrase beside its intent's from no phrase",
      'jam',
      (body) => [
        [['phrases', 0, 'request', 'carryIn'], valueAt(body, ['phrases', 1, 'request', 'carryIn'])],
      ],
    ],
    [
      "a request's carry-in from no phrase beside its intent's from a phrase",
      'jam',
      (body) => [
        [['phrases', 1, 'request', 'carryIn'], valueAt(body, ['phrases', 0, 'request', 'carryIn'])],
      ],
    ],
  ]

  // @test-link [[module_kept_session_codec]]
  it.each(DISAGREEMENTS)('reads %s as unreadable', (_, name, edits) => {
    expect(decodeEdited(name, edits)).toEqual({ reading: 'unreadable' })
  })

  // @test-link [[module_kept_session_codec]]
  // @test-link [[rule_kept_session_content]]
  it('reads a carry-in from no phrase on phrase 2, in its request and intent alike, as unreadable', () => {
    /** Intent: the edits giving phrase 2's request and intent phrase 1's carry-ins. */
    const noPhrase = (body: unknown): Edit[] =>
      (['request', 'intent'] as const).map((part) => [
        ['phrases', 1, part, 'carryIn'],
        valueAt(body, ['phrases', 0, part, 'carryIn']),
      ])

    expect(decodeEdited('jam', noPhrase)).toEqual({ reading: 'unreadable' })
  })

  /** Each agreement the edits keep: what is edited, the session, and the edits. */
  const AGREEMENTS: readonly (readonly [string, SessionName, (body: unknown) => Edit[]])[] = [
    [
      'a rhythm lock group removed from both the request and the intent',
      'locked',
      () => [
        [['phrases', 1, 'request', 'rhythmLock'], REMOVE],
        [['phrases', 1, 'intent', 'rhythmLock'], REMOVE],
      ],
    ],
    [
      "a request's rhythm lock group of other values than its intent's",
      'locked',
      () => [[['phrases', 1, 'request', 'rhythmLock', 'tenserPhrase'], true]],
    ],
    [
      "a request's steering block of other values than its intent's",
      'jam',
      () => [[['phrases', 1, 'request', 'steering', 'targetRhythm', 'band'], 'near']],
    ],
  ]

  // @test-link [[module_kept_session_codec]]
  it.each(AGREEMENTS)('reads %s, presence alone being compared', (_, name, edits) => {
    expect(decodeEdited(name, edits).reading).toBe('current')
  })
})

// @test-link [[module_kept_session_jam_upgrade_step]]
// @test-link [[rule_earlier_sessions_open_without_doodle]]
describe('the data version 2 readers over a v3.2 group', () => {
  let v31Body: unknown
  const v32Bodies = new Map<SessionName, unknown>()

  beforeAll(() => {
    const phrases = recordedKeptSession('bb-tenor', 3).phrases()
    v31Body = v2Session(encodeKeptSession(historyOf(phrases, 'bb-tenor'), FACTS, APP_VERSION)).body
    v32Bodies.set('locked', v2Body(keptRecords(lockedSessionRecords()).body))
    v32Bodies.set('jam', v2Body(keptRecords(jamSessionRecords()).body))
  }, 60_000)

  // @test-link [[module_kept_session_jam_upgrade_step]]
  it("read v3.1's body, the edits below their only change", () => {
    expect(parseKeptSessionBodyV2(v31Body)).toHaveLength(3)
    expect(upgradedKeptBodyV4(v31Body, APP_VERSION)).not.toBeNull()
  })

  // @test-link [[module_kept_session_jam_upgrade_step]]
  // @test-link [[rule_earlier_sessions_open_without_doodle]]
  it.each(Object.keys(REQUEST_GROUPS) as (keyof typeof REQUEST_GROUPS)[])(
    'refuse a stored request holding the %s group, which step 4 then leaves as it is',
    (group) => {
      const body = withRequestGroup(v31Body, 1, group)

      expect(() => parseKeptSessionBodyV2(body)).toThrow(KeptRecordError)
      expect(() => parseKeptSessionBodyV1({ ...(body as object), dataVersion: 1 })).toThrow(
        KeptRecordError,
      )
      expect(upgradedKeptBodyV4(body, APP_VERSION)).toBeNull()
    },
  )

  // @test-link [[module_kept_session_jam_upgrade_step]]
  it.each(['locked', 'jam'] as const)(
    'refuse the %s session whose intents hold a v3.2 group, never throwing in step 4',
    (name) => {
      const body = v32Bodies.get(name)!
      let refusal: unknown = null
      try {
        parseKeptSessionBodyV2(body)
      } catch (error) {
        refusal = error
      }

      expect(isKeptPhraseRefusal(refusal)).toBe(true)
      expect(upgradedKeptBodyV4(body, APP_VERSION)).toBeNull()
    },
  )
})
