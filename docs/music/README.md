# Music Reference

Status: curated for first-release implementation

## Purpose

This folder separates supporting evidence, settled project policy, and implementation inference. The product specifications and BUSINESS atoms remain authoritative; these notes explain and operationalize them without expanding product scope. Quantitative musical choices that are not settled product behavior are labelled for listening-test calibration.

## Implementation Guides

- [Harmony planner policy](harmony-planner-policy.md): exact first-release collections, chord/event candidates, tonal/modal motion, tension scheduling, open endings, precedence, and failure.
- [Rhythm and phrase-structure policy](rhythm-phrase-structure.md): exact tick grids, density/silence interaction, syncopation/ties, anchors, gesture/answer construction, and validation.
- [Pitch planner and validation policy](pitch-planner-validation.md): candidate construction/ranking, Neutral/Jazz vocabulary, contour, leap/recovery/arpeggio state, orchestration, and whole-result validation.

These three documents are implementation policy derived from the [master specification](../../specs/first-release-master-spec.md) and planner boundaries. Profile and research documents below provide rationale and context; where wording differs, the master specification and these implementation guides control first-release implementation.

## Current Profiles

- [Neutral profile](neutral-profile.md): diatonic four-measure phrases in a selected major, minor, or modal collection.
- [Jazz profile](jazz-profile.md): the neutral harmonic plan with limited chromatic approaches and enclosures.
- [Lexicon](lexicon.md): the project's single music-theory lexicon: beginner definitions, app-specific meanings and control explanations, shared by player-facing text and implementation annotations.
- [Research sources](research-sources.md): retained theory sources and the specific questions they inform.
- [Saxophone profile ranges](saxophone-profile-ranges.md): adopted instrument ranges, whole-phrase register windows, and each profile's written-pitch transposition.
- [Melodic control models](melodic-control-models.md): tension/leapiness rationale and settled control precedence.

## Evidence and Historical Notes

- [Tension research](Melodic%20control%20models/tension.md): perceptual evidence and superseded tonic-only recommendations, labelled as historical.
- [Leapiness research](Melodic%20control%20models/leapiness.md): interval/recovery evidence and superseded prototype-range context.
- [Control-interaction research](Melodic%20control%20models/control-interaction.md): inspectability evidence and historical interaction inferences.
- [Saxophone range research](Saxophone%20profile%20ranges/saxophone-ranges.md): conventional compass evidence and the adopted conservative subset.
- [Register-window research](Saxophone%20profile%20ranges/register-windows.md): derivation, deterministic Varying policy, and labelled superseded placeholders.
- [Notation-transposition research](Saxophone%20profile%20ranges/notation-transposition.md): concert-to-written transforms and spelling evidence.

## v3 research (2026-10-07)

- [Embellishment catalogue](embellishment-catalogue.md): decorating figures and ornaments, what the generator writes today and how often, groundwork for the v3 embellishment flags.
- [Mutation catalogue](mutation-catalogue.md): rhythm mutations and motif-development changes, ranked by distance, groundwork for Jam's allowed-mutation list.
- [Key and mode estimation](key-and-mode-estimation.md): methods for guessing key and mode from a short melody, and the proposed ranking and seeded draw for Jam's suggestion.
- [Played-pattern recognition](played-pattern-recognition.md): musicians' words, game and system precedent, and matching approaches for played signals.

These are research, not settled policy: their proposals wait for the v3 spec sessions. Their sources are in [research sources](research-sources.md) and their terms in the [lexicon](lexicon.md).

## v3.3 research (2026-10-12)

- [Chord research](chord-research.md): seventh, sixth, suspended, extended and altered chords; the seventh chord on each degree of the seven modes, with available extensions and avoid notes; style plausibility; chord symbols and MusicXML kinds; how melodies treat sevenths; where a fourth chord note meets the code and atoms; facts for O165–O173 and O175. Groundwork for v3.3 richer chords (D261, D262), not settled policy.

## Shared Principles

- A generated result is a short phrase, not a sequence of independently random bars.
- A tension control changes observable musical choices such as harmonic function, non-chord-tone placement, rhythmic displacement, contour, leap size, and space. It is not an objective universal score.
- Strong expectations are style- and mode-dependent. Modal material does not automatically use dominant-to-tonic behavior that belongs to tonal practice.
- Range, breath, and difficulty constraints use a selected declarative instrument profile. First release supports C MIDI keyboard concert MIDI `48-72`, B-flat tenor saxophone `46-70`, and E-flat alto saxophone `51-75`, each with one resolved Low, Middle, or High window for the whole phrase. `Varying` deterministically selects a feasible window and never changes it mid-phrase; notation always shows the selected profile's own written pitch, with no independent display-mode selection.
- The Neutral and Jazz profiles share one diatonic harmony plan. Jazz may add only bounded melodic chromatic approaches/enclosures with immediate chord-tone resolution.
- Every local tension resolves before the final sounding event, while the phrase endpoint remains open. A tonic-closed ending is not a first-release option. In a v2 session, a phrase generated with carry-in may instead leave a large leap's recovery or a tense final note for the next phrase's first note to settle (see [joins between session phrases](pitch-planner-validation.md#joins-between-session-phrases-v2)).
