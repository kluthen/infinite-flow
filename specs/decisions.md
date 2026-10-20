# Decisions

Status: draft v2.110

Append-only record of settled decisions. Earlier logs are archived verbatim:

- D1–D46 (first release): [archive/v1/decisions-D1-D46.md](archive/v1/decisions-D1-D46.md)
- D47–D71 (2026-09-25 persona and vision session):
  [archive/2026-09-25-personas-and-vision/decisions-D47-D71.md](archive/2026-09-25-personas-and-vision/decisions-D47-D71.md)
- D72–D108 (v2 spec consolidated: v2.0–v2.3, from the v1.0 gate close through the rolling-phrase
  spec): [archive/v2/decisions-D72-D108.md](archive/v2/decisions-D72-D108.md)
- D109–D207 (v2 design and build, through the v2.0 release gate):
  [archive/v2/decisions-D109-D207.md](archive/v2/decisions-D109-D207.md)
- D208–D227 (the v2.0 release record, v3's direction, and the v3.0 drafts, master spec and
  design): [archive/v3/decisions-D208-D227.md](archive/v3/decisions-D208-D227.md)
- D252–D258 (the wave-level build workflow and the v3.0 wave-1 rulings):
  [archive/v3/decisions-D252-D258.md](archive/v3/decisions-D252-D258.md)
- D290–D343 (the v3.0 build, through the v3.0 release gate):
  [archive/v3/decisions-D290-D343.md](archive/v3/decisions-D290-D343.md)

Archived IDs keep their meaning and may be cited anywhere. Their content is now stated as settled
fact in the live documents (see the [archive index](archive/README.md) and each milestone
folder's README, such as [archive/v3/README.md](archive/v3/README.md)). Numbering continues from
**D376**.

Live here: D228–D251 (v3.1 and v3.2, not built yet), D259–D260 (style packs, planned with no
version, and the sound ban; merged from branch `v4-accompaniment-research`), D261–D288 (v3.3, not
built yet; D263–D288 merged from branch `v3.3-chord-research`), D344–D348 (the v3.0 release and
its follow-ups) and D349–D358 (the v3.1–v3.3 plan migrations, merged from branch
`plan-migration` as D339–D341, the v3.1 plan's gates and approval, and B12's code check) and
D359–D363 (the owner's rulings during v3.1's wave 0) and D364–D375 (the v3.1 build's rulings and
preflight corrections). D289 is unused.

## Decision Log

- **D228 (2026-10-07): v3.1 presets are generator configuration, kept modest (closes O126).** The
  owner: presets are "mostly generator configuration", and "a bit cheap" for now, as Neutral and
  Jazz already are. (1) **What a preset holds:** the generation settings only. Instrument, tempo,
  key and mode are out, so **a preset never sets the collection** (the scale or mode control),
  answering O126 against spec-writer's proposal; built-in presets lean on the other settings
  (and, once v3.1 has them, embellishment weights). (2) **Built-ins are ours:** the project
  provides its own configurations for various presets; the player may customize them. (3) **How
  a player makes one:** select a preset, change settings (as with Neutral and Jazz today, which
  shows "Custom"), then save it under a name. (4) **The preset selector becomes a combo box and
  moves higher in the controls** (the owner's direction for `ux-writer`). (5) **Presets do not
  intersect with "my instrument"** at all, for now. (6) **Later, not v3:** presets grow richer
  with gimmicks, preferred rhythm cues, and restrictions on range, notes, key and mode; they
  become integral to the endgame, where each character (protagonist, antagonist), location or
  event has its own preset, including an instrument preference and a tone.

- **D229 (2026-10-07): a key and mode restriction joins v3.1 presets, if it is cheap (amends
  D228).** The owner: "if key and mode restriction are easy to handle for v3.1 then add it (so
  that it preserve current selection)". A preset may carry a restriction on which keys and modes
  are allowed; selecting the preset **never changes the player's current key and mode**. Still a
  preset never _sets_ the key or mode (D228). Conditional on a cost check against the code
  (the v3.1 draft does it); if it is not cheap, it stays with the later, richer presets. Read by
  spec-writer as (proposed, to confirm): the restriction bounds what the app itself picks (Vary
  settings' key and mode moves; in v3.2, the key and mode suggestion's candidates); what happens
  when the current selection is already outside the restriction is open (O160).

- **D230 (2026-10-07): a preset may change the current key and mode (amends D228 and D229; closes
  O160).** The owner: "i will allow the preset to change current mode and key". This reverses
  D229's "selecting the preset never changes the player's current key and mode" and D228's "key
  and mode are out" as far as the restriction goes. Read by spec-writer as: when the player
  selects a preset whose key and mode restriction excludes the current selection, the selection
  moves inside the restriction; a restriction to one key and one mode therefore sets them; a
  current selection already inside is kept. Choosing a preset is the player's own act, so this
  does not break the rule that the app never switches key and mode on its own (D209). Which
  allowed key and mode the selection moves to is left to the v3.1 draft (proposed: the preset's
  first listed). Still conditional on D229's cost check.

- **D231 (2026-10-07): a preset's key and mode restriction guides, never blocks (refines D230).**
  The owner: when a preset restricted to some keys and modes is selected, the key and mode
  controls **highlight** the keys and modes for which the preset is valid; **nothing is
  prevented**, every key and mode stays selectable. Choosing one outside the restriction is
  opting out: the preset is **no longer the selected one**, exactly as today when a change to
  Jazz's settings leaves Jazz ("nothing actually really changed beside the new setting"; the
  selection then reads Custom, every other setting untouched). With D230, selecting the preset
  still moves an outside key and mode inside. The highlight is the owner's direction for
  `ux-writer`. Still conditional on D229's cost check. Proposed by spec-writer, to confirm in the
  v3.1 draft: Vary settings, when it moves key and mode under a restricted preset, stays inside
  the restriction, so the app never opts the player out of their preset by itself.

- **D232 (2026-10-08): the v3.2 rhythm lock is strict, with an optional list of allowed rhythm
  changes, each lasting one phrase (settles O151 and the rest of O103; amends the v3.2 draft's
  tension-driven bends).** The owner checked his reading: the lock fixes the rhythm only, every
  note start and length and so every rest, across the four measures, while the pitches keep
  changing; outside a Jam it locks the rhythm of phrase 1, the phrase on screen at Start; in a Jam
  it locks the rhythm nearest the doodle that the rhythm grammar can write (the exact played rhythm
  needs v4's editor, O102). Rhythm changes under the lock are **the player's option**, not an
  automatic bend: an "allowed rhythm changes" list of small edits from the
  [mutation catalogue](../docs/music/mutation-catalogue.md) (such as split a note, merge two notes,
  add or remove a rest, move a note by a sixteenth); an empty list keeps the lock strict. Each
  change **lasts one phrase**; the next phrase returns to the locked rhythm (spec-writer's
  recommendation, accepted: "that's a good first iteration on mutations"), which keeps D175's
  "a mutation cannot alter the rhythm durably while the lock is set". **Wider mutation options go
  to v4** ([v4](versions/v4/README.md#placed-here-proposed)). Still open: which edits the v3.2
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
  Details: [embellishment-flags.md](versions/v3/embellishment-flags.md),
  [presets.md](versions/v3/presets.md). The v2 rules and atoms these change (Vary settings'
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
  [jam.md](versions/v3/jam.md), [key-and-mode-suggestion.md](versions/v3/key-and-mode-suggestion.md),
  [rhythm-lock.md](versions/v3/rhythm-lock.md).

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
  document. **Rhythm lock** ([rhythm-lock.md](versions/v3/rhythm-lock.md)): the v3.2 allowed
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
  Vary settings' list becomes its "allowed groups". **Jam** ([jam.md](versions/v3/jam.md)): Jam on
  with no controller behaves as Jam off; a controller lost before phrase 1 sounds ends the Jam with
  no review; "Jam again on this doodle" is offered in every kept Jam session's review, and a held
  doodle lives in memory only; a Jam whose phrase 1 fails at every rung keeps nothing; stray notes
  don't count against the 30 s first-note wait; Rising tempo counts from phrase 1; a Jam session's
  stored shape is a new data version; in an outdated tab or failed-read visit Jam works in memory
  and saves nothing. **Suggestion** ([key-and-mode-suggestion.md](versions/v3/key-and-mode-suggestion.md)):
  a preset's restriction neither bounds nor reweights the candidates, and "Use it" outside it makes
  the selection Custom; a "Keep mine" decline is kept with the kept Jam session. Known limit to show
  the owner: under Strict variety with Straight syncopation the grammar offers almost no allowed
  change (Eighth: add or remove a rest only; Sixteenth: none; Quarter: one rhythm); widening it is
  grammar work, v4. The research note [jam-grounding.md](versions/v3/jam-grounding.md) is refreshed
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
- **D259 (2026-10-11): style packs are recorded as planned, version not yet assigned.** The
  owner's call: keep the style-pack plan and the reasoning behind it in the
  [roadmap](roadmap.md#planned-version-not-yet-assigned--style-packs) for future reference, with
  no version, no scope and no spec yet. The plan groups the generator's settings and new
  capabilities into style packs (dialects such as Folk reel, Bebop, Blues, Baroque), layered style
  → character identity → situation, as declarative data over the one generator (the breadth
  review's option B), in the style atlas's greedy unlock order and tiers. Nothing it would revisit
  (D11–D13, D15, D20, D28, the voice-leading minimum rules, the fixed four-bar phrase) changes
  now. The research behind it is on branch `v4-accompaniment-research`:
  `docs/music/styles/README.md`, `docs/music/generation-breadth-review.md`,
  `docs/music/identity-modelling.md`, `docs/music/README.md` and `docs/sound-library-survey.md`.
- **D260 (2026-10-11): the only sound ban is on samples.** The owner's position, from the v4 sound
  library survey (its open question 1): the one true ban is on samples, recorded audio and audio
  assets. Generated buffers (noise, a reverb impulse response, a wavetable computed in code),
  AudioWorklets, WASM DSP and effect chains are open in principle. The "oscillators and gains
  only" wording of `req_session_backing_track` and of the `verify:boundaries` check (which bans
  `createBufferSource` and `new AudioBuffer(` in authored code) is narrower than this intent; the
  v4 spec rewords both to ban recorded audio and audio assets rather than buffers
  (`documentalist` for the atom). It does not touch the separate no-network rule.
- **D261 (2026-10-12): v3.3, richer chords, opt-in, after a research phase.** The owner's
  request, in their words: "managing higher end chords (optionnal, with flags to be set from the
  front end as to what's allowed and what's not). It will be preceeded by an internal doc/web
  research on chord to ensure we use appropriate data for chord generation." v3.2 (Jam) was the
  last v3 release, so this is a new release, v3.3, after it.
  1. **Opt-in only.** The default stays today's root-position diatonic triads. A player who allows
     nothing richer sees, hears and exports what they do today, and their replay keys, saved
     settings, presets and kept sessions reproduce as before.
  2. **Flags.** The player chooses in the app's interface which chord families the generator may
     use. Seventh chords come first; extended chords (chords with extensions: ninths and beyond)
     possibly later. "Higher end chords" means these two in standard terms. The exact flag set and
     its defaults are not decided (O165).
  3. **Research before any design.** It has two parts: an internal pass over the project's own
     music documents, sources, code and atoms, and a web pass. The web pass covers chord types,
     how each is built from the selected key and mode, how plausible each is in the styles the
     presets aim at, chord symbols, and how melodies treat a seventh. Generation then uses sourced
     data. Findings go to `docs/music/`, sources to `research-sources.md` and terms to the lexicon.
     Every web-research brief forbids personal data in request headers, URLs and payloads.
  4. **Direction only.** Nothing is designed or built. No rule written for triads changes by this
     decision: the three-note arpeggio run cap, figures resolving onto a chord tone, the backing's
     triad (`req_session_backing_track`, STABLE) and the harmony planner's triad vocabulary. A
     change to a contract rule needs the owner's explicit approval.
  5. **v1's decisions.** The "triads only" vocabulary is the harmony planner policy's and the
     generator contract's, not a decision's. Of v1's D11–D13
     ([archived](archive/v1/decisions-D1-D46.md)), v3.3, once built, partially revisits D11
     alone, and only for a player who opts in: Neutral's chord vocabulary widens, while its
     diatonic frame and its exclusion of substitutions and altered dominants stay. D12 is untouched: altered dominants
     and substitutions stay out (O166). D13 is untouched: chords stay generated, and a flag allows
     a chord family but never chooses a progression.
  6. **Style packs.** D259, on branch `v4-accompaniment-research` and not merged, plans style
     packs with no version, as declarative data over the generator's capabilities. Its breadth
     review counts seventh chords as a capability, not a style. v3.3 opens that capability ahead
     of style packs, default-off, without the progression templates and substitutions the style
     atlas pairs it with. It neither schedules style packs nor changes D259. Keeping the flags
     compatible with a later pack layer is O175.

  Opens O165–O175, among them whether the research is v3.3's first work unit or a separate item
  before it (O174, closed the same day by D262). Recorded in
  [v3](versions/v3/README.md#v33--richer-chords-optional) and the
  [roadmap](roadmap.md#2-v3--player-material-and-my-instrument).

- **D262 (2026-10-12): the chord research runs now as its own item; the vision is updated now.**
  The owner's two approvals, relayed the same day after D261:
  1. **The research is a separate, docs-only item before v3.3,** not v3.3's first work unit. It
     started on 2026-10-12 on branch `v3.3-chord-research` and runs while v3.0 is built. It
     touches no code. Its research document, its sources (S412 on) and its lexicon terms reach
     `main` when that branch merges. Closes O174.
  2. **The vision is updated now.** `documentalist` brings the vision's scope, which ends at v3.2,
     up to date with v3.3 as direction, after the commit recording D261 and D262. The other
     intent changes O173 lists wait for v3.3's master spec. Every change to a STABLE wording still
     needs the owner's explicit confirmation (D246).

  Recorded in [v3](versions/v3/README.md#research-first) and the
  [register](open-questions.md#v33-richer-chords-o165).

- **D263 (2026-10-12): the owner confirms the vision 0.9 wording.** The owner, relayed the same
  day: "vision wording confirmed". This confirms the wording of
  `vision_infinite_flow_first_release` version 0.9, which `documentalist` wrote after D262: the
  v3.3 direction paragraph, with its clauses "a flag allows a chord family and never chooses a
  progression" and "altered dominants and harmonic substitutions" out of scope through v3.3. It is
  the confirmation D262 asked for (D246's rule for STABLE wording). `documentalist` records it in
  the atom's notes on `main`; the spec no longer says the vision wording awaits the owner.

- **D264 (2026-10-12): one "Seventh chords" level, Off by default (closes O165, proposed for owner
  approval with Part D).** spec-writer's adoption of the chord research's recommendation
  (`docs/music/chord-research.md`, O165). v3.3 has one chord family, the seventh chords, set by one
  four-step level (working names Off, Sometimes, Favored, Strongly favored), a preference and never
  a quota, Off by default; triads always allowed. The family covers the four qualities the app's
  modes contain (maj7, m7, 7, m7♭5). No level per quality: in a diatonic frame each quality sits on
  fixed degrees, so a per-quality level would mostly choose degrees. Sixth, suspended and extended
  chords are later families with their own levels; a diatonic sixth chord holds the notes of the
  seventh chord two degrees lower, so it adds names, not sounds. Master spec Part D §D2, §D5.

- **D265 (2026-10-12): diatonic only (closes O166, proposed for owner approval with Part D).**
  Research recommendation adopted. A seventh chord stacks degrees d, d+2, d+4, d+6 of the selected
  collection, its quality coming from the key and mode. Altered dominants and substitutions stay out
  (D12, the vision), and so do borrowed and secondary chords and the qualities that need harmonic or
  melodic minor. Blues, Bossa and Bebop are served only partly: the twelve-bar I7–IV7–V7 is out of
  reach. Part D §D5.1.

- **D266 (2026-10-12): the run cap stays three; the seventh may be one of the three (closes O167,
  proposed for owner approval with Part D).** Research recommendation adopted. A recognized run
  stays exactly three chord tones of one chord; over a seventh chord the three may include the
  seventh (E–G–B over Cmaj7). A four-note one-way arpeggio stays rejected, like today's C–E–G–C:
  the cap limits a chain of wide intervals, not the chord's size. Raising it is a later contract
  question, if listening shows the full arpeggio is wanted. `rule_leap_recovery` (STABLE) follows:
  its run may include the seventh, which needs the owner's wording confirmation. Part D §D6.2,
  §D12.

- **D267 (2026-10-12): the seventh is a chord tone inside the phrase; endings and the join read the
  triad until a listening check (closes O168, proposed for owner approval with Part D).** Research
  recommendation adopted. When an event takes its seventh form, the seventh is a chord tone for the
  search order, figure targets, runs, Arpeggio chaos, Tension's scheduled figure and a Jam's ranks;
  extensions are never chord tones in v3.3. spec-writer's precision of "an ending on the seventh
  gets a listening check before it is allowed": until the check, the open ending and the join's
  landing read each chord as its triad, so the allowed final and landing notes are exactly v3.2's
  (the seventh may still be a joined phrase's tense note, resolved by the next phrase). Before the
  gate the owner listens to examples ending and landing on the seventh; if approved, the seventh
  also becomes an ending and landing note under a second wording of `rule_open_phrase_ending`
  (STABLE), confirmed then. Part D §D6.1, §D6.3, §D12.

- **D268 (2026-10-12): a seeded preference per harmony event (closes O169, proposed for owner
  approval with Part D).** Research recommendation adopted, with spec-writer's details. The planner
  builds its candidate plans exactly as before, from triads, modal colour chords measured on the
  triad. For each harmony event a seeded integer draw (seed and event position) says whether its
  seventh form is tried first: about 1 in 4 events at Sometimes, 1 in 2 at Favored, every event at
  Strongly favored (starting values tuned before the gate). Each plan is tried with its drawn
  sevenths, then as triads only, so the triad form stays reachable. No role order (degree 5 first)
  in v3.3. Off draws nothing. The cost guard keeps the search allowance and measures generation time
  on the deadline sweep, a 240 BPM session and a Jam's phrase 1: at most 2 points more fallbacks or
  fewer phrases, no standalone attempt over the 1.075 s reserve. Part D §D5.2–§D5.4, §D10.

- **D269 (2026-10-12): symbols, exports and the backing (closes O170, proposed for owner approval
  with Part D).** Research recommendation adopted for the symbols: letters maj7, m7, 7 and m7♭5,
  MusicXML kinds `major-seventh`, `minor-seventh`, `dominant`, `half-diminished` with the suffix as
  display text, the spoken description reading them as words. The research left the backing to the
  spec; spec-writer's proposal: the block chords play every note of the chord, a seventh chord as
  the highest close-position four-note arrangement with its top at or below E4 (lowest about D3),
  the bass unchanged; the MIDI export's backing follows. Reason: the backing is the only part that
  sounds the harmony. Changes `req_session_backing_track` (STABLE): the owner confirms the wording.
  Part D §D7, §D12.

- **D270 (2026-10-12): presets, saved settings, Vary settings and the replay key (closes O171,
  proposed for owner approval with Part D).** Research recommendation adopted: no built-in changes;
  the level is stored by value in saved settings, player presets and the replay key. spec-writer's
  details: the level is preset-held, every built-in at Off, so choosing a preset sets it and
  changing it makes Custom; records from before v3.3 load at Off. The research left Vary settings
  partly open; spec-writer's proposal: **Vary settings never moves the level**, and it is in no
  allowed group, because seventh chords are opt-in and a player who kept Off but turned Vary
  settings on must not hear them. The replay key is `ifk5.`, after v3.2's `ifk4.` (D251), written
  for every phrase; `ifk1.`–`ifk4.` decode at Off. Part D §D8, §D9.

- **D271 (2026-10-12): Jam and the key and mode suggestion unchanged (closes O172, proposed for
  owner approval with Part D).** Research recommendation adopted: the suggestion scores the doodle's
  notes only, so the level never changes its answer; a Jam's phrases follow the level like any
  session's, the seventh sharing the first rank the doodle orders within. Part D §D8.4.

- **D272 (2026-10-12): the declared-intent changes are listed in Part D (closes O173, proposed for
  owner approval with Part D).** Three STABLE guarantees change, each given in plain words, old and
  new, in Part D §D12 for the owner's explicit wording confirmation (D246):
  `req_session_backing_track`, `rule_open_phrase_ending` (a triad reading now, a second option
  only if the listening check approves the seventh) and `rule_leap_recovery`. Checked with wording
  unchanged: `rule_harmony_change_drops_unfit_harmonic_carry_in` (the carried chord is compared by
  its triad, and the level is fixed for a session), `rule_join_carry_in_limited`,
  `req_last_session_review`, the mutation guarantees, and the vision (0.9, confirmed by D263). The
  REVIEW and DRAFT atoms, the harmony planner policy, the generator contract and the lexicon lines
  follow at the build; `documentalist` proposes the contract bump.

- **D273 (2026-10-12): one named capability per chord family, stored by value (closes O175 for its
  shape, proposed for owner approval with Part D; opens O176).** Research recommendation adopted:
  the level belongs to the capability `seventh-chords` (the v4 branch's atlas id), stored by
  capability name and value in saved settings, player presets, the generation request and the
  replay key, never tied to a preset's name, so a later family or style pack can name it as data.
  Which wins when a player's level and a style pack disagree is decided with style packs: O176.

- **D274 (2026-10-12): gaps settled while consolidating Part D.** spec-writer's calls within
  D264–D273, proposed for owner approval with Part D; none changes what the owner asked for.
  (1) The level's working names and Strongly favored meaning "every event tries its seventh form
  first". (2) The level is a generation setting locked during a session and moved by nothing, so it
  is fixed for a session: the v3 notes' "a chord flag changed mid-session" cannot happen. (3) A
  carried final chord is compared with the next phrase's settings by its triad. (4) Changing the
  level discards pre-generated phrases and so drops a held doodle, like any discarding change
  (D238). (5) Settings, player presets and kept sessions get a new stored data version. (6) Part D
  numbers its sections D1 to D17 and cites them as §D5 so they are not read as decision IDs.

- **D275 (2026-10-12): the triad fallback is per phrase; Strongly favored keeps at least 3 in 4
  chords as sevenths (answers ux Q77; proposed for owner approval with Part D).** spec-writer's
  call. Part D §D5.2 read per chord ("a triad appears only where the seventh form leads to no
  phrase") while §D5.3 fell back per plan. The per-plan fallback stays: each plan is tried with its
  drawn seventh forms, then as triads only, so the candidate list grows by at most one variant per
  plan and the search cost stays bounded; and a phrase that cannot carry its sevenths is heard as
  a plain-triad phrase rather than as one chord oddly missing its seventh. A phrase therefore keeps
  all the sevenths drawn for it or is all triads. §D5.2 now says so. Because `ux-writer` labels the
  top level "Mostly" (ux D254), Strongly favored must reach at least 3 in 4 harmony events in their
  seventh form over the sweep; if it does not, the build adds, before the triads-only variant,
  variants dropping one event's seventh at a time, in a fixed order, within the cost guard, and
  measures again. The share is recorded per level and mode with the share of phrases that fell back
  to triads, and reported to `ux-writer` (Part D §D15 item 5). Master spec Part D v1.1.

- **D276 (2026-10-12): the v3.3 contract is confirmed once, early (proposed for owner approval with
  Part D).** Planning answer for the [v3.3 build plan](versions/v3/build-plan-v3.3.md). The three STABLE wordings of Part D §D12
  (`req_session_backing_track`, `rule_open_phrase_ending`'s first option, `rule_leap_recovery`) are
  confirmed together, after `documentalist`'s ingestion of Part D, and applied at once with one
  MAJOR bump, CONTRACT 3.0 to 4.0, as D246 did: each holds trivially while the level is Off. The
  open ending's second option is a separate confirmation after the listening check, with its own
  bump. A chunk that changes a STABLE rule may be built before its confirmation but merges only
  after it; unconfirmed at its wave's end, it leaves the wave. Plan §1, §3.

- **D277 (2026-10-12): the level's ids (proposed for owner approval with Part D).** The level is
  sent and stored as `chordFamilies: { 'seventh-chords': level }`, beside the controls, never
  inside them, with the level ids `off`, `sometimes`, `favored` and `strongly-favored`: Part D's
  names, never the interface's labels (Off, Sometimes, Often, Mostly), so a label change migrates
  nothing. It is always present inside the app; an input from before v3.3 (a replay key, a kept
  body, a settings or preset record) reads Off where it is decoded. Plan §2.

- **D278 (2026-10-12): the seventh draw's position and shares (proposed for owner approval with
  Part D).** "The event's position in the phrase" (§D5.3) is the harmony event's start, its bar
  index and start beat, so one place draws the same in every candidate plan. The draw is `fnv1a32`
  over `infinite-flow/seventh-chord/v1`, the phrase's seed and that start; the shares are
  numerators over 256, starting at 64 (Sometimes) and 128 (Favored). Strongly favored and Off draw
  nothing. Plan §2, chunk 12.

- **D279 (2026-10-12): data version 5, with an upgrade that rewrites nothing (proposed for owner
  approval with Part D).** v3.3's stored data version is 5, after v3.2's 4. Its upgrade step
  rewrites no record: every codec reads an absent level as Off, and a kept body's harmony with no
  seventh as triads. Plan chunk 17.

- **D280 (2026-10-12): the listening check's examples are rewritten phrases (proposed for owner
  approval with Part D).** §D6.3's examples are phrases generated at Strongly favored, with the
  final note (or the next phrase's first note) moved to the chord's seventh, rendered to MIDI with
  the real backing beside the unaltered phrase. No code for the open ending's second option exists
  before the owner approves it. Plan chunks 4 and 18, hand check H1.

- **D281 (2026-10-12): what the seventh share counts (proposed for owner approval with Part D).**
  §D15 item 5's share counts harmony events (a chord held across a barline once) of the phrases
  generated, over the deadline sweep's 568 rhythm settings × two seeds × the nine modes, with the
  Neutral and Jazz defaults, per level. A fallback is a phrase won by the triads-only variant of a
  plan that drew at least one seventh. The 3 in 4 at Strongly favored is over the whole sweep;
  each mode's share is recorded and reported to `ux-writer`, and a mode under 3 in 4 goes to
  `ux-writer` with the figures without triggering the finer fallback on its own. Plan §4 (M1).

- **D282 (2026-10-12): a listening check of the level and the backing (proposed for owner approval
  with Part D).** §D5.2 tunes the Sometimes and Favored shares "by listening": once the control
  exists, the owner listens to each level with Jazz, Bebop, Modal (Dorian) and Neutral, and to the
  four-note backing; the final share and cost runs follow it. Plan step L2, hand check H2.

- **D283 (2026-10-12): who updates the project documents §D12 names (proposed for owner approval
  with Part D).** The harmony planner policy: the build's chunks 2 and 12. The pitch planner
  validation note: chunks 5–7. The generator contract (`specs/generator-contract.md`):
  `spec-writer`, from chunk 12's report, at that wave's gate. The lexicon's "in Infinite Flow"
  lines: `documentalist`, at the release gate (§D16). Plan §3.

- **D284 (2026-10-12): no token-source chunk for v3.3 (proposed for owner approval with Part D).**
  v3.3 adds no token, class or motion (ux D261), so its plan has no token pass and no owner step
  for one; the owner's approval of the v3.3 design still gates the interface chunks and the three
  preset description sentences. Plan §1.

- **D285 (2026-10-12): the v3.3 change set adds what §D12 missed (proposed for owner approval with
  Part D).** `documentalist`'s read-only preflight of 2026-10-12 found atoms that a seventh chord
  changes and §D12 does not list: `service_generation_result_validation`,
  `module_named_stream_pseudorandomness`, `module_ranked_candidate_ordering`,
  `service_generation_orchestration`, `service_generation_request_resolution`,
  `module_pitch_search_context` (the final notes), `module_pitch_search_transition` (the landing),
  `rule_no_carry_in_output_matches_v1`, `rule_doodle_only_orders_candidates`,
  `rule_preset_load_values_win`, `rule_session_history_keeps_timeline_and_inputs`,
  `rule_earlier_kept_sessions_carried_over`, `module_session_carry_in_after_change`, and the naming
  of `module_musical_profile_capabilities`. None is STABLE. The ingestion's change set revises them
  too, and adds a BUSINESS atom for the chord-symbol vocabulary and its spoken words. Plan §9.

- **D286 (2026-10-12): until the control ships, the app sends Off (proposed for owner approval with
  Part D).** Every v3.3 chunk before the Seventh chords control changes nothing a player can reach,
  since the app always sends Off; no feature switch is built for them and no release is cut
  between waves. Plan §1.

- **D287 (2026-10-12): a Jam's phrase 1 carries the level on every rung (proposed for owner approval
  with Part D).** §D8.4's "a Jam's phrases follow the level like any session's" holds on each rung
  of a fresh Jam's phrase-1 ladder (C5.7), the doodle-free rung included, and on every later
  phrase. Plan chunks 3 and 16.

- **D288 (2026-10-12): the Seventh chords level ids are camelCase (amends D277; proposed for owner
  approval with Part D).** Raised by `ux-writer`'s review of the
  [v3.3 build plan](versions/v3/build-plan-v3.3.md) (ux D264). D277 spelled the top level
  `strongly-favored`; v3.1's figure-level ids, the same four-step shape stored the same way, are
  camelCase (`off`, `asToday`, `favored`, `stronglyFavored`, v3.1 build plan §2). The level values
  are therefore `off`, `sometimes`, `favored` and `stronglyFavored`, in the request, the replay key
  and every saved record. The family key stays `seventh-chords`: a capability name fixed by D273
  (the v4 atlas id), as `my-instrument` is a fixed id (D254). The interface's labels are unchanged:
  `off` Off, `sometimes` Sometimes, `favored` Often, `stronglyFavored` Mostly (ux D254, D264).

- **D344 (2026-10-16): `createSessionMidi` keeps no code link to `service_session_midi`.** The
  owner accepted ("ok") the wave-10 final sync's recommendation: its file,
  `src/components/workspace/workspace-session-midi.ts`, already links ten atoms, the code-health
  cap, so it stays as it is; the atom stays traced through `workspace-session-starting-note.ts`
  and two test files. Stated in
  [v3 README, v3.0.x notes](versions/v3/README.md#v30x-notes-after-the-tag).

- **D345 (2026-10-16): the 17 REVIEW `release-v3.0` atoms are promoted later.** The owner
  accepted ("ok") the final sync's recommendation: 22 STABLE atoms sit under REVIEW parents for
  now, and the 17 are promoted after the tag as v3.0.x notes, for example once H5's
  played-notes-export half and H8 have run. Stated in
  [v3 README, v3.0.x notes](versions/v3/README.md#v30x-notes-after-the-tag).

- **D346 (2026-10-16): ten promoted atoms tagged `changes-in-v3.1` or `changes-in-v3.2` now
  cross the contract gate.** The owner accepted ("ok") the final sync's finding: being STABLE and
  on the surface, their v3.1 and v3.2 revisions each need the contract bump their level requires.
  Stated in [v3 README, v3.0.x notes](versions/v3/README.md#v30x-notes-after-the-tag).

- **D347 (2026-10-16): the CONTRACT's EXPECTATION is trimmed now, at the v3.0 archive.** The owner
  accepted ("ok") keeping it as a version history until archive time, and left the time to the
  archive pass; spec-writer's call: this release's archive is that time, since the notes for
  versions shipped in 2.0.0 and 3.0.0 are release history. `documentalist` applies the trim
  listed in [v3 README, v3.0.x notes](versions/v3/README.md#v30x-notes-after-the-tag).

- **D348 (2026-10-16): v3.0 is released as version 3.0.0; its working record is archived.** The
  release gate (build plan chunk 26) passed; the tag `v3.0.0` is at e288d98, approved by the
  owner, and the app is deployed. The v3.0 decisions (D208–D227, D252–D258, D290–D343), the
  register's notes on closed v3.0 questions, the spec index's status snapshot, the five v3.0
  drafts and the storage grounding move verbatim to [archive/v3/](archive/v3/README.md). The
  master spec, the v3.0 build plan and the v3 README stay in place. Live: D228–D251 (v3.1, v3.2),
  D261–D288 (v3.3) and D344–D347. No question was decided; the v3.0.x notes stay live.

- **D349 (2026-10-16): v3.1's build plan moves to the build-plan model, with one shared v3 build
  workflow and its waves re-formed.** Chunk IDs and Done-when statements are kept; the four
  drifting §3 copies give way to one workflow document, and the eleven waves become six. Why: thin
  waves paid a full preflight and gate each. Numbered D339 on branch `plan-migration` (D352). Now
  in: [build-workflow.md](versions/v3/build-workflow.md),
  [build-plan-v3.1.md](versions/v3/build-plan-v3.1.md#waves).

- **D350 (2026-10-16): v3.2's build plan moves to the build-plan model, under the shared v3 build
  workflow, its waves re-formed.** Chunk IDs and Done-when statements are kept; twelve waves become
  seven, the release gate no wave; chunk 20 now follows chunk 19, whose dependent control it uses.
  Why: thin waves paid a full preflight and gate each, and old wave 3 held the chain 8 → LD → 20.
  Numbered D340 on branch `plan-migration` (D352). Now in:
  [build-plan-v3.2.md](versions/v3/build-plan-v3.2.md#waves).

- **D351 (2026-10-16): v3.3's build plan moves to the build-plan model, under the shared v3 build
  workflow, its waves re-formed.** Eight waves become six; chunk 7 now follows chunks 5 and 6, whose
  chord-tone facts its run rule reads; the owner's four questions become gates A0, C1, R0 and I0
  and [O230](open-questions.md). Why: thin waves, and old wave 2 held 5, 6 and 7 with no path
  between them. Numbered D341 on branch `plan-migration` (D352). Now in:
  [build-plan-v3.3.md](versions/v3/build-plan-v3.3.md#waves).

- **D352 (2026-10-19): branch `plan-migration` is merged, renumbered.** The owner: merge it,
  renumbered. Its D339, D340 and D341 collided with `main`'s v3.0 gate entries and became D349,
  D350 and D351; its O177 became [O230](open-questions.md). `main`'s v3.0 release and archive state
  wins every conflict in the registers and indexes. Not an approval of any of the three plans.

- **D353 (2026-10-19): gate D0 is given: the owner approves the v3.1 design (ux D225–D251).** v3.1
  only; the v3.2 design is not approved. `ux-writer` freezes it into `ui_ux/versions/v3.1/` and the
  plan's design links are repointed there. Now in:
  [build-plan-v3.1.md, Gates](versions/v3/build-plan-v3.1.md#gates).

- **D354 (2026-10-19): gate R0 is met.** v3.0 is released: `3.0.0` was tagged on 2026-10-16 (D348),
  so chunks 0 and 2 may start. Now in: [build-plan-v3.1.md, Gates](versions/v3/build-plan-v3.1.md#gates).

- **D355 (2026-10-19): gate T1 is not given.** The owner allows no `ux-writer` pass on
  `src/styles/theme.css` and `components.css` for now. Chunk 1 and every chunk that waits on it
  (13, 14, 17–20) stay blocked; the waves are re-formed so the rest goes ahead (D356). Now in:
  [build-plan-v3.1.md, Gates](versions/v3/build-plan-v3.1.md#gates).

- **D356 (2026-10-19): v3.1's plan v4: waves re-formed around T1, code facts refreshed.** Waves 0–3
  hold every chunk T1 does not block, waves 4 and 5 the rest; chunk 3 no longer waits on chunk 2
  (an order-only edge: wave 0 changes no generator code), chunk 14 gains a capture so 19 and 20
  can share its wave, and chunk 16 waits on chunk 9 (data version 2 first). The code facts are
  checked against `main` (d007b27); the design links point at the frozen v3.1 design (ux D324).
  Status: ready for owner approval. Now in: [build-plan-v3.1.md](versions/v3/build-plan-v3.1.md#waves).

- **D357 (2026-10-19): the owner approves v3.1's build plan v4, transitional state included.**
  Waves 0–3 may merge into `main` and stay there while T1 waits: `main` keeps offering Neutral and
  Jazz through the old control, and no release is cut before wave 5 merges. T1 stays not given and
  is asked again before wave 4; wave 0 starts now. Now in:
  [build-plan-v3.1.md](versions/v3/build-plan-v3.1.md#read-first-what-v31-changes-in-v30-and-v2).

- **D358 (2026-10-19): master spec Part B v1.1: B12's code facts checked against v3.0.** Facts
  only, following the code (`d007b27`); no behaviour changes. The routing point is not the only
  path (the instrument switch and Vary settings take their own), pre-generation discards on a
  change, storage exists, and v3.0 left 230 bytes of entry-chunk budget, which opens
  [O231](open-questions.md). Now in: [B12](versions/v3/master-spec.md#b12-existing-code-and-risks).

- **D359 (2026-10-19): v3.1's entry budget is raised to 300 KiB (closes O231).** The owner wrote
  "raise to 300kb"; read in the unit the 224 KiB budget uses (`entryChunkByteBudget = 224 * 1024`,
  `scripts/verify-boundaries.mjs`), that is 307,200 B. The driver's change to the constant lands in
  wave 0. Not adopted: raising it chunk by chunk by measured growth (O231's proposal). Now in:
  [M4](versions/v3/build-plan-v3.1.md#m4--the-first-load-bundle),
  [B12](versions/v3/master-spec.md#b12-existing-code-and-risks).

- **D360 (2026-10-19): the STABLE `rule_saved_settings_load_tolerantly` may take the
  `changes-in-v3.1` tag.** The owner allows `documentalist` the STABLE guard's override for this tag,
  metadata only ([change set part I3](../docs/release/v3.1-v3.2-intent-change-set.md#i3-for-the-owner-not-applied));
  its wording changes under D361. Now in:
  [chunk 16](versions/v3/build-plan-v3.1.md#chunk-16--presets-and-levels-on-the-device).

- **D361 (2026-10-19): v3.1's revisions of v3.0's STABLE contract atoms take a MAJOR contract
  bump.** The twelve atoms of change set part I3; `documentalist` drafts their new wordings and the
  owner confirms them, the "to decide" rows included, before the first wave sync that revises one:
  gate CS, which blocks wave 1's sync, since chunk 8 already changes what a kept phrase stores. B11
  and B12 now count them, and B11 lists the four entries it missed (part I4). Now in:
  [Gates](versions/v3/build-plan-v3.1.md#gates),
  [B11](versions/v3/master-spec.md#b11-what-v31-changes-in-v30-and-in-v2s-guarantees).

- **D362 (2026-10-19): the STABLE `rule_open_phrase_ending` is reworded with v3.1.** Its "jazz
  approaches, and jazz enclosures" and "profile-approved" continuation give way to wording that
  names no profile, since chromatic figures come from any preset; its guarantee is unchanged. Under
  D361's bump and gate CS; chunk 12 revises it. Now in:
  [chunk 12](versions/v3/build-plan-v3.1.md#chunk-12--presets-replace-the-musical-profile).

- **D363 (2026-10-19): gate CS is cleared; the owner confirms every wording of change set part J.**
  His words: "Agreed to the change in the wording." That includes the two that weaken a guarantee
  (`rule_settings_saved_on_change`, `rule_saved_settings_load_tolerantly`), CONTRACT 7.0.0, and one
  MAJOR bump at wave 1's sync (chunk 8), the later syncs (chunks 9, 12, 16, 17, 18) applying the rest
  under 7.0.0. Now in: [Gates](versions/v3/build-plan-v3.1.md#gates),
  [change set part J](../docs/release/v3.1-v3.2-intent-change-set.md#j-cs-contract-wordings-for-the-owners-sign-off-drafted-2026-10-19-not-applied).

- **D364 (2026-10-19): chunk 9 stays in wave 2; its version 2 step reads both version 1 shapes and
  never throws on a stored value.** Chunk 8 writes levels at data version 1, so a step expecting a
  profile in every phrase would throw, roll the upgrade back and make every later open reject. Not
  adopted: moving chunk 9 into wave 1, since wave 1's membership froze at its preflight and 4 → 8 →
  9 is a three-chunk chain the in-wave rule forbids. Only development data is exposed (no release
  before wave 5); `module_on_device_database` is a known drift until chunk 9. Now in:
  [chunk 9](versions/v3/build-plan-v3.1.md#chunk-9--kept-sessions-hold-the-levels-and-the-preset-label),
  [chunk 8](versions/v3/build-plan-v3.1.md#chunk-8--replay-key-ifk3-the-profile-leaves-the-request).

- **D365 (2026-10-19): a kept session's summary takes its profile from the session history.** Once
  the intent holds no profile, `encodeKeptSession` cannot read phrase 1's; the history keeps the
  profile of the settings the session started with. It also fixes v3.0 naming phrase 1's profile
  after Use it, against `rule_stale_phrase_prompt_at_start`. Not adopted: `HeldSessionFacts`, which
  would change the STABLE `module_kept_session_save` outside change set part J. Now in:
  [chunk 8](versions/v3/build-plan-v3.1.md#chunk-8--replay-key-ifk3-the-profile-leaves-the-request).

- **D366 (2026-10-19): wave 1's preflight corrections, plan v7.** The **Never** row guards the
  fixtures and replay assertions, not the spec files around them; chunk 4 also takes the profile
  out of the pitch policy and the harmony planner, so chunks 5 and 8 (no path between them) share
  no file; chunk 8 owns the replay-key specs and the stale prompt's labels. Not adopted: chunk 10
  taking `rule_preset_management_actions` (chunk 17's). Now in:
  [Read first](versions/v3/build-plan-v3.1.md#read-first-what-v31-changes-in-v30-and-v2),
  [chunk 4](versions/v3/build-plan-v3.1.md#chunk-4--figure-levels-in-the-generation-request).

- **D367 (2026-10-19): version 1 holds a third phrase shape; chunks 8 and 9 read it.** Chunk 4's
  kept-intent parser stores `figureLevels` beside the profile, so phrases kept until chunk 8 hold
  both. In that shape the levels must equal the profile's mapped levels, else the record is
  unreadable (chunk 4's rule kept); chunk 8 routes the mapping through `profile-to-levels.ts`.
  Now in: [Read first](versions/v3/build-plan-v3.1.md#read-first-what-v31-changes-in-v30-and-v2),
  [chunk 8](versions/v3/build-plan-v3.1.md#chunk-8--replay-key-ifk3-the-profile-leaves-the-request),
  [chunk 9](versions/v3/build-plan-v3.1.md#chunk-9--kept-sessions-hold-the-levels-and-the-preset-label).

- **D368 (2026-10-19): the tense note a joined phrase may end on follows the levels like a free
  scale note (closes O232).** The owner chose (b), "Gate it like a free note": offered and accepted
  only when the passing tone (the accented passing tone on beats 1 and 3) or the neighbor tone is
  not Off; with both Off, no tense ending at the join. It sounds like those figures across the
  join. Not adopted: (a) ungated; (c) carrying the direction across the join. Now in:
  [B5.4](versions/v3/master-spec.md#b54-free-figures-and-tensions-scheduled-figure),
  [chunk 7](versions/v3/build-plan-v3.1.md#chunk-7--two-new-free-figures-the-appoggiatura-and-the-diatonic-enclosure).

- **D369 (2026-10-19): a favored free scale tone is tried first as the drawn figure, and keeps its
  usual place.** Each candidate names the free figures it may start; at a note where one is drawn,
  a free scale tone is tried before the chord tones held to that figure's resolution (a drawn
  passing tone is never written there as a neighbor tone), higher level first, then again after
  the chord tones, unheld. B5.2 "tries it"; holding alone would remove phrases, against B5.6 and
  `rule_figure_level_never_a_quota`. Not adopted: only moving the tone ahead, unheld. Now in:
  [chunk 6](versions/v3/build-plan-v3.1.md#chunk-6--favored-levels-order-the-search).

- **D370 (2026-10-19): each kept-session shape keeps its own data version; played notes stay at 1.** At data version 2 the summary and the body move to 2; the played-notes shape does not
  change, so its records keep 1 (STABLE `module_on_device_database`); one shared constant at 2
  would make every session with played notes unreadable. Change set J3's "the shapes are at data
  version 2" is applied as the summary and the body. Not adopted: rewriting played notes to 2.
  Now in: [chunk 9](versions/v3/build-plan-v3.1.md#chunk-9--kept-sessions-hold-the-levels-and-the-preset-label).

- **D371 (2026-10-19): a new session's preset label is written in B9's form from chunk 9 on.**
  "Neutral", "Jazz" or "Custom, based on Jazz", through one function the version 2 step shares,
  never v3.0's "Custom (Jazz grammar)": a stored label is kept for good. Chunk 12 routes
  `control-summary` through it. Now in:
  [chunk 9](versions/v3/build-plan-v3.1.md#chunk-9--kept-sessions-hold-the-levels-and-the-preset-label),
  [chunk 12](versions/v3/build-plan-v3.1.md#chunk-12--presets-replace-the-musical-profile).

- **D372 (2026-10-19): wave 2's preflight corrections, plan v11.** Chunk 6's files, drift checks,
  split rule and tense-note exclusion follow the code; chunk 7 names its figures for the draw;
  chunk 9 adds its storage files and owner notes, and drops the label fallback to phrase 1: every
  readable summary holds the customized flag, and chunk 8's phrases hold no profile (B9, Part B
  v1.4). Now in: [chunk 6](versions/v3/build-plan-v3.1.md#chunk-6--favored-levels-order-the-search),
  [chunk 7](versions/v3/build-plan-v3.1.md#chunk-7--two-new-free-figures-the-appoggiatura-and-the-diatonic-enclosure),
  [B9](versions/v3/master-spec.md#b9-the-generation-request-the-replay-key-and-kept-sessions).

- **D373 (2026-10-19): chunk 22 adds {length} to the review's summary.** Both designs write
  "{session date} · {length} · {phrases} · …"; v3.0 shipped without it with no ruling, and chunk 9
  added only {preset}. A small chunk in wave 3 (not started), after chunk 12, which may change the
  same kept-session record. Not adopted: folding it into chunk 12, which touches no review file.
  Now in: [chunk 22](versions/v3/build-plan-v3.1.md#chunk-22--the-reviews-summary-gives-the-sessions-length),
  [waves](versions/v3/build-plan-v3.1.md#waves).

- **D374 (2026-10-19): M3's version 2 decision is taken by the plan's method; the heavy case is
  the owner's (opens O233).** At 10, 100 and 500 sessions of M2's 100 kB bodies the upgrade loads in
  at most 750 ms, inside the 2 s wait: the step stays at open. Larger bodies run past the wait,
  which B9's "the player sees no difference" does not allow, so spec-writer does not accept it.
  Now in: [M3](versions/v3/build-plan-v3.1.md#m3--the-start-up-read-and-the-migrations),
  [gates](versions/v3/build-plan-v3.1.md#gates), [O233](open-questions.md).

- **D375 (2026-10-19): a hole in a timeline's measures goes to the issue tracker (ISS-013).** The
  domain parser accepts it and yields a timeline with a missing measure; no v3.1 chunk owns the
  parser, and the fix is not v3.1 behaviour. Not adopted: a v3.1 chunk. Now in:
  [ISS-013](../issues/Ref_20261019_timeline_parser_accepts_holes.md).

- **D376 (2026-10-20): v3.0's sessions are carried over at open only; the rare overrun is
  accepted (closes O233, the owner's (a)).** About 220 or more pinned v3.0 sessions of about 13
  minutes run the upgrade past the 2 s wait once: that visit starts from the defaults and keeps
  nothing; the upgrade completes and the next visit is normal. No conversion when read is built.
  Also accepted, with no test ("Leave it"): a request failing inside the upgrade (a full device)
  rolls it back and leaves the port unavailable, so every visit starts from the defaults until
  space is freed. For wave 3's sync (`documentalist`): `rule_earlier_kept_sessions_carried_over`
  (DRAFT) still keeps B9's old read-time clause, and change set J3 says "or when it is read";
  both follow the new B9. Now in: [B9](versions/v3/master-spec.md#b9-the-generation-request-the-replay-key-and-kept-sessions),
  [M3](versions/v3/build-plan-v3.1.md#m3--the-start-up-read-and-the-migrations), [gates](versions/v3/build-plan-v3.1.md#gates).
