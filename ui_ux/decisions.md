# UI/UX Decisions

Append-only record of settled UI/UX decisions. Earlier logs are archived verbatim:

- D1–D44 (first release, v1.0): [archive/v1/decisions-D1-D44.md](archive/v1/decisions-D1-D44.md)
- D45–D176 (v2, released as version 2.0.0):
  [archive/v2/decisions-D45-D176.md](archive/v2/decisions-D45-D176.md)
- D177–D224 (v3.0's design, released as version 3.0.0):
  [archive/v3.0/decisions-D177-D224.md](archive/v3.0/decisions-D177-D224.md)
- D280–D322 (v3.0's design gates and corrections during its build):
  [archive/v3.0/decisions-D280-D322.md](archive/v3.0/decisions-D280-D322.md)
- D227–D234 (v3.1's own design decisions, released as version 3.1.0):
  [archive/v3.1/decisions-D227-D234.md](archive/v3.1/decisions-D227-D234.md)
- D323–D326 (after the v3.0 release; v3.1's approval, token-source pass and release gate):
  [archive/v3.1/decisions-D323-D326.md](archive/v3.1/decisions-D323-D326.md)
- D225–D251 (the v3.1 and v3.2 design of 2026-10-08, the entries v3.1 shared with v3.2 included;
  v3.2 released as version 3.2.0):
  [archive/v3.2/decisions-D225-D251.md](archive/v3.2/decisions-D225-D251.md)
- D327–D475 (v3.1's archive pass; v3.2's re-scope, approval, token-source pass and the design
  questions of its build): [archive/v3.2/decisions-D327-D475.md](archive/v3.2/decisions-D327-D475.md)

Archived IDs keep their meaning; a citation to one by ID elsewhere in this repository stays valid
through this header. D252–D264, D477–D479, D481 and D482 (v3.3, approved, not yet built) stay here, with D480
and D483 (v3.2's frozen copy and its release gate), kept until the owner's hand checks after the
`v3.2.0` tag are done, since a finding there may correct `versions/v3.2/`. D265–D279 were never
used; D356–D446, D453, D455, D472, D473 and D476 appear in no log. New numbers come from `doc-ids next ux D`.

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

## The v3.3 design refreshed against v3.2 as built, 2026-11-09

Inputs: master spec Part D v1.2 and build plan v3.3 v4 (spec D511–D518), proposed for the owner's
approval at gate D0; v3.2 as merged on `main` (waves 1 to 7). The owner's standing delegation
applies (D119, D135, archived; spec D414).

- **D477 (2026-11-09): Jam's own Seventh chords level reaches `flows/jam/` and the review side;
  D262's "Unchanged: `flows/jam/`" is corrected (spec D512, D513).** Since Q86 (D347) Jam has its
  own level, so D262's list and Unit S's file list were wrong: v3.3 also touches `flows/jam/` and
  `screens/stale-phrase-prompt/handoff.md`. A change of Jam's level rewrites phrase 1 and keeps the
  doodle; a Jam's kept phrases hold Jam's level; `Jam again on this doodle` uses it as it stands.
  Now in: `flows/jam/handoff.md` (Routing Rules), `flows/jam/intent.md` (Jam's Settings),
  `flows/review-and-export/handoff.md` (Saving the Session; The Doodle and the Suggestion),
  `strategy.md` (Edge-Case Policy).
- **D478 (2026-11-09): on a phone, a seventh-chord symbol calibration failure is accepted (minor,
  spec D414; narrows D258).** The phone's scale is bounded by the staff budget alone; the mix's
  second line and `jam-bar` push the staff down and never enter it. A failure below
  `bp-tablet-landscape` no longer comes back here: those phrases take the too-many-notes path.
  Rejected: a smaller symbol or a short form on phones (two engravings for a third-rate client).
  Asks of the plan (`spec-writer`'s): chunk 14's "passes at every named breakpoint" holds from
  `bp-tablet-landscape` up, a phone failure recorded, not blocking; chunk 23's design docs add
  `flows/review-and-export/handoff.md`. Now in: `screens/phrase-workspace/handoff.md` (Notation
  Contract, On a phone), `strategy.md` (Engraving Policy).
- **D479 (2026-11-09): v3.2's later features need nothing more from v3.3.** The guides (D459–D463)
  keep their switches and volumes, the backing alone sounding the seventh (spec D518); tap tempo
  and the suggestion row are untouched (§D11); a Jam-level change at Idle is a Loading like any Jam
  setting, so D465, D471 and D474 apply as written; D470 stands. Jam has no Vary note or presets to
  change. Now in: master spec §D7.3, §D11; the handoffs as they stand.
- **D480 (2026-11-09): v3.2's design is frozen in `versions/v3.2/` before v3.3's gate D0.**
  Approved on 2026-10-21 (D347), it should have been frozen then; v3.3's change blocks speak of
  changes since v3.2, so the owner approves v3.3 against a fixed v3.2. Taken as D324 took v3.1's:
  every tier document as it stands at the root after v3.2's build corrections (D349–D475), marks
  kept, v3.3's tagged parts, change-block lines and annotations left out, link paths adjusted.
  The token source is not copied: its `v3.2 new` blocks are in `src/styles/`, their shipped state
  the `v3.2.0` tag's. Should the release gate change the design, the copy is corrected to match
  and the correction recorded. Now in: `versions/v3.2/README.md`.
- **D481 (2026-11-09): `ux-critic`'s refresh pass: DRIFT, four findings resolved; D478's phone
  acceptance withdrawn.** Accepting a phone failure in advance contradicted §D11, §D15 item 11 and
  the plan, and left the too-many-notes sentence naming a cure that would not help. So D258 holds
  at every width, phones included, and a failure comes back here, a phone reduction being the
  likely answer then. D478 keeps only the height note and the chunk 23 ask. "Never switches" now
  allows phrase 1 after `Start with this phrase` (ask: §D8.3 likewise). Now in: workspace handoff
  (Phone height), `strategy.md` (Engraving Policy), `flows/play-session/` (session rule, intent).

## The owner's approval of the v3.3 design, 2026-11-09

- **D482 (2026-11-09): v3.3's design approved at gate D0; frozen in `versions/v3.3/`.** Asked to
  approve Part D v1.2, build plan v4 and this design (D477–D481), the owner answered "Approve
  both". Frozen at approval, as D480 says v3.2 should have been: every tier document as it stands
  at the root, all marks kept, link paths adjusted; no token source (D261). Corrected only to match
  what v3.3 ships, or as v3.2's release gate corrects `versions/v3.2/`. The root keeps v3.3's marks
  until v4's design starts. Now in: `versions/v3.3/README.md`, `README.md` (Status).

## v3.2's release gate, 2026-11-09

- **D483 (2026-11-09): v3.2 release gate: no v3.2 handoff names a class or token missing from
  `src/styles/`; no phone reduction; `versions/v3.2/` needs no correction (build plan v3.2's
  chunk 27; spec D521).** Every class, token and layout-tree name in `versions/v3.2/`'s handoffs,
  and in the root's, is in `theme.css` or `components.css`. No chunk reduced a capability on a
  phone (20 and 31 record none; 24's scroll and 40's popover were accepted as built, D468, D475).
  The copy differs from the root only by v3.3's parts and link paths, and matches what ships.
  Nothing to restate in a tier document; the check is history. Recorded in `todo.md`.
- **D484 (2026-11-12): the root tier documents take the dev team's UI/UX document format; the
  frozen copies stay as they are.** The owner's request: every rule a builder follows sits in a
  section or a bold-labelled item, so `doc-get` can fetch it without a window of text around it.
  A format-only pass: labels and headings added, eight diagram headings moved under `## Flow`,
  change-block lines given their section and label; no wording changed. `versions/` is left as
  approved (owner, 2026-11-12), so v3.3's plan cites the frozen copy as it is. Left as warnings:
  routing kept in stage sections (kept-sessions, review-and-export, saved-data), and
  controller-connection's and phrase-workspace's focus rules outside a Focus and Keyboard section.
  Now in: the dev team's `references/ui-ux-docs.md`, checked by `doc-get lint ui`.

## v3.3's build: the first measured shares, 2026-11-13

- **D485 (2026-11-13): gate U1a: the top label becomes `Always`; Off, Sometimes and Often stay
  (corrects D254's top label; build plan v3.3's U1a).** Chunk 18's first run
  (`docs/generation-latency.md`): 25.3 % sevenths at Sometimes, 50.3 % at Often, 100 % at Strongly
  favored, no fallback; §D5.2 tries a seventh at every event, so the top step is every chord.
  "Mostly" promised triads the player never hears; a rare whole-phrase fallback stays covered by
  the note's "never a promise". Wording only (saved data names the spec's level), so applied at
  the root and in `versions/v3.3/` alike, before chunk 19. Now in:
  `screens/phrase-workspace/handoff.md` (Seventh chords), its `intent.md`, `strategy.md`,
  `versions/v3.3/README.md`. U1b rechecks on the final shares.
- **D486 (2026-11-13): the space VexFlow draws between a chord's root and its suffix is tolerated
  in v3.3 and left as a follow-up.** The Notation Contract writes a symbol as one word (`Cmaj7`,
  `G7`, `Bm7♭5`), as in print; "C maj7" is not that, but breaks no rule a player relies on: the
  symbol is whole, on one baseline, and its full width counts toward fit, so nothing overlaps.
  Shipped since v3.2 ("A m"); chunk 14 left it. A later chunk sets the suffix against the root
  (narrower symbols only ease fit), and the contract then says so. Now in: `todo.md` (Remaining).
