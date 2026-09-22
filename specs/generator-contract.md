# Generator Contract

Status: v0.2 — request/result envelope, closed event schema, exact duration model, and seeded determinism implemented (first_release_plan.md Step 2: "Define the immutable musical contract and deterministic foundations"); instrument profile/register (Step 3), control policy (Step 4), harmony (Step 5), rhythm (Step 6), and pitch planning (Step 7) remain planned and are described below as intent, not delivered behavior.

## Purpose

This document defines the stable boundary around musical generation. It lets the four-measure generator, later MIDI-seeded continuation, notation renderer, optional backing arranger, and feedback evaluator evolve independently.

## Generation Request

The implemented core request (`GenerationRequest`) is immutable, serializable, and deliberately narrow. It carries only:

- a validated, non-empty request identity (`RequestId`)
- a deterministic random seed (`Seed`; see Seed Semantics below)
- requested measure count, fixed at four for the first release
- meter, fixed at 4/4 for the first release

Construction and parsing reject any other field outright, including instrument profile, control policy, theme, and notation display convention — those are not optional extensions of this type, they are structurally excluded from it. A hand-written boundary parser (`parseGenerationRequest`) enforces the same closure on untrusted input: an unrecognized field is rejected as a typed failure rather than ignored, so presentation or session state cannot silently enter a request.

The full player-facing request that later steps build on top of this core is still intent, not delivered behavior. It is expected to add:

- generator profile identifier
- concert-pitch tonal center and selected scale or mode
- a selected validated declarative instrument profile with its inclusive active concert range and resolved whole-phrase register window: C MIDI keyboard `48-72` (Low `48-60`, Middle `54-66`, High `60-72`), B-flat tenor saxophone `46-70` (Low `46-58`, Middle `52-64`, High `58-70`), or E-flat alto saxophone `51-75` (Low `51-63`, Middle `57-69`, High `63-75`), independent of notation display convention
- tempo, carried as one user-selected BPM
- normalized control policy for harmonic motion, tension, subdivision, syncopation, silence density, contour, register, leapiness, and arpeggio chaos
- optional recent phrase context; absent for the first deliverable and present only when later MIDI continuation needs it

The player-selected tonal center and scale or mode are expected to remain authoritative when a later MIDI seed phrase is supplied. Whatever form the full request takes, it must not contain notation transposition, browser state, audio nodes, UI widget values, or mutable session state — the implemented core already enforces this for the fields it owns.

## Generation Result

The implemented core result (`GenerationResult`) is an immutable envelope around a concert-pitch timeline. It carries only:

- the request identity and seed that produced it
- the generated `ConcertEventTimeline`: exactly four ordered measures (see Event Shapes below)

Musical annotations (chord degree, tension role, phrase function), validation annotations explaining applied rules, and each measure's harmonic role or chord/sustained-harmony event are not produced by anything implemented so far — they belong to the harmony planner (Step 5) and are described here as intent for that later step, not current output. The event shape already reserves an optional, free-form annotations slot on each note and rest event so that later work can attach these without a schema change.

The result does not contain rendered staff symbols, written pitches, MIDI device messages, audio scheduling timestamps, or scoring state. Notation is expected to derive written pitch from the result and the active transposition choice once it exists. Every returned result fills its requested meter exactly: measure-tiling and timeline-structure validation reject any candidate that does not, and hard range constraints are enforced once instrument-profile ranges exist (Step 3). Generation always fails explicitly — as one of the typed failures below — rather than returning an invalid or partial phrase.

## Event Shapes

A `ConcertEventTimeline` is exactly four ordered measures (`measureIndex` 0-3, in order). Each `Measure` is an ordered list of events whose exact durations sum to precisely one whole note — no gap, no overlap — checked by summing the ordered event list rather than tracking a redundant per-event start position.

Each event is one member of the closed discriminated union `MeasureEvent`:

- **`NoteEvent`** (`kind: 'note'`): a `duration` (Rational, whole-note units), a validated `pitch` (`ConcertPitch`), a `tieContinuation` flag (true when this attack is a tied continuation of the previous note's pitch rather than a new attack), and an optional `annotations` object.
- **`RestEvent`** (`kind: 'rest'`): a `duration` and an optional `annotations` object. No pitch.

`ConcertPitch` validates a plausible integer MIDI value in `[0, 127]`. It deliberately does not narrow to any one first-release instrument profile's active range (C keyboard `48-72`, B-flat tenor `46-70`, E-flat alto `51-75`); per-profile range validation is Step 3's job, layered on top of this wider schema rather than replacing it.

`annotations`, where present, is `{ musical?: string; validation?: string }` — free-form strings. The controlled vocabularies for chord degree, tension role, phrase function, and profile-range source rule belong to later steps' harmony and profile work and are intentionally not invented here; the slot exists so those steps can attach annotations without a later shape change.

Every event, measure, and timeline is immutable (deep-frozen at construction) and can only be produced through its constructor or its matching hand-written boundary parser — there is no schema library; every field is checked by hand.

## Duration Model

Every duration and position in a generated phrase is an exact `Rational`: a normalized integer numerator over a positive integer denominator, reduced to lowest terms by their greatest common divisor, expressed in whole-note units. There is no floating-point value anywhere in the core time model, so summing sixteenth notes (or any other exact subdivision) never drifts. A sixteenth note is `1/16`; one 4/4 bar is `1`; the four-measure phrase totals exactly `4`.

A derived integer sixteenth-note tick view is computed from the Rational for consumers that want the documented tick grid: 16 ticks per bar (`[0,16)`), 64 ticks per phrase (`[0,64)`), 4 ticks per quarter note, bar starts at ticks 0/16/32/48. This view is always derived, never tracked independently, so it can never disagree with the exact value it came from.

First-release policy restricts every duration and position to land on that integer sixteenth-note grid — no tuplets, nothing finer than a sixteenth. That restriction lives in a separate grid validator, not in the `Rational` type itself: `Rational` can still represent a tuplet or a sub-sixteenth value, and the validator is what refuses it for this release. A later release can lift the restriction by relaxing the validator alone, without changing the duration representation or any code that already consumes `Rational` values.

## Seed Semantics

A generation seed (`Seed`) is a branded 32-bit unsigned integer identity, constructed only through validated construction or parsing. It has a stable, documented, versioned string encoding: `seed1-` followed by exactly 8 lowercase hex digits (the unsigned value, zero-padded). The version prefix (`seed1`) lets a future encoding change be distinguished from this one rather than silently misparsed.

Randomness is generated by a small, documented, deterministic 32-bit pseudorandom generator: Mulberry32 (public domain, Tommy Ettinger), with a fixed state increment (`0x6D2B79F5`) and fixed mix constants. Every intermediate value is forced to unsigned 32-bit interpretation, which is the usual source of cross-runtime drift for bitwise PRNGs.

Each stage of generation draws from its own **named stream**, derived by mixing the seed with a stream label from a closed, versioned registry (`STREAM_REGISTRY_VERSION`): `harmony`, `rhythm`, `pitch`, `register-resolution`, `tie-breaking`. The label is folded into the seed with an FNV-1a hash over a versioned string (`named-stream-registry-v<version>:<label>`) before seeding an independent Mulberry32 instance. Each derivation owns its own private closure state, so drawing any number of values from one named stream never changes the sequence any other named stream produces — stream isolation is structural, not a convention consumers must respect.

The same request and seed always reproduce the same result. Re-generate retains the control policy and produces a new seed; the result retains whichever seed produced it, for exact reproduction and later comparison.

## Validation Failures

Every boundary crosses through a hand-written parser or constructor that rejects invalid input loudly, as a typed error, rather than defaulting, coercing, silently dropping a field, or returning a partial value. The typed failures currently defined are:

- `RationalConstructionError` — malformed or unsafe rational numerator/denominator.
- `NonIntegerTickError` — a Rational has no exact integer sixteenth-tick representation (a mathematical fact about the value).
- `GridAlignmentViolation` — a duration/position fails first-release sixteenth-grid policy (tuplet or sub-sixteenth value); distinct from `NonIntegerTickError`, which is about the value itself, not policy.
- `SeedConstructionError` — a seed value is not an integer in the 32-bit unsigned range.
- `SeedParseError` — an encoded seed string does not match the documented `seed1-<8 hex>` pattern.
- `ConcertPitchError` — a pitch is not an integer in `[0, 127]`, or a boundary value is not a number at all.
- `MeasureEventConstructionError` — a note/rest event constructor received a non-positive duration.
- `MeasureEventParseError` — untrusted event input is malformed: wrong shape, unrecognized `kind`, missing/malformed required field, unexpected extra field, or a duration that fails grid policy.
- `MeasureTilingViolation` — a measure's events do not sum to exactly one whole note (gap or overlap), or its index is outside `0-3`.
- `MeasureParseError` — untrusted measure input is malformed, or wraps a `MeasureTilingViolation` from the fields it did parse.
- `TimelineStructureViolation` — a timeline does not contain exactly four measures, or they are not ordered `0, 1, 2, 3`.
- `TimelineParseError` — untrusted timeline input is malformed, or wraps a `TimelineStructureViolation`.
- `GenerationRequestError` — the request/result envelope boundary: invalid request identity, non-4/4 meter, measure count other than four, or an unrecognized field on untrusted input (including presentation/session fields such as `theme` or `notationDisplay`).

Parsers at each level (event → measure → timeline) wrap a failure from the level below into their own typed error with positional context (e.g. which event in which measure) rather than letting a lower-level error escape unannotated; nothing is ever partially constructed while an error propagates.

## Stage Ownership

- The harmony planner owns chord events and phrase-level harmonic roles.
- The rhythm planner owns event start positions, durations, ties, and rests.
- The pitch planner owns concert pitches for note events under supplied harmonic and range constraints.
- The optional backing arranger reads the result and creates separate accompaniment events. It cannot alter lead events.
- The notation renderer reads the result and applies the independently selected Concert, B-flat tenor, or E-flat alto display convention without changing source events, the selected profile, its active range, or its resolved window.
- The MIDI layer emits incoming events; the initial display layer may compare them with visible proposal events, but evaluation and adaptation are later consumers.

## Determinism

The same request must produce the same result. The Re-generate action retains policy values and creates a new seed. This behavior is required for meaningful tests, debugging, player phrase retention, and later comparisons between generator profiles.
