---
id: module_harmony_candidate_domain
status: REVIEW
human_name: Harmony Candidate Domain
layer: ARCHITECTURE
parents:
  - [[rule_jazz_chromatic_resolution]]
  - [[rule_neutral_profile_diatonic_harmony]]
  - [[rule_open_phrase_ending]]
  - [[rule_seventh_chords_diatonic_only]]
  - [[rule_seventh_chords_keep_the_chord_plan]]
  - [[rule_tension_arc_build]]
  - [[rule_tension_arc_edge]]
  - [[rule_tension_arc_level_policy]]
  - [[rule_tension_arc_lift]]
  - [[rule_tension_arc_settled]]
  - [[rule_tension_ranking_respects_constraints]]
  - [[user_story_controlled_phrase_generation]]
type: MODULE
version: 0.5
priority: 1
tags: harmony,candidate-domain,step5
dependents: []
---

# Harmony Candidate Domain

## INTENT
Produce an immutable, canonical structural harmony-candidate domain from normalized musical inputs before any generation-stage selection occurs.

## THE RULE / LOGIC
This pure domain boundary consumes a normalized tonal center, collection, harmonic motion and tension arc, and no musical profile, preset, figure levels or Seventh chords level: the domain is the same whatever the levels. It constructs the exact selected diatonic collection, its diatonic triads and, on each degree d, the seventh chord the collection gives there (degrees d, d+2, d+4 and d+6), then expands the applicable tonal or modal harmonic templates in one explicit canonical order. A seventh chord's quality comes from its intervals: a major triad with a major seventh is a major seventh chord, a minor triad with a minor seventh a minor seventh chord, a major triad with a minor seventh a dominant seventh chord, and a diminished triad with a minor seventh a half-diminished seventh chord; any other shape is refused with an error, as a triad shape outside the three triad qualities is. A harmony event holds its degree's triad and may also hold that degree's seventh, given as the seventh's pitch class and the seventh chord's quality; in triad form the seventh is absent, never null, so a triad-form event, its candidate and its structural identity are exactly what they were before the seventh existed. A chord's tones are read in one place, which gives the three pitch classes of a triad-form event and the four of a seventh-form one, while the event's triad stays the triad for every reader that needs the triad: the endings, the join's comparison and the colour chords (a modal plan's chord that holds the mode's characteristic note). Every candidate the domain emits is in triad form, at every Seventh chords level: a candidate's seventh forms are placed after ranking, outside this boundary, by the plan variants generation builds from it (service_generation_orchestration), which keep its degrees, roles, templates, endpoint class and colour chords. Each expansion emits an immutable harmony candidate with quarter-boundary harmonic events, a stable structural identity, contiguous zero-based indices, endpoint classes, and abstract tension requirements. Candidate construction encodes the diatonic constraints of the selected collection, which no figure alters (chromatic approaches and enclosures are written by the pitch search over this diatonic plan, never as altered harmony), the selected tension-arc requirements, and open-ending endpoint requirements. The module neither seeds nor draws randomness, binds rhythm or onsets, evaluates register or instrument feasibility, plans contour or pitches, ranks or selects candidates, nor orchestrates. Vue, browser, session, storage, and every other presentation/runtime dependency are outside this boundary. It returns the typed no_legal_harmony_plan outcome only when the constructed structural domain is empty; a nonempty domain is returned without ranking or selection.

## TECHNICAL INTERFACE
Callers provide normalized tonal center, collection, harmonic-motion and tension-arc inputs (HarmonyPlannerInput, src/domain/harmony/harmony-types.ts) to makeHarmonyCandidateDomain (src/domain/harmony/harmony-planner.ts). On success they receive an immutable ordered structural harmony domain containing exact diatonic collections, triads, the seventh chord on each degree, and zero or more canonical harmony candidates. makeHarmonyCollection (src/domain/harmony/collection.ts) gives, beside the collection's seven triads, its seventhChords: the seventh chord on each degree, in degree order (DiatonicSeventhChord: the degree, its four pitch classes root first, and its quality), the quality from deriveSeventhQuality, which throws on any other shape. harmony-types.ts exports SeventhQuality ('major-seventh', 'minor-seventh', 'dominant-seventh' or 'half-diminished-seventh'); HarmonyEvent keeps its triad (DiatonicTriad) and has an optional seventh (ChordSeventh: the seventh's pitchClass and its SeventhQuality), absent in triad form; chordTones(event) gives the event's three or four pitch classes, and event.triad its triad. Each candidate exposes immutable quarter-boundary events, one stable structural identity, contiguous zero-based indices, one endpoint class, and abstract tension requirements. If and only if the structural domain has no candidates, the operation returns the typed no_legal_harmony_plan outcome. The interface accepts no musical profile, preset, figure levels or Seventh chords level, no seed, random source, rhythm/onset plan, register or instrument data, contour/pitch plan, candidate-ranking policy, selection policy, orchestration dependency, or Vue/browser/session/storage dependency.

## EXPECTATION
For identical normalized inputs, the boundary returns the same immutable domain and canonical candidate order, whatever musical profile, figure levels or Seventh chords level the request holds. Every returned candidate uses only exact diatonic collection and triad material, is in triad form, has quarter-boundary events, a stable identity, contiguous zero-based indices, an endpoint class consistent with the open-ending policy, and abstract tension requirements consistent with the selected tension arc. The collection's seventh chord on each degree is the one its degrees give: in Major, a major seventh, minor seventh, minor seventh, major seventh, dominant seventh, minor seventh and half-diminished seventh chord on degrees 1 to 7, each mode holding the same seven in rotation; a shape outside the four qualities is refused. A triad-form event holds no seventh key and serializes byte for byte as before. A nonempty structural domain never yields no_legal_harmony_plan. The boundary never performs randomness, rhythm binding, feasibility evaluation, pitch or contour planning, ranking, selection, orchestration, or runtime/presentation work.
