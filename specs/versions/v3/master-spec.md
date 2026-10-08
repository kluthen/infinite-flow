# Infinite Flow v3 — Master Spec: v3.0 Storage and v3.1 Generation Choices

Status: this file holds two parts.

- **[Part A — v3.0](#part-a--v30), storage:** master spec v1.4 (2026-10-07), approved by the
  product owner, and being built. Its text and section numbers (§1 to §15) are unchanged.
- **[Part B — v3.1](#part-b--v31), embellishment figures and presets:** master spec v1.0
  (2026-10-08), consolidated from the v3.1 drafts the owner approved; awaiting the owner's
  approval of this consolidation. Its sections are numbered B1 to B16.

v3.2 (Jam) is not covered here yet. Part A's history follows.

Part A status: master spec v1.4 (2026-10-07), approved by the product owner. Change in v1.1: the player's Disconnect also forgets the
remembered controller (§7.3). Change in v1.2: behaviours the v3.0 design settled, written in:
when settings are read and saved, what Delete everything leaves, which sessions a save deletes,
favorites and unpinning, the played-notes switch on the session that just ended, my instrument's
written range, and how the remembered controller is reattached (§4, §5, §6, §7, §13, §14).
Change in v1.3, from the build plan's review: how a transposition is spelled (§7.1); which
changes discard pre-generated phrases, and what "the same phrases" means when an attempt would
have failed (§8, item 20); persistent storage is asked for once per visit (§4.5, item 13); an
outdated tab offers no Delete everything (§4.3, item 14). Change in v1.4, wording fixes from the intent re-sync
and the design pass: the audio-unlock rule is said to widen, not stay (§7.3, §10); item 6
matches §5.1, a save deleting every unpinned session; an outdated tab offers no deletion of any
kind (§4.3, item 14); a visit whose read failed is told so and offers
Delete everything and nothing else, unless newer data is known to exist (§4.4). Consolidated from the approved v3.0 drafts for handoff to
`documentalist`, `ux-writer` and, after a build plan, `coding-leader`. Part A covers **v3.0
only**; Part B, consolidated from the approved v3.1 drafts for the same handoffs, covers v3.1. The
draft topic documents stay in `specs/versions/v3/` as working material; where they and this
document differ, this document wins.

## Part A — v3.0

Storage, as approved: sections 1 to 15 below.

## 1. Core concept

v1 and v2 forget everything on reload: every visit starts from the defaults, and the review of the
last session vanishes with the page. v3.0 is the first release that **keeps things on the player's
device**: their settings, their own instrument, the session they just played and the sessions they
chose to keep, and the phrases they marked as favorites. Nothing is ever sent anywhere.

Three smaller items ship with it: generating a few phrases ahead while the app waits for Start, so
fast sessions begin with time in hand; filtering out the very short "stray" notes some controllers
send; and remembering the controller the player uses.

The guiding principle is unchanged: Infinite Flow acknowledges and encourages; it never penalizes,
grades, ranks or scores the player, and anything that adapts is opt-in and visible.

## 2. Scope

### In v3.0

- Saving on the device: settings, preferences and the data below, with a place where the player
  sees and deletes what is kept (§4).
- Kept sessions: the most recent session kept automatically, pinned sessions kept for good, a list
  of kept sessions, the review of any kept session, an optional comment per session (§5).
- Played notes kept only after the player opts in, and deletable (§5).
- Favorites: marking whole phrases, and exporting favorites only (§6).
- "My instrument": a player-described instrument, saved, fed by the controller transposition check;
  the last controller remembered (§7).
- Pre-generating up to four phrases at Idle (§8).
- Filtering stray notes out of the review and the played-notes export (§9).

### Out of v3.0

- **v3.1, specified later:** embellishment flags (which decorating figures the generator may use,
  with weights as preferences) and presets (more built-in ones, and presets the player makes).
- **v3.2, specified later:** Jam, where the player plays a short motif and the generator develops
  it; the key and mode suggestion; the rhythm lock and its mutations.
- **Later candidates, not committed:** a full backup file of everything the app keeps, to move it
  to another browser; learning the player's taste from how they play, and recognising signals the
  player plays on purpose; marking a range of measures as a favorite.
- **Moved to v4:** rhythm ratios and the rhythm editor.
- **Dropped:** a one-control profile switch inside the transposition check (its useful part
  returns, aimed at "my instrument", in §7), a "Bluetooth" timing checkbox, richer review tooling
  (passage replay, expected-against-played views), and the end-of-measure chord-fit check.
- **Unchanged, permanently out:** any grading, scoring, ranking or wrong-note signal, in any view;
  accounts, sharing or any server-side state.

## 3. Personas and goals served

The full personas are in [personas.md](../../personas.md), with a shared context of use: a laptop
or desktop in Chrome or Edge first, a Chromium tablet on the music stand, a landscape phone
occasionally; hands, and the mouth on a wind controller, busy on the instrument; no click while
playing.

- **P1 — the Curious Improviser** (primary): can already play, a beginner at improvising, learns
  vocabulary by playing what comes.
- **P2 — the Speed Builder** (secondary): wants endless fresh material at steadily higher tempos.
- **P3 — the Fledgling Composer** (secondary): wants to keep and grow the ideas they liked.

| Goal | Served by v3.0 | How |
| --- | --- | --- |
| **P3.C1 — Review a session.** Look back at what was displayed and what they played; mark the parts they liked. | **Fully** | Kept sessions survive a reload and can be reopened in the same review; played notes are kept when the player opts in; favorites mark the phrases they liked. |
| **P3.C2 — Take it out.** Export the marked material to a widely known music format. | **Fully** | A favorites-only export scope, for the generated notes (MusicXML or MIDI) and the played notes (MIDI). |
| **P3.C3 — Grow an idea.** Play a gimmick and let the app continue it. | **Deferred to v3.2** | Jam. v3.0 lays its groundwork: stray notes are filtered before Jam needs clean played notes. |
| **P1.G1 — Vocabulary by exposure.** | Partly (comfort) | Settings come back as the player left them, so the next session starts where they were. |
| **P1.G2 — Real-time reading and dexterity.** | Partly | "My instrument" makes the written part match the instrument actually played, including one v2 doesn't ship. |
| **P2.S1 — Fresh material at a steadily higher tempo.** | Partly | Pre-generation lets the second phrase join the first smoothly again at the fastest tempos, where v2 has to generate it without the join. |

**Tensions settled for this scope.** P3 wants their material kept; every persona's played notes are
private. Resolved by keeping the music automatically but the player's own played notes only after
an explicit opt-in, and by giving deletion everywhere. P2 wants the app to start instantly; the
generator needs time at fast tempos. Resolved by pre-generating at Idle without ever making Start
wait.

## 4. Saving on the device

### 4.1 Principles

- **Everything stays on the player's device.** Nothing is sent anywhere; the app's network rules
  are unchanged. Data leaves the device only through an export the player triggers.
- **Saving never gets in the way of playing.** A failed save (storage full, browser refusal) never
  stops or delays a session. The app keeps working in memory and tells the player outside a
  running session; a running session never asks the player for anything.
- **The player can see and delete what is kept.** One place, called "Your data" here (its name and
  place are a design choice), lists what the app keeps, how much space it uses and whether the
  browser protects it (§4.5), and offers **Delete everything**, which removes every saved item at
  once after a confirmation and then reloads the page into its first-visit state. Each item's own
  deletion is specified with it.

### 4.2 What is saved automatically

| Saved | Rule |
| --- | --- |
| The 14 generation controls, and the musical profile selection (Neutral, Jazz, or customized) | The value the player chose, not the one a phrase was generated with: below the tablet-landscape width a chosen `Sixteenth` stays `Sixteenth`, though phrases are generated with `Eighth`. |
| The theme | |
| The audio mix: click and backing, each on or off and its volume | |
| The three "During a session" options: Vary settings, Tension across phrases, Rising tempo | Still the player's own opt-in: each comes back on only if the player turned it on. |
| The review's preferences: the generated-notes format, the backing track in the MIDI file, the `Played notes` switch | |
| "My instrument" and the remembered controller | §7. |
| The most recent session, pinned sessions, favorites, comments, and played notes when opted in | §5, §6. |

**Not saved:** the tempo a Rising-tempo session reached (it belongs to that session), pre-generated
phrases (§8), and anything belonging to a session while it runs.

A setting is saved when the player changes it, except during a session: a change made while a
session runs (the theme, the audio mix) is saved when that session ends, since nothing is written
during a session (§5.1).

### 4.3 Where and how

- In the browser's **IndexedDB**, one database for the app. (`localStorage` is limited to about
  5 MiB, synchronous and text-only; kept sessions need more.)
- Through raw IndexedDB or the small `idb` wrapper (about 1.5 kB compressed), not a large library:
  the first-load bundle has about 8.8 kB of headroom.
- **Storage code lives in one directory only**, the way Web Audio and Web MIDI code already do.
  The ban on storage APIs stays everywhere else. The session history and the export modules stay
  storage-free; a separate layer saves what they produce.
- **Every stored record carries a data version and the app version that wrote it.** A new app
  version that changes the stored shape migrates the data when it opens the database.
- **An outdated tab stops saving.** The app updates itself silently, so an old open tab can meet
  data written by a newer version. That tab keeps working in memory, saves and deletes nothing
  more, and offers no deletion of any kind (Delete everything, a kept session's Delete, deleting
  played notes, including the offer that turning "Keep my played notes" off makes: the notice asks
  for a reload first), and shows a notice asking
  for a reload, outside a running session. It reads what it can: records written by the newer
  version are left unread (a kept session saved by a newer version is listed as such and does not
  open).

### 4.4 Loading saved settings

The first phrase waits for the saved settings to be read. If reading fails, or takes longer than
a short start-up wait, the app starts from the defaults and saves nothing for the rest of that
visit, so a failed read never overwrites what is kept. The player is told, outside a running
session, that the saved data could not be read, that this visit saves nothing, and that reloading
may fix it. Delete everything stays offered in that visit, and is the only deletion it offers (the review
of a session held in memory offers neither Delete session nor Delete played notes, as in an
outdated tab): it is the way out when reloading does not help, whether the data is damaged or only slow to read; it
asks for confirmation as everywhere. Whenever saved data written by a newer version is known to
exist, at load or later in the visit, the outdated-tab rule (§4.3) wins: no deletion of any kind
is offered, Delete everything included, since deleting could destroy what the newer version
saved.

Each saved setting is checked on its own when the app loads. A value that is unknown or no longer
valid falls back to that setting's default; every other saved setting is kept. No notice is
shown: the control shows the default. (The current builders reject any unknown value outright, so
loading needs its own tolerant step before them.)

### 4.5 Keeping the data safe from the browser

A site's storage is "best-effort" by default: the browser may delete it under storage pressure,
without warning. Once per visit, the first time the player keeps something they would miss
(pins a session, marks a favorite, or saves "my instrument"), the app asks the browser to make the
storage persistent, unless it already is. Asking again on a later visit is harmless and gives the
browser another chance to grant it. Chrome and
Edge grant or refuse this silently, without asking the player. "Your data" says whether the
storage is protected; the app promises nothing it cannot keep.

### 4.6 Storage belongs to one address

Saved data belongs to one origin (scheme, host and port). Data saved while using a development
server never appears on the deployed site, and the reverse.

## 5. Kept sessions and the review of earlier sessions

### 5.1 Which sessions are kept

- **The most recent session is kept automatically.** It is saved when it ends and its review
  opens, and it survives a reload. A session that ends during its count-in produces no review, as
  in v2, and changes nothing that is kept. A session cut short by closing or reloading the page is
  lost, as in v2: saving happens at the session's end, never during it.
- **Pinning keeps a session for good.** When a new session is saved, every session that is not
  pinned is deleted, including one the player unpinned earlier. A pinned session stays until the player unpins or
  deletes it. Only one session is ever kept without the player asking.
- **Marking a favorite pins its session**, so a favorite is never lost by starting a new session.
  Unpinning a session that holds favorites asks for confirmation first, since the session and its
  favorites will then be deleted when the next session is saved.
- **No limit on the number of pinned sessions.** "Your data" shows the space they use. When the
  browser refuses a save because storage is full, nothing is deleted automatically to make room;
  the app tells the player after the session.

### 5.2 What a kept session holds

Only what the review and the exports read, plus what identifies the session:

- **For each phrase:** the generated timeline, the chord symbols, and the reproduction inputs (the
  seed, the controls, the profile, the instrument, the join from the previous phrase), the tempo,
  and whether the phrase was a repeat. About 3 to 8 KB per phrase: a 30-minute session is about
  0.8 to 3.4 MB.
- **Not kept:** the generator's internal working records (rhythm and tension provenance,
  diagnostics: 20 to 186 KB per phrase that nothing downstream reads), and which expected notes
  were acknowledged. Keeping acknowledgements would make it possible to count hits, which the
  permanent "no grading or scoring" rule forbids.
- **For the session:** start date and time, length, number of phrases, musical profile,
  instrument, starting tempo and the tempo reached, whether it is pinned, its comment (§5.5), and
  the app version that recorded it.
- **Played notes, only when the player has opted in** (§5.3). Their times are stored relative to
  the session's start: today they are measured on the page's audio clock, which means nothing after
  a reload.

A kept session keeps its generated timeline, not only its reproduction inputs: a later version of
the generator may produce different phrases from the same inputs.

### 5.3 Played notes: opt-in and deletion

- **One switch, "Keep my played notes", off by default.** While it is off, played notes exist in
  memory only, exactly as in v2: the review of the session that just ended shows them, and after a
  reload the kept session has none. While it is on, they are saved with the session. Switching it
  on while reviewing the session that just ended keeps that session's played notes too, since they
  are still in memory.
- **Pinning and keeping played notes are separate choices.** Pinning keeps the music; the switch
  decides whether the player's own notes are kept.
- **Deleting:** the played notes of one session, or of every session, can be deleted without
  deleting the sessions. Turning the switch off offers to delete the played notes already kept.
- Played notes are stored exactly as received, stray notes included, and filtered when read (§9).

### 5.4 Reaching earlier sessions

- **A list of kept sessions**, newest first, showing for each: date and time, length, number of
  phrases, profile and instrument, whether it is pinned, the number of favorites, and the start of
  its comment. It shows no figure about how well the player played.
- **Opening a kept session shows the same review v2 has**, for that session: its notation, the
  `Played notes` lane when its played notes were kept, and the exports, with the favorites scope
  (§6).
- **For each session:** pin or unpin, delete (with a confirmation). **For all:** Delete every
  session, in "Your data".
- **On every device, the phone included.** These are functions of the review that every device
  gets; the phone's review stays the plain baseline of those functions. Layout and navigation are
  a design matter.

### 5.5 A comment on a session

Optional plain text, at most 500 characters, written and edited in that session's review, shown
in the session list. It is never written into the MusicXML or MIDI exports.

## 6. Favorites

- **A favorite marks a whole phrase**, in the review of any kept session, including the session
  that just ended. Marking it again removes it.
- **Marking a favorite pins the session** (§5.1). Removing a session's last favorite never unpins
  it; the player unpins it explicitly.
- **Exporting favorites only.** Next to "whole session", the exports offer a favorites-only scope,
  for the generated notes (MusicXML or MIDI) and for the played notes (MIDI). The exported phrases
  come in session order, each keeping its session phrase number. A played note held past the end
  of a favorite phrase stops at that end when the next phrase is not exported.
- **Starting a new session never asks for confirmation.** Favorites live in a pinned session, so
  nothing is lost; there is no "unexported favorites" warning.
- With no favorite in the session, the favorites-only scope is unavailable, and says why.

## 7. My instrument

### 7.1 What it is

- **One saved instrument, made from a template.** The player starts from one of the three built-in
  profiles (C MIDI keyboard, B-flat tenor saxophone, E-flat alto saxophone) and may change:
  - its **name**;
  - its **range**, lowest and highest note, in written pitch: the written range is what the player
    sets and keeps, and the concert range follows from it and the transposition, so changing the
    transposition (by hand or through §7.2) keeps the written range;
  - its **transposition**, the interval between written and sounding pitch, chosen by name from a
    list: unison, minor second, major second, minor third, major third, perfect fourth, augmented
    fourth, perfect fifth, minor sixth, major sixth, minor seventh or major seventh, plus a number
    of octaves, written above or below sounding pitch. Each name fixes both the number of
    semitones and the number of letter-name steps (a major ninth is 14 semitones and 8 steps, as
    for the tenor saxophone), which is how notes, the key signature and chord symbols are spelled
    in written pitch, exactly as for the built-in profiles. The tritone (6 semitones) is always
    spelled as an augmented fourth.
- **The rules every profile already obeys apply:** whole-number endpoints, a span of at least two
  octaves (24 semitones), and the Low, Middle and High register windows derived by the same
  algorithm as the built-in profiles, never set by hand. A range under two octaves is refused, with
  the reason.
- **The input kind is "MIDI controller"**, the only kind in v3. It is stored so the microphone can
  be added later without changing the saved shape.
- **It is a fourth choice** in the instrument control. The three built-in profiles stay unchanged
  and selectable.
- **Deleting it** returns the instrument control to the template it was made from.
- **No Concert-display override.** Notation shows the selected instrument's written pitch, as in v2.

### 7.2 The transposition check feeds it

v2's check compares what the controller sends with what the selected instrument expects and finds
a constant offset: a match, whole octaves, or a number of semitones.

- When the result is not a match, the check offers one action: **use this for my instrument**. It
  sets "my instrument"'s transposition so the written notes match what the controller plays (the
  offset in semitones maps to the named interval of §7.1, octaves included),
  creating "my instrument" from the selected profile if there is none yet. The player confirms it
  once; it is then saved, and the check need not be redone in later visits.
- **The app still applies no offset to played notes.** They are compared at the exact concert
  pitch received, as in v2. Changing the instrument's transposition is what makes the written part
  match the controller.

### 7.3 Remembering the controller

The app remembers the last controller the player chose and reselects it when the app loads, as
soon as that controller is connected, matching it the way v2 already recognises a controller that
comes back within a page. It does so only when the browser already allows MIDI access, never with
a permission prompt; otherwise the player connects as in v2. After a load, the starting note
starts nothing until the page's first click, tap or key press, because browsers do not let a page
play sound before one. This widens v2's audio-unlock rule, where only a Start or Connect
controller click unlocked sound and a starting note worked only after Connect controller: with a
remembered controller there is no Connect click, so any first click, tap or key press on the page
unlocks sound, and a Start click still does. v2 forgot the choice on reload; v3.0 deliberately keeps it. The
player's **Disconnect** action, which in v2 forgets the controller for the page, also forgets the
remembered one, so a reload never reconnects a controller the player chose to disconnect.
Deleting "my instrument" does not forget the controller; Delete everything does.

### 7.4 Phrase replay key

A player-made instrument must travel with a phrase: through the generation worker, into the
session's history and into the phrase replay key. A new key version, `ifk2.`, carries the
instrument inline when it is not a built-in profile; `ifk1.` keys keep decoding as before.

## 8. Pre-generating phrases at Idle

- **What.** While the app is Idle with a phrase 1 on screen that a session could start from, it
  generates in the background up to four phrases that would follow phrase 1 in a session, one after
  another. A session spends them, then looks one phrase ahead as v2 does. They are never topped up
  during a session.
- **Why.** v2 keeps enough time in reserve at the fastest tempos that phrase 2 is always generated
  without joining smoothly to phrase 1. Generated before Start, with no deadline, phrase 2 can join
  phrase 1 again.
- **Changes before Start.** Anything that replaces phrase 1 or changes a setting phrases are
  generated from (a control, the profile, the instrument, a regeneration) discards every
  pre-generated phrase and starts again after the new phrase 1. So do the two session options that
  shape later phrases, Vary settings and Tension across phrases. The tempo and Rising tempo do not:
  tempo never affects generation. A change of window size that
  changes the note density phrases are generated with, or the staff layout a session would hold,
  re-checks them: one that no longer fits is discarded with every phrase after it.
- **The player comes first.** Pre-generation runs after v2's prewarm, on the same generation
  worker. Any request the player makes at Idle cancels the background attempt in progress, the way
  a dropped attempt is cancelled in a session, so the player never waits behind it.
- **Start never waits.** A background pre-generation does not count as "a new phrase is being
  generated", so it never stops a session from starting. The session takes whatever is ready and
  generates the rest under its own deadlines, as v2 does. Pre-generation never changes phrase 1 or
  its starting note, and does not run while a review is shown.
- **The same phrases either way.** A pre-generated phrase is exactly the phrase the session would
  have generated at that place: the same request and seed, the same mutation schedule, tension arc
  and density step-down. Where the session's own attempt at that place would have succeeded in
  time, the phrase is identical with or without pre-generation. Where it would have failed or
  fallen back (phrase 2 at the fastest tempos is generated without the join in v2), the
  pre-generated phrase is the one a successful attempt would have produced; that difference is the
  point of pre-generation. This requires the session's seeds and schedules to be fixed, from
  phrase 1, before Start.
- **Never saved:** pre-generated phrases are gone on reload.

## 9. Stray notes

Some controllers send very short notes while the fingers change position: in-between notes a real
instrument would swallow. The reference breath controller sends them often, in pairs at full
velocity. This is treated as a general controller matter; nothing is built for one device.

- **A very short note** is a played note whose length, from note-on to note-off, is under a fixed
  threshold.
- **The threshold is a constant, not a player setting.** It is tuned from recordings of the
  reference controller and must stay well under the shortest note the app writes at its fastest
  tempo: a sixteenth note at 240 BPM lasts 62.5 ms. Measurement starts around 30 to 40 ms.
- **Where it applies:** the review's `Played notes` lane and the played-notes export (and, from
  v3.2, the motif Jam reads).
- **Never in acknowledgement.** An expected note lights only for a played note with exactly its
  pitch inside its window; in-between stray notes normally light nothing, so no filter is added
  there.
- **Stored as received, filtered on reading,** so a later change of threshold loses nothing.
- **The played-notes export leaves very short notes out by default,** with an option to include
  them. The review's lane follows the default, with no switch of its own.

## 10. What v3.0 changes in v2's guarantees

v2 promised that nothing survives a reload. v3.0 deliberately reverses that promise. Each change
below is intended.

- **Three guarantees on the declared-intent contract change** and need the product owner's
  explicit confirmation and a major contract version:
  - "only the most recent session can be reviewed, and the review has no favorites"
    (`req_last_session_review`) — v3.0 reviews any kept session and adds favorites;
  - "played notes exist only in memory and are never written to browser storage"
    (`rule_optional_midi_privacy`) — v3.0 stores them after the player opts in, and never otherwise;
  - "the selected controller is kept in memory only and does not survive a reload"
    (`rule_same_controller_reattaches`) — v3.0 remembers it.
- **The audio-unlock rule widens** (not a contract guarantee): v2 unlocked sound only on a Start
  or Connect controller click; v3.0 unlocks it on the page's first click, tap or key press, since a
  remembered controller reattaches without a Connect click (§7.3).
- **About fifteen declared-intent entries under review** say "never persisted", led by the rule
  that session state is ephemeral; the vision's "out of scope through v2" list needs a v3
  revision.
- **Code gates** (the lint rule and the boundary script that ban storage APIs in all of `src/`)
  move from "nowhere" to "one directory only".
- **Tests** that assert nothing is saved change with them: about ten, among them the reload test
  that expects defaults back, the storage spy in the review privacy test (its storage half becomes
  "only allowed data, played notes only after opt-in"; its network half stays), the theme and
  review-navigation reload tests, the "no favorites" review check and the controller-forgotten
  test.
- **Unchanged:** nothing is sent; played notes leave the device only through the played-notes
  export; no grading, scoring or wrong-note signal anywhere.

## 11. Existing code and risks

From reading the code (details: [storage-grounding.md](storage-grounding.md)).

- **Settings** are one validated controls object plus the profile selection, held by the
  generation session composable; the audio mix lives in the audio transport; the session options
  in the session controller; the review's choices in the review host. The chosen note density is
  already kept apart from the generated one.
- **The session history** records each phrase with its generation outcome, reproduction inputs,
  acknowledgements and played notes, in memory; the review and exports read only the timeline,
  the chord symbols and the inputs.
- **The instrument id set is closed:** the three ids are a fixed type, the generation worker
  rebuilds the profile from its id and rejects anything else, and the replay key names the profile
  by id. "My instrument" needs that opened up across the worker protocol, the replay key and the
  history. This is the widest change in v3.0.
- **No storage API is used in application code today**; the app's only stored data is its offline
  cache of static files, which stays as it is.
- **At risk:** session timing (saving must stay out of a running session; §5.1 saves at the end);
  the first-load bundle budget (a large storage library would not fit); reproducibility (the
  replay key change, and fixing a session's seeds before Start for §8); the generation worker's
  single queue (§8's background work must always yield to the player); and every test that assumes
  a reload returns to defaults.

## 12. Architectural decisions and their reasons

- **IndexedDB, not localStorage**, because kept sessions outgrow localStorage's limit and its
  synchronous, text-only interface. **A tiny wrapper or none**, because the first-load bundle has
  little room.
- **One storage directory, ban kept elsewhere**, because it keeps "what is saved" auditable in one
  place and keeps the history and export modules provably storage-free, on a pattern the project
  already uses for audio and MIDI.
- **Save at the session's end, never during it**, because a running session's timing comes first;
  losing a session cut short by closing the page is the same as v2.
- **Keep the timeline, not only the inputs**, because the generator will change and old inputs
  could replay differently.
- **Keep only what the review and export read**, because the full records are 10 to 40 times
  larger, and because not keeping acknowledgements makes scoring impossible by construction.
- **Per-setting fallback on load**, because one setting removed by a later version should not wipe
  every other saved choice.
- **Favorites pin their session**, because it removes the need to warn about unexported favorites
  before a new session: nothing is ever lost by starting one.
- **Played notes opt-in, separate from pinning**, because the player's own notes are the most
  private data the app holds, and keeping the music should not imply keeping them.
- **My instrument from a template with the existing profile rules**, because the generator already
  validates any profile given as data, and deriving register windows keeps a player's range from
  breaking phrase generation in ways the three built-ins never do.
- **The check sets the instrument's transposition rather than adding an input offset**, because
  changing the written part is enough for every case met on real hardware and keeps played notes
  compared at the exact pitch received.
- **Pre-generated phrases identical to the session's**, because a session must stay reproducible
  from its inputs whatever happened at Idle.
- **Stray notes filtered on reading**, because raw data loses nothing if the threshold changes.

## 13. Definition of done

v3.0 ships when every item holds, each verified by a named test or a recorded hand check.

1. **Settings survive a reload.** Every setting in §4.2's table returns after a reload with the
   value the player chose; the tempo reached by a Rising-tempo session does not.
2. **The chosen density is what is saved.** Below the tablet-landscape width, a chosen `Sixteenth`
   reloads as `Sixteenth`.
3. **Tolerant loading.** A saved value that is unknown or invalid loads as that setting's default,
   and every other saved setting still loads.
4. **Storage stays in one place.** The lint rule and the boundary script allow storage APIs in the
   storage directory only and still reject them everywhere else; the history and export modules
   touch no storage.
5. **Nothing is sent.** No network request carries player data, with storage in use.
6. **The most recent session survives a reload** and opens in the same review; a new session's save
   deletes every unpinned kept session, one unpinned earlier included, and keeps every pinned one.
7. **No save during a session.** No storage write happens between Start and the session's end.
8. **A kept session holds only §5.2's content**: no acknowledgements, provenance or diagnostics.
9. **Played notes are stored only after opt-in.** With "Keep my played notes" off, no played note
   is ever written to storage; with it on, they are; per-session and all-sessions deletion remove
   them and nothing else.
10. **Favorites.** Marking a favorite pins the session; unpinning a session with favorites asks for
    confirmation; the favorites-only export contains exactly the favorite phrases in session order
    with their phrase numbers, for both kinds of export; a new session never asks for confirmation.
11. **The session list** shows §5.4's fields and no figure about how well the player played; each
    kept session opens, pins, unpins and deletes; the comment is kept, limited to 500 characters,
    and absent from every exported file.
12. **Delete everything** leaves no saved item behind, the remembered controller included.
13. **Persistent storage** is requested once per visit, on the first pin, favorite or saved
    instrument, unless already granted, and "Your data" reports whether it was granted.
14. **Outdated tab.** A tab opened by an older version, facing newer saved data, saves and deletes
    nothing, offers no deletion of any kind, and shows the reload notice outside a running session. **Unreadable data.** A visit whose saved data
    could not be read, or not within the start-up wait, starts from the defaults, tells the
    player, writes nothing (no change retries a save), and offers Delete everything and no other
    deletion, none in the session list or a review included; once newer data is known, it offers
    no deletion at all.
15. **Failed save.** A refused save never interrupts or delays a session, and the player is told
    after the session.
16. **My instrument.** A range under two octaves is refused; a valid instrument generates phrases
    in its range and shows notation in its written pitch; it survives a reload; deleting it
    returns to its template. The generator's success rate is measured on narrow (two-octave) and
    extreme ranges before the gate, and recorded.
17. **The check feeds my instrument.** "Use this for my instrument" sets the transposition so the
    written notes match the controller, after one confirmation, and the result survives a reload.
    Played notes are still compared at the pitch received.
18. **The controller is remembered** and reselected at load when connected and MIDI access is
    already allowed, with no prompt; after the player's Disconnect, a reload reselects nothing; the
    starting note starts nothing before the page's first click, tap or key press.
19. **Replay keys.** An `ifk2.` key reproduces a phrase made with "my instrument"; every `ifk1.`
    key still decodes to the same phrase as in v2.
20. **Pre-generation.** Each pre-generated phrase is identical to the phrase the session produces
    at that place when its own attempt succeeds in time, for the same inputs; any player request
    at Idle cancels a background attempt; Start never waits; a settings change, Vary settings or
    Tension across phrases discards pre-generated phrases, and the tempo or Rising tempo does not. The share of 240 BPM sessions whose phrase 2
    joins phrase 1 smoothly is measured and recorded.
21. **Stray notes.** The threshold is set from recordings of the reference controller and stays
    well under 62.5 ms; very short notes are absent from the `Played notes` lane and, by default,
    from the played-notes export, present when the option is chosen, and never affect
    acknowledgement; stored played notes include them.
22. **v2 behaviour otherwise unchanged:** the v2 test suite passes, apart from the tests §10 lists
    as changing, each replaced by its v3.0 counterpart.
23. **The declared-intent contract** reflects §10's three changes, with the owner's explicit
    confirmation recorded.

## 14. Deferred and open

- **Open, for the build plan:** the exact stray-note threshold, set by measurement (§9); the
  length of the start-up wait for saved settings (§4.4); whether "my instrument" needs a stricter
  range check than the two-octave rule once the generator's success rate on narrow and extreme
  ranges is known (§7.1, item 16). The design adds a reason for a bound: the written range of "my
  instrument" counts toward the staff's shared height, so an unusually wide or high range would
  make the staff taller for every instrument. A bound on the written range, settled with that
  check, would avoid it.
- **Measured, for information:** the battery cost of pre-generation at Idle on a tablet (§8).
- **Open, needs the owner:** the explicit confirmation of the three contract changes in §10. The
  owner approved this spec; that approval is not the contract confirmation.
- **Design, for `ux-writer`:** where "Your data", the session list, favorites, the comment, the
  "Keep my played notes" switch and "my instrument" live, and how they look on each device.
- **Deferred to later versions:** see §2.

## 15. Access model

v3.0 still has exactly one local user, with no accounts, roles, permissions or sharing. Whoever
has the page open can do everything the app offers. One change: saved data makes that "whoever
uses this browser profile on this device", since kept sessions, favorites, comments and, when
opted in, played notes are there for anyone who opens the app in that browser profile. Delete
everything (§4.1) is the player's control over that. Data leaves the device only through an export
the player triggers.

## Part B — v3.1

Generation choices: embellishment figures and presets. Master spec v1.0 (2026-10-08), consolidated
from the approved drafts [embellishment-flags.md](embellishment-flags.md) and
[presets.md](presets.md), which keep the code references line by line. Awaiting the owner's
approval of this consolidation. v3.1 is built on v3.0 (Part A): its storage, its settings record,
its tolerant loading and its `ifk2.` replay key must exist first.

Music terms are explained the first time they appear; the project's
[lexicon](../../../docs/music/lexicon.md) has one entry per term.

## B1. Core concept

Until v3.1 the player chooses between two fixed styles, Neutral and Jazz, and cannot say which
decorations the melody should use. And although the generator is allowed to decorate, it rarely
does: it always tries the notes of the chord first, so a decoration appears only when those fail.

v3.1 gives the player two things.

- **Embellishment figures, each with a level.** An **embellishment** (also called a decoration) is
  a note, or a small group of notes, that decorates a more important note without changing the
  chord underneath. v3.1 calls each kind a **figure** (a passing tone, a neighbor tone, an
  enclosure, and so on: B5.1) and lets the player set, for each of seven figures, a **level**: Off,
  As today, Favored or Strongly favored. A favored figure is tried first more often, so it is
  actually heard. A level is a preference, never a quota: no phrase is ever refused for lacking a
  figure.
- **Presets.** A **preset** is a named set of generation settings chosen in one step. v3.1 ships
  eight **built-in presets** (the project's own: Neutral and Jazz as before, plus six new ones) and
  lets the player save their own, a **player preset**. A preset may carry a **key and mode
  restriction**: the keys and modes it is meant for. Choosing a restricted preset moves the key
  and mode inside it; the key and mode controls then highlight what it allows, and nothing is ever
  blocked.

The guiding principle is unchanged: the app acknowledges and encourages; it never penalizes,
grades, ranks or scores the player, and anything that adapts is opt-in and visible. Neutral and
Jazz at their defaults generate exactly what they generate in v3.0.

## B2. Scope

### In v3.1

- Seven figures written as ordinary notes, each with a four-step level (B5).
- Presets that hold ten generation controls, the seven figure levels and a key and mode
  restriction (B6.1, B6.2); choosing one (B6.3); the Custom state and the restriction's highlight
  (B6.4).
- Eight built-in presets: Neutral, Jazz, Gentle, Speed drill, Reel, Bebop, Pop song, Modal
  (Dorian) (B6.5).
- Player presets: save as new, save changes, rename, delete, with a restriction choice when saving
  (B6.6), saved on the device with v3.0's storage (B7).
- Vary settings' style step becomes "one figure moves one level", and its key and mode moves stay
  inside the restriction in force (B8.1).
- A new replay key version for the figure levels, older keys still decoding (B9).

### Out of v3.1

- **Ornaments** (decorations written as a symbol or a small note rather than as ordinary notes:
  grace notes, mordents, trills, turns, jazz articulations such as falls and scoops). They get a
  release of their own after v3.2, starting with the **grace note** (a tiny, quick note squeezed
  in just before a main note).
- Every other figure (B5.1 lists them), and one level per direction of a figure.
- Richer presets: gimmicks, preferred rhythm patterns, restrictions on range or notes, tempo or
  instrument preferences, and the endgame's characters, locations and events, each with its own
  preset, instrument preference and tone.
- Built-in Blues, Bossa and Baroque presets (B6.5 says why).
- A player choosing arbitrary lists of keys or modes, or lists of key-and-mode pairs; a built-in
  preset restricting keys.
- Exporting or sharing a preset; saving "this phrase's settings" from the review; hiding a
  built-in preset.
- How presets meet v3.2's Jam, its key and mode suggestion and its rhythm lock: v3.2's matter.
- **Unchanged, permanently out:** any grading, scoring, ranking or wrong-note signal; accounts,
  sharing or any server-side state.

## B3. Personas and goals served

The personas are Part A's (§3) and [personas.md](../../personas.md): **P1 — the Curious
Improviser** (primary), a player who can already play and is a beginner at improvising; **P2 —
the Speed Builder** (secondary), who wants endless fresh material at steadily higher tempos;
**P3 — the Fledgling Composer** (secondary), who wants to keep and grow the ideas they liked.

| Goal | Served by v3.1 | How |
| --- | --- | --- |
| **P1.G1 — Vocabulary by exposure.** Play whatever gets generated and feel how these ideas sound; get to know the possibilities rather than study theory. | **Partly, much more than before** | Favored figures make passing tones, appoggiaturas and enclosures heard in many phrases instead of about one in a hundred. Style presets bring their mode or chord plan with them (Reel, Bebop, Pop song, Modal), so choosing one is enough to hear it. Off and As today let a beginner keep lines plain, then add one figure at a time. Ornaments and full styles (swing, seventh chords) are later. |
| **P1.G2 — Real-time reading and dexterity.** Adjust on the fly to notes as they come; raise the tempo they can manage. | **Partly** | Chromatic figures can be turned on from any preset, bringing accidentals (sharps and flats outside the key signature) to read at speed; Bebop and Speed drill favor them. |
| **P2.S1 — Fresh material, never memorized, at a steadily higher tempo.** | **Partly** | Speed drill is P2's setup in one choice (dense, varied, every figure favored). Vary settings now also drifts the figures, so a long session changes in vocabulary as well as in rhythm and key. |
| **P3.C1–C3 — Review, take out, grow an idea.** | **Not served directly** (C1, C2 by v3.0; C3 by v3.2's Jam) | Pop song gives song-like material, the kind a player keeps and exports; Modal (Dorian) gives a steady two-chord bed to grow an idea on. |

**Player presets** serve no goal by name: no persona goal says "save a configuration". They are
the owner's request and a comfort for every persona: P1 "pokes at settings to see what happens",
and a player preset keeps what they found; switching between a warm-up and a drill becomes one
choice.

**Tensions settled for this scope.** A beginner wants plain lines; the same player, and P2, want
variety. Resolved by defaults that sound as before and levels raised by choice. Every new figure
makes the generator's search larger and can slow it; resolved by levels that only reorder the
search, new figures Off by default, and a measured cost guard (B5.6). A style preset wants its
mode; the player's key is often chosen for their instrument or piece; resolved by a restriction
that keeps the key when it can, changes only what the style needs, and never blocks.

## B4. Words used in this part

One term per concept, used the same way everywhere in Part B and by `ux-writer`'s design.

- **Preset**: a named set of preset-held settings (B6.1). Two kinds: a **built-in preset**, the
  project's own, which the player can use and copy but never change; and a **player preset**,
  saved by the player under a name of their own. The v2 term "musical profile" (Neutral or Jazz)
  is replaced by "preset"; Neutral and Jazz are two built-in presets.
- **Preset-held settings**: the ten generation controls and the seven figure levels every preset
  holds (B6.1).
- **The selection**: what the preset selector shows: one preset, or **Custom**. Custom remembers
  the preset it is **based on**, or none.
- **Figure**: one kind of embellishment the generator can write (B5.1). A **free figure** is one
  the pitch search may use anywhere its rules allow; **Tension's scheduled figure** is the one
  figure the Tension control places on purpose (B5.4).
- **Figure level**, or level: Off, As today, Favored or Strongly favored (B5.2). These are
  working names; the labels are `ux-writer`'s, the meanings are fixed here.
- **Key and mode restriction**, or restriction: the keys and modes a preset is meant for (B6.2).
  **The restriction in force** is the one that applies at a given moment (B6.4).
- **Key** here means the **Written key** control's value: the home note of the phrase, the note
  the music feels settled on, chosen in the instrument's written pitch (the notes as read on the
  page; on a saxophone they sound lower than written). **Mode** means the **Collection** control's
  value: the set of seven notes built on that home note, one of nine: Major, Minor (natural
  minor), and the seven modes Ionian, Dorian, Phrygian, Lydian, Mixolydian, Aeolian and Locrian.
  Together they make what musicians call the key, such as "G Dorian".
- The grammar: a v2 word for the hidden set of figures Neutral or Jazz allowed. It disappears in
  v3.1: the figures are visible settings.

## B5. Embellishment figures and their levels

### B5.1 The seven figures

Background for the table:

- A **chord tone** is a note that belongs to the chord sounding at that moment; it sounds stable.
  Every figure decorates a chord tone and lands on one.
- A **step** moves to the next note of the scale; a **half step** is the smallest distance between
  two notes (one key to the very next on a keyboard). A **leap** is a jump larger than a step.
- **Diatonic** means using only the notes of the current key and mode; **chromatic** means a note
  from outside it.
- In four-beat measures, **beats 1 and 3 are the strong beats**, where the ear expects stability.

| # | Figure | What it is, plainly | Example over a C major chord | Before v3.1 | In v3.1 | Rhythm it needs |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | **Passing tone** | a scale note outside the chord that fills the gap between two notes, moving by step in one direction | C–**D**–E | allowed in Neutral and Jazz, rarely heard | a level | three notes in a row |
| 2 | **Accented passing tone** | the same, but on beat 1 or 3, so the clash lands where the ear expects calm; it sounds much tenser than #1 | **D** on beat 1, then E | allowed in Neutral and Jazz, never aimed for | its own level | an outside note on beat 1 or 3 |
| 3 | **Neighbor tone** | a step away from a chord tone and straight back, above or below | E–**F**–E | allowed in Neutral and Jazz, rarely heard | one level for both directions | three notes |
| 4 | **Appoggiatura** | a scale note outside the chord, reached by a leap, on a strong beat, that resolves by one step onto a chord tone | G, leap up to **D** on beat 1, then C | only as Tension's scheduled figure; never heard as a free figure | **new as a free figure**: entered by a leap of 3 half steps or more, on beat 1 or 3, resolved by one scale step onto a chord tone | a strong beat and a note before it |
| 5 | **Diatonic enclosure** (also called a double neighbor) | the scale notes just above and just below a target chord tone, in either order, then the target: "surrounding a note" | **F**–**D**–E | not possible | **new**: two outside notes in a row, allowed inside this figure only | three back-to-back notes under one chord |
| 6 | **Chromatic approach** | one note from outside the key, a half step above or below a chord tone, just before it | **D♯**–E | Jazz only | a level, available from any preset | two back-to-back notes |
| 7 | **Chromatic enclosure** | the notes a half step above and below a target chord tone, at least one of them outside the key, then the target | **F**–**D♯**–E | Jazz only | a level, available from any preset | three back-to-back notes under one chord |

- **Back-to-back** means with no rest between them and no chord change. The rhythm decides where a
  figure can go: a level never adds a note. An enclosure needs three back-to-back notes under one
  chord, so with quarter notes only it stays rare whatever its level.
- **The chromatic approach covers its neighbors.** What theory calls a chromatic passing tone
  (F–F♯–G) or a chromatic neighbor (G–F♯–G) is, in this generator, a chromatic approach seen from
  the note before it.
- **Every existing figure rule still holds**: each figure resolves once, onto a chord tone, and no
  figure spans a chord change. Two outside notes in a row are allowed inside an enclosure only
  (figures 5 and 7).
- **The arpeggio** (the chord's own notes one after another) is the generator's baseline, not a
  figure, so it has no level.
- **Not in v3.1:** the diatonic approach as a free figure (two scale notes stepping into a chord
  tone; it stays Tension's Build figure), mixed and longer enclosures, the double chromatic
  approach, and every figure that looks across a chord change or chains outside notes (the escape
  tone, anticipation, suspension, retardation, scale run, bebop-scale passing tone, held blue note,
  octave displacement). Those touch the rhythm planner, the tie rules or the one-resolution rule,
  not only the order of the search.

### B5.2 Four levels

| Level | Allowed | What the pitch search does |
| --- | --- | --- |
| **Off** | no | never writes the figure as a free figure (Tension's scheduled figure is separate: B5.4) |
| **As today** | yes | tries the figure after the chord tones, exactly as before v3.1: it appears only when the chord-tone path fails |
| **Favored** | yes | at about **1 in 4** of the notes where the figure could start, tries it **before** the chord tones |
| **Strongly favored** | yes | the same at about **1 in 2** of those notes |

- **A level orders the search; it never sets a quota.** No phrase is rejected or retried for
  lacking a figure. A favored figure that leads to a dead end is backed out of, like any other
  candidate, and the chord tones are tried next.
- **"About 1 in 4" and "about 1 in 2" are starting values**, tuned before the gate by listening and
  by the cost guard's measurement (B5.6). What is fixed is the order: each step up never makes the
  figure rarer.
- **Which notes are drawn** is decided from the phrase's seed and the note's position, with integer
  arithmetic only, so every browser draws the same (floating-point functions can differ between
  browsers). Where several figures are drawn at one note, the higher level goes first, then the
  seed's usual order.
- **Off and As today consume no draw.** A phrase whose levels are all Off or As today is searched
  in exactly the order used before v3.1, so it reproduces note for note.
- **Where the levels live:** they are generation settings of the Idle screen, like the controls:
  set at Idle (the review included), locked while a session runs, saved and restored (B7), held by
  every preset (B6.1), and carried in every phrase's generation request (B9). Their first-load
  values are Neutral's.

### B5.3 Neutral and Jazz sound as before

| Figure | Neutral | Jazz |
| --- | --- | --- |
| Passing tone | As today | As today |
| Accented passing tone | As today | As today |
| Neighbor tone | As today | As today |
| Appoggiatura (free) | Off | Off |
| Diatonic enclosure | Off | Off |
| Chromatic approach | Off | As today |
| Chromatic enclosure | Off | As today |

The rule behind it: **every figure a style wrote before v3.1 is As today; every figure new in v3.1
is Off.** The two new figures must be Off, not As today: adding a candidate changes what the search
finds whenever it backs up past the chord tones, so "As today" for a new figure would already
change existing phrases. With this table, Neutral and Jazz generate exactly what v3.0 generates
from the same request. They therefore still sound nearly free of decorations; hearing figures
takes a raised level, a preset that raises them, or Vary settings.

### B5.4 Free figures and Tension's scheduled figure

The **Tension** control (Settled, Lift, Build, Edge) places at most one figure per phrase of its
own: optional under Settled and Lift (a passing tone, neighbor tone or appoggiatura), required under
Build (a two-note approach in the key) and Edge (a passing tone, neighbor tone or appoggiatura).

- **Figure levels govern free figures only; Tension keeps its scheduled figure whatever the
  levels.** With the passing tone Off, Edge still places its one required figure, and Build its
  approach. Otherwise some combinations of levels would make a Tension value impossible, and the
  player would get no phrase, or a Tension that silently does nothing.
- **The levels do not reorder Tension's choices.** The scheduled appoggiatura stays as rare as
  before; raising the appoggiatura's level adds free appoggiaturas.

### B5.5 Determinism

Every figure level is part of what a phrase is generated from, so a phrase reproduces from its
inputs, a pre-generated phrase equals the one the session would generate (Part A §8), and a kept
session's inputs say how each phrase was made. The draws of B5.2 come from the phrase's seed; the
same inputs give the same phrase in Chrome and Edge, on any machine. The replay key is in B9.

### B5.6 The cost guard

The pitch search is the generator's most expensive step, and its failures are the slow case: the
problem of failed joining attempts taking seconds, resolved on 2026-10-07
([issue](../../../issues/Ref_20261006_failed_carry_in_attempts_slow.md)), whose price is that at
240 BPM phrase 2 is always generated without joining phrase 1 smoothly (Part A §8 repairs this).

- **Levels as ordering** do not change which phrases are possible, so they add nothing to a search
  that must fail; they can slow a search that succeeds, when a favored outside note leads to a
  dead end and the search backs out.
- **New figures** (the free appoggiatura and the diatonic enclosure) enlarge every search where
  they are allowed; Off by default, they cost nothing unless turned on.
- **Off can create failures.** Free passing and neighbor tones are how the search escapes the dead
  ends that leaps create; with them Off, some settings that work today may find no phrase, or find
  it more slowly.

The guard:

- **The search allowance is not raised**: 250,000 units of search work for a phrase generated on
  its own, 160,000 for an attempt that joins the previous phrase.
- **Measured before the gate**, at three figure settings: the Neutral and Jazz defaults (the
  baseline), every figure Strongly favored, and every diatonic figure (1 to 5) Off. Each is run on
  the deadline sweep of v2's definition of done (its settings and seeds at 60, 120 and 240 BPM,
  `npm run test:sweep`) and in a 240 BPM session. Recorded for each: the share of phrases
  generated, the slowest and the 95th-percentile generation time, and at 240 BPM the share of
  phrases that fall back to being generated without the join.
- **Acceptance:** against the baseline, at most 2 percentage points more fallbacks at 240 BPM, and
  at most 2 percentage points fewer phrases generated at any swept setting. A level that costs more
  is tuned down (a smaller share) before the gate.
- **If "every diatonic figure Off" fails that test**, v3.1 keeps one escape route rather than
  refusing the player's choice outright: **the passing tone and the neighbor tone may not both be
  Off.** The pair is then handled like an unsupported rhythm combination: the level control refuses
  the second of the two, saying why; a Vary settings step that would land on it is drawn again; a
  saved setting or preset holding it loads with the neighbor tone at As today. The measurement
  decides whether this rule ships; if the test passes, it does not.
- Pre-generation helps only phrases 2 to 5 of a session; the deadlines after them are v2's, so the
  240 BPM measurement is what matters.

## B6. Presets

### B6.1 What a preset holds

| In every preset | Never in a preset |
| --- | --- |
| **Ten controls:** Harmonic motion, Tension, Note density, Rhythmic variety, Syncopation, Silence density, Contour, Register, Leapiness, Arpeggio chaos | Tempo, Instrument profile, "my instrument" |
| **The seven figure levels** (B5) | A key or mode **value**: the restriction says which are meant, never which is chosen |
| **A key and mode restriction** (B6.2), "any" for most presets | The audio mix, the theme, the review's preferences |
| **A name** | The three "During a session" options: Vary settings, Tension across phrases, Rising tempo |

- **Every preset holds all ten controls, all seven levels and a restriction**, built-in and
  player-made alike, so a preset always gives the same sound whatever was selected before it, and
  "Custom" and "save" mean one thing.
- **Neutral and Jazz change slightly.** Before v3.1 they set seven controls; they now also hold
  Tension, Leapiness and Arpeggio chaos, at their first-load values (Lift, Shaped, Varied).
  Choosing Neutral or Jazz therefore also resets those three, and changing Tension, Leapiness or
  Arpeggio chaos now makes Custom. Their restriction is "any", so they never move the key or mode.
- **Session options stay out** because they are the player's own opt-in (Part A §4.2); a preset
  that switched Vary settings on would make that choice for them. Rising tempo is a tempo matter.
- **Note density is the chosen value**: below the tablet-landscape width a preset's Sixteenth
  generates as Eighth, as any chosen Sixteenth does.
- **A player preset may hold an unsupported rhythm combination** (a mix of note density, silence
  density and syncopation for which no four-measure rhythm exists): it holds the settings of the
  moment, and choosing it shows the existing unsupported-rhythm alert. A built-in preset never
  does, at Sixteenth or stepped down to Eighth.

### B6.2 The key and mode restriction

A restriction has two halves, each **"any" or an ordered list**: the **keys** (written keys) and
the **modes** (Collection values). The allowed key-and-mode pairs are every allowed key with every
allowed mode.

| Form | Keys | Modes | Example |
| --- | --- | --- | --- |
| Any | any | any | Neutral, Jazz, Gentle, Speed drill |
| Modes only | any | a list | Reel: Mixolydian or Dorian, in any key |
| Keys only | a list | any | not used by a built-in in v3.1 |
| One key and one mode | one | one | a player preset kept to "G Dorian" (B6.6) |

- **Major and Ionian are different entries**, and so are Minor and Aeolian. Each pair has the same
  notes but not the same **chord plan** (the order of chords the generator follows): Major and
  Minor get the tonal plan, whose chords lead home through the chord on the 5th note of the scale;
  the seven modes get the modal plan, built around each mode's **color note** (the note that sets
  it apart, such as Dorian's raised 6th). A restriction to Major does not allow Ionian.
- **A list is ordered**; its first entry is the preset's main sound (B6.3 uses it). A built-in's
  list holds at least one entry, and its modes are neighbors in Vary settings' order (B8.1).
- **The keys half is in written pitch**, like the Written key control. Switching instrument keeps
  the written key, so it never leaves a restriction.
- **No free lists of pairs** such as "D Mixolydian or A Dorian": with two independent halves, each
  control highlights its own list whatever the other shows.
- **No built-in restricts keys in v3.1.** A built-in key restriction would have to mean concert
  keys converted for each instrument, which v3.1 does not need.
- **First load never moves.** Neutral, selected at first load, allows any key and mode, so C Ionian
  stays.

### B6.3 Choosing a preset

Choosing a preset, from any state:

1. sets all ten controls and all seven levels to the preset's values, replacing any unsaved Custom
   changes without asking;
2. for each half of its restriction separately: **keeps the current key (or mode) if it is
   allowed, otherwise sets the half's first listed value**;
3. never changes the tempo, the instrument or the session options.

| Current | Preset chosen | Result |
| --- | --- | --- |
| G Ionian | Modal (Dorian): any key, Dorian | **G** Dorian: the key is allowed and kept |
| A Aeolian | Reel: any key, Mixolydian or Dorian | A **Mixolydian**: first listed |
| A Dorian | Reel | A Dorian: already inside, nothing moves |
| C Ionian | Pop song: any key, Major | C **Major**: same notes, the tonal chord plan |
| E Ionian | a player preset kept to G Dorian | **G Dorian**: one pair, so both are set |

- **Why keep the key:** the written key is often chosen for the instrument or the piece being
  practised, and a modes-only restriction has no reason to move it. Keeping the home note and
  changing the mode is how modes are usually heard and taught: the same home note in a new color
  (these are called **parallel** keys or modes).
- **Why the first listed mode, not the nearest:** the result is predictable whatever the player
  had before; Reel always lands on Mixolydian, its signature sound.
- Choosing a preset is the player's own act, so the rule that **the app never switches the key and
  mode by itself** still holds.
- **The phrase on screen stays** until the player regenerates it, as after any change of settings
  at Idle (only an instrument switch regenerates by itself). A choice that changes any setting
  discards the pre-generated phrases (B8.3).
- **When:** whenever the controls can be changed: at Idle, the review included, never during a
  session, and not while a phrase is being generated.

### B6.4 The selection, Custom and the highlight

The selection is one of: a **built-in preset**, a **player preset**, or **Custom**, which names the
preset it is **based on**, or none.

- **Custom begins** when, with a preset selected, the player changes a preset-held setting, or
  chooses a key or mode outside the restriction in force. Values are not compared with the
  preset's: changing a setting back by hand stays Custom. **Only choosing a preset leaves Custom.**
  Changing the tempo or the instrument never makes Custom, nor does choosing a key or mode inside
  the restriction.
- **What Custom means:** the current preset-held settings are not a saved preset, or the key and
  mode left the preset's restriction; saving them would make a preset. It is the only state in
  which "save changes" or "save as new" has something new to save.
- **Custom's display names its base** ("Custom, based on Bebop"; wording `ux-writer`'s), or just
  "Custom" with no base. It replaces v2's status line naming the "grammar retained".
- **The restriction in force** is the restriction of the selected preset, or in Custom of its base,
  **while the current key and mode are inside it**; otherwise there is none. It is worked out from
  the selection and the two controls, never stored.
- **The highlight:** the key and mode controls mark the values the restriction in force allows,
  **not by colour alone**. With none in force, or with "any", nothing is marked. **Nothing is ever
  blocked**: every key and mode stays selectable.
- **Opting out:** choosing a key or mode outside the restriction in force turns a selected preset
  into Custom based on it (Custom stays Custom); the restriction is no longer in force, so the
  highlight goes; no other setting changes. Choosing a key and mode back inside by hand brings the
  highlight back, and the selection stays Custom.
- **Editing a preset-held setting** makes Custom and keeps the restriction in force: a reel with
  more syncopation is still a Mixolydian or Dorian reel.

### B6.5 The built-in presets

Eight built-in presets. Names are working names; each preset is known internally by a fixed
identifier, so a later version may rename one without breaking a saved selection or a Custom base.

| Setting | Neutral | Jazz | Gentle | Speed drill | Reel | Bebop | Pop song | Modal (Dorian) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| **Key and mode** | any | any | any | any | any key; Mixolydian or Dorian | any key; Major | any key; Major | any key; Dorian |
| Harmonic motion | Gentle diatonic | Gentle diatonic | Static | Active diatonic | Gentle diatonic | Active diatonic | Gentle diatonic | Gentle diatonic |
| Tension | Lift | Lift | Settled | Lift | Settled | Build | Lift | Lift |
| Note density | Quarter | Eighth | Quarter | Sixteenth | Eighth | Eighth | Eighth | Eighth |
| Rhythmic variety | Slightly varied | Slightly varied | Strict | Heavily varied | Strict | Strict | Heavily varied | Slightly varied |
| Syncopation | Straight | Occasional offbeats | Straight | Occasional offbeats | Straight | Occasional offbeats | Occasional offbeats | Occasional offbeats |
| Silence density | Sparse | Conversational | Conversational | Sparse | Sparse | Sparse | Conversational | Conversational |
| Contour | Arch | Wandering | Arch | Wandering | Arch | Wandering | Arch | Wandering |
| Register | Middle | Varying | Middle | Varying | Middle | Varying | Middle | Varying |
| Leapiness | Shaped | Shaped | Smooth | Leaping | Shaped | Leaping | Shaped | Leaping |
| Arpeggio chaos | Varied | Varied | Predictable | Chaotic | Varied | Varied | Varied | Varied |
| Passing tone | As today | As today | As today | Favored | Favored | As today | As today | Favored |
| Accented passing tone | As today | As today | Off | Favored | As today | As today | As today | As today |
| Neighbor tone | As today | As today | As today | Favored | Favored | As today | As today | Favored |
| Appoggiatura | Off | Off | Off | Favored | Off | Off | Favored | Off |
| Diatonic enclosure | Off | Off | Off | Favored | Off | Favored | Off | Off |
| Chromatic approach | Off | As today | Off | Favored | Off | Strongly favored | Off | Off |
| Chromatic enclosure | Off | As today | Off | As today | Off | Strongly favored | Off | Off |

- **Neutral, Jazz**: as before, apart from the three controls of B6.1.
- **Gentle** (P1.G1, P1.G2 at the player's own pace; a warm-up for P2): one chord, quarter notes,
  steps only, no tension, no decoration favored. The way in for a player new to improvising. Any
  key and mode: a warm-up should not move them.
- **Speed drill** (P2.S1, P1.G2): dense, heavily varied, every diatonic figure and the chromatic
  approach favored, so the material keeps changing shape and brings accidentals to read. Any key
  and mode: reading in many keys is part of the drill. It is the most expensive setting found, so
  the cost guard measures it first.
- **Reel** (P2.S1, P1.G2): a **reel** is a fast folk dance tune in a steady stream of even eighth
  notes. Restricted to Mixolydian or Dorian, the folk modes the default C Ionian lacks; Vary
  settings can move between the two. Ionian is left out of the list, though reels are often in
  major, because a player on the default Ionian would then hear no change; such a player opts out
  by choosing Ionian. A reel's ornaments (cuts and rolls) wait for the ornament release.
- **Bebop** (P1.G1, P1.G2): bebop is the fast, chromatic jazz style of the 1940s. Chromatic
  approaches and enclosures tried before chord tones at about half the notes where they fit, and
  the Major chord plan, whose path home through the 5th-degree chord gives room to bebop's
  favorite move (the chord on the 2nd degree leading to the chord on the 5th). The owner plays
  tenor saxophone, a bebop instrument.
- **Pop song** (P1.G1, P3): the most familiar idiom; restricted to Major, whose chord plan can give
  the familiar four-chord pop pattern on degrees 1, 6, 4 and 5. The favored appoggiatura is typical
  of pop ballads.
- **Modal (Dorian)** (P1.G1, P3.C3): what a mode sounds like, and a steady two-chord bed to grow an
  idea on. Passing and neighbor tones are favored so Dorian's color note is heard in the melody;
  chromatic figures stay Off to keep the mode audible.
- **Major, not Ionian, for Pop song and Bebop.** A player on C Ionian who chooses Pop song moves
  to C Major: the same notes, so the key signature does not change, but the chords follow the
  tonal plan, and the Collection control shows "Major". The preset's description should say why.
- A description may **suggest** what the restriction does not hold, such as "also try Ionian" for
  Reel (wording `ux-writer`'s).
- **What the list is not:** styles in full. None swings, uses seventh chords (four-note chords),
  or has its style's rhythm pattern or ornaments. **Blues, Bossa and Baroque wait**: without the
  held blue note and seventh chords Mixolydian alone is not a blues; bossa nova's rhythm pattern
  and chords are missing; Baroque needs sequences, trills and the raised 7th of harmonic minor,
  which the app's natural minor lacks.

### B6.6 Player presets

| Action | Built-in preset | Player preset |
| --- | --- | --- |
| Choose | yes | yes |
| Save as a new preset (from any state) | yes: the current settings under a new name | yes |
| Save changes into it (from Custom based on it) | **never**: it is the project's; save as new instead | yes, replacing its values; no confirmation, since the player asked |
| Rename | no | yes |
| Delete | no | yes, after a confirmation |

- **Saving asks for the restriction**, with three choices (how it is asked is `ux-writer`'s):
  1. **As now**, the default: the restriction in force, or "any" when none is. Saving from Custom
     based on Reel keeps "Mixolydian or Dorian"; saving a customized Modal (Dorian) keeps Dorian.
  2. **Only this key and mode**: one pair, the current written key and mode.
  3. **Any key and mode.**
  A player cannot build other lists in v3.1. The keys half is written pitch: a preset kept to G
  Dorian stays G Dorian as read on any instrument.
- **The new or overwritten preset becomes the selection.**
- **Deleting the selected player preset, or the one Custom is based on,** leaves the selection
  Custom with no base and the same values, so nothing is regenerated and no restriction is in force
  any more.
- **Saving or deleting can change the restriction in force** (a save whose restriction choice
  differs from the one in force before, or the deletion of the preset that supplied it); it then
  discards the pre-generated phrases (B8.3).
- **Names:** plain text, trimmed, **1 to 40 characters**, unique among all presets ignoring case,
  built-in names included; "Custom" is reserved. A refused name says why. Uniqueness is checked
  when saving or renaming only: presets arriving from another tab, or a later version's new
  built-in name, are loaded and listed as they are, duplicates included, and the player may rename
  them.
- **At most 50 player presets.** At the limit, saving a new one is refused, saying why. The limit
  keeps the selector usable, not the storage (each preset is a few hundred bytes). More than 50
  loaded (written from two tabs) are all listed; saving a new one stays refused while there are 50
  or more.
- **When:** at Idle or with the review shown, never during a session (a running session never asks
  the player anything). Saving, renaming and deleting change no setting, so they need not wait for
  a phrase being generated.
- **The player can always tell a built-in preset from their own**, since only their own can be
  changed, renamed or deleted.

## B7. Saving on the device

Player presets and the new settings follow Part A §4's rules.

- **What is saved.** Each player preset is one record, with a data version and the app version
  that wrote it, holding its ten controls, seven levels, name and restriction (two lists, or
  "any"). It is known by an internal identifier, not its name, so renaming it keeps it selected and
  keeps it as Custom's base. The settings record gains the seven figure levels, and Part A §4.2's
  "musical profile selection" becomes **the preset selection**: which preset, or Custom and its
  base. The restriction in force is not saved: it follows from the selection and the key and mode.
- **Saved automatically** when a player preset is made, changed, renamed or deleted, and when a
  figure level or the selection changes, under Part A §4.2's rule (a change is saved at once,
  never during a session).
- **Read at start-up with the settings**, before the first phrase and within Part A §4.4's
  start-up wait. If that read fails, the visit is a failed-read visit as a whole.
- **On load, the values win.** If the saved values differ from the selected preset's, or the saved
  key and mode are outside its restriction (a built-in retuned by a later version, a player preset
  changed in another tab), the selection shows Custom based on that preset; if the preset no
  longer exists, Custom with no base. **Loading never moves the key or mode.** The player's sound
  never changes behind their back.
- **Tolerant loading, per preset and per field.** An unknown or invalid field takes that setting's
  first-load value. A figure level missing because the record was written before that figure
  existed is Off, the same rule as for older replay keys (B9). A missing name becomes a numbered
  one. In a restriction, an unknown key or mode is dropped from its list, and an empty list, or a
  missing restriction, reads "any". A record that cannot be read at all is left in place and not
  listed. No notice is shown, as in Part A §4.4.
- **Settings saved by v3.0** are migrated when the database opens (Part A §4.3): the saved musical
  profile selection becomes that built-in preset, or Custom based on it, and the figure levels are
  that built-in's (B5.3). The "values win" rule then applies: a v3.0 selection of Jazz saved with
  Tension at Build loads as Custom, based on Jazz, since Jazz now holds Tension at Lift.
- **A refused save** (storage full, browser refusal) keeps the preset for this visit and tells the
  player at once that it is not kept; preset management happens outside a session, so the notice
  need not wait.
- **Persistent storage.** Saving a player preset, as new or by saving changes into one, counts as
  keeping something the player would miss: it joins pinning, marking a favorite and saving "my
  instrument" as a trigger of Part A §4.5's request, still asked once per visit, unless already
  granted.
- **An outdated tab** (Part A §4.3) and **a visit whose saved data could not be read** (Part A
  §4.4) save nothing: presets made or changed there last for the page, under that visit's notice.
  Neither offers any preset deletion. A failed-read visit starts from the defaults and lists the
  built-in presets only; an outdated tab lists the player presets it could read.
- **Delete everything** removes every player preset, a record that could not be read included.
  **"Your data"** lists the player presets, with their number.
- **Two tabs of the same version:** each save writes a whole preset; the last write wins; another
  tab sees the change after a reload.

## B8. How v3.1 meets the rest

### B8.1 Vary settings

**Vary settings** is the "During a session" option that, every 2 to 4 phrases, moves one setting
one step.

- **The style step becomes "one figure moves one level"**, up or down, never past Off or Strongly
  favored. It replaces the Neutral ↔ Jazz flip, which has no meaning once figures are settings.
  The seven levels together take the one place in the draw the profile had: the seeded draw picks
  the setting, then for this setting the figure, then the direction, so every other setting is
  drawn as often as before. A figure step never lands on an unsupported rhythm combination, since
  levels do not affect rhythm.
- **A move of a preset-held setting** (a control or a figure level) marks the selection Custom for
  that session; the selection, and every mutated setting, return to the player's own when the
  session ends, as the profile's marking does in v2. Moves of Tension, Leapiness and Arpeggio
  chaos now mark Custom too, since every preset holds them.
- **Key and mode moves stay inside the restriction in force at the session's start**, so the app
  never opts the player out of their preset by itself. Today the key moves one step around the
  **circle of fifths** (seven half steps up or down, which adds or removes one sharp or flat in the
  key signature), and the mode one step in brightness (Lydian, Ionian, Mixolydian, Dorian, Aeolian,
  Phrygian, Locrian, one note changing at each step) or between Major and Minor, never between
  those two groups. A move outside the restriction is drawn again, exactly as a move onto an
  unsupported combination is; the player never sees it. The bound is fixed for the session.
  Consequences: under Reel the mode may move between Mixolydian and Dorian; under Modal (Dorian),
  Pop song or Bebop it never moves and the key moves freely; under a one-pair player preset neither
  moves. When no allowed value is one step away, that half simply does not move. A session started
  with no restriction in force is not bounded, and no move is drawn again for a restriction's
  sake.
- Key and mode moves never mark Custom, as before. Vary settings never switches preset.

### B8.2 Tension across phrases

**Tension across phrases** raises and lowers Tension over groups of four phrases. It changes only
what each phrase is generated with, never the setting, so it **never marks Custom**, although
Tension is now preset-held. It does not change the levels: a tenser phrase gets Tension's tenser
scheduled figure, not more free figures.

### B8.3 Pre-generation

Part A §8's rule extends: choosing a preset whose values differ from the current ones, or that
moves the key or mode; changing any figure level; and any change of the restriction in force
(choosing outside it, or a save or deletion that changes it) discard the pre-generated phrases.
A change of the restriction discards them whether Vary settings is on or not, which is simpler and
rare. Saving, renaming or deleting a preset that changes neither a setting nor the restriction in
force, and choosing a preset identical in values and restriction, discard nothing.

### B8.4 Acknowledgement, exports, phone width and the instrument

- **Acknowledgement is unchanged.** A decorating note is an expected note like any other: it lights
  when the player plays its exact pitch inside its window. A chromatic note is harder to read than
  a scale note, which is the point. No grading, scoring or wrong-note signal: a missed decoration
  is never marked.
- **Exports are unchanged.** Figures are ordinary notes in MusicXML and MIDI; no export carries a
  preset, its name or its restriction.
- **Phone width is unchanged.** Below the tablet-landscape width Sixteenth generates as Eighth,
  which leaves enclosures fewer places to go; levels are kept as chosen.
- **The instrument.** Presets have no link with the instrument or "my instrument". Choosing a
  preset never changes the instrument; changing the instrument never makes Custom, and keeps the
  written key, so it never leaves a restriction.

## B9. The generation request, the replay key and kept sessions

- **The generation request carries the settings, never a preset's name.** The name only ever
  served to look up whether chromatic figures were allowed, which the levels now say directly;
  carrying it would let a rename change nothing but a label buried in every phrase. The request
  holds the ten controls, the seven levels, the key, the mode and everything else it held before.
- **The restriction is recorded nowhere**: not in the request, the replay key or a kept session.
  No phrase depends on it, only on the key and mode, which every phrase's inputs already hold. It
  does influence which key and mode moves Vary settings drew, but a kept session keeps every phrase
  with its own inputs and its timeline, and nothing in v3.1 replays a whole session's chain of
  moves.
- **A new replay key version, `ifk3.`** The phrase replay key is the text that reproduces one
  phrase from its inputs. v3.0 introduces `ifk2.`, which carries "my instrument" inline (Part A
  §7.4). v3.1 writes `ifk3.` for every phrase: everything `ifk2.` carries, except the musical
  profile's name and its customized flag, plus the seven levels stored **by figure**, not by
  preset name (a player preset can be renamed, changed or deleted, and a built-in may be retuned
  later). A new version rather than an extension of `ifk2.`, so that a v3.0 app meeting a v3.1 key
  refuses it instead of replaying a different phrase without saying so.
- **Older keys keep decoding.** An `ifk1.` or `ifk2.` key's profile name maps to that profile's
  levels in B5.3 (Neutral or Jazz), whatever its customized flag, since being customized never
  changed the figures before v3.1. Every `ifk1.` and `ifk2.` key decodes to the same phrase as in
  the version that wrote it.
- **A key from a later version** naming a figure v3.1 does not know is refused, with the reason,
  rather than replayed without it; a later prefix is refused as an unsupported version, as today.
- **The replay tool** (`npm run replay:phrase`) decodes all three versions.
- **Kept sessions.** Each kept phrase's reproduction inputs (Part A §5.2) hold the seven levels in
  place of the profile. The session's record holds **the preset label**: the selection's name at
  the session's start, or "Custom, based on …", shown in the session list where Part A §5.4 shows
  the profile. It is a snapshot: renaming or deleting the preset later does not change it.
- **Sessions kept by v3.0** are migrated when the database opens: their phrases' profile names map
  to the levels of B5.3, and their label is the musical profile they recorded, in the same form
  (Neutral, Jazz, or Custom based on one of them). Their generated timelines are kept as they are.

## B10. For the interface design

What the interface must support, and the owner's directions, for `ux-writer`. Layout and wording
are `ux-writer`'s.

- **The owner's direction: the preset selector becomes a combo box placed higher in the
  controls.** Choosing a starting point comes before fine-tuning. It lists the eight built-in
  presets and the player's own; order and grouping (built-ins apart from player presets, practice
  purposes apart from styles) are `ux-writer`'s, with one requirement: built-in and player presets
  are told apart.
- **The owner's direction: while a restriction is in force, the key and mode controls highlight
  the values it allows**, and never by colour alone. Every key and mode stays selectable; no
  option is disabled.
- **The selection's display** names Custom's base ("Custom, based on Bebop") and replaces the
  "grammar retained" status line.
- **Seven figure level controls**, four levels each, with plain descriptions of each figure; a
  figure's description should say what rhythm it needs (an enclosure needs three back-to-back
  notes, so it stays rare with quarter notes only). "As today" is a working name: after v3.1 it
  means "tried only when the chord tones fail".
- **Preset descriptions**: why Pop song and Bebop show Major rather than Ionian; suggestions such
  as "also try Ionian" for Reel.
- **Saving**: save as new (asking the name and the restriction choice, "as now" by default), save
  changes into a player preset, rename, and delete with a confirmation; the reasons for a refused
  name or a reached limit; the notice when a save is refused by the browser.
- **Visits that save nothing** (outdated tab, failed read): presets made there last for the page,
  under that visit's existing notice; no preset deletion is offered there.
- **"Your data"** lists the player presets and their number.

## B11. What v3.1 changes in v3.0 and in v2's guarantees

Each change is intended. Where a declared-intent entry is named, `documentalist` prepares the
change.

**Contract guarantees that change** (they need the owner's explicit confirmation and a major
contract version; approving this spec is not that confirmation):

- "A musical-profile mutation flips Neutral and Jazz, keeping every controlled value"
  (`rule_mutation_profile_flip_keeps_controls`): **removed**, replaced by the figure step (B8.1).
- "Mutating a profile-controlled value marks the profile customized; a mutation of any other
  setting leaves the mark as it was" (`rule_mutation_marks_profile_customized`): the controlled
  settings grow from seven to the ten controls and the seven levels, so mutating Tension,
  Leapiness or Arpeggio chaos now marks Custom.
- "What one grade means for each mutable setting" (`rule_mutation_setting_scales`): gains the
  figure-level scale (Off, As today, Favored, Strongly favored, no wrap). The musical profile, which
  the mutation's scale table (`module_settings_mutation`) lists as an unordered two-value setting,
  leaves it.
- "Mutated settings return to the player's choice at session end"
  (`rule_mutation_reverts_at_session_end`): its "musical profile's customized marking" becomes the
  selection's Custom marking, the figure levels included. Wording only.

**Other v2 rules and entries that change:**

- **Vary settings' redraw** (`rule_mutation_rerolls_unsupported_combination`,
  `rule_mutation_draws_setting_then_direction`, `module_settings_mutation`): a key or mode move
  outside the restriction in force is drawn again; the figure step draws setting, figure, then
  direction.
- **The Custom state's retained grammar** (`rule_profile_control_customization`,
  `module_profile_control_customization`): no hidden grammar remains; Custom names its base, and
  only choosing a preset leaves it.
- **Choosing a preset** (`rule_selectable_generative_profiles`,
  `rule_profile_presets_apply_defined_controls`, `module_generative_profile_selection`): sets ten
  controls and seven levels instead of seven controls, and may move the key and mode inside its
  restriction. Neutral and Jazz gain Tension Lift, Leapiness Shaped and Arpeggio chaos Varied.
- **"Neutral is entirely diatonic"** (`rule_neutral_profile_diatonic_pitches`; the project policy
  in [pitch-planner-validation.md](../../../docs/music/pitch-planner-validation.md#authority-and-ownership)):
  becomes a property of Neutral's levels, not a rule; a player may turn chromatic figures on from
  Neutral or any preset. Neutral's harmony stays diatonic (`rule_neutral_profile_diatonic_harmony`
  is unchanged): in every preset the chords use only notes of the key.
- **Jazz's chromatic figures** (`rule_jazz_chromatic_resolution`,
  `module_musical_profile_capabilities`): gated by the chromatic approach's and chromatic
  enclosure's levels instead of a capability declared by the Jazz profile; the figures' own rules
  are unchanged. The principle that no planner or validator compares a profile's name holds more
  strongly: nothing reads a preset's name.
- **The pitch search's order** (`mechanic_pitch_search_policy` keeps its allowances; the candidate
  ordering that puts chord tones first): at drawn notes, a favored figure is tried before the chord
  tones.
- **Reproduction** (`rule_seeded_phrase_reproduction`, `module_phrase_replay_key`,
  `module_generation_worker_protocol`, `module_generation_request_construction`): the complete
  request holds the figure levels instead of the profile; the key gains `ifk3.`.
- **The lexicon:** the entries for embellishment, built-in preset (which says a preset never
  changes the scale or mode), player preset, musical profile preset, grammar, appoggiatura
  ("both presets use it" is true of the rules, not the output), enclosure, chromatic approach,
  chromatic and diatonic ("Neutral melodies are entirely diatonic"), Collection (a preset may now
  change it) and Vary settings.

**Part A (v3.0) text this part extends:**

- §4.2: the saved settings gain the seven figure levels, and "the musical profile selection" is
  the preset selection; player presets are saved (B7).
- §4.1 and Delete everything: "Your data" lists player presets; Delete everything removes them.
- §4.5 and done item 13: saving a player preset joins the triggers of the persistent-storage
  request.
- §5.2 and §5.4: a kept phrase's inputs hold the levels instead of the profile; the session's
  "musical profile" and the session list's "profile" become the preset label.
- §7.4 and done item 19: v3.1 writes `ifk3.`; `ifk1.` and `ifk2.` keep decoding.
- §8 and done item 20: "the profile" among the changes that discard pre-generated phrases becomes
  a preset choice, a figure level or the restriction in force (B8.3).
- v3.0's declared-intent entries for these (`rule_settings_saved_on_change`,
  `rule_persistent_storage_requested`, `rule_delete_everything`, `req_your_data`,
  `rule_kept_session_content`, `req_kept_session_list`, `rule_pregeneration_discarded_on_change`)
  follow.

**Tests that change with them:** the profile-flip mutation tests, the profile selection tests
that expect seven controls and an untouched Tension, the "Custom (Jazz grammar)" and "grammar
retained" copy, the replay key encoding tests (encoding becomes `ifk3.`; `ifk1.` and `ifk2.`
decoding tests stay), and the worker's check that refuses any extra field in the profile
selection.

## B12. Existing code and risks

From reading the code on 2026-10-07 and 2026-10-08 (line references in the drafts).

- **The pitch search** orders candidates with chord tones before every decorating note; decorating
  notes share one rank, ordered among themselves by the seed only. So a decoration appears only
  when the chord-tone path fails: in about 5,200 sampled phrases, free passing tones were in 1 to
  6 % of phrases, Jazz's chromatic approaches in 4 to 20 %, and the free appoggiatura in none. Two
  decorating notes in a row are rejected unless they form one written figure, which is what blocks
  the diatonic enclosure today.
- **One capability separates Neutral from Jazz** (chromatic approach and enclosure allowed), looked
  up from the profile's name. The name or the capability is read in about thirty files: the
  generation request, the pitch candidates and context, the window search, the joining fit
  (carry-in), the result validator and its figure rules, the worker's inbound check, the replay
  key, the session's intents and the controls. The validator must accept exactly what the levels
  allow, the two new figures included.
- **The Tension control** schedules its one figure in the chord planner; each candidate placement
  runs a whole pitch search of its own.
- **The selection** is a name plus a customized flag. Choosing Neutral or Jazz overwrites seven
  controls; any edit of those seven sets the flag; every other control edit goes through one
  routing point, which is where opting out by key or mode is detected. At Idle no control change
  regenerates the phrase; only the instrument switch does.
- **The controls** are segmented controls; an option can be disabled but not highlighted while
  staying selectable, so the highlight is new (a small addition plus its design).
- **Vary settings** draws a setting then a direction from a seeded source, redraws a draw that
  lands on an unsupported combination, and refuses after a fixed bound of redraws. The restriction
  reuses that redraw.
- **Nothing is saved yet**: v3.0's storage, settings record, tolerant loading and `ifk2.` are
  specified and being built. v3.1 depends on them.

**At risk:**

- **Generation cost** (B5.6): Off levels and the two new figures can slow searches or create
  failures; the allowance is not raised, and the guard is measured before the gate.
- **Reproducibility**: Neutral and Jazz must generate exactly what v3.0 does; any extra draw or a
  reordered tie in an As today or Off phrase breaks every existing replay key and golden fixture.
- **The redraw bound**: a one-mode restriction makes more key and mode draws land outside; the
  fixed bound must stay comfortably above what a restriction adds, so a valid move is never
  refused.
- **The first-load bundle budget** (Part A §4.3 records little headroom): the combo box, seven level
  controls, the built-in table and preset management add code; `coding-leader` measures it and may
  load preset management on demand.
- **Migration**: v3.0's saved settings and kept sessions must migrate on first open by v3.1.
- **Contract**: four STABLE guarantees change (B11), which needs the owner's confirmation before
  the gate.

## B13. Architectural decisions and their reasons

- **Levels order the search, never set quotas**, because a quota can make a phrase impossible or
  slow to find, and the pitch search is the generator's most expensive step.
- **One level per figure, four steps**, because "allowed" and "how much" fold into one control,
  and seven controls is already a lot for a beginner; per-direction levels are cheap to add later.
- **Off and As today consume no draw; new figures default to Off**, because Neutral and Jazz must
  reproduce v3.0 note for note, and every existing replay key with them.
- **Integer-only seeded draws**, because floating-point functions can differ between browsers and
  a phrase must be the same everywhere.
- **Levels govern free figures only**, because Tension's scheduled figure has its own meaning and
  every Tension value must stay possible whatever the levels.
- **Figures written as ordinary notes first, ornaments later**, because a figure changes one place
  (the pitch search) while an ornament touches six (the note event, notation, playback in the
  backing and the preview, both exports, and a new acknowledgement rule), and it is the levels, not
  ornaments, that make figures audible.
- **Every preset holds all ten controls, all seven levels and a restriction**, because a preset
  must sound the same whatever was selected before, and "Custom" and "save" must mean one thing.
- **The request and the key carry the settings, not a preset's name**, because a preset can be
  renamed, changed, deleted or retuned, and a phrase must reproduce from what it was made with.
- **A new key version rather than an extended one**, because an older app should refuse a key it
  cannot honor rather than replay a different phrase silently.
- **The restriction is two independent halves**, because each control can then highlight its own
  list, whatever the other shows.
- **Keep the key when allowed, else the first listed value**, because the key is usually the
  player's (their instrument, their piece), and the first listed value is predictable and chosen by
  the preset's author.
- **The restriction guides and never blocks; leaving it is opting out**, because the player stays
  in charge of key and mode, exactly as changing any preset-held setting leaves the preset.
- **The restriction in force is worked out, never stored, and recorded nowhere**, because no
  phrase depends on it, only on the key and mode it led to.
- **Vary settings stays inside the restriction**, because the app must never opt the player out of
  their preset by itself.
- **The figure step takes the profile's one place in the draw**, because every other setting
  should drift as often as before.
- **Values win on load, and loading never moves the key or mode**, because the player's sound must
  never change behind their back.
- **Player presets by internal identifier, built-ins by fixed identifier**, because names can
  change.

## B14. Definition of done

v3.1 ships when every item holds, each verified by a named test or a recorded hand check.

1. **Seven figure levels** exist, each Off, As today, Favored or Strongly favored; they are set at
   Idle, locked during a session, saved and restored after a reload, and held by every preset.
2. **Neutral and Jazz reproduce v3.0.** With their B5.3 levels, the generator produces, for the
   same request and seed, exactly the phrase v3.0 produces, on a fixed sweep of seeds and settings
   in every mode.
3. **Levels are audible and ordered.** On a fixed seed sweep, the share of phrases containing a
   figure never decreases from Off to As today to Favored to Strongly favored, and rises wherever
   its rhythm needs are met; at Off the figure appears only as Tension's scheduled figure. The
   final Favored and Strongly favored shares are recorded.
4. **No quota.** No phrase is rejected or retried for lacking a favored figure.
5. **The new figures.** The free appoggiatura and the diatonic enclosure appear when favored, and
   every generated figure keeps the figure rules (one resolution, onto a chord tone, no figure
   across a chord change); the result validator accepts exactly the figures the levels allow, and
   refuses a chromatic note when both chromatic figures are Off.
6. **Tension's figure.** Every Tension value still places its scheduled figure with every figure
   level Off.
7. **Deterministic.** The same `ifk3.` key gives the same phrase in Chrome and Edge, on any machine;
   pre-generated phrases equal the session's with any levels.
8. **The cost guard** of B5.6 is measured on the three settings, recorded, and met; whether the
   passing-and-neighbor rule is needed is decided from it and recorded, and if adopted it holds in
   the controls, Vary settings and loading.
9. **Eight built-in presets** have exactly B6.5's values and restrictions; each is a supported
   rhythm setting at Sixteenth and stepped down to Eighth, and generates on the cost guard's sweep
   in every mode its restriction allows.
10. **Choosing a preset** sets all ten controls and seven levels, from any state; moves the key and
    mode by B6.3's rule, and only then; never changes the tempo, the instrument or the session
    options; leaves the phrase on screen; and Neutral and Jazz never move the key or mode.
11. **Custom** appears on any change of a preset-held setting and on a key or mode chosen outside
    the restriction in force, without comparing values, and names its base; tempo and instrument
    changes, and keys and modes chosen inside the restriction, never cause it; only choosing a
    preset leaves it.
12. **The highlight** marks the restriction in force on the key and mode controls, not by colour
    alone; nothing is marked with "any" or none in force; every key and mode stays selectable.
13. **Vary settings** moves one figure one level as one place in the draw, marks Custom for the
    session and restores every level and the selection at its end; never moves the key or mode
    outside the restriction in force at the session's start; with no restriction in force, draws
    no move again for a restriction's sake; never switches preset. Tension across phrases never
    marks Custom.
14. **Player presets:** save as new from any state, with the three restriction choices and "as
    now" by default; save changes only into a player preset; built-ins never change; rename and
    delete (after a confirmation) player presets only; names of 1 to 40 trimmed characters, unique
    ignoring case with the built-ins, "Custom" reserved, and the 50-preset limit, each refused with
    a reason; none of this during a session; the saved or overwritten preset becomes the
    selection; deleting the selected or base preset leaves Custom with no base and the same values.
15. **Persistence:** player presets, their restrictions, the figure levels and the selection survive
    a reload; renaming keeps the selection; the values win over a changed or missing preset, and
    loading never moves the key or mode; tolerant loading per preset and per field as B7 lists;
    v3.0's saved settings migrate as B7 says.
16. **Visits that save nothing and deletion:** an outdated tab and a failed-read visit write no
    preset and offer no preset deletion, and presets made there last for the page; a refused save
    keeps the preset for the visit and tells the player; Delete everything removes every player
    preset, unreadable records included; "Your data" lists them with their number.
17. **Persistent storage** is requested once per visit, on the first pin, favorite, saved instrument
    or saved player preset, unless already granted.
18. **Pre-generation:** choosing a preset that changes a value, the key or the mode, changing a
    figure level, and any change of the restriction in force discard the pre-generated phrases;
    saving, renaming and deleting that change neither a setting nor the restriction, and choosing an
    identical preset, do not.
19. **Replay keys:** v3.1 writes `ifk3.` for every phrase, holding the levels by figure and no
    preset name, customized flag or restriction; every `ifk1.` and `ifk2.` key decodes to the same
    phrase as in the version that wrote it; a key naming an unknown figure is refused with the
    reason; the replay tool decodes all three versions.
20. **Kept sessions:** each kept phrase's inputs hold the levels; the session shows the preset label
    it started with, unchanged by a later rename or deletion; sessions kept by v3.0 migrate (levels
    from their profile, their label as recorded) with their timelines untouched.
21. **Acknowledgement and exports unchanged** for every figure: a decorating note lights for its
    exact pitch inside its window; no export carries a preset, and no preset leaves the device.
22. **v3.0 and v2 behaviour otherwise unchanged:** their test suites pass, apart from the tests B11
    lists as changing, each replaced by its v3.1 counterpart.
23. **The declared-intent contract** reflects B11's four guarantee changes, with the owner's
    explicit confirmation recorded.

## B15. Deferred and open

- **Measured before the gate, not open questions:** the Favored and Strongly favored shares,
  starting at about 1 in 4 and 1 in 2 (B5.2); the cost guard's figures, and from them whether the
  passing-and-neighbor rule ships (B5.6).
- **Needs the owner:** approval of this Part B; then the explicit confirmation of B11's four
  contract changes, which approving the spec is not.
- **For `documentalist`:** the declared-intent changes of B11, and the lexicon entries it lists.
- **Design, for `ux-writer`:** B10.
- **Deferred to later versions:**
  - ornaments (grace notes, mordents, trills, turns, jazz articulations), in a release of their own
    after v3.2, starting with the grace note;
  - more figures, and levels per direction (B5.1);
  - richer presets: gimmicks, preferred rhythm patterns, restrictions on range and notes, and the
    endgame's characters, locations and events with their instrument preference and tone;
  - built-in Blues, Bossa and Baroque, once the generator has what they need (B6.5);
  - restrictions a player builds freely, lists of key-and-mode pairs, and key restrictions on
    built-ins;
  - exporting or sharing a preset (Part A keeps sharing permanently out; a short text code to copy
    would be a later candidate only if that exclusion is read as server-side sharing alone); saving
    "this phrase's settings" from the review; hiding built-ins;
  - for v3.2: whether presets hold Jam's settings, how the key and mode suggestion treats the
    restriction in force (confirming a suggestion outside it is opting out, like any key choice),
    and whether figures found in the player's playing are favored.

## B16. Access model

Unchanged from Part A §15: exactly one local user, with no accounts, roles, permissions or
sharing. Whoever has the page open can do everything the app offers, built-in and player presets
alike. Player presets join the data kept for "whoever uses this browser profile on this device";
Delete everything removes them. No preset leaves the device.
