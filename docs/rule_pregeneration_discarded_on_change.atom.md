---
id: rule_pregeneration_discarded_on_change
status: DRAFT
type: RULE
tags: [v3, release-v3.0, idle, generation, changes-in-v3.1, changes-in-v3.2]
parents:
  - [[req_idle_pregeneration]]
layer: BUSINESS
version: 0.3
priority: 1
human_name: Pre-Generated Phrases Discarded on Change
dependents:
  - [[module_idle_pregeneration_queue]]
---

# Pre-Generated Phrases Discarded on Change

## INTENT
Never start a session on phrases made for settings or a phrase 1 that no longer hold.

## THE RULE / LOGIC
From v3.0, anything at Idle that replaces phrase 1 or changes a setting phrases are generated from (a generation control, the musical profile, the instrument, a regeneration) discards every pre-generated phrase, and pre-generation starts again after the new phrase 1. So does a change to either of the two session options that shape later phrases, Vary settings and Tension across phrases. A change of the tempo or of Rising tempo discards nothing, since tempo never affects generation; nor does a change of my instrument's clef alone, or of its display name, since no phrase is generated from either. A change of window size that changes the note density phrases would be generated with, or the staff layout a session would hold, re-checks the pre-generated phrases instead: the first one that no longer fits is discarded together with every phrase after it. A save of my instrument that changes the staff's shared height without discarding them, such as a change of its clef, or of its range while another profile is selected, re-checks them the same way.

## TECHNICAL INTERFACE
Setting, session-option and phrase 1 changes clear the pre-generated queue; tempo, Rising tempo and my instrument's clef and name changes leave it; window-size changes, and saves of my instrument that change the staff's shared height, truncate it at the first phrase that no longer fits.

## EXPECTATION
- A settings change, a change to Vary settings or Tension across phrases, or a new phrase 1 discards every pre-generated phrase.
- A change of the tempo or of Rising tempo keeps the pre-generated phrases, and so does a change of my instrument's clef or display name alone.
- After a window-size change, the first pre-generated phrase that no longer fits, and every phrase after it, are discarded.
- After a save of my instrument that changes the staff's shared height without discarding them, the pre-generated phrases are checked again as after a window-size change.
