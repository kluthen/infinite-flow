# Versions

Status: draft v0.10 (v2 and v3 rows updated 2026-10-03, D173–D175; v2 row 2026-10-05, D183; v2
released 2026-10-07, D208; v3 split into releases and v4 row updated 2026-10-07, D211, D212;
build-plan workflow 2026-10-09, D252; style packs row, planned with no version, 2026-10-11, D259,
merged from branch `v4-accompaniment-research` 2026-10-19; v3.3 added to the v3 row 2026-10-12,
D261, D262; v3.0 released 2026-10-16, D348; v3.4, a structural review, added 2026-10-21, D389; the lexicon page added to v3.4 and the lexicon
API row, planned for v4 or v5, 2026-10-21, D393–D395)

The scope of each planned version of Infinite Flow is kept in its own folder. The ordered
timeline is in the [roadmap](../roadmap.md). The product-wide principles are in the
[far vision](../vision/far-vision.md).

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
| [v3](v3/README.md)                                                         | v3.0 released as 3.0.0; v3.1–v3.3 master spec parts | v3.0 storage (persistence, "my instrument", earlier and kept sessions, favorites, pre-generation, stray notes); v3.1 embellishments and presets; v3.2 Jam (D211); v3.3 richer chords, opt-in, research first (D261, D262); v3.4 structural review (D389) and the lexicon page (D393) |
| [v4](v4/README.md)                                                         | Direction                                           | Accompaniment with roles, whole-file seed (proposed), rhythm ratios and editor (D211)                                                                                                                                                                                                |
| [Lexicon API](../roadmap.md#planned-v4-or-v5--the-lexicon-api)             | Planned for v4 or v5, version not decided           | The music lexicon as "a proper API", after v3.4's lexicon page; not specced (D395)                                                                                                                                                                                                   |
| [Style packs](../roadmap.md#planned-version-not-yet-assigned--style-packs) | Planned, version not assigned                       | Style packs over the one generator: new capabilities, off by default, grouped by style; research only (D259)                                                                                                                                                                         |
| [v5+](v5-plus/README.md)                                                   | Direction                                           | Library and snippet seeds, microphone input                                                                                                                                                                                                                                          |
| [Endgame](../vision/endgame.md)                                            | Direction only                                      | Rhythm RPG built on the v2 loop                                                                                                                                                                                                                                                      |
