# Notation and Engraving

This document records how a generated four-measure phrase becomes a written score on screen: the pure display transformation, the pinned engraving library boundary, the bundled font assets and their licenses, the mapping from written-phrase objects to engraving objects, the staff layout's sizing and failure policy, the accessible score representation, and the procedure for upgrading the engraving library.

## Pipeline

Notation is a strict consumer of a successful generation. It never changes a generation request, a generation result, or the generator's internal state, and it can be repeated for any display convention without regenerating.

1. **Input** — `notationInputFromOutcome(outcome, intent)` (`src/domain/notation/notation-input.ts`) accepts only a `generation_success` outcome whose request identity matches the intent. It takes three things by reference, without copying or mutating them:
   - the concert event timeline from the result;
   - the tonal context (tonal center and collection) from the intent's controls;
   - the chord symbols derived from the selected harmony candidate in `outcome.provenance.harmony`.

   Each harmony span becomes one concert chord symbol at its start. The chord is restated at the downbeat of every measure the span crosses, and the spans must tile all four measures exactly. Triad quality maps to a suffix: major is empty, minor is `m`, diminished is `dim`. Planner internals are never consulted.

2. **Transformation** — `transformToWrittenPhrase(input, mode)` (`src/domain/notation/written-phrase.ts`) is pure. It returns a deep-frozen `WrittenPhrase` (`src/domain/notation/written-phrase-types.ts`) that has everything engraving needs and nothing it has to infer: clef, meter, spelled key, and four measures of written notes and rests with notated durations, ties, beam groups, displayed accidentals, and spelled chord symbols. Calling it again with another mode is how a display switch works. The source input is left untouched.
3. **Description** — `describeWrittenPhrase(phrase)` (`src/domain/notation/score-description.ts`) produces the spoken-English summary and per-measure text (see Accessible Representation).
4. **Engraving** — `engraveWrittenPhrase(targets, phrase, containerWidthPx, viewport)` (`src/notation/vexflow-engraver.ts`) plans the layout the viewport selects and draws one SVG per staff system into its host (the top host alone in the one-system layout, both in the split layout), or throws a typed `NotationError` (`src/notation/notation-error.ts`).
5. **Component** — `PhraseScore.vue` (`src/components/notation/PhraseScore.vue`) sits inside `staff-frame` in every state and holds the staff's two reserved system positions, sized from the viewport whether or not there is a phrase. It waits for fonts and a measured container, engraves into hidden staging hosts, and moves the systems into their positions only after the whole phrase succeeds. It re-engraves when the phrase, the container width, the height budget or the layout changes, and emits either `engraved` or `notation-error`.

## Display Conventions and Spelling

Display conventions are defined in `src/domain/notation/notation-mode.ts`. Every mode uses the treble clef. Written pitch is concert pitch plus a fixed transposition:

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
- **Import boundary.** Only `src/notation/vexflow-mapping.ts`, `src/notation/vexflow-engraver.ts`, and `src/notation/vexflow-two-system-engraver.ts` (one system's staves and measures, in either layout) may import `vexflow`. ESLint enforces this with `no-restricted-imports`. Everything else, including the Vue component, talks to the adapter through `WrittenPhrase`, `EngravedScore`, `NotationError`, and `ensureNotationFonts`.
- **Entry point.** The adapter imports from `vexflow/bravura`. This entry registers the Bravura music font and the Academico text font and sets them as the default fonts.
- **API surface.** The adapter uses only this part of VexFlow:
  - `Renderer`, with the SVG backend, `resize`, `getContext`, and context `scale`, `openGroup`, and `closeGroup`;
  - `Stave`, with `addClef('treble')`, `addKeySignature`, `addTimeSignature('4/4')`, `setEndBarType(Barline.type.END)`, `getNoteStartX`, and `setNoteStartX`;
  - `StaveNote`, built from `keys` and a `duration` code;
  - `Accidental`, `Dot.buildAndAttach`, `ChordSymbol` (`addText`, `addGlyphOrText`, and `setVertical(TOP)`), `Beam`, `StaveTie`, and `Voice` (with strict tick counting);
  - `Formatter`, with `joinVoices`, `formatToStave`, and `preCalculateMinTotalWidth`.
- **Output contract.** The only structural contract other code may select on is this:
  - one `svg.staff-svg` with `role="img"` per staff system, inside its own `staff-content` unit in its system position (`[data-system-position="top"]` or `"bottom"`);
  - one `g.measure-slot` per measure, carrying `data-measure-index` 0 to 3 and `data-system-index` (0 on the top system, 1 on the split layout's bottom system).

  VexFlow's own `vf-*` classes are internal to the adapter and its browser tests.

## Fonts and Licenses

The fonts ship inside the VexFlow package. `vexflow/bravura` inlines them as base64 `woff2` data URIs and loads them with the `FontFace` API. The bundle therefore carries them, the application never fetches a font from the network, and notation works offline. Only the notation code path pulls them in, and no CDN font link is used.

| Font      | Role                         | Version                     | Copyright                                                                | License                   |
| --------- | ---------------------------- | --------------------------- | ------------------------------------------------------------------------ | ------------------------- |
| Bravura   | SMuFL music glyphs           | as shipped in VexFlow 5.0.0 | © 2021 Steinberg Media Technologies GmbH, Reserved Font Name "Bravura"   | SIL Open Font License 1.1 |
| Academico | Chord-symbol and text glyphs | 0.902                       | © 2022 Steinberg Media Technologies GmbH, Reserved Font Name "Academico" | SIL Open Font License 1.1 |

The license facts were read from each embedded font's own name table. That table also carries the full OFL 1.1 text, so the license travels with the font data. The OFL permits bundling and redistributing the fonts with software. It forbids selling the fonts by themselves and using the reserved names for modified versions. The fonts are used unmodified. VexFlow itself is MIT-licensed.

`ensureNotationFonts()` loads both faces through `document.fonts.load` and waits for `document.fonts.ready`. It throws `notation_font_unavailable` if the fonts are not usable. Engraving never measures or draws before this resolves, because fallback-font metrics would produce a wrong layout.

## Domain-to-Engraving Mapping

| Written phrase                     | VexFlow object                                                                                                                                                                                                                                                                                                                                |
| ---------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `clef: 'treble'`, 4/4 meter        | First `Stave`: `addClef('treble')`, `addTimeSignature('4/4')`                                                                                                                                                                                                                                                                                 |
| `key.signature`                    | First `Stave`: `addKeySignature(<Ionian tonic>)`, or `C` when the signature is empty                                                                                                                                                                                                                                                          |
| Each of the 4 measures             | One `Stave` at a computed x position, all four on one staff system in the one-system layout. In the split layout, bars 3 and 4 are a second system, drawn in their own SVG, whose staves reuse the x positions and widths of bars 1 and 2 and whose first stave repeats the clef and key signature (not the time signature). The last measure ends with a final barline. |
| `WrittenNote`                      | `StaveNote` with key `<letter><#/b…>/<octave>` and duration code `w`, `h`, `q`, `8` or `16`, plus `d` when dotted                                                                                                                                                                                                                             |
| `WrittenRest`                      | Rest `StaveNote` with the same duration code plus `r`, positioned at `b/4` (a whole rest at `d/5`, hanging from the fourth line)                                                                                                                                                                                                              |
| `accidental` (only when displayed) | `Accidental` with code `bb`, `b`, `n`, `#` or `##`                                                                                                                                                                                                                                                                                            |
| Dotted duration                    | Dot encoded in the duration code (so the tick count is correct) plus a `Dot` modifier                                                                                                                                                                                                                                                         |
| `beamGroups`                       | One `Beam` per group                                                                                                                                                                                                                                                                                                                          |
| `tieToNext` / `tieFromPrevious`    | `StaveTie` between consecutive glyphs, including across barlines. A tie from bar 2 into bar 3 in the split layout is drawn as two partial `StaveTie`s, one in each system's SVG: one leaving the last note of the top system and one arriving at the first note of the bottom system.                                                  |
| `WrittenChordSymbol`               | `ChordSymbol` on the glyph at the same start tick: root letter, accidental glyph, suffix, and optional `/bass`                                                                                                                                                                                                                                |

The adapter draws exactly what the written phrase says. It never re-spells, re-derives accidentals, or re-segments rhythm, and it relies on no automatic VexFlow accidental, beam, or spelling logic.

## Sizing and Failure Policy

The staff layout is chosen by the viewport width alone, never by a phrase, and one layout is never tried before the other:

- **One-system layout**, from the 64rem tablet-landscape breakpoint up: all four measures on one staff system.
- **Split layout**, below 64rem (the landscape phone): bars 1 and 2 on a top system, bars 3 and 4 on a bottom system, for every phrase, however short, at idle as in a session. The bottom system repeats the clef and key signature but not the time signature.

The staff area always reserves **two system positions**, one above the other, in every state: no phrase yet, loading, ready, and failed. Both positions have one block size for the viewport, never for a phrase. Each position that shows notes holds its own `staff-content` unit with its own SVG. In the one-system layout the phrase sits in the top position and the bottom one stays blank. In the split layout the top position holds bars 1 and 2 and the bottom one bars 3 and 4, both at the phrase's one scale. The notation is never scrolled horizontally, clipped, or shrunk below the floor, and never split into more than two systems.

The constants live in `src/notation/notation-layout-policy.ts`:

- `NOTATION_ENGRAVING_UNITS_PER_STAFF_SPACE = 10` is VexFlow's native geometry.
- `NOTATION_LEGIBILITY_FLOOR_STAFF_SPACE_PX` is the smallest staff space, in CSS pixels, at which the score may be drawn. The Legibility Floor section below gives its value and rationale.
- `NOTATION_MAX_STAFF_SPACE_PX` is the largest staff space, reached on wide containers.
- `NOTATION_SYSTEM_POSITION_UNITS = 175` is one system position's block size in engraving units (17.5 staff spaces), and `NOTATION_STAFF_TOP_LINE_UNITS = 80` is where the staff's top line sits inside it. They hold every written pitch any instrument profile reaches, with its stems, beams, ledger lines and chord symbols (see the height calibration below).
- `NOTATION_MIN_MEASURE_WIDTH_UNITS = 40` is the narrowest content width a measure is ever drawn at, about one whole note with its margins.
- `NOTATION_PHONE_LAYOUT_MEDIA_QUERY = '(max-width: 63.9375rem)'` mirrors the workspace's 64rem tablet-landscape breakpoint. While it matches, the split layout applies. The stylesheet's phone staff block uses the same width-only query, so the two always agree on the side.

`planSystemLayout` plans the phrase in engraving units at scale 1. With `m` measures per system (4, or 2 in the split layout):

```
widest        = max(NOTATION_MIN_MEASURE_WIDTH_UNITS, widest measure minimum width)
requiredUnits = leadingWidth + m × widest + systemPadding
widthScale    = containerWidth / requiredUnits
heightScale   = heightBudget / (2 × NOTATION_SYSTEM_POSITION_UNITS)      (split layout only)
scale         = min(maxStaffSpace / 10, widthScale, heightScale)
position      = NOTATION_SYSTEM_POSITION_UNITS × min(maxStaffSpace / 10, heightScale)
```

- `leadingWidth` is the clef, key signature, and time signature on the first stave. Each measure's minimum width comes from VexFlow's formatter.
- Every measure gets the same width, so the measures read as visibly equal. The two systems of the split layout share the same column positions, so bar 3 sits directly under bar 1 and bar 4 under bar 2. The bottom system's notes are forced to start at the top system's note-start position, so the columns stay aligned although it carries no time signature. A system spans the container's full width: when the height sets the scale, the measures widen to fill it.
- The position size does not depend on the phrase. From 64rem up, where the scale fits the width only, it is the position height at the maximum scale (210 px at 12 px per staff space), so every phrase fits it. The frame keeps its fixed minimum block size (24rem) and grows past it to hold both positions, to about 454 px with its padding and border, about 70 px taller than v1's frame. Below 64rem it is the position height at the height-fit scale. A phrase whose width needs a smaller scale is drawn smaller, at the top of its position.
- **The height budget** is read by `PhraseScore` from `staff-frame`'s computed `max-block-size`, minus the frame's block padding and border. The stylesheet builds that maximum from `--staff-systems-phone-block-budget`: the small viewport height (`100svh`, the height with the browser's toolbars showing) minus the session cue row, its gap and the frame chrome. No pixel value is written in application code. Because the budget uses the small viewport height, a browser toolbar showing or hiding changes neither the budget nor the scale.

A phrase that cannot be drawn at the floor fails in one of two ways. The planner returns them as distinct outcomes, and the engraver throws them as distinct `NotationError` codes (`isStaffLayoutFailure` tells them apart from the retryable ones):

- **No room** (`notation_no_room`): the window cannot hold the layout at the floor, whatever phrase it holds. It is too narrow for the leading width plus `m` measures at the minimum measure width plus padding, or, below 64rem, too short for the two positions (`2 × 175 × 0.5 = 175` CSS px of budget). Only a window change cures it. This is checked first.
- **Notes too wide** (`notation_notes_too_wide`): the window has room, but this phrase's widest measure needs more width than the floor allows. Another phrase may fit.

Both carry numeric details: the container width and the required width, or the height budget and the required height. What the workspace shows for each is the caller's decision; until the room notice and the idle fit retries exist, the workspace shows both as the retryable notation error.

The other codes stay retryable:

- `notation_bounds_exceeded`: a drawn system is wider than the container. The height needs no such check: the position is fixed and holds every profile's written range. An SVG box could not measure it anyway, because VexFlow draws every music glyph as `<text>`, whose box is the font's whole line box rather than the glyph.
- `notation_font_unavailable`: the notation fonts could not be loaded.
- `notation_container_unavailable`: the container has no usable width, the height budget is not a number, or no SVG root was produced.
- `notation_engraving_failed`: any other engraving-library failure, wrapped with its cause.

In every failure no partial notation is shown. Both positions are cleared, together with the description.

Redraw rules: engraving starts only after the fonts are ready and the container has a measured width. `PhraseScore` checks its inputs (the container width, and the layout with its height budget) on every container resize, window resize and breakpoint crossing, coalesced to one check per animation frame. It re-engraves only when one of them changed, or when the phrase changed. Any other signal, such as a browser toolbar showing or hiding, leaves the staff untouched. A redraw keeps each position's `staff-content` unit and replaces only its SVG, so the unit's entrance fade does not replay.

### Legibility Floor

The floor is **5 px** per staff space. It was signed off as the product legibility floor on 2026-09-24. The maximum of **12 px** is an engineering choice that stops sparse phrases on wide desktops from growing past a comfortable reading size, and it has not been separately signed off.

One CSS reference pixel is about 0.26 mm at normal viewing distance. At that scale:

| Staff space | Physical size | Comparable printed size                                                      |
| ----------- | ------------- | ---------------------------------------------------------------------------- |
| ~7 px       | ~1.75 mm      | standard instrumental part                                                   |
| 5 px        | ~1.3 mm       | pocket or choral score                                                       |
| ~4.5 px     | ~1.2 mm       | miniature study score                                                        |
| below ~4 px | under ~1 mm   | smallest traditional rastral sizes, poorly suited to sight-reading on screen |

Calibration measured `requiredUnits` for real generated phrases in Chromium. ISS-004 retired the
Mixed note density and replaced it with the rhythmic-variety control, so the sweep now covers:

- note densities Quarter, Eighth, Sixteenth;
- rhythmic variety Strict, Slightly varied, Heavily varied;
- syncopation Straight and Occasional offbeats;
- silence Conversational;
- seeds 1 to 6;
- all three instrument profiles, each in its own written pitch.

That is 324 phrases (9 density/variety cells × 36 each), and none failed to generate. The minimum
container width a phrase needs for one system of four measures is `requiredUnits × staffSpacePx / 10`.

| Density / variety           | requiredUnits min / median / max | Worst-case width at 7 px | 6 px   | 5 px   | 4.5 px |
| ---------------------------- | --------------------------------- | ------------------------- | ------ | ------ | ------ |
| Quarter / Strict              | 383.0 / 519.7 / 587.8             | 411 px                     | 353 px | 294 px | 264 px |
| Quarter / Slightly varied      | 383.0 / 519.7 / 587.8             | 411 px                     | 353 px | 294 px | 264 px |
| Quarter / Heavily varied       | 519.7 / 753.4 / 830.3             | 581 px                     | 498 px | 415 px | 374 px |
| Eighth / Strict                | 825.5 / 916.5 / 1000.8            | 701 px                     | 600 px | 500 px | 450 px |
| Eighth / Slightly varied        | 825.5 / 916.5 / 993.4             | 695 px                     | 596 px | 497 px | 447 px |
| Eighth / Heavily varied         | 685.6 / 865.1 / 993.4             | 695 px                     | 596 px | 497 px | 447 px |
| Sixteenth / Strict              | 1222.3 / 1363.9 / 1642.9          | 1150 px                    | 986 px | 821 px | 739 px |
| Sixteenth / Slightly varied      | 1180.0 / 1321.1 / 1642.9          | 1150 px                    | 986 px | 821 px | 739 px |
| Sixteenth / Heavily varied       | 1104.3 / 1321.1 / 1600.3          | 1120 px                    | 960 px | 800 px | 720 px |

Quarter and Eighth are unaffected or nearly unaffected by `Strict` versus `Slightly varied`
(identical at Quarter, since `Slightly varied` adds no extra beat cells there), and widen somewhat
under `Heavily varied`. Sixteenth is the widest density at every variety level, roughly unchanged
across levels (`Heavily varied`'s longer merged cells trade attack count for width, offsetting the
extra beat-cell choices).

The workspace breakpoints are 48rem, 64rem, and 90rem, which is 768, 1024, and 1440 CSS px. Because the score takes the full content width before controls move below it, at the 5 px floor:

- From 64rem up, where one system holds all four measures, every measured phrase fits at every rhythmic variety level: the worst case is 821 px (Sixteenth), under the 1024 px breakpoint.
- Below 64rem the split layout puts two measures on each system, so a system needs about half the width. There the height is what limits the scale on a landscape phone (see the phone calibration below).

A 7 px floor would leave every phrase still under the 90rem (1440 px) breakpoint (worst case 1150 px, Sixteenth), but not every phrase at 64rem. For every measured phrase to fit one system at 48rem, the floor would have to drop to about 4.7 px (768 px / 1642.9 requiredUnits × 10), which is not legible for sight-reading; the split layout is what serves those widths.

A height calibration measured how far each system's ink reaches, on pixels: each system is screenshotted over a transparent page and its first and last inked rows are found. `getBBox()` cannot be used for this, because VexFlow draws every music glyph as `<text>`, whose box is the font's whole line box. The sweep covers every register, leapiness and contour, the three note densities, seeds 1 to 3 and the three instrument profiles (1,296 phrases, one of which found no phrase to generate). Values are in engraving units from the system position's top edge; the staff's top line is at 80 and its bottom line at 120. No system's ink touched either edge of its position:

| Profile and register  | Highest ink | Lowest ink |
| --------------------- | ----------- | ---------- |
| C MIDI keyboard, Low    | 48.3        | 165.0      |
| C MIDI keyboard, Middle | 48.3        | 150.0      |
| C MIDI keyboard, High   | 48.3        | 136.7      |
| B-flat tenor, Low       | 43.3        | 136.7      |
| B-flat tenor, Middle    | 28.3        | 136.7      |
| B-flat tenor, High      | 8.3         | 136.7      |
| E-flat alto, Low        | 48.3        | 136.7      |
| E-flat alto, Middle     | 28.3        | 136.7      |
| E-flat alto, High       | 13.3        | 136.7      |

The highest ink is a chord symbol over the saxophones' highest written notes (up to C6), about 7.2 staff spaces above the top line. The lowest is the C MIDI keyboard's lowest written notes (down to C3) with their ledger lines, about 8.5 spaces below the top line. The 175-unit position keeps every system inside it with a margin of about one staff space at each end. Both positions share this one size, for every profile, so the frame never changes size with a phrase or a profile.

At the floor, two positions need `2 × 175 × 0.5 = 175` CSS px of height budget. The budget is the small viewport height minus about 142 px (the session cue row, its gap and the frame chrome), so a window needs a small viewport height of about 317 px to show the staff below 64rem.

A phone calibration ran the width grid (324 phrases) on the two landscape phone windows the app is checked on, with the staff frame at the app's width there (708 px at 740 × 360, 796 px at 844 × 390). In headless Chromium the small viewport height is the window's height, with no toolbar:

| Window    | Engraved | Notes too wide | No room | Staff space        |
| --------- | -------- | -------------- | ------- | ------------------ |
| 740 × 360 | 324      | 0              | 0       | 6.23 px (height-fit) |
| 844 × 390 | 324      | 0              | 0       | 7.09 px (height-fit) |

Every phrase fits in the split layout on both windows, Sixteenth included, and the scale there is set by the height, not the width: the same for every phrase.

To reproduce the calibration, run (it starts the test servers itself, and takes about a quarter of an hour):

```
CALIBRATE=1 npx playwright test tests/e2e/notation/notation-calibration.spec.ts --project=chromium --workers=1
```

The run prints the three sweep reports: width, height and phone.

## Accessible Representation

Each successful engraving includes a text equivalent of what is drawn:

- **Summary.** `describeWrittenPhrase` builds one summary sentence covering the display mode, clef, key, meter, and measure count. The top system's SVG carries it as its `aria-label`. In the split layout, the bottom system's SVG is `aria-hidden`: the phrase's one description already covers bars 3 and 4, so the phrase is announced once.
- **Measure descriptions.** One plain-language description per measure lists, in order, the chord symbols, the notes (spelled pitch, octave, value, and displayed accidental or tie), and the rests. They sit in a visually hidden element that the top system's SVG references with `aria-describedby`.
- **Updates.** The description is replaced only when a new score is swapped in, and it is cleared with the score on failure. Assistive technology therefore never hears a description of notation that is not on screen.

## Verification

- **Unit tests** in `tests/unit/domain/notation/`, `tests/unit/notation/`, and `tests/unit/composables/generation-session-notation.spec.ts` cover:
  - transpositions, spelling, and tie-breaks;
  - key, chord, and slash-bass consistency;
  - quality preservation and rhythm segmentation;
  - deep-frozen inputs, and unchanged source and session state across display switches;
  - the layout planner: the layout chosen by the breakpoint alone, the scale fitting the width and the height, the two typed failures, and the phrase-independent position size.
- **Browser tests** in `tests/e2e/notation/` run against a dedicated harness (`tests/e2e/notation-harness/`, built with `npm run build:notation-harness`). The harness mounts `PhraseScore` inside a real `staff-frame` with the app's own stylesheet, so below 64rem the frame's `max-block-size` gives the same height budget as in the app, and it publishes a running `engraveCount` with every state. Its generated source also takes optional `contour` and `leapiness` URL parameters (default `Arch` and `Shaped`), which the calibration varies. The tests run the real generation-to-engraving pipeline and hand-built fixtures on Chromium, the only browser project the notation, end-to-end, and accessibility suites run on. They assert:
  - that every element type is present;
  - one system inside the container on wide layouts with the bottom position reserved and blank, and, on a landscape-phone viewport, every phrase split into two aligned systems, each its own SVG, with the line-crossing tie drawn as a partial tie in each (`notation-layout.spec.ts`);
  - the two typed layout failures in one small container, and "no room" for a window too short or too narrow;
  - a lower scale in a shorter phone window, and no re-engraving when only the signals of a browser toolbar change (headless Chromium has no toolbar, so the test fires its resize events while the small viewport height stays put);
  - font readiness, resize redraw, and a typed failure clearing the staff and its description;
  - offline operation;
  - unchanged source data across display switches.

  Chromium also keeps fixed-seed screenshot baselines: one system per instrument profile on the desktop, and the whole staff frame on a 740 × 360 phone window, where a sparse fixture is split at idle. `npm run test:notation` runs as part of `npm run quality`.

## Upgrade Procedure

1. Read the VexFlow release notes for changes to the classes and methods listed under Engraving Library Boundary. Check the `vexflow/bravura` entry and font loading especially.
2. Install the new exact version with `npm install --save-exact vexflow@<version>`.
3. Re-check the embedded fonts' versions and licenses. If they changed, update the Fonts and Licenses table.
4. Run the notation unit tests and browser tests, `npm run lint`, and the typecheck, and fix any adapter breakage inside the three adapter files only.
5. Re-run the calibration from Legibility Floor. If a changed formatter or glyph metrics move the required widths or the ink's height, re-evaluate the floor and the system position constants, and record the new numbers here.
6. Review the screenshot diffs by eye before regenerating the baselines with `--update-snapshots`. Never regenerate them without that review.
7. Run `npm run build` and confirm the fonts are still bundled and no network font request is made (the offline browser test).
