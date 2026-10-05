---
id: rule_idle_phrase_too_dense_is_replaced
status: DRAFT
type: RULE
tags: [v2, release-v2.0, idle, notation, v1-change]
parents:
  - [[req_landscape_phrase_workspace]]
  - [[user_story_controlled_phrase_generation]]
dependents:
  - [[module_idle_fit_round]]
  - [[module_idle_room_notice]]
  - [[rule_retry_round_window_changes]]
layer: BUSINESS
version: 0.1
priority: 1
human_name: Idle Phrase Too Dense for the Staff Is Replaced
---

# Idle Phrase Too Dense for the Staff Is Replaced

## INTENT
Replace an Idle phrase whose notes cannot fit the staff instead of showing a notation error.

## THE RULE / LOGIC
This changes the first release's behaviour, where such a phrase showed the notation error. At Idle, whenever a phrase is about to be drawn (a newly generated one, or the one on screen when a change to the window's size means it no longer fits), and the window has room for the staff but this phrase's notes need more width than the staff's minimum readable size allows, the phrase is not drawn. Instead the app quietly generates a new one, with up to three retries, each with a fresh seed. An Idle phrase has no carry-in and no deadline, so the later failure steps used during a session do not apply. Each retry is generated with the note density the window gives when that retry is generated. While the retries run, a new phrase is being generated, so no session can start. The first retry that fits is shown like any generated phrase, with its own seed. Only when every retry fails does the app show the plain notice that the staff needs more room; no notation error is shown for it. While the rhythm settings are a combination that blocks generation, no retry can run, and the unsupported-settings behaviour applies instead. The generator's output for a given request and seed does not change; only which seed ends up shown can depend on the window's size. This is a second automatic regeneration at Idle, besides the regeneration that follows an instrument-profile switch.

## TECHNICAL INTERFACE
At Idle, a phrase too dense for the staff is silently replaced through an automatic round of up to three fresh-seed retries, ending either in a shown phrase or in the "staff needs more room" notice.

## EXPECTATION
- At Idle, a phrase whose notes cannot be drawn at the staff's minimum readable size, whether just generated or on screen when the window's size changed, is never drawn.
- The first of up to three fresh-seed retries that fits is shown, with its own seed; if all fail, the "staff needs more room" notice shows.
- The notation error never appears for a phrase that is merely too dense for the staff.
