# Generator Architecture

Status: draft v0.1

## Architectural Intent

The musical generator must be highly decoupled so that a new harmonic language, rhythm strategy, phrase model, backing generator, or adaptation method can be introduced without rewriting unrelated musical logic or the user interface.

The four-measure generator is the first consumer of these seams. The later MIDI-seeded, rolling generator must reuse the same seams rather than becoming a separate engine.

## Generator Profiles

The default profile is style-neutral. It must not import jazz-specific assumptions into the shared generator contracts. Its initial grammar uses a selected major, minor, or modal scale; mostly diatonic chord movement; chord tones and scale passing tones; and tension from non-chord scale tones, rhythm, contour, and silence. It excludes substitutions, altered dominants, and chromatic enclosures.

An optional jazz-oriented profile is included early to validate that a different harmonic and melodic vocabulary can be selected without coupling generators to a single style.

Its initial extension permits chromatic approaches and enclosures around target tones. It does not yet permit altered dominants or harmonic substitutions.

(proposed) A profile supplies theory vocabulary and planner policies: allowed scales and chord qualities, harmonic motion, tension devices, rhythm tendencies, contour preferences, and voicing or backing conventions. It does not own UI controls, browser APIs, audio scheduling, or persistent session state.

For the first deliverable, the control-mapping seam turns the selected tonal center, scale or mode, harmonic-motion setting, and tension setting into a policy consumed by the harmony and pitch planners. Direct chord-progression selection is deferred.

The same seam maps contour, register, leapiness, and arpeggio chaos controls into pitch-planner policy. The pitch planner must use these values as constraints or weighted preferences, not as UI concepts. Arpeggio chaos controls the ordering and interval contrast of eligible chord tones; it does not override profile pitch vocabulary or resolution rules.

The first request contract fixes meter at 4/4 and carries a user-selected, stable BPM. A rhythm policy supplies subdivision (quarters, eighths, sixteenths, or mixed), syncopation (straight through active displacement), and rest behavior (sparse through breath-heavy); meter changes, deliberate tempo changes, and pulse-feel controls remain later extensions.

Notation consumes the stable generated event model. Standard staff rendering is required for the first deliverable and becomes a rolling-window renderer later; it must not cause generator behavior or alter the underlying concert-pitch event data. A selected declarative instrument profile supplies an inclusive active concert range and a whole-phrase register window: C MIDI keyboard `48-72`, B-flat tenor saxophone `46-70`, or E-flat alto saxophone `51-75`, with the adopted contained overlapping Low, Middle, and High windows. `Varying` deterministically resolves one feasible window before planning and never changes it mid-phrase. Transposition is an independent display conversion in treble G2 clef: Concert is `+0/+0`, B-flat tenor is `+14 semitones/+8 diatonic steps`, and E-flat alto is `+9/+5`. It transforms notation only and never regenerates material, changes the selected profile/range/window, or mutates concert-pitch events.

## Proposed Generator Contract

(proposed) A generation request provides only normalized musical context: meter, tempo, requested measure count, tonal/harmonic context, a selected instrument-profile identity with its explicit active range and resolved register window, a recent phrase when available, control values, a deterministic random seed, and an explicit generator-profile identifier.

(proposed) A generation result returns a timeline of measures, note events, rests, chord events, and explanations or labels suitable for display. It does not render notation, schedule audio, read MIDI, or mutate application state.

This boundary makes a generated four-measure proposal reproducible from the same input, and lets the UI, playback layer, and later evaluator consume one stable event model.

## Candidate Musical Seams

- **Control mapping:** translates user-facing knobs into a normalized musical policy. A knob does not call a specific generator directly.
- **Harmony planner:** produces an ordered chord and tension plan for the requested measures.
- **Rhythm planner:** allocates onset opportunities, subdivisions, syncopation, and rests independently of exact pitches.
- **Pitch planner:** assigns pitches to the rhythm plan from harmonic constraints, contour, register, and permitted outside-chord behavior.
- **Phrase transformer:** optionally derives material from a seed phrase. It is absent in the first deliverable and is added for MIDI continuation without replacing harmony, rhythm, or pitch planning.
- **Backing arranger:** optionally derives BPM-aligned accompaniment events from the harmony and rhythm plans. It remains optional and must not be required to create the note proposal or play back the generated lead line.
- **Evaluator:** compares incoming MIDI events with an already generated proposal. It does not influence generation unless a later adaptation policy explicitly requests it.

Each seam consumes and produces explicit, serializable data. It should not reach into browser APIs, controls, audio state, or another seam's internal state.

The first-deliverable MIDI integration sits outside the evaluator. A matching incoming MIDI note may highlight its proposed staff note; a non-match produces a gentle indication without exposing the played pitch. It does not schedule playback, infer timing, compute a score, or alter generator state.

## Evolution Rules

- A new musical style is a selectable profile or a new implementation behind a stable planner contract, not conditionals scattered across UI and playback code.
- The current profile's theory vocabulary is data or policy where practical; it is not encoded into generic scheduling or notation code.
- Randomness is injected through the request seed. The same request must regenerate the same four measures, allowing a phrase to be inspected and tested.
- A user-triggered regeneration keeps the control policy but creates a new seed. The generated result retains that seed for exact reproduction.
- Generator stages may attach musical annotations such as tension role, chord degree, or source transformation. Consumers may use these annotations, but must not infer hidden generator state.
- The application orchestration layer chooses and connects planner implementations. Individual planners do not select, instantiate, or import one another.

## Deferred Architecture Questions

- The exact event schema and notation representation are unresolved.
- The degree to which a generator may revise an earlier planner's result to repair playability or voice leading is unresolved. See O10.
