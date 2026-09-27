# v2 — MIDI Input and Acknowledgement

> **Archived 2026-09-27.** Consolidated into the v2 master spec. Live summary:
> [versions/v2/master-spec.md §8–§9](../../versions/v2/master-spec.md).

Status: draft v0.1 (2026-09-26)

**Scope of this document.**

- Connecting a MIDI controller.
- Reading its notes as concert pitch.
- Acknowledging expected notes.
- The end-of-measure chord-fit check.
- What the live view may show.
- The identity that links displayed, expected and played notes.

Sessions and privacy are covered in [sessions-review-export.md](sessions-review-export.md). The
clock is covered in [audio-and-backing.md](audio-and-backing.md).

Settled items cite their decision. Everything else is `(proposed)`. Question IDs point to the
[register](../../open-questions.md). O71 has its full text in [§9](#9-open-questions). O24 is
settled (D108, see §6): the chord-fit check is kept, ships in v2.3, and fires only when the
player goes off-script. O55, O41, O42, O43, O56, O60, O61 and O70 are settled (D77, D78, D92, D96,
D100, D86, D90, D87).

## 1. Settled inputs

- **Controller support.** A MIDI controller is supported. The app acknowledges a played note
  **only when it is the expected note**, and gives no mismatch hint (D52; this supersedes the
  archived D21/D22 hint).
- **End-of-measure check.** The app keeps track of everything played. When a measure's time is
  up, and the player deviated from the written phrase in that measure, it checks whether what was
  played fits that measure's chord. If it fits, it acknowledges that the player kept that part of
  the contract (D52). Embellishment is welcome as long as the notes suit the chord. What "fits"
  means, and the check's release and exact trigger, are settled (D108); see §6.
- **Acknowledge, never penalize.** The app never penalizes, grades, ranks or scores (D66).
- **Concert pitch.** MIDI input is read as concert pitch, and there is no input-transposition
  field for now. This must be verified on the device early in v2, and an optional template field
  can be added if needed (D72).
- **Privacy.** Played notes are private (D64, D69). See
  [sessions-review-export.md](sessions-review-export.md).
- **Monophonic player.** The player is assumed monophonic (the v1 vision). Keyboard chords are
  covered under O41.

## 2. Platform facts that shape the design

- **Browser support for Web MIDI.**
  - **Chromium:** supported since Chrome 43. Since **Chrome 124**, _all_ Web MIDI access asks for
    permission, not only SysEx. It requires a secure context.
  - **Firefox 108+:** access is gated behind a site-permission add-on. Firefox for Android has
    none.
  - **Safari and every iOS browser:** no support (WebKit bug 107250).
  - **Consequence:** v2 MIDI works on desktop Chromium and Android Chrome, and **not on iPad or
    iPhone**. v1 is already Chromium-only (`docs/release/browser-and-offline-limits.md`), so this
    changes nothing today. It does bound who can test MIDI (**O70**).
- **Timestamps.** `MIDIMessageEvent.timeStamp` is on the `performance.now()` timebase.
  `AudioContext.getOutputTimestamp()` gives a matched `{contextTime, performanceTime}` pair, so
  MIDI times can be mapped onto the audio clock.
- **MIDI is not a user activation.** See [audio-and-backing.md §4](audio-and-backing.md) and
  **O54**.
- **Travel Sax 2** (the owner's test device):
  - It carries MIDI over **USB-C and Bluetooth**, and maps breath to MIDI CC (Odisei product page).
  - Its companion app can **transpose the pitch** (Sax School Online review).
  - Neither the manual nor the product pages say whether that setting changes the MIDI notes it
    sends, or what note-on velocity it uses. These points must be checked on the device (see
    §4 and O55).
- **Bluetooth LE MIDI** adds roughly 7.5–15 ms one-way latency under good conditions, plus
  jitter (secondary source). The browser sees a BLE device only once the OS has paired it
  (**O71**).

## 3. Input model (O61 settled D90; O60 settled D86)

- **Inputs and channels (D90).** v2.0 expects a **single** MIDI input. If more than one is
  connected, the player is asked to **pick one** — inputs are not merged. All channels on the
  chosen input are accepted (omni).
- **Which messages count (D86).** Only **note-on with velocity > 0** is a played note. Note-on
  with velocity 0 and note-off end it. CC (breath included), pitch bend, aftertouch and SysEx are
  ignored, and SysEx is never requested, because breath/CC signal from the owner's controller
  isn't accurate enough to use.
- **Played note.** A played note is recorded as its concert MIDI pitch, its onset on the audio
  clock (after compensation, §5), its release time, and a session sequence number (see O43).
  Velocity is kept for export only.
- **Connection states.** Every state is non-blocking. A session without a controller is always
  possible (D67).

| State                                | Behaviour `(proposed)`                                                                                                                                                                                                                                      |
| ------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| No Web MIDI API (non-Chromium)       | The controller option is shown as unavailable in this browser. Start still works.                                                                                                                                                                           |
| Not yet connected                    | A "connect controller" action (a click) requests MIDI access and unlocks audio (O54).                                                                                                                                                                       |
| Permission denied                    | The app says MIDI is blocked and how to re-allow it in site settings. Start still works.                                                                                                                                                                    |
| Connected, no device                 | The app shows "no controller found" and listens for devices appearing (`statechange`).                                                                                                                                                                      |
| Several devices connected (D90)      | The player is asked to pick one. Inputs are never merged.                                                                                                                                                                                                    |
| Device unplugged during a session    | The session continues as a **no-controller session**: only Stop ends it (D67), and the 30 s inactivity timer is disarmed. A non-blocking notice is shown. If the device comes back it is re-attached automatically, and the timer re-arms on its next note. |
| Transposition or octave offset found | See §4.                                                                                                                                                                                                                                                     |

## 4. A silent failure to design out: controller vs template transposition (settled, D77)

- **The problem, which follows from D56 and D72 together.**
  - A saxophone-fingered wind controller left at its default setting behaves as a **C
    instrument**: fingering written C sends MIDI C.
  - A tenor player using the **tenor template** reads written pitch, which is concert +14
    semitones (D56).
  - They see written C5 and finger it. The device sends MIDI 72, but the expected concert pitch
    is 58. Every note is 14 semitones off.
  - Acknowledgement is positive-only, with no mismatch hint (D52), so **nothing ever happens,
    and the player gets no clue why**.
  - Matching only works if the device's own transposition matches the selected template: here,
    the Travel Sax set to sound as a B♭ tenor. An octave setting on the device causes the same
    silence, by ±12.
- **D72 still holds.** The app reads MIDI as concert pitch. The question is how the player finds
  out that their device and template disagree.
- **Settled (D77): a controller check.** It is part of connecting, and can be re-run at any time.
  1. The app shows one written note from the selected template's range, and asks the player to
     play it.
  2. It computes the offset between the played note and the expected concert pitch.
  3. If the offset is 0, it confirms that the controller matches.
  4. If the offset is ±12·k, it says the controller is set k octaves off.
  5. For any other offset, it says the controller seems to transpose by _n_ semitones. It
     suggests setting the device to match the template (for the Travel Sax, in its app), or
     choosing the template that matches the device.
- **Settled (D77):** the check ships in v2.0 regardless, because it is cheap and protects every
  tester. The optional input-offset field that D72 allows is added **only if** the Travel Sax
  verification shows the device cannot simply be set to match. If it is added, the check fills
  it in. It lasts for the session only, because persistence is v3.

## 5. Expected-note acknowledgement (O41 settled D78; O42 settled D92)

- **Expected note.** An expected note is every **fresh attack** in the phrase timeline. A tie
  continuation belongs to its attack, and rests have no expected note.
- **Timing window (settled, D78).**
  - The window **opens** 150 ms before the attack's onset (early grace).
  - It **closes** at the later of 200 ms after the onset (late grace) and the end of the note's
    tied sounding span. It never closes later than the next expected attack's window opening.
  - _Reasoning:_ a player who comes back in partway through a long note is still acknowledged
    (recovery, D67), and a small anticipation counts.
  - For comparison, the most lenient osu!mania judgement tiers reach ±121–188 ms. With no
    scoring, v2 has no reason to be stricter.
  - All values are to be tuned on the Travel Sax 2 (USB and BLE) and one USB keyboard (O56).
- **Pitch (settled, D78).**
  - The played note must be the **exact concert MIDI pitch**, octave included. P2 reads ledger
    lines, and octave matters for reading training.
  - Octave-free matching was the rejected alternative. The controller check (§4, D77) catches a
    constant octave offset, which was the main reason octave-free matching would have been
    wanted.
- **One-to-one.** One played note acknowledges at most one expected note: the earliest
  unacknowledged note whose window contains it and whose pitch matches. An expected note is
  acknowledged at most once.
- **Chords (keyboard, settled, D78).** If a chord contains the expected pitch within the window,
  that note is acknowledged, and the extra notes are simply recorded. Nothing is penalized.
- **What the live view shows (settled, D92).** On a successfully matched note, the **expected
  note itself** lights up (colour adapted to the current theme — green is the working example),
  with no other decoration: no sound cue, no animation, no rendered pitch value. This keeps the
  no-mismatch-hint principle intact (D22/D52): only a positive catch is ever marked, and a note
  that is not matched, or played at the wrong pitch, shows nothing at all. The played pitch
  itself is never rendered in the live view.
  - This confirms §8's acceptance criterion 5 ("no leak of played pitch") as written: the
    highlight is on the expected note, not a rendering of what was played.
  - The review shows played notes as an option (see
    [sessions-review-export.md](sessions-review-export.md), D93).
- **Latency compensation (settled, D100).**
  - The played onset is the MIDI timestamp mapped onto audio time, minus the output latency.
    The player is reacting to sound that reaches them `outputLatency` late.
  - A per-connection constant covers input latency: USB is small, and BLE is about 10–15 ms
    plus jitter.
  - v2.0 ships these as tuned constants only. A player-facing calibration step is **v3**, not a
    v2.1 candidate (D100) — it pairs naturally with "my instrument" persistence. Rhythm games
    offer one, but our windows are wide.

## 6. End-of-measure chord-fit check (settled, D108; ships v2.3)

**2026-09-27, research pass (D106):** `principal-advisor` grounded a recommendation in the actual
generator code — the harmony never leaves the phrase's own scale/collection, and every chromatic
note the generator itself ever writes is an approach or enclosure one semitone from a chord tone
(which may legally resolve across a barline). Full reasoning in D106.

**Resolved (D108), the three points the research pass returned to the owner:**

1. **Keep the check.** D52's "embellishment welcome as long as it suits the chord" stands
   unchanged. It's the only acknowledgement an improviser who decorates the line gets beyond
   playing the script exactly.
2. **Accepted trade-off.** "Blue" notes that don't resolve onto a chord tone (e.g. a ♭3 or ♭5 over
   a major chord) and bebop-style chromatic passing tones that land on a scale note rather than a
   chord tone get no acknowledgement under this rule. This is intentional, not a gap to close.
3. **Trigger: off-script only.** A fitting measure is acknowledged **only when the player's notes
   in that measure differ from the written phrase** — i.e. they embellished or improvised rather
   than playing it exactly. A measure played exactly as written gets only the per-note highlight
   (D92); chord-fit never fires on it. This means the two acknowledgement signals never double up
   on the same bar.
4. **Release: v2.3**, not v2.1. Played-note review/export (S2) and the settings-mutation flag
   (O77) ship in v2.1; chord-fit is its own later release.

The definition below is the kept, shipping rule, updated from the earlier draft in two ways the
research flagged: pitch class instead of exact pitch (unchanged from the earlier draft), and a
note's measure decided by **rounding to the nearest sixteenth-note grid point** rather than a
fixed millisecond grace (a sixteenth is shorter than a 150 ms grace above 160 BPM, which would
misclassify the app's own fast notes into the wrong measure).

- **Off-script gate.** Before judging fit, compare the measure's played notes to its written
  notes (same pitch classes in the same order, ties aside). If they match exactly, the check does
  not run at all for that measure — only D92's per-note highlight applies. The fit judgement
  below only ever runs on a measure where the player departed from the script.

- **Unit: the measure** (D52), never split into half-bars, but each note is judged against the
  harmony that is **sounding at its onset**. That handles bars that hold two chords
  (`startBeat: 0|2`) without splitting the acknowledgement.
- **Pitch class, not exact pitch.** Octave doesn't matter for "suits the chord" — this is
  deliberately different from D78's exact-pitch note matching, which trains reading (where
  octave matters). Chord-fit is about harmony, where a note belongs to a chord in any octave.
- **Which measure a note belongs to.** Round each note's compensated onset to the nearest
  sixteenth-note grid point; the rounded position decides both the measure and the harmony it's
  judged against. A measure is judged once time passes the next barline plus half a sixteenth. A
  note sustained or tied across a barline counts only once, in the measure where it was attacked.
- **When a measure fits.** A measure **fits** when all of the following hold:
  1. at least one note was played in it, **and**
  2. at least one of its notes is a **chord tone** of the harmony sounding at that note's onset,
     **and**
  3. every note's pitch class is **in the phrase's collection** (the scale), **or** it is a
     chromatic note that is followed, within the next two played notes — possibly in the *next*
     measure, since its resolution may land there — by a chord tone one semitone away. That
     covers a chromatic approach or enclosure, whether or not the profile's capability flag
     allows the generator to write them (D73).
- **Why this passes the app's own line.**
  - Neutral pitches are all in the collection. Jazz chromatic pitches are approaches or
    enclosures that resolve by semitone to a chord tone within two attacks
    (`docs/music/jazz-profile.md`, `pitch-planner-validation.md`).
  - The first attack of every phrase is a chord tone (`pitch-candidates.ts`), but a chord tone on
    beat 1 elsewhere is only a ranking preference (`pitch-planner-validation.md`), not a hard
    rule — whether **every measure** of every generated phrase contains a chord-tone attack is
    **inference**, not guaranteed by the code. The acceptance test below verifies it, and
    condition 2 is relaxed to "stayed in the key, chromatic notes resolve" if the test finds
    counter-examples.
- **When nothing is played in a measure:** nothing happens. No check runs and no signal is
  shown.
- **When a measure doesn't fit:** nothing happens, and **nothing is ever shown** (D66). There is
  no "almost" signal.
- **Profiles.** One rule for every profile — not "whatever the generator would have written",
  which would refuse a chromatic note from a Neutral-profile player and reject the app's own most
  common cross-barline approach. The generator's own rules are for composing a whole phrase
  (leap budgets, contour, first/last notes), not for judging whether one note sounds right.
- **Caveat for later versions:** this relies on the harmony staying inside one scale per phrase,
  true of all v1/v2 harmony. If a later version adds out-of-scale chords (secondary dominants,
  borrowed chords), condition 3 would need "a scale per chord" instead of "the phrase's scale" —
  not needed now. If O77's mutation flag changes key or mode at a join, judge each measure
  against its own phrase's scale.
- **Presentation** of the measure acknowledgement is ux-writer's decision. The requirement is
  that it is positive and quiet (D66), and distinct from note acknowledgement.

## 7. Event identity (settled, D96)

- **Phrase ordinal.** `phraseOrdinal` is the 1-based position of a phrase in the session.
  Repeated phrases (the O36 failure ladder) get their own ordinal.
- **Expected-note reference.** `ExpectedNoteRef = { phraseOrdinal, measureIndex, eventIndex }` of
  the attacking event in the concert timeline. Tie continuations resolve to their attack's
  reference.
- **Played-note reference.** `PlayedNoteRef = { sequence }` is a per-session counter.
- **The link.** An acknowledgement is `{ ExpectedNoteRef, PlayedNoteRef }`. A measure
  acknowledgement is `{ phraseOrdinal, measureIndex }`. A review favorite references
  `phraseOrdinal` (O62).
- **Prerequisite.** The written-notation pipeline must carry the source `measureIndex` and
  `eventIndex` through to engraved notes. It does not today: `written-phrase.ts` indexes
  measures by position, and written notes have no source reference (prerequisites L). This is
  the one v1 notation change v2 needs, beyond carrying rolling display state.

## 8. Acceptance criteria (proposed)

1. **Exact match.** A note-on at the expected concert pitch inside the window acknowledges that
   note exactly once. A note outside the window or at another pitch produces **no visible
   change** of any kind.
2. **Recovery.** A correct note played partway through a long expected note is acknowledged.
3. **Chords.** A chord containing the expected pitch acknowledges it, and nothing else changes.
4. **The app's own line never fires chord-fit falsely.** For every seed × supported-settings
   combination in the existing test matrix, and for both profiles, playing the generated phrase
   exactly (with the same timing) never triggers the chord-fit signal — the off-script gate (§6)
   holds it silent, and only the per-note highlight (D92) appears. This is a property test over
   the fixtures. (v2.3)
5. **No leak of played pitch.** The live view never renders a played pitch. This is checked by
   a component test that injects wrong notes.
6. **Controller check.** Injected offsets of 0, 12, 14 and 9 produce the matching message
   (match, octave, tenor-like, alto-like).
7. **Device loss.** Unplugging the device mid-session keeps the session running, disarms the
   timeout, and shows the notice. Replugging re-attaches it.
8. **Permissions.** With MIDI permission denied or the API missing, a session can still start
   with Start.
9. **Tuned on hardware.** The windows are tuned and documented on the Travel Sax 2 (USB, and
   BLE if O71 allows) and one USB keyboard.

## 9. Open questions

**Settled here:** O24, O41, O42, O43, O55, O56, O60, O61, O70 (D108, D78, D92, D96, D77, D100,
D86, D90, D87).

- **O71 - Bluetooth MIDI** _(research on the owner's setup)_: is USB the tested path for v2.0,
  with BLE best-effort (proposed)? That depends on whether the owner's OS exposes the Travel
  Sax's BLE MIDI to Chromium, and on its measured jitter.

## Sources

- MDN browser-compat-data, `Navigator.requestMIDIAccess` and `MIDIAccess`: Chrome 43; Firefox
  108 gated by a site-permission add-on; Safari not supported (WebKit bug 107250).
  <https://github.com/mdn/browser-compat-data>.
- Chrome Platform Status, "Permissions Prompt for Web MIDI API" (enabled by default in Chrome
  124): <https://chromestatus.com/feature/5087054662205440>.
- HTML Standard, activation-triggering input events:
  <https://html.spec.whatwg.org/multipage/interaction.html>.
- Odisei Music, Travel Sax 2 page ("Both connections carry MIDI with precise, expressive CC
  mapping"): <https://odiseimusic.com/pages/travel-sax>.
- Sax School Online, "Travel Sax 2: A Comprehensive Review" (the app can "transpose the pitch"):
  <https://saxschoolonline.com/articles/travel-sax-2-review/>.
- Travel Sax 2 user manual (2022, English). It is silent on MIDI note mapping:
  <https://mybreathmymusic.com/wp-content/uploads/2025/07/Travel-Sax-2-2022-ENG.pdf>.
- osu! wiki, osu!mania judgement windows (the most lenient tiers are 121–188 ms of maximum hit
  error): <https://osu.ppy.sh/wiki/en/Gameplay/Judgement/osu%21mania>.
- "Apple BLE MIDI Connection Latency" (secondary source; 7.5–15 ms one-way):
  <https://salivity.github.io/midi/article/apple-ble-midi-connection-latency>.
