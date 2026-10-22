---
id: rule_jam_settings_saved_on_change
status: DRAFT
version: 0.1
priority: 1
tags: [v3, release-v3.2, jam, player-controls, storage]
dependents: []
type: RULE
layer: BUSINESS
human_name: Jam's Settings Are Saved on Their Own
parents:
  - [[req_jam_settings]]
---

# Jam's Settings Are Saved on Their Own

## INTENT
Bring Jam's settings back as the player left them, apart from session mode's.

## THE RULE / LOGIC
Jam's settings (its key and mode, tempo, drift, rhythm lock, allowed rhythm changes, harmonic motion, tension and Embellishments level) are saved on the device when the player changes them, with no save action, as their own group beside session mode's saved settings, which they never touch. As for every saved setting, one changed while no session runs is saved at once, and nothing is written during a session. Each comes back after a reload as the player left it; the lock comes back on only if the player turned it on. The mode, the controls read from a doodle and the kept doodle are never saved.

## TECHNICAL INTERFACE
Jam's settings are kept in the settings store as their own group.

## EXPECTATION
- Every Jam setting returns after a reload with the value the player last chose.
- Saving a Jam setting never changes a saved session-mode setting.
- The mode, the controls read from a doodle and the kept doodle are never saved.
