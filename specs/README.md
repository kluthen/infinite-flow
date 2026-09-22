# Infinite Flow Specification Index

Status: draft v0.1

## Status Snapshot

- Infinite Flow is a client-side web practice partner for a monophonic player.
- It proposes chords and arpeggio-like melodic material that create tension and release near a user-selected tempo.
- The first controls cover harmony, rhythm and space, pitch behavior, and generator profile; intentional tempo variation is deferred.
- The product never assigns a performance score; initial MIDI feedback only indicates a match or mismatch.
- The first deliverable generates one coherent four-measure proposal from user controls; it does not yet listen or continuously extend the phrase.
- First-release output is the four-measure note proposal; generated-lead playback is not required, while BPM-aligned backing is an optional enhancement.
- MIDI is initially used only as a minimal integration check: matching proposal notes may highlight, while non-matches receive a gentle mismatch hint without showing the played pitch.
- The proposal uses standard staff notation, which becomes a rolling display in the MIDI-seeded continuation stage.
- The second deliverable captures one or two player measures, seeds the generator, and periodically appends new measures to a rolling staff.
- Capturing and exporting a session, adapting to extended playing history, and adapting backing tone are later objectives, not initial-release commitments.

## Documents

- [Product foundation](product-foundation.md): current product intent, boundaries, and delivery stages.
- [Generator architecture](generator-architecture.md): decoupling rules and candidate seams for evolving musical generators.
- [Generator contract](generator-contract.md): implementation-neutral request, result, and event-boundary draft.
- [Music reference](music/README.md): theory-backed, player-readable generator rules and profile vocabulary.
- [First-release master spec](first-release-master-spec.md): consolidated implementation handoff for the finite four-measure generator.
- [Open questions](open-questions.md): unresolved decisions that must not be assumed during planning.
- [Decisions](decisions.md): append-only record of settled decisions.
