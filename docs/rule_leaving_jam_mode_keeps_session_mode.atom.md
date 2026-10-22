---
id: rule_leaving_jam_mode_keeps_session_mode
status: DRAFT
tags: [v3, release-v3.2, jam, session-mode, idle, generation]
parents:
  - [[req_jam]]
layer: BUSINESS
human_name: Leaving Jam Mode Returns Session Mode as It Was
dependents: []
type: RULE
version: 0.1
priority: 1
---

# Leaving Jam Mode Returns Session Mode as It Was

## INTENT
Let the player visit Jam mode without losing their place in session mode.

## THE RULE / LOGIC
Leaving Jam mode returns session mode exactly as it was left: the phrase on screen and the phrases generated ahead are kept, since nothing of Jam's own touches session mode's settings. Jam's settings never count among the settings session mode's phrases generated ahead depend on, so nothing done in Jam mode discards them, apart from a shared setting changed there. While Jam mode shows, session mode keeps the phrases it has generated ahead and generates no new ones. Leaving Jam mode lets its kept doodle go.

## TECHNICAL INTERFACE
Session mode's Idle state is kept unchanged while Jam mode shows.

## EXPECTATION
- After a visit to Jam mode in which no shared setting changed, session mode shows the same phrase and keeps the same phrases generated ahead.
- While Jam mode shows, session mode generates nothing.
- Leaving Jam mode lets the kept doodle go.
