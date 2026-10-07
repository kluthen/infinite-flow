---
id: rule_played_notes_kept_only_after_opt_in
status: DRAFT
layer: BUSINESS
version: 0.2
priority: 1
parents:
  - [[req_kept_sessions]]
  - [[req_midi_controller_input]]
notes: Revised 2026-10-07 to version 0.2 (still DRAFT) by the re-sync to the v3.0 master spec v1.3, approved by the product owner: switching Keep my played notes on while reviewing the session that just ended keeps that session's played notes too. Earlier: Created 2026-10-07 at DRAFT by the v3.0 spec ingestion, from the v3.0 master spec the product owner approved. Describes intended v3.0 behaviour: nothing of it is built yet, and the running v2.0 code keeps nothing across a reload. It falls outside the vision as it stands (STABLE, scoped through v2) until the proposed v3 revision of the vision is confirmed.
dependents:
  - [[rule_kept_played_notes_deletable]]
type: RULE
human_name: Played Notes Kept Only After Opt-In
tags: [v3, release-v3.0, storage, midi, privacy]
---

# Played Notes Kept Only After Opt-In

## INTENT
Keep the notes the player plays, their most private data, only when they choose to.

## THE RULE / LOGIC
From v3.0, one switch, Keep my played notes, decides whether played notes are saved, and it is off by default. While it is off, played notes exist in memory only: the review of the session that just ended shows them, and once the page is reloaded that kept session has none, and no played note is ever written to storage. While it is on, the played notes of each session are saved with that session. Switching it on while reviewing the session that just ended keeps that session's played notes too, since they are still in memory. Pinning a session and keeping its played notes are separate choices: pinning keeps the music, the switch decides about the player's own notes. Played notes are kept exactly as received. Whether kept or not, played notes are never sent anywhere, and they leave the device only through the played-notes export the player triggers.

## TECHNICAL INTERFACE
A Keep my played notes switch, off by default, governs whether a session's played notes are written with it.

## EXPECTATION
- With the switch off, no played note is ever written to storage.
- With the switch on, a session's played notes are saved with it.
- Switching it on while reviewing the session that just ended saves that session's played notes.
- Pinning a session never by itself keeps its played notes.
- No played note is ever sent over the network.
