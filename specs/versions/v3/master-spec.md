# Infinite Flow v3 — Master Spec: v3.0 Storage, v3.1 Generation Choices, v3.2 Jam and v3.3 Richer Chords

Status: this file holds four parts.

- **[Part A — v3.0](#part-a--v30), storage:** master spec v1.24 (2026-10-16), approved by the
  product owner, built and released as version 3.0.0 on 2026-10-16 (spec D348); the contract for
  the running code. Its section numbers (§1 to §15) are unchanged; v1.5 and v1.6
  write in the owner's rulings after the build's first intent preflight; v1.7 is a wording fix;
  v1.8 writes in the owner's rulings after the build's second intent preflight; v1.9 adds a bass
  clef choice for my instrument, the owner's ruling during wave 2; v1.10 writes in the bound on
  my instrument's written range and the rule that kept sessions belong to their instrument, the
  owner's rulings later that day; v1.11 adds §16, asking before Start when the phrase on screen
  is stale (ISS-011), the owner's ruling of 2026-10-13; v1.12 writes in his rulings the same day
  on what Regenerate does there and on the starting note's contract wording (CONTRACT 5.0);
  v1.13 is a wording clarification (§8), no behaviour changed; v1.14 replaces the kept-session
  size estimate with the build's measurement (§5.2), no behaviour changed; v1.15 writes in the
  owner's ruling that a damaged kept session is deleted, with an apology (§5.1, item 6);
  v1.16 corrects §10: remembering the controller changes two contract wordings, a seventh
  contract change that waits for the owner's confirmation (spec D314), no behaviour changed;
  v1.17 states what follows from §4.3 and §4.4 for the remembered controller: a visit that saves
  nothing neither remembers nor forgets it (§7.3, item 18; spec D318); v1.18 records the owner's
  confirmation of that seventh contract change on 2026-10-15 (CONTRACT 6.0), no behaviour changed;
  v1.19 writes in what measurement M1 found about stray notes (§9, §14; spec D321), no behaviour
  changed; v1.20 writes in the owner's two rulings of 2026-10-15: the 38 ms threshold is kept
  (§9, §14; spec D322), and a controller reselected at load counts as the same controller coming
  back, with no transposition check (§7.3; spec D323), no behaviour changed; v1.21 states where
  favorite phrases sit in time in a favorites-only file (§6; spec D324), which §6 already
  implied; v1.22 names a second way a tab becomes outdated, another tab's Delete everything, as
  the build already does (§4.3, item 14; spec D331); v1.23 states, as the build already does, that
  the transposition check's action also selects my instrument when another instrument was
  selected, and is not offered when its transposition would make my instrument's written range
  sound outside MIDI notes 0 to 127 (§7.2; spec D335); v1.24 states, as the build already does,
  that after Use it the musical profile selection shows the player's selection from the start,
  never phrase 1's (§16; spec D339). No contract wording it needs waits for the
  owner any more (§10).
- **[Part B — v3.1](#part-b--v31), embellishment figures and presets:** master spec v1.0
  (2026-10-08), consolidated from the v3.1 drafts the owner approved; approved by the product
  owner (2026-10-08). The owner confirmed the exact wording of the contract
  guarantees it changes (B11) the same day. v1.1 (2026-10-19) checks B12's code facts against
  v3.0's released code; no behaviour changes. Its sections are numbered B1 to B16.
- **[Part C — v3.2](#part-c--v32), Jam, the key and mode suggestion and the rhythm lock:**
  master spec v1.0 (2026-10-08), consolidated from the approved v3.2 drafts; approved by the
  product owner (2026-10-08). The owner confirmed the exact wording of the contract
  guarantees it changes (C13) the same day. Its sections are numbered C1 to C18.
- **[Part D — v3.3](#part-d--v33), richer chords (seventh chords):** master spec v1.1
  (2026-10-12), consolidated from the v3.3 direction and the chord research; **awaiting the
  owner's approval**. The contract wording it changes (§D12) needs the owner's confirmation
  separately. Its sections are numbered D1 to D17.

Part A's history follows.

Part A status: master spec v1.15 (2026-10-14), approved by the product owner. Change in v1.1: the player's Disconnect also forgets the
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
Delete everything and nothing else, unless newer data is known to exist (§4.4). Change in v1.5,
the owner's rulings after the build's first intent preflight (2026-10-09): my instrument's
transposition is entered as octaves and semitones with a sign, and its interval name is derived
and shown, reversing v1.3's choice by name (the spelling table stays); my instrument has a fixed
id, `my-instrument`, apart from its display name (§7.1, §7.2, §12, item 16); a session-wide record
keeps the session's own facts, its session seed among them, and §8 says what the session seed is
(§5.2, §8, item 8); two points stay open for the owner (§14). Change in v1.6, the owner's
answers to those two points (2026-10-09): the sign is the direction of the whole transposition,
octaves included, and the transposition is entered with one control counting semitones across
octaves, its derived name shown beside it (§7.1, item 16); the session-wide record holds what §5.2 lists
and nothing that can be derived from the session seed, and any further fact a replay needs is put
to the owner when the build designs the kept-session record (§5.2); neither is open any more
(§14). Change in v1.7, a wording fix the owner approved at the v3.0 wave-1 gate (2026-10-12),
no behaviour changed: §7.1's transposition bullet still described signed counts; it now states
one direction for the whole interval and unsigned counts, as v1.6 already settled. Change in
v1.8, the owner's rulings after the v3.0 wave-2 intent preflight (2026-10-12): the written part
is spelled in the written key, and a written key with two spellings takes the one with fewer
sharps or flats, sharps on a tie, as the code already does; the transposition's interval name no
longer decides the spelling, and is still derived and shown (§7.1, §12, item 16); the staff's
shared height takes my instrument's written range into account, changing only when my instrument
is saved or deleted (§7.1); a background pre-generation attempt can be cancelled, a fourth,
minor contract change (§8, §10, item 23, §14); §7.1's transposition values say "direction"
where they said "the sign", with the same meaning. Change in v1.9, the owner's ruling during the
v3.0 wave 2 (2026-10-12): my instrument is written in treble or bass clef, the player's choice,
the built-in profiles staying in treble clef; the clef is display only, travels with my
instrument's phrases into the review and the MusicXML export, and is not in the replay key; the
staff's shared height reads my instrument's written range in its own clef; octave signs wait for
a later version (§2, §3, §5.2, §7.1, §7.4, §8, §11, §12, item 16, §14). The bound on my
instrument's written range is now proposed per clef and still awaits the owner (§14). Change in
v1.10, the owner's rulings later the same day (2026-10-12): my instrument's written range must lie
within written C2 to C7 in treble clef and E0 to E5 in bass clef, refused live otherwise, a clef
change checking it again (§7.1, item 16, §14); every kept session belongs to the instrument it
was played with, so deleting my instrument deletes its kept sessions, and saving a change to its
range or transposition first warns that it erases them, then erases them; a change of name or
clef keeps them, each phrase still drawn in the clef it was played in; a save that changes the
staff's shared height checks phrases pre-generated at Idle again, and a review makes room for a
session that needs more height than the shared one (§2, §4.1, §4.3, §4.4, §5.1, §5.4, §6, §7.1,
§7.2, §8, §10, §12, items 6, 14, 16, 17 and 23, §14). The review of the last session can now end
before the next session starts, when the player deletes its session: that contract wording waits
for the owner (§10). Change in v1.11, the owner's ruling of 2026-10-13 on ISS-011 (spec D297): when
Start is pressed, or the starting note played, and the phrase on screen was made under settings
that differ from the current ones in what the generation reads, the app says so and asks:
Regenerate or Use it. Use it plays that phrase as phrase 1 and joins phrase 2 to it as after a
settings change during a session; Regenerate is proposed to return to Idle with the new phrase
([O182](../../open-questions.md#v30-wave-2-o180)); pre-generation builds the phrases Use it plays.
The starting note asking first changes a contract wording, proposed for the owner (§2, §10,
§11, §12, item 23, new item 24, §14, new §16). v1.11 also records that the owner confirmed the
review's reachability wording as a major change on 2026-10-12 (CONTRACT 4.0; §10, §14). Change
in v1.12, the owner's rulings later on 2026-10-13 (spec D297, ruling note): Regenerate runs the
usual Idle Regenerate and the app stays at Idle with the new phrase, the player pressing Start
again (closes O182); the starting note's contract wording is accepted as proposed, a major
change (CONTRACT 4.0 to 5.0) (§10, item 23, item 24, §14, §16). Change in v1.13, a wording
clarification at the v3.0 wave-2 intent sync, no behaviour changed (spec D298): "Pre-generation
runs after v2's prewarm" means its requests are posted after the prewarm, to the same worker,
which serves them between the prewarm's slices; it does not wait for the prewarm to finish (§8).
Change in v1.14, at the v3.0 wave-3 gate, no behaviour changed (spec D299): the kept-session size
is the build's measurement, about 4.1 MB for a 30-minute session at 240 BPM in Jazz with
`Sixteenth` density plus about 1.5 MB of played notes when kept, instead of the earlier estimate
of 0.8 to 3.4 MB (§5.2). Change in v1.15, the owner's ruling at the v3.0 wave-5 sync (spec D310,
closes O200): a kept session the app cannot read correctly, its records damaged, is deleted,
pinned or not, wherever the app finds it (at load, at the next save, when opened), and the app
apologises; a read the device fails or refuses deletes nothing, nor does a visit that saves
nothing (§5.1, item 6). v1.15 also aligns §4.4 with §5.1 (spec D304): the session a visit whose
read failed holds in memory keeps its review until the next session ends with a review. The
owner's ruling on O201 (spec D309) keeps §5.1 as written: a session cut short by closing or
reloading the page is never saved.
Consolidated from the approved v3.0 drafts for handoff to
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
  of kept sessions, the review of any kept session, an optional comment per session; each kept
  session belongs to the instrument it was played with (§5).
- Played notes kept only after the player opts in, and deletable (§5).
- Favorites: marking whole phrases, and exporting favorites only (§6).
- "My instrument": a player-described instrument, saved, written in treble or bass clef, fed by
  the controller transposition check; the last controller remembered (§7).
- Pre-generating up to four phrases at Idle (§8).
- Filtering stray notes out of the review and the played-notes export (§9).
- Asking before Start when the phrase on screen is stale, Regenerate or Use it (§16).

### Out of v3.0

- **v3.1, specified later:** embellishment flags (which decorating figures the generator may use,
  with weights as preferences) and presets (more built-in ones, and presets the player makes).
- **v3.2, specified later:** Jam, where the player plays a short motif and the generator develops
  it; the key and mode suggestion; the rhythm lock and its mutations.
- **Later candidates, not committed:** a full backup file of everything the app keeps, to move it
  to another browser; learning the player's taste from how they play, and recognising signals the
  player plays on purpose; marking a range of measures as a favorite.
- **Moved to v4:** rhythm ratios and the rhythm editor.
- **Later, should the need arise:** octave signs (8va, 8vb, 15ma) and octave clefs for my
  instrument ([O180](../../open-questions.md#v30-wave-2-o180)).
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
| **P1.G2 — Real-time reading and dexterity.** | Partly | "My instrument" makes the written part match the instrument actually played, including one v2 doesn't ship, in the clef its player reads: treble or bass. |
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
  deletion is specified with it. Deleting my instrument, or saving a change to its range or
  transposition, also deletes the kept sessions played with it, after a warning (§5.1, §7.1).

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
  played notes, including the offer that turning "Keep my played notes" off makes; and, while my
  instrument has kept sessions, deleting my instrument or saving a change to its range or
  transposition, since either deletes them (§7.1): the notice asks for a reload first), and shows
  a notice asking
  for a reload, outside a running session. It reads what it can: records written by the newer
  version are left unread (a kept session saved by a newer version is listed as such and does not
  open).
- **Delete everything in another tab outdates this one too.** Once the player runs Delete
  everything in one tab, every other open tab of the app is an outdated tab in every respect
  above: it keeps working in memory, saves and deletes nothing more, offers no deletion, and shows
  the reload notice outside a running session; the kept sessions it still lists no longer open.
  In v3.0 that notice uses the newer version's wording, since the app cannot yet tell the two
  causes apart; reloading cures both.

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
saved. Such a visit has read no kept session and no saved my instrument, so changing or deleting
a my instrument made during it erases nothing: the session it holds in memory stays the most
recent session, its review reachable, until the next session ends with a review (each phrase
carries its instrument, §5.2).

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
  deletes it, or deletes or changes the instrument it was played with (below). Only one session
  is ever kept without the player asking.
- **A damaged kept session is deleted, with an apology.** A kept session whose records the app
  cannot read correctly (damaged or incomplete, so it can be neither opened nor exported) is
  deleted, pinned or not, with its favorites, comment and played notes, as soon as the app finds
  it: when the saved data loads, when the next session is saved, or when the player opens it.
  The app then apologises, outside a running session. Only damage counts: a read the device
  fails or refuses deletes nothing, a session saved by a newer version is never deleted (§4.3),
  and a visit that saves nothing (an outdated tab, a visit started from the defaults, §4.4)
  deletes nothing.
- **Marking a favorite pins its session**, so a favorite is never lost by starting a new session.
  Unpinning a session that holds favorites asks for confirmation first, since the session and its
  favorites will then be deleted when the next session is saved.
- **No limit on the number of pinned sessions.** "Your data" shows the space they use. When the
  browser refuses a save because storage is full, nothing is deleted automatically to make room;
  the app tells the player after the session.
- **A kept session belongs to the instrument it was played with**, named by its id in the
  session's own record (§5.2). This is every kept session, the most recent one and the pinned
  ones alike. It matters only for my instrument, the one instrument the player can change or
  delete; the built-in profiles never change, so their sessions are never touched:
  - **deleting my instrument deletes every kept session played with it**, with their favorites,
    comments and played notes. The confirmation says so first, and how many sessions go;
  - **saving a change to my instrument's written range or transposition erases every kept
    session played with it**, the same way. Before saving, the app warns that the change will
    erase all the kept sessions of my instrument, and how many; the player confirms or cancels.
    This holds wherever the change is made: in my instrument's sheet, or through the
    transposition check's "use this for my instrument" (§7.2). While my instrument has no kept
    session, nothing is erased and no warning is shown;
  - **a change of my instrument's name or clef keeps its sessions**, with no warning: such a
    change alters nothing generated (§7.1);
  - **a session on screen goes too:** when the review on screen shows one of them, it closes
    exactly as when the player deletes that session (§5.4). The session that just ended, when
    played with my instrument, also leaves memory, and "Review last session" goes with it. The
    next session saved is kept as the most recent one, as always.

  So every kept session of my instrument was played with the range and transposition my
  instrument has now; only the name and the clef can differ. Its review still draws each phrase
  in the clef it was played in (§7.1), and the session list names the instrument as the session
  recorded it.

### 5.2 What a kept session holds

Only what the review and the exports read, plus what identifies the session and the session's
own facts:

- **For each phrase:** the generated timeline, the chord symbols, and the reproduction inputs (the
  seed, the controls, the profile, the instrument with my instrument's clef (§7.1), the join from
  the previous phrase), the tempo,
  and whether the phrase was a repeat. Measured at the build: a 30-minute session at 240 BPM in
  Jazz with `Sixteenth` density, the largest case, keeps about 4.1 MB for its session-wide record
  and its phrases; its played notes, when kept, add about 1.5 MB at one played note per shown
  note.
- **Not kept:** the generator's internal working records (rhythm and tension provenance,
  diagnostics: 20 to 186 KB per phrase that nothing downstream reads), and which expected notes
  were acknowledged. Keeping acknowledgements would make it possible to count hits, which the
  permanent "no grading or scoring" rule forbids.
- **For the session, one session-wide record** of the session's own facts: start date and time,
  length, number of phrases, musical profile, instrument (by its id, §7.1), starting tempo and
  the tempo reached, whether it is pinned, its comment (§5.5), the app version that recorded it,
  and its **session seed** (§8), the one seed every later phrase's seed derives from. The
  session holds this record from Start; keeping the session keeps it. It holds nothing that can
  be derived again from the session seed: not the later phrases' seeds, the failure-ladder rungs'
  seeds or the Vary settings mutation seed (each phrase's own seed is kept with that phrase, as
  above). If replaying a kept session turns out to need a further fact, the build names it when
  it designs the kept-session record, and the owner decides; until then the record holds only
  these facts.
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
  session, in "Your data". The sessions of my instrument also go when my instrument is deleted or
  its range or transposition changes, after the warning (§5.1).
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
  come in session order, each keeping its session phrase number. They follow each other from time
  zero, as a whole session's phrases do, with no gap where a phrase was left out. A played note
  held past the end of a favorite phrase stops at that end when the next phrase is not exported.
- **Starting a new session never asks for confirmation.** Favorites live in a pinned session, so
  nothing is lost; there is no "unexported favorites" warning. A favorite goes only with its
  session: when the player deletes it, or deletes my instrument it was played with or changes
  that instrument's range or transposition, each after a warning (§5.1).
- With no favorite in the session, the favorites-only scope is unavailable, and says why.

## 7. My instrument

### 7.1 What it is

- **One saved instrument, made from a template.** The player starts from one of the three built-in
  profiles (C MIDI keyboard, B-flat tenor saxophone, E-flat alto saxophone) and may change:
  - its **display name**, at any time (see its id below);
  - its **clef**, treble or bass (see its clef below);
  - its **range**, lowest and highest note, in written pitch: the written range is what the player
    sets and keeps, and the concert range follows from it and the transposition, so changing the
    transposition (by hand or through §7.2) keeps the written range. The range must lie within a
    bound set by its clef (below);
  - its **transposition**, the interval between written and sounding pitch: one **direction** for
    the whole interval (lower when a written note sounds lower, the same, or higher when it sounds
    higher) and two counts with no sign of their own, a number of octaves and a number of
    semitones. It is entered with **one control counting semitones across octaves**
    ("14 lower" is 1 octave and 2 semitones lower), not with separate octave and semitone inputs.
    It is never chosen by interval name: the name is **derived** from the count and shown beside
    the control as the result, and it already carries the octaves (a semitone is the smallest
    step between two notes; an octave is 12 of them).
- **The transposition's values.** A number of octaves from 0 up, and a number of semitones from
  0 to 11 within the octaves, and one direction (lower, the same or higher). Its size is 12 semitones per octave
  plus the semitones: the tenor saxophone's is 1 octave and 2 semitones lower, 14 semitones in
  all; "Same" is 0 and 0. The octaves have no bound of their own: the only bound is that both ends
  of the range still sound inside the MIDI note range (notes 0 to 127), as the design's stepper
  already has it. The direction belongs to the whole transposition, octaves included, not to
  the semitones alone: a semitone count of 0 has no direction of its own, so it could not say
  which way a whole-octave transposition goes (an instrument sounding one octave lower is 1 octave and 0
  semitones, lower).
- **The interval name.** Each semitone count maps to one interval name by a fixed table; that
  name is what the player is shown beside the control. Each name also has a number of letter-name
  steps (how many letters, C, D, E and so on, a note moves when it is moved by that interval):

  | Semitones | Interval name | Letter-name steps |
  | --- | --- | --- |
  | 0 | unison (with octaves: one or more octaves) | 0 |
  | 1 | minor second | 1 |
  | 2 | major second | 1 |
  | 3 | minor third | 2 |
  | 4 | major third | 2 |
  | 5 | perfect fourth | 3 |
  | 6 | augmented fourth | 3 |
  | 7 | perfect fifth | 4 |
  | 8 | minor sixth | 5 |
  | 9 | major sixth | 5 |
  | 10 | minor seventh | 6 |
  | 11 | major seventh | 6 |

  Each octave adds 12 semitones and 7 letter-name steps: a major ninth, as for the tenor
  saxophone, is a major second plus an octave, 14 semitones and 8 steps. The 6-semitone interval
  (the tritone) is always named an augmented fourth. The steps stay part of the instrument's data,
  as for the built-in profiles, and an exported MusicXML file states them, with the semitones, as
  the part's transposition, which a notation program uses to show concert pitch. They do not
  decide how the app spells the written part.
- **How the written part is spelled.** The player chooses the key in written pitch, with the
  Written key control, for my instrument as for the built-in profiles. So the transposition never
  moves the written key; it moves the concert key the phrase is generated in. The written key is
  spelled from the chosen key and collection alone, and everything written follows it:
  - when the key can be spelled two ways (two **enharmonic** spellings: the same sounds under
    different note names), the app takes the one whose key signature has fewer sharps or flats,
    and the sharp one when both have the same number. For example, with an instrument whose
    written notes sound 6 semitones higher, a phrase in concert C major is written in F♯ major,
    not G♭ major: both need six, so sharps win;
  - written notes, and chord symbols (the root and any slash bass), are spelled in that written
    key: a note of the key's scale takes the key's own spelling (E♯ in F♯ major, not F); any other
    note is written on its own letter when it is a white key on a piano, and when it is a black
    key, as a flat if the key signature has flats and as a sharp otherwise.

  This is the rule the built-in profiles already follow, so my instrument adds no spelling rule of
  its own.
- **Its clef: treble or bass.** My instrument is written in **treble clef** or in **bass clef**,
  as the player chooses. A clef is the sign at the start of the staff that fixes which note each
  line and space stands for: the treble clef (G clef) puts the G above middle C on the second line
  from the bottom; the bass clef (F clef) puts the F below middle C on the fourth line from the
  bottom, and suits low instruments such as the bass guitar, the trombone, the cello or the
  bassoon. The three built-in profiles stay in treble clef. A new my instrument starts in treble
  clef, the clef of every template (proposed default; `ux-writer` confirms it when designing the
  clef control). The clef is **display only**:
  - it changes neither the written pitch nor the transposition: a written note is the same note
    in either clef, drawn on another line or space. It changes nothing generated; the generator
    never reads it, so it is not part of a generation request;
  - wherever a staff shows a phrase made with my instrument, the staff is in that phrase's clef:
    the staff at Idle and during a session, the review of the last session and of any kept
    session, and the MusicXML export, whose part names its clef (F on the fourth line for bass
    clef, G on the second line for treble clef). The transposition check's note is
    drawn in my instrument's clef while my instrument is selected. The staff's rules read the same
    in either clef: stems point down from the middle line up (D3 in bass clef, B4 in treble clef)
    and up below it, chord symbols sit above the staff, and the key signature takes the clef's own
    positions. The score's description names the clef;
  - a phrase keeps the clef it was made with: the clef travels with the phrase as part of its
    instrument (§5.2), so a kept session's review and export draw each phrase in the clef it was
    played in, whatever my instrument's clef is later;
  - selecting a built-in profile shows treble clef, and selecting my instrument shows its clef.
    Deleting my instrument returns to its template, in treble clef. The transposition check's
    "use this for my instrument" (§7.2) creates my instrument in treble clef, or keeps the clef of
    the one that exists;
  - changing only the clef saves my instrument like any other change: the phrase on screen stays
    and is redrawn in the new clef, as for a change of display name, since nothing it was
    generated from changed. My instrument's kept sessions stay, with no warning (§5.1), each
    phrase still in the clef it was played in. The staff's shared height is computed again
    (below), and the written range is checked again against the new clef's bound.

  Octave signs (8va, 8vb, 15ma) and octave clefs are not in v3.0: a later version may add them,
  should the need arise ([O180](../../open-questions.md#v30-wave-2-o180)). An instrument
  conventionally written an octave away from its sound, such as the guitar or the piccolo, is
  already served by a transposition of one octave.
- **A fixed id, apart from the display name.** My instrument's id is `my-instrument`, written like
  the built-in ids (`c-keyboard`). Saved settings, kept sessions and replay keys name it by that
  id, and it is never renamed. The display name is a separate property the player may change at
  any time; changing it changes nothing stored by id. What a phrase was made with travels with the
  phrase in full (§5.2, §7.4), so a later change of my instrument's name or clef changes no kept
  phrase. Deleting my instrument, or saving a change to its range or transposition, deletes its
  kept sessions instead, after a warning (§5.1).
- **What each change does to the sessions played with it.** My instrument's sheet can change four
  things; the template is chosen only when creating it.

  | Change saved | Phrase on screen, my instrument selected | Pre-generated phrases, my instrument selected | Its kept sessions |
  | --- | --- | --- | --- |
  | Written range | replaced, as on an instrument switch | discarded (§8) | erased, after a warning |
  | Transposition | replaced, as on an instrument switch | discarded (§8) | erased, after a warning |
  | Clef | kept, redrawn in the new clef | kept, checked again if the shared height changes (§8) | kept, no warning |
  | Display name | kept | kept | kept, no warning |

  A range or a transposition changes what is generated, so the sessions played before it no
  longer match the instrument; a name or a clef changes only how it is labelled or drawn. With
  another profile selected, the phrase on screen is never replaced, and a range change that
  alters the shared height has the pre-generated phrases checked again (§8).
- **The rules every profile already obeys apply:** whole-number endpoints, a span of at least two
  octaves (24 semitones), and the Low, Middle and High register windows derived by the same
  algorithm as the built-in profiles, never set by hand. A range under two octaves is refused, with
  the reason.
- **The written range lies within a bound set by the clef.** In treble clef, the range must lie
  between written C2 and written C7; in bass clef, between written E0 and written E5; both ends
  included (middle C is C4, MIDI note 60, so C2 is note 36, C7 note 96, E0 note 16 and E5 note
  76). The two bounds sit on the same lines and spaces of their own staff, from eight ledger lines
  below it to about five above it, since the bass clef's lines stand 12 letter-name steps below
  the treble clef's; they keep the staff's shared height at most 24 staff spaces (below). A range
  outside the bound for its clef is refused live in the sheet, like a range under two octaves,
  with the reason given in note names. Changing the clef checks the range again, so a range
  allowed in one clef may be refused in the other until the range or the clef changes. The
  two-octave minimum and the MIDI note range (above) still apply. At 24 staff spaces, a window
  below the tablet-landscape width needs a small viewport height of about 366 CSS px for the two
  system positions.
- **The input kind is "MIDI controller"**, the only kind in v3. It is stored so the microphone can
  be added later without changing the saved shape.
- **It is a fourth choice** in the instrument control. The three built-in profiles stay unchanged
  and selectable.
- **Deleting it** returns the instrument control to the template it was made from, and deletes
  every kept session played with it (§5.1); its confirmation says how many sessions go.
- **No Concert-display override.** Notation shows the selected instrument's written pitch, as in v2.
- **The staff makes room for my instrument's written range.** The staff's two system positions
  share one height. My instrument's written range, placed on the staff in its own clef, counts
  toward that height like a built-in profile's, whichever instrument is selected: a range whose
  notes stay within the built-in profiles' reach above and below the staff changes nothing, and
  one reaching further makes the staff taller for every choice (§14). The same written range can
  reach much further in one clef than in the other: written C2 to C4 needs 19 staff spaces in
  treble clef, and in bass clef it sits on the staff with at most two ledger lines. The height
  changes only when my instrument is saved or deleted, never from one phrase to the next.
- **Phrases made before a save that changes the shared height.** Phrases pre-generated at Idle
  are checked again against the new height, as after a change of window size (§8). A kept
  session never has a range my instrument no longer has (§5.1), but it may hold phrases in the
  clef my instrument had before a clef change, and that clef may need more height: written C2 to
  C4 needs 19 staff spaces in treble clef and 16 in bass clef. **A review never cuts a phrase:**
  when a session's phrases need more height than the shared height, its review makes room for
  them. How it does so is a design matter (proposed: the review's staff takes the larger of the
  shared height and the height its own session needs; §14).

### 7.2 The transposition check feeds it

v2's check compares what the controller sends with what the selected instrument expects and finds
a constant offset: a match, whole octaves, or a number of semitones.

- When the result is not a match, the check offers one action: **use this for my instrument**. It
  sets "my instrument"'s transposition so the written notes match what the controller plays (the
  offset in semitones becomes §7.1's octaves, semitones and direction, and its interval name
  follows from §7.1's table),
  creating "my instrument" from the selected profile if there is none yet. The player confirms it
  once; it is then saved as my instrument's transposition, and the check need not be redone in
  later visits. When another instrument was selected, the action also selects my instrument. It
  is not offered when that transposition would make a note of my instrument's written range sound
  outside the MIDI note range (notes 0 to 127, §7.1). When my instrument
  already exists and has kept sessions, that one confirmation also warns that changing its
  transposition erases them, and how many (§5.1); confirming erases them.
- **The app still applies no offset to played notes.** They are compared at the exact concert
  pitch received, as in v2. Changing the instrument's transposition is what makes the written part
  match the controller.

### 7.3 Remembering the controller

The app remembers the last controller the player chose and reselects it when the app loads, as
soon as that controller is connected, matching it the way v2 already recognises a controller that
comes back within a page. It does so only when the browser already allows MIDI access, never with
a permission prompt; otherwise the player connects as in v2. A controller reselected at load
counts as that controller coming back: it is reattached with no connection step, no pick and no
transposition check, and the player can still run the check between sessions. Going through the
connection step while a controller is remembered is the same: the step connects that controller
as soon as it is present, with no pick and no check. After a load, the starting note
starts nothing until the page's first click, tap or key press, because browsers do not let a page
play sound before one. This widens v2's audio-unlock rule, where only a Start or Connect
controller click unlocked sound and a starting note worked only after Connect controller: with a
remembered controller there is no Connect click, so any first click, tap or key press on the page
unlocks sound, and a Start click still does. v2 forgot the choice on reload; v3.0 deliberately keeps it. The
player's **Disconnect** action, which in v2 forgets the controller for the page, also forgets the
remembered one, so a reload never reconnects a controller the player chose to disconnect. A visit
that saves nothing (an outdated tab, §4.3, or a visit started from the defaults, §4.4) neither
remembers nor forgets: a controller connected there is not remembered, and its Disconnect forgets
the controller for that visit only, so the next load that reads the saved data reselects the
controller remembered before.
Deleting "my instrument" does not forget the controller; Delete everything does.

### 7.4 Phrase replay key

A player-made instrument must travel with a phrase: through the generation worker, into the
session's history and into the phrase replay key. A new key version, `ifk2.`, carries the
instrument inline when it is not a built-in profile; `ifk1.` keys keep decoding as before.
The key does **not** carry my instrument's clef: a key reproduces what was generated, and the clef
changes nothing generated (§7.1), so two phrases that differ only by their clef have the same key.
The replay tool gives the phrase's inputs and notes, not a staff, and a kept session keeps the
clef with the phrase (§5.2).

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
  tempo never affects generation. Nor does a change of my instrument's clef alone, or of its
  display name: no phrase is generated from either. A change of window size that
  changes the note density phrases are generated with, or the staff layout a session would hold,
  re-checks them: one that no longer fits is discarded with every phrase after it. A save of my
  instrument that changes the staff's shared height (§7.1) without discarding them, such as a
  change of its clef, or of its range while another profile is selected, re-checks them the same
  way.
- **The player comes first.** Pre-generation's requests go to the same generation worker as the
  player's, posted after v2's prewarm; the worker serves them between the prewarm's slices, as it
  serves the player's, so pre-generation does not wait for the prewarm to finish. Any request the player makes at Idle cancels the background attempt in progress, the way
  a dropped attempt is cancelled in a session, so the player never waits behind it. Only a
  background attempt can be cancelled this way: the player's own requests at Idle are never
  cancelled, as in v2.
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
- **The session seed.** One seed, the session seed, is drawn when a phrase 1 becomes one a
  session could start from. Every later phrase's seed, the seed of every rung of the failure
  ladder (the fallback attempts a late phrase goes through), and the Vary settings mutation seed
  derive from it; phrase 1 keeps the seed it was generated with at Idle, and the tension arc
  needs no seed, since it follows from the phrase number alone. Each phrase still carries its own
  seed, so a replay key needs nothing more. The session holds its session seed in its
  session-wide record (§5.2) from Start.
- **Never saved:** pre-generated phrases are gone on reload.

## 9. Stray notes

Some controllers send very short notes while the fingers change position: in-between notes a real
instrument would swallow. The reference breath controller sends them often, many of them at full
velocity. This is treated as a general controller matter; nothing is built for one device.

- **A very short note** is a played note whose length, from note-on to note-off, is under a fixed
  threshold.
- **The threshold is a constant, not a player setting.** It is tuned from recordings of the
  reference controller and must stay well under the shortest note the app writes at its fastest
  tempo: a sixteenth note at 240 BPM lasts 62.5 ms.
- **Measured at 38 ms; a length catches most stray notes, not all** (measurement M1, 2026-10-15).
  On the reference controller, stray notes and the notes the player meant overlap in length: the
  stray notes found last from under 5 ms to 97 ms, and the shortest note read as meant lasts
  45.8 ms, so no length separates the two. The threshold sits one step of the controller's timing
  (about 5 ms) below that note, so it never leaves out a note the player meant; in the recordings
  it leaves out 66 of the 77 stray notes found, and the other 11 still show in the lane and in the
  default export. The owner kept 38 ms (2026-10-15): a length rule never leaves out a note the
  player meant, and the lane is a record of what was played, not a score, so a few stray notes
  showing in it is accepted.
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
- **One more guarantee on the contract changes, in a minor way.** v2's generation worker
  promised that a request at Idle is never cancelled (`module_generation_worker_cancellation`).
  From v3.0, the player's own requests at Idle are still never cancelled, and a background
  pre-generation attempt can be: any request the player makes at Idle cancels it (§8). Every
  guarantee the player relied on still holds; the change only adds a background attempt that gives
  way to the player, so the owner ruled it a minor contract version, not a major one.
- **A fifth contract change, confirmed by the owner as major on 2026-10-12** (CONTRACT 4.0). The
  last-session review promised that the review "stays reachable until the next session starts"
  (`req_last_session_review`). In v3.0 the player can end it earlier by deleting its session:
  directly (§5.4, already approved), or by deleting my instrument it was played with or saving a
  change to that instrument's range or transposition (§5.1), each after a confirmation. The
  wording now adds "or until the player deletes its session". It removes cases from a listed
  guarantee, so by the contract's own rule it is a major version, and the owner ruled it so. The same review's promise that each phrase is "engraved exactly as it was
  displayed" still holds unchanged: each phrase keeps the clef it was played in, a name change
  touches no engraving, and a range or transposition change erases the session rather than
  redrawing it.
- **A sixth contract change, confirmed by the owner as major on 2026-10-13** (CONTRACT 5.0):
  **the starting note asks first when phrase 1 is stale** (§16). `rule_midi_starting_note` says: "With a controller attached at
  Idle, outside the review, playing the starting note at its exact concert pitch starts the
  count-in". From v3.0, when the phrase on screen is stale, the note opens the stale-phrase
  prompt instead, and the count-in starts only if the player chooses Use it. Accepted wording,
  added to that sentence: "When the phrase on screen is out of date (made under settings that
  differ from the current ones), the starting note first asks, as the Start button does, whether
  to make a new phrase or use this one, and the count-in starts only if the player uses it; while
  it is asking, no note starts anything." The guarantee loses a case, so by the
  contract's rule it is a major version (CONTRACT 4.0 to 5.0), and the owner ruled it so, as for
  the fifth change. The alternative that kept the wording, the starting note counting as Use it
  without asking, was not chosen: it would never tell the player at the instrument that the
  phrase is out of date.
- **A seventh contract change, confirmed by the owner as major on 2026-10-15** (CONTRACT 5.0 to
  6.0): **remembering the controller** (§7.3). v2 unlocked sound only on a Start or Connect
  controller click; v3.0 lets a starting note played after the page's first click, tap or key press
  start the sound, since a remembered controller is reselected without a Connect click, and it asks
  the browser for MIDI access at load to reselect it. The audio-unlock rule itself
  (`rule_audio_unlocked_by_player_click`) is not on the contract, but two contract entries restate
  it, so the change reaches the contract after all (v1.15 said otherwise):
  - `specification_browser_only_operation_verification` rejects a release that "starts audio or
    requests MIDI access before the player clicks Start or "Connect controller"". Accepted
    wording, in place of that clause: "starts audio before the player has either clicked Start or
    "Connect controller" or played the starting note after the page's first click, tap or key
    press, requests MIDI access before the player clicks Start or "Connect controller" other than
    the one request made at load to reselect a remembered controller, which is made only when the
    browser already allows MIDI access and so never shows a permission prompt"; its expectation
    says the same.
  - `rule_midi_starting_note` says: "With a controller attached at Idle, outside the review,
    playing the starting note at its exact concert pitch starts the count-in". Accepted wording,
    added to its rule and to that sentence: "After the page loads, the starting note starts nothing
    until the page's first click, tap or key press (a note played on the controller does not
    count), because browsers do not let a page play sound before one; this holds also for a
    controller reselected at load."; its expectation gains a line saying the same.

  Both hold for v2.0, which attaches a controller only after a Connect controller click, itself a
  click on the page, and asks for no MIDI access at load. Both lose cases (a starting note that no
  longer starts the count-in just after a load; a release the check no longer rejects), so by the
  contract's rule the change is major, and the owner confirmed it so on 2026-10-15
  (`documentalist` applied it, CONTRACT 6.0).
- **About fifteen declared-intent entries under review** say "never persisted", led by the rule
  that session state is ephemeral; the vision's "out of scope through v2" list needs a v3
  revision.
- **"Always treble clef" widens for my instrument** (not a contract guarantee): the declared
  intent says notation is always in treble clef; from v3.0 my instrument may be written in bass
  clef, the built-in profiles staying in treble (§7.1). No guarantee on the contract states the
  clef.
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

From reading the code (details: [storage-grounding.md](../../archive/v3/storage-grounding.md)).

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
- **The notation is written for treble clef only.** The written phrase's type fixes the clef as
  treble; both engravers draw a treble clef; the staff layout measures ink from the treble staff's
  lines (top line F5, middle line B4), and the stem rule reads its middle line as B4; the score's
  description says "treble clef"; the MusicXML export writes a G clef on line 2; the transposition
  check's note is drawn on a treble staff. Each of them takes my instrument's clef (§7.1). The
  generator, the worker protocol and the replay key need nothing.
- **No storage API is used in application code today**; the app's only stored data is its offline
  cache of static files, which stays as it is.
- **Start assumes phrase 1 matches the current settings** (ISS-011, found by chunk 24 and
  reproduced on v2.0.0): the session engine treats phrase 1 as generated under the settings the
  session starts with (`createSessionEngine`, `lastDecidedSettings: settings`), and chunk 24's
  pre-generation plan makes the same assumption. After a Written key, Collection or Register
  change at Idle (sometimes Harmonic motion), phrase 2's join fails its check and nothing starts,
  from 60 to 220 BPM. §16 fixes it; the adaptation it needs already exists for changes during a
  session (`lookAheadBasis`, `adaptCarryIn`).
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
- **My instrument's transposition entered in octaves and semitones, its interval name derived**,
  because a player can count semitones on their instrument or a tuner without knowing interval
  names; the derived name tells them what interval that is.
- **The written part spelled from the written key, fewer sharps or flats first**, because the
  player chooses the key in written pitch, and the built-in profiles already spell it this way, so
  one rule serves every instrument and the key signature is the easiest one to read.
- **My instrument's clef display only, kept with the instrument and out of the generation
  request**, because a clef changes how a note is drawn, never which note it is: keeping it out of
  generation and the replay key leaves reproduction untouched, and keeping it with each phrase's
  instrument lets a kept session show the part as the player read it.
- **Kept sessions belong to their instrument; a range or transposition change erases them**,
  because the owner wants the sessions of my instrument to match my instrument as it is: a
  session played with a range or transposition the instrument no longer has is gone, after a
  warning, while a name or clef change, which alters nothing generated, keeps them. It also means
  a review never shows a phrase whose range or transposition differs from its instrument's.
- **A range bound per clef, in note names**, because a written range reaching far beyond the
  staff makes the staff taller for every instrument; a bound the player can read on the staff
  (C2 to C7 in treble clef, E0 to E5 in bass clef) is easier to explain in a refusal than a bound
  on the staff's height, and keeps that height at most 24 staff spaces.
- **A fixed id for my instrument, apart from its display name**, because saved settings, kept
  sessions and replay keys must keep naming the same instrument whatever the player calls it.
- **One session-wide record for each session**, holding its session seed, because a session's
  phrases all derive from that seed and a kept session should hold what made it.
- **My instrument from a template with the existing profile rules**, because the generator already
  validates any profile given as data, and deriving register windows keeps a player's range from
  breaking phrase generation in ways the three built-ins never do.
- **The check sets the instrument's transposition rather than adding an input offset**, because
  changing the written part is enough for every case met on real hardware and keeps played notes
  compared at the exact pitch received.
- **Pre-generated phrases identical to the session's**, because a session must stay reproducible
  from its inputs whatever happened at Idle.
- **Stray notes filtered on reading**, because raw data loses nothing if the threshold changes.
- **A stale phrase 1 joined as after a change during a session**, because the carry-in rules for
  a settings change at a phrase boundary already say how a phrase joins one made under other
  settings: Use it needs no new carry-in rule, and pre-generation stays exactly the session's.

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
   A kept session the app cannot read correctly is deleted, with an apology, at load, at the next
   save or when opened, while the visit saves; a read the device refuses deletes nothing.
   Every kept session belongs to the instrument it was played with: deleting my instrument
   deletes exactly the kept sessions played with it, pinned ones and the session that just ended
   included, with their favorites, comments and played notes, and no other session; its
   confirmation says how many go.
7. **No save during a session.** No storage write happens between Start and the session's end.
8. **A kept session holds only §5.2's content**: no acknowledgements, provenance or diagnostics;
   its session-wide record holds its session seed.
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
    nothing, offers no deletion of any kind (while my instrument has kept sessions, neither
    deleting it nor saving a change to its range or transposition), and shows the reload notice
    outside a running session; so does every other open tab once one tab has run Delete
    everything. **Unreadable data.** A visit whose saved data
    could not be read, or not within the start-up wait, starts from the defaults, tells the
    player, writes nothing (no change retries a save), and offers Delete everything and no other
    deletion, none in the session list or a review included; once newer data is known, it offers
    no deletion at all.
15. **Failed save.** A refused save never interrupts or delays a session, and the player is told
    after the session.
16. **My instrument.** A range under two octaves is refused; a valid instrument generates phrases
    in its range and shows notation in its written pitch; it survives a reload; deleting it
    returns to its template. Its transposition is entered as octaves and semitones with one
    direction for the whole, through one control counting semitones across octaves (a
    whole-octave transposition keeps its direction), and its derived interval name is shown; the
    written part is spelled in the written key by §7.1's rule, as for the built-in profiles. It
    is stored and replayed by its id, `my-instrument`; changing its display name changes nothing
    stored. It is written in treble or bass clef, as the player chooses, on the staff, in the
    review of its sessions and in the MusicXML export; its clef changes no generated note and no
    replay key, and the staff's shared height reads its written range in that clef. A written
    range outside C2 to C7 in treble clef, or E0 to E5 in bass clef, is refused live with the
    reason in note names, and changing the clef checks the range again. Saving a change to its
    range or transposition, while it has kept sessions, first warns that they will be erased and
    how many; on confirmation it saves and erases them, and on cancel changes nothing; a change
    of name or clef keeps them with no warning, each phrase reviewed in the clef it was played
    in, and a review never cuts a phrase that needs more height than the shared height. A save
    that changes the shared height re-checks the pre-generated phrases. The generator's success
    rate is measured on narrow (two-octave) and extreme ranges before the gate, and recorded.
17. **The check feeds my instrument.** "Use this for my instrument" sets the transposition so the
    written notes match the controller, after one confirmation, and the result survives a reload;
    when my instrument has kept sessions, that confirmation warns that they will be erased, and
    confirming erases them. Played notes are still compared at the pitch received.
18. **The controller is remembered** and reselected at load when connected and MIDI access is
    already allowed, with no prompt; after the player's Disconnect in a visit that saves, a reload
    reselects nothing; the starting note starts nothing before the page's first click, tap or key
    press.
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
23. **The declared-intent contract** reflects §10's three major changes, its minor one, the
    fifth (the review's reachability, confirmed as major), the sixth (the starting note asking
    first, confirmed as major) and the seventh (remembering the controller, major), with the
    owner's explicit confirmation of each recorded.
24. **A stale phrase at Start.** After any change at Idle of a setting the generation reads,
    Start, and the starting note, ask Regenerate or Use it, and start nothing until answered;
    after a change of tempo, Rising tempo, Vary settings, Tension across phrases, the mix, the
    theme, my instrument's clef or name, a window crossing, or a setting changed and changed
    back, Start starts at once as before. Use it starts the session with phrase 1 unchanged, and
    for every Written key, Collection, Harmonic motion and Register change at Idle, at every tempo
    from 60 to 240 BPM, phrase 2 follows with its join adapted as after a change during a session,
    with no `CarryInError`. Regenerate regenerates the phrase and starts nothing: the app stays at
    Idle with the new phrase, and the next Start asks nothing. With a stale phrase 1, the phrases
    pre-generated at Idle are those the Use it session plays.

## 14. Deferred and open

- **Open, for the build plan:** the length of the start-up wait for saved settings (§4.4); whether "my instrument" needs a stricter
  range check than the two-octave rule and the bound per clef once the generator's success rate
  on narrow and extreme ranges is known (§7.1, item 16); any stricter rule it shows goes to the
  owner.
- **Settled by the owner (2026-10-12): the bound on my instrument's written range, per clef.**
  Measurement M3 found that in treble clef only a range of exactly two octaves, from written
  B2–B4 up to E4–E6, keeps the staff at today's 16 staff spaces; C3–C6 needs 18, C2–C4 19, C6–C8
  21, C2–C6 23 and C2–C7 24. The owner chose a bound in note names: written C2 to C7 in treble
  clef, written E0 to E5 in bass clef (§7.1), over a bound on the height itself, which is exact
  but harder to explain in the refusal. The build confirms by measurement that the bass-clef
  bound also keeps the shared height at most 24 staff spaces; if it does not, the figure goes
  back to the owner.
- **Settled by the owner (2026-10-12): kept sessions belong to their instrument** (§5.1, §7.1):
  deleting my instrument deletes its sessions; a range or transposition change erases them after
  a warning; a name or clef change keeps them; a save that changes the shared height re-checks
  the pre-generated phrases (§8); a review never cuts a phrase (§7.1). No v3.0 session data
  exists yet, so nothing needs migrating.
- **Settled by the owner (2026-10-13): the stale-phrase prompt** (§16): Regenerate stays at Idle
  with the new phrase, the player pressing Start again (O182 closed); the starting note asks
  first, a major contract change (CONTRACT 5.0, §10).
- **Measured, for information:** the battery cost of pre-generation at Idle on a tablet (§8).
- **Measured and kept (2026-10-15): the stray-note threshold, 38 ms** (§9). It leaves a few stray
  notes in the lane and the default export; the owner accepted that and kept a length rule only.
  Hand check H5 still checks it on real playing.
- **Noted for later: a held note the controller cuts in two.** M1 also found the reference
  controller splitting one held note into two notes of the same pitch, up to 60 ms apart, usually a
  loud short part and then a soft long one (68 of the 167 notes under 130 ms). v3.0 adds nothing
  for it: a part under the threshold is left out like any very short note, the other part keeping
  the pitch, and a longer part shows as a second bar in the lane and a second note in the export.
  Merging the two parts on reading would be a new rule. It is worth weighing when Jam reads played
  notes as a doodle (Part C), where a split note would count as two notes of the same pitch.
- **Contract changes:** the owner confirmed the three major contract changes in §10 on
  2026-10-07, and they are applied; he agreed to the minor one, the cancellable background
  attempt, on 2026-10-12, and it is applied with the build. He confirmed the fifth, the review's
  reachability, as a major change on 2026-10-12 (CONTRACT 4.0), and the sixth, the starting note
  asking first, as a major change on 2026-10-13 (CONTRACT 5.0, applied by `documentalist`). The
  seventh, remembering the controller, was confirmed as a major change on 2026-10-15 (CONTRACT
  6.0, applied by `documentalist`; spec D314). Approving this spec is not a contract confirmation.
- **Design, for `ux-writer`:** where "Your data", the session list, favorites, the comment, the
  "Keep my played notes" switch and "my instrument" live, and how they look on each device;
  how my instrument's sheet shows the transposition's derived interval name (§7.1); the clef
  control in my instrument's sheet, its wording and its default (proposed: treble clef), and the
  staff-reach note read in the chosen clef (§7.1); the refusal of a range outside its clef's
  bound, in note names (§7.1); the warning before a range or transposition change erases my
  instrument's kept sessions, in its sheet and in the transposition check's confirmation (§5.1,
  §7.2); the delete confirmation naming the sessions that go with my instrument (§7.1); where
  the player lands when the review on screen loses its session (§5.1); in an outdated tab, how
  the sheet withholds deleting my instrument and a range or transposition change (§4.3); and how
  a review makes room for a session that needs more height than the shared height (§7.1;
  proposed: the larger of the two); the stale-phrase prompt (§16): its wording in plain words
  for a beginner, its two choices' labels (the owner's words are Regenerate and Use it; Part C
  §C6.5 already has a Use it button in the key and mode suggestion), how it is dismissed, whether
  it names the settings that changed, whether other controls can be used while it shows
  (proposed: no), and how it reads when the starting note opened it, the player being at the
  instrument.
- **Deferred, should the need arise:** octave signs and octave clefs for my instrument
  ([O180](../../open-questions.md#v30-wave-2-o180)).
- **Deferred to later versions:** see §2.

## 15. Access model

v3.0 still has exactly one local user, with no accounts, roles, permissions or sharing. Whoever
has the page open can do everything the app offers. One change: saved data makes that "whoever
uses this browser profile on this device", since kept sessions, favorites, comments and, when
opted in, played notes are there for anyone who opens the app in that browser profile. Delete
everything (§4.1) is the player's control over that. Data leaves the device only through an export
the player triggers.

## 16. A stale phrase 1 at Start

Added in v1.11 (spec D297, ISS-011), numbered after the other sections so that their numbers hold.
At Idle, ordinary edits never regenerate the phrase on screen (only an instrument switch does), and
a session starts from that phrase as phrase 1 (`rule_phrase_one_is_idle_phrase`). So the phrase on
screen can have been made under settings the player has since changed. v2 then fails to start at
most tempos (ISS-011). From v3.0 the app says so and asks.

- **Stale.** Phrase 1 is stale when a setting the generation reads has a different value now
  than when phrase 1 was generated. Values are compared, not edits: a setting changed and changed
  back is no difference.
  - **Counts:** every generation control except the tempo (Written key, Collection, Harmonic
    motion, Tension, Note density as the player chose it, Rhythmic variety, Syncopation, Silence
    density, Contour, Register, Leapiness, Arpeggio chaos); the musical profile, Neutral or Jazz
    (its customized mark alone is not read); and the instrument as the generation reads it, its
    id and, for my instrument, its range and transposition. Every setting a later part adds to
    the generation request (Part B's figure levels, Part D's chord level) counts the same way.
  - **Never counts:** the tempo and Rising tempo (the tempo never affects generation); Vary
    settings and Tension across phrases (neither acts on phrase 1); the audio mix; the theme; my
    instrument's clef and display name (§7.1); the window's width (a narrow window's note density
    is not a setting, and the layout checks stay as they are).
  - **The instrument never makes phrase 1 stale in practice:** an instrument switch regenerates
    the phrase, and saving my instrument's range or transposition while it is selected replaces it
    (§7.1).
- **When it asks.** When the player presses Start, or plays the starting note, once every start
  condition holds and before anything starts: no sound, no screen lock, no count-in. A start
  condition that does not hold still blocks Start as before; the prompt is not a start
  condition. When phrase 1 is not stale, Start works as before and nothing is asked.
- **The prompt** says the phrase on screen was made before the settings changed, and offers two
  choices, named by the owner **Regenerate** and **Use it**. Its words and form are `ux-writer`'s
  (§14). Dismissing it changes nothing and starts nothing.
- **Use it** starts the session from that choice, exactly as Start does, the start conditions
  checked again at that moment:
  - phrase 1 is the phrase on screen, unchanged: its request, seed and replay key, and it is shown,
    reviewed, kept and exported with what it was generated with;
  - the session's settings are the current ones: phrase 2 on is generated under them, Vary
    settings moves from them and back to them, and the session-wide record (§5.2) names them;
  - **phrase 2 joins phrase 1 as after a settings change applied at the boundary between phrase 1
    and phrase 2 during a session.** The existing carry-in rules adapt the join: the pitch is
    checked again, the chord is dropped after a key or collection change or when it no longer
    fits, the register window is replaced after a register change, and a change to Varying makes
    phrase 2 standalone. No new rule is needed, and the join can no longer fail at any tempo;
  - the read-only controls show the settings phrase 1 was generated with during the count-in and
    phrase 1, since phrase 1's first measure is on screen through the count-in, then the session's
    settings from phrase 2, as at any change. The musical profile selection alone (from v3.1, the
    preset) shows the player's selection from the start, never phrase 1's, even when it is one of
    the settings that changed, since it names the choice the next phrases follow (spec D339);
  - in v3.2, the rhythm lock still locks phrase 1's rhythm (§C7.1 holds as written).
- **Regenerate** (the owner's ruling, 2026-10-13, spec D297) runs the Idle Regenerate exactly: the current settings, a fresh seed, the usual fit run. The app stays at
  Idle with the new phrase on screen and nothing starts. The player presses Start, or plays the
  new starting note, when ready, and is not asked again, since the new phrase is not stale. A
  failed regeneration shows the usual failure banner. Starting the session as soon as the new
  phrase is on screen was the alternative, not chosen.
- **While the prompt shows,** the app is still at Idle: no MIDI note starts anything, the
  starting note included, and pre-generation goes on.
- **Pre-generation (§8) builds the phrases Use it plays.** While phrase 1 is stale it keeps
  running, phrase 2 planned from phrase 1 under phrase 1's own settings and joined as above. What
  discards its phrases is unchanged: any change of a setting phrases are generated from, and
  Regenerate, which replaces phrase 1. Use it takes the ready phrases as Start does. A
  pre-generated phrase is still exactly the session's phrase at that place.
- **The starting note asks too.** With a stale phrase 1 it opens the same prompt and starts
  nothing; the count-in starts only on Use it. This changes a contract wording, which the owner
  confirmed as a major change (CONTRACT 5.0, §10).
- **A running session still never asks.** The prompt comes before Start; once Use it starts the
  session, nothing is asked until it ends.

## Part B — v3.1

Generation choices: embellishment figures and presets. Master spec v1.1 (B12's code facts
checked against v3.0, 2026-10-19; v1.0 2026-10-08), consolidated
from the approved drafts [embellishment-flags.md](embellishment-flags.md) and
[presets.md](presets.md), which keep the code references line by line. Approved by the owner on 2026-10-08; the owner confirmed the contract wording
(B11) the same day. v3.1 is built on v3.0 (Part A): its storage, its settings record,
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
- Vary settings' profile flip becomes the **figure step**, "one figure moves one level", and its
  key and mode moves stay inside the restriction in force (B8.1).
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
  project's own, which the player can use and copy but never change; and a **player preset**, saved
  by the player under a name of their own. The v2 term "musical profile" (Neutral or Jazz) is
  replaced by "preset"; Neutral and Jazz are two built-in presets.
- **Preset-held settings**: the ten generation controls and the seven figure levels every preset
  holds (B6.1).
- **The selection**: what the preset selector shows: one preset, or
  **[Custom](../../../docs/music/lexicon.md#custom)**. Custom remembers the preset it is **based
  on**, or none.
- **Figure**: one kind of embellishment the generator can write (B5.1). A **free figure** is one the
  pitch search may use anywhere its rules allow; **Tension's scheduled figure** is the one figure
  the Tension control places on purpose (B5.4).
- **[Figure level](../../../docs/music/lexicon.md#figure-level)**, or level: Off, As today, Favored
  or Strongly favored (B5.2). These are working names; the labels are `ux-writer`'s, the meanings
  are fixed here.
- **Figure step**: Vary settings' step that moves one figure one level (B8.1).
- **[Key and mode restriction](../../../docs/music/lexicon.md#key-and-mode-restriction)**, or
  restriction: the keys and modes a preset is meant for (B6.2). **The restriction in force** is the
  one that applies at a given moment (B6.4).
- **Key** here means the **Written key** control's value: the home note of the phrase, the note the
  music feels settled on, chosen in the instrument's written pitch (the notes as read on the page;
  on a saxophone they sound lower than written). **Mode** means the **Collection** control's value:
  the set of seven notes built on that home note, one of nine: Major, Minor (natural minor), and the
  seven modes Ionian, Dorian, Phrygian, Lydian, Mixolydian, Aeolian and Locrian. Together they make
  what musicians call the key, such as "G Dorian".
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

- **Save as new asks for the restriction**, with three choices (how it is asked is `ux-writer`'s):
  1. **As now**, the default: the restriction in force, or "any" when none is. Saving from Custom
     based on Reel keeps "Mixolydian or Dorian"; saving a customized Modal (Dorian) keeps Dorian.
  2. **Only this key and mode**: one pair, the current written key and mode.
  3. **Any key and mode.**
  A player cannot build other lists in v3.1. The keys half is written pitch: a preset kept to G
  Dorian stays G Dorian as read on any instrument.
- **Save changes asks for it only when the key or mode lies outside the preset's restriction**
  (the player opted out, B6.4). Inside it, nothing is asked and the preset keeps its restriction.
  Outside it, the same choices are asked, "as now" then meaning any key and mode, since no
  restriction is in force; the answer replaces the old restriction. Keeping the old one would save
  a preset whose own key and mode lie outside it, shown as selected now but loaded as Custom after
  a reload (B7).
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
  existed is Off, the same rule as for older replay keys (B9); the record's data version tells
  which figures existed when it was written, and a level missing for a figure that already
  existed then is an invalid field, taking its first-load value. A missing name becomes a numbered
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

- **The figure step: "one figure moves one level"**, up or down, never past Off or Strongly
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
  §7.4). v3.1 writes `ifk3.` for every phrase, whatever the instrument: a built-in instrument by
  its id, as `ifk1.` does, "my instrument" inline, as `ifk2.` does; everything else `ifk2.` carries, except the musical
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
  (Neutral, Jazz, or Custom based on one of them); whether it was customized is read from phrase 1's
  reproduction inputs, which hold the session's start state. Their generated timelines are kept as
  they are. If rewriting every v3.0 session when the database opens does not fit the start-up
  read's time limit (Part A), each is mapped the same way when it is read instead; the player sees
  no difference.

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
  changes into a player preset (asking the restriction choice only when the key or mode lies
  outside its restriction, B6.6), rename, and delete with a confirmation; the reasons for a refused
  name or a reached limit; the notice when a save is refused by the browser.
- **Visits that save nothing** (outdated tab, failed read): presets made there last for the page,
  under that visit's existing notice; no preset deletion is offered there.
- **"Your data"** lists the player presets and their number.

## B11. What v3.1 changes in v3.0 and in v2's guarantees

Each change is intended. Where a declared-intent entry is named, `documentalist` prepares the
change.

**Contract guarantees that change** (they need the owner's explicit confirmation and a major
contract version; approving this spec is not that confirmation; the owner confirmed their
wording on 2026-10-08):

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

From reading the code on 2026-10-07 and 2026-10-08 (line references in the drafts), checked again
against v3.0's released code (`d007b27`) on 2026-10-19; where the drafts are older, this section
follows the code.

- **The pitch search** orders candidates with chord tones before every decorating note; decorating
  notes share one rank, ordered among themselves by the seed only (`orderCandidates`,
  `src/domain/pitch/pitch-ranking.ts`). So a decoration appears only when the chord-tone path
  fails: in about 5,200 sampled phrases, free passing tones were in 1 to 6 % of phrases, Jazz's
  chromatic approaches in 4 to 20 %, and the free appoggiatura in none. A free decorating note must
  resolve on the next note, so two decorating notes in a row are rejected unless they form one
  written figure, in the search (`freeToneResolves`, `pitch-figures.ts`) and in the validator's
  figure rules (`figureFailures`, `src/domain/pitch/validation/figure-rules.ts`). No written figure
  is a diatonic enclosure (an enclosure needs a note outside the collection), which is what blocks
  the diatonic enclosure today.
- **One capability separates Neutral from Jazz** (chromatic approach and enclosure allowed), looked
  up from the profile's name (`MUSICAL_PROFILE_CAPABILITIES`,
  `src/domain/controls/profile-selection.ts`) by the pitch policy and the result validator; the
  policy carries it on to the pitch candidates, the pitch context and the figure rules. The name
  or the capability is read in about fifty source files, about ten of them in the generator and
  the validator: the generation request, the chord planner's input check, the pitch candidates and
  context, the window search, the joining fit (carry-in), the result validator and its figure
  rules; and beyond them the worker's inbound check, the replay key, the session's intents, the
  controls, the generation-session composables, the workspace and pre-generation, the settings
  and kept-session records, and the Review. The validator must accept exactly what the levels
  allow, the two new figures included.
- **The Tension control**: the chord planner sets its requirement (at most one figure, the bars
  and figure kinds allowed, and whether one is required); the pitch policy lists the candidate
  placements, and the window search runs a whole pitch search for each, all from one shared
  search budget.
- **The selection** is a name plus a customized flag (`ProfileSelection`: `musicalProfile`,
  `isCustom`). Choosing Neutral or Jazz overwrites seven controls; any edit of those seven sets the
  flag. Every other control edit but the instrument goes through one routing point (`setControl`,
  `src/composables/generation-session-control-actions.ts`), which is where opting out by key or
  mode is detected; the instrument switch and Vary settings take their own paths, through the
  same two helpers. At Idle no control change regenerates the phrase on screen, with one
  exception: under the notice that the notes are too wide, a change of a setting the phrase is
  generated from starts a new round. The instrument switch regenerates when a phrase is shown.
  Since v3.0, any change but tempo also discards the pre-generated phrases and restarts
  pre-generation (`settingsKeyOf`, `src/components/workspace/workspace-pregeneration.ts`).
- **The controls** are segmented controls (Tempo is a stepper); an option can be disabled but not
  highlighted while staying selectable, so the highlight is new (a small addition plus its
  design).
- **Vary settings** draws a setting then a direction from a seeded source, redraws a draw that
  lands on an unsupported combination, and refuses after a fixed bound of redraws (10,000,
  `src/session/settings-mutation.ts`). The restriction reuses that redraw.
- **v3.0 saves**, and v3.1 builds on it: one IndexedDB database at data version 1, with no preset
  store (`src/storage/database.ts`); the settings record holds the profile selection and loads
  each setting on its own, falling back to its default (`settings-record.ts`); kept phrases hold
  the profile in their reproduction inputs and the session summary holds it with its customized
  flag (`kept-phrase-parsers.ts`, `kept-session-summary.ts`); the `ifk2.` key carries my instrument
  (`src/generation-worker/phrase-replay-key.ts`).

**At risk:**

- **Generation cost** (B5.6): Off levels and the two new figures can slow searches or create
  failures; the allowance is not raised, and the guard is measured before the gate.
- **Reproducibility**: Neutral and Jazz must generate exactly what v3.0 does; any extra draw or a
  reordered tie in an As today or Off phrase breaks every existing replay key and golden fixture.
- **The redraw bound**: a one-mode restriction makes more key and mode draws land outside; the
  fixed bound must stay comfortably above what a restriction adds, so a valid move is never
  refused.
- **The first-load bundle budget**: v3.0 shipped its entry chunk at 229,146 bytes, 230 bytes under
  its 224 KiB budget (the v3.0 release notes; Part A §4.3's 8.8 kB was the headroom before v3.0's
  build). The combo box, seven level controls, the built-in table and preset management add code;
  `coding-leader` measures it and may load preset management on demand.
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
    now" by default; save changes only into a player preset, asking the restriction choice only when the key or
    mode lies outside its restriction; built-ins never change; rename and
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
- **From the owner:** nothing more. Part B was approved, and B11's four contract changes were
  confirmed word for word, on 2026-10-08.
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
  - for v3.2: whether presets hold Jam's settings, and how the key and mode suggestion treats the
    restriction in force (confirming a suggestion outside it is opting out, like any key choice);
  - favoring the figures found in the player's doodle: first placed in v3.2, now deferred beyond
    it.

## B16. Access model

Unchanged from Part A §15: exactly one local user, with no accounts, roles, permissions or
sharing. Whoever has the page open can do everything the app offers, built-in and player presets
alike. Player presets join the data kept for "whoever uses this browser profile on this device";
Delete everything removes them. No preset leaves the device.

## Part C — v3.2

Jam, the key and mode suggestion, and the rhythm lock. Master spec v1.0 (2026-10-08),
consolidated from the approved drafts [jam.md](jam.md),
[key-and-mode-suggestion.md](key-and-mode-suggestion.md) and [rhythm-lock.md](rhythm-lock.md),
with the code facts of [jam-grounding.md](jam-grounding.md) (re-checked against the code on
2026-10-08), which keep the code references. Approved by the owner on 2026-10-08; the owner confirmed the contract wording
(C13) the same day. v3.2 is built on v3.0 (Part A) and
v3.1 (Part B): their storage, kept sessions, stray-note filter, pre-generation,
[figure levels](../../../docs/music/lexicon.md#figure-level), presets and `ifk3.` replay key must
exist first.

Music terms are explained the first time they appear; the project's
[lexicon](../../../docs/music/lexicon.md) has one entry per term.

## C1. Core concept

Until v3.2 the app only ever continues its own ideas. P3, the Fledgling Composer, wants to say "I
liked that gimmick", play it, and hear the app take it further. The owner put it this way: "I've a
doodle in mind, but I'm not good enough to iterate on it. I give it to the app, and it generates
matching phrases."

v3.2 gives the player three things.

- **Jam.** A session mode. After a one-measure count-in, the player plays a short idea, the
  **doodle**, over the app's click; the app then continues it with rolling phrases, as any session
  does. The phrases match the doodle's shape: a rhythm close to it, the same ups and downs, and a
  first note joined to the doodle's last one. The doodle never changes a setting and never switches
  the key or mode: it only decides which of the phrases the player's settings allow come first.
- **The key and mode suggestion.** After a Jam, the review may propose the key and mode the doodle
  sounds in. The player uses it, keeps their own, or plays the same doodle again in a new Jam.
- **The rhythm lock.** A switch that makes every phrase of a session repeat one rhythm while the
  pitches keep changing, so the eyes can go to the notes. The player may allow small rhythm
  changes, each lasting one phrase. Two smaller controls come with it: Jam's **drift**, how far a
  Jam's phrases may wander from the doodle, and Vary settings' **allowed groups**, which settings
  Vary settings may move.

The guiding principle is unchanged: the app acknowledges and encourages; it never penalizes,
grades, ranks or scores the player, and anything that adapts is opt-in and visible. With Jam off,
the rhythm lock off and all six allowed groups on (the defaults), v3.2 generates exactly what v3.1
generates.

## C2. Scope

### In v3.2

- Jam: the Jam switch, which needs a controller (C5.1); starting a Jam by a Start click or the
  home note (C5.2); the count-in and the click (C5.3); capturing the doodle and its end rule
  (C5.4); quantizing it (C5.5); the generation and read-in measures, the extended wait and the
  fallback (C5.6, C5.7); what the doodle feeds the generator (C5.9); the held doodle and "Jam again
  on this doodle" (C5.11); the edge cases (C5.13); the doodle in the review, the exports and kept
  sessions (C5.14, C5.15).
- The key and mode suggestion, after a Jam, with Use it, Keep mine and Jam again on this doodle
  (C6).
- The rhythm lock, with an optional list of five kinds of allowed rhythm changes, each lasting one
  phrase, and the forced bend that keeps the lock from ever failing a phrase (C7).
- Jam's drift control, three positions (C8).
- Vary settings' allowed groups, six groups (C9).
- A new replay key version, `ifk4.`, older keys still decoding; a new stored data version for kept
  sessions (C11).

### Out of v3.2

- **The doodle's exact rhythm.** v3.2 locks and matches the nearest rhythm the app's rhythm
  grammar can write, not the rhythm as played; the exact one needs v4's rhythm editor.
- **Wider rhythm mutations** (changes that stay, the larger mutations of the catalogue, mutations
  under the rhythm editor's rhythm): v4. Widening the rhythm grammar so that Strict variety with
  Straight syncopation offers rhythm changes (C7.3) is grammar work, v4.
- **Quoting the doodle** (playing its own notes back inside a phrase), developing it by named
  operations (moving it higher, turning it upside down, stretching it), or choosing chords to fit
  it. These would change how the generator's stages relate (C5.10); later.
- A fourth drift position ("Related"), which needs those operations.
- **A new doodle during a running Jam.** It would need a
  [played signal](../../../docs/music/lexicon.md#played-signal) (a short pattern played on purpose
  to steer the app), which is v3.x at the earliest.
- **Tempo inferred from a doodle played freely**, without the click: a later candidate.
- A drone (a held home note) under the doodle: a later candidate.
- The suggestion during a Jam, or listing every candidate it weighed.
- Favoring the embellishment figures (v3.1) found in the doodle.
- Presets holding Jam, the drift, the rhythm lock, its allowed changes or the allowed groups;
  presets with rhythm cues are part of the later, richer presets.
- A Jam without a controller.
- A doodle taken from a file or a past session (around v5, as a snippet library).
- A pickup (notes before beat 1) or a tie across the join into phrase 1: Jam's gap makes them
  unnecessary (C5.6).
- **Unchanged, permanently out:** any grading, scoring, ranking or wrong-note signal; accounts,
  sharing or any server-side state.

## C3. Personas and goals served

The personas are Part A's (§3) and [personas.md](../../personas.md): **P1 — the Curious
Improviser** (primary), a player who can already play and is a beginner at improvising; **P2 —
the Speed Builder** (secondary), who wants endless fresh material at steadily higher tempos;
**P3 — the Fledgling Composer** (secondary), who wants to keep and grow the ideas they liked.

| Goal | Served by v3.2 | How |
| --- | --- | --- |
| **P3.C3 — Grow an idea.** "I liked that gimmick." They play it, and the app's generation continues it to see where it goes. | **Served, by shape** | Jam captures the doodle and continues it: rhythm close to it, the same ups and downs, phrase 1 joined to its last note, at the drift the player chooses. The rhythm lock can hold the doodle's nearest rhythm while the melody grows. "Jam again on this doodle" lets the player go round again, in the key and mode the suggestion found, which answers the owner's "not good enough to iterate on it". Partial in two ways, both later: the doodle is matched by shape, never quoted, and its exact rhythm needs v4. |
| **P3.C1 — Review a session.** | **Extended** | The review opens with the doodle, engraved as the app heard it; the `Played notes` lane shows how it was played. |
| **P3.C2 — Take it out.** | **Extended** | Both exports open with the doodle, in both scopes (whole session and favorites). |
| **P1.G1 — Vocabulary by exposure.** Play whatever gets generated and feel how these ideas sound. | **Partly** | Allowed rhythm changes let a player hear one rhythm varied by one small, named edit. The suggestion names the mode the player's own idea sounds in. Hearing their own idea developed is exposure too. Vary settings' allowed groups let the player choose what drifts. |
| **P1.G2 — Real-time reading and dexterity.** | **Partly** | The rhythm lock from phrase 1: with the rhythm settled, the eyes go to the pitches. |
| **P2.S1 — Fresh material at a steadily higher tempo.** | **Partly** | Vary settings' allowed groups: variety the player can steer (for example, keys only). |

**The context of use** (all personas: hands, and the mouth on a wind controller, busy on the
instrument; no clicking on screen while playing) shapes three choices: a Jam can start by playing
the home note; nothing is asked or offered while a Jam runs (no new doodle, the suggestion comes
after); and Jam needs a controller, since the doodle is played on it.

**Tensions settled for this scope.**

- P3 wants the app to keep their doodle with the music; a player's own notes are the most private
  data the app holds. Resolved by two forms: the quantized doodle is a generation input the player
  gave on purpose and travels with the music; the doodle's raw notes stay played notes, under
  every played-notes rule (C5.14).
- The player confirms the suggestion; a running session never asks the player for anything.
  Resolved by place: the suggestion is shown after the Jam, never during it.
- P2 plays at up to 240 BPM; the app needs time to write phrase 1 after the doodle. Resolved by two
  measures between the doodle and phrase 1, extended by whole measures when needed, and a
  doodle-free last attempt (C5.6, C5.7).
- A strict lock against Tension's variety: some tension steps change which rhythms exist. Resolved
  by the forced bend (C7.5), so the lock never fails a phrase.
- A beginner wants a steady rhythm; exposure wants variety. Resolved by allowed rhythm changes off
  by default, each one phrase long, chosen kind by kind.

## C4. Words used in this part

One term per concept, used the same way everywhere in Part C and by `ux-writer`'s design. The
names of switches and positions are working names; their labels are `ux-writer`'s, their meanings
are fixed here.

- **[Doodle](../../../docs/music/lexicon.md#doodle)**: the short musical idea, one to four measures,
  that the player plays for the app to continue. Musicians call it a
  [motif](../../../docs/music/lexicon.md#motif); the app says "doodle". A **measure** (or bar) here
  is four beats.
- **[Jam](../../../docs/music/lexicon.md#jam)**: the session mode in which a session begins with a
  doodle; also the name of its switch. **A Jam** is one session run in that mode; a **Jam session**
  is a kept one.
- **[Quantize](../../../docs/music/lexicon.md#quantize)**: snap the times of played notes, which
  never land exactly on the beat, to the nearest point of a grid. The grid is the app's
  [tick](../../../docs/music/lexicon.md#tick), one sixteenth note (a quarter of a beat).
- **The quantized doodle**: the doodle after quantizing, as the app uses it (note starts and lengths
  in ticks, and concert pitches). **The raw doodle notes**: the same notes exactly as played, with
  their real times; they are played notes.
- **Click**: the app's sound, one per beat, at the selected tempo, from the count-in until phrase 1
  (C5.3). The lexicon keeps "pulse" for the [beat](../../../docs/music/lexicon.md#beat) itself.
- **[Count-in](../../../docs/music/lexicon.md#count-in)**: one measure of click, shown and heard,
  before anything is played, as in v2.
- **[Starting note](../../../docs/music/lexicon.md#starting-note)**: the one note on the controller
  that can start a session from Idle instead of a Start click. In v2 it is the first note of the
  phrase on screen; in Jam mode without a held doodle, it is the home note.
- **Home note**: the note the music feels settled on, the
  [tonic](../../../docs/music/lexicon.md#tonic); the Written key control names it.
- **Generation measure**: the measure in which the app writes phrase 1 after the doodle. **Read-in
  measure**: the measure in which phrase 1 is on screen before it sounds, as phrase 1 is during v2's
  count-in.
- **The join**: how a phrase continues from the note before it, as v2 joins two phrases: the first
  interval obeys the same limits as two notes inside a phrase.
- **[Held doodle](../../../docs/music/lexicon.md#held-doodle)**: a doodle kept at Idle so the next
  Jam continues it without a new capture (C5.11).
- **[Key and mode suggestion](../../../docs/music/lexicon.md#key-and-mode-suggestion)**, or the
  suggestion: the key and mode the app proposes for a doodle, which the player confirms or declines.
- **Key** and **mode**, as in Part B (B4): the **key** is the Written key control's value, the home
  note; the **mode** is the Collection control's value, one of nine: Major, Minor and the seven
  modes Ionian to Locrian. "G Dorian" is the key G with the mode Dorian.
- **[Pitch class](../../../docs/music/lexicon.md#pitch-class)**: a note name regardless of octave:
  every C is the same pitch class; there are twelve.
- **Note start**: the moment a note begins. In four-beat measures **beats 1 and 3** are the strong
  beats; every generated measure has a note sounding on one of them (the
  [metrical anchor](../../../docs/music/lexicon.md#metrical-anchor)).
- **Bars**, or written bars, of a rhythm: every note start and length, every
  [rest](../../../docs/music/lexicon.md#rest) and every [tie](../../../docs/music/lexicon.md#tie) of
  its four measures. Two rhythms "match by bars" when these are the same.
- **[Rhythm lock](../../../docs/music/lexicon.md#rhythm-lock)**: the switch that makes every phrase
  of a session repeat one rhythm. **The locked rhythm** is that rhythm: every note start and length,
  and so every rest, of the four measures.
- **[Allowed rhythm changes](../../../docs/music/lexicon.md#allowed-rhythm-changes)**: the player's
  list of small edits a phrase may make to the locked rhythm. **A rhythm change** is one such edit,
  lasting one phrase.
- **[Forced bend](../../../docs/music/lexicon.md#forced-bend)**: what the generator does when the
  locked rhythm cannot make a phrase: it takes the nearest rhythm that can. Not a player option, and
  not a rhythm change.
- **Distance**: how different two rhythms sound, on the [mutation catalogue's
  scale](../../../docs/music/mutation-catalogue.md#the-distance-scale-proposed): **Same**;
  **Close** (one small edit inside a beat); **Near** (one edit on or next to a strong beat, or two
  small ones); then **Related** and **Loose**. C8 makes it precise per measure.
- **[Drift](../../../docs/music/lexicon.md#drift)**: in a Jam, how far phrases may wander from the
  doodle; three positions named after the distances, **Close**, **Near** and **Free**.
- **Vary settings' allowed groups**: which groups of settings Vary settings (the "During a session"
  option that moves one setting one step every 2 to 4 phrases) may move. Always called groups, so
  they are never confused with the allowed rhythm changes.
- **Tenser phrase**: a phrase that Tension across phrases generates one step above the tension in
  effect: the second phrase of each group of four, unless the tension is already Edge.
- [Step](../../../docs/music/lexicon.md#step), [skip](../../../docs/music/lexicon.md#skip) and
  [leap](../../../docs/music/lexicon.md#leap): moves between neighboring notes of a melody, in the
  app's own size classes: a step is 1 or 2 half steps, a skip 3 or 4, a leap 5 or more.
- [Gesture and answer](../../../docs/music/lexicon.md#gesture-and-answer): the app's rhythm plan:
  measures 1–2 state a rhythm (the gesture), measures 3–4 answer with a varied copy.
- A player-chosen edit is always a **rhythm change** and the generator's fallback always a
  **forced bend**; neither is shortened.

## C5. Jam

### C5.1 The Jam switch

- **Jam is a session mode, switched on at Idle** (the review included), never during a session.
  The switch is **off by default** and saved like the three "During a session" options (Part A
  §4.2). A mode, not a second Start button, so that a played note can start a Jam without two
  starts competing for one note.
- **Presets neither hold nor change it** (v3.1 presets hold generation settings only, B6.1).
- **Jam needs a controller attached** (a selected controller, connected). Without one the switch
  is unavailable and says why, as Rising tempo does
  ([v2 master spec §10](../v2/master-spec.md#10-adaptive-tempo)). **The player's choice is kept**:
  while no controller is attached, Idle and Start behave exactly as with Jam off. A controller
  attaching at Idle puts Jam mode in effect, exactly as turning the switch on does; a controller
  lost at Idle takes it out, exactly as turning the switch off does.
- **At Idle in Jam mode, no generated phrase is shown**: nothing is read before the doodle. The
  staff shows the key signature of the selected key and mode. v2's Idle phrase rules (replacing a
  phrase that does not fit, the dense-notes notice) and pre-generation (Part A §8) do not run; v2's
  prewarm of the rhythm domains still does, since the doodle's phrases use the same rhythm domains
  as the settings. Turning Jam on discards the phrase on screen and every pre-generated phrase.
  Turning Jam off leaves the workspace empty, as at first load: nothing is generated until the
  player asks for a phrase. A held doodle changes this (C5.11).

### C5.2 Starting a Jam

- **A Jam starts on a Start click, or on its starting note: the selected key, the home note**, in
  written pitch, in the octave nearest the middle of the instrument's written range (the lower one
  if two are equally near), matched at its exact concert pitch as v2 matches the starting note.
  The cue row names it as v2 names the starting note. As in v2, the starting note only starts the count-in and belongs to no doodle; unlike v2, it
  does not start the silence timer (C5.13).
- **The conditions under which a session can start** (v2 §6) apply, apart from "a phrase is on
  screen" and "no new phrase is being generated". Settings the generator does not support still
  block the start. As in v2, no note starts anything while a review is shown, or while the player
  is connecting a controller or running its transposition check.
- **A doodle never starts anything by accident.** Notes played at Idle stay ignored, as in v2: the
  doodle is captured only after the count-in. Playing the home note at Idle starts a Jam; this is
  v2's accepted risk with the starting note, and the cue row names the note.
- With a held doodle, the starting note is phrase 1's first note, as in v2 (C5.11).

### C5.3 The count-in and the click

- **One measure of count-in**, shown and heard, its beats counted on screen in time with the
  click, as in v2. Without a held doodle, no phrase is on screen during it.
- **The click goes on** through the capture, the generation measure, any extended wait and the
  read-in measure, **whatever the click switch says**, at the click volume: like v2's count-in, it
  is what sets the measure grid the doodle is played against. From phrase 1 on, the click switch
  governs as in v2.
- **No backing during the capture.** The backing follows a phrase's generated chords (v2 §6), and
  there are none yet. It starts with phrase 1.
- **The live view never shows the doodle's notes**, as v2 never draws a played note there
  ([v2 master spec §8](../v2/master-spec.md#8-midi-input-and-note-acknowledgement)). The cue row
  counts the doodle's measures (one to four), then says the app is writing, then counts the
  read-in measure's beats. How it looks is `ux-writer`'s.

### C5.4 Capturing the doodle: where it starts and where it ends

- **Notes are filtered, then snapped, then counted.** The stray-note filter (Part A §9) applies
  first: a very short note never starts, extends, ends or shapes a doodle. A note belongs to the
  doodle by its snapped start, so a note played a little early onto the first beat after the
  count-in is a doodle note; one that snaps before that beat belongs to the count-in.
- **The doodle's first measure** is the measure holding its first note. It may begin with rests: a
  doodle that starts on beat 2 simply starts there.
- **End by silence.** From the end of the doodle's first measure on, at each barline where no note
  is sounding, a generation attempt starts from the doodle as it stands. If the player plays a note
  (one that passes the stray-note filter) inside that measure, the attempt is cancelled where it
  runs, as v2 cancels a dropped attempt, and that measure becomes part of the doodle. If the
  measure stays silent, the doodle ended at its start, and it is the generation measure.
- **A held note keeps a measure from being silent**: a measure that begins with a note still
  sounding is not a silent measure, even if the note ends at once.
- **End by length.** When the doodle's fourth measure ends, the doodle ends, whatever is sounding.
  A note still held is cut at that barline. The next measure is the generation measure.
- **Notes after the end.** Notes played after the doodle ended and before phrase 1 sounds (in the
  generation measure after an end by length, in an extended wait, in the read-in measure) belong to
  no doodle and no phrase, like notes played during v2's count-in.

### C5.5 Quantizing

- **The grid is the tick, a sixteenth note, at every tempo.** At 240 BPM a sixteenth lasts 62.5 ms,
  so a note start moves by at most about 31 ms. The doodle only steers the order of candidates, so
  a near miss costs little.
- **Note starts and ends snap to the nearest tick**; a note keeps at least one tick.
- **One line only.** The controller can send chords and overlapping notes; the doodle is one
  melodic line. When notes overlap, the later start ends the earlier note. When two notes snap onto
  the same tick, the longer one stays (so a quick grace note before a held note is dropped), and on
  equal length the higher one.
- **Computed once**, when the doodle ends, with plain integer arithmetic. The quantized doodle
  holds each note's start and length in ticks and its concert pitch, and is what every later step
  reads (the generator, the suggestion, the review, the exports, the replay key). The tempo it was
  captured at is kept beside it, for the review and the exports; generation never reads it, so
  tempo still never affects what is generated.

### C5.6 From the doodle to phrase 1: the generation and read-in measures

- **The generation measure**: the app writes phrase 1 from the doodle. The cue row says so.
- **The read-in measure**: phrase 1 is on screen and its beats are counted, as during v2's
  count-in. Then phrase 1 sounds, with the backing.
- **So two measures separate the doodle and phrase 1**: 2 s at 240 BPM, 4 s at 120 BPM, 8 s at
  60 BPM. The second one exists because v2 promises at least one measure of read-ahead on screen at
  all times ([v2 master spec §4](../v2/master-spec.md#4-look-ahead-and-failure-handling)): with one
  measure, phrase 1 would appear on the barline it starts on, with nothing to read ahead.
- **Phrase 1 starts with a fresh note on beat 1**, as every phrase does. With the gap, no pickup or
  tie across the join is needed.

### C5.7 When phrase 1 is late: the extended wait and the fallback

- **The wait extends by whole measures.** Phrase 1 is shown at the first barline at or after the
  moment it is ready, followed by its read-in measure. The click goes on; the cue row keeps saying
  the app is writing.
- **Deadline: three measures after the generation measure begins** (3 s at 240 BPM, 12 s at
  60 BPM), the same span a look-ahead phrase gets in v2.
- **The ladder**, v2's failure ladder adapted, three rungs:
  1. **the doodle's join and its preferences** (C5.9), with v2's carry-in retries (a fresh seed
     each, skipped after a search that covered every candidate);
  2. **one attempt with the doodle's preferences and no join**;
  3. **v2's standalone phrase, with no doodle at all.**

  v2's standalone reserve (1.075 s) is kept before the deadline for rung 3, which is the attempt
  that reserve was measured on: once less is left, no attempt of rungs 1 or 2 starts, the one
  running is cancelled, and rung 3 is requested at once. A phrase repeat, v2's last step, is
  impossible: there is no phrase before.
- **If every attempt fails by the deadline, the Jam ends**: back to Idle, no review, nothing kept,
  the doodle not held, and the player is told, at Idle, that the app could not continue with these
  settings. It should be rare: the settings were checked at Start, and the doodle only orders
  candidates.
- If phrase 1 comes from rung 3 with the rhythm lock on, its rhythm is not chosen near the doodle;
  the lock then holds phrase 1's rhythm as it came (C7.1).

### C5.8 The time budget

- **At 240 BPM one measure is 1 s**, shorter than the standalone reserve (1.075 s): with a
  one-measure deadline, every doodle attempt would be skipped at 240 BPM, as v2 skips the join for
  phrase 2. The three-measure deadline leaves the doodle's rungs about 1.9 s at 240 BPM.
- **Measured** ([generation latency](../../../docs/generation-latency.md); re-checked in
  [jam-grounding.md](jam-grounding.md#d-re-check-2026-10-08)): a standalone attempt in Chromium
  has a median of 245 ms and a maximum of 618.6 ms over the 43 slowest settings; the worst setting
  generates in 77.3 ms warm and 277.2 ms cold (v2.0 gate run, prewarm on). Joined attempts that
  succeed took at most 280 ms in the sweep of the
  [slow joining attempts issue](../../../issues/Ref_20261006_failed_carry_in_attempts_slow.md);
  failed ones took seconds before its fixes, which is what the reserve guards against.
- **So phrase 1 is normally ready inside the generation measure** at every tempo. The rhythm domain
  is already warm: the settings are known before Start. Ordering up to 2,932 rhythm candidates (the
  largest domain; 1,797 is the slowest to build) by distance to the doodle adds work that is
  measured before the gate (C16).
- **Pre-generation cannot help a fresh doodle**: phrase 1 depends on notes played after Start. It
  helps a held doodle (C5.11).
- **Phrase 2** is requested as soon as phrase 1 is ready; its deadline is the start of phrase 1's
  last measure, which gives it the read-in measure plus three measures, more than v2's phrase 2
  gets.

### C5.9 What the doodle feeds the generator

**Principles.**

- **The doodle changes no setting.** The controls stay as the player set them; the doodle only
  orders the candidates those controls allow. Every phrase that is possible today stays possible,
  so the failure ladder's evidence still holds.
- **The doodle is not quoted.** v3.2's phrases match the doodle's shape: a rhythm close to it, the
  same ups and downs, starting where it ended.
- **The doodle is key-independent.** Its rhythm, its directions and its move sizes survive a key or
  mode change made by Vary settings during the Jam.

**The join into phrase 1.**

- Phrase 1 continues from the doodle's last note, the way v2 joins two phrases
  ([v2 master spec §3](../v2/master-spec.md#3-the-generation-unit-and-how-phrases-join)): its first
  interval follows the same limits as two notes inside a phrase. What crosses: the last pitch, as
  if reached by no interval (as after a phrase of one note); **no chord** (the "no chord" form a key
  change already uses); and **no owed leap recovery**, since two measures of silence come between.
- **Register.** With Register on Varying, the session takes the register window holding the
  doodle's last note, the nearest by its centre when several do; when none does, Varying resolves
  as in v2. With Low, Middle or High, the window is the player's.
- **No join** when the last note lies outside that window or outside the instrument's range:
  phrase 1 is generated without it, as v2's standalone phrase is; the doodle's other preferences
  still apply. Notes outside the range or the window stay in the doodle and shape its
  preferences like any other note; only the join depends on where the last one lies.
- The doodle has no phrase number; generated phrases are numbered from 1.

**Rhythm.**

- Rhythm candidates are ordered by their distance to the doodle's rhythm, ahead of the seeded
  order. The doodle's measures are laid over the phrase in order and repeated to fill four
  measures: a one-measure doodle four times; two measures twice (matching the phrase's
  [gesture and answer](../../../docs/music/lexicon.md#gesture-and-answer)); three as 1, 2, 3, 1;
  four as they are.
- **The order**: candidates whose every measure lies within the drift position's band (C8) come
  first, in seeded order, so phrases still vary; then the rest, closest first (by their total
  number of edits over the four measures, C8), then seeded order. A doodle far from everything the
  settings allow (sixteenth notes under the Quarter density, say) is only approached.
- **With the rhythm lock on**, phrase 1 takes the rhythm nearest the doodle, the lock then holds
  it, and drift no longer decides the rhythm (C7.1).

**Melody.**

- Pitch candidates are ordered to follow the doodle's moves: for each note of the phrase, the next
  move of the doodle (up, down or the same note; a step, a skip or a leap), cycled in order. The
  drift position decides how much: direction and size (Close), direction only (Near), or nothing
  (Free).
- **The preference never overrides a rule.** It applies after the rules the controls set
  (Contour, Leapiness, the register window), which still decide what is allowed, and it orders
  candidates within each rank of the existing order (chord tones first, and v3.1's favored figures
  where they are drawn), never across ranks.

**Phrases 2 onward.** Every phrase of a Jam carries the doodle and the drift as generation inputs,
so the whole session keeps its shape. Phrase N+1 joins phrase N as in v2; only phrase 1 joins the
doodle. Every rung of v2's ladder for phrases 2 onward, the standalone attempt included, keeps the
doodle's preferences, as it keeps the rhythm lock: they only order candidates. The sweep (C16)
checks that the standalone attempt stays within its reserve with them.

### C5.10 Planner authority

The generator works in stages: the harmony (the chords) is planned from the key, the mode, the
harmonic motion, the tension and the figure settings, and takes no rhythm, pitch or seed; the
rhythm candidates are looked up; both are ordered by the seed; the register windows are resolved;
then the search walks chord plan by chord plan, rhythm by rhythm, and runs the pitch search until
one plan passes every check. Trying the next candidate is the only backtracking; **no later stage
edits an earlier one's output**, as settled for v2. v3.2 keeps it so: the doodle only orders
candidates.

| Stage | What the doodle does |
| --- | --- |
| Harmony | Nothing. Choosing chords from the doodle's notes would let a later fact shape an earlier stage. |
| Rhythm | Orders its own candidates by distance, inside the stage. |
| Register resolution | With Varying, picks the window holding the doodle's last note: an input, decided before the search. |
| Pitch | Orders its own candidates by the doodle's moves, after the hard rules; joins from the last note through the existing join mechanism. |
| Search order | Unchanged, apart from the rhythm lock's order (C7.6). |

Quoting the doodle inside a phrase (its notes pinned, so harmony and the contour and leap rules
would have to accept notes no stage chose), or picking chords to fit it, would reopen the question
of whether a later stage may revise an earlier one. Both are outside v3.2; the question returns
with the first feature that quotes player material, such as v4's rhythm editor or a later Jam.

### C5.11 The held doodle and "Jam again on this doodle"

- **"Jam again on this doodle"** is offered in the review of the Jam that just ended and in the
  review of any kept Jam session. Choosing it leaves the review for Idle with that doodle held, and
  turns the Jam switch on if it was off. Like the switch, it needs a controller: without one it is
  unavailable and says why.
- **At Idle with a held doodle**: phrase 1 is generated from the doodle at Idle, with no deadline,
  through the same three rungs as C5.7, and is on screen; the starting note is phrase 1's first
  note, as in v2; v2's Idle phrase rules and pre-generation run as for any phrase 1, a replacement
  being generated from the held doodle too; and the key and mode suggestion, when there is one,
  stays shown (C6.4).
- **Start** runs a Jam that skips the capture: the count-in, then phrase 1, as in v2. The 30-second
  wait for a first doodle note does not apply, and there are no generation or read-in measures.
  The Jam's review and its kept session carry the held doodle as their doodle; its raw notes belong
  to the session it was played in, so this Jam's `Played notes` lane and played-notes export hold
  none of them.
- **Regenerate** at Idle generates a new phrase 1 from the held doodle, keeping it. **Use it**
  keeps it too, and regenerates phrase 1 from it in the new key and mode (C6.5).
- **Every other change that discards pre-generated phrases drops the held doodle**, and its
  suggestion with it: a control, a figure level, a preset choice, the instrument, the Jam switch
  turned off, the rhythm lock, its allowed changes, the drift, Vary settings and its allowed
  groups, Tension across phrases. The tempo, Rising tempo, the audio mix and the theme do not. A
  controller lost at Idle drops it, since Jam mode leaves with it. Idle then shows what Jam mode
  shows without a held doodle (C5.1), or, with Jam out of effect, the empty workspace, as at first load: nothing is generated until
  the player asks for a phrase.
- **Deleting the kept Jam session a held doodle came from drops it** (C5.14): deleted data is
  gone, so a later Jam cannot put it back into a kept session.
- **A Jam played on a held doodle keeps it.** Its end is not in the list above, so after its
  review Idle shows a phrase 1 newly written from the held doodle, with a fresh seed, ready to go
  round again. A doodle captured by a fresh Jam is never held by itself; only "Jam again on this
  doodle" holds one.
- **A held doodle lives in memory only.** After a reload Idle holds none; the kept Jam session's
  review offers it again.

### C5.12 During the Jam

- **From phrase 1, a Jam runs as a v2 session**: rolling phrases, acknowledgement, look-ahead, the
  failure ladder, Vary settings, Tension across phrases, Rising tempo, the silence and controller
  rules, Stop. Vary settings, Tension across phrases and Rising tempo count from phrase 1.
- **No new doodle during a Jam.** A running session never asks the player for anything and offers
  nothing to click; telling "a new doodle" from "I lost my place" would need a played signal. To
  doodle again, the player stops and starts a new Jam.
- **A Jam ends** as any session ends (v2 §7).

### C5.13 Edge cases before phrase 1 sounds

"Ends as a count-in end" means: back to Idle, no review, nothing kept, as a v2 session ended during
its count-in (Part A §5.1); a fresh Jam's doodle is not held. A Jam on a held doodle that ends
this way keeps it held (C5.11), and Idle shows the same phrase 1 again.

- **No note after the count-in.** If no doodle note comes within 30 s after the count-in, the Jam
  ends as a count-in end. Notes the stray-note filter drops do not count. This differs from a
  session, whose silence timer starts only after a first note, because a capture has nothing
  rolling to read.
- **The silence timer.** Neither the home note that starts a Jam nor the doodle's notes start
  the session's silence timer: before phrase 1 sounds, only this section's rules end a Jam for
  silence. From phrase 1 on, the silence timer works as after a Start click in v2: it waits for a
  first note played from phrase 1 on. A Jam on a held doodle starts on phrase 1's first note, as
  v2 does.
- **The controller lost** during a fresh Jam's count-in, the capture, the generation measure, an extended wait or the
  read-in measure: the Jam ends at once, as a count-in end. From phrase 1 on, v2's 30-second
  reconnection rule applies. A Jam on a held doodle has no capture, so it follows v2's rule from
  its count-in on.
- **Stop, a hidden tab, or a staff that can no longer be shown** before phrase 1 sounds: as a
  count-in end.
- **Every rung fails** by the deadline: C5.7.
- **A doodle of one note** is a doodle. It shapes little, and gives no key and mode suggestion
  (C6.3).

### C5.14 The doodle's two forms

- **Settled before v3.2:** played notes leave the device only through the played-notes export, and
  are stored only after "Keep my played notes" (Part A §5.3), because the player's own notes are
  the most private data the app holds, and keeping the music should not imply keeping them. The
  replay key never holds played notes.
- **v3.2: the quantized doodle is a generation input the player gave on purpose**, and travels
  with the music: in each Jam phrase's generation request, the replay key, a kept Jam session
  (without the played-notes opt-in), the review's doodle section and the generated-notes export.
- **The raw doodle notes stay played notes**, under every played-notes rule: in memory unless
  "Keep my played notes" is on, shown only in the `Played notes` lane, and leaving the device only
  through the played-notes export.
- **Deleting** a kept Jam session deletes its doodle in both forms. Deleting a session's played
  notes (one session, or every session) deletes the raw doodle notes and keeps the quantized
  doodle, which belongs to the music.
- **Nothing is sent**, in either form; the replay key is still printed to the console only.
- **Rejected alternative:** the quantized doodle as played notes. A kept Jam session would then lose
  its doodle after a reload unless the player had opted in, and a replay key could not reproduce a
  Jam phrase.
- This narrows guarantees on the declared-intent contract (C13); **the owner confirms their exact
  wording at the review of this Part C**.

### C5.15 The review and the exports

- **The doodle opens the review**, before phrase 1, as its own labelled section, engraved from the
  quantized doodle in written pitch, in the key signature the Jam started with: what the app heard.
  It has no phrase number, no chord symbols, and cannot be a favorite; its notes are not expected
  notes, so nothing in it is ever acknowledged. It engraves what the app used, not a record of the
  playing; the `Played notes` lane keeps that.
- **The `Played notes` lane**, when shown, covers the raw doodle notes too, under the stray-note
  rule of Part A §9.
- **The key and mode suggestion**, when there is one, and **"Jam again on this doodle"** show in
  the review (C6.4, C5.11).
- **The session list** marks a Jam session as such.
- **Exports.** In both scopes (the whole session and its favorites):
  - the **generated-notes export** (MusicXML and MIDI) opens with the quantized doodle as its own
    section marked "Doodle", with no backing under it in the MIDI file;
  - the **played-notes export** opens with the raw doodle notes in the same section (v2 drops every
    note before phrase 1); other notes played before phrase 1 (count-in, generation and read-in
    measures, an extended wait) are still dropped; very short notes follow the export's stray-note
    option;
  - **both files still line up**: the doodle section starts at time zero in both, as many measures
    long as the doodle, and phrase 1 follows at the next barline; the waiting measures between them
    are not written. A raw note running past the section's end stops there. In a Jam on a held
    doodle, the played-notes file keeps the section, with no notes in it.

## C6. The key and mode suggestion

### C6.1 What it is

- **Suggest only; the player confirms.** The player's selected key and mode stay authoritative; the
  app never switches them on its own. This governs the suggestion only: Vary settings keeps moving
  the key and mode when the player has turned it on.
- **A weighted draw when several answers fit**: the app rates them and "casts a dice", so the
  likeliest answer comes up most often. The draw is seeded. The player confirms the drawn answer.
- It comes from the research note [key and mode estimation](../../../docs/music/key-and-mode-estimation.md),
  reimplemented in TypeScript (the libraries found are under a licence the project cannot use, or
  in another language).

### C6.2 The method

- **Input: the quantized doodle**, after the stray-note filter. Lengths are in ticks, so the whole
  computation stays in integers.
- **Score all 84 key and mode pairs** (12 keys × the 7 modes Ionian to Locrian; Major and Minor are
  scored as Ionian and Aeolian). Each note scores by its role in the candidate, weighted by its
  length: home note 0.200, fifth 0.165, third 0.145, each of the other four notes 0.1175, a note
  outside the mode 0.004. Cues: the last note counts ×2 and the first ×1.5 when it is the
  candidate's home note; a note starting on beat 1 or 3 counts ×1.5; lengths count between half a
  beat and a beat and a half (clamped). These are starting values, stored as integer penalties in
  thousandths, and checked at the owner's listening check.
- **Equal chances for all seven modes beforehand, and no head start for the player's current
  selection.** "Nothing is suggested when the selection is among the kept candidates" (C6.3)
  already lets the player's choice win every close call. Locrian, which ties with Phrygian when the
  fifth is missing, stays equal until listening shows it surprises players.
- **Keep at most 3 candidates, each within half the best one's chance.** Ties are ordered by
  penalty, then home note C to B, then mode Ionian, Dorian, Phrygian, Lydian, Mixolydian, Aeolian,
  Locrian, so a three-way cut is always the same.
- **Draw among them in integers only**: floating-point functions such as `Math.exp` can differ
  between browsers.
- **The seed is the quantized doodle alone**: a 32-bit FNV-1a hash of its notes (ticks and concert
  pitches), read with a hash tie key of its own (`infinite-flow/key-suggestion/v1`), like the
  generator's tie keys. So **the same doodle always gives the same suggestion**, across sessions and
  reloads; two live doodles are practically never identical, so the dice still varies. A draw seeded by
  the session would differ from one Jam on the same doodle to the next, so the session's seeds
  (Part A §8) are not used.
- **Computed in concert pitch, named in written pitch.** "The selection is among the candidates"
  compares Major as Ionian and Minor as Aeolian, since they hold the same notes.
- **A preset's [key and mode restriction](../../../docs/music/lexicon.md#key-and-mode-restriction)
  neither bounds nor reweights the candidates**: the suggestion reports what the doodle sounds in,
  and v3.1's restriction guides, never blocks.
- **The suggestion changes no phrase** unless the player confirms it, and then only as a key and
  mode setting change. No replay key carries it; a confirmed suggestion is recorded as the settings
  it set.
- **Cost**: integer arithmetic over at most a few dozen notes, far under a millisecond; computed
  during the generation measure, outside the time budget.

### C6.3 When nothing is suggested

- **Too little material**: fewer than 5 pitch classes, 6 notes, or 2 beats of sounding time after
  the filter. Nothing is shown about it: a short doodle is normal, not a failure.
- **The selection is among the kept candidates**: the doodle fits the selection; nothing is shown.
- **Under 80 % of the doodle's weighted length fits the winner**: the doodle uses notes the app's
  modes do not offer, such as harmonic minor or blue notes. The review then says so in one plain sentence, in
  every review of that Jam, kept ones included, without naming a "wrong" note.
- **A Jam whose phrase 1 never came** has no review, so no suggestion.

### C6.4 Where and when it is shown

A running session never asks the player for anything, and the doodle is only known once the Jam has
started. So the suggestion is never offered during a Jam.

- **Computed** when the doodle ends, during the generation measure; nothing is shown then.
- **Shown in the review of that Jam**, beside the doodle section: the drawn key and mode, in
  written pitch, with **Use it**, **Keep mine** and **Jam again on this doodle**.
- **Shown in the review of a kept Jam session**, recomputed (the method is deterministic) against
  the player's current selection: shown while that selection is not among the kept candidates and
  the player has not declined it.
- **At Idle with a held doodle**, it stays shown until the player answers it or the doodle is
  dropped; dropping the doodle drops its suggestion.
- **Only the drawn answer is shown**; the other kept candidates are not listed.
- **Accepted consequence**: the Jam that produced the doodle is always continued in the player's own
  key and mode; the suggestion serves the next Jam on that doodle. A two-step Jam (capture, back to
  Idle with the suggestion, then Start) was rejected: it breaks the continuous doodle-then-phrases
  flow.

### C6.5 Use it, Keep mine and Jam again on this doodle

- **Use it** sets Written key and Collection exactly as a change by hand does: saved like any
  setting; pre-generated phrases discarded; under a v3.1 preset whose restriction excludes the
  answer, the selection becomes [Custom](../../../docs/music/lexicon.md#custom) (B6.4). With a held
  doodle it is the one key and mode change that keeps the doodle: phrase 1 is regenerated from it in
  the new key and mode, so the next Jam continues the doodle in the key and mode it sounds in.
  Without a held doodle nothing is regenerated, as after any change at Idle; in Jam mode no phrase
  shows at Idle, so the next Jam simply generates in the new key and mode.
- **Labels follow the player's family.** With Major or Minor selected, an Ionian answer reads (and
  sets) "Major" and an Aeolian one "Minor" (the app's Major and Minor use the tonal chord plan, its
  modes the modal one). Any other answer is named as its mode, and Use it then moves the Collection
  from the Major and Minor group to the modes; the player's confirmation is what allows that, since
  Vary settings never crosses between the two groups.
- **Keep mine** changes nothing, and that doodle's suggestion is not offered again: the same doodle
  would give the same answer. The decline is kept with the kept Jam session, so its review, and a
  doodle held from it, do not offer it again.
- **Jam again on this doodle**: C5.11. Choosing it does not answer the suggestion.
- **Vary settings is unaffected**: when on, it moves from the confirmed key and mode during the next
  session.

## C7. The rhythm lock

### C7.1 The switch and what is locked

- **The rhythm lock is a switch of its own**, off by default, set at Idle or in the review, saved
  like the three "During a session" options. Presets neither hold nor change it. It is not part of
  the Custom note density (v4).
- **The lock is strict.** It fixes every note start and length, and so every rest, across the four
  measures; the pitches keep changing. It lasts for the session.
- **Outside a Jam, the locked rhythm is phrase 1's**: the phrase on screen at Start. Regenerating
  at Idle changes it. At the session's end the locked rhythm is not kept as a setting; a kept
  session keeps it only inside its phrases' reproduction inputs (C11).
- **In a Jam, the locked rhythm is phrase 1's, chosen nearest the doodle**: with the lock on,
  phrase 1's rhythm candidates are ordered by distance to the doodle only (total edits, C8), closest
  first, whatever the drift, and the rhythm chosen is locked. A held doodle's phrase 1, generated at
  Idle, is chosen the same way. A phrase 1 from the doodle-free last rung (C5.7) keeps the rhythm it
  came with, which the lock then holds.
- **Phrase 1 never takes a rhythm change**: it is the locked rhythm.
- **Narrow windows.** When a session steps the note density down from Sixteenth to Eighth under
  v2's narrow-window rule ([v2 master spec §5](../v2/master-spec.md#5-control-changes-during-a-session))
  and the locked rhythm uses sixteenth notes, the first phrase generated with Eighth takes the
  nearest Eighth rhythm (total edits, C8), and that rhythm becomes the locked one for the rest of
  the session. That phrase draws no rhythm change (C7.4): it is the new locked rhythm itself.
- **What the lock is not**: the doodle's exact rhythm as played; that needs v4's rhythm editor.

### C7.2 Allowed rhythm changes: the option

- **A list of five kinds of edit, each on or off, all off by default**, so the lock is strict by
  default. Set at Idle or in the review, saved like the session options; presets neither hold nor
  change it.
- **It acts only while the lock is on.** With the lock off the list is kept and does nothing.
- **Each change lasts one phrase**: the next phrase returns to the locked rhythm. So, while the lock
  is set, a change can never alter the rhythm durably.

### C7.3 The five kinds, and the known limit

**One change** is one edit of an allowed kind, made in one measure, or made in a gesture measure
(1 or 2) and repeated in its answer measure (3 or 4). The second form is needed because the rhythm
grammar builds measures 3–4 as a varied copy of measures 1–2: a split, a merge or a note turned into
a rest in the gesture always comes back in the answer, and the grammar cannot write it alone.
Repeated that way, a change keeps the phrase's gesture and answer and stays, measure by measure, a
Close or Near edit. Rhythms are compared by their written bars.

Each kind is a Close or Near entry of the
[mutation catalogue](../../../docs/music/mutation-catalogue.md#rhythm-mutations) that the grammar can
write as one of its own rhythms. The shares are the measured share of locked rhythms that have at
least one such change available, over all supported settings.

| Kind | What it does | Distance | Where the grammar offers it |
| --- | --- | --- | --- |
| **Move a note start** by a sixteenth or an eighth | Pushes or pulls one note's start, which also covers dotting or undotting a note; the number of notes stays, so the eye finds the same notes | Close (Near on beat 1 or 3) | In one measure, from a second answer change (tension Build or Edge) and from Occasional offbeats; repeated in measures k and k+2 under most settings. The widest of the five: 11–93 % depending on settings |
| **Move a rest** | The rest keeps its length and the phrase its silence; only its place moves | Close (Near off the density's grid) | In one measure under Occasional offbeats and Active displacement, and at Build and Edge; repeated under Active displacement |
| **Split a note** | One note becomes two | Close (Near on beat 3) | Only repeated in k and k+2; never under Strict variety. Common where it exists (about 70 % of locked rhythms under Straight with Slightly or Heavily varied) |
| **Merge two notes** | Two notes become one | Close (Near when the removed start was on beat 1 or 3) | Only repeated in k and k+2; never under Strict variety (7–19 %) |
| **Add or remove a rest** | A note becomes a rest, or a rest a note | Close (Near on beat 1 or 3) | Only repeated, in measures 2 and 4 or 1 and 3; 5–18 % |

Left out, with the reason: a tie added or removed (it changes how a rhythm is written, not how it
sounds: nothing for the ear, a cost for the eye); a note and the rest beside it trading places (not a
catalogue entry of its own, rare, measure 2 only); a density step on one beat, regrouping into
3 + 3 + 2, an anticipation held across the beat (the grammar cannot write them as one edit); a
repeat with a changed ending (every phrase already does it); Related and Loose entries (far beyond
"small", mostly not writable). Wider options are v4.

**The known limit.** Which changes exist depends on the rhythm settings. **Under Strict variety
with Straight syncopation the grammar offers almost no allowed rhythm change**: with Eighth, only
adding or removing a rest; with Sixteenth, none; Quarter with Strict and Straight has a single
rhythm, so nothing to change to. Strict variety never offers a split or a merge. A list that finds
nothing simply leaves the lock strict (C7.4). Widening this is grammar work, v4. The option's
description tells the player that what it offers depends on the rhythm settings.

### C7.4 When a phrase changes

- **At most one change per phrase**, never on phrase 1, nor on the phrase that re-locks after a
  narrow-window step-down (C7.1).
- **A seeded share of phrases**: each phrase from phrase 2 on draws whether it changes, **1 in 4**
  normally and **1 in 2** on a tenser phrase. A tension step made by Vary settings is a setting
  change, not a tenser phrase. These figures are starting values, tuned at the listening check.
- **The draw is seeded by the phrase's own seed**, through a hash tie key of its own
  (`infinite-flow/rhythm-change/v1`), inside generation: the generator stays a pure function of its
  request, and a pre-generated phrase draws exactly as the session would.
- **Which change**: among the phrase's rhythm candidates whose bars differ from the locked bars by
  exactly one change of an allowed kind (C7.3), in seeded order; every allowed kind is pooled, so a
  kind with more candidates comes up more often. A change is always measured from the locked
  rhythm, never from the previous phrase, so changes never add up.
  A candidate that also differs by a tie added or removed elsewhere is not exactly one change, so
  it is never drawn as one; bars are compared as written.
- **No candidate, no change**: when no candidate exists for any allowed kind, the phrase keeps the
  locked rhythm; nothing is shown, and the session history records it.
- **A change is never shown**: nothing in the live view, the review or the exports marks it. The
  player reads the notes as written; v2 likewise never marks a repeated phrase or an automatic
  setting change.
- **The next phrase returns** to the locked rhythm, or draws afresh.

### C7.5 The forced bend

- **When**: the locked bars are not among the phrase's rhythm candidates (a tension step can change
  which rhythms exist, C7.6), or no phrase can be found with them on the rung being tried.
- **What**: the phrase takes the nearest rhythm among its candidates that makes a phrase, by total
  edits (C8), then seeded order. A rhythm that sounds the same but is written with other ties is at
  distance 0, so it comes first. It is recorded in the session history only, never shown, and the
  next phrase tries the locked rhythm again.
- **Not a player option**: it cannot be turned off, and it happens with an empty list too. It is
  what lets a strict lock meet Tension across phrases without ever failing a phrase because of the
  lock.

### C7.6 How the search holds the lock

Facts from the code (re-checked 2026-10-08,
[jam-grounding §D](jam-grounding.md#d-re-check-2026-10-08)):

- Each rhythm candidate has a stable index and identity, independent of the seed; but identical
  rhythms carry different identities, and **no existing key compares bars**.
- **Tension is part of what selects the rhythm candidates.** Settled and Lift hold the same rhythms,
  and so do Build and Edge; every Settled or Lift rhythm is also among Build's and Edge's; 58 % of
  Build and Edge rhythms (those with two answer changes) are missing at Lift. So the locked rhythm
  can be lost only on a **step down from Build to Lift**: Tension across phrases' fourth phrase of
  each group when the chosen tension is Build, Vary settings' Tension step from Build to Lift, and
  the narrow-window step-down.
- The search tries every rhythm with one chord plan before the next chord plan: a locked rhythm
  merely placed first would give way to another rhythm on chord plan 1 before being tried on chord
  plan 2.

The rules:

- **The locked rhythm is matched by its bars**, the note starts and lengths of its four measures,
  not by index or identity, among the candidates of the phrase's own settings.
- **Under the lock, the phrase's rhythm is tried with every chord plan before any other rhythm**:
  the drawn change's candidates first when the phrase changes, then the locked bars, then the
  forced bend's order. This is an order inside the rhythm stage and the search, not a constraint: every
  phrase possible today stays possible, and no stage revises another.
- **Every rung of the failure ladder keeps the lock**, the standalone attempt included.
- **Cost at 240 BPM**: keying a domain of up to 2,932 candidates by bars takes about 10 ms once per
  domain; finding the locked rhythm and its one-change candidates takes under a millisecond per
  phrase (Node figures). The browser sweep confirms it against the standalone reserve and the
  phrase deadlines, which are unchanged.

### C7.7 What the lock meets

| It meets | Rule |
| --- | --- |
| Note density, rhythmic variety, syncopation, silence density | Locked for the session, as every setting is (v2 §5). Vary settings may not change them while the lock is on (C9). The locked rhythm came from their candidates, so it fits their limits. |
| Tension | Still changes each phrase's melody, harmony and Tension's scheduled figure. A phrase whose candidates lack the locked bars takes a forced bend. |
| Tension across phrases | As Tension. With allowed rhythm changes, its tenser phrases draw a change more often (C7.4). |
| Vary settings | The Rhythm group is ineligible while the lock is on; every other allowed group works as before. A Tension step is handled like Tension across phrases' (forced bend when the bars are missing). Figure steps (figure levels, B8.1) never touch rhythm. |
| Narrow-window step-down | C7.1. |
| Pre-generation | Pre-generated phrases follow the lock and its draws, as the session would. Switching the lock, or changing the allowed rhythm changes, at Idle discards them. |
| Jam | Phrase 1 is the rhythm nearest the doodle; then the lock, not drift, decides the rhythm. Drift still shapes the melody. |
| Replay key and kept sessions | C11. |

## C8. Jam's drift

- **Three positions, closest first: Close, Near (the default), Free.** Shown only while Jam is on;
  saved like the session options; set at Idle or in the review; presets neither hold nor change
  it. A fourth, Related, waits for operations the generator cannot do yet.
- **What each position does:**

  | Position | Rhythm | Melody |
  | --- | --- | --- |
  | Close | Candidates with every measure Same or Close to the doodle's come first | Follows the doodle's moves: direction and size (step, skip, leap) |
  | Near | Every measure at most Near | Follows the doodle's directions only |
  | Free | Seeded order, as without a doodle | No preference; only the join from the doodle's last note |

  With the rhythm lock on, the Rhythm column applies to phrase 1 only, through "nearest the
  doodle" (C7.1); the Melody column applies to every phrase.
- **The distance, measure by measure.** Compare a candidate's measure with the doodle's measure
  laid over it (C5.9), as two lists of note starts and rest starts in ticks. An **edit** adds one
  start, removes one, moves one by at most an eighth note, or turns a note start into a rest start
  at the same tick or back (one edit, not two). Ties are not starts. No edit is **Same**. One edit away
  from ticks 0 and 8 (beats 1 and 3) is **Close**. One edit touching tick 0 or 8, or two Close
  edits, is **Near**. Anything more is beyond.
- **Within a position's band** (every measure inside it), candidates keep their seeded order, so
  phrases still vary. **Outside it**, they come by their total number of edits over the four
  measures, fewest first, then seeded order, so a doodle far from everything the settings allow is
  still approached. The same total orders "nearest the doodle" under the lock (C7.1), the
  forced bend (C7.5) and the narrow-window step-down (C7.1), against the locked rhythm for the last two.
- **The catalogue's mutations, as unlocked here.** A Close or Near mutation is reached by choosing a
  candidate rhythm at that distance from the doodle, not by an operation applied to the doodle. The
  catalogue's Close and Near rhythm entries the grammar can write are covered that way; the others,
  and the melodic ones (sequence, interval expansion, fragmentation), are later.
- **Listening check before the gate**: the owner ranks a handful of examples by ear before the
  scale drives the control.

## C9. Vary settings' allowed groups

- **Six groups**, each switching its settings on or off together:
  - **Key and mode**: written key, collection.
  - **Harmony**: harmonic motion.
  - **Tension**: tension.
  - **Rhythm**: note density, rhythmic variety, syncopation, silence density.
  - **Melody shape**: contour, register, leapiness, arpeggio chaos.
  - **Figures**: the figure step, one embellishment figure's level moving one step (v3.1, B8.1).
- **Default: all six on**, which is Vary settings as it is. The groups are saved with the option,
  set at Idle or in the review, and presets neither hold nor change them.
- **Under a v3.1 preset with a key and mode restriction**, the Key and mode group's moves stay
  inside the restriction in force at the session's start (B8.1).
- **The Rhythm group is ineligible while the rhythm lock is on.**
- **The legal-move check.** Vary settings needs at least one move, from the current settings, onto
  a supported combination, among the eligible groups (the Rhythm group not counting under the
  lock, the Key and mode group counting only for moves inside the restriction in force). When there
  is none, Vary settings cannot be turned on and says why. When a later change at Idle (the groups,
  the lock, a preset, a setting) leaves none, Vary settings becomes unavailable and says why, the
  player's choice kept, as the Jam switch does without a controller; it comes back as soon as a
  move exists again. A session started meanwhile runs without it.
- **During a session**, a reached setting can always step back to where it came from, so a dead end
  can only appear after the narrow-window rule changed what is supported. That mutation is then
  skipped and recorded in the session history, and the next one is drawn as usual: a narrow
  exception to v2's "a mutation cycle is never silently skipped". Nothing throws.

## C10. How v3.2 meets v3.0 and v3.1

### C10.1 Presets and the key and mode restriction (v3.1)

- **Presets hold none of v3.2's settings** (the Jam switch, the drift, the rhythm lock, its allowed
  changes, the allowed groups), and choosing a preset changes none of them. Richer presets with
  rhythm cues are later.
- **The suggestion ignores the restriction** when it computes (C6.2). Using an answer outside the
  restriction in force is opting out, like any key or mode chosen by hand: the selection becomes
  Custom, based on the preset. Whether the suggestion marks such an answer, in line with the
  restriction's highlight, is `ux-writer`'s call.
- **Vary settings' Key and mode group** stays inside the restriction in force (C9).
- **Figures**: the doodle does not favor the figures it contains; the levels act as in v3.1, and
  the doodle's melody preference orders candidates within the existing ranks (C5.9).

### C10.2 Saving the new settings (v3.0 storage)

- **Saved automatically**, under Part A §4.2's rule (at once, never during a session): the Jam
  switch, the drift, the rhythm lock, the allowed rhythm changes and Vary settings' allowed groups.
  Each comes back as the player left it; Jam and the lock come back on only if the player turned
  them on.
- **Tolerant loading** (Part A §4.4): an unknown or invalid value takes its default (Jam off, drift
  Near, lock off, every allowed rhythm change off, all six groups on); every other saved setting
  still loads. Settings saved by v3.0 or v3.1 load with these defaults.
- **Not saved**: a held doodle, which lives in memory only (C5.11).

### C10.3 Kept sessions and played notes

- **A Jam session is kept like any session** (Part A §5.1): the most recent automatically, pinned
  ones for good, favorites pinning their session. A Jam that ended before phrase 1 sounded changes
  nothing that is kept.
- **What a kept Jam session adds** (C11): the quantized doodle with its capture tempo, the declined
  suggestion, and, in each phrase's reproduction inputs, the doodle, the drift and the rhythm-lock
  data. The raw doodle notes follow "Keep my played notes" like every played note (C5.14).
- **Sessions kept before v3.2** have no doodle and open as before.

### C10.4 Visits that save nothing (outdated tab, failed read)

In an outdated tab (Part A §4.3) and in a visit whose saved data could not be read (Part A §4.4),
Jam, its review, the suggestion with Use it and Keep mine, and "Jam again on this doodle" work in
memory for the visit; nothing is saved, the decline included, and the visit's deletion rules are
unchanged. A kept Jam session written by a newer version is listed as such and does not open, as
any such session.

### C10.5 Pre-generation (v3.0)

- **Discarded, at Idle**, by any change of the Jam switch, the drift, the rhythm lock, the allowed
  rhythm changes or Vary settings' allowed groups, whether or not the change acts on phrases at that
  moment (as v3.1 does for the restriction in force: simpler, and rare). With a held doodle, such a
  change also drops the doodle (C5.11).
- **In Jam mode without a held doodle, pre-generation does not run**: phrase 1 depends on notes
  played after Start. With a held doodle, it runs, and pre-generated phrases carry the doodle, the
  drift, the lock and its draws exactly as the session would.

### C10.6 Stray notes (v3.0)

The doodle reads played notes through the stray-note filter (Part A §9 named Jam as one of its
readers): a very short note never starts, extends, ends or shapes a doodle, never counts for the
30-second wait, and never feeds the suggestion. Raw doodle notes are stored as received, like every
played note, and filtered on reading.

### C10.7 Delete everything and "Your data"

Delete everything removes every kept Jam session with its doodle in both forms, and resets v3.2's
saved settings to their defaults with every other setting. "Your data" counts Jam sessions among
the kept sessions; it lists nothing new.

### C10.8 Other session rules

- **Phone width**: below the tablet-landscape width a chosen Sixteenth generates as Eighth, in a
  Jam too; in a fresh Jam the session generates phrase 1 itself, so the step-down can apply from
  phrase 1.
- **Acknowledgement** is unchanged from phrase 1 on; the doodle's notes are never expected notes.
- **The Rising tempo** of a Jam counts from phrase 1 and starts from the tempo the doodle was played
  at.

## C11. The generation request, the replay key and kept sessions

- **The generation request** gains, on both the player-facing request and the resolved core
  request, and across the generation worker (re-validated there from untrusted input like every
  field): **the quantized doodle** (one to four measures of note starts and lengths in ticks, and
  concert pitches; its own type, since a phrase timeline is always exactly four measures), or none;
  **the drift**, with a doodle; **the lock**: off, on with nothing locked yet (a Jam's phrase 1, chosen nearest the doodle), or
  on with the locked bars; **the allowed rhythm changes**; and
  **whether the phrase is a tenser one**. The doodle's join into phrase 1 travels as a join (carry-in)
  of the "no chord, no arriving interval, no owed recovery" form, from no phrase. The capture tempo
  is not part of the request. Every ordering and draw derived from these is computed inside
  generation, so the generator stays a pure function of its request and a replay key replays
  without the app's state.
- **A new replay key version, `ifk4.`**, for every phrase: everything `ifk3.` carries (B9), plus
  the request's new fields above. A new version rather than an extension, so that a v3.1 app
  meeting a v3.2 key refuses it instead of replaying a different phrase without saying so. A
  four-measure doodle at sixteenth notes is at most 64 notes, about a kilobyte: no problem for a
  console line. The quantized doodle in the key is part of the contract change the owner confirms
  (C13). The key is still printed to the console only, never sent or stored.
- **Older keys keep decoding.** An `ifk1.`, `ifk2.` or `ifk3.` key decodes as no doodle, no lock and
  no allowed change, to the same phrase as in the version that wrote it. A later prefix is refused
  as an unsupported version, as today. The replay tool (`npm run replay:phrase`) decodes all four
  versions.
- **Determinism.** The same request and seed give the same phrase in Chrome and Edge, on any
  machine. New orderings break ties by the existing seeded key, then by index, in code-unit order
  (the rule adopted after the
  [locale-dependent order issue](../../../issues/Ref_20261007_locale_dependent_candidate_order.md)).
  Which ladder rung produced phrase 1 can depend on the machine's speed, as v2 accepts; what each
  rung generates never does.
- **Kept sessions.** Each kept phrase's reproduction inputs (Part A §5.2) gain the request's new
  fields. The session's record gains: whether it is a Jam session; the quantized doodle with its
  capture tempo; and whether the player declined its suggestion. These additions are **a new stored
  data version**, migrated when the database opens (Part A §4.3); sessions kept before v3.2 migrate
  with no doodle and are otherwise unchanged. The locked rhythm, the forced bends and the rhythm
  changes need nothing more: each kept phrase's inputs reproduce it, and its timeline is kept.

## C12. For the interface design

What the interface must support, for `ux-writer`. Behaviour only: layout, placement and wording are
`ux-writer`'s.

- **The Jam switch**: off by default; unavailable without a controller, saying why, with the
  player's choice kept and back when a controller attaches; set at Idle and in the review.
- **Idle in Jam mode**: the staff with the key signature only; the cue row naming the home note as
  the starting note. With a held doodle: phrase 1 on screen, the suggestion when there is one.
- **The Jam's cue row**: the count-in; the doodle's measures counted, one to four; "writing" during
  the generation measure and any extended wait; the read-in measure's beats. The live view never
  shows the doodle's notes.
- **The notice at Idle** when a Jam ended because the app could not write phrase 1 with these
  settings.
- **The review's doodle section**: first, labelled, before phrase 1, with no phrase number, no
  chord symbols and no favorite; the `Played notes` lane over it when shown.
- **The suggestion's three actions**: Use it, Keep mine, Jam again on this doodle; the drawn key and
  mode named in the player's family (Major or Minor, or the mode); the one plain sentence, in every review of that Jam, when
  the doodle uses notes the app's modes do not offer, never naming a wrong note; whether an answer
  outside a preset's restriction is marked, in line with the restriction's highlight.
- **"Jam again on this doodle"** also in a kept Jam session's review; unavailable without a
  controller, saying why.
- **The session list** marks Jam sessions.
- **The rhythm lock** and **its allowed rhythm changes**: five kinds, each on or off; a list that is
  kept but does nothing while the lock is off, and how that shows; a description saying that what
  the list offers depends on the rhythm settings (C7.3's known limit). No rhythm change and no
  forced bend is ever marked.
- **The drift**: three positions, shown only while Jam is on.
- **Vary settings' allowed groups**: six groups, all on by default; the reason when Vary settings
  cannot be turned on, or becomes unavailable, for lack of a legal move.

## C13. What v3.2 changes in v2, v3.0 and v3.1 guarantees and atoms

Each change is intended. Where a declared-intent entry is named, `documentalist` prepares the
change.

**Contract guarantees that change** (STABLE atoms on the contract surface). They need a major
contract version and **the owner's explicit confirmation of their exact wording**, given on 2026-10-08 apart from
approving this Part C.

- **Played-notes privacy** (`rule_optional_midi_privacy`): "no export other than the played-notes
  export ever carries them", "written to browser storage only ... while the player has opted in",
  "the only way a played note ever leaves the player's machine is the played-notes export". The
  **quantized doodle** is declared a generation input, not played notes: stored with a kept Jam
  session without the opt-in, carried by the generated-notes export (MusicXML and MIDI) and the
  replay key's console line. The **raw doodle notes** keep every played-notes rule. Nothing is
  sent.
- **The single starting note** (`rule_midi_starting_note`): "only one MIDI note can start a
  session: the note phrase 1 starts on". In Jam mode without a held doodle, the selected key (the
  home note) starts a Jam, with no phrase on screen.
- **The count-in shows phrase 1** (`rule_count_in_shown_on_screen`): "phrase 1's whole first
  measure stays fully visible throughout the count-in". In a Jam without a held doodle, no phrase
  exists during the count-in; the beats are still counted on screen.
- **The silence timer waits for a first note** (`rule_silence_timeout_ends_session`): "clicking
  Start and taking a moment before playing never times out". A Jam with no doodle note within
  30 s after its count-in ends; neither the home note that starts a Jam nor its doodle starts the
  silence timer, which from phrase 1 on waits for a first note as after a Start click.
- **A lost controller never ends a session at once** (`rule_controller_loss_mid_session`, "the
  session keeps running meanwhile"; `rule_controller_reconnection_window`, 30 seconds): a
  controller lost from a fresh Jam's count-in until its phrase 1 sounds ends the Jam at once; a Jam
  on a held doodle follows v2's rule.
- **The failure ladder** (`rule_session_generation_failure_ladder`): "a generation failure never
  stops the session", and "at Idle a phrase has no carry-in". A Jam's phrase 1 has its own
  three-rung ladder and three-measure deadline; if every rung fails, the Jam ends with no review;
  a held doodle's phrase 1 is generated at Idle with a join from the doodle (still no deadline).
- **A cancelled attempt never ends the session** (`rule_dropped_attempt_cancelled`): one
  exception, a fresh Jam's phrase 1 attempt cancelled at its three-measure deadline, which ends
  the Jam as above.
- **Phrase 1 is generated at Idle** (`rule_session_density_only_steps_down`: "Phrase 1 is the
  phrase already on screen at Start, generated at Idle; the session's own generation starts with
  phrase 2"): in a fresh Jam the session generates phrase 1, so the step-down can apply from
  phrase 1. `rule_multi_phrase_tension_arc_cycle`'s "(so phrase 1, generated at Idle, already
  fits)" is likewise wording only; the cycle still counts from phrase 1.
- **The join** (`rule_join_carry_in_limited`, "exactly four things cross the join ... nothing else
  is visible across the join"): the doodle reaches every phrase of a Jam as a generation input,
  not across the join; the doodle-to-phrase-1 join comes from no phrase and carries the last pitch
  and the window only. Likewise, with the rhythm lock on, the locked rhythm (phrase 1's, C7)
  reaches every later phrase of the session as a session-wide input, not across the join. A clarification; whether it counts as a change is `documentalist`'s call, for the
  owner to confirm.
- **The review's played notes** (`rule_review_played_notes_toggle`: played notes "shown only when
  the player turns a toggle on ... unquantized"; `req_last_session_review`): the review gains an
  always-shown doodle section engraved from the quantized doodle, as a generation input; the raw
  notes stay behind the toggle, unquantized. A clarification and an extension, no weakening.
- **Checked and unchanged**: `rule_tempo_never_affects_generation` (the capture tempo is never a
  generation input); `rule_repeat_phrase_marked_internally_only` (forced bends and rhythm changes
  are likewise never shown); `rule_midi_never_blocks_session` (Jam unavailable without a
  controller blocks nothing: Start runs a session as with Jam off).

**Other atoms and rules that change** (REVIEW or DRAFT):

- **The replay key** (`module_phrase_replay_key`): `ifk4.`; it holds the quantized doodle, the
  drift, the locked bars, the allowed rhythm changes and the tenser-phrase flag; its "holds no
  played notes" wording is read against the doodle's status. `rule_seeded_phrase_reproduction`,
  `module_generation_worker_protocol` and `module_generation_request_construction` gain the new
  request fields.
- **Candidate ordering** (`module_ranked_candidate_ordering`): it describes harmony and rhythm
  order as visiting candidates "without scoring or preferring any candidate over another", as
  current policy. The doodle's distance order, the lock's order and the forced bend's order prefer
  rhythm candidates; its wording is amended. Pitch ordering already prefers candidates.
- **The named-stream atom** (`module_named_stream_pseudorandomness`): it describes stages drawing
  from named streams of one seed; the code orders candidates by hash tie keys and uses only the
  indexed streams (for Vary settings), and v3.2's two new draws (the suggestion,
  `infinite-flow/key-suggestion/v1`; the rhythm change, `infinite-flow/rhythm-change/v1`) are hash
  tie keys too, with no new named stream. The atom's wording should follow the code.
- **The carry-in entity** (`entity_phrase_carry_in`): "derived from a successfully generated phrase
  and the ordinal it was given", a positive ordinal, and a null harmony "only when a setting change
  ... dropped" it: the doodle's join comes from no phrase, with no chord and no arriving interval.
- **Exports**: `req_played_notes_export` (notes before phrase 1 were never exported; the raw doodle
  notes now are, in their section); `rule_played_notes_export_aligns_with_generated_midi` ("phrase
  1 at time zero in both" becomes "the doodle section at time zero in both");
  `rule_generated_notes_midi_export` and `rule_generated_notes_musicxml_export` (open with the
  doodle section; "never holds played notes" and "quantizing it would misrepresent what was
  actually played" read against the doodle's status); `rule_favorites_only_export` (the doodle
  section in the favorites scope).
- **The starting note module** (`module_session_starting_note`): the home note in Jam mode.
- **Vary settings** (`req_settings_mutation_flag`: "eligible settings are every generation setting
  except instrument selection and tempo"; `rule_mutation_rerolls_unsupported_combination`: "a
  mutation cycle is never silently skipped"; `rule_mutation_draws_setting_then_direction`;
  `module_settings_mutation`): the allowed groups, the Rhythm group ineligible under the lock, the
  legal-move check, the narrow mid-session skip.
- **v3.0's atoms** (`rule_kept_session_content`, `req_kept_session_list`,
  `rule_kept_played_notes_deletable`, `rule_settings_saved_on_change`,
  `rule_saved_settings_load_tolerantly`, `rule_pregeneration_discarded_on_change`,
  `rule_delete_everything`): the doodle in kept sessions, the Jam mark in the list, deleting played
  notes keeping the quantized doodle, the five new saved settings and their defaults, the new
  discard triggers.
- **The vision** (`vision_infinite_flow_first_release`): its scope moves on with v3.2.

**Draft decisions this part replaces** (recorded before the v3.2 drafts): the lock holding "the
note starts on beats 1 and 3 and the number of notes in each measure" becomes the strict lock; "the
generation may bend the rhythm a little for tension and release" becomes the player's allowed
rhythm changes; at least one measure between the doodle and phrase 1 becomes two.

**Tests that change with them**: the starting-note and count-in tests (a Jam variant), the
played-notes export tests that drop every note before phrase 1, the export alignment test, the
replay key encoding tests (encoding becomes `ifk4.`; `ifk1.` to `ifk3.` decoding tests stay), the
worker's checks that refuse any extra request field, and the Vary settings tests that expect every
setting eligible and a throw when no move exists.

## C14. Existing code and risks

From the grounding research, re-checked against the code on 2026-10-08
([jam-grounding.md](jam-grounding.md), with file references).

- **The generation request is closed by construction**: any unknown field is refused, so the
  doodle and the lock data are amendments of the player-facing request, the core request, the
  worker protocol and the replay key, not optional extensions.
- **A phrase timeline is exactly four measures**; a one- to four-measure doodle needs its own type.
- **The join (carry-in)** carries the last pitch with its leap state, the register window, the final
  chord or none, and the phrase's ordinal. Its constructor refuses nine things, among them a pitch
  outside the window, an arriving interval over an octave, and an ordinal that is not a positive
  whole number. The doodle's join (no arriving interval, no chord, no recovery) fits all but the
  ordinal: **the join from no phrase is a code gap**, as is the replay key's "phrase number equals
  the carry-in's number plus one".
- **At Idle, MIDI is heard only to catch the starting note**; no click plays at Idle; the click and
  the count-in exist only in a session. Jam's capture happens inside the session, after its
  count-in, which has the click; but the session engine today always starts with a phrase on
  screen: **a session whose phrase 1 does not exist yet at Start** is new.
- **Nothing quantizes played notes** today, on purpose (the review and the played-notes export place
  them by exact times). The stray-note filter is v3.0's, being built.
- **Rhythm candidates are ordered by seed only**: a seeded hash per candidate, ties by index. The
  doodle's distance and the lock's order are new keys in front of it. The rhythm candidates are
  remembered per grammar version and five settings, tension included; prewarmed at Idle in small
  slices. The largest set has 2,932 candidates; the slowest to build has 1,797.
- **No key compares rhythms by their bars**: identities hold provenance and tension, and identical
  rhythms carry different identities (1,797 candidates, 1,435 distinct rhythms). **The bar key is a
  code gap**, cheap to fill (C7.6).
- **The pitch search** already orders candidates by a musical rank before its seed key; the
  doodle's move preference is a term within that rank.
- **Seeds**: on today's code each attempt's seed is a fresh random value and the only
  session-level seed is Vary settings' own; v3.0 fixes a session's seeds before Start for
  pre-generation (Part A §8), and a fresh Jam, with no phrase 1 at Idle, fixes them at Start.
  Either way, the suggestion's seed comes from the doodle alone, and the rhythm change's from the
  phrase's own seed.
- **Vary settings** cannot exclude a setting at run time, and throws when no move exists: **the
  allowed groups need a run-time exclusion** (code gap).
- **The replay key** in code is still `ifk1.` only; `ifk2.` (v3.0) and `ifk3.` (v3.1) are specified
  and being built. v3.2 depends on them.

**At risk:**

- **The generation budget at 240 BPM.** One measure is 1 s, shorter than the standalone reserve;
  the three-measure deadline leaves the doodle's rungs about 1.9 s. Ordering up to 2,932 rhythm
  candidates by distance, the lock's matching, and the pitch preference add work to every attempt,
  the standalone attempts of phrases 2 onward included. The lesson of the slow joining attempts:
  failures are the expensive case, and published latency figures do not show them; hence the sweep
  over doodles × settings, at 60, 120 and 240 BPM, lock on and off, before the gate.
- **The rhythm domains.** Under some settings the lock offers almost no allowed change (C7.3's
  known limit), and a step down from Build to Lift loses 58 % of rhythms, so forced bends are
  frequent with Tension across phrases at Build. The forced-bend rate is measured; a player may hear
  a lock that seems less strict than expected at Build.
- **The bar key** the code lacks: matching by identity instead of bars would silently break the
  lock across tension steps.
- **Reproducibility.** With Jam, the lock and the groups at their defaults, v3.2 must generate
  exactly v3.1's phrases; any extra draw or reordered tie breaks every existing key and fixture.
- **The session engine**: a session that starts without phrase 1, a capture state, a click
  independent of the click switch, a deadline counted from the generation measure.
- **The contract**: the guarantees of C13 change, which needs the owner's confirmation before the
  gate.
- **The first-load bundle budget** (Part A §4.3): the quantizer, the suggestion, the bar key and the
  new controls add code; `coding-leader` measures it.

## C15. Architectural decisions and their reasons

- **Jam is a mode, not a second Start button**, because a played note can then start a Jam without
  two starts competing for one note.
- **The doodle is captured inside the session, after a count-in, over the click at the selected
  tempo**, because the click sets the measure grid quantizing needs, and at Idle a doodle would
  collide with the starting note.
- **Quantize once, to the tick, and keep the quantized doodle as the input**, because times from
  the audio clock are not a stable key, and re-quantizing later would tie replay to the quantizer's
  version.
- **The doodle only orders candidates; it changes no setting and is never quoted**, because
  ordering keeps every phrase possible today possible (the failure ladder's evidence still holds),
  and quoting would make one generator stage depend on another's facts.
- **Planner authority unchanged: no stage revises another**, because the doodle enters as an
  ordering inside the rhythm and pitch stages and an input to register resolution, never as a
  revision.
- **Two measures before phrase 1**, because v2 promises one measure of read-ahead on screen at all
  times, and the generation needs a measure of its own.
- **A three-measure deadline with a doodle-free last rung**, because at 240 BPM one measure is
  shorter than the standalone reserve, and the reserve was measured on a doodle-free attempt.
- **The quantized doodle is a generation input; its raw notes stay played notes**, because the
  player gave the doodle to the app on purpose, a kept session and a replay key must reproduce a
  Jam phrase, and the playing itself stays the most private data the app holds.
- **The suggestion only after the Jam**, because a running session never asks the player for
  anything, and the player confirms the suggestion.
- **The suggestion seeded by the doodle alone, in integers**, because the same doodle should always give the same answer, whichever session it came from, and floating-point functions can
  differ between browsers.
- **The lock matched by bars and tried with every chord plan first**, because identities differ
  between identical rhythms and between tensions, and the search would otherwise drop the locked
  rhythm on the first chord plan.
- **A forced bend, never a failed phrase**, because a strict lock must still meet Tension across
  phrases and Vary settings' tension steps.
- **Rhythm changes last one phrase and are measured from the locked rhythm**, because a change may
  never alter the rhythm durably while the lock is set, and changes must never add up.
- **Rhythm changes drawn from the phrase's own seed, inside generation**, because the generator
  must stay a pure function of its request, and a pre-generated phrase must draw as the session
  would.
- **Changes and forced bends never shown**, because the player reads what is written, as v2 never
  marks a repeat or an automatic setting change.
- **Vary settings' allowed groups and Jam's drift kept apart**, because they answer two different
  questions: which settings drift during any session, and how far a Jam strays from its doodle.
- **Presets hold none of v3.2's settings**, because v3.1 presets are generation settings only;
  session modes and options are the player's own opt-in.
- **A new key version rather than an extended one**, because an older app should refuse a key it
  cannot honor rather than replay a different phrase silently.
- **New orderings break ties by the seeded key, then by index, in code-unit order**, because order
  must not depend on the browser's language.

## C16. Definition of done

v3.2 ships when every item holds, each verified by a named test or a recorded hand check.

**Jam**

1. **The Jam switch** is off by default, saved and restored, set only at Idle or in the review,
   untouched by presets; without a controller it is unavailable and says why, Idle and Start behave
   as with Jam off, and the player's choice comes back when a controller attaches.
2. **Idle in Jam mode** shows no phrase, only the key signature, and runs neither v2's Idle phrase
   rules nor pre-generation; turning Jam off leaves the workspace empty, as at first load,
   generating nothing until the player asks.
3. **Starting.** A Start click or the home note, in C5.2's octave, starts a Jam; no other note at
   Idle starts anything, in Jam mode or not; no note starts anything while a review shows; the
   doodle is captured only after the count-in.
4. **The click** sounds through the capture, the generation measure, any extended wait and the
   read-in measure whatever the click switch says; no backing sounds before phrase 1; the live view
   never shows a doodle note.
5. **The end rule.** The doodle ends on the first measure that begins with nothing sounding and
   stays silent, or after four measures, a held note cut there; a note played inside the generation
   measure cancels the attempt and extends the doodle; a measure beginning with a note still
   sounding is not silent.
6. **Very short notes** never start, extend, end or shape a doodle, never count for the 30-second
   wait, and never feed the suggestion.
7. **Quantizing** follows C5.5, tested on recorded doodles, including early notes onto beat 1,
   overlaps, chords and notes colliding on one tick.
8. **Phrase 1** is shown with one read-in measure before it sounds; when late, the wait grows by
   whole measures up to three measures after the generation measure began; the rungs run in C5.7's
   order, the last one doodle-free with the standalone reserve kept for it; when every rung fails,
   the Jam ends with no review, nothing kept, and the notice at Idle.
9. **The doodle changes no setting**; every phrase of a Jam obeys every rule its settings impose.
10. **Unchanged without the new inputs.** With the doodle and the lock withheld, a phrase's request
    and seed give v3.1's phrase byte for byte; with Jam off, the lock off and all six groups on,
    v3.2 generates exactly what v3.1 does, on a fixed sweep of seeds and settings.
11. **The join** from the doodle carries the last pitch with no chord, no arriving interval and no
    owed recovery; the register window follows C5.9; phrase 1 is generated without the join when the
    last note lies outside the window or the instrument's range.
12. **Drift's three positions** order rhythm and pitch candidates as C5.9 and C8 say.
13. **The sweep** over doodles × settings at 60, 120 and 240 BPM, with the rhythm lock on and off,
    is recorded: the share of phrase 1 generated with the doodle's join and with its preferences, the
    cost of the new orderings, no phrase repeated, and the standalone attempts within their reserve.
14. **The owner's listening check** of Jam is recorded: phrases at each drift position against a
    handful of doodles ("does it sound like my doodle?"), and drift's distance scale ranked by ear.
15. **The held doodle.** "Jam again on this doodle" is offered in the review of the Jam just ended
    and of every kept Jam session, turns Jam on, and needs a controller; the held doodle's phrase 1
    and pre-generated phrases are the phrases the Jam then plays; Regenerate, Use it and the end of a Jam played on it keep it, every other discarding change
    drops it; after a reload, it is offered again from the kept
    session and gives the same phrase 1 for the same settings and seed.
16. **Before phrase 1 sounds**, no doodle note within 30 s, a controller lost (in a Jam without a
    held doodle, from its count-in on), Stop, a hidden tab or
    a staff that cannot be shown end the Jam with no review and nothing kept.
17. **During the Jam** nothing is asked or offered; Vary settings, Tension across phrases and Rising
    tempo count from phrase 1.
18. **The review** opens with the doodle section as C5.15 says; the `Played notes` lane covers the
    raw doodle notes; the session list marks Jam sessions.
19. **The exports**, in both scopes, open with the doodle section as C5.15 says, and the two MIDI
    files line up; notes played before phrase 1 outside the doodle are never exported.
20. **The doodle's two forms.** With "Keep my played notes" off, no raw doodle note is ever written
    to storage, and the quantized doodle is; deleting a session deletes both forms; deleting played
    notes deletes only the raw ones; nothing is sent.

**The key and mode suggestion**

21. **Deterministic**: the same quantized doodle gives the same answer in Chrome and Edge, on any
    machine, across sessions and reloads, with integer arithmetic only.
22. **Nothing is suggested** below the thresholds, when the selection is among the kept candidates,
    or when under 80 % of the doodle fits; the last case is said in one plain sentence, in every review of that
    Jam, with no "wrong" note.
23. **Where**: only in a Jam's review, a kept Jam session's review and at Idle with a held doodle,
    never during a Jam; only the drawn answer.
24. **Use it** changes Written key and Collection exactly as a change by hand does (Custom under an
    excluding restriction; the family's labels; a crossing to the modes only on confirmation), and
    with a held doodle regenerates phrase 1 from it; **Keep mine** changes nothing; a declined
    suggestion is never offered again for that doodle, after a reload included.
25. **The owner's listening check** of a handful of doodles and their suggestions is recorded.

**The rhythm lock**

26. **Strict.** With the lock on and the allowed rhythm changes empty, every phrase of a session has
    phrase 1's rhythm exactly (every note start and length, every rest), apart from forced bends,
    whose rate over the sweep is recorded.
27. **Allowed changes.** No phrase makes more than one change; every change is of an allowed kind
    and measured from the locked rhythm; phrase 1 never changes; the phrase after a change returns
    to the locked rhythm; over the sweep the share of changed phrases is near 1 in 4, and near 1 in
    2 on tenser phrases; the share of draws with no candidate is recorded.
28. **Never shown**: no rhythm change and no forced bend is marked anywhere: live view, review,
    exports.
29. **Search order.** Under the lock, the phrase's rhythm is tried with every chord plan before any
    other rhythm, on every rung of the ladder.
30. **Jam and narrow windows.** In a Jam with the lock on, phrase 1's rhythm is the candidate nearest
    the doodle; after a narrow-window step-down, the first Eighth phrase's rhythm is locked for the
    rest of the session.
31. **Pre-generated phrases** under the lock, changes included, are the phrases the session plays.
32. **The owner's listening check** of the allowed rhythm changes, each kind on a handful of locked
    rhythms, is recorded.

**Vary settings' allowed groups**

33. All six groups reproduce today's Vary settings byte for byte; the Rhythm group is never moved
    under the lock; Key and mode moves stay inside the restriction in force; with no legal move,
    Vary settings cannot be turned on, or becomes unavailable, and says why, the choice kept; a
    mid-session dead end skips one mutation, records it and never throws.

**Across the release**

34. **Persistence.** The Jam switch, the drift, the lock, the allowed rhythm changes and the groups
    survive a reload; presets never hold or change them; invalid saved values load as their
    defaults; v3.0 and v3.1 settings load with the defaults.
35. **Pre-generation** is discarded by any change of those five settings at Idle, and runs in Jam
    mode only with a held doodle.
36. **Visits that save nothing**: in an outdated tab and after a failed read, a Jam runs, reviews,
    suggests and holds its doodle in memory, and saves nothing.
37. **Replay keys.** v3.2 writes `ifk4.` for every phrase; every Jam, locked, changed, forced-bend
    and drifted phrase replays from its key; every `ifk1.`, `ifk2.` and `ifk3.` key decodes to the
    same phrase as in the version that wrote it; a later prefix is refused; the replay tool decodes
    all four.
38. **Kept sessions** hold C11's additions under a new data version; sessions kept before v3.2
    migrate and open as before.
39. **Delete everything** removes every Jam session and its doodle and resets v3.2's settings.
40. **v3.1, v3.0 and v2 behaviour otherwise unchanged**: their test suites pass, apart from the tests
    C13 lists as changing, each replaced by its v3.2 counterpart.
41. **The declared-intent contract** reflects C13's guarantee changes, with the owner's explicit
    confirmation of their wording recorded.

## C17. Deferred and open

- **Measured before the gate, not open questions**: the cost of the new orderings and the sweep
  (C5.8, C16 item 13); the forced-bend rate; the share of rhythm changes, starting at 1 in 4 and
  1 in 2 (C7.4); the suggestion's shares and cues, and whether Locrian needs a handicap (C6.2);
  drift's distance scale by ear (C8).
- **Code gaps for `coding-leader`, not open design**: the doodle's own type in the request; the join
  from no phrase; the bar key; the run-time exclusion in Vary settings; a session that starts
  without phrase 1.
- **From the owner**: nothing more. Part C was approved, and the contract wording in C13 was
  confirmed word for word, on 2026-10-08.
- **For `documentalist`**: the declared-intent changes of C13, and the lexicon entries for v3.2's
  terms (C4).
- **Design, for `ux-writer`**: C12.
- **Deferred to later versions:**
  - the doodle's exact rhythm, through v4's rhythm editor;
  - wider rhythm mutations (changes that stay, the larger catalogue mutations, mutations under the
    editor's rhythm), and widening the grammar so Strict variety with Straight syncopation offers
    rhythm changes: v4;
  - quoting the doodle inside a phrase, developing it by named operations, choosing chords to fit
    it, and drift's fourth position: later, reopening how the generator's stages relate;
  - a new doodle during a running Jam, by a played signal: v3.x at the earliest;
  - the tempo inferred from a doodle played freely: a later candidate;
  - a drone under the doodle: a later candidate;
  - favoring the figures found in the doodle; presets holding Jam's settings or rhythm cues (the
    richer presets);
  - a doodle taken from a file or a past session: around v5.

## C18. Access model

Unchanged from Part A §15: exactly one local user, with no accounts, roles, permissions or
sharing. Whoever has the page open can do everything the app offers, Jam included. Kept Jam
sessions and their doodles join the data kept for "whoever uses this browser profile on this
device"; Delete everything removes them. The quantized doodle leaves the device only in the
generated-notes export the player triggers, and the raw doodle notes only in the played-notes
export; the replay key's console line stays on the device.

## Part D — v3.3

Richer chords (optional): seventh chords. Its sections are numbered D1 to D17; a cross-reference to one carries a section sign (§D5), never to be read as a decisions-log entry. Master spec v1.1 (2026-10-12; v1.1 makes §D5.2 and §D5.3 agree that the triad fallback is per phrase, and sets the top level's share), consolidated from the
v3.3 direction in the [v3 notes](README.md#v33--richer-chords-optional) and the chord research
[docs/music/chord-research.md](../../../docs/music/chord-research.md), which keeps the sources, the
construction tables and the code and atom references line by line. **Awaiting the owner's
approval.** Its behaviour adopts the research's recommendations; where the research left a point
open, this part proposes an answer and says so. The contract wording it changes (§D12) needs the
owner's explicit confirmation, separately from approving this part. v3.3 is built on v3.0, v3.1 and
v3.2 (Parts A, B and C): their storage, presets, [figure levels](../../../docs/music/lexicon.md#figure-level),
Vary settings' allowed groups, Jam and `ifk4.` replay key must exist first.

Music terms are explained the first time they appear; the project's
[lexicon](../../../docs/music/lexicon.md) has one entry per term.

## D1. Core concept

Until v3.3 every chord the app writes is a **[triad](../../../docs/music/lexicon.md#triad)**: three
notes stacked in thirds (every other note of the scale), such as C–E–G. Each chord is built from
the selected key and mode, so its **[quality](../../../docs/music/lexicon.md#chord-quality)**
(major, minor or diminished, set by the exact distances between its notes) comes from them. Even
under the Jazz preset, all chords are plain triads.

The owner asked for richer chords, optional, with flags the player sets in the app. v3.3 gives the
player one thing:

- **A Seventh chords level.** A **[seventh chord](../../../docs/music/lexicon.md#seventh-chord)** is
  a triad with one more note stacked on top, a seventh above the chord's main note (its
  [root](../../../docs/music/lexicon.md#root)): C–E–G–B is a C major seventh chord, written Cmaj7.
  Seventh chords are the everyday chords of jazz, and they sound richer and less settled than
  triads. The player sets a level, from Off to Strongly favored, saying how often the generator
  should prefer a seventh chord over the plain triad on the same note. Off is the default.

The guiding principle is unchanged: the app acknowledges and encourages; it never penalizes,
grades, ranks or scores the player, and anything that adapts is opt-in and visible. **With the
level at Off (the default), v3.3 generates exactly what v3.2 generates**, and every saved setting,
preset, kept session and replay key from before v3.3 reproduces as before.

The chords stay generated: the level allows seventh chords, it never chooses a
[chord progression](../../../docs/music/lexicon.md#chord-progression) (the order of chords).

## D2. Scope

### In v3.3

- One **Seventh chords level** with four steps, Off by default, a preference and never a quota
  (§D5).
- The four seventh chords the selected key and mode contain, nothing outside them (§D5.1).
- A seventh chord's seventh counts as a chord tone for the melody; a run stays three notes; phrase
  endings and the join between phrases keep today's notes unless a listening check approves the
  seventh (§D6).
- Chord symbols for the four new qualities, read aloud by the spoken score description and written
  into MusicXML; the backing plays the seventh (§D7).
- The level held by every preset (built-ins at Off), saved with the settings, carried by a new
  replay key version, `ifk5.`, older keys still decoding (§D8, §D9).
- A cost guard, measured before the gate (§D10).

### Out of v3.3

- **Other chord families:** sixth chords (a triad plus the sixth above the root, as C6: C–E–G–A),
  suspended chords (the third replaced by the second or the fourth, as Csus4: C–F–G), extended
  chords (ninths, elevenths, thirteenths, stacked on a seventh chord). Each would get a level of
  its own later. Under the app's modes a sixth chord holds the same notes as a seventh chord two
  notes lower (C6 has the notes of Am7), so it would add names, not new sounds.
- **Chords from outside the key and mode:** altered dominants and harmonic substitutions (out by
  the product's vision), borrowed chords, secondary dominants, the diminished seventh and the
  other qualities that need harmonic or melodic minor. So the blues' twelve-bar I7–IV7–V7 (three
  dominant sevenths, which no single mode contains) is out of reach: in C Mixolydian, C7 is
  available but F7 and G7 are not.
- A level per quality (a "dominant sevenths only" option), chord inversions (a chord with a note
  other than its root at the bottom), slash chords.
- A four-note arpeggio in one direction (§D6.2), and chosen progressions such as the jazz ii–V–I on
  purpose.
- A built-in preset that allows seventh chords, and the Blues and Bossa built-ins.
- Vary settings moving the level (§D8.3).
- Other backing voicings: jazz "shell" voicings, open position, a voicing choice (§D7.3).
- Chord symbols written with signs (Δ, −, ø) or a choice of spelling.
- Style packs, and how a pack's setting and the player's level would combine.
- **Unchanged, permanently out:** any grading, scoring, ranking or wrong-note signal; accounts,
  sharing or any server-side state.

## D3. Personas and goals served

The personas are Part A's (§3) and [personas.md](../../personas.md): **P1 — the Curious
Improviser** (primary), a player who can already play and is a beginner at improvising; **P2 —
the Speed Builder** (secondary), who wants endless fresh material at steadily higher tempos;
**P3 — the Fledgling Composer** (secondary), who wants to keep and grow the ideas they liked.

| Goal                                                                                                                                                     | Served by v3.3                      | How                                                                                                                                                                                                                                                                                                                                                                    |
| -------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **P1.G1 — Vocabulary by exposure.** Play whatever gets generated and feel how these ideas sound; get to know the possibilities rather than study theory. | **Partly, a new sound**             | The player hears seventh chords in the backing, sees their symbols, and plays melodies that land on the seventh, without studying theory: raising one level is enough. The jazz-flavoured presets (Jazz, Bebop, Modal (Dorian)) get closer to their styles, though not all the way: no chosen progressions, no chords from outside the key, no swing or style rhythms. |
| **P1.G2 — Real-time reading and dexterity.** Adjust on the fly to notes as they come.                                                                    | **Partly**                          | Chord symbols with sevenths to read at speed, and melodies whose targets include the seventh.                                                                                                                                                                                                                                                                          |
| **P2.S1 — Fresh material, never memorized, at a steadily higher tempo.**                                                                                 | **Slightly**                        | More harmonic variety in a long session; the cost guard keeps the fastest tempos working.                                                                                                                                                                                                                                                                              |
| **P3.C3 — Grow an idea.**                                                                                                                                | **Slightly** (served by v3.2's Jam) | A Jam's phrases follow the level like any session, so a doodle can grow over seventh chords; Modal (Dorian) with sevenths gives the Am7–D7 sound of a Dorian vamp in A.                                                                                                                                                                                                |

**Tensions settled for this scope.** A beginner wants plain, settled chords; the same player, and
anyone drawn to jazz, wants the richer sound. Resolved by Off as the default and a level raised by
choice. A seventh is a stable note in jazz and pop but a tension that must fall by a step in
classical music; resolved by counting it as a chord tone inside a phrase, while phrase endings keep
today's notes until a listening check says otherwise (§D6.3). A fourth chord note changes the pitch
search, the generator's most expensive step; resolved by a level that only orders the planner's
choices, a triad always kept as the fallback, and a measured cost guard (§D10).

## D4. Words used in this part

One term per concept, used the same way everywhere in Part D and by `ux-writer`'s design.

- **Seventh chord**: a triad plus the note a seventh above its root (§D1). In the app's modes it is
  always one of four qualities (§D5.1).
- **Chord family**: a kind of chord the generator may use beyond triads. v3.3 has one, the seventh
  chords. Internally each family is a named **capability**, `seventh-chords` for this one, so that a
  later family, or a later style pack, can name it as data (§D14).
- **Seventh chords level**, or the level: Off, Sometimes, Favored or Strongly favored (§D5.2). The
  owner's request spoke of "flags"; the level is v3.3's flag for the seventh-chord family, with
  steps rather than on and off. Working names; the labels are `ux-writer`'s, the meanings are fixed
  here.
- **Harmony event**: one span of one chord in a phrase's chord plan, from one chord change to the
  next. A chord held across a barline is one event.
- **Triad form** and **seventh form** of an event: the same degree's chord as a triad, or with its
  seventh added. The planner picks the degrees and the chords' roles exactly as before; the level
  only decides which form each event takes (§D5.3).
- **Chord tone**: a note of the chord sounding at that moment (from v3.3, its seventh included when
  the chord is a seventh chord: §D6.1). A **chord extension** (the ninth, eleventh, thirteenth) is
  never a chord tone in v3.3.
- **Diatonic**: using only the notes of the current key and mode.
- The figure terms (figure, figure level, free figure, Tension's scheduled figure) are Part B's
  (B4); preset, the selection, Custom and the restriction in force too.

## D5. The Seventh chords level

### D5.1 The chords

Each seventh chord is built inside the selected key and mode, as triads are: the chord on scale
degree d takes degrees d, d+2, d+4 and now d+6 (every other note of the scale, four times). Its
quality therefore comes from the key and mode, and only four qualities can occur
([research, table A](../../../docs/music/chord-research.md#table-a-the-seventh-chord-on-each-degree)):

| Quality                                                                                 | Built from                                                                      | On C       | Symbol | How often in each of the app's modes |
| --------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- | ---------- | ------ | ------------------------------------ |
| [Major seventh](../../../docs/music/lexicon.md#major-seventh-chord)                     | major triad + the note a major seventh above the root                           | C–E–G–B    | Cmaj7  | twice                                |
| [Minor seventh](../../../docs/music/lexicon.md#minor-seventh-chord)                     | minor triad + minor seventh                                                     | C–E♭–G–B♭  | Cm7    | three times                          |
| [Dominant seventh](../../../docs/music/lexicon.md#dominant-seventh-chord)               | major triad + minor seventh                                                     | C–E–G–B♭   | C7     | once                                 |
| [Half-diminished seventh](../../../docs/music/lexicon.md#half-diminished-seventh-chord) | diminished triad + minor seventh (a minor seventh chord whose fifth is lowered) | C–E♭–G♭–B♭ | Cm7♭5  | once                                 |

- **In C major** the seven chords are Cmaj7, Dm7, Em7, Fmaj7, G7, Am7 and Bm7♭5: the textbook list.
  Every mode holds the same seven chords in a different order; which degree carries which is the
  research's table A.
- **The dominant seventh moves with the mode.** In Major it sits on degree 5 (G7 in C major), the
  classical "dominant" chord that pulls home. In Mixolydian it is the home chord itself (C7 in C
  Mixolydian). In Minor (natural minor) it is on degree 7, so Minor's degree-5 chord is a minor
  seventh (Gm7 in C minor), with no strong pull home, as its triad already is.
- **Triads stay allowed at every level.** A phrase can mix triads and seventh chords; Off allows
  triads only.
- **Nothing outside the key and mode.** The diminished seventh, the minor-major seventh and the
  augmented sevenths need notes the app's modes do not have, so they never appear (§D2).

### D5.2 Four levels

| Level                | What the harmony planner does                                                                                                              |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| **Off**              | triads only, exactly as before v3.3; no draw is made                                                                                       |
| **Sometimes**        | at about **1 in 4** harmony events, tries the seventh form first, then the triad form                                                      |
| **Favored**          | the same at about **1 in 2** events                                                                                                        |
| **Strongly favored** | tries the seventh form first at **every** event; a phrase falls back to triads, as a whole, only where its seventh forms lead to no phrase |

- **A level orders the planner's choices; it never sets a quota.** No phrase is rejected or retried
  for lacking a seventh chord, and the triad form of every chord plan stays reachable (§D5.3).
- **The fallback is per phrase, not per chord.** When a plan's drawn seventh forms lead to no
  phrase, the same plan is tried with every event as a triad (§D5.3). So at every level a phrase
  either keeps all the seventh forms drawn for it or is all triads; it never swaps one seventh
  chord for a triad. At Strongly favored a phrase is all seventh chords or, where they lead
  nowhere, all triads.
- **"About 1 in 4" and "about 1 in 2" are starting values**, tuned before the gate by listening and
  by the cost guard (§D10). What is fixed is the order: each step up never makes seventh chords
  rarer, and Off makes none. Strongly favored must give a clear majority: **at least 3 in 4
  harmony events in their seventh form** over the sweep (§D15 item 5), "a seventh on nearly every
  chord", the norm in jazz. Sometimes is closer to pop, where most chords stay triads. The shares
  the build measures are reported to `ux-writer`, whose labels (Off, Sometimes, Often, Mostly)
  rest on them.
- **The same chance at every degree.** No role or degree is favored (not the degree-5 chord first,
  say): in jazz every chord of a progression takes its seventh, and a role order would be a style
  choice v3.3 does not make.
- **Where the level lives:** it is a generation setting of the Idle screen, like the controls and the
  figure levels: set at Idle (the review included), locked while a session runs, saved and restored
  (§D8.2), held by every preset (§D8.1), and carried in every phrase's generation request (§D9). Its
  first-load value is Off.

### D5.3 How the planner applies it

- **The chord plan is chosen as before.** The harmony planner builds its candidate plans (which
  degree each event takes, its role, the templates, the modal plans' colour chords) exactly as
  v3.2 does, from triads. In particular a modal plan's **colour chord** (a chord that holds the
  mode's characteristic note) is still found by looking at the triads, so modal plans keep exactly
  their candidates; measured on seventh chords, the sets would grow and change the modal plans.
- **Then each event's form is drawn.** For each harmony event, a draw from the phrase's seed and the
  event's position in the phrase says whether its seventh form is tried first.
- **The search tries, for each candidate plan in today's order, the plan with its drawn seventh
  forms first, then the same plan as triads only** (when at least one seventh was drawn). So a
  plan that works only as triads is still found, and the candidate list grows by at most one
  variant per plan, which keeps the search cost bounded. Musically, a phrase that cannot carry its
  sevenths is heard as a plain-triad phrase, a clean contrast, rather than as one chord oddly
  missing its seventh.
- **A finer fallback only if the share falls short.** If Strongly favored misses its 3 in 4 share
  (§D15 item 5), the build adds, before the triads-only variant, variants that drop the seventh
  from one event at a time, in a fixed order, within the cost guard (§D10), and records the share
  again. The triad form stays reachable and the order stays deterministic.
- **The search allowance is not raised** (§D10).

### D5.4 Determinism

The level is part of what a phrase is generated from, so a phrase reproduces from its inputs, a
pre-generated phrase equals the one the session would generate, and a kept session's inputs say how
each phrase was made. The draws use integer arithmetic only, so every browser draws the same; ties
are broken as everywhere else (the seeded key, then the index, in code-unit order). **Off consumes
no draw** and adds no candidate, so a phrase at Off is searched exactly as in v3.2 and reproduces
note for note.

## D6. What a seventh chord means for the melody

### D6.1 The seventh is a chord tone

When an event takes its seventh form, **its seventh is a chord tone everywhere inside the phrase**:
in the pitch search's order (chord tones are tried first), as the note a figure resolves onto
(every figure still resolves onto a chord tone), in a run (§D6.2), in the Arpeggio chaos control's
ordering of chord tones, as the landing of Tension's scheduled figure, and in the ranks a Jam's
doodle orders. The result validator accepts exactly that.

- **Why.** Seventh chords are opt-in, and the styles that want them (jazz, bossa nova, modal music)
  treat the seventh as a stable note: jazz teaching calls the third and the seventh the "guide
  tones", the notes that tell most about a chord, and has improvisers target them on the beat. In
  classical practice the seventh is instead a tension that falls by a step; v3.3 does not follow
  that style.
- **Consequences in the melody.** A chord with four notes leaves three of the seven scale notes
  outside it instead of four, so decorating notes have fewer places. The seventh and the root are
  one scale step apart (B and C over Cmaj7), so no passing tone or neighbor tone fits between them.
  The figure rules' assumption that a note one step from a chord tone is never itself a chord tone
  no longer holds and is revised.
- **Extensions are not chord tones.** The ninth, eleventh and thirteenth stay decorating notes, as
  every non-chord note is today. They are not targeted or held on purpose in v3.3.
- **Triad events are unchanged.** Over an event in its triad form, the chord tones are the triad's,
  as before.

### D6.2 Runs stay three notes

A recognized **[run](../../../docs/music/lexicon.md#run)** (three chord tones of one chord in a
row, in one direction, the [arpeggio](../../../docs/music/lexicon.md#arpeggio) shape the Leapiness
control allows) **stays exactly three notes**. Over a seventh chord, the three may include the
seventh: E–G–B over Cmaj7, or B–D–F over G7. That is enough to hear the seventh in a run.

- A full four-note arpeggio in one direction (C–E–G–B) stays rejected, as is today's triad-plus-octave
  C–E–G–C: the limit is about the length of a chain of wide intervals, not the chord's size.
- Raising the cap to four under a seventh chord would change a contract rule; it is left for later,
  if listening shows the full arpeggio is wanted.
- The leap-recovery rule follows: at Leaping and Angular a large leap inside a recognized run may
  defer its recovery to after the run; such a run may now include the seventh (§D12).

### D6.3 Phrase endings and the join read the triad, until a listening check

The open ending (a phrase never closes on the home chord, so the player can keep going) and the join
between two session phrases are where a seventh matters most: a seventh left hanging at the very end
can sound open, or like a mistake.

- **What ships by default: the endings and the join read each chord as its triad.** A phrase
  generated without a join ends, as today, on a note of the final chord's triad (the root, third or
  fifth of the degree-5 chord in tonal plans that move; scale degree 5 in tonal static plans; a
  note of the home triad other than the home note in modal plans); the final chord's seventh is not
  an ending note on its own. A phrase generated with a join may still end on a **tense note**, a
  scale note outside the final chord's triad, resolved by the next phrase's first note, as today: so
  the seventh (F over G7) can end such a phrase, and the next phrase resolves it, which is what
  classical practice asks of a seventh. A leap recovery or a tense note owed across the join still
  settles on a note of the tonic triad. **Net effect: the same final and landing notes as in v3.2,**
  while the chord symbols and the backing show and play the seventh.
- **The listening check, before the gate.** The build prepares examples of phrases that end on the
  seventh with no next phrase (F over G7 in C major; the home chord's seventh in Dorian and
  Mixolydian) and of next phrases landing on the tonic chord's seventh, and the owner listens. If
  the owner judges that ending on the seventh sounds open rather than wrong, the seventh also
  becomes an ending note and a landing note, and the contract wording of §D12's second option
  applies, confirmed by the owner then. Otherwise v3.3 ships with the triad reading. The result is
  recorded either way.

## D7. What the player sees and hears

### D7.1 Chord symbols

A **[chord symbol](../../../docs/music/lexicon.md#chord-symbol)** is the short chord name over the
staff. The app writes letters today ("m", "dim"), so the new suffixes are letters too:

| Quality                 | Suffix | Example (written pitch) | Spoken as (proposed)                                 | MusicXML `kind`   |
| ----------------------- | ------ | ----------------------- | ---------------------------------------------------- | ----------------- |
| Major seventh           | maj7   | Cmaj7                   | "C major seventh"                                    | `major-seventh`   |
| Minor seventh           | m7     | Dm7                     | "D minor seventh"                                    | `minor-seventh`   |
| Dominant seventh        | 7      | G7                      | "G dominant seventh"                                 | `dominant`        |
| Half-diminished seventh | m7♭5   | Bm7♭5                   | "B half-diminished" (or "B minor seventh flat five") | `half-diminished` |

- **Letters, not signs.** Books also write CΔ7, C−7 and Bø7; one system kept consistently is the
  textbook advice, and the app's is letters. "m7♭5" uses the flat sign (♭) for the lowered fifth;
  it means a minor seventh chord whose fifth is a half step lower.
- **Transposed like the notes**: shown in the instrument's written pitch, as today; the suffix never
  changes under transposition (G7 sounding is A7 written for a tenor saxophone).
- **Everywhere a chord symbol shows today**: the Idle staff, the live session view, the review, a
  kept session's review, and the MusicXML export. Triad symbols are unchanged.
- **The spoken score description** reads each suffix as words, as it reads "m" as "minor" today;
  the exact words are `ux-writer`'s, the meaning fixed here.

### D7.2 Exports

- **MusicXML** writes each seventh chord's symbol with the kind in the table above and the printed
  suffix as its display text. No export may fail for a seventh chord (today an unknown suffix stops
  the export).
- **MIDI**: the generated line is unchanged; when the player includes the backing track in the MIDI
  file, it holds the backing's four-note chords (§D7.3), since the export takes the backing's notes
  from the backing itself.
- **No export carries the level**, as no export carries a preset.

### D7.3 The backing plays the seventh

The backing is the bass and the block chords that sound during a session. Today its chords play the
highest **close-position** triad (the notes packed inside one octave, in whichever order puts the
top note highest) whose top note is at or below E4 (MIDI 64), and the bass plays the root, then the
fifth on beats 3 and 4 of a measure held under one chord.

- **Proposed: the block chords play the chord the phrase uses, every note of it.** A triad as
  today; a seventh chord as the highest close-position arrangement of its four notes whose top note
  is at or below E4. Four arrangements are tried instead of three (each note of the chord at the
  bottom in turn). The bass is unchanged.
- **Why all four notes, plainly placed.** The backing is the only part that sounds the harmony (the
  generated line is never played), so if it left the seventh out the player would see "G7" and hear
  G. A plain close-position chord is the same deterministic rendering as today, one note wider.
- **What it means for the sound.** A four-note chord packed under E4 reaches a little lower than a
  triad, down to about D3 at the lowest; the bass stays in C2 to B2, below it. The same harmony
  always renders the same backing.
- **Not in v3.3:** jazz voicings that leave out the root and the fifth (the bass already has the
  root), open position, or a voicing choice for the player.
- This changes a contract guarantee (§D12).

### D7.4 Acknowledgement

**Unchanged.** A note is acknowledged when the player plays its exact pitch inside its window,
whatever the chord under it. No grading, scoring or wrong-note signal.

## D8. How v3.3 meets presets, saved settings and sessions

### D8.1 Presets

- **Every preset holds the level**, as it holds the ten controls and the seven figure levels
  (B6.1), so a preset always gives the same sound whatever was selected before it.
- **Every built-in preset holds Off.** So Neutral and Jazz at their defaults still sound exactly as
  before, as v3.1 promised, and no built-in changes. A built-in that allows seventh chords (a
  "Jazz with sevenths", a Bossa) would be a new preset, or the owner's explicit change, later.
- **Consequences.** Choosing a preset sets the level to the preset's value: choosing Bebop after
  raising the level returns it to Off. Changing the level makes Custom, based on the selected
  preset, like any preset-held setting. A player who wants "Bebop with sevenths" raises the level
  and saves a player preset, which holds the level by value.
- A preset's description may **suggest** raising the level (for Jazz, Bebop, Modal (Dorian)), as
  Reel's suggests trying Ionian; wording `ux-writer`'s.

### D8.2 Saving on the device

- **The settings record and every player preset record gain the level**, stored by value under the
  capability's name (`seventh-chords`), never through a preset's name. A new stored data version,
  migrated when the database opens (Part A §4.3).
- **Saved and restored** under Part A §4.2's rules: a change is saved at once, never during a
  session.
- **Tolerant loading:** a record written before v3.3 has no level and loads at Off; an unknown or
  invalid value loads at its first-load value, Off. "Values win" (B7) applies: a saved level that
  differs from the selected preset's loads as Custom based on it.
- Visits that save nothing (an outdated tab, a failed read) save no level, as for every setting.

### D8.3 Vary settings and the session

- **Vary settings never moves the level**, and the level belongs to none of its allowed groups
  (C9). Reason: seventh chords are opt-in. If Vary settings could move the level up, a player who
  kept Off but turned Vary settings on would hear seventh chords they never chose. The level is a
  choice of sound, not a practice variation.
- **The level is fixed for a whole session.** Like every generation setting it is locked during a
  session, and nothing moves it, so a session never switches between allowing and not allowing
  seventh chords.
- **Tension across phrases** and **Rising tempo** are unchanged and do not touch the level.
- **The join between phrases.** The previous phrase's final chord, carried into the next phrase,
  may be a seventh chord. It is compared with the next phrase's settings by its triad (degree,
  notes and quality of the triad): whether a seventh was added is a draw of that phrase, not a
  property of the settings, so it never by itself makes the carried chord unfit. A key or mode
  change, or a harmonic motion change that the carried chord no longer fits, still drops it, as
  today.

### D8.4 Pre-generation, Jam and the key and mode suggestion

- **Pre-generation (Part A §8):** changing the level discards the pre-generated phrases, as a figure
  level does; and, like every change that discards them (C5.11), it drops a held doodle.
- **Jam:** a Jam's phrases follow the level like any session's. The doodle still only orders
  candidates within each rank, chord tones first; with a seventh chord the seventh shares the first
  rank (§D6.1).
- **The key and mode suggestion is unchanged.** It scores the doodle's own notes against the key and
  mode pairs; no generated chord enters it, so the level never changes its answer.

## D9. The generation request, the replay key and kept sessions

- **The generation request carries the level**, on the player-facing request and the resolved core
  request, by capability name and value, and the generation worker re-validates it from untrusted
  input like every field. The carried final chord (the join) may be a seventh chord.
- **A new replay key version, `ifk5.`**, written for every phrase: everything `ifk4.` carries (C11),
  plus the level by capability name, and a carried final chord with its seventh when it has one. A
  new version rather than an extension, so that a v3.2 app meeting a v3.3 key refuses it instead of
  replaying a different phrase without saying so. The key is still printed to the console only,
  never sent or stored.
- **Older keys keep decoding.** An `ifk1.` to `ifk4.` key decodes with the level at Off, to the same
  phrase as in the version that wrote it.
- **A key naming a capability v3.3 does not know** is refused, with the reason, rather than
  replayed without it; a later prefix is refused as an unsupported version, as today.
- **The replay tool** (`npm run replay:phrase`) decodes all five versions and names the four new
  qualities.
- **Kept sessions.** Each kept phrase's reproduction inputs (Part A §5.2) hold the level, and the
  chord symbols are kept exactly as displayed. A new stored data version: sessions kept before v3.3
  migrate with the level at Off and are otherwise unchanged.

## D10. The cost guard: generation time with seventh chords

A seventh chord changes the pitch search, the generator's most expensive step: one more chord tone
per chord, one fewer decorating note, and up to one more chord-plan variant per plan to try (§D5.3).
Generation must still keep up at the fastest tempo.

- **The search allowance is not raised**: 250,000 units of search work for a phrase generated on
  its own, 160,000 for an attempt that joins the previous phrase.
- **Measured before the gate**, on the deadline sweep of v2's definition of done (its settings and
  seeds at 60, 120 and 240 BPM, `npm run test:sweep`), in a 240 BPM session, and for a fresh Jam's
  phrase 1 at 240 BPM, at these settings:
  - the baseline, the level at Off with the Neutral and Jazz defaults (it must equal v3.2's
    figures, since the phrases are the same);
  - Sometimes, Favored and Strongly favored with the Neutral and Jazz defaults;
  - Strongly favored with Speed drill (the most expensive setting found in v3.1) and with Bebop;
  - in every mode: Major, Minor and the seven modes, since each places the four qualities on
    different degrees.
- **Recorded for each:** the share of phrases generated, the slowest and the 95th-percentile
  generation time, the share of harmony events in their seventh form, and at 240 BPM the share of
  phrases that fall back to being generated without the join and the share of a fresh Jam's phrase
  1 ready by its deadline.
- **Acceptance**, against the baseline: at most 2 percentage points more fallbacks at 240 BPM; at
  most 2 percentage points fewer phrases generated at any swept setting; at most 2 percentage points
  fewer Jam phrase 1s ready by their deadline; and no attempt generated on its own slower than the
  standalone reserve (1.075 s in Chromium), which the failure ladder keeps for it.
- **If a level costs more**, its share is tuned down, or the fallback made finer (§D5.3), before the
  gate. The allowance is never raised and the triad fallback is never removed.

## D11. For the interface design

What the interface must support, for `ux-writer`. Behaviour only: layout, placement and wording are
`ux-writer`'s.

- **The Seventh chords level control**: four steps, Off by default, with a plain description (a
  seventh chord adds a fourth note on top of the chord; the level says how often the generator
  prefers one; it is a preference, never a guarantee). Set at Idle and in the review, locked during
  a session.
- **Where it sits.** It is a preset-held generation setting, so it lives with the settings every
  preset holds, and changing it makes Custom. It shapes the chords, not the melody's decorations,
  so the spec suggests placing it beside the harmony control (Harmonic motion) rather than among
  the seven figure levels, while sharing their four-step look, since it has the same shape. The
  final placement is `ux-writer`'s. It is not one of Vary settings' allowed groups, and the groups'
  description may say that the chord level is never varied.
- **Presets**: the selector is unchanged; built-in descriptions may suggest raising the level (Jazz,
  Bebop, Modal (Dorian)); player presets save it with no new question.
- **Chord symbols**: four new suffixes, maj7, m7, 7 and m7♭5, in letters with the ♭ sign, wherever
  symbols show today (the Idle staff, the live view, the review, kept sessions). They are longer than
  today's (Bm7♭5 against Bdim): the layout must hold the longest symbol over two chords per measure
  at every supported width, phones included (phones are low priority, but must not break).
- **The spoken score description**: words for each new suffix (§D7.1 proposes them).
- **Review and exports**: no new control. The review shows the symbols as displayed; the export
  dialogs are unchanged; MusicXML carries the new chord kinds; the MIDI backing option now includes
  the four-note chords. If the export description mentions what the backing holds, it says "the
  chords" rather than "triads".
- **Lexicon popups**: the new terms (seventh chord, the four qualities, chord extension) have popup
  lines in the lexicon, ready for the level's description and the symbols.
- **Nothing else changes**: Jam's screens, the suggestion, the rhythm lock, the session list.

## D12. Contract changes needing owner confirmation

Each change is intended. Where a declared-intent entry is named, `documentalist` prepares the
change. **STABLE guarantees change only with the owner's explicit confirmation of their exact
wording**, given separately from approving this Part D, and a contract version bump
(`documentalist` proposes which: a major one if a guarantee's meaning changes, as for v3.0 to v3.2).
Below, each is given in plain words: what it means today, and what it would mean.

**STABLE guarantees that change:**

1. **The backing's chords** (`req_session_backing_track`).
   - Today: "the chords play the highest close-position triad whose top note is at or below E4".
   - Proposed: the chords play every note of the chord the phrase uses, in the highest close
     position whose top note is at or below E4: three notes for a triad, as today, four for a seventh
     chord. The bass, the rhythm of the attacks, the determinism and the no-download rule are
     unchanged.
2. **The open phrase ending** (`rule_open_phrase_ending`).
   - Today: when the chords end on the dominant (the degree-5 chord), "the final event is a dominant
     chord tone"; in modal or static music the final note is a non-home note of the home area, such
     as scale degree 5; a phrase joined to the next may end on a "tense note (a scale tone outside
     the final chord)" that the next phrase resolves on its first note.
   - Proposed, first option (what ships unless the listening check approves the seventh, §D6.3):
     the same, with every chord in this rule read as its triad. The final note is the root, third or
     fifth of the final chord, never its seventh alone; a tense note is a scale note outside the
     final chord's triad, so a joined phrase may end on the seventh and the next phrase resolves it.
     The final notes allowed are exactly today's.
   - Proposed, second option (only if the listening check approves it, confirmed by the owner then):
     the final chord's seventh also counts as an ending note, so any phrase may end on it, for
     example F over G7, or B♭ over C7 in C Mixolydian, and the tense notes are the scale notes outside
     the whole four-note chord.
3. **Leap recovery** (`rule_leap_recovery`).
   - Today: at Leaping and Angular, "a large leap inside a recognized three-note chord-tone run
     defers its debt" (its recovery) to the note after the run; the run is three notes of the chord's
     triad.
   - Proposed: unchanged, except that the three notes of the run may include the chord's seventh
     when the chord is a seventh chord. A run is still exactly three notes. A few more large leaps
     may then recover after the run rather than at once, only with seventh chords on and only at
     Leaping and Angular.

**STABLE guarantees checked, wording unchanged** (listed so the owner sees them;
`documentalist` confirms no wording changes):

- **Unfit harmony drops the carried chord** (`rule_harmony_change_drops_unfit_harmonic_carry_in`):
  "those settings never end a phrase on that chord". Settings that allow seventh chords can end on
  either form of a chord they end on, and the level is fixed for a session (§D8.3), so a seventh never
  makes a carried chord unfit by itself. The comparison by triad implements the same meaning.
- **The join** (`rule_join_carry_in_limited`): "its final harmony event (the chord and its harmonic
  role)" may now be a seventh chord; still exactly the same four things cross.
- **The review** (`req_last_session_review`): phrases "engraved exactly as displayed (written pitch,
  key signature, chord symbols)"; the symbols may now include sevenths.
- **The settings mutation guarantees** (`rule_mutation_setting_scales`,
  `rule_mutation_marks_profile_customized`, `rule_mutation_reverts_at_session_end`): unchanged,
  since Vary settings never moves the level.
- `rule_tempo_never_affects_generation`, `rule_setting_change_rechecks_pitch_carry_in`,
  `rule_key_change_drops_harmonic_carry_in`, `rule_session_generation_failure_ladder`: unchanged.
- **The vision** (`vision_infinite_flow_first_release`, version 0.9, its wording confirmed by the
  owner on 2026-10-12): Part D fits it as worded. Its "flags they set in the app for the chord
  families" covers v3.3's one level for the seventh-chord family; "altered dominants and harmonic
  substitutions" stay out; the chords stay generated. No change.

**Other atoms that change** (REVIEW or DRAFT; `documentalist`'s change set):

- `module_harmony_candidate_domain` ("exact diatonic collection and triad material"): seventh forms
  drawn per event over the same plans; colour chords measured on the triad.
- `rule_leapiness_arpeggio_run_limits`: the run may include the seventh; still three notes.
- `rule_figures_resolve_onto_chord_tones`, `rule_embellishment_figures_defined`,
  `rule_figure_level_orders_search`, `rule_levels_govern_free_figures_only`,
  `rule_tension_arc_settled`, `rule_tension_arc_build`, `rule_arpeggio_chaos_respects_constraints`,
  `rule_jam_melody_follows_doodle_moves`, `module_pitch_search_context`,
  `module_pitch_search_transition`: what a chord tone is (§D6.1).
- `entity_phrase_carry_in`, `rule_join_tense_note_resolution`: a carried chord may have four notes;
  the landing stays a tonic-triad note unless the listening check approves the seventh.
- `rule_generated_notes_musicxml_export`, `rule_generated_notes_midi_export`,
  `module_notation_layout_preflight` (longer symbols): §D7.
- `module_phrase_replay_key`, `service_headless_phrase_replay`, `module_generation_request_construction`,
  `module_generation_worker_protocol`, `rule_kept_session_content`: the level and `ifk5.` (§D9).
- The preset and settings atoms (`rule_preset_contents`, `rule_built_in_preset_values`,
  `rule_choosing_preset_sets_its_settings`, `rule_saved_settings_load_tolerantly`,
  `rule_presets_load_tolerantly`, `rule_settings_saved_on_change`,
  `rule_pregeneration_discarded_on_change`, `rule_vary_settings_allowed_groups`): the level is held,
  saved, loaded and never varied (§D8).
- Unchanged and checked: `module_notation_display_convention` (it already keeps a chord's quality and
  extensions when transposing), `rule_neutral_profile_diatonic_harmony` and
  `rule_jazz_chromatic_resolution` (the harmony stays diatonic).

**Project documents that follow at the build:** the
[harmony planner policy](../../../docs/music/harmony-planner-policy.md#collection-and-chord-vocabulary)
("root-position diatonic triads only"), the [generator contract](../../generator-contract.md)
("seven root-position diatonic triads"), and the lexicon's "in Infinite Flow" lines for seventh
chord, chord symbol, chord tone, run, voicing and the four seventh-chord qualities.

**Part A, B and C text this part extends:** B6.1 and B6.5 (every preset holds the level, built-ins
at Off), B7 (the records hold it), B9 and C11 (the request and the key, now `ifk5.`), C9 (the level
in no allowed group), Part A §5.2 and §8 (kept phrases' inputs; the level discards pre-generated
phrases).

## D13. Existing code and risks

From the chord research's reading of the code on 2026-10-12, and a re-check of the harmony planner
and the join the same day while writing this part. Line references are in the research's
[code table](../../../docs/music/chord-research.md#where-a-fourth-chord-note-meets-the-code).

- **The chord type is a triad everywhere.** The chord's notes are a fixed three-item list with
  three qualities; building any other shape throws. A new chord type and the four qualities are
  needed, in the harmony types, the collection, the planner and everything that reads a chord.
- **The planner** builds candidate plans from the triads, merges a chord held across a barline into
  one event, and returns an ordered list that the orchestrator ranks by seed and searches with the
  rhythm candidates. The seventh variants fit that list (§D5.3). The result validator rebuilds the
  same plans to check a phrase, so it needs the level too.
- **The join** compares chords by degree, three notes and quality, and refuses a carried chord the
  settings never end on; the carry-in refuses any chord that is not a three-note triad, so a carried
  seventh chord would be refused as malformed today (§D8.3).
- **The pitch search** ranks chord tones first and treats the other scale notes as decorating notes;
  the run check needs three chord tones of one chord; endings and the join's landing read the triad.
  The figure validator assumes a note one step from a chord tone is never a chord tone.
- **The backing** knows three qualities and tries three arrangements.
- **Notation and exports** map a suffix per triad quality; the MusicXML export throws on any other
  suffix; the spoken description reads unknown suffixes letter by letter. VexFlow's chord-symbol
  support has the ♭ glyph, unused today.
- **The replay key** is `ifk1.` today; `ifk2.` to `ifk4.` come with v3.0 to v3.2, so v3.3's is
  `ifk5.`. The replay tool names each chord's triad quality.

**At risk:**

- **Reproducibility at Off.** Every existing replay key, golden fixture and kept session depends on
  Off adding no draw and no candidate.
- **Generation cost** (§D10): a fourth chord tone and the triad fallback can slow searches or make
  some fail; measured before the gate.
- **Layout**: longer chord symbols, two per measure, at narrow widths.
- **Migration**: settings, player presets and kept sessions gain a data version.
- **Contract**: three STABLE guarantees change (§D12), which needs the owner's confirmation before
  the gate; the open ending's wording depends on the listening check.

## D14. Architectural decisions and their reasons

- **One level for the whole seventh-chord family, four steps**, because in the app's modes only four
  qualities ever occur, each always on its own degrees, so a level per quality would mostly choose
  degrees; and because a level says "now and then" as well as "mostly", which a switch cannot,
  matching how often each style uses sevenths.
- **Diatonic only**, because stacking one more note inside the key and mode is what the generator
  already does for triads, and every chord from outside the key belongs with substitutions and
  altered chords, which the vision keeps out.
- **A preference per event, never a quota, with the triad form always reachable**, because a quota
  can make a phrase impossible or slow, and the pitch search is the generator's most expensive step.
- **The chord plan chosen exactly as before, colour chords measured on the triad**, because the
  level must add a sound without changing which progressions the settings give.
- **Off consumes no draw**, because every phrase, key and kept session from before v3.3 must
  reproduce note for note.
- **The seventh is a chord tone inside the phrase, and the endings read the triad until a listening
  check**, because the styles that want sevenths treat them as stable, while a seventh left hanging
  at the very end is the one place the ear may object.
- **Runs stay three notes**, because three notes can already sound the seventh and raising the cap
  changes a contract rule.
- **The backing plays every note of the chord**, because it is the only part that sounds the
  harmony.
- **Letters for the symbols**, because the app already writes "m" and "dim", and one system kept
  consistently is the textbook advice.
- **The level is preset-held, every built-in at Off**, because a preset must give the same sound
  whatever was selected before it, and v3.1 promised Neutral and Jazz sound as before.
- **Vary settings never moves the level**, because seventh chords are opt-in.
- **Stored by capability name and value**, never through a preset's name, because a preset can be
  renamed or retuned, and because a later chord family or style pack can then name the same
  capability as data.
- **A new key version**, because an older app should refuse a key it cannot honor rather than
  replay a different phrase silently.

## D15. Definition of done

v3.3 ships when every item holds, each verified by a named test or a recorded hand check.

1. **The level** exists with four values, Off by default; it is set at Idle (the review included),
   locked during a session, saved and restored after a reload, and held by every preset.
2. **Off reproduces v3.2.** At Off, the generator produces, for the same request and seed, exactly
   the phrase v3.2 produces, on a fixed sweep of seeds and settings in every mode, with Jam and the
   rhythm lock included; every `ifk1.` to `ifk4.` key decodes to the same phrase as in the version
   that wrote it.
3. **Only the four diatonic sevenths.** Above Off, every chord is a triad or the seventh chord on the
   same degree, built from degrees d, d+2, d+4 and d+6 of the selected mode, of quality maj7, m7, 7
   or m7♭5 as the research's table A gives; no other chord appears.
4. **Same plans.** For the same request and seed, the degrees, roles and templates of the chosen
   plan's candidates, the modal colour chords included, are those of Off; only the seventh forms
   differ.
5. **Ordered and audible.** On a fixed seed sweep, the share of harmony events in their seventh form
   is zero at Off and never decreases from Sometimes to Favored to Strongly favored; at Strongly
   favored it is at least 3 in 4. The share is recorded per level and per mode (Major, Minor and
   the seven modes), with the share of phrases that fell back to triads, and reported to
   `ux-writer`.
6. **No quota.** No phrase is rejected or retried for lacking a seventh chord; with a level above
   Off, a plan that works only as triads is still found (a test with a plan whose seventh form has
   no solution).
7. **The seventh as a chord tone.** In an event in its seventh form, the seventh is treated as a
   chord tone by the search order, the figure targets, runs, Arpeggio chaos, Tension's scheduled
   figure and a Jam's ranks, and the result validator accepts exactly that; extensions are never
   chord tones; triad events are unchanged.
8. **Runs.** No recognized run is longer than three notes; a three-note run may include the seventh;
   no four-note one-way arpeggio is written.
9. **Endings and the join.** The listening check of §D6.3 is done and its result recorded. With the
   triad reading, a phrase generated without a join never ends on its final chord's seventh, and a
   join's landing is a tonic-triad note; with the seventh approved, the second option's rules hold
   and the owner's confirmation of that wording is recorded.
10. **The backing** plays a seventh chord as its four notes in the highest close position with the
    top note at or below E4, and triads as before; the bass is unchanged; the same harmony renders
    the same backing; the MIDI export's backing holds the same notes.
11. **Chord symbols** show maj7, m7, 7 and m7♭5, in written pitch, on the Idle staff, in the live
    view, the review and kept sessions; the layout holds the longest symbol at every supported width;
    the spoken description reads each suffix as words.
12. **MusicXML** writes the kinds `major-seventh`, `minor-seventh`, `dominant` and
    `half-diminished` with the printed suffix; no export fails for a seventh chord; a file with all
    four opens in MuseScore with the right symbols (recorded hand check).
13. **Presets.** Every built-in holds Off; choosing a preset sets the level; changing the level makes
    Custom; a player preset saves and restores it by value.
14. **Persistence.** The settings and player preset records hold the level by capability name;
    records from before v3.3 load at Off, an invalid value loads at Off, and a saved level differing
    from the preset's loads as Custom; the migration to the new data version runs when the database
    opens.
15. **Vary settings** never moves the level, and the level is in no allowed group; nothing changes
    it during a session.
16. **Pre-generation:** changing the level discards the pre-generated phrases and drops a held
    doodle; a pre-generated phrase equals the session's at every level.
17. **The join across phrases**: a carried seventh chord is accepted and compared by its triad; a key
    or mode change still drops it.
18. **Replay keys:** v3.3 writes `ifk5.` for every phrase, holding the level by capability name and a
    four-note carried chord when there is one; the same `ifk5.` key gives the same phrase in Chrome
    and Edge; a key naming an unknown capability is refused with the reason; the replay tool decodes
    all five versions and names the four qualities.
19. **Kept sessions:** each kept phrase's inputs hold the level and its symbols as displayed;
    sessions kept before v3.3 migrate at Off with their timelines untouched.
20. **The generation worker** re-validates the level from untrusted input.
21. **The cost guard** of §D10 is measured on its settings, recorded, and met.
22. **Jam and the suggestion:** a Jam's phrases follow the level; the suggestion's answer for a
    doodle is the same at every level.
23. **Acknowledgement unchanged**, and nothing is graded, scored or marked wrong.
24. **v3.2, v3.1, v3.0 and v2 behaviour otherwise unchanged:** their test suites pass, apart from
    the tests §D12's changes replace, each with its v3.3 counterpart.
25. **The declared-intent contract** reflects §D12's changes, with the owner's explicit confirmation
    of their wording recorded.

## D16. Deferred and open

- **Measured before the gate, not open questions:** the Sometimes and Favored shares, starting at
  about 1 in 4 and 1 in 2 (§D5.2); the cost guard's figures (§D10); the listening check on endings and
  landings, which picks the open ending's wording (§D6.3).
- **From the owner:** approval of this Part D; then the exact wording of §D12's three STABLE changes
  (the open ending's second option only if the listening check approves it).
- **For `documentalist`:** the declared-intent changes of §D12, and the lexicon's "in Infinite Flow"
  lines once v3.3 is built.
- **Design, for `ux-writer`:** §D11.
- **Still open, for later:** when style packs come, which wins when a player's chord level and a
  style pack's setting for the same capability disagree. v3.3 stores the level so that a pack could
  set it as data; the precedence is decided with style packs.
- **Deferred to later versions:**
  - sixth, suspended and extended chords, each a family with its own level, extended chords building
    on the seventh-chord family;
  - chords from outside the key and mode (altered dominants and substitutions stay out by the
    vision; borrowed and secondary chords, the blues' three dominant sevenths), and the qualities
    harmonic and melodic minor bring;
  - a level per quality, such as dominant sevenths only;
  - a four-note arpeggio run under a seventh chord;
  - chosen progressions, such as the ii–V–I;
  - built-in presets that allow seventh chords, and Blues and Bossa built-ins;
  - Vary settings moving the level, as an allowed group of its own;
  - other backing voicings and a voicing choice; chord symbols with signs.

## D17. Access model

Unchanged from Part A §15: exactly one local user, with no accounts, roles, permissions or
sharing. Whoever has the page open can do everything the app offers, the Seventh chords level
included. The level joins the settings kept for "whoever uses this browser profile on this
device"; Delete everything resets it to Off. Nothing new leaves the device.
