/**
 * The arranger's cost page (v4.0 measurement M4, the reference phone's half): served by the
 * workspace harness's dev server only, never built. It fetches the v3.2 replay-key corpus,
 * regenerates its phrases (not timed, with a progress line), then times the arranger on them with
 * the browser's clock and shows the `ARRANGER-COST` line with the browser's user agent. A `repeats`
 * query parameter sets the passes (5 by default). Test plumbing: nothing in the app reads it.
 */

import { arrangerCostLine, measureArrangerCost } from '../../sweep/arranger-cost'
import {
  corpusArrangerPhrase,
  corpusCaseKeys,
  type CorpusArrangerPhrase,
} from '../../unit/domain/backing/accompaniment-corpus'

const output = document.querySelector<HTMLElement>('[data-arranger-cost]')
if (output === null) throw new Error('Arranger cost page: no output element.')
/** Replace the page's output text. */
const show = (text: string): void => {
  output.textContent = text
}

/** The page's repeat count from `?repeats=`, 5 by default; anything but a positive integer fails. */
function repeatCount(): number {
  const raw = new URLSearchParams(window.location.search).get('repeats')
  const repeats = raw === null ? 5 : Number(raw)
  if (!Number.isInteger(repeats) || repeats < 1) throw new Error(`repeats=${raw} is not valid.`)
  return repeats
}

/** Yield to the browser so the progress line paints. */
function nextFrame(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0))
}

/** Fetch the corpus, regenerate its phrases, time the arranger and show the result. */
async function run(): Promise<void> {
  const corpusUrl = new URL('../../fixtures/replay-keys/v3.2-corpus.json', import.meta.url)
  const response = await fetch(corpusUrl)
  if (!response.ok) throw new Error(`Corpus fetch failed: HTTP ${response.status}.`)
  const cases = corpusCaseKeys(await response.json())
  const phrases: CorpusArrangerPhrase[] = []
  for (const [index, corpusCase] of cases.entries()) {
    phrases.push(corpusArrangerPhrase(corpusCase))
    if (index % 10 === 0) {
      show(`Regenerating phrases (not timed): ${index + 1} / ${cases.length}`)
      await nextFrame()
    }
  }
  show('Timing the arranger…')
  await nextFrame()
  const summary = measureArrangerCost(phrases, () => performance.now(), repeatCount())
  show(
    `${arrangerCostLine(summary)}\nbrowser="${navigator.userAgent}"\ndate=${new Date().toISOString()}`,
  )
}

run().catch((error: unknown) => show(`Arranger cost page failed: ${String(error)}`))
