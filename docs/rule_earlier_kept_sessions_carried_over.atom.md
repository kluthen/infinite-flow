---
id: rule_earlier_kept_sessions_carried_over
status: DRAFT
tags: [v3, release-v3.1, storage, review, presets]
parents:
  - [[req_kept_sessions]]
dependents:
  - [[module_kept_session_upgrade_step]]
  - [[module_stored_profile_to_levels]]
version: 0.4
type: RULE
layer: BUSINESS
priority: 1
human_name: Earlier Kept Sessions Are Carried Over
---

# Earlier Kept Sessions Are Carried Over

## INTENT
Keep every session kept by v3.0 reviewable and reproducible after v3.1 arrives.

## THE RULE / LOGIC
Sessions kept by v3.0 are carried over when v3.1 first opens the app's storage: each kept phrase's musical profile becomes that profile's figure levels in its reproduction inputs (Neutral's or Jazz's, whether or not it was customized), the session's label is the musical profile it recorded, in the same form (Neutral, Jazz, or Custom based on one of them), whether it was customized being read from the selection the session's record holds, the session's start state, and its generated timelines are kept as they are. This happens once, when v3.1 first opens the storage, and only then: no session is carried over when it is read. With very many very long sessions kept by v3.0 (from about 220 sessions of about 13 minutes each), carrying them all over runs past the start-up read's time limit: that one visit starts from the defaults and keeps nothing, the session played in it included; the carrying over still completes, and the next visit reads normally.

## TECHNICAL INTERFACE
The storage upgrade, when v3.1 first opens the storage, rewrites each kept phrase's profile as figure levels and keeps the session's label; no v3.0 session is rewritten when it is read.

## EXPECTATION
- After v3.1 opens the storage, every v3.0 kept session opens, shows the profile it recorded as its label, Custom based on it when the selection it recorded was customized, and shows the same phrases.
- When carrying every v3.0 session over runs past the start-up read's time limit, that visit starts from the defaults, the carrying over still completes, and the next visit reads every session normally.
