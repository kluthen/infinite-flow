import type { WindowWidth } from '../composables/window-width'

/** Whether the window is narrow, typed through a composable that session may not import. */
export function isNarrow(width: WindowWidth): boolean {
  return width.isNarrow()
}
