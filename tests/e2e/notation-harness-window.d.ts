/**
 * The single ambient declaration of the notation harness's published state on `window`, shared by
 * the harness page (tests/e2e/notation-harness/main.ts) and every notation browser spec. It is a
 * script file with no imports so both the application and the e2e TypeScript projects can include
 * it directly without pulling each other's files into their programs.
 */

/** A note identity as the harness publishes it: phrase number, measure index, event index. */
// @test-link [[module_notation_note_identity_overlays]]
interface NotationHarnessNoteIdentity {
  readonly phraseNumber: number
  readonly measureIndex: 0 | 1 | 2 | 3
  readonly eventIndex: number
}

/** The written facts of one glyph that decide which tagged parts its engraving carries. */
// @test-link [[module_notation_note_identity_overlays]]
interface NotationHarnessGlyphFact {
  readonly kind: 'note' | 'rest'
  readonly value: 'whole' | 'half' | 'quarter' | 'eighth' | 'sixteenth'
  readonly dots: 0 | 1
  readonly accidental: boolean
  readonly beamed: boolean
  readonly tieFromPrevious: boolean
}

/**
 * The overlay state the harness hands PhraseScore: notes by identity and a measure by index only.
 * There is no pitch input, so no overlay can show a note the phrase does not hold.
 */
// @test-link [[module_notation_note_identity_overlays]]
// @test-link [[rule_no_grading_or_mismatch_signal]]
interface NotationHarnessOverlays {
  readonly startMarker: NotationHarnessNoteIdentity | null
  readonly playheadMeasure: 0 | 1 | 2 | 3 | null
  readonly acknowledged: readonly NotationHarnessNoteIdentity[]
}

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
  /**
   * Every glyph's note identity, measure by measure in written-event order (the attack's identity
   * for a tie continuation, null for a rest), for the harness's phrase number; published with
   * every ready state.
   */
  glyphIdentities?: readonly (readonly (NotationHarnessNoteIdentity | null)[])[]
  /** Every glyph's written facts, in the same shape as `glyphIdentities`; published when ready. */
  glyphFacts?: readonly (readonly NotationHarnessGlyphFact[])[]
  /**
   * Sets PhraseScore's overlay state; resolves once it is drawn, rejects with the overlay error
   * (named `ScoreOverlayError`) when the state names a note or measure the phrase lacks.
   * Published with every ready state.
   */
  setOverlays?: (overlays: NotationHarnessOverlays) => Promise<void>
  /**
   * Gives PhraseScore another fixture phrase, phrase number and overlay state in one tick;
   * resolves once the new phrase is engraved with the overlays drawn, rejects with the overlay
   * error (named `ScoreOverlayError`) any draw threw meanwhile. Published with every ready state.
   */
  swapPhrase?: (
    fixtureName: string,
    phraseNumber: number,
    overlays: NotationHarnessOverlays,
  ) => Promise<void>
  /**
   * How many `layout-inputs` events PhraseScore had emitted when it reported this engraving,
   * published with every ready state.
   */
  layoutInputsBeforeEngrave?: number
  /** Only published by the `source=generated` path: the JSON snapshot taken right after generation. */
  sourceSnapshot?: string
  /** Only published by the `source=generated` path: the same snapshot shape, recomputed now. */
  currentSnapshot?: () => string
}

/** The staff's layout inputs as PhraseScore reports them (StaffLayoutInputs, serialisable). */
// @test-link [[module_idle_fit_round]]
interface NotationHarnessLayoutInputs {
  readonly containerWidthPx: number
  readonly viewport:
    | { readonly layout: 'one-system' }
    | { readonly layout: 'split'; readonly heightBudgetPx: number }
}

/** A key signature as the room check takes it (WrittenKey['signature'], serialisable). */
interface NotationHarnessKeySignature {
  readonly accidental: 'sharp' | 'flat' | null
  readonly count: 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7
  readonly letters: readonly ('C' | 'D' | 'E' | 'F' | 'G' | 'A' | 'B')[]
  readonly ionianTonic: {
    readonly letter: 'C' | 'D' | 'E' | 'F' | 'G' | 'A' | 'B'
    readonly alter: -2 | -1 | 0 | 1 | 2
  }
}

/**
 * The engraver's two pure pre-draw checks, run on the real engraver module once its fonts are
 * loaded: the fit of a fixture phrase, and the phrase-independent room for a key signature. Each
 * resolves to the check's verdict.
 */
// @test-link [[module_idle_fit_round]]
interface NotationHarnessChecks {
  planFit(
    fixtureName: string,
    containerWidthPx: number,
    viewport: NotationHarnessLayoutInputs['viewport'],
  ): Promise<{ readonly kind: string; readonly cause?: string }>
  planRoom(
    signature: NotationHarnessKeySignature,
    containerWidthPx: number,
    viewport: NotationHarnessLayoutInputs['viewport'],
  ): Promise<{ readonly kind: string; readonly cause?: string }>
}

interface Window {
  __notationHarness: NotationHarnessState
  /** Every `layout-inputs` event PhraseScore emitted since the page loaded, in order. */
  __notationLayoutInputs: NotationHarnessLayoutInputs[]
  __notationChecks: NotationHarnessChecks
}
