# Decisions

Status: draft v2.124

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
- D228–D231 (the owner's first rulings on v3.1's presets and their key and mode restriction):
  [archive/v3/decisions-D228-D231.md](archive/v3/decisions-D228-D231.md)
- D353–D388 (the v3.1 build, from the design's approval to the owner's acceptance at wave 5):
  [archive/v3/decisions-D353-D388.md](archive/v3/decisions-D353-D388.md)
- D390–D391 (v3.1's wave-5 sign-offs and hand checks H1 and H2):
  [archive/v3/decisions-D390-D391.md](archive/v3/decisions-D390-D391.md)

Archived IDs keep their meaning and may be cited anywhere. Their content is now stated as settled
fact in the live documents (see the [archive index](archive/README.md) and each milestone
folder's README, such as [archive/v3/README.md](archive/v3/README.md)). Numbering continues from
**D410**.

Live here: D232–D251 (v3.2, not built yet), with v3.1's D233, D235, D242 and D250 interleaved
among them and D237, D239 and D246 ruling both releases, kept until v3.2's archive closes the
range; D259–D260 (style packs, planned with no version, and the sound ban; merged from branch
`v4-accompaniment-research`); D261–D288 (v3.3, not built yet; D263–D288 merged from branch
`v3.3-chord-research`); D344–D348 (the v3.0 release and its v3.0.x notes, still open); D349–D352
(the v3.1–v3.3 plan migrations, merged from branch `plan-migration` as D339–D341); D389 (v3.4
opened); D392, D396 and D397 (v3.1's release gate, whose hand checks H3–H5 and their waiting
promotions are still open); D393–D395 (the lexicon page in v3.4, its single source, the lexicon
API later); and D398 (v3.1 released and archived). D289 is unused.

## Decision Log

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
  Details: [embellishment-flags.md](archive/v3/embellishment-flags.md),
  [presets.md](archive/v3/presets.md). The v2 rules and atoms these change (Vary settings'
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

- **D389 (2026-10-21): v3.4, a structural review, is the last v3 milestone, after v3.3 and before
  v4.** The owner asked for "an overall structural analysis of our app" before v4's endgame work:
  soundness for expansion, the 300 KiB entry budget, refactors worth taking, a split into
  libraries. No player-facing behaviour. Asked whether it should run before v3.2 and v3.3: "leave it
  for the last milestone of v3, there is no need to run it prior". Opens O234–O238. Now in:
  [v3.4](versions/v3/README.md#v34--structural-review), [scoping draft](versions/v3/structural-review.md).

- **D392 (2026-10-21): the release gate's automated part runs now; v3.1 H3, H4 and H5 stay open
  and the owner runs them later.** The owner: "You'll run them later". Chunk 21 runs everything
  but those three checks; the owner's go and the `3.1.0` tag wait on them. Now in:
  [hand checks](versions/v3/build-plan-v3.1.md#hand-checks),
  [chunk 21](versions/v3/build-plan-v3.1.md#chunk-21--v31-release-gate) (plan v21).

- **D393 (2026-10-21): v3.4 also builds a lexicon page, step one of a side project; D389 is
  amended.** The owner: "have a side page to our app reference all words in there, it must allow
  alphabetical exploration, simple search … That's for step one (include it in 3.4)". Lazy-loaded,
  offline, `src/styles/` only, keyboard use; out: editing, word popups, the API. D389's "no
  player-facing behaviour" now describes the structural review only. Opens O239–O246. Now in:
  [lexicon page](versions/v3/lexicon-page.md#2-settled), [v3.4](versions/v3/README.md#the-lexicon-page-d393).

- **D394 (2026-10-21): the lexicon page's only source is `docs/music/lexicon.md`.** The owner: "it
  must use existing md files and not duplicate information". Read at build time; no hand-copied
  list, no second list, no generated file committed; a lexicon edit shows with no other change,
  and a check proves it. Now in: [lexicon page §5](versions/v3/lexicon-page.md#5-the-single-source-d394).

- **D395 (2026-10-21): the lexicon becomes "a proper API" in v4 or v5, the version decided
  later.** The owner: "For later (v4 or v5 depending on how they goes) we will turn this in a
  proper API." Not specced. Now in:
  [roadmap](roadmap.md#planned-v4-or-v5--the-lexicon-api).

- **D396 (2026-10-21): the owner accepts every proposal of the v3.1 release sync; `v3.1-release`
  merges into `main` now and the `3.1.0` tag follows H3–H5.** The owner: "go with the proposals for
  all of them". The gate's automated part passed (chunk 21, merged as 6a25f27; final M1 and M2 at
  chunk 11's counts, DP stays closed; entry chunk 265,431 B); sync 1fa0bdf, 9dcc031. Promotions,
  applied by `documentalist`: 11 DRAFT→REVIEW (`rule_figure_level_orders_search` reworded, shares
  kept per D391), 30 REVIEW→STABLE, CONTRACT 7.0.0→7.1.0 (MINOR), MODULE and ENTITY atoms as at
  v3.0, `changes-in-v3.1` removed from 7 STABLE atoms. Still on the owner (D392): H3–H5, 11
  REVIEW→STABLE and 2 DRAFT→REVIEW promotions, his go, the tag on `main`. Now in:
  [chunk 21](versions/v3/build-plan-v3.1.md#chunk-21--v31-release-gate) (plan v22).

- **D397 (2026-10-21): the owner gives his go; `3.1.0` is tagged on `main` now, and v3.1 H3, H4
  and H5 become post-release hand checks; D392 and D396 are amended.** The owner: "you may tag when
  everything is done", then, asked about H3–H5, "Tag now, H3–H5 later". The tag follows the
  committed sync promotions (1bb3257, CONTRACT 7.1.0) and the merge into `main`, pushed. A finding
  from H3–H5 becomes an issue or a 3.1.x fix; as each check passes, its waiting promotions follow
  (11 REVIEW→STABLE, 2 DRAFT→REVIEW). D396's MODULE and ENTITY atoms: the nine new ones go on the
  contract surface, as all twelve v3.0 ones did, within the owner's "go with the proposals for all
  of them". Now in: [hand checks](versions/v3/build-plan-v3.1.md#hand-checks),
  [chunk 21](versions/v3/build-plan-v3.1.md#chunk-21--v31-release-gate) (plan v23).

- **D398 (2026-10-21): v3.1 is released as version 3.1.0; its working record is archived.** The
  tag `v3.1.0` is on `main` at 55364e7 (D397). Moved verbatim to
  [archive/v3/](archive/v3/README.md): D228–D231, D353–D388 and D390–D391, the register's notes on
  O231–O233, the two v3.1 drafts, and the former status snapshots of the spec index and the v3
  README. Master spec Part B, the v3.1 build plan and its wave log stay in place. Still live: v3.1
  H3–H5 and their 13 waiting promotions ([v3.1.x notes](versions/v3/README.md#v31x-notes-after-the-tag)).
  No question was decided.

- **D399 (2026-10-21): v3.1's hand checks after the tag close: H4 passed, H3 and H5 waived; the 13
  waiting promotions proceed; Chrome is the one supported browser.** The owner: "edge isn't
  supported anyway so who cares. v3.0 has no live customer so we may forget about migration issue.
  otherwise everything run fine." The spec had named Edge (Chromium-based browsers, "Chrome or
  Edge"); it now says Chrome is supported and other Chromium-based browsers, Edge included, are not
  tested. H5: the v3.0 upgrade code and its tests stay. The Edge checks of the v3.2 and v3.3 plans go
  at their next revision. Now in: [v3.1.x notes](versions/v3/README.md#v31x-notes-after-the-tag),
  [hand checks](versions/v3/build-plan-v3.1.md#hand-checks), [context of use](personas.md#context-of-use).

- **D400 (2026-10-21): Jam is its own mode, apart from the usual session mode; the app opens in
  session mode, and a button switches to Jam mode.** The owner: "consider the jam mode something
  that is distinctly different from usual session (website load on start the current session mode,
  click a button to switch in jam mode) … moving jam as separate from session should prevent much
  of the colision ui wise." Replaces Part C's Jam switch among the session options (C5.1). Opens
  O251. Now in: [Jam mode §2](versions/v3/jam-mode.md#2-two-modes).

- **D401 (2026-10-21): Jam has its own settings set.** The owner: "settings related to jam are
  probably a bit different (the app will follow what has been provided and will iterate and mutate
  over the provided motif)." Which settings it holds, shares or drops is O247, O248 and O253. Now in:
  [Jam mode §3](versions/v3/jam-mode.md#3-jams-settings-set).

- **D402 (2026-10-21): Jam's code loads on demand, outside the first-load (entry) chunk.** The
  owner: "This may reduce initial load cost." The entry chunk carries only the button that opens
  Jam mode. Bundle policy: O258. Now in: [Jam mode §2](versions/v3/jam-mode.md#2-two-modes).

- **D403 (2026-10-21): Jam's footprint in the generator is kept as small as possible: one shared
  generator, Jam's steering at its edges.** The owner: "we must aim at reducing impact of jam on
  generator work as much as possible, but it is inescapable." The seam is proposed in
  [Jam mode §4](versions/v3/jam-mode.md#4-the-generator-seam) (O252).

- **D404 (2026-10-21): Jam's tempo target is 120 to 180 BPM; 240 BPM is best effort, worked on
  last, and may be dropped.** The owner: "working at 240 bpm should be considered best effort
  (leave it for last). aim for 120 to 180 at maximum. None of our persona are expert at these
  level. (i'll accept the sacrifice of 240bpm should it come up)." How the tempo is set is O249;
  the exact ceiling O250. Now in: [Jam mode §5](versions/v3/jam-mode.md#5-tempo-in-jam).

- **D405 (2026-10-21): v3.2 is re-scoped around D400–D404; Part C's Jam is reopened, and the
  v3.2 build plan's rewrite waits for the re-scope.** Part C (approved by D239) stays the record
  until the re-scope is settled and consolidated into it; where [Jam mode](versions/v3/jam-mode.md) differs, Part C is
  to change. The plan's corrections found against v3.1 still apply at the rewrite. The rhythm lock
  and Vary settings' allowed groups are not reopened beyond what the mode split touches. Now in:
  [Jam mode §6](versions/v3/jam-mode.md#6-blast-radius).

- **D406 (2026-10-21): Jam's settings, its controls taken from the doodle, its tempo and its
  rhythm lock are settled as proposed, provisionally until the owner's checks.** The owner: "your
  propositions seem nice, will need testing to be sure." Closes O247, O248, O249 and O253 as
  [Jam mode §3](versions/v3/jam-mode.md#3-jams-settings-set) and [§5](versions/v3/jam-mode.md#5-tempo-in-jam) say, with the check that
  confirms each in [§3.1](versions/v3/jam-mode.md#31-what-confirms-them). A failed check comes back as a ruling for the
  owner; nothing changes silently.

- **D407 (2026-10-21): the mode switches only at Idle, never while playing, and Jam requires a
  MIDI controller.** The owner: "indeed you can't switch session/jam mode while playing. Jam
  requires a controller. ok for the rest." Without a controller, Jam mode opens and its Start is
  unavailable, saying why. Closes O251 with the rest as proposed. Now in:
  [Jam mode §2](versions/v3/jam-mode.md#2-two-modes).

- **D408 (2026-10-21): the remaining re-scope proposals are accepted.** The owner: "ok for the
  rest." Closes O250 (60–180 BPM), O252 (the seam), O254 (the doodle Jam mode keeps), O255 (one
  list, one review), O256 (v3.2 split, session-mode work first), O257 (one MAJOR bump, from
  CONTRACT 7.2.0 to 8.0.0), O258 (bundle policy) and O259 (scripted checks). Now in:
  [Jam mode](versions/v3/jam-mode.md).

- **D409 (2026-10-21): master spec Part C is rebuilt as v1.1 from the settled Jam re-scope, with a
  facts-only refresh against 3.1.0; it awaits the owner's approval.** No behaviour beyond
  D400–D408. Where the re-scope left a choice open, v1.1 proposes an answer and opens O260–O266
  (the replay key carrying the steering block, Jam's levels, the doodle-to-controls mapping, tap-in
  on the controller, shared settings changed in Jam mode, a cold rhythm domain, the split's
  versions). Now in: [Part C](versions/v3/master-spec.md#part-c--v32),
  [Jam grounding §E](versions/v3/jam-grounding.md#e-refresh-at-v310-2026-10-21).

- **D410 (2026-10-21): the owner approves master spec Part C v1.1 with its seven proposed answers;
  O260–O266 close as proposed.** The owner: "approved, go with the proposals." Part C becomes v1.2,
  the answers written in; O263's tap-in takes the design's form (D411). The contract wording's one
  sign-off (C13) is still to come. Now in: [Part C §C17](versions/v3/master-spec.md#c17-deferred-and-open),
  [§C5.16](versions/v3/master-spec.md#c516-jams-settings), [§C5.17](versions/v3/master-spec.md#c517-tempo-in-jam-and-tap-in).

- **D411 (2026-10-21): ux Q81–Q87 are answered as `ux-writer` recommended.** The same approval.
  Where they met a proposal: Jam's first values are Q83's (session mode's first-visit values, the
  tempo kept in 60–180, Embellishments Rarely) with O261's drift Near, lock and changes off; tap-in
  is ux D335's (taps only after the button; then controller notes too; unevenness never judged).
  Now in: [Part C §C5.11](versions/v3/master-spec.md#c511-the-kept-doodle-and-jam-again-on-this-doodle),
  [§C5.16](versions/v3/master-spec.md#c516-jams-settings), [§C10.5](versions/v3/master-spec.md#c105-pre-generation-v30), [Part D §D8.4](versions/v3/master-spec.md#d84-pre-generation-jam-and-the-key-and-mode-suggestion).

- **D412 (2026-10-21): design gate D0 is granted and token pass T2 allowed.** The same approval:
  the reworked v3.2 design (ux D328–D346, `ux-critic` validated), and one pass adding the classes
  `mode-switch`, `tap-tempo`, `doodle-readings` and `jam-needs-controller`, no new token value.
  Now in: [build plan v3.2, gates](versions/v3/build-plan-v3.2.md#gates).

- **D413 (2026-10-21): "the held doodle" becomes "the kept doodle".** One term per concept (D237),
  as the re-scope (D408) and the approved design say it; the lexicon entry is renamed, its id
  `kept-doodle`. Now in: [Part C §C4](versions/v3/master-spec.md#c4-words-used-in-this-part),
  [lexicon](../docs/music/lexicon.md#kept-doodle).

- **D414 (2026-10-21): phones are a third-rate client; reducing a capability on a phone is
  acceptable.** The owner: "treat the phone as third rate client, it's okay if we reduce capabilities
  for it." A standing policy (ux D119), restated. Now in: [context of use](personas.md#context-of-use),
  [Part C §C10.8](versions/v3/master-spec.md#c108-other-session-rules).

- **D415 (2026-10-21): the doodle-to-controls thresholds.** `spec-writer`'s, under D410's O262: each
  control the nearest value the quantized doodle shows, in integers; an unsupported combination
  raises rhythmic variety only. The listening check confirms them; a correction is a ruling. Now in:
  [Part C §C5.16.1](versions/v3/master-spec.md#c5161-the-doodle-to-controls-mapping).

- **D416 (2026-10-21): build plan v3.2 is rewritten as v4 from Part C v1.2 and the approved design;
  it awaits the owner's approval.** Two halves, one release: waves 0–3 session mode (with the whole
  request, `ifk4.` and kept-session shape, so each is taken once), waves 4–7 Jam mode; Jam's code
  under `src/jam/`, kept out of the entry chunk by a new boundary check; chunk 26 folded into 19;
  new chunks 28–33, 240 BPM last behind ruling J240; nine scripted hand checks, none on Edge or a
  phone. Now in: [build plan v3.2](versions/v3/build-plan-v3.2.md).

- **D417 (2026-10-21): build plan v3.2 v5 is approved; hand check v3.2 H9 is waived.** The owner:
  "wave [waive] H9. I approve you may proceed." H9 (v3.1 data carried over) is waived on D399's ground for
  v3.1 H5: the earlier version had no live users. Chunk 22's automated step-4 upgrade tests on
  seeded v3.1 data and M3 stay. IDs H1–H8 keep their numbers. Now in:
  [build plan v3.2, hand checks](versions/v3/build-plan-v3.2.md#hand-checks).

- **D418 (2026-10-21): `rule_start_while_controller_away` joins C13, for the CS sign-off.**
  `spec-writer`'s, under the owner's delegation of minor calls; found by chunk 0's re-sync (change
  set L2). It held for a Jam only under v1.0; since D407 Jam mode needs a controller. Session mode
  keeps it whole; in Jam mode Start is unavailable while the controller is away (draft M2). Revised
  by chunk 20. Now in: [Part C §C13](versions/v3/master-spec.md#c13-what-v32-changes-in-v2-v30-and-v31-guarantees-and-atoms),
  [build plan v3.2, gates](versions/v3/build-plan-v3.2.md#gates).

- **D419 (2026-10-21): a fresh Jam draws its session seed once at Start; phrase 1's attempts take
  seeds derived from it by labels of their own.** `spec-writer`'s, under the same delegation (L2).
  It keeps every seed fixed before the Jam runs, a fresh Jam reproducible, and every v3.1 seed as
  it is; a kept doodle's phrase 1 at Idle draws as any Idle phrase 1. `module_session_seed_plan`'s
  wording changes, so it joins C13 for CS; chunks 17 and 18 build it. Now in:
  [Part C §C11](versions/v3/master-spec.md#c11-the-generation-request-the-replay-key-and-kept-sessions),
  [§C15](versions/v3/master-spec.md#c15-architectural-decisions-and-their-reasons),
  [build plan v3.2, chunk 18](versions/v3/build-plan-v3.2.md#chunk-18--jam-engine-part-2-from-the-doodle-to-phrase-1).

- **D420 (2026-10-21): the vision's out-of-scope "browsers other than Chromium-based ones" follows
  D399 in the CS redraft.** `spec-writer`'s, under the same delegation: browsers other than Chrome
  are out of scope, other Chromium-based ones untested. It goes in the vision's one redraft and
  sign-off. Now in: [Part C §C13](versions/v3/master-spec.md#c13-what-v32-changes-in-v2-v30-and-v31-guarantees-and-atoms).

- **D421 (2026-10-22): gate CS is signed off; three atoms go to STABLE.** The owner, after wave 0:
  "agreed for your questions." M1–M22 of the [change set](../docs/release/v3.1-v3.2-intent-change-set.md)'s part M as
  drafted: CONTRACT 7.2.0 → 8.0.0, the vision 0.9 → 0.10; `documentalist` applies them on
  `v3.2-w0`. `module_phrase_replay_key`, `rule_seeded_phrase_reproduction` and
  `module_settings_mutation` are promoted to STABLE. Now in: [Part C §C13](versions/v3/master-spec.md#c13-what-v32-changes-in-v2-v30-and-v31-guarantees-and-atoms),
  [build plan v3.2, gates](versions/v3/build-plan-v3.2.md#gates).

- **D422 (2026-10-22): each STABLE guarantee v3.2 changes after gate CS is applied at the sync of
  the wave that builds it, with its own MAJOR contract bump and owner sign-off.** The wave driver's,
  under the owner's standing delegation; it follows the three 8.1.0 promotions (D421), so `main`
  never holds code that disagrees with a STABLE atom. CONTRACT 9.0.0 at wave 1's sync (change set
  part N, gate CN, blocks chunk 15's merge); another MAJOR at wave 2's for chunk 12's
  `module_phrase_replay_key` and `rule_seeded_phrase_reproduction` (gate CK, blocks chunk 12's
  merge). C13's "one bump" is superseded. Now in: [Part C §C13](versions/v3/master-spec.md#c13-what-v32-changes-in-v2-v30-and-v31-guarantees-and-atoms),
  [build plan v3.2, gates](versions/v3/build-plan-v3.2.md#gates).

- **D423 (2026-10-22): three wave 1 preflight points.** The wave driver's, same delegation. Until
  chunk 12's `ifk4.`, the `ifk3.` encoder refuses an intent with the lock group, the steering block
  or a carry-in from no phrase with a typed error rather than write a lossy key (chunk 6). Chunk
  15's skipped mutation is recorded in the in-memory session history only; the kept record does not
  change. N1's fixed draw bound stays a typed error; the dead end is the only no-throw outcome. Now
  in: [build plan v3.2, chunk 6](versions/v3/build-plan-v3.2.md#chunk-6--the-request-carries-v32s-inputs),
  [chunk 15](versions/v3/build-plan-v3.2.md#chunk-15--vary-settings-allowed-groups).

- **D424 (2026-10-22): C7.3's five kinds are the ones chunk 5 built; "repeated" is the identical
  edit; the shares and the known limit follow a re-measured census.** `spec-writer`'s, under the
  owner's delegation of minor calls, at the wave driver's request. The built kinds match C7.3 and
  the catalogue (a moved start or rest sits between two notes, so only adding or removing a rest
  changes the silence). The 2026-10-08 script was not kept and several of its shares do not
  reproduce, among them "with Sixteenth, none" under Strict and Straight: Sparse offers a rest
  change (20 %). Rejected: "repeated" as the same kind only (two edits at two places are two
  changes, against C7.4), and fitting the code to the old figures. Keying about 15 ms, not 10, is
  accepted. Now in: [Part C §C7.3](versions/v3/master-spec.md#c73-the-five-kinds-and-the-known-limit), [§C7.6](versions/v3/master-spec.md#c76-how-the-search-holds-the-lock),
  [jam-grounding §D.2](versions/v3/jam-grounding.md#d2-what-the-rhythm-domain-offers-a-locked-rhythm), [build plan v3.2, chunk 5](versions/v3/build-plan-v3.2.md#chunk-5--rhythm-bars-distance-and-change-kinds) (and chunks 8, 10, 11, M2, H2).

- **D425 (2026-10-22): the steering block's target rhythm holds note starts and rest starts, and
  the doodle is compared as heard.** `spec-writer`'s, under the owner's delegation of minor calls,
  at the wave driver's request after chunk 6. C8's distance needs both kinds; chunk 6 built them. A
  doodle measure holds one rest start per silence; against it a candidate's rest right after a rest
  starts nothing (18 % of candidates write a silence as two rests); the locked rhythm stays written.
  Rejected: comparing the doodle with written rests (a rhythm sounding like it would be an edit
  away, Near at beat 3). Now in: [Part C §C5.9](versions/v3/master-spec.md#c59-what-the-doodle-feeds-the-generator),
  [§C8](versions/v3/master-spec.md#c8-jams-drift), [§C11](versions/v3/master-spec.md#c11-the-generation-request-the-replay-key-and-kept-sessions),
  [build plan v3.2, chunks 6, 8 and 28](versions/v3/build-plan-v3.2.md#chunk-6--the-request-carries-v32s-inputs).

- **D426 (2026-10-22): a dead end mid-session is unreachable under today's rules; its skip is a
  defensive guarantee.** `spec-writer`'s, under the owner's delegation of minor calls, at the wave
  driver's request after chunk 15. The build's exhaustive search found that the narrow-window
  step-down never leaves Vary settings without a move, so C9's "only after the narrow-window rule"
  overstated a cause; the signed N1 wording only says what happens if one occurs. Now in:
  [Part C §C9](versions/v3/master-spec.md#c9-vary-settings-allowed-groups),
  [build plan v3.2, chunk 15](versions/v3/build-plan-v3.2.md#chunk-15--vary-settings-allowed-groups).
