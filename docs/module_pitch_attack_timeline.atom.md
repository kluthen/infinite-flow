---
id: module_pitch_attack_timeline
status: REVIEW
human_name: Pitch Attack Timeline
type: MODULE
priority: 1
version: 0.1
parents:
  - [[entity_pitch_candidate_domain]]
layer: ARCHITECTURE
tags: pitch
dependents: []
---

# Pitch Attack Timeline

## INTENT
Rebuild the phrase's chronological sounding attacks from the rhythm candidate alone, and resolve which harmony event sounds at any absolute tick, so pitch planning can reason in attacks and chords instead of raw rhythm events.

## THE RULE / LOGIC
Walking a rhythm candidate's bars and events in order, a fresh non-tie, non-rest event opens a new sounding attack spanning its own duration; a tie continuation extends the currently open attack's end by its own duration rather than opening a new one, and throws if there is no open attack for it to extend; a rest closes whatever attack was open without extending it. Every start and end is expressed in absolute ticks from phrase start, at a fixed sixteen ticks per bar and four ticks per beat, so attacks and harmony events can be compared on one absolute timeline. Locating the harmony event sounding at an absolute tick converts the tick to an absolute beat and finds the one harmony event whose bar-relative start and duration bracket that beat; a tick no event covers is treated as an upstream defect and throws rather than resolving to a nearby event. A harmony event's stable identity for comparison across attacks is derived from its template identity and its own bar and beat position, not from object identity.

## TECHNICAL INTERFACE
Callers supply a rhythm candidate's bars to receive an ordered list of sounding attacks, each with its bar index, start tick, duration, and absolute start/end tick. Callers supply a harmony candidate's events and an absolute tick to receive that tick's harmony event index, or its stable identity string. Both harmony lookups throw a typed input error rather than returning an undefined or out-of-range result for a tick no event covers.

## EXPECTATION
The rebuilt attack sequence exactly matches the rhythm candidate's fresh (non-tie, non-rest) events in chronological order, with every tie continuation folded into the attack it extends and every rest closing the open attack without producing one of its own. Every absolute tick inside the phrase resolves to exactly one harmony event index and one stable harmony identity; a tick with no covering harmony event always throws instead of silently resolving.
