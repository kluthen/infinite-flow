---
id: vision_infinite_flow_first_release
status: STABLE
layer: BUSINESS
version: 0.7
parents: []
dependents: []
human_name: Infinite Flow Product Scope
type: VISION
priority: 1
tags: [scope, first-release, v2]
notes: Accepted for v2.0 as it stands by the product owner on 2026-10-06 (spec D198) - status DRAFT to STABLE at version 0.7; the owner plans to rewrite the vision entirely later, a rewrite not yet scheduled that blocks nothing. Revised in the same change from version 0.6, on spec D193 and D199 only - the v2.4 line now says which real-hardware checks block the v2.0 tag (the controller-transposition check on the reference breath controller, the windows and latency tuned with it, the playhead and main-thread timing) and which follow it as v2.0.x hand checks (the same checks with a USB keyboard, and real exports opened in a notation program, a MIDI tool and a DAW); nothing else changed. Earlier history - Revised 2026-09-29 by v2 spec ingestion (previous version 0.3, titled Infinite Flow First-Release Scope, scoped the first release only and excluded MIDI controller input, match feedback, backing, and continuous generation, all of which v2 brings in), then revised 2026-10-03 from version 0.4 to 0.5 on the owner decisions of 2026-10-03 (the real-hardware checks move to a new release v2.4; the chord-fit check leaves v2 for v3 as an uncommitted nice-to-have). Both revisions are PENDING OWNER SIGN-OFF. Revised 2026-10-05 from version 0.5 to 0.6 on spec D183 only: v2 ships as one release, v2.0, and v2.1, v2.2 and v2.4 name parts of its scope, so the statement that v2.0 can ship before a later v2.4 release is gone; nothing else changed. Still PENDING OWNER SIGN-OFF of the whole vision.
---

# Infinite Flow Product Scope

## INTENT
Establish Infinite Flow as a browser-based, client-side practice partner for a monophonic musician that acknowledges and encourages, never penalizing, grading, ranking or scoring the player.

## THE RULE / LOGIC
The shipped first release proposes a harmonic context and a playable melodic response as one four-measure staff-notated phrase for a selected C MIDI keyboard, B-flat tenor saxophone, or E-flat alto saxophone profile, under player-selected musical controls, which the player explicitly regenerates to hear a new variation. Notation always shows the selected instrument's written pitch.

Version 2, delivered as one release, v2.0, whose scope is named in the parts below (v2.1, v2.2 and v2.4 name parts of it, not releases of their own; the number v2.3 is not used), turns that static phrase into a continuous practice session for one local player, entirely in the browser:

- v2.0 core: a rolling sequence of phrases joined so the ear does not notice a seam; a simple, deterministic backing track (bass and block chords) with a metronome click and a one-measure count-in; sessions that start, run, and stop or time out; reading one MIDI controller and acknowledging only the notes the player gets right, with a one-time controller-transposition check; a review of the last session; export of the session's generated notes to MusicXML or MIDI.
- v2.1: played notes shown in the review on a toggle and exportable as their own MIDI file; an opt-in, visible settings-mutation flag that lets the app quietly vary its own generation settings during a session.
- v2.2: opt-in adaptive tempo rising on a fixed schedule; an opt-in multi-phrase tension arc.
- v2.4: the checks that need the reference hardware or real programs, which block the v2.0 tag: the controller-transposition check on the reference breath controller, the acknowledgement windows and latency tuned with it, and the playhead and main-thread timing measured in a real Chromium browser. The same checks with a USB keyboard, and real exports opened in a notation program, a MIDI tool and a digital audio workstation, follow the tag as v2.0.x hand checks.

Anything that adapts during a session is opt-in and visible. A session continues only from the app's own generated material.

Out of scope through v2: generation seeded from anything the player played; remembering a specific controller, its transposition offset or its latency across sessions; a player-facing latency calibration step; favorite phrases and exporting only favorites; persistence of anything across a page reload; reviewing any session other than the most recent one; editing, cutting or splicing generated material; a quiet, per-measure acknowledgement for a player who embellishes or improvises in a way that fits the harmony (the end-of-measure chord-fit check), which is a nice-to-have for v3, not committed scope; accompaniment with musical roles (harmonizing, responding, contrasting); playback of the generated lead line; a staff-only session view; microphone capture or acoustic pitch detection; accounts, sharing or server-side state; browsers other than Chromium-based ones. Permanently out of scope: any grading, scoring, ranking or wrong-note signal, in any view, at any point.

## TECHNICAL INTERFACE
At Idle the app accepts a selected supported instrument profile, player-selected musical controls with the key chosen as written for that instrument, and an explicit regeneration action; notation always shows the selected instrument's written pitch, with no separate display-mode choice. From v2 it adds starting and stopping a session, the audio mix, an optional "Connect controller" step, the review of the last session with its export actions, and opt-in flags for settings mutation, adaptive tempo and the multi-phrase tension arc.

## EXPECTATION
Scope decisions keep the product a non-evaluative, browser-only practice partner. Every business atom falls within the first release or the v2 scope above (release v2.0, with its parts v2.1, v2.2 and v2.4), except atoms tagged as a v3 nice-to-have, which record a definition kept for when it is scheduled and commit no release to it; nothing listed as out of scope enters a release without this scope being changed first; nothing ever grades, scores, ranks or marks the player wrong.
