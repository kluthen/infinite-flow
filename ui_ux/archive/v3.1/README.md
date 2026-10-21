# v3.1 (Presets and Embellishment Figures) Archive

Status: archived 2026-10-21. v3.1 passed its release gate (build plan chunk 21) and is released
as version 3.1.0: the tag `v3.1.0` is at 55364e7. See the
[release notes](../../../docs/release/v3.1-release-notes.md) and
[`specs/versions/v3/build-plan-v3.1.md`](../../../specs/versions/v3/build-plan-v3.1.md). The
owner's hand checks v3.1 H3, H4 and H5 run after the release (spec D397); the live `todo.md`
carries them. The spec tree archives the same milestone in its own `specs/archive/`.

This is the UI/UX working record that belonged to v3.1 alone. v3.1 and v3.2 were designed
together on 2026-10-08, so part of v3.1's record is shared with v3.2 and stays live (see "Left in
place" below): the marking and token-source decisions (ux D225, D226), the details settled while
writing units P and R (D246), the closing of Q70-Q72 (D249), the `ux-critic` passes (D250), and
the work items for units W0 and R and their validation. The design v3.1 produced is frozen in
[`versions/v3.1/`](../../versions/v3.1/README.md), corrected to match what shipped; the same
tier documents stay live at the `ui_ux/` root as the cumulative design that v3.2 and v3.3 build
on.

## Archived here

- [decisions-D227-D234.md](decisions-D227-D234.md): decisions D227-D234, kept verbatim with their
  `### v3.1` heading: the v3.1-only design decisions of 2026-10-08 (the preset selector, the
  selection's display and description line, the key and mode marks, the embellishment levels,
  saving, renaming and deleting presets, presets during a session, the preset label in kept
  sessions, presets in Your data).
- [decisions-D323-D326.md](decisions-D323-D326.md): decisions D323-D326, kept verbatim with their
  section headings: the root's `token-source-v3.md` leaving after the v3.0 release, v3.1's
  approval and freeze, its token-source pass and its release gate's class check.
- [open-questions-Q71.md](open-questions-Q71.md): what `Save changes` does to a player preset's
  key and mode restriction, closed. Kept with its section heading and intro.
- [todo.md](todo.md): the v3.1-only items of the work tracker (unit P, the approval, the
  token-source pass, the release gate's class check, the v3.1 `## Next Unit` paragraph), kept
  verbatim, plus a dated addendum recording what this pass found true. One link path repaired.

## Where D227-D234 now live as settled fact

Documents are named from `ui_ux/`. Each lives at the root (the live, cumulative design) and, as
shipped in v3.1, in `versions/v3.1/`.

| Decisions                                                         | Live document                                                                                                                                                                         |
| ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D227 (the preset selector, a native select atop the controls)     | `screens/phrase-workspace/` (the preset bar), `flows/presets/`                                                                                                                        |
| D228 (the selection's display, the description line, the summary) | `flows/presets/` (Custom and its base), `screens/phrase-workspace/handoff.md`                                                                                                         |
| D229 (the key and mode marks and their sentence)                  | `screens/phrase-workspace/` (the key and mode marks), `flows/presets/`, `motion.md`                                                                                                   |
| D230 (the embellishment levels, their labels and notes)           | `screens/phrase-workspace/` (Embellishments), `strategy.md`, `flows/play-session/handoff.md`; its passing-and-neighbor rule is history, removed at the release gate (D326, spec D378) |
| D231 (saving, renaming and deleting presets)                      | `flows/presets/`, `screens/preset-sheet/`, `flows/saved-data/handoff.md` (the refused save)                                                                                           |
| D232 (presets during a session)                                   | `flows/presets/` (During a session), `screens/phrase-workspace/handoff.md`, `flows/play-session/handoff.md`                                                                           |
| D233 (the preset label in kept sessions)                          | `flows/kept-sessions/`, `screens/session-list/`, `screens/last-session-review/`, `flows/saved-data/`                                                                                  |
| D234 (Your data lists the player's presets)                       | `screens/your-data/`, `flows/saved-data/`                                                                                                                                             |

## Where D323-D326 now live as settled fact

| Decisions                                                | Live document                                                                                                                                                                                                                |
| -------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D323 (`token-source-v3.md` leaves the root)              | `README.md` (Map: the token source); the handoffs cite `src/styles/theme.css` and `components.css`; the frozen document is `versions/v3.0/token-source-v3.md`                                                                |
| D324 (v3.1 approved and frozen)                          | `versions/v3.1/README.md`, `README.md` (Released versions and work in progress)                                                                                                                                              |
| D325 (v3.1's token-source pass)                          | `src/styles/theme.css` and `src/styles/components.css` (the token source); part 1 of `token-source-v3.1-v3.2.md`, marked applied; the specification it applied is frozen in `versions/v3.1/token-source-v3.1.md`             |
| D326 (the release gate's class check and its correction) | `screens/phrase-workspace/handoff.md`, `flows/play-session/handoff.md` (the preset after `Start with this phrase`), `screens/phrase-workspace/` (Embellishments), each also in `versions/v3.1/`; the check itself is history |

## Where Q71 now lives

| Question | Closed by              | Live document                                                                      |
| -------- | ---------------------- | ---------------------------------------------------------------------------------- |
| Q71      | D249 (spec D242), live | `flows/presets/`, `screens/preset-sheet/` (`Save changes` outside the restriction) |

## Left in place

| Document                                                                     | Role                                                                                                                                                                                                                                                  | Referenced from                                                                                               |
| ---------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| `strategy.md`, `motion.md`, every `flows/` and `screens/` folder at the root | The live, cumulative design, v3.1 included, that v3.2 and v3.3 extend; it keeps v3.0's and v3.1's change marks, under v3.2's and v3.3's, until v4's design starts                                                                                     | `specs/versions/v3/` build plans, `docs/` module documents                                                    |
| `token-source-v3.1-v3.2.md`                                                  | Part 1 (v3.1) applied and marked so; part 2 (v3.2) not yet written into the token source. The document goes once both are in                                                                                                                          | `specs/versions/v3/build-plan-v3.2.md`, the v3.2 handoffs, `README.md`                                        |
| [`versions/v3.1/`](../../versions/v3.1/README.md)                            | The v3.1 design as shipped, frozen; this pass recorded its released status and its preset sheet's token-source wording (D327). The owner's hand checks H3-H5 read it                                                                                  | `README.md`, `specs/versions/v3/build-plan-v3.1.md`                                                           |
| `decisions.md`, `open-questions.md`, `todo.md`                               | The live registers, trimmed: decisions D225, D226, D235-D264 and from D327; Q16 and Q73-Q75 open, Q70, Q72 (v3.2) and Q77 (v3.3) closed but kept until their release; the v3.2 and v3.3 work, the shared v3.1 items and the hand checks still pending | `specs/versions/v3/` (ux decision and question IDs, resolved through the registers' headers), `docs/release/` |
