/**
 * The single ambient declaration of the scratch fields the workspace specs stash on `window` to
 * observe the `generation-status` live region's text transitions without racing its updates: a
 * `MutationObserver` records every text value the region takes on into `__statusLog` before an
 * action starts, so a fast generation can never skip past the check.
 */

interface Window {
  __statusLog?: string[]
}
