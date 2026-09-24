# Generator Contract

Status: v0.9 — Steps 2-9 are implemented: immutable event/request foundations, declarative instrument/register policy, typed controls/outer intent/session coordination, the seed-free structural harmony candidate domain, the rhythm planner (Step 6), resolved request construction with pitch orchestration (Step 7), the written-notation transformation with VexFlow engraving (Step 8), and the responsive, accessible phrase workspace (Step 9): a root-composed session, Web Worker generation behind a typed protocol, a seed-independent canonical rhythm-domain memo, the unsupported-rhythm-settings block, and production Tailwind 4 styles.

## Purpose

This document defines the stable boundary around musical generation. It lets the four-measure generator, later MIDI-seeded continuation, notation renderer, optional backing arranger, and feedback evaluator evolve independently.

## Generation Requests

The implemented resolved core request (`GenerationRequest`) is immutable, serializable, and deliberately narrow. It carries only:

- a validated, non-empty request identity (`RequestId`)
- a deterministic random seed (`Seed`; see Seed Semantics below)
- requested measure count, fixed at four for the first release
- meter, fixed at 4/4 for the first release

Construction and parsing reject any other field outright, including control policy, theme, and notation display convention — those are not optional extensions of this type, they are structurally excluded from it. A hand-written boundary parser (`parseGenerationRequest`) enforces the same closure on untrusted input: an unrecognized field is rejected as a typed failure rather than ignored, so presentation or session state cannot silently enter a request.

The implemented player-facing outer request (`GenerationIntent`) is immutable and serializable. It carries the core's request identity, seed, four measures, and 4/4 meter plus normalized controls, the selected musical-profile grammar identity/custom marker, the selected validated Step 3 instrument profile, and an outer register intent. The intent retains `Varying` and its Step 3 candidates; it does not resolve a window.

First load is 90 BPM, C Ionian, Neutral, Lift, Shaped, B-flat tenor, and Predictable. Tempo accepts only integer values from 60 through 240 in 10-BPM increments. Neutral replaces all six profile-controlled values with Static/Quarter/Straight/Sparse/Arch/Middle; Jazz replaces them with Gentle diatonic/Eighth/Occasional offbeats/Conversational/Wandering/Varying. A manual edit to one of those six marks the current configuration custom while retaining the selected grammar identity; it never mutates either frozen bundle. A non-profile control edit does not change that selection state.

Explicit generation takes a caller-supplied request identity and seed. Regeneration retains the full controls and profile state while injected providers supply a fresh identity and seed. Domain code does not create browser randomness or a second PRNG. `GenerationIntent` structurally excludes theme, notation mode, browser state, audio state, widget objects, and session objects. It is not a resolved `GenerationRequest`: Step 7 owns fixed-window projection and Varying feasibility.

## Session Ownership

`createGenerationSession` is a root-composition factory, not a singleton and not a component dependency. It exposes readonly in-memory state and explicit actions around pending controls/profile state, latest intent, latest result placeholder, generation/notating operation state, and separate retryable generation and notation errors. Ordinary control/profile/theme/notation edits never generate. One generation or notation operation is allowed at a time; configuration changes are suppressed while either runs, while theme remains immediate. A failed initial generation retains an empty result, while a later failure retains the preceding successful result. Retry generation repeats the exact failed intent; regenerate builds an intent from the current controls/profile and requests a fresh seed and identity. The injected notation seam commits a changed display mode only after it succeeds; a failed attempt retains the phrase and previous mode and can retry the same result/mode without consuming generation providers. Theme and notation are presentation state only and are intentionally separate from every generation intent.

Step 9 is the one production wiring of this factory: `App.vue` constructs one root `WorkspaceSession` per browser tab via `createWorkspaceSession`, injecting a cryptographic seed provider, a monotonic request-id provider, a Web Worker-backed `generate` seam behind a typed correlated protocol, a notation-coordinator-backed `notate` seam around one mounted `PhraseScore`, and the profile-switch policy adapter, then disposes the worker on unmount. See [docs/phrase-workspace.md](../docs/phrase-workspace.md) for the full session wiring, state map, Worker protocol, canonical rhythm-domain memo, unsupported-rhythm-settings block, and accessibility behavior, and [docs/generation-latency.md](../docs/generation-latency.md) for measured latency and the proposed budget.

## Generation Result

The implemented core result (`GenerationResult`) is an immutable envelope around a concert-pitch timeline. It carries only:

- the request identity and seed that produced it
- the generated `ConcertEventTimeline`: exactly four ordered measures (see Event Shapes below)

Musical annotations are not yet attached to the core concert timeline. Step 5 now separately returns a structural harmony candidate domain; Step 7 will choose one candidate, bind it to rhythm, and attach the resulting facts to generated events. The event shape already reserves an optional, free-form annotations slot on each note and rest event so that later work can attach these without a schema change.

The result does not contain rendered staff symbols, written pitches, MIDI device messages, audio scheduling timestamps, or scoring state. Notation derives written pitch, spelling, and chord symbols from the result, the intent's tonal context, the selected harmony provenance, and the active display convention, without changing any of them (see docs/notation-engraving.md). Every returned result fills its requested meter exactly: measure-tiling and timeline-structure validation reject any candidate that does not, and hard range constraints are enforced once instrument-profile ranges exist (Step 3). Generation always fails explicitly — as one of the typed failures below — rather than returning an invalid or partial phrase.

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
- `HarmonyPlannerInputError` — a purported normalized harmony projection has an unsupported tonal center, collection, harmonic-motion, tension-arc, or musical-profile value. It does not select a default or fallback collection/motion.
- `no_legal_harmony_plan` — a typed planner result, not a downstream pitch/rhythm infeasibility. It is returned only when a valid structural expansion has no legal candidates; the current finite policy has at least one candidate for every normalized control combination.

Parsers at each level (event → measure → timeline) wrap a failure from the level below into their own typed error with positional context (e.g. which event in which measure) rather than letting a lower-level error escape unannotated; nothing is ever partially constructed while an error propagates.

## Stage Ownership

- The delivered harmony planner consumes only normalized tonal center, collection, harmonic motion, tension arc, and profile identity. It returns an immutable, serializable `HarmonyCandidateDomain` with the exact selected collection, seven root-position diatonic triads, and every canonically ordered candidate. A candidate has a zero-based index, stable structural identity, serialized quarter-boundary harmony events (with merged adjacent equal triads and retained per-bar roles), endpoint class, and abstract tension requirement. It accepts neither a seed/random source nor rhythm/onsets, register/instrument data, contour/pitch feasibility, ranking, selection, orchestration, or presentation/session data.
- Major and Minor use the tonal template family; separately selected Ionian and Aeolian use modal templates. Neutral and Jazz expose byte-equivalent structural domains for the same harmony controls. Template/document order, ascending degree alternatives, and unsplit-before-split expansion establish identities and indices; a later stage may rank but never renumber them.
- The harmony planner owns chord events and phrase-level harmonic roles.
- The rhythm planner owns event start positions, durations, ties, and rests.
- The pitch planner owns concert pitches for note events under supplied harmonic and range constraints.
- The optional backing arranger reads the result and creates separate accompaniment events. It cannot alter lead events.
- The notation renderer reads the result and applies the independently selected Concert, B-flat tenor, or E-flat alto display convention without changing source events, the selected profile, its active range, or its resolved window.
- The MIDI layer emits incoming events; the initial display layer may compare them with visible proposal events, but evaluation and adaptation are later consumers.

## Determinism

The same request must produce the same result. The Re-generate action retains policy values and creates a new seed. This behavior is required for meaningful tests, debugging, player phrase retention, and later comparisons between generator profiles.
