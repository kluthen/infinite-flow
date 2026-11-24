# Open Questions

Status: draft v0.98

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
[D511–D520](archive/v3/decisions-D511-D520.md),
[D524–D536](archive/v3/decisions-D524-D536.md),
[D389](archive/v3/decisions-D389.md),
[D393–D395](archive/v3/decisions-D393-D395.md) and
[D544–D574](archive/v3/decisions-D544-D574.md). The notes this register kept on the questions
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
[archive/v3/open-questions-history-v3.3.md](archive/v3/open-questions-history-v3.3.md), and
those on the questions closed during v3.4 (O230, O234, O236–O246, O312 and O315, with their own
notes) in
[archive/v3/open-questions-history-v3.4.md](archive/v3/open-questions-history-v3.4.md); each
archive's README says where each answer now lives.

Open on 2026-11-24: O48 and O49 (later and governance), O100–O102 (v5 rhythm ratios and editor),
O115 and O116 (v3.x learning), O176 (style packs and the chord level), O180 (octave signs, later),
O183 (the warm worker lost when pre-generation is cancelled), O190 (a newer version's database
whose read-only reopening fails), O313, O314 and O316 (the three-way split,
this app's horizon and a lexicon backend,
D551–D553, D561), and O267, O269 and O271 (v3.2's build,
answered by the checks that follow the `3.2.0` tag, D521). v3.3 and v3.4 are released (D544,
D579) and none of their questions is open; O230 (a stale replay-key wording, numbered O177 on
branch `plan-migration`, D352) closed with D577. O270, O272–O289, O292–O305 and O307–O309 were never issued; the IDs
reserved for v3.0's waves and left unused stay unused, and O177 stays unused. O311, reserved
by `doc-ids` during the v3.3 archive, is unused. New IDs come from `doc-ids next spec O`.

## Later and governance (O47–O49)

Registered from the v2 highlights proposal and
[prerequisites §5](versions/prerequisites.md#5-questions-registered-in-open-questions) on
2026-09-25.

- **O48 - Import normalization** _(v4 file seed)_: for non-4/4 meters, tuplets, pickups and polyphony: reject, normalize, or lift the policy?
- **O49 - ATD atom lifecycle** _(v2 onward)_: amend the first-release atoms in place, or scope them to v1 and add v2 atoms beside them?

## v3 rhythm candidates (O100+)

Since D211, the rhythm ratios and the rhythm editor, with the Custom note density, left v3 for v4,
and since D553 they are v5: O100, O101 and O102 are v5 questions. The rhythm lock is v3.2,
designed with Jam; O103 was closed by D232. The section keeps its name so its links hold.

Opened 2026-10-03 by `spec-writer` while recording the owner's v3 candidates in the rhythm
category (D175): rhythm ratios, the rhythm editor and the rhythm lock, all reached through a new
note-density value, Custom. They are candidates, not committed scope, so none of these blocks
anything planned. Lexicon terms: [note density](../docs/music/lexicon.md#note-density),
[rhythmic variety](../docs/music/lexicon.md#rhythmic-variety),
[syncopation](../docs/music/lexicon.md#syncopation-1),
[silence density](../docs/music/lexicon.md#silence-density),
[unsupported rhythm combination](../docs/music/lexicon.md#unsupported-rhythm-combination).

- **O100 - Custom and the other rhythm settings** _(D175; v4 since D211, v5 since D553)_: under Custom, do
  rhythmic variety, syncopation and silence density still apply on top of the custom rhythm,
  apply only to the ratios, or step aside? Which combinations does the rhythm grammar block under
  Custom, since the blocked list is keyed today by a note-density value? And does the narrow-window
  rule (no `Sixteenth` below the tablet-landscape width, D146) cap the sixteenth-note ratio there?
- **O101 - What the rhythm ratios hold, and what a mutation does to them** _(D175, D176; v4
  since D211, v5 since D553)_: which note values get a ratio (whole, half, quarter, eighth and sixteenth notes;
  dotted values; rests, or are rests silence density's job), and how finely a ratio is set? What
  is one step of a mutation on the ratios, by analogy with "one grade" (D103)? And can a mutation
  move note density out of Custom, back to a fixed value (D175 only forbids moving into it)?
- **O102 - The rhythm editor's source and limits** _(D175; v4 since D211, v5 since D553)_: "one of the bars" of
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
[v3.3 archive](archive/v3/open-questions-history-v3.3.md). O176 is still open and isn't v3.3's to
answer; O230, also opened here, closed with D577, its note in the
[v3.4 archive](archive/v3/open-questions-history-v3.4.md).

- **O176 - Style packs and the chord level: which wins** _(D273, from O175; with style packs, no
  version)_: when a later style pack sets the `seventh-chords` capability as data and the player's
  Seventh chords level says otherwise, which applies, and how the player sees it? Not needed
  before style packs (D259, merged from branch `v4-accompaniment-research` on 2026-10-19).
  Proposed: decided with style packs.

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

Opened 2026-10-21 by `spec-writer` with v3.4 (D389). v3.4 is released (D579) and every question
this section opened is closed (O234, O236–O238, O312); its notes, and the section's former text,
are in the [v3.4 archive](archive/v3/open-questions-history-v3.4.md). The section keeps its name so
its links hold.

## v3.4 lexicon page (O239+)

Opened 2026-10-21 by `spec-writer` with the lexicon page (D393). v3.4 is released (D579) and every
question this section opened is closed (O239–O246, O315); its notes, and the section's former
text, are in the [v3.4 archive](archive/v3/open-questions-history-v3.4.md). The section keeps its
name so its links hold.

## After v3.4: the split and this app's horizon (O313+)

Opened 2026-11-22 by `spec-writer` with the owner's three-way split (D551), his v4.0 horizon for
this app (D552, D553) and a lexicon backend some day (D561). None blocks v3.4's lexicon page or
the structural review's analysis.

- **O313 - The personas and vision once the game is a separate app** _(D551;
  [personas](personas.md), [far vision](vision/far-vision.md), [endgame](vision/endgame.md))_:
  the owner: "The game and this app don't quite share the same personas." This app stays
  neutral or student-oriented with P1–P3; the game will have personas of its own, not written.
  Out of date once the split is built: P1's "a player in the game-player sense" (an attitude for
  now, game mechanics in the far future) and finding F3; the far vision's "'Game player' is an
  attitude first" and its endgame horizon; the endgame document's framing of the game as this app
  dressed as a game. Proposed: revise them when the game is first specced (or when O314 (a) is
  settled, whichever comes first), not now; the structural review needs none of it
  ([structural review, Q4](versions/v3/structural-review.md#q4-should-the-app-split-into-several-libraries-or-packages)).
- **O314 - What the v4.0 horizon leaves to settle** _(D552; [roadmap](roadmap.md),
  [versions](versions/README.md))_: the owner: "the last update for this app will most probably be
  v4.0 with basic accompaniments (if i remember well). We may need to create new repo to enforce
  this." A direction, not a ruling. (b), what v4 keeps, is answered: v4.0 is Tone.js and
  accompaniment with roles, and its other items move to v5 (D553); microphone input is out of
  scope in any version (D554); the lexicon API is v3.4's (D555). Still open:
  (a) **This app's scope after v4.0:** the owner: "Note that v5+ will probably be moved to the
  game app instead of here, we will have to review this later" (a direction, D553). What becomes
  of each item placed after v4: v5's library and snippet seeds, the staff-only session view, and
  the items moved from v4 (rhythm ratios and the rhythm editor with O100–O102, wider rhythm
  mutations, the whole-file seed); cross-device review (no earlier than v6); style packs; v3.x's
  learning from positive signals; the Firefox and Safari widening: to the game, to the library,
  stay here, or drop? (c) **The split's form:** the owner leans to separate repositories (a
  library repository, this app's, the game's) rather than one repository with enforced
  boundaries; the structural review's Q4 weighs both, with what separate repositories alone cost
  (ATD across repositories, versioning and publishing the library, CI, the VPS deploy, agents
  working across repositories). The driver's D573 (2026-11-23, under D556) gives (c) its form from
  the review's Q4: folders with enforced boundaries in one package now; at game start, a new
  repository holding the library and the game as npm workspaces, with its own ATD record
  ([report §5](versions/v3/structural-review-report.md#5-q4-the-split)). That form is cheap only
  if this app stops at v4.0, so it does not decide (a). **Risk carried to (a):** if this app must
  keep receiving library changes, it consumes the library as a versioned package (`tsc` output,
  semver tags), and the ATD record needs a re-cut: 79–122 two-sided atoms split, 62–84 parents
  re-rooted, a MAJOR CONTRACT bump, and new IDs for the split halves, in tension with D557
  (review evidence D §3.3). Escalate it when (a) is ruled, not before. Proposed: (a) when the
  owner reviews v5+ ("we will have to review this later"), at the latest before v4's master spec.
- **O316 - The lexicon backend: when, in which repository, and the browser-only rule** _(D561;
  [lexicon page §9](versions/v3/lexicon-page.md#9-step-two-the-lexicon-api-d555))_: the owner:
  "we will need to have a backend at some point anyway"; "currently, the backend is only for
  lexicon which doesn't contains any user information so that's super ok"; Go preferred to a
  JavaScript runtime. Not scheduled. Scope as foreseen: the lexicon only, read-only, no user
  data, so nothing about the player is sent. To settle when it is specced: when, and what for
  (the app's word popups, the game, outside tools); which repository of the three-way split holds
  it; the wording of `req_browser_only_first_release` and the "nothing is sent" promise, and
  `verify:boundaries`' ban on `fetch(` in `src/`, since a lexicon request is still the app's
  first network request; whether the app keeps working offline with its built-in copy; the
  privacy notice's wording (no user data, but a request the VPS sees). No rule changes before
  then.

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
