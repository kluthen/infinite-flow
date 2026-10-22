---
id: rule_app_opens_in_session_mode
status: DRAFT
dependents: []
version: 0.1
priority: 1
tags: [v3, release-v3.2, jam, session-mode, storage]
type: RULE
layer: BUSINESS
human_name: The App Always Opens in Session Mode
parents:
  - [[req_jam]]
---

# The App Always Opens in Session Mode

## INTENT
Give the player the app they know every time it opens.

## THE RULE / LOGIC
The app always opens in session mode, after a reload too: the mode is never saved, while Jam's own settings are. Session mode is the app as v3.1 ships it, with v3.2's session settings: the rhythm lock, its allowed rhythm changes and Vary settings' allowed groups.

## TECHNICAL INTERFACE
The workspace starts in session mode at every load.

## EXPECTATION
- Every load of the app, a reload included, opens in session mode.
- The mode is never saved.
