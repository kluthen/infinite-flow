---
id: rule_jam_code_loaded_on_demand
status: DRAFT
priority: 1
tags: [v3, release-v3.2, jam, session-mode, performance]
parents:
  - [[req_jam]]
dependents: []
version: 0.1
human_name: Session Mode Never Pays for Jam
type: RULE
layer: BUSINESS
---

# Session Mode Never Pays for Jam

## INTENT
Keep the app as quick to open as before for a player who never uses Jam.

## THE RULE / LOGIC
The app's first load carries the mode button and nothing else of Jam's, so opening the app in session mode costs what it cost before Jam existed. Jam's parts (the capture, the controls read from the doodle, the steering block, Jam's Idle and settings, tap-in, the path to phrase 1, the key and mode suggestion, and the doodle sections of the review and the exports) load the first time the mode button is pressed in a visit, or when a kept Jam session's review opens, in either mode. Once loaded, they are kept for offline use like every other part of the app.

## TECHNICAL INTERFACE
Jam's parts are loaded on demand, outside the app's first load.

## EXPECTATION
- The app's first load holds the mode button and none of Jam's other parts.
- Jam's parts load on the first press of the mode button in a visit, or when a kept Jam session's review opens.
- Once loaded, Jam's parts work offline like the rest of the app.
