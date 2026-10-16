---
id: rule_transposition_check_sets_my_instrument
status: DRAFT
priority: 1
tags: [v3, release-v3.0, midi, instrument-profile]
parents:
  - [[req_my_instrument]]
  - [[rule_controller_connects_between_sessions]]
dependents: []
type: RULE
layer: BUSINESS
human_name: Transposition Check Can Set My Instrument
version: 0.4
---

# Transposition Check Can Set My Instrument

## INTENT
Turn a transposition mismatch found by the check into a lasting fix, in one step.

## THE RULE / LOGIC
From v3.0, when the controller-transposition check finds anything other than a match, it offers one action: use this for my instrument. Using it saves the result as my instrument's transposition and selects my instrument if another instrument was selected. The action is not offered when the transposition it would set would make a note of My instrument's written range sound outside the notes MIDI can carry (MIDI notes 0 to 127). It sets My instrument's transposition so that the written notes match what the controller plays, the offset in semitones mapping to its named interval, octaves included, and creates My instrument from the selected profile if there is none yet; My instrument's written range is kept. The player confirms it once; it is then saved, and the check need not be redone on later visits. When My instrument already exists and has kept sessions, that one confirmation also warns that changing its transposition erases every kept session played with it, and how many, and its action reads Use and erase; confirming saves the transposition and erases them, cancelling changes nothing. While My instrument has no kept session, the confirmation carries no warning. The app still applies no offset to played notes: they are compared at exactly the concert pitch received; changing the instrument's transposition is what makes the written part match the controller.

## TECHNICAL INTERFACE
On a non-matching result, the check offers use this for my instrument, unless the resulting transposition would make My instrument's written range sound outside MIDI notes 0 to 127; the action asks for one confirmation, saves the resulting transposition and selects my instrument.

## EXPECTATION
- After one confirmation, the action sets the transposition, as the named interval matching the offset found, so that the written notes match the controller, and the result survives a reload.
- When My instrument has kept sessions, the confirmation warns that they will be erased, and how many, with a Use and erase action; confirming sets the transposition and erases them, cancelling changes nothing.
- My instrument's written range is the same before and after the action.
- Played notes are still compared at the concert pitch received.
- When another instrument is selected, confirming the action saves the transposition to My instrument and selects My instrument.
- When the transposition found would make My instrument's written range sound outside MIDI notes 0 to 127, the action is not offered.
