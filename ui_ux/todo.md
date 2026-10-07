# UI/UX Work Status

## Complete

- First-release (v1.0) UI/UX: strategy, token system, motion policy, the generate-phrase flow and
  phrase-workspace screen, the review mockup, and the ISS-003/004/005 v1.0 gate updates (retired
  notation-mode/display-convention, unconditional profile-switch regenerate-or-clear, "Written
  key," "Rhythmic variety," dropped `Mixed` density, B-flat tenor saxophone default). Validated
  ALIGNED by `ux-critic` and confirmed implemented in production code. Archived record:
  [`archive/v1/todo.md`](archive/v1/todo.md); archived decisions:
  [`archive/v1/decisions-D1-D44.md`](archive/v1/decisions-D1-D44.md); archived closed question:
  [`archive/v1/open-questions-Q15.md`](archive/v1/open-questions-Q15.md).
- `versions/v1/` (2026-09-28, D60): the v1 design as shipped, frozen, with a summary README; the
  mockup and `ui_common.css` moved into it. The stale path in the comment in
  `src/notation/notation-layout-policy.ts` was fixed by `coding-executor` in the same change (it now
  names `src/styles/theme.css`, the breakpoint's real source).
- v2 (Rolling Phrase), released as version 2.0.0 after the v2.0 release gate (build plan chunk
  21, passed 2026-10-07; spec D183 had folded v2.1, v2.2 and v2.4 into the one release): units 1-8,
  10 and 11 (controller connection; the session core loop with the locked settings,
  acknowledgement and audio mix folded in; the Review and its exports, played notes included; the
  session options Vary settings, Rising tempo and Tension across phrases), the `strategy.md`
  persona pass and the change-marking convention. Each unit validated ALIGNED by `ux-critic` and
  built. Frozen design: [`versions/v2/`](versions/v2/README.md). Archived record:
  [`archive/v2/todo.md`](archive/v2/todo.md); archived decisions:
  [`archive/v2/decisions-D45-D176.md`](archive/v2/decisions-D45-D176.md); archived questions:
  [`archive/v2/open-questions-Q17-Q64.md`](archive/v2/open-questions-Q17-Q64.md).
- v2.0 milestone archive (2026-10-07, after the spec tree's, spec D208): the v2 record moved to
  `archive/v2/` (index: [`archive/v2/README.md`](archive/v2/README.md)), `versions/v2/` taken from
  the root, and ux Q31's resolution applied to the tier documents first (D177). The root keeps
  its v2 change marks until design work on the next version starts.

## In Progress

Nothing. Design work on the next version has not started.

## Remaining

Standing working rules (ux D119, D135, archived; still in force):

- Minor design issues, including `ux-critic` findings that change no flow, no product rule and
  nothing the player sees of a session's behaviour, are `ux-writer`'s to settle and record in
  `decisions.md` without asking the owner. The phone is not a main customer: the simplest
  acceptable phone behaviour is enough, and the larger screen wins a conflict. During a session
  the player is never expected to act; any problem ends it as Stop does, after the 30-second
  window if it can be put right, at once if not.
- The Review stays simple: the phone keeps the minimum; larger screens get no side tools yet,
  with room left inside the Review for later ones (replay, use as a seed).

Carried forward from v2 (see the addendum of [`archive/v2/todo.md`](archive/v2/todo.md)):

- **Unit 7's owner confirmation.** The design of the Review's played notes and their export (ux
  D161-D166) never got the owner's explicit confirmation; it was built in build plan chunk 23 and
  its criteria passed the v2.0 gate. Ask with the owner's approval of the `v2.0.0` tag, or take
  that approval as the confirmation. A correction it brings is made at the root and, where it
  changes what v2.0.0 shipped, recorded and applied to `versions/v2/` too.
- **A narrow `ux-critic` pass on the phone staff-height edits** (ux D127-D129,
  `screens/phrase-workspace/handoff.md`, Notation Contract) has no recorded result. The design is
  built and through the gate; run it with the next validation of `screens/phrase-workspace/`.
- **Token-source comment.** The audio-mix block's comment in `src/styles/theme.css` still calls
  the levels proposed and not final (ux D177); correct it at the next edit of the token source.

Design units and items not yet scheduled:

9. **Moved out of v2 (ux D154, spec D174): v3, not committed.** End-of-measure chord-fit check
   presentation (§9). Kept notes: the master spec hands this presentation to `ux-writer` ("a UI/UX
   design decision, not specified here"); positive-only and quiet, distinct from the per-note
   highlight. Design only if v3 schedules it.

- Revalidate only if a specification refinement changes settled UI behavior, controls, or states.
- **Q16** (`open-questions.md`): design a generation action reachable from the notation-error states
  themselves, replacing the undiscoverable instrument-profile-switch escape. Stands alone — it does
  **not** intersect with Q20 (Q20 is resolved: an in-session notation failure structurally cannot
  occur, so there is nothing to reconcile against). Still open, still lower priority, still about
  the Idle-only static workspace.

## Next Unit

None scheduled. When design work on the next version (v3) starts: first clear the root's v2
change marks in one pass (every **Changes since v1** block, every **[v2 new]** / **[v2 changed]**
tag, the `v2 new` / `v2 changed` comments in `src/styles/theme.css` and `components.css`), then
mark that version's changes from its first edit, per D60 and D61 (archived, see
[`README.md`](README.md), "Released versions and work in progress"). Unit 9 above is the one v3
design unit already named.
