> **Archived 2026-10-21.** Closed range for the v3.1 milestone: v3.1 is released as version
> 3.1.0 (tag `v3.1.0`, 55364e7). These decisions are the v3.1 build's, from the owner's
> approval of the v3.1 design (gate D0, D353) to his acceptance at wave 5 (D388). Archived IDs
> keep their meaning and may be cited anywhere; each decision's content is now stated as
> settled fact in a live document, or is history, as the "where it now lives" table in
> [archive/v3/README.md](README.md) records. Relative links were written from `specs/`; their
> paths were repaired on 2026-10-21 so they resolve from this folder.

- **D353 (2026-10-19): gate D0 is given: the owner approves the v3.1 design (ux D225–D251).** v3.1
  only; the v3.2 design is not approved. `ux-writer` freezes it into `ui_ux/versions/v3.1/` and the
  plan's design links are repointed there. Now in:
  [build-plan-v3.1.md, Gates](../../versions/v3/build-plan-v3.1.md#gates).

- **D354 (2026-10-19): gate R0 is met.** v3.0 is released: `3.0.0` was tagged on 2026-10-16 (D348),
  so chunks 0 and 2 may start. Now in: [build-plan-v3.1.md, Gates](../../versions/v3/build-plan-v3.1.md#gates).

- **D355 (2026-10-19): gate T1 is not given.** The owner allows no `ux-writer` pass on
  `src/styles/theme.css` and `components.css` for now. Chunk 1 and every chunk that waits on it
  (13, 14, 17–20) stay blocked; the waves are re-formed so the rest goes ahead (D356). Now in:
  [build-plan-v3.1.md, Gates](../../versions/v3/build-plan-v3.1.md#gates).

- **D356 (2026-10-19): v3.1's plan v4: waves re-formed around T1, code facts refreshed.** Waves 0–3
  hold every chunk T1 does not block, waves 4 and 5 the rest; chunk 3 no longer waits on chunk 2
  (an order-only edge: wave 0 changes no generator code), chunk 14 gains a capture so 19 and 20
  can share its wave, and chunk 16 waits on chunk 9 (data version 2 first). The code facts are
  checked against `main` (d007b27); the design links point at the frozen v3.1 design (ux D324).
  Status: ready for owner approval. Now in: [build-plan-v3.1.md](../../versions/v3/build-plan-v3.1.md#waves).

- **D357 (2026-10-19): the owner approves v3.1's build plan v4, transitional state included.**
  Waves 0–3 may merge into `main` and stay there while T1 waits: `main` keeps offering Neutral and
  Jazz through the old control, and no release is cut before wave 5 merges. T1 stays not given and
  is asked again before wave 4; wave 0 starts now. Now in:
  [build-plan-v3.1.md](../../versions/v3/build-plan-v3.1.md#read-first-what-v31-changes-in-v30-and-v2).

- **D358 (2026-10-19): master spec Part B v1.1: B12's code facts checked against v3.0.** Facts
  only, following the code (`d007b27`); no behaviour changes. The routing point is not the only
  path (the instrument switch and Vary settings take their own), pre-generation discards on a
  change, storage exists, and v3.0 left 230 bytes of entry-chunk budget, which opens
  [O231](../../open-questions.md). Now in: [B12](../../versions/v3/master-spec.md#b12-existing-code-and-risks).

- **D359 (2026-10-19): v3.1's entry budget is raised to 300 KiB (closes O231).** The owner wrote
  "raise to 300kb"; read in the unit the 224 KiB budget uses (`entryChunkByteBudget = 224 * 1024`,
  `scripts/verify-boundaries.mjs`), that is 307,200 B. The driver's change to the constant lands in
  wave 0. Not adopted: raising it chunk by chunk by measured growth (O231's proposal). Now in:
  [M4](../../versions/v3/build-plan-v3.1.md#m4--the-first-load-bundle),
  [B12](../../versions/v3/master-spec.md#b12-existing-code-and-risks).

- **D360 (2026-10-19): the STABLE `rule_saved_settings_load_tolerantly` may take the
  `changes-in-v3.1` tag.** The owner allows `documentalist` the STABLE guard's override for this tag,
  metadata only ([change set part I3](../../../docs/release/v3.1-v3.2-intent-change-set.md#i3-for-the-owner-not-applied));
  its wording changes under D361. Now in:
  [chunk 16](../../versions/v3/build-plan-v3.1.md#chunk-16--presets-and-levels-on-the-device).

- **D361 (2026-10-19): v3.1's revisions of v3.0's STABLE contract atoms take a MAJOR contract
  bump.** The twelve atoms of change set part I3; `documentalist` drafts their new wordings and the
  owner confirms them, the "to decide" rows included, before the first wave sync that revises one:
  gate CS, which blocks wave 1's sync, since chunk 8 already changes what a kept phrase stores. B11
  and B12 now count them, and B11 lists the four entries it missed (part I4). Now in:
  [Gates](../../versions/v3/build-plan-v3.1.md#gates),
  [B11](../../versions/v3/master-spec.md#b11-what-v31-changes-in-v30-and-in-v2s-guarantees).

- **D362 (2026-10-19): the STABLE `rule_open_phrase_ending` is reworded with v3.1.** Its "jazz
  approaches, and jazz enclosures" and "profile-approved" continuation give way to wording that
  names no profile, since chromatic figures come from any preset; its guarantee is unchanged. Under
  D361's bump and gate CS; chunk 12 revises it. Now in:
  [chunk 12](../../versions/v3/build-plan-v3.1.md#chunk-12--presets-replace-the-musical-profile).

- **D363 (2026-10-19): gate CS is cleared; the owner confirms every wording of change set part J.**
  His words: "Agreed to the change in the wording." That includes the two that weaken a guarantee
  (`rule_settings_saved_on_change`, `rule_saved_settings_load_tolerantly`), CONTRACT 7.0.0, and one
  MAJOR bump at wave 1's sync (chunk 8), the later syncs (chunks 9, 12, 16, 17, 18) applying the rest
  under 7.0.0. Now in: [Gates](../../versions/v3/build-plan-v3.1.md#gates),
  [change set part J](../../../docs/release/v3.1-v3.2-intent-change-set.md#j-cs-contract-wordings-for-the-owners-sign-off-drafted-2026-10-19-not-applied).

- **D364 (2026-10-19): chunk 9 stays in wave 2; its version 2 step reads both version 1 shapes and
  never throws on a stored value.** Chunk 8 writes levels at data version 1, so a step expecting a
  profile in every phrase would throw, roll the upgrade back and make every later open reject. Not
  adopted: moving chunk 9 into wave 1, since wave 1's membership froze at its preflight and 4 → 8 →
  9 is a three-chunk chain the in-wave rule forbids. Only development data is exposed (no release
  before wave 5); `module_on_device_database` is a known drift until chunk 9. Now in:
  [chunk 9](../../versions/v3/build-plan-v3.1.md#chunk-9--kept-sessions-hold-the-levels-and-the-preset-label),
  [chunk 8](../../versions/v3/build-plan-v3.1.md#chunk-8--replay-key-ifk3-the-profile-leaves-the-request).

- **D365 (2026-10-19): a kept session's summary takes its profile from the session history.** Once
  the intent holds no profile, `encodeKeptSession` cannot read phrase 1's; the history keeps the
  profile of the settings the session started with. It also fixes v3.0 naming phrase 1's profile
  after Use it, against `rule_stale_phrase_prompt_at_start`. Not adopted: `HeldSessionFacts`, which
  would change the STABLE `module_kept_session_save` outside change set part J. Now in:
  [chunk 8](../../versions/v3/build-plan-v3.1.md#chunk-8--replay-key-ifk3-the-profile-leaves-the-request).

- **D366 (2026-10-19): wave 1's preflight corrections, plan v7.** The **Never** row guards the
  fixtures and replay assertions, not the spec files around them; chunk 4 also takes the profile
  out of the pitch policy and the harmony planner, so chunks 5 and 8 (no path between them) share
  no file; chunk 8 owns the replay-key specs and the stale prompt's labels. Not adopted: chunk 10
  taking `rule_preset_management_actions` (chunk 17's). Now in:
  [Read first](../../versions/v3/build-plan-v3.1.md#read-first-what-v31-changes-in-v30-and-v2),
  [chunk 4](../../versions/v3/build-plan-v3.1.md#chunk-4--figure-levels-in-the-generation-request).

- **D367 (2026-10-19): version 1 holds a third phrase shape; chunks 8 and 9 read it.** Chunk 4's
  kept-intent parser stores `figureLevels` beside the profile, so phrases kept until chunk 8 hold
  both. In that shape the levels must equal the profile's mapped levels, else the record is
  unreadable (chunk 4's rule kept); chunk 8 routes the mapping through `profile-to-levels.ts`.
  Now in: [Read first](../../versions/v3/build-plan-v3.1.md#read-first-what-v31-changes-in-v30-and-v2),
  [chunk 8](../../versions/v3/build-plan-v3.1.md#chunk-8--replay-key-ifk3-the-profile-leaves-the-request),
  [chunk 9](../../versions/v3/build-plan-v3.1.md#chunk-9--kept-sessions-hold-the-levels-and-the-preset-label).

- **D368 (2026-10-19): the tense note a joined phrase may end on follows the levels like a free
  scale note (closes O232).** The owner chose (b), "Gate it like a free note": offered and accepted
  only when the passing tone (the accented passing tone on beats 1 and 3) or the neighbor tone is
  not Off; with both Off, no tense ending at the join. It sounds like those figures across the
  join. Not adopted: (a) ungated; (c) carrying the direction across the join. Now in:
  [B5.4](../../versions/v3/master-spec.md#b54-free-figures-and-tensions-scheduled-figure),
  [chunk 7](../../versions/v3/build-plan-v3.1.md#chunk-7--two-new-free-figures-the-appoggiatura-and-the-diatonic-enclosure).

- **D369 (2026-10-19): a favored free scale tone is tried first as the drawn figure, and keeps its
  usual place.** Each candidate names the free figures it may start; at a note where one is drawn,
  a free scale tone is tried before the chord tones held to that figure's resolution (a drawn
  passing tone is never written there as a neighbor tone), higher level first, then again after
  the chord tones, unheld. B5.2 "tries it"; holding alone would remove phrases, against B5.6 and
  `rule_figure_level_never_a_quota`. Not adopted: only moving the tone ahead, unheld. Now in:
  [chunk 6](../../versions/v3/build-plan-v3.1.md#chunk-6--favored-levels-order-the-search).

- **D370 (2026-10-19): each kept-session shape keeps its own data version; played notes stay at 1.** At data version 2 the summary and the body move to 2; the played-notes shape does not
  change, so its records keep 1 (STABLE `module_on_device_database`); one shared constant at 2
  would make every session with played notes unreadable. Change set J3's "the shapes are at data
  version 2" is applied as the summary and the body. Not adopted: rewriting played notes to 2.
  Now in: [chunk 9](../../versions/v3/build-plan-v3.1.md#chunk-9--kept-sessions-hold-the-levels-and-the-preset-label).

- **D371 (2026-10-19): a new session's preset label is written in B9's form from chunk 9 on.**
  "Neutral", "Jazz" or "Custom, based on Jazz", through one function the version 2 step shares,
  never v3.0's "Custom (Jazz grammar)": a stored label is kept for good. Chunk 12 routes
  `control-summary` through it. Now in:
  [chunk 9](../../versions/v3/build-plan-v3.1.md#chunk-9--kept-sessions-hold-the-levels-and-the-preset-label),
  [chunk 12](../../versions/v3/build-plan-v3.1.md#chunk-12--presets-replace-the-musical-profile).

- **D372 (2026-10-19): wave 2's preflight corrections, plan v11.** Chunk 6's files, drift checks,
  split rule and tense-note exclusion follow the code; chunk 7 names its figures for the draw;
  chunk 9 adds its storage files and owner notes, and drops the label fallback to phrase 1: every
  readable summary holds the customized flag, and chunk 8's phrases hold no profile (B9, Part B
  v1.4). Now in: [chunk 6](../../versions/v3/build-plan-v3.1.md#chunk-6--favored-levels-order-the-search),
  [chunk 7](../../versions/v3/build-plan-v3.1.md#chunk-7--two-new-free-figures-the-appoggiatura-and-the-diatonic-enclosure),
  [B9](../../versions/v3/master-spec.md#b9-the-generation-request-the-replay-key-and-kept-sessions).

- **D373 (2026-10-19): chunk 22 adds {length} to the review's summary.** Both designs write
  "{session date} · {length} · {phrases} · …"; v3.0 shipped without it with no ruling, and chunk 9
  added only {preset}. A small chunk in wave 3 (not started), after chunk 12, which may change the
  same kept-session record. Not adopted: folding it into chunk 12, which touches no review file.
  Now in: [chunk 22](../../versions/v3/build-plan-v3.1.md#chunk-22--the-reviews-summary-gives-the-sessions-length),
  [waves](../../versions/v3/build-plan-v3.1.md#waves).

- **D374 (2026-10-19): M3's version 2 decision is taken by the plan's method; the heavy case is
  the owner's (opens O233).** At 10, 100 and 500 sessions of M2's 100 kB bodies the upgrade loads in
  at most 750 ms, inside the 2 s wait: the step stays at open. Larger bodies run past the wait,
  which B9's "the player sees no difference" does not allow, so spec-writer does not accept it.
  Now in: [M3](../../versions/v3/build-plan-v3.1.md#m3--the-start-up-read-and-the-migrations),
  [gates](../../versions/v3/build-plan-v3.1.md#gates), [O233](../../open-questions.md).

- **D375 (2026-10-19): a hole in a timeline's measures goes to the issue tracker (ISS-013).** The
  domain parser accepts it and yields a timeline with a missing measure; no v3.1 chunk owns the
  parser, and the fix is not v3.1 behaviour. Not adopted: a v3.1 chunk. Now in:
  [ISS-013](../../../issues/Ref_20261019_timeline_parser_accepts_holes.md).

- **D376 (2026-10-20): v3.0's sessions are carried over at open only; the rare overrun is
  accepted (closes O233, the owner's (a)).** About 220 or more pinned v3.0 sessions of about 13
  minutes run the upgrade past the 2 s wait once: that visit starts from the defaults and keeps
  nothing; the upgrade completes and the next visit is normal. No conversion when read is built.
  Also accepted, with no test ("Leave it"): a request failing inside the upgrade (a full device)
  rolls it back and leaves the port unavailable, so every visit starts from the defaults until
  space is freed. For wave 3's sync (`documentalist`): `rule_earlier_kept_sessions_carried_over`
  (DRAFT) still keeps B9's old read-time clause, and change set J3 says "or when it is read";
  both follow the new B9. Now in: [B9](../../versions/v3/master-spec.md#b9-the-generation-request-the-replay-key-and-kept-sessions),
  [M3](../../versions/v3/build-plan-v3.1.md#m3--the-start-up-read-and-the-migrations), [gates](../../versions/v3/build-plan-v3.1.md#gates).

- **D377 (2026-10-20): until chunk 16, the device keeps v3.0's selection (wave 3's preflight).**
  Chunk 12 loads a saved Neutral or Jazz selection as that built-in, or Custom based on it, with
  its levels, the values winning; it saves Neutral, Jazz, or Custom based on either, as v3.0's
  selection, and nothing of the other built-ins or the levels. Interim inside wave 3, which does
  not merge to `main` between chunks 12 and 16, so not put to the owner.
  Now in: [chunk 12](../../versions/v3/build-plan-v3.1.md#chunk-12--presets-replace-the-musical-profile).

- **D378 (2026-10-20): the passing-and-neighbor rule does not ship (gate DP, the owner's
  "reject").** Chunk 11 met B5.6's acceptance at all three settings: every phrase 2 to 6 generated
  at 60, 120 and 240 BPM, fallbacks at 240 BPM below the baseline, every built-in generating in
  every allowed mode, no share tuned. Chunk 20 is dropped and every level stays selectable; the
  release gate re-checks, and DP reopens only if "every diatonic figure Off" fails then.
  Now in: [B5.6](../../versions/v3/master-spec.md#b56-the-cost-guard),
  [DP](../../versions/v3/build-plan-v3.1.md#decision-point-the-passing-and-neighbor-rule),
  [chunk 20](../../versions/v3/build-plan-v3.1.md#chunk-20--passing-and-neighbor-never-both-off-conditional),
  [waves](../../versions/v3/build-plan-v3.1.md#waves).

- **D379 (2026-10-20): the cost guard's settings are the ones chunk 11 ran; M1 runs no
  all-raised setting.** "Every diatonic figure Off" is Jazz's levels with figures 1 to 5 Off,
  against Jazz; a built-in is swept as chosen, with its own rhythm. Chunk 11's extra runs (every
  figure Off; each built-in's levels on the sweep's rhythm) are recorded beside, outside the
  acceptance. Item 3 rests on one figure's ladder, and all raised costs what M2's "every figure
  Strongly favored" measures. Now in: [B5.6, B14 item 9](../../versions/v3/master-spec.md#b56-the-cost-guard),
  [M1](../../versions/v3/build-plan-v3.1.md#m1--figure-shares), [M2](../../versions/v3/build-plan-v3.1.md#m2--the-cost-guard).

- **D380 (2026-10-20): the settings codec's throw on a stored BigInt or circular control value
  goes to the issue tracker (ISS-014).** A v3.0 defect found by chunk 16, whose own reader guards
  against it; no v3.1 chunk owns the control parsers. Not adopted: a v3.1 chunk. Now in:
  [ISS-014](../../../issues/Ref_20261020_settings_codec_throws_on_bigint.md).

- **D381 (2026-10-20): the two strings that still say "musical profile" go to chunks 13 and 18.**
  The harmony failure alert to chunk 13, with the rest of the workspace's profile copy; Your
  data's Settings line to chunk 18, which owns the sheet's copy. Both take the frozen v3.1 design's
  wording. Now in: [chunk 13](../../versions/v3/build-plan-v3.1.md#chunk-13--the-preset-bar-and-the-key-and-mode-marks),
  [chunk 18](../../versions/v3/build-plan-v3.1.md#chunk-18--your-data-and-delete-everything).

- **D382 (2026-10-20): gate T1 is given; reverses D355.** The owner's "Give T1", asked before
  wave 4: one `ux-writer` pass on `src/styles/theme.css` and `components.css` for v3.1's token
  additions (part 1 of the token source), as for v3.0 (ux Q66). Chunk 1 may run, and wave 4 waits
  for wave 3 only. Plan v16. Now in: [gates](../../versions/v3/build-plan-v3.1.md#gates),
  [waves](../../versions/v3/build-plan-v3.1.md#waves), [chunk 1](../../versions/v3/build-plan-v3.1.md#chunk-1--token-source-pass-part-1-v31).

- **D383 (2026-10-20): ISS-014 is fixed on wave 3's branch, before its merge (follow-up to D380).**
  The owner's "Fix before merging": still no v3.1 chunk, a fix commit on `v3.1-w3` (e4c6a9b).
  Now in: [ISS-014](../../../issues/Ref_20261020_settings_codec_throws_on_bigint.md#change-log).

- **D384 (2026-10-20): during a session the key and mode marks come from the session's start
  settings, never from the shown ones.** The marked values from their restriction
  (`SessionSettings.restriction`, absent for none or any: nothing marked); the notes' and the
  description's preset from their selection. At Idle and in review, `restrictionInForce` for the
  player's own. One pure function in `control-options.ts` gives the marks and notes; the session
  controller exposes the start settings. Why: with a stale phrase 1 the shown key and mode are
  phrase 1's, and the marks must keep what Start showed, Vary settings' own bound (B6.4, B8.1; the
  frozen design's marks). Now in: [chunk 13](../../versions/v3/build-plan-v3.1.md#chunk-13--the-preset-bar-and-the-key-and-mode-marks).

- **D385 (2026-10-20): at wave 4's report the owner signs off five atoms and one rewording, and
  makes the marks' session behaviour a business rule.** (a) DRAFT→REVIEW:
  `rule_restriction_highlight_never_blocks`, `rule_custom_names_its_base`,
  `ui_segmented_control_marked_option`, `module_preset_bar_model`, `module_key_and_mode_marks`.
  (b) `rule_custom_names_its_base`'s last LOGIC sentence becomes "No status line names a retained
  grammar: no hidden set of figures exists, since the figures are visible settings." (c) "During a
  session the marks do not change: they show the restriction in force at Start for the whole
  session, whatever key, mode or selection the read-only controls show." Until now only the design
  and D384 said it. Now in: [B6.4](../../versions/v3/master-spec.md#b64-the-selection-custom-and-the-highlight).

- **D386 (2026-10-21): the preset actions' session action is refused only while a session runs,
  never by an operation in flight.** Chunk 17's one session action replacing the preset list and
  the selection skips `canChangeConfiguration` (`operation === 'idle'`), which would refuse it
  during Loading; the player presets composable refuses every action while a session runs. Why:
  saving, renaming and deleting change no setting, and the frozen design keeps `preset-actions`
  enabled during Loading (a minor call, owner delegation). Now in: [chunk 17](../../versions/v3/build-plan-v3.1.md#chunk-17--preset-management-the-actions-and-the-preset-sheet).

- **D387 (2026-10-21): the preset-list action saves the selection it changes, and only it.**
  Through `saveSettings`, when the selection given differs from the current one: save as new and
  save changes from Custom save it, rename never, delete once the record is deleted (Custom with no
  base for the selection or the base); a refused write still saves it, and the reload loads Custom
  with no base. Why: B7 saves a selection change at once and loading's "values win" covers the
  missing record (a minor call, owner delegation). Now in: [chunk 17](../../versions/v3/build-plan-v3.1.md#chunk-17--preset-management-the-actions-and-the-preset-sheet).

- **D388 (2026-10-21): choosing again the option a control already shows is accepted as it
  behaves; no change.** The owner, at wave 5 (chunk 14's finding): a preset turns Custom, and the
  pre-generated phrases may be discarded although nothing changed. Chunk 19 found that through the
  queue key such a choice may discard nothing; the acceptance stands either way. Now in:
  [B6.4](../../versions/v3/master-spec.md#b64-the-selection-custom-and-the-highlight),
  [B8.3](../../versions/v3/master-spec.md#b83-pre-generation) (Part B v1.8).
