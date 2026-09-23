# Generator Architecture

Status: v0.5 — Steps 2-5 are implemented: event/deterministic foundations, declarative profile/register data, typed controls/outer intent/session coordination, and an immutable structural harmony candidate-domain seam. Rhythm/pitch planner seams, resolved request construction, notation, and workspace UI remain architectural intent.

## Architectural Intent

The musical generator must be highly decoupled so that a new harmonic language, rhythm strategy, phrase model, backing generator, or adaptation method can be introduced without rewriting unrelated musical logic or the user interface.

The four-measure generator is the first consumer of these seams. The later MIDI-seeded, rolling generator must reuse the same seams rather than becoming a separate engine.

## Generator Profiles

The default profile is style-neutral. It must not import jazz-specific assumptions into the shared generator contracts. Its initial grammar uses a selected major, minor, or modal scale; mostly diatonic chord movement; chord tones and scale passing tones; and tension from non-chord scale tones, rhythm, contour, and silence. It excludes substitutions, altered dominants, and chromatic enclosures.

An optional jazz-oriented profile is included early to validate that a different harmonic and melodic vocabulary can be selected without coupling generators to a single style.

Its initial extension permits chromatic approaches and enclosures around target tones. It does not yet permit altered dominants or harmonic substitutions.

(proposed) A profile supplies theory vocabulary and planner policies: allowed scales and chord qualities, harmonic motion, tension devices, rhythm tendencies, contour preferences, and voicing or backing conventions. It does not own UI controls, browser APIs, audio scheduling, or persistent session state.

For the first deliverable, the implemented control-mapping boundary validates closed catalogs before planner consumption: 60-240 BPM in ten-BPM increments, twelve concert pitch classes, Major/Minor and seven named modes, and the documented musical controls. Its literal first-load state is 90 BPM, C Ionian, Neutral, Lift, Shaped, B-flat tenor, and Predictable. Direct chord-progression selection is deferred.

The same seam maps contour, register, leapiness, and arpeggio chaos controls into pitch-planner policy. The pitch planner must use these values as constraints or weighted preferences, not as UI concepts. Arpeggio chaos controls the ordering and interval contrast of eligible chord tones; it does not override profile pitch vocabulary or resolution rules.

The first request contract fixes meter at 4/4 and carries a user-selected, stable BPM. A rhythm policy supplies subdivision (quarters, eighths, sixteenths, or mixed), syncopation (straight through active displacement), and rest behavior (sparse through breath-heavy); meter changes, deliberate tempo changes, and pulse-feel controls remain later extensions.

Notation consumes the stable generated event model. Standard staff rendering is required for the first deliverable and becomes a rolling-window renderer later; it must not cause generator behavior or alter the underlying concert-pitch event data. A selected declarative instrument profile supplies an inclusive active concert range and a whole-phrase register window: C MIDI keyboard `48-72`, B-flat tenor saxophone `46-70`, or E-flat alto saxophone `51-75`, with the adopted contained overlapping Low, Middle, and High windows. `Varying` deterministically resolves one feasible window before planning and never changes it mid-phrase. Transposition is an independent display conversion in treble G2 clef: Concert is `+0/+0`, B-flat tenor is `+14 semitones/+8 diatonic steps`, and E-flat alto is `+9/+5`. It transforms notation only and never regenerates material, changes the selected profile/range/window, or mutates concert-pitch events.

## Delivered Outer Request Boundary

`GenerationIntent` is now the immutable, serializable outer boundary. It owns request identity/seed, fixed four measures/4/4, normalized controls, selected musical-profile identity/custom state, selected Step 3 declarative instrument profile, and outer `RegisterIntent`. `Varying` deliberately remains unresolved at this boundary. Step 7 alone will project fixed choices or an eligible Varying candidate into the unchanged resolved `GenerationRequest`; no range/window algorithm is duplicated in Step 4.

Neutral and Jazz are frozen replacement bundles, not mutable configurations: Neutral is Static/Quarter/Straight/Sparse/Arch/Middle and Jazz is Gentle diatonic/Eighth/Occasional offbeats/Conversational/Wandering/Varying. Reselecting replaces all six values. Editing one produces custom values while retaining the selected profile grammar identity; edits outside that set do not falsely change profile state.

The root-created `createGenerationSession` factory is the application coordination boundary for this step. It has no singleton, storage, component, or browser-randomness dependency. It exposes readonly state and explicit actions, permits exactly one generation or notation operation, suppresses configuration edits while either runs, retains a prior valid result after later failures, retries the identical failed intent, and builds regeneration from current controls/profile with fresh injected identity/seed. Its injected pre-engraving notation seam commits a requested mode only after success, retains phrase/mode after failure, and retries the same result/mode without touching generation providers. Theme remains immediate and presentation settings stay separate from generation data. It intentionally does not implement engraving or workspace components.

## Delivered Harmony Candidate Domain

`makeHarmonyCandidateDomain` is the Step 5 pure structural planner boundary. It validates and projects only tonal center, collection, harmonic motion, tension arc, and musical-profile identity; it returns either an immutable `HarmonyCandidateDomain` or the typed `no_legal_harmony_plan` result. The success shape contains exact collection pitch classes and all seven derived root-position diatonic triads, then a complete canonical candidate list. Every candidate has a stable serialized identity, contiguous zero-based index, merged quarter-boundary chord events with preserved per-bar roles, an open endpoint class, and an abstract rhythm-independent tension requirement.

This seam has no seed or random-stream dependency and does not receive rhythm/onsets, register/instrument profile, contour, pitch feasibility, ranking, selection, orchestration, Vue, browser, storage, or session state. It must return an identical domain for Neutral and Jazz under equal harmony controls. Major/Minor select tonal templates while named Ionian/Aeolian remain modal; expansion follows Harmony Planner Policy document order, ascending degree alternatives, and unsplit-before-split variants. Step 7 may bind/rank candidates but cannot mutate their structure, identity, or index.

## Proposed Generator Contract

(proposed) A resolved planner request provides only normalized musical context: meter, tempo, requested measure count, tonal/harmonic context, a selected instrument-profile identity with its explicit active range and one resolved register window, a recent phrase when available, control values, a deterministic random seed, and an explicit generator-profile identifier.

(proposed) A generation result returns a timeline of measures, note events, rests, chord events, and explanations or labels suitable for display. It does not render notation, schedule audio, read MIDI, or mutate application state.

This boundary makes a generated four-measure proposal reproducible from the same input, and lets the UI, playback layer, and later evaluator consume one stable event model.

## Candidate Musical Seams

- **Control mapping:** translates user-facing knobs into a normalized musical policy. A knob does not call a specific generator directly.
- **Harmony planner:** delivered as an ordered immutable structural candidate domain; it does not choose a chord/tension plan or bind rhythm.
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

- The exact event schema is resolved (specs/first_release_plan.md Step 2): a closed `MeasureEvent` union of `NoteEvent`/`RestEvent` carrying an exact Rational duration, a wide plausible-MIDI `ConcertPitch`, tie-continuation intent, and optional free-form annotations; an exactly-tiling `Measure`; and a fixed four-measure `ConcertEventTimeline`. See specs/generator-contract.md's Event Shapes, Duration Model, and Seed Semantics sections for the full shape. The notation representation remains unresolved; it is Step 8's ("Implement written-notation transformation and VexFlow engraving").
- The degree to which a generator may revise an earlier planner's result to repair playability or voice leading is unresolved. See O10.
