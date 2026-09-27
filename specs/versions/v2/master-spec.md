# Infinite Flow v2 — Master Spec: Rolling Phrase

Status: master spec v1 (2026-09-27). This is the consolidated, execution-ready specification for
v2, covering releases v2.0 through v2.3. It supersedes the individual v2 draft topic documents,
which are kept in the archive as working history.

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

### In scope for v2 (v2.0 through v2.3)

- A rolling sequence of phrases within a session, joined so the ear does not notice a seam.
- A simple, deterministic backing track (bass and block chords) with an optional metronome click
  and a one-bar count-in.
- A single-user local session model: start, run, and stop or time out, with no accounts, roles or
  server-side state.
- Reading a MIDI controller and acknowledging notes the player gets right, plus a one-time check
  that catches a controller/instrument-template transposition mismatch.
- A quiet, per-measure "did what you played fit the harmony" acknowledgement for players who
  embellish or improvise rather than playing the generated line exactly.
- A review of the last session, with the ability to mark favorite phrases, and exporting the
  session (or just the favorites) to MusicXML and MIDI.
- An opt-in, visible flag that lets the app quietly vary its own generation settings over the
  course of a session, and a separate opt-in flag that raises the tempo on a fixed schedule.

### Explicitly out of scope for v2

- Any generation seeded from something the player actually played (MIDI-seeded continuation) —
  this is v3.
- "My instrument": remembering a specific controller's transposition/offset across sessions —
  this is v3, and it will reuse the offset the v2.0 controller check detects.
- Persistence of any kind: session history, favorites, or settings surviving a page reload — v2
  session state is fully ephemeral by design (see §7, Privacy).
- Reviewing any session other than the most recent one — v3.
- Editing, cutting, splicing or otherwise manipulating generated material in the review — out of
  scope entirely; the only per-phrase action is marking/unmarking a favorite.
- Accompaniment with musical roles (harmonizing, contrasting, responding to the player) — v4.
- Any grading, scoring, ranking or wrong-note signal, in any view, at any point — this is a
  permanent product-wide constraint, not a v2-specific gap.

## 3. The generation unit and how phrases join

The four-measure phrase stays the unit of generation exactly as in v1 — the timeline type is not
widened, and every individual phrase remains a valid, self-contained v1 result. Widening it would
ripple through harmony, rhythm, pitch and notation; instead, a session is an **ordered sequence**
of these phrases, and the join between one phrase and the next is smoothed by a small, well-defined
handoff.

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
  yet), the next phrase inherits that recovery obligation exactly as if the leap had occurred
  inside a single phrase.
- A "tense" note (an unresolved scale tone) at the very end of a phrase may resolve onto the next
  phrase's first note, rather than being forced to resolve before the phrase ends. The full v1
  rule — a tense note must resolve before the last note — still applies in full only where the
  music actually stops: at Stop, or at the end of a session. Resolving further forward, into the
  next phrase's own material past its very first note, is not attempted in v2.
- Every phrase in a session, after the first, still starts with a fresh attack on beat 1 of its
  first measure. There is no tie or rest carried across a join in v2 — that (along with pickup
  measures) is left for v3, which already has to solve it for player-seeded continuations.
- A register set to "Varying" is resolved once per session, at phrase 1, and then stays fixed for
  the whole session unless a control change forces a re-resolution. A fixed register setting (Low,
  Middle, High) behaves exactly as in v1.
- Each phrase's own tension arc (build and release within its own four bars) is independent of
  carry-in and of any other phrase in the session — v2 does not plan a tension shape that spans
  multiple phrases. A flag that lets tension rise and fall across a longer, multi-phrase arc is
  confirmed as v2.2 scope, but is not considered urgent for that release.

## 4. Look-ahead and failure handling

The app always looks one phrase ahead: as soon as phrase *N* starts sounding, phrase *N+1* is
requested, and it must be generated and engraved before its **deadline** — the start of phrase
*N*'s last measure. That leaves at least one measure of read-ahead visible on screen at all times.
At session start, the phrase already on screen before Start was pressed becomes phrase 1 of the
new session (there is no separate "generate phrase 1" step), and phrase 2 is generated during the
one-bar count-in, before the count-in ends.

If generation fails, the player never sees a v1-style blocking alert during a session. Instead:

1. retry silently, up to three times, with a fresh seed and the same carry-in, while the deadline
   still allows it;
2. if that keeps failing, retry once more **without** carry-in, as a standalone phrase — the join
   isn't smoothed, but a valid phrase is shown;
3. if the deadline passes regardless, **repeat the previous phrase** as the next one, and record
   the repeat in the session history;
4. after two consecutive repeats, show a small, non-blocking notice ("the generator is struggling
   with these settings") without stopping the session.

The session is never stopped by a generation failure — that would be a penalty the player didn't
cause, and repeating a phrase is musically harmless.

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
  §6). If a mutation would land on a setting combination the generator doesn't support, it
  re-mutates — rerolling again — until it lands on a supported combination; an unsupported
  combination is never applied, and the mutation cycle is never silently skipped. **Still open,
  left for implementation to settle with the product owner:** the exact cadence (how many phrases
  between mutations, and whether that count is fixed or randomized within a range), and whether
  the flag defaults on or off when a session starts. This flag ships in **v2.1**.
- **Adaptive tempo,** described fully in §6, ships in **v2.2**.

Whichever of these fires, the change applies at the next **phrase boundary**: the first phrase
that has not yet started sounding. If a look-ahead phrase was already generated with the old
settings, it is discarded and regenerated with the new ones, provided at least one measure remains
before its deadline; otherwise the change simply applies one phrase later than that. A key or
collection change drops the harmonic part of carry-in (the pitch part still applies, re-checked
against the new range and register window); a register change re-resolves "Varying." When an
automatic change lands, the settings UI updates to stay truthful about what's currently in effect,
but with **no highlight, scroll, or screen shift** — the player's attention stays on what's coming,
not on what just changed behind them.

The instrument template itself is never touched by either automatic flag and stays locked for the
whole session — an instrument switch is rare and, per v1, already regenerates and keeps the
written key.

## 6. Backing, click, count-in and tempo

- **Backing.** v2 adds a bass line and block chords that follow the phrase's own generated
  harmony — in pitch, and on the beat. It is a pure, deterministic renderer over the harmony (not
  a generated voice with its own seed): the bass plays the chord's root at each harmony event and
  on every beat 1 (adding the fifth on beat 3 for a four-beat event); the chords play a
  close-position triad, similarly re-attacked. It is synthesized in-app with plain Web Audio
  nodes — no sample libraries, so it stays fully offline-safe with no extra download and no
  licensing entanglement. It plays only while a session is running, and keeps playing through the
  player's silences. There is no generated lead-line playback, and no accompaniment with musical
  roles (harmonizing, responding, contrasting) — that is v4.
- **Click:** on by default, quarter notes with beat 1 accented — it's what makes the tempo
  readable before the backing itself makes musical sense. Backing on/off, backing volume, click
  on/off and click volume are all separate mix controls, reachable at all times (§5).
- **Count-in:** one measure of click before phrase 1, for both ways of starting a session — a
  Start click, or the very first MIDI note. In the MIDI case, that first note starts the count-in
  and is **not** itself matched against phrase 1 — the app can't know in advance where the
  player's own beat 1 falls, so treating that note as an expected match would incorrectly pin the
  tempo and the phrase's first note to an arbitrary moment.
- **Tempo stays transport-only.** It is never part of what's generated — the same seed and
  settings always produce the same material, at any tempo. The known consequence (very fast note
  density becoming hard to play at very high tempo) is accepted for v2: the player chose both
  values, and a later opt-in link between density and tempo is a possible v3+ idea, not a v2
  requirement.
- **The audio clock is the one master clock** for the backing, the click, the on-screen playhead
  and the chord-fit check (§9): everything is scheduled and read against it, not against wall-clock
  time, so the playhead and the audio it represents never visibly drift apart. A muted backing
  does not stop this clock — muting is implemented as silencing the sound, never as suspending the
  clock itself.
- **Starting audio at all** needs one prior user click ("connect controller") — browsers do not
  count a MIDI note as the kind of interaction that unlocks audio, so before that one click, a
  MIDI note cannot start a session; that same click also requests MIDI permission, so both
  restrictions are lifted together.
- **A hidden browser tab ends the session immediately**, exactly like a manual Stop — the backing
  and click fade out over about 100 ms, and the review opens. Browsers already throttle timers
  in hidden tabs, so a paused-and-resumed clock could never resume cleanly; there is no
  pause/resume state in v2 at all.

## 7. Sessions, review, export and privacy

**Starting and ending.** A session starts on the first MIDI input (once a controller is connected
and audio is unlocked) or on a Start click. With a controller attached, it ends after more than 30
seconds without any note played, or on Stop; that 30-second timer only starts counting once the
player has played at least one note, so clicking Start and taking a moment before playing never
times out. Without a controller attached, only Stop ends a session. While a connected controller
falls silent mid-session (catching a breath, or losing their place), the phrase keeps rolling
regardless — the pressure to keep up is deliberately mild.

**What's recorded, and why both forms are kept.** For every phrase that actually started sounding
during the session (a look-ahead phrase that was only ever shown as read-ahead, and never
sounded, does not count), the session history keeps both: the exact generated timeline as it was
shown (so the review and export can never disagree with what actually played, even if a later
version of the generator would produce something different from the same inputs), and the
original reproduction inputs — the resolved request, seed, and carry-in — so that "every phrase in
this session is exactly reproducible from its stored inputs" is a testable guarantee, not an
assumption. This also stores whatever a v3 persistence/continuation feature will need later. The
history additionally records each phrase's acknowledgements and the played notes whose onsets fall
within it, and marks any phrase that is a repeat inserted by the failure ladder in §4. There is no
cap on session length; the review must stay responsive regardless of how long a session ran.

**The last-session review.** Every phrase that was shown appears, in order, engraved exactly as it
was displayed (written pitch, key signature, chord symbols), each with its phrase number and the
tempo it played at. The generated notes are always shown; the notes the player actually played are
**optional**, shown only on a toggle, and when shown they are unquantized and neutrally colored,
possibly indicating which ones matched the script — this is an appreciation of having followed the
line, never a score, and there is still no coloring anywhere for a note that didn't match. A
favorite marks a whole phrase (not a bar range — that's a v3 idea, tied to seeding a v3
continuation). Only the most recently completed session's review exists; starting a new session
discards the current one, asking for confirmation first only if it holds unexported favorites.
Closing or reloading the page discards everything without asking.

**Export.** Two export scopes are available: the whole session, or favorites only (in session
order, each phrase keeping its original session phrase number) — delivered as a browser file
download, with no upload and no server-side step anywhere. Two formats:

- **MusicXML** (score-partwise 4.0): one part, in the session's instrument's own written pitch
  with a `<transpose>` element carrying that transposition (omitted for a C instrument); chord
  symbols always included; each phrase marked with a rehearsal mark and a double barline, with a
  metronome mark at the start and at every tempo change. Played notes are never included in
  MusicXML — unquantized playing can't be faithfully engraved, and quantizing it would misrepresent
  what was actually played.
- **MIDI** (Standard MIDI File, type 1): the generated line at concert pitch on its own track, a
  full tempo map, one marker per phrase; an optional backing track (off by default); and an
  optional track of the player's own played notes, included **only** if the player explicitly
  opts in when exporting (off by default) — unquantized, with their original velocity.

**Privacy is absolute and by construction, not by policy.** Played notes exist only in memory, for
the current session and its review. v2 writes nothing about a session — generated or played — to
any browser storage (`localStorage`, IndexedDB, the Cache API, or any network request); the only
way a played note ever leaves the player's machine is through an export they explicitly triggered,
with the played-notes option explicitly checked. There is exactly one local user, with no accounts,
roles, sharing, or any other multi-user access model to define — whoever has the page open can do
everything, and nothing here changes that.

## 8. MIDI input and note acknowledgement

**Reading the controller.** v2 supports one connected MIDI controller at a time (multiple
connected inputs are never merged — the player is asked to pick one), read as concert pitch on any
channel (omni). Only a note-on with non-zero velocity counts as a played note; breath/CC data,
pitch bend, aftertouch and SysEx are all ignored, because the reference controller's own breath
signal isn't accurate enough to build a feature on. Every connection state (no MIDI support in this
browser, not yet connected, permission denied, no device found, device unplugged mid-session) is
non-blocking: a session without any controller connected is always possible, and losing a
previously connected controller mid-session simply turns it into a no-controller session (only
Stop ends it from that point, and the inactivity timer is disarmed) rather than ending anything.

Web MIDI support in browsers is Chromium-only in practice (no support in Safari/WebKit or in
Firefox without an added permission extension) — v2 stays Chromium-only, matching v1's existing
browser scope.

**The controller-transposition check.** A wind or breath controller and a written-pitch instrument
template can silently disagree — for example, a controller left at its factory default sends
untransposed MIDI, while a tenor-saxophone template expects concert pitch 14 semitones below
written pitch; since acknowledgement never gives a mismatch hint, a player in that state would get
total silence with no clue why. v2.0 ships a one-time, re-runnable check as part of connecting a
controller: the app shows one written note from the instrument's own range, the player plays it,
and the app reports either "matches," "transposed by n octaves," or "transposed by n semitones,"
suggesting either a device setting to change or a better-matching instrument template. This check
ships regardless of what a later "input transposition" setting decision requires, because it's
cheap and protects every early tester immediately. A future v3 "my instrument" persistence feature
should remember and reuse the offset this check detects, rather than asking again every session.

**Expected-note acknowledgement.** Every fresh attack in the generated phrase (a tie continuation
belongs to its original attack; rests have none) is an "expected note" with a timing window: it
opens 150 ms before the attack's own onset, and closes at the later of 200 ms after the onset or
the end of that note's full (possibly tied) sounding span — but never later than the next expected
note's own window opening. A played note acknowledges an expected note only if it matches that
note's **exact concert pitch, octave included** (this is deliberately strict on octave, unlike the
chord-fit check in §9, because it's meant to train reading — including which octave is written —
and the controller check above already catches a simple constant-octave mismatch). Each expected
note can be acknowledged at most once, matched by the earliest unacknowledged expected note whose
window contains the played note and whose pitch matches; on a chord played on a keyboard, only the
one note that matches the expectation is acknowledged, and the extra notes are simply recorded
without penalty.

**What's ever shown.** On a successful match, only the expected note itself lights up on screen (a
theme-colored highlight, green in the working example) — no sound cue, no animation, and critically,
the note that was actually played is **never rendered anywhere in the live view**. A note that
isn't matched, or is played at the wrong pitch, produces absolutely no visible change of any kind.
This is the same "no mismatch hint, ever" principle carried through from v1: only a positive catch
is ever marked.

**Latency.** The played onset used for matching is the controller's timestamp mapped onto the
audio clock, minus the output latency (the delay between scheduling a sound and it actually
reaching the speakers) and a small constant for the connection type (USB is negligible; Bluetooth
LE is roughly 10–15 ms plus jitter). v2.0 ships these as tuned, hard-coded constants only; a
player-facing calibration step that measures and remembers a specific controller's actual latency
is deferred to v3, where it pairs naturally with "my instrument" persistence.

## 9. The end-of-measure chord-fit check

Beyond matching individual expected notes exactly, the app also acknowledges a player who
**embellishes or improvises** on the written line, as long as what they played still makes musical
sense over the harmony. This check ships as its own release, **v2.3**, after the played-note review
and the settings-mutation flag (v2.1) and adaptive tempo (v2.2).

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
about the check never being *unfair* to an embellishing player who mixes in the app's own idiom,
not something that needs separate verification against the exact written line.

**A caveat for later versions:** this whole approach relies on the harmony staying inside one scale
per phrase, which holds for all v1/v2 harmony. If a later version introduces out-of-scale harmony
(secondary dominants, borrowed chords), this rule would need to judge each measure against its own
chord's scale rather than the phrase's single scale — not a v2 concern.

**Presentation** (exactly what this looks like on screen, distinct from the note-level highlight
in §8, but still positive-only and quiet) is a UI/UX design decision, not specified here.

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

## 11. Definition of done

### Release sequence

| Release  | Delivers |
| -------- | -------- |
| **v2.0** | The full core loop: rolling phrases with carry-in (§3–§4), backing/click/count-in (§6), sessions (§7), MIDI expected-note acknowledgement and the controller check (§8), last-session review with favorites and MusicXML/MIDI export (§7), control changes locked to phrase boundaries (§5). |
| **v2.1** | Played notes become visible in the review (already partly true in v2.0) and exportable by choice (§7); the settings-mutation flag (§5). |
| **v2.2** | Adaptive tempo (§10); the multi-phrase tension arc noted in §3. |
| **v2.3** | The end-of-measure chord-fit check (§9). |

Count-in is part of v2.0 because starting the session on a MIDI note needs it.

### Prerequisites that must already be in place

- The v1.0 gate: instrument templates carrying their own written-pitch transposition; the
  rhythmic-variety rework that retired the old "Mixed" setting; profile behavior driven by
  capability flags rather than by profile name.
- Generation latency must be re-measured after that rhythmic-variety rework, including a cold run
  triggered by a mid-session control change, to confirm the look-ahead deadline in §4 still has
  comfortable headroom at the fastest supported tempo.

### v2.0 is done when all of the following hold

1. Across every seed and supported-settings combination, at 60, 120 and 240 BPM, every phrase after
   the first is generated and engraved before its deadline, and the failure ladder (§4) keeps a
   session running through a generation failure.
2. Every join obeys the same interval and register rules as a join inside a single phrase, and the
   register stays stable across a whole session unless a control genuinely changes it.
3. With no carry-in at all (a session's first phrase, or the unchanged v1 static workspace),
   output is byte-identical to v1.
4. A control change is only ever visible starting at the first phrase that hasn't begun sounding —
   no note already on screen ever changes.
5. The backing stays in pitch and on the beat; muting it never affects timing; nothing plays before
   the player has clicked to unlock audio.
6. The on-screen playhead stays within 20 ms of the actual audio output position over a five-minute
   session in Chromium.
7. Acknowledgement is exact and positive-only: only the exact expected pitch inside its window is
   ever acknowledged, and the live view never renders a played pitch under any circumstance.
8. The controller check correctly reports a match or a constant offset for injected test offsets.
9. The acknowledgement windows and latency constants are tuned and documented against the actual
   reference hardware (a breath controller over USB, and a USB keyboard).
10. A session works with no MIDI at all — permission denied, API unsupported, or device
    unplugged mid-session — without ever blocking Start or ending the session unexpectedly.
11. A rhythm-setting combination v1 already disallows can neither start nor be applied during a
    session.
12. The review and export are complete, exact, and reproducible from stored inputs; MusicXML opens
    correctly in a real notation program (MuseScore) for at least three transposing instrument
    templates; MIDI opens correctly in a real tool with the correct tempo map.
13. Privacy holds absolutely (verified with a network/storage spy across a full session, review and
    export), and nothing anywhere is ever graded, scored or marked wrong.
14. All existing v1 guarantees still hold unchanged: the instrument range contract, the notation
    rules, Chromium-only support, and offline use after first load with no additional audio assets.
15. The re-signed latency budget holds: no main-thread task ever runs longer than the audio
    scheduler's own look-ahead window during a 240 BPM session.

### Added by v2.1 and later

- **v2.1:** played notes appear in the review only when the toggle is on, and in the MIDI export
  only when the player explicitly opts in at export time.
- **v2.2:** adaptive tempo meets its own acceptance criteria in §10 (flat, unconditional schedule;
  never decreases automatically; resets correctly at session end; generation itself is provably
  unaffected by whether it's on).
- **v2.3:** for every seed and supported-settings combination, playing the app's own generated
  phrase exactly, with its own timing, never triggers the chord-fit acknowledgement — only the
  per-note highlight from v2.0 ever appears on a script-perfect measure. This is checked as a
  property test over the existing fixture set.

## 12. Open questions carried forward

These are consciously left for implementation (or a later, focused conversation with the product
owner) to resolve — they are not silently dropped, and none of them blocks starting v2.0
implementation:

- **The settings-mutation flag's exact cadence and default state** (§5): how many phrases typically
  pass between mutations, whether that count is fixed or randomized within a range, and whether the
  flag is on or off by default when a session starts. Scope, magnitude and the invalid-combination
  handling are already fully settled (§5); only these tuning parameters remain.
- **Backing voicing and register** (§6): the proposed default is bass in MIDI 36–47 (roughly C2–B2)
  and chords in close position with the top note at or below E4, attacked on each chord change and
  each downbeat. This needs a listening-test pass, already agreed to happen later, before being
  locked in.
- **Main-thread engraving vs. the audio scheduler's look-ahead window** (§6): whether engraving a
  phrase on the main thread can ever run long enough to threaten the proposed 200 ms scheduling
  window needs a small prototype/measurement pass to confirm; the default assumption is that moving
  the scheduler's own wake-up timer into a Web Worker is enough headroom.
- **Bluetooth MIDI as a genuinely supported connection**, versus USB being the only actively tested
  path with Bluetooth left best-effort: depends on whether the product owner's own operating system
  actually exposes their reference controller's Bluetooth MIDI connection to Chromium, and how much
  jitter it measurably has. USB is the guaranteed-tested path regardless of this outcome.
- **Re-measuring generation latency** after the rhythmic-variety rework mentioned under
  Prerequisites, including a cold-generation run triggered specifically by a mid-session control
  change, to reconfirm the look-ahead deadline in §4 has enough headroom at 240 BPM.
- **The controller-transposition check's own verification on the reference hardware** (§8): with
  the device's own transpose setting at each of C, B♭ tenor and E♭ alto, confirming which MIDI note
  a written middle C actually sends, whether an octave setting changes it, and what note-on
  velocity it uses. This determines whether an additional manual "input transposition" setting is
  needed beyond the check itself.

Two further items are noted as direction for v2 or later, without being scoped precisely enough to
build yet, and are **not** part of the v2.0–v2.3 definition of done above:

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
played notes if they explicitly opted into that at export time. There is nothing further to design
here: v2 has no multi-role access model to specify.
