> **Archived 2026-11-22.** Closed range for the v3.3 milestone: v3.3 is released as version
> 3.3.0 (tag `v3.3.0`, b2a0e3fa). These decisions moved the v3.1, v3.2 and v3.3 build plans to the
> build-plan model under one shared v3 build workflow, and merged branch `plan-migration`; all
> three plans are now complete. Archived IDs keep their meaning and may be cited anywhere; each
> decision's content is now stated as settled fact in a live document, or is history, as the
> "where it now lives" table in [archive/v3/README.md](README.md#v33-release-archived-2026-11-22)
> records. Relative links were written from `specs/`; their paths were repaired on 2026-11-22 so
> they resolve from this folder.

- **D349 (2026-10-16): v3.1's build plan moves to the build-plan model, with one shared v3 build
  workflow and its waves re-formed.** Chunk IDs and Done-when statements are kept; the four
  drifting §3 copies give way to one workflow document, and the eleven waves become six. Why: thin
  waves paid a full preflight and gate each. Numbered D339 on branch `plan-migration` (D352). Now
  in: [build-workflow.md](../../versions/v3/build-workflow.md),
  [build-plan-v3.1.md](../../versions/v3/build-plan-v3.1.md#waves).

- **D350 (2026-10-16): v3.2's build plan moves to the build-plan model, under the shared v3 build
  workflow, its waves re-formed.** Chunk IDs and Done-when statements are kept; twelve waves become
  seven, the release gate no wave; chunk 20 now follows chunk 19, whose dependent control it uses.
  Why: thin waves paid a full preflight and gate each, and old wave 3 held the chain 8 → LD → 20.
  Numbered D340 on branch `plan-migration` (D352). Now in:
  [build-plan-v3.2.md](../../versions/v3/build-plan-v3.2.md#waves).

- **D351 (2026-10-16): v3.3's build plan moves to the build-plan model, under the shared v3 build
  workflow, its waves re-formed.** Eight waves become six; chunk 7 now follows chunks 5 and 6, whose
  chord-tone facts its run rule reads; the owner's four questions become gates A0, C1, R0 and I0
  and [O230](../../open-questions.md). Why: thin waves, and old wave 2 held 5, 6 and 7 with no path
  between them. Numbered D341 on branch `plan-migration` (D352). Now in:
  [build-plan-v3.3.md](../../versions/v3/build-plan-v3.3.md#waves).

- **D352 (2026-10-19): branch `plan-migration` is merged, renumbered.** The owner: merge it,
  renumbered. Its D339, D340 and D341 collided with `main`'s v3.0 gate entries and became D349,
  D350 and D351; its O177 became [O230](../../open-questions.md). `main`'s v3.0 release and archive state
  wins every conflict in the registers and indexes. Not an approval of any of the three plans.
