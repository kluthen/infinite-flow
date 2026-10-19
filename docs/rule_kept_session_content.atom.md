---
id: rule_kept_session_content
status: STABLE
version: 0.5
priority: 1
human_name: What a Kept Session Holds
tags: [v3, release-v3.0, storage, review, changes-in-v3.1, changes-in-v3.2]
parents:
  - [[req_kept_sessions]]
  - [[rule_session_history_keeps_timeline_and_inputs]]
type: RULE
dependents:
  - [[entity_kept_session_record]]
  - [[module_kept_session_codec]]
  - [[rule_kept_session_holds_no_acknowledgements]]
layer: BUSINESS
---

# What a Kept Session Holds

## INTENT
Keep, for each kept session, exactly what its review and exports need, and what identifies it.

## THE RULE / LOGIC
From v3.0, a kept session holds:
- for each phrase that sounded: the generated timeline as it was shown, its chord symbols, the inputs that reproduce it (seed, controls, the seven figure levels, instrument, and the handoff from the phrase before it), with My instrument's clef stored beside the instrument, the clef the phrase was drawn in (display only: it reproduces nothing), its tempo, and whether it was a repeat;
- for the session: its start date and time, its length, its number of phrases, its preset label (the name of the preset selected at its start, or Custom and the preset it was based on, kept as it was then even if that preset is later renamed or deleted), its instrument, named by its id, the instrument the session belongs to, its starting tempo and the tempo it reached, whether it is pinned, its comment, the app version that recorded it, and its session seed, the one seed every later phrase's seed derives from; nothing that can be derived from it is kept. The session seed is kept mainly for debugging, so a kept session can be traced back to how its phrases were generated; the player never sees or uses it;
- the player's played notes, only when the player has opted in to keeping them, with their times relative to the session's start.
It keeps the generated timeline, not only the reproduction inputs, because a later generator may produce different phrases from the same inputs. It never keeps the generator's internal working records (provenance, diagnostics), which nothing in the review or the exports reads. A review draws each phrase in the clef stored with it, the clef it was played in, whatever clef My instrument has now.

## TECHNICAL INTERFACE
Each kept session record holds per-phrase timelines, chord symbols, reproduction inputs, tempos and repeat marks, plus the session's identifying fields.

## EXPECTATION
- A kept session reopens with every phrase engraved exactly as it was shown, in the clef it was played in, even if the generator or My instrument's clef has changed since.
- A kept session holds no generator provenance or diagnostics.
- Kept played-note times are relative to the session's start.
