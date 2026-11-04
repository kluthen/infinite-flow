---
id: rule_guide_never_exported
status: DRAFT
priority: 1
tags: [v3, release-v3.2, session, audio]
dependents: []
layer: BUSINESS
parents:
  - [[req_guide_playback]]
human_name: No Guide Note Is Ever Exported
type: RULE
version: 0.1
---

# No Guide Note Is Ever Exported

## INTENT
Keep every export to the player's generated and played material.

## THE RULE / LOGIC
No guide note is ever written to an export: every generated-notes and played-notes file is byte for byte the file it is with both guides off.

## TECHNICAL INTERFACE
The generated-notes and played-notes exports take nothing from the guides.

## EXPECTATION
- Every generated-notes and played-notes file is byte for byte the same with either guide or both on as with both off.
