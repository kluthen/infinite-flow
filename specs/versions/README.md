# Versions

Status: draft v0.4 (v2 and v3 rows updated 2026-10-03, D173–D175; v2 row 2026-10-05, D183)

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
- Version numbers beyond v2 are the user's rough placements, not commitments.
- Cross-version work that must be built early is tracked in
  [prerequisites.md](prerequisites.md) (being drafted).

## Index

| Version                         | Status                          | Headline                                                                                                                           |
| ------------------------------- | ------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| [v1](v1/README.md)              | Released as `v1.0`; gate closed | Finite four-measure phrase generator                                                                                               |
| [v2](v2/README.md)              | Specced; being built            | Rolling phrase, MIDI acknowledgement, backing, last-session review/export; one release, v2.0, real-hardware checks included (D183) |
| [v3](v3/README.md)              | Direction                       | Player-seeded continuation, "my instrument", earlier sessions; chord-fit check as a nice-to-have                                   |
| [v4](v4/README.md)              | Direction                       | Accompaniment with roles, whole-file seed (proposed)                                                                               |
| [v5+](v5-plus/README.md)        | Direction                       | Library and snippet seeds, microphone input                                                                                        |
| [Endgame](../vision/endgame.md) | Direction only                  | Rhythm RPG built on the v2 loop                                                                                                    |
