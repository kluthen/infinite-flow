# Infinite Flow UI/UX

This design set defines the interface for Infinite Flow, a client-side web practice partner for a
monophonic instrumentalist. Its first release (v1.0) generates and reads one four-measure phrase
for a C MIDI keyboard, B-flat tenor saxophone, or E-flat alto saxophone profile; the phrase is the
product, controls support it, and notation receives the largest share of space at every supported
landscape viewport. v2 ("Rolling Phrase," `specs/versions/v2/master-spec.md`) turns that static
phrase into a continuous, MIDI-acknowledged session with backing audio and a review/export step,
built as an extension of the same screen and flow rather than a new top-level IA. v2 shipped as
version 2.0.0, and its design is frozen in `versions/v2/`. The root now works toward v3.0
("Storage," `specs/versions/v3/master-spec.md`), the first version that keeps things on the
player's device: settings, the last session and pinned sessions with their favorites and comments,
the player's own instrument, the remembered controller and, on request, the notes the player
played. It extends the same screen again: kept sessions live inside the review, "Your data" and
"My instrument" are sheets. v3 ships in three releases, each built on the one before: v3.0
(Storage, approved and frozen in `versions/v3.0/`), v3.1 (presets and embellishment figures: a
preset dropdown at the top of the controls, a group of seven figure levels) and v3.2 (Jam: a
session begun by a doodle the player plays, the key and mode suggestion, the rhythm lock, Jam's
drift and what Vary settings may move). v3.3 (richer chords, master spec Part D) follows them:
a Seventh chords level beside Harmonic motion, and the longer chord symbols it brings. See
`todo.md` for where the work stands.

## Released versions and work in progress

- `versions/<version>/` holds each released version's design exactly as it shipped, frozen, with a
  `README.md` summarizing the decisions worth keeping. `versions/v1/` is the first release;
  `versions/v2/` is v2 (Rolling Phrase), released as version 2.0.0. `versions/v3.0/` is v3.0
  (Storage) as the owner approved it, frozen before it is built so that v3.1 and v3.2 could be
  designed at the root.
- Everything outside `versions/` and `archive/` is work in progress toward the next version, v3. It
  covers the whole interface, not only what the next version adds: a screen the next version
  extends is specified here in full, old behavior included. When a version's design is approved,
  a copy of it goes into `versions/<version>/`, and the work at the root continues toward the one
  after.
- What the version in progress adds, changes and removes is marked, so the unchanged part never
  has to be read to find it. A document that differs from its copy in `versions/v2/` opens with a
  **Changes since v2** block, one line per item linking to where it sits; the spot itself carries
  a **[v3 new]** or **[v3 changed]** tag (in a code block or stylesheet, the same words as an
  annotation or comment). Removals are listed only in that block, pointing to the old wording in
  `versions/`. A document new in v3 says so under its title. `grep -rn "v3 new\|v3 changed"`
  finds every mark. The marks stay until design work on the version after starts; the copy in
  `versions/` keeps them, so `versions/v2/` still shows what v2 changed from v1.
- v3's three releases are marked apart, so each can be built on its own, v3.1 before v3.2. The
  `[v3 new]` / `[v3 changed]` tags and the unprefixed change-block items are v3.0's; v3.1's are
  `[v3.1 new]` / `[v3.1 changed]` and change-block items prefixed `_v3.1 new:_`, `_v3.1 changed:_`
  or `_v3.1 removed:_`; v3.2's likewise. A v3.2 change to something v3.1 adds is its own tagged
  paragraph, so a v3.1 builder reads everything but the `v3.2` marks; replaced v3.0 and v2
  wording is in `versions/v3.0/`. v3.3's marks, `[v3.3 new]` / `[v3.3 changed]` and change-block
  items prefixed `_v3.3 new:_` or `_v3.3 changed:_`, are layered the same way on top of v3.2's,
  every v3.3 change being its own tagged paragraph or item so the earlier releases' text stays
  whole. `grep -rn "v3\(\.[123]\)\? \(new\|changed\)"` finds every v3 mark; all of them are
  cleared when v4's design starts.

## Map

- `strategy.md` explains the product shape, visual direction, and shared state policy.
- `src/styles/theme.css` and `src/styles/components.css` (in the application repo, imported by `src/styles/index.css`) are the canonical themeable token and component vocabulary. `versions/v1/ui_common.css` is a frozen design reference kept only for the v1 mockup; it is not imported by the app and is not buildable truth.
- `motion.md` defines the limited motion policy.
- `versions/v1/mockups/` contains the interactive v1 phrase-workspace review prototype, styled from the frozen `versions/v1/ui_common.css` reference.
- `flows/generate-phrase/` specifies the four-measure generation journey between sessions: the phrase the player asks for, the replacements the app makes when a phrase does not fit the window, and every idle state on the way to a phrase a session can start from.
- `screens/phrase-workspace/` specifies the shared workspace screen, including the options a session runs with (rising tempo, tension across phrases, varying settings), set before a session and only shown during it.
- `flows/controller-connection/` specifies the MIDI controller connection and transposition-check journey.
- `screens/controller-connection/` specifies the connection sheet screen that flow traverses.
- `flows/play-session/` specifies the continuous session: starting (Start or the starting note), the count-in, the rolling two-system display, acknowledgement, the audio mix, and every way a session ends, up to the review opening. It runs on `screens/phrase-workspace/`, whose session states it names.
- `screens/stale-phrase-prompt/` specifies the short sheet a start opens when the phrase on screen
  was made before the settings changed: it names what changed and offers `Regenerate phrase` or
  `Start with this phrase`.
- `flows/review-and-export/` specifies what follows a session once its first phrase has sounded: the review of the last session, the export of its generated notes and of the notes the player played, the fresh phrase the staff gets for the next session, leaving the review, and starting again.
- `screens/last-session-review/` specifies the review of a session, the one that just ended or any kept one (still named after v2's **Last session** review), which takes the staff's place after a session until the player closes it, with the notes the player played shown under each staff on request, the controls staying usable; no session starts while it shows.
- `flows/kept-sessions/` specifies reaching the sessions kept on this device: the two links above
  the staff, the session list inside the review, opening a kept session, and pinning, unpinning
  and deleting from the list. `screens/session-list/` specifies the list.
- `flows/saved-data/` specifies what is kept without asking and how it comes back at load, the
  notices about saving problems, and the **Your data** sheet with its deletions.
  `screens/your-data/` specifies the sheet.
- `flows/my-instrument/` specifies making, selecting, changing and deleting the player's own
  instrument, and `screens/my-instrument/` the sheet it is made in. The transposition check's
  way into it is in `flows/controller-connection/`.
- `token-source-v3.md` specifies v3.0's new tokens and component classes until they are written
  into `src/styles/theme.css` and `components.css`; the handoffs cite them by name.
- `token-source-v3.1-v3.2.md` does the same for v3.1 (its first part) and v3.2 (its second).
  v3.3 adds no token, class or motion: its one control and its chord symbols reuse existing ones.
- `flows/presets/` specifies choosing a preset, the Custom state, the key and mode highlight, and
  saving, renaming and deleting the player's own presets; `screens/preset-sheet/` the sheet those
  are done in. The preset dropdown and the embellishment levels sit in
  `screens/phrase-workspace/`.
- `flows/jam/` specifies a Jam: the Jam mode at idle, the count-in, the doodle, the first phrase
  written from it, a held doodle, and the key and mode suggestion. The rhythm lock, drift and
  what Vary settings may move are session options, in `screens/phrase-workspace/`.
- `open-questions.md`, `decisions.md`, and `todo.md` are working registers. Read `todo.md` before extending this set.
- `versions/v2/` holds the v2 design as it shipped in version 2.0.0, frozen, with a summary of the
  decisions worth keeping.
- `versions/v3.0/` holds the v3.0 design as approved, frozen, with a summary of the decisions
  worth keeping.
- `archive/v1/` holds the closed first-release (v1.0) working record: the complete decision log,
  the closed question that record answers, and the finished work tracker. `archive/v2/` holds the
  v2 working record the same way: its decision log, its closed questions and its finished work
  tracker. The live registers above stay current; the archive is kept verbatim and is never
  edited further.

## How future UI changes flow

- A token or component-style change is decided here, in the `ui_ux` handoff documents (this design set).
- The ux-writer then updates `src/styles/theme.css` and `src/styles/components.css`, which it owns as the canonical production token and component-class source from this point forward.
- Application code consumes those classes and tokens and never inlines a raw visual value.
- The v1 mockup and its `ui_common.css` are frozen with the rest of `versions/v1/` and are never updated; a later production styling decision leaves them stale, and that staleness is expected rather than an error.
