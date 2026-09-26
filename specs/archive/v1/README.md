# v1 (First Release) Archive

Status: archived 2026-09-25; the v1.0 gate documents were added 2026-09-26

This is the working record of the first release. The stand-in summary is the
[v1 feature note](../../features/v1-first-release.md).

## Archived here

- [decisions-v1.md](decisions-v1.md): the complete first-release decision log, D1–D46, kept
  verbatim. It is append-only history, so don't edit it. New decisions go in the live
  [decisions log](../../decisions.md), numbered from D47.
- [gate-execution-report.md](gate-execution-report.md): the v1.0 gate's execution report for
  ISS-003, ISS-004 and ISS-005 (closed 2026-09-26), kept verbatim below its archive notice.
- [iss004-feasibility-review.md](iss004-feasibility-review.md): the ISS-004 rhythmic-variety
  feasibility review (closed 2026-09-26), kept verbatim below its archive notice.

## Still-live v1 documents (left in place)

These documents describe v1, but they stay where they are. Files outside `specs/` link to them
(`docs/music/`, `docs/release/`, `issues/`, `ui_ux/`, `README.md`), and some are
still the contract for the running code.

| Document | Role | Referenced from |
| --- | --- | --- |
| [first-release-master-spec.md](../../first-release-master-spec.md) | v1 master spec (what was built) | `README.md`, `issues/` (ISS-003/004), `ui_ux/`, `docs/music/`, `docs/release/` |
| [first_release_plan.md](../../first_release_plan.md) | v1 implementation plan (Steps 1–10) | `README.md`, `docs/release/` |
| [generator-contract.md](../../generator-contract.md) | Live request/result contract | `ui_ux/`, `docs/music/`, `docs/release/` |
| [generator-architecture.md](../../generator-architecture.md) | Live decoupling rules | `README.md`, `ui_ux/`, `docs/music/`, `docs/release/` |
| [generative-process.md](../../generative-process.md) | Generation-process reference | `ui_ux/decisions.md`, `docs/generation-latency.md` |
| [product-foundation.md](../../product-foundation.md) | Product intent (vision revision pending) | internal to `specs/` |
| [roadmap.md](../../roadmap.md) | Delivery stages (vision revision pending) | `README.md`, `docs/release/` |
| [open-questions.md](../../open-questions.md) | Live question register | `README.md`, `docs/release/deferred-scope.md` |

Release evidence lives in [`docs/release/`](../../../docs/release/): the release checklist, the
DoD acceptance matrix, the reconciliation report, the browser and offline limits, and the
deferred scope.
