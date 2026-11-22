# v3.3 (richer chords) Archive

Status: archived 2026-11-22. v3.3 passed its release gate's machine half (build plan v3.3's chunk 22) and is released as version 3.3.0: the tag `v3.3.0` is at b2a0e3fa, 2026-11-18. See the
[release notes](../../../docs/release/v3.3-release-notes.md). By the owner's ruling (spec D541, as
spec D521 for v3.2), its hand and listening checks follow the tag: L2 (v3.3 H2) and any tuning of
the shares, U1b (`ux-writer`'s confirmation of the Seventh chords labels on the final shares),
H3-H6 and M3. The live `todo.md` carries U1b and H6's design side. The spec tree archives the
same milestone in its own `specs/archive/`.

This is the UI/UX working record that belonged to v3.3: the design of 2026-10-12 (unit S), its
refresh against v3.2 as built, and the closed question Q77. Five v3.3 entries stay live until
the checks after the tag are done, since a finding may correct the frozen copy: D482 (the copy),
D485 (gate U1a, the labels U1b confirms), D486 (a follow-up not yet built), and D481 and D484,
which sit between them (D484 is also the standing format rule for the root's tier documents).
v3.2's D480 and D483 stay live for v3.2's own hand checks. The design v3.3 produced is frozen in
[`versions/v3.3/`](../../versions/v3.3/README.md); the same tier documents stay live at the
`ui_ux/` root as the cumulative design the next release builds on.

## Archived here

- [decisions-D252-D264.md](decisions-D252-D264.md): decisions D252-D264, kept verbatim with their
  section heading and intro: the v3.3 design of 2026-10-12. D265-D279 were never used.
- [decisions-D477-D479.md](decisions-D477-D479.md): decisions D477-D479, kept verbatim with their
  section heading and intro: the v3.3 design refreshed against v3.2 as built (2026-11-09). D480
  and D481, from the same section, stay live; D476 was never used.
- [open-questions-Q77.md](open-questions-Q77.md): Q77, raised for v3.3 on 2026-10-12, closed by
  spec D275 and kept live until the release. Kept with its section heading.
- [todo.md](todo.md): the finished v3.3 items of the work tracker (the `## In Progress` v3.3
  block and the v3.3 `## Next Unit` paragraph), kept verbatim, plus a dated addendum recording
  what this pass found true.

## Where D252-D264 and D477-D479 now live as settled fact

Documents are named from `ui_ux/`. Each lives at the root (the live, cumulative design) and, as
shipped in v3.3, in `versions/v3.3/`.

| Decisions                                                       | Live document                                                                                                                                                                                                        |
| --------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D252 (v3.3 marked on top of v3.0's to v3.2's marks)             | `README.md` (Released versions and work in progress), `versions/v3.3/README.md`                                                                                                                                      |
| D253 (the level in the foundation group, after Harmonic motion) | `screens/phrase-workspace/handoff.md` (Control section, Embellishments and seventh chords), `screens/phrase-workspace/intent.md`, `strategy.md`                                                                      |
| D254 (the four labels)                                          | `screens/phrase-workspace/handoff.md` (Embellishments and seventh chords: Seventh chords); the top label is `Always` since D485 (live); U1b confirms them after the tag                                              |
| D255 (the level's note and behaviour)                           | `screens/phrase-workspace/` (Seventh chords), `flows/presets/`, `flows/play-session/`, `flows/generate-phrase/handoff.md`, `flows/saved-data/handoff.md`; the note as D263 corrected it                              |
| D256 (three built-in descriptions suggest the level)            | `screens/phrase-workspace/handoff.md` (Presets: Seventh chords suggestions)                                                                                                                                          |
| D257 (Vary settings' note)                                      | `screens/phrase-workspace/handoff.md` (Layout Tree, Session options)                                                                                                                                                 |
| D258 (the seventh chord symbols' look and fit)                  | `screens/phrase-workspace/handoff.md` (Notation Contract: Seventh chord symbols, Staff layout and room), `strategy.md` (Engraving Policy), `screens/last-session-review/handoff.md`; at every width, per D481 (live) |
| D259 (the spoken words for the suffixes)                        | `screens/phrase-workspace/handoff.md` (Notation Contract: The score's spoken description), `screens/phrase-workspace/intent.md`                                                                                      |
| D260 (review, exports, kept sessions and Your data)             | `flows/review-and-export/handoff.md`, `screens/last-session-review/handoff.md`, `flows/saved-data/handoff.md`                                                                                                        |
| D261 (no new token, class or motion)                            | `README.md` (Map: v3.3 adds no token, class or motion)                                                                                                                                                               |
| D262 (written in one pass)                                      | **history**: a process record; its "unchanged" list corrected by D477                                                                                                                                                |
| D263 (`ux-critic`'s v3.3 pass)                                  | its fixes in `screens/phrase-workspace/`, `flows/presets/`, `flows/jam/`, `flows/generate-phrase/handoff.md`, `strategy.md`; the pass is history                                                                     |
| D264 (Q77 closed; the build plan reviewed)                      | the label mapping in `screens/phrase-workspace/handoff.md` (Seventh chords); the asks of the plan are **history**, taken into build plan v3.3                                                                        |
| D477 (Jam's own level in `flows/jam/` and the review side)      | `flows/jam/handoff.md` (Routing Rules), `flows/jam/intent.md` (Jam's Settings), `flows/review-and-export/handoff.md`, `screens/stale-phrase-prompt/handoff.md`, `strategy.md` (Edge-Case Policy)                     |
| D478 (the phone's height; a phone failure accepted)             | `screens/phrase-workspace/handoff.md` (the phone's height); the acceptance of a phone failure is **history**, withdrawn by D481 (live)                                                                               |
| D479 (v3.2's later features need nothing more)                  | **history**: a check; the handoffs as they stand                                                                                                                                                                     |

## Where the question now lives

| Question | Closed by        | Live document                                                                                                         |
| -------- | ---------------- | --------------------------------------------------------------------------------------------------------------------- |
| Q77      | D264 (spec D275) | `screens/phrase-workspace/handoff.md` (Seventh chords: the phrase falls back to triads as a whole); master spec §D5.2 |

## Left in place

| Document                                                                     | Role                                                                                                                                                                                                                                                  | Referenced from                                                                                               |
| ---------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| `strategy.md`, `motion.md`, every `flows/` and `screens/` folder at the root | The live, cumulative design, v3.3 included, that the next release extends; it keeps v3.0's to v3.3's change marks until the next version's design starts                                                                                              | `specs/versions/v3/` build plans, `docs/` module documents                                                    |
| [`versions/v3.2/`](../../versions/v3.2/README.md)                            | The v3.2 design as shipped, frozen; untouched by this pass. v3.2's hand checks after its tag still read it                                                                                                                                            | `README.md`, the v3.2 build plan                                                                              |
| [`versions/v3.3/`](../../versions/v3.3/README.md)                            | The v3.3 design, frozen at its gate D0 and corrected by D485; untouched by this pass (its README's status line still reads "approved, not yet built"). U1b and H6 read it; a finding that changes the design corrects it and the root alike, recorded | `README.md`, the v3.3 build plan                                                                              |
| `decisions.md`, `open-questions.md`, `todo.md`                               | The live registers, trimmed: decisions D480-D486; Q16 open; the standing rules, v3.2's and v3.3's checks after their tags, the root–suffix follow-up, the items carried forward and the options-panel side work                                       | `specs/versions/v3/` (ux decision and question IDs, resolved through the registers' headers), `docs/release/` |
