---
id: rule_session_start_conditions
status: DRAFT
type: RULE
layer: BUSINESS
priority: 1
human_name: When a Session Can Start
parents:
  - [[req_rolling_practice_session]]
version: 0.3
tags: [v2, release-v2.0, session, session-start]
dependents:
  - [[rule_midi_starting_note]]
---

# When a Session Can Start

## INTENT
Start a session only from Idle, outside the last session's review, and only when phrase 1 is settled and can be shown.

## THE RULE / LOGIC
While the last session's review shows, no session starts at all: neither a Start click nor any MIDI note, the starting note included, and no starting note is named. The player leaves the review first. At Idle, a session starts, by a Start click or by the starting MIDI note, only while every one of these holds:

1. a phrase is on screen, drawn in full: not before a first phrase has been generated, and not while the phrase cannot be drawn (the notation error, now kept only for failures retrying can cure);
2. no new phrase is being generated, including the retries that replace a phrase whose notes do not fit the staff, and including the fresh phrase generated when a session ends, since the phrase on screen is then about to be replaced;
3. no generation failure is being reported, whether or not the previous phrase is still on screen: the player has to regenerate successfully first;
4. the rhythm settings are a combination that allows generation, judged on the note density a phrase would be generated with (below the tablet-landscape layout's width, a chosen Sixteenth counts as Eighth);
5. the staff is shown: not while the rotate-device notice replaces it (a portrait-shaped view below the desktop layout's width), and not while phrase 1 cannot be drawn at the staff's minimum readable size in the layout a session would hold, within the window's width and, below the tablet-landscape layout's width, its height too, in which case the "staff needs more room" notice shows instead.

While any of these does not hold, neither a Start click nor any MIDI note starts a session, and no starting note is named. Once they all hold again (a successful regeneration, the new phrase on screen, a view that shows the staff again), starting works as usual. How an unavailable start looks belongs to the interface design.

## TECHNICAL INTERFACE
While the review shows, neither the Start action nor any MIDI note starts a session. At Idle, the Start action and the MIDI starting note are available only while all five conditions hold.

## EXPECTATION
- While the review shows, no session starts, by Start click or by any MIDI note, the starting note included, and no starting note is named.
- At Idle, no session starts, by Start click or by any MIDI note, and no starting note is named, while: no phrase has been generated yet; a new phrase is being generated, retries included, and including the fresh phrase generated when a session ends; the notation error shows; a generation failure is being reported; the rhythm settings block generation; the rotate-device notice replaces the staff; or phrase 1 cannot be drawn at the staff's minimum readable size in the layout a session would hold.
- Once the player has left the review and none of these holds, a session starts as usual.
