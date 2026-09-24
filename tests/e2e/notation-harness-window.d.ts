/**
 * The single ambient declaration of the notation harness's published state on `window`, shared by
 * the harness page (tests/e2e/notation-harness/main.ts) and every notation browser spec. It is a
 * script file with no imports so both the application and the e2e TypeScript projects can include
 * it directly without pulling each other's files into their programs.
 */

/**
 * The display conventions the harness can switch between; the same closed set as the domain's
 * NotationMode (src/domain/notation/notation-mode.ts), restated here to keep this file import-free.
 */
type NotationHarnessMode = 'Concert' | 'B-flat tenor' | 'E-flat alto'

/** The harness's published state: mirrors PhraseScore's pending/ready/error lifecycle for the test. */
// @test-link [[module_notation_layout_preflight]]
interface NotationHarnessState {
  state: 'pending' | 'ready' | 'error'
  errorCode?: string
  errorDetails?: Readonly<Record<string, number>>
  engraved?: {
    staffSpacePx: number
    widthPx: number
    heightPx: number
    requiredUnits: number
    systemCount: 1 | 2
  }
  /** Only published by the `source=generated` path: the JSON snapshot taken right after generation. */
  sourceSnapshot?: string
  /** Only published by the `source=generated` path: re-transform the same input into `mode`. */
  setMode?: (mode: NotationHarnessMode) => void
  /** Only published by the `source=generated` path: the same snapshot shape, recomputed now. */
  currentSnapshot?: () => string
}

interface Window {
  __notationHarness: NotationHarnessState
}
