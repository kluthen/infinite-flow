<script setup lang="ts">
/**
 * Jam's Idle staff: `staff-frame staff-jam`, its two reserved system positions sized exactly as
 * the session's staff sizes them (./../components/notation/staff-viewport-reading.ts), the top one
 * holding one `staff-content` unit engraved as the empty system (the instrument's clef, the key
 * signature of Jam's written key and collection, 4/4), the bottom one `jam-instruction`. The empty
 * system is engraved into a hidden staging host and swapped in only once it succeeds, then redrawn
 * at once, with no fade, when the key, the collection or the instrument changes, and at the new
 * size when the container width, the viewport or the shared system-position size changes,
 * coalesced to one check per frame. A window with no room for the staff layout shows the no-room
 * sentence instead (`staff-no-room`), a failure a retry can cure the notation error
 * (`staff-error`), redrawn by `retryNotation()`. It reports each change of what it shows through
 * `staff-state`, and announces nothing.
 */
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'

import { ROOM_NOTICE_NARROW, ROOM_NOTICE_WIDE } from '@/components/notation/room-notice-copy'
import {
  readStaffViewport,
  staffPositionBlockPx,
} from '@/components/notation/staff-viewport-reading'
import { NOTATION_PHONE_LAYOUT_MEDIA_QUERY } from '@/notation/notation-layout-policy'
import type { StaffViewport } from '@/notation/notation-layout-policy'
import { NotationError } from '@/notation/notation-error'
import type { EmptySystemStaff } from '@/notation/vexflow-empty-system-engraver'
import {
  emptySystemStaffOf,
  loadEmptySystemEngraver,
  type EmptySystemEngraver,
} from './empty-system-engraving'
import type { JamStaffProps, JamStaffState } from './jam-view-types'

// @spec-link [[rule_jam_idle_shows_no_phrase]]
const props = defineProps<JamStaffProps>()

const emit = defineEmits<{
  /** What the staff shows changed: the empty system, the no-room sentence or a notation error. */
  'staff-state': [state: JamStaffState]
}>()

/** What the staff shows; null until the first engraving has settled. */
const state = ref<JamStaffState | null>(null)
const errorMessage = ref('')
const rootEl = ref<HTMLDivElement | null>(null)
const unitEl = ref<HTMLDivElement | null>(null)
const stagingEl = ref<HTMLDivElement | null>(null)
const positionBlockPx = ref<number | null>(null)

/**
 * The staff's own layout box, which the container width is measured on and messages lie over: the
 * frame's whole content width in every state, the room and error states' centring grid included.
 */
const ROOT_STYLE = 'position: relative; width: 100%'
/** Laid over both positions, centred, as the session staff lays its messages. */
const OVERLAY_STYLE =
  'position: absolute; inset: 0; display: grid; align-content: center; justify-items: center'
/** Out of sight and out of layout, where the empty system is engraved before it is swapped in. */
const STAGING_STYLE =
  'position: absolute; top: 0; left: 0; visibility: hidden; pointer-events: none'

/** The empty system's engraver, once loaded with its fonts; null until then or after a failure. */
let engraver: EmptySystemEngraver | null = null
let resizeObserver: ResizeObserver | null = null
let phoneLayoutQuery: MediaQueryList | null = null
let rafHandle: number | null = null
let forceNextCheck = false
/** The inputs and staff last engraved (or claimed for engraving), as a comparison key. */
let lastEngravedKey: string | null = null
/** Counts the checks that reached the engraver, so a superseded one never engraves or reports. */
let latestCheck = 0

/** What the empty system shows for the current settings. */
const staff = computed<EmptySystemStaff>(() => emptySystemStaffOf(props))

/** The frame's state class: `staff-jam` with the empty system, or the room or error state's. */
const frameStateClass = computed(() => {
  if (state.value === 'no-room') return 'staff-no-room'
  if (state.value === 'notation-error') return 'staff-error'
  return 'staff-jam'
})

/** Each position's block size, as the session staff's; unset before the first measurement. */
const positionStyle = computed(() =>
  positionBlockPx.value === null ? undefined : { blockSize: `${positionBlockPx.value}px` },
)

/** The layout inputs the empty system is engraved with. */
interface EmptySystemInputs {
  readonly containerWidthPx: number
  readonly viewport: StaffViewport
  readonly systemPositionUnits: number
}

/** Intent: read the current layout inputs, or null before the root element exists. */
function readInputs(): EmptySystemInputs | null {
  const root = rootEl.value
  if (!root) return null
  return {
    containerWidthPx: root.clientWidth,
    viewport: readStaffViewport(root),
    systemPositionUnits: props.systemPositionUnits,
  }
}

/** Intent: the comparison key of an engraving: its layout inputs and what it shows. */
function engravingKey(inputs: EmptySystemInputs, shown: EmptySystemStaff): string {
  return JSON.stringify({ inputs, shown })
}

/** Intent: show `next` and report it, only when it changes what the staff shows. */
function setState(next: JamStaffState): void {
  if (state.value === next) return
  state.value = next
  emit('staff-state', next)
}

/** Intent: show the notation error a retry can cure, in the session staff's words. */
// @spec-link [[module_notation_layout_preflight]]
function showNotationError(error: NotationError): void {
  errorMessage.value = error.message
  setState('notation-error')
}

/**
 * Intent: the empty system's engraver, loading it and its fonts once; the typed failure of a load
 * is returned, not thrown, so the caller reports it only if its check is still the latest.
 */
async function ensureEngraver(): Promise<EmptySystemEngraver | NotationError> {
  if (engraver !== null) return engraver
  try {
    engraver = await loadEmptySystemEngraver()
    return engraver
  } catch (error) {
    if (!(error instanceof NotationError)) throw error
    return error
  }
}

/**
 * Intent: move the staged empty system into the top position's `staff-content` unit, replacing
 * the one shown, unless a later check has superseded this one. A unit already shown keeps its
 * element and only its engraving changes; a new one is rendered first.
 */
async function swapIn(host: HTMLElement, check: number): Promise<void> {
  if (state.value !== 'shown' || unitEl.value === null) {
    setState('shown')
    await nextTick()
  }
  if (check !== latestCheck) return
  if (unitEl.value === null) throw new Error("Jam's staff: the staff-content unit is not mounted.")
  unitEl.value.replaceChildren(...Array.from(host.childNodes))
  stagingEl.value?.replaceChildren()
}

/**
 * Intent: engrave the empty system with the given inputs into a fresh staging host and swap it in
 * on success; no room shows the no-room sentence, a typed failure the notation error.
 */
// @spec-link [[rule_jam_idle_shows_no_phrase]]
async function engrave(
  engraveEmptySystem: EmptySystemEngraver,
  inputs: EmptySystemInputs,
  shown: EmptySystemStaff,
  check: number,
): Promise<void> {
  const staging = stagingEl.value
  if (!staging) return
  staging.style.width = `${inputs.containerWidthPx}px`
  const host = document.createElement('div')
  staging.replaceChildren(host)
  try {
    const result = engraveEmptySystem(
      host,
      shown,
      inputs.containerWidthPx,
      inputs.viewport,
      inputs.systemPositionUnits,
    )
    if (result.kind === 'no_room') {
      staging.replaceChildren()
      setState('no-room')
      return
    }
    // The empty system holds no notes to describe: the frame is named by the panel's title.
    result.svg.setAttribute('aria-hidden', 'true')
    await swapIn(host, check)
  } catch (error) {
    staging.replaceChildren()
    if (!(error instanceof NotationError)) throw error
    showNotationError(error)
  }
}

/**
 * Intent: size both positions for the current viewport, then engrave the empty system if what it
 * shows or its layout inputs changed since the last engraving, or when forced (a retry). Only the
 * latest check that got past the comparison may engrave or report.
 */
async function checkLayout(force: boolean): Promise<void> {
  const inputs = readInputs()
  if (!inputs) return
  positionBlockPx.value = staffPositionBlockPx(inputs.viewport, inputs.systemPositionUnits)
  const key = engravingKey(inputs, staff.value)
  if (!force && key === lastEngravedKey) return
  // Claimed before the await, so a signal that changed nothing does not engrave twice.
  lastEngravedKey = key
  const check = ++latestCheck
  const loaded = await ensureEngraver()
  if (check !== latestCheck) return
  if (loaded instanceof NotationError) {
    showNotationError(loaded)
    return
  }
  // The inputs may have moved while the engraver loaded; engrave with the current ones.
  const current = readInputs()
  if (!current) return
  positionBlockPx.value = staffPositionBlockPx(current.viewport, current.systemPositionUnits)
  lastEngravedKey = engravingKey(current, staff.value)
  await engrave(loaded, current, staff.value, check)
}

/** Intent: coalesce bursts of triggers into one layout check per frame. */
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

/** Intent: a resize, breakpoint or settings signal: re-check, engraving only on a real change. */
function handleSignal(): void {
  scheduleCheck(false)
}

/**
 * Intent: `Retry notation`: engrave the empty system again, loading the engraver again if its
 * load failed.
 */
// @spec-link [[rule_jam_idle_shows_no_phrase]]
function retryNotation(): void {
  scheduleCheck(true)
}

defineExpose({ retryNotation })

onMounted(async () => {
  const root = rootEl.value
  if (!root) return
  resizeObserver = new ResizeObserver(handleSignal)
  resizeObserver.observe(root)
  window.addEventListener('resize', handleSignal)
  phoneLayoutQuery = window.matchMedia(NOTATION_PHONE_LAYOUT_MEDIA_QUERY)
  phoneLayoutQuery.addEventListener('change', handleSignal)
  await checkLayout(true)
})

// A change of the key, the collection or the instrument (my instrument's clef and range included),
// or of the shared size, changes the comparison key: the next check redraws the empty system.
watch([staff, () => props.systemPositionUnits], handleSignal)

onUnmounted(() => {
  resizeObserver?.disconnect()
  resizeObserver = null
  window.removeEventListener('resize', handleSignal)
  phoneLayoutQuery?.removeEventListener('change', handleSignal)
  phoneLayoutQuery = null
  if (rafHandle !== null) cancelAnimationFrame(rafHandle)
  latestCheck += 1
})
</script>

<template>
  <div class="staff-frame" :class="frameStateClass" aria-labelledby="score-panel-title">
    <div ref="rootEl" :style="ROOT_STYLE">
      <!-- The two reserved system positions: placed and sized by the notation layout, no class. -->
      <div data-system-position="top" :style="positionStyle">
        <div v-if="state === 'shown'" ref="unitEl" class="staff-content"></div>
      </div>
      <div data-system-position="bottom" :style="positionStyle">
        <p v-if="frameStateClass === 'staff-jam'" class="jam-instruction">
          After the count-in, play your doodle: one to four measures. The app continues it.
        </p>
      </div>
      <div ref="stagingEl" aria-hidden="true" :style="STAGING_STYLE"></div>
      <div v-if="state === 'no-room' || state === 'notation-error'" :style="OVERLAY_STYLE">
        <!-- The stylesheet shows one no-room sentence by the notation layout's width query. -->
        <p v-if="state === 'no-room'" class="room-notice" tabindex="-1">
          <span class="room-notice-wide">{{ ROOM_NOTICE_WIDE }}</span>
          <span class="room-notice-narrow">{{ ROOM_NOTICE_NARROW }}</span>
        </p>
        <p v-else class="inline-alert alert-error">Notation error: {{ errorMessage }}</p>
      </div>
    </div>
  </div>
</template>
