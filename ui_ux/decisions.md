# UI/UX Decisions

Append-only record of settled UI/UX decisions. Earlier logs are archived verbatim:

- D1–D44 (first release, v1.0): [archive/v1/decisions-D1-D44.md](archive/v1/decisions-D1-D44.md)
- D45–D176 (v2, released as version 2.0.0):
  [archive/v2/decisions-D45-D176.md](archive/v2/decisions-D45-D176.md)

Archived IDs keep their meaning; a citation to one by ID elsewhere in this repository stays valid
through this header. Numbering continues from D177.

- **D177 — The audio mix's levels are final as built (2026-10-07; applies spec D188, which closed
  Q31).** The owner accepted the click and backing volume ranges and default levels by ear, in
  real sessions (spec D188, 2026-10-05). The tier documents no longer call them placeholders
  awaiting listening tests: `strategy.md` (Context of Use, Sound), `flows/play-session/intent.md`
  (The Audio Mix) and `screens/phrase-workspace/handoff.md` (the `Volume` popover) now say they
  were set by ear in real sessions. Applied during the v2.0 milestone archive so the frozen
  `versions/v2/` copy matches what shipped. Not yet applied: the comment over the audio-mix block
  in `src/styles/theme.css` still says "proposed ... none is final"; it is corrected at the next
  edit of the token source (that pass edited `ui_ux/` only). No value changes.
