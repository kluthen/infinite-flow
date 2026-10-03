---
id: rule_expected_note_window
status: DRAFT
layer: BUSINESS
version: 0.3
priority: 1
human_name: Expected-Note Timing Window
parents:
  - [[req_midi_controller_input]]
dependents:
  - [[module_notation_note_identity_overlays]]
  - [[rule_acknowledgement_exact_pitch]]
  - [[rule_played_onset_latency_compensation]]
type: RULE
tags: [v2, release-v2.0, v2.4-check, midi, acknowledgement]
notes: Revised 2026-09-29 on an owner decision of 2026-09-29 (previous version 0.1). Version 0.1 opened each window 150 ms before its onset and cut it at the next window's opening, so when the next onset came less than 150 ms later (sixteenths from 110 BPM, eighths from 210 BPM) the next window opened before this note's onset and an on-time note was rejected on pitch. The owner chose to split the gap at the midpoint. Nothing changes for notes 300 ms or more apart. The owner approved the version 0.2 text on 2026-09-29; it stays DRAFT until the note acknowledgement code implementing it lands. Version 0.3 (2026-10-03, on the owner decisions of that day) only adds that the 150 ms and 200 ms values ship untuned in v2.0 and are tuned on the reference hardware in v2.4, any other value needing the owner's sign-off; the window rule itself is unchanged.
---

# Expected-Note Timing Window

## INTENT
Give every expected note a fair timing window in which the player's note can count.

## THE RULE / LOGIC
Every fresh attack in the generated phrase is an expected note: a tie continuation belongs to its original attack, and rests have none. Each expected note has a timing window, and consecutive expected notes share a boundary: the later of 150 ms before the next note's onset and the point halfway between the two onsets. A note's window closes at the later of 200 ms after its onset or the end of its full, possibly tied, sounding span, but never after the boundary with the next expected note; the next note's window opens at that boundary. An expected note with no earlier expected note opens its window 150 ms before its onset. Because the boundary always lies strictly between the two onsets, every window contains its own onset, however close the notes are; when two onsets are 300 ms or more apart, the boundary is simply 150 ms before the next onset. Windows include both of their ends, so a played note exactly on a boundary lies in both windows; at such a shared instant, the earliest unmatched expected note whose pitch matches the played note takes it. The last expected note of a phrase is bounded by the next phrase's first expected note in the same way; while the next phrase is not yet known, its window is not cut short by it. The 150 ms and 200 ms values are starting values: v2.0 ships them as they are, untuned, and they are tuned on the reference hardware in the later real-hardware release, v2.4; a value other than 150 ms early and 200 ms late needs the product owner's sign-off.

## TECHNICAL INTERFACE
Expected notes and their windows are derived from the phrase's timeline on the audio clock and, for the phrase's last expected note, from the next phrase's first expected note once that phrase is known.

## EXPECTATION
- Each fresh attack yields exactly one expected note; ties and rests yield none of their own.
- A short note followed by a rest, with the next onset 400 ms later, has a window from 150 ms before its onset to 200 ms after it, although it stops sounding sooner; played on time, it is matched.
- A long tied note (a half note tied to a quarter at 120 BPM, sounding 1500 ms) followed directly by the next note has a window from 150 ms before its onset to 150 ms before the next onset; played on time, it is matched.
- Sixteenths at 120 BPM (onsets 125 ms apart) share boundaries halfway between onsets, so each window runs from 62.5 ms before to 62.5 ms after its onset; every sixteenth played on time is matched, and none is rejected as a wrong pitch for the following note.
- Eighths at 240 BPM (onsets 125 ms apart) get the same windows as those sixteenths; every eighth played on time is matched.
- For any spacing, every window contains its own onset; when onsets are 300 ms or more apart, each window opens exactly 150 ms before its onset.
- A played note exactly on a shared boundary goes to the earliest unmatched expected note whose pitch matches it.
- The last expected note of a phrase is bounded by the next phrase's first expected note in the same way; before the next phrase is known, its window closes at the later of 200 ms after its onset or the end of its sounding span.
- v2.0 ships the windows with their 150 ms and 200 ms starting values; tuning them on the reference hardware is a v2.4 check, and any other value needs the product owner's sign-off.
