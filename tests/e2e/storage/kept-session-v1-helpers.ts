/**
 * Shared helpers for the browser checks of the kept-session upgrades (v3.1 chunk 9, v3.2 chunk
 * 22), on the workspace harness (port 4175) over the browser's real IndexedDB: a Jazz session
 * played and kept by this version, its records read back and turned, in Node, into the shapes an
 * earlier version kept them in, and a held load seeded with copies of it through the harness's
 * seam for that version before the upgrading load runs. v3.1's shapes are data version 2: no Jam
 * mark, no doodle, no played-notes clock, and no rhythm lock group, steering block or carry-in
 * from no phrase in a phrase's request or intent. v3.0's are data version 1: v3.1's, with the
 * musical profile selection in the session-wide record and in each phrase's intent, no preset
 * label and no figure levels.
 */
import type { Page } from '@playwright/test'

import { WORKSPACE_HARNESS_URL } from '../release/harness-helpers'
import { choosePreset } from '../workspace/helpers'
import { sessionAt } from '../review/session-list-helpers'
import { keyedRecords } from '../review/review-tools-helpers'

/** The musical profile selection v3.0 kept with a session: Jazz, edited away from the preset. */
export const V30_SELECTION = { musicalProfile: 'Jazz', isCustom: true } as const

/** The preset label the upgrade gives `V30_SELECTION`. */
export const V30_PRESET_LABEL = 'Custom, based on Jazz'

/** A kept session's stored values, as raw records: its played notes only when stored. */
export interface StoredSession {
  readonly summary: Record<string, unknown>
  readonly body: Record<string, unknown>
  readonly playedNotes?: Record<string, unknown>
}

/** A stored intent, as a plain record. */
type StoredIntent = Record<string, unknown>

/** A stored phrase, as a plain record. */
type StoredPhrase = Record<string, unknown> & { intent: StoredIntent }

/** Intent: select Jazz, then play a two-phrase session started at `startedAt`: the Review shows. */
export async function playJazzSession(page: Page, startedAt: number): Promise<void> {
  await choosePreset(page, 'Jazz')
  await sessionAt(page, startedAt)
}

/** Intent: the stored values of the kept session under `key`, read through the harness's seam. */
export async function storedSession(page: Page, key: string): Promise<StoredSession> {
  /** Intent: the record a store holds under `key`, if any. */
  const under = async (
    store: 'sessionSummaries' | 'sessionBodies' | 'playedNotes',
  ): Promise<Record<string, unknown> | undefined> =>
    (await keyedRecords(page, store)).find((record) => record.key === key)?.value as
      Record<string, unknown> | undefined
  const [summary, body, playedNotes] = await Promise.all([
    under('sessionSummaries'),
    under('sessionBodies'),
    under('playedNotes'),
  ])
  if (summary === undefined || body === undefined) throw new Error(`no kept session under ${key}`)
  return { summary, body, ...(playedNotes === undefined ? {} : { playedNotes }) }
}

/** Intent: the stored phrases of a stored body. */
export function storedPhrases(body: Record<string, unknown>): StoredPhrase[] {
  return body.phrases as StoredPhrase[]
}

/** The app version of the v3.1 tab the v3.1 records are written as. */
const V31_APP_VERSION = '3.1.0'

/** Intent: a stored request or intent without the inputs v3.1 never held, as a fresh record. */
function withoutV32Inputs(stored: Record<string, unknown>): Record<string, unknown> {
  const { rhythmLock, steering, carryIn, ...rest } = stored
  void rhythmLock
  void steering
  const fromPhrase = typeof carryIn === 'object' && carryIn !== null && !('origin' in carryIn)
  return fromPhrase ? { ...rest, carryIn } : rest
}

/**
 * Intent: a stored session this version kept, as a fresh copy without what only v3.2 keeps: no
 * Jam mark or declined suggestion in its session-wide record; no doodle or played-notes clock in
 * its body; in each phrase's request and intent, no rhythm lock group, no steering block and no
 * carry-in from no phrase (a carry-in from a phrase, v3.1's, stays); its played notes as stored.
 * Its data versions are left as stored. Throws for a Jam session, which v3.1 never kept.
 */
function withoutV32Parts(stored: StoredSession): StoredSession {
  if (stored.summary.isJam !== false)
    throw new Error('only a session that is no Jam has a v3.1 shape')
  const { isJam, suggestionDeclined, ...summary } = structuredClone(stored.summary)
  void isJam
  void suggestionDeclined
  const { doodle, playedNotesClock, ...body } = structuredClone(stored.body)
  void doodle
  void playedNotesClock
  for (const phrase of storedPhrases(body)) {
    phrase.request = withoutV32Inputs(phrase.request as Record<string, unknown>)
    phrase.intent = withoutV32Inputs(phrase.intent)
  }
  return {
    summary,
    body,
    ...(stored.playedNotes === undefined ? {} : { playedNotes: stored.playedNotes }),
  }
}

/**
 * Intent: the stored values a session this version kept had when v3.1 kept them: its
 * session-wide record and body in v3.1's shapes at data version 2, written and recorded by v3.1
 * (`3.1.0`), every other field as stored; its played notes as stored (data version 1, unchanged
 * since v3.0). Throws for a Jam session.
 */
export function v31Session(stored: StoredSession): StoredSession {
  const { summary, body, playedNotes } = withoutV32Parts(stored)
  return {
    summary: {
      ...summary,
      dataVersion: 2,
      appVersion: V31_APP_VERSION,
      recordedByAppVersion: V31_APP_VERSION,
    },
    body: { ...body, dataVersion: 2, appVersion: V31_APP_VERSION },
    ...(playedNotes === undefined ? {} : { playedNotes }),
  }
}

/** Intent: a stored intent as v3.0 kept it: `V30_SELECTION` in place of its figure levels. */
function v30Intent(intent: StoredIntent): StoredIntent {
  const { figureLevels, ...rest } = intent
  void figureLevels
  return { ...rest, musicalProfile: { ...V30_SELECTION } }
}

/**
 * Intent: a stored session-wide record in v3.1's shape as v3.0 kept it: `V30_SELECTION` in place
 * of its preset label, at the same key position, at data version 1.
 */
function v30Summary(summary: Record<string, unknown>): Record<string, unknown> {
  const entries = Object.entries(structuredClone(summary)).map(
    ([key, value]): [string, unknown] => {
      if (key === 'presetLabel') return ['musicalProfile', { ...V30_SELECTION }]
      return key === 'dataVersion' ? [key, 1] : [key, value]
    },
  )
  return Object.fromEntries(entries)
}

/** Intent: a stored body in v3.1's shape as v3.0 kept it: each intent v3.0's, at data version 1. */
function v30Body(body: Record<string, unknown>): Record<string, unknown> {
  const copy = structuredClone(body)
  for (const phrase of storedPhrases(copy)) phrase.intent = v30Intent(phrase.intent)
  return { ...copy, dataVersion: 1 }
}

/**
 * Intent: the stored values a session this version kept had when v3.0 kept them: its
 * session-wide record and body at data version 1 in v3.0's shapes (v3.1's without its preset
 * label and figure levels), their app versions as stored, its played notes as stored. Throws for
 * a Jam session.
 */
export function v30Session(stored: StoredSession): StoredSession {
  const { summary, body, playedNotes } = withoutV32Parts(stored)
  return {
    summary: v30Summary(summary),
    body: v30Body(body),
    ...(playedNotes === undefined ? {} : { playedNotes }),
  }
}

/** Intent: open the harness with its load held, at the desktop size, and wait for the hold. */
export async function gotoHeldLoad(page: Page): Promise<void> {
  await page.setViewportSize({ width: 1280, height: 900 })
  await page.goto(`${WORKSPACE_HARNESS_URL}?storageLoad=held`)
  await page.waitForFunction(() => window.__workspaceHarnessHeldLoad !== undefined)
}

/**
 * Intent: while the load is held, seed `count` copies of the v3.0 session `template` through the
 * harness's v3.0 port (copy `i` started `i` minutes after the template, its session seed `i`).
 */
export function seedVersionOne(page: Page, template: StoredSession, count: number): Promise<void> {
  return page.evaluate(
    ([seeded, copies]) => {
      const held = window.__workspaceHarnessHeldLoad
      if (held === undefined) throw new Error('the load is not held')
      return held.seedVersionOneSessions(seeded, copies)
    },
    [template, count] as const,
  )
}

/**
 * Intent: while the load is held, seed `count` copies of the v3.1 session `template` through the
 * harness's v3.1 port, at data version 3 (copies keyed and started as `seedVersionOne`'s).
 */
export function seedVersionThree(
  page: Page,
  template: StoredSession,
  count: number,
): Promise<void> {
  return page.evaluate(
    ([seeded, copies]) => {
      const held = window.__workspaceHarnessHeldLoad
      if (held === undefined) throw new Error('the load is not held')
      return held.seedVersionThreeSessions(seeded, copies)
    },
    [template, count] as const,
  )
}

/** Intent: release the held load. */
export async function releaseHeldLoad(page: Page): Promise<void> {
  await page.evaluate(() => {
    const held = window.__workspaceHarnessHeldLoad
    if (held === undefined) throw new Error('the load is not held')
    held.release()
  })
}
