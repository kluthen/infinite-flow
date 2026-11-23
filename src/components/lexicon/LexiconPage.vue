<script setup lang="ts">
/**
 * The lexicon page (ui_ux screens/lexicon-page): a full-window page over the workspace that lists
 * every shown entry A to Z under its letter, with a search over the words and their other names.
 * It reads the lexicon only through the read interface it is given, and keeps what it shows in
 * the visit's state it is given, so a reopening shows it as it was left. Its bar stays at the top
 * (only its title row below bp-tablet-landscape); the page measures that part and keeps its
 * height on the view as `--lexicon-bar-block-size`, which the view's scroll padding reads, so no
 * jump target and no element focused by Tab lands under it. Focus goes to the search field on
 * open with a fine pointer, else to the title; Tab stays inside the page; Escape empties the
 * search field holding text, else closes the page, as Close does. Letters and related words jump
 * within the page, their links' own navigation cancelled.
 */
import { computed, nextTick, onBeforeUnmount, onMounted, ref, useId, watch } from 'vue'

import type { LexiconEntry, LexiconReader } from '@/lexicon'
import LexiconEntryView from './LexiconEntry.vue'
import {
  LEXICON_INTRO,
  MATCHES_TITLE,
  MENTIONS_TITLE,
  NO_MATCH_HINT,
  mentionsHintText,
  noMatchText,
  resultCountText,
  wordCountText,
} from './lexicon-page-copy'
import type { LexiconPageState } from './lexicon-page-state'
import { indexLexicon } from './lexicon-order'
import { searchLexicon } from './lexicon-search'

/** How long the typing pauses before the result count is written for screen readers. */
const RESULT_COUNT_DELAY_MS = 500

const props = withDefaults(
  defineProps<{
    /** The lexicon's shown entries, through the read interface. */
    reader: LexiconReader
    /** What the page keeps for the visit: the search, the open entries, the scroll position. */
    state: LexiconPageState
    /** Whether a fine pointer (a mouse, a trackpad) is there; the window's media query by default. */
    finePointer?: () => boolean
  }>(),
  // Default: the window's own media query (a function prop's default is itself).
  { finePointer: () => window.matchMedia('(any-pointer: fine)').matches },
)

const emit = defineEmits<{
  /** Close, or Escape outside a search field holding text. */
  close: []
}>()

const view = ref<HTMLElement | null>(null)
const bar = ref<HTMLElement | null>(null)
const barRow = ref<HTMLElement | null>(null)
const title = ref<HTMLElement | null>(null)
const searchInput = ref<HTMLInputElement | null>(null)
const letterRow = ref<HTMLElement | null>(null)
const searchId = useId()
const matchesId = useId()
const mentionsId = useId()

const index = computed(() => indexLexicon(props.reader))
const query = computed(() => props.state.query.trim())
/** The search's outcome while the field holds text; null while browsing. */
const search = computed(() => (query.value === '' ? null : searchLexicon(index.value, query.value)))

/** The id of a letter's heading ("#" has its own). */
function letterHeadingId(letter: string): string {
  return `lexicon-letter-${letter === '#' ? 'symbol' : letter.toLowerCase()}`
}

/** The props of one entry: whether it is open, the name it was found by, its related links. */
function entryProps(entry: LexiconEntry, foundBy: string | null) {
  return {
    entry,
    open: props.state.openIds.includes(entry.id),
    foundBy,
    related: entry.related
      .filter((id) => props.reader.entryById(id) !== null)
      .map((id) => ({ id, label: index.value.label(id) })),
  }
}

/** One element of the page, by its id; it must be there. */
function pagePart(id: string): HTMLElement {
  const part = view.value?.querySelector<HTMLElement>(`[id="${id}"]`) ?? null
  if (part === null) throw new Error(`lexicon page: #${id} is not shown`)
  return part
}

/** Jump, with no smooth scroll, so the target sits just under the bar; then focus `focus`. */
function jump(target: HTMLElement, focus: HTMLElement): void {
  target.scrollIntoView({ block: 'start', behavior: 'instant' })
  focus.focus({ preventScroll: true })
}

/** A letter chosen: the search emptied, then a jump to its heading, which takes focus. */
// @spec-link [[req_lexicon_page]]
async function chooseLetter(letter: string): Promise<void> {
  props.state.setQuery('')
  await nextTick()
  const heading = pagePart(letterHeadingId(letter))
  jump(heading, heading)
}

/** A related word followed: the search emptied, its entry opened, a jump to it, focus on its word. */
// @spec-link [[req_lexicon_page]]
async function follow(id: string): Promise<void> {
  props.state.setQuery('')
  props.state.setOpen(id, true)
  await nextTick()
  const entry = pagePart(`lexicon-${id}`)
  const word = entry.querySelector<HTMLElement>('.lexicon-word')
  if (word === null) throw new Error(`lexicon page: the entry ${id} has no word`)
  jump(entry, word)
}

/** `Letters`: a jump back to the letter row, focus on its first letter with words. */
function jumpToLetterRow(): void {
  const row = letterRow.value
  const first = row?.querySelector<HTMLElement>('a.lexicon-letter') ?? null
  if (row === null || first === null) throw new Error('lexicon page: the letter row is not shown')
  jump(row, first)
}

/** `Clear search`: the field emptied, focus in it. */
async function clearSearch(): Promise<void> {
  props.state.setQuery('')
  await nextTick()
  searchInput.value?.focus()
}

/** The search field changed: the matches follow at once. */
function handleInput(event: Event): void {
  props.state.setQuery((event.target as HTMLInputElement).value)
}

// The result count, written once the typing pauses; emptied with the field. Emptying the field
// returns to browsing at the top of the list.
const resultCount = ref('')
let resultCountTimer: ReturnType<typeof setTimeout> | null = null
watch(query, (now, before) => {
  if (resultCountTimer !== null) clearTimeout(resultCountTimer)
  resultCountTimer = null
  if (now === '') {
    resultCount.value = ''
    if (before !== '' && view.value !== null) view.value.scrollTop = 0
    return
  }
  resultCountTimer = setTimeout(() => {
    resultCount.value = resultCountText(search.value?.matches.length ?? 0, now)
  }, RESULT_COUNT_DELAY_MS)
})

// When exactly one entry matches, it opens.
watch(search, (found) => {
  const [only] = found?.matches ?? []
  if (found?.matches.length === 1 && only !== undefined) props.state.setOpen(only.entry.id, true)
})

/** The page's tab stops in order: shown, enabled, and not inside a closed entry. */
function tabStops(): HTMLElement[] {
  if (view.value === null) throw new Error('lexicon page: the view is not rendered')
  const candidates = view.value.querySelectorAll<HTMLElement>(
    'input, button:not([disabled]), a[href], summary',
  )
  return Array.from(candidates).filter((stop) => {
    const closed = stop.closest('details:not([open])')
    if (closed !== null && stop.parentElement !== closed) return false
    return getComputedStyle(stop).display !== 'none'
  })
}

/** Tab and Shift+Tab move through the page's tab stops, wrapping at both ends. */
function cycleFocus(direction: 1 | -1): void {
  const stops = tabStops()
  const active = document.activeElement
  const at = stops.findIndex((stop) => stop === active)
  let next: HTMLElement | undefined
  if (at !== -1) next = stops[(at + direction + stops.length) % stops.length]
  else if (active !== null && view.value?.contains(active) === true) {
    // From a focus target of the page (its title, a heading, a word): the next stop after it.
    const after = (stop: HTMLElement): boolean =>
      (active.compareDocumentPosition(stop) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0
    next = direction === 1 ? stops.find(after) : [...stops].reverse().find((stop) => !after(stop))
  }
  next ??= direction === 1 ? stops[0] : stops.at(-1)
  if (next === undefined) throw new Error('lexicon page: no tab stop (Close is missing)')
  next.focus()
}

/** While the page shows: Escape empties the search field holding text, else closes; Tab is trapped. */
// @spec-link [[req_lexicon_page]]
function handleKeydown(event: KeyboardEvent): void {
  if (event.key === 'Escape') {
    event.preventDefault()
    if (document.activeElement === searchInput.value && props.state.query !== '')
      props.state.setQuery('')
    else emit('close')
  } else if (event.key === 'Tab') {
    event.preventDefault()
    cycleFocus(event.shiftKey ? -1 : 1)
  }
}

/**
 * Keep the height of the bar's part that stays at the top on the view: the whole bar, or
 * only its title row where the bar lets its rows into the view's flow (below bp-tablet-landscape).
 */
function measureBar(): void {
  if (view.value === null || bar.value === null || barRow.value === null) return
  const staying = getComputedStyle(bar.value).display === 'contents' ? barRow.value : bar.value
  const height = staying.getBoundingClientRect().height
  view.value.style.setProperty('--lexicon-bar-block-size', `${height}px`)
}
let barObserver: ResizeObserver | null = null

// On open: the bar measured and watched, the page where it was left, focus placed, keys heard.
onMounted(() => {
  measureBar()
  barObserver = new ResizeObserver(measureBar)
  if (bar.value !== null) barObserver.observe(bar.value)
  if (barRow.value !== null) barObserver.observe(barRow.value)
  if (view.value !== null) view.value.scrollTop = props.state.scrollTop
  const first = props.finePointer() ? searchInput.value : title.value
  first?.focus({ preventScroll: true })
  document.addEventListener('keydown', handleKeydown)
})

// On close: the scroll position kept for the visit, the keys and the bar no longer watched.
onBeforeUnmount(() => {
  if (view.value !== null) props.state.keepScrollTop(view.value.scrollTop)
  document.removeEventListener('keydown', handleKeydown)
  barObserver?.disconnect()
  if (resultCountTimer !== null) clearTimeout(resultCountTimer)
})
</script>

<template>
  <div
    ref="view"
    class="lexicon-view"
    role="dialog"
    aria-modal="true"
    aria-labelledby="lexicon-title"
  >
    <div ref="bar" class="lexicon-bar">
      <div ref="barRow" class="lexicon-bar-row">
        <h2 id="lexicon-title" ref="title" class="sheet-title lexicon-title" tabindex="-1">
          Lexicon
        </h2>
        <p class="sheet-hint">{{ wordCountText(index.entries.length) }}</p>
        <div class="lexicon-search" role="search">
          <label class="field-label" :for="searchId">Find a word</label>
          <input
            :id="searchId"
            ref="searchInput"
            class="text-input"
            type="search"
            autocomplete="off"
            spellcheck="false"
            :value="state.query"
            @input="handleInput"
          />
        </div>
        <button type="button" class="btn lexicon-letters-button" @click="jumpToLetterRow">
          Letters
        </button>
        <button type="button" class="btn sheet-close" @click="emit('close')">Close</button>
      </div>
      <nav ref="letterRow" class="lexicon-letters" aria-label="Letters">
        <ul>
          <li v-for="item in index.letters" :key="item.letter">
            <a
              v-if="item.hasWords"
              class="lexicon-letter"
              :href="`#${letterHeadingId(item.letter)}`"
              @click.prevent="chooseLetter(item.letter)"
              >{{ item.letter }}</a
            >
            <span v-else class="lexicon-letter is-empty">{{ item.letter }}</span>
          </li>
        </ul>
      </nav>
    </div>
    <div class="lexicon-body">
      <p class="sheet-hint">{{ LEXICON_INTRO }}</p>
      <template v-if="search === null">
        <section
          v-for="section in index.sections"
          :key="section.letter"
          class="lexicon-section"
          :aria-labelledby="letterHeadingId(section.letter)"
        >
          <h3 :id="letterHeadingId(section.letter)" class="lexicon-letter-heading" tabindex="-1">
            {{ section.letter }}
          </h3>
          <ul class="lexicon-list">
            <LexiconEntryView
              v-for="entry in section.entries"
              :key="entry.id"
              v-bind="entryProps(entry, null)"
              @toggle="state.setOpen(entry.id, $event)"
              @follow="follow"
            />
          </ul>
        </section>
      </template>
      <template v-else>
        <p class="lexicon-result-count" role="status">{{ resultCount }}</p>
        <section v-if="search.matches.length > 0" :aria-labelledby="matchesId">
          <h3 :id="matchesId" class="lexicon-matches-heading">{{ MATCHES_TITLE }}</h3>
          <ul class="lexicon-list">
            <LexiconEntryView
              v-for="match in search.matches"
              :key="match.entry.id"
              v-bind="entryProps(match.entry, match.foundBy)"
              @toggle="state.setOpen(match.entry.id, $event)"
              @follow="follow"
            />
          </ul>
        </section>
        <div v-else class="lexicon-empty">
          <p>{{ noMatchText(query) }}</p>
          <p class="sheet-hint">{{ NO_MATCH_HINT }}</p>
          <button type="button" class="btn" @click="clearSearch">Clear search</button>
        </div>
        <section
          v-if="search.mentions.length > 0"
          class="lexicon-mentions"
          :aria-labelledby="mentionsId"
        >
          <h3 :id="mentionsId">{{ MENTIONS_TITLE }}</h3>
          <p class="sheet-hint">{{ mentionsHintText(query) }}</p>
          <ul class="lexicon-list">
            <LexiconEntryView
              v-for="entry in search.mentions"
              :key="entry.id"
              v-bind="entryProps(entry, null)"
              @toggle="state.setOpen(entry.id, $event)"
              @follow="follow"
            />
          </ul>
        </section>
      </template>
    </div>
  </div>
</template>
