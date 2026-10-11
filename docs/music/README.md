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

## v4 research (2026-10-11)

- [Arranging and accompaniment roles](arranging-and-roles.md): how arrangers give parts distinct jobs, a catalogue of accompaniment roles, the owner's three roles mapped onto it, minimum voice-leading rules, density, and the endgame mapping.
- [Accompaniment systems and adaptive music](accompaniment-systems.md): existing accompaniment software, technique families, answering a live player, adaptive game music, and showing several voices on the score.
- [Sound library survey](../sound-library-survey.md): Tone.js and the alternatives for v4's system-voice timbres and drums, with a recommendation and a spike plan.

Where the two music documents differ, the v4 spec session decides:

- **Comping** is a foundation role (harmony support) in the arranging research and the closest real-world model of a responding accompanist in the systems research. Both readings are sourced: comping supports the harmony and reacts to the soloist's gaps.
- **The first roles to build**: the arranging research suggests one role per family (foundation, highlight, contrast, respond); the systems research suggests a single responding voice that fills the lead's rests, as the smallest step.

These are research, not settled policy: their proposals wait for the v4 spec session. Their music sources are in [research sources](research-sources.md) (the survey keeps its software sources to itself) and their terms in the [lexicon](lexicon.md).

## Endgame research: musical identity (2026-10-11)

- [Musical identity](musical-identity.md): what makes a style, a character, a place or an event recognisable in music, a catalogue of identity constituents with what the app can express today, how few notes recognition takes, combining identities, status effects and worked examples.
- [Identity modelling](identity-modelling.md): how an identity could become generation weights: representations of style, hard constraints and soft weights, where each weight would act in today's pipeline, signature motifs, combining layers, a draft identity schema, learning and explaining identities.
- [Phrase-generation breadth review](generation-breadth-review.md): what generation methods were proposed, built, narrowed or lost over the versions, how style is expressed today, and whether to regroup configurations into style packs. It is an internal review of the repository's history (specs, decisions, code and commits), not web research.

Where these documents differ, the endgame spec sessions decide:

- **Layer order.** The breadth review stacks style pack, preset, character, then situation (location and event) modifiers on top; the identity modelling draft puts location and event below the speaker's (character's) identity, with status effects on top; the musical-identity research sees a division of labour rather than a strict ranking.
- **Whether an identity adds vocabulary.** The breadth review recommends that a character only restrict and weight its style pack, never unlock vocabulary; the musical-identity worked examples (register spikes, a signature progression, trills) and the identity schema's stored motifs need devices that today's generator lacks.

These are research, not settled policy: their proposals wait for the endgame spec sessions. The two web-research documents' sources are in [research sources](research-sources.md) and their terms in the [lexicon](lexicon.md).

## Shared Principles

- A generated result is a short phrase, not a sequence of independently random bars.
- A tension control changes observable musical choices such as harmonic function, non-chord-tone placement, rhythmic displacement, contour, leap size, and space. It is not an objective universal score.
- Strong expectations are style- and mode-dependent. Modal material does not automatically use dominant-to-tonic behavior that belongs to tonal practice.
- Range, breath, and difficulty constraints use a selected declarative instrument profile. First release supports C MIDI keyboard concert MIDI `48-72`, B-flat tenor saxophone `46-70`, and E-flat alto saxophone `51-75`, each with one resolved Low, Middle, or High window for the whole phrase. `Varying` deterministically selects a feasible window and never changes it mid-phrase; notation always shows the selected profile's own written pitch, with no independent display-mode selection.
- The Neutral and Jazz profiles share one diatonic harmony plan. Jazz may add only bounded melodic chromatic approaches/enclosures with immediate chord-tone resolution.
- Every local tension resolves before the final sounding event, while the phrase endpoint remains open. A tonic-closed ending is not a first-release option. In a v2 session, a phrase generated with carry-in may instead leave a large leap's recovery or a tense final note for the next phrase's first note to settle (see [joins between session phrases](pitch-planner-validation.md#joins-between-session-phrases-v2)).
