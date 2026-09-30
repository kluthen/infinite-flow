/**
 * The workspace's rhythm-domain prewarm policy and the page-URL switch that chooses it. Kept apart
 * from create-workspace-session.ts so the production root can read the URL without pulling in the
 * session factory (which App.spec.ts replaces wholesale).
 */

/**
 * Whether the workspace posts rhythm-domain prewarms to its generation worker: `enabled` in
 * production, `disabled` for tests and latency measurements that need cold generation.
 */
// @spec-link [[service_workspace_session_flow]]
export type WorkspacePrewarmPolicy = 'enabled' | 'disabled'

/**
 * Intent: the prewarm policy a page URL's query string asks for. `?prewarm=off` disables prewarm
 * and `?prewarm=on` (or no `prewarm` parameter) enables it; any other value throws, so a mistyped
 * measurement URL never silently measures the wrong mode. This is the latency measurement seam:
 * the only way to load the production page with cold generation.
 */
// @spec-link [[service_workspace_session_flow]]
export function prewarmPolicyFromSearch(search: string): WorkspacePrewarmPolicy {
  const value = new URLSearchParams(search).get('prewarm')
  if (value === null || value === 'on') return 'enabled'
  if (value === 'off') return 'disabled'
  throw new Error(`Unknown prewarm mode "${value}" in the page URL; use "on" or "off".`)
}
