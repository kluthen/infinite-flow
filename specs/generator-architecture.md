# Generator Architecture

Status: v1.0 — Steps 2-9 are implemented: event/deterministic foundations, declarative profile/register data, typed controls/outer intent/session coordination, an immutable structural harmony candidate-domain seam, the rhythm and phrase-structure planner (Step 6), the pitch planner/validation together with generation orchestration and independent whole-result validation (Step 7), the pure written-notation transformation with one-system VexFlow engraving (Step 8), and the responsive, accessible phrase workspace (Step 9): a root-composed session, Web Worker generation behind a typed protocol, a seed-independent canonical rhythm-domain memo, the unsupported-rhythm-settings block, and production Tailwind 4 styles.

Amended for the v1.0 gate (2026-09-26): D56–D60, D73. The instrument profile carries its concert-to-written transposition and the key is chosen in written pitch (no separate display convention); rhythmic variety is added and the Mixed note density is retired; musical-profile behavior is gated by named capabilities. The master spec (draft v2.0) is authoritative; where this document describes delivered Step 2-9 code, it describes the pre-gate implementation unless a sentence says otherwise.

## Architectural Intent

The musical generator must be highly decoupled so that a new harmonic language, rhythm strategy, phrase model, backing generator, or adaptation method can be introduced without rewriting unrelated musical logic or the user interface.

The four-measure generator is the first consumer of these seams. The later MIDI-seeded, rolling generator must reuse the same seams rather than becoming a separate engine.

## Generator Profiles

The default profile is style-neutral. It must not import jazz-specific assumptions into the shared generator contracts. Its initial grammar uses a selected major, minor, or modal scale; mostly diatonic chord movement; chord tones and scale passing tones; and tension from non-chord scale tones, rhythm, contour, and silence. It excludes substitutions, altered dominants, and chromatic enclosures.

An optional jazz-oriented profile is included early to validate that a different harmonic and melodic vocabulary can be selected without coupling generators to a single style.

Its initial extension permits chromatic approaches and enclosures around target tones. It does not yet permit altered dominants or harmonic substitutions. The jazz profile declares this through a named capability, _chromatic approach and enclosure figures allowed_; planners and validators check declared capabilities, never a profile's name, so a later profile (or character preset) can combine capabilities without new name checks.

(proposed) A profile supplies theory vocabulary and planner policies: allowed scales and chord qualities, harmonic motion, tension devices, rhythm tendencies, contour preferences, and voicing or backing conventions. It does not own UI controls, browser APIs, audio scheduling, or persistent session state.

For the first deliverable, the implemented control-mapping boundary validates closed catalogs before planner consumption: 60-240 BPM in ten-BPM increments, twelve pitch classes (selected in the instrument profile's written pitch and converted to concert pitch at intent construction), Major/Minor and seven named modes, and the documented musical controls. Its literal first-load state is 90 BPM, C Ionian, Neutral, Lift, Shaped, B-flat tenor, and Predictable. Direct chord-progression selection is deferred.

The same seam maps contour, register, leapiness, and arpeggio chaos controls into pitch-planner policy. The pitch planner must use these values as constraints or weighted preferences, not as UI concepts. Arpeggio chaos controls the ordering and interval contrast of eligible chord tones; it does not override profile pitch vocabulary or resolution rules.

The first request contract fixes meter at 4/4 and carries a user-selected, stable BPM. A rhythm policy supplies the dominant subdivision (quarters, eighths, or sixteenths), a rhythmic-variety level (Strict, Slightly varied, or Heavily varied) setting how often shorter and longer values appear, syncopation (straight through active displacement), and rest behavior (sparse through breath-heavy); meter changes, deliberate tempo changes, and pulse-feel controls remain later extensions.

Notation consumes the stable generated event model. Standard staff rendering is required for the first deliverable and becomes a rolling-window renderer later; it must not cause generator behavior or alter the underlying concert-pitch event data. A selected declarative instrument profile supplies an inclusive active concert range and a whole-phrase register window: C MIDI keyboard `48-72`, B-flat tenor saxophone `46-70`, or E-flat alto saxophone `51-75`, with the adopted contained overlapping Low, Middle, and High windows. `Varying` deterministically resolves one feasible window before planning and never changes it mid-phrase. The same instrument profile supplies its concert-to-written transposition as open data (integer chromatic semitones and diatonic letter steps): C MIDI keyboard `+0/+0`, B-flat tenor `+14 semitones/+8 diatonic steps`, and E-flat alto `+9/+5`. There is no separate display convention. Transposition is used in exactly two places: intent construction converts the player's written tonal center to concert pitch, and notation writes the concert timeline in treble G2 clef in the instrument's written pitch. No planner reads it, and notation never regenerates material, changes the selected profile/range/window, or mutates concert-pitch events. Adding an instrument profile is one declarative entry, with no new type, enumeration member, or UI branch.

## Delivered Outer Request Boundary

`GenerationIntent` is now the immutable, serializable outer boundary. It owns request identity/seed, fixed four measures/4/4, normalized controls, selected musical-profile identity/custom state, selected Step 3 declarative instrument profile, and outer `RegisterIntent`. `Varying` deliberately remains unresolved at this boundary. Step 7 alone will project fixed choices or an eligible Varying candidate into the unchanged resolved `GenerationRequest`; no range/window algorithm is duplicated in Step 4.

Neutral and Jazz are frozen replacement bundles, not mutable configurations: Neutral is Static/Quarter/Slightly varied/Straight/Sparse/Arch/Middle and Jazz is Gentle diatonic/Eighth/Slightly varied/Occasional offbeats/Conversational/Wandering/Varying (rhythmic variety joins the bundle at the v1.0 gate). Reselecting replaces all seven values. Editing one produces custom values while retaining the selected profile grammar identity; edits outside that set do not falsely change profile state.

The root-created `createGenerationSession` factory is the application coordination boundary for this step. It has no singleton, storage, component, or browser-randomness dependency. It exposes readonly state and explicit actions, permits exactly one generation or notation operation, suppresses configuration edits while either runs, retains a prior valid result after later failures, and builds both regeneration and generation retry from current controls/profile with fresh injected identity/seed (retry does not replay the failed intent; user decision, 2026-09-25). Its injected pre-engraving notation seam engraves a result, retains the phrase after failure, and retries the same result without touching generation providers. (Before the v1.0 gate it also committed a separately selected display mode; that selection is removed.) Theme remains immediate and presentation settings stay separate from generation data. Step 9 (below) is what actually wires this factory into one root-composed session, a Worker-backed generation seam, and the mounted workspace component tree.

## Delivered Phrase Workspace (Step 9)

The Step 9 workspace is the one production consumer of `createGenerationSession`. `App.vue` builds a single root `WorkspaceSession` for the browser tab's lifetime through `createWorkspaceSession`, which supplies the session's injected seams: a cryptographic per-generation seed provider, a monotonic request-id provider, a `generate` seam backed by one long-lived generation Web Worker behind a typed correlated protocol, a `notate` seam driven by a dedicated notation coordinator around one mounted `PhraseScore` instance, and the profile-switch policy adapter. The component tree (`WorkspaceShell`, `WorkspaceHeader`, `ScorePanel`, `ControlPanel` and its four control groups, `OrientationNotice`) is props-in/events-out around that one session, production styling is Tailwind 4 (`src/styles/theme.css`/`components.css`), and a seed-independent canonical rhythm-domain memo lets the worker reuse an already-materialized rhythm domain across repeated generations against the same rhythm setting. A domain-owned constant blocks Generate/Regenerate for the six rhythm settings that have no legal four-bar plan under any tension arc, without ever locking the controls themselves. See [docs/phrase-workspace.md](../docs/phrase-workspace.md) for the full component tree, session wiring, state map, Worker protocol, rhythm-domain memo, unsupported-rhythm-settings block, and accessibility behavior, and [docs/generation-latency.md](../docs/generation-latency.md) for the measured cold/warm latency and the proposed budget.

## Delivered Harmony Candidate Domain

`makeHarmonyCandidateDomain` is the Step 5 pure structural planner boundary. It validates and projects only tonal center, collection, harmonic motion, tension arc, and musical-profile identity; it returns either an immutable `HarmonyCandidateDomain` or the typed `no_legal_harmony_plan` result. The success shape contains exact collection pitch classes and all seven derived root-position diatonic triads, then a complete canonical candidate list. Every candidate has a stable serialized identity, contiguous zero-based index, merged quarter-boundary chord events with preserved per-bar roles, an open endpoint class, and an abstract rhythm-independent tension requirement.

This seam has no seed or random-stream dependency and does not receive rhythm/onsets, register/instrument profile, contour, pitch feasibility, ranking, selection, orchestration, Vue, browser, storage, or session state. It must return an identical domain for Neutral and Jazz under equal harmony controls. Major/Minor select tonal templates while named Ionian/Aeolian remain modal; expansion follows Harmony Planner Policy document order, ascending degree alternatives, and unsplit-before-split variants. Step 7 may bind/rank candidates but cannot mutate their structure, identity, or index.

## Delivered Notation Boundary

Notation is a pure consumer of a successful generation outcome. `notationInputFromOutcome` reads only the result's concert timeline, the intent's tonal context (tonal center and collection), and the selected harmony candidate recorded in `GenerationOutcome.provenance.harmony`; it never reaches into planner internals and never changes `GenerationRequest` or `GenerationResult`. `transformToWrittenPhrase(input, mode)` then produces a deep-frozen `WrittenPhrase` for Concert, B-flat tenor, or E-flat alto display. At the v1.0 gate the closed `mode` gives way to the selected instrument profile's open transposition data, and the written key is the player's selection. It spells the key, notes, chord roots, and slash bass with one consistent enharmonic rule (fewest accidentals, sharps on a tie). It also segments durations into notated values with ties and beam groups, and derives displayed accidentals per measure. Transforming never regenerates anything or mutates the source events.

Engraving is a separate browser adapter. It is the only code allowed to import the pinned VexFlow library, and it lays out all four equal-width measures in one staff system at a single uniform scale. Only on the landscape phone layout (below `64rem`), when one system does not fit its container at a named legibility floor, it uses two aligned systems of two measures each. When no permitted arrangement fits at the floor, it returns a typed notation error instead of scrolling, clipping, splitting further, or shrinking without bound. A spoken-English score description accompanies each successful engraving. docs/notation-engraving.md records the pinned library boundary, the bundled font assets and their licenses, the domain-to-engraving mapping, the sizing and failure policy, the accessible representation, and the upgrade procedure.

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

MIDI integration is not part of v1 and sits outside the evaluator. When v2 adds it, it acknowledges only a played note that matches the expected note, with no mismatch hint (D52, D66 in `archive/2026-09-25-decisions-D47-D71.md`). MIDI input is read as concert pitch (D72). It never computes a score or alters generator state. The v2 design is in `versions/v2/master-spec.md` (§8–§9).

## Evolution Rules

- A new musical style is a selectable profile or a new implementation behind a stable planner contract, not conditionals scattered across UI and playback code.
- The current profile's theory vocabulary is data or policy where practical; it is not encoded into generic scheduling or notation code.
- Randomness is injected through the request seed. The same request must regenerate the same four measures, allowing a phrase to be inspected and tested.
- A user-triggered regeneration keeps the control policy but creates a new seed. The generated result retains that seed for exact reproduction.
- Generator stages may attach musical annotations such as tension role, chord degree, or source transformation. Consumers may use these annotations, but must not infer hidden generator state.
- The application orchestration layer chooses and connects planner implementations. Individual planners do not select, instantiate, or import one another.

## Deferred Architecture Questions

- The exact event schema is resolved (specs/first_release_plan.md Step 2): a closed `MeasureEvent` union of `NoteEvent`/`RestEvent` carrying an exact Rational duration, a wide plausible-MIDI `ConcertPitch`, tie-continuation intent, and optional free-form annotations; an exactly-tiling `Measure`; and a fixed four-measure `ConcertEventTimeline`. See specs/generator-contract.md's Event Shapes, Duration Model, and Seed Semantics sections for the full shape. The notation representation is resolved by Step 8: see Delivered Notation Boundary above and docs/notation-engraving.md.
- The degree to which a generator may revise an earlier planner's result to repair playability or voice leading is unresolved. See O10.
