/**
 * Shared helpers for the browser checks of the data version 2 upgrade (v3.1 chunk 9), on the
 * workspace harness (port 4175) over the browser's real IndexedDB: a Jazz session played and kept
 * by this version, its records read back and turned, in Node, into the shapes v3.0 kept them in
 * (data version 1: the musical profile selection in the session-wide record and in each phrase's
 * intent, no preset label, no figure levels), and a held load seeded with copies of it through
 * the harness's v3.0 seam before the upgrading load runs.
 */
import { expect, type Page } from '@playwright/test'

import { WORKSPACE_HARNESS_URL } from '../release/harness-helpers'
import { radio } from '../workspace/helpers'
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
  await radio(page, 'Musical profile preset', 'Jazz').click()
  await expect(radio(page, 'Musical profile preset', 'Jazz')).toHaveAttribute(
    'aria-checked',
    'true',
  )
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

/** Intent: a stored intent as v3.0 kept it: `V30_SELECTION` in place of its figure levels. */
function v30Intent(intent: StoredIntent): StoredIntent {
  const { figureLevels, ...rest } = intent
  void figureLevels
  return { ...rest, musicalProfile: { ...V30_SELECTION } }
}

/**
 * Intent: a stored data version 2 session-wide record as v3.0 kept it: `V30_SELECTION` in place
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

/** Intent: a stored data version 2 body as v3.0 kept it: each intent v3.0's, at data version 1. */
function v30Body(body: Record<string, unknown>): Record<string, unknown> {
  const copy = structuredClone(body)
  for (const phrase of storedPhrases(copy)) phrase.intent = v30Intent(phrase.intent)
  return { ...copy, dataVersion: 1 }
}

/**
 * Intent: the stored values a session this version kept had when v3.0 kept them: its
 * session-wide record and body at data version 1 in v3.0's shapes, its played notes as stored.
 */
export function v30Session(stored: StoredSession): StoredSession {
  return {
    summary: v30Summary(stored.summary),
    body: v30Body(stored.body),
    ...(stored.playedNotes === undefined ? {} : { playedNotes: stored.playedNotes }),
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

/** Intent: release the held load. */
export async function releaseHeldLoad(page: Page): Promise<void> {
  await page.evaluate(() => {
    const held = window.__workspaceHarnessHeldLoad
    if (held === undefined) throw new Error('the load is not held')
    held.release()
  })
}
