/**
 * The single ambient declaration of the notation harness's published state on `window`, shared by
 * the harness page (tests/e2e/notation-harness/main.ts) and every notation browser spec. It is a
 * script file with no imports so both the application and the e2e TypeScript projects can include
 * it directly without pulling each other's files into their programs.
 */

/** The harness's published state: mirrors PhraseScore's pending/ready/error lifecycle for the test. */
// @test-link [[module_notation_layout_preflight]]
interface NotationHarnessState {
  state: 'pending' | 'ready' | 'error'
  /**
   * How many successful engravings PhraseScore has reported since the page loaded, published with
   * every state (a spec resetting the state to pending may drop it until the next publish).
   */
  engraveCount?: number
  errorCode?: string
  errorDetails?: Readonly<Record<string, number>>
  engraved?: {
    staffSpacePx: number
    widthPx: number
    heightPx: number
    requiredUnits: number
    systemCount: 1 | 2
    positionBlockPx: number
  }
  /**
   * Where the phrase's instrument places the staff in its system position (engraving units from the
   * position's top edge: the staff's top line), published with every ready state.
   */
  staffTopLineUnits?: number
  /**
   * The index, among the top system's note and rest glyphs in drawing order, of phrase 1's first
   * attacked note (the one the start marker points at), or null for a phrase of rests only;
   * published with every ready state.
   */
  firstAttackGlyphIndex?: number | null
  /** Only published by the `source=generated` path: the JSON snapshot taken right after generation. */
  sourceSnapshot?: string
  /** Only published by the `source=generated` path: the same snapshot shape, recomputed now. */
  currentSnapshot?: () => string
}

interface Window {
  __notationHarness: NotationHarnessState
}
