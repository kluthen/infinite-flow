---
id: rule_preset_label_kept_with_session
status: REVIEW
version: 0.1
tags: [v3, release-v3.1, storage, review, presets]
parents:
  - [[req_kept_sessions]]
dependents:
  - [[module_kept_session_upgrade_step]]
layer: BUSINESS
priority: 1
human_name: A Kept Session Keeps Its Preset Label
type: RULE
---

# A Kept Session Keeps Its Preset Label

## INTENT
Show which preset a kept session was played with, as it was then.

## THE RULE / LOGIC
From v3.1 a kept session records its preset label: the selection's name at the session's start, or Custom based on the preset it was based on, shown in the list of kept sessions where the musical profile was shown before. The label is a snapshot: renaming or deleting the preset later does not change it. Each kept phrase's reproduction inputs hold the seven figure levels in place of the musical profile.

## TECHNICAL INTERFACE
A kept session's record holds its preset label as text.

## EXPECTATION
- A kept session shows the preset label it started with, unchanged by a later rename or deletion of that preset.
