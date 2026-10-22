---
id: rule_played_notes_kept_only_after_opt_in
status: STABLE
layer: BUSINESS
version: 0.3
priority: 1
parents:
  - [[req_kept_sessions]]
  - [[req_midi_controller_input]]
dependents:
  - [[entity_kept_session_record]]
  - [[module_kept_session_changes]]
  - [[rule_kept_played_notes_deletable]]
type: RULE
human_name: Played Notes Kept Only After Opt-In
tags: [v3, release-v3.0, storage, midi, privacy, changes-in-v3.2]
---

# Played Notes Kept Only After Opt-In

## INTENT
Keep the notes the player plays, their most private data, only when they choose to.

## THE RULE / LOGIC
From v3.0, one switch, Keep my played notes, decides whether played notes are saved, and it is off by default. While it is off, played notes exist in memory only: the review of the session that just ended shows them, and once the page is reloaded that kept session has none, and no played note is ever written to storage. While it is on, the played notes of each session are saved with that session. Switching it on while reviewing the session that just ended keeps that session's played notes too, since they are still in memory. Pinning a session and keeping its played notes are separate choices: pinning keeps the music, the switch decides about the player's own notes. Played notes are kept exactly as received. Whether kept or not, played notes are never sent anywhere, and they leave the device only through the played-notes export the player triggers. A Jam's quantized doodle, the doodle the player played, snapped to sixteenth notes and made one melodic line, is a generation input the player gave on purpose, not played notes: it is kept with its Jam session whether the switch is on or off. The doodle's raw notes, exactly as played, are played notes under this rule.

## TECHNICAL INTERFACE
A Keep my played notes switch, off by default, governs whether a session's played notes are written with it.

## EXPECTATION
- With the switch off, no played note is ever written to storage, a Jam's raw doodle notes included; a Jam's quantized doodle is kept with its session either way.
- With the switch on, a session's played notes are saved with it.
- Switching it on while reviewing the session that just ended saves that session's played notes.
- Pinning a session never by itself keeps its played notes.
- No played note is ever sent over the network.
