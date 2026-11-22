# Open Questions

Status: draft v0.93

Only questions that are truly open appear here. IDs are stable. Each question's full text lives in
exactly one place: here, or in the document named. When a question is resolved it leaves this
register and its answer goes to the [decisions log](decisions.md). Resolved questions from earlier
work are recorded in the archived logs:
[D1–D46](archive/v1/decisions-D1-D46.md),
[D47–D71](archive/2026-09-25-personas-and-vision/decisions-D47-D71.md),
[D72–D108](archive/v2/decisions-D72-D108.md),
[D109–D207](archive/v2/decisions-D109-D207.md),
[D208–D227](archive/v3/decisions-D208-D227.md),
[D252–D258](archive/v3/decisions-D252-D258.md),
[D290–D343](archive/v3/decisions-D290-D343.md),
[D228–D231](archive/v3/decisions-D228-D231.md),
[D353–D388](archive/v3/decisions-D353-D388.md),
[D390–D391](archive/v3/decisions-D390-D391.md),
[D232–D251](archive/v3/decisions-D232-D251.md),
[D392](archive/v3/decisions-D392.md),
[D396–D405](archive/v3/decisions-D396-D405.md),
[D407–D509](archive/v3/decisions-D407-D509.md),
[D261–D288](archive/v3/decisions-D261-D288.md),
[D349–D352](archive/v3/decisions-D349-D352.md),
[D511–D520](archive/v3/decisions-D511-D520.md) and
[D524–D536](archive/v3/decisions-D524-D536.md). The notes this register kept on the questions
closed during v2 (O24, O50–O99 and O104–O106, apart from O86) are archived verbatim in
[archive/v2/open-questions-history.md](archive/v2/open-questions-history.md), those on the
questions closed during v3.0 (O163, O164, O181, O182, O200, O201, O210, O211 and O220) in
[archive/v3/open-questions-history.md](archive/v3/open-questions-history.md), and those on the
questions closed during v3.1 (O231–O233) in
[archive/v3/open-questions-O231-O233.md](archive/v3/open-questions-O231-O233.md), those on the
questions closed during v3.2 (O247–O266, O268, O290 and O291) in
[archive/v3/open-questions-history-v3.2.md](archive/v3/open-questions-history-v3.2.md), the
note on O306 in [archive/v3/open-questions-O306.md](archive/v3/open-questions-O306.md), and those
on the questions closed during v3.3 (O165–O175, O235 and O310, with O310's own note) in
[archive/v3/open-questions-history-v3.3.md](archive/v3/open-questions-history-v3.3.md); each
archive's README says where each answer now lives.

Open on 2026-11-22: O48 and O49 (later and governance), O100–O102 (v4 rhythm ratios and editor),
O115 and O116 (v3.x learning), O176 (style packs and the chord level), O180 (octave signs, later),
O183 (the warm worker lost when pre-generation is cancelled), O190 (a newer version's database
whose read-only reopening fails), O230 (a stale replay-key wording in a STABLE atom, opened with
D351; numbered O177 on branch `plan-migration`, D352), O236, O238 and O312 (v3.4's structural
review, D389, D545–D547), O239–O246 (v3.4's lexicon page, D393, D548), and O267, O269 and O271 (v3.2's build,
answered by the checks that follow the `3.2.0` tag, D521). v3.3 is released (D544) and none of its
questions is open. O270, O272–O289, O292–O305 and O307–O309 were never issued; the IDs
reserved for v3.0's waves and left unused stay unused, and O177 stays unused. O311, reserved
by `doc-ids` during the v3.3 archive, is unused. New IDs come from `doc-ids next spec O`.

## Later and governance (O47–O49)

Registered from the v2 highlights proposal and
[prerequisites §5](versions/prerequisites.md#5-questions-registered-in-open-questions) on
2026-09-25.

- **O48 - Import normalization** _(v4 file seed)_: for non-4/4 meters, tuplets, pickups and polyphony: reject, normalize, or lift the policy?
- **O49 - ATD atom lifecycle** _(v2 onward)_: amend the first-release atoms in place, or scope them to v1 and add v2 atoms beside them?

## v3 rhythm candidates (O100+)

Since D211, the rhythm ratios and the rhythm editor, with the Custom note density, are v4: O100,
O101 and O102 are v4 questions. The rhythm lock is v3.2, designed with Jam; O103 was closed by D232. The
section keeps its name so its links hold.

Opened 2026-10-03 by `spec-writer` while recording the owner's v3 candidates in the rhythm
category (D175): rhythm ratios, the rhythm editor and the rhythm lock, all reached through a new
note-density value, Custom. They are candidates, not committed scope, so none of these blocks
anything planned. Lexicon terms: [note density](../docs/music/lexicon.md#note-density),
[rhythmic variety](../docs/music/lexicon.md#rhythmic-variety),
[syncopation](../docs/music/lexicon.md#syncopation-1),
[silence density](../docs/music/lexicon.md#silence-density),
[unsupported rhythm combination](../docs/music/lexicon.md#unsupported-rhythm-combination).

- **O100 - Custom and the other rhythm settings** _(D175; v4 since D211)_: under Custom, do
  rhythmic variety, syncopation and silence density still apply on top of the custom rhythm,
  apply only to the ratios, or step aside? Which combinations does the rhythm grammar block under
  Custom, since the blocked list is keyed today by a note-density value? And does the narrow-window
  rule (no `Sixteenth` below the tablet-landscape width, D146) cap the sixteenth-note ratio there?
- **O101 - What the rhythm ratios hold, and what a mutation does to them** _(D175, D176; v4
  since D211)_: which note values get a ratio (whole, half, quarter, eighth and sixteenth notes;
  dotted values; rests, or are rests silence density's job), and how finely a ratio is set? What
  is one step of a mutation on the ratios, by analogy with "one grade" (D103)? And can a mutation
  move note density out of Custom, back to a fixed value (D175 only forbids moving into it)?
- **O102 - The rhythm editor's source and limits** _(D175; v4 since D211)_: "one of the bars" of
  which phrase, the one on screen at Idle or one in the last session's review? Is a rhythm one
  bar long, reused for all four bars, or four bars long? Must a rhythm entered by hand or copied
  pass the rhythm grammar's feasibility rules (every measure keeps a note sounding on beat 1 or
  3, no fully silent measure, no rest longer than half a measure), and if it does not, is it
  refused, adjusted, or allowed as the player's own choice?

## v3 Jam (O112+)

Opened 2026-10-07 while recording the owner's Jam insight (D209; recorded in
[v3](versions/v3/README.md#jam-growing-the-players-doodle)). The core is v3 scope; the questions
below are about it and its three candidates, so none of them blocks anything planned. Proposals
are strawmen, not decisions. Only the v3.x learning questions remain; the Jam ones were settled
by D234.

- **O115 - Which signals count as approval** _(D209; v3.x, likely to move or go, D211)_: which positive signals are
  read (a fitting departure as defined by the chord-fit check — dropped by D211, so this signal would
  need that definition back — a repeated fragment, a return to
  the doodle, a favorite), over what span, and what each one changes in generation. Proposed:
  positive signals only, favorites weighted most, each change small and reversible.
- **O116 - Taste, difficulty and visibility** _(D209, D101; v3.x, likely to move or go, D211)_: how misses, late
  notes and silence adjust difficulty without ever counting against taste; whether this is where
  the performance-linked tempo deferred by D101 lands; how the player turns learning on, sees what
  it leans toward, and resets it; whether what it learned is kept across sessions (local
  persistence, opt-in like played notes). Proposed: off by default, one visible switch, a reset,
  and nothing kept across sessions without the player's opt-in.

## v3.3 richer chords (O165+)

Opened 2026-10-12 while recording the owner's request for richer chords as v3.3 (D261; recorded
in [v3](versions/v3/README.md#v33--richer-chords-optional)). v3.3 is released (D544); the notes on
the questions this section closed (O165–O175 and O310) are in the
[v3.3 archive](archive/v3/open-questions-history-v3.3.md). O176 and O230 are still open; neither
is v3.3's to answer.

- **O176 - Style packs and the chord level: which wins** _(D273, from O175; with style packs, no
  version)_: when a later style pack sets the `seventh-chords` capability as data and the player's
  Seventh chords level says otherwise, which applies, and how the player sees it? Not needed
  before style packs (D259, merged from branch `v4-accompaniment-research` on 2026-10-19).
  Proposed: decided with style packs.

- **O230 - A stale replay-key wording in `module_tension_arc_cycle`** _(D351; from the v3.3 build
  plan's owner questions; outside v3.3)_: the STABLE atom `module_tension_arc_cycle` (outside the
  contract surface) still says a session phrase's replay key keeps "the unchanged `ifk1.` format",
  which v3.0's `ifk2.` already breaks and neither earlier intent change set lists. The plan had
  proposed correcting it at v3.0 chunk 18's capture; that chunk is merged and the wording stands.
  Open: who corrects it, and when? Proposed: a wording-only revision (no guarantee changes) that
  names no key version, confirmed by the owner and applied by `documentalist` at the next intent
  pass that touches it, I0 at the latest; v3.3's
  [chunk 15](versions/v3/build-plan-v3.3.md#chunk-15--replay-key-ifk5) must not repeat it for
  `ifk5.`. It blocks no chunk.

## v3.0 wave 2 (O180+)

Opened 2026-10-12 by `spec-writer` during the v3.0 build (wave 2). O180 and O183 are still open;
the notes on the questions this section closed are in the
[v3.0 archive](archive/v3/open-questions-history.md).

- **O180 - Octave signs and octave clefs for my instrument** _(D293; later version, should the
  need arise)_: the owner, 2026-10-12: "keep in mind 8va/8vb/15ma etc for a later version should
  the need arise". An octave sign is a dashed line over or under notes, marked 8va (play an
  octave higher than written), 8vb (an octave lower) or 15ma (two octaves higher), which saves
  ledger lines; an octave clef is a clef with a small 8 above or below it, meaning the same.
  Background: automatic ottava lines inside a phrase are advised against for now. They start and
  stop in the middle of a phrase and are hard to sight-read at tempo, and they touch the staff
  height check, the rolling session display and the MusicXML export (`<octave-shift>`). The
  existing octave transposition already covers instruments conventionally written an octave from
  their sound (guitar, piccolo), and the bass clef (D293) covers low instruments. Open: is a need
  shown (a range that neither clef nor a transposition serves), and if so, a per-instrument
  octave clef, a fixed octave sign over a whole phrase, or ottava lines placed automatically?
  Proposed: not before a player's range shows the need; an octave clef on my instrument first,
  since it moves nothing within a phrase.
- **O183 - A player request that cancels pre-generation loses the warm worker** _(D298, master
  spec §8; opened 2026-10-13 at the wave-2 intent sync)_: a player request at Idle cancels the
  background attempt in flight the way a dropped session attempt is cancelled, by replacing the
  generation worker (D290). The rhythm-domain memo lives in the worker, so it goes with it: the
  domain phrase 1 and the prewarm built is lost, and the fresh worker is prewarmed with the
  cancelled attempt's settings only. Pre-generation runs up to four attempts right after each
  phrase 1 appears, so a player who presses Regenerate again soon after will often land on one.
  In v2 that Regenerate, with unchanged settings, was a memo hit; in v3.0 it can pay the worker
  respawn (median 49 ms in Chromium on the reference machine) plus a cold rhythm-domain build
  (under 1 s in Chromium there, more on the tablet). That is not "waiting behind" the background
  attempt, which is gone, but it is a wait the background work causes, against §8's "the player
  never waits behind it". Not measured yet: no M or H check covers a player request during
  pre-generation. Open: is this cost acceptable, and if not, should the background attempt be
  stopped without losing the memo (for example, let it finish when its settings match the
  player's, or have the worker drop it between steps rather than be replaced)? Proposed: measure
  it first (Regenerate twice in quick succession, pre-generation on and off, on the reference
  machine and the tablet), then put the figure to the owner. It blocks no wave-2 chunk; the code
  as built matches §8 and D290.

## v3.0 wave 4 (O190+)

Opened 2026-10-14 by `spec-writer` while writing the wave-4 preflight's corrections into build
plan v11 (D300). O190–O199 are reserved for v3.0 wave 4. O190 blocks no wave-4 chunk.
It was still open at the v3.0 release (D348) and is carried forward: it matters from the first
version that upgrades the saved data.

- **O190 - A newer version's database whose read-only reopening fails** _(D300; saved-data design,
  Load; `module_on_device_database`)_: the saved-data design (`flows/saved-data/handoff.md`,
  "Newer data with a failed read at load") says a read can fail and still make a newer version
  known, "for example when the read-only reopening above then fails": the visit starts from the
  defaults and is an outdated tab from its first frame, with no deletion anywhere and the
  outdated-tab notice in its defaults wording. Chunk 4's port does otherwise. When opening finds
  the database upgraded by a newer version, `openDatabase` (`src/storage/database.ts`) reopens it
  without a version for reading; if that reopening fails, the error leaves `openDatabase` and
  `openStoragePort` gives an `unavailable` port, so the save policy starts `off-unreadable`: the
  unusable-data notice shows and `Delete everything` stays offered, where the design offers no
  deletion. `module_on_device_database` (REVIEW) says a database a newer app wrote gives an
  outdated port, which fits the design better than the code. It cannot happen in v3.0 itself,
  since only a later version with data version 2 can upgrade the database. Open: should the port
  be outdated whenever opening met a newer version, its reads then reopening on demand, or is the
  unusable-data notice acceptable there? Proposed: make the port outdated (a small change in
  `src/storage/database.ts` and `src/storage/storage-port.ts`, with a unit test), in a chunk of the
  wave driver's choosing before the v3.0 gate; chunk 8 needs nothing more, since it shows the
  notice from the saving state and the load outcome.

## v3.4 structural review (O234+)

Opened 2026-10-21 by `spec-writer` with v3.4 (D389). The scoping draft is
[structural-review.md](versions/v3/structural-review.md); none of these blocked v3.1, v3.2 or v3.3.
D536 closed O235; the note recording it is in the
[v3.3 archive](archive/v3/open-questions-history-v3.3.md). On 2026-11-22 D545 closed O234 (v3.4
delivers the report and the refactors the owner takes, as a v3.4 build plan) and left its tag
sub-question open as O312; D546 closed O237 (the review looks at the code as it is, not at v4's
scope); D547 ruled the dependency part of O238 and narrowed it.

- **O236 - Is the endgame the same app, or another app using Infinite Flow's generator?**
  _(D389; [endgame](vision/endgame.md))_: the endgame calls Infinite Flow "the music factory" of a
  game. If the game is a separate app, a generation-core library has a second consumer and a split
  pays off; if it grows inside this app, a split mostly buys clearer boundaries. Not ruled: asked
  on 2026-11-22, the owner sees it as a separate question still to resolve ("that's another
  question that need to be resolved"). Until it is, the review assumes neither answer: its Q4
  presents both, with its recommendation under each and where it changes
  ([structural review, Q4](versions/v3/structural-review.md#q4-should-the-app-split-into-several-libraries-or-packages)).
  It needs an answer before the owner rules on the Q4 recommendation, not before the analysis.
- **O238 - How far a recommended refactor may go** _(D389, D547)_: D547 settled the dependency
  part (no new runtime dependency besides Tone.js). Still open, none of it answered on 2026-11-22:
  (a) behaviour-preserving only, guarded by the existing tests? (b) may a refactor move code across
  many files, moving atom links with it, atom IDs unchanged? (c) is there a time budget before v4?
  (d) does D547 cover the dev-only tools the analysis runs (bundle analyser, dependency-cruiser,
  jscpd)? Proposed: (a) yes; (b) yes, atom IDs unchanged and links moved with the code; (c) the
  owner sets it once the ranked list is in front of him; (d) no: D547 is about dependencies the app
  adds, and the analysis installs its tools in a throwaway worktree with nothing committed
  ([structural review §7](versions/v3/structural-review.md#7-who-does-what-proposed)); a tool the
  review recommends keeping is a dev dependency the owner rules on with that recommendation.
- **O312 - Is v3.4 tagged?** _(D545; split from O234)_: a release with its own tag, or a milestone
  with no tag? Not answered on 2026-11-22. Proposed, the rule O234 proposed: a `3.4.0` tag only if
  code ships; since the lexicon page ships code whatever the review finds (D393, O245), v3.4 is
  tagged `3.4.0`.

## v3.4 lexicon page (O239+)

Opened 2026-10-21 by `spec-writer` with the lexicon page (D393). The scoping draft is
[lexicon-page.md](versions/v3/lexicon-page.md); none of these blocks v3.1, v3.2 or v3.3, nor the
structural review. None is ruled: on 2026-11-22 the owner left them to `ux-writer`, who
researches the page and proposes its design and an answer to each; `spec-writer` checks the
proposals against the spec, the personas and the lexicon and takes them to the owner (D548).

- **O239 - Are the Internal entries shown?** _(D393)_: the owner asks for "all words"; the lexicon
  says its 16 "Internal (no popup)" entries (forced bend, grammar and others) are "never shown in
  the UI". Proposed: leave them out, as the lexicon says; the page states how many words it holds.
- **O240 - What one entry shows** _(D393)_: proposed: the word, its other names, the popup line
  first, the definition, the app meaning under a plain heading ("In Infinite Flow") when there is
  one, the related words as links within the page, and the group as a small label, which tells
  apart the four words listed twice (Contour, Register, Syncopation, Tempo: the music word and the
  app control). Not shown: the `id` and the `sources`.
- **O241 - App meanings written for developers** _(D393, D394)_: 59 app meanings cite spec
  decisions ("spec decision D214"), about 45 describe things planned or not built, a few name code
  files. The page may not keep a second, cleaned copy (D394). Show them as written, hide parts by
  a rule, or reword the lexicon itself? Proposed: show them as written in step one; the owner reads
  them on the built page, and if they jar, a docs-only pass rewords those lines in the lexicon.
- **O242 - How the text reaches the page, and its download cost** _(D394, D359, D536)_: the app
  may not download anything while running (`verify:boundaries` forbids `fetch`), so the text goes
  into a built file; the service worker then downloads it for every visitor at install or update,
  page opened or not: about 300 KB, roughly 85–90 KB compressed. That is three times the 100 KiB
  any extra file may weigh, so it needs its own budget, and a budget that a lexicon edit can
  overflow makes a docs edit fail the build. Proposed: parse at build time and ship only the shown
  fields (Internal entries left out), in a file of its own with a named budget of 448 KiB, room for
  the lexicon to grow by half; the owner accepts the extra download; the structural review counts
  it with the rest (its Q2).
- **O243 - How the page is reached, and what kind of page it is** _(D393)_: the app has no router
  and no second page; everything else is the workspace and its sheets. Proposed: a "Lexicon" link
  in the footer beside "Your data", opening a full-screen view built like a sheet (loaded on
  first use, closed by a Close button or Escape, the focus back on the link), not available while
  a session runs, with no web address of its own. The alternative is the app's first real page,
  with its own address (for example `#/lexicon`) and the browser's Back button: a new pattern,
  more work and more design.
- **O244 - What the search matches** _(D393)_: proposed: the word and its other names, anywhere in
  them, ignoring case and accents ("compas" finds Compás, "semitone" finds Half step), results as
  the player types. The popup line is not searched in step one: searching it finds many words
  that merely mention the term. Should it be?
- **O245 - Its order in v3.4** _(D389, D393, D545)_: proposed: its own small part of v3.4 (master
  spec Part E, one design, a one-wave build plan of two chunks), built before the structural
  review's measurement pass so the review measures the app with it. It depends on nothing in v3.2
  or v3.3, so the owner may pull it earlier. v3.4 then ships code, which bears on its tag (O312).
- **O246 - Which goal the page serves** _(D393; [personas](personas.md))_: proposed: P1's G1
  ("get to know the possibilities rather than study theory"), between sessions: a word met in the
  controls, a preset or the review can be looked up without going online. No new persona goal.

## v3.2 build (O267+)

Opened during the v3.2 build ([build plan](versions/v3/build-plan-v3.2.md)). None blocks the wave
in progress. All three follow the `3.2.0` tag, with the checks that answer them (D521).

- **O267 - A doodle note played just before the doodle's first barline** _(D430;
  [build plan chunk 25](versions/v3/build-plan-v3.2.md#chunk-25--exports-open-with-the-doodle))_:
  C5.4 makes a note played a little early onto the doodle's first beat a doodle note, so its raw
  onset falls before the doodle section's time zero, by at most half a sixteenth note. Kept, it is
  stored as played (D430). Where the played-notes export and the review's `Played notes` lane put
  it is open; C5.15 only says a note running past the section's end stops there. Proposed: the
  export starts it at the section's start, its release unchanged, as the end is clipped; the lane
  draws it where it was played. Needed before chunk 23 (the lane, wave 6) and chunk 25 (wave 7).
  Built so far, no ruling: chunk 23 (wave 6) draws such a note at the lane's start, the nearest
  the lane's time axis, which starts at the doodle's first barline, allows to the proposal's
  "where it was played". Still the owner's to decide, after the `3.2.0` tag (D521); the build stands
  until then.
- **O269 - Whether a legato doodle of eighths and quarters should read Heavily varied** _(D433;
  [Part C §C5.16.1](versions/v3/master-spec.md#c5161-the-doodle-to-controls-mapping), [v3.2
  H5](versions/v3/build-plan-v3.2.md#v32-h5--jam-listening-the-doodle-to-controls-mapping-l1))_: a
  listening question. A doodle mixing eighths with held quarters reads Heavily varied when more
  than one note in four is not an eighth. That is the generator's own measure: Slightly varied
  allows at most one note in four off the main value, so a lower reading would leave the doodle's
  own rhythm outside every rhythm the generator may write. But Heavily varied also lets the
  generator add sixteenth figures the doodle never had. Proposed: keep C5.16.1 as written, and ask
  at H5 whether such phrases sound busier than the doodle. If they do, the remedy is reading
  Slightly varied when every note off the main value is longer than it (the doodle's rhythm then
  approached, not reached), or a later grammar level adding only longer values. Needed at the Jam
  listening check (gate L1, after wave 6); chunk 28 builds the rule as written.
- **O271 - Whether a note start off the doodle's grid should count as a strong edit** _(D449;
  [Part C §C8](versions/v3/master-spec.md#c8-jams-drift), [v3.2
  H4](versions/v3/build-plan-v3.2.md#v32-h4--jam-listening-settings-drift-and-lock-l1))_: at v3.2
  H1, every set's least-alike candidate was the only one starting a note on a finer grid than any
  the doodle's starts use (an offbeat over an on-beat doodle, a sixteenth among eighths). C8 counts
  that start as one edit like any other, so such a candidate can sit at Close. Proposed: keep C8 as
  written (D449) and ask at H4 step 3 whether Drift Close used quicker notes than the doodle. If it
  did, fallback B: against the doodle only, never against the locked rhythm, such a start is a
  strong edit, Near at once wherever it falls. Needed at the Jam listening check (gate L1, after
  wave 6); nothing is built for it before.
