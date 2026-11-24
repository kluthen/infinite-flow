---
id: module_accompaniment_arranger
status: DRAFT
dependents: []
priority: 1
parents:
  - [[req_accompaniment_parts]]
  - [[rule_parts_deterministic]]
  - [[rule_parts_rendered_from_phrase_alone]]
type: MODULE
layer: ARCHITECTURE
version: 0.1
human_name: One Pure Arranger Renders a Phrase's Parts
tags: [v4, release-v4.0, session, audio, accompaniment]
---

# One Pure Arranger Renders a Phrase's Parts

## INTENT
Render every accompaniment part of a phrase in one place, from that phrase alone, inside the library, so the parts stay deterministic and reusable outside the app.

## THE RULE / LOGIC
One pure function renders a phrase's accompaniment parts (entity_accompaniment_part) from the phrase's concert timeline, its harmony, the lead's register window, its scale, its seed and the accompaniment settings. It reads nothing else: not the next phrase, not the notes the player plays, not the generator's internals.

Each of the four accompaniment parts (highlighting, contrasting, responding, drums) is computed by a function of its own, in a file of its own, which the arranger calls. The facts about the lead that several parts need (which lead notes are chord tones, which are long, where the lead rests) are recomputed from the timeline and the harmony by one shared helper, not read from the generator. The backing's two voices and the two guides keep their own renderers and rules.

The arranger is library code (module_library_code_boundary): it imports no browser API and no package. Its only random choice is the responding part's fill shape, drawn from a named stream of the phrase's seed kept for it alone, so the lead's own draws are unchanged. A part whose rules place no note comes back empty; rendering never fails or delays a phrase.

## TECHNICAL INTERFACE
The arranger is src/domain/backing/accompaniment-arranger.ts. Each part's function has its own file in src/domain/backing/: thirds-part.ts (highlighting), counter-melody-part.ts (contrasting), fills-part.ts (responding) and drums-part.ts. The shared lead-facts helper is src/domain/backing/lead-facts.ts. The fill shape's stream is a label of the named-stream registry in src/domain/random/streams.ts (module_named_stream_pseudorandomness), whose version steps with it. Being pure, the arranger can be called at queue time on the main thread or in the generation worker.

## EXPECTATION
- The same phrase, seed and accompaniment settings always give the same parts, across a reload too.
- The arranger reads only the phrase's timeline, harmony, window, scale and seed, and the accompaniment settings.
- The arranger, its part functions and the lead-facts helper pass the library boundary check and type-check with no DOM.
- A part whose rules place no note comes back empty, and the phrase plays on.
- The lead's notes and its draws are unchanged by the arranger.
