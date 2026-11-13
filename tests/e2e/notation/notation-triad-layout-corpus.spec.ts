/**
 * The triad layout guard of v3.3's seventh chord symbols: at Off, every triad layout and fit
 * verdict of the v3.2 replay-key corpus (`tests/fixtures/replay-keys/v3.2-corpus.json`, 297 `ifk4.`
 * keys, every one at seventh level Off) stays as v3.2 gives it.
 *
 * In Node, each key is decoded and replayed headless through the generation worker runtime
 * (src/generation-worker/phrase-replay.ts), and a successful outcome is turned into its written
 * phrase with `notationInputFromOutcome` and `transformToWrittenPhrase`, in the treble clef (a key
 * never carries a clef, so a my instrument's phrase, the baritone's included, is drawn in treble
 * here). A case whose outcome is no `generation_success` is skipped and counted. Each phrase is
 * then handed to the notation harness page (`window.__notationChecks.planPhrase`) at the shared
 * system-position size the app would give it: the built-in one for a built-in profile, and for a
 * my instrument the one `planSystemPositionUnits` gives its written range in treble (as if it were
 * the saved one). Recorded per case: the raw engraving units the one-system layout requires (a
 * 6000 px container) and the split layout requires (a 6000 px container with a 740 x 360
 * window's height budget), and the fit verdict at four frames: one system at 984 and 1400 px (1024
 * and 1440 px windows) and split at 700 and 728 px (740 x 360 and 768 x 360 windows), each at the
 * layout inputs PhraseScore reports for that window and frame width.
 *
 * `RECORD_TRIAD_LAYOUT=1` writes what this code gives to
 * `tests/fixtures/notation/triad-layout-corpus-v3.2.json` (recorded before chunk 14 changed how
 * chord symbols count toward a measure's width); without it, every case must deep-equal the file.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'

import { expect, test, type Page } from '@playwright/test'

test.use({ baseURL: 'http://127.0.0.1:4174' })

const CORPUS_PATH = new URL('../../fixtures/replay-keys/v3.2-corpus.json', import.meta.url)
const BASELINE_PATH = new URL(
  '../../fixtures/notation/triad-layout-corpus-v3.2.json',
  import.meta.url,
)
const RECORDING = process.env.RECORD_TRIAD_LAYOUT === '1'

/** The corpus's case count, and how many of its cases replay to no phrase (none: all succeed). */
const CORPUS_CASE_COUNT = 297
const SKIPPED_CASE_COUNT = 0

/** The container width the two layouts' required units are measured in: wide enough for any phrase. */
const WIDE_CONTAINER_PX = 6000
/** Phrases handed to the page per `page.evaluate`. */
const BATCH_SIZE = 50

/** The four frames whose fit verdict is recorded: the window and the frame width in it. */
const VERDICT_FRAMES = {
  oneSystem984: { viewport: { width: 1024, height: 800 }, frameWidth: 984, layout: 'one-system' },
  oneSystem1400: { viewport: { width: 1440, height: 800 }, frameWidth: 1400, layout: 'one-system' },
  split700: { viewport: { width: 740, height: 360 }, frameWidth: 700, layout: 'split' },
  split728: { viewport: { width: 768, height: 360 }, frameWidth: 728, layout: 'split' },
} as const

type FrameName = keyof typeof VERDICT_FRAMES

/** Intent: the URL of an app source module, loaded at run time so the e2e project never compiles it. */
function sourceUrl(path: string): string {
  return new URL(`../../../src/${path}`, import.meta.url).href
}

/** The app functions the guard calls, narrowed from the modules loaded at run time. */
interface CorpusPhraseModules {
  readonly decodePhraseReplayKey: (key: string) => {
    readonly intent: { readonly instrumentProfile: { readonly id: string } }
  }
  readonly replayDecodedPhraseKey: (
    key: string,
    decoded: unknown,
  ) => {
    readonly output:
      | { readonly kind: 'crash'; readonly name: string; readonly message: string }
      | { readonly kind: 'generation_success' | 'generation_failure'; readonly raw: unknown }
  }
  readonly notationInputFromOutcome: (outcome: unknown, intent: unknown, clef: 'treble') => unknown
  readonly transformToWrittenPhrase: (input: unknown) => {
    readonly writtenRange: { readonly minMidi: number; readonly maxMidi: number }
  }
  readonly planSystemPositionUnits: (
    instrument: {
      readonly writtenRange: { readonly minMidi: number; readonly maxMidi: number }
      readonly clef: 'treble'
    } | null,
  ) => number
}

/** Intent: load a source module and take the named functions from it, crashing if one is missing. */
async function loadFunctions(path: string, names: readonly string[]): Promise<object> {
  const loaded: unknown = await import(sourceUrl(path))
  if (typeof loaded !== 'object' || loaded === null) throw new TypeError(`${path} did not load.`)
  for (const name of names) {
    if (typeof Reflect.get(loaded, name) !== 'function') {
      throw new TypeError(`${path} does not export ${name}().`)
    }
  }
  return loaded
}

/** Intent: load the replay, notation-input, display-transform and layout-policy functions. */
async function loadCorpusPhraseModules(): Promise<CorpusPhraseModules> {
  const parts = await Promise.all([
    loadFunctions('generation-worker/phrase-replay.ts', [
      'decodePhraseReplayKey',
      'replayDecodedPhraseKey',
    ]),
    loadFunctions('domain/notation/notation-input.ts', ['notationInputFromOutcome']),
    loadFunctions('domain/notation/written-phrase.ts', ['transformToWrittenPhrase']),
    loadFunctions('notation/notation-layout-policy.ts', ['planSystemPositionUnits']),
  ])
  return Object.assign({}, ...parts) as CorpusPhraseModules
}

/** One corpus case's written phrase and the system-position size it is checked at. */
interface CorpusPhrase {
  readonly label: string
  readonly phrase: object
  readonly systemPositionUnits: number
}

/** Intent: replay every corpus case headless into its written phrase; a failed generation is skipped. */
function corpusPhrases(modules: CorpusPhraseModules): {
  readonly phrases: readonly CorpusPhrase[]
  readonly skipped: Readonly<Record<string, string>>
  readonly caseCount: number
} {
  const corpus = JSON.parse(readFileSync(CORPUS_PATH, 'utf8')) as {
    readonly cases: readonly { readonly label: string; readonly key: string }[]
  }
  const phrases: CorpusPhrase[] = []
  const skipped: Record<string, string> = {}
  for (const { label, key } of corpus.cases) {
    const decoded = modules.decodePhraseReplayKey(key)
    const { output } = modules.replayDecodedPhraseKey(key, decoded)
    if (output.kind === 'crash') throw new Error(`${label} crashed: ${output.message}`)
    if (output.kind !== 'generation_success') {
      skipped[label] = output.kind
      continue
    }
    const input = modules.notationInputFromOutcome(output.raw, decoded.intent, 'treble')
    const phrase = modules.transformToWrittenPhrase(input)
    const isMyInstrument = decoded.intent.instrumentProfile.id === 'my-instrument'
    const systemPositionUnits = modules.planSystemPositionUnits(
      isMyInstrument ? { writtenRange: phrase.writtenRange, clef: 'treble' } : null,
    )
    phrases.push({ label, phrase, systemPositionUnits })
  }
  return { phrases, skipped, caseCount: corpus.cases.length }
}

/** Intent: the layout inputs PhraseScore reports for a frame width in a window, with no phrase. */
async function frameLayoutInputs(
  page: Page,
  viewport: { readonly width: number; readonly height: number },
  frameWidth: number,
): Promise<NotationHarnessLayoutInputs> {
  await page.setViewportSize(viewport)
  await page.goto(`/?source=empty&width=${frameWidth}`)
  await page.waitForFunction(() => window.__notationLayoutInputs.length > 0)
  return page.evaluate(() => window.__notationLayoutInputs.at(-1)!)
}

/** One case's recorded triad layout. */
interface TriadLayout {
  readonly oneSystemRequiredUnits: number | null
  readonly splitRequiredUnits: number | null
  readonly verdicts: Readonly<Record<FrameName, NotationHarnessFitVerdict>>
}

/** The page-side work for one batch: the layout inputs to check each phrase at. */
interface BatchInputs {
  readonly phrases: readonly CorpusPhrase[]
  readonly wide: readonly NotationHarnessLayoutInputs[]
  readonly frames: readonly (readonly [FrameName, NotationHarnessLayoutInputs])[]
}

/** Intent: check one batch of phrases in the page: the two layouts wide, then the four frames. */
function planBatch(page: Page, inputs: BatchInputs): Promise<Record<string, TriadLayout>> {
  return page.evaluate(async ({ phrases, wide, frames }) => {
    const checks = window.__notationChecks
    const layouts: Record<string, TriadLayout> = {}
    for (const { label, phrase, systemPositionUnits } of phrases) {
      const [oneSystem, split] = await Promise.all(
        wide.map((at) =>
          checks.planPhrase(phrase, at.containerWidthPx, at.viewport, systemPositionUnits),
        ),
      )
      const verdicts: Record<string, NotationHarnessFitVerdict> = {}
      for (const [name, at] of frames) {
        const plan = await checks.planPhrase(
          phrase,
          at.containerWidthPx,
          at.viewport,
          systemPositionUnits,
        )
        verdicts[name] = plan.verdict
      }
      layouts[label] = {
        oneSystemRequiredUnits: oneSystem!.requiredUnits,
        splitRequiredUnits: split!.requiredUnits,
        verdicts: verdicts as TriadLayout['verdicts'],
      }
    }
    return layouts
  }, inputs)
}

// @test-link [[rule_seventh_chord_symbols]]
test('at Off, every triad layout and fit verdict of the v3.2 corpus stays as v3.2 gives it', async ({
  page,
}) => {
  test.setTimeout(600_000)
  const { phrases, skipped, caseCount } = corpusPhrases(await loadCorpusPhraseModules())
  expect(caseCount).toBe(CORPUS_CASE_COUNT)
  expect(Object.keys(skipped)).toHaveLength(SKIPPED_CASE_COUNT)

  const frames: [FrameName, NotationHarnessLayoutInputs][] = []
  for (const name of Object.keys(VERDICT_FRAMES) as FrameName[]) {
    const { viewport, frameWidth, layout } = VERDICT_FRAMES[name]
    const inputs = await frameLayoutInputs(page, viewport, frameWidth)
    expect(inputs.viewport.layout, name).toBe(layout)
    frames.push([name, inputs])
  }
  const splitBudget = frames.find(([name]) => name === 'split700')![1].viewport.heightBudgetPx
  const wide: NotationHarnessLayoutInputs[] = [
    {
      containerWidthPx: WIDE_CONTAINER_PX,
      viewport: { layout: 'one-system', heightBudgetPx: null },
    },
    {
      containerWidthPx: WIDE_CONTAINER_PX,
      viewport: { layout: 'split', heightBudgetPx: splitBudget },
    },
  ]

  const cases: Record<string, TriadLayout> = {}
  for (let start = 0; start < phrases.length; start += BATCH_SIZE) {
    const batch = phrases.slice(start, start + BATCH_SIZE)
    Object.assign(cases, await planBatch(page, { phrases: batch, wide, frames }))
  }
  const measured = { frames: Object.fromEntries(frames), wide, skipped, cases }

  if (RECORDING) {
    mkdirSync(new URL('.', BASELINE_PATH), { recursive: true })
    writeFileSync(BASELINE_PATH, `${JSON.stringify(measured, null, 2)}\n`)
    return
  }
  const baseline = JSON.parse(readFileSync(BASELINE_PATH, 'utf8')) as typeof measured
  expect(measured.frames).toEqual(baseline.frames)
  expect(measured.wide).toEqual(baseline.wide)
  expect(measured.skipped).toEqual(baseline.skipped)
  expect(Object.keys(measured.cases)).toEqual(Object.keys(baseline.cases))
  const moved = Object.entries(measured.cases)
    .filter(([label, layout]) => JSON.stringify(layout) !== JSON.stringify(baseline.cases[label]))
    .map(([label, layout]) => ({ label, now: layout, v32: baseline.cases[label] }))
  expect(moved).toEqual([])
})
