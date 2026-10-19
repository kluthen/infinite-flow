---
id: rule_earlier_kept_sessions_carried_over
status: DRAFT
tags: [v3, release-v3.1, storage, review, presets]
parents:
  - [[req_kept_sessions]]
dependents:
  - [[module_stored_profile_to_levels]]
version: 0.2
type: RULE
layer: BUSINESS
priority: 1
human_name: Earlier Kept Sessions Are Carried Over
---

# Earlier Kept Sessions Are Carried Over

## INTENT
Keep every session kept by v3.0 reviewable and reproducible after v3.1 arrives.

## THE RULE / LOGIC
Sessions kept by v3.0 are carried over when v3.1 first opens the app's storage: each kept phrase's musical profile becomes that profile's figure levels in its reproduction inputs (Neutral's or Jazz's, whether or not it was customized), the session's label is the musical profile it recorded, in the same form (Neutral, Jazz, or Custom based on one of them), whether it was customized being read from phrase 1's reproduction inputs, which hold the session's start state, and its generated timelines are kept as they are. If carrying every v3.0 session over when the storage opens would not fit the start-up read's time limit, each session is carried over the same way when it is read instead; the player sees no difference.

## TECHNICAL INTERFACE
The storage upgrade, or the first read of each v3.0 session when the upgrade cannot do them all in time, rewrites each kept phrase's profile as figure levels and keeps the session's label.

## EXPECTATION
- After v3.1 opens the storage, every v3.0 kept session opens, shows the profile it recorded as its label, Custom based on it when its phrase 1 was generated customized, and shows the same phrases.
- Whether a session was carried over at the upgrade or when first read makes no difference the player can see.
