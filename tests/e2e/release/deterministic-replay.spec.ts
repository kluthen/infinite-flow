/**
 * Step 10 release journey (3/8): the same complete request and seed reproduce the identical
 * phrase, and a different seed under the same controls reproduces a different one. Runs against
 * the workspace harness (port 4175) so the exact seed a generation draws is controlled, then
 * compares the resulting concert-pitch timeline (never the request identity, which is always
 * fresh per generation by design).
 *
 * The in-browser replay (v3.1 hand check H3): a deterministic slice of each recorded replay-key
 * corpus (v2.0's, v3.0's and v3.1's) replays through the real browser generation worker to the
 * stored timelines, byte for byte, both as recorded and re-encoded as `ifk4.` keys. Hand-written
 * `ifk4.` keys (v3.2 chunk 12) for a locked phrase, a changed phrase, a forced bend, a phrase with a
 * steering block and a Jam's phrase 1 joining from no phrase replay in the browser to the same
 * phrase as the headless replay, which names the lock's outcome. With `INFINITE_FLOW_REPLAY_KEY`
 * holding a key (or a whole copied console line), one more test replays it in the browser and
 * checks the phrase equals the headless replay of the same key. `INFINITE_FLOW_BROWSER_CHANNEL` runs the
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
 * Intent: a recorded (`ifk1.`, `ifk2.` or `ifk3.`) key's raw tuple, read Node-side without the codec, so
 * the slice's coverage is checked on what the key itself holds.
 */
function recordedTuple(key: string): readonly unknown[] {
  const payload = JSON.parse(
    Buffer.from(key.slice(key.indexOf('.') + 1), 'base64url').toString('utf8'),
  ) as unknown
  if (!Array.isArray(payload)) throw new Error(`Replay key payload is not a tuple: ${key}`)
  return payload
}

/**
 * Intent: what a recorded key's tuple names: its version, profile (an `ifk3.` key holds levels,
 * no profile), instrument kind and carry-in.
 */
function coverageOf(key: string): readonly string[] {
  const tuple = recordedTuple(key)
  if (key.startsWith('ifk3.')) {
    return [
      'ifk3',
      tuple[6] === null ? 'built-in' : 'my-instrument',
      tuple[5] === null ? 'standalone' : 'carry-in',
    ]
  }
  return [
    key.slice(0, key.indexOf('.')),
    String(tuple[3]),
    key.startsWith('ifk2.') ? 'my-instrument' : 'built-in',
    tuple[6] === null ? 'standalone' : 'carry-in',
  ]
}

/**
 * Intent: replay each case in the browser, as recorded and as its `ifk4.` re-encoding, and expect
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
    expect(reEncoded.startsWith('ifk4.'), corpusCase.label).toBe(true)
    expect(await replayKeyInBrowser(page, reEncoded), `${corpusCase.label} as ifk4`).toEqual({
      kind: 'timeline',
      timeline: stored,
    })
  }
}

/** The v3.0 corpus slice: 12 cases, ifk1 and ifk2, Neutral and Jazz, standalone and carry-in. */
const V30_SLICE = everyNth(readCorpusCases('v3.0-neutral-jazz.json'), 19)
/** The v2.0 corpus slice: 6 ifk1 cases, Neutral and Jazz, a carry-in one among them. */
const V20_SLICE = everyNth(readCorpusCases('ifk1-v2.0.json'), 17)
/** The v3.1 corpus slice: 10 ifk3 cases, built-in and my instrument, standalone and carry-in. */
const V31_SLICE = everyNth(readCorpusCases('v3.1-corpus.json'), 25)

/** Generous per-test timeout: each slice replays in about a second in Chromium. */
const SLICE_TIMEOUT_MS = 120_000

// @test-link [[rule_seeded_phrase_reproduction]]
// @test-link [[module_phrase_replay_key]]
test('a slice of the v3.0 replay-key corpus replays in the browser worker to its stored timelines, also as ifk4', async ({
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
test('a slice of the v2.0 replay-key corpus replays in the browser worker to its stored timelines, also as ifk4', async ({
  page,
}) => {
  test.setTimeout(SLICE_TIMEOUT_MS)
  const covered = new Set(V20_SLICE.flatMap((corpusCase) => coverageOf(corpusCase.key)))
  for (const value of ['ifk1', 'Neutral', 'Jazz', 'carry-in']) expect(covered).toContain(value)
  expect(V20_SLICE).toHaveLength(6)

  await expectSliceReplays(page, V20_SLICE)
})

// @test-link [[rule_seeded_phrase_reproduction]]
// @test-link [[module_phrase_replay_key]]
test('a slice of the v3.1 replay-key corpus replays in the browser worker to its stored timelines, also as ifk4', async ({
  page,
}) => {
  test.setTimeout(SLICE_TIMEOUT_MS)
  const covered = new Set(V31_SLICE.flatMap((corpusCase) => coverageOf(corpusCase.key)))
  for (const value of ['ifk3', 'built-in', 'my-instrument', 'standalone', 'carry-in'])
    expect(covered).toContain(value)
  expect(V31_SLICE).toHaveLength(10)

  await expectSliceReplays(page, V31_SLICE)
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
        | {
            readonly kind: 'generation_success'
            readonly result: { readonly timeline: unknown }
            readonly provenance: { readonly rhythmLockOutcome?: string }
          }
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

/** The neutral figure levels every hand-written key below holds, by figure id in their order. */
const NEUTRAL_LEVELS = {
  passingTone: 'asToday',
  accentedPassingTone: 'asToday',
  neighborTone: 'asToday',
  appoggiatura: 'off',
  diatonicEnclosure: 'off',
  chromaticApproach: 'off',
  chromaticEnclosure: 'off',
}

/** Intent: the 14 controls in the key's order: C major on the C keyboard, the given tension. */
function handControls(tension: string): readonly unknown[] {
  return [
    90,
    'C',
    'Major',
    'Gentle diatonic',
    tension,
    'Quarter',
    'Slightly varied',
    'Occasional offbeats',
    'Sparse',
    'Arch',
    'Middle',
    'Shaped',
    'Predictable',
    'c-keyboard',
  ]
}

/** Intent: one locked rhythm event, in ticks of a sixteenth. */
function event(kind: 'note' | 'rest', startTick: number, durationTicks: number, tie = false) {
  return { kind, startTick, durationTicks, tieContinuation: tie }
}

/** Intent: four quarter notes. */
function quarters() {
  return [event('note', 0, 4), event('note', 4, 4), event('note', 8, 4), event('note', 12, 4)]
}

/** The rhythm of a Build phrase, as the lock holds it once locked. */
const BUILD_BARS = [
  quarters(),
  [event('rest', 0, 4), event('note', 4, 4), event('note', 8, 4), event('note', 12, 4)],
  quarters(),
  [event('note', 0, 4), event('note', 4, 6), event('note', 10, 2), event('rest', 12, 4)],
]

/** A rhythm no Lift phrase writes (a half note, a rest, a quarter note, one tied over). */
const UNWRITTEN_BARS = [0, 1, 2, 3].map((bar) => [
  event('note', 0, 8, bar === 2),
  event('rest', 8, 4),
  event('note', 12, 4),
])

/** Every rhythm change kind the player may allow. */
const ALL_CHANGES = ['move_note_start', 'move_rest', 'split_note', 'merge_notes', 'note_rest']

/** A steering block: rhythm positions and kinds of move, no pitch. */
const STEERING = {
  targetRhythm: {
    measures: [
      [
        { tick: 0, kind: 'note' },
        { tick: 6, kind: 'rest' },
      ],
      [{ tick: 4, kind: 'note' }],
      [],
      [{ tick: 0, kind: 'note' }],
    ],
    band: 'close',
  },
  moves: [
    { direction: 'up', size: 'skip' },
    { direction: 'same' },
    { direction: 'down', size: 'step' },
  ],
  strength: 'direction',
}

/** The doodle's join into phrase 1: its last concert pitch and the Middle window, nothing else. */
const JOIN_FROM_NO_PHRASE = {
  origin: 'none',
  lastPitch: { midi: 60, arrivingInterval: null, recovery: { kind: 'settled' } },
  registerWindow: { kind: 'RegisterWindow', minMidi: 54, maxMidi: 66 },
  finalHarmony: null,
}

/** Intent: an `ifk4.` key written by hand from its nine entries. */
function handKey(
  requestId: string,
  seed: number,
  tension: string,
  carryIn: unknown,
  rhythmLock: unknown,
  steering: unknown,
): string {
  const tuple = [
    requestId,
    seed,
    handControls(tension),
    NEUTRAL_LEVELS,
    1,
    carryIn,
    null,
    rhythmLock,
    steering,
  ]
  return `ifk4.${Buffer.from(JSON.stringify(tuple), 'utf8').toString('base64url')}`
}

/** Intent: the lock group locked on these bars with these allowed changes. */
function lockedOn(bars: unknown, allowedChanges: readonly string[], tenserPhrase = false) {
  return { state: { kind: 'locked', bars }, allowedChanges, tenserPhrase }
}

/** Each hand-written key, with the lock outcome its phrase must report (none without the bars). */
const HAND_WRITTEN_KEYS: readonly {
  readonly label: string
  readonly key: string
  readonly lockOutcome: string | undefined
}[] = [
  {
    label: 'a locked phrase',
    key: handKey('rhythm-lock-Build-2', 2, 'Build', null, lockedOn(BUILD_BARS, []), null),
    lockOutcome: 'locked_bars',
  },
  {
    label: 'a changed phrase',
    key: handKey(
      'rhythm-lock-Build-10',
      10,
      'Build',
      null,
      lockedOn(BUILD_BARS, ALL_CHANGES),
      null,
    ),
    lockOutcome: 'rhythm_change',
  },
  {
    label: 'a forced bend',
    key: handKey(
      'rhythm-lock-Lift-3',
      3,
      'Lift',
      null,
      lockedOn(UNWRITTEN_BARS, ['move_rest', 'split_note'], true),
      null,
    ),
    lockOutcome: 'forced_bend',
  },
  {
    label: 'a phrase with a steering block',
    key: handKey('steering-4242', 4242, 'Settled', null, null, STEERING),
    lockOutcome: undefined,
  },
  {
    label: "a Jam's phrase 1 joining from no phrase",
    key: handKey('join-4242', 4242, 'Settled', JOIN_FROM_NO_PHRASE, null, STEERING),
    lockOutcome: undefined,
  },
]

// @test-link [[rule_seeded_phrase_reproduction]]
// @test-link [[rule_jam_and_lock_off_reproduce_earlier_phrases]]
// @test-link [[module_phrase_replay_key]]
test('hand-written ifk4 keys replay in the browser to the same phrase as the headless replay', async ({
  page,
}) => {
  test.setTimeout(SLICE_TIMEOUT_MS)
  const replay = await loadHeadlessReplay()
  await gotoWorkspaceHarness(page)
  for (const { label, key, lockOutcome } of HAND_WRITTEN_KEYS) {
    const { output } = replay.replayPhraseKey(key)
    if (output.kind === 'crash' || output.raw.kind !== 'generation_success')
      throw new Error(`${label}: the headless replay made no phrase`)
    expect(output.raw.provenance.rhythmLockOutcome, label).toBe(lockOutcome)
    expect(await replayKeyInBrowser(page, key), label).toEqual({
      kind: 'timeline',
      timeline: JSON.stringify(output.raw.result.timeline),
    })
  }
})
