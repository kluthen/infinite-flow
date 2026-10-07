---
id: rule_kept_session_content
status: DRAFT
version: 0.1
priority: 1
human_name: What a Kept Session Holds
tags: [v3, release-v3.0, storage, review]
parents:
  - [[req_kept_sessions]]
  - [[rule_session_history_keeps_timeline_and_inputs]]
notes: Created 2026-10-07 at DRAFT by the v3.0 spec ingestion, from the v3.0 master spec the product owner approved. Describes intended v3.0 behaviour: nothing of it is built yet, and the running v2.0 code keeps nothing across a reload. It falls outside the vision as it stands (STABLE, scoped through v2) until the proposed v3 revision of the vision is confirmed.
type: RULE
dependents:
  - [[rule_kept_session_holds_no_acknowledgements]]
layer: BUSINESS
---

# What a Kept Session Holds

## INTENT
Keep, for each kept session, exactly what its review and exports need, and what identifies it.

## THE RULE / LOGIC
From v3.0, a kept session holds:
- for each phrase that sounded: the generated timeline as it was shown, its chord symbols, the inputs that reproduce it (seed, controls, profile, instrument, and the handoff from the phrase before it), its tempo, and whether it was a repeat;
- for the session: its start date and time, its length, its number of phrases, its musical profile, its instrument, its starting tempo and the tempo it reached, whether it is pinned, its comment, and the app version that recorded it;
- the player's played notes, only when the player has opted in to keeping them, with their times relative to the session's start.
It keeps the generated timeline, not only the reproduction inputs, because a later generator may produce different phrases from the same inputs. It never keeps the generator's internal working records (provenance, diagnostics), which nothing in the review or the exports reads.

## TECHNICAL INTERFACE
Each kept session record holds per-phrase timelines, chord symbols, reproduction inputs, tempos and repeat marks, plus the session's identifying fields.

## EXPECTATION
- A kept session reopens with every phrase engraved exactly as it was shown, even if the generator has changed since.
- A kept session holds no generator provenance or diagnostics.
- Kept played-note times are relative to the session's start.
