---
id: entity_my_instrument
status: DRAFT
priority: 1
notes: Synced 2026-10-12 at the v3.0 wave-1 post-task sync, same version 0.1: chunk 16's code (merge d49e559) implements it; the technical interface now names the files and functions, and records that the paths rebuilding an intent from the controls alone refuse my-instrument until it travels through the worker and the session (chunk 17). Logic and expectation match the code and its linked tests. Status stays DRAFT; REVIEW proposed to the owner. Earlier: Created 2026-10-11 at DRAFT by the pre-code architecture capture for v3.0 build plan chunk 16, from master spec section 7.1 and spec D253, D254 and D257 (owner rulings). Describes intended v3.0 behaviour: no code implements it yet.
dependents: []
type: ENTITY
layer: ARCHITECTURE
version: 0.1
human_name: My Instrument
tags: [v3, release-v3.0, instrument-profile, my-instrument]
parents:
  - [[entity_instrument_profile]]
  - [[req_my_instrument]]
  - [[rule_my_instrument_range_limits]]
  - [[rule_my_instrument_transposition_named_interval]]
---

# My Instrument

## INTENT
Represent the player's own instrument as one saved record from which a valid instrument profile is derived, named by a fixed id kept apart from its display name.

## THE RULE / LOGIC
My instrument is one saved record, from which a validated instrument profile is derived.

Identity. Its id is the fixed literal `my-instrument`, one member of the instrument-profile id set alongside the three built-in ids. Saved settings, kept sessions and replay keys store that id, and it is never renamed. The display name is a separate, non-empty property the player may change at any time; it is never part of the id and never affects generation: two my instruments that differ only by display name generate the same phrase for the same request and seed.

Record. The record holds the id `my-instrument`; the template, the built-in profile id it was made from, to which the instrument control returns when my instrument is deleted; the display name; the written range, its lowest and highest written note as whole numbers, which is what the player sets and keeps; the transposition, as a number of octaves (a whole number from 0 up), a number of semitones (a whole number from 0 to 11) and one direction for the whole transposition, octaves included: lower, same or higher, as a written note sounds lower than written, at the same pitch, or higher; and the input kind, "MIDI controller", the only kind, stored so that a microphone kind can be added later without changing the record's shape. The direction is "same" exactly when octaves and semitones are both 0; a non-zero size always has lower or higher.

Derived, never entered. The transposition's size is 12 semitones per octave plus the semitones. The concert (sounding) range is the written range moved by that size in the transposition's direction: lower makes it sound lower. The interval name and letter-name steps come from a fixed table on the semitones: 0 unison (with octaves, one or more octaves), 1 minor second, 2 major second, 3 minor third, 4 major third, 5 perfect fourth, 6 augmented fourth, 7 perfect fifth, 8 minor sixth, 9 major sixth, 10 minor seventh, 11 major seventh, with letter-name steps 0, 1, 1, 2, 2, 3, 3, 4, 5, 5, 6, 6; each octave adds 12 semitones and 7 steps, so 1 octave and 2 semitones lower is a major ninth lower, 8 steps, the tenor saxophone's. The generator-facing instrument profile carries the concert range, the built-in profiles' register-window policy and window derivation algorithm, the chromatic/diatonic transposition pair with written = concert + chromatic (so "lower" gives positive chromatic and diatonic counts, "higher" negative ones), and the my-instrument display name.

Validity. Building my instrument refuses, with a reason, and never clamps: endpoints that are not whole numbers; a lowest written note not below the highest; a span under 24 semitones; a concert end outside MIDI notes 0 to 127 (the written notes have no bound of their own, and the octaves no bound but this one); a malformed transposition, being negative octaves, semitones outside 0 to 11, or a direction inconsistent with the size.

Carriage. The profile travels as data beside the generation controls, which name the instrument by id only. When the controls name `my-instrument`, the generation intent is given the my-instrument profile as data, and refuses a missing one or one whose id is not `my-instrument`; a built-in id still resolves from the built-in table, and a profile supplied for a built-in id is refused. A built-in template turned into my instrument without change gives the built-in's profile (concert range, window policy, derived windows and transposition), differing only in id and display name.

## TECHNICAL INTERFACE
`src/domain/profile/my-instrument.ts` exports `makeMyInstrument({ template, name, writtenRange, transposition })`, which returns the validated, deep-frozen `MyInstrument` (id, template, display name, written range, transposition, input kind `midi-controller`, the derived interval and the generator-facing `profile`) or throws `MyInstrumentError` carrying the refusal's reason code; `findMyInstrumentRefusal(input)`, which returns the first refusal (`MyInstrumentRefusal { reason, message }`) without throwing, checked in a fixed order: a blank name, a template that names no built-in, a malformed transposition, non-whole endpoints, then the range limits; and `myInstrumentDraftFromTemplate(templateId)`, a built-in's written range and transposition as a starting point. `src/domain/profile/transposition-interval.ts` holds the transposition (octaves, semitones, direction), its validation and the interval table (`deriveTranspositionInterval`, `instrumentTranspositionFor` and its inverse `transpositionFromInstrumentTransposition`). `src/domain/profile/instrument-profiles.ts` exports `MY_INSTRUMENT_ID` and the id set `InstrumentProfileId`, the three built-ins and `my-instrument`; `INSTRUMENT_PROFILE_IDS` stays the three built-ins. The generation controls accept the four ids (`ACCEPTED_INSTRUMENT_PROFILE_IDS` in `src/domain/controls/generation-controls.ts`), and the generation intent (`resolveInstrumentProfile` in `src/domain/generation/generation-intent.ts`) receives the my-instrument profile as data beside them. Until my instrument travels through the worker and the session, the paths that rebuild an intent from the controls alone (the session's attempt intents, the carry-in receiver, the worker's inbound message) refuse `my-instrument`.

## EXPECTATION
- My instrument's id is `my-instrument` whatever its display name; two my instruments differing only by display name generate the same phrase for the same request and seed.
- A written span of 23 semitones, or a lowest note not below the highest, is refused with its reason; a span of 24 is accepted.
- Non-whole endpoints, a concert end outside MIDI notes 0 to 127, or a malformed transposition is refused with its reason, never clamped.
- Every transposition from 0 to 11 semitones, with and without octaves, in each direction, derives the table's interval name and letter-name steps; 6 semitones is an augmented fourth; 1 octave and 2 semitones lower is a major ninth lower, 8 steps, chromatic +14 and diatonic +8.
- Changing the transposition keeps the written range and moves the concert range.
- Each built-in template turned into my instrument without change gives the built-in's profile, derived windows included, differing only in id and display name.
- The generation intent refuses a missing my-instrument profile, a profile whose id is not `my-instrument`, and a profile supplied for a built-in id.
