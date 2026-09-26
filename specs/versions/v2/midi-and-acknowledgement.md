# v2 — MIDI Input and Acknowledgement

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
[register](../../open-questions.md). O55, O56, O60, O61, O70 and O71 have their full text in
[§9](#9-open-questions).

## 1. Settled inputs

- **Controller support.** A MIDI controller is supported. The app acknowledges a played note
  **only when it is the expected note**, and gives no mismatch hint (D52; this supersedes the
  archived D21/D22 hint).
- **End-of-measure check.** The app keeps track of everything played. When a measure's time is
  up, it checks whether what was played fits that measure's chord. If it fits, it acknowledges
  that the player kept that part of the contract (D52). Embellishment is welcome as long as the
  notes suit the chord. What "fits" means is **O24**.
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

## 3. Input model `(proposed)`

- **Inputs and channels.** All connected MIDI inputs are merged and all channels are accepted
  (omni) (**O61**). A device picker appears only when more than one input is connected.
- **Which messages count.** Only **note-on with velocity > 0** is a played note. Note-on with
  velocity 0 and note-off end it. CC (breath included), pitch bend, aftertouch and SysEx are
  ignored, and SysEx is never requested (**O60**).
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
| Device unplugged during a session    | The session continues as a **no-controller session**: only Stop ends it (D67), and the 30 s inactivity timer is disarmed. A non-blocking notice is shown. If the device comes back it is re-attached automatically, and the timer re-arms on its next note. |
| Transposition or octave offset found | See §4.                                                                                                                                                                                                                                                     |

## 4. A silent failure to design out: controller vs template transposition (O55)

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
- **Proposed: a controller check.** It is part of connecting, and can be re-run at any time.
  1. The app shows one written note from the selected template's range, and asks the player to
     play it.
  2. It computes the offset between the played note and the expected concert pitch.
  3. If the offset is 0, it confirms that the controller matches.
  4. If the offset is ±12·k, it says the controller is set k octaves off.
  5. For any other offset, it says the controller seems to transpose by _n_ semitones. It
     suggests setting the device to match the template (for the Travel Sax, in its app), or
     choosing the template that matches the device.
- **Proposed:** the check ships in v2.0 regardless, because it is cheap and protects every
  tester. The optional input-offset field that D72 allows is added **only if** the Travel Sax
  verification shows the device cannot simply be set to match. If it is added, the check fills
  it in. It lasts for the session only, because persistence is v3.

## 5. Expected-note acknowledgement (O41, O42) `(proposed)`

- **Expected note.** An expected note is every **fresh attack** in the phrase timeline. A tie
  continuation belongs to its attack, and rests have no expected note.
- **Timing window.**
  - The window **opens** 150 ms before the attack's onset (early grace).
  - It **closes** at the later of 200 ms after the onset (late grace) and the end of the note's
    tied sounding span. It never closes later than the next expected attack's window opening.
  - _Reasoning:_ a player who comes back in partway through a long note is still acknowledged
    (recovery, D67), and a small anticipation counts.
  - For comparison, the most lenient osu!mania judgement tiers reach ±121–188 ms. With no
    scoring, v2 has no reason to be stricter.
  - All values are to be tuned on the Travel Sax 2 (USB and BLE) and one USB keyboard (O56).
- **Pitch.**
  - The played note must be the **exact concert MIDI pitch**, octave included. P2 reads ledger
    lines, and octave matters for reading training.
  - Octave-free matching is the alternative in O41. The controller check (§4) catches a
    constant octave offset, which is the main reason octave-free matching would be wanted.
- **One-to-one.** One played note acknowledges at most one expected note: the earliest
  unacknowledged note whose window contains it and whose pitch matches. An expected note is
  acknowledged at most once.
- **Chords (keyboard).** If a chord contains the expected pitch within the window, that note is
  acknowledged, and the extra notes are simply recorded (O41). Nothing is penalized.
- **What the live view shows (O42).**
  - Only acknowledgements: the expected note changes state, and ux-writer designs how.
  - The live view **never shows the played pitch** (keeping archived D22's intent).
  - _Reasoning:_ showing a wrong played pitch next to the expected one is a mismatch hint by
    another name, and D52 removed those.
  - The review may show played notes (see
    [sessions-review-export.md](sessions-review-export.md), O64).
- **Latency compensation (O56).**
  - The played onset is the MIDI timestamp mapped onto audio time, minus the output latency.
    The player is reacting to sound that reaches them `outputLatency` late.
  - A per-connection constant covers input latency: USB is small, and BLE is about 10–15 ms
    plus jitter.
  - v2.0 ships these as tuned constants. A player-facing calibration step is a v2.1 candidate
    if testers need it (O56). Rhythm games offer one, but our windows are wide.

## 6. End-of-measure chord-fit check (O24) `(proposed default for the user to react to)`

This proposal answers O24's sub-questions directly. The goal it serves is the user's own
statement that "almost everything is legit when arpeggiating chord and improvising". So the
check is deliberately **more permissive than the generator**, and **the app's own line always
fits**.

- **Unit: the measure** (D52), but each note is judged against the harmony that is **sounding at
  its onset**. That handles bars that hold two chords (`startBeat: 0|2`) without splitting the
  acknowledgement into half-bars.
- **Pitch class, not exact pitch.** Octave doesn't matter for "suits the chord".
- **Which notes count.** Played attacks whose compensated onset falls inside the measure. An
  onset up to 150 ms early counts for the next measure, as an anticipation. A note sustained or
  tied across the barline counts only in the measure where it was attacked.
- **When a measure fits.** A measure **fits** when all of the following hold:
  1. at least one note was played in it, **and**
  2. at least one of its notes is a **chord tone** of the harmony sounding at that note's onset,
     **and**
  3. every note's pitch class is **in the phrase's collection** (the scale), **or** it is a
     chromatic note that is followed, within the next two played notes, by a chord tone one
     semitone away. That covers a chromatic approach or enclosure, whether or not the profile's
     capability flag allows the generator to write them (D73).
- **Why this passes the app's own line.**
  - Neutral pitches are all in the collection. Jazz chromatic pitches are approaches or
    enclosures that resolve by semitone to a chord tone within two attacks
    (`docs/music/jazz-profile.md`, `pitch-planner-validation.md`).
  - The first attack of every phrase is a chord tone (`pitch-candidates.ts`).
  - Whether **every measure** of every generated phrase contains a chord-tone attack is
    **inference**. The acceptance test below verifies it, and condition 2 is relaxed if the test
    finds counter-examples.
- **When nothing is played in a measure:** nothing happens. No check runs and no signal is
  shown.
- **When a measure doesn't fit:** nothing happens, and **nothing is ever shown** (D66). There is
  no "almost" signal.
- **Profiles.** One rule for every profile. The player's freedom doesn't depend on what the
  generator is allowed to write.
- **What this rejects, and why the user must confirm it.**
  - A held blue note, and outside playing that never resolves by semitone.
  - A borrowed or altered chord tone. For example, ♭7 over a major-key I chord is outside the
    collection.
  - The alternatives are: (a) allow any single unresolved chromatic note per measure; (b) judge
    only notes on beats 1 and 3 (strong beats); (c) the collection only, with no chord-tone
    requirement.
- **Presentation** of the measure acknowledgement is ux-writer's decision. The requirement is
  that it is positive and quiet (D66), and distinct from note acknowledgement.

## 7. Event identity (O43) `(proposed)`

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
4. **The app's own line fits.** For every seed × supported-settings combination in the existing
   test matrix, and for both profiles, playing the generated phrase exactly (with the same
   timing) makes every non-empty measure fit (§6). This is a property test over the fixtures.
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

Existing IDs covered here: **O24**, **O41**, **O42** and **O43** (proposed defaults above).

- **O55 - Controller vs template transposition.** Should v2.0 ship the controller check (§4) that
  detects a constant pitch offset and tells the player how to fix it (proposed)? And if the
  Travel Sax can't be set to match the tenor template, should v2 add D72's optional input-offset
  field then (proposed), or require players to read the template that matches their device?
- **O56 - Latency calibration.** Should v2.0 use tuned constants per connection type (proposed),
  or give players a calibration step?
- **O60 - What counts as input activity.** Should only note-ons count for starting a session, the
  30 s timeout and acknowledgement (proposed)? Or should breath and other CC messages also count
  as "the player is still there"?
- **O61 - Several inputs and channels.** Should all inputs be merged and all channels accepted
  (proposed), with a picker only when there is more than one device?
- **O70 - Browser scope for v2.** Should v2 stay Chromium-only, as v1 (proposed)? Web MIDI means
  no iPad or iPhone support, and Firefox would need a site-permission add-on.
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
