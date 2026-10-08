---
id: rule_earlier_kept_sessions_carried_over
status: DRAFT
tags: [v3, release-v3.1, storage, review, presets]
parents:
  - [[req_kept_sessions]]
dependents: []
version: 0.1
notes: Created 2026-10-08 at DRAFT by the v3.1 and v3.2 spec ingestion, from the v3.1 master spec the product owner approved on 2026-10-08. Describes intended v3.1 behaviour: nothing of it is built yet. It falls within the vision since version 0.8 (2026-10-08, spec D246).
type: RULE
layer: BUSINESS
priority: 1
human_name: Earlier Kept Sessions Are Carried Over
---

# Earlier Kept Sessions Are Carried Over

## INTENT
Keep every session kept by v3.0 reviewable and reproducible after v3.1 arrives.

## THE RULE / LOGIC
Sessions kept by v3.0 are carried over when v3.1 first opens the app's storage: each kept phrase's musical profile becomes that profile's figure levels in its reproduction inputs, the session's label is the musical profile it recorded, in the same form (Neutral, Jazz, or Custom based on one of them), and its generated timelines are kept as they are.

## TECHNICAL INTERFACE
The storage upgrade rewrites each kept phrase's profile as figure levels and keeps the session's label.

## EXPECTATION
- After the upgrade, every v3.0 kept session opens, shows the profile it recorded as its label, and shows the same phrases.
