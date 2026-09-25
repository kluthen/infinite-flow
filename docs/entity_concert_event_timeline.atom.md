---
id: entity_concert_event_timeline
status: DRAFT
version: 0.1
priority: 1
dependents:
  - [[entity_pitch_candidate_domain]]
  - [[module_generation_request_envelope]]
  - [[module_generation_worker_protocol]]
  - [[module_phrase_timeline_assembly]]
  - [[module_ranked_candidate_ordering]]
  - [[service_generation_orchestration]]
  - [[service_generation_request_resolution]]
  - [[service_generation_result_validation]]
tags: event-schema,partial-impl-step5
parents:
  - [[entity_exact_musical_time]]
  - [[entity_instrument_profile]]
  - [[req_four_measure_phrase]]
  - [[rule_complete_four_four_measures]]
type: ENTITY
layer: ARCHITECTURE
human_name: Concert Event Timeline
---

# Concert Event Timeline

## INTENT
Represent a completed phrase generation as one closed, immutable concert-pitch timeline so downstream consumers can rely on a fixed, exhaustively validated event shape rather than an ad hoc structure.

## THE RULE / LOGIC
A generation result is an immutable concert-pitch timeline of ordered measures. Each measure carries its harmonic role and either a chord event or a sustained-harmony marker, and contains an ordered closed discriminated union of note and rest events that tile the measure exactly using the exact musical time model, with no gap and no overlap. A note event carries a concert MIDI pitch as an integer wide enough to hold all three first-release instrument profiles (C keyboard 48-72, B-flat tenor 46-70, E-flat alto 51-75) without a schema change when later profiles or instruments are added, plus a tie-continuation intent flag. Events may carry optional musical and validation annotations. The schema is closed: every timeline, measure, and event is produced only through immutable constructors and hand-written boundary parsers, and any invalid boundary input (malformed event, non-tiling measure, out-of-range or non-integer pitch) is rejected loudly as a typed failure rather than defaulted, coerced, or silently dropped. Written notation, transposition, audio scheduling, and browser or session state are structurally excluded from this model.

## TECHNICAL INTERFACE
Orchestration returns an immutable timeline built through this schema's constructors as its successful generation result; any construction attempt that fails boundary validation returns a typed failure and produces no timeline. Downstream consumers (notation display, session state) read the timeline but cannot construct or mutate it outside the closed constructors and parsers.

Implementation status note: the current `Measure` implementation carries only `measureIndex` and `events`; it does not yet carry the harmonic role or the chord-event/sustained-harmony-marker fields described above. Those fields are target architecture, not yet built. A later planned step in the first-release plan establishes the harmonic and chord vocabulary and assigns each measure its harmonic role; that step is what will add these fields to the implementation. Their current absence is intentional phasing agreed for this stage of the plan, not drift between this atom and the code.

## EXPECTATION
Every accepted generation result is one immutable timeline of ordered measures whose note/rest events exactly tile each measure with no gap or overlap. Every note event carries a concert MIDI pitch representable for all three first-release profiles and a tie-continuation flag. Invalid boundary input never produces a partial or defaulted timeline; it produces an explicit typed failure. No consumer can mutate a returned timeline.
