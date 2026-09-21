Here is the detailed technical and functional specification for **SaxImprov Infinite Flow**. This document is structured so you can use it as a reference for production development, refactoring, or extending the engine into a standalone app or native VST/AU/mobile tool.

---

# Functional & Technical Specification: SaxImprov Infinite Flow

## 1. Executive Summary

**SaxImprov Infinite Flow** is a browser-based, interactive generative practice workstation engineered specifically for monophonic wind instrumentalists (acoustic saxophonists using internal mics or electronic wind controllers like Travel Sax, EWI, and Aerophone).

The application solves the problem of static, repetitive backing-track play-alongs by continuously streaming procedural 2-to-4 bar phrases onto a scrolling musical staff. Melodic contour, rest density, rhythmic subdivision, and harmonic tension are controlled in real time. An intelligent **"Theme Seed & Continue"** mode analyzes an input motif played by the musician, infers its tonal center and emotional contour, and harmonizes an evolving response with natural tension-and-release arcs.

---

## 2. Core Functional Requirements

### 2.1 The Rolling Staff Engine

Unlike traditional digital sheet music that requires page turns or loops fixed static rectangles, the staff must be a continuous chronological conveyor.

* **Viewport Layout**: Displays a minimum of **2** and a maximum of **4 active measures** simultaneously.
* **Continuous Sliding Window**:
* As measure $M_n$ finishes playing, the entire viewport smoothly scrolls left by one measure unit over a calibrated easing duration (e.g., $150\text{ ms}$ or a continuous pixel-per-tick conveyor).
* Measure $M_{n-1}$ is purged from active memory; new measure $M_{n+3}$ is procedurally generated off-screen and enqueued at the right edge.


* **Visual Display & Notation Readability**:
* **Dual Notation Display**: Each note displays the **Written Saxophone Pitch** (large, high-contrast brass color) with the corresponding **Sounding Concert Pitch** displayed as a subtle subscript.
* **Harmonic Degree Badges**: Color-coded markers indicating the note's function against the prevailing chord:
* Root ($1$): Crimson (`#ef4444`)
* 3rd ($3$ / $\flat 3$): Amber (`#f59e0b`)
* 5th ($5$ / $\flat 5$ / $\sharp 5$): Emerald (`#10b981`)
* 7th ($7$ / $\flat 7$): Indigo (`#6366f1`)
* Extensions ($9$, $11$, $13$, altered tones): Violet/Magenta (`#d946ef`)
* Rests: Neutral slate pill with breath glyph (`𝄽` / rest symbol).


* **Playhead**: A vertical glowing cursor moves across the active measure strictly synchronized with audio playback down to the millisecond.



---

### 2.2 Procedural Generation & Control Surface Knobs

The generation engine evaluates measures on a beat-by-beat basis using five core parameterized constraints:

| Control Parameter | Range | Musical Logic & Algorithmic Impact |
| --- | --- | --- |
| **Silence / Space Density** | $0\% - 75\%$ | Controls the mathematical probability $P(\text{rest})$ on any beat or subdivision. Forces realistic woodwind phrasing, physical breath windows, and conversational call-and-response pacing. |
| **Note Density (Subdivision)** | Quarters, 8ths, 16ths, Mixed Syncopated | Dictates the grid resolution. Quarters = lyrical ballad; 8ths = straight/swing bebop lines; 16ths = double-time modern fusion; Mixed = syncopated anticipations (e.g., off-beat 8th pushed over the bar line). |
| **Melodic Contour** | Arch, Ascending, Descending, Chaotic, Leaping | Modulates the target register trajectory: <br>

<br>• **Arch**: Ascends to a peak on beat 3 of bar 2, then cascades downward.<br>

<br>• **Ascending/Descending**: Enforces strictly monotone directional constraints.<br>

<br>• **Chaotic**: Maximizes interval variance (mix of half-steps and 6ths/7ths).<br>

<br>• **Leaping**: Forces octave/7th skips followed by stepwise scalar recovery. |
| **Vocabulary Level** | Chord Tones, Rootless 9ths, Coltrane Cells, Enclosures | • **Tier 1 (Triads/7ths)**: Standard $1\text{–}3\text{–}5\text{–}7$ chord outlines.<br>

<br>• **Tier 2 (Rootless 9ths)**: Omits root; stacks $3\text{–}5\text{–}7\text{–}9$ substitutions.<br>

<br>• **Tier 3 (Coltrane Digital Cells)**: Inserts $1\text{–}2\text{–}3\text{–}5$ permutations.<br>

<br>• **Tier 4 (Chromatic Enclosures)**: Inserts a half-step above and chromatic step below target guide tones prior to chord resolution. |
| **Harmonic Tension Arc** | 4-Bar or 8-Bar Tension Cycle | Cycles the harmony systematically: **Resolution/Tonic** $\rightarrow$ **Predominant Motion** $\rightarrow$ **Altered Dominant / Tritone Substitution** (peak tension: $\flat 9, \sharp 9, \sharp 11, \flat 13$) $\rightarrow$ **Cathartic Guide-Tone Voice-Leading Resolution**. |

---

### 2.3 "Theme Seed & Continue" (AI Prompting & Dialogue Mode)

1. **Count-In & Capture Window**:
* The user triggers "Seed & Continue". A 4-beat audio/visual metronome count-in sounds.
* The engine opens a 2-bar MIDI/Audio listener window.


2. **Feature Extraction**:
* As the user plays their opening motif on the sax, the engine logs note timestamps, durations, and pitch classes.
* It performs a **Krumhansl-Schmuckler Pitch-Class Profile Analysis** to detect the implied tonal center and mode (e.g., D Dorian, F Major, C Minor).
* It evaluates motif metrics: interval leap density, rhythmic energy (average subdivision), and melodic direction.


3. **Harmonic & Melodic Continuation**:
* The engine generates a backing chord progression anchored around the extracted key.
* For bars 3–4 (and subsequent rolling cycles), the system applies motivic transformations:
* **Inversion / Retrograde Variation**: Re-uses the user's rhythmic footprint while shifting pitches along the current chord degrees.
* **Tension Escalation**: Over the next 4 bars, the engine introduces secondary dominants and tritone substitutions against the user's motif.
* **Resolution Call-and-Response**: The engine inserts rest bars to prompt the user to play their response, alternating active generation with designated user solo bars.





---

### 2.4 Wind Controller & Web MIDI Subsystem

* **API**: Native Web MIDI API (`navigator.requestMIDIAccess()`).
* **Device Support**: Plug-and-play detection for Travel Sax, Akai EWI (USB/4000/5000), Roland Aerophone, and standard MIDI keyboards.
* **Expression Mapping**:
* Continuous mapping of **Breath Pressure (CC2 / CC11)** and **Aftertouch** to Web Audio gain nodes and cutoff filter frequencies.


* **Transposition Matrix**:
* The UI maintains a single internal representation in **Concert Pitch (C)**.
* Written notation and input routing dynamically apply interval offsets:
* **B♭ Soprano / Tenor Sax**: Sounding Concert C = Written D (+2 semitones or +14 semitones depending on register).
* **E♭ Alto / Baritone Sax**: Sounding Concert C = Written A (+9 semitones).
* **C Concert**: Sounding Concert C = Written C (0 offset).





---

## 3. Web Audio Synthesis Architecture

The application requires zero third-party audio sample dependencies, relying on a lightweight, low-latency DSP graph built in the native Web Audio API (`AudioContext`).

```
[ Oscillators (Sawtooth) ] ──┐
                             ├─► [ Formant Filter (Bandpass ~800-1400Hz) ] ──┐
[ Noise Gen (Breath Air) ] ──┘                                               │
                                                                             ▼
[ Vibrato LFO (5.3 Hz) ] ──► [ Detune Modulation ]               [ Main Lowpass Filter ]
                                                                             │
                                                                             ▼
                                                                  [ ADSR Gain Envelope ]
                                                                             │
                                                                             ▼
                                                                 [ Master Bus / Output ]

```

### 3.1 Monophonic Saxophone Modeling

* **Tone Core**: Sawtooth oscillator passing through a high-order lowpass filter (`cutoff ~2200 Hz`) simulating reed-wood resonance.
* **Breath Noise Generator**: White noise buffer through a bandpass filter (`Q = 3.0, freq = 3200 Hz`), mixed in at $-18\text{ dB}$ to simulate escaping air and turbulence at the mouthpiece baffle.
* **Acoustic Formant**: Dual peaking/bandpass filters tuned between $800\text{ Hz}$ and $1400\text{ Hz}$ to reproduce the acoustic vocal-tract resonances of a saxophone neck and bell.
* **Vibrato LFO**: Sine wave oscillator tuned to $5.2\text{–}5.5\text{ Hz}$, delayed by $180\text{ ms}$ post-note-onset, modulating oscillator pitch frequency by $\pm 12\text{ cents}$.

### 3.2 Accompaniment Rhythm Section

* **Swing Ride Cymbal**: White noise burst enveloped through a high-pass filter ($7000\text{ Hz}$) with subtle 60% swing ratio (triplet grid: beat 1, beat 2-and, beat 3, beat 4-and).
* **Acoustic Walking Bass**: Triangle wave paired with a low sine wave sub-oscillator, driving an exponential decay envelope ($T_{\text{decay}} = 0.4\text{ s}$) following chord roots and guide-tone approach notes.
* **Comping Electric Piano**: Band-limited FM synth (Carrier = Sine, Modulator = Sine at 1:1 ratio) voicing shell chords ($3\text{rds}$ and $7\text{ths}$) with randomized rhythmic pushes on the "and" of beat 2 and beat 4.

---

## 4. System Data Architecture & State Schema

### 4.1 Note Data Model

```typescript
interface GeneratedNote {
  id: string;
  writtenPitch: string;      // e.g. "B4", "C#5" (Sax fingering)
  concertPitch: string;      // e.g. "A4", "B4" (Sounding pitch)
  midiNumber: number;        // Concert MIDI (60 = Middle C)
  writtenMidi: number;       // Transposed MIDI
  durationBeats: number;     // 1.0 (Quarter), 0.5 (8th), 0.25 (16th)
  isRest: boolean;
  degreeLabel: string;       // "1", "b3", "3", "5", "7", "b9", "9", "#11", "R"
  tensionScore: number;      // 0.0 (resolved) to 1.0 (maximum tension)
  isEnclosure?: boolean;
}

```

### 4.2 Measure Data Model

```typescript
interface StreamMeasure {
  measureIndex: number;
  chordName: string;         // e.g. "G7alt", "Cmaj7#11"
  chordConcertRoot: string;  // "G"
  chordType: string;         // "dominantAltered", "major7", "minor7"
  subdivision: string;       // "8n", "16n", "quarter"
  notes: GeneratedNote[];
  totalBeats: number;        // 4
  tensionTier: 'tonic' | 'subdominant' | 'dominant-altered' | 'resolution';
}

```

### 4.3 Engine State Machine

```typescript
interface ImprovEngineState {
  tempoBpm: number;
  transposition: 'Bb' | 'Eb' | 'Concert';
  silenceProbability: number; // 0.0 to 0.75
  subdivisionMode: 'quarter' | '8th' | '16th' | 'mixed';
  contour: 'arch' | 'ascending' | 'descending' | 'chaotic' | 'leaps';
  vocabulary: 'chordTones' | 'rootless9' | 'coltrane' | 'enclosures';
  playbackStatus: 'stopped' | 'running' | 'seeding';
  measureQueue: StreamMeasure[];
  currentBeat: number;
  activePlayheadPosition: number; // 0.0 to 1.0 within visible window
}

```

---

## 5. UI/UX & Notation Layout Architecture

```
+-------------------------------------------------------------------------+
| [TEMPO: 120] [HORN: Bb TENOR] [SILENCE: 35%] [DENSITY: 8ths] [CONTOUR] |
+-------------------------------------------------------------------------+
|                                                                         |
|   MEASURE 12           MEASURE 13          MEASURE 14         MEASURE 15|
|  [ Dm7 (ii) ]         [ G7alt (V) ]       [ Cmaj9 (I) ]      [ A7b9 ]   |
|                                                                         |
|    |=== PLAYHEAD ======|                                                |
|    |      ♩     ♪   ♪  |   ♩    𝄽   ♪  ♪   |   ♪  ♪  ♩   ♩  |  𝄽   ♩  𝄽  |
|    |     [D5]  [F5][A5]|  [Ab5]   [B4][Db5]|  [E5][G5][B5]  |     [Bb4] |
|    |     (Rt)  (b3) (5)|  (b9)     (3) (b5)|  (3)  (5) (7)  |     (b9)  |
|                                                                         |
| <<<<<<<<<< CONTINUOUS SCROLLING DIRECTION <<<<<<<<<<<<<<<<<<<<<<<<<<<<<<|
+-------------------------------------------------------------------------+
| [SEED & CONTINUE] [RE-ROLL PHRASE] [MUTE COMPING]  [BREATH CC: ████░░]  |
+-------------------------------------------------------------------------+

```

1. **Staff Visual Pipeline**: Rendered via HTML5 2D Canvas or vectorized SVG:
* Fixed staff line heights with dynamic stem up/down assignment ($B_4$ midpoint rule).
* High-contrast clefs and key signatures at the left anchor.
* Smooth horizontal transform interpolation (`requestAnimationFrame`) tied to the audio clock (`audioContext.currentTime`) rather than standard UI timers (`setInterval`) to eliminate visual jitter or audio drift.


2. **Dynamic Feedback Pill**:
* Bottom status ribbon shows active MIDI device connection status and real-time Breath Pressure (CC2/CC11) level indicator.



---

## 6. Verification, Testing & Acceptance Criteria

1. **Audio-Visual Drift**:
* The playhead synchronization must run on the `AudioContext.currentTime` timeline. Total drift between audio note triggers and playhead visual position must not exceed $\pm 10\text{ ms}$ over 30 minutes of continuous playback.


2. **MIDI Latency**:
* Wind controller input-to-sound latency via Web MIDI and Web Audio oscillators must remain under $15\text{ ms}$ on standard hardware.


3. **Transposition Integrity**:
* When switching between $B\flat$, $E\flat$, and $C$, the written pitch badges must reflect the correct interval transposition instantly without mutating the underlying concert harmony.


4. **Memory Allocation in Continuous Rolling Mode**:
* Measures that scroll off-screen must have their DOM/Canvas nodes and memory references unlinked and collected to prevent long-session memory leaks.