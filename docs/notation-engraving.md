# Notation and Engraving

This document records how a generated four-measure phrase becomes a written score on screen: the pure display transformation, the pinned engraving library boundary, the bundled font assets and their licenses, the mapping from written-phrase objects to engraving objects, the staff layout's sizing and failure policy with the pre-draw checks built on it, the note identities and session overlays drawn on the engraved score, the accessible score representation, and the procedure for upgrading the engraving library.

## Pipeline

Notation is a strict consumer of a successful generation. It never changes a generation request, a generation result, or the generator's internal state, and it can be repeated for any display convention without regenerating.

1. **Input** — `notationInputFromOutcome(outcome, intent)` (`src/domain/notation/notation-input.ts`) accepts only a `generation_success` outcome whose request identity matches the intent. It takes three things by reference, without copying or mutating them:
   - the concert event timeline from the result;
   - the tonal context (tonal center and collection) from the intent's controls;
   - the chord symbols derived from the selected harmony candidate in `outcome.provenance.harmony`.

   Each harmony span becomes one concert chord symbol at its start. The chord is restated at the downbeat of every measure the span crosses, and the spans must tile all four measures exactly. Triad quality maps to a suffix: major is empty, minor is `m`, diminished is `dim`. Planner internals are never consulted.

2. **Transformation** — `transformToWrittenPhrase(input, mode)` (`src/domain/notation/written-phrase.ts`) is pure. It returns a deep-frozen `WrittenPhrase` (`src/domain/notation/written-phrase-types.ts`) that has everything engraving needs and nothing it has to infer: clef, meter, spelled key, and four measures of written notes and rests with notated durations, ties, beam groups, displayed accidentals, and spelled chord symbols. Calling it again with another mode is how a display switch works. The source input is left untouched.
3. **Description** — `describeWrittenPhrase(phrase)` (`src/domain/notation/score-description.ts`) produces the spoken-English summary and per-measure text (see Accessible Representation).
4. **Engraving** — `engraveWrittenPhrase(targets, phrase, phraseNumber, containerWidthPx, viewport)` (`src/notation/vexflow-engraver.ts`) plans the layout the viewport selects and draws one SVG per staff system into its host (the top host alone in the one-system layout, both in the split layout), tagging every note's own parts with the identity of the attack it sounds as (see Note Identity and Session Overlays), or throws a typed `NotationError` (`src/notation/notation-error.ts`). During a session, `engravePhraseSystem` draws one system part of a phrase at a time from the same whole-phrase plan (see Session Systems). The same module runs the two pure pre-draw checks, `planWrittenPhraseFit` and `planStaffRoomForKey`, through the same planning code and without drawing (see Pre-draw Checks).
5. **Component** — `PhraseScore.vue` (`src/components/notation/PhraseScore.vue`) sits inside `staff-frame` in every state and holds the staff's two reserved system positions, sized from the viewport whether or not there is a phrase. It waits for fonts and a measured container, engraves into hidden staging hosts, and moves the systems into their positions only after the whole phrase succeeds. It re-engraves when the phrase, its phrase number, the container width, the height budget or the layout changes, and emits either `engraved` or `notation-error`. It also emits `layout-inputs` with the inputs it measured, with or without a phrase, so the workspace can check against them before it draws anything. After every successful engraving, and whenever its `overlays` prop changes, it draws the session overlays onto the systems on screen. Given a running session through its `session` prop, it draws the session's systems instead, in the layout the session holds, and reports a failure as `session-staff-failed` only (see Session Systems).

## Display Conventions and Spelling

Display conventions are defined in `src/domain/notation/notation-mode.ts`. The staff is in the clef the written phrase carries, its instrument's: treble for the three built-in profiles, treble or bass for my instrument (see [Domain-to-Engraving Mapping](#domain-to-engraving-mapping)). Written pitch is concert pitch plus a fixed transposition:

| Mode         | Chromatic | Diatonic |
| ------------ | --------- | -------- |
| Concert      | +0        | +0       |
| B-flat tenor | +14       | +8       |
| E-flat alto  | +9        | +5       |

The diatonic step count moves the letter name, and the chromatic count moves the sound. Together they fix the spelling of the written tonic's letter relative to the concert tonic.

The enharmonic rule lives in `src/domain/notation/pitch-spelling.ts` and applies consistently to the tonal label, the key signature, note accidentals, chord roots, and slash bass:

- **Key.** The written tonic takes the letter spelling whose seven-note scale in the collection has the fewest total accidentals. On a tie, the sharp (or natural) spelling wins over the flat spelling. The key signature is the standard sharp or flat prefix for that scale. VexFlow draws it from the signature's Ionian tonic.
- **Notes.** Diatonic pitches take the key's scale spelling. Chromatic pitches are spelled as follows:
  - a white key is its natural letter;
  - in a flat key, a black key is a flat of the letter above;
  - in any other key, a black key is a sharp of the letter below.
- **Chord symbols.** Roots and any slash bass are spelled with the same rule. Quality, alterations, and extensions are carried unchanged as the suffix.
- **Displayed accidentals.** Accidentals are derived per measure. Each measure starts from the key signature, and state is kept per letter and octave. An accidental is shown only when a pitch's alteration differs from the current state for that letter and octave. A tied continuation never shows an accidental, and state resets at each barline.

## Rhythm Notation

`src/domain/notation/rhythm-notation.ts` splits each source event into notated values of a whole, half, quarter, eighth, or sixteenth, each at most single-dotted, using sixteenth-note ticks (16 per measure). Values are chosen greedily with metric alignment:

| Value                    | Allowed start ticks |
| ------------------------ | ------------------- |
| Whole or dotted half     | 0                   |
| Half                     | a multiple of 8     |
| Dotted quarter           | 0 or 8              |
| Quarter or dotted eighth | a multiple of 4     |
| Eighth                   | a multiple of 2     |
| Sixteenth                | any tick            |

A chord-symbol start is always a segment boundary, so every chord symbol attaches to a glyph that starts at its tick. The pieces of one split note are tied. A source tie continuation across a barline becomes a tie from the last glyph of one measure to the first glyph of the next. Beam groups are runs of two or more consecutive eighth or sixteenth notes (not rests) inside one quarter-note beat.

## Engraving Library Boundary

- **Library.** VexFlow is pinned to exactly `5.0.0` in `package.json`, with no range operator. The lockfile records the resolved tarball and its integrity hash.
- **Import boundary.** Only `src/notation/vexflow-mapping.ts`, `src/notation/vexflow-engraver.ts`, `src/notation/vexflow-two-system-engraver.ts` (one system's staves and measures, in either layout) and `src/notation/vexflow-check-note-engraver.ts` (the controller check's one written note, `engraveCheckNote`, re-exported by the engraver so it ships in the same lazy chunk; see [Check Note](#check-note)) may import `vexflow`. ESLint enforces this with `no-restricted-imports`. Everything else, including the Vue component, talks to the adapter through `WrittenPhrase`, `EngravedScore`, `EngravedSystem`, `NotationError`, `ensureNotationFonts`, and the two pre-draw checks with their types in `src/notation/staff-fit-types.ts`. The note-identity files (`note-identity.ts`, `note-part-tags.ts`) and the overlay step (`score-overlays.ts`) import no VexFlow: they work on the finished SVG markup alone.
- **Entry point.** The adapter imports from `vexflow/bravura`. This entry registers the Bravura music font and the Academico text font and sets them as the default fonts.
- **API surface.** The adapter uses only this part of VexFlow:
  - `Renderer`, with the SVG backend, `resize`, `getContext`, and context `scale`, `openGroup`, and `closeGroup`;
  - `Stave`, with `addClef(clef)` (`'treble'` or `'bass'`, the written phrase's clef), `addKeySignature`, `addTimeSignature('4/4')`, `setEndBarType(Barline.type.END)`, `getNoteStartX`, and `setNoteStartX`;
  - `StaveNote`, built from `keys`, a `duration` code, the `clef` struct field (the phrase's clef, so the key is placed on that clef's lines) and, for a note, the `stemDirection` struct field (`Stem.UP` or `Stem.DOWN`; never `autoStem`);
  - `Accidental`, `Dot.buildAndAttach`, `ChordSymbol` (`addText`, `addGlyphOrText`, and `setVertical(TOP)`), `Beam`, `StaveTie`, and `Voice` (with strict tick counting);
  - `Formatter`, with `joinVoices`, `formatToStave`, and `preCalculateMinTotalWidth`;
  - for the check note: the `Stave` option `spaceAboveStaffLn` and a `StaveNote`'s `setStave`;
  - for the note-identity tags and the playhead band: a `StaveNote`'s `noteHeads` (and each notehead's `getText`), `hasStem`, `getStem`, `shouldDrawFlag`, `getModifiersByType` with `Accidental.CATEGORY`, `Dot.CATEGORY` and `ChordSymbol.CATEGORY` (and each modifier's `getText`), `isRest` and `getYs`; each drawn element's `getAttribute('id')`, since the SVG context names the group it opens for an element `vf-<id>`; `Stave`'s `getX`, `getWidth`, `getYForLine`, `getNumLines` and `getSpacingBetweenLines`; and `Voice`'s `getTickables`.
- **Output contract.** The only structural contract other code may select on is this:
  - one `svg.staff-svg` with `role="img"` per staff system, inside its own `staff-content` unit in its system position (`[data-system-position="top"]` or `"bottom"`); each unit carries the phrase number and the part it shows in `data-phrase-number` and `data-system-part` (`whole`, `opening` or `closing`);
  - one `g.measure-slot` per measure, carrying `data-measure-index` 0 to 3, `data-system-index` (0 on the phrase's first system, 1 on the split layout's second, wherever a session shows it), and its playhead band's rectangle in `data-band-x`, `data-band-y`, `data-band-width` and `data-band-height`;
  - on every note's own parts, `<g>` groups carrying `data-note-id` and `data-note-part`, and on an attack's chord symbol group, `data-chord-for` (see SVG DOM Contract under Note Identity and Session Overlays);
  - the overlay step's own marks: `rect.playhead-band`, `path.start-note-marker`, and the `note-ack` class.

  VexFlow's own `vf-*` classes are internal to the adapter, the note-identity tagging, the overlay step and their browser tests.

## Fonts and Licenses

The fonts ship inside the VexFlow package. `vexflow/bravura` inlines them as base64 `woff2` data URIs and loads them with the `FontFace` API. The bundle therefore carries them, the application never fetches a font from the network, and notation works offline. Only the notation code path pulls them in, and no CDN font link is used.

| Font      | Role                         | Version                     | Copyright                                                                | License                   |
| --------- | ---------------------------- | --------------------------- | ------------------------------------------------------------------------ | ------------------------- |
| Bravura   | SMuFL music glyphs           | as shipped in VexFlow 5.0.0 | © 2021 Steinberg Media Technologies GmbH, Reserved Font Name "Bravura"   | SIL Open Font License 1.1 |
| Academico | Chord-symbol and text glyphs | 0.902                       | © 2022 Steinberg Media Technologies GmbH, Reserved Font Name "Academico" | SIL Open Font License 1.1 |

The license facts were read from each embedded font's own name table. That table also carries the full OFL 1.1 text, so the license travels with the font data. The OFL permits bundling and redistributing the fonts with software. It forbids selling the fonts by themselves and using the reserved names for modified versions. The fonts are used unmodified. VexFlow itself is MIT-licensed.

`ensureNotationFonts()` loads both faces through `document.fonts.load` and waits for `document.fonts.ready`. It throws `notation_font_unavailable` if the fonts are not usable. Engraving never measures or draws before this resolves, because fallback-font metrics would produce a wrong layout.

## Domain-to-Engraving Mapping

| Written phrase                             | VexFlow object                                                                                                                                                                                                                                                                                                                                                           |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `clef` (`'treble'` or `'bass'`), 4/4 meter | First `Stave`: `addClef(clef)`, the clef the written phrase carries (treble for a built-in profile, treble or bass for my instrument), and `addTimeSignature('4/4')`; every `StaveNote` is built with the same `clef`, and the key signature's accidentals follow the stave's clef                                                                                       |
| `key.signature`                            | First `Stave`: `addKeySignature(<Ionian tonic>)`, or `C` when the signature is empty                                                                                                                                                                                                                                                                                     |
| Each of the 4 measures                     | One `Stave` at a computed x position, all four on one staff system in the one-system layout. In the split layout, bars 3 and 4 are a second system, drawn in their own SVG, whose staves reuse the x positions and widths of bars 1 and 2 and whose first stave repeats the clef and key signature (not the time signature). The last measure ends with a final barline. |
| `WrittenNote`                              | `StaveNote` with key `<letter><#/b…>/<octave>` and duration code `w`, `h`, `q`, `8` or `16`, plus `d` when dotted, and `stemDirection` `Stem.UP` or `Stem.DOWN` from the note's `stemDirection`                                                                                                                                                                          |
| `WrittenRest`                              | Rest `StaveNote` with the same duration code plus `r`, positioned on the middle line, `b/4` in treble clef and `d/3` in bass clef (a whole rest hanging from the fourth line from the bottom: `d/5` in treble, `f/3` in bass)                                                                                                                                            |
| `accidental` (only when displayed)         | `Accidental` with code `bb`, `b`, `n`, `#` or `##`                                                                                                                                                                                                                                                                                                                       |
| Dotted duration                            | Dot encoded in the duration code (so the tick count is correct) plus a `Dot` modifier                                                                                                                                                                                                                                                                                    |
| `beamGroups`                               | One `Beam` per group                                                                                                                                                                                                                                                                                                                                                     |
| `tieToNext` / `tieFromPrevious`            | `StaveTie` between consecutive glyphs, including across barlines. A tie from bar 2 into bar 3 in the split layout is drawn as two partial `StaveTie`s, one in each system's SVG: one leaving the last note of the top system and one arriving at the first note of the bottom system.                                                                                    |
| `WrittenChordSymbol`                       | `ChordSymbol` on the glyph at the same start tick: root letter, accidental glyph, suffix, and optional `/bass`                                                                                                                                                                                                                                                           |

The adapter draws exactly what the written phrase says. It never re-spells, re-derives accidentals, or re-segments rhythm, and it relies on no automatic VexFlow accidental, beam, stem, or spelling logic. Each `Beam` keeps the stem direction its notes were built with, which the written phrase makes the same for the whole group.

## Sizing and Failure Policy

At Idle the staff layout is chosen by the viewport width alone, never by a phrase, and one layout is never tried before the other:

- **One-system layout**, from the 64rem tablet-landscape breakpoint up: all four measures on one staff system.
- **Split layout**, below 64rem (the landscape phone): bars 1 and 2 on a top system, bars 3 and 4 on a bottom system, for every phrase, however short, at idle as in a session. The bottom system repeats the clef and key signature but not the time signature.

A running practice session keeps the layout chosen at its start, whatever the width selects later (see [The Rolling Display](session-engine.md#the-rolling-display)).

The planner sees the window as a `StaffViewport`: `{ layout, heightBudgetPx }`, the layout drawn and the window's **height budget** for the two positions. The budget belongs to the window, not to the layout: it is a number exactly while the window is below 64rem, and `null` from 64rem up. At Idle the two always go together (split with a budget, one system without one). A session draws its held layout in the window's budget, `heldViewport(windowViewport, heldLayout)`, so a held one-system layout below 64rem has a height rule too, and a held split layout from 64rem up has none.

The staff area always reserves **two system positions**, one above the other, in every state: no phrase yet, loading, ready, and failed. Both positions have one block size, set from the viewport and the shared system-position size (below), never from a phrase. Each position that shows notes holds its own `staff-content` unit with its own SVG. In the one-system layout the phrase sits in the top position and the bottom one stays blank. In the split layout the top position holds bars 1 and 2 and the bottom one bars 3 and 4, both at the phrase's one scale. The notation is never scrolled horizontally, clipped, or shrunk below the floor, and never split into more than two systems.

The constants live in `src/notation/notation-layout-policy.ts`:

- `NOTATION_ENGRAVING_UNITS_PER_STAFF_SPACE = 10` is VexFlow's native geometry.
- `NOTATION_LEGIBILITY_FLOOR_STAFF_SPACE_PX` is the smallest staff space, in CSS pixels, at which the score may be drawn. The Legibility Floor section below gives its value and rationale.
- `NOTATION_MAX_STAFF_SPACE_PX` is the largest staff space, reached on wide containers.
- `NOTATION_SYSTEM_POSITION_UNITS = 160` is the built-in system-position size in engraving units (16 staff spaces). It holds the tallest ink any one built-in profile's written range produces, start marker included, with at least 0.8 staff space clear at each end (see the height calibration below). It is the floor of the shared size.
- `planSystemPositionUnits(myInstrument)` gives the **shared system-position size**: one block size, in engraving units, for both positions and every instrument choice. Its input is the saved my instrument's written range and the clef it is drawn in (a `WrittenRangeInClef`), or `null` when none is saved, so it changes only when my instrument is saved or deleted, never from one phrase to the next and never with the instrument selected. With none saved it is 160. Otherwise my instrument's written range counts like a built-in's: its ink (`planStaffInk`, below), plus `NOTATION_POSITION_END_CLEARANCE_UNITS = 8` (0.8 staff space, the clearance 160 leaves the C MIDI keyboard) at each end, rounded up to a whole number of staff spaces, and never below 160. A range whose ink is at most 144 units, the keyboard's, keeps 160; one reaching further, or wider than two octaves across the middle line (its wider register windows allow wider beam groups), makes both positions taller for every instrument choice. The figures are under [My instrument's written range](#my-instruments-written-range-m3-2026-10-12).
- The shared size reaches every reader: `WorkspaceShell.vue` computes it from its `savedMyInstrumentRangeInClef` prop, my instrument's written range with its clef (a `WrittenRangeInClef`; null until chunk 20's my-instrument record feeds it) and passes it to `PhraseScore` and the Review. `PhraseScore` sizes its positions with it, draws with it and reports it in its layout inputs, so the pre-draw checks, the session's fit checks and the session window's positions all plan with the size the staff is drawn with. The engraver's entry points take it as an optional trailing argument, the built-in size by default, and each plan records the size it was made with (`systemPositionUnits`).
- `planStaffPlacement(range, systemPositionUnits)` places the staff's top line inside the position of the shared size (160 by default) for the phrase's instrument, from that instrument's written range alone. The written phrase carries the range (`writtenRange`: the profile's active concert range moved by its transposition), so the placement belongs to the phrase's instrument and never to its notes. Stems follow the written phrase's rule (`src/domain/notation/stem-direction.ts`): down on or above the middle line (B4), up below it, a beam group's all one way. Every pitch of a phrase is drawn from one register window (the window policy in `src/domain/profile/instrument-profiles.ts`, applied in `src/domain/pitch/pitch-candidates.ts`), whose span is half the range's width, rounded up, and never under 12 semitones. So `planBeamGroupMaxSpanSteps(range)` bounds a generated beam group's span in diatonic steps: 7 per octave of the window, and `ceil(7r / 12)` for the `r` semitones left over (a diminished interval included, as E♯ to C in F♯ major). That is 7 steps, one octave, for every range of up to two octaves, the built-ins' included; 8 for a range of 25 or 26 semitones, 10 for 34, and 14 for a four-octave range. A group's stems point away from its farthest note from the middle line, so its notes on the other side sit at most half that span from the line, rounded down: for a two-octave range an up-stemmed group reaches at most written E5 and a down-stemmed one at most down to written F4, and only as far as the range reaches on both sides of the line; for a four-octave range, B5 and B3. `planStaffInk(range)` gives the ink a range can produce, which both the placement and the shared size use. It reaches above the top line by the largest of `NOTATION_STAFF_INK_ABOVE_TOP_LINE_UNITS = 27` (the chord symbol over written A4, the highest note with its own stem up), the range's highest note plus `NOTATION_HIGH_NOTE_INK_ABOVE_UNITS = 22` (its stem points down, away from its chord symbol, which sits one space over the notehead and is about 1.2 spaces tall), and the chord symbol on the highest up-stemmed note a beam group can hold (`NOTATION_STEM_LENGTH_UNITS = 35` to that note's own stem tip, plus `NOTATION_CHORD_SYMBOL_OVER_STEM_TIP_UNITS = 17`: the chord symbol sits 5 units over the tip and its ink rises about 12 over that), plus `NOTATION_START_MARKER_RESERVE_UNITS = 15` for the start marker (one space tall, half a space clear of the ink under it). It reaches below by the largest of the range's lowest note plus `NOTATION_LOW_NOTE_INK_BELOW_UNITS = 7` (half a notehead and its ledger line's stroke), `NOTATION_STAFF_INK_BELOW_TOP_LINE_UNITS = 55` (a lone down stem from written B4, 1.5 spaces under the bottom line), and the beam under the lowest note a down-stemmed beam group can hold (its stem plus `NOTATION_DOWN_BEAM_BELOW_STEM_TIP_UNITS = 5` for the beam's slope and stroke). The outer notes are placed by their natural letter, a black key by its natural neighbour outward, and a lowest written F one letter lower, at E: a key signature of six sharps (F♯ major and its modes) spells written F as E♯, one step below F. No other written key spells a range's outer note a letter further out: the fewest-accidental spelling uses at most six sharps or five flats, so B♯, C♭ and F♭ never occur. The staff is placed so that this ink sits centred in the position. A larger shared size moves the staff down by half the growth, so the ink stays centred. The saxophones (written C4 to C6: from 6.2 spaces above the top line, the marker over the chord symbol over an up-stemmed E5 in a beam group, to 7.5 below it, the beam under a down-stemmed group reaching F4) get their top line at 73.5 units; the C MIDI keyboard (written C3 to C5: from 5.2 spaces above, the marker over the chord symbol over an up-stemmed C5 in a beam group, to 9.2 below, written C3) at 60, higher in its position, with more room below.
- `NOTATION_MIN_MEASURE_WIDTH_UNITS = 40` is the narrowest content width a measure is ever drawn at, about one whole note with its margins.
- `NOTATION_PHONE_LAYOUT_MEDIA_QUERY = '(max-width: 63.9375rem)'` mirrors the workspace's 64rem tablet-landscape breakpoint. While it matches, the window gives a height budget and the Idle staff uses the split layout. The stylesheet's phone staff block uses the same width-only query, so the two always agree on the side.

`planStaffPositions(viewport, systemPositionUnits)` sizes the two positions for a viewport and the shared size (160 by default), whatever the phrase and whichever layout is drawn: with no height budget they take the maximum scale; with one, both positions at the floor must fit it, in either layout, else there is no room (`too_short`). `planStaffRoom` checks, whatever the phrase, whether the window has room for the staff at the floor in the viewport's layout: first the height, through `planStaffPositions`, then the width of the layout's fixed parts, `leadingWidth + m × NOTATION_MIN_MEASURE_WIDTH_UNITS + systemPadding` at the floor scale. It returns `room`, with the positions' scale ceiling and block size, or `no_room` with its cause, `too_short` or `too_narrow`. `planSystemLayout` runs it first, so the two always agree on "no room".

`planSystemLayout` plans the phrase in engraving units at scale 1. With `m` measures per system (4, or 2 in the split layout):

```
widest        = max(NOTATION_MIN_MEASURE_WIDTH_UNITS, widest measure minimum width)
requiredUnits = leadingWidth + m × widest + systemPadding
widthScale    = containerWidth / requiredUnits
heightScale   = heightBudget / (2 × systemPositionUnits)      (with a height budget only)
scale         = min(maxStaffSpace / 10, widthScale, heightScale)
position      = systemPositionUnits × min(maxStaffSpace / 10, heightScale)
```

- `systemPositionUnits` is the shared system-position size, 160 unless a saved my instrument needs more.
- `leadingWidth` is the clef, key signature, and time signature on the first stave. Each measure's minimum width comes from VexFlow's formatter.
- Every measure gets the same width, so the measures read as visibly equal. The two systems of the split layout share the same column positions, so bar 3 sits directly under bar 1 and bar 4 under bar 2. The bottom system's notes are forced to start at the top system's note-start position, so the columns stay aligned although it carries no time signature. A system spans the container's full width: when the height sets the scale, the measures widen to fill it.
- The position size does not depend on the phrase or on the instrument selected: only on the viewport and the shared size, which a saved my instrument sets. With no height budget (from 64rem up), where the scale fits the width only, it is the position height at the maximum scale (192 px at 12 px per staff space for the built-in size), so every phrase fits it. The frame keeps its fixed minimum block size (24rem, 384 px) and grows past it to hold both positions, to 418 px with its padding and border, 34 px taller than v1's frame; from the 90rem desktop breakpoint its 28rem (448 px) minimum holds. Below 64rem it is the position height at the height-fit scale, in either layout. A phrase whose width needs a smaller scale is drawn smaller, at the top of its position.
- **The height budget** is read by `PhraseScore` from `staff-frame`'s computed `max-block-size`, minus the frame's block padding and border. The stylesheet builds that maximum from `--staff-systems-phone-block-budget`: the small viewport height (`100svh`, the height with the browser's toolbars showing) minus the session cue row, its gap and the frame chrome. Below 64rem the frame's block padding is `--staff-frame-padding-block-phone` (8 px) instead of its usual 16 px, which it keeps on its inline sides. No pixel value is written in application code. Because the budget uses the small viewport height, a browser toolbar showing or hiding changes neither the budget nor the scale.

A phrase that cannot be drawn at the floor fails in one of two ways. The planner returns them as distinct outcomes, and the engraver throws them as distinct `NotationError` codes (`isStaffLayoutFailure` tells them apart from the retryable ones):

- **No room** (`notation_no_room`): the window cannot hold the layout at the floor, whatever phrase it holds. It is too narrow for the leading width plus `m` measures at the minimum measure width plus padding, or, with a height budget (below 64rem), too short for the two positions (`2 × systemPositionUnits × 0.5` CSS px of budget: 160 px at the built-in size, 210 px at 21 spaces). Only a window change cures it. This is checked first.
- **Notes too wide** (`notation_notes_too_wide`): the window has room, but this phrase's widest measure needs more width than the floor allows. Another phrase may fit.

Both carry numeric details: the container width and the required width, or the height budget and the required height. What the workspace shows for each is the caller's decision, and neither is ever shown as the notation error at Idle. The idle workspace session consumes them (see [Idle fit run and the room notice](phrase-workspace.md#idle-fit-run-and-the-room-notice)): no room shows the "staff needs more room" notice; notes too wide makes the session try another phrase with a fresh seed, up to four attempts, and shows the notice when none fits. It meets them mostly as the verdicts of the pre-draw checks below, before anything is drawn, and as these errors only when a redraw of the phrase on screen, or a draw after the window changed since its check, fails.

The other codes stay retryable:

- `notation_bounds_exceeded`: a drawn system is wider than the container. The height needs no such check: the shared size is planned from the written ranges, so its positions hold every instrument's ink. An SVG box could not measure it anyway, because VexFlow draws every music glyph as `<text>`, whose box is the font's whole line box rather than the glyph.
- `notation_font_unavailable`: the notation fonts could not be loaded.
- `notation_container_unavailable`: the container has no usable width, the height budget is not a number, or no SVG root was produced.
- `notation_engraving_failed`: any other engraving-library failure, wrapped with its cause.

In every failure no partial notation is shown. Both positions are cleared, together with the description.

Redraw rules (at Idle; a session's are under Session Systems below): engraving starts only after the fonts are ready and the container has a measured width. `PhraseScore` checks its inputs (the container width, the layout with its height budget, and the shared size) on every container resize, window resize and breakpoint crossing, coalesced to one check per animation frame. It re-engraves only when one of them changed, or when the phrase changed. Any other signal, such as a browser toolbar showing or hiding, leaves the staff untouched. A redraw keeps each position's `staff-content` unit and replaces only its SVG, so the unit's entrance fade does not replay.

`PhraseScore` reports those same inputs, `{ containerWidthPx, viewport }` with `systemPositionUnits` when it is given the shared size (`StaffLayoutInputs`), through its `layout-inputs` event, always the window's viewport, during a session too: once at its first measurement and again whenever they really change, compared with the last report, with or without a phrase, and before it engraves. It reports again after the engraver module has loaded if the inputs moved meanwhile. A signal that changes no input reports nothing.

### Pre-draw Checks

The idle workspace checks a phrase before it draws it, so a phrase too wide for the room is never drawn, and checks whether the staff has room at all while no phrase can show. `src/notation/vexflow-engraver.ts` exports both checks. They are pure: they build VexFlow's glyph, beam and voice objects and measure them, but draw nothing and touch no DOM, so they can run while another phrase stays on screen untouched. They live in the engraver, behind the lazy loader, because measuring needs VexFlow's formatter and the loaded notation fonts; the caller waits for `ensureNotationFonts()` first, as drawing does.

- **`planWrittenPhraseFit(phrase, containerWidthPx, viewport)`** returns `StaffFitVerdict`: `{ kind: 'fits' }`, `{ kind: 'no_room', cause }` or `{ kind: 'notes_too_wide' }`. It runs `planPhraseLayout`, the one planning path `engraveWrittenPhrase` also takes: build the glyphs, beams and voices, measure the leading width and each measure's minimum width, run `planSystemLayout`. Because drawing and the check share that code, the verdict is always what drawing the phrase with the same inputs would do.
- **`planStaffRoomForKey(signature, containerWidthPx, viewport)`** returns `StaffRoomVerdict`: `{ kind: 'room' }` or `{ kind: 'no_room', cause }`, whatever the notes. It measures the leading clef, key signature and 4/4 time signature for that key signature on a scratch stave built with `addClefAndKey`, the helper the drawn staff uses, then runs `planStaffRoom`. The key matters: the leading width grows with the number of sharps or flats, so a seven-sharp key needs more width than C major. Until chunk 20 feeds it the selected instrument's clef, this phrase-independent check measures the leading clef, key and time with the built-in treble clef; the F clef is about half a unit wider.

An unusable width throws `notation_container_unavailable`, as the planner does; any other non-`NotationError` throw is wrapped as `notation_engraving_failed`. `src/composables/use-notation-coordinator.ts` calls both checks with the latest `layout-inputs` report; before the first report it rejects with `notation_container_unavailable` rather than guess a width.

A running session uses `planWrittenPhraseFit` too, through the session controller's display (see [The Rolling Display](session-engine.md#the-rolling-display)), always at the latest `layout-inputs` report and in the held viewport, `heldViewport(viewport, heldLayout)`, so at the legibility floor in the layout the session draws and the window's height budget. It checks each look-ahead attempt before the attempt is accepted (anything but `fits` is a failed attempt, never drawn), and, at each layout report, every phrase shown or waiting (any misfit ends the session).

### Session Systems

During a session each of the two positions shows one part of one phrase, and the parts change one position at a time. `engravePhraseSystem(host, phrase, phraseNumber, part, containerWidthPx, viewport)` in `src/notation/vexflow-engraver.ts` draws one such part into one host: `whole` (bars 1–4, the one-system layout), `opening` (bars 1–2) or `closing` (bars 3–4, both the split layout). It plans the **whole** phrase exactly as `engraveWrittenPhrase` does, through the same `drawPhraseSystems` code, so a split phrase's two halves drawn at different times share one scale, one system width and aligned measure columns: the closing half still aligns to the opening half's staves, which are built, with their time signature, whether drawn or not. It then draws only the requested system: its measures, its own ties (a tie across the system break is drawn as its partial tie in each half), the time signature on the opening half and the final barline on the last; tags its note parts with their identities as `phraseNumber`; and records its measures' playhead bands. `data-system-index` stays the system's index within the phrase. `openSystemSvg`, `finishSystemSvg` and `assertSystemWidthBounds` in `vexflow-two-system-engraver.ts` open, finish and bounds-check each system's SVG for both entry points.

A part that does not belong to the viewport's layout (`whole` with the split layout, say) is a caller error and throws before the host is touched, as an invalid phrase number or a malformed tie does. Every other failure is the same typed `NotationError` as `engraveWrittenPhrase` throws, with the host left empty.

`PhraseScore` (with `session-staff-positions.ts`) engraves each part off-screen in its staging host and only then shows it. A position whose part changes is refilled on its own, with the fade-out and entrance fades, while the other is left alone. A change of the layout inputs re-engraves every system shown in place, the same unit with no fade, in `heldViewport` at the new size, and swaps them only once every one has succeeded. A failure never clears the staff and never shows the notation error: `PhraseScore` reports it as `session-staff-failed`, which ends the session (see [Ends](session-engine.md#ends)).

### Review Engraving

The last session's Review (see [The last-session Review](phrase-workspace.md#the-last-session-review)) draws every phrase of the session again, from its stored record: `ReviewPhrase` computes the written phrase only then, with `transformToWrittenPhrase(notationInputFromOutcome(record.outcome, record.intent))`, and draws it with `engraveWrittenPhrase`, the Idle entry point, as the given session phrase number. The phrase therefore reads exactly as it was shown: the session instrument profile's written pitch, its key signature, chord symbols, spellings, ties and beams. Nothing of the session is drawn on it (no start marker, playhead band or acknowledged note), and the repeat mark is never read, so a repeat looks like any other phrase. The top system's SVG carries the phrase's summary as its `aria-label`, and the split layout's bottom one is `aria-hidden`, as on the workspace staff.

- **Width and viewport (ux D149).** Each phrase is engraved at its `review-staff`'s own content width (`clientWidth`), with the workspace staff's current viewport, its layout and height budget, from the latest `layout-inputs` report. So it takes one system from 64rem up and the split layout below, and "needs a wider window" is judged at that width. Nothing engraves until a viewport has been reported.
- **Reserved space.** Before anything is drawn, each `review-staff` reserves the staff's system positions: one in the one-system layout, two in the split layout, each at the block size `planStaffPositions(viewport, systemPositionUnits)` gives at the workspace's shared size, the workspace staff's own. With no room in the height budget the two positions share it equally. Engraving or releasing a phrase never changes that size, so the page never jumps as phrases are drawn.
- **Lazy engraving (ux D149).** `createReviewEngravingWindow` (`src/components/review/review-engraving-window.ts`) is a DOM-free scheduler; `observeReviewList` (`review-list-observers.ts`) feeds it from two intersection observers on the page's viewport and a resize observer on the list:
  - a phrase is queued once its item comes within one viewport height of the visible area (`rootMargin: '100% 0px'`);
  - an engraved phrase, or one showing a note, is released once its item is more than three viewport heights away (`rootMargin: '300% 0px'`): its content is removed and its reserved space left blank;
  - engravings run one at a time, the queued item nearest the visible area first (the earlier one on a tie), with a turn for the browser (`setTimeout(0)`) between two;
  - a real change of the list's width, or of the viewport, re-engraves every engraved phrase still near and retries every "wider window" note there, and releases the others, which engrave again when they come near. A "couldn't be drawn" note is not retried.

  However long the session, the work and the engraved phrases stay bounded by the items near the visible area; the unit specs scroll through 2 000 phrases.

- **The engraver** is the same lazy module, loaded through `loadVexflowEngraver()`, with `ensureNotationFonts()` awaited once for the whole list. A failed load is forgotten, so the next engraving tries again.
- **Failures.** A staff layout failure at the review staff's width (`notation_no_room` or `notation_notes_too_wide`) shows "This phrase needs a wider window." in the reserved space instead, and is drawn again on a width or viewport change. Any other `NotationError`, the engraver failing to load included, shows "This phrase couldn't be drawn." Any other throw is a defect and propagates. Neither note blocks anything, and the export doesn't depend on the engraving.
- **No fade.** A review `staff-content` takes no entrance or exit animation.
- **The room notice.** While the workspace staff has the no-room notice (the no-room cause only), the Review shows a `room-notice` in place of its list, following the staff's state live: the staff stays laid out under the Review and keeps checking its room. Its two sentences come from `src/components/notation/room-notice-copy.ts` (`ROOM_NOTICE_WIDE`, `ROOM_NOTICE_NARROW`), which the workspace staff's notice uses too, so both always read the same; the stylesheet shows one of them by the notation layout's width query.

### Legibility Floor

The floor is **5 px** per staff space. It was signed off as the product legibility floor on 2026-09-24. The maximum of **12 px** is an engineering choice that stops sparse phrases on wide desktops from growing past a comfortable reading size, and it has not been separately signed off.

One CSS reference pixel is about 0.26 mm at normal viewing distance. At that scale:

| Staff space | Physical size | Comparable printed size                                                      |
| ----------- | ------------- | ---------------------------------------------------------------------------- |
| ~7 px       | ~1.75 mm      | standard instrumental part                                                   |
| 5 px        | ~1.3 mm       | pocket or choral score                                                       |
| ~4.5 px     | ~1.2 mm       | miniature study score                                                        |
| below ~4 px | under ~1 mm   | smallest traditional rastral sizes, poorly suited to sight-reading on screen |

Calibration measured `requiredUnits` for real generated phrases in Chromium. The sweep covers:

- note densities Quarter, Eighth, Sixteenth;
- rhythmic variety Strict, Slightly varied, Heavily varied;
- syncopation Straight and Occasional offbeats;
- silence Conversational;
- seeds 1 to 6;
- all three instrument profiles, each in its own written pitch.

That is 324 phrases (9 density/variety cells × 36 each), and none failed to generate. The minimum
container width a phrase needs for one system of four measures is `requiredUnits × staffSpacePx / 10`.

| Density / variety           | requiredUnits min / median / max | Worst-case width at 7 px | 6 px   | 5 px   | 4.5 px |
| --------------------------- | -------------------------------- | ------------------------ | ------ | ------ | ------ |
| Quarter / Strict            | 383.0 / 519.7 / 587.8            | 411 px                   | 353 px | 294 px | 264 px |
| Quarter / Slightly varied   | 383.0 / 519.7 / 587.8            | 411 px                   | 353 px | 294 px | 264 px |
| Quarter / Heavily varied    | 499.2 / 669.8 / 823.9            | 577 px                   | 494 px | 412 px | 371 px |
| Eighth / Strict             | 642.5 / 825.5 / 1000.8           | 701 px                   | 600 px | 500 px | 450 px |
| Eighth / Slightly varied    | 642.5 / 850.3 / 986.0            | 690 px                   | 592 px | 493 px | 444 px |
| Eighth / Heavily varied     | 642.5 / 799.9 / 993.4            | 695 px                   | 596 px | 497 px | 447 px |
| Sixteenth / Strict          | 1181.5 / 1363.9 / 1642.9         | 1150 px                  | 986 px | 821 px | 739 px |
| Sixteenth / Slightly varied | 1132.0 / 1321.1 / 1642.9         | 1150 px                  | 986 px | 821 px | 739 px |
| Sixteenth / Heavily varied  | 1067.7 / 1306.0 / 1422.9         | 996 px                   | 854 px | 711 px | 640 px |

Quarter is unaffected by `Strict` versus `Slightly varied` (`Slightly varied` adds no extra beat
cells there) and widens under `Heavily varied`. Eighth is about the same width at every variety
level. Sixteenth is the widest density at every level, and `Heavily varied` narrows its widest
phrases (its longer merged cells trade attack count for width).

The workspace breakpoints are 48rem, 64rem, and 90rem, which is 768, 1024, and 1440 CSS px. Because the score takes the full content width before controls move below it, at the 5 px floor:

- From 64rem up, where one system holds all four measures, every measured phrase fits at every rhythmic variety level: the worst case is 821 px (Sixteenth), under the 1024 px breakpoint.
- Below 64rem the split layout puts two measures on each system, so a system needs about half the width. There the height is what limits the scale on a landscape phone (see the phone calibration below).

A 7 px floor would leave every phrase still under the 90rem (1440 px) breakpoint (worst case 1150 px, Sixteenth), but not every phrase at 64rem. For every measured phrase to fit one system at 48rem, the floor would have to drop to about 4.7 px (768 px / 1642.9 requiredUnits × 10), which is not legible for sight-reading; the split layout is what serves those widths.

A height calibration measured how far each system's ink reaches, on pixels: each system is screenshotted over a transparent page and its first and last inked rows are found. `getBBox()` cannot be used for this, because VexFlow draws every music glyph as `<text>`, whose box is the font's whole line box. The sweep covers every register, leapiness and contour, the arpeggio chaos levels Predictable and Chaotic (the outer two, which keep the run to about a quarter of an hour), the three note densities, seeds 1 to 3 and the three instrument profiles (2,592 phrases, two of which found no phrase to generate). Before the screenshot, the harness draws the real start marker over phrase 1's first attacked note through its overlay state (see Placement under Note Identity and Session Overlays), so the inked rows include it. Values are in engraving units from the 160-unit system position's top edge, highest ink and start marker included; the staff's top line is where `planStaffPlacement` puts it for the profile, and its bottom line 40 units lower. No system's ink, marker included, came closer than 10.0 units to either edge of its position (the keyboard's Low register, below):

| Profile and register    | Top line | Highest ink | Start marker top | Lowest ink |
| ----------------------- | -------- | ----------- | ---------------- | ---------- |
| C MIDI keyboard, Low    | 60       | 22.5        | 23.1             | 150.0      |
| C MIDI keyboard, Middle | 60       | 22.5        | 23.1             | 130.0      |
| C MIDI keyboard, High   | 60       | 22.5        | 23.1             | 116.7      |
| B-flat tenor, Low       | 73.5     | 21.7        | 21.6             | 134.2      |
| B-flat tenor, Middle    | 73.5     | 21.7        | 21.6             | 147.5      |
| B-flat tenor, High      | 73.5     | 16.7        | 16.6             | 130.0      |
| E-flat alto, Low        | 73.5     | 36.7        | 36.6             | 137.5      |
| E-flat alto, Middle     | 73.5     | 21.7        | 21.6             | 147.5      |
| E-flat alto, High       | 73.5     | 31.7        | 31.6             | 130.8      |

Stems point the way the written phrase says: down on or above the middle line, up below it, a beam group's all one way. A note high above the staff so has its stem down, away from its chord symbol: over the saxophones' highest written notes (up to C6) the chord symbol reaches about 4.2 staff spaces above the top line, and the start marker over it about 5.7 (the tenor's High register). VexFlow sets a chord symbol half a space over its own note's up stem tip, one space over its notehead or at the staff's text line (one space above the top line), whichever is highest, before any beam lengthens the stem, so it never sits over a beam and a rising up-stemmed beam can run through the chord symbol of a lower note. The highest ink a range allows comes from a note on or above the middle line that carries an up stem inside a beam group (as C5 in [C5 G4]), its chord symbol over its own stem tip: such a note is at most written E5 (its chord symbol about 4.7 spaces above the top line, a marker over it 6.2), and the keyboard's at most its highest note, written C5 (chord symbol about 3.7 spaces above, measured at 3.75; a marker over it 5.2). Down-stemmed beam groups now set the saxophones' lowest ink: a group such as written F♯4 to F♯5 has its stems down, and its beam reaches about 7.4 spaces below the top line (the Middle register), lower than their lowest written note, C4 with its ledger line, 5.7 spaces below. The keyboard's lowest ink is still its lowest written notes, down to C3 with their ledger lines, about 9 spaces below the top line. The placement's estimate covers each of these, a marker over the chord symbol of an up-stemmed note in a beam group included even where no first attack of the sweep fell on one: about 13.7 spaces for the saxophones (6.2 above the top line, 7.5 below), so their top line sits at 73.5 units with about 1.15 spaces clear at each end, and 14.4 for the keyboard (5.2 above, 9.2 below), with its top line at 60 and 0.8 space clear at each end. The keyboard's estimate is unchanged by the stem rule, since a C5 in a beam group can still have its stem up. The position stays at 16 spaces: the worst ink a range can produce, start marker included, spans about 14.4 spaces for the keyboard (the marker over a chord symbol over an up-stemmed C5 in a beam group, down to C3) and about 13.7 for the saxophones (the marker over a chord symbol over an up-stemmed E5 in a beam group, down to a down-stemmed beam group reaching F4), so 15 spaces would leave only about 0.3 space at each end for the keyboard and 0.65 for the saxophones; at 16 the placement leaves 0.8 and 1.15. Both positions share this one size, for every profile, so the frame never changes size with a phrase or the profile selected; only saving or deleting a my instrument that needs more changes it (see [My instrument's written range](#my-instruments-written-range-m3-2026-10-12)).

At the floor, two positions of the built-in size need `2 × 160 × 0.5 = 160` CSS px of height budget. The budget is the small viewport height minus 126 px (the session cue row, 96 px; its gap, 12 px; the frame's phone block padding, 2 × 8 px; its border, 2 × 1 px), so a window needs a small viewport height of 286 px to show the staff below 64rem.

A phone calibration ran the width grid (324 phrases) on landscape phone windows at the heights that matter, with the staff frame at the app's width there (708 px at 740 px wide, 796 px at 844 px wide): 740 × 286, the smallest height that holds the staff; 740 × 300 and 844 × 330, phones about 360 and 390 px tall with their browser toolbar showing. In headless Chromium the small viewport height is the window's height, with no toolbar:

| Window    | Engraved | Notes too wide | No room | Staff space          |
| --------- | -------- | -------------- | ------- | -------------------- |
| 740 × 286 | 324      | 0              | 0       | 5.00 px (height-fit) |
| 740 × 300 | 324      | 0              | 0       | 5.44 px (height-fit) |
| 844 × 330 | 324      | 0              | 0       | 6.38 px (height-fit) |

Every phrase fits in the split layout on all three windows, Sixteenth included, and the scale there is set by the height, not the width: the same for every phrase.

To reproduce the calibration, run (it starts the test servers itself, and takes about a quarter of an hour):

```
CALIBRATE=1 npx playwright test tests/e2e/notation/notation-calibration.spec.ts --project=chromium --workers=1
```

The run prints the three sweep reports: width, height and phone. The height report also fails the run if any profile's ink, start marker included, comes within about one staff space (7.5 units) of a position edge. It also runs the my-instrument sweep below, with its own report.

### My instrument's written range (M3, 2026-10-12)

Measurement M3's staff half: how far my instrument's written range may reach before the shared system-position size grows past 16 staff spaces, and what the size is beyond that, in treble clef and (2026-10-13) in bass clef. The figures come from `planStaffInk` and `planSystemPositionUnits`; the calibration below checks them on real engraved phrases.

A range keeps 16 spaces (160 units) while its ink, start marker included, spans at most 144 units, the C MIDI keyboard's. Two things set that ink: how high and how low the range reaches, and how wide its beam groups can be. A range wider than two octaves has register windows wider than an octave (half the range's width), so a beam group crossing the middle line can hold an up-stemmed note higher than E5, or a down-stemmed one lower than F4, and its chord symbol or beam reaches further. For each highest written note, the lowest written note that still keeps 16 spaces:

| Highest written note | Lowest written note keeping 16 spaces | Span (semitones) |
| -------------------- | ------------------------------------- | ---------------- |
| A4 (MIDI 69)         | B2 (47)                               | 22               |
| B4 (71)              | B2 (47)                               | 24               |
| C5 (72)              | C3 (48)                               | 24               |
| D5 (74)              | D3 (50)                               | 24               |
| E5 (76)              | E3 (52)                               | 24               |
| F5 (77)              | F3 (53)                               | 24               |
| G5 (79)              | G3 (55)                               | 24               |
| A5 (81)              | A3 (57)                               | 24               |
| B5 (83)              | B3 (59)                               | 24               |
| C6 (84)              | C4 (60)                               | 24               |
| D6 (86)              | D4 (62)                               | 24               |
| E6 (88)              | E4 (64)                               | 24               |
| F6 (89)              | G4 (67)                               | 22               |
| G6 (91)              | A4 (69)                               | 22               |

So no range wider than two octaves keeps 16 spaces. A range of exactly two octaves (the narrowest my instrument may have) keeps them from written B2–B4 (MIDI 47–71) up to written E4–E6 (64–88); every other range makes the size grow. Below B2 the lowest note's ledger lines need more room; above E6 the highest note's chord symbol does. A lowest written F counts as E, since a key signature of six sharps spells it E♯: written F3 to F5 keeps 16 spaces with an ink of 144 units, like E3 to E5.

The size for some wider ranges (ink above and below the staff's top line, start marker included):

| Written range             | MIDI   | Ink above / below | Size            |
| ------------------------- | ------ | ----------------- | --------------- |
| D4 to D6 (two octaves)    | 62–86  | 62 / 75           | 160 (16 spaces) |
| E3 to D6 (34 semitones)   | 52–86  | 72 / 85           | 180 (18 spaces) |
| C3 to C6 (three octaves)  | 48–84  | 72 / 92           | 180 (18 spaces) |
| C2 to C4 (low)            | 36–60  | 47 / 127          | 190 (19 spaces) |
| C1 to C3 (very low)       | 24–48  | 47 / 162          | 230 (23 spaces) |
| C6 to C8 (high)           | 84–108 | 127 / 60          | 210 (21 spaces) |
| C3 to C7 (four octaves)   | 48–96  | 92 / 95           | 210 (21 spaces) |
| C2 to C7 (five octaves)   | 36–96  | 92 / 127          | 240 (24 spaces) |
| C2 to C6 (four octaves)   | 36–84  | 82 / 127          | 230 (23 spaces) |

Written C3 to C6 lies inside the built-ins' combined reach (the keyboard's low C3, the saxophones' high C6), but no built-in's range holds both ends, and its register windows of 18 semitones allow wider beam groups, so it needs 18 spaces. A grown size needs a taller window below 64rem: at the floor two positions take as many CSS px as the size has units (230 px at 23 spaces), so a window needs a small viewport height 126 px more than that (356 px at 23 spaces, 286 px at 16).

**In bass clef (2026-10-13).** The model reads a written range in its own clef, on that clef's staff. The [bass clef](music/lexicon.md#bass-clef)'s top line is written A3 and its middle line D3, 12 letter-name steps under the treble clef's F5 and B4; the staff's own reach, the stem rule (down from the middle line up, up below it) and the beam groups are all measured from those lines. So a range in bass clef has the ink, the placement and the size of the range 12 letter steps higher in treble clef, with the same width in semitones: written E0–E5 (MIDI 16–76) in bass clef needs what written C2–C7 (36–96) needs in treble, 24 spaces (240 units). The bass-clef bound (spec D294) therefore keeps the shared size at no more than 24 spaces, like the treble bound C2–C7. A two-octave range keeps 16 spaces in bass clef from written D1–D3 (26–50) up to written G2–G4 (43–67), except the ones starting on D♯1, F1 or F♯1 (27, 29, 30), which need 17; written C2–C4, 19 spaces in treble clef, keeps 16 in bass clef.

| Written range in bass clef                          | MIDI  | Ink above / below | Size            | Same staff positions in treble |
| --------------------------------------------------- | ----- | ----------------- | --------------- | ------------------------------ |
| E0 to E5 (five octaves, the bound)                  | 16–76 | 92 / 127          | 240 (24 spaces) | C2 to C7                       |
| E0 to E4 (four octaves, `bass wide`)                | 16–64 | 82 / 127          | 230 (23 spaces) | C2 to C6                       |
| E0 to E3 (three octaves)                            | 16–52 | 52 / 127          | 200 (20 spaces) | C2 to C5                       |
| C1 to C3                                            | 24–48 | 47 / 102          | 170 (17 spaces) | A2 to A4                       |
| D1 to D3 (the lowest keeping 16 spaces)             | 26–50 | 47 / 97           | 160 (16 spaces) | B2 to B4                       |
| C2 to C4 (`bass low`)                               | 36–60 | 62 / 75           | 160 (16 spaces) | A3 to A5                       |
| E2 to E4                                            | 40–64 | 62 / 75           | 160 (16 spaces) | C4 to C6                       |
| G2 to G4 (the highest keeping 16 spaces)            | 43–67 | 67 / 75           | 160 (16 spaces) | E4 to E6                       |
| C2 to C5 (three octaves)                            | 36–72 | 82 / 85           | 190 (19 spaces) | A3 to A6                       |
| E2 to E5 (three octaves)                            | 40–76 | 92 / 85           | 200 (20 spaces) | C4 to C7                       |
| E3 to E5 (`bass high`, the bound's top two octaves) | 52–76 | 92 / 60           | 170 (17 spaces) | C5 to C7                       |

The calibration checks these predictions on real engraved phrases (`notation-calibration.spec.ts`, its my-instrument test, first run on 2026-10-12 in Chromium; run again on 2026-10-13 with the four bass-clef cases added, about 35 minutes, the treble and built-in rows coming out exactly as on 2026-10-12). It draws each phrase through the harness's player-made instrument, with no transposition, in its clef (`myClef`), at the shared size `planSystemPositionUnits` gives its written range in that clef, draws the start marker over its first attack, and measures the inked rows on pixels as the height calibration above does. Each player-made range runs every register, leapiness and contour, the arpeggio chaos levels Predictable and Chaotic, the three note densities and seeds 1 and 2 (576 phrases); `lowF` runs in written F♯ major, so its lowest note is spelled E♯3. The three built-in profiles run at the `wide` range's grown size (`savedRange`: every register, leapiness Smooth and Angular, every contour, both chaos levels, the three densities, seed 1: 144 phrases each). The four bass-clef cases run the player-made grid in bass clef: the bound E0–E5, `bass low` C2–C4, `bass high` E3–E5 and `bass wide` E0–E4, the mirror of the treble `wide` C2–C6. Values are in engraving units from the position's top edge:

| Case                      | Phrases | Predicted ink above / below | Size engraved | Top line | Highest ink | Start marker top | Lowest ink | Room above | Room below |
| ------------------------- | ------- | --------------------------- | ------------- | -------- | ----------- | ---------------- | ---------- | ---------- | ---------- |
| E4–E6 (64–88)             | 574     | 67 / 75                     | 160           | 76.0     | 24.2        | 34.1             | 141.7      | 24.2       | 18.3       |
| E3–D6 (52–86)             | 572     | 72 / 85                     | 180           | 83.5     | 36.7        | 41.6             | 163.3      | 36.7       | 16.7       |
| low, C2–C4 (36–60)        | 576     | 47 / 127                    | 190           | 55.0     | 17.5        | 18.1             | 180.0      | 17.5       | 10.0       |
| high, C6–C8 (84–108)      | 576     | 127 / 60                    | 210           | 138.5    | 26.7        | 26.6             | 195.0      | 26.6       | 15.0       |
| wide, C2–C6 (36–84)       | 576     | 82 / 127                    | 230           | 92.5     | 20.0        | 20.6             | 217.5      | 20.0       | 12.5       |
| lowF, F3–F5 (53–77) in F♯ | 574     | 62 / 82                     | 160           | 70.0     | 27.5        | 27.8             | 150.0      | 27.5       | 10.0       |
| C MIDI keyboard at 230    | 144     | 52 / 92                     | 230           | 95.0     | 57.5        | 58.1             | 185.0      | 57.5       | 45.0       |
| B-flat tenor at 230       | 144     | 62 / 75                     | 230           | 108.5    | 66.7        | 71.6             | 182.5      | 66.7       | 47.5       |
| E-flat alto at 230        | 142     | 62 / 75                     | 230           | 108.5    | 56.7        | 56.6             | 182.5      | 56.6       | 47.5       |
| bass, bound E0–E5 (16–76) | 572     | 92 / 127                    | 240           | 102.5    | 25.8        | 35.6             | 227.5      | 25.8       | 12.5       |
| bass, low C2–C4 (36–60)   | 576     | 62 / 75                     | 160           | 73.5     | 21.7        | 21.6             | 140.8      | 21.6       | 19.2       |
| bass, high E3–E5 (52–76)  | 574     | 92 / 60                     | 170           | 101.0    | 24.2        | 34.1             | 155.0      | 24.2       | 15.0       |
| bass, wide E0–E4 (16–64)  | 576     | 82 / 127                    | 230           | 92.5     | 50.8        | 55.6             | 217.5      | 50.8       | 12.5       |

Every case engraved at its predicted size, and the SVG's measured height matched it. No ink, start marker included, came closer than 10.0 units (one staff space) to either edge; the smallest rooms are the low and `lowF` cases' 10.0 below, and in bass clef the bound's and `bass wide`'s 12.5 below. The bass-clef bound E0–E5 engraved at 24 spaces (240 units), so it keeps the shared size at no more than 24 spaces, as ruled. `bass wide` reached less high than its treble mirror `wide` (50.8 units of room above, against 20.0): the prediction is an upper bound on what the staff positions allow, and the generator, which works in concert pitch, does not make the same phrases 12 letter steps lower. The built-ins sit centred in the grown size, with far more room than at 160. Sixteen phrases out of 6,192 found no phrase to generate (`search_limit_exceeded`, all at the Sixteenth density with a Rising contour, Leaping or Angular): four in E3–D6's Low register, two each in E4–E6, `lowF` and the E-flat alto, and in bass clef four in the bound's Low register and two in `bass high`'s Middle register. A first run, before the beam-group span followed the register windows, found the `wide` range's ink touching the top of a 210-unit position: a beam group in its two-octave register windows put an up-stemmed note far above the middle line, with its chord symbol over its stem, 72.5 units above the top line where 62 had been planned. The span now follows the windows, and the run above is the one after that change.

To run only this sweep (it starts the test servers itself):

```
CALIBRATE=1 npx playwright test tests/e2e/notation/notation-calibration.spec.ts -g "my instrument's ink" --reporter=line
```

It prints its report and fails if a predicted size is not the size engraved, or if any ink comes within about one staff space (7.5 units) of a position edge.

## Note Identity and Session Overlays

A session marks three things on the engraved score: the start marker over phrase 1's first attacked note at idle, the playhead band behind the measure being played, and the acknowledged notes, lit in their own colour. Their design comes from the phrase-workspace handoff's Notation Contract and UI/UX decisions D131 to D133; this section states every rule as the code implements it. The engraver names every note's own parts in the SVG it draws, and a separate overlay step draws the marks onto that SVG without re-engraving. Only the engraver's report of where VexFlow drew each part imports VexFlow: the identity, the tagging and the overlay step do not.

### Identity

`resolveGlyphIdentities(phrase, phraseNumber)` (`src/notation/note-identity.ts`) is pure. It names every written glyph, measure by measure in written-event order, with the identity of the attack it sounds as. The identity is the one acknowledgement reports, `ExpectedNoteIdentity` (`src/domain/acknowledgement/expected-note.ts`, see [Note identity](midi-acknowledgement.md#note-identity)): phrase number, measure index and event index, the attack's index among its measure's concert events, rests included. An acknowledged identity is therefore drawn on the score unchanged.

- A fresh attack takes its measure's index and its own source event index.
- A glyph tied from the glyph before it takes the identity of the attack it continues: the second piece of a note split inside its measure, a tie continuation across a barline, every glyph of a tie chain across two barlines, and a continuation across the split layout's system break, drawn in the other system's SVG.
- A rest takes none.

It throws `NoteIdentityError` for a phrase number that is not a positive integer, and for a tied glyph whose previous glyph is not a note tied to it: the written phrase is then malformed, and nothing is guessed. The score writes an identity as `noteIdentityKey(identity)`, `<phraseNumber>:<measureIndex>:<eventIndex>`. `engraveWrittenPhrase` resolves the identities before it clears its hosts, so a `NoteIdentityError` reaches the caller as it is, never wrapped as a `NotationError`.

### SVG DOM Contract

After drawing each system, the engraver tags each note glyph's own parts (`tagSystemNoteParts` in `src/notation/note-part-tags.ts`). `describeNoteParts` in `vexflow-mapping.ts` reports where VexFlow drew them: the DOM ids of the note's stavenote, notehead, stem and chord-symbol groups, the glyph strings of its notehead, accidental and dot texts, and whether it drew a flag.

- **Tagged parts.** Every tagged part is a `<g>` carrying `data-note-id` (the key) and `data-note-part`: `notehead`, `stem`, `flag`, `accidental` or `dot`. Because every part is a group, a class on it recolours the part by inheritance, like the staff's own recolouring, without having to reach a bare `<text>`.
- **Glyph texts.** VexFlow draws the notehead, each accidental and each augmentation dot as a bare `<text>` inside the note's `g.vf-notehead` group, the notehead first. Each is wrapped in a new, attribute-less `<g>` at the same place, and that group is tagged. The wrap changes no pixel: the text keeps its own presentation attributes and inherits the same values through the new group.
- **Stems.** An unbeamed note's `g.vf-stem` sits in its `g.vf-stavenote` group. A beamed note's stem is drawn inside the beam's `g.vf-beam` group, among the measure's groups, and is tagged there; the beam group is not.
- **Flags.** An unbeamed flagged note's own `g.vf-flag`, a direct child of its stavenote group.
- **Chord symbols.** VexFlow draws a chord symbol inside the notehead group of the note it is attached to. It carries no `data-note-id`. On an attack, its `g.vf-chordsymbol` group carries `data-chord-for` with the attack's key, which is how the start marker finds it.
- **Ties.** A tie continuation's parts carry its attack's key, so one key can appear in both systems of the split layout.
- **Measure slots.** Each `g.measure-slot` carries its playhead band's rectangle in `data-band-x`, `data-band-y`, `data-band-width` and `data-band-height`, in the SVG's own user units (the engraving units its `viewBox` spans; see Placement).
- **Never tagged:** rests; ledger lines, which VexFlow draws as bare `<path>`s straight in the stavenote group; beams; tie arcs; the stavenote and notehead groups themselves; chord symbols, beyond `data-chord-for`; staves, barlines, clefs, key and time signatures.

An engraving whose structure does not match what VexFlow reported (a notehead group that does not open with its notehead text, an unexpected text, a missing accidental, dot, flag or id) throws inside the engraver and is reported as `notation_engraving_failed`, with no partial notation shown.

### Overlay State

`src/notation/score-overlays.ts` draws the state, which `src/notation/score-overlay-state.ts` defines (re-exported by `score-overlays.ts`), so the workspace holds the state from its first draw while the drawing loads with the staff: `PhraseScore` loads `score-overlays.ts` and `session-staff-positions.ts` on demand with the engraver, through `src/components/notation/load-staff-drawing.ts`, so every engraving finds them loaded. `ScoreOverlays` has three fields: `startMarker`, the note the marker points at, or `null`; `playheadMeasure`, the measure index the band lies behind, or `null`; and `acknowledged`, the notes acknowledged so far. Every field names a note by its identity or a measure by its index, and none carries a pitch, so no overlay can draw a note the phrase does not hold, and nothing marks a missed or wrong note. `NO_SCORE_OVERLAYS` is the idle state, with nothing drawn.

`applyScoreOverlays(svgs, phraseNumber, overlays)` applies a state to the system SVGs on screen, replacing whatever state was applied before:

- **It validates before it mutates.** Every identity named must carry the score's phrase number, and some part must carry its key: a rest, a tie continuation's own index or an index past the measure's events carries none. The band's measure must be drawn. One the engraved phrase lacks throws `ScoreOverlayError`. The step also reads every position it needs (the band's rectangle, the marker's placement) before it changes anything, so a rejected state leaves the score exactly as it was.
- **It clears, then draws.** It removes the previous state's `.start-note-marker` and `.playhead-band` elements and every `note-ack` class, dropping a `class` attribute left empty so the markup is back exactly as engraved, then draws the new state. Applying the same state twice therefore gives the same markup.
- **Acknowledgement.** `note-ack` goes on every part carrying an acknowledged key, in every system, so a tie continuation lights with its attack. Nothing else changes and nothing moves. The colours are in `src/styles/components.css`.
- **Playhead band.** One `rect.playhead-band` with its measure slot's `data-band-*` rectangle, inserted as its system SVG's first child, so it paints behind every glyph there, staff lines included.
- **Start marker.** One `path.start-note-marker`, appended last in its system SVG, so it paints over every glyph. It is placed from the ink drawn now, so the SVGs must be rendered.
- **No animation.** Every change is instant.

`PhraseScore` takes a required `phraseNumber` prop, which phrase of the session it shows (`ScorePanel` passes 1: the idle phrase is the one a session starts with), and an optional `overlays` prop, `NO_SCORE_OVERLAYS` by default. It engraves the phrase as that phrase number, re-engraving when the number changes, and re-applies the current overlays after every successful engraving, once the systems sit in their visible positions, so a redraw for a resize, a layout change or a new phrase keeps them. A change of the overlays alone re-applies them without re-engraving. With no engraved phrase on screen there is nothing to draw on, and the next successful engraving draws the state. An overlay naming a note or measure the engraved phrase lacks is the caller's error: its `ScoreOverlayError` propagates.

During a session (`PhraseScore`'s `session` prop) the playhead comes from the session's staff and the acknowledged notes from the `overlays` prop, and the overlays are applied per phrase (`drawSessionMarks` in `src/components/notation/session-staff-marks.ts`) after every refill, re-engrave and playhead step:

- **One call per phrase on screen.** The systems shown are grouped by phrase number, and `applyScoreOverlays` runs once per phrase on that phrase's SVGs only, so every identity it validates carries that phrase's number.
- **The band on the playhead's phrase only.** The phrase the playhead is in gets `playheadMeasure`; every other phrase on screen gets `null`. During the count-in there is no band.
- **No start marker.** A session draws none.
- **Acknowledged notes drawn on screen.** Of the acknowledged notes, each phrase gets only those whose key some part of its systems on screen carries, so a note of a half already refilled is not named. The list is the session controller's `acknowledged`, empty in a session without a controller.
- **Units fading out are unmarked.** A refilled position's old unit has every mark taken off (`NO_SCORE_OVERLAYS`) as its fade-out starts, so the band never sits on a unit leaving the screen, and that unit is `aria-hidden`.

### Placement

**Playhead band** (D132). The engraver records it on each measure slot (`vexflow-two-system-engraver.ts`):

- Horizontally, from the opening barline to the closing barline. On a system's first measure it starts at the stave's note-start position, after the clef, key and time signatures, so it never tints them.
- Vertically, from one staff space above the top line to one space below the bottom line, pushed out to one space from the centre of any notehead lying further out (a notehead is one space tall, so that is half a space past its edge), and clamped to the 160-unit system position. The span is taken over every note of the system, not measure by measure, so the band keeps one height while it steps along a system. Stems, beams, ties and chord symbols beyond it are not covered.

**Start marker** (D133). A triangle, apex down, 1.2 staff spaces wide and 1 tall, centred on the notehead's ink:

- The reference edge is the higher of the note's own ink and the staff's top line (the top of the stave group's box, which holds only the five staff lines). The note's own ink is every part tagged with its key in its stavenote group, its ledger lines (the stavenote group's bare paths), and, for a beamed note, the beam group over its stem. Should a tie continuation in the same measure also be beamed, the stem nearest the attack's notehead picks the beam.
- The apex sits half a space above that edge. Over a chord symbol (the groups whose `data-chord-for` is the key), it stays there only when the gap from the edge up to the chord symbol's bottom is at least 2 spaces, half a space clear on each side. Otherwise the apex sits half a space above the chord symbol's top. The chord symbol never moves.
- **Measuring ink.** `getBBox()` on a `<text>` returns the font's whole line box, far taller than a music glyph, so each glyph text is measured on a 2D canvas instead: `measureText` in the text's own computed font, from its start-anchored `x`/`y` baseline, at ten times the font size and scaled back, because the canvas reports whole-pixel bounds. A shape's ink is its `getBBox()` widened by half its stroke. Invisible shapes (`opacity="0"`) are left out.

**Where the marker goes on real phrases.** Stems point the way the written phrase says (down on or above the middle line, up below it, a beam group's all one way), and VexFlow sets a chord symbol close over the note's ink: half a space over its own note's up stem tip (never over a beam, which lengthens the stem only later), else about one space over the notehead's centre or the staff's top line, whichever is higher. The gap under a chord symbol so never reaches 2 spaces, and the "between" placement never occurs on real phrases: the marker always goes above the chord symbol. Measured over 25 first attacks (the `simple` fixture and 24 generated phrases across the three instrument profiles and the three registers), all 25 went above the chord symbol. The calibration's wider sweep under Legibility Floor, which draws the marker on every phrase, finds the marker's highest top 16.6 engraving units inside the top system position's top edge, on the B-flat tenor's High register. The between placement is checked by raising a drawn chord symbol in the marker spec (see Verification).

## Check Note

The controller connection's transposition check shows the player one [written pitch](music/lexicon.md#written-pitch) to play (see [The transposition check](controller-connection.md#the-transposition-check)). `engraveCheckNote(target, writtenMidi, clef)` in `src/notation/vexflow-check-note-engraver.ts` draws it through the same pipeline as the score, so the note reads exactly like a note on the staff; it is never shown as a letter name.

- **What it draws.** A short staff in the selected instrument's [clef](music/lexicon.md#clef) (`CheckNote.vue`'s `clef` prop: the [treble clef](music/lexicon.md#treble-clef) for a built-in profile, my instrument's own, treble or [bass](music/lexicon.md#bass-clef), once chunk 20 passes it) with no key signature and no time signature, holding one [whole note](music/lexicon.md#whole-note), then a closing barline two staff spaces after it. The note is spelled in C major (`spellMidiInKey` with a written C major key), so a black key is the sharp of the letter below, and its accidental is drawn. The `StaveNote` comes from the score's own `buildStaveNote` (`vexflow-mapping.ts`), so its glyphs, accidental and [ledger lines](music/lexicon.md#ledger-line) are the score's.
- **Size.** The scale is the score's largest staff space (`NOTATION_MAX_STAFF_SPACE_PX`), so the lone note reads at a glance. The width is the clef's room plus the note's own width plus the trailing space. The height covers the staff, its clef's ink above and below it (the G clef reaches about 1.4 staff spaces over the top line and 1.7 under the bottom one, the F clef about 0.05 over and none under), and the note's ink with its ledger lines and the tallest accidental it may carry, plus half a staff space all round; a note far above or below the staff makes a taller SVG. The stave is built twice: once at a scratch width to measure where notes start after the clef, then at its final width.
- **Marked like a score system.** The SVG is a `staff-svg` with `role="img"`, so `.check-note .staff-svg` recolours it from `--color-staff` by inheritance, as `.staff-frame .staff-svg` does the score, and it follows the theme with no redraw.
- **Ledger lines take the staff colour.** VexFlow writes a stroke colour of its own on each ledger line (a whole note's only bare `<path>` in its stavenote group), which would override the inherited colour. `engraveCheckNote` removes that attribute after drawing, so the ledger lines take the staff colour in both themes like every other shape. The fix is local to the check note: the score's own engraving is unchanged.
- **Its accessible name** follows the words of the score's description (`score-description.ts`): "Written note C 4", "Written note C sharp 5". The alteration words are copied into the check-note module rather than imported, so naming the note adds nothing to the entry chunk.
- **Failures.** A value that is not an integer MIDI note number from 0 to 127 throws a `RangeError` before `target` is touched. A drawing failure empties `target` and throws a `NotationError` (`notation_engraving_failed` for anything not already one). The caller waits for `ensureNotationFonts()` first, as the score does.
- **Loading.** `vexflow-engraver.ts` re-exports `engraveCheckNote`, so the check note ships in the lazy engraver chunk and `CheckNote.vue` reaches it through `loadVexflowEngraver()`, like the staff. The connection sheet's own chunk carries no VexFlow.

## Accessible Representation

Each successful engraving includes a text equivalent of what is drawn:

- **Summary.** `describeWrittenPhrase` builds one summary sentence covering the display mode, clef, key, meter, and measure count. The top system's SVG carries it as its `aria-label`. In the split layout, the bottom system's SVG is `aria-hidden`: the phrase's one description already covers bars 3 and 4, so the phrase is announced once. During a session each phrase on screen is named once the same way, on the first of its systems shown, its other system `aria-hidden`.
- **Measure descriptions.** One plain-language description per measure lists, in order, the chord symbols, the notes (spelled pitch, octave, value, and displayed accidental or tie), and the rests. They sit in a visually hidden element that the top system's SVG references with `aria-describedby`. During a session the description follows the playhead's phrase (phrase 1 during the count-in), referenced from that phrase's named system.
- **Updates.** The description is replaced only when a new score is swapped in, and it is cleared with the score on failure. Assistive technology therefore never hears a description of notation that is not on screen.

## Verification

- **Unit tests** in `tests/unit/domain/notation/`, `tests/unit/notation/`, and `tests/unit/composables/generation-session-notation.spec.ts` cover:
  - transpositions, spelling, and tie-breaks;
  - key, chord, and slash-bass consistency;
  - quality preservation and rhythm segmentation;
  - deep-frozen inputs, and unchanged source and session state across display switches;
  - the layout planner: the layout chosen by the breakpoint alone, the scale fitting the width and the height, the two typed failures, and the phrase-independent position size; `planStaffRoom`'s room, its two causes, its rejection of an unusable width, and its agreement with `planSystemLayout` on "no room" for any phrase;
  - the staff placement: derived from the written range alone, lower in its position for the saxophones than for the keyboard, with every adopted profile's estimated ink, start marker included, at least 0.8 staff space inside the position, and covering the beam groups its phrases can hold (a saxophone down-stemmed group reaching F4, the marker over the chord symbol over an up-stemmed note inside a beam group: the keyboard's C5 and the saxophones' E5) and a lone down stem from B4;
  - the shared system-position size (`tests/unit/notation/system-position-size.spec.ts`): 160 with no my instrument saved or one whose ink stays within 144 units, growth by whole staff spaces beyond that, never below 160 and never shrinking as a range widens; the placement and the positions in a grown size, the built-ins' placements (73.5 and 60) unchanged at 160; a lowest written F placed at E, checked against every written key's spelling of a range's outer notes; a range read in its own clef, a bass range taking the ink, placement and size of the treble range 12 letter steps higher (written C2 to C4 160 in bass clef, 190 in treble; E0 to E5 240), and the calibration's bass-clef predictions; and the beam-group span widening with the register windows, checked against every written key's spelling of every interval a window can hold;
  - my instrument's written phrase (`tests/unit/domain/notation/written-phrase-my-instrument.spec.ts`): for every transposition of 0 or 1 octave and 0 to 11 semitones, lower and higher, every note and chord root at concert plus the chromatic count, the written key the chosen one whatever the transposition, and the written range my instrument's; and 6 semitones higher, written in F♯: F♯ major (six sharps, not G♭ major), written F spelled E♯;
  - the note identities (`tests/unit/notation/note-identity.spec.ts`): a fresh attack, a rest, a note split inside its measure, a tie across a barline and a tie chain across two barlines, exactly the expected notes acknowledgement derives on every acknowledgement fixture phrase, and the two `NoteIdentityError` rejections;
  - the Review's engraving (`tests/unit/components/review/`): the lazy-engraving scheduler (near items only, nearest first, one at a time, releases beyond the retained area, re-engraving on an input change, 2 000 items scrolled through), and `ReviewPanel` over a fake engraver (the reserved positions in both layouts, each phrase drawn from its stored record at its own phrase number, the two notes, a repeat drawn like any other phrase, no session mark, the room notice in the list's place).
- **Browser tests** in `tests/e2e/notation/` run against a dedicated harness (`tests/e2e/notation-harness/`, built with `npm run build:notation-harness`). The harness mounts `PhraseScore` inside a real `staff-frame` with the app's own stylesheet, so below 64rem the frame's `max-block-size` gives the same height budget as in the app, and it publishes a running `engraveCount` with every state. Its generated source also takes optional `contour` and `leapiness` URL parameters (default `Arch` and `Shaped`), which the calibration varies, and a player-made instrument (`myLow`, `myHigh`, `myOctaves`, `mySemitones`, `myDirection`, and its clef `myClef`, treble or bass); any source takes `savedRange` (with `savedClef`, treble by default), a saved my instrument's written range setting the shared size (see [the testing guide](testing.md#the-notation-harness)). The tests run the real generation-to-engraving pipeline and hand-built fixtures on Chromium, the only browser project the notation, end-to-end, and accessibility suites run on. They assert:
  - that every element type is present;
  - one system inside the container on wide layouts with the bottom position reserved and blank, and, on a landscape-phone viewport, every phrase split into two aligned systems, each its own SVG, with the line-crossing tie drawn as a partial tie in each (`notation-layout.spec.ts`);
  - the two typed layout failures in one small container, and "no room" for a window too short or too narrow;
  - two systems fitting at the floor down to a 286 px small viewport height and "no room" at 285 px, the scale on 740 × 300 and 844 × 330 phone windows, the phone frame's 8 px block padding, and the 418 px frame from 64rem up;
  - a lower scale in a shorter phone window, and no re-engraving when only the signals of a browser toolbar change (headless Chromium has no toolbar, so the test fires its resize events while the small viewport height stays put);
  - font readiness, resize redraw, and a typed failure clearing the staff and its description;
  - offline operation;
  - unchanged source data across display switches;
  - the note-identity tags and band rectangles on every note's parts, in both layouts and across the system break (`notation-note-identity.spec.ts`);
  - the overlays: acknowledgement lighting only the note's own parts, the band behind its system stepping across both systems, a rejected identity drawing nothing, and a re-engrave keeping the overlays (`notation-overlays.spec.ts`), and the start marker's placement on drawn pixels (`notation-overlays-marker.spec.ts`);
  - the pre-draw checks on the real engraver (`notation-fit-checks.spec.ts`): `planWrittenPhraseFit` agreeing with the engraving in one small container (`dense` too wide, `simple` fits), no room too narrow and too short; `planStaffRoomForKey` needing more width for seven sharps than for C major, and finding no room exactly where the fit of a C major phrase finds none; and `layout-inputs` reported once at the first measurement, again on a real width change, not on a signal that changes nothing, and before the engraving.
  - one system part at a time (`notation-phrase-systems.spec.ts`): `engravePhraseSystem`'s split halves and whole part drawn exactly as `engraveWrittenPhrase` draws them, a held layout at its own scale in the window's budget, a mismatched part rejected before the host is touched, a layout failure leaving the host empty, and the note ids carrying the given phrase number.
  - my instrument (`notation-my-instrument.spec.ts`): a player-made instrument sounding 6 semitones higher, written in F♯, engraved with six sharps in its key signature, its chord roots and notes spelled with sharps (written F as E♯) in its description; the shared size 160 for a written range inside the built-ins' reach (D4 to D6), 180 for one wider than two octaves (E3 to D6), 190 for one reaching low (C2 to C4, transposing or not), and 190 for the C MIDI keyboard while a saved my instrument needs it, each SVG's `viewBox` that size and its height that size times the scale; and, in bass clef (`myClef=bass`, written C2 to C4 in D major, a phrase on both sides of D3): an F clef on its fourth line on both systems of the split layout; every notehead on its bass-clef line or space, read from the description's pitches; stems down from D3 up and up below it, each beam group's by the group rule; the key signature's sharps (F♯3 on the fourth line) and flats (B♭2 on the second line) one staff line lower, relative to the top line, than in treble; "bass clef" in the accessible name; the same written notes, glyph facts and identities as the same phrase in treble clef, each note 12 steps lower on its staff; the check note on an F clef staff, written D3 on its middle line; and the shared size read in the clef: written C2 to C4 160 in bass and 190 in treble, the bound E0 to E5 240, and the C MIDI keyboard at a saved bass-clef instrument's 160 and 240;
  - the check note (`notation-check-note.spec.ts`): by default one whole note on a treble staff with no key or time signature, named in words; written C4 seven staff steps below C5, on one ledger line with no colour of its own; a black key spelled as a sharp with its accidental; a second call replacing the first; a value that is no MIDI note throwing before the host is touched; the SVG inside its `.check-note` box at every height; the staff colour in both themes; and no axe violation.

  Chromium also keeps fixed-seed screenshot baselines: one system per instrument profile on the desktop, the whole staff frame on a 740 × 360 phone window, where a sparse fixture is split at idle, and the overlays in the light and dark themes (listed in [the testing guide](testing.md#visual-baselines)). `npm run test:notation` runs as part of `npm run quality`.

## Upgrade Procedure

1. Read the VexFlow release notes for changes to the classes and methods listed under Engraving Library Boundary. Check the `vexflow/bravura` entry and font loading especially.
2. Install the new exact version with `npm install --save-exact vexflow@<version>`.
3. Re-check the embedded fonts' versions and licenses. If they changed, update the Fonts and Licenses table.
4. Run the notation unit tests and browser tests, `npm run lint`, and the typecheck, and fix any adapter breakage inside the three adapter files only.
5. Re-run the calibration from Legibility Floor. If a changed formatter or glyph metrics move the required widths or the ink's height, re-evaluate the floor and the system position constants, and record the new numbers here.
6. Review the screenshot diffs by eye before regenerating the baselines with `--update-snapshots`. Never regenerate them without that review.
7. Run `npm run build` and confirm the fonts are still bundled and no network font request is made (the offline browser test).
