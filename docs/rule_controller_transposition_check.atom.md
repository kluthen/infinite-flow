---
id: rule_controller_transposition_check
status: STABLE
priority: 1
human_name: Controller-Transposition Check
tags: [v2, release-v2.0, v2.4-check, midi]
type: RULE
layer: BUSINESS
version: 0.5
parents:
  - [[rule_controller_connects_between_sessions]]
dependents: []
---

# Controller-Transposition Check

## INTENT
Catch a controller and instrument profile that silently disagree about transposition.

## THE RULE / LOGIC
A wind or breath controller and a written-pitch instrument profile can silently disagree: for example, a controller left at its factory default sends untransposed MIDI, while a tenor-saxophone profile expects concert pitch 14 semitones below written pitch. Since acknowledgement never gives a mismatch hint, a player in that state would get total silence with no clue why. As part of connecting a controller, the app runs a one-time check, re-runnable between sessions only: it shows one written note from the instrument's own range, the player plays it, and the app reports "matches", "transposed by n octaves" or "transposed by n semitones", suggesting either a device setting to change or a better-matching instrument profile. From v3.0, on any result other than a match, the check also offers a third outcome, use this for my instrument, which sets my instrument's transposition from the result; it is not offered when that transposition would make a note of my instrument's written range sound outside the notes MIDI can carry (MIDI notes 0 to 127). When my instrument already has kept sessions, that action's one confirmation first warns that changing its transposition erases every kept session played with it, and how many, and its action reads Use and erase; confirming erases them, cancelling changes nothing. A controller reattached by itself, the same device coming back within a page or the remembered controller reselected at load, is not checked again; the player can run the check again between sessions. No note played during the check can start a session, even one that happens to be phrase 1's first note. The check ships regardless of any later decision about a manual input-transposition setting.

## TECHNICAL INTERFACE
The connection step shows one written note and reports the played note's constant offset from its expected concert pitch. On a result other than a match it also offers use this for my instrument, unless the transposition found would make my instrument's written range sound outside MIDI notes 0 to 127; while my instrument has kept sessions, its confirmation warns that they will be erased, with how many, and its action reads Use and erase.

## EXPECTATION
- The check correctly reports a match, a constant octave offset or a constant semitone offset for injected test offsets.
- It can be re-run only between sessions, and no note played during it starts a session.
- Its verification on the reference hardware is one of the real-hardware checks of the v2.0 release gate: with the device's own transpose setting at each of C, B♭ tenor and E♭ alto, confirm which MIDI note the check's written note actually sends (written C5 for the B♭ tenor and E♭ alto saxophone profiles, written C4, middle C, for the C MIDI keyboard profile), whether an octave setting changes it, and what note-on velocity it uses. The same check with a USB keyboard follows the v2.0 tag as a v2.0.x hand check.
- On a result other than a match, the check offers use this for my instrument, except when the transposition found would make my instrument's written range sound outside MIDI notes 0 to 127.
- When my instrument has kept sessions, that action's confirmation warns that they will be erased, and how many, with a Use and erase action; cancelling changes nothing.
- A controller reattached by itself, within a page or reselected at load, is not checked again; the check can still be run between sessions.
