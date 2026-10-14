---
id: module_session_carry_in_after_change
status: REVIEW
layer: ARCHITECTURE
version: 0.1
priority: 1
tags: session,look-ahead,carry-in
dependents: []
human_name: Session Carry-In After A Settings Change
parents:
  - [[entity_phrase_carry_in]]
  - [[rule_harmony_change_drops_unfit_harmonic_carry_in]]
  - [[rule_key_change_drops_harmonic_carry_in]]
  - [[rule_register_change_replaces_carried_window]]
  - [[rule_setting_change_rechecks_pitch_carry_in]]
  - [[rule_varying_register_once_per_session]]
  - [[service_session_engine]]
type: MODULE
---

# Session Carry-In After A Settings Change

## INTENT
Build every attempt of a session look-ahead phrase from one basis, adapting the carry-in from the phrase before to any settings change between the two.

## THE RULE / LOGIC
Every look-ahead phrase carries a basis that all its attempts are built from: the settings it is generated under (the settings in effect when it was opened, with its tension-arc cycle step), the settings its phrase before was generated under, its step included (for a repeat, those of the phrase it repeats), and its source, either the carry-in, as adapted to any change between the two, or a standalone generation with a given register. When neither the register nor a setting the harmony check reads (tonal center, collection, harmonic motion, tension, musical profile) changed between the two, the carry-in is used as it is. With a standalone source, every rung of the ladder, the first included, is a standalone attempt with that register, keeping the rung's retry count, and an accepted phrase's origin is the step its attempt actually took. The first phrase requested under changed settings gets a re-checked carry-in. Its harmonic part is dropped after a key or collection change, or when the final harmony no longer fits the new harmony settings. A register change to Low, Middle or High replaces the carried window with the new register's resolved window. The pitch part is then re-checked against the new range and register window and, for an owed leap recovery, the new collection; if it fails, the request is built standalone, its register window pinned to the session's window after the change, as the ladder's standalone retry is. A change to Varying drops the carry-in, and the request is built standalone with Varying, so the window is resolved again as for phrase 1.

## TECHNICAL INTERFACE
The look-ahead basis is `LookAheadBasis` in `src/session/failure-ladder.ts`, built by `lookAheadBasis` in `src/session/session-settings-change.ts`; the carry-in adaptation is `adaptCarryIn` in `src/session/carry-in-adaptation.ts`.

## EXPECTATION
After a change, the next requested phrase carries in without harmony after a key or collection change or an unfit final harmony, with the new register's window after a register change, and is standalone in the session's current window when the pitch re-check fails, or standalone with Varying after a change to Varying.
