# v3.2 (Jam) Archive

Status: archived 2026-11-09. v3.2 passed its release gate (build plan v3.2's chunk 27) and is
released as version 3.2.0: the tag `v3.2.0` is at f93e552d, 2026-11-09 (spec D521, D523). See the
[release notes](../../../docs/release/v3.2-release-notes.md). The owner's hand checks v3.2 H3,
H4-H8 and HG follow the tag (spec D521); the live `todo.md` carries them. The spec tree archives
the same milestone in its own `specs/archive/`.

This is the UI/UX working record that belonged to v3.2. It includes what v3.1 shared with v3.2,
left live at v3.1's archive: the marking and token-source decisions (ux D225, D226), the details
settled while writing units P and R (D246), the closing of Q70-Q72 (D249) and the `ux-critic`
passes (D250). Two v3.2 entries stay live until the owner's hand checks are done, since a finding
may correct the frozen copy: D480 (the copy) and D483 (the release gate's design part). The
design v3.2 produced is frozen in [`versions/v3.2/`](../../versions/v3.2/README.md); the same tier
documents stay live at the `ui_ux/` root as the cumulative design that v3.3 builds on.

## Archived here

- [decisions-D225-D251.md](decisions-D225-D251.md): decisions D225-D251, kept verbatim with their
  section heading and intro: the v3.1 and v3.2 design of 2026-10-08 (v3.1's own D227-D234 are in
  [`archive/v3.1/`](../v3.1/README.md)).
- [decisions-D327-D475.md](decisions-D327-D475.md): decisions D327-D475, kept verbatim with their
  section headings: v3.1's archive-pass record, the v3.2 re-scope (Jam as its own mode), its
  approval and token-source pass, and the design questions of its build, gate GD's guides
  included. D453, D455, D472 and D473 were never used in this tree.
- [open-questions-Q70-Q75.md](open-questions-Q70-Q75.md): Q70 and Q72-Q75, raised for v3.2 on
  2026-10-08, closed. Kept with their section heading and intro.
- [open-questions-Q81-Q87.md](open-questions-Q81-Q87.md): Q81-Q87, the re-scope's behaviour gaps,
  closed. Kept with their section heading and intro.
- [todo.md](todo.md): the finished v3.2 items of the work tracker (the shared v3.1 and v3.2
  block, the re-scope block, the v3.2 `## Next Unit` paragraph), kept verbatim, plus a dated
  addendum recording what this pass found true. One link path repaired.

## Where D225-D251 now live as settled fact

Documents are named from `ui_ux/`. Each lives at the root (the live, cumulative design) and, as
shipped in v3.2, in `versions/v3.2/`. Much of the 2026-10-08 design was rewritten in place by the
re-scope of 2026-10-21 (D328); a row names what survived.

| Decisions                                                   | Live document                                                                                                                                                                                                       |
| ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D225 (v3.0 frozen; v3.1 and v3.2 marked on v3.0's marks)    | `README.md` (how changes are marked), `versions/v3.0/`                                                                                                                                                              |
| D226 (`token-source-v3.1-v3.2.md`)                          | **history**: the document was deleted once applied (D349); its classes are in `src/styles/components.css`                                                                                                           |
| D235 (Jam among the session options, `Start Jam`)           | `Start Jam` and dependents under their switch: `screens/phrase-workspace/`, `flows/play-session/`; the Jam switch among the options is **history**, replaced by the mode switch (D328, D329)                        |
| D236 (Idle in Jam mode, `staff-jam`)                        | `screens/phrase-workspace/handoff.md` (States), `flows/jam/`; leaving Jam mode at Idle is now D331's                                                                                                                |
| D237, D238 (the Jam before phrase 1; a Jam ended before it) | `flows/jam/handoff.md` (A Jam), `screens/phrase-workspace/handoff.md` (the cue row, States, Jam ended before phrase 1), `motion.md`                                                                                 |
| D239 (a held doodle at Idle)                                | `flows/jam/handoff.md` (The Kept Doodle), `screens/phrase-workspace/handoff.md` (The kept doodle's bar); its changes that let it go are **history** (D328, D336)                                                    |
| D240 (the review's doodle section and the suggestion)       | `screens/last-session-review/`, `flows/review-and-export/handoff.md` (The Doodle and the Suggestion); buttons and restriction line rewritten by D338                                                                |
| D241 ("Jam" in the session list and the summary)            | `screens/session-list/handoff.md`, `screens/last-session-review/handoff.md`                                                                                                                                         |
| D242 (the rhythm lock and its allowed changes)              | `screens/phrase-workspace/` ("During a session", Jam's controls), `flows/play-session/handoff.md`, `flows/saved-data/handoff.md`; notes per D332, D340                                                              |
| D243 (Drift)                                                | `screens/phrase-workspace/handoff.md` (Jam's controls), `flows/jam/`; its place under the Jam switch is **history** (D332)                                                                                          |
| D244 (What may vary)                                        | `screens/phrase-workspace/` ("During a session"), `flows/generate-phrase/handoff.md`; the option's note as D248 corrected it                                                                                        |
| D245 (how the write-up is split)                            | **history**: a process record                                                                                                                                                                                       |
| D246 (details of units P and R)                             | `flows/presets/`, `screens/preset-sheet/`, `screens/last-session-review/`, `flows/review-and-export/`, `flows/kept-sessions/`, `flows/saved-data/`, `screens/your-data/`; its suggestion parts rewritten by D338    |
| D247 (deleting a Jam session lets its doodle go)            | **history**, superseded (D328); the same rule, from spec D408 and D346, is in `flows/jam/handoff.md` (What lets the kept doodle go) and `flows/kept-sessions/handoff.md`                                            |
| D248 (details of unit J)                                    | `flows/jam/handoff.md`, `screens/phrase-workspace/handoff.md` (cue row, failed Jam's notice, toggle lists, Vary settings' note); its readings of a switch-driven Jam mode are **history** (D328)                    |
| D249 (Q70-Q72 closed)                                       | **history**: closes questions; its two spec alignments (home note and silence timer, a controller lost in the count-in) are in `flows/jam/handoff.md`                                                               |
| D250 (`ux-critic`'s v3.1 and v3.2 passes)                   | `screens/your-data/` (each preset with its `Delete`), `flows/presets/` (the limit's note), `screens/phrase-workspace/handoff.md` (Speed drill, Jazz); the v3.2 findings were rewritten by D328; the pass is history |
| D251 (Q74 and Q75)                                          | `flows/jam/handoff.md` (The Kept Doodle), `screens/last-session-review/` (the no-fit sentence)                                                                                                                      |

## Where D327-D475 now live as settled fact

| Decisions                                                      | Live document                                                                                                                                                                           |
| -------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D327 (`versions/v3.1/` records its release)                    | **history**: v3.1's archive-pass record; its effect is in `versions/v3.1/`                                                                                                              |
| D328 (the re-scope rewrites v3.2 in place)                     | **history**: a process record; its effect is the root's `v3.2` text                                                                                                                     |
| D329, D330 (the mode switch; loading Jam's code)               | `screens/phrase-workspace/` (header, States, Opening Jam mode), `flows/jam/` (Entering and Leaving Jam Mode)                                                                            |
| D331 (leaving Jam mode; the app opens in session mode)         | `flows/jam/handoff.md` (Entering and Leaving Jam Mode), `flows/saved-data/intent.md`                                                                                                    |
| D332-D335 (Jam's controls, readings, tap-in)                   | `screens/phrase-workspace/` (Jam's controls, From your doodle, Tap tempo), `flows/jam/`; `doodle-readings` and `tap-tempo` in `src/styles/components.css`                               |
| D336 (Jam's Idle and the kept doodle)                          | `flows/jam/handoff.md` (The Kept Doodle), `screens/phrase-workspace/handoff.md` (The kept doodle's bar)                                                                                 |
| D337 (no controller in Jam mode)                               | `flows/jam/`, `flows/controller-connection/`, `screens/phrase-workspace/handoff.md` (`jam-needs-controller`); its focus target corrected by D345                                        |
| D338, D339 (the suggestion; the review side)                   | `screens/last-session-review/`, `flows/review-and-export/handoff.md` (The Doodle and the Suggestion), `flows/jam/handoff.md` (The suggestion at Idle), `flows/kept-sessions/handoff.md` |
| D340 (session mode after the re-scope)                         | `screens/phrase-workspace/` ("During a session"), `flows/play-session/`, `flows/saved-data/`                                                                                            |
| D341 (the questions after the re-scope)                        | **history**: register record; see the questions table below                                                                                                                             |
| D342 (tokens and classes)                                      | `src/styles/components.css` (applied by D349)                                                                                                                                           |
| D343 (Chrome the one supported browser)                        | `strategy.md` (Context of Use, Device), `flows/saved-data/intent.md`; the hand checks' removal is history                                                                               |
| D344 (how the rework is written)                               | **history**: a process record                                                                                                                                                           |
| D345 (details of units A, B and C)                             | `flows/jam/`, `screens/phrase-workspace/handoff.md`, `flows/review-and-export/handoff.md`, `screens/your-data/`; focus corrected by D346, the preset label by D449                      |
| D346 (`ux-critic`'s re-scope pass)                             | `flows/jam/handoff.md` (What lets the kept doodle go), `flows/kept-sessions/handoff.md`, `screens/phrase-workspace/` (readings, focus), `strategy.md`; the pass is history              |
| D347 (Q81-Q87 closed; gate D0)                                 | **history**: an approval record; Jam's first values are in `flows/saved-data/`                                                                                                          |
| D348 ("the kept doodle"; phones a third-rate client)           | `strategy.md` (Context of Use, Device)                                                                                                                                                  |
| D349 (part 2 applied; the document deleted)                    | `src/styles/components.css` (`v3.2 new`); the deletion is history                                                                                                                       |
| D350 (a read-only `toggle-list`)                               | `screens/phrase-workspace/handoff.md` ("During a session"), `src/styles/components.css` (`toggle-list`)                                                                                 |
| D351-D353 (the empty system's name and line; the title)        | `screens/phrase-workspace/handoff.md` (Notation Contract, Components and Content)                                                                                                       |
| D354 (what stays live while Jam's code loads)                  | `screens/phrase-workspace/handoff.md` (States, Opening Jam mode), `flows/jam/handoff.md`                                                                                                |
| D355, D448 (the raised variety; the narrow Sixteenth)          | `screens/phrase-workspace/` (Jam's controls)                                                                                                                                            |
| D447 (phrase 2 at the hand-over; a failed Jam's deadline)      | `flows/jam/handoff.md` (Routing Rules), `flows/play-session/handoff.md`, `screens/phrase-workspace/handoff.md` (States)                                                                 |
| D449 (a Jam session shows no preset part)                      | `screens/session-list/handoff.md`, `screens/last-session-review/handoff.md`, `flows/kept-sessions/`, `flows/review-and-export/handoff.md`                                               |
| D450, D451 (the read-in's cross-fade; a portrait end)          | `screens/phrase-workspace/handoff.md` (States, Responsive Behavior), `src/styles/components.css`                                                                                        |
| D452 (a note start jumps too)                                  | `flows/play-session/` (Jump, Where the eyes land)                                                                                                                                       |
| D454 (the review's played-notes confirmation)                  | `screens/last-session-review/handoff.md` (Confirmations)                                                                                                                                |
| D456 (Jam again's interim focus)                               | **history**: interim until chunk 24 built `jam-bar`; the design never changed                                                                                                           |
| D457, D458 (a set suggestion; the answer's instrument)         | `screens/last-session-review/handoff.md` (`suggestion-row`), `flows/review-and-export/handoff.md`                                                                                       |
| D459-D461 (the guide switches, labels, popover)                | `screens/phrase-workspace/handoff.md` (Layout Tree, `mix-controls`, `session-cue-actions`, Responsive Behavior), `flows/saved-data/handoff.md` (the mix)                                |
| D462 (the guide tokens)                                        | `src/styles/theme.css` (the audio-mix levels)                                                                                                                                           |
| D463 (gate GD's validation)                                    | **history**: a check; its fixes are in D459-D461's documents                                                                                                                            |
| D464-D466, D471 (the kept doodle's bar: offer, Loading, focus) | `screens/phrase-workspace/handoff.md` (The kept doodle's bar), `flows/jam/handoff.md` (The suggestion at Idle)                                                                          |
| D467 (Jam's too-many-notes sentence)                           | `screens/phrase-workspace/handoff.md` (Needs more room)                                                                                                                                 |
| D468, D469, D475 (the phone's scroll; the cue-row band)        | `screens/phrase-workspace/handoff.md` (Responsive Behavior, `jam-bar`, `mix-controls`)                                                                                                  |
| D470 (the review after a Jam offers Jam again)                 | `flows/review-and-export/handoff.md` (The Doodle and the Suggestion), `flows/jam/handoff.md` (flowchart)                                                                                |
| D474 (a phrase action disabled by Loading)                     | `screens/phrase-workspace/handoff.md` (Components and Content)                                                                                                                          |

## Where the questions now live

| Question | Closed by                          | Live document                                                                               |
| -------- | ---------------------------------- | ------------------------------------------------------------------------------------------- |
| Q70      | D249 (spec D243), then moot (D341) | **history**: leaving Jam mode returns session mode as it was (`flows/jam/handoff.md`, D331) |
| Q72      | D249 (spec D244)                   | `flows/jam/handoff.md` (The Kept Doodle)                                                    |
| Q73      | D341 (spec D408)                   | `flows/jam/handoff.md` (What lets the kept doodle go), `flows/kept-sessions/handoff.md`     |
| Q74      | D341 (spec D408)                   | `flows/jam/handoff.md` (The Kept Doodle)                                                    |
| Q75      | D341 (as recommended)              | `screens/last-session-review/` (the no-fit sentence)                                        |
| Q81      | D347 (spec D411)                   | `screens/phrase-workspace/` (Jam's controls)                                                |
| Q82      | D347 (spec D411)                   | `flows/jam/` (The Kept Doodle)                                                              |
| Q83      | D347 (spec D411)                   | `flows/saved-data/`, `screens/phrase-workspace/` (the readings' "(default)")                |
| Q84      | D347 (spec D411)                   | `screens/phrase-workspace/` (From your doodle)                                              |
| Q85      | D347 (spec D411)                   | `flows/jam/` (Leaving Jam mode)                                                             |
| Q86      | D347 (spec D411)                   | a `v3.3 new` paragraph in `screens/phrase-workspace/` and in `flows/jam/`                   |
| Q87      | D347 (spec D411)                   | `flows/jam/handoff.md` (What lets the kept doodle go), `flows/kept-sessions/handoff.md`     |

## Left in place

| Document                                                                     | Role                                                                                                                                                                                                                                                            | Referenced from                                                                                               |
| ---------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| `strategy.md`, `motion.md`, every `flows/` and `screens/` folder at the root | The live, cumulative design, v3.2 included, that v3.3 extends; it keeps v3.0's, v3.1's, v3.2's and v3.3's change marks until v4's design starts                                                                                                                 | `specs/versions/v3/` build plans, `docs/` module documents                                                    |
| [`versions/v3.2/`](../../versions/v3.2/README.md)                            | The v3.2 design as shipped, frozen; untouched by this pass. The owner's hand checks H3, H4-H8 and HG read it; a finding that changes the design corrects it and the root alike, recorded                                                                        | `README.md`, the v3.2 build plan                                                                              |
| [`versions/v3.3/`](../../versions/v3.3/README.md)                            | The approved v3.3 design, frozen at its gate D0; untouched by this pass                                                                                                                                                                                         | `README.md`, the v3.3 build plan                                                                              |
| `decisions.md`, `open-questions.md`, `todo.md`                               | The live registers, trimmed: decisions D252-D264 and D477-D483 (D480 and D483 kept until the hand checks are done); Q16 open, Q77 (v3.3) closed but kept until v3.3's release; the v3.3 work, the standing rules, the hand checks and the items carried forward | `specs/versions/v3/` (ux decision and question IDs, resolved through the registers' headers), `docs/release/` |
