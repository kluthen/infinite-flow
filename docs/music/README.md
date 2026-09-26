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

## Shared Principles

- A generated result is a short phrase, not a sequence of independently random bars.
- A tension control changes observable musical choices such as harmonic function, non-chord-tone placement, rhythmic displacement, contour, leap size, and space. It is not an objective universal score.
- Strong expectations are style- and mode-dependent. Modal material does not automatically use dominant-to-tonic behavior that belongs to tonal practice.
- Range, breath, and difficulty constraints use a selected declarative instrument profile. First release supports C MIDI keyboard concert MIDI `48-72`, B-flat tenor saxophone `46-70`, and E-flat alto saxophone `51-75`, each with one resolved Low, Middle, or High window for the whole phrase. `Varying` deterministically selects a feasible window and never changes it mid-phrase; notation always shows the selected profile's own written pitch, with no independent display-mode selection.
- The Neutral and Jazz profiles share one diatonic harmony plan. Jazz may add only bounded melodic chromatic approaches/enclosures with immediate chord-tone resolution.
- Every local tension resolves before the final sounding event, while the phrase endpoint remains open. A tonic-closed ending is not a first-release option.
