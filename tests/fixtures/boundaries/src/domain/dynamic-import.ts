/** Load a module, through a dynamic import that leaves the library set. */
export async function loadWorkspace(): Promise<unknown> {
  return import('../components/workspace/workspace-view')
}
