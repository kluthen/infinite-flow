# Infinite Flow

Infinite Flow is a client-side web practice partner for a monophonic musician. Its first release generates a coherent four-measure phrase in standard notation from musical controls, then lets the player regenerate a new variation without losing the selected musical context.

The project is currently specification-first: the musical rules, generator boundaries, theory research, and ATD traceability anchors are in place; application code has not started.

## First Release

- Generate exactly four 4/4 measures at a user-selected, stable BPM.
- Render a chord-aware standard staff proposal from one concert-pitch event timeline.
- Offer a neutral diatonic profile and a narrowly extended jazz profile with chromatic approaches and enclosures.
- Control tonal context, harmonic motion, tension, note density, syncopation, silence, contour, register, leapiness, and arpeggio chaos.
- Support deterministic re-generation: the same request and seed always reproduce the same phrase.
- Support declarative C MIDI keyboard `48-72`, B-flat tenor saxophone `46-70`, and E-flat alto saxophone `51-75` concert-pitch profiles, each with a whole-phrase register-window policy.
- Redraw the same phrase in Concert, B-flat, or E-flat notation without changing generated concert pitches.

Generated lead playback, MIDI integration, persistent sessions, microphone capture, automatic key detection, and the rolling MIDI-seeded continuation flow are intentionally deferred. Minimal MIDI connection and non-evaluative match/mismatch feedback are the immediate next roadmap item; Infinite Flow never assigns a performance score.

## Documentation

- [First-release master specification](specs/first-release-master-spec.md) is the implementation handoff and definition of done.
- [Roadmap](specs/roadmap.md) orders the settled delivery stages and visible gaps.
- [Generator contract](specs/generator-contract.md) defines the implementation-neutral request/result boundary.
- [Generator architecture](specs/generator-architecture.md) records the decoupling rules for future generator evolution.
- [Specification index](specs/README.md) links the current drafts, decisions, and remaining open questions.

## Design Principles

- Keep musical planners decoupled: control mapping, harmony, rhythm, pitch, notation, MIDI, optional backing, and future evaluation communicate through explicit data rather than internal state.
- Store generated material in concert pitch. Instrument transposition is display-only.
- Treat a four-bar result as a phrase with tension, release, continuity, breath, and contour; never as four unrelated random bars.
- Keep style vocabulary behind profiles. The neutral profile stays diatonic, while the initial jazz profile only adds bounded chromatic ornaments.
- Make generation deterministic and testable through explicit seeds.

## Status

The first-release specification is ready for implementation planning. The project includes DRAFT ATD BUSINESS anchors derived from the master specification; no application code or automated tests exist yet.
