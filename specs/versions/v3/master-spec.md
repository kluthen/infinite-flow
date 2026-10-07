# Infinite Flow v3 — Master Spec: v3.0, Storage

Status: master spec v1.2 (2026-10-07). Change in v1.1: the player's Disconnect also forgets the
remembered controller (§7.3). Change in v1.2: behaviours the v3.0 design settled, written in:
when settings are read and saved, what Delete everything leaves, which sessions a save deletes,
favorites and unpinning, the played-notes switch on the session that just ended, my instrument's
written range, and how the remembered controller is reattached (§4, §5, §6, §7, §13, §14).
Change in v1.3, from the build plan's review: how a transposition is spelled (§7.1); which
changes discard pre-generated phrases, and what "the same phrases" means when an attempt would
have failed (§8, item 20); persistent storage is asked for once per visit (§4.5, item 13); an
outdated tab offers no Delete everything (§4.3, item 14). Consolidated from the approved v3.0 drafts for handoff to
`documentalist`, `ux-writer` and, after a build plan, `coding-leader`. It covers **v3.0 only**.
v3.1 (embellishment flags and presets) and v3.2 (Jam) are still being specified and will be added
as their own parts. The draft topic documents stay in `specs/versions/v3/` as working material;
where they and this document differ, this document wins.

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
  more (Delete everything included: the notice asks for a reload first), and shows a notice asking
  for a reload, outside a running session. It reads what it can: records written by the newer
  version are left unread (a kept session saved by a newer version is listed as such and does not
  open).

### 4.4 Loading saved settings

The first phrase waits for the saved settings to be read. If reading fails, or takes longer than
a short start-up wait, the app starts from the defaults and saves nothing for the rest of that
visit, so a failed read never overwrites what is kept.

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
play sound before one; the remembered controller does not change v2's audio-unlock rule. v2 forgot the choice on reload; v3.0 deliberately keeps it. The
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
   deletes the previous unpinned session and keeps every pinned one.
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
    nothing, offers no Delete everything, and shows the reload notice outside a running session.
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
