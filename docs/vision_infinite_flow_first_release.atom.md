---
id: vision_infinite_flow_first_release
status: DRAFT
layer: BUSINESS
version: 0.4
parents: []
dependents: []
human_name: Infinite Flow Product Scope
type: VISION
priority: 1
tags: [scope, first-release, v2]
notes: Revised 2026-09-29 by v2 spec ingestion and PENDING OWNER SIGN-OFF (previous version 0.3, titled Infinite Flow First-Release Scope, scoped the first release only and excluded MIDI controller input, match feedback, backing, and continuous generation, all of which v2 brings in).
---

# Infinite Flow Product Scope

## INTENT
Establish Infinite Flow as a browser-based, client-side practice partner for a monophonic musician that acknowledges and encourages, never penalizing, grading, ranking or scoring the player.

## THE RULE / LOGIC
The shipped first release proposes a harmonic context and a playable melodic response as one four-measure staff-notated phrase for a selected C MIDI keyboard, B-flat tenor saxophone, or E-flat alto saxophone profile, under player-selected musical controls, which the player explicitly regenerates to hear a new variation. Notation always shows the selected instrument's written pitch.

Version 2, delivered as releases v2.0 through v2.3, turns that static phrase into a continuous practice session for one local player, entirely in the browser:

- v2.0: a rolling sequence of phrases joined so the ear does not notice a seam; a simple, deterministic backing track (bass and block chords) with a metronome click and a one-measure count-in; sessions that start, run, and stop or time out; reading one MIDI controller and acknowledging only the notes the player gets right, with a one-time controller-transposition check; a review of the last session; export of the session's generated notes to MusicXML or MIDI.
- v2.1: played notes shown in the review on a toggle and exportable as their own MIDI file; an opt-in, visible settings-mutation flag that lets the app quietly vary its own generation settings during a session.
- v2.2: opt-in adaptive tempo rising on a fixed schedule; an opt-in multi-phrase tension arc.
- v2.3: a quiet, per-measure acknowledgement for a player who embellishes or improvises in a way that fits the harmony.

Anything that adapts during a session is opt-in and visible. A session continues only from the app's own generated material.

Out of scope through v2: generation seeded from anything the player played; remembering a specific controller, its transposition offset or its latency across sessions; a player-facing latency calibration step; favorite phrases and exporting only favorites; persistence of anything across a page reload; reviewing any session other than the most recent one; editing, cutting or splicing generated material; accompaniment with musical roles (harmonizing, responding, contrasting); playback of the generated lead line; a staff-only session view; microphone capture or acoustic pitch detection; accounts, sharing or server-side state; browsers other than Chromium-based ones. Permanently out of scope: any grading, scoring, ranking or wrong-note signal, in any view, at any point.

## TECHNICAL INTERFACE
At Idle the app accepts a selected supported instrument profile, player-selected musical controls with the key chosen as written for that instrument, and an explicit regeneration action; notation always shows the selected instrument's written pitch, with no separate display-mode choice. From v2 it adds starting and stopping a session, the audio mix, an optional "Connect controller" step, the review of the last session with its export actions, and opt-in flags for settings mutation, adaptive tempo and the multi-phrase tension arc.

## EXPECTATION
Scope decisions keep the product a non-evaluative, browser-only practice partner. Every business atom falls within the first release or the v2.0 to v2.3 scope above; nothing listed as out of scope enters without this scope being changed first; nothing ever grades, scores, ranks or marks the player wrong.
