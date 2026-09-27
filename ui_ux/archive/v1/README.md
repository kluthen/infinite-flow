# v1 (First Release) Archive

Status: archived 2026-09-26. The v1.0 gate (ISS-003, ISS-004, ISS-005) is closed and `v1.0`
shipped; see `specs/versions/v1/README.md`.

This is the UI/UX working record of the first release. The live summary is the tier document set
this record produced — `strategy.md`, `motion.md`, `flows/generate-phrase/`,
`screens/phrase-workspace/`, `mockups/` — which stays in place (see "Still-live v1 documents"
below).

## Archived here

- [decisions-D1-D44.md](decisions-D1-D44.md): the complete first-release decision log, D1-D44,
  kept verbatim (no D41 — see D42's entry). It is append-only history, so don't edit it. New
  decisions go in the live [decisions log](../../decisions.md), numbered from D45.
- [open-questions-Q15.md](open-questions-Q15.md): the one closed first-release question this decision log answers (Q15,
  closed by D37), kept verbatim. Q16 is still open and stays live in
  [`open-questions.md`](../../open-questions.md).
- [todo.md](todo.md): the finished work tracker for v1.0 — the complete `## Complete` section and
  the done items from `## Remaining`, kept verbatim, plus a dated addendum recording production-code
  confirmation found during this archiving pass. The two still-pending `## Remaining` items
  (optional MIDI feedback, specification-refinement revalidation) stayed live in the current
  [`todo.md`](../../todo.md) rather than being duplicated here.

## Where D1-D44 (and Q15) now live as settled fact

| Decisions                                                                                                                                                                                                        | Live document                                                                                                                                                                                      |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D1-D8 (workspace shape, engraving policy, theming, responsive framing)                                                                                                                                           | `strategy.md`, `screens/phrase-workspace/intent.md` and `handoff.md`                                                                                                                               |
| D9-D17 (pitch-class/preset domain values, instrument-profile ranges and windows)                                                                                                                                 | `screens/phrase-workspace/handoff.md` (Components and Content), `flows/generate-phrase/intent.md`                                                                                                  |
| D18, D36-D37 (notation-mode/display-convention retired; profile switch always regenerates or clears) — supersedes D19, D27                                                                                       | `screens/phrase-workspace/handoff.md` (Notation Contract, States), `flows/generate-phrase/handoff.md`, `strategy.md` (Trade-offs, Engraving Policy, Edge-Case Policy)                              |
| D20 (phone-landscape two-system notation fallback)                                                                                                                                                               | `screens/phrase-workspace/handoff.md` (Notation Contract, Responsive Behavior)                                                                                                                     |
| D21 (production token/component source moves to `src/styles/theme.css`/`components.css`)                                                                                                                         | `README.md` ("How future UI changes flow"); `ui_common.css` (frozen mockup-only reference)                                                                                                         |
| D22-D26 (custom-preset no-checked-radio exception, contour order, character group static, `control-summary` contract)                                                                                            | `screens/phrase-workspace/handoff.md` (Components and Content, States)                                                                                                                             |
| D28-D35 (read-only ring token, generation-failure alert copy, fresh-request retry semantics, alert persistence, co-active error state, `notation-status`, `staff-ready` fallback fix, out-of-band mode tracking) | `screens/phrase-workspace/handoff.md` (Components and Content, States); production in `src/styles/theme.css`/`components.css` and `src/composables/` (confirmed shipped, see `todo.md`'s addendum) |
| D38-D40, D42 (Written key control, Rhythmic variety control, note density drops Mixed, B-flat tenor saxophone default)                                                                                           | `screens/phrase-workspace/handoff.md` (Components and Content, Notation Contract), `flows/generate-phrase/intent.md`                                                                               |
| D43 (`control-summary` independence rationale wording fix)                                                                                                                                                       | `screens/phrase-workspace/handoff.md` (Components and Content)                                                                                                                                     |
| D44 (flow diagram corrected to show every profile-switch exit)                                                                                                                                                   | `flows/generate-phrase/handoff.md`                                                                                                                                                                 |
| Q15 (profile switch gives a guaranteed exit from any notation error)                                                                                                                                             | `screens/phrase-workspace/handoff.md` (Notation Contract, States)                                                                                                                                  |

## Still-live v1 documents (left in place)

These tier documents describe v1 and stay where they are — they are the live, ID-free contract
for the shipped UI and are referenced from outside `ui_ux/`.

| Document                                                     | Role                                                                                                                              | Referenced from                                                                                                                                                                                                            |
| ------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [strategy.md](../../strategy.md)                             | Product shape, mental model, edge-case policy                                                                                     | `docs/release/reconciliation-report.md`, `specs/archive/v1/gate-execution-report.md`                                                                                                                                       |
| [motion.md](../../motion.md)                                 | Motion and effects policy                                                                                                         | internal to `ui_ux/`                                                                                                                                                                                                       |
| [ui_common.css](../../ui_common.css)                         | Frozen design-token reference for `mockups/` only (superseded for production by `src/styles/theme.css`/`components.css`, per D21) | `mockups/phrase-workspace.html`, `docs/release/reconciliation-report.md`                                                                                                                                                   |
| [flows/generate-phrase/](../../flows/generate-phrase/)       | Generate-phrase flow intent and handoff                                                                                           | `screens/phrase-workspace/` cross-references                                                                                                                                                                               |
| [screens/phrase-workspace/](../../screens/phrase-workspace/) | Phrase-workspace screen intent and handoff                                                                                        | `specs/generator-contract.md`, `specs/generator-architecture.md`, `docs/release/reconciliation-report.md`, application source comments (`src/composables/use-generation-session.ts` and others cite specific decision IDs) |
| [mockups/](../../mockups/)                                   | Interactive review prototype                                                                                                      | `specs/archive/v1/gate-execution-report.md`                                                                                                                                                                                |
| [README.md](../../README.md)                                 | Map of the design set                                                                                                             | `specs/archive/v1/gate-execution-report.md`                                                                                                                                                                                |

Release evidence for the v1.0 gate lives in `specs/archive/v1/` (the gate execution report and the
ISS-004 feasibility review) and `docs/release/` (checklist, DoD matrix, reconciliation report).
