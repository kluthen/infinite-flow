// @lint-ignore-atd build plumbing: the version and commit the header shows; no business rule
/**
 * The short id of the commit the build comes from, injected at build time as `__APP_COMMIT__` (see
 * scripts/app-version-define.mjs). The header shows it beside the brand mark, after the app
 * version. It is `unknown` when the build could not tell.
 */

/**
 * Intent: the injected commit id, checked once at load: a build that injected none fails loudly
 * here instead of showing an empty build id.
 */
function checkedAppCommit(commit: unknown): string {
  if (typeof commit !== 'string' || commit === '') {
    throw new Error('app commit: __APP_COMMIT__ must be a non-empty string')
  }
  return commit
}

/** The short id of the commit the running build comes from, or `unknown`. */
export const APP_COMMIT: string = checkedAppCommit(__APP_COMMIT__)
