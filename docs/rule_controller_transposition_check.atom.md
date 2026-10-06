---
id: rule_controller_transposition_check
status: STABLE
priority: 1
human_name: Controller-Transposition Check
tags: [v2, release-v2.0, v2.4-check, midi]
type: RULE
layer: BUSINESS
version: 0.4
parents:
  - [[rule_controller_connects_between_sessions]]
dependents: []
notes: Status REVIEW to STABLE on 2026-10-06 with the product owner's approval, given in the knowledge that the USB keyboard check and the device octave setting were not played (both follow the v2.0 tag), together with the matching CONTRACT 1.4 MINOR bump the owner confirmed the same day. Revised 2026-10-06 (previous version 0.3) - the expectation named a written middle C, but the check shows the C nearest the middle of the profile written range, written C5 for both saxophone profiles and written C4 for the C MIDI keyboard profile, as the code and its tests do; and, on the product owner ruling of 2026-10-06 (spec D199), the USB keyboard check follows the v2.0 tag as a v2.0.x hand check. Verified 2026-10-06 on the reference breath controller (Travel Sax 2 over USB, Debian Chrome on the reference machine, hardware checklist part A) - every verdict and suggestion the check gave was correct, and the device own transpose setting always reached a match (-2 for the B-flat tenor profile, +3 for the E-flat alto profile, +12 for written pitch, which the check rightly matched to the C MIDI keyboard profile), so no manual input-transposition setting is needed for it. At 0 the device sends the fingered written note an octave down (written C5 sends 60). Velocity follows the attack (80 to 116 seen) once the device fixed-velocity option (127) is off. Not played - the 0 setting (inferred from the other rows) and the octave setting itself (the octave shift was checked through the transpose setting); the USB keyboard check is pending. Rule text unchanged; status stays REVIEW until the product owner confirms it. Revised 2026-10-05 (previous version 0.2). Instrument template becomes instrument profile, the wording v2 chunk 13 proposed and the product owner accepted (spec D186). The reference-hardware verification is now one of the real-hardware checks of the single v2.0 release gate (spec D183), no longer of a later release.
---

# Controller-Transposition Check

## INTENT
Catch a controller and instrument profile that silently disagree about transposition.

## THE RULE / LOGIC
A wind or breath controller and a written-pitch instrument profile can silently disagree: for example, a controller left at its factory default sends untransposed MIDI, while a tenor-saxophone profile expects concert pitch 14 semitones below written pitch. Since acknowledgement never gives a mismatch hint, a player in that state would get total silence with no clue why. As part of connecting a controller, the app runs a one-time check, re-runnable between sessions only: it shows one written note from the instrument's own range, the player plays it, and the app reports "matches", "transposed by n octaves" or "transposed by n semitones", suggesting either a device setting to change or a better-matching instrument profile. No note played during the check can start a session, even one that happens to be phrase 1's first note. The check ships regardless of any later decision about a manual input-transposition setting.

## TECHNICAL INTERFACE
The connection step shows one written note and reports the played note's constant offset from its expected concert pitch.

## EXPECTATION
- The check correctly reports a match, a constant octave offset or a constant semitone offset for injected test offsets.
- It can be re-run only between sessions, and no note played during it starts a session.
- Its verification on the reference hardware is one of the real-hardware checks of the v2.0 release gate: with the device's own transpose setting at each of C, B♭ tenor and E♭ alto, confirm which MIDI note the check's written note actually sends (written C5 for the B♭ tenor and E♭ alto saxophone profiles, written C4, middle C, for the C MIDI keyboard profile), whether an octave setting changes it, and what note-on velocity it uses. The same check with a USB keyboard follows the v2.0 tag as a v2.0.x hand check.
