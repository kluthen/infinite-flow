# v3.4 structural review: the evidence

Status: kept record (2026-11-23). The analysts' parts A to F, copied verbatim from the wave driver's
scratchpad, each with one header line added. The [report](../structural-review-report.md) cites them
by part and section (for example "E §2.3"). Scratchpad paths inside them are historical; the files
they name (the raw tool outputs and scripts) were not kept, and no analysis tool is kept in the
repository.

| Part | File | Who | Measured on | What it holds |
|---|---|---|---|---|
| A | [A-import-graph-and-seams.md](A-import-graph-and-seams.md) | `codebase-explorer` | `main` 7af3628c, 2026-11-22 | The import graph, the documented boundaries and where the code departs from them, the split seams |
| B | [B-health-duplication-footprint-friction.md](B-health-duplication-footprint-friction.md) | `codebase-explorer` | `main` 7af3628c, 2026-11-22 | Code health, duplication, the start-up footprint, delivery friction in the wave logs, Tone.js readiness |
| C | [C-tooling-and-tonejs-research.md](C-tooling-and-tonejs-research.md) | `web-researcher` | external research, 2026-11-22 | The analysis tools, package splitting, Tone.js's size and loading |
| D | [D-atd-cost.md](D-atd-cost.md) | `documentalist` | `main` 1c4fc24f, 2026-11-22 | What moving code or splitting the repository costs the atoms and their links |
| E | [E-measurement-pass.md](E-measurement-pass.md) | measurement pass (D558) | `main` 2ea48d1c, 2026-11-23 | The real tools' measurements; where E disagrees with A or B, E wins |
| F | [F-principal-advisor-ranking.md](F-principal-advisor-ranking.md) | `principal-advisor` | parts A to E, 2026-11-23 | The answers to Q1 to Q4, the ranked recommendations and the chunk sketches |
