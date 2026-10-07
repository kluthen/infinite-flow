# v2 (Rolling Phrase) Archive

Status: archived 2026-10-07. The v2.0 release gate (build plan chunk 21) passed with 0 rows not
met, and v2 is released as version 2.0.0; the `v2.0.0` tag waits for the owner's approval. See
the [release notes](../../../docs/release/v2.0-release-notes.md) and
[`specs/versions/v2/`](../../../specs/versions/v2/README.md). The spec tree's archive of the same
milestone is [`specs/archive/v2/`](../../../specs/archive/v2/README.md) (spec D208).

v2 was planned as four releases (v2.0, v2.1, v2.2, v2.4) and shipped as one, v2.0 (spec D183).
This is the UI/UX working record of all of it, from the design kickoff on 2026-09-27 to the gate.
The design it produced is frozen in [`versions/v2/`](../../versions/v2/README.md); the same tier
documents stay live at the `ui_ux/` root as the cumulative design the next version builds on
(see "Left in place" below).

## Archived here

- [decisions-D45-D176.md](decisions-D45-D176.md): the complete v2 decision log, D45-D176, kept
  verbatim. It is append-only history, so don't edit it. New decisions go in the live
  [decisions log](../../decisions.md), numbered from D177.
- [open-questions-Q17-Q64.md](open-questions-Q17-Q64.md): the register's v2 section, every v2
  question (Q17-Q64), all closed, kept verbatim with its header paragraph. Q16, still open, stays
  live in [`open-questions.md`](../../open-questions.md).
- [todo.md](todo.md): the finished v2 work tracker: the `## In Progress` section, units 1-8, 10
  and 11 and the persona-pass item from `## Remaining`, and the whole `## Next Unit` section, kept
  verbatim, plus a dated addendum recording what this pass found true. Unit 9 (moved to v3), the
  revalidation rule, the Q16 item and two items the addendum carries forward stay live in the
  current [`todo.md`](../../todo.md).

## Where D45-D176 now live as settled fact

Documents are named from `ui_ux/`. Each lives at the root (the live, cumulative design) and, as
shipped in v2, in `versions/v2/`.

| Decisions                                                                                                                                                                                                                                       | Live document                                                                                                                                                                                       |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D45 (the session extends the phrase workspace; no second top-level screen)                                                                                                                                                                      | `strategy.md` (Problem Alignment), `screens/phrase-workspace/intent.md`, `flows/play-session/intent.md` (Starting)                                                                                  |
| D46, D159 (the quiet "reached tempo" line)                                                                                                                                                                                                      | `screens/phrase-workspace/` (intent, handoff), `strategy.md` (Trade-offs)                                                                                                                          |
| D47-D53, D55-D59, D146-D148 (controller connection: flow and sheet, entry point and colour rule, keyboard and focus, check wording, mid-session loss and disconnect banner, starting note, header badge, unplug and replug, device changes in the open sheet, badge width, sheet actions, spacing) | `flows/controller-connection/`, `screens/controller-connection/`, `screens/phrase-workspace/` (Controller Status, cue row), `strategy.md` (Edge-Case Policy, Optional MIDI)                         |
| D60, D61 (released versions frozen in `versions/`; change marking)                                                                                                                                                                              | `README.md` (Released versions and work in progress), `versions/v1/`, `versions/v2/`                                                                                                                |
| D62-D70 (context of use, no iPad, phone review baseline, persona trade-offs, export by content, keeping sessions later, two export buttons, favorites in v3, staff and Stop the only essentials)                                               | `strategy.md` (Problem Alignment, Context of Use, Trade-offs), `flows/review-and-export/`, `screens/last-session-review/`                                                                           |
| D71, D72 (two alternating staff systems; no staff-only view in v2)                                                                                                                                                                              | `strategy.md` (Trade-offs), `flows/play-session/intent.md` (The Rolling Display, What This Flow Deliberately Leaves Out), `screens/phrase-workspace/handoff.md`                                    |
| D73-D76, D78-D85 (screen kept awake, count-in click, playhead band, cue row, the session flow's shape, Start and Stop, session-time workspace, starting-note line and count-in, refill and acknowledgement, session notices, audio mix, ending)          | `flows/play-session/`, `screens/phrase-workspace/`, `strategy.md` (Context of Use, Edge-Case Policy), `motion.md`                                                                                  |
| D86-D92, D94-D96, D98-D102, D104-D106 (unit 2's settled edges: backing to silence, no start over a generation error or an unshown staff, endings in the count-in, viewport changes, the phone's whole staff and split layout sized to its height, focus on sheet close, short disconnect wording, misfits as failed attempts, acknowledgement colour, waiting material re-checked) | `flows/play-session/`, `screens/phrase-workspace/` (States, Notation Contract, Responsive Behavior), `strategy.md` (Context of Use, Trade-offs, Edge-Case Policy), `motion.md`; tokens in `src/styles/` |
| D107-D113, D115-D118, D120-D124, D126 (no-room notice and its sentences, idle fit retries, no `Sixteenth` density on a phone, per-phrase scale, what clears the notice, rounds of attempts, the unsupported-rhythm path to Empty, volume popover at start, phone toggles, one `staff-content` per system) | `screens/phrase-workspace/` (States, Notation Contract, Components and Content), `flows/generate-phrase/`, `flows/play-session/`, `strategy.md` (Edge-Case Policy), `motion.md`                 |
| D119 (the owner's working rules)                                                                                                                                                                                                                 | Points 2 and 3: `strategy.md` (Context of Use, Trade-offs, Edge-Case Policy). Point 1, a standing working rule for `ux-writer`, is restated in the live `todo.md`                                  |
| D127-D129, D131-D134 (phone staff height, system-position size, start marker; what an acknowledgement lights, playhead geometry, start marker shape, idle attempt budget)                                                                        | `screens/phrase-workspace/handoff.md` (Notation Contract, Layout Tree, Responsive Behavior), component comments in `src/styles/components.css`                                                      |
| D136-D141, D143-D145, D149-D153 (where the Review sits, phrase 1 after a session, focus, the Review with no room, its contents, the generated-notes export, leaving it before a session, showing and reopening it, controls reachable, build details) | `flows/review-and-export/`, `screens/last-session-review/`, `screens/phrase-workspace/intent.md` (After a Session) and `handoff.md` (States), `flows/play-session/`, `strategy.md` (Trade-offs, Edge-Case Policy) |
| D135 (the owner's direction for the Review)                                                                                                                                                                                                      | `strategy.md` (Trade-offs: phone and larger screens), `screens/last-session-review/intent.md` (What Is Deliberately Left Out, On a Phone)                                                           |
| D142, D163-D166, D168-D176 (`ux-critic` findings settled: Review fixes, played-notes time axis and barlines, switch semantics, Tier 1 wording, a flip shown as customized, `preset-status` going quiet, density timing, grammar word, raised tempo display, unavailable `Off`, the Tension control, lexicon wording) | The same documents as the unit each belongs to (rows above and below); lexicon wording in `docs/music/lexicon.md`                                                                                  |
| D155-D158, D160 (the "During a session" options group, how an automatic change shows, settings returning at the end, Rising tempo, Tension across phrases)                                                                                     | `screens/phrase-workspace/` (The Session Options, Components and Content), `flows/play-session/`, `flows/generate-phrase/handoff.md`, `strategy.md` (Trade-offs, Edge-Case Policy), `motion.md`    |
| D161, D162 (played notes in the Review; the played-notes export)                                                                                                                                                                                | `screens/last-session-review/`, `flows/review-and-export/`, `strategy.md` (Edge-Case Policy), `motion.md`                                                                                          |
| D54, D77, D93, D97, D103, D114, D125, D130, D154, D167 (history)                                                                                                                                                                                 | No live home of their own: an execution record (D54), a wording correction (D77), confirmations of behaviour already written (D93, D97, D103, D114, D125, D130, D167, each applied in the rows above), and D154, which moved unit 9 to v3 (unit 9 stays live in `todo.md`) |

## Where Q17-Q64 now live

Every question is closed. Each entry in the archived register names what closed it; the live
documents are those of the closing decision's row above.

| Questions               | Closed by                                       | Live document                                                                                         |
| ----------------------- | ----------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| Q17                     | D71                                             | `strategy.md` (Trade-offs), `flows/play-session/intent.md`                                            |
| Q18-Q21                 | spec D109, D110 and master spec passages        | `strategy.md` (Edge-Case Policy), `flows/play-session/`, `screens/phrase-workspace/` (session options) |
| Q22                     | D46 (presentation in D159)                      | `screens/phrase-workspace/`                                                                           |
| Q23, Q24                | spec D111-D118, with D51-D53                    | `flows/controller-connection/`, `flows/play-session/`                                                 |
| Q25, Q47                | D137, D139 (Q47's count-in part: D89, D98, D99) | `flows/review-and-export/`, `screens/last-session-review/`, `flows/play-session/`                      |
| Q26, Q28-Q30            | D55, D57, D58                                   | `flows/controller-connection/`, `screens/controller-connection/`                                      |
| Q27, Q36                | D76, D83                                        | `screens/phrase-workspace/` (The Session Cue Row)                                                     |
| Q31                     | spec D188, applied as D177                      | `flows/play-session/intent.md` (The Audio Mix), `screens/phrase-workspace/handoff.md`, `strategy.md` |
| Q32-Q35, Q37            | D63, D64, D66, D67, D72                         | `strategy.md`, `flows/review-and-export/`, `screens/last-session-review/`, `flows/play-session/`       |
| Q38-Q46                 | D87-D92, D94-D96                                | `flows/play-session/`, `screens/phrase-workspace/`                                                    |
| Q48-Q54                 | D100-D102, D104, D105, D107, D111               | `flows/play-session/`, `screens/phrase-workspace/`                                                    |
| Q55-Q62                 | D113-D117, D120, D121                           | `screens/phrase-workspace/`, `flows/generate-phrase/`, `flows/play-session/`, `strategy.md`           |
| Q63                     | D130                                            | `screens/phrase-workspace/handoff.md` (Notation Contract)                                             |
| Q64                     | D167 (confirms D157)                             | `screens/phrase-workspace/`, `flows/play-session/`                                                    |

## Left in place

| Document                                                                 | Role                                                                                                                                       | Referenced from                                                                                                                                          |
| ------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `strategy.md`, `motion.md`, every `flows/` and `screens/` folder at the root | The live, cumulative design, v2 included, that the next version extends; it keeps its v2 change marks until design work on the next version starts | `specs/versions/v2/build-plan.md`, `docs/phrase-workspace.md`, `docs/controller-connection.md`, `docs/midi-input.md`, `docs/music/lexicon.md`, `docs/music/melodic-control-models.md` |
| [`versions/v2/`](../../versions/v2/README.md)                            | The v2 design as shipped, frozen, taken in this pass                                                                                       | `README.md`                                                                                                                                              |
| `decisions.md`, `open-questions.md`, `todo.md`                           | The live registers, trimmed: the decisions log from D177, Q16 alone, and the items still pending                                           | `specs/versions/v2/build-plan.md` and `specs/versions/v3/README.md` (`todo.md`: units 7-11 by number; units 7, 8, 10 and 11 are now in this folder's `todo.md`, unit 9 is still live), `specs/versions/v2/README.md` (Q16), `docs/release/deferred-scope.md` |
