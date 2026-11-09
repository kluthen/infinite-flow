> **Archived 2026-11-09.** Closed range for the v3.2 milestone: v3.2 is released as version
> 3.2.0 (tag `v3.2.0`, f93e552d). These decisions are the v3.2 build, from the approved re-scoped
> Part C (D409–D410) through wave 7, including the guide playback. The IDs D458, D459, D461–D489,
> D496, D498, D501, D502, D505 and D507 were reserved by other worktrees and never issued. D406
> stays live (Jam's four answers, provisional until the owner's checks after the tag), and so do
> D521–D523 (v3.2's release as built, its contract as built, the go and the tag). Archived IDs
> keep their meaning and may be cited anywhere; each decision's content is now stated as settled
> fact in a live document, or is history, as the "where it now lives" table in
> [archive/v3/README.md](README.md) records. Relative links were written from `specs/`; their
> paths were repaired on 2026-11-09 so they resolve from this folder.

- **D407 (2026-10-21): the mode switches only at Idle, never while playing, and Jam requires a
  MIDI controller.** The owner: "indeed you can't switch session/jam mode while playing. Jam
  requires a controller. ok for the rest." Without a controller, Jam mode opens and its Start is
  unavailable, saying why. Closes O251 with the rest as proposed. Now in:
  [Jam mode §2](../../versions/v3/jam-mode.md#2-two-modes).

- **D408 (2026-10-21): the remaining re-scope proposals are accepted.** The owner: "ok for the
  rest." Closes O250 (60–180 BPM), O252 (the seam), O254 (the doodle Jam mode keeps), O255 (one
  list, one review), O256 (v3.2 split, session-mode work first), O257 (one MAJOR bump, from
  CONTRACT 7.2.0 to 8.0.0), O258 (bundle policy) and O259 (scripted checks). Now in:
  [Jam mode](../../versions/v3/jam-mode.md).

- **D409 (2026-10-21): master spec Part C is rebuilt as v1.1 from the settled Jam re-scope, with a
  facts-only refresh against 3.1.0; it awaits the owner's approval.** No behaviour beyond
  D400–D408. Where the re-scope left a choice open, v1.1 proposes an answer and opens O260–O266
  (the replay key carrying the steering block, Jam's levels, the doodle-to-controls mapping, tap-in
  on the controller, shared settings changed in Jam mode, a cold rhythm domain, the split's
  versions). Now in: [Part C](../../versions/v3/master-spec.md#part-c--v32),
  [Jam grounding §E](jam-grounding.md#e-refresh-at-v310-2026-10-21).

- **D410 (2026-10-21): the owner approves master spec Part C v1.1 with its seven proposed answers;
  O260–O266 close as proposed.** The owner: "approved, go with the proposals." Part C becomes v1.2,
  the answers written in; O263's tap-in takes the design's form (D411). The contract wording's one
  sign-off (C13) is still to come. Now in: [Part C §C17](../../versions/v3/master-spec.md#c17-deferred-and-open),
  [§C5.16](../../versions/v3/master-spec.md#c516-jams-settings), [§C5.17](../../versions/v3/master-spec.md#c517-tempo-in-jam-and-tap-in).

- **D411 (2026-10-21): ux Q81–Q87 are answered as `ux-writer` recommended.** The same approval.
  Where they met a proposal: Jam's first values are Q83's (session mode's first-visit values, the
  tempo kept in 60–180, Embellishments Rarely) with O261's drift Near, lock and changes off; tap-in
  is ux D335's (taps only after the button; then controller notes too; unevenness never judged).
  Now in: [Part C §C5.11](../../versions/v3/master-spec.md#c511-the-kept-doodle-and-jam-again-on-this-doodle),
  [§C5.16](../../versions/v3/master-spec.md#c516-jams-settings), [§C10.5](../../versions/v3/master-spec.md#c105-pre-generation-v30), [Part D §D8.4](../../versions/v3/master-spec.md#d84-pre-generation-jam-and-the-key-and-mode-suggestion).

- **D412 (2026-10-21): design gate D0 is granted and token pass T2 allowed.** The same approval:
  the reworked v3.2 design (ux D328–D346, `ux-critic` validated), and one pass adding the classes
  `mode-switch`, `tap-tempo`, `doodle-readings` and `jam-needs-controller`, no new token value.
  Now in: [build plan v3.2, gates](../../versions/v3/build-plan-v3.2.md#gates).

- **D413 (2026-10-21): "the held doodle" becomes "the kept doodle".** One term per concept (D237),
  as the re-scope (D408) and the approved design say it; the lexicon entry is renamed, its id
  `kept-doodle`. Now in: [Part C §C4](../../versions/v3/master-spec.md#c4-words-used-in-this-part),
  [lexicon](../../../docs/music/lexicon.md#kept-doodle).

- **D414 (2026-10-21): phones are a third-rate client; reducing a capability on a phone is
  acceptable.** The owner: "treat the phone as third rate client, it's okay if we reduce capabilities
  for it." A standing policy (ux D119), restated. Now in: [context of use](../../personas.md#context-of-use),
  [Part C §C10.8](../../versions/v3/master-spec.md#c108-other-session-rules).

- **D415 (2026-10-21): the doodle-to-controls thresholds.** `spec-writer`'s, under D410's O262: each
  control the nearest value the quantized doodle shows, in integers; an unsupported combination
  raises rhythmic variety only. The listening check confirms them; a correction is a ruling. Now in:
  [Part C §C5.16.1](../../versions/v3/master-spec.md#c5161-the-doodle-to-controls-mapping).

- **D416 (2026-10-21): build plan v3.2 is rewritten as v4 from Part C v1.2 and the approved design;
  it awaits the owner's approval.** Two halves, one release: waves 0–3 session mode (with the whole
  request, `ifk4.` and kept-session shape, so each is taken once), waves 4–7 Jam mode; Jam's code
  under `src/jam/`, kept out of the entry chunk by a new boundary check; chunk 26 folded into 19;
  new chunks 28–33, 240 BPM last behind ruling J240; nine scripted hand checks, none on Edge or a
  phone. Now in: [build plan v3.2](../../versions/v3/build-plan-v3.2.md).

- **D417 (2026-10-21): build plan v3.2 v5 is approved; hand check v3.2 H9 is waived.** The owner:
  "wave [waive] H9. I approve you may proceed." H9 (v3.1 data carried over) is waived on D399's ground for
  v3.1 H5: the earlier version had no live users. Chunk 22's automated step-4 upgrade tests on
  seeded v3.1 data and M3 stay. IDs H1–H8 keep their numbers. Now in:
  [build plan v3.2, hand checks](../../versions/v3/build-plan-v3.2.md#hand-checks).

- **D418 (2026-10-21): `rule_start_while_controller_away` joins C13, for the CS sign-off.**
  `spec-writer`'s, under the owner's delegation of minor calls; found by chunk 0's re-sync (change
  set L2). It held for a Jam only under v1.0; since D407 Jam mode needs a controller. Session mode
  keeps it whole; in Jam mode Start is unavailable while the controller is away (draft M2). Revised
  by chunk 20. Now in: [Part C §C13](../../versions/v3/master-spec.md#c13-what-v32-changes-in-v2-v30-and-v31-guarantees-and-atoms),
  [build plan v3.2, gates](../../versions/v3/build-plan-v3.2.md#gates).

- **D419 (2026-10-21): a fresh Jam draws its session seed once at Start; phrase 1's attempts take
  seeds derived from it by labels of their own.** `spec-writer`'s, under the same delegation (L2).
  It keeps every seed fixed before the Jam runs, a fresh Jam reproducible, and every v3.1 seed as
  it is; a kept doodle's phrase 1 at Idle draws as any Idle phrase 1. `module_session_seed_plan`'s
  wording changes, so it joins C13 for CS; chunks 17 and 18 build it. Now in:
  [Part C §C11](../../versions/v3/master-spec.md#c11-the-generation-request-the-replay-key-and-kept-sessions),
  [§C15](../../versions/v3/master-spec.md#c15-architectural-decisions-and-their-reasons),
  [build plan v3.2, chunk 18](../../versions/v3/build-plan-v3.2.md#chunk-18--jam-engine-part-2-from-the-doodle-to-phrase-1).

- **D420 (2026-10-21): the vision's out-of-scope "browsers other than Chromium-based ones" follows
  D399 in the CS redraft.** `spec-writer`'s, under the same delegation: browsers other than Chrome
  are out of scope, other Chromium-based ones untested. It goes in the vision's one redraft and
  sign-off. Now in: [Part C §C13](../../versions/v3/master-spec.md#c13-what-v32-changes-in-v2-v30-and-v31-guarantees-and-atoms).

- **D421 (2026-10-22): gate CS is signed off; three atoms go to STABLE.** The owner, after wave 0:
  "agreed for your questions." M1–M22 of the [change set](../../../docs/release/v3.1-v3.2-intent-change-set.md)'s part M as
  drafted: CONTRACT 7.2.0 → 8.0.0, the vision 0.9 → 0.10; `documentalist` applies them on
  `v3.2-w0`. `module_phrase_replay_key`, `rule_seeded_phrase_reproduction` and
  `module_settings_mutation` are promoted to STABLE. Now in: [Part C §C13](../../versions/v3/master-spec.md#c13-what-v32-changes-in-v2-v30-and-v31-guarantees-and-atoms),
  [build plan v3.2, gates](../../versions/v3/build-plan-v3.2.md#gates).

- **D422 (2026-10-22): each STABLE guarantee v3.2 changes after gate CS is applied at the sync of
  the wave that builds it, with its own MAJOR contract bump and owner sign-off.** The wave driver's,
  under the owner's standing delegation; it follows the three 8.1.0 promotions (D421), so `main`
  never holds code that disagrees with a STABLE atom. CONTRACT 9.0.0 at wave 1's sync (change set
  part N, gate CN, blocks chunk 15's merge); another MAJOR at wave 2's for chunk 12's
  `module_phrase_replay_key` and `rule_seeded_phrase_reproduction` (gate CK, blocks chunk 12's
  merge). C13's "one bump" is superseded. Now in: [Part C §C13](../../versions/v3/master-spec.md#c13-what-v32-changes-in-v2-v30-and-v31-guarantees-and-atoms),
  [build plan v3.2, gates](../../versions/v3/build-plan-v3.2.md#gates).

- **D423 (2026-10-22): three wave 1 preflight points.** The wave driver's, same delegation. Until
  chunk 12's `ifk4.`, the `ifk3.` encoder refuses an intent with the lock group, the steering block
  or a carry-in from no phrase with a typed error rather than write a lossy key (chunk 6). Chunk
  15's skipped mutation is recorded in the in-memory session history only; the kept record does not
  change. N1's fixed draw bound stays a typed error; the dead end is the only no-throw outcome. Now
  in: [build plan v3.2, chunk 6](../../versions/v3/build-plan-v3.2.md#chunk-6--the-request-carries-v32s-inputs),
  [chunk 15](../../versions/v3/build-plan-v3.2.md#chunk-15--vary-settings-allowed-groups).

- **D424 (2026-10-22): C7.3's five kinds are the ones chunk 5 built; "repeated" is the identical
  edit; the shares and the known limit follow a re-measured census.** `spec-writer`'s, under the
  owner's delegation of minor calls, at the wave driver's request. The built kinds match C7.3 and
  the catalogue (a moved start or rest sits between two notes, so only adding or removing a rest
  changes the silence). The 2026-10-08 script was not kept and several of its shares do not
  reproduce, among them "with Sixteenth, none" under Strict and Straight: Sparse offers a rest
  change (20 %). Rejected: "repeated" as the same kind only (two edits at two places are two
  changes, against C7.4), and fitting the code to the old figures. Keying about 15 ms, not 10, is
  accepted. Now in: [Part C §C7.3](../../versions/v3/master-spec.md#c73-the-five-kinds-and-the-known-limit), [§C7.6](../../versions/v3/master-spec.md#c76-how-the-search-holds-the-lock),
  [jam-grounding §D.2](jam-grounding.md#d2-what-the-rhythm-domain-offers-a-locked-rhythm), [build plan v3.2, chunk 5](../../versions/v3/build-plan-v3.2.md#chunk-5--rhythm-bars-distance-and-change-kinds) (and chunks 8, 10, 11, M2, H2).

- **D425 (2026-10-22): the steering block's target rhythm holds note starts and rest starts, and
  the doodle is compared as heard.** `spec-writer`'s, under the owner's delegation of minor calls,
  at the wave driver's request after chunk 6. C8's distance needs both kinds; chunk 6 built them. A
  doodle measure holds one rest start per silence; against it a candidate's rest right after a rest
  starts nothing (18 % of candidates write a silence as two rests); the locked rhythm stays written.
  Rejected: comparing the doodle with written rests (a rhythm sounding like it would be an edit
  away, Near at beat 3). Now in: [Part C §C5.9](../../versions/v3/master-spec.md#c59-what-the-doodle-feeds-the-generator),
  [§C8](../../versions/v3/master-spec.md#c8-jams-drift), [§C11](../../versions/v3/master-spec.md#c11-the-generation-request-the-replay-key-and-kept-sessions),
  [build plan v3.2, chunks 6, 8 and 28](../../versions/v3/build-plan-v3.2.md#chunk-6--the-request-carries-v32s-inputs).

- **D426 (2026-10-22): a dead end mid-session is unreachable under today's rules; its skip is a
  defensive guarantee.** `spec-writer`'s, under the owner's delegation of minor calls, at the wave
  driver's request after chunk 15. The build's exhaustive search found that the narrow-window
  step-down never leaves Vary settings without a move, so C9's "only after the narrow-window rule"
  overstated a cause; the signed N1 wording only says what happens if one occurs. Now in:
  [Part C §C9](../../versions/v3/master-spec.md#c9-vary-settings-allowed-groups),
  [build plan v3.2, chunk 15](../../versions/v3/build-plan-v3.2.md#chunk-15--vary-settings-allowed-groups).

- **D427 (2026-10-23): wave 2's preflight corrections to the v3.2 plan.** The wave driver's, at
  the preflight. The plan states what the spec already settles: chunk 16's re-lock request holds
  no allowed change (C7.4); chunk 22's summary and body take data version 4; chunks 10, 11, 12 and
  22 name the atoms the preflight found. Chunk 3 writes the doodle set by hand; the owner's Travel
  Sax recordings join it before chunk 28 (gate DR). Now in: [build plan v3.2, v15](../../versions/v3/build-plan-v3.2.md#gates).

- **D428 (2026-10-23): only locked bars make the search rhythm-major.** `spec-writer`'s, under the
  owner's delegation of minor calls. A steering block alone, and "on, nothing locked yet" with one,
  keep v3.1's harmony-major walk, so a Free block reproduces v3.1 and the doodle only orders the
  rhythms tried with each chord plan. Rejected: rhythm-major for every block (Free would differ
  from v3.1). If M1 or L1 finds the band too often missed, a block walking rhythm-major is the
  lever. Now in: [Part C §C7.6](../../versions/v3/master-spec.md#c76-how-the-search-holds-the-lock),
  [§C8](../../versions/v3/master-spec.md#c8-jams-drift), [build plan v3.2, chunks 8 and 10](../../versions/v3/build-plan-v3.2.md#chunk-10--the-rhythm-lock-in-the-generator).

- **D429 (2026-10-23): gate CK also covers chunk 22's kept-session shape, and the kept-record
  loophole is closed.** The wave driver's, under the owner's delegation, per D422: chunk 22's
  merge waits on the owner's sign-off of P3–P5 (P3b, P6, P7 with them), under the same CONTRACT
  10.0.0. A kept phrase whose request and intent disagree on the lock group, the steering block or
  the join's origin is unreadable, as v3.1 refused it. Now in: [Part C §C11](../../versions/v3/master-spec.md#c11-the-generation-request-the-replay-key-and-kept-sessions),
  [§C13](../../versions/v3/master-spec.md#c13-what-v32-changes-in-v2-v30-and-v31-guarantees-and-atoms), [build plan v3.2, chunk 22 and gate CK](../../versions/v3/build-plan-v3.2.md#chunk-22--v32s-kept-session-shape).

- **D430 (2026-10-23): a fresh Jam's played notes are timed from its count-in.** `spec-writer`'s,
  under the owner's delegation of minor calls. Its body holds the doodle's first barline and phrase
  1's start on that clock; the played notes keep data version 1 and its reader. The count-in's
  first beat precedes every doodle note, even one played early onto the first beat (C5.4), which
  the doodle's first barline does not. Rejected: negative times (a new played-notes data version
  and an upgrade of every record) and the doodle's barline as origin. The STABLE wording of
  `entity_kept_session_record` and `module_kept_session_codec` joins gate CK; opens O267. Now in:
  [Part C §C10.3](../../versions/v3/master-spec.md#c103-kept-sessions-and-played-notes), [build plan v3.2, chunk 22](../../versions/v3/build-plan-v3.2.md#chunk-22--v32s-kept-session-shape).

- **D431 (2026-10-23): the distance bands are worded as C8 states them.** `spec-writer`'s, under
  the owner's delegation of minor calls, from chunk 3's findings. Close is one edit away from beats
  1 and 3; Near is one edit touching beat 1 or 3 (a start added or removed there, or moved onto or
  off it), or two Close edits. C8, `rule_rhythm_distance` and the built `measureBand` agree; C4
  and the lexicon's Drift entry had kept the catalogue's earlier "on or next to a strong beat",
  under which an edit one sixteenth from beat 1 would be Near. Now in: [Part C §C4](../../versions/v3/master-spec.md#c4-words-used-in-this-part),
  [lexicon, Drift](../../../docs/music/lexicon.md#drift).

- **D432 (2026-10-23): chunk 13's lock census reads each phrase's lock outcome from its
  provenance.** `spec-writer`'s, from chunk 3's findings. From written bars alone a forced bend
  landing exactly one allowed change from the locked rhythm reads as a change; chunks 10 and 11
  record the outcome and chunk 16's history keeps it, so the census takes it from there and the
  bars only cross-check it. No behaviour. Now in: [build plan v3.2, chunk 13 and M2](../../versions/v3/build-plan-v3.2.md#chunk-13--session-measurements-first-run).

- **D433 (2026-10-23): chunk 3's two doodle-reading findings go to the owner; gate LD opens as
  planned.** `spec-writer`'s. How a short silence between two doodle notes is read (O268) changes
  what Jam hears in the player's playing, so it is the owner's, before chunk 28 (gate DS). Whether
  a legato doodle reading Heavily varied sounds right (O269) is a listening judgment, at v3.2 H5.
  Neither touches drift's scale: H1's five doodle measures read the same under either answer. Now
  in: [build plan v3.2, gates DS and LD](../../versions/v3/build-plan-v3.2.md#gates),
  [v3.2 H5](../../versions/v3/build-plan-v3.2.md#v32-h5--jam-listening-the-doodle-to-controls-mapping-l1).

- **D434 (2026-10-23): the rhythm orderings' time reaches the sweeps through the diagnostics,
  under a clock only the sweeps pass.** `spec-writer`'s, from chunk 10's finding (no chunk carried
  it). Not the provenance, which replay and the corpora compare; and the outcome stays deep-equal
  for the same intent and seed when no clock is passed. Chunk 13 builds it, chunk 8's rank falls
  inside it. No behaviour. Now in: [build plan v3.2, chunk 13, M1 and M5](../../versions/v3/build-plan-v3.2.md#chunk-13--session-measurements-first-run).

- **D435 (2026-10-23): a drawn rhythm change none of whose candidates makes a phrase records "no
  change available", as a draw with no candidate does.** `spec-writer`'s, confirming chunk 11's
  reading. The phrase then keeps the lock's order C7.6 already gives (locked bars, then the forced
  bend), and the history holds a draw's record exactly when the phrase drew, which chunk 13's
  census counts (D432). Rejected: a second draw or a new record value. Now in:
  [Part C §C7.4](../../versions/v3/master-spec.md#c74-when-a-phrase-changes), [build plan v3.2, M2](../../versions/v3/build-plan-v3.2.md#m2--the-lock-census-forced-bends-and-rhythm-changes).

- **D436 (2026-10-23): the rhythm change draw's hash stays as built; measurements draw from
  seed-plan phrase seeds.** `spec-writer`'s, from chunk 11's finding. FNV-1a's kept top bits
  barely move with a seed's last hex digit, so raw consecutive seeds draw in clumps; but every
  seed a draw ever reads comes through the session seed plan (phrase 1 never draws), and those
  spread: share 0.2474 at random session seeds, 0.2503 at the census's, over 20,000 sessions'
  phrases 2–8. Rejected: a final mixing step (an architecture change that would move every draw
  and the golden draws before the release, for synthetic seeds only). Now in:
  [build plan v3.2, M2](../../versions/v3/build-plan-v3.2.md#m2--the-lock-census-forced-bends-and-rhythm-changes).

- **D437 (2026-10-26): wave 3's preflight corrections to the v3.2 plan.** The wave driver's, at
  the preflight; `spec-writer` checked each against Part C and the code. The plan states what the
  spec settles: the re-lock only from locked bars with sixteenth notes (C7.1), read as a note or
  rest starting or lasting off the Eighth grid, a repeat leaving it pending; the tenser flag only
  for a tenser phrase (C4); a re-lock counted from the history's mark. Gate CR lets chunk 16 merge
  before `module_session_ready_phrases`' sign-off, as CS did. Now in: [build plan v3.2, v19](../../versions/v3/build-plan-v3.2.md#chunk-16--the-rhythm-lock-in-a-session).

- **D438 (2026-10-26): each wave gate records the first-load JS total beside the entry chunk's
  figure.** The owner's. Information only: rolldown's re-splitting moved the entry chunk by about
  18 kB in wave 2 with no change in what loads. The 300 KiB entry budget and what
  `verify:boundaries` gates on are unchanged. Now in: [build plan v3.2, workflow deltas and M4](../../versions/v3/build-plan-v3.2.md#m4--the-first-load-bundle).

- **D439 (2026-10-26): chunk 19 carries the saved lock, allowed changes and allowed groups into
  Start and the Idle pre-generation's start.** `spec-writer`'s, from chunk 16's finding: both still
  pass the lock off, no change and every group, so the Idle choice never reached a session and a
  pre-generated phrase 1→2 plan could not match a session started with the lock on (C10.5). Chunk
  19 gains the Start path's files, a matching Done when, the corpus guard and a re-cut split rule.
  Now in: [build plan v3.2, chunk 19](../../versions/v3/build-plan-v3.2.md#chunk-19--the-rhythm-lock-and-what-may-vary-in-the-controls).

- **D440 (2026-10-27): a short silence between two doodle notes is part of the note before it;
  closes O268.** The owner's answer ("part of the notes", as proposed; gate DS). A silence is a
  rest only where a whole rest of the doodle's note density value fits in it on that grid, its
  rest start at the first such grid tick; the silence reading counts the same rests. A tongued
  wind controller makes most doodles detached, which the old reading put beyond every rhythm the
  generator writes. Rejected: keeping C5.9 (drift only "nearest first" for detached doodles);
  dropping only one-sixteenth silences (misses `sparse-calls`). Two doodles' recorded silence
  readings become Sparse. Now in: [Part C §C5.9](../../versions/v3/master-spec.md#c59-what-the-doodle-feeds-the-generator),
  [§C5.16.1](../../versions/v3/master-spec.md#c5161-the-doodle-to-controls-mapping), [build plan v3.2, chunk 28](../../versions/v3/build-plan-v3.2.md#chunk-28--from-the-doodle-the-controls-and-the-steering-block).

- **D441 (2026-10-27): a tie between two register windows' centres goes to Middle.**
  `spec-writer`'s, under the owner's delegation of minor calls, from wave 4's preflight. Under the
  window derivation Middle is always among the tied windows (its centre sits at, or a hair from,
  the midpoint of the other two; checked for every range up to five octaves), so one rule settles every
  tie; Middle is also the first-visit register. Rejected: the lower window (an arbitrary lean). Now in:
  [Part C §C5.9](../../versions/v3/master-spec.md#c59-what-the-doodle-feeds-the-generator),
  [§C5.16.1](../../versions/v3/master-spec.md#c5161-the-doodle-to-controls-mapping), [build plan v3.2, chunks 28 and 7](../../versions/v3/build-plan-v3.2.md#chunk-28--from-the-doodle-the-controls-and-the-steering-block).

- **D442 (2026-10-27): before any doodle in the visit, Jam's Idle prewarms the first-visit rhythm
  values with Jam's tension.** `spec-writer`'s, under the owner's delegation (a prewarm is not
  heard or seen). They are what a doodle showing no rhythm takes; the domain memo never evicts, so
  session mode loses nothing. Rejected: prewarming nothing (a first doodle landing on those values would pay a cold build).
  Now in: [Part C §C5.8](../../versions/v3/master-spec.md#c58-the-time-budget), [build plan v3.2, chunk 20](../../versions/v3/build-plan-v3.2.md#chunk-20--jam-mode-the-mode-switch-jams-code-on-demand-and-jams-idle).

- **D443 (2026-10-27): chunk 28 builds on the hand-written doodles; gate DR blocks v3.2 H5.** The
  owner's ("Build on the written ones"). The Travel Sax recordings join the doodle set later,
  before H5, and run through the quantizer's and the mapping's tests as they join. Now in:
  [build plan v3.2, gates](../../versions/v3/build-plan-v3.2.md#gates).

- **D444 (2026-10-27): wave 4's preflight corrections to the v3.2 plan.** `documentalist`'s
  preflight (2d0525c), applied by `spec-writer` after checking each against Part C and the code:
  chunks 20, 28, 8 and 9's atoms, Files, drift checks and revisions; chunk 8's business revisions
  owed by D425 and D428; chunk 8's in-wave edge from chunk 28, whose blocks it orders by; chunk
  18's no-phrase carry-in fuel, which M1 confirms. No behaviour. Now
  in: [build plan v3.2, v21](../../versions/v3/build-plan-v3.2.md#chunk-20--jam-mode-the-mode-switch-jams-code-on-demand-and-jams-idle).

- **D445 (2026-10-27): the supported-combination step judges the doodle's note density as read,
  at every width.** `spec-writer`'s, under the owner's delegation of minor calls, from `ux-writer`'s
  wave 4 gap. No combination at Eighth is unsupported, so judging the Sixteenth read keeps the
  controls supported at both widths: they never depend on the window, a crossing while a doodle is
  kept changes no reading and, as in session mode, rewrites nothing. Rejected: running the step
  again on each crossing (a kept phrase 1 written narrow, then a Jam started wide, would generate
  Sixteenth with a variety stepped only for Eighth, an unsupported combination). Cost: on a narrow
  screen a doodle read as Sixteenth may keep a variety one step higher than Eighth needs (D414).
  Now in: [Part C §C5.16.1](../../versions/v3/master-spec.md#c5161-the-doodle-to-controls-mapping),
  [build plan v3.2, chunks 31, 18 and 24](../../versions/v3/build-plan-v3.2.md#chunk-31--jams-settings).

- **D446 (2026-10-27): chunk 31 adds the raised mark to the rhythmic variety reading (ux D355).**
  Chunk 28 is merged and closed, so the readings' model gains `raised` in the chunk that shows the
  readings, with D445's change to the same function. Now in:
  [build plan v3.2, chunk 31](../../versions/v3/build-plan-v3.2.md#chunk-31--jams-settings).

- **D447 (2026-10-27): ISS-015's fixes are deferred past v3.2.** The owner chose "Later, after
  v3.2" (their "Now, in wave 4" read as recording this now). Neither fix A (a tense ending only
  where the next phrase's contour can start) nor fix C (proving the join impossible before the
  search) is built in v3.2; ISS-015 stays open. Phrase 2 of seven doodle × instrument cases is
  standalone, and some carry-in attempts burn their fuel first; the Jam and session sweeps read
  their figures with it, never tuned around it. Now in: [build plan v3.2, chunk 18, chunk 29, M1
  and M5](../../versions/v3/build-plan-v3.2.md#m1--the-jam-sweep).

- **D448 (2026-10-27): a join pinned at the window's floor with no tense note is a known limit.**
  The owner's ("Accept and document", ISS-015's option B2): a Falling + Smooth phrase ending on
  the window's lowest tonic-triad tone leaves the next phrase no legal first note, so the ladder's
  standalone phrase is the designed outcome. Rejected: B1 (no carry-in phrase may end where the
  next cannot start), a gated generator change like fix A. Now in: [build plan v3.2,
  M1](../../versions/v3/build-plan-v3.2.md#m1--the-jam-sweep).

- **D449 (2026-11-03): gate LD cleared with a finding; drift's scale stays as C8 writes it.** The
  owner ranked v3.2 H1's five sets on 2026-11-03; the driver ruled option A, no product change.
  One listener, five sets: in every set the candidate ranked least alike was the only one starting
  a note on a finer grid than the doodle's (an offbeat over an on-beat doodle, a sixteenth among
  eighths); the ranking did not support C8's extra weight on beats 1 and 3 (Close over Near in 3
  sets of 5), and a shortened note was heard as Same. Rejected for now: fallback B, carried to the
  Jam listening check as O271. Set 4's "better, though distinct" is a preference, not likeness,
  noted for H4 and H5. Now in: [Part C §C8](../../versions/v3/master-spec.md#c8-jams-drift),
  [build plan v3.2, gate LD and H4](../../versions/v3/build-plan-v3.2.md#v32-h4--jam-listening-settings-drift-and-lock-l1).

- **D450 (2026-11-03): the rhythm change shares become 1 in 2, and 3 in 4 on a tenser phrase.**
  The owner's ruling, option (a), from v3.2 H2 steps 2 and 4 at 90 BPM: tension off, changes came
  too rarely; on, about 1 in 2 felt fine; "if needed we will change that later on". Tension across
  phrases keeps an audible step above the base. A Jam's lock draws at the base share, so it rises
  too. Built by new chunk 34 (wave 5), which re-runs M2; L3 stays open for step 3. Now in:
  [Part C §C7.4](../../versions/v3/master-spec.md#c74-when-a-phrase-changes),
  [build plan v3.2, chunk 34](../../versions/v3/build-plan-v3.2.md#chunk-34--the-rhythm-change-shares-tuned-l3).

- **D451 (2026-11-03): the generation worker's chunk budget rises from 150 KiB to 170 KiB.** The
  owner chose "Raise to 170 KiB" over 160 KiB or trimming chunk 8. Wave 4's gate measured the
  chunk at 154,238 B, 638 B over 153,600 B (chunk 8's steering rank +2,167 B, chunk 9 +752 B);
  174,080 B leaves about 19.6 KiB, so the limit needs no revisit before v3.2 ships. Now in:
  [Part C §C10.9](../../versions/v3/master-spec.md#c109-loading-jams-code-on-demand),
  [build plan v3.2, M4](../../versions/v3/build-plan-v3.2.md#m4--the-first-load-bundle).

- **D452 (2026-11-03): the suggestion judges "no fit" before Jam's key and mode.** `spec-writer`'s
  minor call, from wave 5's preflight: C6.3 gave no order. Too little material, then no fit, then
  Jam's key and mode among the kept candidates; "no fit" reads the doodle alone, so a kept Jam's
  recomputed review says it whatever key and mode the player has selected since, which "in every
  review of that Jam" needs. Now in: [Part C §C6.3](../../versions/v3/master-spec.md#c63-when-nothing-is-suggested),
  [build plan v3.2, chunk 14](../../versions/v3/build-plan-v3.2.md#chunk-14--the-key-and-mode-suggestion).

- **D453 (2026-11-03): chunk 29 measures through its double; chunk 33 plugs in the real ladder.**
  `spec-writer`'s minor call. Chunk 18 runs first in wave 5, but an 18 → 29 edge would make a
  chain of three (17 → 18 → 29) behind a ladder interface no capture fixes, which the in-wave edge
  rule forbids, and the wave is frozen. The generator under the double is real, so the carry-in
  fuel is still confirmed in wave 5; the plan named no chunk for the real ladder's sweep adapter.
  Now in: [build plan v3.2, chunk 29](../../versions/v3/build-plan-v3.2.md#chunk-29--the-jam-sweep-first-run),
  [chunk 33 and M1](../../versions/v3/build-plan-v3.2.md#m1--the-jam-sweep).

- **D454 (2026-11-03): wave 5's preflight corrections to the v3.2 plan, and gate CL.**
  `documentalist`'s preflight (4e8e9f11), applied by `spec-writer` after checking each against
  Part C and the code: chunks 34, 14, 17, 18 and 31's Files, atoms, drift checks and wording; chunk
  17 reuses `jamHomeNote`; Jam's settings records reach Jam's code undecoded, extending
  `module_saved_data_loader` (STABLE, on the contract), so new gate CL blocks chunk 31's merge. No
  behaviour. Now in: [build plan v3.2, v26](../../versions/v3/build-plan-v3.2.md#gates).

- **D455 (2026-11-03): C6's home-note cues are flat bonuses off the penalty, not note weights.**
  The driver's ruling under the owner's delegation of minor design calls. As the research note
  defines them, the candidate's penalty drops by 693 thousandths (×2 likelihood) when the last note
  is its home note and by 405 (×1.5) when the first is; the beat-1/3 ×1.5 stays a note weight.
  Rejected: reading "counts ×2 / ×1.5" as a weight on the note. Penalties are summed −ln shares, so
  that raises the home-note candidate's penalty and inverts the cue; the research note's examples
  then fail (G Dorian / G Mixolydian for D Dorian / D Aeolian, among others), while chunk 14's
  build reproduces all of them. Now in: [Part C §C6.2](../../versions/v3/master-spec.md#c62-the-method),
  [build plan v3.2, chunk 14](../../versions/v3/build-plan-v3.2.md#chunk-14--the-key-and-mode-suggestion).

- **D456 (2026-11-03): chunk 18 makes the transport start phrase 1 at its handed-over time.**
  `spec-writer`'s minor call on a gap chunk 17's owner found after 17a (0d69ac38): the transport
  still puts phrase 1 at the count-in's end, and phrase 1's backing, the MIDI side's silence arming
  and acknowledgement all read that start. Chunk 18 computes `soundsAt`, hands phrase 1 over and
  must sound it one measure after showing it, and already follows chunk 17 in wave 5, so no new
  edge. Rejected: chunk 21, which would leave wave 5's ladder sounding phrase 1 at the wrong time.
  The throw in `phrasesOf` on a hand-over through the workspace stays until chunk 21. Now in:
  [build plan v3.2, chunk 18](../../versions/v3/build-plan-v3.2.md#chunk-18--jam-engine-part-2-from-the-doodle-to-phrase-1),
  [chunk 21](../../versions/v3/build-plan-v3.2.md#chunk-21--a-fresh-jam-on-screen).

- **D457 (2026-11-03): phrase 2 is requested at phrase 1's hand-over; a Jam all of whose rungs fail ends at the deadline.**
  The driver's ruling under the owner's delegation of minor design calls, on chunk 18's two
  readings (639d0055). The captured way in (`module_session_start_without_phrase_one`) hands
  phrase 1 over with the time it sounds, at the barline where it is shown, and the session runs
  from there; so phrase 2 is requested then, still with the read-in measure plus three measures to
  its unchanged deadline. Every rung failing early still ends the Jam at the deadline, as "by the
  deadline" and v2's repeat at the deadline read. Rejected: requesting phrase 2 inside Jam's code
  before the hand-over. Now in: [Part C §C5.8](../../versions/v3/master-spec.md#c58-the-time-budget),
  [§C5.7](../../versions/v3/master-spec.md#c57-when-phrase-1-is-late-the-extended-wait-and-the-fallback),
  [build plan v3.2, chunk 18](../../versions/v3/build-plan-v3.2.md#chunk-18--jam-engine-part-2-from-the-doodle-to-phrase-1).

- **D460 (2026-11-04): wave 6's preflight corrections to the v3.2 plan, and gate CJ.**
  `documentalist`'s wave 6 preflight (2d4334b4, change set part W) into chunks 21, 30 and 23:
  files checked against the code, atoms, drift checks and revisions; chunk 21's capture says the
  review shows none of the controls taken from the doodle, carried for Jam's view (Part C §C5.16,
  `module_jam_session_end`). The driver's ruling: a Jam session's record keeps its preset label,
  as the STABLE contract says; only the row leaves the preset part out. CJ, the owner's wording
  sign-off on part W, blocks chunks 30's and 23's merges. Now in:
  [build plan v3.2, gates](../../versions/v3/build-plan-v3.2.md#gates),
  [chunk 21](../../versions/v3/build-plan-v3.2.md#chunk-21--a-fresh-jam-on-screen).

- **D490 (2026-11-04): the guide playback joins v3.2's scope.** The owner's request of 2026-11-04,
  amended the same day: a melody guide and a rhythm guide beside the backing, two independent
  switches, both off by default, plain Web Audio, no new library, session playback only. Now in:
  [Part C §C19](../../versions/v3/master-spec.md#c19-the-guide-playback), §C2, §C3, §C13, §C16 items
  50–52.

- **D491 (2026-11-04): the guide's minor calls, and its five layers.** `spec-writer`'s calls under
  the owner's delegation of minor design: a volume per guide (per-channel gains make it natural);
  the rhythm guide in C4–B4; a guide turned on sounds from its next planned note, one turned off is
  silent at once; a same-pitch re-attack fades the ringing note quickly; the attack is at most half
  the note, so every length plays; the release rings into a rest (O291); no export (O290). The
  layers are the owner's approved design. Now in:
  [Part C §C19](../../versions/v3/master-spec.md#c19-the-guide-playback), §C15.

- **D492 (2026-11-04): chunk 40 builds the guide in wave 7; gates GD and CG; hand check v3.2 HG.**
  `spec-writer`'s plan revision. No in-wave edge: chunks 24, 25, 32 and 33 touch neither the audio
  path nor the mix. GD, the guide's controls and tokens by `ux-writer`, blocks 40b; CG, the revised
  `req_session_audio_mix` (STABLE, on the contract), blocks chunk 40's merge. HG is a letter so it
  collides with no hand check another branch numbers. Now in:
  [build plan v3.2, chunk 40](../../versions/v3/build-plan-v3.2.md#chunk-40--the-guide-playback).

- **D493 (2026-11-04): a guide note rings on into a rest after it; closes O291.** The owner's
  ruling, "let it ring": a rest starts no note, and the note before it keeps its full release,
  with no quick fade before a rest. Now in:
  [Part C §C19.4](../../versions/v3/master-spec.md#c194-the-guides-voices), §C19.1,
  [build plan v3.2, chunk 40 and v3.2 HG](../../versions/v3/build-plan-v3.2.md#chunk-40--the-guide-playback).

- **D494 (2026-11-04): the guide playback is never exported; closes O290.** The owner's second
  ruling of the day: the guide has no role in the MIDI export. No guide note is written to the
  generated-notes MIDI file or to any other export, now or later; the exports are unchanged with
  the guides on. Now in: [Part C §C19.5](../../versions/v3/master-spec.md#c195-out-of-v32), §C2, §C17,
  [build plan v3.2, chunk 40](../../versions/v3/build-plan-v3.2.md#chunk-40--the-guide-playback).

- **D495 (2026-11-04): until phrase 1 is on screen, Jam's empty staff is the staff judged for room.**
  The driver's ruling under the owner's delegation of minor design calls, on chunk 21's reading
  (235d3920). Before phrase 1 enters, the session's watchers have no phrase to judge, so a window
  that leaves the empty staff no room (or a failed engraving of it) ends a fresh Jam as a count-in
  end; from the read-in measure on, the session's staff rule judges phrase 1. C5.13 named the end,
  not which staff. Now in: [Part C §C5.13](../../versions/v3/master-spec.md#c513-edge-cases-before-phrase-1-sounds).

- **D497 (2026-11-04): v3.2 H4 replays the doodle until wave 7; chunk 24 rewords H4 and H5.**
  `spec-writer`'s minor call on chunk 21's reading: H4 runs after wave 6, before chunk 24 keeps the
  doodle, so steps 3 to 5 play the same doodle again, and H5 starts each fresh Jam by Stop and
  Close review. Once the doodle is kept, Start Jam no longer captures, so both scripts would be
  wrong; chunk 24 rewords them. Now in:
  [build plan v3.2, H4](../../versions/v3/build-plan-v3.2.md#v32-h4--jam-listening-settings-drift-and-lock-l1),
  [chunk 24](../../versions/v3/build-plan-v3.2.md#chunk-24--the-kept-doodle).

- **D499 (2026-11-04): a Jam on a kept doodle is kept with no played-notes clock; chunk 24 reads it back.**
  `spec-writer`'s minor call on chunk 30's report (2cd6dfc3): C10.3 times its played notes from
  phrase 1 and gives the count-in clock to a fresh Jam only, so its body holds the kept doodle and
  no clock; nothing writes it yet and `keptJamPart` throws on it. Chunk 24 writes and reads it;
  chunk 25 lifts a doodle-only Jam's transitional very-short disable. Now in:
  [build plan v3.2, chunk 24](../../versions/v3/build-plan-v3.2.md#chunk-24--the-kept-doodle),
  [chunk 25](../../versions/v3/build-plan-v3.2.md#chunk-25--exports-open-with-the-doodle).

- **D500 (2026-11-04): gate CG covers change set part Y, the vision gap included.** The guide also
  changes `rule_settings_saved_on_change` (it lists the mix's saved settings) and the vision, whose
  out-of-scope lead-line playback D490 put in scope without updating it; CG is Y1–Y4 as one set
  (CONTRACT 13.0.0), then Y5's atoms. Now in: [Part C §C13](../../versions/v3/master-spec.md#c13-what-v32-changes-in-v2-v30-and-v31-guarantees-and-atoms),
  [build plan v3.2, gates](../../versions/v3/build-plan-v3.2.md#gates), [chunk 40](../../versions/v3/build-plan-v3.2.md#chunk-40--the-guide-playback).

- **D503 (2026-11-05): the kept doodle goes with its session when my instrument's deletion erases it.**
  `spec-writer`'s clarification of a gap chunk 24 left: deleting my instrument, or saving a change
  to its written range or transposition, deletes the kept sessions played with it after a warning,
  and C5.11 lets the kept doodle go whenever the player deletes the session it comes from, "deleted
  data is gone"; it listed only two of the paths. The code keeps the doodle there; a wave 7 fix after
  chunk 24 lets it go. Now in: [Part C §C5.11](../../versions/v3/master-spec.md#c511-the-kept-doodle-and-jam-again-on-this-doodle),
  [build plan v3.2, chunk 24](../../versions/v3/build-plan-v3.2.md#chunk-24--the-kept-doodle).

- **D504 (2026-11-05): the entry budget rises from 300 KiB to 320 KiB (327,680 B), now, in wave 7.**
  The owner's ruling ("Raise to 320 KiB now"): the entry chunk was at 302,365 B after chunk 24,
  4.8 kB left, with chunks 25, 32, 33 and 40 to come. O235 (what the budget measures) stays open.
  Now in: [Part C §C10.9](../../versions/v3/master-spec.md#c109-loading-jams-code-on-demand),
  [build plan v3.2, M4](../../versions/v3/build-plan-v3.2.md#m4--the-first-load-bundle).

- **D506 (2026-11-05): Jam's tempo stays 60 to 180 BPM in v3.2; 240 BPM is not kept (gate J240).**
  The owner's ruling, verbatim "Keep 180", on chunk 33's run at 240 BPM, which held (phrase 1 in
  every one of 7,384 Jams per configuration, one extended wait, slowest phrase 1 attempt 0.823 s
  against a 1.925 s cutover) and came with a recommendation to widen. Settles D404's best effort:
  chunk 33 ends after its first half, and no Jam item or check runs at 240. Now in:
  [Part C §C5.17](../../versions/v3/master-spec.md#c517-tempo-in-jam-and-tap-in),
  [§C16](../../versions/v3/master-spec.md#c16-definition-of-done),
  [build plan v3.2, gates](../../versions/v3/build-plan-v3.2.md#gates), [chunk 33](../../versions/v3/build-plan-v3.2.md#chunk-33--240-bpm-in-jam-best-effort).

- **D508 (2026-11-05): "Jam again on this doodle" is offered in every Jam session's review, the one
  that follows a Jam included.** A clarification: there, Jam mode keeping that doodle already, it
  does what `Close review` does, focus included, as the design (ux D470) and the build have it;
  C5.11 said that review needed no such action. Now in: [Part C §C5.11](../../versions/v3/master-spec.md#c511-the-kept-doodle-and-jam-again-on-this-doodle),
  [§C16, item 33](../../versions/v3/master-spec.md#c16-definition-of-done).

- **D509 (2026-11-05): the guide's exactness on triplets and ties across a barline is checked on
  hand-built phrases.** The generator writes neither (chunk 40's finding), so seeded phrases hold
  ties, rests and offbeat eighths; the guarantee is unchanged: the guides place any length exactly
  and refuse none. Now in: [Part C §C19.1](../../versions/v3/master-spec.md#c191-what-each-guide-plays),
  [§C16, item 50](../../versions/v3/master-spec.md#c16-definition-of-done),
  [build plan v3.2, chunk 40](../../versions/v3/build-plan-v3.2.md#chunk-40--the-guide-playback).
