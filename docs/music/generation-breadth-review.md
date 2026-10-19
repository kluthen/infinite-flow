# Phrase-Generation Breadth Review

Status: internal research (2026-10-11); not settled policy.

## Purpose

The owner believes that over the versions we **cut short the breadth of phrase generation**: the
set of methods and musical vocabulary the generator can use to write a phrase. The owner also
asks whether generators, or known configurations of the generator, should be **regrouped by
style or dialect**.

This review answers four questions:

1. What generation methods were ever proposed, specced, prototyped or built, and what happened to
   each?
2. Was breadth really cut, or only never grown?
3. How is "style" expressed in today's generator, and where would a style grouping plug in?
4. Should configurations be regrouped into style packs, and how would that fit v3.1 presets, v4
   accompaniment roles and the endgame's musical identity?

It changes no code, spec or atom and decides nothing. Everything marked **(inference)** is the
author's reading for the spec session.

### Terms used here

- **Style**: a musical language shared by many musicians, for example bebop, a
  folk reel or Baroque music. It is a set of habits: which scales and chords, which rhythms,
  which ornaments.
- **Dialect**: in musicology, a sub-level of a style shared by a group, for example the Italian
  and French dialects of Baroque music. Leonard B. Meyer's _Style and Music_ (1989) ranks the
  levels as style, dialect, then an individual's idiom. In this project "style" and "dialect" can
  be treated as the same layer: the shared one.
- **Idiolect**: one individual's own way of playing within a style. In the endgame this is a
  character's identity.
- **Generator**: Infinite Flow has **one** phrase generator. "Several generators" in this review
  means several _configurations_ of that one generator (profiles, presets), unless it says
  otherwise.

> ℹ️ **Music theory:** "dialect" and "style" are not quite synonyms. A **style** is the broad
> shared language (Baroque); a **dialect** is a regional or school variant inside it (French
> Baroque). For this project the distinction rarely matters: both are _shared_ habits, as opposed
> to an **idiolect**, which belongs to one player or character.

## How this was gathered

- **Spec and decision trail:** the live register [`specs/decisions.md`](../../specs/decisions.md)
  (D208 onward) and the four archives:
  [D1–D46](../../specs/archive/v1/decisions-D1-D46.md),
  [D47–D71](../../specs/archive/2026-09-25-personas-and-vision/decisions-D47-D71.md),
  [D72–D108](../../specs/archive/v2/decisions-D72-D108.md),
  [D109–D207](../../specs/archive/v2/decisions-D109-D207.md). Also
  [`specs/generator-architecture.md`](../../specs/generator-architecture.md),
  [`specs/versions/prerequisites.md`](../../specs/versions/prerequisites.md), the version READMEs
  and v3 drafts, [`docs/release/deferred-scope.md`](../release/deferred-scope.md),
  [`precusor.md`](../../precusor.md), [`issues/`](../../issues/) and the music research in this
  folder.
- **Code:** `src/domain/**` and `src/generation-worker/**` at this worktree's HEAD, which has the
  same `src/` and `tests/` as `main`.
- **History:** `git log`, `git log -S` and `git show` on `main` (394 commits). Commit hashes are
  short hashes on `main`.
- **Perf worktree:** `../infinite_flow-perf-investigation` (untracked "variant B"), read only.
- Two read-only sweeps (one for specs, one for code and history) gathered the raw material. Key
  citations were then spot-checked by hand.

## Inventory

**Status values.** _Built_: in the code today. _Narrowed_: built, then made smaller.
_Superseded_: replaced by another mechanism. _Deferred (vN)_: still planned for a named version.
_Deferred, unscheduled_: named as later, with no version. _Never revisited_: proposed once, not
decided again either way. _Cut_: refused outright.

### Harmony

Harmony is the chords under the melody.

| Method                                                                                     | Status                                    | Version | Decision / commit     | Reason                                               |
| ------------------------------------------------------------------------------------------ | ----------------------------------------- | ------- | --------------------- | ---------------------------------------------------- |
| Diatonic root-position triads; static, gentle and active four-bar templates; modal colours | Built                                     | v1      | D11, D13              | Conservative, deterministic                          |
| Seventh chords, inversions, suspended chords, slash chords                                 | Never revisited                           | v1      | none                  | Scope                                                |
| Altered dominants, secondary dominants, tritone substitutions, borrowed chords, modulation | Deferred "to later profiles", unscheduled | v1      | D12                   | Scope; keep profiles separable                       |
| Player chooses the chord progression                                                       | Never revisited                           | v1      | D13                   | Scope                                                |
| Jazz with its own harmony                                                                  | Cut: Neutral and Jazz share one plan      | v1      | D41                   | Tests the profile contract                           |
| Closed tonic ending (a cadence on the home chord)                                          | Deferred, unscheduled ("a later option")  | v1      | D28                   | Open endings invite continuing                       |
| Phrase-end controls                                                                        | Dropped from the live roadmap silently    | pre-v2  | none                  | None recorded                                        |
| Precursor 4/8-bar tension cycle peaking on an altered dominant                             | Superseded by the diatonic Tension arc    | v1      | D33                   | Scope                                                |
| Multi-phrase tension arc over several phrases                                              | Built (opt-in four-phrase cycle)          | v2      | D99, D110, D178, D183 | Less cyclic flow                                     |
| Neutral default motion Static → Gentle; arpeggio chaos Predictable → Varied                | Narrowed defaults (in fact a widening)    | v2      | D172, `d3b68c1`       | Default phrase "collapsed onto two repeated pitches" |
| Harmonic minor, raised leading tone in modes                                               | Cut ("never gain a raised leading tone")  | v1      | D11                   | Collection-pure modes                                |

### Rhythm

| Method                                                                                 | Status                                            | Version | Decision / commit    | Reason                             |
| -------------------------------------------------------------------------------------- | ------------------------------------------------- | ------- | -------------------- | ---------------------------------- |
| Quarter, Eighth, Sixteenth densities on a sixteenth grid; silence budgets; syncopation | Built                                             | v1      | D19                  | n/a                                |
| Mixed note density                                                                     | Superseded by rhythmic variety                    | v1.0    | D59, D60, `9ad1a44`  | Redundant with Heavily varied      |
| Six blocked rhythm combinations                                                        | Narrowed limitation (Heavily varied never blocks) | v1.0    | D74                  | Grammar limit                      |
| Sixteenth density on narrow screens                                                    | Narrowed: generated as Eighth                     | v2      | D146–D148, `c0c4a2c` | Legibility on phones               |
| Meters other than 4/4; tuplets and triplets                                            | Deferred, unscheduled (file import, O48)          | v1      | D15                  | Grid policy                        |
| Swing and other pulse feels                                                            | Never revisited                                   | v1      | D15, D20             | Scope                              |
| Rhythmic palette per profile (ISS-004)                                                 | Became the rhythm ratios                          | v1.0    | ISS-004              | n/a                                |
| Rhythm ratios, rhythm editor, Custom density                                           | Deferred (v4)                                     | v3 → v4 | D175, D211           | Scope                              |
| Rhythm lock                                                                            | Narrowed to strict plus five chosen changes       | v3.2    | D232, D236           | Determinism, player agency         |
| Augmentation, diminution, metric displacement, durable mutations                       | Deferred (v4)                                     | v4      | D232                 | Grammar work                       |
| Pickup or tie across a phrase join                                                     | Deferred, then left unsolved                      | v2 → v3 | D105                 | Jam's gap bars make it unnecessary |
| Every legal answer-transform target enumerated                                         | Cut                                               | v1      | none                 | About 4× scan cost                 |
| Perf "variant B": stop after 16–32 rhythm candidates per seed                          | Prototyped, unmerged                              | none    | none                 | Cold latency; would narrow output  |

### Pitch and phrase structure

**Contour** is the overall shape of the line (rising, falling, arch). A **motif** is a short
musical idea that is repeated or developed. A **sequence** repeats a motif starting on another
pitch.

| Method                                                              | Status                                            | Version   | Decision / commit       | Reason                            |
| ------------------------------------------------------------------- | ------------------------------------------------- | --------- | ----------------------- | --------------------------------- |
| Contour, Register, Leapiness, Arpeggio chaos, arpeggio-run recovery | Built                                             | v1        | D14, D24, D33, D34, D82 | n/a                               |
| Precursor contours (Ascending, Descending, Chaotic, Leaping)        | Superseded by contour plus leapiness              | v1        | D14                     | Separable controls                |
| Hidden 0–1 tension that widens intervals or density                 | Superseded                                        | v1        | none                    | Explicit controls outrank tension |
| Precursor vocabulary tiers ("rootless 9ths", "Coltrane cells")      | Cut                                               | v1        | D12                     | Scope                             |
| Gesture and answer (bars 3–4 answer bars 1–2)                       | Built, **rhythm only**; pitch ignores it          | v1        | none                    | n/a                               |
| Carry-in joins between phrases                                      | Built                                             | v2        | D80, D105               | n/a                               |
| Carry-in for the second phrase at 240 BPM                           | Narrowed (standalone); win-back planned           | v2        | D203, D205, D206        | Performance (ISS-009)             |
| Phrase transformer seam (derive material from a seed)               | Never built; Jam used ranking preferences instead | v1 → v3.2 | D234                    | Planner authority (O10)           |
| Quoting the doodle; repetition, sequence, inversion, retrograde     | Deferred, unscheduled                             | v3.2      | D234                    | Needs a new pitch capability      |
| Sequence writing with an up-front rhythm grammar                    | Candidate (v4, v5 or v6), not in the v4 README    | none      | D210                    | Beyond preference weights         |
| Call and response; live answer                                      | v4 open question / endgame                        | v4+       | D71                     | n/a                               |
| "Phrase memory"                                                     | Never revisited                                   | none      | none                    | n/a                               |

### Embellishments

An **embellishment** (or figure) is a decorating note that leaves the chord and resolves back to
it, such as a [passing tone](lexicon.md#passing-tone) or an [enclosure](lexicon.md#enclosure).

| Method                                                                                                                                    | Status                                         | Version | Decision        | Reason                                   |
| ----------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------- | ------- | --------------- | ---------------------------------------- |
| Free diatonic passing and neighbor tones; one figure scheduled by Tension                                                                 | Built                                          | v1      | D11, D33        | n/a                                      |
| [Chromatic approach](lexicon.md#chromatic-approach) and chromatic enclosure (Jazz)                                                        | Built; name gate replaced by a capability      | v1.0    | D73, `297cde4`  | Stop name checks multiplying (ISS-005)   |
| Embellishment rates ("at 20 %")                                                                                                           | Narrowed to four ordering levels, never quotas | v3.1    | D59, D210, D233 | Performance (ISS-009), determinism       |
| Seven figures with levels (adds the appoggiatura as aimed, the diatonic enclosure)                                                        | Specced, not built                             | v3.1    | D233, D235      | n/a                                      |
| Escape tone, anticipation, suspension, retardation, scale run, bebop passing tone, held blue note, octave displacement, longer enclosures | Deferred, unscheduled                          | v3.1    | D233            | Touch rhythm, ties or the free-tone rule |
| Ornaments written as symbols (grace note, trill, mordent, turn, fall, scoop)                                                              | Deferred (own release after v3.2)              | v3.x    | D216, D233      | Notation, playback, export cost          |
| Favoring figures found in the player's doodle                                                                                             | Deferred, unscheduled                          | v3.2    | D238            | n/a                                      |

### Profiles, presets and "several generators"

| Method                                                                                            | Status                                          | Version | Decision          | Reason                                          |
| ------------------------------------------------------------------------------------------------- | ----------------------------------------------- | ------- | ----------------- | ----------------------------------------------- |
| Neutral and Jazz profiles                                                                         | Built                                           | v1      | D10, D35          | Prove the seams                                 |
| Profile as full theory policy (scales, chord qualities, rhythm tendencies, voicing)               | "(proposed)", never realised                    | v1      | none              | n/a                                             |
| "Cantabile" and "Lyrical" profiles                                                                | Superseded ("do not introduce")                 | v1      | none              | Scope                                           |
| "Musical profile" as a player term; profile name in the replay key                                | Removed (replaced by presets and figure levels) | v3.1    | D235(2), D235(18) | n/a                                             |
| Eight built-in presets: Neutral, Jazz, Gentle, Speed drill, Reel, Bebop, Pop song, Modal (Dorian) | Specced, not built                              | v3.1    | D228–D231, D233   | n/a                                             |
| Blues, Bossa and Baroque presets                                                                  | Deferred, unscheduled                           | v3.1    | D233              | No swing, sevenths, blues scale, harmonic minor |
| Rock, pentatonic pop, Klezmer, Flamenco, Jig, Waltz, Classical, Minimalist                        | Considered, not proposed                        | v3.1    | none              | No five-note scales, no 3/4 or 6/8              |
| Richer presets (gimmicks, stored rhythms, restrictions); character, location and event presets    | Later / endgame                                 | none    | D217, D228(6)     | n/a                                             |
| A registry of several generator strategies                                                        | **Never proposed**                              | none    | none              | n/a                                             |

### Notes on the inventory

- **Code was almost never narrowed.** Only two `src` files were ever deleted in 394 commits, and
  neither was a generator (`1cc66af` removed the old profile-switch and notation-mode modules,
  ISS-003). The performance passes `e9b361e`, `1863a52`, `4ede789`, `6dee66d` and `8ace526` only
  prune provably invalid work and keep the output byte-identical. One rule was even **widened**:
  `b3adbe3` let rests fall inside a figure's resolution delay, so six Breath-heavy settings
  started to generate.
- **The only real narrowing in code** is `c0c4a2c` (Sixteenth becomes Eighth on narrow screens)
  and the carry-in fuel cut `888b548` (250,000 to 160,000 search units, sized from a measured peak
  of 131,137). The unmerged perf "variant B"
  (`../infinite_flow-perf-investigation/scratch-perf/progressive/`) would narrow the rhythm
  domain per seed and change the output; it was never merged.
- **"Allowed" is not "audible".** Figures that exist are rarely heard, because the pitch search
  tries chord tones first (`src/domain/pitch/pitch-ranking.ts:20-30`). Free passing tones occur in
  about 1–6 % of phrases; Jazz chromatic notes are only 1.1–1.5 % of all notes; the appoggiatura
  never appeared in about 5,200 sampled phrases
  ([embellishment catalogue](embellishment-catalogue.md#the-current-vocabulary-in-one-paragraph),
  [preset catalogue](preset-catalogue.md#todays-chromatic-notes-are-barely-audible)). So the
  _heard_ breadth is narrower than the _permitted_ breadth.

## Verdict: was breadth cut?

**Mostly no, but the feeling is fair (inference).** Almost nothing that was built was taken out.
What happened is different: the **v1 scope choices became permanent by default**. The musical
vocabulary the generator writes today is, almost exactly, the v1 vocabulary of
2026-09 (D11–D15, D20, D28). v2 and v3 widened everything _around_ the generator (sessions,
carry-in, MIDI, storage, Jam, presets) but not what a phrase can contain.

Three different things are mixed in the owner's impression:

1. **Narrowed deliberately, as a v1 scope choice** (recorded, reasoned): 4/4 only and no tuplets
   (D15), stable pulse with no swing (D20), diatonic triads only (D11, D13), no altered harmony
   (D12), open endings only (D28). The reason was scope and a testable first release, not
   performance. Each was framed as "later", and most were never scheduled.
2. **Narrowed for performance, determinism or legibility** (small): embellishment rates became
   ordering levels, never quotas (D233; ISS-009, the pitch search is the expensive step); carry-in
   fuel (`888b548`); phrase-2 carry-in at 240 BPM (D203–D206); Sixteenth on phones (`c0c4a2c`).
   These narrow little musical vocabulary.
3. **Deferred and still planned:** seven figure levels and eight presets (v3.1, D233); symbol
   ornaments (their own release after v3.2, D216); rhythm ratios, rhythm editor and wider rhythm
   mutations (v4, D211, D232); accompaniment roles (v4, D70); sequence writing (v4–v6
   candidate, D210).

**Silently lost** (proposed once, never decided again either way): swing (D20), seventh chords
and richer chords, altered and substitute harmony (D12), player-chosen chord progressions (D13),
closed endings and phrase-end controls (D28), other meters and tuplets (D15), harmonic minor,
five-note scales, the phrase transformer seam
([generator architecture](../../specs/generator-architecture.md#candidate-musical-seams)),
"profile as full theory policy" ([Generator Profiles](../../specs/generator-architecture.md#generator-profiles)), a rhythmic palette per profile
(ISS-004), "phrase memory" ([product foundation](../../specs/product-foundation.md)) and the
precursor's vocabulary tiers ([`precusor.md`](../../precusor.md) §2.2).

The [preset catalogue's gap table](preset-catalogue.md#what-no-setting-can-express-today) is the
clearest single statement of what is missing: almost every row is a silently lost v1 exclusion.
v3.1 itself admits its presets are "not styles in full"
([presets §3.3](../../specs/versions/v3/presets.md#33-what-the-list-is-not)).

## Today's style seam

### One parameterised pipeline

There is **one** generator: a fixed pipeline of planners fed by settings. No strategy registry
exists, and none ever did.

- `generatePhrase` (`src/domain/generation/orchestration/generation-orchestrator.ts:242`) builds
  the harmony candidates, looks up the rhythm candidates (memoised on five rhythm controls and
  the grammar version, `rhythmDomainInputOf`, :78-86), ranks both by seeded tie keys, then
  searches harmony × rhythm pairs (`window-search.ts:248-283`). For each pair it binds Tension's
  figure, plans the pitches, and validates the result independently.
- **Harmony** (`src/domain/harmony/harmony-planner.ts`): fixed tonal templates per harmonic
  motion (:143-232), a modal colour table (:238-249), and the open ending on degree 5 (:293-299).
  It validates the profile but never branches on it (:80).
- **Rhythm** (`src/domain/rhythm/`): one construction grammar, `rhythm-mvp-v2`
  (`rhythm-planner.ts:62-74`), bar forms (`rhythm-skeleton.ts:20-26`), variety tables
  (`rhythm-variety.ts`), syncopation templates. 4/4 and the sixteenth grid are hard-wired
  (`src/domain/time/grid.ts`).
- **Pitch** (`src/domain/pitch/`): candidate builders (`pitch-candidates.ts`), leap budgets
  (`pitch-motion.ts:20-53`), contour patterns, chord-tone ranking. The validator mirrors the
  figure rules (`pitch/validation/figure-rules.ts:155-172`).

### How style is expressed today

- **Profile = a capability plus a settings bundle.** `MUSICAL_PROFILE_CAPABILITIES`
  (`src/domain/controls/profile-selection.ts:40-45`) holds **one** flag, `allowsChromaticApproach`
  (false for Neutral, true for Jazz). `PROFILE_BUNDLES` (:49-69) sets seven controls. Planners
  read the capability, never the name (D73, ISS-005,
  [issue](../../issues/Ref_20260926_profile_capability_flags.md)).
- **Controls a profile does not set** carry most of a style: above all the **collection** (the
  [scale or mode](lexicon.md#collection)), plus Tension, Leapiness, Arpeggio chaos and tempo
  ([preset catalogue](preset-catalogue.md#what-a-preset-does-not-set-today)).
- **v3.1 (specced, not built)** dissolves the profile into **presets** (ten controls, seven
  figure levels, a key and mode restriction; D228–D231, D233) and drops the profile name from the
  player's vocabulary and from the replay key (D235(2), D235(18)). The v3.1 build plan already
  groups the selector into **Practice** and **Styles**
  ([build plan v3.1](../../specs/versions/v3/build-plan-v3.1.md)).

**In short:** today a "style" can only _choose among_ existing vocabulary. It cannot _add_
vocabulary. A preset is a point inside one fixed musical space.

### Where a style grouping would plug in

The architecture already anticipates this. "A new musical style is a selectable profile or a new
implementation behind a stable planner contract"
([Evolution Rules](../../specs/generator-architecture.md#evolution-rules)); "a profile supplies
theory vocabulary and planner policies" (same file, "Generator Profiles", marked proposed); and
prerequisite I describes a declarative character schema with capabilities, pitch-set
restrictions, figure rates and a signature motif
([prerequisites §I](../../specs/versions/prerequisites.md#i-extensible-musical-profile-character-schema)).

The concrete attachment points (from the code sweep):

1. **Capabilities**: extend `MusicalProfileCapabilities` (`profile-selection.ts:31-45`). This is
   the declared seam.
2. **Plan tables keyed by style**: the harmony templates and modal table; the rhythm catalogues
   behind `grammarVersion`. A style that changes the rhythm domain must enter the memo key
   (`canonical-rhythm-domain.ts:49`).
3. **Candidate builders** in `pitch-candidates.ts`, following the chromatic-approach pattern,
   each with a matching validator rule.
4. **Ranking and limits**: `pitchRank` and the leap-budget tables.
5. **Hard-wired limits** (4/4, four bars, the sixteenth grid, triads, open ending) are not
   parameters at all. A style that needs them changed needs real generator work first.

### Constraints any style seam must respect

- **Any added candidate changes output.** Ordering hashes candidate identities, so even a
  candidate ranked last changes what the search finds. Every new candidate must be **off** for
  existing presets, or the golden and replay-corpus tests turn red (atom
  `rule_neutral_and_jazz_figure_levels`).
- **The replay key is a fixed tuple.** `ifk1` is a fixed 7-tuple: the request id, the
  seed, the 14 controls, the profile name, the custom flag, the phrase number and the carry-in
  (`src/generation-worker/phrase-replay-key.ts`), and the decoder refuses any other shape. A new
  profile _name_ fits the old slot; a style id or any new setting needs a new key version.
  `ifk2.` (v3.0) and `ifk3.` (v3.1, D233, D235) are already planned; a style would be `ifk3.` or
  later.
- **Guard tests** pin output: the v2.0 replay-key corpus
  (`tests/fixtures/replay-keys/ifk1-v2.0.json`), the generation outcome golden, the cold
  generation goldens for all 324 rhythm settings, and the no-carry-in byte test.

## Regrouping by dialect/style

### What the owner's idea means here

A **style pack** (working name) would bundle, for one shared style: a harmony policy (which
collections, chord qualities, progressions, endings), a rhythm vocabulary (meter, feel, cells),
a pitch and figure vocabulary (which embellishments, how favored), ornaments, and default
accompaniment roles for v4. Characters (idiolects) and situations (location and event modifiers)
would layer on top:

**style pack → preset → character (idiolect) → situation modifiers**

The key distinction (inference): a **preset** chooses _settings within_ a vocabulary; a **style
pack** defines _which vocabulary exists_. v3.1 presets are the first; nothing in the project is
the second yet.

### Options

**A. Keep one generator; presets only.** Styles stay as built-in presets, grouped in the
selector ("Styles"), as v3.1 already plans.

- For: no new mechanism; replay, goldens and latency untouched; ships with v3.1.
- Against: cannot add vocabulary, so Blues, Bossa and Baroque stay "thin" forever; the gap table
  never shrinks; "style" names over-promise to a beginner.

**B. Style packs as declarative policy bundles over one pipeline.** A pack is data: a list of
capabilities it unlocks, plan tables, rhythm cells, figure set and default levels, ornament set,
default backing roles, and a version. The pipeline stays one; each new musical device is added
once as a default-off capability, then switched on by the packs that use it.

- For: matches the architecture's own intent (Evolution Rules; prerequisite I; ISS-005's "further
  capabilities on the same table"); deterministic (packs are data, folded into the seeded tie
  keys); testable per capability and per pack (one invariant set and one small golden corpus per
  pack); small bundle cost (tables, not engines); explainable ("Blues uses the blues scale and
  holds blue notes"); the same shape as the v4 accompaniment recommendation, where "a companion
  is (role, preset, synth)" ([accompaniment systems §8.2](accompaniment-systems.md#82-why)).
- Against: the pack is only a label until each capability exists, and the capabilities are the
  real cost (swing, sevenths, other meters each touch rhythm, notation, acknowledgement and
  export); candidate domains grow, so latency must be measured per pack (the v3.1 cost guard,
  D235(15), is the model); the replay key must carry a pack id and pack version.

**C. Pluggable generator strategies per style.** Each style gets its own planner implementation
(for example a pattern-based rhythm planner for Bossa's clave, a form planner for a 12-bar
blues), chosen by the orchestration layer.

- For: the only way to express things the grammar cannot (stored patterns, forms longer than four
  bars, motif development); allowed by the Evolution Rules ("a new implementation behind a stable
  planner contract").
- Against: several engines to keep deterministic and fast; every strategy needs its own goldens
  and replay versioning; harder to explain why two styles behave differently; more bundle weight
  (could be lazy-loaded per style); risk of the "separate engine" the architecture warns against.

### Trade-offs at a glance

| Concern                      | A: presets only           | B: declarative packs                 | C: strategies per style          |
| ---------------------------- | ------------------------- | ------------------------------------ | -------------------------------- |
| Adds vocabulary              | No                        | Yes, capability by capability        | Yes, including new structures    |
| Determinism and `ifk` replay | Unchanged                 | New key version; pack id and version | New key version per strategy     |
| Goldens and corpus guards    | Unchanged                 | Existing stay green if default-off   | New goldens per strategy         |
| Bundle size                  | None                      | Small (data tables)                  | Larger; lazy-load per style      |
| Generation latency           | Unchanged                 | Grows with domains; measure per pack | Per strategy; unbounded variety  |
| Explainable to a beginner    | Weak (names over-promise) | Good (pack lists its devices)        | Fair                             |
| Fits v3.1 / v4 / endgame     | v3.1 only                 | All three                            | v4 and endgame for a few devices |

### Recommendation (inference)

**Adopt B as the frame, with C reserved for a few structural devices, and do not start it before
v3.1 ships.**

1. **Keep v3.1 as specced.** Its presets are option A and are the right first step; the "Styles"
   group in the selector is already the user-facing seed of style packs.
2. **Treat each missing device as a capability, not a style.** Swing, seventh chords, five-note
   scales, harmonic minor, closed cadences, held blue notes, more figures and ornaments: each is
   built once, default-off, with its own invariant and cost check. A style pack then becomes
   cheap: a named bundle that switches capabilities on and sets preset defaults.
3. **Version the pack.** The replay key carries a pack id and pack version (with `ifk3.` or the
   next version), in the same way the rhythm grammar already carries `rhythm-mvp-v2`.
4. **Use C only where data cannot reach**: stored rhythm patterns, forms longer than four bars,
   and motif or sequence development (the never-built phrase transformer seam). Each is a planner
   implementation selected by the pack, not a separate generator.
5. **Layer identity on top, never inside.** A character (idiolect) is a restriction and weighting
   over a pack (D228(6)'s "each character, location or event has its own preset"); it should not
   unlock vocabulary its style lacks. This keeps the style → identity → situation picture clean.
   The parallel [identity modelling](identity-modelling.md#four-slots-for-an-identity-inference)
   research gives the mechanics: an identity acts through four slots (filter, rank level,
   weighted order, planned material), all of which can act over a pack's vocabulary without
   extending it.
6. **Let v4 accompaniment roles read the pack** for their default role vocabulary (walking bass
   for Bebop, a drone for Modal), as the accompaniment research's "role-based rules over style
   templates" already suggests.

## What a style pack would revive

Each pack is the natural home for specific cut or deferred methods. "Figure #n" refers to the
[embellishment catalogue](embellishment-catalogue.md#summary-table).

| Pack (working name) | Already expressible today                        | Would revive                                                                                                                                                                                                                                                                 |
| ------------------- | ------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Bebop               | Chromatic approach and enclosure, Eighth density | [Swing](lexicon.md#swing) (D20); [seventh chords](lexicon.md#seventh-chord); altered dominants and substitutions (D12); chosen progressions such as ii–V–I (D13); double chromatic approach (#14), longer enclosures (#17), bebop-scale passing tone (#20); sequences (D210) |
| Blues               | Mixolydian collection, approaches                | Blues and [pentatonic scales](lexicon.md#pentatonic-scale); held [blue notes](lexicon.md#blue-note) (#21); dominant sevenths; the 12-bar form (beyond four bars); swing or shuffle; riffs as a repeated motif (D234); scoops and falls (family 2, D216)                      |
| Folk reel / jig     | Mixolydian or Dorian, Eighth density, straight   | 6/8 and triplets (D15); rolls, cuts and grace notes (family 2, D216); 8-bar repeated forms; motif repetition                                                                                                                                                                 |
| Baroque             | Minor collection, Sixteenth density              | [Harmonic minor](lexicon.md#harmonic-minor) and the raised leading tone; closed [cadences](lexicon.md#cadence) (D28); suspension (#10), escape tone (#8), scale runs (#19); trills, mordents and turns; [sequences](lexicon.md#sequence) (D210)                              |
| Pop                 | Major, Eighth density, Occasional offbeats       | Chosen progressions such as I–V–vi–IV (D13); anticipations or "pushes" (#9); pentatonic melodies; closed endings (D28); hook repetition                                                                                                                                      |
| Modal               | Dorian and other modes                           | Little new: a drone or pedal accompaniment role (v4)                                                                                                                                                                                                                         |
| Bossa               | Major, straight Eighths                          | A stored clave rhythm pattern (D217's "specific rhythm patterns"); sevenths and ninths; the v4 rhythm editor and ratios (D175, D211)                                                                                                                                         |

The devices that recur across packs are the best investment order (inference): **swing**,
**seventh chords**, **closed cadences**, **five-note scales**, **motif repetition and
sequence**, then **symbol ornaments**.

## Open questions for the owner/spec session

1. **Is "style pack" the right layer?** Should a style be something that _adds vocabulary_
   (option B), or is a grouped list of presets (option A, v3.1's "Styles" group) enough for now?
2. **Which version opens the first device?** The silently lost v1 exclusions (swing, sevenths,
   closed cadences, other meters) have no version. Should one be scheduled before, with or after
   v4 accompaniment?
3. **Swing first?** It is needed by Bebop and Blues, and the acknowledgement window already
   tolerates a swung eighth ([preset catalogue](preset-catalogue.md#what-no-setting-can-express-today)).
   Is a swung _written_ line (or swung playback) wanted?
4. **Phrase length and form.** Should any style be allowed to break the four-bar 4/4 phrase (a
   12-bar blues, an 8-bar reel, a 3/4 waltz), or does the four-bar phrase stay the app's unit?
5. **Motif development.** Should the phrase transformer seam (repetition, sequence, quoting the
   doodle; D210, D234) be revived as the first "strategy" of option C?
6. **Does a character ever unlock vocabulary?** Or is an idiolect always a restriction and
   weighting over its style pack (recommendation point 5)?
7. **Pack identity in the replay key.** Is a pack id plus pack version in the key acceptable, and
   should old keys keep replaying byte for byte after a pack's vocabulary grows?
8. **Variant B.** If the perf "variant B" is ever merged, it narrows the rhythm search per seed.
   Should breadth (variety across seeds) be an explicit acceptance criterion for any future
   performance change?
9. **Terminology.** Should the lexicon gain entries for **style**, **dialect** and **idiolect**,
   aligned with the parallel musical-identity research?
