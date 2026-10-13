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
   * The clef the engraved phrase carries and is drawn in: a built-in's and a fixture's treble, a
   * player-made instrument's its `myClef`; published with every ready state.
   */
  clef?: 'treble' | 'bass'
  /**
   * The shared system-position size the phrase was engraved with, in engraving units at scale 1:
   * the built-in 160 unless the URL names a player-made instrument or a saved range (then
   * `planSystemPositionUnits` of that written range in its clef), published with every ready
   * state.
   */
  systemPositionUnits?: number
  /**
   * Where the phrase's instrument places the staff in its system position of
   * `systemPositionUnits` (engraving units from the position's top edge: the staff's top line),
   * published with every ready state.
   */
  staffTopLineUnits?: number
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
  readonly viewport: {
    readonly layout: 'one-system' | 'split'
    readonly heightBudgetPx: number | null
  }
  /** The shared system-position size, in engraving units, when PhraseScore is given one. */
  readonly systemPositionUnits?: number
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

/** A system position's share of a phrase: bars 1-4, bars 1-2 or bars 3-4 (SystemPart). */
type NotationHarnessSystemPart = 'whole' | 'opening' | 'closing'

/** One drawn system SVG: its size, normalised markup, note ids and measure slots' indices. */
// @test-link [[module_session_rolling_display]]
interface NotationHarnessSvgSnapshot {
  readonly width: string | null
  readonly height: string | null
  readonly viewBox: string | null
  /** The SVG's markup with VexFlow's `autoN` element ids renamed in order of first appearance. */
  readonly markup: string
  /** The distinct `data-note-id` values tagged in the SVG, in document order. */
  readonly noteIds: readonly string[]
  /** Each `g.measure-slot`'s `data-measure-index`, in document order. */
  readonly measureIndices: readonly number[]
  /** Each `g.measure-slot`'s `data-system-index`, in document order. */
  readonly systemIndices: readonly number[]
  /**
   * Per `g.measure-slot`, in document order: the drawn `x` (SVG user units) of each of its
   * `g.vf-stavenote` groups' notehead (or rest) glyph text, in drawing order.
   */
  // @test-link [[module_notation_engraving_anchors]]
  readonly noteheadXs: readonly (readonly number[])[]
}

/** One drawn measure's reported time-axis anchors (MeasureAnchors), in CSS px. */
// @test-link [[module_notation_engraving_anchors]]
interface NotationHarnessMeasureAnchors {
  readonly measureIndex: number
  readonly systemIndex: 0 | 1
  readonly eventStartsPx: readonly number[]
  readonly barlinePx: number
}

/** The geometry an engraving reports, shared by a whole phrase's and one system's. */
interface NotationHarnessEngravedGeometry {
  readonly staffSpacePx: number
  readonly widthPx: number
  readonly heightPx: number
  readonly positionBlockPx: number
  readonly requiredUnits: number
  readonly measureBoxes: readonly { readonly x: number; readonly width: number }[]
  readonly measureAnchors: readonly NotationHarnessMeasureAnchors[]
  /** The fixture phrase's event count (notes and rests) per measure, in phrase order. */
  readonly measureEventCounts: readonly number[]
}

/** A thrown value, serialisable: its name, its NotationError code (null otherwise) and message. */
interface NotationHarnessThrown {
  readonly name: string
  readonly code: string | null
  readonly message: string
}

/**
 * The per-system engraving hook, on the real engraver module once its fonts are loaded: a fixture
 * phrase drawn whole by `engraveWrittenPhrase` (each system's SVG snapshotted), or one system part
 * drawn by `engravePhraseSystem` into one host; `engravePartFailure` draws into a host holding a
 * sentinel child and reports what was thrown and what the host kept.
 */
// @test-link [[module_session_rolling_display]]
// @test-link [[module_notation_layout_preflight]]
interface NotationHarnessSystems {
  engravePhrase(
    fixtureName: string,
    phraseNumber: number,
    containerWidthPx: number,
    viewport: NotationHarnessLayoutInputs['viewport'],
  ): Promise<
    NotationHarnessEngravedGeometry & { readonly svgs: readonly NotationHarnessSvgSnapshot[] }
  >
  engravePart(
    fixtureName: string,
    phraseNumber: number,
    part: NotationHarnessSystemPart,
    containerWidthPx: number,
    viewport: NotationHarnessLayoutInputs['viewport'],
  ): Promise<
    NotationHarnessEngravedGeometry & {
      readonly svg: NotationHarnessSvgSnapshot
      readonly hostChildCount: number
      readonly hostHoldsSvg: boolean
    }
  >
  engravePartFailure(
    fixtureName: string,
    phraseNumber: number,
    part: NotationHarnessSystemPart,
    containerWidthPx: number,
    viewport: NotationHarnessLayoutInputs['viewport'],
  ): Promise<{
    readonly thrown: NotationHarnessThrown | null
    readonly hostChildCount: number
    readonly sentinelKept: boolean
  }>
}

/** What the check note's host holds once `engraveCheckNote` has drawn into it. */
// @test-link [[rule_controller_transposition_check]]
interface NotationHarnessCheckNoteSnapshot {
  /** The `svg` elements in the host, and the host's element children. */
  readonly svgCount: number
  readonly hostChildCount: number
  readonly className: string | null
  readonly role: string | null
  readonly ariaLabel: string | null
  readonly width: string | null
  readonly height: string | null
  readonly viewBox: string | null
  readonly clefCount: number
  /** The clef's glyph text: SMuFL U+E050 for the G (treble) clef, U+E062 for the F (bass) clef. */
  readonly clefGlyphs: readonly string[]
  /** Each drawn staff line's `y`, top to bottom, in the SVG's own units. */
  readonly staffLineYs: readonly number[]
  readonly timeSignatureCount: number
  readonly keySignatureCount: number
  readonly staveNoteCount: number
  /** The `<text>` glyphs in the notehead group: the notehead, then its accidental if drawn. */
  readonly noteheadGroupTexts: readonly string[]
  /** The notehead glyph's `y`, in the SVG's own units (smaller is higher on the staff). */
  readonly noteheadY: number
  /** Each ledger line's own `stroke` attribute (null: it inherits the staff colour). */
  readonly ledgerLineStrokes: readonly (string | null)[]
  /** Whether the SVG's box lies inside the host's content box. */
  readonly fitsHost: boolean
  /** The SVG's computed size in CSS px. */
  readonly renderedWidthPx: number
  readonly renderedHeightPx: number
  /** The host's computed `color` (the staff colour) and the notehead's computed `fill`. */
  readonly hostColour: string
  readonly noteheadFill: string
}

/**
 * The connection sheet's check-note hook, on the real engraver module once its fonts are loaded:
 * `engrave` draws a written MIDI note into the page's one `.check-note` host and snapshots it;
 * `engraveFailure` makes the same call, reports what it threw and whether the host kept what it
 * held.
 */
// @test-link [[rule_controller_transposition_check]]
interface NotationHarnessCheckNote {
  /** Draw the note on a staff in `clef`, the built-in treble clef when absent. */
  engrave(writtenMidi: number, clef?: 'treble' | 'bass'): Promise<NotationHarnessCheckNoteSnapshot>
  engraveFailure(
    writtenMidi: number,
    clef?: 'treble' | 'bass',
  ): Promise<{
    readonly thrown: NotationHarnessThrown | null
    readonly hostChildCount: number
    readonly previousSvgKept: boolean
  }>
}

interface Window {
  __notationHarness: NotationHarnessState
  /** Every `layout-inputs` event PhraseScore emitted since the page loaded, in order. */
  __notationLayoutInputs: NotationHarnessLayoutInputs[]
  __notationChecks: NotationHarnessChecks
  __notationSystems: NotationHarnessSystems
  __notationCheckNote: NotationHarnessCheckNote
}
