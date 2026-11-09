# Open Questions

> **Archived 2026-11-09.** Q81-Q87, raised for the v3.2 re-scope on 2026-10-21, are closed, and
> v3.2 is released as version 3.2.0. Kept verbatim with their section heading and intro. Q86's
> answer is designed as a v3.3 paragraph, live at the root. Live summary: [README.md](README.md).
> Text was written from `ui_ux/`; it holds no link.

## v3.2 after the re-scope, for `spec-writer` (raised 2026-10-21)

Behaviour gaps in `specs/versions/v3/jam-mode.md` found while designing Jam mode, each designed on
its recommended answer. **All seven closed 2026-10-21 by spec D411 as recommended (ux D347)**:
master spec Part C v1.2 (and Part D, for Q86) writes them in; the tier documents already state them
as designed.

- **Q81 — Arpeggio chaos in Jam.** **Closed 2026-10-21 by spec D411 as recommended (ux D347).** jam-mode §3's table places every musical control but arpeggio
  chaos: it is neither Jam's own, nor taken from the doodle, nor listed as not in Jam.
  Recommended: **held at its default (Varied), not shown**, which keeps Jam's set small. Designed
  in `screens/phrase-workspace/` (Jam's controls; ux D333).
- **Q82 — Phrase 1 after a Jam setting changes, with a kept doodle.** **Closed 2026-10-21 by spec D411 as recommended (ux D347).** D408 replaced the held
  doodle's list of changes that drop it: the doodle now stays through setting changes. Nothing says
  what happens to phrase 1 on screen, written from it under the old settings. Recommended: **any
  change of a Jam setting phrase 1 is written from (all but the tempo) rewrites phrase 1 from the
  kept doodle at once**, so Start never plays a phrase 1 the settings no longer describe and a Jam
  never meets the out-of-date phrase prompt; Jam's prepared phrases are discarded with it. Designed
  in `flows/jam/` (ux D336).
- **Q83 — The defaults of Jam's own settings.** **Closed 2026-10-21 by spec D411 as recommended (ux D347).** jam-mode §3 says Jam's key and mode start from
  session mode's values the first time, and Part C gives Drift `Near`; nothing else is given.
  Recommended: **tempo from session mode's the first time, kept within 60–180 BPM; the rhythm lock
  off with no rhythm change allowed; Harmonic motion `Gentle diatonic`; Tension `Lift`;
  Embellishments `Rarely`** (one level for all seven figures, ux D333), the same values the
  session's defaults use where one exists. Designed in `flows/saved-data/` and the workspace.
  Also "Jam's defaults" for the controls taken from the doodle where it does not show them
  (§3: contour, leapiness, register, and any other of the seven a doodle may leave unsaid):
  recommended **session mode's first-visit values** (Arch, Shaped, Middle, and so on), shown in
  the readings as "{value} (default)" (ux D346).
- **Q84 — A doodle read as Sixteenth note density on a phone.** **Closed 2026-10-21 by spec D411 as recommended (ux D347).** Below `bp-tablet-landscape`
  session mode never offers Sixteenth (the staff would not fit). Taken from the doodle (D406), the
  density could be Sixteenth there. Recommended: **taken as Eighth below `bp-tablet-landscape`**,
  the readings list saying "Eighth (Sixteenth on larger screens)". Designed in
  `screens/phrase-workspace/` (From your doodle).
- **Q85 — The instrument changed in Jam mode.** **Closed 2026-10-21 by spec D411 as recommended (ux D347).** The instrument is shared (§3), and session mode
  returns "exactly as it was left" (§2), but its phrase on screen was written for the old
  instrument. Recommended: **on returning to session mode, an instrument changed meanwhile acts as
  an instrument switch made there**: the phrase regenerated, prepared phrases discarded, as session
  mode's idle rules already do. My instrument's range or clef saved from Jam mode likewise.
  Designed in `flows/jam/` (Leaving Jam mode).
- **Q86 — v3.3's Seventh chords in Jam.** **Closed 2026-10-21 by spec D411 as recommended (ux D347).** Part D (v3.3) says a Jam gets seventh chords when the
  player raises the level; with Jam's own settings set (D406) the level is either Jam's own or
  absent. Recommended: **Jam's own level, after Harmonic motion in Jam's Foundation, default
  `Off`**, as Harmonic motion is Jam's own. Designed as a `v3.3 new` paragraph in
  `screens/phrase-workspace/`.

- **Q87 — Which kept session the kept doodle "comes from" once a Jam has been played on it.**
  **Closed 2026-10-21 by spec D411 as recommended (ux D347).**
  D408 lets the doodle go when "the kept session it came from is deleted"; every session end
  deletes the unpinned sessions before it, so a Jam on the kept doodle would delete the session it
  came from and, read literally, let the doodle go after the second round. Recommended: **the
  doodle comes from the latest session played on it** (that session holds the same doodle as its
  own), so the save's replacement of an unpinned session never lets it go, and only the player's
  deletion of that latest session (or `Delete everything`) does. Designed in `flows/jam/` (What
  lets the kept doodle go) and `flows/kept-sessions/` (Deleting a Session); ux D346.
