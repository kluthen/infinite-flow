/**
 * The seventh-ending renders (v3.3 listening check L1, test tooling; nothing in the app reads it):
 * short MIDI files with the real backing, each phrase as generated followed by the same phrase with
 * one note moved onto a seventh (seventh-endings-rewrite.ts), with a Markdown index beside them.
 * An **ending** file plays a phrase, then the same phrase with its final note on its final chord's
 * seventh; a **landing** file plays a pair of phrases, then the same pair with the second phrase's
 * first note on the tonic chord's seventh. The phrases are the ones it is given, from phrase replay
 * keys; given none, the hand-built demonstration below. The bytes come from the app's own
 * generated-notes MIDI encoder and backing renderer, so the backing is what the app plays under
 * those chords. `scripts/render-seventh-endings.mjs` loads this module through Vite's
 * runnerImport and writes the files.
 */

import { renderBacking } from '../../../src/domain/backing/backing-renderer'
import type { GenerationIntent } from '../../../src/domain/generation/generation-intent'
import { FOUR_FOUR_METER } from '../../../src/domain/generation/generation-request'
import { generatePhrase } from '../../../src/domain/generation/orchestration/generation-orchestrator'
import type { GenerationOutcome } from '../../../src/domain/generation/orchestration/orchestration-types'
import type { HarmonyEvent } from '../../../src/domain/harmony/harmony-types'
import { encodeGeneratedNotesMidi } from '../../../src/export/midi/midi-encoder'
import { decodePhraseReplayKey } from '../../../src/generation-worker/phrase-replay-key-decode'
import {
  buildIntent,
  carryInAfter,
  generateSuccess,
} from '../domain/generation/carry-in/carry-in-fixture'
import { withSeventh } from '../domain/harmony/seventh-chord-fixtures'
import {
  endingOnSeventh,
  landingOnSeventh,
  type MovedNote,
  type RenderPhrase,
} from './seventh-endings-rewrite'

/** What one render file is made from: one phrase for an ending, a joined pair for a landing. */
export type RenderSource =
  | { readonly kind: 'ending'; readonly name: string; readonly phrase: RenderPhrase }
  | {
      readonly kind: 'landing'
      readonly name: string
      readonly first: RenderPhrase
      readonly second: RenderPhrase
    }

/** One file to write, its path relative to the output folder. */
export interface RenderOutput {
  readonly path: string
  readonly content: Uint8Array | string
}

/** One written render: its file, its kind and the note it moved. */
export interface RenderSummary {
  readonly file: string
  readonly kind: RenderSource['kind']
  readonly name: string
  readonly moved: MovedNote
}

/** The phrase seed and the next phrase's seed of the hand-built demonstration (C major). */
const DEMO_SEED = 7
const DEMO_NEXT_SEED = 8

/** Intent: a successful outcome's phrase as the renders take it, at its intent's tempo. */
export function renderPhraseOf(intent: GenerationIntent, outcome: GenerationOutcome): RenderPhrase {
  if (outcome.kind !== 'generation_success')
    throw new Error(`The phrase did not generate: ${outcome.code}.`)
  return {
    timeline: outcome.result.timeline,
    harmony: outcome.provenance.harmony.events,
    window: outcome.request.registerWindow,
    tempo: intent.controls.tempo,
  }
}

/** Intent: the phrase a replay key reproduces, with its intent. */
function phraseOfKey(key: string): { intent: GenerationIntent; phrase: RenderPhrase } {
  const { intent } = decodePhraseReplayKey(key)
  return { intent, phrase: renderPhraseOf(intent, generatePhrase(intent)) }
}

/** Intent: an ending source from a replay key. */
export function endingFromKey(key: string, name: string): RenderSource {
  return { kind: 'ending', name, phrase: phraseOfKey(key).phrase }
}

/** Intent: a landing source from two replay keys; the second must be a phrase joined to one. */
export function landingFromKeys(firstKey: string, secondKey: string, name: string): RenderSource {
  const second = phraseOfKey(secondKey)
  if (second.intent.carryIn === undefined)
    throw new Error(`${name}: the second key is a phrase generated on its own, not a next phrase.`)
  return { kind: 'landing', name, first: phraseOfKey(firstKey).phrase, second: second.phrase }
}

/** Intent: a plan with the event at `index` in seventh form (hand-built from a generated plan). */
function seventhAt(harmony: readonly HarmonyEvent[], index: number): readonly HarmonyEvent[] {
  return harmony.map((event, at) => (at === index ? withSeventh(event) : event))
}

/**
 * Intent: the hand-built demonstration, in C major: a phrase generated at Off (seed 7) whose final
 * event is set in seventh form by hand, as an ending; and that phrase with its next phrase (seed 8,
 * joined to it), the next phrase's opening tonic set in seventh form by hand, as a landing.
 */
export function demonstrationSources(): readonly RenderSource[] {
  const intent = buildIntent({ seed: DEMO_SEED, label: 'seventh-endings' })
  const outcome = generateSuccess(intent)
  const phrase = renderPhraseOf(intent, outcome)
  const nextIntent = buildIntent({
    seed: DEMO_NEXT_SEED,
    carryIn: carryInAfter(intent, outcome, 1),
    label: 'seventh-endings',
  })
  const next = renderPhraseOf(nextIntent, generatePhrase(nextIntent))
  return [
    {
      kind: 'ending',
      name: 'demo C major ending',
      phrase: { ...phrase, harmony: seventhAt(phrase.harmony, phrase.harmony.length - 1) },
    },
    {
      kind: 'landing',
      name: 'demo C major landing',
      first: phrase,
      second: { ...next, harmony: seventhAt(next.harmony, 0) },
    },
  ]
}

/** Intent: the MIDI bytes of some phrases back to back, each over its own backing. */
function midiOf(phrases: readonly RenderPhrase[]): Uint8Array {
  return encodeGeneratedNotesMidi({
    phrases: phrases.map((phrase, index) => ({
      number: index + 1,
      timeline: phrase.timeline,
      tempo: phrase.tempo,
    })),
    backing: phrases.map((phrase, index) => {
      const { bass, chords } = renderBacking(phrase.harmony, FOUR_FOUR_METER)
      return { number: index + 1, notes: [...bass, ...chords] }
    }),
  })
}

/** Intent: a source's name as a file-name slug. */
function slug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

/** Intent: a MIDI note number as a note name with sharps, middle C (60) being C4. */
export function noteName(midi: number): string {
  const names = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
  return `${names[midi % 12]}${Math.floor(midi / 12) - 1}`
}

/** Intent: one source's file, the phrases it plays in order, and the note it moved. */
function renderOne(
  source: RenderSource,
  index: number,
): { output: RenderOutput; summary: RenderSummary } {
  const file = `${String(index + 1).padStart(2, '0')}-${source.kind}-${slug(source.name)}.mid`
  const moved =
    source.kind === 'ending' ? endingOnSeventh(source.phrase) : landingOnSeventh(source.second)
  const phrases =
    source.kind === 'ending'
      ? [source.phrase, moved.phrase]
      : [source.first, source.second, source.first, moved.phrase]
  return {
    output: { path: file, content: midiOf(phrases) },
    summary: { file, kind: source.kind, name: source.name, moved: moved.moved },
  }
}

/** Intent: the Markdown index of the renders: what each file plays, and the note it moved. */
function indexMarkdown(summaries: readonly RenderSummary[]): string {
  const lines = summaries.map(({ file, kind, name, moved }) => {
    const order =
      kind === 'ending'
        ? 'phrase 1 as generated; phrase 2 the same, its final note'
        : "phrases 1 and 2 as generated; phrases 3 and 4 the same pair, the second phrase's first note"
    return `- \`${file}\` (${name}): ${order} moved from ${noteName(moved.from)} to ${noteName(moved.to)}, on beat ${moved.beat + 1} of the phrase.`
  })
  return [
    '# Seventh-ending renders',
    '',
    'Written by `npm run render:seventh-endings` (v3.3 listening check L1). Each file plays the',
    "phrases back to back with the backing track; the moved note sits on the chord's seventh.",
    '',
    ...lines,
    '',
  ].join('\n')
}

/**
 * Intent: the render files of some sources, in order, and their Markdown index. Crashes on an
 * empty list and on any source whose move the spec does not allow (seventh-endings-rewrite.ts).
 */
export function buildSeventhEndingRenders(sources: readonly RenderSource[]): {
  readonly outputs: readonly RenderOutput[]
  readonly summaries: readonly RenderSummary[]
} {
  if (sources.length === 0) throw new Error('No phrase to render.')
  const rendered = sources.map(renderOne)
  const summaries = rendered.map(({ summary }) => summary)
  return {
    outputs: [
      ...rendered.map(({ output }) => output),
      { path: 'README.md', content: indexMarkdown(summaries) },
    ],
    summaries,
  }
}
