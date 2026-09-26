# Notation and Engraving

This document records how a generated four-measure phrase becomes a written score on screen: the pure display transformation, the pinned engraving library boundary, the bundled font assets and their licenses, the mapping from written-phrase objects to engraving objects, the one-system sizing and failure policy, the accessible score representation, and the procedure for upgrading the engraving library.

## Pipeline

Notation is a strict consumer of a successful generation. It never changes a generation request, a generation result, or the generator's internal state, and it can be repeated for any display convention without regenerating.

1. **Input** — `notationInputFromOutcome(outcome, intent)` (`src/domain/notation/notation-input.ts`) accepts only a `generation_success` outcome whose request identity matches the intent. It takes three things by reference, without copying or mutating them:
   - the concert event timeline from the result;
   - the tonal context (tonal center and collection) from the intent's controls;
   - the chord symbols derived from the selected harmony candidate in `outcome.provenance.harmony`.

   Each harmony span becomes one concert chord symbol at its start. The chord is restated at the downbeat of every measure the span crosses, and the spans must tile all four measures exactly. Triad quality maps to a suffix: major is empty, minor is `m`, diminished is `dim`. Planner internals are never consulted.

2. **Transformation** — `transformToWrittenPhrase(input, mode)` (`src/domain/notation/written-phrase.ts`) is pure. It returns a deep-frozen `WrittenPhrase` (`src/domain/notation/written-phrase-types.ts`) that has everything engraving needs and nothing it has to infer: clef, meter, spelled key, and four measures of written notes and rests with notated durations, ties, beam groups, displayed accidentals, and spelled chord symbols. Calling it again with another mode is how a display switch works. The source input is left untouched.
3. **Description** — `describeWrittenPhrase(phrase)` (`src/domain/notation/score-description.ts`) produces the spoken-English summary and per-measure text (see Accessible Representation).
4. **Engraving** — `engraveWrittenPhrase(target, phrase, containerWidthPx)` (`src/notation/vexflow-engraver.ts`) budgets and draws one SVG staff system, or throws a typed `NotationError` (`src/notation/notation-error.ts`).
5. **Component** — `PhraseScore.vue` (`src/components/notation/PhraseScore.vue`) waits for fonts and a measured container. It engraves into a hidden staging element and shows the result only after a successful engraving. On resize or phrase change it redraws, and it emits either `engraved` or `notation-error`.

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
- **Import boundary.** Only `src/notation/vexflow-mapping.ts`, `src/notation/vexflow-engraver.ts`, and `src/notation/vexflow-two-system-engraver.ts` may import `vexflow`. ESLint enforces this with `no-restricted-imports`. Everything else, including the Vue component, talks to the adapter through `WrittenPhrase`, `EngravedScore`, `NotationError`, and `ensureNotationFonts`.
- **Entry point.** The adapter imports from `vexflow/bravura`. This entry registers the Bravura music font and the Academico text font and sets them as the default fonts.
- **API surface.** The adapter uses only this part of VexFlow:
  - `Renderer`, with the SVG backend, `resize`, `getContext`, and context `scale`, `openGroup`, and `closeGroup`;
  - `Stave`, with `addClef('treble')`, `addKeySignature`, `addTimeSignature('4/4')`, `setEndBarType(Barline.type.END)`, `getNoteStartX`, and `setNoteStartX`;
  - `StaveNote`, built from `keys` and a `duration` code;
  - `Accidental`, `Dot.buildAndAttach`, `ChordSymbol` (`addText`, `addGlyphOrText`, and `setVertical(TOP)`), `Beam`, `StaveTie`, and `Voice` (with strict tick counting);
  - `Formatter`, with `joinVoices`, `formatToStave`, and `preCalculateMinTotalWidth`.
- **Output contract.** The only structural contract other code may select on is this:
  - an `svg.staff-svg` with `role="img"`;
  - one `g.measure-slot` per measure, carrying `data-measure-index` 0 to 3 and `data-system-index` (0 on the first line, 1 on the second line of the two-system phone layout).

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
| Each of the 4 measures             | One `Stave` at a computed x position, all on one baseline in the one-system layout. In the two-system layout, bars 3 and 4 sit on a second line whose staves reuse the x positions and widths of bars 1 and 2, and whose first stave repeats the clef and key signature (not the time signature). The last measure ends with a final barline. |
| `WrittenNote`                      | `StaveNote` with key `<letter><#/b…>/<octave>` and duration code `w`, `h`, `q`, `8` or `16`, plus `d` when dotted                                                                                                                                                                                                                             |
| `WrittenRest`                      | Rest `StaveNote` with the same duration code plus `r`, positioned at `b/4` (a whole rest at `d/5`, hanging from the fourth line)                                                                                                                                                                                                              |
| `accidental` (only when displayed) | `Accidental` with code `bb`, `b`, `n`, `#` or `##`                                                                                                                                                                                                                                                                                            |
| Dotted duration                    | Dot encoded in the duration code (so the tick count is correct) plus a `Dot` modifier                                                                                                                                                                                                                                                         |
| `beamGroups`                       | One `Beam` per group                                                                                                                                                                                                                                                                                                                          |
| `tieToNext` / `tieFromPrevious`    | `StaveTie` between consecutive glyphs, including across barlines. A tie from bar 2 into bar 3 in the two-system layout is drawn as two partial `StaveTie`s: one leaving the last note of line one and one arriving at the first note of line two.                                                                                             |
| `WrittenChordSymbol`               | `ChordSymbol` on the glyph at the same start tick: root letter, accidental glyph, suffix, and optional `/bass`                                                                                                                                                                                                                                |

The adapter draws exactly what the written phrase says. It never re-spells, re-derives accidentals, or re-segments rhythm, and it relies on no automatic VexFlow accidental, beam, or spelling logic.

## Sizing and Failure Policy

The phrase is engraved as one staff system (four measures on one line inside one SVG) whenever that fits at or above the legibility floor. On a landscape-phone viewport, where one system does not fit, it is engraved as two staff systems in the same SVG: bars 1 and 2 on the first line, bars 3 and 4 on the second. The notation is never scrolled horizontally, clipped, or shrunk without bound, and it is never split into more than two systems.

The constants live in `src/notation/notation-layout-policy.ts`:

- `NOTATION_ENGRAVING_UNITS_PER_STAFF_SPACE = 10` is VexFlow's native geometry.
- `NOTATION_LEGIBILITY_FLOOR_STAFF_SPACE_PX` is the smallest staff space, in CSS pixels, at which the score may be drawn. The Legibility Floor section below gives its value and rationale.
- `NOTATION_MAX_STAFF_SPACE_PX` is the largest staff space, reached on wide containers.
- `NOTATION_PHONE_LAYOUT_MEDIA_QUERY = '(max-width: 63.9375rem)'` mirrors the workspace's 64rem tablet-landscape breakpoint. Only when it matches may the two-system layout be used.

`planSystemLayout` budgets the layout in engraving units at scale 1:

```
requiredUnits           = leadingWidth + 4 × widest measure minimum width + systemPadding
requiredUnitsTwoSystems = leadingWidth + 2 × widest measure minimum width + systemPadding
scale                   = min(maxStaffSpace / 10, containerWidth / required)
```

- `leadingWidth` is the clef, key signature, and time signature on the first stave.
- Each measure's minimum width comes from VexFlow's formatter.
- Every measure gets the widest measure's width in both layouts, so the measures read as visibly equal. In the two-system layout, both lines share the same budget and column positions, so bar 3 sits directly under bar 1 and bar 4 under bar 2. The second line's leading space is sized like the first, so the measure columns stay aligned even though line two carries no time signature.

The planner tries one system first. If `scale × 10` falls below the floor and the phone query matches, it tries two systems against `requiredUnitsTwoSystems`. If neither layout clears the floor, it throws `NotationError('notation_below_legibility_floor')`. The error details record the required width at the floor, the container width, the floor, and the required units, plus the two-system requirement when that layout was attempted.

Decisions behind this rule:

- **Viewport, not container.** The two-system fallback depends on the viewport width, not the score container's width. A tablet or desktop at 64rem or wider therefore keeps the one-system rule even when its score container is narrow, and shows the typed error rather than two lines. The query tests width only, not orientation.
- **Height.** The height is content-derived. The SVG is exactly as tall as the drawn content (one or two lines, including chord symbols and ledger lines), and no container height is budgeted. The second line starts a fixed gap below the first line's lowest drawn content, so the lines never overlap. The page scrolls vertically if needed, and the score is never clipped or squeezed vertically.

After drawing, the SVG bounding box is checked against the container width. A score that still overflows throws `notation_bounds_exceeded` rather than showing clipped notation.

`NotationError` codes:

- `notation_below_legibility_floor`: the container is too narrow at the floor for one system, and also for two systems where the phone layout applies.
- `notation_bounds_exceeded`: the drawn score overflows the container.
- `notation_font_unavailable`: the notation fonts could not be loaded.
- `notation_container_unavailable`: the container has no usable width, or no SVG root was produced.
- `notation_engraving_failed`: any other engraving-library failure, wrapped with its cause.

In all these cases, no partial notation is shown. The previous visible score is cleared, together with its description. A workspace can offer the retry and orientation guidance its handoff describes.

Redraw rules: engraving starts only after the fonts are ready and the container has a measured width. A `ResizeObserver` triggers a redraw whenever the container's inline size changes, coalesced to one per animation frame. A new written phrase (for example after a display switch) triggers a redraw as well, and so does a change in whether the phone media query matches.

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
- all three display modes.

That is 324 phrases (9 density/variety cells × 36 each), and none failed to generate. The minimum
container width a phrase needs is `requiredUnits × staffSpacePx / 10`.

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

- Quarter and Eighth phrases fit at every supported layout, at every rhythmic variety level.
- Sixteenth phrases fit at 90rem and 64rem for every variety (worst case 821 px, under the 1024 px
  breakpoint). Below 64rem they need the two-system phone layout.

A 7 px floor would leave every phrase still under the 90rem (1440 px) breakpoint (worst case 1150 px,
Sixteenth), but Sixteenth and the widest Eighth/Quarter cases would not fit at 48rem (768 px). For
every measured phrase to fit at 48rem, the floor would have to drop to about 4.7 px (768 px / 1642.9
requiredUnits × 10), which is not legible for sight-reading.

A second calibration ran the same 324 combinations on a landscape-phone viewport (1000 × 500 CSS px, below 64rem) at two realistic score-container widths. It recorded whether each phrase engraved as one system, two systems, or the typed floor error (36 phrases per density/variety cell):

| Container width | Quarter (one / two / error) | Eighth (Strict / Slightly / Heavily) | Sixteenth (Strict / Slightly / Heavily) |
| --------------- | ---------------------------- | -------------------------------------- | ------------------------------------------ |
| 667 px          | 36/0/0 at every variety      | 36/0/0, 36/0/0, 36/0/0                | 17/19/0, 21/15/0, 22/14/0                  |
| 768 px          | 36/0/0 at every variety      | 36/0/0, 36/0/0, 36/0/0                | 31/5/0, 27/9/0, 35/1/0                     |

Every measured phrase therefore renders legibly on a landscape phone. Two systems are used only for
Sixteenth phrases, most often under `Strict` at the narrower 667 px width and least often under
`Heavily varied`. The typed, retryable notation error stays the outcome for any layout where even
two systems do not fit at the floor, rather than an illegible score. The master spec explicitly
allows this outcome.

To reproduce the calibration, run `npm run build:notation-harness`, then:

```
CALIBRATE=1 npx playwright test tests/e2e/notation/notation-calibration.spec.ts --project=chromium
```

The run prints both sweep reports.

## Accessible Representation

Each successful engraving includes a text equivalent of what is drawn:

- **Summary.** `describeWrittenPhrase` builds one summary sentence covering the display mode, clef, key, meter, and measure count. The SVG's `aria-label` is set to it.
- **Measure descriptions.** One plain-language description per measure lists, in order, the chord symbols, the notes (spelled pitch, octave, value, and displayed accidental or tie), and the rests. They sit in a visually hidden element that the SVG references with `aria-describedby`.
- **Updates.** The description is replaced only when a new score is swapped in, and it is cleared with the score on failure. Assistive technology therefore never hears a description of notation that is not on screen.

## Verification

- **Unit tests** in `tests/unit/domain/notation/`, `tests/unit/notation/`, and `tests/unit/composables/generation-session-notation.spec.ts` cover:
  - transpositions, spelling, and tie-breaks;
  - key, chord, and slash-bass consistency;
  - quality preservation and rhythm segmentation;
  - deep-frozen inputs, and unchanged source and session state across display switches;
  - the layout budget.
- **Browser tests** in `tests/e2e/notation/` run against a dedicated harness (`tests/e2e/notation-harness/`, built with `npm run build:notation-harness`). They run the real generation-to-engraving pipeline and hand-built fixtures on Chromium, the only browser project the notation, end-to-end, and accessibility suites run on. They assert:
  - that every element type is present;
  - one SVG system inside the container bounds on wide layouts, and two aligned systems in one SVG (with the line-crossing tie) on a landscape-phone viewport;
  - font readiness, resize redraw, and typed layout failure;
  - offline operation;
  - unchanged source data across display switches.

  Chromium also keeps fixed-seed screenshot baselines, including a two-system phone baseline. `npm run test:notation` runs as part of `npm run quality`.

## Upgrade Procedure

1. Read the VexFlow release notes for changes to the classes and methods listed under Engraving Library Boundary. Check the `vexflow/bravura` entry and font loading especially.
2. Install the new exact version with `npm install --save-exact vexflow@<version>`.
3. Re-check the embedded fonts' versions and licenses. If they changed, update the Fonts and Licenses table.
4. Run the notation unit tests and browser tests, `npm run lint`, and the typecheck, and fix any adapter breakage inside the three adapter files only.
5. Re-run the calibration from Legibility Floor. If a changed formatter or glyph metrics move the required widths, re-evaluate the floor and record the new numbers here.
6. Review the screenshot diffs by eye before regenerating the baselines with `--update-snapshots`. Never regenerate them without that review.
7. Run `npm run build` and confirm the fonts are still bundled and no network font request is made (the offline browser test).
