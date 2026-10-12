/**
 * The notation engraving harness entry point. PhraseScore is mounted inside a real `staff-frame`
 * with the app's own stylesheet, so below the tablet-landscape breakpoint the frame's computed
 * `max-block-size` (built from the small viewport height) is the height budget the notation layout
 * reads, exactly as in the app; the `width` URL parameter sets the frame's outer width. Three
 * sources, selected by the `source` URL parameter: `source=fixture` (the default when `source` is
 * absent) resolves a hand-built WrittenPhrase from `fixture`; `source=generated` runs a real,
 * explicit GenerationIntent through `generatePhrase`, derives its NotationPhraseInput, and
 * transforms it into a WrittenPhrase using the active instrument profile's own transposition
 * (there is no independently selectable display convention); `source=empty` mounts PhraseScore
 * with no phrase at all. Either way the engrave outcome, and a running count of successful
 * engravings, is published on `window.__notationHarness` so the Playwright notation specs can
 * assert on it without depending on internal DOM structure beyond the documented `svg.staff-svg` /
 * `g.measure-slot` marks. The generated source additionally publishes the source snapshot and a
 * `currentSnapshot` accessor. The `phrase` URL parameter sets the phrase number PhraseScore engraves
 * the phrase as (1 when absent, the phrase a session starts with); every ready state also publishes
 * each glyph's resolved note identity and the written facts the note-identity spec checks the
 * engraved tags against. The `theme` URL parameter (`light` or `dark`) sets the page's colour theme
 * the way the app's theme control does; absent, the page follows the system scheme.
 * `window.__notationHarness.setOverlays` sets PhraseScore's overlay state (start marker, playhead
 * measure, acknowledged identities; never a pitch), resolving once it is drawn and rejecting with
 * the overlay step's own error when the state names a note or measure the phrase lacks.
 * `window.__notationHarness.swapPhrase` gives PhraseScore another fixture phrase, phrase number and
 * overlay state in one tick, as a session moving to its next phrase does, resolving once the new
 * phrase is engraved with the overlays drawn on it. Every `layout-inputs` event PhraseScore emits
 * is appended to `window.__notationLayoutInputs`, and `window.__notationChecks` runs the engraver's
 * two pure pre-draw checks (a fixture's fit, a key signature's room) on the real engraver module.
 * `window.__notationSystems` (./phrase-systems.ts) draws a fixture phrase whole or one system part
 * at a time on the real engraver module, into scratch hosts, and snapshots what was drawn.
 * `window.__notationCheckNote` (./check-note.ts) draws the controller check's one written note on
 * the real engraver module into a `.check-note` host kept on the page, and snapshots it.
 *
 * A player-made instrument (my instrument) can be generated for and engraved: with
 * `source=generated`, `myLow` and `myHigh` (its written range, as MIDI notes) build one with the
 * real `makeMyInstrument` on the C MIDI keyboard template, transposed by `myOctaves` and
 * `mySemitones` (default 0 each) in `myDirection` (`lower`, `same` or `higher`; default `same`).
 * The controls then name `my-instrument` and its profile is handed to `createGenerationIntent` as
 * data; `profile` must be absent. The staff's shared system-position size is then the one
 * `planSystemPositionUnits` gives for its written range. With any source, `savedRange=<low>-<high>`
 * (written MIDI notes) sets that size from a saved my instrument's written range while the phrase's
 * own instrument (a built-in, or a fixture's) is engraved. Without either, PhraseScore gets no
 * size and draws the built-in one, as before. Every ready state publishes the size it engraved with
 * (`systemPositionUnits`) and the staff's top line placed in it.
 */
import { createApp, h, nextTick, ref, shallowRef, type Ref } from 'vue'

import {
  makeGenerationControls,
  ARPEGGIO_CHAOS_VALUES,
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
import { MY_INSTRUMENT_ID } from '@/domain/profile/instrument-profiles'
import { makeMyInstrument, type MyInstrument } from '@/domain/profile/my-instrument'
import type { MyInstrumentDirection } from '@/domain/profile/transposition-interval'
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
import {
  NOTATION_SYSTEM_POSITION_UNITS,
  planStaffPlacement,
  planSystemPositionUnits,
} from '@/notation/notation-layout-policy'
import type { StaffLayoutInputs } from '@/notation/staff-fit-types'
import { loadVexflowEngraver, type VexflowEngraverModule } from '@/notation/vexflow-engraver-loader'
import { resolveGlyphIdentities } from '@/notation/note-identity'
import { NO_SCORE_OVERLAYS, ScoreOverlayError, type ScoreOverlays } from '@/notation/score-overlays'
import '@/styles/index.css'
import { resolveFixture } from './fixtures'
import { notationCheckNoteHook } from './check-note'
import { notationSystemsHook } from './phrase-systems'

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

/** The overlay state PhraseScore is given; `setOverlays` replaces it. */
const overlaysRef = shallowRef<ScoreOverlays>(NO_SCORE_OVERLAYS)
/** The overlay error PhraseScore threw since the last `setOverlays` call, if any. */
let overlayFailure: ScoreOverlayError | null = null
/** The phrase PhraseScore engraves (none for `source=empty`); `swapPhrase` replaces it. */
let phraseRef: Ref<WrittenPhrase | null> | null = null
/** The phrase number PhraseScore engraves the phrase as; `swapPhrase` replaces it. */
const phraseNumberRef = ref(1)
/**
 * The shared system-position size PhraseScore is given: null (its built-in size) unless the URL
 * names a player-made instrument or a saved range.
 */
let systemPositionUnits: number | null = null
/** The pending `swapPhrase` call, settled by the next engraving outcome. */
let engraveWaiter: { resolve: () => void; reject: (error: NotationError) => void } | null = null

/**
 * Intent: give PhraseScore a new overlay state and settle once it is drawn: after Vue's update
 * (PhraseScore draws in its watcher) and the next frame. Rejects with the ScoreOverlayError the
 * draw threw, which Vue routes to the app's error handler rather than to this caller.
 */
async function setOverlays(overlays: ScoreOverlays): Promise<void> {
  overlayFailure = null
  overlaysRef.value = overlays
  await nextTick()
  await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))
  const failure = overlayFailure
  overlayFailure = null
  if (failure !== null) throw failure
}

/**
 * Intent: give PhraseScore a new phrase (a fixture), phrase number and overlay state in the same
 * tick, and settle once the new phrase is engraved with the overlays drawn on it. Rejects with the
 * ScoreOverlayError any overlay draw threw meanwhile, or with the NotationError the engraving hit.
 */
async function swapPhrase(
  fixtureName: string,
  phraseNumber: number,
  overlays: ScoreOverlays,
): Promise<void> {
  if (phraseRef === null) throw new Error('Notation harness swapped a phrase before mounting.')
  if (engraveWaiter !== null) throw new Error('Notation harness swaps one phrase at a time.')
  overlayFailure = null
  const engraved = new Promise<void>((resolve, reject) => {
    engraveWaiter = { resolve, reject }
  })
  phraseRef.value = resolveFixture(fixtureName)
  phraseNumberRef.value = phraseNumber
  overlaysRef.value = overlays
  await engraved
  const failure = overlayFailure
  overlayFailure = null
  if (failure !== null) throw failure
}

/** Intent: settle the pending `swapPhrase` call, if any, with an engraving outcome. */
function settleEngraveWaiter(error: NotationError | null): void {
  const waiter = engraveWaiter
  engraveWaiter = null
  if (waiter === null) return
  if (error === null) waiter.resolve()
  else waiter.reject(error)
}

/**
 * Intent: the written facts of every glyph, measure by measure, that decide which tagged parts
 * its engraving must carry (a stem unless whole, a flag if unbeamed and flagged, its accidental,
 * its dot).
 */
function glyphFacts(phrase: WrittenPhrase): NotationHarnessGlyphFact[][] {
  return phrase.measures.map((measure) =>
    measure.events.map((event, glyphIndex) => ({
      kind: event.kind,
      value: event.duration.value,
      dots: event.duration.dots,
      accidental: event.kind === 'note' && event.accidental !== null,
      beamed: measure.beamGroups.some((group) => group.includes(glyphIndex)),
      tieFromPrevious: event.kind === 'note' && event.tieFromPrevious,
    })),
  )
}

/**
 * Intent: mount PhraseScore inside a real `staff-frame` against a reactive phrase, as phrase
 * `phraseNumber`, publishing every lifecycle event.
 */
function mountPhraseScore(
  phrase: WrittenPhrase | null,
  phraseNumber: number,
  extras: GeneratedExtras,
): void {
  const shown = ref(phrase) as Ref<WrittenPhrase | null>
  phraseRef = shown
  phraseNumberRef.value = phraseNumber
  const app = createApp({
    render: () =>
      h('div', { class: 'staff-frame' }, [
        h(PhraseScore, {
          phrase: shown.value,
          phraseNumber: phraseNumberRef.value,
          overlays: overlaysRef.value,
          systemPositionUnits,
          onLayoutInputs: (inputs: StaffLayoutInputs) => {
            window.__notationLayoutInputs.push(inputs)
          },
          onEngraved: (payload: EngravedPayload) => {
            const engravedPhrase = shown.value
            if (engravedPhrase === null) throw new Error('PhraseScore engraved with no phrase.')
            engraveCount += 1
            const engravedSize = systemPositionUnits ?? NOTATION_SYSTEM_POSITION_UNITS
            window.__notationHarness = {
              state: 'ready',
              engraved: payload,
              engraveCount,
              layoutInputsBeforeEngrave: window.__notationLayoutInputs.length,
              systemPositionUnits: engravedSize,
              staffTopLineUnits: planStaffPlacement(engravedPhrase.writtenRange, engravedSize)
                .staffTopLineUnits,
              glyphIdentities: resolveGlyphIdentities(engravedPhrase, phraseNumberRef.value),
              glyphFacts: glyphFacts(engravedPhrase),
              setOverlays,
              swapPhrase,
              ...extras,
            }
            settleEngraveWaiter(null)
          },
          onNotationError: (error: NotationError) => {
            window.__notationHarness = {
              state: 'error',
              errorCode: error.code,
              errorDetails: error.details,
              engraveCount,
              ...extras,
            }
            settleEngraveWaiter(error)
          },
        }),
      ]),
  })
  // An overlay error thrown in PhraseScore's watcher reaches only the app's error handler: keep it
  // for the pending `setOverlays` call. Any other error is logged, as Vue does by default.
  app.config.errorHandler = (error) => {
    if (error instanceof ScoreOverlayError) {
      overlayFailure = error
      return
    }
    console.error(error)
  }
  const container = document.getElementById('app')
  if (!container) throw new Error('Notation harness is missing its #app mount element.')
  app.mount(container)
}

/**
 * Intent: read an optional URL parameter that has a documented harness default (used only for the
 * contour, leapiness and arpeggio chaos the calibration sweep varies; every other control is
 * required).
 */
function optionalParam(params: URLSearchParams, name: string, harnessDefault: string): string {
  return params.get(name) ?? harnessDefault
}

/**
 * Intent: read a URL parameter that must be a whole number, crashing on anything else; a missing
 * one takes the harness default, or crashes when there is none (null).
 */
function wholeNumberParam(
  params: URLSearchParams,
  name: string,
  harnessDefault: string | null,
): number {
  const text =
    harnessDefault === null
      ? requireParam(params, name)
      : optionalParam(params, name, harnessDefault)
  const value = Number(text)
  if (text.trim() === '' || !Number.isInteger(value)) {
    throw new Error(`Notation harness \`${name}\` must be a whole number, got "${text}".`)
  }
  return value
}

/**
 * Intent: read `<low>-<high>` (two whole written MIDI notes) from a URL parameter, crashing on any
 * other shape.
 */
function writtenRangeParam(
  params: URLSearchParams,
  name: string,
): { minMidi: number; maxMidi: number } {
  const text = requireParam(params, name)
  const match = /^(\d+)-(\d+)$/.exec(text)
  if (match === null) {
    throw new Error(`Notation harness \`${name}\` must be <low>-<high> MIDI notes, got "${text}".`)
  }
  return { minMidi: Number(match[1]), maxMidi: Number(match[2]) }
}

/**
 * Intent: the player-made instrument the URL describes (`myLow`, `myHigh`, `myOctaves`,
 * `mySemitones`, `myDirection`), built with the real `makeMyInstrument` on the C MIDI keyboard
 * template; null when the URL names none. A partial or invalid description crashes.
 */
function readMyInstrument(params: URLSearchParams): MyInstrument | null {
  const names = ['myLow', 'myHigh', 'myOctaves', 'mySemitones', 'myDirection']
  if (names.every((name) => params.get(name) === null)) return null
  const direction = optionalParam(params, 'myDirection', 'same')
  if (direction !== 'lower' && direction !== 'same' && direction !== 'higher') {
    throw new Error(
      `Notation harness \`myDirection\` must be lower, same or higher, got "${direction}".`,
    )
  }
  return makeMyInstrument({
    template: 'c-keyboard',
    name: 'Harness instrument',
    writtenRange: {
      minMidi: wholeNumberParam(params, 'myLow', null),
      maxMidi: wholeNumberParam(params, 'myHigh', null),
    },
    transposition: {
      octaves: wholeNumberParam(params, 'myOctaves', '0'),
      semitones: wholeNumberParam(params, 'mySemitones', '0'),
      direction: direction satisfies MyInstrumentDirection,
    },
  })
}

/**
 * Intent: the shared system-position size the URL sets: from the player-made instrument's written
 * range, or from `savedRange`, a saved my instrument's, whatever is engraved; null (PhraseScore's
 * built-in size) when it sets neither. Naming both is a mistyped test URL and crashes.
 */
function readSystemPositionUnits(
  params: URLSearchParams,
  myInstrument: MyInstrument | null,
): number | null {
  const saved = params.get('savedRange') === null ? null : writtenRangeParam(params, 'savedRange')
  if (myInstrument !== null && saved !== null) {
    throw new Error('Notation harness takes a player-made instrument or `savedRange`, not both.')
  }
  if (myInstrument !== null) return planSystemPositionUnits(myInstrument.writtenRange)
  if (saved !== null) return planSystemPositionUnits(saved)
  return null
}

/**
 * Intent: build the explicit, cheap-controls-free GenerationIntent for the harness's generated
 * source. Contour, leapiness and arpeggio chaos default to `Arch`, `Shaped` and `Predictable`
 * unless the URL sets them (`contour`, `leapiness`, `chaos`). For a player-made instrument the
 * controls name `my-instrument` and its profile travels beside them; `profile` must be absent.
 */
function buildHarnessIntent(
  params: URLSearchParams,
  myInstrument: MyInstrument | null,
): GenerationIntent {
  if (myInstrument !== null && params.get('profile') !== null) {
    throw new Error('Notation harness takes `profile` or a player-made instrument, not both.')
  }
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
    arpeggioChaos: validateControlValue(
      ARPEGGIO_CHAOS_VALUES,
      optionalParam(params, 'chaos', 'Predictable'),
      'chaos',
    ),
    instrumentProfileId:
      myInstrument === null
        ? validateControlValue(INSTRUMENT_PROFILE_IDS, requireParam(params, 'profile'), 'profile')
        : MY_INSTRUMENT_ID,
  })
  const seed = makeSeed(Number(requireParam(params, 'seed')))
  return createGenerationIntent({
    requestId: makeRequestId(`notation-harness-${seed}`),
    seed,
    controls,
    musicalProfile: { musicalProfile: 'Neutral', isCustom: true },
    ...(myInstrument === null ? {} : { instrumentProfile: myInstrument.profile }),
  })
}

/** Intent: run the harness's generated source end to end, publishing the source snapshot. */
function runGeneratedSource(
  params: URLSearchParams,
  phraseNumber: number,
  myInstrument: MyInstrument | null,
): void {
  const intent = buildHarnessIntent(params, myInstrument)
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

  const extras: GeneratedExtras = {
    sourceSnapshot,
    currentSnapshot: buildSnapshot,
  }

  window.__notationHarness = { state: 'pending', ...extras }
  mountPhraseScore(transformToWrittenPhrase(input), phraseNumber, extras)
}

/** Intent: run the harness's hand-built fixture source (the pre-existing, still-supported path). */
function runFixtureSource(params: URLSearchParams, phraseNumber: number): void {
  const fixtureName = requireParam(params, 'fixture')
  window.__notationHarness = { state: 'pending' }
  mountPhraseScore(resolveFixture(fixtureName), phraseNumber, {})
}

/** Intent: mount PhraseScore with no phrase, as the workspace does before its first phrase. */
function runEmptySource(phraseNumber: number): void {
  window.__notationHarness = { state: 'pending' }
  mountPhraseScore(null, phraseNumber, {})
}

/** Intent: load the real engraver module and wait for its fonts, as PhraseScore does before drawing. */
async function readyEngraver(): Promise<VexflowEngraverModule> {
  const engraver = await loadVexflowEngraver()
  await engraver.ensureNotationFonts()
  return engraver
}

/** The engraver's two pure pre-draw checks, published for the fit-check spec. */
const notationChecks: NotationHarnessChecks = {
  async planFit(fixtureName, containerWidthPx, viewport) {
    const engraver = await readyEngraver()
    return engraver.planWrittenPhraseFit(resolveFixture(fixtureName), containerWidthPx, viewport)
  },
  async planRoom(signature, containerWidthPx, viewport) {
    const engraver = await readyEngraver()
    return engraver.planStaffRoomForKey(signature, containerWidthPx, viewport)
  },
}

/**
 * Intent: apply the `theme` URL parameter: `light` or `dark` set the root's `data-theme` as the
 * app's theme control does; absent, no attribute (the system scheme); any other value is a
 * mistyped test URL and crashes.
 */
function applyThemeParam(params: URLSearchParams): void {
  const theme = params.get('theme')
  if (theme === null) return
  if (theme !== 'light' && theme !== 'dark') {
    throw new Error(`Notation harness \`theme\` must be light or dark, got "${theme}".`)
  }
  document.documentElement.dataset.theme = theme
}

window.__notationHarness = { state: 'pending' }
window.__notationLayoutInputs = []
window.__notationChecks = notationChecks
window.__notationSystems = notationSystemsHook(readyEngraver)
window.__notationCheckNote = notationCheckNoteHook(readyEngraver)

const params = new URLSearchParams(window.location.search)
applyThemeParam(params)
const widthParam = requireParam(params, 'width')
const container = document.getElementById('app')
if (!container) throw new Error('Notation harness is missing its #app mount element.')
container.style.width = `${widthParam}px`
// The idle phrase is the phrase a session starts with, phrase 1, unless the URL names another.
const phraseNumber = Number(optionalParam(params, 'phrase', '1'))
const isGenerated = params.get('source') === 'generated'
const myInstrument = readMyInstrument(params)
// A player-made instrument is generated for: only the generated source takes one.
if (myInstrument !== null && !isGenerated) {
  throw new Error('Notation harness takes a player-made instrument only with `source=generated`.')
}
systemPositionUnits = readSystemPositionUnits(params, myInstrument)

if (isGenerated) {
  runGeneratedSource(params, phraseNumber, myInstrument)
} else if (params.get('source') === 'empty') {
  runEmptySource(phraseNumber)
} else {
  runFixtureSource(params, phraseNumber)
}
