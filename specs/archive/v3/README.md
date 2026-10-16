# v3 Archive

Status: archived 2026-10-16 (the v3.0 release)

v3.0, storage, is released as version 3.0.0: the release gate, build plan
[chunk 26](../../versions/v3/build-plan.md#chunk-26--v30-release-gate), passed on 2026-10-16, the
tag `v3.0.0` is at e288d98, and the app is deployed (D348). The
[release notes](../../../docs/release/v3.0-release-notes.md) hold the evidence for every definition
of done item. This folder holds v3.0's working record, from the v2.0 release record and v3's
direction (2026-10-07) to the release gate's final sync. What v3.0 does is stated in
[master spec Part A](../../versions/v3/master-spec.md#part-a--v30). v3.1, v3.2 and v3.3 are not
built yet; their records stay live and will be archived here at their own releases.

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
