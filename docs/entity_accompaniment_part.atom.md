---
id: entity_accompaniment_part
status: DRAFT
layer: ARCHITECTURE
version: 0.2
priority: 1
tags: [v4, release-v4.0, session, audio, accompaniment]
human_name: A Phrase's Accompaniment as a List of Parts
parents:
  - [[req_accompaniment_parts]]
  - [[req_guide_playback]]
  - [[req_session_backing_track]]
dependents: []
type: ENTITY
---

# A Phrase's Accompaniment as a List of Parts

## INTENT
Give the backing, the guides and the accompaniment parts one shape, so the transport, the mix and the exports handle one kind of thing while the lead's timeline stays as it is.

## THE RULE / LOGIC
A phrase's accompaniment is a list of parts kept beside the phrase's concert timeline, which stays the single monophonic lead line and is not changed. Each part carries its voice, its accompaniment role, the mix channel it plays in, and its notes. Each note carries its start and its length, as whole-note fractions counted from the phrase's start; what it sounds, either a concert pitch or a drum sound (kick, snare or closed hi-hat); and a velocity. The backing's two voices, the bass and the chords, and the two guides, the melody guide and the rhythm guide, take this same shape beside the four accompaniment parts (highlighting, contrasting, responding, drums). A part with no notes is a valid part.

## TECHNICAL INTERFACE
The part and note types, and the conversion of rendered backing and guide notes into parts, are library code in src/domain/backing/accompaniment-part.ts, beside the backing and guide renderers, with no browser API and no package. renderBacking and renderGuide keep their output types and their rules: accompaniment-part.ts converts the notes they give into parts of this shape, and the arranger (module_accompaniment_arranger) returns those backing and guide parts beside the four accompaniment parts. The transport and the generated-notes export do not read these parts yet: they still take the backing's and the guides' notes from the renderers' own output.

## EXPECTATION
- The phrase's concert timeline is unchanged: the parts sit beside it, never inside it.
- Every part carries a voice, a role, a mix channel and its notes; every note a start and a length in whole-note fractions from the phrase's start, a concert pitch or one of the three drum sounds, and a velocity.
- The renderers' own output is unchanged, and the backing's and the guides' parts carry exactly the notes the renderers give, on every corpus phrase.
- A part with no notes is valid.
