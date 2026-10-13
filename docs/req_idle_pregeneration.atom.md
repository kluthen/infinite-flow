---
id: req_idle_pregeneration
status: DRAFT
priority: 1
human_name: Pre-Generating Phrases at Idle
tags: [v3, release-v3.0, idle, generation, session, changes-in-v3.2]
parents:
  - [[req_rolling_practice_session]]
notes: Synced 2026-10-13 at the v3.0 wave-2 post-task sync, same version 0.1: chunk 24's code (merge 0b744ae; module_idle_pregeneration_queue, module_session_pregeneration_plan, module_session_ready_phrases) implements it, with linked tests (the pre-generation unit and e2e specs, and M4: on the reference machine all 568 sweep cases at 240 BPM had phrases 2 to 5 ready and phrase 2 joined phrase 1 with a carry-in, against 0 % without pre-generation, docs/generation-latency.md). The text saying nothing of it is built is superseded for v3.0; the v3.2 change pending below is untouched. No change of meaning; status stays DRAFT. Earlier: v3.2 change pending (2026-10-08, v3.1 and v3.2 spec ingestion): in Jam mode without a held doodle pre-generation does not run; with a held doodle it runs, and the phrases carry the doodle, the drift, the lock and its draws (rule_jam_idle_shows_no_phrase, rule_held_doodle_phrase_one_at_idle). Text and status unchanged on purpose: it still describes the running code. Revise it in the change that builds that behaviour, per docs/release/v3.1-v3.2-intent-change-set.md. Earlier: Created 2026-10-07 at DRAFT by the v3.0 spec ingestion, from the v3.0 master spec the product owner approved. Describes intended v3.0 behaviour: nothing of it is built yet, and the running v2.0 code keeps nothing across a reload. It falls within the vision since version 0.8 (2026-10-08, spec D246).
type: REQUIREMENT
layer: BUSINESS
dependents:
  - [[module_idle_pregeneration_queue]]
  - [[module_session_pregeneration_plan]]
  - [[module_session_ready_phrases]]
  - [[rule_pregenerated_phrase_matches_session]]
  - [[rule_pregeneration_discarded_on_change]]
  - [[rule_pregeneration_yields_to_player]]
  - [[rule_start_never_waits_for_pregeneration]]
version: 0.1
---

# Pre-Generating Phrases at Idle

## INTENT
Have phrases ready before Start, so that even the fastest sessions begin with time in hand.

## THE RULE / LOGIC
From v3.0, while the app is Idle with a phrase 1 on screen that a session could start from, it generates in the background, one after another, up to four phrases that would follow that phrase 1 in a session. A session spends them first, then looks one phrase ahead as before. They are never topped up during a session. Generated before Start with no deadline, the second phrase can join the first smoothly even at the fastest tempos. Background generation does not run while a review is shown, and pre-generated phrases are never saved: they are gone on reload.

## TECHNICAL INTERFACE
At Idle, a background queue of up to four phrases following phrase 1, consumed by the next session.

## EXPECTATION
- At Idle, up to four phrases following phrase 1 are generated in the background.
- No phrase is pre-generated while the review shows, and none survives a reload.
- A session uses the pre-generated phrases first and never tops them up.
