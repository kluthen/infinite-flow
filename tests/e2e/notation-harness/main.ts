/**
 * The notation engraving harness entry point. PhraseScore is mounted inside a real `staff-frame`
 * with the app's own stylesheet, so below the tablet-landscape breakpoint the frame's computed
 * `max-block-size` (built from the small viewport height) is the height budget the notation layout
 * reads, exactly as in the app; the `width` URL parameter sets the frame's outer width. Two sources, selected by the `source` URL parameter:
 * `source=fixture` (the default when `source` is absent) resolves a hand-built WrittenPhrase from
 * `fixture`; `source=generated` runs a real, explicit GenerationIntent through `generatePhrase`,
 * derives its NotationPhraseInput, and transforms it into a WrittenPhrase using the active
 * instrument profile's own transposition (there is no independently selectable display
 * convention). Either way the engrave outcome, and a running count of successful engravings, is
 * published on `window.__notationHarness` so the Playwright notation specs can assert
 * on it without depending on internal DOM structure beyond the documented `svg.staff-svg` /
 * `g.measure-slot` marks. The generated source additionally publishes the source snapshot and a
 * `currentSnapshot` accessor.
 */
import { createApp, h, ref, type Ref } from 'vue'

import {
  makeGenerationControls,
  CONTOURS,
  LEAPINESS_VALUES,
  PITCH_CLASSES,
  COLLECTIONS,
  NOTE_DENSITIES,
  RHYTHMIC_VARIETIES,
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
import { notationInputFromOutcome } from '@/domain/notation/notation-input'
import type { NotationPhraseInput } from '@/domain/notation/written-phrase-types'
import { transformToWrittenPhrase } from '@/domain/notation/written-phrase'
import type { WrittenPhrase } from '@/domain/notation/written-phrase-types'
import { makeSeed } from '@/domain/random/seed'
import PhraseScore, { type EngravedPayload } from '@/components/notation/PhraseScore.vue'
import type { NotationError } from '@/notation/notation-error'
import { planStaffPlacement } from '@/notation/notation-layout-policy'
import '@/styles/index.css'
import { resolveFixture } from './fixtures'

/** Extra fields the generated source publishes alongside every state transition; empty for a fixture. */
type GeneratedExtras = Pick<NotationHarnessState, 'sourceSnapshot' | 'currentSnapshot'>

/** Intent: read a required URL parameter, crashing with a clear error rather than defaulting. */
function requireParam(params: URLSearchParams, name: string): string {
  const value = params.get(name)
  if (value === null) {
    throw new Error(`Notation harness requires a \`${name}\` URL parameter.`)
  }
  return value
}

/** Successful engravings reported since the page loaded (see NotationHarnessState.engraveCount). */
let engraveCount = 0

/**
 * Intent: the index, among the phrase's glyphs in drawing order, of its first attacked note (not
 * a rest, not a tied continuation), or null when every glyph is a rest.
 */
function firstAttackGlyphIndex(phrase: WrittenPhrase): number | null {
  const index = phrase.measures
    .flatMap((measure) => measure.events)
    .findIndex((event) => event.kind === 'note' && !event.tieFromPrevious)
  return index < 0 ? null : index
}

/**
 * Intent: mount PhraseScore inside a real `staff-frame` against a reactive phrase ref, publishing
 * every lifecycle event.
 */
function mountPhraseScore(phraseRef: Ref<WrittenPhrase>, extras: GeneratedExtras): void {
  const app = createApp({
    render: () =>
      h('div', { class: 'staff-frame' }, [
        h(PhraseScore, {
          phrase: phraseRef.value,
          onEngraved: (payload: EngravedPayload) => {
            engraveCount += 1
            window.__notationHarness = {
              state: 'ready',
              engraved: payload,
              engraveCount,
              staffTopLineUnits: planStaffPlacement(phraseRef.value.writtenRange).staffTopLineUnits,
              firstAttackGlyphIndex: firstAttackGlyphIndex(phraseRef.value),
              ...extras,
            }
          },
          onNotationError: (error: NotationError) => {
            window.__notationHarness = {
              state: 'error',
              errorCode: error.code,
              errorDetails: error.details,
              engraveCount,
              ...extras,
            }
          },
        }),
      ]),
  })
  const container = document.getElementById('app')
  if (!container) throw new Error('Notation harness is missing its #app mount element.')
  app.mount(container)
}

/**
 * Intent: read an optional URL parameter that has a documented harness default (used only for the
 * contour and leapiness the calibration sweep varies; every other control is required).
 */
function optionalParam(params: URLSearchParams, name: string, harnessDefault: string): string {
  return params.get(name) ?? harnessDefault
}

/**
 * Intent: build the explicit, cheap-controls-free GenerationIntent for the harness's generated
 * source. Contour and leapiness default to `Arch` and `Shaped` unless the URL sets them.
 */
function buildHarnessIntent(params: URLSearchParams): GenerationIntent {
  const controls = makeGenerationControls({
    tempo: 90,
    tonalCenter: validateControlValue(PITCH_CLASSES, requireParam(params, 'tonal'), 'tonal'),
    collection: validateControlValue(COLLECTIONS, requireParam(params, 'collection'), 'collection'),
    harmonicMotion: 'Gentle diatonic',
    tension: 'Settled',
    noteDensity: validateControlValue(NOTE_DENSITIES, requireParam(params, 'density'), 'density'),
    rhythmicVariety: validateControlValue(
      RHYTHMIC_VARIETIES,
      requireParam(params, 'variety'),
      'variety',
    ),
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
    contour: validateControlValue(CONTOURS, optionalParam(params, 'contour', 'Arch'), 'contour'),
    register: validateControlValue(REGISTER_CHOICES, requireParam(params, 'register'), 'register'),
    leapiness: validateControlValue(
      LEAPINESS_VALUES,
      optionalParam(params, 'leapiness', 'Shaped'),
      'leapiness',
    ),
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

/** Intent: run the harness's generated source end to end, publishing the source snapshot. */
function runGeneratedSource(params: URLSearchParams): void {
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

  const phraseRef = ref(transformToWrittenPhrase(input)) as Ref<WrittenPhrase>
  const extras: GeneratedExtras = {
    sourceSnapshot,
    currentSnapshot: buildSnapshot,
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
