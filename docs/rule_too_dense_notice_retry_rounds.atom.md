---
id: rule_too_dense_notice_retry_rounds
status: DRAFT
layer: BUSINESS
human_name: Too-Dense Notice Starts New Retry Rounds
tags: [v2, release-v2.0, idle, notation, v1-change]
parents:
  - [[rule_staff_needs_room_notice]]
dependents:
  - [[module_idle_fit_round]]
  - [[module_idle_room_notice]]
  - [[rule_retry_round_window_changes]]
type: RULE
version: 0.1
priority: 1
---

# Too-Dense Notice Starts New Retry Rounds

## INTENT
Let anything that could cure a too-dense phrase start a new round of retries without the player having to ask.

## THE RULE / LOGIC
While the "staff needs more room" notice shows because every retry was too dense, each of the following starts a fresh round of up to three fresh-seed retries by itself:

- the window getting wider;
- a change to a setting the phrase is generated from (tempo, the audio mix and the theme cannot change the notes, so they start nothing);
- regenerating by hand, since the phrase action stays available beside the notice.

The first phrase that fits clears the notice and is shown; if every attempt of the round is too dense, the notice stays until the next such change. The window getting narrower never starts a round; a window narrowed until the staff has no room gives the notice its no-room cause instead. While a round runs, a new phrase is being generated, so no session starts, and, as in the first release, the settings the phrase is generated from are read-only and the phrase action is unavailable; only the window can change during a round.

## TECHNICAL INTERFACE
A wider window, a generation-setting change or the phrase action, made while the too-dense notice shows, each starts a retry round automatically.

## EXPECTATION
- While the too-dense notice shows, a wider window, a change to a generation setting, or regenerating by hand each starts a new round of up to three fresh-seed retries.
- A tempo, audio-mix or theme change starts nothing; a narrower window never starts a round.
- The first attempt that fits clears the notice and is shown; a round that fails leaves the notice in place.
