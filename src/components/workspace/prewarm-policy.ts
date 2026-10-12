/**
 * The workspace's rhythm-domain prewarm and Idle pre-generation policies and the page-URL switches
 * that choose them. Kept apart from create-workspace-session.ts so the production root can read the
 * URL without pulling in the session factory (which App.spec.ts replaces wholesale).
 */

/**
 * Intent: an on/off switch of a page URL's query string: `off` disables, `on` or no such parameter
 * enables, and any other value throws, so a mistyped measurement URL never silently measures the
 * wrong mode.
 */
function switchFromSearch(search: string, name: string): 'enabled' | 'disabled' {
  const value = new URLSearchParams(search).get(name)
  if (value === null || value === 'on') return 'enabled'
  if (value === 'off') return 'disabled'
  throw new Error(`Unknown ${name} mode "${value}" in the page URL; use "on" or "off".`)
}

/**
 * Whether the workspace posts rhythm-domain prewarms to its generation worker: `enabled` in
 * production, `disabled` for tests and latency measurements that need cold generation.
 */
// @spec-link [[module_generation_prewarm]]
export type WorkspacePrewarmPolicy = 'enabled' | 'disabled'

/**
 * Intent: the prewarm policy a page URL's query string asks for. `?prewarm=off` disables prewarm
 * and `?prewarm=on` (or no `prewarm` parameter) enables it; any other value throws, so a mistyped
 * measurement URL never silently measures the wrong mode. This is the latency measurement seam:
 * the only way to load the production page with cold generation.
 */
// @spec-link [[module_generation_prewarm]]
export function prewarmPolicyFromSearch(search: string): WorkspacePrewarmPolicy {
  return switchFromSearch(search, 'prewarm')
}

/**
 * Whether the workspace pre-generates the phrases after phrase 1 in the background at Idle:
 * `enabled` in production, `disabled` for measurements and tests that need no background work.
 */
// @spec-link [[module_idle_pregeneration_queue]]
export type WorkspacePregenerationPolicy = 'enabled' | 'disabled'

/**
 * Intent: the pre-generation policy a page URL's query string asks for. `?pregeneration=off`
 * disables it and `?pregeneration=on` (or no `pregeneration` parameter) enables it; any other
 * value throws, so a mistyped measurement URL never silently measures the wrong mode.
 */
// @spec-link [[module_idle_pregeneration_queue]]
export function pregenerationPolicyFromSearch(search: string): WorkspacePregenerationPolicy {
  return switchFromSearch(search, 'pregeneration')
}
