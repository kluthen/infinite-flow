# Open Questions

Status: draft v0.62

Only questions that are truly open appear here. IDs are stable. Each question's full text lives in
exactly one place: here, or in the document named. When a question is resolved it leaves this
register and its answer goes to the [decisions log](decisions.md). Resolved questions from earlier
work are recorded in the archived logs:
[D1–D46](archive/v1/decisions-D1-D46.md),
[D47–D71](archive/2026-09-25-personas-and-vision/decisions-D47-D71.md),
[D72–D108](archive/v2/decisions-D72-D108.md) and
[D109–D207](archive/v2/decisions-D109-D207.md). The notes this register kept on the questions
closed during v2 (O24, O50–O99 and O104–O106, apart from O86) are archived verbatim in
[archive/v2/open-questions-history.md](archive/v2/open-questions-history.md), and the
[v2 archive index](archive/v2/README.md) says where each answer now lives.

Open on 2026-10-14: O48 and O49 (later and governance), O100–O102 (v4 rhythm ratios and editor),
O115 and O116 (v3.x learning), O176 (style packs and the chord level, below), O180 (v3.0
wave 2: octave signs, later), O183 (v3.0 wave 2: the warm worker lost when pre-generation is
cancelled, opened with D298), O190 (v3.0 wave 4: a newer version's database whose read-only
reopening fails, opened with D300) and O200 (v3.0 wave 5: an unreadable kept session at the next
save, opened with D304) and O201 (v3.0 wave 5: a session cut short by reloading or closing the
page, opened with D308). The owner closed O182 (what Regenerate does in the stale-phrase
prompt) on 2026-10-13, the day it was opened (D297's ruling note). D295 and D296 closed O181 the day it was opened. D228–D234 closed O10 (for v3.2), O103, O114, O126 and every
question the v3.1 and v3.2 drafts opened (O127–O157, O160–O162); D257 and D258 closed O163 and
O164 the day they were opened. None blocks the v3.0 build.

Opened on 2026-10-12 with v3.3 (D261): O165–O175, richer chords. D262 closed O174 the same day.
D264–D273 settled the rest the same day in master spec Part D, as proposed for the owner's
approval with Part D; O175's precedence question goes on as O176.

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

## v3.0 owner rulings (O163+)

Opened 2026-10-09 by `spec-writer` while writing the owner's rulings after the v3.0 wave-1 intent
preflight (D253–D256) into master spec v1.5. Both questions were answered by the owner the same
day: O163 (my instrument's transposition: where the sign sits, one control or two) by D257, and
O164 (the session-wide record's other facts) by D258. None is open here.

## v3.3 richer chords (O165+)

Opened 2026-10-12 while recording the owner's request for richer chords as v3.3 (D261; recorded
in [v3](versions/v3/README.md#v33--richer-chords-optional)). D262 closed O174 (the research is a
separate item). The chord research ([docs/music/chord-research.md](../docs/music/chord-research.md))
recommended an answer to each other question, and on 2026-10-12 spec-writer adopted them, settling
the research's open points itself, in [master spec Part D](versions/v3/master-spec.md#part-d--v33),
**proposed for the owner's approval with Part D**: O165 by D264 (one Seventh chords level, Off by
default), O166 by D265 (diatonic only), O167 by D266 (runs stay three notes), O168 by D267 (the
seventh a chord tone; endings read the triad until a listening check), O169 by D268 (a seeded
preference per event; the cost guard), O170 by D269 (symbols, exports, the backing plays the
seventh), O171 by D270 (presets, saved settings, Vary settings never moves the level, `ifk5.`),
O172 by D271 (Jam and the suggestion unchanged), O173 by D272 (the STABLE wording changes listed
for the owner) and O175's shape by D273. Their full text is in this register's history in git;
the answers are in the [decisions log](decisions.md). If the owner amends Part D, the decision
amended is revised, and no question comes back unless the owner reopens it.

- **O176 - Style packs and the chord level: which wins** _(D273, from O175; with style packs, no
  version)_: when a later style pack sets the `seventh-chords` capability as data and the player's
  Seventh chords level says otherwise, which applies, and how the player sees it? Not needed
  before style packs (D259, on branch `v4-accompaniment-research`, not merged). Proposed: decided
  with style packs.

## v3.0 wave 2 (O180+)

Opened 2026-10-12 by `spec-writer` while writing the owner's bass clef ruling (D293) into master
spec Part A v1.9. O180–O189 are reserved for v3.0 wave 2. O181 (the shared height under phrases
already made) was closed the same day by D295 and D296: kept sessions belong to their instrument,
a range or transposition change erases them after a warning, a save that changes the shared
height re-checks the pre-generated phrases, and a review never cuts a phrase. Its full text is in
this register's history in git. O180 and O183 block no wave-2 chunk. O182 (opened 2026-10-13 with D297, ISS-011) was closed
the same day by the owner's ruling recorded in D297: Regenerate runs the usual Idle Regenerate
and the app stays at Idle with the new phrase. Its full text is in this register's history in
git.

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

## v3.0 wave 5 (O200+)

Opened 2026-10-14 by `spec-writer` while writing the wave-5 preflight's corrections into build
plan v13 (D303–D305). O200–O209 are reserved for v3.0 wave 5. O200 blocks no chunk: chunk 10
builds the proposed default, which a different answer changes in one place. O201 (build plan
v14, D308) blocks only chunk 27.

- **O200 - An unreadable kept session when the next session is saved** _(D304; master spec
  §5.1; `req_kept_sessions`, `rule_most_recent_session_kept`)_: when a new session is saved,
  every kept session that is not pinned is deleted (§5.1). A kept session whose session-wide
  record this version cannot read (damaged, so whether it is pinned is unknown) is in neither
  group. Question for the owner: **should saving the next session delete such a session, or
  leave it in place?** Proposed: leave it in place: the app never deletes what it cannot read,
  as a failed read at load never overwrites what is kept (§4.4), and `Delete everything` still
  removes it. `req_kept_sessions`' expectation then reads "Right after a new session is saved,
  it is the only readable kept session that is not pinned", and the most recent session after a
  reload is the readable one with the latest start (D304). A consequence for chunk 14, not for
  this question: the session-list design has a row state for a session saved by a newer version
  and for one whose opening failed, but none for a session whose summary cannot be read, which
  then has no date to show; `ux-writer` settles that row before chunk 14.

- **O201 - A session cut short by reloading or closing the page** _(D308; master spec §5.1;
  `rule_most_recent_session_kept`, `req_rolling_practice_session`, `rule_hidden_tab_ends_session`;
  chunk 27)_: §5.1 says "A session cut short by closing or reloading the page is lost". The
  wave-5 sync found the code can differ: a reload or close hides the page, the hidden-tab watcher
  ends the session at once (`workspace-session-end-watchers.ts`), and that end opens the review
  and starts the session's save (`workspace-session-ends.ts`), which, if it commits, also deletes
  the previous unpinned kept session. Browser facts (HTML "unload a document" and the three
  engines' source, checked 2026-10-14): on a reload, close or navigation of a visible page,
  `pagehide` fires first, then `visibilitychange`, in one task, so nothing of the save can run
  before `pagehide`; a tab switch or app switch never fires `pagehide`; an unfinished IndexedDB
  transaction is aborted when the page goes; but a page kept in the back-forward cache is only
  frozen, so its save resumes and commits if the player comes back. So whether such a session is
  saved is not determined today, and no test covers it. Question for the owner, in these words:
  "If you reload or close the page in the middle of a session, after the first phrase has
  played, the app treats it like switching to another tab: it ends the session and starts saving
  it as your most recent session. Whether that save finishes before the page is gone is down to
  chance, and when it does, it also deletes your previous session if that one isn't pinned. The
  spec says a session cut short this way is lost. Which do you want? **(a)** Keep the spec: a
  session cut short by reloading or closing the page is never saved, and your previous session
  stays exactly as it was. Always the same result. **(b)** Change the spec: such a session is
  saved like one ended by switching tabs, whenever the save manages to finish before the page is
  gone, and then it replaces your previous unpinned session. Not guaranteed: most of the time the
  browser stops the save, so the result varies. Either way, switching to another tab or app still
  ends the session, opens its review and saves it." Proposed: **(a)**, built by a `pagehide`
  listener that marks the page as going away, the session's save checking it before each of its
  transactions and abandoning itself with nothing written (deterministic: `pagehide` comes first
  on a visible page, and a hidden page's save is stopped at its next step); a page the browser
  brings back from the back-forward cache shows the ended session's review as not saved ("Not
  saved on this device: export it to keep it."), held in memory as after a failed save. Settings
  changed during the session are not part of the question: they keep being saved at the
  session's end as far as the page allows (§4.2). (b) amends §5.1 and `req_rolling_practice_session`'s
  proposed wording (change set part M2, item 2), and chunk 27 then only adds the test that the
  outcome is whole: either the new session saved and the older unpinned one deleted, or
  neither.
