/**
 * Step 10 release journey (3/8): the same complete request and seed reproduce the identical
 * phrase, and a different seed under the same controls reproduces a different one. Runs against
 * the workspace harness (port 4175) so the exact seed a generation draws is controlled, then
 * compares the resulting concert-pitch timeline (never the request identity, which is always
 * fresh per generation by design).
 *
 * The in-browser replay (v3.1 hand check H3): a deterministic slice of the two recorded replay-key
 * corpora replays through the real browser generation worker to the stored timelines, byte for
 * byte, both as recorded and re-encoded as `ifk3.` keys. With `INFINITE_FLOW_REPLAY_KEY` holding a
 * key (or a whole copied console line), one more test replays it in the browser and checks the
 * phrase equals the headless replay of the same key. `INFINITE_FLOW_BROWSER_CHANNEL` runs the
 * whole spec on another browser channel (`msedge` for Microsoft Edge).
 */
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

import { expect, test } from '@playwright/test'

import { generateAndAwaitReady } from '../workspace/helpers'
import {
  gotoWorkspaceHarness,
  harnessSnapshot,
  queueSeeds,
  reEncodeKeyInBrowser,
  replayKeyInBrowser,
} from './harness-helpers'

const BROWSER_CHANNEL = process.env.INFINITE_FLOW_BROWSER_CHANNEL
if (BROWSER_CHANNEL !== undefined && BROWSER_CHANNEL !== '') test.use({ channel: BROWSER_CHANNEL })

// The two documented seeds below were chosen empirically against the default controls (C Ionian,
// Neutral preset, B-flat tenor, Register Middle): both are cheap enough to generate well within
// the poll timeout, and 4243's timeline was confirmed (by a throwaway harness probe during this
// spec's authoring) to differ from 4242's rather than coincidentally match it. Both facts were
// re-confirmed after D172 changed the defaults to Gentle diatonic harmonic motion and Varied
// arpeggio chaos.
const REPRODUCIBLE_SEED = 4242
const DIFFERENT_SEED = 4243

// @test-link [[rule_seeded_phrase_reproduction]]
test('the same seed and controls reproduce an identical timeline across two generations', async ({
  page,
}) => {
  await gotoWorkspaceHarness(page)
  await queueSeeds(page, [REPRODUCIBLE_SEED])
  await generateAndAwaitReady(page)
  const first = await harnessSnapshot(page)
  expect(first.seed).toBe(REPRODUCIBLE_SEED)

  await page.reload()
  await page.waitForFunction(() => typeof window.__workspaceHarness !== 'undefined')
  await queueSeeds(page, [REPRODUCIBLE_SEED])
  await generateAndAwaitReady(page)
  const second = await harnessSnapshot(page)

  expect(second.seed).toBe(first.seed)
  expect(second.timeline).toBe(first.timeline)
  expect(second.instrumentProfileId).toBe(first.instrumentProfileId)
})

// @test-link [[rule_seeded_phrase_reproduction]]
test('a different seed under the same controls produces a different timeline', async ({ page }) => {
  await gotoWorkspaceHarness(page)
  await queueSeeds(page, [REPRODUCIBLE_SEED])
  await generateAndAwaitReady(page)
  const first = await harnessSnapshot(page)

  await queueSeeds(page, [DIFFERENT_SEED])
  await generateAndAwaitReady(page)
  const second = await harnessSnapshot(page)

  expect(second.seed).toBe(DIFFERENT_SEED)
  expect(second.timeline).not.toBe(first.timeline)
})

/** One recorded corpus case: its label, its replay key and the timeline the key replayed to. */
interface CorpusCase {
  readonly label: string
  readonly key: string
  readonly timeline: unknown
}

/** Intent: the recorded cases of a replay-key corpus file, read Node-side (never written). */
function readCorpusCases(fileName: string): readonly CorpusCase[] {
  const path = fileURLToPath(new URL(`../../fixtures/replay-keys/${fileName}`, import.meta.url))
  const corpus = JSON.parse(readFileSync(path, 'utf8')) as { readonly cases: readonly CorpusCase[] }
  return corpus.cases
}

/** Intent: every `step`-th case of a corpus, from the first: a deterministic spread. */
function everyNth(cases: readonly CorpusCase[], step: number): readonly CorpusCase[] {
  return cases.filter((_, index) => index % step === 0)
}

/**
 * Intent: a recorded (`ifk1.` or `ifk2.`) key's raw tuple, read Node-side without the codec, so
 * the slice's coverage is checked on what the key itself holds.
 */
function recordedTuple(key: string): readonly unknown[] {
  const payload = JSON.parse(
    Buffer.from(key.slice(key.indexOf('.') + 1), 'base64url').toString('utf8'),
  ) as unknown
  if (!Array.isArray(payload)) throw new Error(`Replay key payload is not a tuple: ${key}`)
  return payload
}

/** Intent: what a recorded key's tuple names: its version, profile, instrument kind and carry-in. */
function coverageOf(key: string): readonly string[] {
  const tuple = recordedTuple(key)
  return [
    key.slice(0, key.indexOf('.')),
    String(tuple[3]),
    key.startsWith('ifk2.') ? 'my-instrument' : 'built-in',
    tuple[6] === null ? 'standalone' : 'carry-in',
  ]
}

/**
 * Intent: replay each case in the browser, as recorded and as its `ifk3.` re-encoding, and expect
 * both to give the stored timeline's JSON text exactly.
 */
async function expectSliceReplays(
  page: Parameters<typeof replayKeyInBrowser>[0],
  cases: readonly CorpusCase[],
): Promise<void> {
  await gotoWorkspaceHarness(page)
  for (const corpusCase of cases) {
    const stored = JSON.stringify(corpusCase.timeline)
    expect(await replayKeyInBrowser(page, corpusCase.key), corpusCase.label).toEqual({
      kind: 'timeline',
      timeline: stored,
    })
    const reEncoded = await reEncodeKeyInBrowser(page, corpusCase.key)
    expect(reEncoded.startsWith('ifk3.'), corpusCase.label).toBe(true)
    expect(await replayKeyInBrowser(page, reEncoded), `${corpusCase.label} as ifk3`).toEqual({
      kind: 'timeline',
      timeline: stored,
    })
  }
}

/** The v3.0 corpus slice: 12 cases, ifk1 and ifk2, Neutral and Jazz, standalone and carry-in. */
const V30_SLICE = everyNth(readCorpusCases('v3.0-neutral-jazz.json'), 19)
/** The v2.0 corpus slice: 6 ifk1 cases, Neutral and Jazz, a carry-in one among them. */
const V20_SLICE = everyNth(readCorpusCases('ifk1-v2.0.json'), 17)

/** Generous per-test timeout: each slice replays in about a second in Chromium. */
const SLICE_TIMEOUT_MS = 120_000

// @test-link [[rule_seeded_phrase_reproduction]]
// @test-link [[module_phrase_replay_key]]
test('a slice of the v3.0 replay-key corpus replays in the browser worker to its stored timelines, also as ifk3', async ({
  page,
}) => {
  test.setTimeout(SLICE_TIMEOUT_MS)
  const covered = new Set(V30_SLICE.flatMap((corpusCase) => coverageOf(corpusCase.key)))
  for (const value of ['ifk1', 'ifk2', 'Neutral', 'Jazz', 'my-instrument', 'carry-in'])
    expect(covered).toContain(value)
  expect(V30_SLICE).toHaveLength(12)

  await expectSliceReplays(page, V30_SLICE)
})

// @test-link [[rule_seeded_phrase_reproduction]]
// @test-link [[module_phrase_replay_key]]
test('a slice of the v2.0 replay-key corpus replays in the browser worker to its stored timelines, also as ifk3', async ({
  page,
}) => {
  test.setTimeout(SLICE_TIMEOUT_MS)
  const covered = new Set(V20_SLICE.flatMap((corpusCase) => coverageOf(corpusCase.key)))
  for (const value of ['ifk1', 'Neutral', 'Jazz', 'carry-in']) expect(covered).toContain(value)
  expect(V20_SLICE).toHaveLength(6)

  await expectSliceReplays(page, V20_SLICE)
})

/** The hand check's key (or a whole copied console line holding one); unset skips its test. */
const HAND_CHECK_KEY_TEXT = process.env.INFINITE_FLOW_REPLAY_KEY ?? ''

/**
 * The headless replay (src/generation-worker/phrase-replay.ts), loaded at run time by URL, as
 * scripts/replay-phrase.mjs loads it, so the e2e TypeScript project never takes the app's
 * sources into its program; Playwright compiles the module on import.
 */
const HEADLESS_REPLAY_MODULE_URL = new URL(
  '../../../src/generation-worker/phrase-replay.ts',
  import.meta.url,
).href

/** The parts of a headless replay report the hand check compares. */
type HeadlessReplayOutput =
  | { readonly kind: 'crash'; readonly name: string; readonly message: string }
  | {
      readonly kind: 'generation_success' | 'generation_failure'
      readonly raw:
        | { readonly kind: 'generation_success'; readonly result: { readonly timeline: unknown } }
        | { readonly kind: 'generation_failure'; readonly code: string }
    }

/** The headless replay surface the hand check calls, narrowed from the loaded module. */
interface HeadlessReplayModule {
  readonly extractPhraseReplayKey: (text: string) => string
  readonly replayPhraseKey: (key: string) => { readonly output: HeadlessReplayOutput }
}

/** Intent: load the headless replay module, failing loudly if a function it needs is missing. */
async function loadHeadlessReplay(): Promise<HeadlessReplayModule> {
  const loaded: unknown = await import(HEADLESS_REPLAY_MODULE_URL)
  if (typeof loaded !== 'object' || loaded === null) {
    throw new TypeError(`${HEADLESS_REPLAY_MODULE_URL} did not load as a module.`)
  }
  for (const name of ['extractPhraseReplayKey', 'replayPhraseKey']) {
    if (typeof Reflect.get(loaded, name) !== 'function') {
      throw new TypeError(`${HEADLESS_REPLAY_MODULE_URL} does not export ${name}().`)
    }
  }
  return loaded as HeadlessReplayModule
}

/**
 * Intent: the headless replay's answer for a key, shaped as the browser replay answers: its
 * timeline's JSON text, or its generation failure's description; a crash fails loudly.
 */
function headlessReplayAnswer(
  replay: HeadlessReplayModule,
  key: string,
): WorkspaceHarnessReplayAnswer {
  const { output } = replay.replayPhraseKey(key)
  if (output.kind === 'crash') {
    throw new Error(`The headless replay crashed: ${output.name}: ${output.message}`)
  }
  if (output.raw.kind === 'generation_success') {
    return { kind: 'timeline', timeline: JSON.stringify(output.raw.result.timeline) }
  }
  return { kind: 'failure', description: `generation_failure: ${output.raw.code}` }
}

// @test-link [[rule_seeded_phrase_reproduction]]
// @test-link [[module_phrase_replay_key]]
test('the hand check key replays in the browser to the same phrase as the headless replay', async ({
  page,
}) => {
  test.skip(HAND_CHECK_KEY_TEXT.trim() === '', 'set INFINITE_FLOW_REPLAY_KEY to a replay key')
  const replay = await loadHeadlessReplay()
  const key = replay.extractPhraseReplayKey(HAND_CHECK_KEY_TEXT)
  const expected = headlessReplayAnswer(replay, key)

  await gotoWorkspaceHarness(page)
  expect(await replayKeyInBrowser(page, key)).toEqual(expected)
})
