/**
 * The workspace's side of the Your data sheet, kept small since it ships in the first load: the
 * sheet loaded on demand (./YourDataSheet.vue, its model and its words shipping in their own
 * chunk), shown once loaded and gone once closed, and its opener, which the workspace's own
 * openers call and which the session list's `Your data` reaches through `injectOpenYourData`.
 * Where focus goes when the sheet closes is the sheet's own (it knows its opener).
 */
import {
  inject,
  provide,
  shallowRef,
  type Component,
  type InjectionKey,
  type ShallowRef,
} from 'vue'

/** The injection key of the opener the session list's `Your data` calls. */
const OPEN_YOUR_DATA: InjectionKey<() => void> = Symbol('open-your-data')

/** The sheet's host: its component while it is open, and its opening and closing. */
export interface YourDataHost {
  /** The loaded sheet while it is open; null while it is closed. */
  readonly sheet: Readonly<ShallowRef<Component | null>>
  readonly open: () => void
  readonly close: () => void
}

let sheetPromise: Promise<Component> | null = null

/**
 * Intent: the Your data sheet's component, loaded once and shared by every opening; a failed
 * import clears the memo before rethrowing, so the next opening tries again.
 */
// @spec-link [[req_your_data]]
function loadYourDataSheet(): Promise<Component> {
  sheetPromise ??= import('./YourDataSheet.vue').then(
    (loaded) => loaded.default,
    (cause: unknown) => {
      sheetPromise = null
      throw cause
    },
  )
  return sheetPromise
}

/**
 * Intent: host the sheet for the workspace, and provide its opener to the session list. Opening
 * during a session is a defect: every opener is disabled then.
 */
// @spec-link [[req_your_data]]
export function useYourData(sessionActive: () => boolean): YourDataHost {
  const sheet = shallowRef<Component | null>(null)
  /** Intent: load the sheet, then show it; never during a session. */
  const open = (): void => {
    if (sessionActive()) throw new Error('your data: opened during a session')
    void loadYourDataSheet().then((component) => {
      sheet.value = component
    })
  }
  provide(OPEN_YOUR_DATA, open)
  return {
    sheet,
    open,
    close: () => {
      sheet.value = null
    },
  }
}

/**
 * Intent: the opener the workspace provides, for the session list's `Your data`; throws at the
 * press when nothing provided it, a wiring defect.
 */
// @spec-link [[req_your_data]]
export function injectOpenYourData(): () => void {
  const open = inject(OPEN_YOUR_DATA, null)
  return () => {
    if (open === null) throw new Error('your data: no opener provided')
    open()
  }
}
