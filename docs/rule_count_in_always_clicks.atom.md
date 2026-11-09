---
id: rule_count_in_always_clicks
status: REVIEW
version: 0.2
parents:
  - [[req_rolling_practice_session]]
dependents:
  - [[rule_count_in_shown_on_screen]]
type: RULE
priority: 1
human_name: One-Measure Count-In Always Clicks
tags: [v2, release-v2.0, session, audio, session-start]
layer: BUSINESS
---

# One-Measure Count-In Always Clicks

## INTENT
Set the tempo, and the player's beat 1, before phrase 1 for every way of starting a session.

## THE RULE / LOGIC
Every session begins with one measure of click before phrase 1, whether it was started by a Start click or by the starting MIDI note. The count-in always clicks, even when the player has turned the click off, including when it is turned off during the count-in, because it is the only thing that sets the tempo before bar 1. It plays at the current click volume, which is never silent, so it is always audible. A session started from MIDI needs the count-in too, because the app cannot know in advance where the player's own beat 1 falls. In a Jam that begins with a doodle not yet played, the click runs on in the same way after the count-in, through the capture, the generation measure, any extended wait and the read-in measure, until phrase 1 sounds, since it sets the measure grid the doodle is played against (rule_jam_click_runs_until_phrase_one).

## TECHNICAL INTERFACE
Starting a session plays one measure of click at the current click volume before phrase 1.

## EXPECTATION
- Every session, however started, begins with a one-measure count-in.
- The count-in clicks even with the click turned off, including turned off during the count-in, and plays at the current click volume.
- In a Jam begun with a doodle not yet played, the click sounds every beat until phrase 1 sounds, even with the click turned off.
