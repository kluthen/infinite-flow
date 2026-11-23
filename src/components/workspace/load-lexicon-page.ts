/**
 * Lazy-loading boundary for the lexicon page's code (src/components/lexicon/): nothing outside it
 * may import it statically but this file (type-only imports aside, erased in the build; enforced
 * by ESLint), so neither the page nor the lexicon's words are in the first load.
 * `loadLexiconPage()` imports the page's code entry and the lexicon's words, once for the visit,
 * and reads the words through the read interface; a failed load clears the memo before
 * rethrowing, so Try again loads again, each failed file under a fresh address, since the browser
 * never fetches a failed import's address again.
 */
import type { LexiconReader } from '@/lexicon'
import { failedModuleUrl } from './load-jam-mode'

/** What the page's code entry exports: the page, its visit's state, the read interface. */
export type LexiconPageModule = typeof import('@/components/lexicon/lexicon-page-module')

/** The page's code, and the lexicon's shown entries through the read interface. */
export interface LoadedLexiconPage {
  readonly module: LexiconPageModule
  readonly reader: LexiconReader
}

/**
 * An import that, once it has failed, imports the same built file under an address the browser
 * has never failed (a `retry` query), as Jam's loader does.
 */
function retryingImport<T>(firstImport: () => Promise<T>): () => Promise<T> {
  let failedUrl: string | null = null
  let retries = 0
  return () => {
    let attempt: Promise<T>
    if (failedUrl === null) attempt = firstImport()
    else {
      retries += 1
      attempt = import(/* @vite-ignore */ `${failedUrl}?retry=${retries}`) as Promise<T>
    }
    return attempt.catch((cause: unknown) => {
      failedUrl = failedModuleUrl(cause) ?? failedUrl
      throw cause
    })
  }
}

const importPage = retryingImport(() => import('@/components/lexicon/lexicon-page-module'))
const importWords = retryingImport(() => import('virtual:lexicon-words'))

let pagePromise: Promise<LoadedLexiconPage> | null = null

/** The page's code and the lexicon's words, loaded once and shared; a failed load is retried. */
// @spec-link [[req_lexicon_page]]
// @spec-link [[module_lexicon_single_source]]
export function loadLexiconPage(): Promise<LoadedLexiconPage> {
  pagePromise ??= Promise.all([importPage(), importWords()]).then(
    ([module, words]) => ({ module, reader: module.createLexiconReader(words.default) }),
    (cause: unknown) => {
      pagePromise = null
      throw cause
    },
  )
  return pagePromise
}
