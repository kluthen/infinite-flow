---
id: rule_kept_session_content
status: DRAFT
version: 0.3
priority: 1
human_name: What a Kept Session Holds
tags: [v3, release-v3.0, storage, review, changes-in-v3.1, changes-in-v3.2]
parents:
  - [[req_kept_sessions]]
  - [[rule_session_history_keeps_timeline_and_inputs]]
notes: Synced 2026-10-14 at the v3.0 wave-3 post-task sync, same version 0.3: build plan chunk 9's kept-session codec (merge fcabf7f; entity_kept_session_record, module_kept_session_codec, src/storage/records/kept-*.ts) builds the records this rule lists: per sounded phrase the timeline as shown, the chord symbols' harmony, the reproduction inputs with the profile as data, the clef, the tempo and the repeat mark; for the session its start, length, phrase count, musical profile, instrument by id, starting and reached tempo, pinned, comment, recording app version and session seed; played notes only when kept, in seconds from the session's start; no provenance or diagnostics. Links and linked tests (kept-session-record.spec.ts, kept-session-summary.spec.ts) checked and right. A My instrument phrase is refused by the encoder until build plan chunk 17 puts its clef in the history. Built in storage and not wired yet: nothing saves or opens a kept session until build plan chunk 10. Text and status unchanged (DRAFT). Earlier: Revised 2026-10-14 to version 0.3 (previous version 0.2) on the owner's sign-off of 2026-10-14, relayed by the coordinator (in his words: we may keep the seed, mostly for debuging purpose), as proposed at the v3.0 wave-3 preflight: the session's facts now include its session seed, as master spec section 5.2 keeps it since spec D255 and D258, kept mainly for debugging, with nothing derivable from it. Status unchanged (DRAFT). Earlier: Revised 2026-10-12 to version 0.2 (previous version 0.1) on the owner's rulings of 2026-10-12, spec D295 and D296, master spec Part A v1.10 (sections 5.2 and 7.1; spec D293 and D295 item 7), relayed to documentalist: each phrase's instrument is stored with My instrument's clef, display only, and a review draws each phrase in the clef it was played in; the session-wide record names, by id, the instrument the session belongs to. This replaces the pending note of the same day: the owner's earlier reading, review with My instrument's current clef, was not kept, since D295 keeps the clef with each phrase. The v3.1 and v3.2 pending changes below still stand. Status unchanged (DRAFT). Earlier: v3.1 change pending (2026-10-08, v3.1 and v3.2 spec ingestion): each kept phrase's inputs hold the seven figure levels instead of the profile, and the session's musical profile becomes its preset label (rule_preset_label_kept_with_session, rule_earlier_kept_sessions_carried_over). v3.2 change pending (2026-10-08, v3.1 and v3.2 spec ingestion): a kept Jam session also holds that it is a Jam, its quantized doodle with its capture tempo, and whether its suggestion was declined, without the played-notes opt-in; each phrase's inputs gain the doodle, the drift, the locked rhythm, the allowed rhythm changes and the tenser-phrase flag (rule_quantized_doodle_is_generation_input). Text and status unchanged on purpose: it still describes the running code. Revise it in the change that builds that behaviour, per docs/release/v3.1-v3.2-intent-change-set.md. Earlier: Created 2026-10-07 at DRAFT by the v3.0 spec ingestion, from the v3.0 master spec the product owner approved. Describes intended v3.0 behaviour: nothing of it is built yet, and the running v2.0 code keeps nothing across a reload. It falls within the vision since version 0.8 (2026-10-08, spec D246).
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
- for each phrase that sounded: the generated timeline as it was shown, its chord symbols, the inputs that reproduce it (seed, controls, profile, instrument, and the handoff from the phrase before it), with My instrument's clef stored beside the instrument, the clef the phrase was drawn in (display only: it reproduces nothing), its tempo, and whether it was a repeat;
- for the session: its start date and time, its length, its number of phrases, its musical profile, its instrument, named by its id, the instrument the session belongs to, its starting tempo and the tempo it reached, whether it is pinned, its comment, the app version that recorded it, and its session seed, the one seed every later phrase's seed derives from; nothing that can be derived from it is kept. The session seed is kept mainly for debugging, so a kept session can be traced back to how its phrases were generated; the player never sees or uses it;
- the player's played notes, only when the player has opted in to keeping them, with their times relative to the session's start.
It keeps the generated timeline, not only the reproduction inputs, because a later generator may produce different phrases from the same inputs. It never keeps the generator's internal working records (provenance, diagnostics), which nothing in the review or the exports reads. A review draws each phrase in the clef stored with it, the clef it was played in, whatever clef My instrument has now.

## TECHNICAL INTERFACE
Each kept session record holds per-phrase timelines, chord symbols, reproduction inputs, tempos and repeat marks, plus the session's identifying fields.

## EXPECTATION
- A kept session reopens with every phrase engraved exactly as it was shown, in the clef it was played in, even if the generator or My instrument's clef has changed since.
- A kept session holds no generator provenance or diagnostics.
- Kept played-note times are relative to the session's start.
