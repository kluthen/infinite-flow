# UI/UX Decisions

> **Archived 2026-11-22.** v3.3 (richer chords) is released as version 3.3.0 (tag `v3.3.0` at
> b2a0e3fa, 2026-11-18). These are decisions D252-D264, the v3.3 design of 2026-10-12, kept
> verbatim with their section heading and intro. Live summary:
> [`archive/v3.3/README.md`](README.md). Text written from `ui_ux/`.

## v3.3 (richer chords) design, 2026-10-12

Inputs: `specs/versions/v3/master-spec.md` Part D (v3.3, cited "§Dn"), proposed for the owner's
approval with spec D264-D274; `docs/music/chord-research.md`; the lexicon's chord entries and their
popup lines; the v3.1 and v3.2 design above (ux D225-D251), still awaiting the owner's review. The
owner's standing delegation applies (D119, D135, archived; restated for this pass): minor design
issues settled here, phones low priority, a running session never asks anything. Nothing in `src/`
is edited. The design follows Part D as proposed; an entry changes only if the owner's approval of
Part D changes what it rests on.

- **D252 — v3.3 is marked on top of v3.0's, v3.1's and v3.2's marks (2026-10-12).** v3.1 and v3.2
  are not frozen yet (they wait for the owner's review, D251), so, as D225 did for them, v3.3's
  changes are layered at the root: `[v3.3 new]` / `[v3.3 changed]` inline, `_v3.3 new:_` /
  `_v3.3 changed:_` items in the change blocks, `v3.3 new` / `v3.3 changed` in code-block
  annotations. **v3.3 is built after v3.2, so every v3.3 change is its own tagged paragraph, item
  or annotation**, never a rewrite of earlier text in place: where v3.3 replaces a sentence it says
  "reads instead" or "also", leaving the earlier text whole for a v3.0, v3.1 or v3.2 builder. A
  document new in v3.1 gains a "Changes since v3.1" block for its v3.3 items, as D246 did for
  documents new in v3.0. v3.3 removes nothing. Every v3 mark:
  `grep -rn "v3\(\.[123]\)\? \(new\|changed\)" ui_ux --include=*.md`; `README.md` says so.
- **D253 — The Seventh chords level sits in the foundation group, right after Harmonic motion
  (2026-10-12; §D5.2, §D11).** One `field-group`, label **Seventh chords**, between Harmonic motion
  and Tension: it shapes the chords, as Harmonic motion does, so the two harmony settings read
  together, and a player who has just picked how the chords move picks next how rich they are. It
  takes the same `segmented-control` of four segments as the seven figure levels (§D11's "four-step
  look"). Rejected: inside the Embellishments group (its heading and intro speak of decorating the
  melody; seventh chords are not a decoration, and a reader would look for them by the staff's
  chord symbols, which the foundation group governs); a group of its own (one field, and a
  "Harmony" group would pull Harmonic motion out of the foundation group, reshaping v3.1's
  controls for one setting); a switch in "During a session" (it is a generation setting held by
  presets, not a session option).
- **D254 — The level's four labels: Off, Sometimes, Often, Mostly (2026-10-12; §D5.2).** For the
  spec's Off, Sometimes, Favored and Strongly favored. Named, like the figure levels (D230), for
  what the player will hear, in the same plain register. Not the figure labels themselves: the
  figure level "Rarely" means "only when nothing plainer fits", which is not this level's second
  step (about one chord in four), and "Mostly" says honestly that a seventh comes on nearly every
  chord, a triad only where none fits. "Often" means the same rank in both controls. The label
  "Mostly" rests on the share the build records at Strongly favored (§D10, done item 5) being a
  clear majority of chords; see Q77.
- **D255 — The level's note and behaviour (2026-10-12; §D5, §D8, §D11).** One `field-note`, named
  by the `radiogroup`'s `aria-describedby`: "How often a chord gets a fourth note on top, as G7 (G,
  B, D, F) instead of G (G, B, D): a richer, jazzier sound. A preference, never a promise." Built
  from the lexicon's popup lines for seventh chord and triad; "a preference, never a promise" is
  the Embellishments intro's own phrase, so the two level controls speak alike. Behaviour, every
  part of it an existing rule applied: first-visit value `Off`; editable at Idle and in the review
  mode, read-only in **Loading** and for a whole session; changing it never regenerates the phrase
  on screen (the player hears it with `Regenerate phrase`, as for every setting), discards the
  prepared phrases and lets a held doodle go, both unseen; saved when changed; preset-held, so a
  change makes Custom and choosing a preset sets it (every built-in to `Off`); never moved by Vary
  settings, so it never changes during a session and never makes Custom then. Nothing announces
  it. No message ever says a phrase has fewer sevenths than the level suggests.
- **D256 — Three built-in descriptions suggest raising the level (2026-10-12; §D8.1, §D11).** Each
  gains one sentence, after the existing text, in the way Reel's suggests Ionian: Jazz and Bebop
  "Also try raising Seventh chords, the usual chords of jazz."; Modal (Dorian) "Also try raising
  Seventh chords, for a richer, jazzier bed." No other description changes; a player preset's and
  Custom's lines are unchanged ("Changed from {name}" already covers a raised level). No built-in
  changes its values.
- **D257 — Vary settings' note says the level is never varied (2026-10-12; §D8.3, §D11).** The
  note reads, from v3.3: "Every 2 to 4 phrases, one setting from the groups below moves one step.
  Never the instrument, the tempo or Seventh chords. Keys and modes stay within what your preset
  is meant for. Your settings come back when the session ends." What may vary keeps its six
  toggles, "Harmony" unchanged: the note's "never" sentence is where the player looks for what is
  left out, and a seventh toggle that could never be turned on would be a control that does
  nothing.
- **D258 — Seventh chord symbols: letters on one line, never shrunk, and their fit (2026-10-12;
  §D7.1, §D11).** A symbol is its root, in written pitch with its accidental as the music font's
  glyph, then its suffix, on one baseline at the one chord-symbol size: `maj7`, `m7`, `7` and
  `m7♭5`, the ♭ in `m7♭5` drawn with the same glyph as a root's flat. No superscript (a smaller
  size falls under the legibility floor first), no signs (Δ, −, ø), never abbreviated, wrapped or
  cut. Each symbol's full width counts toward the minimum width of its measure, so a symbol never
  touches the next one (at least one staff space between them) and never runs past its measure's
  closing barline. The longest symbol is a root with an accidental plus `m7♭5` ("G♯m7♭5",
  "E♭m7♭5"). The engraving calibration gains the case: a measure holding two two-beat chords with
  the longest symbols, at the densest rhythm each layout allows (Sixteenth in the one-system
  layout, Eighth in the split layout), at the narrowest width of each named breakpoint and the
  legibility floor, must fit without the symbols alone making the phrase too wide; the shared
  system position size includes the new symbols' ink, measured as today. A calibration failure at
  a supported width comes back to `ux-writer`; the build never shrinks a symbol to pass it. On a
  phone, a phrase that still fails to fit takes the too-many-notes path like any phrase
  (regenerated unseen), never an overlap. The review and kept sessions follow the same contract,
  which they already apply in full.
- **D259 — The spoken words for the new suffixes (2026-10-12; §D7.1).** The score's text
  description reads `maj7` as "major seventh", `m7` as "minor seventh", `7` as "dominant seventh"
  and `m7♭5` as "half-diminished seventh" ("chord B half-diminished seventh"): each names the
  chord's quality as the lexicon names it, so the four read alike and match the lexicon's headings.
  The spec's alternative "minor seventh flat five" spells the symbol rather than naming the chord.
  A suffix is read as one whole, never letter by letter and never with its ♭ read as "flat" on its
  own. Triad words are unchanged ("minor", "diminished", nothing for major).
- **D260 — Review, exports, kept sessions and Your data: no new control and no new copy
  (2026-10-12; §D7.2, §D9, §D11, §D17).** No text of the review, the export dialog, the session
  list or Your data says "triads" today, so none changes; the backing toggle has no description to
  update. The review and a kept session's review draw the symbols as stored, so a session kept
  before v3.3 shows its triads. The level is not shown in the review's summary, the list's detail
  line or a phrase's header, as the figure levels are not. Your data's Settings line ("The phrase
  controls, the preset, ...") already covers the level, and Delete everything's first-visit state
  puts it at `Off`. The handoffs gain one line each where the content of a file or a kept session
  is listed: MusicXML carries the new chord kinds, the MIDI backing track the chords as the backing
  played them, a kept phrase's inputs the level.
- **D261 — No new token, class or motion (2026-10-12).** The level reuses `field-group`,
  `segmented-control` and `field-note`; the symbols reuse `chord-symbol` and the engraver's size.
  Nothing animates. `token-source-v3.1-v3.2.md` and `motion.md` are unchanged; `README.md` says
  v3.3 adds none.
- **D262 — Written in this thread, one pass (2026-10-12).** Small enough not to delegate: the tier
  changes are the level's field and its rules, three descriptions, one note, the symbols' contract
  and the spoken words, applied in `strategy.md`, `README.md`, `screens/phrase-workspace/`,
  `flows/presets/`, `screens/preset-sheet/handoff.md`, `flows/play-session/`,
  `flows/generate-phrase/handoff.md`, `flows/saved-data/handoff.md`,
  `flows/review-and-export/handoff.md` and `screens/last-session-review/handoff.md`. Unchanged, as
  §D11 says: `flows/jam/`, the suggestion, the rhythm lock, `flows/kept-sessions/`,
  `screens/session-list/`, `screens/your-data/` (its wording already covers the level).
- **D263 — `ux-critic`'s v3.3 pass: DRIFT, four findings fixed (2026-10-12).** (1) The workspace
  Layout Tree gains the v3.3 Vary settings note, as Components and Content had it, and the change
  block links the tree. (2) The presets handoff's change block links Routing Rules, where its v3.3
  paragraphs sit. (3) **The Seventh chords note reads, correcting D255:** "How often a chord gets
  one more note stacked on top, as G7 (G, B, D, F) instead of G (G, B, D): a richer, jazzier sound.
  A preference, never a promise." Under the label "Seventh chords", "a fourth note" could be read as
  the interval of a fourth; "one more note stacked on top" is the lexicon popup's own wording. The
  intent prose in `strategy.md`, `screens/phrase-workspace/intent.md` and `flows/presets/intent.md`
  follows. (4) Correcting D255's "unseen": changing the level lets a held doodle go announcing
  nothing, `jam-bar` leaving at once, as `flows/jam/` says; and `flows/generate-phrase/handoff.md`
  now says the change builds no request by itself but, as any setting change, starts a round under
  the too-many-notes notice. Not findings, noted: the formatter's `*…*` to `_…_` in
  `flows/saved-data/handoff.md` renders the same; the lexicon's "in Infinite Flow" lines for the
  chord terms ("Only triad symbols appear") are `documentalist`'s to update at the build.
- **D264 — Q77 closed by spec D275; the v3.3 build plan reviewed from the design side
  (2026-10-12; master spec §D5.2, build plan v3.3 draft v1).** Spec D275 settled Q77 as
  recommended: the fallback is per phrase, and Strongly favored must reach at least 3 in 4 chords
  as sevenths, measured and reported here. The design stands; the workspace handoff's `Mostly` line
  now says the phrase falls back "as a whole". **The label mapping is written where a coder reads
  it:** the workspace handoff's Seventh chords item says the four segments are §D5.2's levels in
  order (`Off` Off, `Sometimes` Sometimes, `Often` Favored, `Mostly` Strongly favored), that what
  is saved and sent names the spec's level, never the label (spec D277), and that they are not the
  figure levels' options (whose second step is `Rarely` and whose top step `Very often`), since a
  coder told to give it "a figure level's look" could otherwise reuse the wrong list. **What the
  design asks of the plan** (the plan is `coordination-leader`'s and `spec-writer`'s; the edits are
  in the review's report): (1) the three built-in descriptions' sentences ship with the control in
  chunk 19, not chunk 11, so no line on screen ever suggests raising a control that does not exist
  yet; (2) the labels are confirmed twice, on chunk 18's first shares before chunk 19 and on the
  final shares at the release gate, after chunk 20 if built and L2's tuning; (3) hand check H6
  regenerates at `Mostly`, so it runs once the control has shipped, not at chunk 14; (4) counting
  each symbol's width toward its measure's minimum width must leave every triad layout at Off as
  v3.2 draws it; if it would move one, chunk 14 brings it here before any snapshot is updated;
  (5) chunk 19's checks add what its scope already says: editable in the review mode, a round
  under the too-many-notes notice, `jam-bar` leaving at once, nothing announced.
