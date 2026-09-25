<script setup lang="ts">
/**
 * The engraving surface a later workspace step mounts: loads the VexFlow engraver adapter through
 * a lazy `import()` boundary (see notation/vexflow-engraver-loader.ts) and waits for notation
 * fonts, engraves the given written phrase into a hidden staging element at the current container
 * width, and only swaps it into the visible slot once engraving succeeds -- so a resize or a
 * chunk-load/font/container readiness failure never leaves a partial staff system on screen. A
 * failed module load is retried automatically on the next redraw (a resize, a phrase change, or a
 * Retry re-requesting the same phrase). Redraws on container resize (coalesced to one redraw per
 * frame, and only when the observed inline size actually changed, so the swap's own height change
 * never re-triggers itself), whenever the phrase prop changes, and whenever the viewport crosses
 * the 64rem tablet-landscape breakpoint (which flips whether the two-system phone layout is
 * permitted).
 * Every successful swap is paired with an accessible text description of the same written phrase
 * (never the other way around: a failed or superseded engrave always clears it first).
 */
import { onMounted, onUnmounted, ref, useId, watch } from 'vue'

import { describeWrittenPhrase, type ScoreDescription } from '@/domain/notation/score-description'
import type { WrittenPhrase } from '@/domain/notation/written-phrase-types'
import { NOTATION_PHONE_LAYOUT_MEDIA_QUERY } from '@/notation/notation-layout-policy'
import { NotationError } from '@/notation/notation-error'
import { loadVexflowEngraver, type VexflowEngraverModule } from '@/notation/vexflow-engraver-loader'

// @spec-link [[module_notation_layout_preflight]]
const props = defineProps<{ phrase: WrittenPhrase }>()

const emit = defineEmits<{
  engraved: [
    payload: {
      staffSpacePx: number
      widthPx: number
      heightPx: number
      requiredUnits: number
      systemCount: 1 | 2
    },
  ]
  'notation-error': [payload: NotationError]
}>()

type NotationState = 'pending' | 'ready' | 'error'

const state = ref<NotationState>('pending')
const rootEl = ref<HTMLDivElement | null>(null)
const visibleEl = ref<HTMLDivElement | null>(null)
const stagingEl = ref<HTMLDivElement | null>(null)
const description = ref<ScoreDescription | null>(null)
const descriptionId = useId()

let engraverModule: VexflowEngraverModule | null = null
let resizeObserver: ResizeObserver | null = null
let rafHandle: number | null = null
let lastObservedInlineSize: number | null = null
let phoneLayoutQuery: MediaQueryList | null = null

/** Intent: engrave the current phrase at the root element's current width, swapping in on success only. */
function redraw(): void {
  const root = rootEl.value
  const visible = visibleEl.value
  const staging = stagingEl.value
  if (!engraverModule || !root || !visible || !staging) return

  const containerWidthPx = root.clientWidth
  const allowTwoSystems = window.matchMedia(NOTATION_PHONE_LAYOUT_MEDIA_QUERY).matches
  staging.style.width = `${containerWidthPx}px`

  try {
    const result = engraverModule.engraveWrittenPhrase(
      staging,
      props.phrase,
      containerWidthPx,
      allowTwoSystems,
    )
    const summary = describeWrittenPhrase(props.phrase)
    visible.replaceChildren(...Array.from(staging.childNodes))
    const svg = visible.querySelector('svg.staff-svg')
    if (svg) {
      svg.setAttribute('aria-label', summary.summary)
      svg.setAttribute('aria-describedby', descriptionId)
    }
    description.value = summary
    state.value = 'ready'
    emit('engraved', {
      staffSpacePx: result.staffSpacePx,
      widthPx: result.widthPx,
      heightPx: result.heightPx,
      requiredUnits: result.requiredUnits,
      systemCount: result.systemCount,
    })
  } catch (error) {
    if (!(error instanceof NotationError)) throw error
    staging.replaceChildren()
    visible.replaceChildren()
    description.value = null
    state.value = 'error'
    emit('notation-error', error)
  }
}

/**
 * Intent: load the lazy VexFlow engraver module and wait for its fonts exactly once, memoized in
 * `engraverModule`. A prior failed attempt leaves `engraverModule` unset, so this is retried (and
 * `loadVexflowEngraver` itself retries the dynamic import) on every subsequent call -- typically the
 * next redraw a Retry triggers -- instead of redrawing forever against a module that never loaded.
 */
async function ensureEngraverReady(): Promise<boolean> {
  if (engraverModule) return true
  try {
    const loaded = await loadVexflowEngraver()
    await loaded.ensureNotationFonts()
    engraverModule = loaded
    return true
  } catch (error) {
    if (!(error instanceof NotationError)) throw error
    state.value = 'error'
    emit('notation-error', error)
    return false
  }
}

/** Intent: ensure the engraver is ready, then redraw -- the async counterpart `scheduleRedraw` awaits. */
async function attemptRedraw(): Promise<void> {
  if (!(await ensureEngraverReady())) return
  redraw()
}

/** Intent: coalesce bursts of resize/phrase-change triggers into one redraw per animation frame. */
function scheduleRedraw(): void {
  if (rafHandle !== null) cancelAnimationFrame(rafHandle)
  rafHandle = requestAnimationFrame(() => {
    rafHandle = null
    void attemptRedraw()
  })
}

/**
 * Intent: redraw only when the container's observed inline size (width) actually changed, so the
 * swap's own block-size (height) change -- always fired to the same observer -- never feeds back
 * into another redraw of an already-correct layout.
 */
function handleResize(entries: readonly ResizeObserverEntry[]): void {
  const entry = entries[0]
  if (!entry) return
  const inlineSize = entry.contentBoxSize[0]?.inlineSize ?? entry.contentRect.width
  if (inlineSize === lastObservedInlineSize) return
  lastObservedInlineSize = inlineSize
  scheduleRedraw()
}

onMounted(async () => {
  const root = rootEl.value
  if (!root) return

  lastObservedInlineSize = root.clientWidth
  resizeObserver = new ResizeObserver(handleResize)
  resizeObserver.observe(root)

  phoneLayoutQuery = window.matchMedia(NOTATION_PHONE_LAYOUT_MEDIA_QUERY)
  phoneLayoutQuery.addEventListener('change', scheduleRedraw)

  if (await ensureEngraverReady()) redraw()
})

watch(
  () => props.phrase,
  () => scheduleRedraw(),
)

onUnmounted(() => {
  resizeObserver?.disconnect()
  resizeObserver = null
  phoneLayoutQuery?.removeEventListener('change', scheduleRedraw)
  phoneLayoutQuery = null
  if (rafHandle !== null) cancelAnimationFrame(rafHandle)
})
</script>

<template>
  <div ref="rootEl" class="staff-content" :data-notation-state="state">
    <div ref="visibleEl" class="staff-content__score"></div>
    <div
      ref="stagingEl"
      class="staff-content__staging"
      aria-hidden="true"
      style="position: absolute; top: 0; left: 0; visibility: hidden; pointer-events: none"
    ></div>
    <div v-if="description" :id="descriptionId" class="score-description">
      <p>{{ description.summary }}</p>
      <ol>
        <li v-for="(measure, index) in description.measures" :key="index">{{ measure }}</li>
      </ol>
    </div>
  </div>
</template>

<style scoped>
.staff-content {
  width: 100%;
  position: relative;
}

.staff-content__score {
  width: 100%;
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
