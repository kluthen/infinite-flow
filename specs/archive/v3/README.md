# v3 Archive

Status: archived 2026-10-16 (the v3.0 release); extended 2026-10-21 (the v3.1 release),
2026-11-09 (O306's note) and 2026-11-09 (the v3.2 release)

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
release, on 2026-11-09: see [v3.2 release](#v32-release-archived-2026-11-09) below.

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
| D232 | The rhythm lock is strict; allowed rhythm changes, each lasting one phrase; wider options in v4 | [C7.1][pc71], [C7.2][pc72], [C7.4][pc74]; wider options: [v4](../../versions/v4/README.md#placed-here-proposed) |
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
