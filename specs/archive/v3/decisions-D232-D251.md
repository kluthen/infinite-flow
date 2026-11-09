> **Archived 2026-11-09.** Closed range for the v3.2 milestone: v3.2 is released as version
> 3.2.0 (tag `v3.2.0`, f93e552d). These decisions are v3.2's first drafts and their approval, the
> gaps settled while consolidating master spec Part C v1.0, its approval and the precisions that
> followed, with v3.1's D233, D235, D242 and D250 interleaved and D237, D239 and D246 ruling both
> releases; the v3.1 archive promised this range would be archived whole at v3.2's release. D252
> onward is archived or stays live on its own terms. Archived IDs keep their meaning and may be
> cited anywhere; each decision's content is now stated as settled fact in a live document, or is
> history, as the "where it now lives" table in [archive/v3/README.md](README.md) records.
> Relative links were written from `specs/`; their paths were repaired on 2026-11-09 so they
> resolve from this folder.

- **D232 (2026-10-08): the v3.2 rhythm lock is strict, with an optional list of allowed rhythm
  changes, each lasting one phrase (settles O151 and the rest of O103; amends the v3.2 draft's
  tension-driven bends).** The owner checked his reading: the lock fixes the rhythm only, every
  note start and length and so every rest, across the four measures, while the pitches keep
  changing; outside a Jam it locks the rhythm of phrase 1, the phrase on screen at Start; in a Jam
  it locks the rhythm nearest the doodle that the rhythm grammar can write (the exact played rhythm
  needs v4's editor, O102). Rhythm changes under the lock are **the player's option**, not an
  automatic bend: an "allowed rhythm changes" list of small edits from the
  [mutation catalogue](../../../docs/music/mutation-catalogue.md) (such as split a note, merge two notes,
  add or remove a rest, move a note by a sixteenth); an empty list keeps the lock strict. Each
  change **lasts one phrase**; the next phrase returns to the locked rhythm (spec-writer's
  recommendation, accepted: "that's a good first iteration on mutations"), which keeps D175's
  "a mutation cannot alter the rhythm durably while the lock is set". **Wider mutation options go
  to v4** ([v4](../../versions/v4/README.md#placed-here-proposed)). Still open: which edits the v3.2
  list offers, and how often a change happens (O157).

- **D233 (2026-10-08): v3.1 drafts approved as proposed (closes O127–O139, O161, O162).** The owner:
  "globally I'm okay with both 3.1 and 3.2, you may proceed". Accepted, as the drafts propose:
  (1) ornaments (trills, grace notes and other symbol figures) are not v3.1; they get a release of
  their own after v3.2, starting with the grace note (O127); (2) seven figures written as ordinary
  notes, each with one four-level setting (Off, As today, Favored, Strongly favored), weights as
  seeded candidate ordering, never quotas, and chromatic figures allowed from any preset, so
  "Neutral is entirely diatonic" becomes Neutral's default rather than a rule (O128, O129, O131);
  levels never remove the Tension control's own figure (O130); the cost guard (O132); a new
  replay-key version for the levels (O133); (3) every preset holds all ten preset-held controls,
  the figure levels and the key and mode restriction, so choosing Neutral or Jazz also sets
  Tension, Leapiness and Arpeggio chaos (O135); (4) Vary settings' Style step moves one figure one
  level, replacing the Neutral/Jazz flip (O134); (5) eight built-ins: Neutral, Jazz, Gentle and
  Speed drill (any key and mode), Reel (Mixolydian or Dorian), Bebop and Pop song (Major), Modal
  (Dorian) (O136); (6) choosing a restricted preset keeps the key when allowed and takes the first
  listed mode (O161); (7) saving a player preset keeps the restriction in force (O162); player
  preset management, Custom and loading, and what records a preset as proposed (O137–O139).
  Details: [embellishment-flags.md](embellishment-flags.md),
  [presets.md](presets.md). The v2 rules and atoms these change (Vary settings'
  profile flip, the Custom state's retained grammar, "Neutral is entirely diatonic") are revised
  through the v3.1 master spec and `documentalist`.

- **D234 (2026-10-08): v3.2 drafts approved as proposed (closes O140–O150, O152 as superseded
  by D232, O153–O157, O10 for v3.2, and O114).** Same approval as D233. Accepted: (8) a Jam is a saved switch needing a controller,
  started by Start or the key's home note; a count-in measure, the doodle, then a generation
  measure and a read-in measure, so two measures before phrase 1, with the wait extending measure
  by measure up to three and v2's standalone phrase last (O140, O141; D215's "at least one" is
  kept); quantising, capture edge cases, drift, sound during capture, review and exports as
  proposed (O142, O143, O146, O147, O155); (9) the doodle quantised to the grid is a generation
  input the player gave on purpose: kept with a kept session, carried by the replay key, engraved
  in the review; the raw notes keep every played-notes rule (O144). This changes the
  declared-intent contract (played-notes privacy, the replay key), so `documentalist` prepares the
  change set and the owner confirms its exact wording at the v3.2 master spec review, as for v3.0;
  (10) the key and mode suggestion appears in the review, with "Use it", "Keep mine" and "Jam again
  on this doodle" (O148), its seed is the quantised doodle alone, and labels and priors as
  proposed (O149, O150); (11) matching is by shape in v3.2, never quoting the doodle (O145);
  planner authority stays as D83 settled it for v2, the doodle only orders candidates (O10, for
  v3.2); the lock holds the doodle's nearest writable rhythm and drift is the mutation ladder
  (O114). The rhythm lock follows D232; O153, O154 and O157 as proposed. Details:
  [jam.md](jam.md), [key-and-mode-suggestion.md](key-and-mode-suggestion.md),
  [rhythm-lock.md](rhythm-lock.md).

- **D235 (2026-10-08): gaps settled while consolidating v3.1 (master spec Part B v1.0).**
  spec-writer's calls, within D233; none changes what the product is. (1) Choosing a preset never
  replaces the phrase on screen, even when it moves the key or mode: a control change at Idle never
  regenerates (only an instrument switch does); the presets draft said otherwise. (2) `ifk3.`
  carries everything `ifk2.` does except the profile name and its Custom flag, plus the seven
  figure levels. (3) Saving or deleting a preset can change the restriction in force, and then
  discards pre-generated phrases; deleting the selected preset, or Custom's base, leaves Custom
  with no base and no restriction. (4) Vary settings' figure step takes the profile flip's single
  place in the draw (setting, then figure, then direction). (5) Tension across phrases never marks
  Custom. (6) Built-in presets have a fixed internal identifier, so their names can change. (7) Name
  uniqueness and the 50-preset limit are checked only on save or rename; duplicates or excess
  arriving otherwise load as they are. (8) Player presets are read in the same start-up read as the
  saved settings; a failure there is a failed-read visit. (9) In a failed-read visit, as in an
  outdated tab, presets made or changed last for the page. (10) A refused preset save keeps the
  preset for the visit and tells the player at once. (11) v3.0 saved settings migrate: the saved
  profile becomes that built-in (or Custom based on it) with its figure levels, then saved values
  win. (12) Sessions kept by v3.0 show their recorded profile as label. (13) Saving a player preset
  (new, or changes) triggers the persistent-storage request; renaming does not. (14) Choosing a
  preset waits while a phrase generates; save, rename and delete do not. (15) If the cost guard
  adopts its fallback (passing and neighbor tone never both Off), the level control refuses the
  second with a reason, Vary settings draws again, and loading raises the neighbor tone to As
  today. (16) Delete everything also removes unreadable preset records. (17) With no restriction in
  force, no Vary settings move is drawn again for a restriction's sake. (18) Terminology:
  "musical profile" and "grammar" leave the player's vocabulary; Part B uses preset, built-in
  preset, player preset, selection, Custom and its base, figure, free figure and Tension's
  scheduled figure, figure level, restriction, restriction in force.
  **Raised for the owner:** four STABLE contract guarantees change (the mutation profile flip is
  removed; the settings that mark Custom grow; the mutation scales gain figure levels; the
  revert-at-session-end wording), so the contract needs a major version and the owner's explicit
  confirmation, as for v3.0; D233 approved the drafts, not that wording.

- **D236 (2026-10-08): gaps settled while settling the v3.2 drafts (draft v2).** spec-writer's
  calls within D232 and D234; none changes what the product is. Each is marked "draft v2" in its
  document. **Rhythm lock** ([rhythm-lock.md](rhythm-lock.md)): the v3.2 allowed
  rhythm changes are five kinds (move a note start by a sixteenth or an eighth, move a rest, split
  a note, merge two notes, add or remove a rest), one change being one edit in one measure, or in
  measure 1 or 2 repeated in 3 or 4, since the grammar copies measures 1–2 into 3–4; a change
  happens in 1 phrase in 4, 1 in 2 on Tension across phrases' tenser phrase, tuned by ear at the
  listening check; changes start at phrase 2, are seeded by the phrase's own seed (so pre-generated
  phrases match), are always measured from the locked rhythm (they never add up), and are never
  shown; no candidate means no change; forced bends happen only on a step down from Build to Lift
  or on the narrow-window step-down, by drift's per-measure distance; the lock, the allowed changes,
  drift and the Jam switch are saved like the session options, set at Idle or in the review, and
  presets never hold them; the term "bend" gives way to "rhythm change" and "forced bend", and
  Vary settings' list becomes its "allowed groups". **Jam** ([jam.md](jam.md)): Jam on
  with no controller behaves as Jam off; a controller lost before phrase 1 sounds ends the Jam with
  no review; "Jam again on this doodle" is offered in every kept Jam session's review, and a held
  doodle lives in memory only; a Jam whose phrase 1 fails at every rung keeps nothing; stray notes
  don't count against the 30 s first-note wait; Rising tempo counts from phrase 1; a Jam session's
  stored shape is a new data version; in an outdated tab or failed-read visit Jam works in memory
  and saves nothing. **Suggestion** ([key-and-mode-suggestion.md](key-and-mode-suggestion.md)):
  a preset's restriction neither bounds nor reweights the candidates, and "Use it" outside it makes
  the selection Custom; a "Keep mine" decline is kept with the kept Jam session. Known limit to show
  the owner: under Strict variety with Straight syncopation the grammar offers almost no allowed
  change (Eighth: add or remove a rest only; Sixteenth: none; Quarter: one rhythm); widening it is
  grammar work, v4. The research note [jam-grounding.md](jam-grounding.md) is refreshed
  (v2), with a measured table of the rhythm domains.

- **D237 (2026-10-08): one term per concept across the v3.1 and v3.2 specs, and two small
  inconsistencies (found by the lexicon update).** spec-writer's calls. Terms: **key** is the
  Written key value (the home note) and **mode** the Collection value (nine options, Major and
  Minor included) everywhere, the suggestion's "plain words" included; Vary settings' v3.1 step is
  the **figure step**, in an allowed group named **Figures** (not "Style"); **allowed groups**
  everywhere (no "allowed list"); **Tension's scheduled figure** (not "bound figure"); the
  app's sound during a Jam's capture is the **click** (the lexicon keeps "pulse" for the beat
  itself); **distance** for the mutation catalogue's scale (not "drift distance"); **rhythm change**
  and **forced bend** (no bare "bend"); US spelling, **quantize**. Drift's positions keep the names
  Close, Near and Free: each unlocks changes up to that distance, so the shared names are meant.
  Inconsistencies: (1) the suggestion's **"Use it" changes the key and mode like a change by hand
  and regenerates nothing on screen** (D235(1)); in Jam mode no phrase shows at Idle, so the next
  Jam simply generates in the new key and mode; (2) **"Use it" keeps the held doodle**, as an
  exception to "a control change at Idle drops the held doodle", since continuing the doodle in
  the suggested key is the point of "Jam again on this doodle".

- **D238 (2026-10-08): gaps settled while consolidating v3.2 (master spec Part C v1.0).**
  spec-writer's calls within D232, D234 and D236. **Refines D237(1):** "Use it" regenerates nothing
  when no doodle is held; with a held doodle it keeps the doodle and regenerates the held doodle's
  phrase 1 from it in the new key and mode, since that phrase must continue the doodle. A held
  doodle's phrase 1 is generated at Idle through the same rungs, with no deadline, and v2's Idle
  rules and pre-generation apply to it. Every change that discards pre-generated phrases drops the
  held doodle, except "Use it" and Regenerate (which makes a new phrase 1 from the doodle); tempo,
  Rising tempo, the mix and the theme keep it; a controller lost at Idle drops it. "Jam again on
  this doodle" turns Jam on, needs a controller, and is not an answer to the suggestion. Phrase 1's
  middle rung is one attempt; Jam phrases 2 onward keep the doodle's preferences on every rung. The
  doodle's join carries its last pitch with no arriving interval; under Varying with no window
  holding it there is no join. Ordering outside a drift band, for "nearest the doodle", the forced
  bend and the narrow-window relock: total edits over four measures, then seeded order. The melody
  move preference orders candidates within each existing rank, never across. The capture tempo is
  kept for review and exports only, never a generation input. The starting note takes the lower
  octave on a tie. Notes between the doodle's end and phrase 1 belong to nothing and are never
  exported. Both scopes of both exports open with the doodle; the MIDI files align (doodle at time
  zero, phrase 1 at the next barline, waiting measures not written); no backing under the doodle.
  Deleting played notes deletes the raw doodle and keeps the quantised one. A kept session's
  suggestion is recomputed against the current selection. Vary settings left with no legal move by
  a change at Idle becomes unavailable and says why, the player's choice kept. The settings that
  discard pre-generated phrases are the union of the drafts' lists. Unreadable saved values for
  the new settings load as defaults. **Favoring the figures found in the doodle is deferred**
  (Part B had placed it in v3.2). Part C also names the STABLE contract guarantees v3.2 changes;
  the owner confirms their wording at the review.

- **D239 (2026-10-08): the owner approves master spec Parts B (v3.1) and C (v3.2), and the
  finishing order.** The owner: "ok agreed", to approving both parts as consolidated (with D235–D238
  and the terms pass) and to the order: (1) `documentalist` ingests Parts B and C and writes the
  exact wording of every contract guarantee they change, v3.1's and v3.2's, as one change set,
  applying nothing to STABLE entries; (2) the owner confirms that wording (as for v3.0, D221);
  (3) `ux-writer` designs v3.1 and v3.2; (4) build plans follow. The approval of the parts is not
  the confirmation of the contract wording.

- **D240 (2026-10-08): the silence timer in a Jam.** spec-writer's call, from `documentalist`'s
  ingestion of Part C. Today the starting note counts as a first note and starts the 30-second
  silence timer; in a Jam started by the home note that timer would run out about a measure before
  the Jam's own 30-second wait, which counts from the end of the count-in. Neither the home note
  that starts a Jam nor the doodle's notes start the silence timer: before phrase 1 sounds only
  Part C's pre-phrase-1 rules end a Jam for silence; from phrase 1 on the timer works as after a
  Start click in v2, waiting for a first note played from phrase 1 on. A Jam on a held doodle
  starts on phrase 1's first note, as in v2. Changes the proposed contract wording of the silence
  timer guarantee.
- **D241 (2026-10-08): a controller lost during a fresh Jam's count-in ends the Jam at once.**
  spec-writer's call, same source: Part C listed the capture, the generation measure, an extended
  wait and the read-in measure, not the count-in, though a capture that follows cannot happen
  without the controller. A Jam on a held doodle keeps v2's 30-second rule from its count-in on;
  Part C's contract summary and done item 16 had wrongly said "before phrase 1 sounds" for every
  Jam. Changes the proposed contract wording of the two controller guarantees.
- **D242 (2026-10-08): "save changes" asks the restriction only when the key or mode lies outside
  the preset's restriction.** spec-writer's call, from `documentalist`'s ingestion and ux Q71
  (§B6.6 and §B10 disagreed). Inside it, nothing is asked and the preset keeps its restriction.
  Outside it (the player opted out), the save-as-new choices are asked, "as now" then meaning any
  key and mode, and the answer replaces the old restriction: keeping it would save a preset whose
  own key and mode lie outside it, loading as Custom after a reload. Matches ux D231.
- **D243 (2026-10-08): leaving Jam mode at Idle leaves the workspace empty.** spec-writer's call,
  from ux Q70: Part C said it "generates a phrase as at first load", but at first load the app
  generates nothing (v2: the player generates a phrase by hand). Turning Jam off, a controller lost
  at Idle, or a held doodle dropped with Jam out of effect gives the empty workspace; nothing is
  generated until the player asks. Keeps v2's rule that at Idle only an instrument switch generates
  by itself. Matches ux D236.
- **D244 (2026-10-08): a Jam played on a held doodle keeps it.** spec-writer's call, from ux Q72:
  Part C's list of what drops a held doodle did not cover the end of the Jam played on it. It stays
  held; after that Jam's review, Idle shows a phrase 1 newly written from it with a fresh seed. A
  doodle captured by a fresh Jam is never held by itself; only "Jam again on this doodle" holds
  one. Matches ux D239. Also fixed the same day, no decision needed: Parts B and C's opening
  paragraphs still said "awaiting the owner's approval" after D239.
- **D245 (2026-10-08): Part C's contract list completed.** spec-writer's call, from
  `documentalist`'s ingestion: C13 now also names the cancelled-attempt guarantee
  (`rule_dropped_attempt_cancelled`, broken by a fresh Jam's phrase 1 cancelled at its deadline)
  and the rhythm lock's locked rhythm reaching later phrases beside the join (with
  `rule_join_carry_in_limited`). Both were already in `documentalist`'s change set; the spec now
  matches it. No behaviour changed.
- **D246 (2026-10-08): the owner confirms the v3.1 and v3.2 contract and vision wording.** The
  owner: "i agree with the wording proposed", answering the plain-words list of the sixteen STABLE
  guarantees v3.1 and v3.2 change (`docs/release/v3.1-v3.2-intent-change-set.md` part A, after
  D240–D245), the single contract bump 2.0 → 3.0 for both releases (part B), and the combined
  vision revision 0.7 → 0.8 made of v3.0's change set part C and this change set's part C. This
  is the confirmation D239 asked for (B11, C13); `documentalist` applies it. Every proposed
  wording holds for today's code, so it is applied now rather than at the first v3.1 merge.
- **D247 (2026-10-08): deleting a kept Jam session drops a doodle held from it.** spec-writer's
  call, from ux Q73: C5.11's list of what drops a held doodle missed it. Deleted data is gone
  (v3.0), so a later Jam must not put the doodle back into a kept session. Matches ux D247.
- **D248 (2026-10-08): a Jam on a held doodle that ends during its count-in keeps the doodle.**
  spec-writer's call, from ux Q74: C5.13's "the doodle is not held" describes a fresh Jam's
  doodle; D244 already keeps a held doodle across the Jam played on it. Idle shows the same phrase
  1 again. Matches ux D251.
- **D249 (2026-10-08): the "no mode fits" note is one plain sentence in every review of that
  Jam.** spec-writer's call, from ux Q75: C6.3's "once" meant said once, not repeated per note;
  showing it only the first time would need a stored flag and leave later reviews of a kept
  session unexplained. Matches ux D251.
- **D250 (2026-10-08): four precisions to Part B for the v3.1 build plan.** spec-writer's calls,
  from the build plan draft's questions (`build-plan-v3.1.md` §10), each the plan's reading:
  (1) a figure level missing from a settings or preset record is Off only when the record's data
  version predates that figure; missing for a figure that existed then, it is an invalid field and
  takes its first-load value (B7). (2) v3.0 kept sessions are migrated when the database opens; if
  that does not fit the start-up read's time limit, each is mapped the same way when read, with no
  difference for the player (B9). (3) `ifk3.` is written for every phrase: a built-in instrument by
  its id, "my instrument" inline (B9). (4) A v3.0 kept session's preset label takes its customized
  form from phrase 1's reproduction inputs, which hold the session's start state (B9). No behaviour
  the owner approved changes.
- **D251 (2026-10-08): five precisions to Part C for the v3.2 build plan.** spec-writer's calls,
  from the build plan draft's questions (`build-plan-v3.2.md` §10), each the plan's reading:
  (1) the request's lock input has three forms: off, on with nothing locked yet (a Jam's phrase 1,
  chosen nearest the doodle), on with the locked bars; `ifk4.` carries it (C11). (2) The phrase
  that re-locks after a narrow-window step-down draws no rhythm change (C7.1, C7.4). (3) Turning a
  note start into a rest start at the same tick is one edit; ties are not starts (C8). (4) A
  candidate that also differs by a tie elsewhere is not "exactly one change" (C7.4). (5) Part C's
  "there is no session seed" was stale against Part A §8's fixed session seeds; reworded (C6.2,
  C14, C15) with no behaviour change: the suggestion is seeded by the doodle alone, the rhythm
  change by each phrase's own seed, and a fresh Jam fixes its session seeds at Start.
