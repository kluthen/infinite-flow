# UI/UX Work Status

## Complete

- First-release (v1.0) UI/UX: strategy, token system, motion policy, the generate-phrase flow and
  phrase-workspace screen, the review mockup, and the ISS-003/004/005 v1.0 gate updates (retired
  notation-mode/display-convention, unconditional profile-switch regenerate-or-clear, "Written
  key," "Rhythmic variety," dropped `Mixed` density, B-flat tenor saxophone default). Validated
  ALIGNED by `ux-critic` and confirmed implemented in production code. Archived record:
  [`archive/v1/todo.md`](archive/v1/todo.md); archived decisions:
  [`archive/v1/decisions-D1-D44.md`](archive/v1/decisions-D1-D44.md); archived closed question:
  [`archive/v1/qna-Q15.md`](archive/v1/qna-Q15.md).

## In Progress

- No active design unit.

## Remaining

- Add optional MIDI-feedback flow and states when that enhancement is scheduled. Now scoped on the
  spec side as `specs/versions/v2/README.md`'s `midi-and-acknowledgement.md`; design starts once
  v2 UI work begins.
- Revalidate only if a specification refinement changes settled UI behavior, controls, or states.
- **Q16** (`qna.md`): design a generation action reachable from the notation-error states
  themselves, replacing the undiscoverable instrument-profile-switch escape. Deferred past v1.0;
  also logged in `specs/versions/v2/README.md` (Direction, not yet scoped).

## Next Unit

No active ux-writer design unit. v1.0 is released, its UI/UX design is complete and implemented,
and its working record is archived (see Complete). Nothing in this tree yet describes v2 screens
or flows. The next unit of work is v2 UI/UX design, once `spec-writer`/`coding-leader` schedule it
— starting with Q16's notation-error recovery action and the MIDI-feedback flow.
