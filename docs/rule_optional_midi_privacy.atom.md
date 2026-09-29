---
id: rule_optional_midi_privacy
status: DRAFT
human_name: Optional MIDI Privacy
layer: BUSINESS
version: 0.2
priority: 2
tags: [midi, privacy, non-scoring, v2, release-v2.0, revised-for-v2]
dependents: []
type: RULE
parents:
  - [[req_midi_controller_input]]
notes: 'Revised 2026-09-29 by v2 spec ingestion for release v2.0 (previous version 0.1). Version 0.1 stated the first-release boundary that the app has no MIDI controller connection, input or feedback at all; v2 lifts that exclusion, so this rule now states how played MIDI input stays private. Not yet built: no played notes exist yet. The lint and boundary-script bans on network and storage enforce its never-sent/never-stored half; no test verifies it until played notes exist.'
---

# Optional MIDI Privacy

## INTENT
Keep the notes the player plays on their own machine unless they explicitly export them.

## THE RULE / LOGIC
MIDI input stays private by construction, not by policy. Played notes exist only in memory, for the current session and its review. They are never written to any browser storage and never sent in any network request, and no export other than the played-notes export ever carries them. The only way a played note ever leaves the player's machine is the played-notes export action, which the player explicitly triggers; until that action exists (release v2.1), no played note ever leaves the machine.

## TECHNICAL INTERFACE
No storage or network path carries played notes; the played-notes export is a local file download the player triggers.

## EXPECTATION
Under a network and storage spy across a full session, its review and every export, no played note is written to storage or sent over the network, and played notes appear only in a played-notes export file the player triggered.
