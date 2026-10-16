# v3.0 (Storage) Archive

Status: archived 2026-10-16. v3.0 passed its release gate (build plan chunk 26) and is released
as version 3.0.0: the tag `v3.0.0` is at e288d98, and the app is deployed. See the
[release notes](../../../docs/release/v3.0-release-notes.md) and
[`specs/versions/v3/`](../../../specs/versions/v3/README.md). The spec tree's archive of the same
milestone is [`specs/archive/v3/`](../../../specs/archive/v3/README.md) (spec D348).

This is the UI/UX working record of v3.0, from the start of its design on 2026-10-07 to the last
corrections made while it was built (wave 9, 2026-10-16). The design it produced is frozen in
[`versions/v3.0/`](../../versions/v3.0/README.md), corrected during the build to match what
shipped; the same tier documents stay live at the `ui_ux/` root as the cumulative design that
v3.1, v3.2 and v3.3 build on (see "Left in place" below). The records of v3.1, v3.2 and v3.3
(ux D225-D264, Q70-Q75, Q77, their `todo.md` blocks) are not archived: those releases are not
built yet.

## Archived here

- [decisions-D177-D224.md](decisions-D177-D224.md): decisions D177-D224, kept verbatim: the v2
  audio mix applied at the v2 archive, the v3.0 design, the owner's approval, the token-source
  pass and the alignments with master spec v1.3 and v1.4.
- [decisions-D280-D322.md](decisions-D280-D322.md): decisions D280-D322, kept verbatim: the design
  gates and corrections made during the build, waves 2 to 9. D265-D279 were never used.
- [open-questions-Q66-Q69.md](open-questions-Q66-Q69.md): the v3.0 design's questions, all closed.
- [open-questions-Q76.md](open-questions-Q76.md): the interval name `spec-writer` asked for,
  closed. Kept with its section heading.
- [open-questions-Q80.md](open-questions-Q80.md): another tab's `Delete everything`, closed. Kept
  with its section heading.
- [todo.md](todo.md): the finished v3.0 work tracker: from `## In Progress`, the v3.0 design and
  waves 2, 6, 7 and 9; from `## Remaining`, the v3.0 items, the items carried forward from v2 and
  the dropped old unit 9; from `## Next Unit`, the v3.0 paragraphs; kept verbatim, plus a dated
  addendum recording what this pass found true. One link path repaired.

The root copy of `token-source-v3.md` was removed in this pass rather than archived: its tokens
and classes are in `src/styles/theme.css` and `components.css`, shipped in 3.0.0, and the
document is frozen, identical, in
[`versions/v3.0/token-source-v3.md`](../../versions/v3.0/token-source-v3.md) (D323).

## Where D177-D224 now live as settled fact

Documents are named from `ui_ux/`. Each lives at the root (the live, cumulative design) and, as
shipped in v3.0, in `versions/v3.0/`.

| Decisions                                                                                                                                                                                                    | Live document                                                                                                                                                                                                                         |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D177 (the audio mix's levels final as built)                                                                                                                                                                 | `strategy.md` (Context of Use), `flows/play-session/intent.md` (The Audio Mix), `screens/phrase-workspace/handoff.md` (the `Volume` popover)                                                                                          |
| D178 (v3 design starts; marking convention)                                                                                                                                                                  | `README.md` (Released versions and work in progress)                                                                                                                                                                                  |
| D180-D190, D192, D193, D205, D210 (kept sessions inside the review, the entry links, the list, pinning, favorites, export scope, comment, deletions, very short notes, the review's name, unit V1's details) | `flows/kept-sessions/`, `screens/session-list/`, `flows/review-and-export/`, `screens/last-session-review/`, `screens/phrase-workspace/` (cue row)                                                                                    |
| D191, D204 ("Keep my played notes"; saved review preferences)                                                                                                                                                | `flows/review-and-export/`, `screens/last-session-review/`, `flows/saved-data/`                                                                                                                                                       |
| D194-D197, D211, D216 (Your data, `Delete everything`, the notice row, the first phrase waiting for saved settings, unit V2's details, changes during a session saved at its end)                            | `flows/saved-data/`, `screens/your-data/`, `screens/phrase-workspace/` (notice row, load wait), `flows/generate-phrase/`, `flows/play-session/`, `strategy.md` (Edge-Case Policy)                                                     |
| D198-D202, D209, D212 (my instrument, its transposition, the check's "Use this for my instrument", the remembered controller, sound after a load, `Disconnect`, unit V3's details)                           | `flows/my-instrument/`, `screens/my-instrument/`, `flows/controller-connection/`, `screens/controller-connection/`, `screens/phrase-workspace/`                                                                                       |
| D203, D206, D213 (no interface for pre-generation; sheets block the starting note; unit V4's details)                                                                                                        | `flows/generate-phrase/`, `flows/play-session/`, `screens/phrase-workspace/`, `motion.md`                                                                                                                                             |
| D208 (one pattern for every confirmation)                                                                                                                                                                    | `flows/kept-sessions/handoff.md` (The Confirmation Pattern), `screens/last-session-review/handoff.md`, `screens/your-data/`                                                                                                           |
| D214 (my instrument's range in the staff's shared size), as revised by D281                                                                                                                                  | `screens/phrase-workspace/handoff.md` (Notation Contract), `flows/my-instrument/`                                                                                                                                                     |
| D219, D221-D223 (the outdated tab and a failed-read visit offer no deletion; newer data wins over a failed read)                                                                                             | `flows/saved-data/`, `screens/your-data/`, `flows/kept-sessions/`, `screens/session-list/`, `flows/review-and-export/`, `screens/last-session-review/`, `flows/generate-phrase/handoff.md`, `strategy.md`                             |
| D220 (the token-source pass)                                                                                                                                                                                 | `src/styles/theme.css` and `src/styles/components.css` (the token source); the specification it applied is frozen in `versions/v3.0/token-source-v3.md`                                                                               |
| D179, D207, D215, D217, D218, D224 (history)                                                                                                                                                                 | No live home of their own: the interim token-source document (D179, superseded by D220 and D323), the tracker rework (D207), `ux-critic` passes whose fixes are in the rows above (D215, D217, D224), and the owner's approval (D218) |

## Where D280-D322 now live as settled fact

| Decisions                                                                                                                                                                                   | Live document                                                                                                                                                                                                                   |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D281-D285, D291 (the clef control, the range bound's refusal, the staff-reach note, a clef change, the interval name, the stale "treble only" lines)                                        | `flows/my-instrument/`, `screens/my-instrument/`, `flows/controller-connection/`, `screens/controller-connection/`, `screens/phrase-workspace/handoff.md` (Notation Contract), `flows/generate-phrase/intent.md`, `strategy.md` |
| D286-D290 (the erase warning, the delete confirmation's count, the landing, the outdated tab's withheld form, the review's room for another clef)                                           | `screens/my-instrument/`, `flows/my-instrument/`, `flows/kept-sessions/`, `screens/last-session-review/handoff.md`, `flows/saved-data/`                                                                                         |
| D292, D320, D322 (the token source's sizing comment; a lone button in a `sheet-section`; the header build id)                                                                               | `src/styles/theme.css`, `src/styles/components.css`; `screens/your-data/handoff.md`; `screens/phrase-workspace/handoff.md` (Layout Tree, Components and Content, Responsive Behavior)                                           |
| D293, D318 (chunk 4's carry-overs; another tab's `Delete everything` outdates every other tab)                                                                                              | `flows/saved-data/` (Notices), `screens/your-data/handoff.md`                                                                                                                                                                   |
| D297-D304, D319 (the stale phrase prompt: form, wording, labels, the changed settings named, focus, after `Start with this phrase`, the phone, the policy lines; the preset shown after it) | `screens/stale-phrase-prompt/`, `flows/play-session/`, `screens/phrase-workspace/`, `flows/generate-phrase/`, `strategy.md`, `motion.md`                                                                                        |
| D308, D315 (`Export played notes` disabled for a file with no note; the lane's minimum bar width)                                                                                           | `flows/review-and-export/`, `screens/last-session-review/`, `strategy.md` (Edge-Case Policy)                                                                                                                                    |
| D309-D312, D317 (damaged sessions: the apology, the landing, the list aligned, the policy lines; the most recent session after a deletion)                                                  | `flows/saved-data/`, `flows/kept-sessions/` (A Damaged Session), `screens/session-list/`, `screens/your-data/handoff.md`, `screens/phrase-workspace/handoff.md`, `strategy.md`                                                  |
| D316 (a deletion under way finishes when its sheet is closed)                                                                                                                               | `flows/kept-sessions/handoff.md` (The Confirmation Pattern), `screens/last-session-review/handoff.md` (Confirmations, Focus and Keyboard)                                                                                       |
| D321 (every sheet capped at every breakpoint)                                                                                                                                               | `screens/my-instrument/handoff.md`, `screens/your-data/handoff.md`, `screens/stale-phrase-prompt/`, `screens/preset-sheet/handoff.md`; `sheet-wide` in `src/styles/components.css`                                              |
| D280, D294-D296, D305-D307, D313, D314 (history)                                                                                                                                            | No live home of their own: where each gate was written (D280, D296, D307; the corrections are recorded in `versions/v3.0/README.md`), and `ux-critic` passes whose fixes are in the rows above                                  |

## Where Q66-Q69, Q76 and Q80 now live

Every question is closed. Each entry in the archived files names what closed it; the live
documents are those of the closing decision's row above.

| Question | Closed by              | Live document                                                                          |
| -------- | ---------------------- | -------------------------------------------------------------------------------------- |
| Q66      | D218, applied as D220  | `src/styles/theme.css`, `src/styles/components.css`                                    |
| Q67      | D218 (spec D219, D221) | The rows of D183, D185, D191, D195, D197, D199, D201, D202, D209, D214, D216 above     |
| Q68      | D221 (spec D223)       | `flows/kept-sessions/`, `flows/review-and-export/`, `flows/saved-data/` and screens    |
| Q69      | D223 (spec D226)       | `flows/kept-sessions/`, `flows/review-and-export/`, `flows/saved-data/`, `strategy.md` |
| Q76      | D285 (spec D253, D257) | `screens/my-instrument/`, `flows/controller-connection/`                               |
| Q80      | D318 (spec D331)       | `flows/saved-data/` (Notices)                                                          |

## Left in place

| Document                                                                     | Role                                                                                                                                                                | Referenced from                                                                                               |
| ---------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| `strategy.md`, `motion.md`, every `flows/` and `screens/` folder at the root | The live, cumulative design, v3.0 included, that v3.1 to v3.3 extend; it keeps v3.0's change marks, under v3.1's to v3.3's, until v4's design starts                | `specs/versions/v3/` build plans, `docs/` module documents                                                    |
| `token-source-v3.1-v3.2.md`                                                  | The v3.1 and v3.2 tokens and classes, not yet written into the token source                                                                                         | `specs/versions/v3/build-plan-v3.1.md`, `build-plan-v3.2.md`, the v3.1 and v3.2 handoffs                      |
| [`versions/v3.0/`](../../versions/v3.0/README.md)                            | The v3.0 design as shipped, frozen; this pass recorded its released status and the handoffs' token-source wording (D323)                                            | `README.md`, `specs/versions/v3/build-plan.md`                                                                |
| `decisions.md`, `open-questions.md`, `todo.md`                               | The live registers, trimmed: the decisions log D225-D264 and from D323; Q16 open, Q70-Q75 and Q77 (v3.1 to v3.3); the v3.1 to v3.3 work and the items still pending | `specs/versions/v3/` (ux decision and question IDs, resolved through the registers' headers), `docs/release/` |
