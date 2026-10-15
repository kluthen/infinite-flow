# v3.0 — Storage: UI/UX Design

Status: **approved by the owner on 2026-10-07, being built.** This folder is the v3.0 design as
approved, frozen on 2026-10-08 when the design of v3.1 and v3.2 started at the `ui_ux/` root. It
is never edited again, except to correct it to match what v3.0 actually ships (each such
correction is recorded in the root `decisions.md`). Corrected on 2026-10-12 for what the owner
added to v3.0 during its build: my instrument's clef, treble or bass, with a range bound per clef;
the interval name shown with its transposition; kept sessions belonging to the instrument they
were played with; and the outdated tab after another tab's `Delete everything`. Corrected again on 2026-10-13 for
the prompt a start opens when the phrase on screen was made before the settings changed, and on
2026-10-15 for a session whose every played note is very short and for a damaged kept session,
deleted with an apology. The same
corrections are applied at the root. The product scope is Part A of
[`specs/versions/v3/master-spec.md`](../../../specs/versions/v3/master-spec.md#part-a--v30). The v2
design it extends is in [`versions/v2/`](../v2/README.md).

The documents keep their marks: a `[v3 new]` or `[v3 changed]` tag, and each document's
**Changes since v2** block, show what v3.0 changes from v2. The token-source additions are in
[`token-source-v3.md`](token-source-v3.md); they are written into `src/styles/theme.css` and
`components.css` by build plan chunk 1, after which the shipped state of those two files is the
release tag's.

## What v3.0 is

The app starts keeping things on the player's device: settings come back as they were left, the
last session and any pinned session stay reviewable, whole phrases can be marked as favorites and
exported alone, a session can carry a comment, the player can describe their own instrument once,
the controller reconnects by itself, and the notes the player played are kept only on request.
Everything kept is listed, and deletable, in one sheet. The workspace is the v2 screen, extended
again.

## The decisions worth keeping, and why

- **Kept sessions live inside the review, at two levels.** The list of kept sessions takes the
  staff's place exactly as a review does, and `Close review` leaves either level, so there is
  still one rule for the staff's place and no new top-level page.
  ([kept-sessions intent](flows/kept-sessions/intent.md#kept-sessions-live-inside-the-review))
- **Two links above the staff.** `Review last session` keeps v2's one-press way back, now across
  reloads; `All sessions` opens the list.
  ([kept-sessions intent](flows/kept-sessions/intent.md#two-ways-in))
- **Starting never asks about the last session.** The next session replaces the last one unless
  it is pinned, and a favorite pins its session by itself, so nothing marked is lost and no "are
  you sure?" taxes every start. ([strategy](strategy.md#trade-offs))
- **A start on an out-of-date phrase asks first.** When the phrase on screen was made before the
  settings changed, Start or the starting note opens one short sheet naming what changed:
  `Regenerate phrase` (a new phrase, still at idle) or `Start with this phrase`. Nothing else of
  a start asks. ([prompt intent](screens/stale-phrase-prompt/intent.md#the-two-answers))
- **A favorite is a whole phrase, one press on a star**, at the end of the phrase's line where
  per-phrase tools go. ([review intent](screens/last-session-review/intent.md#favorites))
- **The music is kept by itself; the player's own notes only on request**, with the switch where
  the played notes are seen. ([review-and-export intent](flows/review-and-export/intent.md#the-players-own-notes-kept-on-request))
- **Saving is silent; its problems are told outside a session**, in one calm notice row at the
  top of the workspace that never changes during a session.
  ([saved-data intent](flows/saved-data/intent.md#telling-a-saving-problem))
- **The workspace is drawn once the saved settings are read**, so nothing changes under the
  player's eyes after the first frame. ([saved-data intent](flows/saved-data/intent.md#coming-back-at-load))
- **While saving is off, nothing is deleted.** An outdated tab and a visit whose saved data
  couldn't be read offer no deletion in the list or a review; the second keeps `Delete
  everything` until newer data is known.
  ([kept-sessions handoff](flows/kept-sessions/handoff.md#while-saving-is-off))
- **"Your data" is a sheet behind a footer link**, visited rarely, so it takes no room in the
  header. ([your-data intent](screens/your-data/intent.md))
- **My instrument is a fourth instrument choice made from a template**, its range entered as
  written notes and its transposition as how a written note sounds.
  ([my-instrument intent](flows/my-instrument/intent.md))
- **Every deletion the player makes is confirmed once, in the error tone; nothing else asks.**
  ([strategy](strategy.md#edge-case-policy))
- **My instrument reads in treble or bass clef, display only**, the clef sitting just above the
  range it bounds, and a range outside its clef's bound refused live in note names.
  ([my-instrument intent](screens/my-instrument/intent.md#the-clef))
- **Sessions belong to their instrument.** Saving a new range or transposition for my instrument,
  or deleting it, erases its kept sessions after one warning naming how many; a name or clef
  change keeps them, each phrase in the clef it was played in, given the room it needs in its
  review. ([my-instrument flow intent](flows/my-instrument/intent.md#what-changing-it-does-to-its-sessions))
- **An export never offers an empty file.** When every note the player played is very short and
  `Include very short notes` is off, `Export played notes` is shown unavailable with its reason,
  which names that option, the cure sitting just before the button.
  ([review intent](screens/last-session-review/intent.md#the-export))
- **A damaged kept session is deleted, with an apology.** A session the app cannot read correctly
  is deleted, pinned or not, as soon as a visit that saves finds it, and one calm notice says
  sorry and how many went; the player lands on the list without it. A read the device only
  refused never deletes anything.
  ([kept-sessions handoff](flows/kept-sessions/handoff.md#a-damaged-session))
