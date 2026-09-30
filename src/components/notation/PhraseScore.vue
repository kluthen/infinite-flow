<script lang="ts">
/** The geometry PhraseScore reports with every successful engraving. */
export interface EngravedPayload {
  readonly staffSpacePx: number
  readonly widthPx: number
  readonly heightPx: number
  readonly requiredUnits: number
  readonly systemCount: 1 | 2
  /** Each reserved system position's block size, in CSS px, the same for every phrase. */
  readonly positionBlockPx: number
}
</script>

<script setup lang="ts">
/**
 * The staff's two reserved system positions and the engraving surface that fills them. Mounted
 * inside `staff-frame` in every state, with or without a phrase, so the staff area always holds
 * both positions at one block size set from the viewport, never from a phrase. With a phrase, it
 * loads the VexFlow engraver through a lazy `import()` boundary (see
 * notation/vexflow-engraver-loader.ts), waits for notation fonts, engraves each system into a
 * hidden staging host and only swaps them into their positions once the whole phrase succeeds, so
 * a failure never leaves a partial staff on screen. A failed module load is retried on the next
 * engrave (a new phrase, a Retry, or a real change of the layout inputs). Below the tablet-landscape breakpoint the height budget is read from the frame's
 * computed `max-block-size` (built from the small viewport height) minus its padding and border.
 * It re-engraves when the phrase changes, or when the container width, the height budget or the
 * layout changes, coalesced to one check per frame; any other viewport signal, such as a browser
 * toolbar showing or hiding, leaves the staff untouched. Every successful swap is paired with an
 * accessible text description of the same written phrase (a failed or superseded engrave always
 * clears it first). The default slot is laid over the positions, for the frame's own messages.
 * The overlay state (start marker, playhead band, acknowledged notes) is drawn onto the engraved
 * SVGs once they sit in their visible positions, after every successful engraving and whenever the
 * state changes, without re-engraving; a re-engrave therefore keeps the overlays. While a new
 * phrase or phrase number waits for its engraving, the previous score is never drawn on: the
 * engraving draws the overlay state current at its swap. It reports its layout inputs (the
 * container width and the viewport) at its first measurement and whenever they really change,
 * with or without a phrase and before any engraving, so the workspace can check a phrase's fit or
 * the staff's room before it draws anything.
 */
import { onMounted, onUnmounted, ref, useId, watch } from 'vue'

import { describeWrittenPhrase, type ScoreDescription } from '@/domain/notation/score-description'
import type { WrittenPhrase } from '@/domain/notation/written-phrase-types'
import {
  NOTATION_PHONE_LAYOUT_MEDIA_QUERY,
  planStaffPositions,
  type StaffViewport,
} from '@/notation/notation-layout-policy'
import { NotationError } from '@/notation/notation-error'
import type { StaffLayoutInputs } from '@/notation/staff-fit-types'
import {
  applyScoreOverlays,
  NO_SCORE_OVERLAYS,
  type ScoreOverlays,
} from '@/notation/score-overlays'
import { loadVexflowEngraver, type VexflowEngraverModule } from '@/notation/vexflow-engraver-loader'

// @spec-link [[module_notation_layout_preflight]]
// @spec-link [[module_notation_note_identity_overlays]]
// @spec-link [[module_idle_fit_round]]
const props = withDefaults(
  defineProps<{
    phrase: WrittenPhrase | null
    /** Which phrase of the session this is (1 for the first); names its engraved notes. */
    phraseNumber: number
    /** What the session marks on the score; the idle score, with nothing drawn, by default. */
    overlays?: ScoreOverlays
  }>(),
  { overlays: () => NO_SCORE_OVERLAYS },
)

const emit = defineEmits<{
  engraved: [payload: EngravedPayload]
  'notation-error': [payload: NotationError]
  'layout-inputs': [inputs: StaffLayoutInputs]
}>()

type NotationState = 'empty' | 'pending' | 'ready' | 'error'

const state = ref<NotationState>(props.phrase === null ? 'empty' : 'pending')
const rootEl = ref<HTMLDivElement | null>(null)
const topPositionEl = ref<HTMLDivElement | null>(null)
const bottomPositionEl = ref<HTMLDivElement | null>(null)
const stagingEl = ref<HTMLDivElement | null>(null)
const positionBlockPx = ref<number | null>(null)
const description = ref<ScoreDescription | null>(null)
const descriptionId = useId()

let engraverModule: VexflowEngraverModule | null = null
let resizeObserver: ResizeObserver | null = null
let rafHandle: number | null = null
let forceNextCheck = false
let lastEngravedInputs: string | null = null
/** The layout inputs last reported through `layout-inputs`, as a comparison key. */
let lastReportedInputs: string | null = null
/** Counts the checks that reached the engraver, so a superseded one never engraves or reports. */
let latestCheck = 0
let phoneLayoutQuery: MediaQueryList | null = null
/** The system SVGs on screen, the phrase and phrase number they engrave, or null with none. */
let shownScore: {
  readonly svgs: readonly SVGSVGElement[]
  readonly phrase: WrittenPhrase
  readonly phraseNumber: number
} | null = null

/** Intent: find the enclosing `staff-frame`, whose computed style carries the height budget. */
function staffFrame(root: HTMLElement): HTMLElement {
  const frame = root.closest<HTMLElement>('.staff-frame')
  if (!frame) {
    throw new Error(
      'PhraseScore must be mounted inside a .staff-frame, which holds its height budget.',
    )
  }
  return frame
}

/**
 * Intent: read the viewport as the planner needs it. Below the breakpoint, the height budget is
 * the frame's computed `max-block-size` (viewport units already resolved to CSS px) minus its
 * block padding and border; a frame without a maximum there means the stylesheet and the notation
 * layout disagree on the breakpoint, which is a defect, not a state to paper over.
 */
function readViewport(frame: HTMLElement): StaffViewport {
  if (!window.matchMedia(NOTATION_PHONE_LAYOUT_MEDIA_QUERY).matches) return { layout: 'one-system' }
  const style = getComputedStyle(frame)
  if (style.maxBlockSize === 'none') {
    throw new Error('staff-frame has no max-block-size below the tablet-landscape breakpoint.')
  }
  const chrome = [
    style.paddingBlockStart,
    style.paddingBlockEnd,
    style.borderBlockStartWidth,
    style.borderBlockEndWidth,
  ].reduce((sum, value) => sum + parseFloat(value), 0)
  return { layout: 'split', heightBudgetPx: parseFloat(style.maxBlockSize) - chrome }
}

/** Intent: read the current layout inputs, or null before the root element exists. */
function readLayoutInputs(): StaffLayoutInputs | null {
  const root = rootEl.value
  if (!root) return null
  return { containerWidthPx: root.clientWidth, viewport: readViewport(staffFrame(root)) }
}

/** Intent: report the layout inputs through `layout-inputs` when they differ from the last report. */
function reportLayoutInputs(inputs: StaffLayoutInputs): void {
  const key = JSON.stringify(inputs)
  if (key === lastReportedInputs) return
  lastReportedInputs = key
  emit('layout-inputs', inputs)
}

/**
 * Intent: size both reserved positions for the viewport, whatever the phrase. With no room below
 * the breakpoint, the two positions share the whole budget, so the frame sits at its maximum.
 */
function sizePositions(viewport: StaffViewport): void {
  const positions = planStaffPositions(viewport)
  if (positions.kind === 'room') {
    positionBlockPx.value = positions.positionBlockPx
    return
  }
  const budget = viewport.layout === 'split' ? viewport.heightBudgetPx : 0
  positionBlockPx.value = Math.max(0, budget) / 2
}

/** Intent: clear both positions, the staging hosts and the description together. */
function clearScore(): void {
  shownScore = null
  topPositionEl.value?.replaceChildren()
  bottomPositionEl.value?.replaceChildren()
  stagingEl.value?.replaceChildren()
  description.value = null
}

/**
 * Intent: move one staged system into its position. A position already showing notes keeps its
 * `staff-content` unit and only its engraving changes, so a redraw never replays the unit's
 * entrance fade; a position that was blank gets a new unit; an empty staged host blanks it.
 */
function swapIntoPosition(position: HTMLElement, staged: HTMLElement): void {
  if (!staged.hasChildNodes()) {
    position.replaceChildren()
    return
  }
  let unit = position.querySelector<HTMLElement>(':scope > .staff-content')
  if (!unit) {
    unit = document.createElement('div')
    unit.className = 'staff-content'
    position.replaceChildren(unit)
  }
  unit.replaceChildren(...Array.from(staged.childNodes))
}

/**
 * Intent: give the top system's SVG the phrase's accessible name and description, and hide the
 * split layout's bottom system from assistive technology: the same description already covers
 * its measures, so the phrase is announced once.
 */
function labelSystems(svgs: readonly SVGSVGElement[], summary: string): void {
  svgs.forEach((svg, index) => {
    if (index === 0) {
      svg.setAttribute('aria-label', summary)
      svg.setAttribute('aria-describedby', descriptionId)
    } else {
      svg.setAttribute('aria-hidden', 'true')
    }
  })
}

/**
 * Intent: draw the current overlay state onto the systems on screen. With no engraved phrase on
 * screen, or while the score on screen is still the previous phrase or phrase number (the new
 * one's engraving is pending, as when both props change in the same tick), there is nothing to
 * draw on yet: the engraving that swaps in the current phrase calls this again, reading the state
 * then, so the latest state always lands on the score it names. An overlay naming a note or
 * measure the engraved phrase lacks is the caller's error and throws.
 */
function drawOverlays(): void {
  if (shownScore === null) return
  if (shownScore.phrase !== props.phrase || shownScore.phraseNumber !== props.phraseNumber) return
  applyScoreOverlays(shownScore.svgs, shownScore.phraseNumber, props.overlays)
}

/** Intent: engrave the current phrase with the given inputs, swapping it in on success only. */
function engrave(phrase: WrittenPhrase, inputs: StaffLayoutInputs): void {
  const top = topPositionEl.value
  const bottom = bottomPositionEl.value
  const staging = stagingEl.value
  if (!engraverModule || !top || !bottom || !staging) return

  staging.style.width = `${inputs.containerWidthPx}px`
  const stagedTop = document.createElement('div')
  const stagedBottom = document.createElement('div')
  staging.replaceChildren(stagedTop, stagedBottom)

  try {
    const result = engraverModule.engraveWrittenPhrase(
      [stagedTop, stagedBottom],
      phrase,
      props.phraseNumber,
      inputs.containerWidthPx,
      inputs.viewport,
    )
    const summary = describeWrittenPhrase(phrase)
    labelSystems(result.svgs, summary.summary)
    swapIntoPosition(top, stagedTop)
    swapIntoPosition(bottom, stagedBottom)
    staging.replaceChildren()
    description.value = summary
    state.value = 'ready'
    shownScore = { svgs: result.svgs, phrase, phraseNumber: props.phraseNumber }
    drawOverlays()
    emit('engraved', {
      staffSpacePx: result.staffSpacePx,
      widthPx: result.widthPx,
      heightPx: result.heightPx,
      requiredUnits: result.requiredUnits,
      systemCount: result.systemCount,
      positionBlockPx: result.positionBlockPx,
    })
  } catch (error) {
    if (!(error instanceof NotationError)) throw error
    clearScore()
    state.value = 'error'
    emit('notation-error', error)
  }
}

/**
 * Intent: load the lazy VexFlow engraver module and wait for its fonts exactly once, memoized in
 * `engraverModule`, returning the typed failure instead of emitting it (the caller emits only if
 * its check is still the latest). A prior failed attempt leaves `engraverModule` unset, so the
 * load is retried (and `loadVexflowEngraver` itself retries the dynamic import) on the next
 * engrave -- a phrase change, typically the one a Retry triggers, or a real change of the layout
 * inputs -- instead of engraving against a module that never loaded.
 */
async function ensureEngraverReady(): Promise<NotationError | null> {
  if (engraverModule) return null
  try {
    const loaded = await loadVexflowEngraver()
    await loaded.ensureNotationFonts()
    engraverModule = loaded
    return null
  } catch (error) {
    if (!(error instanceof NotationError)) throw error
    return error
  }
}

/**
 * Intent: report the layout inputs if they changed and resize the positions for the current
 * viewport, then engrave the phrase if it changed (`force`) or if the inputs it was last engraved
 * with did. With no phrase, clear the staff.
 * Only the latest check that got past the input comparison may engrave or report: an older one
 * still waiting for the engraver module gives way to it.
 */
async function checkLayout(force: boolean): Promise<void> {
  const inputs = readLayoutInputs()
  if (!inputs) return
  reportLayoutInputs(inputs)
  sizePositions(inputs.viewport)
  const phrase = props.phrase
  if (phrase === null) {
    lastEngravedInputs = null
    clearScore()
    state.value = 'empty'
    return
  }
  const key = JSON.stringify(inputs)
  if (!force && key === lastEngravedInputs) return
  // Claimed before the await, so a check fired meanwhile with the same inputs (the resize
  // observer's first callback, a size change from the positions themselves) does not engrave
  // twice. It stays claimed after a failed load too, so only a real input change, a new phrase or
  // a Retry tries the load again, never a signal that changed nothing (a browser toolbar).
  lastEngravedInputs = key
  const check = ++latestCheck
  const loadFailure = await ensureEngraverReady()
  if (check !== latestCheck) return
  if (loadFailure !== null) {
    state.value = 'error'
    emit('notation-error', loadFailure)
    return
  }
  // The inputs may have moved while the module loaded; engrave with the current ones.
  const current = readLayoutInputs()
  if (!current) return
  reportLayoutInputs(current)
  if (props.phrase !== phrase) return
  lastEngravedInputs = JSON.stringify(current)
  engrave(phrase, current)
}

/** Intent: coalesce bursts of resize/phrase-change triggers into one layout check per frame. */
function scheduleCheck(force: boolean): void {
  forceNextCheck = forceNextCheck || force
  if (rafHandle !== null) cancelAnimationFrame(rafHandle)
  rafHandle = requestAnimationFrame(() => {
    rafHandle = null
    const forced = forceNextCheck
    forceNextCheck = false
    void checkLayout(forced)
  })
}

/** Intent: a resize or breakpoint signal: re-check, engraving only if an input really changed. */
function handleViewportSignal(): void {
  scheduleCheck(false)
}

onMounted(async () => {
  const root = rootEl.value
  if (!root) return

  resizeObserver = new ResizeObserver(handleViewportSignal)
  resizeObserver.observe(root)
  window.addEventListener('resize', handleViewportSignal)
  phoneLayoutQuery = window.matchMedia(NOTATION_PHONE_LAYOUT_MEDIA_QUERY)
  phoneLayoutQuery.addEventListener('change', handleViewportSignal)

  await checkLayout(true)
})

watch([() => props.phrase, () => props.phraseNumber], () => scheduleCheck(true))
watch(() => props.overlays, drawOverlays, { deep: true })

onUnmounted(() => {
  resizeObserver?.disconnect()
  resizeObserver = null
  window.removeEventListener('resize', handleViewportSignal)
  phoneLayoutQuery?.removeEventListener('change', handleViewportSignal)
  phoneLayoutQuery = null
  if (rafHandle !== null) cancelAnimationFrame(rafHandle)
})
</script>

<template>
  <div ref="rootEl" class="phrase-score" :data-notation-state="state">
    <!-- The two reserved system positions: placed and sized by the notation layout, no class. -->
    <div
      ref="topPositionEl"
      data-system-position="top"
      :style="positionBlockPx === null ? undefined : { blockSize: `${positionBlockPx}px` }"
    ></div>
    <div
      ref="bottomPositionEl"
      data-system-position="bottom"
      :style="positionBlockPx === null ? undefined : { blockSize: `${positionBlockPx}px` }"
    ></div>
    <div
      ref="stagingEl"
      class="phrase-score__staging"
      aria-hidden="true"
      style="position: absolute; top: 0; left: 0; visibility: hidden; pointer-events: none"
    ></div>
    <div v-if="description" :id="descriptionId" class="score-description">
      <p>{{ description.summary }}</p>
      <ol>
        <li v-for="(measure, index) in description.measures" :key="index">{{ measure }}</li>
      </ol>
    </div>
    <div v-if="$slots.default" class="phrase-score__overlay">
      <slot />
    </div>
  </div>
</template>

<style scoped>
.phrase-score {
  width: 100%;
  position: relative;
}

.phrase-score__overlay {
  position: absolute;
  inset: 0;
  display: grid;
  align-content: center;
  justify-items: center;
  pointer-events: none;
}

.phrase-score__overlay :slotted(*) {
  pointer-events: auto;
}

.score-description {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
  border: 0;
}
</style>
