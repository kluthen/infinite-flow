/**
 * Shared helpers for the Idle pre-generation spec, on the workspace harness (port 4175) loaded with
 * `?pregeneration=on`: the harness's `generate` call records and background-attempt counts, its
 * background gate, the phrase number a session attempt's seed belongs to, and waits for the queue
 * to fill or for a background attempt to be held.
 */
import { expect, type Page } from '@playwright/test'

import { WORKSPACE_HARNESS_URL, queueSessionSeeds } from '../release/harness-helpers'
import { DESKTOP, readyToStart } from '../session/session-helpers'

/** The most phrases the queue holds: phrases 2 to 5. */
export const QUEUE_SIZE = 4

/** Intent: land on the harness with pre-generation on, at `size`, its controller loaded. */
export async function gotoPregenerationHarness(
  page: Page,
  size: { readonly width: number; readonly height: number } = DESKTOP,
): Promise<void> {
  await page.setViewportSize(size)
  await page.goto(`${WORKSPACE_HARNESS_URL}?pregeneration=on`)
  await page.waitForFunction(() => typeof window.__workspaceHarness !== 'undefined')
  await page.waitForFunction(() => window.__workspaceHarness.session.loaded())
}

/** Intent: every `generate` call's record since the page loaded, in call order. */
export function generationRecords(
  page: Page,
): Promise<readonly WorkspaceHarnessGenerationRequest[]> {
  return page.evaluate(() => window.__workspaceHarness.generationRequests())
}

/** Intent: the background attempts' counts since the page loaded. */
export function backgroundCounts(page: Page): Promise<WorkspaceHarnessBackgroundGeneration> {
  return page.evaluate(() => window.__workspaceHarness.backgroundGeneration())
}

/** Intent: hold every later background attempt at the harness's background gate. */
export function holdBackground(page: Page): Promise<void> {
  return page.evaluate(() => window.__workspaceHarness.holdBackgroundGeneration())
}

/** Intent: release the background gate. */
export function releaseBackground(page: Page): Promise<void> {
  return page.evaluate(() => window.__workspaceHarness.releaseBackgroundGeneration())
}

/** Intent: the seeds of phrase `phraseNumber`'s rungs (0 to 4) for `sessionSeed`, from the page. */
export function rungSeeds(
  page: Page,
  sessionSeed: number,
  phraseNumber: number,
): Promise<number[]> {
  return page.evaluate(
    ([seed, phrase]) =>
      [0, 1, 2, 3, 4].map((rung) =>
        window.__workspaceHarness.phraseAttemptSeed(seed, phrase, rung),
      ),
    [sessionSeed, phraseNumber] as const,
  )
}

/**
 * Intent: the phrase number (2 to 9) a session attempt seeded `seed` is for under `sessionSeed`,
 * or null if it is none of theirs.
 */
export async function phraseOfSeed(
  page: Page,
  sessionSeed: number,
  seed: number,
): Promise<number | null> {
  for (let phrase = 2; phrase <= 9; phrase += 1) {
    if ((await rungSeeds(page, sessionSeed, phrase)).includes(seed)) return phrase
  }
  return null
}

/** Intent: the background records from call index `from` on. */
export async function backgroundRecordsFrom(
  page: Page,
  from: number,
): Promise<WorkspaceHarnessGenerationRequest[]> {
  return (await generationRecords(page)).slice(from).filter((record) => record.background)
}

/**
 * Intent: wait until the background attempts made from call index `from` on have filled the
 * queue: four answered with a phrase and none still in flight or held. Returns those records.
 */
export async function untilQueueFull(
  page: Page,
  from = 0,
): Promise<WorkspaceHarnessGenerationRequest[]> {
  await expect
    .poll(
      async () => {
        const records = await backgroundRecordsFrom(page, from)
        const open = records.filter((record) => record.settled === 'pending').length
        const answered = records.filter((record) => record.timeline !== null).length
        return open === 0 && answered >= QUEUE_SIZE
      },
      { timeout: 60_000 },
    )
    .toBe(true)
  return backgroundRecordsFrom(page, from)
}

/** Intent: wait until a background attempt made from call index `from` on waits at the gate. */
export async function untilBackgroundHeld(
  page: Page,
  from = 0,
): Promise<WorkspaceHarnessGenerationRequest> {
  await expect
    .poll(async () => (await backgroundCounts(page)).held, { timeout: 30_000 })
    .toBeGreaterThan(0)
  const held = (await backgroundRecordsFrom(page, from)).filter(
    (record) => record.settled === 'pending',
  )
  expect(held, 'one background attempt held').toHaveLength(1)
  return held[0]!
}

/**
 * Intent: generate phrase 1 seeded with `seed`, published with session seed `sessionSeed`, and
 * wait until a session can start from it.
 */
export async function readyWithSessionSeed(
  page: Page,
  sessionSeed: number,
  seed = 7,
): Promise<void> {
  await queueSessionSeeds(page, [sessionSeed])
  await readyToStart(page, seed)
}

/** Intent: the call records made from index `from` on that are not background attempts. */
export async function playerOrSessionRecordsFrom(
  page: Page,
  from: number,
): Promise<WorkspaceHarnessGenerationRequest[]> {
  return (await generationRecords(page)).slice(from).filter((record) => !record.background)
}
