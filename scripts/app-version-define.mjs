import { readFileSync } from 'node:fs'

/**
 * Intent: the build-time `define` entry that injects the app's package version as the constant
 * `__APP_VERSION__`, read from package.json, so every record the app stores names the version
 * that wrote it. Throws when package.json holds no non-empty version: a build without one must
 * not run.
 *
 * @returns {{ __APP_VERSION__: string }}
 */
export function appVersionDefine() {
  /** @type {unknown} */
  const manifest = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'))
  const version =
    typeof manifest === 'object' && manifest !== null && 'version' in manifest
      ? manifest.version
      : undefined
  if (typeof version !== 'string' || version === '') {
    throw new Error('app version: package.json has no non-empty "version"')
  }
  return { __APP_VERSION__: JSON.stringify(version) }
}
