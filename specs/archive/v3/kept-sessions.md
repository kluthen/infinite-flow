# v3.0 — Kept Sessions, Review of Earlier Sessions and Favorites

> **Archived 2026-10-16.** v3.0 is released as version 3.0.0; this approved draft was
> consolidated into the v3 master spec (D217). Live summary:
> [master spec §5](../../versions/v3/master-spec.md#5-kept-sessions-and-the-review-of-earlier-sessions)
> and [§6](../../versions/v3/master-spec.md#6-favorites).
> Relative links were written from `specs/versions/v3/`; the paths of those to files that stayed
> there were repaired on 2026-10-16 so they resolve from this folder.

Status: draft v3 (2026-10-14). spec-writer's recommendations, approved by the owner at the
overall review (D216); v3 replaces the size estimate with the build's measurement (D299).

Serves P3, the Fledgling Composer: C1 "review a session" and C2 "take it out"
([personas](../../personas.md#p3--the-fledgling-composer-secondary-d61)). Built on v2's
last-session review and export
([v2 master spec §7](../../versions/v2/master-spec.md#7-sessions-review-export-and-privacy)) and on
[persistence.md](persistence.md). Code facts: [storage-grounding.md](storage-grounding.md) §A1.

## 1. Which sessions are kept

- **The most recent session is kept automatically**. It survives a reload, so the
  review the player had is still there tomorrow. This keeps D129's rule, "store more than one
  session only when the player asks for it": one is kept without asking.
- **Pinning keeps a session for good** (D129). When a new session is saved, every session that is
  not pinned is deleted (master spec §5.1). A pinned session stays until the player unpins or deletes it.
- **Marking a favorite pins its session**, so a favorite is never lost by starting a
  new session. Unpinning a session that holds favorites asks for confirmation, since its
  favorites go with it at the next session's end.
- **No limit on the number of pinned sessions**. "Your data" shows the space used. If
  the browser refuses a save because storage is full, nothing is deleted automatically; the app
  says so after the session.

## 2. What a kept session holds

Only what the review and the exports read, plus what identifies the session:

- **Per phrase:** the generated timeline, the chord symbols (harmony) and the reproduction inputs
  (the generation intent: seed, controls, profile, instrument, carry-in), the tempo, and whether
  it was a repeat. Measured at the build (spec D299): a 30-minute session at 240 BPM in Jazz
  with `Sixteenth` density, the largest case, keeps about 4.1 MB for its summary and phrases;
  played notes, when kept, add about 1.5 MB at one played note per shown note.
- **Not kept:** the generator's provenance and diagnostics (20–186 KB per phrase that nothing
  downstream reads), and the acknowledgement records (which expected notes lit up). Keeping
  those would let a later view count hits, which the permanent "no grading or scoring" constraint
  forbids anyway.
- **Per session:** start date and time (wall clock), length, number of phrases, musical profile,
  instrument, starting and reached tempo, whether it is pinned, the comment (§5), and the app
  version that recorded it.
- **Played notes: only after opt-in** (§3).

Played-note times are kept relative to the session's start: today they are seconds on the page's
audio clock, which mean nothing after a reload.

## 3. Played notes: opt-in and deletion

- **One switch, "Keep my played notes", off by default.** Off: played notes exist in memory only,
  for the current page, exactly as in v2; after a reload the kept session has no played notes.
  On: they are kept with the session.
- **Pinning and keeping played notes stay separate choices** (answers the question D129 left
  open). Pinning keeps the music; the switch decides whether the player's own notes are kept.
- **Deleting:** the played notes of one session, or of every session, can be deleted without
  deleting the sessions. Turning the switch off offers to delete played notes already kept.
- Stray notes are stored as received and filtered on read ([stray-notes.md](stray-notes.md)).

## 4. Favorites(from v2's earlier design, D88, D129)

- **A favorite marks a whole phrase**, in the review of any kept session. Marking it again removes
  it. Marking a range of measures is not v3.0 (it was tied to seeding a continuation; Jam is v3.2).
- **Export scope: favorites only**, for the generated notes and for the played notes: in session
  order, each phrase keeping its session phrase number. A played note held past the end of a
  favorite phrase stops there when the next phrase is not exported.
- **Starting a new session never asks for confirmation.** Favorites live in a pinned session
  (§1), so nothing is lost. This made **O86** (what makes a favorite "exported") moot: the
  confirmation it served is gone (closed by D216).

## 5. A comment on a session

Optional plain text, at most 500 characters, written and edited in the session's review. Shown in
the session list. Not written into the MusicXML or MIDI exports.

## 6. Reaching older sessions

- **A list of kept sessions**, newest first: date and time, length, number of phrases, profile
  and instrument, pinned or not, number of favorites, the start of the comment.
- **Opening one shows the same review v2 has**, for that session: notation, the `Played notes`
  lane when its played notes were kept, the exports with the new favorites scope.
- **Per session:** pin or unpin, delete. **For all:** delete every session (in "Your data",
  [persistence.md](persistence.md) §1).
- **On every device**, the phone included: these are functions of the review, not extra tooling
  (the phone's review stays the plain baseline of the functions the spec gives every device;
  review tooling was dropped, D211). Layout is `ux-writer`'s.

## 7. What does not change

- No grading, scoring, ranking or wrong-note signal in any view, any session, any list. The
  session list shows no figure about how well the player played.
- The review of the session that just ended works as in v2.
- A running session never asks the player for anything.

## 8. Open

None: O86 was closed as moot by D216 ([decisions](../../decisions.md)).
