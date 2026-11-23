import type { HeldLayout } from '@/notation/notation-layout-policy'

/** A held layout, typed through an `@/` type-only import that leaves session and the library set. */
export function heldLayout(layout: HeldLayout): HeldLayout {
  return layout
}
