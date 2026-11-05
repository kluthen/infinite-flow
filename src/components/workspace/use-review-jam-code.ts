/**
 * Jam's code as a Jam session's Review needs it (master spec C10.9; ux D339): the doodle section
 * and the suggestion come with Jam's code, loaded on demand through its one loader
 * (./load-jam-mode.ts). Already loaded (the review of the Jam just played, or a visit where Jam
 * mode opened or a Jam session's Review loaded it), it is there at once; otherwise the Review opens
 * with it loading, and it shows once loaded. A failed load stays failed for that Review, the rest of
 * it working; the next opening of a Jam session's Review tries again. A Review of a session that
 * is no Jam loads nothing. A Jam's exports need it too, for the doodle's part of each file: an
 * export asked for while it loads waits for it to settle (ux D339, D345).
 */
import { shallowRef, watch, type Ref } from 'vue'

import type { ReviewJamCode } from '@/components/review/review-types'
import type { JamModeModule } from './load-jam-mode'

/** What the Review's Jam code is read from. */
// @spec-link [[rule_jam_code_loaded_on_demand]]
export interface ReviewJamCodeSeams {
  /**
   * The showing Review's session, by its history, when it is a Jam session; null while none shows
   * or for a session that is no Jam. A change of its Jam part (a decline, deleted played notes) is
   * the same Review.
   */
  readonly jamSession: () => object | null
  /** Jam's code if it has loaded in this visit (production: `loadedJamMode`). */
  readonly loaded: () => JamModeModule | null
  /** Load Jam's code (production: `loadJamMode`, memoized, retried after a failure). */
  readonly load: () => Promise<JamModeModule>
}

/**
 * Intent: Jam's code for the showing Review, asked for each time a Jam session's Review opens:
 * loaded at once when it already is, else loading until the load settles, a load settling for a
 * Review no longer showing changing nothing.
 */
// @spec-link [[rule_jam_code_loaded_on_demand]]
// @spec-link [[rule_review_opens_with_doodle]]
export function useReviewJamCode(seams: ReviewJamCodeSeams): Readonly<Ref<ReviewJamCode>> {
  const code = shallowRef<ReviewJamCode>({ state: 'loading' })
  let asked = 0

  watch(
    seams.jamSession,
    (session) => {
      const current = ++asked
      if (session === null) return
      const loaded = seams.loaded()
      if (loaded !== null) {
        code.value = { state: 'loaded', module: loaded }
        return
      }
      code.value = { state: 'loading' }
      seams.load().then(
        (module) => {
          if (current === asked) code.value = { state: 'loaded', module }
        },
        () => {
          if (current === asked) code.value = { state: 'failed' }
        },
      )
    },
    { immediate: true, flush: 'sync' },
  )
  return code
}

/** Jam's code once its load has settled: loaded, or unable to load. */
// @spec-link [[rule_jam_code_loaded_on_demand]]
export type SettledReviewJamCode = Exclude<ReviewJamCode, { readonly state: 'loading' }>

/**
 * Intent: Jam's code once `code` has settled, at once when it already has: what a Jam's export
 * asked for while Jam's code loads waits on, inside its own loading state, before it builds the
 * doodle's part of its file or ends with nothing built when the load failed.
 */
// @spec-link [[rule_jam_code_loaded_on_demand]]
// @spec-link [[rule_jam_exports_open_with_doodle]]
export function settledJamCode(code: Readonly<Ref<ReviewJamCode>>): Promise<SettledReviewJamCode> {
  const now = code.value
  if (now.state !== 'loading') return Promise.resolve(now)
  return new Promise((resolve) => {
    const stop = watch(
      code,
      (next) => {
        if (next.state === 'loading') return
        stop()
        resolve(next)
      },
      { flush: 'sync' },
    )
  })
}
