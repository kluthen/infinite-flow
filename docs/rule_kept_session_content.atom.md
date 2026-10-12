---
id: rule_kept_session_content
status: DRAFT
version: 0.1
priority: 1
human_name: What a Kept Session Holds
tags: [v3, release-v3.0, storage, review, changes-in-v3.1, changes-in-v3.2]
parents:
  - [[req_kept_sessions]]
  - [[rule_session_history_keeps_timeline_and_inputs]]
notes: Pending, 2026-10-12: my instrument's clef (spec D293) is not written in here. The owner then ruled, relayed by the coordinator, that kept sessions are tied to the instrument they were played with and reviewed with that instrument as it is now, its current clef included, which changes D293's clef kept with each phrase's instrument (master spec section 5.2); spec-writer records it as a new decision. This atom is revised once that decision is recorded. Text, version and status unchanged. Earlier: v3.1 change pending (2026-10-08, v3.1 and v3.2 spec ingestion): each kept phrase's inputs hold the seven figure levels instead of the profile, and the session's musical profile becomes its preset label (rule_preset_label_kept_with_session, rule_earlier_kept_sessions_carried_over). v3.2 change pending (2026-10-08, v3.1 and v3.2 spec ingestion): a kept Jam session also holds that it is a Jam, its quantized doodle with its capture tempo, and whether its suggestion was declined, without the played-notes opt-in; each phrase's inputs gain the doodle, the drift, the locked rhythm, the allowed rhythm changes and the tenser-phrase flag (rule_quantized_doodle_is_generation_input). Text and status unchanged on purpose: it still describes the running code. Revise it in the change that builds that behaviour, per docs/release/v3.1-v3.2-intent-change-set.md. Earlier: Created 2026-10-07 at DRAFT by the v3.0 spec ingestion, from the v3.0 master spec the product owner approved. Describes intended v3.0 behaviour: nothing of it is built yet, and the running v2.0 code keeps nothing across a reload. It falls within the vision since version 0.8 (2026-10-08, spec D246).
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
