# Versions

Status: draft v0.14 (v2 and v3 rows updated 2026-10-03, D173–D175; v2 row 2026-10-05, D183; v2
released 2026-10-07, D208; v3 split into releases and v4 row updated 2026-10-07, D211, D212;
build-plan workflow 2026-10-09, D252; style packs row, planned with no version, 2026-10-11, D259,
merged from branch `v4-accompaniment-research` 2026-10-19; v3.3 added to the v3 row 2026-10-12,
D261, D262; v3.0 released 2026-10-16, D348; v3.4, a structural review, added 2026-10-21, D389; the lexicon page added to v3.4 and the lexicon
API row, planned for v4 or v5, 2026-10-21, D393–D395; v3.1 released 2026-10-21, D397, D398; v3.2 released 2026-11-09, D523, archived D524; v3.3 released
2026-11-18, archived 2026-11-22, D544; the three-way split and the v4.0 horizon noted
2026-11-22, D551, D552; v4 and v5+ rows, the lexicon API row and v3.4 updated 2026-11-22,
D553–D555; v3.4 released 2026-11-24, archived D579; v4.0's spec session opened 2026-11-24, D580–D584)

The scope of each planned version of Infinite Flow is kept in its own folder. The ordered
timeline is in the [roadmap](../roadmap.md). The product-wide principles are in the
[far vision](../vision/far-vision.md).

> **Note (2026-11-22, D551–D555): the owner's direction for this app's horizon.** The owner
> favours a three-way split (a library, this app, the game; D551) and expects v4.0, with "basic
> accompaniments", to be this app's last update most probably (D552). v4.0 is Tone.js and
> accompaniment with roles, v4's other items moved to v5 (D553), microphone input is out in any
> version (D554), and the lexicon API is v3.4's (D555). v5+ will probably move to the game's app,
> to be reviewed later (D553, a direction): where each item after v4 goes is
> [O314](../open-questions.md#after-v34-the-split-and-this-apps-horizon-o313).

## Convention

- Each version folder holds a `README.md` with the version's **status**, **settled scope**,
  **deferred items** and **open questions**.
  - Settled scope is written as fact. Tentative items are tagged `(proposed)`.
  - Open questions are cited by their stable `O` ID and live in exactly one place.
- Once a version is actively specced, its folder also holds that version's topic documents
  (mechanics, data model, flows…) and finally its **master spec**, the handoff to
  `coding-leader`.
- A version's **build plan** runs wave by wave (D252). Each wave starts with one intent preflight
  (architecture captures included) and ends with one wave gate: `npm run quality`, the sweep when
  needed, the bundle figure and one post-task sync. Each chunk does tests first, implement,
  verify and documents, and its verify covers only its own change. Chunks merge into a wave
  branch; the wave merges into `main` after its gate, when the owner asks. The v3 build plans'
  §3 is the model.
- Version numbers beyond v2 are the user's rough placements, not commitments.
- Cross-version work that must be built early is tracked in
  [prerequisites.md](prerequisites.md) (being drafted).

## Index

| Version                                                                    | Status                                              | Headline                                                                                                                                                                                                                                                                             |
| -------------------------------------------------------------------------- | --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| [v1](v1/README.md)                                                         | Released as `v1.0`; gate closed                     | Finite four-measure phrase generator                                                                                                                                                                                                                                                 |
| [v2](v2/README.md)                                                         | Released as 2.0.0, tagged `v2.0.0`                  | Rolling phrase, MIDI acknowledgement, backing, last-session review/export; one release, v2.0, real-hardware checks included (D183)                                                                                                                                                   |
| [v3](v3/README.md)                                                         | v3.0, v3.1, v3.2, v3.3 and v3.4 released (3.0.0, 3.1.0, 3.2.0, 3.3.0, 3.4.0) | v3.0 storage (persistence, "my instrument", earlier and kept sessions, favorites, pre-generation, stray notes); v3.1 embellishments and presets; v3.2 Jam (D211); v3.3 richer chords, opt-in: one Seventh chords level (D261, D262, D544); v3.4 structural review (D389), the lexicon page (D393) and the lexicon API (D555), tagged `3.4.0` (D550) |
| [v4](v4/README.md)                                                         | v4.0 master spec approved (D596), v1.0.1 (D597)     | v4.0: accompaniment with roles and Tone.js (D553); most probably this app's last update (D552)                                                                                                                                                                                      |
| [Lexicon API](../roadmap.md#the-lexicon-api--in-v34-d555)             | Released in v3.4 (D555, D579; v4 or v5 until then, D395) | The music lexicon as "a proper API", step two of v3.4's lexicon page; a plain TypeScript module, no server (D559)                                                                                                                                                                    |
| [Style packs](../roadmap.md#planned-version-not-yet-assigned--style-packs) | Planned, version not assigned                       | Style packs over the one generator: new capabilities, off by default, grouped by style; research only (D259)                                                                                                                                                                         |
| [v5+](v5-plus/README.md)                                                   | Direction; probably moving to the game's app (D553) | Library and snippet seeds; from v4, the whole-file seed, rhythm ratios and editor, wider rhythm mutations (D553); microphone input out (D554)                                                                                                                                         |
| [Endgame](../vision/endgame.md)                                            | Direction only                                      | Rhythm RPG built on the v2 loop                                                                                                                                                                                                                                                      |
