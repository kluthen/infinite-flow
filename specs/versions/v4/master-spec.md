# v4.0 — Master Spec: Accompaniment with Roles and a Sound Library

Status: v1.0 (2026-11-24), consolidated from the v4.0 drafts after the owner's rulings of the same
day. **Approved by the owner on 2026-11-24.** Its build plan waits for the design set (§12). Where it differs from the drafts
([accompaniment roles](accompaniment-roles.md), [arranger](arranger.md),
[sound library](sound-library.md)) or from the [prerequisites](../prerequisites.md), this document
wins.

v4.0 is built on v3.4 (master spec [Parts A to E](../v3/master-spec.md)): everything there holds
unless a section below changes it. Music terms follow the project's
[lexicon](../../../docs/music/lexicon.md), and each is explained the first time it appears.

## 1. Core concept

Today a session plays the player's phrase over a simple backing: a bass note and a block chord at
every chord change and every downbeat. v4.0 adds **accompaniment with roles**: up to four more
parts that the app plays beside the player, each doing a different job for the player's line, and
gives every part a distinct software-synthesized sound.

- **The player plays the lead only.** The lead is the phrase on the staff, the line the player
  reads and plays. Every other line is a **system voice**: the app always plays it; the player
  never takes it over. (The owner: "we still expect the player only to play the lead role.")
- **Each system voice has an accompaniment role**, the job it does for the lead. Roles fall into
  four families: **foundation** (bass, chords, the beat), **highlighting** (reinforcing the lead),
  **contrasting** (a second, independent line) and **responding** (answering the lead in its
  gaps). The owner's words were highlighting, contrasting and responding; the foundation family is
  today's backing, plus drums.
- **The lead is the authority.** No system voice changes the phrase, its timing, what is
  acknowledged or what is saved about it. Where a voice has nothing legal to play, it rests.
- **The guiding principle holds:** nothing compares the player with a system voice, nothing grades
  or scores.
- v4.0 is most probably this app's last update; the game, a separate app, takes the ideas further.

## 2. Scope

### In

1. Four new system voices, each a **part** with its own switch, volume and playing light:
   - **Thirds** (highlighting): [parallel thirds and sixths](../../../docs/music/lexicon.md#parallel-thirds-and-sixths)
     below some of the lead's notes;
   - **Counter-melody** (contrasting): a slow [counter-melody](../../../docs/music/lexicon.md#counter-melody)
     on [guide tones](../../../docs/music/lexicon.md#guide-tone);
   - **Fills** (responding): short [fills](../../../docs/music/lexicon.md#fill) in the lead's rests;
   - **Drums** (foundation): one simple [groove](../../../docs/music/lexicon.md#groove).
   The names are working names; the player-facing labels are the design's (§12).
2. The backing (bass and chords) plays the same notes as in v3.4, with a new sound.
3. A software sound library for the system voices' sounds: Tone.js, or plain Web Audio if Tone.js
   fails its spike (§9.1).
4. A playing light per new part, lit while that part is sounding (§7).
5. The MIDI export's accompaniment option carries the new parts (§10.5).

### Out

- **Choosing an instrument or a sound** for any part: locked in v4.0, with no setting shown. The
  owner expects it to be a highly important feature in the game; each part's sound is kept as a
  data entry so it can be exposed later without reshaping anything (§9.3).
- **Drawing any system voice as notes** on the score, as a second staff or as cue notes.
- **Answering what the player actually played.** Responding voices answer the written phrase
  (§6.5); live answers belong to the game's turn-based exchanges.
- More techniques (echo or imitation, comping, a walking bass), drum fills or grooves per style,
  swing, and style packs.
- Any change to the generator, the lead's notation, acknowledgement or the guides.
- Everything moved to v5: rhythm ratios and the rhythm editor, the Custom note density, wider rhythm
  mutations, the whole-file seed.
- Firefox and Safari: Chrome stays the one supported browser.

## 3. Personas and goals served

The [personas](../../personas.md) are unchanged for v4.0.

- **P1, the Curious Improviser** (primary): can read, struggles to read fast, a beginner at
  improvising.
- **P2, the Speed Builder** (secondary): wants to read and play faster.
- **P3, the Fledgling Composer** (secondary): uses the generator as a source of ideas.

| Goal                                                                                     | v4.0                                                                                                                                                         |
| ---------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **P1.G1, vocabulary by exposure:** play whatever gets generated and feel how ideas sound | Served partly: the player hears, on demand, how a line is doubled, countered and answered, and the playing lights say which part they are hearing           |
| **P1.G2, real-time reading and dexterity**                                               | Protected, not advanced: the score is unchanged, every new part is off by default, and no part sounds on the lead's own pitch at the same time except the doubling's deliberate fusion |
| **P2.S1, endless fresh material read at a higher BPM**                                   | Neutral: nothing changes unless a part is switched on                                                                                                       |
| **P3.C2, take it out** to a widely known format                                          | Served partly: the MIDI export carries each part switched on as its own track                                                                               |

**Tension settled:** more sound against reading load. The parts are heard only, off by default,
and limited to two relation parts sounding at once (§6.6); the lights are small and the score is
untouched.

## 4. Terms

- **Lead:** the player's line, the phrase on the staff.
- **System voice:** any line the app plays: the bass, the chords, the two guides, and v4.0's four
  parts.
- **Part:** in this spec, one of the four new system voices, with its own switch, volume and
  light. The backing (bass and chords together) is a mix channel, not a part.
- **Mix channel:** one switch and one volume in the mix. The owner's "tracks" are parts and mix
  channels; "track" stays the word for a MIDI file's tracks.
- **Relation parts:** Thirds, Counter-melody and Fills, the three that relate to the lead's notes.
- **Window:** the phrase's [register window](../../../docs/music/lexicon.md#register-window), the
  span of pitches the lead stays inside (half the instrument's range, at least one octave).
- **Beat, eighth, tick:** a beat is a quarter note; an eighth is half a beat; a tick is a
  sixteenth, 16 per measure. A phrase is four measures of 4/4, 64 ticks.

## 5. The mix as built, and what v4.0 adds

As built in v3.4, four sounds have a switch in the score toolbar and a slider in the one `Volume`
panel: Backing (bass and chords together, on by default), Click (on; the count-in always sounds at
its volume), Melody guide and Rhythm guide (off). The backing's harmony shows as chord symbols, the
count-in as beat marks; no system voice is drawn as notes, and no sound can be chosen.

v4.0 appends four mix channels, Thirds, Counter-melody, Fills and Drums, each a switch and a
slider like the guides'. The click, the count-in and the guides are unchanged.

## 6. The parts

### 6.1 Rules every part keeps

1. **Rendered per phrase from the phrase alone:** its timeline (the lead), its harmony, its window
   and its scale (the collection of its key and mode). No part reads the next phrase or the notes
   played.
2. **The chord as written:** a chord's tones are its triad, plus its seventh when the Seventh
   chords level put one there.
3. **Played only inside a running session,** in plain sessions and in Jam, from phrase 1's first
   beat; never in the count-in, nor in a fresh Jam's capture, writing or read-in measures, never
   at idle or in the Review. Everything fades out at the session's end with the backing.
4. **A rest is always legal.** A note a rule cannot place is left out; the part never fails the
   phrase.
5. **Deterministic.** The same phrase and the same settings give the same notes. Only Fills draw a
   random choice, from a named stream of the phrase's seed.

### 6.2 Backing

Unchanged notes: the bass plays the chord's root at each chord change and downbeat, and its fifth
from beat 3 when one chord fills the measure, in MIDI 36–47; the chords are close-position, top note
at most E4 (MIDI 64), four notes for a seventh chord. Only its sound changes (§9.2).

### 6.3 Thirds (highlighting)

A second line that plays along with the lead's important notes, a third or a sixth below them, so
they sound fuller.

- **Which notes:** a lead note is doubled when it lasts at least one beat (tied notes count as one
  note) or starts on beat 1 or beat 3 of a measure. Other lead notes are not doubled.
- **Its pitch:** the note a diatonic third below in the phrase's scale, or the one a diatonic sixth
  below. The one that is a chord tone of the chord sounding at the note's start is chosen; when
  both or neither are, the third.
- **Floor:** never below MIDI 48. When the chosen note would be, the other interval is taken if it is
  at or above 48; otherwise the note is not doubled.
- **Chromatic lead notes** (outside the scale) are not doubled.
- **Timing:** exactly the lead note's start and length.

### 6.4 Counter-melody (contrasting)

A second, slower tune that moves when the lead holds and holds when the lead moves.

- **Its lane:** above the lead's window when the phrase uses its instrument's Low or Middle window,
  from 3 to 15 half steps above the window's top; below it when the phrase uses the High window,
  from 15 to 3 half steps below the window's bottom, never below MIDI 48. With Register on Varying,
  the phrase's resolved window decides. It never crosses the lead.
- **One note per chord.** For each harmony event, one note: a **guide tone** of the chord, its third
  or its seventh for a seventh chord, its third or its fifth for a triad, in the lane.
- **Voice leading:** the first note is the candidate nearest the lane's centre; each next note is
  the candidate nearest the previous note, so the line moves mostly by step or holds a common tone.
  A candidate that would make parallel fifths or octaves with the bass's move at that chord change
  is skipped when another exists. Ties go to the lower note. A note equal to the previous one is
  held (one longer note).
- **Timing:** a chord's note starts at the chord's start when no lead note starts there; otherwise
  at the first eighth inside the chord's first two beats where no lead note starts; otherwise at the
  chord's start. It lasts until the next counter-melody note starts, and the last until the phrase
  ends.

### 6.5 Fills (responding)

A short answer played in the gaps the lead leaves. It answers the **written phrase**, known before
it sounds, never the notes the player played.

- **Where:** in every lead rest at least one beat long. Nowhere else.
- **Rhythm:** eighth notes, starting one eighth after the rest begins, at most four; the last note
  lasts until the rest ends or for one beat, whichever is shorter. A rest with room for fewer
  notes takes fewer.
- **Target:** the last note is the chord tone nearest the lead's next note, not equal to it (ties
  below), so the fill leads into the lead's entry. A rest that ends the phrase targets the chord's
  root nearest the window's centre.
- **Shape:** one of five, drawn per fill from the phrase's seed: rising arpeggio, falling arpeggio
  (chord tones of the chord sounding at each note), rising scale, falling scale (steps of the
  phrase's scale), or a turn around the target (the target, a step above, the target, a step
  below, the target). The notes before the target are built backwards from it.
- **Register:** inside the lead's window. A note that would leave it reverses the shape's
  direction.

### 6.6 How many relation parts sound at once

At most two of the three relation parts sound at any moment, by construction: Thirds sound only
while a lead note sounds and Fills only in the lead's rests, so they never overlap; the
Counter-melody may sound with either. Drums and the backing are the foundation and are not counted.

### 6.7 Drums (foundation)

One groove, the same in every measure: kick drum on beats 1 and 3, snare drum on beats 2 and 4,
closed hi-hat on every eighth. Velocities: kick 100, snare 90, hi-hat 70 on the beat and 50 off it.
No fills, no variation, no random draw. The click keeps its own switch and the count-in stays the
click: drums never count in.

## 7. The playing lights

Each part has a small light that says it is playing, so the player can tell which sound is which.

- **Lit** while the part has a note sounding, as heard: on the audio clock, corrected for the
  output latency the way the playhead is.
- **No flicker:** the light stays lit across a silence of the part shorter than one beat at the
  session's tempo, and goes dark after a longer one. (So Drums, when on, stay lit; Fills light only
  in the lead's rests.)
- **Only in a running session,** when a part's notes can sound (§6.1 rule 3). Dark at idle, in the
  count-in and in the Review, and dark for a part switched off.
- **State not by colour alone,** and no animation beyond the change of state.
- The backing, the click and the guides have no light.

## 8. Controls

- **Switches and volumes.** Each part has an on/off switch and a volume slider that reaches
  silence, like the guides'. All four are **off by default**; the backing stays on by default.
  Default volumes are set by ear at the listening check, as design values.
- **Mid-session:** switched off, a part is silent at once; switched on, it joins at its next note.
  Its light follows.
- **Saved** with the mix settings, as the other channels are, when changed (a volume when its slider
  is released). Settings saved by v3.4 load with the four parts off, at their default volumes.
- **The app writes every note.** No setting chooses a role's technique, a part's sound or its
  register.
- If the sound library is unavailable (§9.4), the four switches are disabled at idle with a short
  reason, and the backing keeps its v3.4 sound.

## 9. Sound

### 9.1 The library

- **Tone.js 15.1.22**, pinned, used as an instrument and effect library only. Its `Transport` is
  never started: our look-ahead scheduler stays the only clock and every note is given its exact
  audio time.
- **One audio context:** the app's, created as today in the Start (or Connect controller) click;
  Tone.js is set onto it right after loading (`setContext(appContext, true)`), which disposes the
  context Tone.js makes on import.
- **No AudioWorklet classes** (no PluckSynth, Freeverb, JCReverb or BitCrusher): they load from
  `blob:` scripts the security policy blocks.
- **The spike decides** between Tone.js and plain Web Audio with a small AudioWorklet, by the sound
  library survey's [measure table and decision rule](../../../docs/sound-library-survey.md#spike-plan):
  one audio context, onsets within one render quantum, added in-graph delay at most 5 ms, the
  playhead within 20 ms, no audio task over 50 ms, no underrun over 5 minutes on the reference
  phone with every part and the reverb on, and the owner accepting the sound. If Tone.js fails
  only on the phone's audio thread, the reverb goes first, then the hi-hat becomes filtered noise,
  before the fallback is taken. The fallback keeps §9.2's sound intentions with native nodes.

### 9.2 Timbres

Chosen under the owner's delegation, all software synthesis, no sample. Each is tunable at the
listening check (§13); the intent is fixed: keep the lead clear by register, brightness and attack,
away from the melody guide's pure, quick-starting sine at the lead's own pitch.

| Voice          | Tone.js voice                                                                   | Why                                                                                                     |
| -------------- | ------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| Bass           | `MonoSynth`: square wave through a low-pass filter (about 700 Hz), short filter envelope, dry | A round, defined low note that does not reach the lead's register; one voice, cheap                    |
| Chords         | `PolySynth` of `FMSynth`, electric-piano setting (harmonicity 3, low modulation index), up to 8 voices, reverb send | A soft, warm keyboard sound that sits under the lead without the sine's hollowness                     |
| Thirds         | `AMSynth`, mellow, 25 ms attack, quieter than the lead's guide, dry             | Blends with the lead it doubles (fusion is the point) but starts softer than the melody guide's sine   |
| Counter-melody | `MonoSynth`: sawtooth through a low-pass filter (about 1.2 kHz), 60 ms attack, reverb send | A bowed, horn-like line in its own lane; the slow attack suits a slow tune and keeps it behind the lead |
| Fills          | `FMSynth`, mallet setting (bright attack, fast decay), reverb send              | A marked, short timbre that stands apart and gets out of the way before the lead returns               |
| Kick           | `MembraneSynth`                                                                 | The standard synthesized kick; one voice, cheap                                                         |
| Snare          | `NoiseSynth`, white noise, short envelope                                       | A noise burst reads as a snare; cheap                                                                   |
| Hi-hat         | `MetalSynth`, short decay, quiet                                                | A metallic tick for the eighths; the heaviest drum, so the first to become filtered noise on the phone |

- **Effects:** one shared, short convolution reverb (Tone.js `Reverb`, about 1.5 s, low wet level,
  its impulse generated when the library loads), fed by the chords, the counter-melody and the
  fills. No compressor.
- **The click and the two guides keep their v3.4 oscillator sounds,** unchanged.

### 9.3 Sound as data, selection locked

Each voice's sound is one data entry behind the sound-roles seam (`src/audio/sound-roles.ts`): the
library voice and its options, its effect sends, its mix channel. No setting exposes it in v4.0.
The game is expected to make instrument selection a major feature; with the sound as data, it
needs no reshaping to do so.

### 9.4 Loading

- The library is a lazy chunk, never in the first load, fetched when the page is idle after its
  first paint and kept by the service worker for offline use.
- Start stays synchronous, as today. If the library is ready, the session uses it. If it is still
  loading, the session starts at once: the backing plays its v3.4 oscillator sound for the whole
  session, and the parts switched on join at the first phrase start after the library is ready.
- If the library fails to load, the parts are unavailable (§8) until the page is reloaded.
- At Stop, the fade cuts every voice and the reverb's tail with it.

## 10. Architecture

These are the decisions made for v4.0, with their reasons.

### 10.1 The lead stays one voice; the accompaniment sits beside it

The phrase's timeline stays the monophonic four-measure `ConcertEventTimeline`. Because the player
plays only the lead, every other voice is the app's, and all of them follow the one lead; nothing
needs a polyphonic timeline. Keeping it unchanged leaves the generator, the notation and the twelve
outside readers of the timeline untouched. A phrase's accompaniment is a separate list of
**parts**: each with its voice, its role, its mix channel and its notes; each note a start and a
length in whole-note fractions from the phrase's start, a concert pitch or a drum sound (kick,
snare, closed hi-hat), and a velocity. The backing's two voices and the two guides take the same
shape, so the transport, the mix and the exports handle one kind of thing.

### 10.2 One pure arranger on the library side

A pure function in `src/domain/backing/` renders a phrase's accompaniment from its timeline, its
harmony, its window, its scale, its seed and the accompaniment settings. It imports no browser API
and no package, so the enforced library line holds and the game can reuse it. It recomputes the
lead's chord-tone facts from the timeline and the harmony rather than reading the generator's
internals. Its only random choice, the fill shape, draws from a new named stream (a stream-registry
version bump); the lead's own draws are unchanged. Today's renderers keep their rules and are
covered by the same golden tests.

**Why only the current phrase:** the next phrase is not known when a phrase is queued (it is
requested only when the current one starts sounding). Fills therefore aim at the lead's next note
inside the phrase, or the chord's root at the phrase's end; holding two phrases ahead is a larger
change to the session engine, not taken.

**Where it runs:** at queue time on the main thread, as the renderers do, provided no render task
exceeds 50 ms on the reference phone; otherwise in the generation worker beside the phrase. The
first build step measures it.

### 10.3 Playing

The transport queues a phrase's parts and the session bus sounds a note by part. The mix keeps the
v3.2 design: channels looked up, not named, each an on/off gain into a volume gain, so each part is
one more channel. Every part is rendered whether it is on or off, so switching one on mid-session
needs no re-render. The session bus's sounding layer is the only part that knows the library.

### 10.4 Keeping and replay

Nothing rendered is stored, as today. A kept session stores which of the four parts were on when
it ended, and the arranger's version (1); a review or an export renders them again from the
phrase's timeline, harmony and seed. Sessions kept before v4.0 have no such record and render the
backing only. Replay keys do not change: an `ifk5.` key encodes the generation intent, and the
arranger's inputs are not part of it.

### 10.5 Exports

- **MIDI:** the generated-notes file's backing option becomes an accompaniment option, off by
  default as before, for the whole session and for favorites alike. When chosen it writes the
  Backing track as today, plus one track per part that was on when the session ended, rendered for
  every exported phrase: Thirds, Counter-melody and Fills on the next free channels, Drums on MIDI
  channel 10 with the General MIDI notes kick 36, snare 38, closed hi-hat 42. Part velocities: the
  drums' as in §6.7, the others 64.
- **MusicXML:** unchanged, the lead only with its chord symbols.
- A part switched on partway through a session is exported for the whole session: the record keeps
  the state at the end only.

### 10.6 Budgets, security policy and boundaries

- **Start-up:** the 400 KiB start-up budget is unchanged and untouched; the library is never in the
  first load.
- **The library's chunk** gets its own named budget in `verify:boundaries`: at most 300 KiB
  minified and 80 KiB compressed (Tone.js 15.1.22 measured about 245 KiB minified for the classes
  used).
- **Security policy:** `worker-src 'self' blob:` in `docker/security-headers.conf`, for the
  library's timing worker; `script-src` unchanged.
- **The sound ban is recorded sound.** The only true ban, the owner's, is on samples and audio
  assets; generated buffers, worklets and effects are allowed. `verify:boundaries` keeps banning
  decoding or streaming recorded audio in our source (`decodeAudioData`,
  `createMediaElementSource`, `new Audio(`, `fetch(`) and audio or sample files in the build; it
  stops banning `createBufferSource` and `new AudioBuffer(`, and its messages say "no recorded
  sound" instead of "oscillators and gains only".
- **Browsers:** a known Tone.js bug with a custom audio context on Firefox does not block v4.0;
  Chrome is the one supported browser.

## 11. The existing system

Grounded on `main` at 6d4c33c3.

| Area                                   | What exists                                                                                                     | What v4.0 does                                                                 |
| -------------------------------------- | --------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| `src/domain/backing/`                  | `renderBacking(harmony, meter)` gives bass and chords; `renderGuide(timeline, harmony)` gives the two guides   | The arranger; the part shape; both renderers' outputs reshaped                 |
| `src/domain/random/`                   | Named streams, a versioned registry                                                                             | One new stream; registry version bump                                          |
| `src/audio/sound-roles.ts`             | Four sound roles, four mix channels, each role's oscillator voice as data                                      | Seven more voices (four parts, three drum sounds) and four channels; library voices as data |
| `src/audio/transport-session.ts`       | Renders backing and guides when a phrase is queued                                                             | Queues parts                                                                    |
| `src/audio/web-audio-voices.ts`, `web-audio-session-bus.ts` | The only code that knows how a note sounds                                                   | Gains the library adapter beside the oscillator voices                         |
| `src/audio/audio-mix.ts`, `src/components/workspace/MixControls.vue`, `MixVolumePanel.vue` | Eight mix values, four switches, four sliders | Sixteen values; the controls and lights as the design places them              |
| `src/storage/records/`                 | Mix settings keys; kept sessions store timeline and harmony                                                     | Eight mix keys; the parts' end state and arranger version per kept session     |
| `src/export/midi/`                     | Generated notes, optional Backing track                                                                         | One track per part                                                              |
| `scripts/verify-boundaries.mjs`, `docker/security-headers.conf` | Oscillators-only wording; `worker-src 'self'`                                         | §10.6                                                                           |
| Generator, `src/domain/events/`, notation, acknowledgement | Unchanged                                                                                     | Unchanged                                                                       |

**At risk:**
- **Start-up.** The audio code is in the first load; the library must stay a lazy chunk, and
  start-up JavaScript is 15.5 KB under its budget.
- **Timing on the phone.** More nodes per note; the spike's audio-thread measures and the playhead
  check must pass with every part on.
- **The synchronous Start.** The audio context must still be created inside the click; nothing may
  wait for the library there.
- **Stored settings and kept sessions** gain fields; v3.4 data must load unchanged.

**Declared intent to amend** (for the intent record): `req_session_backing_track` (oscillators and
"no accompaniment with musical roles"), `rule_guide_sound_from_oscillators` (its "adds no library",
true of the guides alone now), `module_guide_playback_layers` (the seam's roles; the sounding layer
the library replaces), `req_session_audio_mix` (eight controls become sixteen),
`vision_infinite_flow_first_release` (the backing's description, the release list), and
`rule_guide_fixed_voices` if its comparison with the backing's sound no longer holds.
`entity_concert_event_timeline` holds.

## 12. For the design

The interface is `ux-writer`'s. What it designs, within this spec:

1. **Four switches and their sliders** beside the existing four, in the score toolbar and the
   `Volume` panel, with the toolbar's no-colour-alone state words; eight switches may not fit one
   line.
2. **The four playing lights** (§7): where they sit (on or beside each switch, or a row), their
   unlit and lit states without colour alone, at music-stand distance, and whether a phone keeps
   them (reducing them on a phone is acceptable).
3. **The parts' player-facing labels**, one lexicon term each with its popup.
4. **The disabled state** of the four switches when the library is unavailable, with its short
   reason.
5. **The export option's new wording** (accompaniment instead of backing).
6. **The default volumes** as design values, set by ear with the listening check.

## 13. Definition of done

1. The four parts sound as §6 states, in plain sessions and in Jam, and nowhere else; unit tests
   check each rule of §6.3 to §6.7 as an invariant over a seeded corpus of phrases, including every
   built-in window, My instrument, seventh chords on and off, and chromatic lead notes.
2. The backing's notes and the guides' notes are byte-identical to v3.4 on the recorded corpus.
3. The same phrase and settings render the same parts, twice and across a reload.
4. At most two relation parts sound at once on the whole corpus.
5. Switches, sliders, defaults, mid-session behaviour and saving follow §8; v3.4 settings and kept
   sessions load unchanged.
6. The lights follow §7, within the playhead's tolerance of the audio.
7. The spike's measures pass (§9.1) on the reference laptop and phone, or the fallback is taken by
   its rule and passes them.
8. Exactly one audio context exists in a Playwright run; the library chunk is absent from the first
   load and within its budget; the start-up budget passes unchanged.
9. The security policy and `verify:boundaries` are as §10.6; the build contains no audio file.
10. The MIDI export follows §10.5; MusicXML is unchanged.
11. The owner hears every part at the listening check and accepts the timbres, lanes, velocities
    and default volumes, or they are tuned until he does.
12. `npm run quality` passes; the intent record is amended as §11 lists.

## 14. Deferred and open

- **Open, settled by measurement:** whether Tone.js passes the spike or the plain Web Audio fallback
  is taken (§9.1). Its decision rule is fixed; only the measurements are missing.
- **Tuned at the listening check:** every timbre and effect level, the lanes' numbers (the floor at
  MIDI 48, the counter-melody's 3 to 15 half steps), the velocities and the default volumes, and
  whether the chords' top at E4 should move down now that more voices share the middle register.
- **Deferred to the game:** instrument and sound selection; live answers to what the player plays
  (turn-based exchanges); more roles and per-style grooves.
- **Not taken:** fills or bass approaches that lead into the next phrase's first chord (they need
  the session engine to hold two phrases ahead).
- **Carried from v3.4's master spec:** its §C19.6 places `BackingVoice` in `audio-ports.ts`; it now
  lives in `src/audio/sound-roles.ts`.
