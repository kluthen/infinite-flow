> **Archived 2026-10-16.** Closed range for the v3.0 milestone: v3.0 is released as version
> 3.0.0 (tag `v3.0.0`, e288d98) and deployed. These decisions are the v3.0 build's, from the
> wave-2 intent preflight (D290) to the release gate's final sync (D343). D289 is unused.
> Archived IDs keep their meaning and may be cited anywhere; each decision's content is now
> stated as settled fact in a live document, or is history, as the "where it now lives" table in
> [archive/v3/README.md](README.md) records. Relative links were written from `specs/`; their
> paths were repaired on 2026-10-16 so they resolve from this folder.

- **D290 (2026-10-12): a background pre-generation attempt can be cancelled.** The owner's
  answer ("ok") to the first point the v3.0 wave-2 intent preflight put to him (build plan, Wave
  records, conflict 1; it blocked chunk 24). Master spec §8 has any player request at Idle cancel
  the background attempt in progress through the worker's cancellation, but
  `module_generation_worker_cancellation` (STABLE, on the contract's surface) says a call with no
  signal is never cancelled and the Idle flow passes none. The owner agrees to revise it to: "the
  Idle flow's player requests pass no signal and are never cancelled; a background pre-generation
  attempt passes one, aborted by any player request at Idle". He rules it a **MINOR** contract
  bump, not MAJOR: every guarantee the player relied on still holds, and the change only adds a
  background attempt that gives way to the player. `rule_dropped_attempt_cancelled` stays as
  written. `documentalist` applies the atom and the contract bump. Master spec Part A v1.8 (§8,
  §10, item 23, §14); build plan v6 (chunk 24, unblocked).
- **D291 (2026-10-12): a written key with two spellings takes the one with fewer sharps or flats,
  and the sharp one on a tie.** The owner's answer to the preflight's third point ("less
  accidental the better, sharp in case of tie"), choosing the code's existing rule
  (`spellWrittenKey`, `module_notation_display_convention`) over master spec §7.1's "the interval
  name fixes the letter-name steps used to spell written notes, the key signature and chord
  symbols" (D253). The player chooses the key in written pitch, so the transposition never moves
  the written key; it moves the concert key the phrase is generated in. The written key is
  spelled from the chosen key and collection, with the fewer sharps or flats in its key
  signature, sharps on a tie: an instrument whose written notes sound 6 semitones higher writes
  concert C major as F♯ major, not G♭ major (an augmented fourth would give G♭). Written notes and
  chord symbols (root and slash bass) are spelled in that written key: a note of its scale takes
  the key's spelling; another note takes its own letter on a white key, and on a black key a flat
  when the key signature has flats, a sharp otherwise. This is what the built-in profiles already
  do. The interval name stays derived by §7.1's fixed table and shown; its letter-name steps stay
  in the instrument's data and in a MusicXML file's transposition, and spell nothing in the app.
  Master spec Part A v1.8 (§7.1, §12, item 16); build plan v6 (chunks 16 and 19, §8 item 2);
  `documentalist` revises `rule_my_instrument_transposition_named_interval`, which still says the
  steps spell the written part.
- **D292 (2026-10-12): the staff's shared height follows my instrument's written range.** The
  owner's answer ("ok") to the preflight's point on chunk 19.
  `module_notation_layout_preflight` (REVIEW) says the one system-position size "never depends on
  a phrase or a profile"; it now takes my instrument's written range into account, as the design
  (phrase-workspace handoff, Notation Contract, ux D214) and master spec §14 already have it. The
  size changes only when my instrument is saved or deleted, never from phrase to phrase.
  `documentalist` revises the atom before chunk 19's code. Master spec Part A v1.8 (§7.1 states
  it); build plan v6 (chunk 19).

  Also recorded the same day, no decision number: the coordinator moves build plan chunk 18 to
  wave 5, after chunk 17, since its `ifk2.` decoder rebuilds the intent through chunk 17's
  `rebuildGenerationWorkerIntent` and replay refuses `my-instrument` until chunk 17. The
  preflight's plan corrections are applied to the build plan (chunks 4, 18, 19 and 24, §2, §3,
  M5) and one stale line of [build-plan-v3.2.md](../../versions/v3/build-plan-v3.2.md);
  `rule_look_ahead_deadline` is revised at chunk 24's sync, with the owner's agreement then.
  Later the same day the coordinator placed chunk 18 in wave 6 instead (Gate A, then chunks 11,
  12, 18, 22 and 25), so the chunks of one wave stay independent; chunk 18 does not need Gate A.

- **D293 (2026-10-12): my instrument gains a clef choice, treble or bass, in v3.0; octave signs
  wait (opens O180 and O181).** Chunk 19 measured how far my instrument's written range may reach
  before the staff's shared height grows (M3, `docs/notation-engraving.md`): in treble clef only an
  exact two-octave range from written B2–B4 up to E4–E6 keeps 16 staff spaces, and a low range
  costs most (C2–C4 19, C2–C7 24). Asked for the range ruling, the owner answered, verbatim: "bass
  clef option for v3.0, and keep in mind 8va/8vb/15ma etc for a later version should the need
  arise." Written into master spec Part A v1.9:
  1. **The clef.** My instrument is written in treble or bass clef, as the player chooses; the
     built-in profiles stay in treble clef. A new my instrument starts in treble clef, every
     template's clef (proposed default, for `ux-writer` to confirm with the clef control). The
     clef is a field of my instrument, apart from what the generator reads.
  2. **Display only.** The clef changes neither the written pitch nor the transposition, and
     nothing generated. It follows the phrase: the staff at Idle and in a session, the check's
     note while my instrument is selected, the review of the last session and of kept sessions
     (each phrase in the clef it was played in, kept with its instrument, §5.2), the score's
     description, and the MusicXML export (`<clef>` F on line 4). Changing only the clef keeps
     the phrase on screen, redrawn, and discards no pre-generated phrase.
  3. **Not in the replay key.** The `ifk2.` key reproduces generation, which the clef does not
     touch, so two phrases differing only by clef have the same key; the replay tool shows no
     staff. This also keeps `ifk3.` and `ifk4.`, which carry my instrument as `ifk2.` does, free of
     display data.
  4. **The shared height** (D292) reads my instrument's written range placed in its own clef.
  5. **The range ruling, per clef, is proposed, not decided:** written C2 to C7 in treble clef and
     E0 to E5 in bass clef (the same lines and spaces on each staff), keeping the shared height at
     most 24 staff spaces; the bass-clef figure is measured in the build (build plan chunk 19b).
     The alternative is a bound on the height itself. It stays with the owner (§14).
  6. **Octave signs later.** Octave signs (8va, 8vb, 15ma) and octave clefs are deferred,
     registered as O180 with spec-writer's advice against automatic ottava lines inside a
     phrase.
  7. **A gap D292 already had, made common by the clef:** a kept session played with a my
     instrument that needed more height than the current one, and phrases pre-generated before a
     save that changes the height. Registered as O181.

  No guarantee on the contract states the clef; the REVIEW and DRAFT atoms that say "treble"
  are revised by `documentalist`. Build plan v7 adds chunk 19b (bass clef for my instrument) in
  wave 2, moves the range ruling after it, and adds a clef design gate for `ux-writer` before
  chunk 20.

- **D294 (2026-10-12): my instrument's written range must lie within written C2 to C7 in treble
  clef and written E0 to E5 in bass clef.** The owner's answer ("ok") to the range bound proposed
  in D293. Both ends are included (C2 is MIDI note 36, C7 96, E0 16, E5 76, middle C being C4,
  note 60). A range outside the bound for its clef is refused live in my instrument's sheet, with
  the reason given in note names, like a range under two octaves; changing the clef checks the
  range again. The two-octave minimum and the MIDI note range still apply. The bound is a
  validity rule of my instrument, so it sits beside the two-octave rule. The owner chose it over
  a bound on the staff's height, which is exact but harder to explain. Build plan chunk 19b still
  measures the bass-clef bound and confirms that it keeps the shared height at most 24 staff
  spaces, as the treble one does; if it does not, the figure goes back to the owner. Chunk 20
  enforces the bound. Master spec Part A v1.10 (§7.1, §12, item 16, §14); the build plan's
  "Range ruling" gate is settled.
- **D295 (2026-10-12): every kept session belongs to the instrument it was played with; deleting
  my instrument deletes its sessions, and a range or transposition change erases them after a
  warning (closes O181 with D296).** The owner, verbatim: "nevermind old session they're
  inexistant. session should probably tied to instrument selected (hence reviewing an old session
  should use the old instrument (if it still exists), sessions bound to a deleted instrument
  should be deleted as well). Altering an instrument is a tough choice. i'd say: should the
  alteration changes the range indicate that this will erase all known stored session of this
  instrument. if the change is cosmetic it's okay." "Tied to instrument selected" is read as the
  instrument selected when the session was played; the session list is not filtered by the
  instrument selected now.
  1. **Belonging.** Every kept session, the most recent one and the pinned ones alike, belongs to
     the instrument named by its id in its session-wide record (master spec §5.2). Only my
     instrument can be changed or deleted, so only its sessions are ever touched.
  2. **Deleting my instrument** deletes every kept session played with it, with their favorites,
     comments and played notes; its confirmation says so and how many go.
  3. **Saving a change to my instrument's written range or transposition** first warns that it
     erases all the kept sessions of my instrument, and how many; on confirmation it saves and
     erases them; on cancel nothing changes. This holds in the sheet and through the transposition
     check's "use this for my instrument". While my instrument has no kept session, no warning is
     shown, since nothing is erased.
  4. **The session that just ended goes too** when it was played with my instrument: it leaves
     memory, its review closes, and "Review last session" goes, exactly as when the player deletes
     that session from its review (already designed: `ui_ux/flows/review-and-export/intent.md`).
     My instrument's sheet and the check are reachable while a review shows, so this happens.
  5. **A visit that saves nothing erases nothing.** An outdated tab offers neither deleting my
     instrument nor saving a range or transposition change while my instrument has kept
     sessions, as it offers no other deletion (master spec §4.3). A visit whose saved data could
     not be read has read no kept session and no my instrument, so changing or deleting a my
     instrument made during it erases nothing, and its session held in memory keeps its review.
  6. **No migration:** v3.0 is unreleased and no v3.0 session data exists.
  7. **The review still shows each phrase exactly as it was displayed.** As the coordinator
     recommended, and spec-writer agrees: D293's clef stays stored with each phrase, so the
     only changes that keep sessions (name and clef) never alter a review's engraving; the list
     keeps the name the session was played under (build plan chunk 9 stores it). A range or
     transposition change erases sessions instead of redrawing them. So the STABLE
     `req_last_session_review`'s "engraved exactly as it was displayed" holds unchanged.
  8. **One contract wording changes, PROPOSED for the owner.** `req_last_session_review`
     (STABLE, contract surface) promises the review "stays reachable until the next session
     starts". The player can now end it sooner by deleting its session, through my instrument as
     above, and already through v3.0's own Delete session (master spec §5.4), which that sentence
     never covered. Proposed wording: add "or until the player deletes its session". By the
     contract's rule this removes cases from a listed guarantee, a MAJOR version (CONTRACT 3.1 to
     4.0); the owner may rule it MINOR, as for D290, since only the player's own confirmed action
     ends the review. `documentalist` applies nothing before the owner confirms. The two pending
     part-B texts (`docs/release/v3.0-intent-change-set.md`) gain a clause each:
     `rule_instrument_profile_range` (B1) the bound per clef, `rule_controller_transposition_check`
     (B2) the warning before the check's action erases my instrument's sessions; neither weakens a
     guarantee.

  Master spec Part A v1.10 (§2, §4.1, §4.3, §4.4, §5.1, §5.4, §6, §7.1, §7.2, §10, §12, items 6,
  14, 16, 17 and 23, §14). Build plan v8 adds chunk 20c (my instrument's sessions) and a design
  gate for it.
- **D296 (2026-10-12): what each change of my instrument does, and phrases made before a save
  that changes the shared height (closes O181 with D295).** Proposed by the coordinator and agreed
  by the owner the same day:
  1. **A transposition change counts like a range change:** the erase warning (D295).
  2. **A name or clef change is cosmetic:** no warning, sessions kept; the phrase on screen is
     kept (redrawn in the new clef), and no pre-generated phrase is discarded for it.
  3. **O181(b), yes:** a save of my instrument that changes the staff's shared height without
     discarding the pre-generated phrases (a clef change, or a range change while another profile
     is selected) checks them again against the new layout, as a change of window size does: one
     that no longer fits is discarded with every phrase after it.

  **O181(a) narrows to the clef.** With D295, a kept session never holds a range my instrument no
  longer has. A clef change keeps the sessions, each phrase in the clef it was played in, and
  that clef can need more height than the shared height now has: written C2 to C4 needs 19 staff
  spaces in treble clef and 16 in bass clef. Settled as behaviour: **a review never cuts a
  phrase**; when a session's phrases need more height than the shared height, its review makes
  room for them. How is `ux-writer`'s, in the design gate before chunk 20c (proposed, as in
  O181: the review's staff takes the larger of the shared height and the height its own session
  needs). Master spec Part A v1.10 (§7.1, §8, item 16); build plan v8 (chunks 20 and 20c).
- **D297 (2026-10-13): a stale phrase 1 at Start: the app says so and asks, Regenerate or Use it
  (ISS-011, planned for the end of v3.0).** ISS-011, reproduced on v2.0.0 on 2026-10-12: at Idle,
  ordinary edits never regenerate, so after a change of Written key, Collection or Register (and
  sometimes Harmonic motion) the phrase on screen was made under other settings. Start takes it
  as phrase 1 but takes the current controls as the session's settings, and the session assumes
  phrase 1 was made under them. Phrase 2's join is then built from a phrase in the old key, the
  carry-in check throws `CarryInError`, and nothing starts (60 to 220 BPM; at 230 and 240 BPM
  phrase 2 starts standalone, so the session starts). The owner, 2026-10-13: "it's not urgent.
  plan it for the end of v3.0" (no v2 hotfix), and "i'd say regenerate prior starting session
  (more like: when starting session says the current phrase is stale and ask either to
  regenerate or use it)".
  1. **Stale.** Phrase 1 is stale when a setting the generation reads has a different value now
     than when phrase 1 was generated. Values are compared, not edits: a setting changed and
     changed back is no difference. What counts: every generation control except the tempo
     (Written key, Collection, Harmonic motion, Tension, Note density as the player chose it,
     Rhythmic variety, Syncopation, Silence density, Contour, Register, Leapiness, Arpeggio
     chaos), the musical profile (Neutral or Jazz; its customized mark alone is not read), and the
     instrument as the generation reads it (its id and, for my instrument, its range and
     transposition). From v3.1, every setting the generation request gains (embellishment figure
     levels, the chord level in v3.3) counts the same way. Some of these never caused the
     error (Tension, Contour, Note density); they count all the same, because phrase 1 then is not
     what the player's settings make. **Never stale:** the tempo and Rising tempo (the tempo never
     affects generation), Vary settings and Tension across phrases (neither acts on phrase 1), the
     audio mix, the theme, my instrument's clef and display name, and the window's width (the
     note density a narrow window gives is not a setting; v2 already starts sessions from a
     phrase made at another width, and the existing layout checks stay as they are). **The
     instrument never makes phrase 1 stale in practice:** an instrument switch regenerates the
     phrase, and saving my instrument's range or transposition while it is selected replaces it
     (master spec §7.1), so the check is there only for completeness.
  2. **When it asks.** On Start (the button, or the starting note, see 8), once every start
     condition holds, and before anything starts: no sound, no screen lock, no count-in. A Start
     blocked by a start condition stays blocked as today; the prompt is not a start condition and
     never replaces one. When phrase 1 is not stale, Start works as today and nothing is asked.
  3. **Use it.** The session starts from that choice, exactly as Start does (the choice is the
     start click: it unlocks the sound and asks for the screen locks), the start conditions
     checked again at that moment. Phrase 1 is the phrase on screen, unchanged: same request,
     seed and replay key, shown, reviewed, kept and exported with what it was generated with. The
     session's settings are the current ones: phrase 2 on is generated under them, Vary settings
     moves from them and returns to them at the end, and the session-wide record names them.
     **Phrase 2 joins phrase 1 as after a settings change applied at the boundary between phrase 1
     and phrase 2 during a session:** the existing carry-in rules adapt the join
     (`rule_setting_change_rechecks_pitch_carry_in`, `rule_key_change_drops_harmonic_carry_in`,
     `rule_harmony_change_drops_unfit_harmonic_carry_in`, `rule_register_change_replaces_carried_window`),
     so no `CarryInError` can occur at any tempo. No new carry-in rule is needed. The read-only
     controls show the settings phrase 1 was generated with during the count-in and phrase 1
     (they show the settings of the music on screen, and phrase 1's first measure is on screen
     through the count-in), then the session's settings from phrase 2, as at any change. In v3.2,
     the rhythm lock still locks phrase 1's rhythm (Part C §C7.1 holds as written).
  4. **Regenerate (proposed, O182).** It runs the Idle Regenerate exactly (current settings, a
     fresh seed, the usual fit run) and the app stays at Idle with the new phrase on screen;
     nothing starts. The player presses Start, or plays the new starting note, when ready, and is
     not asked again, since the new phrase is not stale. A failed regeneration shows the usual
     failure banner. Reasons: it is the existing action with no new state; the player sees phrase
     1 before playing it, as `rule_phrase_one_is_idle_phrase` intends; the starting note changes
     with the phrase, so a player at the instrument needs to see the new one; and it avoids a
     start that waits for a generation (wait, failure, conditions changing meanwhile). The
     alternative, starting as soon as the new phrase is on screen, is the owner's to choose.
  5. **Dismissing** the prompt without choosing changes nothing and starts nothing. How it is
     dismissed is `ux-writer`'s.
  6. **While the prompt shows,** the app is still at Idle: no MIDI note starts anything, the
     starting note included; pre-generation goes on, since its phrases are the ones Use it plays.
     Whether other controls can be used meanwhile is `ux-writer`'s (proposed: the prompt is
     answered or dismissed first).
  7. **Pre-generation (chunk 24) builds the phrases Use it plays.** While phrase 1 is stale it
     keeps running: phrase 2 is planned from phrase 1 under phrase 1's own settings, joined as in
     3, and the phrases after it follow as today. Its keys stay as they are: phrase 1 and the
     current settings, so any change discards and restarts it (master spec §8), and Regenerate
     discards it by replacing phrase 1. Use it takes the ready phrases as Start does. Chunk 24's
     quiet stop on `CarryInError` goes. The rule that a pre-generated phrase is exactly the
     session's phrase at that place holds, since both are built the same way.
  8. **The starting note asks too.** With a stale phrase 1, playing the starting note opens the
     same prompt and starts nothing; the count-in starts only on Use it. This changes the STABLE
     `rule_midi_starting_note` on the contract surface, **proposed for the owner** (master spec
     §10): today playing the starting note "starts the count-in". By the contract's rule a
     guarantee losing a case is a MAJOR version (CONTRACT 4.0 to 5.0), as the owner ruled for
     D295; he may rule it MINOR. The alternative that changes no contract wording, the starting
     note counting as Use it without asking, would never tell the player at the instrument that
     the phrase is out of date, which is the point of the ruling, so it is not recommended.
  9. **A running session still never asks for anything.** The prompt comes before Start; once
     Use it starts the session, nothing is asked until it ends. The count-in starts only after
     Use it, so `rule_count_in_shown_on_screen` is unchanged.
  10. **Other atoms.** The four STABLE carry-in atoms and `rule_join_carry_in_limited` hold as
     written: the change applies at a phrase boundary during the session, the one between phrase
     1 and phrase 2. `rule_phrase_one_is_idle_phrase` (REVIEW) holds, phrase 1 being still the
     phrase on screen, unchanged; it gains a sentence. Revised before code by `documentalist`:
     `rule_session_start_conditions`, `module_session_shown_settings`,
     `module_session_pregeneration_plan`, `rule_pregenerated_phrase_matches_session`, the engine
     and workspace atoms that say phrase 1 was generated under the start settings, and a new rule
     for the prompt.

  Recorded with it: the owner confirmed `req_last_session_review`'s reachability wording (D295)
  as a MAJOR change on 2026-10-12 ("1. ok, major"), applied as CONTRACT 4.0; master spec §10 and
  §14 and the build plan's **Review reachability** step now say so. Master spec Part A v1.11 (§2,
  §10, §11, §12, item 23, new item 24, §14, new §16); build plan v9 adds chunk 24b in wave 9 with
  a **Stale phrase design** gate and the owner step **Starting-note wording**; ISS-011 updated.

  **Ruling note (2026-10-13, later the same day).** The owner ruled on both proposals, relayed by
  the coordinator:
  - **Regenerate (point 4) as recommended, closing O182:** it runs the usual Idle Regenerate and
    the app stays at Idle with the new phrase on screen; nothing starts, and the player presses
    Start again (or plays the new starting note), with no prompt since the phrase is fresh.
    Starting at once after regenerating is not done.
  - **The starting note's wording (point 8) accepted as proposed, ruled MAJOR:** the STABLE
    `rule_midi_starting_note` gains the sentence "When the phrase on screen is out of date (made
    under settings that differ from the current ones), the starting note first asks, as the
    Start button does, whether to make a new phrase or use this one, and the count-in starts only
    if the player uses it; while it is asking, no note starts anything." CONTRACT 4.0 to 5.0.
    `documentalist` applies the atom and the contract bump.

  Master spec Part A v1.12 (§10, items 23 and 24, §14, §16); build plan v9's owner steps **O182**
  and **Starting-note wording** are done, and the **Stale phrase design** gate can start.

- **D298 (2026-10-13): pre-generation runs after the prewarm is posted, not after it finishes;
  O183 opened.** At the v3.0 wave-2 intent sync, `documentalist` asked what master spec §8's
  "Pre-generation runs after v2's prewarm" means, against `rule_pregeneration_yields_to_player`'s
  "runs only after the generator has warmed up". Chunk 24's code (`create-workspace-session.ts`,
  `workspace-pregeneration.ts`, `generation-worker-client.ts`) posts the prewarm when the
  workspace session is built and after each rhythm-setting change; pre-generation posts its first
  attempt later, once phrase 1 is on screen, to the same worker, which answers a request between
  prewarm slices as v2 already does for the player's. Ruling, by `spec-writer` as a wording
  clarification: the spec means **after the prewarm is posted**, and the code matches the intent.
  Why: the player is protected by the cancellation (any player request at Idle aborts the
  background attempt in flight), not by when pre-generation starts; the page has no signal for a
  finished prewarm (see `docs/generation-latency.md`), so "finished" was never an observable
  condition; and pre-generation starts only with phrase 1 on screen, whose own generation has
  already built its rhythm setting's domain in the same memo the prewarm fills. No behaviour
  changes. Master spec Part A v1.13 (§8) says so; the atom's wording is `documentalist`'s to
  align. While checking this, `spec-writer` found a consequence the spec had not traced, opened as
  [O183](../../open-questions.md#v30-wave-2-o180): cancelling a background attempt replaces the worker,
  and with it the rhythm-domain memo the prewarm and phrase 1 warmed.

- **D299 (2026-10-14): the kept-session size is the build's measurement; v3.0 wave 3 recorded and
  its plan corrections applied (build plan v10).** At the v3.0 wave-3 gate, chunk 9 measured a
  30-minute session at 240 BPM in Jazz with `Sixteenth` density, the largest case: 4.07 MB for
  the summary and the body (timeline 2.2 MB, harmony 0.83 MB, intent 0.77 MB, stored request
  0.27 MB), against the earlier estimate of 0.8 to 3.4 MB, which counted neither the stored
  request nor each phrase's number, start, repeated phrase and clef. Played notes, when kept, add
  about 1.5 MB at one played note per shown note (the earlier 0.25 MB assumed 2 notes a second).
  Decided by the wave driver, the owner told: the estimate becomes the measurement, the size guard
  test sits at 4.25 MB, and no compact encoding is built. Why: nothing in the spec caps a kept
  session's size, the spec keeps no limit on pinned sessions and shows the space used in Your data,
  and a compact encoding would add a codec for no behaviour the player sees. No behaviour changes.
  Master spec Part A v1.14 (§5.2) and `kept-sessions.md` draft v3 say so.

  Recorded with it, no ruling needed (build plan v10): wave 3 is done (chunks 5 and 9 merged into
  `v3.0-w3`, the gate green on fcabf7f); the wave-3 preflight's corrections to chunks 5 and 9
  written in as built; and what the two chunks leave to later chunks. Chunk 8: the save policy also
  reports a change of refusal kind within a run, so the save-problem notice can switch to the
  latest cause's wording as the design says (chunk 5 reports a run once). Chunk 10: the session's
  own save is marked as such, so only storage full raises a notice for it, never Save failed; it
  encodes with `encodeKeptSession` and saves in one batch with the deletion of unpinned sessions.
  Chunk 11: played notes and the summary's `playedNotesKept` change in one batch. Chunk 17: the
  history record gains the clef, the body encoder takes it and the review reads it, the stored
  shape unchanged. Chunk 24b-1 gains the wave-2 gate's pre-generation test points. ISS-012 (the
  review host cannot name my instrument) is filed and assigned in the plan.

- **D300 (2026-10-14): an outdated tab shows the newer version's wording after another tab's
  Delete everything; the port's outdated report gets no cause in v3.0. The wave-4 preflight's
  corrections applied (build plan v11).** The saved-data design gives the outdated-tab notice its
  own wording when `Delete everything` ran in another tab, and says that telling it from a newer
  version needs the storage port to say why it became outdated; until it can, the newer version's
  wording is shown. `documentalist`'s wave-4 preflight found that the port's report carries no
  cause (`module_on_device_database`, `onOutdated(listener: () => void)`, as chunk 4 built it).
  Decided by the wave driver, under the owner's delegation of minor design calls: chunk 8 ships
  the design's own fallback, the newer version's wording, and no cause is added to the port. Why:
  the reload the notice asks for is the cure in both cases, the fallback is already the designed
  behaviour, and a cause would revise a REVIEW architecture atom and chunk 4's merged port for a
  wording only. The deletion wording stays in the design for a later version; the port change
  would come first.

  Recorded with it, no ruling needed (build plan v11): the wave-4 preflight (from `main`
  261984a) and its corrections to chunks 7 and 8. Chunk 7 adds the governing atoms
  `rule_first_phrase_waits_for_saved_settings` and, at the sync, `service_session_controller`;
  loads a saved `Rising tempo` `On` with no controller attached by giving the loaded flags to the
  session controller at its creation, since `setAdaptiveTempo(on)` refuses `On` then; exposes the
  load's outcome (saved data read, or started from the defaults), which chunk 8's outdated-tab
  wording reads and the saving state alone cannot carry; saves from the player's change handlers
  only; its file list follows the real code; and its 7a/7b split is stated by file and by "Done
  when" line. Chunk 8 adds `rule_failed_read_told_to_player`, reads the load outcome, and revises
  `module_save_policy` to 0.2 (a change of refusal kind reported again), pending the owner's
  sign-off. While checking the corrections, `spec-writer` found that the design's "read-only
  reopening fails" case is not what chunk 4's port does, opened as
  [O190](../../open-questions.md#v30-wave-4-o190).

- **D301 (2026-10-14): `review-privacy`'s storage half is narrowed in steps, not left red until
  chunk 11: chunk 7b allows the app's database and its settings records only, chunk 10 adds the
  kept session, chunk 11 makes the final rewrite; the other tests that assumed no database are
  fixed in 7b.** Chunk 7a opens IndexedDB at every load, so the test's spy (which bans
  `indexedDB.open`) and its end state ("no IndexedDB database") fail from wave 4, while
  [build plan §2](../../versions/v3/build-plan.md#2-read-first-what-v30-undoes-in-v2) gave the storage
  half to chunk 11, in wave 6: the wave-4 and wave-5 gates would run `npm run quality` red.
  Recommended by the wave driver and adopted by `spec-writer` under the owner's delegation of
  minor calls. Chunk 7b's interim keeps a real guarantee: the spy allows `indexedDB.open` and no
  other storage call, and at the end the only database is the app's, the session, body and
  played-notes stores are empty and every settings record is one the settings codec reads back,
  so no session, phrase, review or played-notes data reaches storage; the network half is
  unchanged. Chunk 10, whose kept session would break that interim, widens it to the kept
  session's summary and body, still with no played note. Chunk 11's rewrite starts from there
  and allows the `instrument` and `controller` stores that chunks 20 and 22 write. Why in steps:
  dropping the storage half until chunk 11 would leave two waves with no storage privacy check
  while the app starts writing. Found with it, by a full e2e run on `v3.0-w4` (5ae353d) and a
  search of `tests/`: `pregeneration`'s 'pre-generation writes nothing to storage' (chunk 24's)
  fails on "no database" too, and becomes "pre-generation writes no record"; `offline-and-fonts`'
  'offline after the first load…' races the start-up wait after its reload (passes alone, fails
  under the full suite) and waits for the first draw. Both go to chunk 7b. No other test asserts
  "no storage" in a way 7a or 7b breaks: `session-history-export`'s storage trap covers the
  history and export modules, which stay storage-free; `review-navigation` (chunk 10),
  `controller-status` (chunk 22) and `theme` (chunk 7) check only what their own chunks change.
  Build plan v12.

- **D302 (2026-10-14): a saved preset selection, not custom, whose seven profile-controlled values
  are not all that preset's after loading, loads as custom with that preset's grammar.** Chunk 6's
  settings codec decodes the selection and the seven values each on its own (master spec §4.4),
  so a saved "Jazz, not custom" whose `Register` record is invalid loads `Register` at its
  default, Neutral's `Middle`, with `Jazz` still checked: a state no player action reaches, since
  choosing a preset applies its whole bundle and any change to one of its values makes it custom
  (phrase-workspace design, preset customization). Decided by `spec-writer` under the owner's
  delegation of minor design calls, with no design answer needed: the load takes the state the
  design already defines for a changed value ("Custom configuration - Jazz grammar retained"),
  silently, as §4.4 wants every fallback; every value keeps what §4.4 gives it, and only the
  derived "not custom" mark yields. The test is equality with the preset's bundle, so it also
  covers an unreadable selection (it falls back to Neutral, not custom, and Jazz's values then
  make it custom with the Neutral grammar). Built in chunk 7b, in the codec, with unit tests.
  Rejected: accepting the incoherent state (the preset status would name a preset the values do
  not match), and re-applying the preset's bundle (it would replace the fallen-back value by the
  preset's, against §4.4's "falls back to that setting's default"). Build plan v12.

- **D303 (2026-10-14): a kept session's key is read with its record, through a keyed read of the
  port; the loader hands the kept sessions' summaries with their keys.** The owner's ruling ("go
  with option (a) for the session key"), on the question the wave-5 preflight raised for chunk 10:
  `StoragePort.readAll` gives values without their keys (`src/storage/storage-port.ts`,
  `src/storage/database.ts`), no kept-session record holds its key (`entity_kept_session_record`,
  `docs/storage.md`, Kept sessions), and the loader's `keptSessionSummaries` are bare values, so
  after a reload the session's save could not name the unpinned sessions to delete and
  `Review last session` could not read the body of the summary it shows. The port gains a keyed
  read of a whole store: every entry as its key and its raw value, in key order, in one read-only
  transaction, refused as `readAll` is; an entry whose key is not a string was not written by the
  app and is left out, never thrown on. `readAll` stays for the settings and the controller. The
  loader's `keptSessionSummaries` become those keyed entries, decoded by their callers as before.
  "The key is in no record" stays true. The key's form is `spec-writer`'s call under the owner's
  delegation of minor technical calls: the session's save mints it once, as
  `session-{startedAt}-{sessionSeed}` in decimal (the session's wall-clock start in epoch
  milliseconds and its 32-bit session seed, both already in the session-wide record), so tests
  fix it with the clock and the seed they already control; no code reads a fact back from a key.
  Rejected: (b) a key rebuilt from the summary's facts, which needs a readable summary to find a
  session at all (an unreadable one could then be neither deleted nor opened by key) and ties
  every key to a field a later migration might change; a random key, which adds a dependency for
  no gain. Revises `module_on_device_database` and `module_saved_data_loader`, and adds the key's
  form to `entity_kept_session_record`, as chunk 10's architecture capture, before its code.
  Build plan v13.

- **D304 (2026-10-14): how chunk 10's save at a session's end runs, and which session is the most
  recent one.** Settled by `spec-writer` under the owner's delegation of minor technical calls,
  from the kept-sessions design (`flows/kept-sessions/handoff.md`, Keeping at a Session's End;
  `screens/last-session-review/handoff.md`), checked against `src/storage/save-policy.ts`:
  - **Two transactions, not one.** `release()` flushes the settings changed during the session in
    a transaction of their own, and only when there are some. The session's save follows in one
    batch of its own. Merging the two into one batch was rejected: a storage-full refusal of the
    session (up to 4.25 MB) would then lose the player's setting changes too, and a failure could
    no longer be told apart as the session's own (keep line only, or the storage-full notice) or a
    setting's (the Save failed notice), which the design keeps apart.
  - **The deletions are read at the save.** Just before its batch, the save reads the summaries
    with the keyed read (D303) and deletes, in the same batch as the new session's write, the
    summary, body and played notes of every readable kept session that is not pinned. Reading
    then, not trusting the load's list, keeps the rule true when another tab saved a session
    meanwhile. A refused read still saves the new session and deletes nothing. A summary that
    cannot be read is left in place (whether it is pinned is unknown); that default is put to the
    owner as [O200](open-questions-history.md#v30-wave-5-o200).
  - **Saving off.** In an outdated tab, or a visit started from the defaults, the end reads,
    saves and deletes nothing; the session is held in memory and its keep line reads "Not saved
    on this device: export it to keep it.", as the design says.
  - **The most recent session.** In the visit it ended in, the last session that ended with a
    review, saved or held in memory; after a reload, the readable kept session with the latest
    start. That is the design's "the session that was saved last" in every case a single tab
    makes, since one tab's sessions never overlap; the record holds no time of saving to do
    better with overlapping sessions in two tabs. So after the player deletes the most recent
    session and reloads, the pinned session that started last becomes the most recent one.
  - **The most recent session stays in memory across the next Start** until the next session
    ends with a review, as the design says ("until the next session ends with a review or the
    page closes"), so a session ended in its count-in changes nothing and `review-link` returns
    by its rules, for a saved session and one held in memory alike. Master spec §4.4 says the
    session a visit holds in memory "keeps its review until the next session starts, as in v2";
    read as the least it promises, not a removal, since §5.1 says a count-in end changes nothing.
    The wording is aligned at the next Part A revision.
  Build plan v13.

- **D305 (2026-10-14): wave 5's file assignment between chunks 10 and 17, chunk 17's split, and
  the Idle-side my-instrument paths given to chunk 20.** Settled by `spec-writer` under the
  owner's delegation of minor technical calls, from the wave-5 preflight's file pass and the
  code on `v3.0-w5` (112c9ff). Chunks 10 and 17 have no path between them, so they must not
  change the same source file. `src/components/workspace/workspace-session-start.ts` goes to
  chunk 17, which must change it (the session's settings, lines 71–74, gain the profile from
  phrase 1's intent; the history, line 94, gains the clef from the written phrase); chunk 10
  leaves it alone, keeping its `state.review = null` (line 70), and holds the most recent session
  in a slot of the controller state that Start does not clear (`workspace-session-ends.ts`,
  `session-review-state.ts`, `workspace-session-controller.ts`,
  `workspace-session-controller-types.ts`). The kept-session record files
  (`kept-session-body.ts`, `kept-session-record.ts`) are chunk 17's; chunk 10 calls
  `encodeKeptSession`, `decodeKeptSession` and `decodeKeptSessionSummary` as chunk 9 built them,
  and chunk 17 leaves `encodeKeptSession`'s signature unchanged, taking the clef from the history
  record. Chunk 17 takes the session engine, as chunk 16's record and `entity_my_instrument`
  assign it (the attempt intents, `src/session/session-intents.ts`; `SessionSettings`,
  `src/session/session-types.ts`; the carry-in receiver, `src/session/carry-in-adaptation.ts`),
  and so splits: 17a, the worker and the session engine; 17b, the clef through the history, the
  kept-session body and the review. The Idle side, which only chunk 20 can feed (the profile
  exists as data only once my instrument's record is loaded), is chunk 20's: the Idle intent
  (`src/composables/use-generation-session.ts`), the rhythm prewarm's intent
  (`src/composables/generation-session-prewarm.ts`), the connection sheet's profile
  (`src/components/workspace/WorkspaceShell.vue`) and the instrument control's
  (`src/components/controls/FoundationControls.vue`, already chunk 20's). Chunk 10 needs more
  than five source files after D303, so it gets a split rule too (10a the save, 10b the reach).
  Build plan v13.

- **D306 (2026-10-14): chunk 20 carries my instrument whole on the Idle side, and the worker's
  check stays free of the clef bound.** Settled by `spec-writer` under the owner's delegation of
  minor technical calls, from chunk 17's records and the code on `v3.0-w5` (27a4da2). Three gaps
  chunk 17 reported or that its code shows, each added to chunk 20's Files, Scope and "Done when":
  - **Idle pre-generation's settings.** `startOf` in
    `src/components/workspace/workspace-pregeneration.ts` builds them as
    `{ controls, musicalProfile }`, without my instrument's profile; it uses
    `sessionSettingsAtStart(…, phraseOne.intent)` as Start does, so a pre-generated phrase is
    built with the profile the session plays.
  - **The clef of the written phrase.** Idle's written phrase
    (`src/composables/use-notation-coordinator.ts`, `writtenPhraseOf`) and the session staff's
    (`session-staff-fixed-parts.ts`, `held-layout-fit.ts`) still use `BUILT_IN_INSTRUMENT_CLEF`;
    they take my instrument's clef, which Start then records in the history unchanged (17b).
  - **The worker's derivation.** `derivedMyInstrumentProfile`
    (`src/generation-worker/generation-worker-inbound.ts`) rebuilds the profile with
    `makeMyInstrument` and a stand-in `clef: 'treble'`. Once chunk 20 adds the per-clef bound
    (D294) to my instrument's validity rules, the worker would refuse a valid bass-clef my
    instrument written below C2. Passing the clef was rejected: it would put display data into
    the worker's intent, which D293 and chunk 17b keep out. So the worker's derivation applies
    every rule except the clef bound, which is checked where my instrument is built with its
    clef (the sheet and the record's load).
  Build plan v14.

- **D307 (2026-10-14): a failed read behind `review-link` after a reload, and the test that a
  session not saved is gone after a reload, both go to chunk 14.** Settled by `spec-writer`
  under the owner's delegation of minor design issues. The kept-sessions design already defines
  the path (`flows/kept-sessions/handoff.md`, `review-link` activation: "if it cannot be read,
  the mode shows the list instead, that session's row in its failed-to-open state, focus on the
  list's title"), so no `ux-writer` item is needed; it needs the list, which chunk 14 builds.
  Until then (chunk 10b's interim) the failure shows nothing and the link comes back enabled:
  accepted, since only a damaged body read fails there. No test yet checks that a session whose
  save was refused, or that ended with saving off, is gone after a reload; the behaviour holds
  by construction (a refused batch writes nothing; saving off writes nothing, which chunk 10's
  write spy checks), so it is not a gate fix now. Chunk 14 adds both as "Done when" lines, the
  list being the clearest witness, and gains a split rule (14a the list, 14b the links and the
  failed read) since it now names six source files. Build plan v14.

- **D308 (2026-10-14): a session cut short by reloading or closing the page: owner question
  O201, and chunk 27 inserted for its fix.** Settled by `spec-writer` from the wave-5 sync's
  drift report and the code on `v3.0-w5` (27a4da2). A reload or close of a visible page fires
  `pagehide`, then `visibilitychange` to hidden (HTML "unload a document"; Chromium, Gecko and
  WebKit alike, checked 2026-10-14); the hidden-tab watcher then ends the session and its save
  starts. An unfinished IndexedDB transaction is aborted when the page goes, but a page kept in
  the back-forward cache is only frozen and its save commits if the player returns; so whether
  such a session is saved, deleting the previous unpinned one, is not determined, against §5.1's
  "lost". The choice between keeping §5.1 (never saved, abandoned on `pagehide`) and amending it
  (saved when the save completes, best effort) changes what the player keeps, so it goes to the
  owner as [O201](open-questions-history.md#v30-wave-5-o200); proposed: keep §5.1. No later chunk owns
  the session's end and save (`workspace-session-ends.ts`, `workspace-session-save.ts`, the end
  watchers, the page-visibility port), so a small chunk 27 is inserted for the fix and its
  end-to-end test, in wave 7: it depends only on chunk 10, and wave 6's chunk 11 may touch the
  session's save for played notes, so wave 7 keeps them apart; no wave-7 chunk touches its files.
  Build plan v14.

- **D309 (2026-10-14): a session cut short by reloading or closing the page is never saved
  (closes O201, answer (a)).** The owner's ruling, verbatim: "O201: option A of course." Master
  spec §5.1 stands as written: a session cut short by reloading or closing the page is lost; it
  is never saved, and the kept sessions stay exactly as they were, every time. Switching to
  another tab or app still ends the session, opens its review and saves it. Chunk 27 builds it as
  its scope already states (a `pagehide` flag the session's save checks before each of its
  transactions, abandoning itself with nothing written; a page brought back from the
  back-forward cache shows that review as not saved); it no longer waits for a ruling, only for
  chunk 10, merged. Part M2's item 2 of the intent change set (`req_rolling_practice_session`)
  stands as the owner signed it. No master spec change. Build plan v15.

- **D310 (2026-10-14): a kept session the app cannot read correctly is deleted, with an
  apology; a read the device refuses deletes nothing (closes O200).** The owner's ruling,
  verbatim: "O200: damaged session are removed (unability to load correctly a session =
  destruction with an apology message)." It answers O200 the other way from the proposed default
  chunk 10 built (left in place, D304), and reaches beyond the save: it holds wherever the app
  reads a kept session. Settled by `spec-writer` under the owner's delegation of minor technical
  calls, from the kept-session codec (`src/storage/records/kept-reading.ts`,
  `kept-session-record.ts`) and the save (`workspace-session-save.ts`, `save-policy.ts`) on
  `v3.0-w5` (a073edd):
  - **Damaged is the codec's `unreadable` verdict on records the device returned:** an envelope
    that cannot be read, content this version's rules refuse, records of one session that
    disagree, or a summary whose body, or whose played notes it says are kept, is missing. The
    whole session goes, its summary, body and played notes, pinned or not, with its favorites and
    comment: the codec reads a session whole or not at all, so nothing of it can be opened or
    exported.
  - **Not damaged, never deleted:** a record a newer version wrote (`newer`): the outdated-tab
    rule wins (§4.3), no deletion of any kind; and every refusal by the device (storage
    unavailable, a read refused or failing, the whole load failing or too slow), which says
    nothing about the records: deleting then would destroy sessions that may be fine, against
    §4.4's "a failed read never overwrites what is kept". A session whose records are all absent
    when opened was deleted meanwhile, by another tab; nothing is left to delete, and it is
    handled as a failed open. So damage is judged only from what the device actually returned.
  - **Only while the visit saves.** An outdated tab and a visit started from the defaults delete
    nothing; a damaged session stays until a visit that saves finds it. In an outdated tab a
    damaged summary has no row in the session list, and a damaged body read shows the design's
    failed-open row ("This session couldn't be opened. Try again.").
  - **When.** At load, once the summaries are read: one batch deletes every kept session whose
    summary is damaged, through the save policy (held like any save while a session runs). At a
    session's save: the same batch as the new session also deletes every kept session whose
    summary is damaged (chunk 10 leaves them; changed in chunk 28). At an opening (`review-link`
    after a reload, a row of the list): a damaged body deletes that session at once; the most
    recent session then becomes the readable kept session that started last, as after the
    player's own deletion (D304). The refused read at the save (D304) stays: the new session is
    saved and nothing deleted, the older unpinned ones going at the next save.
  - **The apology** is a notice in the notice row, shown once the deletion has committed and
    outside a running session (held during one, as every notice is), saying how many sessions
    went. Its wording, its dismissal and its place among the notices are `ux-writer`'s, under
    the owner's delegation of minor design issues. A deletion the device refuses shows no
    apology: it raises the notice any refused save raises, the session stays unlisted for the
    visit, and the next load tries again.
  - **Consequences.** "Only one session is ever kept without the player asking" (§5.1) holds again
    as worded, so `req_kept_sessions` loses O200's carve-out; part M2's items 5(b) and 6 are
    rewritten to the ruling; item 7 (`rule_failed_read_offers_only_delete_everything`) is not
    affected, since a visit whose read failed reads no kept session and deletes nothing on its
    own. The session list no longer needs a row for a session whose summary cannot be read, the
    design gap O200 named: such a session has no row. Since the codec's verdict now destroys
    data, a session this version saves must never read as damaged; chunk 28 tests the round trip.
  Master spec Part A v1.15 (§5.1, §13 item 6). Build plan v15.

- **D311 (2026-10-14): chunk 28 inserted in wave 8 for D310; chunk 14's failed reads are the
  device's refusals; a design gate for the apology.** Settled by `spec-writer` under the owner's
  delegation of minor technical calls. No wave-5 code is rebuilt: chunk 10's save, merged,
  keeps damaged summaries until chunk 28. The code D310 needs sits in files chunks 14 and 27 own
  in wave 7 (`use-review-navigation.ts`, `use-kept-sessions.ts`, `workspace-session-save.ts`,
  `workspace-session-ends.ts`), and neither can take it without passing about five source files
  or sharing a file with the other, so a new chunk 28, after both, joins wave 8 beside chunks 15
  and 21, whose files it does not name (it reaches the notices without `WorkspaceShell.vue`,
  chunk 15's); wave 8's file pass checks `use-kept-sessions.ts` against chunk 15's Delete every
  session. It splits 28a (the deletions: load, save, opening) and 28b (the apology and where the
  player lands). Its damaged-summary check runs in the session controller's chunk, where the
  summaries are already decoded, never in the entry chunk, which has 8,181 B of headroom. Chunk
  14 keeps D307's failed-read path for a refusal by the device, its tests injecting refusals
  rather than damaged records, and lists no row for a session whose summary cannot be read. The
  apology and the landings are a new **Damaged session design** gate for `ux-writer`, before
  28b. Build plan v15.

- **D312 (2026-10-15): wave 6 keeps chunks 11, 12 and 25 and shares their files in a stated
  order; Gate A is shown done.** Settled by `spec-writer` under the owner's delegation of minor
  technical calls, from the wave-6 preflight (`documentalist`, 62d3eb5 on `v3.0-w6`) and the code
  on that branch. The preflight found chunks 11, 12 and 25 not file-independent: all three need
  `use-review-host.ts`, `ReviewPanel.vue` and `ScorePanel.vue` (which passes the review host's state
  to the panel), and chunks 11 and 12 also `workspace-session-save.ts` (which hardcodes
  `playedNotesKept: false` and an empty pin, favorites and comment) and the session controller's
  types and module (`ReviewedSession` and the most recent session hold no favorites, comment,
  played-notes flag or delete path). Giving each file to one chunk, as D305 did, would make one
  chunk build another's slice; moving chunk 12 out would put chunks 13, 14, 15 and 28 a wave later
  on the critical path; moving 25 out changes nothing, since its review edit meets 11's and 12's
  in the next wave too (it may still leave at the wave's end if H1 has not come). Since wave 6
  runs one chunk at a time (κ=1), each chunk's branch cut from the wave branch after the previous
  chunk merged, sharing in sequence brings no conflicting edits: the chunks run 11 → 12 → 18 → 22 →
  25, the plan names per shared file the order and what each adds, and a later chunk adds its part
  without reshaping an earlier one's. Chunk 12 depends on chunk 11's change path (D313), the one
  in-wave edge, fixed by chunk 11's capture and two chunks long, as the build-plan model allows.
  Chunk 11 builds the shared confirmation sheet (it needs two confirmations first; 12, 14, 15 and
  20 reuse it). Chunks 11, 12, 22 and 25 gain split rules at about five source files.
  Gate A was applied on 2026-10-07 (54025fa; CONTRACT 2.0, now 5.0) and is shown done. Build plan
  v16.

- **D313 (2026-10-15): how a kept session changes after its save, chunk 11's architecture
  capture.** Settled by `spec-writer` from master spec §5.1, §5.3, §4.3 and §4.4, the review-and-
  export and kept-sessions designs (Saving the Session, Played Notes, While Saving Is Off) and
  D303–D304. `module_kept_session_save` covers only the save at the session's end; chunk 11 builds
  the changes after it (played notes kept or deleted for one session, every kept played note
  deleted) and chunk 12 reuses them (favorite, pin, unpin, comment, Delete session, the retry of a
  failed save), so `documentalist` records them before chunk 11's code. Every such change is one
  port `apply` batch through the save policy (held during a session, refused in an outdated tab,
  checked against `meta`). The summary is always rewritten; the `playedNotes` record is written or
  deleted in the same batch; the body only for a favorite mark; Delete session deletes all three;
  deleting every kept played note is one batch over every readable summary that said they were
  kept, an unreadable one left to chunk 28. The session is named by the key its save minted; a
  change made while that save runs waits for it. With saving off a change holds for the visit and
  nothing is read, written or deleted. A refused change stays in memory and the notice row tells it
  at Idle, unlike the session's own save. A session whose own save failed is changed only by
  chunk 12's retry: its next favorite, pin, unpin or comment runs the session's own save again with
  the facts as they are then, the same batch, its deletions read at the retry. Chunk 11's Done when
  gains the design's `Delete them` path (`rule_kept_played_notes_deletable`) and the saving-off
  switch; chunk 11's drift check adds `specification_ephemeral_state_verification`; chunk 12's
  Atoms add `req_kept_session_list` and `rule_failed_save_never_disturbs_session`, its Part D
  `module_kept_session_save` and `specification_ephemeral_state_verification`. Build plan v16.

- **D314 (2026-10-15): remembering the controller is a seventh contract change, major, for the
  owner; chunk 22 waits for it.** Found by the wave-6 preflight; the wording checked and the
  consequences settled by `spec-writer`. Two STABLE contract atoms still state v2's behaviour:
  `specification_browser_only_operation_verification` rejects a release that "starts audio or
  requests MIDI access before the player clicks Start or "Connect controller"", and
  `rule_midi_starting_note` says the starting note, with a controller attached at Idle, starts the
  count-in. Chunk 22 requests access at load to reselect the remembered controller (only when the
  browser already allows it, master spec §7.3), and after a load the starting note starts nothing
  before the page's first click, tap or key press. Master spec §10 called the audio-unlock
  widening "not a contract guarantee", true of `rule_audio_unlocked_by_player_click` (REVIEW) but
  not of these two; Part A v1.16 corrects it and states the change as §10's seventh, with the
  proposed wordings. They differ from the preflight's proposal in three points: the audio clause
  reads "before the player has either clicked Start or "Connect controller" or played the starting
  note after the page's first click, tap or key press", since "or plays the starting note after a
  first click" in the list of rejections read as rejecting that very case; the MIDI clause keeps
  v2's "Start or "Connect controller"" and adds only the exception, so nothing but the exception
  changes; and "(a note played on the controller does not count)" makes plain that a MIDI key is
  not the key press meant. Both wordings hold for v2.0 (a controller attaches there only after a
  Connect controller click; nothing is requested at load) and both lose cases, so the change is
  major, CONTRACT 5.0 → 6.0: a new owner gate, the **Remembered-controller wording**, before chunk
  22 merges; `documentalist` writes the change-set part and applies it once the owner confirms, as
  for parts I1 and J1. For the tighter audio wording to hold, the page's first gesture creates no
  audio context by itself: the starting note's callback, which already unlocks the audio
  (`workspace-session-start.ts`), makes it, as Chromium allows after that gesture, so the v2 test
  that no interaction other than Start and Connect controller creates an audio context stays
  unchanged; if Chromium refuses, chunk 22 stops and reports. Chunk 22 gains an architecture
  capture: the record holds the input port's `id`, the one identity v2 matches a returning device
  on, with its name and manufacturer for display only; hand check H4 confirms the `id` survives a
  reload, and if it does not the finding goes to the owner, never a silent match by name. Its
  Atoms add `rule_starting_note_waits_for_first_gesture` and `rule_disconnect_forgets_controller`;
  `rule_audio_unlocked_by_player_click` (REVIEW, `changes-in-v3.0`) and
  `rule_controller_connects_between_sessions` move to its Part D; its Files add the wiring of the
  loaded record and its saver (`WorkspaceShell.vue`, beside chunk 20's later `profile` change
  there, and the visit's saves) and the starting note's wait. The Delete everything half of its
  reload test is chunk 15's, since chunk 15 builds Delete everything in wave 8. Build plan v16.

- **D315 (2026-10-15): chunk 25's lane scale leaves out very short notes; a session whose every
  played note is very short goes to `ux-writer` (O210).** Settled by `spec-writer` from master spec
  §9 (very short notes are filtered when read, for the lane and, by default, the played-notes
  export) and ux D210 ("holds a played note" counts very short ones). The lane's session-wide pitch
  scale (`playedNotesPitchScale`, computed in `ReviewPanel.vue`) is part of the lane, so it is
  computed from the notes the lane shows: a very short note never widens it. When every played note
  of a session is very short, `review-view` and `Export played notes` still show (ux D210) and the
  lane shows no bar, but with `Include very short notes` off the played-notes file would hold no
  note, which its encoder refuses with a typed error that would show the export error: what the
  review offers there is a design matter, opened as O210 for `ux-writer` and a gate before chunk
  25, which waits for H1 anyway. Chunk 25's Files add the review files it shares with chunks 11 and
  12 (D312) and `review-export.ts`; its Part D adds `module_review_export_pipeline`. Build plan v16.

- **D316 (2026-10-15): a change to a kept session after its save reads what is stored at the
  change.** Settled by `spec-writer` under the owner's delegation of minor technical calls, from
  `documentalist`'s capture `module_kept_session_changes` (384cecf), which was silent on it, and the
  save policy on `v3.0-w6`: its plain `save(changes)` reads nothing, and only `saveSession` reads
  the kept summaries, at the save. Built from the summaries read at load and the visit's own
  sessions, a change would miss played notes another tab kept since the load (short of
  `rule_kept_played_notes_deletable`'s "every session's") and could rewrite a summary from stale
  facts, for example unpinning a session another tab pinned, which the next save then deletes
  (against `rule_pinned_session_kept`). So, as the session's own save does (D304), each change reads
  what it rewrites at the change, through the save policy, once no session holds the saves and no
  flush runs, queued with the session saves: the session's summary by its key, and its body for a
  favorite mark; for deleting every kept played note, the keys of every stored `playedNotes`
  record and every summary with its key. The batch applies only the player's change to what was
  read, never facts held in memory. A change whose summary is gone (another tab deleted the
  session) or cannot be read writes nothing and recreates nothing, the change holding in memory for
  the visit; a refused read applies nothing and is told as a refused change. Whether there are
  played notes to delete, which decides whether turning `Keep my played notes` off opens its
  confirmation, is read at the switch the same way. The read and the batch are separate
  transactions, the same narrow window the session's own save accepts. Chunk 11's Files gain
  `src/storage/save-policy.ts` (and, if needed, `save-policy-requests.ts` and a keys-only read in
  `storage-port.ts` and `database.ts`, so that deleting every played note never reads them all),
  chunk 11 alone in wave 6; its Part D gains `module_save_policy` (and `module_on_device_database`
  with a keys-only read). Build plan v17.

- **D317 (2026-10-15): deleting every kept played note deletes every stored played-notes record,
  an unreadable session's included.** Corrects D313's "one batch over every readable summary that
  said they were kept", which would have left the played notes of a session whose summary cannot be
  read. The player asked to delete every kept played note, and §5.3 and
  `rule_kept_played_notes_deletable` say every session's; played notes are the most private data
  the app keeps, so the wider reading wins. The batch deletes every `playedNotes` record read at the
  change and rewrites every readable summary that said they were kept; an unreadable summary and
  its body are left as they are, for chunk 28's deletion of damaged sessions. `documentalist`'s
  capture records this; its sentence that an unreadable session's "played notes" are left as they
  are contradicts it and goes. Build plan v17.

- **D318 (2026-10-15): a visit that saves nothing neither remembers nor forgets the controller.**
  Settled by `spec-writer` from master spec §4.3 and §4.4: an outdated tab "saves and deletes
  nothing", and a visit started from the defaults "saves nothing for the rest of that visit, so a
  failed read never overwrites what is kept". Clearing the remembered-controller record at
  `Disconnect` is a deletion such a visit may not make, and §4.4's reason applies directly: a visit
  started from the defaults has not even read the record. So in such a visit, connecting a
  controller does not remember it, and `Disconnect` forgets the controller for that visit only; the
  next load that reads the saved data reselects the controller remembered before. This is an
  exception to `rule_last_controller_remembered`'s "after the player's Disconnect, a reload
  reselects nothing", worded into §7.3 and item 18 (master spec Part A v1.17). Not a design
  question: the visit already tells the player that it saves nothing and asks for a reload, and no
  screen changes. No contract wording changes: neither atom is on the contract, and the
  Remembered-controller wording (D314) says nothing of Disconnect. Chunk 22's capture and Done when
  carry it. Build plan v17.

- **D319 (2026-10-15): O210 closed by ux D308; the plan follows the O210 and Damaged session
  designs (ux D307–D314).** `Export played notes` is disabled, with its reason, whenever its file
  would hold no note under the current scope and `Include very short notes` (ux D308), so the
  encoder's "no played note" error is never reached; chunk 25 builds the whole-session reason and
  chunk 13 the favorites' reasons, on the same rule. Build plan chunk 25 had `Include very short
  notes` "off at every review opening"; the design (ux D193, both review handoffs) holds it for the
  page visit, across reviews, never saved, and the master spec (§9) does not say otherwise, so the
  plan follows the design. Chunk 28 follows ux D309–D311 and D313–D314: the apology's lifetime and
  place among the notices; `review-link` and a row keep `is-loading` until the deletion settles,
  the list and the notice changing together; a refused deletion shows the save-problem notice in
  its own wording, "Damaged session not deleted", at every refusal, and the session stays
  unlisted and uncounted. Chunk 15 counts the sessions the list shows, and its `Delete every
  session` still deletes every kept session, one with no row included (ux D311, D313). Build plan
  v18.

- **D320 (2026-10-15): the owner confirmed the seventh contract change, remembering the
  controller, as major.** The owner's words: "confirmed for chunk 22", in reply to the
  confirmation sentence of D314. `documentalist` applied it on `v3.0-w6` (5dd9fb1): CONTRACT 6.0,
  `specification_browser_only_operation_verification` 0.3 and `rule_midi_starting_note` 0.6, both
  STABLE, with master spec §10's wordings word for word; change-set part N1 records the
  confirmation. Master spec Part A v1.18 states it as confirmed, and no contract wording waits for
  the owner any more; chunk 22 no longer waits for it. Build plan v19.

- **D321 (2026-10-15): stray notes are caught by length, mostly; M1's description and §9 follow
  what was measured; O211 opened for the owner at H5; a held note cut in two is noted for later.**
  Settled by `spec-writer` from chunk 25's record (1dcf590, 5de073b) and `docs/midi-tuning.md`,
  "Very short notes (M1)". Build plan M1 expected stray notes to form a separate cluster with a gap
  before the shortest intended notes. The owner's five H1 recordings (534 notes, Travel Sax, 12 to
  77 s each) show none: in their melodic context, the 167 notes under 130 ms are 77 in-between
  notes, 68 halves of a held note the controller cut in two, 9 intended notes and 13 unclear, and
  in-between and intended notes overlap from 41 to 97 ms. The threshold, 38 ms, sits one controller
  step (about 5 ms) below the shortest intended note (45.8 ms): it leaves out 66 of the 77
  in-between notes and no intended note. §9's rule (a constant length threshold, tuned from the
  reference controller's recordings, well under 62.5 ms) holds as written, so this is a correction
  of the descriptions, not of behaviour: master spec Part A v1.19 says in §9 that a length catches
  most stray notes, not all, and drops "in pairs" (the recordings show runs and single notes, many
  at full velocity); §14 no longer lists the threshold as open; build plan M1 states what was
  measured; hand check H5 no longer expects "no stray notes" in the lane. Whether the 11 left are
  acceptable is a product judgment, so it goes to the owner as O211, settled at H5 (proposed: keep
  38 ms). The 68 split halves need nothing in v3.0: a half under the threshold is left out and the
  other half keeps the pitch, so no note is lost; a longer half shows as a second note. Merging
  them would be a new reading rule, so it is a note for later in §14, to weigh when Jam reads
  played notes as a doodle (Part C), where a split note would count twice; no question is opened,
  since no v3.0 behaviour depends on it. Build plan v20.

- **D322 (2026-10-15): the owner keeps the 38 ms threshold; O211 closed.** The owner's words:
  "O211: ok", to O211's proposal, option (a). Very short notes stay a length rule only, with the
  constant chunk 25 set, 38 ms: it never leaves out a note the player meant, and the lane is a
  record of what was played, not a score, so the stray notes it leaves (11 of the 77 in the H1
  recordings) showing in the lane and the default export is accepted. Not taken: (b) raising the
  threshold toward 60 ms, which would hide the 45.8 ms meant note and come close to a 240 BPM
  sixteenth; (c) a rule that also reads the notes around a short one, which would be a new spec
  rule for a later version; it is not registered, since no version asks for it. Hand check H5 is
  still the owner's to run, later: it checks the lane and the export on real playing and no
  longer asks the O211 question. The release gate (chunk 26) waits for H5 as before, and for no
  answer any more. No behaviour and no code change. Master spec Part A v1.20 (§9, §14); build plan
  v21 (the O211 row of the owner steps closed, M1, H5). The three stray-note atoms' DRAFT → REVIEW
  advance waits for H5 alone, as change set part O3 already says.

- **D323 (2026-10-15): a controller reselected at load counts as the same controller coming back,
  so it is not checked again.** `documentalist` asked after the wave-6 sync (8fe9edb):
  `rule_controller_transposition_check` (STABLE, on the contract) makes the check "part of
  connecting a controller", while chunk 22's remembered controller connects at load, and through
  the connection step straight from Requesting access, with no check. Asked "does reconnecting
  your controller at load count as the same controller came back, so it skips the transposition
  check?", the owner said: "Reconnecting at load: yes." So the reselection at load is a reattach,
  as `rule_same_controller_reattaches` (STABLE) treats a device that comes back within a page: no
  connection step, no pick, no transposition check. Read by `spec-writer` as covering both ways
  the load's reselection reaches the player, since both are the one reselection the load starts:
  by itself, and through the connection step, whose Connect controller takes up the load's MIDI
  access request and connects the remembered controller once present, with no pick and no check
  (chunk 22, as `entity_remembered_controller_record` and `rule_controller_connects_between_sessions`
  already say). The check stays available between sessions after such a reattach (chunk 22 fixed
  the check run from the connected badge after a reattach at load). Contract: no guarantee is
  weakened, so nothing goes to the owner as a contract change. A reattach is not a connection, so
  the check atom's "as part of connecting a controller" stays true; the one case in which a reload
  used to lead to the check, v2's "after a reload the player goes through the connection step
  again", left `rule_same_controller_reattaches` with CONTRACT 2.0, which the owner confirmed
  (change set A3). But neither STABLE atom says it: the check atom is silent on a reattach, and
  the reattach atom names only losses within a page. So `spec-writer` proposes a clarifying
  clause, adding no case, in `rule_controller_transposition_check`'s revision already pending as
  change set part B2 (a MINOR bump the owner confirms after chunk 20c), along the lines of: "A
  controller reattached by itself, the same device coming back within a page or the remembered
  controller reselected at load, is not checked again (`rule_same_controller_reattaches`); the
  player can run the check again between sessions." `rule_same_controller_reattaches` needs no
  change: the load case lives in `rule_last_controller_remembered` (DRAFT), which already
  reselects "the same way it recognises a controller that comes back within a page". The wording
  is `documentalist`'s; the owner sees it with B2. Master spec Part A v1.20 (§7.3) states it; build
  plan v21's Part B2 row carries the clause.

- **D324 (2026-10-15): in a favorites-only file the favorite phrases follow each other from time
  zero.** Settled by `spec-writer` under the owner's delegation of minor calls, from the wave-7
  preflight (`documentalist`), which found that nothing says where the favorite phrases sit in
  time in a favorites-only file. Master spec §6 already implies it: a played note held past a
  favorite phrase's end stops there when the next phrase is not exported, a rule needed only
  because the next exported phrase follows straight on. So a favorites-only file is laid out as a
  whole-session file of those phrases alone: the first favorite at time zero, each next one right
  after the one before, with no gap or empty measure for a phrase left out, each at its own
  tempo (a tempo change where an exported phrase's tempo differs from the exported phrase
  before it). Each phrase keeps its session phrase number in its marker and rehearsal mark, and
  in MusicXML its session measure numbers (phrase _n_ in measures 4_n_ − 3 to 4_n_), so the
  numbers skip where phrases were left out. The generated-notes and played-notes files of one
  scope use the same selection and the same layout, so they still line up phrase by phrase
  (`rule_played_notes_export_aligns_with_generated_midi`: "phrase 1 at time zero" reads "the
  first exported phrase at time zero"). Rejected: keeping each phrase at its session time with
  silence where the others were, which gives a file of mostly empty measures and makes the
  held-note rule pointless. No interface change; nothing for `ux-writer`. Master spec Part A
  v1.21 (§6); build plan v22 (chunk 13).

- **D325 (2026-10-15): build plan v22 places the wave-7 preflight's corrections.** Settled by
  `spec-writer` under the owner's delegation of minor technical calls, from the preflight's notes
  (all four chunks PROCEED) checked against the code on `v3.0-w7` (215fc18). Chunks 13, 14 and 20
  each pass about five source files once their real files are named, so each splits into halves,
  in order: 13a the selection and the files (`src/export/`), 13b the Review's scope and its
  disabled reasons (`review-export.ts`, `use-review-area.ts`, `review-types.ts`, `ReviewArea.vue`,
  `ReviewPanel.vue`, where wave 6 moved the export wiring); 14a the session controller's reach
  (opening any kept session by its key; pin, unpin and delete of a session not held in memory,
  where `setPinned` and `deleteSession` throw today; the row summaries held in memory and kept
  current), 14b the list, its links and `ReviewArea.vue`'s confirmation and focus; 20a the record,
  the load, the instrument control's segment, the Idle side and my instrument's clef everywhere a
  built-in stand-in sits (`App.vue`, `CheckNote.vue` and its caller `SheetStateBody.vue`, the
  engraver's staff-room verdict), all read side, tested from a seeded record; 20b the sheet, its
  saves, the bound and the worker's derivation. Chunks 14 and 20 carry an architecture
  capture (the session controller's reach and the summaries in memory; the stored my-instrument
  record), which `documentalist` records before each, κ=1. Chunk 14 owns ux D316's focus rule,
  since `ReviewArea.vue` is its file. Chunk 27's page-leaving signal reaches the save policy with
  the session's own save (`SavePolicy.saveSession`, through `SessionSaveHold.saveSession`), never
  through the policy's construction, so `src/storage-bootstrap.ts` stays chunk 20's alone; wave 7
  shares `ReviewArea.vue`, `use-review-area.ts` and `ReviewPanel.vue` between chunks 13 and 14,
  and `src/storage/settings-saver.ts` between chunks 20 and 27, in number order, as wave 6 did
  (D312). The four stale docs go to the chunks that own their subjects; the `stray-notes.ts`
  header to chunk 13; the missing `@spec-link` for `service_session_midi` to chunk 24b-2, which
  changes `workspace-session-midi.ts`. ux Q76 is shown closed (ux D285, corrected by ux D294).

- **D326 (2026-10-15): my instrument's change and the erasing of its sessions are one batch; a
  refusal changes nothing and is told in the open warning or confirmation.** Settled by
  `spec-writer`, from the point `documentalist` left open in its capture of
  `entity_my_instrument_record` (abddba4, wave 7). Not the owner's: the visible behaviour is
  already settled. D295 says a confirmed range or transposition change "saves and erases them"
  and a cancel changes nothing, and the **Sessions design** gate (ux D286–D290) says the save and
  the erasing "happen together or not at all", a failure keeping the erase warning, the delete
  confirmation or the check's `Use and erase` open with its error line. This writes the storage
  side under it.
  1. **One batch.** Deleting my instrument, whatever the number of its sessions, and saving a
     range or transposition change while my instrument has kept sessions (from its sheet's erase
     warning or the check's `Use and erase`), apply in one batch through the save policy, in one
     transaction, all or none: the my-instrument record's delete, or its whole write, and the
     deletes of the summary, the body and the played notes of each session of my instrument. The
     batch goes through the kept-change line (`changeKept`, its refusal the caller's), never the
     plain write or delete, and never as a record write followed by separate deletions. A save
     that erases nothing (a name or clef change, or a range or transposition change while my
     instrument has no kept session) stays the plain write of chunk 20, its refusal told by the
     notice row while my instrument applies for the visit.
  2. **Which sessions.** Exactly the sessions the warning or confirmation counted, named by their
     keys, never by a key rebuilt from their facts: the rows of the session list in memory, and
     the session that just ended when played with my instrument. The batch runs in the line after
     every session save asked for before it, so the session that just ended is saved first and
     erased by the key its save minted; one held in memory only because its save failed leaves
     memory alone. A named session already gone from the device (another tab deleted it) is a
     delete that changes nothing. A session of my instrument that another tab kept after this
     tab read the summaries is not in the batch: nothing goes that the player was not told
     about. It stays, listed under my instrument, until a later change or deletion of my
     instrument erases it; this happens only with two tabs open, and is accepted.
  3. **Saved.** Only then does anything change in memory: my instrument is changed or deleted,
     its sessions go as the design's Sessions erased says, the selection returns to the template
     when a deleted my instrument was selected (that selection saved after the batch, through the
     visit's saves), the phrase is replaced as on an instrument switch where the design says so,
     and a save asks for persistent storage as every save of my instrument does.
  4. **Refused** (for lack of space or another reason, the read under the batch included):
     nothing changes, on the device or in memory. My instrument stays as it was, every session
     stays, and a review on screen stays open. The warning or confirmation stays open with the
     design's error line, and its action tries again. The refusal is told there alone, never by
     the notice row. This differs on purpose from a save that erases nothing: applying the change
     in memory without the erasing would leave the visit's my instrument and its kept sessions
     disagreeing (master spec §5.1: every kept session of my instrument was played with the range
     and transposition my instrument has now), and a reload would bring back the old my
     instrument with those sessions.
  5. **Saving off.** With sessions to erase, saving off only arises when the tab turns outdated
     while the warning or confirmation is open, or the batch is refused as outdated: nothing
     changes, and the sheet returns to the form erasing and deleting nothing, range and
     transposition back to their saved values, as the design's outdated-tab state says. With no
     session to erase, a deletion while saving is off applies for the visit only, as every change
     then does (master spec §4.3, §4.4).

  No interface change; nothing for `ux-writer`. Build plan v23 (chunk 20c). `documentalist`
  revises `entity_my_instrument_record` (and `module_save_policy`'s list of kept changes) at
  chunk 20c's preflight.

- **D327 (2026-10-15): the successor after a damaged session's deletion is the load's rule, not
  the player's deletion (a wording correction to D310).** Settled by `spec-writer`, from ux D317
  (953f79b), found by `documentalist` while capturing `module_kept_session_reach`. D310 says
  that after a damaged body is deleted at an opening, the most recent session "becomes the
  readable kept session that started last, as after the player's own deletion (D304)". The
  outcome stands; the clause justifying it is loose. D304 leaves no most recent session after the
  player's own deletion for the rest of that visit, and picks the readable kept session with the
  latest start only after a reload. The damaged deletion takes that after-reload rule at once:
  a session whose body reads as damaged never was one the app could open, and had the load found
  the damage the next session would have been the most recent one from the start. So any
  deletion the player makes (one session, every session, my instrument's) leaves no most recent
  session in that visit until the next session ends with a review; a damaged session's deletion
  hands it at once to the readable kept session that started last. D310's text stays as it was;
  read its clause through this entry. No behaviour change; nothing to build differently. Build
  plan v23 (chunk 28's scope reworded).

- **D328 (2026-10-15): a page the back-forward cache brings back saves its later sessions; the
  session the page's leaving cut short stays not saved.** Settled by `spec-writer` under the
  owner's standing delegation, from chunk 27's open point (record in build plan §"Chunk 27",
  471aa0f; code on `v3.0-w7`, 4efb656). Chunk 27's adapter marks the page as going away at the
  first `pagehide` and never clears the mark. A page can outlive `pagehide`: leaving it for
  another address (a link, or the address bar) fires `pagehide`, and when the player presses Back
  the browser's back-forward cache may restore it alive, firing `pageshow` with `persisted` true.
  As built, every later session on that page then ends with "Not saved on this device: export it
  to keep it." and is never saved, with nothing to say why. That is a consequence nobody chose:
  §5.1 keeps the most recent session automatically, and D309's ruling ("option A") is about the
  session the page's leaving cut short, not about sessions played after the player came back. The
  owner's stake is that the sessions they play are kept, so this is a team call, taken in the
  direction that keeps them:

  1. **Leaving counts as closing.** Leaving the page for another address is closing it in §5.1's
     sense (the same `pagehide`; the only kind of leaving the back-forward cache can undo). A
     session it cuts short is lost, as D309 says.
  2. **The session it cut short stays not saved, every time.** A save that a `pagehide` has
     reached, at its start or at any point while it runs, is abandoned for good: it is never
     resumed, retried or saved when the page comes back. Its review keeps "Not saved on this
     device: export it to keep it.", the kept sessions stay as they were, no notice shows, and no
     row is added. Why not save it on the return: whether the browser keeps a page in the cache
     is its own choice, unseen by the player and often refused, so saving on return would keep the
     session sometimes and lose it other times for the same action; and a save frozen part-way
     (the codec still loading, the read done but not the batch) would complete or not by timing.
     "Leaving the page loses the session that was running; export it if you want it" holds every
     time, and the review on screen says so.
  3. **Later sessions save again.** Once the page is shown again from the cache, it is no longer
     going away: a session that starts after the return and ends with a review is saved as §5.1
     says (deleting the older unpinned kept sessions), and its keep line reads as any saved
     session's. A refused save's retry run after the return saves too; one a `pagehide` reaches
     while it runs is abandoned, as in 2. A `pageshow` that is not from the cache (the first
     load) changes nothing.
  4. **A tab or app switch** still never fires `pagehide`, and is unchanged.

  The mark must therefore be per save, not one page-wide flag that `pageshow` clears: a page-wide
  flag cleared on return would let a save frozen in the cache resume after the return, read "not
  going away", and save the very session 2 says is lost. No master spec change: §5.1 already keeps
  the most recent session, and "closing or reloading the page" now reads with 1. No interface
  change; nothing for `ux-writer`. Build plan v24 revises chunk 27's scope and Done when; the
  follow-up fix goes on `v3.0-w7`. `documentalist` records it at the wave-7 sync in
  `req_rolling_practice_session`, `module_kept_session_save` and `module_save_policy`.

- **D329 (2026-10-16): build plan v25 places the wave-8 preflight's corrections.** Settled by
  `spec-writer` under the owner's delegation of minor technical calls, from `documentalist`'s
  wave-8 preflight (9aef0c0 on `v3.0-w8`: every chunk PROCEED with notes or with sign-off
  pending; the capture `module_kept_session_save` 0.6), checked against the code on that branch.
  Wave 8 is not file-disjoint, as v24 claimed: chunks 15, 21 and 28 share
  `WorkspaceShell.vue` (15's footer and Your data host, then 21's route from the check's action
  to the session's actions, then 28b's reports, D330) and the session controller's two files
  (15's Delete every session, then 28a), in number order, κ=1, as waves 6 and 7 did (D312,
  D325). `use-kept-sessions.ts` stays 28b's: chunk 15 uses its `removed(keys)` as it is.
  Chunk 15 builds Delete every session through the session controller, not only in the sheet:
  one batch through the kept-change line (`changeKept`, refusal `caller`) from a key-only read of
  the three kept-session stores, so a session with no row is deleted too; on success every
  session held in memory goes, the most recent included, kept or held in memory only, and every
  row, leaving no most recent session until the next session ends with a review (D327). This is
  a new change neither `module_kept_session_changes` nor `module_kept_session_reach` covers, so
  it is an architecture capture before chunk 15's code, not a revision at the sync. Chunk 15
  gains §4.3, §4.4 and §5.4 and nine governing atoms, and a split rule (15a the controller's
  Delete every session, 15b the sheet, the footer and their hosts). Chunk 21's save path is
  `generation-session-my-instrument.ts`, not the sheet's form model `use-my-instrument.ts`;
  `saveMyInstrument` must also select an existing my instrument that is not selected; the action
  reaches the session's actions through `WorkspaceShell.vue` and the connection sheet's contract,
  component and host; `transposition-check.ts` likely needs no change (it takes any
  `InstrumentProfile`); `HARDWARE-CHECKLIST.md` carries H3; only
  `rule_controller_transposition_check` is STABLE (`rule_acknowledgement_exact_pitch` is REVIEW);
  it gains a split rule (21a the save path, 21b the action and its route). Chunk 28's opening
  path is `workspace-kept-session-opening.ts` (`SessionOpening` gains a damaged outcome in
  `workspace-session-controller-types.ts`), a row's opening is `use-session-list.ts` →
  `openSession`, and the landing after a damaged row is `ReviewArea.vue`'s `openRow` and
  `review-area-focus.ts`; it gains `module_kept_session_reach`, `module_save_policy` and
  `service_session_controller`. `workspace-session-controller-types.ts`,
  `workspace-kept-session-edits.ts`, `workspace-session-ends.ts` and
  `create-workspace-session.ts` each already link 10 atoms, the cap: a new linked function goes
  in a new file.

- **D330 (2026-10-16): chunk 28's damaged-session deletions go through the kept-change line, and
  their reports reach the notices through `App.vue` and the workspace shell, as the remembered
  controller's store does.** Settled by `spec-writer` under the owner's delegation of minor
  technical calls, from the three points `documentalist` derived while writing the capture
  (`module_kept_session_save` 0.6, 9aef0c0) and the one it left open. All three points are
  confirmed. (1) The load's clean-up and an opening's deletion go through
  `changeKept(changes, 'caller')`, never `save()`: during a session `save()` resolves `held`
  and a later refusal would reach the failure listener as Save failed, where ux D313 wants
  "Damaged session not deleted"; the kept-change line also reads at the change and queues behind
  the session saves, which (2) needs. (2) The clean-up runs only when a summary the load read is
  damaged, so a visit with nothing damaged opens no transaction for it, and it re-reads the
  summaries at the change: a summary damaged since the load goes too, its row with it, and none
  damaged at the re-read writes and tells nothing. (3) A refusal for lack of space gives Storage
  full, any other refusal the save-problem notice's "Damaged session not deleted" (ux D310,
  D313); since the refusal is the caller's, the notices take both from the deletion's report,
  not from the failure listener. The open point, how the reports reach `use-app-notices.ts`:
  option (b), read in the code on `v3.0-w8`. The remembered controller is the idiom it follows:
  `createWorkspaceSession` builds its store, `App.vue` passes it to `WorkspaceShell.vue` as a
  prop (`remembered-controller`), and the shell hands it to the composable that uses it. So the
  reports' channel is built with the workspace, before the controller's chunk loads (a small
  builder in `workspace-kept-sessions-seam.ts`, called from `create-workspace-session.ts`, which
  gains no link), handed to `keptSessionsOf` for the controller to tell through, and exposed on
  `WorkspaceSession`; `App.vue` passes it to the shell, which hands it to `useAppNotices` as a
  dependency (an optional prop defaulting to none, so the shell's specs stand). The shell's edit
  is one prop and one argument, made by 28b after chunks 15 and 21 in the wave's shared-files
  order (D329). Option (a), a `WeakMap` in the seam module keyed to the visit's `SavedDataLoad`,
  is rejected: a hidden module-level channel that works only when the shell's `savedData` is the
  very object the seam was built from, which the shell's `Pick` type does not show; every shell
  spec builds its own `savedData` (`quietSavedData`), and a mis-wired harness would drop the
  apology with no error. Option (c), `App.vue` providing the reports as it provides
  `SAVE_SETTINGS`, is rejected: `SAVE_SETTINGS` serves components deep in the tree, and the
  idiom has the component inject and pass it to its composable as a dependency (the shell passes
  `injectSaveSettings()` to `useSessionOptions`), so following it still edits the shell; the
  only way to leave the shell alone is for `useAppNotices` to inject by itself, which its unit
  tests (an effect scope, no component) cannot provide and which hides a required dependency.
  The notices are built in one place, `App.vue`'s direct child, where a prop is the plain path.
  `documentalist` revises `module_kept_session_save` 0.6 before chunk 28's code: its "never
  through the workspace shell" goes, and the TECHNICAL INTERFACE names the channel's route.

- **D331 (2026-10-16): another tab's Delete everything outdates every other open tab; master spec
  §4.3 names it (ux Q80).** Settled by `spec-writer` under the owner's delegation of minor design
  calls; the behaviour is already built and designed, and this names it in the spec. As written,
  §4.3 makes a tab outdated only when data written by a newer version is known, so it does not
  cover another tab's `Delete everything`. Chunk 4's port does outdate the other tabs then (their
  connections close on the deletion; writes and deletions are refused, reads find nothing), and
  the design treats such a tab as outdated in every respect (ux D293, D294). That is the right
  behaviour: the other tab holds what was deleted in memory (settings, my instrument, the rows of
  kept sessions), and saving from it would bring back part of what the player chose to delete
  everywhere. So §4.3 gains a second trigger: once the player runs Delete everything in one tab,
  every other open tab of the app is an outdated tab, saving and deleting nothing, offering no
  deletion and showing the reload notice outside a running session; in v3.0 its notice shows the
  newer version's wording, since the port reports no cause (D300), and the reload cures both.
  Done item 14 covers it. A visit whose database never opened (its read failed) is not told, as
  it has no connection to close, and still offers Delete everything as §4.4 says; that is
  accepted, since it holds nothing it read. Master spec Part A v1.22. Chunk 15 tests it (a second
  tab, after Delete everything in the first, saves nothing, offers no deletion and shows that
  wording). `rule_outdated_tab_stops_saving` gains the second trigger in business wording, for
  the owner at the wave-8 sync. `ux-writer` closes ux Q80 in its own register, citing this entry;
  no design change (its deletion wording stays for a later version, D300).

- **D332 (2026-10-16): Delete every session that finds nothing stored is done, as Delete session
  is.** Settled by `spec-writer` under the owner's delegation of minor technical calls, from an
  edge `documentalist` found while recording the wave-8 captures (b4774c5). Delete every
  session's keys-only read can find no key while the tab still lists sessions: another tab ran
  Delete every session, or deleted each session, after this tab's load; this tab may also hold a
  session in memory only, its save refused (such a session has no row, so it never makes the
  action show on its own). Another tab's Delete everything is not this case: it outdates this tab
  (D331), and the change resolves `saving-off`. With no key, the batch is empty and the
  kept-change line resolves `unchanged`. The controller takes `unchanged` as it takes `saved`:
  every session held in memory goes, the most recent included, and every row, leaving no most
  recent session until the next session ends with a review, as Delete session already does when
  nothing is stored under its key (`workspace-kept-session-edits.ts`). The player asked for no
  session to be kept, and none is. The confirmation tells it as a success: it returns to the
  Overview with its counts updated ("No sessions kept yet.") and the space measured again, with no
  error line and no wording of its own (ux design, `screens/your-data/`, Confirmations: Success).
  No design change. Chunk 15a builds and tests it. `module_kept_session_reach` 0.3 says "once
  that deletion is saved" in its rule, its technical interface and its acceptance criterion;
  `documentalist` widens all three to "saved, or finding nothing stored" before chunk 15a's code.

- **D333 (2026-10-16): Delete every session never meets a session a newer version wrote; "every
  key found" stands.** Settled by `spec-writer` under the owner's delegation of minor technical
  calls, from the second edge of b4774c5, checked in the code on `v3.0-w8`. The case cannot
  arise. A record a newer version wrote carries a data version above this code's, and no record
  is written with a data version above the database's (`assertWritableVersions`), so the database
  itself is at a newer data version. Then (1) at load, the open meets a newer IndexedDB version
  or a newer `meta` and the port starts outdated (`openDatabase`); (2) later in the visit, the
  newer app's upgrade closes this tab's connection and the port turns outdated
  (`onVersionChange`), and with saving off Delete every session is not offered and an open
  confirmation closes without deleting (§4.4, chunk 15's existing test); (3) a batch read before
  that and applied after reads `meta` first in its own transaction and aborts, writing nothing,
  when the data version is newer (`changeStores`), so the change resolves `saving-off`. A row
  for a session a newer version wrote exists only in an outdated tab, where nothing is offered.
  No behaviour, plan test or capture changes; chunk 15's capture gains a clause saying why, so the
  chunk owner adds no filter of its own.

- **D334 (2026-10-16): when the load's clean-up deletes the most recent session, the readable
  kept session that started last becomes the most recent, at once.** Settled by `spec-writer`
  under the owner's delegation of minor technical calls, from the third edge of b4774c5. The
  clean-up re-reads the summaries at the change (D330), so it can delete a summary that was
  readable at the load and is damaged now, and that one may be the most recent session the load
  chose. The opening path's rule applies (spec D304's rule after a reload, D327, ux D317): the
  most recent session becomes, at once, the readable kept session that started last among the
  summaries the re-read found readable, or none, in which case `review-link` goes. This changes
  the most recent session only while it is a kept session not yet read into memory. A most recent
  session held in memory (one that ended in this visit, or one opened from its row) stays the
  most recent, readable in memory; its records are among those deleted only if another tab
  damaged them after this tab read or wrote them, and then its row goes with the deletion and the
  apology counts it.
  Unlike the player's own deletion, which leaves no most recent session (ux D317), a damaged
  session's deletion is the app's, so the load's rule chooses again. No design change: ux D317
  already gives the rule for a damaged deletion. Chunk 28a builds and tests it.
  `module_kept_session_save` 0.7 says the most recent session is "decided without those sessions,
  as they already are", which no longer holds for a summary damaged since the load;
  `documentalist` amends its rule and its acceptance criterion before chunk 28a's code.

- **D335 (2026-10-16): the transposition check's action also selects my instrument, and is not
  offered past MIDI's range; master spec §7.2 says both.** The owner's sign-off at the wave-8
  report (item 6). Chunk 21a's save (`saveAndSelectMyInstrument`) also selects my instrument
  when another instrument was selected, as the build plan asked; §7.2 did not state it. §7.2 now
  does, and also states the bound ux D212 settled: the action is not offered when the
  transposition it would set would make a note of my instrument's written range sound outside
  MIDI notes 0 to 127, the bound §7.1 already puts on the transposition. No behaviour changed;
  the spec now says what is built. Master spec Part A v1.23.
  `rule_transposition_check_sets_my_instrument` 0.4 already says both (intent change set
  `docs/release/v3.0-intent-change-set.md`, part Q2 item 4 and part Q4 item 6, applied by
  `documentalist`).

- **D336 (2026-10-16): build plan v27 places the wave-9 preflight's corrections.** Settled by
  `spec-writer` under the owner's delegation of minor technical calls, from `documentalist`'s
  wave-9 preflight (83a90ec on `v3.0-w9`, change set part R: 20c PROCEED-WITH-SIGNOFF-PENDING,
  Part B2 after the gate; 24b PROCEED; D326 captured in `entity_my_instrument_record` 0.4 and
  `module_save_policy` 0.6, 24b-1's re-check on the return to Idle in
  `module_idle_pregeneration_queue` 0.5), checked against the code on that branch. Chunk 20c's
  Files line missed the files D326 changes: `my-instrument-saves.ts` (it sends both saves as
  `void policy.save`, with no outcome), `generation-session-my-instrument.ts` (it changes
  `state.myInstrument` at once and selects the template before the record's delete),
  `use-my-instrument-sheet.ts` (the sheet's host, which calls the actions with `void` and closes
  at once; `use-my-instrument.ts` is only the form model), `use-generation-session.ts` (the
  actions' outcome and its no-saves stub), `WorkspaceShell.vue` (it hosts the sheet and wires the
  check's `use-for-my-instrument` to `saveAndSelectMyInstrument`) and the session controller's
  files (the counted sessions leaving memory, as `workspace-kept-sessions-deletion.ts` does for
  Delete every session). With them the chunk passes about fourteen source files, so its split
  rule becomes three parts, in order: 20c-1 the batch and memory (no interface), 20c-2 the
  warnings, confirmations and their hosts, 20c-3 the review's room for another clef. Wave 9 is
  not file-disjoint: `WorkspaceShell.vue` is also 24b-2's (the prompt's host), so it is shared,
  20c before 24b-2, κ=1, run order 20c-1 → 20c-2 → 20c-3 → 24b-1 → 24b-2, as waves 6 to 8 did
  (D312, D325, D329); the session controller's two files are shared the same way if 24b-2's Start
  needs them. `WorkspaceShell.vue` links 9 atoms, so one new linked function fits there.
  Chunk 20c gains `rule_failed_read_offers_only_delete_everything`, `rule_kept_session_content`,
  `module_kept_session_changes`, `module_kept_session_reach` and `service_session_controller`;
  its review-height rule is ux D290's, no longer proposed. Chunk 24b names
  `rule_stale_phrase_prompt_at_start` (part J2) and gains `service_session_start`,
  `module_session_starting_note`, `module_session_carry_in_after_change`, and
  `rule_pregeneration_discarded_on_change` to keep true (it governs Idle;
  `workspace-pregeneration.ts` links it); its revisions before code are complete with parts J2
  and R2, and the wave sync describes the prompt in `service_workspace_session_flow` as built.
  The Part B2 gate records the preflight's point on D335's bound.

- **D337 (2026-10-16): a reload between my instrument's deletion and the template's saved
  selection loads the default instrument; accepted, and stated in the record's atom.** Settled
  by `spec-writer` under the owner's delegation of minor technical calls, from the wave-9
  preflight's first D326 point. D326 item 3 saves the template's selection after the batch,
  through the visit's saves, where chunk 20's code selected the template before the record's
  delete. So a reload after the batch is saved and before that selection is saved (a moment, at
  most a generation under way at Idle longer), or a refusal of that one settings save, leaves a
  saved selection naming a my instrument that no longer exists; the next load reads it
  tolerantly (`rule_saved_settings_load_tolerantly`, `settings-record.ts`'s `readInstrument`) and
  selects the default instrument, the B-flat tenor saxophone, not the template. Accepted: nothing
  is lost, my instrument and its sessions are gone as the player confirmed, the instrument
  control shows a built-in the player can change in one choice, and it takes a reload in that
  moment. Putting the selection's write into the batch was rejected: it would bring a settings
  record into the kept-change line, against D326 item 1 and `module_save_policy`. Stated, not
  left implicit: `documentalist` adds the case to `entity_my_instrument_record` at chunk 20c's
  sync, and chunk 20c-1 replaces the code's claim that "no selection ever names a my instrument
  that is gone". No business atom, master spec or design change: master spec §4.4 already gives
  the tolerant fallback. Not the owner's to rule on.

- **D338 (2026-10-16): D326 item 2's "leaves memory alone" means it only leaves memory.**
  Settled by `spec-writer` under the owner's delegation of minor technical calls, from the
  wave-9 preflight's second D326 point; it confirms the reading in change set part R1. The
  session that just ended, held in memory only because its own save failed, has no record on the
  device, so the batch deletes nothing for it; naming its minted key would be a delete that
  changes nothing (D326 item 2), and the batch need not name it. It is still a session of my
  instrument: the warning or confirmation counts it, as the session that just ended, and once the
  batch is saved it leaves memory with the others (its review closes, `Review last session`
  goes), and with it any retry of its save, so nothing writes it to the device later. Refused,
  it stays, as everything does. No behaviour, design or atom change; chunk 20c-1 tests it.

- **D339 (2026-10-16): after Use it, the musical profile selection shows the player's
  selection from Start, never phrase 1's; other changed controls show phrase 1's values.** The
  owner kept ux D319. Why: the selection names the choice the next phrases follow. Stated in
  [master spec §16](../../versions/v3/master-spec.md#16-a-stale-phrase-1-at-start) (Part A v1.24) and
  `rule_stale_phrase_prompt_at_start` 0.2 (change set part R5 item 2); chunk 24b-2 built it.

- **D340 (2026-10-16): v3.0 hand checks H2, H3, H4, H5, H6 and H9 count as passed on the
  owner's word; H8 follows the tag as a v3.0.x note; H7 is recorded as not run.** Owner ruling,
  through the wave driver. Why H8 waits: no file has been opened in an outside program yet
  (MusicXML in MuseScore, MIDI files in a MIDI tool); H7 is for information only. Whether H5's
  played-notes-export half counts as checked is open as O220. Stated in build plan v28,
  [chunk 26](../../versions/v3/build-plan.md#chunk-26--v30-release-gate) and its gates table.

- **D341 (2026-10-16): build plan v28 places the wave-10 preflight's corrections.** Settled by
  `spec-writer` from `documentalist`'s preflight (b1dbffc, change set part S): chunk 26 checks
  Part C (done 2026-10-08, D246), B1, B2, I1, J1 and N1 rather than obtaining them; it covers
  items 1–24; §7's item 23 cites part G, item 19 its replay-key tests; M5's budget is 229,376
  bytes (`224 * 1024`). Stated in [chunk 26](../../versions/v3/build-plan.md#chunk-26--v30-release-gate),
  [§7](../../versions/v3/build-plan.md#7-definition-of-done-coverage) and M5.

- **D342 (2026-10-16): H5's played-notes-export half was not checked; it follows the v3.0 tag as
  a v3.0.x note beside H8.** Owner answer, resolving O220: "we will leave this test for a later
  date, it won't prevent v3.0 release." Item 21's export clause rests on its automated tests at
  the release. Stated in build plan v28,
  [chunk 26](../../versions/v3/build-plan.md#chunk-26--v30-release-gate), its gates table and §7.

- **D343 (2026-10-16): at the v3.0 final sync, every `release-v3.0` atom in REVIEW (42, the 12
  MODULE and ENTITY atoms included) is promoted to STABLE and put on the contract surface;
  `rule_saved_data_belongs_to_browser_profile` goes DRAFT → REVIEW on argument.** Owner ruling.
  The CONTRACT bump is part of that sync: 6.2 → 6.3, MINOR, proposed by `documentalist`, which
  settles the level if architecture on the surface changes it. The DRAFT → REVIEW rests on how
  browser storage works; no test runs the app at two addresses. Stated in
  [chunk 26](../../versions/v3/build-plan.md#chunk-26--v30-release-gate).
