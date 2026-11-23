/**
 * The workspace's side of the lexicon page, kept small since it ships in the first load: the
 * footer's `Lexicon` opens it, loading its code once for the visit (./load-lexicon-page.ts), the
 * button showing that it loads meanwhile; a session started during the load cancels the opening,
 * and a sheet opened during it (the stale-phrase prompt included) stops it, even if closed again;
 * a failed load opens nothing and shows the notice row's lexicon notice, whose Try again loads
 * again. While the page shows, the workspace beneath is inert. Close and Escape close it, focus
 * back on `Lexicon`. Through the history seam (./lexicon-history.ts) every opening adds the page's
 * own `#lexicon` entry; Back closes the page; Close and Escape step back over the entry; Forward
 * onto it reopens the page; a load, a reload or a typed `#lexicon` has its address replaced with
 * the bare one, then the page opens and adds its entry. Wherever `Lexicon` cannot be pressed (a
 * session, count-in included, or a sheet open over the workspace), `#lexicon` reached any way
 * opens nothing, only the address being replaced.
 */
import {
  computed,
  h,
  nextTick,
  onBeforeUnmount,
  onMounted,
  ref,
  shallowRef,
  watch,
  type Component,
  type ComputedRef,
  type FunctionalComponent,
  type Ref,
} from 'vue'

import type { LexiconReader } from '@/lexicon'
import type { LexiconPageState } from '@/components/lexicon/lexicon-page-state'
import { browserLexiconHistory, type LexiconHistory } from './lexicon-history'
import { loadLexiconPage, type LoadedLexiconPage } from './load-lexicon-page'

/** What the page's host is given by the workspace. */
export interface LexiconPageHostOptions {
  /** True while a session runs, count-in included: the page cannot open. */
  readonly sessionActive: () => boolean
  /** True while a sheet is open over the workspace: the page cannot open. */
  readonly sheetOpen: () => boolean
  /** The workspace beneath, inert while the page shows. */
  readonly workspace: () => HTMLElement | null
  /** Focus the footer's `Lexicon` (the page closed). */
  readonly focusOpener: () => void
  /** Focus the lexicon notice's `Try again` (a load failed with no sheet open, the notice shown). */
  readonly focusTryAgain: () => void
  /** Focus the workspace's fallback (the notice dismissed). */
  readonly focusFallback: () => void
  /** The history seam; the browser window's own by default. */
  readonly history?: LexiconHistory
  /** The page's loader; ./load-lexicon-page.ts by default. */
  readonly load?: () => Promise<LoadedLexiconPage>
}

/** The page as the workspace renders it while it shows. */
export interface ShownLexiconPage {
  readonly component: Component
  readonly props: { readonly reader: LexiconReader; readonly state: LexiconPageState }
}

/** The page's host: whether it shows, loads or failed to load, and its openings and closings. */
export interface LexiconPageHost {
  readonly shown: Readonly<Ref<boolean>>
  readonly loading: Readonly<Ref<boolean>>
  readonly loadFailed: Readonly<Ref<boolean>>
  /** The page to render while it shows; null otherwise. */
  readonly page: ComputedRef<ShownLexiconPage | null>
  /** The page rendered while it shows, closing on its `close`; nothing otherwise. */
  readonly view: FunctionalComponent
  /** `Lexicon`, or the notice's Try again, pressed; never during a session. */
  readonly press: () => void
  /** Close or Escape: the page closes, stepping back over its entry. */
  readonly close: () => void
  /** The notice's Dismiss: the notice goes, focus to the fallback. */
  readonly dismissFailure: () => void
}

/** Host the lexicon page for the workspace. */
// @spec-link [[req_lexicon_page]]
// @spec-link [[module_lexicon_page_history_entry]]
export function useLexiconPage(options: LexiconPageHostOptions): LexiconPageHost {
  const history = options.history ?? browserLexiconHistory()
  const load = options.load ?? loadLexiconPage
  const shown = ref(false)
  const loading = ref(false)
  const loadFailed = ref(false)
  const loaded = shallowRef<LoadedLexiconPage | null>(null)
  let state: LexiconPageState | null = null
  /** Whether the opening the load serves was cancelled by a session's start. */
  let openingCancelled = false
  /** Whether a sheet opened during the load stopped the opening (spec D568). */
  let openingStopped = false

  const canOpen = (): boolean => !options.sessionActive() && !options.sheetOpen()

  /** Show the loaded page, adding its entry unless it opens on that entry (Forward). */
  function show(page: LoadedLexiconPage, addEntry: boolean): void {
    state ??= page.module.createLexiconPageState()
    if (addEntry) history.pushPageEntry()
    loadFailed.value = false
    shown.value = true
  }

  /** Open the page, loading its code first at the visit's first opening. */
  function open(addEntry: boolean): void {
    if (loaded.value !== null) return show(loaded.value, addEntry)
    if (loading.value) return
    loading.value = true
    openingCancelled = false
    openingStopped = false
    // A sheet opened while the page loads stops the opening, even one closed before the load
    // ends; a failed load still shows its notice, the focus left where it is. Watched only
    // during the load.
    const stopWatchingSheets = watch(
      options.sheetOpen,
      (sheetShown) => {
        if (sheetShown) openingStopped = true
      },
      { flush: 'sync' },
    )
    load().then(
      (page) => {
        stopWatchingSheets()
        loaded.value = page
        loading.value = false
        if (!openingCancelled && !openingStopped && canOpen()) show(page, addEntry)
      },
      () => {
        stopWatchingSheets()
        loading.value = false
        if (openingCancelled) return
        loadFailed.value = true
        // Focus on Try again, unless a sheet is open as the wait ends: focus stays in it then.
        void nextTick(() => {
          if (!options.sheetOpen()) options.focusTryAgain()
        })
      },
    )
  }

  /** The page has closed: focus back on `Lexicon` once the workspace is no longer inert. */
  function closed(): void {
    shown.value = false
    void nextTick(options.focusOpener)
  }

  /** A move of the history or the address, reconciled with the page's one entry. */
  function handleMove(): void {
    if (history.onPageEntry()) {
      // Forward onto the page's entry: it reopens, or only the address is replaced.
      if (shown.value) return
      if (canOpen()) open(false)
      else history.replaceWithBareAddress()
    } else if (history.atLexiconAddress()) {
      // `#lexicon` reached another way (typed): handled as a load at `#lexicon`.
      if (shown.value) return history.markPageEntry()
      history.replaceWithBareAddress()
      if (canOpen()) open(true)
    } else if (shown.value) closed()
  }

  // A session started while the page loads cancels the opening.
  watch(options.sessionActive, (active) => {
    if (active && loading.value) openingCancelled = true
  })

  // The workspace beneath is inert while the page shows.
  watch(shown, (isShown) => options.workspace()?.toggleAttribute('inert', isShown))

  // A load or a reload at `#lexicon`: the address replaced at once, the page opened once the
  // workspace is drawn (the saved settings are read before it is).
  const loadedAtLexicon = history.atLexiconAddress()
  if (loadedAtLexicon) history.replaceWithBareAddress()
  const stopListening = history.listen(handleMove)
  onMounted(() => {
    if (loadedAtLexicon && canOpen()) open(true)
  })
  onBeforeUnmount(stopListening)

  const page = computed(() =>
    shown.value && loaded.value !== null && state !== null
      ? {
          component: loaded.value.module.LexiconPage,
          props: { reader: loaded.value.reader, state },
        }
      : null,
  )
  /** Close or Escape: step back over the page's entry, and close. */
  const close = (): void => {
    if (history.onPageEntry()) history.stepBack()
    closed()
  }

  return {
    shown,
    loading,
    loadFailed,
    page,
    view: () =>
      page.value === null ? null : h(page.value.component, { ...page.value.props, onClose: close }),
    press: () => {
      if (options.sessionActive()) throw new Error('lexicon page: opened during a session')
      open(true)
    },
    close,
    dismissFailure: () => {
      loadFailed.value = false
      options.focusFallback()
    },
  }
}
