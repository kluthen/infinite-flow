# v3 Archive

Status: archived 2026-10-16 (the v3.0 release); extended 2026-10-21 (the v3.1 release)

v3.0, storage, is released as version 3.0.0: the release gate, build plan
[chunk 26](../../versions/v3/build-plan.md#chunk-26--v30-release-gate), passed on 2026-10-16, the
tag `v3.0.0` is at e288d98, and the app is deployed (D348). The
[release notes](../../../docs/release/v3.0-release-notes.md) hold the evidence for every definition
of done item. This folder holds v3.0's working record, from the v2.0 release record and v3's
direction (2026-10-07) to the release gate's final sync. What v3.0 does is stated in
[master spec Part A](../../versions/v3/master-spec.md#part-a--v30). v3.2, v3.3 and v3.4 are not
built yet; their records stay live and will be archived here at their own releases. v3.1's record
was archived here at its release, on 2026-10-21: see [v3.1 release](#v31-release-archived-2026-10-21)
below, which also says what of v3.0's "left in place" list it moved.

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
