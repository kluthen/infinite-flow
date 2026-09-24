/**
 * The notation engraving harness entry point. Two sources, selected by the `source` URL parameter:
 * `source=fixture` (the default when `source` is absent) resolves a hand-built WrittenPhrase from
 * `fixture`; `source=generated` runs a real, explicit GenerationIntent through `generatePhrase`,
 * derives its NotationPhraseInput, and transforms it into a WrittenPhrase for `mode`. Either way
 * PhraseScore is mounted inside a fixed-width container and the engrave outcome is published on
 * `window.__notationHarness` so the Playwright notation specs can assert on it without depending on
 * internal DOM structure beyond the documented `svg.staff-svg` / `g.measure-slot` marks. The
 * generated source additionally publishes the source snapshot and a `setMode`/`currentSnapshot`
 * pair so a spec can switch display convention without re-running generation.
 */
import { createApp, h, ref, type Ref } from 'vue'

import {
  makeGenerationControls,
  PITCH_CLASSES,
  COLLECTIONS,
  NOTE_DENSITIES,
  SYNCOPATIONS,
  SILENCE_DENSITIES,
  INSTRUMENT_PROFILE_IDS,
  REGISTER_CHOICES,
  validateControlValue,
} from '@/domain/controls/generation-controls'
import {
  createGenerationIntent,
  type GenerationIntent,
} from '@/domain/generation/generation-intent'
import { makeRequestId } from '@/domain/generation/generation-request'
import { generatePhrase } from '@/domain/generation/orchestration/generation-orchestrator'
import type { GenerationOutcome } from '@/domain/generation/orchestration/orchestration-types'
import { NOTATION_MODES, type NotationMode } from '@/domain/notation/notation-mode'
import { notationInputFromOutcome } from '@/domain/notation/notation-input'
import type { NotationPhraseInput } from '@/domain/notation/written-phrase-types'
import { transformToWrittenPhrase } from '@/domain/notation/written-phrase'
import type { WrittenPhrase } from '@/domain/notation/written-phrase-types'
import { makeSeed } from '@/domain/random/seed'
import PhraseScore from '@/components/notation/PhraseScore.vue'
import type { NotationError } from '@/notation/notation-error'
import { resolveFixture } from './fixtures'

/** Extra fields the generated source publishes alongside every state transition; empty for a fixture. */
type GeneratedExtras = Pick<NotationHarnessState, 'sourceSnapshot' | 'setMode' | 'currentSnapshot'>

/** Intent: read a required URL parameter, crashing with a clear error rather than defaulting. */
function requireParam(params: URLSearchParams, name: string): string {
  const value = params.get(name)
  if (value === null) {
    throw new Error(`Notation harness requires a \`${name}\` URL parameter.`)
  }
  return value
}

/** Intent: validate a raw string as one of the closed set of notation display conventions. */
function parseMode(value: string): NotationMode {
  if (!NOTATION_MODES.includes(value as NotationMode)) {
    throw new Error(`Unknown notation mode "${value}".`)
  }
  return value as NotationMode
}

/** Intent: mount PhraseScore against a reactive phrase ref, publishing every lifecycle event. */
function mountPhraseScore(phraseRef: Ref<WrittenPhrase>, extras: GeneratedExtras): void {
  const app = createApp({
    render: () =>
      h(PhraseScore, {
        phrase: phraseRef.value,
        onEngraved: (payload: {
          staffSpacePx: number
          widthPx: number
          heightPx: number
          requiredUnits: number
          systemCount: 1 | 2
        }) => {
          window.__notationHarness = { state: 'ready', engraved: payload, ...extras }
        },
        onNotationError: (error: NotationError) => {
          window.__notationHarness = {
            state: 'error',
            errorCode: error.code,
            errorDetails: error.details,
            ...extras,
          }
        },
      }),
  })
  const container = document.getElementById('app')
  if (!container) throw new Error('Notation harness is missing its #app mount element.')
  app.mount(container)
}

/** Intent: build the explicit, cheap-controls-free GenerationIntent for the harness's generated source. */
function buildHarnessIntent(params: URLSearchParams): GenerationIntent {
  const controls = makeGenerationControls({
    tempo: 90,
    tonalCenter: validateControlValue(PITCH_CLASSES, requireParam(params, 'tonal'), 'tonal'),
    collection: validateControlValue(COLLECTIONS, requireParam(params, 'collection'), 'collection'),
    harmonicMotion: 'Gentle diatonic',
    tension: 'Settled',
    noteDensity: validateControlValue(NOTE_DENSITIES, requireParam(params, 'density'), 'density'),
    syncopation: validateControlValue(
      SYNCOPATIONS,
      requireParam(params, 'syncopation'),
      'syncopation',
    ),
    silenceDensity: validateControlValue(
      SILENCE_DENSITIES,
      requireParam(params, 'silence'),
      'silence',
    ),
    contour: 'Arch',
    register: validateControlValue(REGISTER_CHOICES, requireParam(params, 'register'), 'register'),
    leapiness: 'Shaped',
    arpeggioChaos: 'Predictable',
    instrumentProfileId: validateControlValue(
      INSTRUMENT_PROFILE_IDS,
      requireParam(params, 'profile'),
      'profile',
    ),
  })
  const seed = makeSeed(Number(requireParam(params, 'seed')))
  return createGenerationIntent({
    requestId: makeRequestId(`notation-harness-${seed}`),
    seed,
    controls,
    musicalProfile: { musicalProfile: 'Neutral', isCustom: true },
  })
}

/** Intent: run the harness's generated source end to end, publishing the source snapshot/setMode pair. */
function runGeneratedSource(params: URLSearchParams): void {
  const mode = parseMode(requireParam(params, 'mode'))
  const intent = buildHarnessIntent(params)
  const outcome: GenerationOutcome = generatePhrase(intent)
  if (outcome.kind !== 'generation_success') {
    throw new Error(`Notation harness generation failed with code "${outcome.code}".`)
  }

  const input: NotationPhraseInput = notationInputFromOutcome(outcome, intent)
  const buildSnapshot = (): string =>
    JSON.stringify({
      result: outcome.result,
      provenance: outcome.provenance,
      request: outcome.request,
      intent,
    })
  const sourceSnapshot = buildSnapshot()

  const phraseRef = ref(transformToWrittenPhrase(input, mode)) as Ref<WrittenPhrase>
  const extras: GeneratedExtras = {
    sourceSnapshot,
    currentSnapshot: buildSnapshot,
    setMode: (nextMode: NotationMode) => {
      window.__notationHarness = { state: 'pending', ...extras }
      phraseRef.value = transformToWrittenPhrase(input, nextMode)
    },
  }

  window.__notationHarness = { state: 'pending', ...extras }
  mountPhraseScore(phraseRef, extras)
}

/** Intent: run the harness's hand-built fixture source (the pre-existing, still-supported path). */
function runFixtureSource(params: URLSearchParams): void {
  const fixtureName = requireParam(params, 'fixture')
  const phraseRef = ref(resolveFixture(fixtureName)) as Ref<WrittenPhrase>
  window.__notationHarness = { state: 'pending' }
  mountPhraseScore(phraseRef, {})
}

window.__notationHarness = { state: 'pending' }

const params = new URLSearchParams(window.location.search)
const widthParam = requireParam(params, 'width')
const container = document.getElementById('app')
if (!container) throw new Error('Notation harness is missing its #app mount element.')
container.style.width = `${widthParam}px`

if (params.get('source') === 'generated') {
  runGeneratedSource(params)
} else {
  runFixtureSource(params)
}
