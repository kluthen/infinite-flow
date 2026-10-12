// @lint-ignore-atd build plumbing: the package version injected at build time; no business rule
/**
 * The version of the app, the package version injected at build time as `__APP_VERSION__` (see
 * scripts/app-version-define.mjs). Every record the app stores carries it as its `appVersion`.
 */

/**
 * Intent: the injected version, checked once at load: a build that injected no non-empty
 * version fails loudly here instead of writing records nothing could tell apart.
 */
function checkedAppVersion(version: unknown): string {
  if (typeof version !== 'string' || version === '') {
    throw new Error('app version: __APP_VERSION__ must be a non-empty string')
  }
  return version
}

/** The version of the app that is running, as package.json gives it. */
export const APP_VERSION: string = checkedAppVersion(__APP_VERSION__)
