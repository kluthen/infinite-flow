> **Archived 2026-11-09.** O306, opened and closed that day, is not part of a closed milestone:
> the live register `specs/open-questions.md` dropped it at draft v0.88, when the owner's ruling
> closed it (D521), and its note is moved here verbatim so that the ID keeps its text. It is the
> register's section "v3.3 refresh (O306+)", in which no other question was. Where the answer now
> lives is in [archive/v3/README.md](README.md#o306-archived-2026-11-09). Relative links were
> written from `specs/`; their paths are repaired so they resolve from this folder.

## v3.3 refresh (O306+)

Opened 2026-11-09 by `spec-writer`'s review of Part D and the v3.3 build plan against v3.2 as
built (D511). Every other gap that review found follows from settled decisions and is proposed
for approval with Part D (D512–D518).

- **O306 - May v3.3 start before v3.2 is released?** _(D511; [build plan v3.3, gate
  R0](../../versions/v3/build-plan-v3.3.md#gates); for the owner, at A0)_: in plain words: the plan lets
  v3.3's building start only once v3.2 is released as version 3.2.0. All of v3.2's code is
  finished and merged, but its release waits on your Jam hand checks, which you have set aside for
  a while. v3.3's first step records exactly what today's app writes for many settings (every
  phrase, its backing chords and its files), so that each later step can prove that with Seventh
  chords left Off nothing changes. Option A, wait: v3.3 starts after your Jam checks and the
  3.2.0 tag; nothing is ever redone. Option B, start after you approve v3.3: that recording is made
  on today's code; if your Jam checks later lead to a fix that changes what Jam writes, the
  recording is made again and the v3.3 steps built by then are re-checked against it (machine
  work, no new design). Either way 3.3.0 is released only after 3.2.0.
  Proposed: B, since the Jam checks are listening checks whose likely fixes touch Jam only, and
  v3.3's session-mode work does not wait on them.
