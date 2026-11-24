# v3 Archive

Status: archived 2026-10-16 (the v3.0 release); extended 2026-10-21 (the v3.1 release),
2026-11-09 (O306's note), 2026-11-09 (the v3.2 release), 2026-11-22 (the v3.3 release) and
2026-11-24 (the v3.4 release)

v3.0, storage, is released as version 3.0.0: the release gate, build plan
[chunk 26](../../versions/v3/build-plan.md#chunk-26--v30-release-gate), passed on 2026-10-16, the
tag `v3.0.0` is at e288d98, and the app is deployed (D348). The
[release notes](../../../docs/release/v3.0-release-notes.md) hold the evidence for every definition
of done item. This folder holds v3.0's working record, from the v2.0 release record and v3's
direction (2026-10-07) to the release gate's final sync. What v3.0 does is stated in
[master spec Part A](../../versions/v3/master-spec.md#part-a--v30). v3.2, v3.3 and v3.4 are not
built yet; their records stay live and will be archived here at their own releases. v3.1's record
was archived here at its release, on 2026-10-21: see [v3.1 release](#v31-release-archived-2026-10-21)
below, which also says what of v3.0's "left in place" list it moved. v3.2's record was archived here at its
release, on 2026-11-09: see [v3.2 release](#v32-release-archived-2026-11-09) below. v3.3's record
was archived here after its release, on 2026-11-22: see
[v3.3 release](#v33-release-archived-2026-11-22) below. v3.4's record was archived here after
its release, on 2026-11-24: see [v3.4 release](#v34-release-archived-2026-11-24) below.

## Archived here

- [decisions-D208-D227.md](decisions-D208-D227.md): decisions D208–D227, kept verbatim: the v2.0
  release record, v3's direction and release split, the approval of the v3.0 drafts, the v3.0
  master spec and design, and the last precisions before the build.
- [decisions-D252-D258.md](decisions-D252-D258.md): decisions D252–D258, kept verbatim: the
  wave-level build workflow and the owner's rulings after the v3.0 wave-1 intent preflight.
- [decisions-D290-D343.md](decisions-D290-D343.md): decisions D290–D343, kept verbatim: the v3.0
  build, from the wave-2 intent preflight to the release gate's final sync.
- [open-questions-history.md](open-questions-history.md): the notes the live register kept on the
  questions closed during v3.0 (O163, O164, O181, O182, O200, O201, O210, O211, O220), with its
  header paragraph on open and closed questions, kept verbatim.
- [readme-status-snapshot.md](readme-status-snapshot.md): the spec index's status snapshot
  (`specs/README.md`, draft v0.71), a running record of v3's direction and of the v3.0 build,
  kept verbatim.
- [v3-readme-status.md](v3-readme-status.md): the v3 README's `Status:` paragraph as it stood at
  the release, kept verbatim.
- The five v3.0 drafts, approved by the owner (D216) and consolidated into master spec Part A
  (D217): [persistence.md](persistence.md) (now §4), [kept-sessions.md](kept-sessions.md) (now §5
  and §6), [my-instrument.md](my-instrument.md) (now §7),
  [pre-generation.md](pre-generation.md) (now §8) and [stray-notes.md](stray-notes.md) (now §9).
- [storage-grounding.md](storage-grounding.md): the research into the code before v3.0 that the
  v3.0 spec and build plan relied on (now summarized in §11).

The decision ranges D228–D251 (v3.1 and v3.2) and D261–D288 (v3.3) are not archived: they rule
releases not built yet. D259 and D260 are on branch `v4-accompaniment-research`; D289 is unused.
The live [decisions log](../../decisions.md) records this archive as D348 and continues from D349.

## Where each archived decision now lives

Section numbers (§) are those of
[master spec Part A](../../versions/v3/master-spec.md#part-a--v30); Parts B and C are the same
file's v3.1 and v3.2 parts. "History" marks a decision that is superseded, or that only recorded
an approval, a correction or a release event; it has no live home.

### D208–D227

| Decision(s) | Subject                                                                                                                                                                        | Now lives in                                                                                                           |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------- |
| D209        | Jam named, v3's lead feature, with three candidates                                                                                                                            | Part C; [v3 README](../../versions/v3/README.md#jam-growing-the-players-doodle)                                        |
| D210        | Embellishment flags and player-made presets in v3; sequence writing a later candidate                                                                                          | Part B; [roadmap](../../roadmap.md#candidates-not-committed)                                                           |
| D211, D212  | v3 split into releases, v3.0.1 merged into v3.0, two items moved to v4, four dropped; where research goes                                                                      | [v3 README](../../versions/v3/README.md#releases-d211), [v4](../../versions/v4/README.md), [roadmap](../../roadmap.md) |
| D213, D214  | A played signal is a bar the player plays on purpose, never displayed; the term                                                                                                | [v3 README, v3.x](../../versions/v3/README.md#v3x--learning-from-positive-signals)                                     |
| D215        | A Jam doodle ends on a silent bar or after four bars of notes                                                                                                                  | Part C                                                                                                                 |
| D216        | The v3 recommendations approved: v3.0 saving, kept sessions, favorites, my instrument, pre-generation, stray notes; v3.1 figures; v3.2 Jam, the suggestion and the rhythm lock | §4–§9; Part B; Part C                                                                                                  |
| D217        | v3.0 consolidated; the consolidation's calls; presets scoped down                                                                                                              | §4, §5.1, §6, §7; Part B §B6                                                                                           |
| D218, D222  | Disconnect forgets the remembered controller; the audio-unlock rule widens; item 6's wording                                                                                   | §7.3, §10, §13 items 6 and 18                                                                                          |
| D219        | The behaviours the v3.0 design settled                                                                                                                                         | §4.4, §5.1, §5.3, §6, §7.1, §7.3                                                                                       |
| D220        | Five gaps the build plan found: pre-generated phrases, the transposition, what discards pre-generation, persistent storage, the outdated tab                                   | §4.3, §4.5, §7.1, §8 (the transposition's entry as later revised by D253, D257 and D291)                               |
| D223–D227   | No deletion in an outdated tab; a failed-read visit offers Delete everything only, and none once newer data is known                                                           | §4.3, §4.4, §13 item 14                                                                                                |
| D208        | The v2.0 release gate closed; v2's record archived                                                                                                                             | History: a release event ([v2 archive](../v2/README.md))                                                               |
| D221        | The owner's final review of v3.0: approved; contract part A confirmed                                                                                                          | History: an approval, applied in `docs/` by `documentalist`                                                            |

### D252–D258

| Decision(s) | Subject                                                                                                    | Now lives in                                                                                                                                                                                                                  |
| ----------- | ---------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D252        | Build plans run wave by wave; a chunk checks only its own change                                           | [Versions convention](../../versions/README.md#convention); §3 of the [v3.1](../../versions/v3/build-plan-v3.1.md), [v3.2](../../versions/v3/build-plan-v3.2.md) and [v3.3](../../versions/v3/build-plan-v3.3.md) build plans |
| D253, D257  | My instrument's transposition entered in semitones with one direction; its interval name derived and shown | §7.1, §7.2                                                                                                                                                                                                                    |
| D254        | My instrument's fixed id, `my-instrument`                                                                  | §7.1, §12                                                                                                                                                                                                                     |
| D255, D258  | The session-wide record and its session seed                                                               | §5.2, §8                                                                                                                                                                                                                      |
| D256        | The Part D wording of `rule_ephemeral_session_state` confirmed                                             | History: an approval, applied in `docs/` by `documentalist`                                                                                                                                                                   |

### D290–D343

| Decision(s)                                                                         | Subject                                                                                                                                                    | Now lives in                                                                                                            |
| ----------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| D290                                                                                | A background pre-generation attempt gives way to any player request at Idle                                                                                | §8, §10                                                                                                                 |
| D291                                                                                | A written key with two spellings takes the one with fewer sharps or flats                                                                                  | §7.1, §12                                                                                                               |
| D292                                                                                | The staff's shared height follows my instrument's written range                                                                                            | §7.1                                                                                                                    |
| D293, D294                                                                          | My instrument's clef, treble or bass; its written range bound per clef                                                                                     | §7.1, §12, §13 item 16, §14 (O180 stays open)                                                                           |
| D295, D296                                                                          | Kept sessions belong to their instrument; what each change of my instrument does                                                                           | §5.1, §5.4, §7.1, §7.2, §8, §10                                                                                         |
| D297, D339                                                                          | A stale phrase 1 at Start: Regenerate or Use it; the starting note asks too                                                                                | §16, §10                                                                                                                |
| D298                                                                                | Pre-generation runs after the prewarm is posted                                                                                                            | §8 (O183 stays open)                                                                                                    |
| D299                                                                                | The kept-session size is the build's measurement                                                                                                           | §5.2                                                                                                                    |
| D309, D328                                                                          | A session cut short by reloading or closing the page is never saved; a page the back-forward cache brings back                                             | §5.1; build plan chunk 27                                                                                               |
| D310                                                                                | A kept session the app cannot read correctly is deleted, with an apology                                                                                   | §5.1, §13 item 6; build plan chunk 28                                                                                   |
| D314, D320                                                                          | Remembering the controller, the seventh contract change, confirmed as major                                                                                | §7.3, §10                                                                                                               |
| D318, D323                                                                          | A visit that saves nothing neither remembers nor forgets the controller; a controller reselected at load is not checked again                              | §7.3, §13 item 18                                                                                                       |
| D319                                                                                | `Export played notes` is not offered for a file with no note (ux D308)                                                                                     | The v3.0 design in `ui_ux/`; build plan chunk 25                                                                        |
| D321, D322                                                                          | Stray notes are caught by length, mostly; the 38 ms threshold kept                                                                                         | §9, §14                                                                                                                 |
| D324                                                                                | In a favorites-only file the favorite phrases follow each other from time zero                                                                             | §6                                                                                                                      |
| D331                                                                                | Another tab's Delete everything outdates every other open tab                                                                                              | §4.3                                                                                                                    |
| D335                                                                                | The transposition check's action also selects my instrument, and is not offered past MIDI's range                                                          | §7.2                                                                                                                    |
| D340, D342                                                                          | The hand-check ruling; H8 and H5's played-notes-export half follow the tag                                                                                 | Build plan chunk 26; [v3.0.x notes](../../versions/v3/README.md#v30x-notes-after-the-tag)                               |
| D300–D307, D311–D313, D315–D317, D325, D326, D329, D330, D332–D334, D336–D338, D341 | Calls on the build, under the owner's delegation: chunk scopes, splits and file orders, the preflights' corrections, the captures and the edges they found | The [v3.0 build plan](../../versions/v3/build-plan.md), in the chunk each names; the behaviour they read stays in §4–§9 |
| D308                                                                                | O201 opened; chunk 27 inserted                                                                                                                             | History: answered by D309                                                                                               |
| D327                                                                                | The successor after a damaged session's deletion                                                                                                           | History: a wording correction to D310 (build plan chunk 28)                                                             |
| D343                                                                                | The final sync's promotions; CONTRACT 6.3                                                                                                                  | History: an approval, applied in `docs/` by `documentalist` (build plan chunk 26)                                       |

## Where each closed question now lives

The answers are in the decisions named, and stated as settled fact where the tables above put
those decisions.

| Question(s)                       | Decision(s)    | Now lives in                                                                       |
| --------------------------------- | -------------- | ---------------------------------------------------------------------------------- |
| O117, O119                        | D212           | [v3 README](../../versions/v3/README.md#releases-d211); Part C                     |
| O120                              | D213           | [v3 README, v3.x](../../versions/v3/README.md#v3x--learning-from-positive-signals) |
| O86, O107–O111, O122–O124         | D216           | §2, §4–§8                                                                          |
| O47, O112, O113, O118, O121, O125 | D216           | Part B (O47); Part C (the others)                                                  |
| O163, O164                        | D257, D258     | §7.1, §5.2                                                                         |
| O181                              | D295, D296     | §5.1, §7.1                                                                         |
| O182                              | D297           | §16                                                                                |
| O200                              | D310           | §5.1                                                                               |
| O201                              | D309           | §5.1                                                                               |
| O210                              | D319 (ux D308) | The v3.0 design in `ui_ux/`; build plan chunk 25                                   |
| O211                              | D322           | §9                                                                                 |
| O220                              | D342           | [v3.0.x notes](../../versions/v3/README.md#v30x-notes-after-the-tag)               |

O48, O49, O100–O102, O115, O116, O176, O180, O183 and O190, which these notes mention, stay open
in the live [register](../../open-questions.md). The questions D228–D234 closed for v3.1 and v3.2
(O10 for v3.2, O103, O114, O126, O127–O157, O160–O162) are answered in live decisions and in
Parts B and C.

## Left in place

These v3 documents stay where they are.

| Document                                                       | Role                                                                                                                                                                                   | Referenced from                                                                                           |
| -------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| [versions/v3/master-spec.md](../../versions/v3/master-spec.md) | Part A is the contract for the running code; Parts B, C and D are the next releases'                                                                                                   | `docs/`, `issues/`, `ui_ux/`, `specs/`                                                                    |
| [versions/v3/build-plan.md](../../versions/v3/build-plan.md)   | The v3.0 build plan, complete; chunk 26 is the release gate's record, and it holds the build calls the tables above point to                                                           | `docs/release/v3.0-release-notes.md`, `docs/midi-tuning.md`, `HARDWARE-CHECKLIST.md`, `issues/`, `specs/` |
| [versions/v3/README.md](../../versions/v3/README.md)           | The version's scope across v3.0–v3.x, and the live [v3.0.x notes](../../versions/v3/README.md#v30x-notes-after-the-tag); its v3.0 sections keep the direction recorded before the spec | `docs/music/`, `specs/` (`personas.md`, `roadmap.md`, `versions/`), the v2 archive                        |
| `versions/v3/` v3.1–v3.3 documents                             | The v3.1 and v3.2 drafts, the Jam grounding and the v3.1–v3.3 build plans, for releases not built yet                                                                                  | `specs/`, `docs/music/`                                                                                   |

Release evidence lives in [`docs/release/`](../../../docs/release/), and the hand checks that follow
the tag are listed in the [v3.0.x notes](../../versions/v3/README.md#v30x-notes-after-the-tag).

## v3.1 release (archived 2026-10-21)

v3.1, embellishment figures and presets, is released as version 3.1.0: the release gate, build
plan [chunk 21][c21], passed its automated part on 2026-10-21, the owner gave his go, and the tag
`v3.1.0` is on `main` at 55364e7 (D397). The [release notes](../../../docs/release/v3.1-release-notes.md)
hold the evidence. What v3.1 does is stated in [master spec Part B][partb]. The owner's hand checks
v3.1 H3, H4 and H5 follow the tag, with the 13 promotions waiting on them; they stay live in the
[v3.1.x notes](../../versions/v3/README.md#v31x-notes-after-the-tag), and the decisions that track
them (D392, D396, D397) stay in the live [decisions log](../../decisions.md). The live log records
this archive as D398 and continues from D399.

### Archived at the v3.1 release

- [decisions-D228-D231.md](decisions-D228-D231.md): decisions D228–D231, kept verbatim: the owner's
  first rulings on v3.1's presets and their key and mode restriction.
- [decisions-D353-D388.md](decisions-D353-D388.md): decisions D353–D388, kept verbatim: the v3.1
  build, from the owner's approval of the v3.1 design (gate D0) to his acceptance at wave 5.
- [decisions-D390-D391.md](decisions-D390-D391.md): decisions D390 and D391, kept verbatim: the
  wave-5 sign-offs and the owner's pass of hand checks H1 and H2.
- [open-questions-O231-O233.md](open-questions-O231-O233.md): the notes the live register kept on
  the questions closed during v3.1 (O231–O233), with its header paragraph on open and closed
  questions, kept verbatim.
- [readme-status-snapshot-v3.1.md](readme-status-snapshot-v3.1.md): the spec index's status
  snapshot (`specs/README.md`, draft v0.81), a running record of the v3.1 build, kept verbatim.
- [v3-readme-status-v3.1.md](v3-readme-status-v3.1.md): the v3 README's `Status:` paragraph as it
  stood at the release, kept verbatim.
- The two v3.1 drafts, approved by the owner as proposed (D233) and consolidated into master spec
  Part B (D235): [embellishment-flags.md](embellishment-flags.md) (now [B5][b5]) and
  [presets.md](presets.md) (now [B6][b6]). They were written from `specs/versions/v3/`.

Not archived, though v3.1's: D233, D235, D242 and D250 sit among v3.2's decisions in D232–D251,
and D237, D239 and D246 rule both releases; that range is archived whole at v3.2's release. D389
and D393–D395 (v3.4) and D392, D396 and D397 (v3.1's release gate, whose hand checks are still
open) stay live, as do D344–D348 (v3.0's release and its open v3.0.x notes) and D349–D352 (the
plan migrations, two of which shape the v3.2 and v3.3 plans).

### Where each v3.1 decision now lives

Section numbers (B5, B6, …) are those of [master spec Part B][partb]; "plan" is the
[v3.1 build plan](../../versions/v3/build-plan-v3.1.md), complete and left in place. "History"
marks a decision that is superseded, or that only recorded an approval, a gate event, an interim
state or a fix; it has no live home.

#### D228–D231

| Decision(s) | Subject | Now lives in |
| --- | --- | --- |
| D228 | Presets are generator configuration: what a preset holds, built-ins the project provides, how a player makes one, no tie to my instrument; richer presets later | [B6.1][b61], [B6.5][b65], [B6.6][b66]; later presets: [B2][b2] and the [endgame](../../vision/endgame.md); the selector's place: the v3.1 design in `ui_ux/` |
| D229, D230 | A preset may carry a key and mode restriction, and choosing it may move the key and mode | [B6.2][b62], [B6.3][b63] |
| D231 | The restriction guides and never blocks; Vary settings stays inside it | [B6.4][b64], [B8.1][b81] |

#### D353–D388

| Decision(s) | Subject | Now lives in |
| --- | --- | --- |
| D358 | B12's code facts checked against v3.0 | [B12][b12] |
| D359 | The entry budget is 300 KiB (O231) | [B12][b12]; plan [M4][m4] |
| D361, D362 | v3.1's revisions of v3.0's STABLE atoms take a MAJOR bump; `rule_open_phrase_ending` reworded | [B11][b11]; plan [gates][gates], [chunk 12][c12] |
| D364, D367, D370 | The data version 2 step reads both version 1 shapes and a third; each kept-session shape keeps its own data version | Plan [chunk 8][c8], [chunk 9][c9] |
| D365, D371 | A kept session's summary takes its profile from the session history; the label in B9's form | [B9][b9]; plan [chunk 8][c8], [chunk 9][c9], [chunk 12][c12] |
| D368 | The tense note at a join follows the levels like a free scale note (O232) | [B5.4][b54] |
| D369 | A favored free scale tone is tried first as the drawn figure | [B5.2][b52]; plan [chunk 6][c6] |
| D373 | The review's summary gives the session's length | Plan [chunk 22][c22] |
| D376 | v3.0's sessions are carried over at open only; the rare overrun is accepted (O233) | [B9][b9]; plan [M3][m3] |
| D378, D379 | The passing-and-neighbor rule does not ship; the cost guard's settings | [B5.6][b56], [B14][b14] item 9; plan [decision point][dp], [M1][m1], [M2][m2] |
| D381 | The last "musical profile" strings | Plan [chunk 13][c13], [chunk 18][c18] |
| D384, D385 | The key and mode marks keep the restriction in force at Start for the whole session | [B6.4][b64]; plan [chunk 13][c13] |
| D386, D387 | The preset actions are refused only while a session runs; the preset-list action saves the selection it changes | [B7][b7]; plan [chunk 17][c17] |
| D388 | Choosing again the option a control already shows makes Custom | [B6.4][b64], [B8.3][b83] |
| D356, D366, D372 | Plan v4's waves; waves 1 and 2's preflight corrections | Plan [waves][waves], [Read first][rf], [chunk 4][c4], [chunk 6][c6], [chunk 7][c7], [chunk 9][c9] |
| D375, D380 | A hole in a timeline's measures (ISS-013); the settings codec's throw (ISS-014) | [ISS-013](../../../issues/Ref_20261019_timeline_parser_accepts_holes.md), [ISS-014](../../../issues/Ref_20261020_settings_codec_throws_on_bigint.md) |
| D353 | Gate D0: the owner approves the v3.1 design | History: an approval; the design is frozen in `ui_ux/versions/v3.1/` |
| D354 | Gate R0 met | History: a gate event (plan [gates][gates]) |
| D355 | Gate T1 not given | History: reversed by D382 |
| D357 | The owner approves plan v4 with its transitional state | History: an approval |
| D360, D363 | The STABLE tag override; gate CS cleared, change set part J, CONTRACT 7.0.0 | History: approvals, applied in `docs/` by `documentalist` |
| D374 | M3's version 2 decision; O233 opened | History: answered by D376 |
| D377 | The device keeps v3.0's selection until chunk 16 | History: an interim state inside wave 3 (plan [chunk 12][c12]) |
| D382 | Gate T1 given | History: a gate event (plan [gates][gates], [chunk 1][c1]) |
| D383 | ISS-014 fixed before wave 3 merged | History: a fix ([ISS-014](../../../issues/Ref_20261020_settings_codec_throws_on_bigint.md#change-log)) |
| D385 (sign-offs) | Five atoms to REVIEW and one rewording at wave 4 | History: an approval, applied in `docs/` by `documentalist` |

#### D390–D391

| Decision(s) | Subject | Now lives in |
| --- | --- | --- |
| D390 | The wave-5 sync's sign-offs | History: an approval, applied in `docs/` by `documentalist` |
| D391 | H1 and H2 passed on the owner's word; gates L1 and L2 done with no tuning | Plan [gates][gates], [hand checks][hc], [chunk 21][c21] |

### Where each closed v3.1 question now lives

| Question | Decision | Now lives in |
| --- | --- | --- |
| O231 | D359 | [B12][b12]; plan [M4][m4] |
| O232 | D368 | [B5.4][b54] |
| O233 | D376 | [B9][b9]; plan [M3][m3] |

O48, O49, O100–O102, O115, O116, O176, O180, O183, O190, O230 and O234–O246 stay open in the live
[register](../../open-questions.md).

### Left in place at the v3.1 release

| Document | Role | Referenced from |
| --- | --- | --- |
| [versions/v3/master-spec.md](../../versions/v3/master-spec.md) | Parts A and B are the contract for the running code; Parts C and D are the next releases' | `docs/`, `issues/`, `ui_ux/`, `specs/` |
| [versions/v3/build-plan-v3.1.md](../../versions/v3/build-plan-v3.1.md) | The v3.1 build plan, complete; chunk 21 is the release gate's record, its hand checks H3–H5 are still to run, and it holds the build calls the tables above point to | `docs/release/`, `docs/music/`, `HARDWARE-CHECKLIST.md`, `issues/`, `ui_ux/`, `specs/` |
| [versions/v3/wave-log-v3.1.md](../../versions/v3/wave-log-v3.1.md) | The wave driver's record of the v3.1 build; it may still record H3–H5 and their promotions | `docs/release/v3.1-release-notes.md`, `specs/` |
| [versions/v3/build-workflow.md](../../versions/v3/build-workflow.md) | The shared v3 build workflow, which the v3.2 and v3.3 plans follow | `specs/` |
| [versions/v3/README.md](../../versions/v3/README.md) | The version's scope, and the live v3.0.x and v3.1.x notes | `docs/music/`, `specs/`, the v2 archive |
| `versions/v3/` v3.2–v3.4 documents | The v3.2 drafts and Jam grounding, the v3.2 and v3.3 build plans, and v3.4's two scoping drafts, for releases not built yet | `specs/`, `docs/music/` |

The two v3.1 drafts, which the v3.0 pass left in place among "v3.1–v3.3 documents", are now archived
here.

## O306 (archived 2026-11-09)

- [open-questions-O306.md](open-questions-O306.md): the live register's note on O306, whether v3.3
  may start before v3.2 is released, kept verbatim. The owner's ruling closed it on 2026-11-09
  (D521), which went further than the note's option B: v3.2 is released as built, before its hand
  and listening checks. v3.2's and v3.3's records stay live.

| Question | Decision | Now lives in |
| --- | --- | --- |
| O306 | D521 | [v3.2 plan, chunk 27](../../versions/v3/build-plan-v3.2.md#chunk-27--v32-release-gate); [v3.3 plan, gate R0](../../versions/v3/build-plan-v3.3.md#gates); [v3.2.x notes](../../versions/v3/README.md#v32x-notes-after-the-tag) |

## v3.2 release (archived 2026-11-09)

v3.2, Jam, the key and mode suggestion, the rhythm lock and the guide playback, is released as
version 3.2.0: by the owner's ruling (D521) the release gate, build plan [chunk 27][c27v32], ran
its machine half, the owner gave his go, and the tag `v3.2.0` is on `main` at f93e552d (D523).
The [release notes](../../../docs/release/v3.2-release-notes.md) hold the evidence. What v3.2
does is stated in [master spec Part C][partc]. The owner's hand and listening checks (gates L1,
L2 and L3, hand checks H3, H7, H8 and HG, the Travel Sax recordings of gate DR) and O267 follow
the tag; they stay live in the plan's [follow-ups after the tag][c27fu], in the
[v3.2.x notes](../../versions/v3/README.md#v32x-notes-after-the-tag) and in the live
[register](../../open-questions.md) (O267, O269, O271). The decisions that track them stay in the
live [decisions log](../../decisions.md): D406 (Jam's four answers, provisional until those
checks; the plan's [what confirms them][d406c]) and D521–D523 (the release as built, its
contract as built, the go and the tag). The live log records this archive as D524.

### Archived at the v3.2 release

- [decisions-D232-D251.md](decisions-D232-D251.md): decisions D232–D251, kept verbatim: the
  v3.2 drafts and their approval, master spec Part C v1.0, its approval and the precisions that
  followed, with v3.1's D233, D235, D242 and D250 interleaved and D237, D239 and D246 ruling both
  releases.
- [decisions-D392.md](decisions-D392.md): decision D392, kept verbatim: v3.1's release gate, run
  without hand checks H3–H5.
- [decisions-D396-D405.md](decisions-D396-D405.md): decisions D396–D405, kept verbatim: v3.1's
  release sync, the owner's go, its archive and the closing of its hand checks (D396–D399), then
  v3.2's Jam re-scope (D400–D405).
- [decisions-D407-D509.md](decisions-D407-D509.md): decisions D407–D509, kept verbatim: the
  v3.2 build, from the approved re-scoped Part C (D409–D410) through wave 7, including the guide
  playback (D490–D494, D500, D509).
- [open-questions-history-v3.2.md](open-questions-history-v3.2.md): the notes the live register
  kept on the questions closed during v3.2 (O247–O266, O268, O290 and O291), with its header
  paragraph on open and closed questions, kept verbatim.
- [readme-status-snapshot-v3.2.md](readme-status-snapshot-v3.2.md): the spec index's status
  snapshot (`specs/README.md`, draft v0.91), a running record of the v3.2 build, kept verbatim.
- [v3-readme-status-v3.2.md](v3-readme-status-v3.2.md): the v3 README's `Status:` paragraph as it
  stood at the release, kept verbatim.
- The three v3.2 drafts of 2026-10-08, approved by the owner (D232 for the rhythm lock, D234 for
  the rest), consolidated into master spec Part C v1.0 (D238, D239) and re-scoped with Jam as its
  own mode (D400–D410): [jam.md](jam.md), [key-and-mode-suggestion.md](key-and-mode-suggestion.md)
  and [rhythm-lock.md](rhythm-lock.md). They were written from `specs/versions/v3/`.
- [jam-grounding.md](jam-grounding.md): the research into the code before v3.2 that the v3.2
  spec and build plan relied on, refreshed at 3.1.0 (D409); Part C states the code as built
  (C14). Written from `specs/versions/v3/`.

Not archived, though v3.2's: D406 and D521–D523 (above). D344–D348 (v3.0's release, whose v3.0.x
notes are still open), D349–D352 (the plan migrations, kept together with D351, which shapes the
v3.3 plan), D259–D260 (style packs, no version), D261–D288 and D511–D520 (v3.3) and D389 and
D393–D395 (v3.4) stay live. v3.1's last live decisions, D392 and D396–D399, are archived here:
D399 closed v3.1's hand checks after the tag. The unused IDs in D407–D509 (D458, D459,
D461–D489, D496, D498, D501, D502, D505, D507) were reserved by other worktrees and never issued.

### Where each v3.2 decision now lives

Section numbers (C5, C7, …) are those of [master spec Part C][partc]; "plan" is the
[v3.2 build plan](../../versions/v3/build-plan-v3.2.md), complete and left in place. "History"
marks a decision that is superseded, or that only recorded an approval, a gate event, an interim
state or a fix; it has no live home. v3.1's decisions point at [master spec Part B][partb] (B5,
B6, …) and the [v3.1 build plan](../../versions/v3/build-plan-v3.1.md); "Jam mode" is the
re-scope draft [jam-mode.md](../../versions/v3/jam-mode.md), left in place.

#### D232–D251

| Decision(s) | Subject | Now lives in |
| --- | --- | --- |
| D232 | The rhythm lock is strict; allowed rhythm changes, each lasting one phrase; wider options in v4 | [C7.1][pc71], [C7.2][pc72], [C7.4][pc74]; wider options: [v4](../../versions/v5-plus/README.md#moved-from-v4-d553) |
| D233 | v3.1 drafts approved: seven figures and four levels, eight built-in presets, the figure step; ornaments later | [B2][b2], [B5][b5], [B6][b6], [B8.1][b81], [B9][b9] |
| D234 | v3.2 drafts approved: the path to phrase 1, the doodle's two forms, the suggestion, matching by shape, planner authority | [C5][pc5] (C5.2–C5.10, C5.14), [C6][pc6], [C11][pc11]; the Jam switch: superseded by D400 ([C5.1][pc51]) |
| D235 | Gaps settled while consolidating Part B v1.0, and its terms | [B4][b4], [B6.3][b63], [B6.4][b64], [B6.6][b66], [B7][b7], [B8.1][b81], [B9][b9], [B11][b11] |
| D236 | The rhythm lock's five kinds, draws and saving; Jam's and the suggestion's draft-v2 gaps | [C7.1][pc71]–[C7.5][pc75], [C10.1][pc101], [C5.13][pc513], [C6.2][pc62], [C6.5][pc65]; the shares 1 in 4 and 1 in 2: superseded by D450 ([C7.4][pc74]); the Jam switch and Jam's session options: superseded by D400–D408 ([C5.1][pc51], [C5.16][pc516]) |
| D237 | One term per concept across Parts B and C; "Use it" changes the key and mode as by hand | [B4][b4], [C4][pc4], [C6.5][pc65], [C9][pc9] |
| D238 | Gaps settled while consolidating Part C v1.0 | [C5.2][pc52], [C5.9][pc59], [C5.11][pc511], [C5.14][pc514], [C5.15][pc515], [C6.5][pc65], [C7.1][pc71], [C9][pc9], [C10][pc10]; figures in the doodle: [C17][pc17]; the changes that dropped the held doodle: superseded by D408 ([C5.11][pc511]) |
| D240, D241 | The silence timer, and a controller lost, before a Jam's phrase 1 | [C5.13][pc513]; contract: [C13][pc13] |
| D242 | "Save changes" asks the restriction only outside it | [B6.6][b66] |
| D244 | A Jam played on a kept doodle keeps it | [C5.11][pc511]; "a fresh Jam's doodle is never held": superseded by D408 |
| D245 | Part C's contract list completed | [C13][pc13] |
| D247, D248 | Deleting a kept Jam session lets its doodle go; a Jam on a kept doodle ending in its count-in keeps it | [C5.11][pc511], [C5.13][pc513], [C10.7][pc107] |
| D249 | The "no mode fits" sentence in every review of that Jam | [C6.3][pc63] |
| D250 | Four precisions to Part B for the v3.1 build plan | [B7][b7], [B9][b9] |
| D251 | Five precisions to Part C for the v3.2 build plan | [C6.2][pc62], [C7.1][pc71], [C7.3][pc73], [C7.4][pc74], [C11][pc11] |
| D239 | The owner approves Parts B and C v1.0, and the finishing order | History: an approval |
| D243 | Leaving Jam at Idle leaves the workspace empty | History: superseded by D400 (leaving Jam mode returns session mode as it was); Jam mode's empty Idle: [C5.1][pc51] |
| D246 | The owner confirms the v3.1 and v3.2 contract and vision wording | History: an approval, applied in `docs/` by `documentalist` |

#### D392

| Decision(s) | Subject | Now lives in |
| --- | --- | --- |
| D392 | v3.1's release gate runs its automated part; H3–H5 left to the owner | History: a gate event, amended by D397 and closed by D399 (v3.1 plan [hand checks][hc], [chunk 21][c21]) |

#### D396–D405

| Decision(s) | Subject | Now lives in |
| --- | --- | --- |
| D399 | v3.1's hand checks closed after the tag; Chrome the one supported browser | [Context of use](../../personas.md#context-of-use); v3.1 plan [hand checks][hc]; [v3.1.x notes](../../versions/v3/README.md#v31x-notes-after-the-tag) |
| D400 | Jam is its own mode; the app opens in session mode | [C5.1][pc51]; [Jam mode §2][jm2] |
| D401 | Jam has its own settings set | [C5.16][pc516]; [Jam mode §3][jm3] |
| D402 | Jam's code loads on demand | [C10.9][pc109]; [Jam mode §2][jm2] |
| D403 | One shared generator, Jam's steering at its edges | [C5.9][pc59], [C15][pc15]; [Jam mode §4][jm4] |
| D404 | Jam's tempo target 120 to 180 BPM, 240 BPM best effort | [C5.17][pc517] (240 BPM dropped by D506); [Jam mode §5][jm5] |
| D396 | The v3.1 release sync's proposals accepted | History: an approval, applied in `docs/` by `documentalist` (v3.1 plan [chunk 21][c21]) |
| D397 | The owner's go; `3.1.0` tagged, H3–H5 after the tag | History: a gate event (v3.1 plan [chunk 21][c21], [hand checks][hc]) |
| D398 | v3.1 released and its record archived | History: an archive event ([v3.1 release](#v31-release-archived-2026-10-21)) |
| D405 | v3.2 re-scoped around D400–D404, Part C reopened | History: an interim state, closed by D409's Part C v1.1; [Jam mode §6][jm6] |

#### D407–D509

"Still open after the tag" marks a decision whose follow-up check or question is still owed; its
home is the plan section that carries the check and, for a question, the live
[register](../../open-questions.md).

| Decision(s) | Subject | Now lives in |
| --- | --- | --- |
| D407 | The mode switches at Idle only; a Jam needs a MIDI controller (O251) | [C5.1][pc51]; [Jam mode §2][jm2] |
| D408 | The re-scope's other proposals (O250, O252, O254–O259): 60–180 BPM, the seam, the kept doodle, one list and one review, session-mode work first, the bundle policy, scripted checks | [Jam mode][jm]; [C5.11][pc511], [C5.15][pc515], [C5.17][pc517], [C10.9][pc109], [C15][pc15]; plan [waves][p32waves], [hand checks][p32hc]; the one MAJOR bump: superseded by D422 ([C13][pc13]) |
| D410 | Part C v1.1's seven proposed answers (O260–O266), written into v1.2 | [C5.1][pc51], [C5.2][pc52], [C5.8][pc58], [C5.14][pc514], [C5.16][pc516], [C5.16.1][pc5161], [C5.17][pc517], [C17][pc17]; plan [chunk 12][p32c12] |
| D411 | ux Q81–Q87 as `ux-writer` recommended: Jam's first values, tap-in | [C5.11][pc511], [C5.16][pc516], [C5.17][pc517], [C10.5][pc105]; Part D [D8.4][pd84] |
| D413 | "The held doodle" becomes "the kept doodle" | [C4][pc4]; [lexicon, Kept doodle](../../../docs/music/lexicon.md#kept-doodle) |
| D414 | Phones are a third-rate client | [Context of use](../../personas.md#context-of-use); [C10.8][pc108] |
| D415 | The doodle-to-controls thresholds; the listening check confirming them is still open after the tag | [C5.16.1][pc5161]; plan [H5][p32h5], [follow-ups after the tag][c27fu] |
| D418, D420 | `rule_start_while_controller_away` and the vision's out-of-scope browsers join C13 for the CS sign-off | [C13][pc13]; plan [gates][p32gates] (CS) |
| D419 | A fresh Jam draws its session seed at Start; phrase 1's attempts take derived seeds | [C5.7][pc57], [C11][pc11], [C15][pc15]; plan [chunk 18][p32c18] |
| D422 | Each STABLE guarantee changed after gate CS takes its own MAJOR bump at its wave's sync | [C13][pc13]; plan [gates][p32gates] |
| D423 | Wave 1's preflight points: the `ifk3.` encoder's typed error, a skipped mutation kept in memory only, N1's draw bound | Plan [chunk 6][p32c6], [chunk 12][p32c12], [chunk 15][p32c15] |
| D424 | C7.3's five kinds as built; "repeated" is the identical edit; the shares re-measured | [C7.3][pc73], [C7.6][pc76]; plan [chunk 5][p32c5], [M2][p32m2] |
| D425 | The steering block's target rhythm holds note and rest starts; the doodle compared as heard | [C5.9][pc59], [C8][pc8], [C11][pc11]; plan [chunk 6][p32c6], [chunk 8][p32c8], [chunk 28][p32c28] |
| D426 | A dead end mid-session is unreachable; its skip is defensive | [C9][pc9]; plan [chunk 15][p32c15] |
| D428 | Only locked bars make the search rhythm-major | [C7.6][pc76], [C8][pc8]; plan [chunk 8][p32c8], [chunk 10][p32c10] |
| D429 | The kept-record loophole closed; gate CK covers chunk 22 | [C11][pc11], [C13][pc13]; plan [chunk 22][p32c22], [gates][p32gates] (CK) |
| D430 | A fresh Jam's played notes are timed from its count-in; O267 opened, still open after the tag | [C10.3][pc103], [C11][pc11]; plan [chunk 22][p32c22], [follow-ups after the tag][c27fu]; O267: [register](../../open-questions.md#v32-build-o267) |
| D431 | The distance bands worded as C8 states them | [C4][pc4], [C8][pc8]; [lexicon, Drift](../../../docs/music/lexicon.md#drift) |
| D432, D436 | The lock census reads each phrase's lock outcome from its provenance; the rhythm change draw's hash stays | Plan [chunk 13][p32c13], [M2][p32m2] |
| D433 | Chunk 3's doodle-reading findings: O268 to the owner, O269 at v3.2 H5, still open after the tag | O268: answered by D440 (plan [gates][p32gates], DS); O269: plan [H5][p32h5], [follow-ups after the tag][c27fu], [register](../../open-questions.md#v32-build-o267); [C17][pc17] |
| D434 | The rhythm orderings' time reaches the sweeps through the diagnostics, under a sweeps-only clock | Plan [chunk 13][p32c13], [M1][p32m1], [M5][p32m5] |
| D435 | A drawn rhythm change that makes no phrase records "no change available" | [C7.4][pc74]; plan [M2][p32m2] |
| D438 | Each wave gate records the first-load JS total beside the entry chunk's figure | Plan [workflow deltas][p32wd], [M4][p32m4] |
| D439 | The saved lock, allowed changes and allowed groups reach Start and the Idle pre-generation | [C10.5][pc105]; plan [chunk 19][p32c19] |
| D440 | A short silence between two doodle notes is part of the note before it (O268) | [C5.9][pc59], [C5.16.1][pc5161]; plan [chunk 28][p32c28] |
| D441 | A tie between two register windows goes to Middle | [C5.9][pc59], [C5.16.1][pc5161]; plan [chunk 7][p32c7], [chunk 28][p32c28] |
| D442 | Jam's Idle prewarms the first-visit rhythm values before any doodle | [C5.1][pc51], [C5.8][pc58]; plan [chunk 20][p32c20] |
| D443 | Chunk 28 builds on the hand-written doodles; gate DR (the Travel Sax recordings) blocks H5, still open after the tag | Plan [gates][p32gates] (DR), [H5][p32h5], [follow-ups after the tag][c27fu] |
| D445, D446 | The supported-combination step judges the note density as read, at every width; the raised mark | [C5.16.1][pc5161]; plan [chunk 18][p32c18], [chunk 31][p32c31] |
| D447, D448 | ISS-015's fixes deferred past v3.2; the join pinned at the window's floor a known limit | [ISS-015](../../../issues/Ref_20261027_join_first_note_pinned_at_window_edge.md#decision-2026-10-27) (open); plan [M1][p32m1], [chunk 18][p32c18], [chunk 29][p32c29] |
| D449 | Drift's scale stays as C8 writes it; O271 carried to the Jam listening check, still open after the tag | [C8][pc8], [C17][pc17]; plan [H4][p32h4], [follow-ups after the tag][c27fu]; O271: [register](../../open-questions.md#v32-build-o267); gate LD: plan [gates][p32gates] |
| D450 | The rhythm change shares become 1 in 2, and 3 in 4 on a tenser phrase; L3's step 3 still open after the tag | [C7.4][pc74]; plan [chunk 34][p32c34], [H2][p32h2], [follow-ups after the tag][c27fu] |
| D451, D504 | The generation worker's chunk budget 170 KiB; the entry budget 320 KiB (O235 stays open) | [C10.9][pc109], [C14][pc14]; plan [M4][p32m4]; O235: [register](../../open-questions.md#v34-structural-review-o234) |
| D452 | The suggestion judges "no fit" before Jam's key and mode | [C6.3][pc63]; plan [chunk 14][p32c14] |
| D453 | Chunk 29 measures through its double; chunk 33 plugs in the real ladder | Plan [chunk 29][p32c29], [chunk 33][p32c33], [M1][p32m1] |
| D455 | The home-note cues are flat bonuses off the penalty; their tuning at L2 still open after the tag | [C6.2][pc62]; plan [chunk 14][p32c14], [H6][p32h6], [follow-ups after the tag][c27fu] |
| D456, D457 | The transport starts phrase 1 at its handed-over time; phrase 2 requested at the hand-over, an all-failed Jam ends at the deadline | [C5.7][pc57], [C5.8][pc58]; plan [chunk 18][p32c18], [chunk 21][p32c21] |
| D427, D437, D444, D454, D460 | Waves 2 to 6's preflight corrections; gates CL and CJ; a Jam session's record keeps its preset label | Plan [chunk 8][p32c8], [chunk 9][p32c9], [chunk 14][p32c14], [chunk 16][p32c16], [chunk 17][p32c17], [chunk 18][p32c18], [chunk 20][p32c20], [chunk 21][p32c21], [chunk 22][p32c22], [chunk 23][p32c23], [chunk 28][p32c28], [chunk 30][p32c30], [chunk 31][p32c31], [chunk 34][p32c34], [gates][p32gates] |
| D490 | The guide playback joins v3.2's scope | [C19][pc19], [C2][pc2], [C3][pc3], [C13][pc13], [C16][pc16] items 50–52 |
| D491 | The guide's minor calls and its five layers; the voices confirmed at v3.2 HG, still open after the tag | [C19][pc19], [C15][pc15]; plan [chunk 40][p32c40], [HG][p32hg], [follow-ups after the tag][c27fu] |
| D492, D500 | Chunk 40 in wave 7; gates GD and CG, CG covering change set part Y with the vision; hand check HG, still open after the tag | [C13][pc13]; plan [chunk 40][p32c40], [gates][p32gates], [HG][p32hg], [follow-ups after the tag][c27fu] |
| D493 | A guide note rings on into a rest (O291) | [C19.1][pc191], [C19.4][pc194]; plan [HG][p32hg] |
| D494 | The guide playback is never exported (O290) | [C19.5][pc195], [C2][pc2], [C17][pc17] |
| D495 | Until phrase 1 is on screen, Jam's empty staff is the staff judged for room | [C5.13][pc513] |
| D497 | H4 replays the doodle until wave 7; chunk 24 rewords H4 and H5 | Plan [H4][p32h4], [H5][p32h5], [chunk 24][p32c24] |
| D499 | A Jam on a kept doodle is kept with no played-notes clock | [C10.3][pc103]; plan [chunk 24][p32c24], [chunk 25][p32c25] |
| D503 | The kept doodle goes with its session when my instrument's deletion erases it | [C5.11][pc511]; plan [chunk 24][p32c24] |
| D506 | Jam's tempo stays 60 to 180 BPM; 240 BPM not kept (gate J240); settles D404's best effort | [C5.17][pc517], [C2][pc2], [C16][pc16]; plan [gates][p32gates] (J240), [chunk 33][p32c33] |
| D508 | "Jam again on this doodle" in every Jam session's review | [C5.11][pc511], [C5.15][pc515], [C16][pc16] item 33 |
| D509 | The guide's exactness on triplets and ties across a barline checked on hand-built phrases | [C19.1][pc191], [C16][pc16] item 50; plan [chunk 40][p32c40] |
| D409 | Part C rebuilt as v1.1, awaiting approval; O260–O266 opened | History: an interim state, approved by D410; the refresh at 3.1.0: [jam-grounding §E](jam-grounding.md#e-refresh-at-v310-2026-10-21) |
| D412 | Gate D0 granted, token pass T2 allowed | History: a gate event (plan [gates][p32gates]) |
| D416 | Build plan v3.2 rewritten as v4, awaiting approval | History: an interim state, approved by D417 (plan [waves][p32waves]) |
| D417 | The owner approves plan v5; hand check v3.2 H9 waived | History: an approval; the waiver: plan [H9][p32h9] |
| D421 | Gate CS signed off; three atoms promoted to STABLE | History: a gate event, applied in `docs/` by `documentalist` (plan [gates][p32gates]) |

### Where each closed v3.2 question now lives

| Question | Decision | Now lives in |
| --- | --- | --- |
| O247, O248, O253 | D406 (provisional, live) | [C5.16](../../versions/v3/master-spec.md#c516-jams-settings), [C5.16.1](../../versions/v3/master-spec.md#c5161-the-doodle-to-controls-mapping); [Jam mode §3](../../versions/v3/jam-mode.md#3-jams-settings-set); still open after the tag: confirmed or sent back by the checks in [what confirms them][d406c] |
| O249 | D406 (provisional, live) | [C5.17](../../versions/v3/master-spec.md#c517-tempo-in-jam-and-tap-in); [Jam mode §5](../../versions/v3/jam-mode.md#5-tempo-in-jam); still open after the tag (H7, tap-in on the Travel Sax) |
| O250 | D408 | [C5.17](../../versions/v3/master-spec.md#c517-tempo-in-jam-and-tap-in): 60–180 BPM; 240 BPM not kept (D506) |
| O251 | D407 | [C5.1](../../versions/v3/master-spec.md#c51-jam-mode); [Jam mode §2](../../versions/v3/jam-mode.md#2-two-modes) |
| O252 | D408 | [C15](../../versions/v3/master-spec.md#c15-architectural-decisions-and-their-reasons); [Jam mode §4](../../versions/v3/jam-mode.md#4-the-generator-seam) |
| O254 | D408 | [C5.11](../../versions/v3/master-spec.md#c511-the-kept-doodle-and-jam-again-on-this-doodle) |
| O255 | D408 | [C5.15](../../versions/v3/master-spec.md#c515-the-review-and-the-exports), [C10.3](../../versions/v3/master-spec.md#c103-kept-sessions-and-played-notes) |
| O256 | D408 | [C2](../../versions/v3/master-spec.md#c2-scope); plan [waves](../../versions/v3/build-plan-v3.2.md#waves) |
| O257 | D408 | History: one bump superseded by D422; the bumps as built are in [C13](../../versions/v3/master-spec.md#c13-what-v32-changes-in-v2-v30-and-v31-guarantees-and-atoms) (D522) |
| O258 | D408 | [C10.9](../../versions/v3/master-spec.md#c109-loading-jams-code-on-demand); plan [M4](../../versions/v3/build-plan-v3.2.md#m4--the-first-load-bundle) |
| O259 | D408 | Plan [hand checks](../../versions/v3/build-plan-v3.2.md#hand-checks) |
| O260–O266 | D410 | [C17](../../versions/v3/master-spec.md#c17-deferred-and-open), which says where each answer stands |
| O268 | D440 | [C5.9](../../versions/v3/master-spec.md#c59-what-the-doodle-feeds-the-generator), [C5.16.1](../../versions/v3/master-spec.md#c5161-the-doodle-to-controls-mapping) |
| O290 | D494 | [C19.5](../../versions/v3/master-spec.md#c195-out-of-v32) |
| O291 | D493 | [C19.4](../../versions/v3/master-spec.md#c194-the-guides-voices) |

O48, O49, O100–O102, O115, O116, O176, O180, O183, O190, O230, O234–O246, O267, O269 and O271
stay open in the live [register](../../open-questions.md); O270 was never issued.

### Left in place at the v3.2 release

| Document | Role | Referenced from |
| --- | --- | --- |
| [versions/v3/master-spec.md](../../versions/v3/master-spec.md) | Parts A, B and C are the contract for the running code; Part D is v3.3's, approved | `docs/`, `issues/`, `ui_ux/`, `specs/` |
| [versions/v3/build-plan-v3.2.md](../../versions/v3/build-plan-v3.2.md) | The v3.2 build plan, complete; chunk 27 is the release gate's record, and its gates L1, L2, L3 and DR, its hand checks H3, H4–H8 and HG, its follow-ups after the tag and what confirms D406's answers are still live; it holds the build calls the tables above point to | `docs/release/`, `docs/music/`, `HARDWARE-CHECKLIST.md`, `issues/`, `ui_ux/`, `specs/` |
| [versions/v3/wave-log-v3.2.md](../../versions/v3/wave-log-v3.2.md) | The wave driver's record of the v3.2 build; it may still record the checks after the tag | `docs/release/`, `specs/` |
| [versions/v3/jam-mode.md](../../versions/v3/jam-mode.md) | The settled Jam re-scope draft (D400–D408), consolidated into Part C v1.1; it states D406's four provisional answers and what confirms them, still open, and the UI/UX tree's Jam flow and its frozen v3.2 and v3.3 designs link to it | `ui_ux/` (flows, versions, registers), `docs/music/lexicon.md`, `specs/` |
| [versions/v3/build-workflow.md](../../versions/v3/build-workflow.md) | The shared v3 build workflow, which the v3.3 plan follows | `specs/` |
| [versions/v3/README.md](../../versions/v3/README.md) | The version's scope, and the live v3.0.x and v3.2.x notes | `docs/music/`, `specs/`, the v2 archive |
| `versions/v3/` v3.3 and v3.4 documents | The v3.3 build plan and v3.4's two scoping drafts, for releases not built yet | `specs/`, `docs/music/` |

The v3.0 and v3.1 build plans and the v3.1 wave log stay in place as at the v3.1 release.

[partb]: ../../versions/v3/master-spec.md#part-b--v31
[b2]: ../../versions/v3/master-spec.md#b2-scope
[b5]: ../../versions/v3/master-spec.md#b5-embellishment-figures-and-their-levels
[b52]: ../../versions/v3/master-spec.md#b52-four-levels
[b54]: ../../versions/v3/master-spec.md#b54-free-figures-and-tensions-scheduled-figure
[b56]: ../../versions/v3/master-spec.md#b56-the-cost-guard
[b6]: ../../versions/v3/master-spec.md#b6-presets
[b61]: ../../versions/v3/master-spec.md#b61-what-a-preset-holds
[b62]: ../../versions/v3/master-spec.md#b62-the-key-and-mode-restriction
[b63]: ../../versions/v3/master-spec.md#b63-choosing-a-preset
[b64]: ../../versions/v3/master-spec.md#b64-the-selection-custom-and-the-highlight
[b65]: ../../versions/v3/master-spec.md#b65-the-built-in-presets
[b66]: ../../versions/v3/master-spec.md#b66-player-presets
[b7]: ../../versions/v3/master-spec.md#b7-saving-on-the-device
[b81]: ../../versions/v3/master-spec.md#b81-vary-settings
[b83]: ../../versions/v3/master-spec.md#b83-pre-generation
[b9]: ../../versions/v3/master-spec.md#b9-the-generation-request-the-replay-key-and-kept-sessions
[b11]: ../../versions/v3/master-spec.md#b11-what-v31-changes-in-v30-and-in-v2s-guarantees
[b12]: ../../versions/v3/master-spec.md#b12-existing-code-and-risks
[b14]: ../../versions/v3/master-spec.md#b14-definition-of-done
[gates]: ../../versions/v3/build-plan-v3.1.md#gates
[waves]: ../../versions/v3/build-plan-v3.1.md#waves
[rf]: ../../versions/v3/build-plan-v3.1.md#read-first-what-v31-changes-in-v30-and-v2
[hc]: ../../versions/v3/build-plan-v3.1.md#hand-checks
[m1]: ../../versions/v3/build-plan-v3.1.md#m1--figure-shares
[m2]: ../../versions/v3/build-plan-v3.1.md#m2--the-cost-guard
[m3]: ../../versions/v3/build-plan-v3.1.md#m3--the-start-up-read-and-the-migrations
[m4]: ../../versions/v3/build-plan-v3.1.md#m4--the-first-load-bundle
[dp]: ../../versions/v3/build-plan-v3.1.md#decision-point-the-passing-and-neighbor-rule
[c1]: ../../versions/v3/build-plan-v3.1.md#chunk-1--token-source-pass-part-1-v31
[c4]: ../../versions/v3/build-plan-v3.1.md#chunk-4--figure-levels-in-the-generation-request
[c6]: ../../versions/v3/build-plan-v3.1.md#chunk-6--favored-levels-order-the-search
[c7]: ../../versions/v3/build-plan-v3.1.md#chunk-7--two-new-free-figures-the-appoggiatura-and-the-diatonic-enclosure
[c8]: ../../versions/v3/build-plan-v3.1.md#chunk-8--replay-key-ifk3-the-profile-leaves-the-request
[c9]: ../../versions/v3/build-plan-v3.1.md#chunk-9--kept-sessions-hold-the-levels-and-the-preset-label
[c12]: ../../versions/v3/build-plan-v3.1.md#chunk-12--presets-replace-the-musical-profile
[c13]: ../../versions/v3/build-plan-v3.1.md#chunk-13--the-preset-bar-and-the-key-and-mode-marks
[c17]: ../../versions/v3/build-plan-v3.1.md#chunk-17--preset-management-the-actions-and-the-preset-sheet
[c18]: ../../versions/v3/build-plan-v3.1.md#chunk-18--your-data-and-delete-everything
[c21]: ../../versions/v3/build-plan-v3.1.md#chunk-21--v31-release-gate
[c22]: ../../versions/v3/build-plan-v3.1.md#chunk-22--the-reviews-summary-gives-the-sessions-length
[partc]: ../../versions/v3/master-spec.md#part-c--v32
[c27v32]: ../../versions/v3/build-plan-v3.2.md#chunk-27--v32-release-gate
[c27fu]: ../../versions/v3/build-plan-v3.2.md#after-the-tag-v32x-follow-ups
[d406c]: ../../versions/v3/build-plan-v3.2.md#what-confirms-d406s-provisional-answers
[b4]: ../../versions/v3/master-spec.md#b4-words-used-in-this-part
[pc4]: ../../versions/v3/master-spec.md#c4-words-used-in-this-part
[pc5]: ../../versions/v3/master-spec.md#c5-jam
[pc51]: ../../versions/v3/master-spec.md#c51-jam-mode
[pc52]: ../../versions/v3/master-spec.md#c52-starting-a-jam
[pc59]: ../../versions/v3/master-spec.md#c59-what-the-doodle-feeds-the-generator
[pc511]: ../../versions/v3/master-spec.md#c511-the-kept-doodle-and-jam-again-on-this-doodle
[pc513]: ../../versions/v3/master-spec.md#c513-edge-cases-before-phrase-1-sounds
[pc514]: ../../versions/v3/master-spec.md#c514-the-doodles-two-forms
[pc515]: ../../versions/v3/master-spec.md#c515-the-review-and-the-exports
[pc516]: ../../versions/v3/master-spec.md#c516-jams-settings
[pc517]: ../../versions/v3/master-spec.md#c517-tempo-in-jam-and-tap-in
[pc6]: ../../versions/v3/master-spec.md#c6-the-key-and-mode-suggestion
[pc62]: ../../versions/v3/master-spec.md#c62-the-method
[pc63]: ../../versions/v3/master-spec.md#c63-when-nothing-is-suggested
[pc65]: ../../versions/v3/master-spec.md#c65-use-it-keep-mine-and-jam-again-on-this-doodle
[pc71]: ../../versions/v3/master-spec.md#c71-the-switch-and-what-is-locked
[pc72]: ../../versions/v3/master-spec.md#c72-allowed-rhythm-changes-the-option
[pc73]: ../../versions/v3/master-spec.md#c73-the-five-kinds-and-the-known-limit
[pc74]: ../../versions/v3/master-spec.md#c74-when-a-phrase-changes
[pc75]: ../../versions/v3/master-spec.md#c75-the-forced-bend
[pc9]: ../../versions/v3/master-spec.md#c9-vary-settings-allowed-groups
[pc10]: ../../versions/v3/master-spec.md#c10-how-v32-meets-v30-and-v31
[pc101]: ../../versions/v3/master-spec.md#c101-presets-and-the-key-and-mode-restriction-v31
[pc107]: ../../versions/v3/master-spec.md#c107-delete-everything-and-your-data
[pc109]: ../../versions/v3/master-spec.md#c109-loading-jams-code-on-demand
[pc11]: ../../versions/v3/master-spec.md#c11-the-generation-request-the-replay-key-and-kept-sessions
[pc13]: ../../versions/v3/master-spec.md#c13-what-v32-changes-in-v2-v30-and-v31-guarantees-and-atoms
[pc15]: ../../versions/v3/master-spec.md#c15-architectural-decisions-and-their-reasons
[pc17]: ../../versions/v3/master-spec.md#c17-deferred-and-open
[jm2]: ../../versions/v3/jam-mode.md#2-two-modes
[jm3]: ../../versions/v3/jam-mode.md#3-jams-settings-set
[jm4]: ../../versions/v3/jam-mode.md#4-the-generator-seam
[jm5]: ../../versions/v3/jam-mode.md#5-tempo-in-jam
[jm6]: ../../versions/v3/jam-mode.md#6-blast-radius
[jm]: ../../versions/v3/jam-mode.md
[pc2]: ../../versions/v3/master-spec.md#c2-scope
[pc3]: ../../versions/v3/master-spec.md#c3-personas-and-goals-served
[pc57]: ../../versions/v3/master-spec.md#c57-when-phrase-1-is-late-the-extended-wait-and-the-fallback
[pc58]: ../../versions/v3/master-spec.md#c58-the-time-budget
[pc5161]: ../../versions/v3/master-spec.md#c5161-the-doodle-to-controls-mapping
[pc76]: ../../versions/v3/master-spec.md#c76-how-the-search-holds-the-lock
[pc8]: ../../versions/v3/master-spec.md#c8-jams-drift
[pc103]: ../../versions/v3/master-spec.md#c103-kept-sessions-and-played-notes
[pc105]: ../../versions/v3/master-spec.md#c105-pre-generation-v30
[pc108]: ../../versions/v3/master-spec.md#c108-other-session-rules
[pc14]: ../../versions/v3/master-spec.md#c14-existing-code-and-risks
[pc16]: ../../versions/v3/master-spec.md#c16-definition-of-done
[pc19]: ../../versions/v3/master-spec.md#c19-the-guide-playback
[pc191]: ../../versions/v3/master-spec.md#c191-what-each-guide-plays
[pc194]: ../../versions/v3/master-spec.md#c194-the-guides-voices
[pc195]: ../../versions/v3/master-spec.md#c195-out-of-v32
[pd84]: ../../versions/v3/master-spec.md#d84-pre-generation-jam-and-the-key-and-mode-suggestion
[p32gates]: ../../versions/v3/build-plan-v3.2.md#gates
[p32waves]: ../../versions/v3/build-plan-v3.2.md#waves
[p32wd]: ../../versions/v3/build-plan-v3.2.md#workflow-deltas
[p32m1]: ../../versions/v3/build-plan-v3.2.md#m1--the-jam-sweep
[p32m2]: ../../versions/v3/build-plan-v3.2.md#m2--the-lock-census-forced-bends-and-rhythm-changes
[p32m4]: ../../versions/v3/build-plan-v3.2.md#m4--the-first-load-bundle
[p32m5]: ../../versions/v3/build-plan-v3.2.md#m5--the-session-sweep-with-the-lock
[p32hc]: ../../versions/v3/build-plan-v3.2.md#hand-checks
[p32h2]: ../../versions/v3/build-plan-v3.2.md#v32-h2--allowed-rhythm-changes-l3
[p32h4]: ../../versions/v3/build-plan-v3.2.md#v32-h4--jam-listening-settings-drift-and-lock-l1
[p32h5]: ../../versions/v3/build-plan-v3.2.md#v32-h5--jam-listening-the-doodle-to-controls-mapping-l1
[p32h6]: ../../versions/v3/build-plan-v3.2.md#v32-h6--the-suggestion-l2
[p32hg]: ../../versions/v3/build-plan-v3.2.md#v32-hg--the-guide-playback
[p32h9]: ../../versions/v3/build-plan-v3.2.md#v32-h9--waived
[p32c5]: ../../versions/v3/build-plan-v3.2.md#chunk-5--rhythm-bars-distance-and-change-kinds
[p32c6]: ../../versions/v3/build-plan-v3.2.md#chunk-6--the-request-carries-v32s-inputs
[p32c7]: ../../versions/v3/build-plan-v3.2.md#chunk-7--the-join-from-the-doodle
[p32c8]: ../../versions/v3/build-plan-v3.2.md#chunk-8--rhythm-ordered-by-the-steering-block
[p32c9]: ../../versions/v3/build-plan-v3.2.md#chunk-9--melody-follows-the-moves
[p32c10]: ../../versions/v3/build-plan-v3.2.md#chunk-10--the-rhythm-lock-in-the-generator
[p32c12]: ../../versions/v3/build-plan-v3.2.md#chunk-12--replay-key-ifk4
[p32c13]: ../../versions/v3/build-plan-v3.2.md#chunk-13--session-measurements-first-run
[p32c14]: ../../versions/v3/build-plan-v3.2.md#chunk-14--the-key-and-mode-suggestion
[p32c15]: ../../versions/v3/build-plan-v3.2.md#chunk-15--vary-settings-allowed-groups
[p32c16]: ../../versions/v3/build-plan-v3.2.md#chunk-16--the-rhythm-lock-in-a-session
[p32c17]: ../../versions/v3/build-plan-v3.2.md#chunk-17--jam-engine-part-1-the-count-in-and-the-capture
[p32c18]: ../../versions/v3/build-plan-v3.2.md#chunk-18--jam-engine-part-2-from-the-doodle-to-phrase-1
[p32c19]: ../../versions/v3/build-plan-v3.2.md#chunk-19--the-rhythm-lock-and-what-may-vary-in-the-controls
[p32c20]: ../../versions/v3/build-plan-v3.2.md#chunk-20--jam-mode-the-mode-switch-jams-code-on-demand-and-jams-idle
[p32c21]: ../../versions/v3/build-plan-v3.2.md#chunk-21--a-fresh-jam-on-screen
[p32c22]: ../../versions/v3/build-plan-v3.2.md#chunk-22--v32s-kept-session-shape
[p32c23]: ../../versions/v3/build-plan-v3.2.md#chunk-23--the-reviews-doodle-section-and-the-suggestion
[p32c24]: ../../versions/v3/build-plan-v3.2.md#chunk-24--the-kept-doodle
[p32c25]: ../../versions/v3/build-plan-v3.2.md#chunk-25--exports-open-with-the-doodle
[p32c28]: ../../versions/v3/build-plan-v3.2.md#chunk-28--from-the-doodle-the-controls-and-the-steering-block
[p32c29]: ../../versions/v3/build-plan-v3.2.md#chunk-29--the-jam-sweep-first-run
[p32c30]: ../../versions/v3/build-plan-v3.2.md#chunk-30--kept-jam-sessions-on-the-device
[p32c31]: ../../versions/v3/build-plan-v3.2.md#chunk-31--jams-settings
[p32c33]: ../../versions/v3/build-plan-v3.2.md#chunk-33--240-bpm-in-jam-best-effort
[p32c34]: ../../versions/v3/build-plan-v3.2.md#chunk-34--the-rhythm-change-shares-tuned-l3
[p32c40]: ../../versions/v3/build-plan-v3.2.md#chunk-40--the-guide-playback

## v3.3 release (archived 2026-11-22)

v3.3, richer chords, is released as version 3.3.0: by the owner's ruling (D541) the release gate,
build plan [chunk 22][p33c22], ran its machine half before his hand and listening checks, the owner
gave his go on 2026-11-18, and the tag `v3.3.0` is on `main` at b2a0e3fa (D544). The
[release notes](../../../docs/release/v3.3-release-notes.md) hold the evidence. What v3.3 does is
stated in [master spec Part D][d33]. The owner skipped L1, the listening check on endings (D540),
so chunk 21 was not built and v3.3 ships the triad reading; endings on the seventh are a
[roadmap candidate](../../roadmap.md#candidates-not-committed). The checks after the tag (L2 with
v3.3 H2 and any share tuning, U1b, H3–H6, M3's deciding runs) stay live in the plan's
[follow-ups after the tag][p33fu] and in the
[v3.3.x notes](../../versions/v3/README.md#v33x-notes-after-the-tag). The decisions that track
them stay in the live [decisions log](../../decisions.md): D537 (the figure restated from M3's
deciding runs), D538–D540 (chunk 21 and L1, with D539's ruling for when endings on the seventh are
built) and D541–D542 (the release before the checks, and the failure ladder atom at the release
sync). The live log records this archive as D544.

### Archived at the v3.3 release

- [decisions-D261-D288.md](decisions-D261-D288.md): decisions D261–D288, kept verbatim: v3.3's
  direction, the chord research as its own item, master spec Part D's answers to O165–O175 and
  its planning answers, approved with Part D (D520).
- [decisions-D349-D352.md](decisions-D349-D352.md): decisions D349–D352, kept verbatim: the v3.1,
  v3.2 and v3.3 build plans moved to the build-plan model under one shared v3 build workflow, and
  the merge of branch `plan-migration`. Kept live until now because D351 shaped the v3.3 plan.
- [decisions-D511-D520.md](decisions-D511-D520.md): decisions D511–D520, kept verbatim: Part D
  and the v3.3 plan refreshed against v3.2 as built, and the owner's approval (gates A0 and D0).
- [decisions-D524-D536.md](decisions-D524-D536.md): decisions D524–D536, kept verbatim: v3.2's
  archive event, then the v3.3 build from gates I0 and C1 to wave 4's gate.
- [open-questions-history-v3.3.md](open-questions-history-v3.3.md): the live register's header
  paragraphs on open and closed questions, its notes on the questions closed during v3.3
  (O165–O175, O235 and O310) and O310's own note, recovered from git, kept verbatim.
- [readme-status-snapshot-v3.3.md](readme-status-snapshot-v3.3.md): the spec index's status
  snapshot (`specs/README.md`, draft v0.93), kept verbatim.
- [v3-readme-status-v3.3.md](v3-readme-status-v3.3.md): the v3 README's `Status:` paragraph as it
  stood at the release, kept verbatim.

v3.3 had no draft topic documents to archive: Part D was consolidated straight from the v3
README's direction and the [chord research](../../../docs/music/chord-research.md), which stays in
`docs/music/`.

Not archived, though v3.3's: D537–D542 (above). D259–D260 (style packs and the sound ban, no
version), D344–D348 (v3.0's release, whose v3.0.x notes are still open), D389 and D393–D395
(v3.4, the lexicon API later), D406 and D521–D523 (v3.2's checks after the tag) stay live. D289
and D525 were never issued.

### Where each v3.3 decision now lives

Section numbers (D5.2, D8.4, …) are those of [master spec Part D][d33]; "plan" is the
[v3.3 build plan](../../versions/v3/build-plan-v3.3.md), complete and left in place. "History"
marks a decision that is superseded, or that only recorded an approval, a gate event, an interim
state or a merge; it has no live home. "Still open after the tag" marks a decision whose
follow-up check is still owed; its home is the plan section that carries the check.

#### D261–D288

| Decision(s) | Subject | Now lives in |
| --- | --- | --- |
| D261 | v3.3, richer chords, opt-in, after a research phase; v1's D11–D13 and style packs | [v3 README, v3.3](../../versions/v3/README.md#v33--richer-chords-optional) and its [relation to v1's decisions](../../versions/v3/README.md#relation-to-v1s-decisions-and-to-style-packs); [D1][d33d1], [D2][d33d2] |
| D262 | The chord research a separate docs-only item; the vision updated with the v3.3 direction | [v3 README, research first](../../versions/v3/README.md#research-first); [chord research](../../../docs/music/chord-research.md) |
| D264 | One Seventh chords level, Off by default (O165) | [D2][d33d2], [D5.2][d33d52] |
| D265 | Diatonic sevenths only (O166) | [D5.1][d33d51] |
| D266 | The run cap stays three; the seventh may be one of the three (O167) | [D6.2][d33d62], [D12][d33d12] |
| D267 | The seventh a chord tone; endings and the join read the triad until a listening check (O168) | [D6.1][d33d61], [D6.3][d33d63], [D12][d33d12]; the check skipped (D540), so the triad reading ships; endings on the seventh: [roadmap candidate](../../roadmap.md#candidates-not-committed) |
| D268 | A seeded preference per harmony event; the cost guard (O169) | [D5.2][d33d52]–[D5.4][d33d54], [D10][d33d10]; the shares' tuning at L2 still open after the tag: plan [follow-ups after the tag][p33fu] |
| D269 | Chord symbols, exports and the four-note backing (O170) | [D7.1][d33d71], [D7.2][d33d72], [D7.3][d33d73], [D12][d33d12] |
| D270 | Presets, saved settings, Vary settings never moves the level, `ifk5.` (O171) | [D8.1][d33d81], [D8.2][d33d82], [D8.3][d33d83], [D9][d33d9] |
| D271 | Jam and the key and mode suggestion unchanged (O172) | [D8.4][d33d84]; Jam's own level: D512 |
| D272 | The declared-intent changes listed in Part D (O173) | [D12][d33d12] |
| D273 | One named capability per chord family, stored by value (O175's shape); O176 opened | [D4][d33d4], [D9][d33d9], [D14][d33d14]; O176: [register](../../open-questions.md#v33-richer-chords-o165) |
| D274 | Gaps settled while consolidating Part D | [D4][d33d4], [D5.2][d33d52], [D8.2][d33d82], [D8.3][d33d83]; point 4 (a level change drops the doodle): superseded by D513 ([D8.4][d33d84]) |
| D275 | The triad fallback is per phrase; Strongly favored keeps at least 3 in 4 | [D5.2][d33d52], [D15][d33d15] item 5; plan [M1][p33m1] |
| D278 | The seventh draw's position and shares | [D5.3][d33d53]; plan [chunk 12][p33c12], [M1][p33m1] |
| D281 | What the seventh share counts | Plan [M1][p33m1]; a seed per phrase: D533 |
| D282 | A listening check of the level and the backing (L2, v3.3 H2), still open after the tag | Plan [hand checks][p33hc], [follow-ups after the tag][p33fu] |
| D283 | Who updates the project documents §D12 names | [D12][d33d12], [D16][d33d16]; plan [workflow deltas][p33wd], [chunk 12][p33c12], [chunk 22][p33c22] |
| D284 | No token-source chunk for v3.3 | Plan [gates][p33gates] (D0) |
| D285 | The change set adds the atoms §D12 missed | [D12][d33d12]; plan [gates][p33gates] (I0) |
| D287 | A Jam's phrase 1 carries the level on every rung | [D8.4][d33d84]; plan [chunk 23][p33c23] |
| D288 | The level ids are camelCase (amends D277) | [D9][d33d9]; plan [chunk 3][p33c3] |
| D263 | The owner confirms the vision 0.9 wording | History: an approval, applied in `docs/` by `documentalist` |
| D276 | The v3.3 contract confirmed once, early, with one bump | History: amended by D517 (each wording applied at its wave's sync) and confirmed at C1 (D526); [D12][d33d12], plan [gates][p33gates] |
| D277 | The level's ids, stored beside the controls | History: the spelling superseded by D288, the placement in the request amended by D514; [D9][d33d9] |
| D279 | Data version 5, with an upgrade that rewrites nothing | History: amended by D515 (the step rewrites the records whose shape changes); [D8.2][d33d82], plan [chunk 17][p33c17] |
| D280 | The listening check's examples are rewritten phrases | History: L1 skipped by the owner (D540); plan [chunk 4][p33c4], [chunk 18][p33c18] |
| D286 | Until the control ships, the app sends Off | History: an interim state, ended by chunk 19 (plan [chunk 19][p33c19]) |

#### D349–D352

| Decision(s) | Subject | Now lives in |
| --- | --- | --- |
| D349 | v3.1's build plan on the build-plan model; one shared v3 build workflow | [Build workflow](../../versions/v3/build-workflow.md); [v3.1 plan, waves](../../versions/v3/build-plan-v3.1.md#waves) |
| D350 | v3.2's build plan on the build-plan model | [v3.2 plan, waves](../../versions/v3/build-plan-v3.2.md#waves) |
| D351 | v3.3's build plan on the build-plan model; the owner's four questions become gates A0, C1, R0 and I0, and O230 | Plan [waves][p33waves], [gates][p33gates]; O230: [register](../../open-questions.md#v33-richer-chords-o165), still open |
| D352 | Branch `plan-migration` merged, renumbered | History: a merge event |

#### D511–D520

| Decision(s) | Subject | Now lives in |
| --- | --- | --- |
| D512 | Jam's own level runs through all of Part D; chunk 23 builds it | [D8.4][d33d84], [D15][d33d15]; plan [chunk 23][p33c23] |
| D513 | A level change keeps the kept doodle | [D8.4][d33d84], [D15][d33d15] item 16 |
| D514 | The level rides the generation intent only | [D9][d33d9]; plan [chunk 3][p33c3] |
| D515 | Data version 5 rewrites the records whose shape changes | [D8.2][d33d82]; plan [chunk 17][p33c17] |
| D516 | The rhythm lock's walk, the carried note, and Jam measured at 180 BPM | [D5.3][d33d53], [D6.3][d33d63], [D10][d33d10] |
| D517 | Every STABLE wording v3.3 changes confirmed once and applied wave by wave | [D12][d33d12]; plan [gates][p33gates] (C1) |
| D518 | The backing beside v3.2's guides; H2 judges the balance, still open after the tag | [D7.3][d33d73]; plan [hand checks][p33hc], [follow-ups after the tag][p33fu] |
| D519 | After `Start with this phrase`, phrase 1 keeps its own level | [D8.3][d33d83] |
| D511 | Part D and the plan refreshed against v3.2 as built | History: an interim state, approved by D520; the code table: [chord research](../../../docs/music/chord-research.md#where-a-fourth-chord-note-meets-the-code) |
| D520 | The owner approves v3.3: Part D v1.2, its plan and its design (A0, D0) | History: an approval (plan [gates][p33gates]) |

#### D524–D536

| Decision(s) | Subject | Now lives in |
| --- | --- | --- |
| D527 | A8's sentences on the Idle state apply with chunk 16, at wave 3's sync | Plan [gates][p33gates] (C1), [chunk 11][p33c11], [chunk 16][p33c16] |
| D528 | A seventh reaches the app only after every writer and reader knows it | Plan [chunk 13][p33c13], [chunk 15][p33c15], [chunk 17][p33c17], [chunk 19][p33c19], [waves][p33waves] |
| D529 | `rule_doodle_only_orders_candidates` revised with chunk 23 | Plan [chunk 23][p33c23] |
| D530 | A leap recovery owed across the join is never repaid on the tonic chord's seventh | [D6.3][d33d63]; plan [chunk 5][p33c5] |
| D531 | Chunk 18 reports join loss by cause; Jam above Off measured first through the ladder's double | Plan [M2][p33m2], [chunk 18][p33c18] |
| D532 | Chunk 16 builds the level's change at the routing point; A4 rides with chunk 12 | Plan [gates][p33gates] (C1), [chunk 12][p33c12], [chunk 16][p33c16] |
| D533 | M1 gives each phrase a seed of its own | Plan [M1][p33m1], [chunk 18][p33c18] |
| D534 | Gate DP: no finer fallback, chunk 20 skipped; DP re-checked on a tuning patch's M1, still open after the tag | Plan [gates][p33gates] (DP), [M1][p33m1], [chunk 20][p33c20], [follow-ups after the tag][p33fu] |
| D535 | ISS-019 a bug against §D6.1 and §D6.3; chunk 5's second addendum fixes it | [D6.1][d33d61], [D6.3][d33d63]; plan [chunk 5][p33c5]; ISS-019 resolved ([issues index](../../../issues/README.md)) |
| D536 | The first-load budget counts all start-up JavaScript, 400 KiB (O235) | [D13][d33d13]; plan [M4][p33m4]; [build workflow, wave gate](../../versions/v3/build-workflow.md#wave-gate) |
| D524 | v3.2 released and its record archived | History: an archive event ([v3.2 release](#v32-release-archived-2026-11-09)) |
| D526 | Gate I0 cleared; C1, the bumps and the vision's v3.3 line confirmed | History: a gate event and an approval, applied in `docs/` by `documentalist`; [D12][d33d12], plan [gates][p33gates] |

### Where each closed v3.3 question now lives

| Question | Decision | Now lives in |
| --- | --- | --- |
| O165 | D264 | [D2][d33d2], [D5.2][d33d52] |
| O166 | D265 | [D5.1][d33d51] |
| O167 | D266 | [D6.2][d33d62] |
| O168 | D267 | [D6.1][d33d61], [D6.3][d33d63]; endings on the seventh: [roadmap candidate](../../roadmap.md#candidates-not-committed) (D540) |
| O169 | D268 | [D5.2][d33d52]–[D5.4][d33d54], [D10][d33d10] |
| O170 | D269 | [D7.1][d33d71]–[D7.3][d33d73] |
| O171 | D270 | [D8.1][d33d81]–[D8.3][d33d83], [D9][d33d9] |
| O172 | D271 | [D8.4][d33d84] |
| O173 | D272 | [D12][d33d12] |
| O174 | D262 | [v3 README, research first](../../versions/v3/README.md#research-first) |
| O175 | D273 | [D14][d33d14]; its precedence question goes on as O176, still open in the [register](../../open-questions.md#v33-richer-chords-o165) |
| O235 | D536 | [D13][d33d13]; plan [M4][p33m4]; [build workflow, wave gate](../../versions/v3/build-workflow.md#wave-gate) |
| O310 | D539 (live) | Plan [chunk 21][p33c21], for when endings on the seventh are built; [roadmap candidate](../../roadmap.md#candidates-not-committed) |

O48, O49, O100–O102, O115, O116, O176, O180, O183, O190, O230, O234, O236–O246, O267, O269 and
O271 stay open in the live [register](../../open-questions.md); O307–O309 were never issued.
O311, reserved by `doc-ids` during this archive pass, is unused.

### Left in place at the v3.3 release

| Document | Role | Referenced from |
| --- | --- | --- |
| [versions/v3/master-spec.md](../../versions/v3/master-spec.md) | Parts A, B, C and D are the contract for the running code | `docs/`, `issues/`, `ui_ux/`, `specs/` |
| [versions/v3/build-plan-v3.3.md](../../versions/v3/build-plan-v3.3.md) | The v3.3 build plan, complete; chunk 22 is the release gate's record, and its hand checks and follow-ups after the tag are live; chunk 21 holds the design of endings on the seventh, with D539, for a later version; it holds the build calls the tables above point to | `docs/release/`, `docs/generation-latency.md`, `HARDWARE-CHECKLIST.md`, `ui_ux/todo.md`, `specs/` |
| [versions/v3/wave-log-v3.3.md](../../versions/v3/wave-log-v3.3.md) | The wave driver's record of the v3.3 build; it may still record the checks after the tag | `docs/release/`, `issues/`, `specs/` |
| [versions/v3/build-workflow.md](../../versions/v3/build-workflow.md) | The shared v3 build workflow, with the start-up budget D536 set | `specs/` |
| [versions/v3/README.md](../../versions/v3/README.md) | The version's scope, and the live v3.0.x, v3.2.x and v3.3.x notes | `docs/music/`, `specs/`, the v2 archive |
| `versions/v3/` v3.4 documents | v3.4's two scoping drafts, for a milestone not started | `specs/`, `docs/music/` |

The v3.0, v3.1 and v3.2 build plans, the v3.1 and v3.2 wave logs and the Jam mode draft stay in
place as at the v3.2 release.

[d33]: ../../versions/v3/master-spec.md#part-d--v33
[d33d1]: ../../versions/v3/master-spec.md#d1-core-concept
[d33d2]: ../../versions/v3/master-spec.md#d2-scope
[d33d4]: ../../versions/v3/master-spec.md#d4-words-used-in-this-part
[d33d51]: ../../versions/v3/master-spec.md#d51-the-chords
[d33d52]: ../../versions/v3/master-spec.md#d52-four-levels
[d33d53]: ../../versions/v3/master-spec.md#d53-how-the-planner-applies-it
[d33d54]: ../../versions/v3/master-spec.md#d54-determinism
[d33d61]: ../../versions/v3/master-spec.md#d61-the-seventh-is-a-chord-tone
[d33d62]: ../../versions/v3/master-spec.md#d62-runs-stay-three-notes
[d33d63]: ../../versions/v3/master-spec.md#d63-phrase-endings-and-the-join-read-the-triad-until-a-listening-check
[d33d71]: ../../versions/v3/master-spec.md#d71-chord-symbols
[d33d72]: ../../versions/v3/master-spec.md#d72-exports
[d33d73]: ../../versions/v3/master-spec.md#d73-the-backing-plays-the-seventh
[d33d81]: ../../versions/v3/master-spec.md#d81-presets
[d33d82]: ../../versions/v3/master-spec.md#d82-saving-on-the-device
[d33d83]: ../../versions/v3/master-spec.md#d83-vary-settings-and-the-session
[d33d84]: ../../versions/v3/master-spec.md#d84-pre-generation-jam-and-the-key-and-mode-suggestion
[d33d9]: ../../versions/v3/master-spec.md#d9-the-generation-request-the-replay-key-and-kept-sessions
[d33d10]: ../../versions/v3/master-spec.md#d10-the-cost-guard-generation-time-with-seventh-chords
[d33d12]: ../../versions/v3/master-spec.md#d12-contract-changes-needing-owner-confirmation
[d33d13]: ../../versions/v3/master-spec.md#d13-existing-code-and-risks
[d33d14]: ../../versions/v3/master-spec.md#d14-architectural-decisions-and-their-reasons
[d33d15]: ../../versions/v3/master-spec.md#d15-definition-of-done
[d33d16]: ../../versions/v3/master-spec.md#d16-deferred-and-open
[p33gates]: ../../versions/v3/build-plan-v3.3.md#gates
[p33waves]: ../../versions/v3/build-plan-v3.3.md#waves
[p33wd]: ../../versions/v3/build-plan-v3.3.md#workflow-deltas
[p33m1]: ../../versions/v3/build-plan-v3.3.md#m1--the-seventh-share
[p33m2]: ../../versions/v3/build-plan-v3.3.md#m2--the-cost-guard
[p33m4]: ../../versions/v3/build-plan-v3.3.md#m4--the-first-load-bundle
[p33hc]: ../../versions/v3/build-plan-v3.3.md#hand-checks
[p33c3]: ../../versions/v3/build-plan-v3.3.md#chunk-3--the-level-in-the-generation-request
[p33c4]: ../../versions/v3/build-plan-v3.3.md#chunk-4--measurement-tools-the-seventh-census-the-cost-runs-and-the-ending-renders
[p33c5]: ../../versions/v3/build-plan-v3.3.md#chunk-5--the-seventh-as-a-chord-tone-in-the-pitch-search
[p33c11]: ../../versions/v3/build-plan-v3.3.md#chunk-11--presets-hold-the-level
[p33c12]: ../../versions/v3/build-plan-v3.3.md#chunk-12--the-level-orders-the-plans
[p33c13]: ../../versions/v3/build-plan-v3.3.md#chunk-13--musicxml-writes-the-seventh-chords
[p33c15]: ../../versions/v3/build-plan-v3.3.md#chunk-15--replay-key-ifk5
[p33c16]: ../../versions/v3/build-plan-v3.3.md#chunk-16--the-level-in-a-session-and-in-pre-generation
[p33c17]: ../../versions/v3/build-plan-v3.3.md#chunk-17--the-level-on-the-device-data-version-5
[p33c18]: ../../versions/v3/build-plan-v3.3.md#chunk-18--measurements-first-run-shares-cost-guard-and-ending-examples
[p33c19]: ../../versions/v3/build-plan-v3.3.md#chunk-19--the-seventh-chords-control
[p33c20]: ../../versions/v3/build-plan-v3.3.md#chunk-20--the-finer-fallback-conditional
[p33c21]: ../../versions/v3/build-plan-v3.3.md#chunk-21--endings-on-the-seventh-second-option-conditional
[p33c22]: ../../versions/v3/build-plan-v3.3.md#chunk-22--v33-release-gate
[p33c23]: ../../versions/v3/build-plan-v3.3.md#chunk-23--jams-own-seventh-chords-level
[p33fu]: ../../versions/v3/build-plan-v3.3.md#after-the-tag-v33x-follow-ups

## v3.4 release (archived 2026-11-24)

v3.4, the structural review and the lexicon page, is released as version 3.4.0: the release gate
passed on the merged waves 1 to 3, the owner gave his go to tag before his hand check H1 (D578),
and the tag `v3.4.0` is on `main` at 17e631e4 (D579). The
[release notes](../../../docs/release/v3.4-release-notes.md) hold the evidence. What the lexicon
page and the lexicon API do is stated in [master spec Part E][e34]; the structural review's answers,
rulings, deferred recommendations and the split's form are in its [report][rp], left in place.
The owner's hand check H1 and the lexicon four's STABLE promotion after it stay live in the plan's
[gates][p34gates] and the [v3.4.x notes](../../versions/v3/README.md#v34x-notes-after-the-tag).
The decisions that track them stay in the live [decisions log](../../decisions.md): D575 (the
build plan's open points after the review, with the revision of `prerequisites.md` that is
`spec-writer`'s first task when v4.0's master spec starts, cross-linked from the
[v4 README](../../versions/v4/README.md#depends-on)), D576 (`NotationError` with chunk 6), D577
(O230's close) and D578 (v3.4 tagged before H1). The live log records this archive as D579.

### Archived at the v3.4 release

- [decisions-D389.md](decisions-D389.md): decision D389, kept verbatim: v3.4 opened as a
  structural review, the last v3 milestone.
- [decisions-D393-D395.md](decisions-D393-D395.md): decisions D393–D395, kept verbatim: the
  lexicon page added to v3.4, its one source, and the lexicon API placed in v4 or v5.
- [decisions-D544-D574.md](decisions-D544-D574.md): decisions D544–D574, kept verbatim: v3.3's
  archive event; the owner's first rulings on v3.4 and his direction for this app's horizon; his
  delegation of v3.4 to the wave driver and the driver's rulings under it, from the refactors'
  bounds through Part E's approval, the lexicon page's last choices and the structural review's
  report.
- [open-questions-history-v3.4.md](open-questions-history-v3.4.md): the live register's header
  paragraphs on open and closed questions, its two v3.4 sections (all their questions closed),
  and the notes of the questions closed during v3.4 (O230, O234, O236–O246, O312 and O315),
  recovered from git, kept verbatim.
- [readme-status-snapshot-v3.4.md](readme-status-snapshot-v3.4.md): the spec index's status
  snapshot (`specs/README.md`, draft v0.99), kept verbatim.
- [v3-readme-status-v3.4.md](v3-readme-status-v3.4.md): the v3 README's `Status:` paragraph as it
  stood at the release, kept verbatim.

No v3.4 document moves: each is still a live home, or is linked from a file this pass may not
edit (see [left in place](#left-in-place-at-the-v34-release)).

Not archived, though v3.4's: D575–D578 (above). D259–D260 (style packs and the sound ban, no
version), D344–D348 (v3.0's release, whose v3.0.x notes are still open), D406 and D521–D523
(v3.2's checks after the tag) and D537–D542 (v3.3's checks after the tag) stay live. D543 and
D566 were never issued.

### Where each v3.4 decision now lives

Section numbers (E5, E9.3, …) are those of [master spec Part E][e34]; "review" is the
[structural review][sr] scoping document and "report" its [report][rp], both left in place;
"plan" is the [v3.4 build plan](../../versions/v3/build-plan-v3.4.md), complete and left in place.
"History" marks a decision that is superseded, or that only recorded an approval, a process step,
an event or an order applied; it has no live home.

#### D389, D393–D395

| Decision(s) | Subject                                                                    | Now lives in                                                                                         |
| ----------- | -------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| D389        | v3.4, a structural review, the last v3 milestone, after v3.3 and before v4 | [v3 README, v3.4](../../versions/v3/README.md#v34--structural-review); review [§1][sr1], [§2][sr2]   |
| D393        | v3.4 also builds a lexicon page, step one of a side project; D389 amended  | [E1][e1], [E2][e2]; [v3 README, the lexicon page](../../versions/v3/README.md#the-lexicon-page-d393) |
| D394        | The lexicon page's only source is `docs/music/lexicon.md`                  | [E5][e5]                                                                                             |
| D395        | The lexicon API in v4 or v5                                                | History: superseded by D555 ([E9][e9])                                                               |

#### D544–D574

| Decision(s) | Subject                                                                                    | Now lives in                                                                                                                                                                              |
| ----------- | ------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D545        | v3.4 delivers the report and the refactors taken, as a build plan (O234)                   | Review [§6][sr6]; plan [waves][p34waves]                                                                                                                                                  |
| D546        | The review looks at the code as it is, not at v4's scope (O237)                            | Review [§3][sr3], [Q1][srq1]                                                                                                                                                              |
| D547        | No new runtime dependency besides Tone.js                                                  | Review [§3][sr3], [Q2][srq2]; [E15][e15] item 15                                                                                                                                          |
| D549        | The lexicon page's design validated, `ux-writer`'s answers taken (O239–O244, O246)         | [E5.1][e51], [E6][e6], [E7][e7], [E8][e8], [E10][e10]                                                                                                                                     |
| D551        | The game a separate app; a three-way split (O236)                                          | Review [Q4][srq4]; report [§5][rp5]; its personas: O313, open in the [register](../../open-questions.md#after-v34-the-split-and-this-apps-horizon-o313)                                   |
| D552        | v4.0 most probably this app's last update (a direction)                                    | [Roadmap](../../roadmap.md); [versions](../../versions/README.md); O314, open in the [register](../../open-questions.md#after-v34-the-split-and-this-apps-horizon-o313)                   |
| D553        | v4.0 is Tone.js and accompaniment with roles; v4's other items to v5                       | [v4 README](../../versions/v4/README.md#settled-direction); [v5+ README](../../versions/v5-plus/README.md#moved-from-v4-d553); [roadmap](../../roadmap.md#3-v4--accompaniment-with-roles) |
| D554        | Microphone input out of scope in any version                                               | [v5+ README](../../versions/v5-plus/README.md#out-of-scope-microphone-input-d554)                                                                                                         |
| D555        | The lexicon API moves into v3.4                                                            | [E9][e9]; [roadmap](../../roadmap.md#the-lexicon-api--in-v34-d555)                                                                                                                        |
| D556        | The owner delegates the resolution of v3.4 to the wave driver                              | Review [§7][sr7]; its rulings are D557–D578                                                                                                                                               |
| D557        | A refactor's bounds; the analysis tools (O238)                                             | Review [§3][sr3], [Q3][srq3], [§7][sr7]                                                                                                                                                   |
| D559        | The lexicon API a plain TypeScript module, no server                                       | [E9][e9]                                                                                                                                                                                  |
| D561        | A lexicon backend some day, in Go (a direction)                                            | [E16][e16]; O316, open in the [register](../../open-questions.md#after-v34-the-split-and-this-apps-horizon-o313)                                                                          |
| D562        | The lexicon page works in any orientation                                                  | [E7][e7]                                                                                                                                                                                  |
| D563        | An empty or malformed lexicon fails the build                                              | [E5.3][e53]                                                                                                                                                                               |
| D567        | `#lexicon` under an open sheet opens nothing                                               | [E8][e8]                                                                                                                                                                                  |
| D568        | The stale-phrase prompt counts as a sheet; a sheet opened during the first load stops it   | [E7][e7], [E8][e8]                                                                                                                                                                        |
| D569        | R1, R2 and R3 taken                                                                        | Report [§7][rp7]; plan [chunk 5][p34c5], [chunk 6][p34c6], [chunk 7][p34c7]                                                                                                               |
| D570        | R4: the atom-spread limit above 10 a warning for test files only                           | Report [§7][rp7]; plan [chunk 4][p34c4]                                                                                                                                                   |
| D571        | R5: the start-up budget stays at 400 KiB; an overrun takes a lever, a raise is the owner's | Report [§3][rp3]; plan [M2][p34m2]                                                                                                                                                        |
| D572        | The other recommendations deferred or dropped                                              | Report [§6][rp6], [§7][rp7]                                                                                                                                                               |
| D573        | The split's form (O314 (c))                                                                | Report [§5][rp5]; O314, open in the [register](../../open-questions.md#after-v34-the-split-and-this-apps-horizon-o313)                                                                    |
| D574        | The lexicon API's home is this app (O315)                                                  | [E9.3][e93], [E16][e16]; report [§5][rp5]                                                                                                                                                 |
| D544        | v3.3 released and its record archived                                                      | History: an archive event ([v3.3 release](#v33-release-archived-2026-11-22))                                                                                                              |
| D548        | The lexicon page's questions go to `ux-writer` first                                       | History: a process step, ended by D549                                                                                                                                                    |
| D550        | v3.4 is tagged `3.4.0` (O312)                                                              | History: applied, tag `v3.4.0` (D579); review [§6][sr6]                                                                                                                                   |
| D558        | The lexicon part first, the measurement pass after the page (O245)                         | History: an order, applied; plan [waves][p34waves]                                                                                                                                        |
| D560        | A docs-only lexicon pass before the page's build                                           | History: done as lexicon v1.9; plan [gates][p34gates] (L0)                                                                                                                                |
| D564        | Part E v1.0 approved                                                                       | History: an approval; plan [gates][p34gates] (A0)                                                                                                                                         |
| D565        | The plan's lexicon wave approved                                                           | History: an approval; plan [waves][p34waves]                                                                                                                                              |

### Where each closed v3.4 question now lives

| Question | Decision    | Now lives in                                                                |
| -------- | ----------- | --------------------------------------------------------------------------- |
| O230     | D577 (live) | The atom `module_tension_arc_cycle`, its wording revised by `documentalist` |
| O234     | D545        | Review [§6][sr6]; its tag sub-question went on as O312                      |
| O236     | D551        | Review [Q4][srq4]; report [§5][rp5]                                         |
| O237     | D546        | Review [§3][sr3]                                                            |
| O238     | D547, D557  | Review [§3][sr3], [Q3][srq3]                                                |
| O239     | D549        | [E5.1][e51]                                                                 |
| O240     | D549        | [E6][e6]                                                                    |
| O241     | D549        | [E6][e6]                                                                    |
| O242     | D549        | [E5.2][e52], [E10][e10]                                                     |
| O243     | D549        | [E7][e7], [E8][e8]                                                          |
| O244     | D549        | [E6][e6]                                                                    |
| O245     | D558        | History: an order, applied (plan [waves][p34waves])                         |
| O246     | D549        | [E3][e3]                                                                    |
| O312     | D550        | Review [§6][sr6]; tag `v3.4.0` (D579)                                       |
| O315     | D574        | [E9.3][e93]; report [§5][rp5]                                               |

O48, O49, O100–O102, O115, O116, O176, O180, O183, O190, O267, O269, O271, O313, O314 and O316
stay open in the live [register](../../open-questions.md). No question ID was reserved during this
archive pass; D579 was.

### Left in place at the v3.4 release

| Document                                                                                          | Role                                                                                                                                                                                                                                     | Referenced from                                                                                                                                    |
| ------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| [versions/v3/master-spec.md](../../versions/v3/master-spec.md)                                    | Parts A to E are the contract for the running code                                                                                                                                                                                       | `docs/`, `issues/`, `ui_ux/`, `specs/`                                                                                                             |
| [versions/v3/build-plan-v3.4.md](../../versions/v3/build-plan-v3.4.md)                            | The v3.4 build plan, complete; its release gate's record, and gate H1 after the tag is live; it holds the build calls the tables above point to                                                                                          | `docs/release/`, `specs/`                                                                                                                          |
| [versions/v3/wave-log-v3.4.md](../../versions/v3/wave-log-v3.4.md)                                | The wave driver's record of the v3.4 build; it may still record H1                                                                                                                                                                       | `docs/release/`, `issues/`, `specs/`                                                                                                               |
| [versions/v3/structural-review-report.md](../../versions/v3/structural-review-report.md)          | v3.4's deliverable: the answers to Q1–Q4, the rulings, the deferred recommendations (R6–R11, R13–R15, R18, R19, the levers an overrun takes), the split's form for game start, and §2.1, the input to revising `prerequisites.md` (D575) | `docs/release/`, `specs/generator-architecture.md`, `specs/`                                                                                       |
| [versions/v3/structural-review-evidence/](../../versions/v3/structural-review-evidence/README.md) | The analysts' parts A to F, which the report cites by part and section                                                                                                                                                                   | `docs/release/`, `issues/` (ISS-020), `specs/`                                                                                                     |
| [versions/v3/structural-review.md](../../versions/v3/structural-review.md)                        | The review's scope, questions and definition of done (§6), which the release notes check; the home of D545–D547, D551, D556 and D557                                                                                                     | `docs/release/`, `specs/`                                                                                                                          |
| [versions/v3/lexicon-page.md](../../versions/v3/lexicon-page.md)                                  | The lexicon page's draft v2.3, consolidated into Part E, which wins where they differ; Part E cites it as its source, and its §9 records the API's step                                                                                  | `ui_ux/` (README, decisions, todo, the lexicon page's screen intent), which this pass may not edit; `specs/` (Part E, roadmap, v4 and v5+ READMEs) |
| [versions/v3/README.md](../../versions/v3/README.md)                                              | The version's scope, and the live v3.0.x, v3.2.x, v3.3.x and v3.4.x notes                                                                                                                                                                | `docs/music/`, `specs/`, the v2 archive                                                                                                            |

The v3.0 to v3.3 build plans, the v3.1 to v3.3 wave logs, the shared build workflow and the Jam
mode draft stay in place as at the v3.3 release.

[e34]: ../../versions/v3/master-spec.md#part-e--v34
[e1]: ../../versions/v3/master-spec.md#e1-core-concept
[e2]: ../../versions/v3/master-spec.md#e2-scope
[e3]: ../../versions/v3/master-spec.md#e3-personas-and-goals-served
[e5]: ../../versions/v3/master-spec.md#e5-the-single-source
[e51]: ../../versions/v3/master-spec.md#e51-what-the-lexicon-holds
[e52]: ../../versions/v3/master-spec.md#e52-how-the-text-reaches-the-page
[e53]: ../../versions/v3/master-spec.md#e53-the-build-fails-on-an-empty-or-malformed-lexicon
[e6]: ../../versions/v3/master-spec.md#e6-the-page
[e7]: ../../versions/v3/master-spec.md#e7-opening-and-closing
[e8]: ../../versions/v3/master-spec.md#e8-the-browsers-history-and-the-address
[e9]: ../../versions/v3/master-spec.md#e9-the-lexicon-api
[e93]: ../../versions/v3/master-spec.md#e93-where-it-lives-later
[e10]: ../../versions/v3/master-spec.md#e10-size-offline-and-the-first-load
[e15]: ../../versions/v3/master-spec.md#e15-definition-of-done
[e16]: ../../versions/v3/master-spec.md#e16-deferred-and-open
[sr]: ../../versions/v3/structural-review.md
[sr1]: ../../versions/v3/structural-review.md#1-why-in-the-owners-words
[sr2]: ../../versions/v3/structural-review.md#2-where-it-sits
[sr3]: ../../versions/v3/structural-review.md#3-what-it-is-not
[srq1]: ../../versions/v3/structural-review.md#q1-is-the-architecture-sound-for-expansion
[srq2]: ../../versions/v3/structural-review.md#q2-should-the-entry-budget-be-lowered-and-how
[srq3]: ../../versions/v3/structural-review.md#q3-which-refactoring-opportunities-are-worth-taking
[srq4]: ../../versions/v3/structural-review.md#q4-should-the-app-split-into-several-libraries-or-packages
[sr6]: ../../versions/v3/structural-review.md#6-deliverables
[sr7]: ../../versions/v3/structural-review.md#7-who-does-what-proposed
[rp]: ../../versions/v3/structural-review-report.md
[rp3]: ../../versions/v3/structural-review-report.md#3-q2-the-start-up-budget
[rp5]: ../../versions/v3/structural-review-report.md#5-q4-the-split
[rp6]: ../../versions/v3/structural-review-report.md#6-ranked-recommendations
[rp7]: ../../versions/v3/structural-review-report.md#7-rulings
[p34gates]: ../../versions/v3/build-plan-v3.4.md#gates
[p34waves]: ../../versions/v3/build-plan-v3.4.md#waves
[p34m2]: ../../versions/v3/build-plan-v3.4.md#m2--the-start-up-figure
[p34c4]: ../../versions/v3/build-plan-v3.4.md#chunk-4--the-test-files-atom-spread-limit
[p34c5]: ../../versions/v3/build-plan-v3.4.md#chunk-5--the-library-line-enforced
[p34c6]: ../../versions/v3/build-plan-v3.4.md#chunk-6--session-one-way
[p34c7]: ../../versions/v3/build-plan-v3.4.md#chunk-7--the-jam-host-out-of-the-shell
