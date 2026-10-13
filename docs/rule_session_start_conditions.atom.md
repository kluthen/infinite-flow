---
id: rule_session_start_conditions
status: REVIEW
type: RULE
layer: BUSINESS
priority: 1
human_name: When a Session Can Start
parents:
  - [[req_rolling_practice_session]]
version: 0.4
tags: [v2, release-v2.0, session, session-start, changes-in-v3.0, changes-in-v3.2]
dependents:
  - [[rule_jam_start_conditions]]
  - [[rule_midi_starting_note]]
  - [[rule_stale_phrase_prompt_at_start]]
  - [[rule_start_never_waits_for_pregeneration]]
  - [[service_session_controller]]
  - [[service_session_start]]
  - [[service_workspace_session_flow]]
notes: Revised 2026-10-13 to version 0.4 (previous version 0.3) before code, on the product owner rulings recorded as spec D297 and its ruling note (master spec Part A v1.12, section 16; v3.0 build plan v9, chunk 24b); stays REVIEW, as the owner ruled the change himself. The stale-phrase prompt (rule_stale_phrase_prompt_at_start) comes after every start condition holds and is not itself a start condition: a blocked start opens no prompt, and Use it checks the conditions again. Pending implementation: chunk 24b; until then the running code starts, or fails to start (ISS-011), on a stale phrase 1 without asking. The two pending changes below are untouched. Earlier: v3.2 change pending (2026-10-08, v3.1 and v3.2 spec ingestion): a Jam without a held doodle starts with no phrase on screen: conditions 1 and 2 do not apply to it (rule_jam_start_conditions). Text and status unchanged on purpose: it still describes the running code. Revise it in the change that builds that behaviour, per docs/release/v3.1-v3.2-intent-change-set.md. Earlier: v3.0 change pending (2026-10-07, v3.0 spec ingestion): the approved v3.0 scope, not yet built, changes this atom. From v3.0 a background pre-generation at Idle does not count as a new phrase being generated under its second condition (rule_start_never_waits_for_pregeneration). Text and status unchanged on purpose: it still describes the running v2.0 code. Revise it in the change that builds the v3.0 behaviour, per docs/release/v3.0-intent-change-set.md.
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

The stale-phrase prompt comes after these conditions, never among them. When every condition holds and the phrase on screen is stale, made under settings that differ from the current ones in what the generation reads, a Start click or the starting note does not start the session at once: the prompt asks first whether to make a new phrase or use this one, and only Use it starts the session, every condition checked again at that moment. The prompt is not a start condition and never replaces one: while a condition does not hold, a Start click or a MIDI note starts nothing and opens no prompt, as above. When phrase 1 is not stale, starting works as before and nothing is asked.

## TECHNICAL INTERFACE
While the review shows, neither the Start action nor any MIDI note starts a session. At Idle, the Start action and the MIDI starting note are available only while all five conditions hold. With all five holding and phrase 1 stale, they open the stale-phrase prompt instead of starting; the prompt is no sixth condition.

## EXPECTATION
- While the review shows, no session starts, by Start click or by any MIDI note, the starting note included, and no starting note is named.
- At Idle, no session starts, by Start click or by any MIDI note, and no starting note is named, while: no phrase has been generated yet; a new phrase is being generated, retries included, and including the fresh phrase generated when a session ends; the notation error shows; a generation failure is being reported; the rhythm settings block generation; the rotate-device notice replaces the staff; or phrase 1 cannot be drawn at the staff's minimum readable size in the layout a session would hold.
- Once the player has left the review and none of these holds, a session starts as usual, after the stale-phrase prompt when phrase 1 is stale.
- A start blocked by any of these conditions opens no stale-phrase prompt. With every condition holding and phrase 1 stale, a Start click or the starting note opens the prompt and starts nothing; Use it starts the session only if every condition still holds then.
