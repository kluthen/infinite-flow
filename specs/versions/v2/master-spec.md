# Infinite Flow v2 — Master Spec: Rolling Phrase

Status: master spec v1.39 (2026-10-07). v2.0 is released as version 2.0.0, its tag pending the
product owner's approval. The hand checks that §11 lets follow the tag are still to run. This is
the consolidated, execution-ready specification for v2, which ships as one release, v2.0, whose
parts keep the labels v2.0, v2.1, v2.2 and v2.4 (v2.3 was emptied, and its number is not reused).
It supersedes the individual v2 draft topic documents,
which are kept in the archive as working history. Change in v1.6: the export is chosen by content,
generated notes or played notes, and played notes come as a MIDI file of their own instead of an
opt-in track inside the generated MIDI file (§2, §7, §8, §11–§13). Change in v1.7: marking
favorites moves to v3, so the review has no favorites, every export covers the whole session, and
starting a new session from the review asks no confirmation; the generated notes and the played
notes each have their own export action, one file each (§2, §7, §11–§13). Change in v1.8: the
screen stays awake during a session, the count-in always clicks, even with the click turned off,
and a staff-only session view is placed in v5 (§2, §6, §11, §12). Change in v1.9: the count-in
plays at the click volume, and the click volume control never reaches silence, so the count-in is
always audible (§6, §11, §12). Change in v1.10: no session starts while a generation failure is
being reported; a session ended during the count-in goes back to Idle with no review; the app asks
for a landscape lock during a session, and turning a phone or tablet to portrait ends the session
(§6, §7, §8, §11, §12). Change in v1.11: a session ends whenever the staff can no longer be shown,
whether the device was turned or not: the view becomes portrait-shaped where the rotate-device
notice replaces the staff, or the window gets too narrow to draw the staff readably in the layout
the session started with; any other change to the window's size keeps the session running
(§6, §7, §11, §12). Change in v1.12: a session starts only while the staff is shown and the phrase
on screen is settled: not while a new phrase is being generated, the phrase cannot be drawn, the
rhythm combination is unsupported, a generation failure is being reported, or the rotate-device
notice replaces the staff; the starting note is named exactly when playing it would start a
session. During a session, a look-ahead phrase must also fit the staff layout the session holds,
which is fixed at Start by the window's width; one that does not fit is retried like a failed
generation (§4, §6, §7, §11, §12). Change in v1.13: below the tablet-landscape layout's width, the
staff must fit the window's height as well as its width, so a window too short for the staff
blocks a start and ends a running session like one too narrow; and a change to the window's size
during a session also re-checks the phrase material already waiting to be drawn, ending the
session like Stop if any of it no longer fits (§4, §6, §7, §11). Change in v1.14, three changes to
v1's behaviour at Idle: a phrase whose notes do not fit the staff is replaced by a new one with
the usual fresh-seed retries instead of showing a notation error; a staff that cannot be shown for
lack of space shows a plain notice, not an error; and below the tablet-landscape layout's width,
the `Sixteenth` note density is unavailable and phrases are generated with `Eighth`
(§2, §4, §5, §6, §7, §11, §12). Change in v1.15: the note density a phrase is generated with
follows the window's width when that phrase is generated, at Idle and during a session, and a
session that has generated with `Eighth` keeps it until it ends; unsupported rhythm settings are
judged on that density; a new phrase is generated when the "staff needs more room" notice clears;
and the settings-mutation flag treats `Sixteenth` as unavailable below the tablet-landscape
layout's width (§2, §4, §5, §6, §7, §11, §12). Change in v1.16: when the "staff needs more room"
notice clears while the rhythm combination is unsupported, no phrase is shown and generation
stays blocked until the settings change; and when the notice shows because every retry was too
dense to fit, a wider window, a changed setting or regenerating by hand starts a fresh round of
retries, and the notice clears only when a phrase fits (§2, §4, §6, §11, §12). Change in v1.17:
while that notice shows, a change that makes the rhythm combination unsupported starts no round
and the notice gives way to no phrase, as when it clears under unsupported settings; and a wider
window while a round is running starts nothing, the round carrying on (§2, §4, §6, §11, §12).
Change in v1.18: each attempt of a round of retries takes its note density from the window when
it is generated, and a wider window that makes the rhythm combination unsupported during a round
stops it, giving way to no phrase; and a phrase on screen that stops fitting while the combination
is unsupported gives way to no phrase too, not to the notice (§2, §4, §5, §6, §11, §12).
Change in v1.19, corrections that add no new rule, and three items left open: a join is smoothed
only when the next phrase is generated with carry-in, so after a standalone phrase or a repeat no
leap recovery or tense note left owing is settled; a phrase generated with carry-in may end owing
one, which the next phrase settles; the review shows every phrase that started sounding; a
look-ahead phrase already partly on screen is never discarded for a setting change, which then
applies one phrase later; applying a setting change at a phrase boundary ships with the
settings-mutation flag in v2.1, since nothing can change a setting during a v2.0 session; v2.0
records played notes in the session history without showing them; the "generator is struggling"
notice stays until a newly generated phrase starts sounding. Left open (§12): a session's last
phrase ending with a leap recovery or a tense note owed, the multi-phrase tension arc's mechanics
and default, and adaptive tempo when the controller is lost, with its default (§3, §4, §5, §7,
§10, §11, §12). Change in v1.20, a correction that adds no new rule: the MuseScore
check of the MusicXML export covers each of the three instrument templates, the two transposing
ones with their `<transpose>` element and the C keyboard without one, since only two of the
three transpose (§11). Change in v1.21, the product owner's answer to an item left open in v1.19:
the carry-over between phrases is kept, and a session's last phrase, in the review and the export,
may end with a leap recovery or a tense note's resolution still owed, as it may be cut off
mid-phrase; the same holds before the failure ladder's standalone phrase or a repeat (§3, §11,
§12). Change in v1.22, the product owner's decision on a flaw found while building note
acknowledgement: the boundary between two consecutive expected notes is the later of 150 ms before
the second note's onset and the point halfway between the two onsets, so every acknowledgement
window contains its own note's onset and a note played on time can always be matched, where before
a note followed less than 150 ms later could not be; nothing changes for notes 300 ms or more
apart. Windows include both their ends, and a phrase's last expected note is bounded by the next
phrase's first in the same way (§8, §11). Change in v1.23 (its start from the review replaced in
v1.24), the answer to the item left open about starting a session from the review, settled by the interface design under the product owner's
delegation: at every session end once phrase 1 has started sounding, the app generates a fresh
phrase from the current settings, as regenerating by hand at Idle would, and the next session's
phrase 1 is the phrase on screen when it starts, that fresh phrase unless the player has since
replaced it; a session starts from the review exactly as from Idle, by a Start click or by the
starting note, under the same conditions, and either start discards the review without asking
(§4, §6, §7, §11, §12). A wording fix within v1.23, adding no rule: phrase 1 from the review is
the phrase on screen when the session starts, first generated fresh at the session end, since
regenerating by hand, an instrument switch or a phrase that stops fitting the window still
replaces it while the review shows, exactly as at Idle (§4, §6, §7, §11). Change in v1.24, the
product owner's decision, replacing v1.23's start from the review: one leaves the review before
starting a new session. While the review shows, no session starts, by a Start click or by any
note, the starting note included, and no note played there starts anything; leaving the review
keeps it
reachable until the next session starts, and only that start discards it. The fresh phrase
generated at the session end stands, and phrase 1 is the phrase on screen at Idle when the
session starts (§4, §6, §7, §11). Change in v1.25, a correction that adds no new rule: the
MusicXML export closes every phrase but the last with a double barline and the last with a final
barline, as the product owner decided on 2026-09-29 while the MusicXML encoder was built; the
text had kept a double barline for every phrase (§7). Change in v1.26, the product owner's
decisions of 2026-10-03: the checks that need the reference hardware or real programs leave the
v2.0 definition of done for a new release, v2.4, placed after v2.2, so v2.0 can ship before them
with its timing constants at their starting values (the controller check on the reference
hardware, tuning the acknowledgement windows and latency, opening real exports in MuseScore and a
MIDI tool, and the playhead and main-thread measurements in real Chromium); the end-of-measure
chord-fit check leaves v2 and becomes a nice-to-have for v3, its definition kept in §9; and four
items left open are settled: the settings-mutation flag mutates every 2 to 4 phrases at random,
seeded, and starts off; a note-density mutation steps from the density generated with; the
multi-phrase tension arc repeats every four phrases and starts off; and adaptive tempo pauses
while the controller is away and starts off; and the v2.1 release's checks in a real DAW and on
the reference machine move to v2.4 as well (§2, §3, §5, §6, §8, §9, §10, §11, §12). Change in
v1.27, the product owner's acceptance on 2026-10-03 of the scale proposed while the
settings-mutation engine was built: what one grade means for each setting, a mutated
profile-controlled value marking the profile customized, a harmony change dropping harmonic
carry-in that no longer fits, and `Sixteenth` staying unavailable to mutations once a session has
stepped down (§5). Change in v1.28, the product owner's decision of 2026-10-03: when a session
ends, every setting the settings-mutation flag changed returns to the value the player chose
before the session, the musical profile's "customized" marking included, as adaptive tempo resets
to the starting tempo, and the fresh phrase generated at the end uses the restored settings
(§5, §11). Change in v1.29, the product owner's decisions of 2026-10-05: v2.1, v2.2 and v2.4 are
compacted into one release, v2.0, with one definition of done and one release gate, so the
real-hardware checks are part of v2.0 again and v2.0 no longer ships before them; the labels
v2.1, v2.2 and v2.4 remain as names for parts of v2.0's scope; whether the checks of exports in
real programs must pass before v2.0 is tagged is left open; and the backing's voicing, register,
attack pattern and timbre are settled as built, after listening to them in sessions (§2, §6, §8,
§11, §12). Change in v1.30, the product owner's decision of 2026-10-05: a screen wake lock the
browser drops while a session is running is asked for again, silently (§6, §11, §12). Change in
v1.31, the product owner's decisions of 2026-10-06, after trying the reference hardware: USB is
the tested controller connection and Bluetooth MIDI is best-effort, with the USB correction
applied to every controller; and the checks of exports in real programs do not block the v2.0
tag, and follow it as a hand-check note on a v2.0.x update (§8, §11, §12). Change in v1.32, the
machine measurements of 2026-10-06 on the reference machine: the main-thread and cold-run checks
are met, the two measurement items of §12 are settled, and which moment the playhead check is
measured to is added to §12 (§11, §12). Change in v1.33, the product owner's ruling of
2026-10-06: a second caveat for the end-of-measure chord-fit check, on the short stray notes a
controller can send (§9). Change in v1.34, the product owner's decision of 2026-10-06: the
playhead check is measured to the moment the playhead's measure changes, so it is met (§11, §12).
Change in v1.35, the product owner's ruling of 2026-10-06: the checks that need a USB keyboard do
not block the v2.0 tag and follow it as hand checks on a v2.0.x update; the breath controller's
results stand for the tuning and the controller check, which calls for no manual
input-transposition setting (§11, §12). Change in v1.36, the product owner's rulings of
2026-10-07: the failure ladder no longer retries with carry-in after a search that covered every
candidate, an attempt with carry-in searches under a smaller allowance than v1's, and an attempt
dropped at its deadline is cancelled, so failed attempts no longer make phrases miss their
deadlines (§4); and items 4 and 12 of the definition of done are aligned with what v2.0 ships,
the settings-mutation flag, the multi-phrase tension arc and the played-notes export included
(§11). Change in v1.37, the product owner's rulings of 2026-10-07: the failure ladder keeps
time for the standalone attempt, cancelling a carry-in attempt and requesting the standalone one
at once when the deadline gets too close, so generation time is bounded whatever the generator
does; an attempt dropped at its deadline is always cancelled; the search allowance with carry-in
is 160,000 units, with the evidence of the full sweep (§4); and the generator's candidate order
no longer depends on the browser's locale, with v1's output kept byte-identical (§11 item 3).
Change in v1.38, the product owner's ruling of 2026-10-07: the measured cost of keeping time for
the standalone attempt is stated, and kept as is for v2: at 240 BPM phrase 2 is always a
standalone phrase, its join to phrase 1 not smoothed (§4). Change in v1.39: v2.0's release gate
passed on 2026-10-07, and v2.0 is released as version 2.0.0, with the tag pending; no rule changes.

## 1. Core concept

Infinite Flow is a client-side web practice partner for a monophonic instrument player. Through
v1, the app generated one static four-measure phrase in staff notation on demand; the player
regenerated it explicitly, with no playback, no MIDI input and no persistence.

v2 turns that static phrase into a **continuous session**: the app keeps generating and displaying
one phrase after another without the player asking again, plays a simple backing track under it,
listens to a MIDI controller and quietly acknowledges the notes the player gets right, and ends
each session with a review the player can export. The guiding principle carried over from v1 and
sharpened here: the app **acknowledges and encourages; it never penalizes, grades, ranks or
scores** the player. Anything that adapts to how the player plays is opt-in and visible.

v2 continues only from the app's **own** generated material — a player never seeds a continuation
with something they played themselves. That richer form of continuity (MIDI-seeded continuation
from a played motif, "my instrument," and local persistence across sessions) is v3.

## 2. Scope

### In scope for v2 (v2.0 to v2.4)

- A rolling sequence of phrases within a session, joined so the ear does not notice a seam.
- A simple, deterministic backing track (bass and block chords) with an optional metronome click
  and a one-bar count-in.
- A single-user local session model: start, run, and stop or time out, with no accounts, roles or
  server-side state.
- Reading a MIDI controller and acknowledging notes the player gets right, plus a one-time check
  that catches a controller/instrument-template transposition mismatch.
- A review of the last session, and exporting the whole session: the generated notes to MusicXML
  or MIDI, and the notes the player played to MIDI, each through its own export action.
- An opt-in, visible flag that lets the app quietly vary its own generation settings over the
  course of a session, and a separate opt-in flag that raises the tempo on a fixed schedule.
- Checking the timing, the controller check and the exported files on the reference hardware and
  in real programs: the v2.4 part of v2.0's definition of done (§11).

### Explicitly out of scope for v2

- Any generation seeded from something the player actually played (MIDI-seeded continuation) —
  this is v3.
- "My instrument": remembering a specific controller's transposition/offset across sessions —
  this is v3, and it will reuse the offset the v2.0 controller check detects.
- Marking favorite phrases in the review, and exporting only the favorites — v3, where favorites
  are settled.
- Persistence of any kind: session history or settings surviving a page reload — v2
  session state is fully ephemeral by design (see §7, Privacy).
- Reviewing any session other than the most recent one — v3.
- Editing, cutting, splicing or otherwise manipulating generated material in the review — out of
  scope entirely; the v2 review has no per-phrase action at all.
- A quiet, per-measure "did what you played fit the harmony" acknowledgement for players who
  embellish or improvise rather than playing the generated line exactly (the end-of-measure
  chord-fit check) — a nice-to-have for v3, not committed scope; §9 keeps its definition.
- Accompaniment with musical roles (harmonizing, contrasting, responding to the player) — v4.
- A staff-only session view, hiding everything but the staff and Stop while a session runs —
  v5. In v2 the audio mix stays reachable throughout a session (§5).
- Any grading, scoring, ranking or wrong-note signal, in any view, at any point — this is a
  permanent product-wide constraint, not a v2-specific gap.

### Changes to v1 at Idle

Outside a session, v2 keeps v1's workspace, with three changes to how v1 behaves. Each is stated
in full where it belongs:

- **A phrase whose notes do not fit the staff is replaced, not shown as a notation error.** The
  app generates a new one with the usual fresh-seed retries (§4). This is a second automatic
  regeneration, besides v1's instrument switch. While the rhythm settings are unsupported no
  phrase can be generated, so such a phrase gives way to no phrase, with the unsupported-rhythm
  alert (§4, §6).
- **A staff that cannot be shown for lack of space is a plain notice, not an error.** A window
  too narrow, or too short below the tablet-landscape layout's width, shows a notice with no
  retry action, which clears by itself once the staff fits; a new phrase is then generated (§4,
  §6). The same notice shows when every retry to replace a phrase whose notes do not fit has
  failed; a wider window, a changed setting or regenerating by hand then starts a new round of
  retries, the first two without the player asking, and the notice clears once a phrase fits, or
  gives way to no phrase if the rhythm settings become unsupported, before a round or during one
  (§4, §6). v1's notation error, with its retry action, stays only for a failure that retrying
  can cure.
- **Below the tablet-landscape layout's width, the `Sixteenth` note density is unavailable.**
  Phrases there are generated with `Eighth`, and a `Sixteenth` chosen while the window was wider
  is kept, applying again to the next phrase generated at or above that width. Unsupported rhythm
  settings are judged on the density a phrase is generated with (§5).

## 3. The generation unit and how phrases join

The four-measure phrase stays the unit of generation exactly as in v1 — the timeline type is not
widened. A phrase generated without carry-in (below) is exactly v1's result for its request and
seed; one generated with carry-in obeys every v1 rule too, except that it may end owing a leap
recovery or a tense note's resolution, which the next phrase settles (join mechanics, below).
Widening the timeline would ripple through harmony, rhythm, pitch and notation; instead, a session
is an **ordered sequence** of these phrases, and the join between one phrase and the next is
smoothed by a small, well-defined handoff.

**What crosses a join ("carry-in"):** only four things move from one phrase to the next —

1. the last sounding concert pitch of the phrase that just ended, together with its leap and
   leap-recovery state at that point;
2. its resolved register window;
3. its final harmony event (the chord and its role) and the "endpoint" class that chord belongs
   to;
4. the phrase's ordinal position in the session.

Nothing else is visible across the join — no stage of the next phrase ever revises anything about
the phrase before it (that kind of backward revision, letting a later phrase edit an earlier one,
is deferred to v3 entirely).

**Join mechanics:**

- If the ending phrase finished mid-leap (a large interval whose recovery step hasn't happened
  yet), the next phrase, generated with carry-in, inherits that recovery obligation exactly as if
  the leap had occurred inside a single phrase.
- A "tense" note (an unresolved scale tone) at the very end of a phrase may resolve onto the next
  phrase's first note, rather than being forced to resolve before the phrase ends; the next
  phrase, generated with carry-in, starts on that resolution. Resolving further forward, into the
  next phrase's own material past its very first note, is not attempted in v2. The full v1 rule —
  a tense note must resolve before the last note — holds for every phrase generated without
  carry-in.
- **A join made without carry-in is not smoothed.** The standalone phrase of the failure ladder
  (§4, step 2) is generated without regard to the phrase before it, and a repeated phrase (§4,
  step 3) is the previous phrase again, as it was. Across such a join the interval and register
  rules do not apply, and a leap recovery or a tense note's resolution left owing by the phrase
  before is not settled. The standalone phrase itself obeys v1's rules in full, so it never ends
  owing either; a repeated phrase ends as the phrase it repeats did.
- **A session's last phrase may end with something still owed.** The app cannot know in advance
  which phrase a session will end on: Stop, the silence timeout, a hidden tab, a lost controller
  or a staff that can no longer be shown can each end it at any moment, usually mid-phrase. The
  carry-over between phrases is kept anyway: when the session ends, it ends there. A session's
  last phrase, in the review and the export, may end owing a leap recovery or a tense note's
  resolution that no next phrase settles, just as it may be cut off mid-phrase. The same holds
  before the failure ladder's standalone phrase or a repeat, whose join is not smoothed (above).
  Rejected: making every session phrase end as v1 requires, so that any phrase is a clean place
  to stop, at the cost of joins that sound more like one phrase stopping and the next starting.
- Every phrase in a session, after the first, still starts with a fresh attack on beat 1 of its
  first measure. There is no tie or rest carried across a join in v2 — that (along with pickup
  measures) is left for v3, which already has to solve it for player-seeded continuations.
- A register set to "Varying" is resolved once per session, at phrase 1, and then stays fixed for
  the whole session unless a control change forces a re-resolution. A fixed register setting (Low,
  Middle, High) behaves exactly as in v1.
- Each phrase's own tension arc (build and release within its own four bars) is independent of
  carry-in and of any other phrase in the session by default. A separate, opt-in **multi-phrase
  tension arc** flag lets tension rise and fall across a longer arc spanning several phrases
  instead; it is confirmed as v2.2 scope, but is not considered urgent for that release. Unlike
  the always-on single-phrase arc, this is a player-facing control with its own visible on/off
  toggle, on the same footing as the settings-mutation flag (§5) and adaptive tempo (§10) —
  presentation is a UI/UX design decision, not specified here. The toggle starts off. While it
  is on, the arc runs in groups of four phrases (16 measures), counted from phrase 1: the first
  phrase of each group is generated with the chosen tension arc (so phrase 1, generated at Idle,
  already fits), the second one step tenser, the third as chosen again, and the fourth one step
  calmer, in the order Settled, Lift, Build, Edge, with no step past either end. The tension-arc
  setting keeps showing the player's choice; only what each phrase is generated with changes.
  When the settings-mutation flag (§5) changes the tension arc, the longer arc steps around
  whatever value is then in effect.

## 4. Look-ahead and failure handling

The app always looks one phrase ahead: as soon as phrase _N_ starts sounding, phrase _N+1_ is
requested, and it must be generated and engraved before its **deadline** — the start of phrase
_N_'s last measure. That leaves at least one measure of read-ahead visible on screen at all times.
At session start, the phrase already on screen before Start was pressed becomes phrase 1 of the
new session (there is no separate "generate phrase 1" step), and phrase 2 is generated during the
one-bar count-in, before the count-in ends. No session can start while a new phrase is being
generated (§6), so phrase 1 is never ambiguous. No session starts while the last session's
review shows (§6): the player leaves it first, and phrase 1 is then the phrase on screen at Idle,
first generated fresh when the previous session ended (§7) and possibly replaced since, never one
the previous session played.

**A look-ahead phrase must also fit the staff.** During a session, a phrase is only valid if it
can be drawn at the staff's minimum readable size in the staff layout the session holds (§6).
Whether it fits depends on its own content, so a generated phrase can fail to fit. A phrase that
does not fit is never shown: it counts as a failed attempt, exactly like a generation that found no
phrase, and goes through the same steps below. The check is invisible to the player. A phrase is
checked against the window's size at the time it is checked. Once it has passed, it is not
retried: if a later change to the window's size means it no longer fits before it is drawn, the
session ends instead (§6). So a session never shows a notation error for a look-ahead phrase, as
it never shows one for a resized window (§6).

**At Idle, a phrase whose notes do not fit is replaced too.** This changes v1's behaviour, where
such a phrase showed the notation error. At Idle, whenever a phrase is about to be drawn (a newly
generated one, or the one on screen when a change to the window's size means it no longer fits),
and the window has room for the staff (§6) but this phrase's notes need more width than the
staff's minimum readable size allows, the phrase is not drawn. The app quietly generates a new
one with the same fresh-seed retries as in a session: the first step below, up to three retries.
An Idle phrase has no carry-in and no deadline, so the later steps do not apply. Each retry is
generated with the note density the window gives when it is generated (§5). While the retries
run, a new phrase is being generated, so no session can start (§6). While the rhythm settings
are a combination v1 disallows, no retry can run: a phrase that stops fitting then gives way to
no phrase, with the unsupported-rhythm alert, and retries during which the window's width makes
the settings disallowed stop at once, with the same outcome (§6). A retry that fits is shown
like any generated phrase, with its own seed. Only when every retry fails does the app show the
plain notice that the staff needs more room (§6); no notation error is shown for it. The
generator's output for a given request and seed does not change; which seed ends up shown can
depend on the window's size, at Idle as in a session. The notice has two causes (§6): no room for
the staff, or notes too dense for the room it has. When it clears because the staff fits again,
the phrase last on screen is not drawn again: a new phrase is generated, with the same retries,
and if every one of them is too dense, the notice shows again with the second cause. While it
shows with that cause, anything that could cure it starts a fresh round of the same retries by
itself: the window getting wider, a change to a setting the phrase is generated from, or
regenerating by hand. The first phrase that fits clears the notice and is shown; if every
attempt of the round is too dense, the notice stays. The window getting narrower never starts a
round, and neither does the window getting wider while a round runs: the round carries on. A
change that makes the rhythm settings unsupported starts no round either, and a wider window
that does so while a round runs stops it; either way the notice gives way to no phrase at all
(§6). Whatever happens, the notice never gives way to a phrase shown
before.

If generation fails, the player never sees a v1-style blocking alert during a session. Instead:

1. retry silently, up to three times, with a fresh seed and the same carry-in, while the time left
   before the deadline still leaves the standalone attempt of step 2 the time it needs (below). A
   carry-in attempt that failed because its search covered every candidate without finding a
   phrase is not retried with carry-in: the generator's candidates do not depend on the seed,
   which only orders them, so every retry would fail the same way, and the ladder goes straight to
   step 2. An attempt stopped by its search allowance (below), or a phrase that does not fit the
   staff, is still retried while the time allows;
2. if that keeps failing, retry once more **without** carry-in, as a standalone phrase — the join
   isn't smoothed (§3), but a valid phrase is shown;
3. if the deadline passes regardless, **repeat the previous phrase** as the next one, and record
   the repeat in the session history; that join isn't smoothed either (§3);
4. after two consecutive repeats, show a small, non-blocking notice ("the generator is struggling
   with these settings") without stopping the session. It stays until a newly generated phrase
   (not a repeat; a standalone phrase counts) starts sounding, and goes when the session ends.

The session is never stopped by a generation failure — that would be a penalty the player didn't
cause, and repeating a phrase is musically harmless. "Generation failure" here covers both kinds of
failed attempt: no phrase found, or a phrase that does not fit the staff. A phrase is repeated
only when no attempt has produced a valid phrase by the deadline, and the repeat is recorded in the session history the same
way whichever kind of failure led to it (§7).

**Failed attempts must not use up the deadline.** A failed attempt can take far longer than a
successful one, so the ladder is held to four more rules:

- **The ladder keeps time for the standalone attempt.** When the time left before the deadline
  falls below what the standalone attempt of step 2 needs, the attempt with carry-in running at
  that moment is cancelled where it runs, and the standalone attempt is requested at once. No
  carry-in attempt starts once that point is reached; when the deadline is that close from the
  moment the phrase is requested, as a one-measure deadline can be at a fast tempo, the
  standalone attempt is the first one made. This bounds the time generation takes whatever the
  generator does. The time a standalone attempt needs, and the time cancelling an attempt costs
  where it runs, are constants the build measures and documents with their evidence. Which
  attempt produces a phrase can therefore depend on the machine's speed, as whether a phrase is
  repeated already could; what each attempt generates for its request and seed never does.
  **Measured, and kept as is for v2.** The build measured, in Chromium, a standalone attempt at
  up to 618.6 ms and the worker's restart at up to 80 ms (median 49 ms), and keeps 0.95 s and
  0.125 s for them, margins included: 1.075 s in all. That is longer than one measure at 240 BPM
  (1 s), the whole of phrase 2's deadline, so at 240 BPM phrase 2 is always requested as a
  standalone phrase first: it never carries in from phrase 1, and that join is never smoothed
  (§3). Every later phrase, with a three-measure deadline, starts with its carry-in attempts. At
  60 and 120 BPM the rule rarely drops carry-in: in the full sweep of 2026-10-07, once at 60 BPM
  and twice at 120 BPM, out of 2,840 joins at each tempo. The product owner keeps this as shipped for
  v2. A smaller standalone budget, covering look-ahead attempts only, would have left phrase 2 a
  short carry-in window at 240 BPM, at the risk of a standalone attempt near its search allowance
  outrunning it; it was turned down. Generating phrases ahead before Start, which would let
  phrase 2 carry in again at fast tempos, is a candidate for v3.
- When step 1 skips or cuts short its carry-in retries, for either reason above, the standalone
  attempt of step 2 is generated with the same request and seed it would have had after three
  failed retries, so skipping changes which attempts run, never what the standalone attempt
  generates.
- **Search allowance.** An attempt with carry-in searches under a smaller allowance than v1's:
  160,000 units per window, against v1's 250,000. In the full sweep of 2026-10-07 the largest
  successful attempt with carry-in used 131,137 units (3,366 successful attempts with carry-in;
  99.9th percentile 73,646). Every attempt without carry-in keeps v1's allowance of 250,000, so
  its output for a given request and seed stays byte-identical to v1 (§11 item 3): a session's
  first phrase, the standalone attempt of step 2, every attempt of a phrase whose carry-in a
  settings change left unusable, and every phrase at Idle. A carry-in attempt that reaches its
  allowance fails like any other attempt and climbs the ladder. The allowance counts search
  steps, not time, so it does not by itself bound how long an attempt takes; the first rule
  above does.
- **A dropped attempt is cancelled.** The attempt still in flight at the deadline is cancelled
  where it runs, so a later request never waits behind it.

## 5. Control changes during a session

Once a session is running, **the settings UI is locked** — every generation-affecting control
(instrument, density, syncopation, register, key/collection, and so on) is only editable while the
app is Idle or showing the Review. The player's hands are on their instrument during a session, not
on the keyboard or mouse, so there is no need for, and no support for, editing a setting manually
mid-session.

This lock does not cover the transport (Stop) or the audio mix (backing/click mute and volume) —
those aren't generation settings, change nothing about what gets generated, and stay reachable
throughout a session the same way a mixer's physical controls would.

The only things that can change mid-session come from two **automatic** sources, each its own
opt-in flag:

- **The settings-mutation flag.** When turned on, it lets an eligible setting drift by at most one
  grade, in either direction, every few phrases. Eligible settings are everything **except**
  instrument selection and tempo (tempo has its own, separate adaptive-tempo flag, described in
  §10). If a mutation would land on a setting combination the generator doesn't support, it
  re-mutates — rerolling again — until it lands on a supported combination; an unsupported
  combination is never applied, and the mutation cycle is never silently skipped. The number of
  phrases between two mutations, and before the first one from the session's start, is drawn at
  random from 2 to 4, from a seeded source, so a session's mutations can be replayed from its
  stored inputs. The flag is opt-in: it starts off. This flag ships in **v2.1**. One grade
  means: the ordered settings (harmonic motion, tension arc, note density, rhythmic
  variety, syncopation, silence density, leapiness, arpeggio chaos) step one place along their
  catalog order, with no wrap; the key steps one place around the circle of fifths, wrapping; a
  collection steps within one of two groups it never leaves, Major ↔ Minor, or the modes by
  brightness (Lydian, Ionian, Mixolydian, Dorian, Aeolian, Phrygian, Locrian), with no wrap; any
  other contour is one grade away; register steps Low, Middle, High, with no wrap, and never lands
  on Varying: from Varying it steps from the register the session resolved, and the session then
  holds that concrete register; the musical profile flips Neutral ↔ Jazz as an identity change
  only, keeping every control, marking the profile customized and never applying the preset
  bundle. Mutating a value the musical profile controls marks the profile customized.
  A mutation lasts only for its session. When the session ends, however it ends, every setting the
  flag changed during it returns to the value the player had chosen before the session started,
  just as adaptive tempo resets the tempo control to the starting tempo (§10): a register mutated
  from Varying returns to Varying, and the musical profile's "customized" marking returns to what
  it was before the session. The restore does not touch the flag's own on/off choice. It happens
  as the session ends, so the fresh phrase generated at the end (§4, §7) is generated from the
  restored settings.
- **Adaptive tempo,** described fully in §10, ships in **v2.2**.

Neither source exists in v2.0, so nothing can change a setting during a v2.0 session. Applying a
change at a phrase boundary, as follows, ships with the first source that needs it, the
settings-mutation flag, in v2.1.

Whichever of these fires, the change applies at the next **phrase boundary**: the first phrase
that has not yet started sounding. If a look-ahead phrase was already generated with the old
settings and none of it is on screen yet, it is discarded and regenerated with the new ones,
provided at least one measure remains before its deadline. Otherwise, when some of it is already
drawn as read-ahead or less than a measure remains, it stays as it is, and the change applies from
the phrase after it. No note already on screen ever changes because of a setting change. A key or
collection change drops the harmonic part of carry-in (the pitch part still applies, re-checked
against the new range and register window), and so does a change to harmonic motion or another
harmony setting when the harmonic part no longer fits it; a register change re-resolves
"Varying." When an
automatic change lands, the settings UI updates to stay truthful about what's currently in effect,
but with **no highlight, scroll, or screen shift** — the player's attention stays on what's coming,
not on what just changed behind them.

The instrument template itself is never touched by either automatic flag and stays locked for the
whole session — an instrument switch is rare and, per v1, already regenerates and keeps the
written key.

**Note density below the tablet-landscape layout's width.** This changes v1's behaviour. Below
the width where the interface design switches to its tablet-landscape layout, the `Sixteenth`
option of note density cannot be chosen: it is the most likely cause of a phrase too dense to fit
a phone's staff. The chosen value is kept as chosen; what the window's width changes is the
density a phrase is **generated with**. v2 saves no settings across a page reload (§2), so the
kept value lasts as long as the page. This is not a ban on sixteenth notes: other settings, such
as rhythmic variety, can still produce some. How the unavailable option is shown is a UI/UX design
decision.

- **The density follows the window's current width.** Whenever the window is below that width
  when a phrase is generated, a chosen `Sixteenth` generates as `Eighth`; at or above it, the
  chosen value applies, as in v1, except in a session that has stepped down (next point). This
  holds at Idle and during a session alike: a session's locked setting is the chosen value, and
  the density a phrase is generated with is taken from the window when that phrase is generated.
  A crossing of that width therefore applies to the next phrase generated, including the next
  attempt of a round of retries at Idle (§4). A phrase already on screen, or a look-ahead phrase
  already checked and waiting to be drawn, is never regenerated because the window crossed that
  width: it stays if it still fits, and otherwise it is replaced at Idle (§4), or gives way to no
  phrase there if the rhythm settings are then unsupported (§4, §6), or the session ends (§6).
- **During a session, the density only steps down.** Once a session has generated a phrase with
  `Eighth` under this rule, every later phrase of that session is generated with `Eighth` too,
  even if the window becomes wide enough again; the chosen value applies again from Idle. Phrase
  1 is the phrase already on screen at Start (§4), generated at Idle with the density that
  applied then; the session's own generation starts with phrase 2.
- **Unsupported rhythm settings are judged on the density generated with.** Below that width, a
  chosen `Sixteenth` counts as `Eighth`, so a combination v1 disallows only because of
  `Sixteenth` blocks neither generation nor a start there. A crossing at Idle can therefore make
  the current settings blocked or unblocked, and one that blocks them while retries run stops
  them (§4). During a session this can never bring the session
  onto a disallowed combination: the density can only step from `Sixteenth` down to `Eighth`,
  never back up, and no combination v1 disallows uses `Eighth`.
- **The settings-mutation flag** (v2.1) treats `Sixteenth` as unavailable below that width: a
  mutation that would land on it mutates again, as for a combination the generator does not
  support. A note-density mutation steps from the density a phrase is actually generated with,
  and `Sixteenth` counts as unavailable to a mutation whenever the session generates with
  `Eighth` under this rule, whatever the window's width; once the session has stepped down, it
  stays unavailable to mutations until the session ends.

## 6. Backing, click, count-in and tempo

- **Backing.** v2 adds a bass line and block chords that follow the phrase's own generated
  harmony — in pitch, and on the beat. It is a pure, deterministic renderer over the harmony (not
  a generated voice with its own seed): the bass plays the chord's root at each harmony event and
  on every beat 1 (adding the fifth on beat 3 for a four-beat event); the chords play a
  close-position triad, similarly re-attacked. The voicing, register, attack pattern and timbre
  are settled as built, after the product owner listened to them in sessions: the bass plays roots
  in MIDI 36–47 (roughly C2–B2), and the fifth it adds on beat 3 stays in that band, even below
  the root; the chords are the highest close-position triad whose top note is at or below E4,
  attacked on each chord change and each downbeat, never on beat 3. It is synthesized in-app with
  plain Web Audio nodes — no sample libraries, so it stays fully offline-safe with no extra
  download and no licensing
  entanglement. It plays only while a session is running, and keeps playing through the
  player's silences. There is no generated lead-line playback, and no accompaniment with musical
  roles (harmonizing, responding, contrasting) — that is v4.
- **Click:** on by default, quarter notes with beat 1 accented — it's what makes the tempo
  readable before the backing itself makes musical sense. Backing on/off, backing volume, click
  on/off and click volume are all separate mix controls, reachable at all times (§5). The click
  on/off setting governs the session from phrase 1 on; the count-in clicks whatever it says
  (below). **The click volume control never reaches silence:** its lowest setting is still
  audible, and turning the click off is the on/off switch's job alone. Its exact range and
  default level are left to the interface design.
- **Count-in:** one measure of click before phrase 1, for both ways of starting a session — a
  Start click, or a MIDI note. **The count-in always clicks,** even when the player has turned the
  click off, because it is the only thing that sets the tempo before bar 1. It plays at the click
  volume, which is never silent (above), so it is always audible. **Only one MIDI note
  can start a session: the note phrase 1 starts on** (its first attacked note; phrase 1 is the
  phrase already on screen, §4). Any other note played while the app is Idle starts nothing, and
  while the review shows, no note starts anything, that one included (below).
  Nothing played while the player is connecting a controller or running its transposition check
  (§8) can start a session either, not even that same note: connecting is a step of its own. Nor
  can it start one while a session cannot start at all (below). The MIDI case still needs the count-in, because the
  app can't know in advance where the player's own beat 1 falls, and the count-in is what sets it.
  - **The starting note must be that exact note, octave included.** Its position on the staff
    fixes its octave, so C4 and C5 are different notes here (an octave is 12 half steps, for
    example from C4 up to C5). The match uses the same rule as expected-note acknowledgement
    (§8): the exact concert pitch of that written note under the instrument's transposition.
  - **A note that starts nothing changes nothing on screen** — no mismatch hint, as everywhere
    else. Instead, a neutral line names the note that starts the session whenever playing it would
    start one: a controller is attached (§8), the player is not connecting one, and a session can
    start (below). At any other time no note is named, since none would start anything. How the
    line looks is a UI/UX design decision.
  - **The starting note only starts the count-in.** It is not phrase 1's first note already
    played, and it belongs to no phrase in the history or export. After the count-in the player
    plays phrase 1 from its first note, on beat 1.
  - **The count-in is shown as well as heard**, for both kinds of start: its beats are counted on
    screen in time with the click, and phrase 1's whole first measure stays fully visible
    throughout the count-in. How the count looks is a UI/UX design decision.
  - **No session starts while the review shows.** The product owner's decision: one leaves the
    review before starting a new session. While the review of the last session shows (§7),
    neither a Start click nor any MIDI note starts a session, the starting note included, and no
    starting note is named. Connecting a controller and its transposition check (§8) work there
    as at Idle. The player leaves the review first,
    then starts from Idle as usual. How the review is shown and left is a UI/UX design decision.
    Rejected: starting a session directly from the review, by a Start click or by the starting
    note, which let a note played while looking back discard a review not yet exported.
- **When a session can start.** At Idle, a session starts only while every one of these holds. While any of them does not, neither a Start click nor any MIDI note
  starts a session, the starting note included, and no starting note is named. Once they all hold
  again, starting works as above. How an unavailable start looks is a UI/UX design decision.
  While the review shows, no session starts at all (above); once the player leaves it, these
  conditions apply as at Idle, so a session still does not start while the next phrase 1 is
  being generated after a session end (§7).
  - **A phrase is on screen, drawn in full.** Not before a first phrase has been generated, and not
    while the phrase cannot be drawn (v1's notation error, now kept only for a failure that
    retrying can cure).
  - **No new phrase is being generated.** Phrase 1 is the phrase already on screen (§4); while a
    regeneration is under way, that phrase is about to be replaced, so which phrase would be phrase
    1 is not clear. This includes the retries that replace a phrase whose notes do not fit the
    staff (§4). Starting works again once the new phrase is on screen.
  - **No generation failure is being reported.** While the app reports a failed generation (v1's
    generation-failure state, whether or not the previous phrase is still on screen), the player
    has to regenerate successfully first. So a session never starts with a failure report on
    screen.
  - **The rhythm settings are a combination v1 allows.** A combination v1 disallows can never
    start a session (§11). It is judged on the note density a phrase would be generated with:
    below the tablet-landscape layout's width, a chosen `Sixteenth` counts as `Eighth` (§5).
  - **The staff is shown.** Not while the rotate-device notice replaces it (a portrait-shaped view
    below the desktop layout's width), and not while phrase 1 cannot be drawn at the staff's
    minimum readable size in the layout a session would hold, within the window's width and,
    below the tablet-landscape layout's width, its height too (below). At Idle, the staff not
    shown for lack of space is a plain notice, not an error (next point). A session started there
    would end at once, since a session ends as soon as the staff can no longer be shown (below).
    Once the staff can be shown again, the other conditions apply as usual.
- **At Idle, a staff with no room is a plain notice, not an error.** This changes v1's behaviour,
  where a phrase that could not be drawn in the window showed the notation error, whose retry
  action cannot help until the window changes. When the staff cannot be shown for lack of space (a
  window too narrow, or, below the tablet-landscape layout's width, too short for the staff's
  minimum readable size), the app shows a plain notice that the staff needs more room, with no
  retry action. The notation error, with its retry action, is kept only for a failure that
  retrying can cure. No session starts while the notice shows (above). Its wording and look are
  UI/UX design decisions. The rotate-device notice is unchanged, and during a session this notice
  never appears: a staff that can no longer be shown ends the session instead (below). The notice
  has two causes, and what clears it depends on the cause; either way, it gives way only to a new
  phrase or, under unsupported rhythm settings, to no phrase, never to one shown before:
  - **No room for the staff.** The notice clears by itself once the staff fits, and a new phrase
    is then generated with the retries of §4: the phrase last on screen is not drawn again. If
    every attempt is too dense to fit, the notice shows again, with the second cause. While the
    window has no room, a phrase generated by hand cannot be shown either, so the notice stays.
    When the notice clears while the rhythm settings are a combination v1 disallows (judged on
    the note density a phrase would be generated with, §5), no phrase can be generated: none is
    shown, as before a first phrase exists, with the unsupported-rhythm alert showing as it does
    there, and generation stays blocked until the settings change. The phrase last on screen is
    not drawn again, and nothing is generated by itself once the settings are allowed again.
  - **Notes too dense for the room.** The window has room for the staff, but every retry to
    replace a phrase whose notes do not fit has failed (§4). Anything that could cure it starts a
    fresh round of those retries by itself: the window getting wider, a change to a setting the
    phrase is generated from (tempo, the audio mix and the theme cannot change the notes, so they
    start nothing), or regenerating by hand, since the phrase action stays available beside the
    notice. The first phrase that fits clears the notice and is shown; if every attempt of the
    round is too dense, the notice stays until the next such change. The window getting narrower
    never starts a round; one narrowed until the staff has no room gives the notice the first
    cause. While a round runs, a new phrase is being generated, so no session starts (above), and
    of the three things that start a round, only the window can change during one: while a phrase
    is being generated, the settings it is generated from are read-only and the phrase action is
    unavailable, as in v1. The window getting wider during a round neither restarts it nor queues
    another: the round carries on, each remaining attempt generated with the note density the
    window gives when it is generated (§5) and checked against the window's size when it is
    drawn, and if it fails, the notice stays until the next such change. A single widening that
    lands inside a round's brief run can therefore look as if it did nothing; that is accepted,
    since a player dragging a window edge keeps widening after the round ends. A narrowing below
    the tablet-landscape layout's width during a round steps its remaining attempts down to
    `Eighth`, and the round carries on. A change that would start a round but makes the rhythm
    settings a combination v1 disallows (judged on the note density a phrase would be generated
    with, §5) starts none, since no phrase can be generated: a setting change can do this, and so
    can the window getting wider past the tablet-landscape layout's width with a chosen
    `Sixteenth`. That widening, made while a round runs, stops the round at once instead, and
    none of its attempts is drawn. The notice then gives way exactly as when it clears under
    unsupported settings (previous point): no phrase is shown, as before a first phrase exists,
    with the unsupported-rhythm alert showing, and generation stays blocked until the combination
    is allowed again, by a setting change or by the window crossing that width (§5). Once it is,
    nothing is generated by itself: the player generates a phrase by hand.
  - **A phrase that stops fitting under unsupported rhythm settings.** Outside the notice, a
    rhythm setting that makes the combination unsupported while a phrase is on screen leaves that
    phrase on screen, with the alert, as in v1, as long as it fits. One that stops fitting while
    the combination is unsupported is not drawn, and no retry runs (§4). It does not take the
    notice either, whose cures cannot work while no phrase can be generated: no phrase is shown,
    with the unsupported-rhythm alert, exactly as when the notice gives way under unsupported
    settings (above). Its most likely cause is one widening past the tablet-landscape layout's
    width, which both changes the staff's layout, so the phrase may no longer fit, and can make a
    chosen `Sixteenth` combination disallowed (§5). A window with no room for the staff at all
    still shows the notice, which is about the window; when it clears, the first point applies.
- **Tempo stays transport-only.** It is never part of what's generated — the same seed and
  settings always produce the same material, at any tempo. The known consequence (very fast note
  density becoming hard to play at very high tempo) is accepted for v2: the player chose both
  values, and a later opt-in link between density and tempo is a possible v3+ idea, not a v2
  requirement.
- **The audio clock is the one master clock** for the backing, the click, the on-screen playhead
  and the matching of played notes (§8): everything is scheduled and read against it, not against wall-clock
  time, so the playhead and the audio it represents never visibly drift apart. A muted backing
  does not stop this clock — muting is implemented as silencing the sound, never as suspending the
  clock itself.
- **Starting audio at all** needs a user click. Browsers do not count a MIDI note as the kind of
  interaction that unlocks audio. A Start click is such a click, so it can always start a session
  with sound whenever a session can start at all. For a MIDI note to be able to start a session, the player must first have clicked
  **"Connect controller"**. That one click is the click that unlocks audio, and it also requests
  MIDI permission, so both restrictions are lifted together. There is no separate audio-unlock
  step.
- **The screen stays awake during a session.** A session runs 5 to 30 minutes with no touch, so
  a tablet, phone or laptop would otherwise dim and lock mid-session, and on a phone a locked
  screen hides the tab, which ends the session (next point). The app holds a screen wake lock from
  the moment the session starts (the Start click or the starting note, so the count-in is covered)
  until the session ends, however it ends, and releases it then. If the browser refuses the lock
  or does not support it, the session runs as normal and nothing is shown: a message is not worth
  pulling the player's eyes off the staff. A browser may also drop a granted lock by itself while
  the session is still running, for example to save power; while the session runs and the page is
  visible, the app then asks for the lock again, silently, and shows nothing either way.
- **A hidden browser tab ends the session immediately**, exactly like a manual Stop — the backing
  and click fade out over about 100 ms, and the review opens (or, during the count-in, the app
  goes back to Idle, §7). Browsers already throttle timers in hidden tabs, so a paused-and-resumed
  clock could never resume cleanly; there is no pause/resume state in v2 at all.
- **A session is held in landscape, and ends when the staff can no longer be shown.** Like v1,
  the app has no portrait layout below the desktop layout's width: a portrait-shaped view there
  shows a rotate-device notice instead of the staff. From the moment the session starts (the Start
  click or the starting note) until it ends, however it ends, the app asks the browser to lock the
  screen in landscape orientation, and releases the lock at the end. If the browser refuses the lock or does not support it, the session
  runs as normal and nothing is shown. In practice the lock is usually refused on a phone: Chromium
  grants it only to a page in fullscreen, and the app does not go fullscreen. So what normally
  applies is the next rule: **whenever the staff can no longer be shown during a session,
  count-in included, the session ends exactly like a manual Stop.** That happens in two cases:
  - **The view becomes portrait-shaped below the desktop layout's width,** where the rotate-device
    notice would replace the staff and Stop, whatever caused it: a phone or tablet turned to
    portrait, a split-screen view, or a window resized on any device.
  - **The window becomes too small to draw the staff readably** in the layout the session holds.
    That layout is fixed at Start by the window's width alone, never by phrase 1's content, and
    stays in use until the session ends; which layouts exist, and at which widths, is a UI/UX
    design decision. A session never shows a notation error, so a staff that can no longer be
    drawn at its minimum readable size ends the session instead. That minimum size is the one the
    UI/UX design fixes for the staff.
    - **Width and height.** From the tablet-landscape layout's width up, only the window's width
      counts: the window is too small when it gets too narrow. Below that width, the staff must
      fit the window's height as well: the whole staff, together with the row above it where the
      session shows the count-in and its notices, has to fit inside the window, so a window too
      short for it counts as well as one too narrow. The height is measured with the browser's
      toolbars showing, so a toolbar appearing or hiding never ends a session.
    - **What is checked.** On every change to the window's size, the check covers what is on
      screen and every part of a phrase already checked and waiting to be drawn (in a layout that
      draws a phrase in parts, the part of the next phrase, or of a repeated phrase, not yet
      drawn). If any of it no longer fits, the session ends. A look-ahead phrase still being
      generated at the time is checked when it arrives, against the window as it is then, and one
      that does not fit is retried instead (§4).

  Any other change to the window's size during a session does not end it: the staff is redrawn
  at the new size, in the same layout; how that looks is a UI/UX design decision. Nor can a
  session start while the staff is not shown (When a session can start, above).

## 7. Sessions, review, export and privacy

**Starting and ending.** A session starts on a Start click, or on a MIDI note that is the note
phrase 1 starts on, once a controller is connected and audio is unlocked (§6 gives the full rule,
including the notes that can never start a session, and the states in which nothing can start
one: a new phrase being generated, a phrase that cannot be drawn, a generation failure being
reported, unsupported rhythm settings, and the staff not being shown). Whatever the controller situation, a session also ends on a hidden tab, or
as soon as the staff can no longer be shown (a portrait-shaped view, or a window too narrow for
the staff or, below the tablet-landscape layout's width, too short for it, including for phrase
material already waiting to be drawn), each exactly like Stop (§6). With a controller attached,
it ends after
more than 30 seconds without any note played, or on Stop; that 30-second timer only starts
counting once the player has played at least one note, so clicking Start and taking a moment
before playing never times out. A controller can only be connected between sessions (§8), so a
session started without one stays without one for its whole length, and only Stop ends it. While a
connected controller falls silent mid-session (catching a breath, or losing their place), the
phrase keeps rolling regardless — the pressure to keep up is deliberately mild: phrases keep being
generated and played at tempo, and the app only tracks, on the audio clock, which note is due
next. Expected notes that fall due while the player is silent simply go unacknowledged, like any
note not played. **Falling silent and losing the controller are different things:** silence is
covered by the 30-second rule above, unchanged, while a controller that disappears mid-session
follows its own rule in §8, which can also end the session. "With a controller attached" has the
precise meaning given in §8.

**What's recorded, and why both forms are kept.** For every phrase that actually started sounding
during the session (a look-ahead phrase that was only ever shown as read-ahead, and never
sounded, does not count), the session history keeps both: the exact generated timeline as it was
shown (so the review and export can never disagree with what actually played, even if a later
version of the generator would produce something different from the same inputs), and the
original reproduction inputs — the resolved request, seed, and carry-in — so that "every phrase in
this session is exactly reproducible from its stored inputs" is a testable guarantee, not an
assumption. The resolved request holds the settings the phrase was actually generated with, note
density included: `Eighth` rather than a chosen `Sixteenth` for every phrase generated with
`Eighth` under §5's rule, whether the window was below the tablet-landscape layout's width or the
session had already stepped down to `Eighth`. This also
stores whatever a v3 persistence/continuation feature will need later. The
history additionally records each phrase's acknowledgements and the played notes whose onsets fall
within it (each with its concert pitch, velocity, onset and release on the audio clock), and marks any phrase that is a repeat inserted by the failure ladder in §4, the same way whether
the attempts failed because no phrase was found or because none fit the staff — internally
only: the review itself never visibly distinguishes a repeated phrase from any other phrase, since
a repeat is a generator implementation detail, not something worth surfacing to the player. There
is no cap on session length; the review must stay responsive regardless of how long a session ran.

**The last-session review.** Every phrase that started sounding appears, in order, engraved exactly
as it was displayed (written pitch, key signature, chord symbols), each with its phrase number and
the tempo it played at: these are the phrases the session history holds (above), so a look-ahead
phrase only ever shown as read-ahead is not among them. The generated notes are always shown; the
notes the player actually played are **optional**, shown only on a toggle, and when shown they are
unquantized and neutrally colored, possibly indicating which ones matched the script — this is an
appreciation of having followed the line, never a score, and there is still no coloring anywhere for
a note that didn't match. The review has no favorites: marking phrases is v3 (§2). Only the most
recently completed session's review exists. It opens when the session ends, and no session starts
while it shows (§6): the player leaves it first. Leaving keeps it, reachable again until the next
session starts or the page closes. Starting that next session discards it without asking for
confirmation. Closing or reloading the page discards everything without asking.

**The next session's phrase 1.** At every session end once phrase 1 has started sounding, the
ended session's phrases leave the staff (they are all in the review) and the app generates a fresh
phrase from the current settings, with a fresh seed and no carry-in, exactly as regenerating by
hand at Idle would, the retries that replace a phrase whose notes do not fit included (§4). The
next session's phrase 1 is the phrase on screen at Idle when it starts (§4): this fresh phrase,
unless it has been replaced since, by any of the ways that replace a phrase at Idle. Neither the
ended
session's last phrase nor its phrase 1 is offered again: a player who wants endless new material
should not start a session on a phrase already read. While it is being generated, no session
starts (§6). If the staff has no room at that moment, nothing is generated until the notice that
the staff needs more room clears, as at Idle (§6). Like any generation at Idle, it may also end
with a generation failure being reported, or, when the rhythm settings are a combination v1
disallows for the note density the window now gives (§5), with no phrase at all, as when that
notice clears under such settings (§6); once the player leaves the review, the conditions under
which a session can start (§6) apply as at Idle.

**A session ended during the count-in** — by Stop, a hidden tab or the staff no longer being
shown, before
phrase 1 starts sounding — has nothing to review: no phrase started sounding, so its history holds
no phrase. The app goes straight back to Idle with phrase 1 still on screen as the Idle phrase, and
no review opens. The previous session's review is not restored either: starting this session had
already discarded it, and it stays discarded.

**Export.** Getting what was played out of the app matters as much as getting the generated
material out, so the review offers two export actions, one per content: one exports the
**generated notes**, the other the **played notes**. Each action delivers exactly one file, as a
browser file download, with no upload and no server-side step anywhere.

- **Scope:** every export covers the whole session. Its phrases sit back to back in session
  order, each keeping its session phrase number, with no gap between them, starting at time zero
  with phrase 1.
- **Content:** the action the player triggers decides it. Played notes only ever leave the app
  when the player triggers the played-notes action; the generated-notes action never carries
  them.

**Generated notes** come in one file, MusicXML or MIDI; the generated-notes action lets the
player choose the format:

- **MusicXML** (score-partwise 4.0): one part, in the session's instrument's own written pitch
  with a `<transpose>` element carrying that transposition (omitted for a C instrument); chord
  symbols always included; each phrase marked with a rehearsal mark; every phrase but the last
  closed by a double barline (two thin lines) and the last by a final barline (a thin line then a
  thick one); a metronome mark at the start and at every tempo change. MusicXML only ever holds
  generated notes: unquantized playing can't be faithfully engraved, and quantizing it would
  misrepresent what was actually played.
- **MIDI** (Standard MIDI File, type 1): the generated line at concert pitch on its own track, a
  full tempo map, one marker per phrase, and an optional backing track (off by default). It never
  holds played notes.

**Played notes** come in one file, **MIDI only** (Standard MIDI File, type 1), with one track of
the notes the player played:

- **Which notes:** every played note whose onset falls within a phrase of the session. A note
  whose onset falls before phrase 1 begins (the note that started the session, or anything played
  during the count-in) belongs to no phrase and is never exported.
- **Pitch and velocity:** concert pitch exactly as received from the controller, and the original
  note-on velocity.
- **Timing, unquantized:** each note keeps its exact onset relative to the start of its phrase,
  converted to MIDI time through the tempo map, with no snapping to any grid. The file's time
  resolution is fine enough that no onset moves by more than 1 ms from where it was played. A note
  lasts until the controller released it (§8). A note still held when the session ends stops at
  the session's end.
- **Lining up with the generated notes:** the played-notes file carries the same tempo map and
  the same phrase markers as the generated-notes MIDI file of the same session, at the same time
  resolution, with phrase 1 at time zero in both, whether or not the generated notes are exported
  too. Imported together into a digital audio workstation (DAW, a music production program), the
  two files line up phrase by phrase. The played-notes file never holds the backing, which is generated material and stays
  an option of the generated-notes MIDI file.
- **Only when there is something to export:** when the session holds no played note at all (a
  session without a controller, or one in which nothing was played), the played-notes action is
  unavailable, and only generated notes can be exported. How that is shown is a UI/UX design
  decision.

**Both contents** means using both actions: two separate files from the same session, the
generated-notes file in the format the player picked (MusicXML or MIDI) and the played-notes MIDI
file. They are never merged into one file, and no single action ever delivers both. Their file
names make clear which content each holds and that they come from the same session; the exact
names are a UI/UX design decision.

**Privacy is absolute and by construction, not by policy.** Played notes exist only in memory, for
the current session and its review. v2 writes nothing about a session — generated or played — to
any browser storage (`localStorage`, IndexedDB, the Cache API, or any network request); the only
way a played note ever leaves the player's machine is through the played-notes export action,
which they explicitly triggered. There is exactly one local
user, with no accounts, roles, sharing, or any other multi-user access model to define — whoever
has the page open can do everything, and nothing here changes that.

## 8. MIDI input and note acknowledgement

**Reading the controller.** v2 supports one connected MIDI controller at a time (multiple
connected inputs are never merged — the player is asked to pick one), read as concert pitch on any
channel (omni). Only a note-on with non-zero velocity counts as a played note; breath/CC data,
pitch bend, aftertouch and SysEx are all ignored, because the reference controller's own breath
signal isn't accurate enough to build a feature on. A note-off (or a note-on with zero velocity)
is read for one purpose only: to know when a played note ends, which the played-notes export
needs (§7). It is never a played note and never counts as activity. A new
note-on for a pitch that is still held ends the earlier one.

**Connecting happens only between sessions,** while the app is Idle or showing the Review, never
during a session. It is a step of its own: the player clicks "Connect controller" (the same click
that unlocks audio, §6), MIDI permission is requested, the player picks the one input if several
are present, and the transposition check below is part of it. Nothing played during this step can
start a session. Every connection state (no MIDI support in this browser, not yet connected,
permission denied, no device found, the selected controller unplugged) is non-blocking: a session without any controller connected is
always possible, and such a session stays controller-less for its whole length, ending only on
Stop.

**A controller counts as connected** once MIDI permission is granted, one input is selected (the
player's pick, or the only device present), and that input's port is present and open. No note has
to be played first. This is what "with a controller attached" means for the silence timer (§7), for
starting a session from MIDI (§6) and for adaptive tempo (§10). The transposition check is a
separate step that follows. **A controller counts as lost** when that port reports it has
disconnected.

**The same device reattaches by itself, during a session or between sessions.** Once a controller
is connected, unplugging it does not clear the player's selection. If that same device comes back,
it is reattached automatically, with no action from the player, and the transposition check is
not re-run. This holds whether the controller was lost during a session (below) or while the app
was Idle or showing the Review. A different device is never picked up this way: it goes through
the connection step above, which is only available between sessions. While the selected controller
is away between sessions, the app behaves exactly as with no controller connected: this is not an
error, and the 30-second reconnection window below does not apply, since no session is running.

**Starting a session while the selected controller is away.** A Start click in that state begins a
session with no controller, like any session started without one: it stays controller-less for its
whole length. The session begins at the Start click, so this covers the count-in too. If the same
device is plugged back in during that session, it is not reattached. The selection is kept
throughout, and once the session ends the device reattaches by itself, as above, if it is still
plugged in. Likewise, a controller lost mid-session and still away when the session ends (after
the 30-second window below, or on Stop) keeps its selection into the Review (or into Idle, for a
session ended during the count-in, §7), exactly like a controller unplugged between sessions.

The kept selection lives in memory only. It does not survive a page reload: v2 saves nothing to
browser storage (§7), so after a reload the player goes through the connection step again.
Remembering the player's controller across visits belongs to v3's "my instrument".

**Losing the controller mid-session** is not the same as the player falling silent (§7). When a
connected controller disappears during a session:

- the loss is made **clearly visible** to the player, even though that briefly draws attention
  away from playing. How it looks is a UI/UX design decision;
- the session keeps running meanwhile, since v2 has no pause state (§6): phrases keep being
  generated and played at tempo, and the app keeps tracking, on the audio clock, which note is due
  next;
- the controller may be reconnected: the **same device** coming back is reattached automatically,
  as described above. This is not a new connection, so "connect only between sessions" still
  holds; a different device cannot be attached mid-session;
- **if it is not reconnected within 30 seconds, the session ends**, the same way the silence
  timeout ends it. The 30 seconds count from the moment the controller is lost, whatever came
  before: how long the player had already been silent does not shorten them. While no controller
  is attached the silence timer (§7) is suspended; after a reconnection it counts again from the
  reconnection;
- expected notes that fell due while the controller was away stay unacknowledged, like any note
  not played, with no signal. Notes played after a reconnection are recorded and acknowledged
  exactly as before. The review does not mark the gap.

Web MIDI support in browsers is Chromium-only in practice (no support in Safari/WebKit or in
Firefox without an added permission extension) — v2 stays Chromium-only, matching v1's existing
browser scope.

**The controller-transposition check.** A wind or breath controller and a written-pitch instrument
template can silently disagree — for example, a controller left at its factory default sends
untransposed MIDI, while a tenor-saxophone template expects concert pitch 14 semitones below
written pitch; since acknowledgement never gives a mismatch hint, a player in that state would get
total silence with no clue why. v2.0 ships a one-time check as part of connecting a
controller, re-runnable between sessions only: the app shows one written note from the
instrument's own range, the player plays it, and the app reports either "matches," "transposed by
n octaves," or "transposed by n semitones," suggesting either a device setting to change or a
better-matching instrument template. No note played during the check can start a session, even
one that happens to be the note phrase 1 starts on. This check
ships regardless of what a later "input transposition" setting decision requires, because it's
cheap and protects every early tester immediately. A future v3 "my instrument" persistence feature
should remember and reuse the offset this check detects, rather than asking again every session.

**Expected-note acknowledgement.** Every fresh attack in the generated phrase (a tie continuation
belongs to its original attack; rests have none) is an "expected note" with a timing window, set
as follows:

- **The boundary between two consecutive expected notes** is the later of two instants: 150 ms
  before the second note's onset, and the point halfway between the two onsets. When the onsets
  are 300 ms or more apart, that is simply 150 ms before the second onset; when they are closer,
  it is the halfway point.
- **A window opens** 150 ms before its note's onset, or at the boundary with the expected note
  before it when that is later. **It closes** at the later of 200 ms after the onset or the end of
  the note's full (possibly tied) sounding span, but never after the boundary with the next
  expected note.
- **Every window therefore contains its own onset**, so a note played exactly on time can always
  be matched, however fast the tempo and however dense the rhythm. For example, at 120 BPM
  sixteenth notes are 125 ms apart, so when several follow one another each boundary falls halfway
  between two onsets, and each note's window runs from 62.5 ms before its onset to 62.5 ms after it.
- **Windows include both their ends.** Two consecutive windows can therefore share one instant,
  their boundary.
- **Across a join.** Every phrase starts with a fresh attack on beat 1 (§3), so a phrase's last
  expected note and the next phrase's first expected note are consecutive expected notes like any
  other, with a boundary between them. As long as the next phrase is not known, and so always for
  a session's last phrase, the last expected note's window is not cut short on its account.

A played note acknowledges an expected note only if it matches that note's **exact concert pitch,
octave included** (this is deliberately strict on octave, unlike the chord-fit check §9 describes for later, because
it's meant to train reading — including which octave is written — and the controller check above
already catches a simple constant-octave mismatch). Each expected note can be acknowledged at most
once, matched by the earliest unacknowledged expected note whose window contains the played note and
whose pitch matches; this also settles a note played at the instant two windows share. On a chord
played on a keyboard, only the one note that matches the expectation is acknowledged, and the extra
notes are simply recorded without penalty.

**What's ever shown.** On a successful match, only the expected note itself lights up on screen (a
theme-colored highlight, green in the working example) — no sound cue, no animation, and critically,
the note that was actually played is **never rendered anywhere in the live view**. A note that
isn't matched, or is played at the wrong pitch, produces absolutely no visible change of any kind.
This is the same "no mismatch hint, ever" principle carried through from v1: only a positive catch
is ever marked.

**Latency.** The played onset used for matching is the controller's timestamp mapped onto the
audio clock, minus the output latency (the delay between scheduling a sound and it actually
reaching the speakers) and a small constant for a USB connection. The browser does not say how a
controller is connected (Web MIDI exposes no transport), so the USB constant applies to every
controller. USB is the tested connection. **Bluetooth MIDI is best-effort:** a Bluetooth LE
controller works as it is, with no correction or tuning of its own; on the reference breath
controller it adds roughly 70–80 ms over USB and delivers notes in batches, so its timing is
coarse, and the product owner found it workable. These are hard-coded constants only. They and the windows
above are built at their starting values, then tuned on the reference hardware by the
real-hardware checks, before v2.0 ships (§11), the windows' 150 ms and 200 ms changing only with
the product owner's sign-off. A
player-facing calibration step that measures and remembers a specific controller's actual latency
is deferred to v3, where it pairs naturally with "my instrument" persistence.

## 9. The end-of-measure chord-fit check

Beyond matching individual expected notes exactly, the app also acknowledges a player who
**embellishes or improvises** on the written line, as long as what they played still makes musical
sense over the harmony.

**Not v2 scope.** This check was planned as its own release, v2.3. It has left v2 and is a
**nice-to-have for v3, not committed scope**. The definition below is kept as the starting point
for when it is scheduled, with its acceptance criterion at the end of this section; nothing in it
binds v2.

**When it runs at all.** The check only ever runs on a measure where what the player actually
played **differs from the written phrase** for that measure. A measure played exactly as written —
script-perfect — never triggers this check; it only ever gets the per-note highlight described in
§8. This keeps the two acknowledgement signals from ever doubling up on the same measure, and
keeps this check meaningful specifically as a reward for departing from the page.

**What counts as "fitting" the chord, for a measure where the player did go off-script:**

- The unit of judgement is the whole measure, never split into half-bars, even for a measure that
  holds two different chords (one on beat 1 and a different one on beat 3) — each note is judged
  against whichever chord is actually sounding at that note's own onset.
- Matching is by **pitch class**, not exact pitch — octave doesn't matter here, unlike the
  exact-pitch matching in §8, because this check is about harmonic fit, and a note belongs to a
  chord in any octave.
- Which measure a played note belongs to is decided by rounding its (latency-compensated) onset to
  the nearest sixteenth-note grid position, rather than a fixed time window — a fixed window would
  misclassify the app's own fast notes into the wrong measure above roughly 160 BPM. A note
  sustained or tied across a barline counts only in the measure where it was originally attacked.
- A measure **fits** when: at least one note was played in it; at least one of those notes is an
  exact chord tone of the harmony sounding at its own onset; and every other note is either in the
  phrase's own scale, or is a chromatic note that resolves — within the next two notes the player
  plays, possibly landing in the very next measure — onto a chord tone one semitone away (this
  covers a chromatic approach or "enclosure" figure, whether or not the current settings would let
  the generator itself write one).
- If nothing at all was played in a measure, or a measure that was played simply doesn't fit,
  **nothing is ever shown** — there is no "almost" signal, consistent with the product's permanent
  "never a mismatch hint" rule.

**Accepted trade-off, on purpose.** "Blue" notes that don't resolve onto a chord tone (for example
a flatted third or fifth over a major chord) and bebop-style chromatic passing tones that land on
an in-scale note rather than resolving onto a chord tone get **no acknowledgement** under this
rule. This is a deliberate simplification, not a gap the team intends to close later: the
alternative (trying to recognize every legitimate jazz vocabulary figure) would be open-ended and
was judged not worth the complexity for what this check is for.

**Why this doesn't punish the app's own generated line.** The harmony in v1/v2 never leaves a
single scale per phrase; any chromatic note the generator itself ever writes is always an approach
or enclosure figure that resolves by one semitone onto a chord tone within two notes. This should
mean every generated measure already fits under this rule when played as written — though since
the check never fires on a script-perfect measure anyway (see above), this is really a guarantee
about the check never being _unfair_ to an embellishing player who mixes in the app's own idiom,
not something that needs separate verification against the exact written line.

**A caveat for later versions:** this whole approach relies on the harmony staying inside one scale
per phrase, which holds for all v1/v2 harmony. If a later version introduces out-of-scale harmony
(secondary dominants, borrowed chords), this rule would need to judge each measure against its own
chord's scale rather than the phrase's single scale — not a v2 concern.

**A second caveat for later versions: stray notes.** A controller can send short in-between notes
while the player's fingers change position, notes a real instrument would swallow. One such note
outside the phrase's scale makes a measure fail the "every other note" condition above. A minimum
duration for a played note to count toward this check is a likely prerequisite, not yet decided.
Stray notes need no handling in v2: they are recorded as played notes like any other, and they
light nothing in §8's acknowledgement unless one happens to have an expected note's exact pitch
inside its window.

**Presentation** (exactly what this looks like on screen, distinct from the note-level highlight
in §8, but still positive-only and quiet) is a UI/UX design decision, not specified here.

**Acceptance criterion, kept for when it is scheduled:** for every seed and supported-settings
combination, playing the app's own generated phrase exactly, with its own timing, never triggers
the chord-fit acknowledgement — only the per-note highlight from v2.0 ever appears on a
script-perfect measure. This is checked as a property test over the existing fixture set.

## 10. Adaptive tempo

A separate opt-in feature from the settings-mutation flag in §5, ships in **v2.2**, aimed at
players deliberately building reading and playing speed:

- Available only when a MIDI controller is connected — the feature is meaningless without a
  session to build speed against, so it's shown as unavailable (with the reason) otherwise.
- While it is on, the tempo rises on a completely **flat, unconditional schedule**: +5 BPM every 2
  phrases, regardless of what (or whether) the player plays. This is a deliberate simplification
  over an earlier idea that would have linked the rate of increase to how well the player was
  keeping up — that richer, performance-sensitive version is explicitly deferred to v3 or later.
  Because it never depends on how well the player performs, it also has no dependency at all on
  the chord-fit check in §9.
- The rise stops at the control's own ceiling, 240 BPM. It only ever raises the tempo — it never
  decreases automatically, and since there is no manual mid-session editing at all (§5), the only
  way to start the next session at a lower tempo is to change the tempo control at Idle or in the
  Review, before starting again.
- Nothing about performance is ever displayed, stored or exported — only the tempo itself is shown,
  and whether adaptive tempo is currently on.
- The tempo control is a fixed list of round numbers, but the flat schedule can land the actual
  tempo on a value outside that list; during the session the exact value in effect is shown. At the
  end of the session (Stop, or the next Start), the control resets to the tempo the player actually
  started that session from, while the review records the tempo the session actually reached.
- While a controller lost mid-session is away (§8), the tempo does not rise: the phrases that
  start sounding meanwhile do not count toward the next rise, and counting resumes where it
  stopped when the controller reconnects. A session started while the selected controller is
  away has no controller, so adaptive tempo does not run in it.
- Adaptive tempo starts off when the page loads. The player's choice is then kept from one
  session to the next for as long as the page stays open, since v2 saves nothing across a reload.

## 11. Definition of done

### Release sequence

v2 ships as one release, v2.0. It was planned as four releases, v2.0, v2.1, v2.2 and v2.4, each
with its own release gate; the product owner compacted them into one on 2026-10-05. The
definition of done is everything in this section: the v2.0 items below, the v2.1 and v2.2
criteria, and the real-hardware checks listed as v2.4, all checked by one release gate. The labels
v2.1, v2.2 and v2.4 remain, here and elsewhere in this spec, as names for parts of v2.0's scope;
none is a release of its own.

| Part     | Delivers                                                                                                                                                                                                                                                                                                                 |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **v2.0** | The full core loop: rolling phrases with carry-in (§3–§4), backing/click/count-in (§6), sessions (§7), MIDI expected-note acknowledgement and the controller check (§8), last-session review and export of the generated notes to MusicXML or MIDI (§7), generation settings locked for the whole session (§5).          |
| **v2.1** | Played notes become visible in the review (the v2.0 session history already records them, §7, but the v2.0 review does not show them) and exportable by choice, through their own export action, as their own MIDI file (§7); the settings-mutation flag, with setting changes applied at the next phrase boundary (§5). |
| **v2.2** | Adaptive tempo (§10); the multi-phrase tension arc noted in §3.                                                                                                                                                                                                                                                          |
| **v2.3** | Nothing. The end-of-measure chord-fit check (§9) left v2 for v3, as a nice-to-have; the number is not reused.                                                                                                                                                                                                            |
| **v2.4** | The real-hardware checks: the controller check, the acknowledgement windows and latency tuned on the reference hardware (§8), real exports opened in MuseScore and a MIDI tool (§7), the playhead and main-thread measurements in real Chromium.                                                                         |

Count-in is part of v2.0 because starting the session on a MIDI note needs it.

v2.0 does not ship before the real-hardware checks. The checks that need the reference hardware,
the reference machine or a real program other than the browser are listed under v2.4; the v2.0
items they replace keep their numbers below, so references to them stay valid. The timing
constants (the acknowledgement windows and the latency constants of §8) are built at their
starting values and ship tuned by those checks. The checks of exports in real programs (item 12
in real programs and the DAW line-up from v2.1, below) do not block the v2.0 tag: they may follow
it, written down as a hand-check note on a v2.0.x update. So may the checks that need a USB
keyboard (the controller check and the timing measurements with the keyboard, item 9 below): the
breath controller's results stand for v2.0. Every other real-hardware check must pass before v2.0
is tagged.

### Prerequisites that must already be in place

- The v1.0 gate: instrument templates carrying their own written-pitch transposition; the
  rhythmic-variety rework that retired the old "Mixed" setting; profile behavior driven by
  capability flags rather than by profile name.
- Generation latency must be re-measured after that rhythmic-variety rework, including a cold run
  triggered by a mid-session control change (from v2.1, when the settings-mutation flag can cause
  one), to confirm the look-ahead deadline in §4 still has comfortable headroom at the fastest
  supported tempo. That cold run, re-measured on the v2.1 code on the reference machine, is a
  v2.4 check (§11).

### v2.0 is done when all of the following hold

1. Across every seed and supported-settings combination, at 60, 120 and 240 BPM, every phrase after
   the first is generated and engraved before its deadline, and the failure ladder (§4) keeps a
   session running through a generation failure. After two consecutive repeated phrases, the
   non-blocking "struggling" notice shows until a newly generated phrase starts sounding.
2. Every join made with carry-in obeys the same interval and register rules as two consecutive
   notes inside a single phrase, and settles a leap recovery or a tense note's resolution left
   owing by the phrase before (§3). A join into the failure ladder's standalone phrase or into a
   repeated phrase is not smoothed (§3), and a session's last phrase may end with one still owed
   (§3). The register stays stable across a whole session.
3. With no carry-in at all (a session's first phrase, the failure ladder's standalone phrase, or
   the phrase at Idle), the output for a given request and seed is byte-identical to v1. At Idle,
   only which request and seed end up shown can differ from v1 (items 26 and 27). The generator's
   output for a given request and seed never depends on the browser's language or locale
   settings: it orders its candidates by plain code-unit order, never by a locale-aware
   comparison. Moving to that order is proven to keep v1's output byte-identical, against v1's
   golden outputs and its identity harness; if any output differed, v1's goldens would not be
   re-recorded.
4. Every generation setting is locked from the moment a session starts until it ends: the player
   can change none of them during a session, while Stop and the audio mix stay reachable
   throughout (§5). With the settings-mutation flag ("Vary settings") and the multi-phrase tension
   arc ("Tension across phrases") both off, as they are when the page loads, nothing changes what
   is generated during a session except the note-density rule of item 27. With either of them on,
   the changes it makes are the only others, and they are held to their own criteria under
   "Added by v2.1 and later" below. Adaptive tempo changes the tempo only, never what is
   generated (§10).
5. The backing stays in pitch and on the beat; muting it never affects timing; nothing plays before
   the player has clicked, either Start or "Connect controller", which unlocks audio.
6. _Moved to v2.4 (below): the playhead measured against the audio output in real Chromium._
7. Acknowledgement is exact and positive-only: only the exact expected pitch inside its window is
   ever acknowledged, and the live view never renders a played pitch under any circumstance.
   Every expected note's window contains its own onset (§8), so a note played exactly on time at
   the exact pitch is acknowledged at every supported tempo and note density, sixteenth notes at
   240 BPM included, and across a join between two phrases.
8. The controller check correctly reports a match or a constant offset for injected test offsets.
9. _Moved to v2.4 (below): tuning the acknowledgement windows and latency constants on the
   reference hardware._
10. A session works with no MIDI at all — permission denied or API unsupported — without ever
    blocking Start. A session started without a controller runs until Stop and cannot gain a
    controller mid-session.
11. A rhythm-setting combination v1 already disallows can neither start nor be applied during a
    session. A combination is judged on the note density a phrase is generated with (item 27):
    below the tablet-landscape layout's width, a chosen `Sixteenth` counts as `Eighth`. A change
    of window never brings a running session onto a disallowed combination, since its density can
    only step from `Sixteenth` down to `Eighth` (item 27) and no combination v1 disallows uses
    `Eighth`.
12. The review and export are complete, exact, and reproducible from stored inputs: the MusicXML
    file carries each of the three instrument templates correctly, the B♭ tenor and E♭ alto
    saxophones, the two transposing ones, with their `<transpose>` element, and the C keyboard,
    which does not transpose, without one (§7), and the MIDI file carries the correct tempo map,
    as automated tests check. Opening the files in real programs is a v2.4 check (below). Every
    export covers the whole session. The generated-notes export action has the played-notes
    export action beside it (its criteria are under "Added by v2.1 and later" below), and no
    generated-notes file, MusicXML or MIDI, ever holds a played note. The review has no
    favorites. No session starts while the review shows; once the player leaves
    it, it stays reachable until the next session starts, which discards it without any
    confirmation, and closing or reloading the page discards everything without asking.
13. Privacy holds absolutely (verified with a network/storage spy across a full session, review and
    export), and nothing anywhere is ever graded, scored or marked wrong.
14. All existing v1 guarantees still hold unchanged: the instrument range contract, the notation
    rules, Chromium-only support, and offline use after first load with no additional audio assets.
    The only changes to v1's behaviour at Idle are those of items 26 and 27; no partial or
    substitute staff is ever drawn.
15. _Moved to v2.4 (below): the main-thread measurement in real Chromium._
16. A controller lost mid-session (its port reports disconnected) is clearly visible to the
    player. If the same device comes back within 30 seconds of the loss, it is reattached
    automatically without re-running the transposition check, and the session carries on; if not,
    the session ends, however long the player had been silent before the loss. The phrase keeps
    playing at tempo throughout; notes that fell due during the loss stay unacknowledged, and
    notes played after the reconnection are acknowledged as usual. Silence alone ends a session
    only under the 30-second no-note rule in §7.
17. From MIDI, only the note phrase 1 starts on, at its exact pitch with the octave included,
    starts a session, and only while a session can start at all (item 22). Any other note played
    at Idle, any note played while the review shows or while a session cannot start, and any
    note at all played while
    connecting a controller or during the transposition check, starts nothing and changes nothing
    on screen. The note that starts a session is named on screen, neutrally, exactly when playing
    it would start one: with a controller attached, outside the connection step, and while a
    session can start. No note is named without a controller attached (including a selected
    controller that is away), while connecting one, while the review shows, or in any case
    listed in item 22.
18. The starting note only starts the count-in and is recorded in no phrase. The count-in is shown
    on screen in time with the click, for both kinds of start, and phrase 1's whole first measure
    stays fully visible throughout it. The count-in's click sounds even when the click is turned
    off, including when it is turned off during the count-in; the click setting applies from
    phrase 1 on. The count-in plays at the current click volume, and no setting of the click
    volume control makes the click silent.
19. A connected controller unplugged at Idle or in the Review keeps its selection: plugging the
    same device back in reattaches it automatically, without re-running the transposition check
    and without any action from the player. While it is away, the app behaves as with no
    controller connected and shows no error. A different device plugged in is not picked up
    until the player goes through the connection step.
20. A Start click while the selected controller is unplugged begins a controller-less session.
    Plugging the same device back in during that session, count-in included, does not reattach
    it; once the session ends, it reattaches automatically, without re-running the transposition
    check, if it is still plugged in. A controller lost mid-session and still away when the
    session ends, by the 30-second rule or by Stop, keeps its selection into the Review and
    reattaches automatically there when the same device returns. After a page reload no
    selection is remembered.
21. From the moment a session starts, by a Start click or the starting note, until it ends, by
    any means, the app holds a screen wake lock, and it releases the lock when the session ends.
    When the browser refuses the lock or does not support it, the session starts and runs exactly
    as it otherwise would, and nothing is shown about the lock. When the browser drops the lock
    while the session runs and the page is visible, the app asks for it again, and nothing is
    shown whether it is granted or refused.
22. At Idle, neither a Start click nor any MIDI note starts a session, and no starting note is
    named, while: no phrase has been generated yet; a new phrase is being generated, including
    the retries that replace a phrase whose notes do not fit (item 26); the phrase cannot be drawn
    (notation error); a failed generation is being reported, with or without the previous phrase
    still on screen; the rhythm settings are a combination v1 disallows (item 11); the
    rotate-device notice replaces the staff; or phrase 1 cannot be drawn at the staff's minimum
    readable size in the layout a session would hold, within the window's width or, below the
    tablet-landscape layout's width, within its height (the staff together with the row above it
    where the count-in and the session's notices appear, measured with the browser's toolbars
    showing), in which case the notice of item 26 shows instead of the staff. Once none of these
    holds (a successful regeneration, the new phrase on screen, a view that shows the staff
    again), a session starts as usual.
23. A session ended during the count-in, by Stop, a hidden tab or the staff no longer being shown
    (item 24), goes back to Idle with phrase 1 still on screen. No review opens, and the previous session's review is not
    restored.
24. From the moment a session starts until it ends, by any means, the app asks for a landscape
    orientation lock, and it releases the lock when the session ends. A refused or unsupported
    lock changes nothing about the session and shows nothing. During a session, count-in
    included, the session ends exactly like Stop as soon as the view becomes portrait-shaped
    below the desktop layout's width (whether a device was turned, the window was resized, or a
    split screen was opened), or the window becomes too narrow to draw the staff at its minimum
    readable size in the layout the session started with, or, below the tablet-landscape
    layout's width, too short to fit it (as measured in item 22). A browser toolbar appearing or
    hiding never ends a session. Any other change to the window's size keeps the session running,
    with the staff redrawn at the new size in the same layout.
25. The staff layout a session holds is chosen at Start from the window's width alone: the same
    width always gives the same layout, whatever phrase 1 contains. During a session, a
    look-ahead phrase that cannot be drawn at the staff's minimum readable size in that layout is
    never shown and counts as a failed attempt: it goes through the same retries as a generation
    that found no phrase, a phrase is repeated only when no attempt produced a valid phrase by the
    deadline, and that repeat is recorded in the history like any other. On a change to the
    window's size, a phrase or part of a phrase already checked and waiting to be drawn that no
    longer fits ends the session like Stop (item 24) and is not retried; a look-ahead phrase that
    arrives after the change is checked against the new size. No notation error is ever shown
    during a session, whatever the window does.
26. At Idle, as two changes to v1's behaviour: when the window has room for the staff but a
    phrase's notes cannot be drawn at the staff's minimum readable size, whether the phrase was just
    generated or was on screen when the window's size changed, that phrase is not drawn: the
    app generates a new one with up to three fresh-seed retries, and shows the first one that
    fits. When the staff cannot be shown for lack of space (too narrow, or, below the
    tablet-landscape layout's width, too short, as measured in item 22), or when every one of
    those retries has failed, the app shows a plain notice that the staff needs more room, with
    no retry action, instead of the staff. For lack of space, it clears by itself once the staff
    fits, and a new phrase is then generated with the same retries. When every retry has failed,
    a wider window, a change to a setting the phrase is generated from, or regenerating by hand
    each starts a new round of the same retries; the first phrase that fits clears the notice and
    is shown, a round that fails leaves the notice in place, and a narrower window never starts a
    round. A wider window while a round runs neither restarts it nor starts another after it: the
    round carries on, each attempt generated with the note density the window gives when it is
    generated, and if it fails, the notice stays until the next wider window, setting change or
    regeneration by hand. Either way, the phrase last on screen, and any phrase too dense
    to fit, is never drawn. If the notice clears because the staff fits while the rhythm settings
    are a combination v1 disallows, or if, while every retry has failed, a setting change or a
    wider window makes them one, before a round or during one, no phrase is generated or shown (a
    round under way stops at once, and none of its attempts is drawn): the unsupported-rhythm
    alert shows as before a first phrase exists, generation stays blocked until the combination
    is allowed again, and once it is, no phrase is generated until the player asks for one. A
    phrase on screen when the combination becomes unsupported stays on screen, as in v1, as long
    as it fits. One that stops fitting while the combination is unsupported gets no retries and
    no notice: no phrase is shown, with the alert, as above, unless the window has no room for
    the staff at all, which shows the notice. Neither case ever shows the notation error, which
    is kept for failures that retrying can cure.
27. Below the tablet-landscape layout's width, as a change to v1's behaviour, the `Sixteenth`
    note density cannot be chosen, and a `Sixteenth` chosen while the window was wider is kept
    but generates as `Eighth`. The density is taken from the window's width when each phrase is
    generated, at Idle and during a session alike; a phrase on screen, or one already checked and
    waiting to be drawn, is never regenerated because the window crossed that width. At Idle,
    the chosen `Sixteenth` applies again to the next phrase generated at or above that width, as
    in v1. During a session, once a phrase has been generated with `Eighth` under this rule,
    every later phrase of that session is too, whatever the window does; the chosen value
    applies again from Idle. A session's history records, for each phrase, the density it was
    generated with. Sixteenth notes can still appear in a phrase through other settings.
28. At every session end once phrase 1 has started sounding, the app generates a fresh phrase
    from the current settings, with a fresh seed and no carry-in, as regenerating by hand at Idle
    would (with item 26's retries), or, if the staff has no room at that moment, once the notice
    clears; it is neither the ended session's last phrase nor its phrase 1. The next session's
    phrase 1 is the phrase on screen at Idle when it starts: that fresh phrase, unless it has
    since been replaced in any way a phrase is replaced at Idle. While the review shows, neither a
    Start click nor any MIDI note starts a session, the starting note included, and no starting
    note is named. Once the player leaves the review, a session
    starts as at Idle, never in any case of item 22, which includes the time the fresh phrase is
    being generated; the review stays reachable until that start, which discards it without
    confirmation (item 12).

### Added by v2.1 and later

- **v2.1:** played notes appear in the review only when the toggle is on. The review gets a
  played-notes export action beside the generated-notes one, and:
  - a played-notes file is MIDI and holds exactly the played notes whose onsets fall in the
    session's phrases, at concert pitch as received, with their original velocity, and no onset
    more than 1 ms away from where it was played relative to its phrase;
  - no generated-notes file, MusicXML or MIDI, ever holds a played note;
  - each export action delivers exactly one file; exporting both contents takes both actions and
    gives two separate files;
  - the played-notes file and the generated-notes MIDI file of the same session share the same
    tempo map and markers, as automated tests check; importing both into a real DAW is a v2.4
    check (below);
  - the played-notes action is unavailable when the session holds no played note;
  - privacy still holds under the network and storage spy of v2.0 item 13;
  - a setting changed by the settings-mutation flag is only ever visible starting at the first
    phrase that hasn't begun sounding, or at the phrase after it when that phrase is already
    partly drawn as read-ahead or less than a measure remains before its deadline; no note already
    on screen ever changes (§5);
  - the settings-mutation flag starts off; with it on, mutations come 2 to 4 phrases apart, and
    the same stored inputs give the same mutations; a note-density mutation in a session
    generating with `Eighth` steps from `Eighth` and never lands on `Sixteenth` (§5);
  - when a session ends, however it ends, every setting the flag changed is back at the value the
    player chose before the session, the musical profile's "customized" marking included, and the
    fresh phrase generated at the end uses those settings (§5).
- **v2.2:** adaptive tempo meets its own acceptance criteria in §10 (flat, unconditional schedule;
  no rise while the controller is away, counting resuming where it stopped; never decreases
  automatically; resets correctly at session end; starts off; generation itself is provably
  unaffected by whether it's on). The multi-phrase tension arc follows §3: its toggle starts off;
  with it off, every phrase is generated as before; with it on, each group of four phrases is
  generated as chosen, one step tenser, as chosen, one step calmer, never past Settled or Edge,
  and the same seeds give the same session.
- **v2.4, the real-hardware checks:** v2.0's items 6, 9 and 15 and the real-program part of item
  12, and the controller check on the reference hardware (§8), all on the reference machine and
  hardware:
  - **Item 6:** the on-screen playhead stays within 20 ms of the actual audio output position over a
    five-minute session in Chromium, measured to the moment the playhead band's measure changes
    (not to the next painted frame, which comes one frame later by construction). Met on
    2026-10-06: at 120 BPM over 150 barlines, the band's measure changed at most 14.5 ms after
    the heard barline.
  - **Item 9:** the acknowledgement windows and latency constants are tuned and documented against
    the actual reference hardware (a breath controller over USB, and a USB keyboard). A window
    value other than 150 ms early and 200 ms late needs the product owner's sign-off. Done for
    the breath controller on 2026-10-06: the latency constants were kept, and the windows stay at
    150 ms and 200 ms. The USB keyboard's measurements may follow the tag, as a v2.0.x hand
    check.
  - **Item 12, in real programs** (may follow the tag, as a v2.0.x hand-check note): MusicXML
    exports open correctly in a real notation program (MuseScore) for each of the three
    instrument templates, the two saxophones with their `<transpose>` element and the C keyboard
    without one; MIDI exports open correctly in a real tool with the correct tempo map.
  - **Item 15:** the re-signed latency budget holds: no main-thread task ever runs longer than the
    audio scheduler's own look-ahead window during a 240 BPM session. Met on 2026-10-06: no task
    reached 50 ms at 240 BPM, and the longest block while engraving was about 50 ms, against the
    200 ms window.
  - **The controller check on the reference hardware:** with the device's own transpose setting
    at C, B♭ tenor and E♭ alto, which MIDI note the check's written note sends, whether an octave
    setting changes it, and what note-on velocity it uses; this decides whether a manual
    input-transposition setting is needed. Done for the breath controller on 2026-10-06: the
    device's own transpose setting reached a match for every profile tried, so no manual
    input-transposition setting is called for. The USB keyboard's check may follow the tag, as a
    v2.0.x hand check.
  - **From v2.1, in a real program** (may follow the tag, as a v2.0.x hand-check note): imported
    together into a real DAW, the played-notes file and the generated-notes MIDI file of the same
    session line up phrase by phrase, with the same tempo map and markers.
  - **From v2.1, on the reference machine:** the first generation after an automatic setting
    change (the cold run of the latency prerequisite) is re-measured on the code v2.4 checks, and
    the look-ahead deadline keeps its headroom at 240 BPM. Met on 2026-10-06: the first
    generation after a one-control change into the slowest settings took 206–229 ms, and the
    slowest cold generation 277 ms, against a deadline of at least one measure (1 s at 240 BPM).
    The 250 ms cold target is a goal to aim for, not a condition of this check.

  These checks are part of v2.0's release gate, run on the code it ships; every automated test of
  the other parts still passes on that code, with any tuned constant.

## 12. Open questions carried forward

These are consciously left for implementation (or a later, focused conversation with the product
owner) to resolve. None of them is silently dropped. No item of v2's own scope is left open
here.

The controller-transposition check's verification on the reference hardware, once in this list,
is settled: the breath controller's own transpose setting reaches a match, so no manual
input-transposition setting is needed; the USB keyboard's check follows the v2.0 tag (§11). The
backing's voicing and register, and the screen wake lock dropped mid-session, once in this
list, are settled (§6). So are Bluetooth MIDI, best-effort with USB the tested connection (§8),
and whether the checks of exports in real programs block the v2.0 tag: they do not (§11); and
the main-thread engraving against the look-ahead window and the re-measured generation latency,
measured on the reference machine, which meet their checks (§11); and what the playhead's 20 ms
is measured to: the moment its measure changes, which meets it (§11). Not blocking anything:
Bluetooth MIDI on the product owner's Android phone, in Chrome, is still to try.

One item left v2 when favorites moved to v3, and is not a v2 gap: **what makes a favorite count
as exported**, which only mattered for asking before discarding unexported favorites. It stays
open and is settled with favorites in v3, together with marking itself.

Two further items are noted as direction for v2 or later, without being scoped precisely enough to
build yet, and are **not** part of the v2 definition of done above:

- **Embellishment/style-figure flags** that let the player ask the generator itself to lean into
  more ornamented, idiomatic figures — likely v2.2 or v3, and may end up overlapping with or
  replacing the existing rhythmic-variety setting rather than sitting beside it.
- **A friendlier escape hatch from a recurring "these settings can't form a phrase" notation
  error** that doesn't rely on switching instruments as a workaround — this needs its own
  interaction design pass before it can be scheduled into a release.

## 13. Access model

v2 has exactly one local user, with no accounts, roles, permissions or any form of sharing —
whoever has the page open can do everything the app offers. The only data that ever leaves the
player's machine is an export they explicitly triggered, and even then only carries their own
played notes if they explicitly triggered the played-notes export. There is nothing further to design
here: v2 has no multi-role access model to specify.
