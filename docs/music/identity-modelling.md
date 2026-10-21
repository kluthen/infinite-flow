# Identity Modelling

Status: research (2026-10-11), endgame groundwork: musical identities as generation weights; not
settled policy.

## Purpose

In the [endgame](../../specs/vision/endgame.md), characters, locations and events each carry a
**musical identity**: a sound (timbre) plus habits such as signature motifs, favoured chords,
modes, keys, rhythms and ornaments. The owner's examples: a character who "uses only the A scale
and absolutely hates G" and "loves trills"; a dark character with "lower tones, punctuated by
sharp, brief high-pitched notes" (D71, D228). These identities should act as **weights** on the
generation of the player's melody and of the system voices.

A sibling note, `docs/music/musical-identity.md`, covers the musicology side: what makes up a
musical identity. This note covers the computational side:

1. How can a musical style be **represented** as data a small, rule-based generator can read?
2. Which parts of an identity should be **hard constraints** (never broken) and which **soft
   weights** (preferences), and how does generation stay feasible when an identity is strict?
3. **Where** in today's pipeline each kind of weight would act, while keeping every phrase
   deterministic and replayable from its `ifk1` key.
4. How to insert **signature motifs** (licks, gimmicks).
5. How to **combine** several identities (character, location, event, companions, status
   effects).
6. What existing **style formats** look like, and a **draft identity schema** as plain data.
7. How identities could be **learnt** from music or from the player's sessions.
8. How to **explain** an identity's effect to a beginner.

Nothing here is decided. Conventions, as in the other research notes:

- A statement about the outside world cites a source: an **S** id from
  [research sources](research-sources.md) (see [Sources](#sources)).
- A statement about the project cites a repository path.
- The author's own reasoning is marked **(inference)**. It is a proposal for discussion, not a
  finding.

### Terms used here

- **Constraint**: a rule a result must obey. A **hard constraint** is never broken: a result that
  breaks it is invalid ("never play G"). A **soft constraint**, also called a **preference** or a
  **weight**, is something the generator tries to satisfy but may give up ("prefer low notes").
- **Weight**: a number saying how strongly something is preferred. "Weights are preferences, not
  quotas" is already project policy (D210, D216; [embellishment flags](../../specs/archive/v3/embellishment-flags.md)):
  a weight changes the order in which the generator tries things, never a count it must reach.
- **Candidate**: one option the generator may choose at a decision point, such as one possible
  pitch for one note.
- **Ranking**: putting candidates in the order the search tries them.
- **Seeded**: driven by the phrase's seed, the number that makes every choice repeatable
  ([lexicon: seed](lexicon.md#seed)).
- **Histogram**: a count of how often each value occurs, such as how often each of the twelve
  pitch classes appears in a melody (a **pitch-class histogram**).
- **Markov model** (or **n-gram model**): a table of how likely each next event is, given the
  previous one or few events.
- **Layer**: one identity's contribution when several are combined, like a layer in an image
  editor.
- **Cue** and **played signal** keep the [lexicon](lexicon.md#cue)'s meanings: a cue is the app
  signalling the player; a played signal is a pattern the player plays to steer the app (D214).
  An identity can shape cues (a character's stinger before its turn), never the other way round.

> ℹ️ **Music theory:** "the A scale" needs a second word to name a set of notes. **A major** is
> A B C♯ D E F♯ G♯, so it already has no G (only G♯), and "hates G" adds nothing unless a chromatic
> note could be G. **A minor** (A Aeolian, A B C D E F G), **A Dorian** and **A Mixolydian** all
> contain G, so "hates G" removes their seventh note and leaves six. The difference decides
> whether the ban costs anything, so an identity should always name the key **and** the mode
> (the app's "collection").

## How this was gathered

- **Code and project reading.** The ranking and tie-break code in
  [pitch-ranking.ts](../../src/domain/pitch/pitch-ranking.ts) and
  [pitch-tie-key.ts](../../src/domain/pitch/pitch-tie-key.ts); the preset data in
  [profile-selection.ts](../../src/domain/controls/profile-selection.ts); the atoms
  [mechanic_pitch_search_policy](../mechanic_pitch_search_policy.atom.md),
  [mechanic_pitch_tie_break_ordering](../mechanic_pitch_tie_break_ordering.atom.md),
  [module_named_stream_pseudorandomness](../module_named_stream_pseudorandomness.atom.md),
  [module_ranked_candidate_ordering](../module_ranked_candidate_ordering.atom.md) and
  [module_phrase_replay_key](../module_phrase_replay_key.atom.md); the policy notes
  [pitch-planner-validation.md](pitch-planner-validation.md),
  [rhythm-phrase-structure.md](rhythm-phrase-structure.md),
  [preset-catalogue.md](preset-catalogue.md),
  [accompaniment-systems.md](accompaniment-systems.md) (§2, §3, §8) and
  [arranging-and-roles.md](arranging-and-roles.md); and the v3.1 and v4 specs
  ([presets](../../specs/archive/v3/presets.md),
  [embellishment flags](../../specs/archive/v3/embellishment-flags.md),
  [v4 README](../../specs/versions/v4/README.md)).
- **Web research** (2026-10-11) on style representation, constraint programming, probability
  pooling, game-audio middleware, style file formats and live-coding pattern languages. Papers
  were read in their authors' copies where one exists (Pearce's thesis, Temperley's melody model,
  the jSymbolic paper, the Impro-Visor style tutorial, Johnson, Keller and Weintraut). Some
  vendor pages (Audiokinetic, Zenodo, SourceForge) refuse automated readers; for those the
  content was confirmed through search-engine extracts and is marked as such in the
  [research sources](research-sources.md#identity-modelling-endgame) entries.
- Every URL in the source list was checked on 2026-10-11 (HTTP 200, a redirect to the same
  document, or the bot refusal just mentioned).

## Where weights could act in today's pipeline

### What the generator does today

The generator chooses by **filtering and ordering**, never by drawing from a probability table:

1. **Hard filters.** Each planner builds a finite list of candidates and removes the illegal
   ones. The pitch planner rejects, in a fixed order, collection or profile violations,
   unresolved obligations, range and window violations, contour infeasibility, leap caps and
   budgets, and recovery or arpeggio violations
   ([pitch-planner-validation.md](pitch-planner-validation.md#candidate-construction-and-hard-filters)).
2. **A lexicographic rank.** Survivors are sorted by a tuple of numbers compared left to right
   (the first difference decides). Today it has three levels: a chord tone on beat 1 or at a
   chord change, then chord tones before other notes, then the arpeggio-chaos distance
   (`pitchRank` in [pitch-ranking.ts](../../src/domain/pitch/pitch-ranking.ts)).
   The policy says: "never use a weighted score that trades away a named control"
   ([pitch-planner-validation.md](pitch-planner-validation.md#canonical-enumeration-ranking-and-deterministic-search)).
3. **A seeded tie key.** Candidates equal on the whole tuple are ordered by a 32-bit hash
   (FNV-1a) of a versioned label, the seed, the decision's identity and the candidate's identity,
   then by MIDI number, then by enumeration index
   ([pitch-tie-key.ts](../../src/domain/pitch/pitch-tie-key.ts)). Harmony and rhythm candidates
   are all equal-ranked today, so their order is the tie key alone
   ([module_ranked_candidate_ordering](../module_ranked_candidate_ordering.atom.md)). No stage
   draws from a random stream ([module_named_stream_pseudorandomness](../module_named_stream_pseudorandomness.atom.md)).
4. **Depth-first search with backtracking** under a versioned fuel allowance: the first legal
   phrase found wins; running out of fuel is the typed failure `search_limit_exceeded`, never
   passed off as "impossible" ([mechanic_pitch_search_policy](../mechanic_pitch_search_policy.atom.md)).
5. **Typed failures, no silent relaxation.** "No failure path changes the seed, retries
   nondeterministically, relaxes a control, widens a range/window, removes a rest, changes
   profile, returns a partial phrase" ([pitch-planner-validation.md](pitch-planner-validation.md#orchestration-varying-resolution-and-failure)).

Two planned features already add weights in this style:

- **v3.1 figure levels** (D233): "Favored" tries a figure **before** the chord tones at about 1
  in 4 of the notes where it could start; which notes is decided "from the phrase's seed and the
  note's position, with integer arithmetic only"; "As today" consumes no draw, so old phrases and
  replay keys reproduce note for note
  ([embellishment flags §3.1](../../specs/archive/v3/embellishment-flags.md#31-four-levels-d233)).
- **v3.2 key and mode suggestion**: a weighted draw from a precomputed **integer** weight table
  ([build plan v3.2](../../specs/versions/v3/build-plan-v3.2.md)), because floating-point maths
  functions such as `Math.log` and `Math.pow` are "implementation-approximated" in JavaScript and
  may differ between browsers (S77).

### Four slots for an identity (inference)

An identity can act in exactly four ways, each matching something the code already does:

| Slot                    | What it does                                                                          | Today's precedent                                       | Example                                    |
| ----------------------- | ------------------------------------------------------------------------------------- | ------------------------------------------------------- | ------------------------------------------ |
| **A. Filter**           | Removes candidates before ranking                                                     | Collection filter, range and window filter              | "Never plays G"                            |
| **B. Rank level**       | Adds a level to the lexicographic tuple, **after** every level a named control owns   | Chord-tone priority, arpeggio chaos                     | "Prefers notes below middle C"             |
| **C. Weighted order**   | Replaces the uniform tie order of equal-ranked candidates by a seeded, weighted order | v3.1 figure-level draws, v3.2 integer weight table      | "Picks the Dorian chord plan 3 times in 4" |
| **D. Planned material** | Reserves a place and content before the search, like a bound obligation               | Tension's bound figure with a reserved target, carry-in | "Plays its four-note signature in a rest"  |

- **A is hard**, B and C are soft, D is hard once placed (the motif's notes become obligations)
  but its placement is seeded and optional.
- **B versus C.** A rank level is strict: a lower-ranked candidate is only tried when every
  higher one has failed. A weighted order is probabilistic: a disfavoured candidate still comes
  first sometimes. "Hates G" as a **dislike** (soft) is best as B: G is used only when nothing
  else works. "Loves Dorian" is best as C: Dorian often, not always.
- **The named-control rule holds.** Placing B levels after the control-owned levels, and C only
  among ties, means an identity can never trade away a player's Contour or Leapiness. That keeps
  the existing policy unchanged and is the cheapest path.

### Where each part of an identity would act (inference)

| Stage (repository seam)                                                                                                               | Identity constituents                                                                                                                      | Slot    |
| ------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ | ------- |
| Control mapping (`generation-controls.ts`)                                                                                            | Starting values or allowed ranges for the ten preset controls; key and mode restriction (v3.1)                                             | A       |
| Harmony planner ([policy](harmony-planner-policy.md))                                                                                 | Favoured or banned chords, favoured templates (progressions), modes; later seventh chords                                                  | A, C    |
| Rhythm planner ([policy](rhythm-phrase-structure.md))                                                                                 | Favoured note values (v4's planned "rhythm ratios"), syncopation and density leanings, stored rhythm cells                                 | C, D    |
| Pitch planner ([policy](pitch-planner-validation.md))                                                                                 | Banned pitch classes (A), disliked or favoured pitch classes (B or C), interval-size profile, register centre and spikes, favoured contour | A, B, C |
| Embellishment (v3.1 figure levels; [catalogue](embellishment-catalogue.md))                                                           | Figure levels, ornament preferences (trills: family 2, D216)                                                                               | C       |
| Arranger (proposed, [accompaniment-systems §8](accompaniment-systems.md#81-recommended-family-role-based-rules-over-style-templates)) | Preferred roles, register lane, pattern weights, signature fills                                                                           | C, D    |
| Sound layer (v4 sound library, [v4 README](../../specs/versions/v4/README.md))                                                        | Synth and effect choice, brightness, articulation; never pitch or rhythm                                                                   | none    |
| Display (endgame "display-effect layer")                                                                                              | Status effects such as blindness change what is shown, not what is generated ([endgame](../../specs/vision/endgame.md))                    | none    |

The sound layer and the display act **after** generation: a timbre or a display effect cannot
make a phrase infeasible, so they need no feasibility logic at all.

### Weighted draw or weighted ranking (inference, built on S252, S251, S77)

- **Weighted ranking** (slot B) keeps today's search exactly: favoured candidates are tried
  first, the search backtracks as before. Deterministic for free.
- **Weighted order** (slot C) needs a seeded draw. Two exact options:
  1. **Weighted first pick.** Give each candidate an integer weight, sum them to `W`, compute
     `r = hash(seed, decision, label) mod W`, put first the candidate whose share of `W` contains
     `r`, and keep today's tie order for the rest. Integer arithmetic only, one hash per
     decision, and the rest of the order (and so the backtracking) is unchanged. This is the v3.1
     figure-level draw generalised.
  2. **A full weighted random order** (Efraimidis and Spirakis's method: each candidate gets key
     `u^(1/w)` from a uniform `u`, and sorting by key gives a random order where heavier items
     come first proportionally, S252). It needs `pow` or `log`, which are not bit-exact across
     browsers (S77), so it would need fixed-point tables. More work for little gain.
- **What the player hears is not exactly the weights.** With backtracking, a favoured candidate
  that often leads to dead ends is heard less than its weight says. Pachet, Roy and Barbieri show
  that keeping a Markov model's exact probabilities under constraints needs the constraints to be
  compiled into the model ("arc-consistency and renormalization", S251). Since project policy is
  "preferences, not quotas", the cheap path accepts the gap and **measures** it instead (see
  [Testing](#testing-an-identity-inference)).

### Determinism and the replay key (inference)

- **An identity is a generation input**, so it must travel in the generation request and in the
  replay key. Today's `ifk1.` key is a fixed 7-tuple of intent fields
  ([module_phrase_replay_key](../module_phrase_replay_key.atom.md)); adding identities means a new
  key version. Since the key deliberately excludes the app version, an identity named only by id
  would replay differently after its catalogue entry changes. Safer: carry the **resolved,
  combined identity** (or a content hash plus a data version) in the request.
- **The empty identity reproduces today.** As with v2's "no carry-in, same output as v1"
  ([rule_no_carry_in_output_matches_v1](../rule_no_carry_in_output_matches_v1.atom.md)) and
  v3.1's "As today consumes no draw", a phrase with no identity (or a neutral one) must be
  byte-identical to today's, so every existing replay key keeps working.
- **Own hash labels.** Identity draws use their own versioned labels (for example
  `infinite-flow/identity-pitch/v1`), so adding an identity never shifts another stage's tie
  keys, as the stream registry already guarantees for the existing stages.
- **Order-independent combination.** If three identities are active, the result must not depend
  on the order the game added them. Integer sums, set intersections and unions are
  order-independent; an "override" needs a fixed precedence and an id tie-break (see
  [Combining identities](#combining-identities)).

## Representations of style

### What the literature offers

| Representation                     | What it is                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | Sources            |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------ |
| **Feature sets**                   | jSymbolic 2.2 extracts 246 unique features (1,497 values, since many are histograms) in eight groups: pitch statistics, melodic intervals, chords and vertical intervals, rhythm, instrumentation, texture, dynamics, and MEI-specific. Its authors list "generating novel music in specific styles by using feature values as stylistic guideposts" as a use. music21 ports 57 jSymbolic 1.2 features and adds its own; Humdrum is an analysis toolkit that "does not extract features as such". | S205, S242, S243   |
| **Histograms**                     | Pitch-class, interval, duration and onset-position counts. jSymbolic's pitch-statistics and melodic-interval groups are mostly histograms; music21 exposes `Pitch_Class_Distribution_0…11`.                                                                                                                                                                                                                                                                                                       | S205, S242         |
| **Key profiles**                   | Twelve weights saying how well each pitch class fits a key, measured from listeners (Krumhansl and Kessler) or counted in corpora (Aarden from the Essen folk-song collection; Temperley). Distribution alone lets listeners and algorithms identify a key fairly well.                                                                                                                                                                                                                           | S60, S62, S64, S65 |
| **Probabilistic melody models**    | Temperley's model gives each next pitch a probability proportional to the **product** of three profiles: a **range** profile (a bell curve around the melody's central pitch), a **proximity** profile (a bell curve around the previous pitch) and a **key** profile. Each of the first two has two parameters, a mean and a variance.                                                                                                                                                           | S63, S62           |
| **Rule-based expectancy**          | Narmour's implication-realization model, simplified by Schellenberg (1997) to a few principles such as pitch proximity and pitch reversal (a large leap tends to be followed by a change of direction).                                                                                                                                                                                                                                                                                           | S245               |
| **Markov and n-gram models**       | Learn "what follows what" from a corpus; variable-order versions (the Continuator) use as long a context as the data supports. Common in algorithmic composition.                                                                                                                                                                                                                                                                                                                                 | S59, S57, S93      |
| **Multiple viewpoint systems**     | Conklin and Witten model a melody through several separate "viewpoints" of the musical surface (such as pitch, interval, duration and scale degree), each with its own predictive model, then combine their predictions. IDyOM (Pearce) builds "multiple-viewpoint, variable-order Markov models" with a long-term model (trained on a corpus) and a short-term model (trained on the current piece).                                                                                             | S240, S244         |
| **Combining viewpoints**           | Conklin used an entropy-weighted **arithmetic** mean of the viewpoints' predictions (a model that is less certain gets less weight); Pearce introduced a weighted **geometric** mean, the form of Hinton's product of experts.                                                                                                                                                                                                                                                                    | S244, S255         |
| **Signatures**                     | Cope's EMI analysed a composer's works for "signatures", recurring patterns that mark the style, and recombined fragments.                                                                                                                                                                                                                                                                                                                                                                        | S177               |
| **Grammars and abstract melodies** | Impro-Visor generates solos from a probabilistic grammar whose rules carry weights, and whose terminals are note categories rather than pitches: chord tone (C), colour tone (L), approach tone (A), scale tone (S), arbitrary (X), rest (R).                                                                                                                                                                                                                                                     | S253, S165         |

### What fits a deterministic, rule-based browser generator (inference)

| Representation                        | Cheap        | Interpretable to a beginner      | Deterministic            | Fit                                                                                       |
| ------------------------------------- | ------------ | -------------------------------- | ------------------------ | ----------------------------------------------------------------------------------------- |
| Parametric profiles (Temperley's RPK) | Yes          | Yes ("stays low", "small steps") | Yes, with integer tables | **High**: register centre and spread, interval-size preference, pitch-class weights       |
| Histograms as weights                 | Yes          | Yes ("uses E a lot")             | Yes                      | **High**: pitch class, scale degree, note value, onset position, interval size            |
| Key and mode restriction plus profile | Yes          | Yes                              | Yes                      | **High**: already in v3.1 as a restriction; a profile adds "which notes it leans on"      |
| Abstract motifs (Impro-Visor style)   | Yes          | Yes ("its little rising figure") | Yes                      | **High** for signatures, see [Signature motifs and licks](#signature-motifs-and-licks)    |
| First-order Markov tables (small)     | Yes          | Partly ("what it plays next")    | If frozen and seeded     | Medium: chord-to-chord or rhythm-cell successions, baked at build time                    |
| Variable-order Markov, IDyOM          | No           | No                               | If frozen; context grows | Low for generation; useful offline to **measure** how distinctive an identity sounds      |
| Feature sets (jSymbolic, music21)     | Offline only | Some features yes                | Yes                      | **Test oracle**, not generator input: check that an identity's phrases differ as intended |
| Neural models                         | No           | No                               | Not guaranteed           | None (as in [accompaniment-systems §3.5](accompaniment-systems.md#35-neural-models))      |

Main reading: an identity is best stored as **a handful of named profiles and histograms**, each
one owned by one planner, which is exactly a multiple viewpoint system run backwards
(generation instead of prediction). Temperley's model shows that three short profiles already
make a recognisable melody (S63), and that their combination is a product. The app's own
Leapiness and Register controls are coarse versions of his proximity and range profiles.

## Hard constraints and soft weights

### What the constraint literature says

- **Constraint programming in music** is mature. Anders and Miranda survey generic music
  constraint systems (Strasheela among them) that model
  counterpoint, harmony, rhythm, form and instrumentation as constraints (S246). Pachet and Roy
  survey harmonisation as constraint satisfaction (S178).
- **Hard plus soft in one system.** MorpheuS (Herremans and Chew) assigns pitches with a local
  search (variable neighbourhood search) to fit a target tension profile, while "hard
  constraining" long-term structure through repeated patterns detected in a template piece (S247).
  That is the same split this project needs: the motif structure is hard, the tension or
  identity profile is soft.
- **Soft constraints** in general are cost functions: each violated preference adds a cost, and
  the solver minimises the total; weighted constraint satisfaction is one formalism among
  several (S249).
- **Constraint hierarchies** (Borning, Freeman-Benson and Wilson): each constraint is "required"
  or "preferred at some strength"; required ones must hold, and "no error condition arises" if a
  preference cannot be met; stronger preferences fully dominate weaker ones (S248). The project's
  lexicographic rank tuple **is** a constraint hierarchy with one strength per tuple position.
- **Markov constraints**: Pachet and Roy recast Markov generation as constraint satisfaction, so
  user controls become constraints, at more computational cost than plain left-to-right
  generation (S179); the finite-length variant compiles constraints into the model to keep its
  probabilities exact (S251).
- **Explaining failure.** QuickXplain (Junker) computes a **preferred explanation** of an
  over-constrained problem: a minimal set of conflicting constraints, chosen according to the
  user's preferences between constraints, with any solver (S250). "Minimal" means removing any one
  member of the set would make the rest satisfiable.

### Classifying identity constituents (inference)

| Constituent                               | Hard or soft                                             | Why                                                                                  |
| ----------------------------------------- | -------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| Key and mode restriction                  | Hard **for the app's own choices**, guide for the player | v3.1's restriction "guides, never blocks" the player (D231); the app stays inside it |
| Banned pitch class ("absolutely hates G") | Hard                                                     | The owner's word "absolutely"; a filter (slot A)                                     |
| Disliked pitch class ("doesn't like F")   | Soft, rank level                                         | Used only when nothing else works (slot B)                                           |
| Favoured pitch classes, degrees           | Soft, weighted order                                     | A key-profile-like leaning (slot C)                                                  |
| Register centre and spread                | Soft; the window stays hard                              | The register window is already a hard rule; the centre is a preference inside it     |
| Register spikes ("brief high notes")      | Soft, seeded, budgeted                                   | A rare event: a spike budget per phrase, like the leap budget                        |
| Interval-size profile                     | Soft; Leapiness caps stay hard                           | Leapiness caps are named controls                                                    |
| Favoured chords, progressions, modes      | Soft (weighted order of harmony candidates)              | Harmony candidates are all equal-ranked today; weights simply order them             |
| Banned chords                             | Hard, but checked statically                             | Can empty the harmony domain; check before any search                                |
| Favoured note values, syncopation         | Soft                                                     | Rhythm candidates are equal-ranked today                                             |
| Signature motif                           | Hard once placed; placement soft                         | A half-played signature is not a signature                                           |
| Ornament and figure preferences           | Soft (v3.1 levels)                                       | Already "preferences, not quotas"                                                    |
| Role, timbre, tone                        | Not a constraint on notes                                | Sound and arrangement only                                                           |

### Keeping a restrictive identity feasible (inference)

Worked example, the owner's character in **A minor (Aeolian) that hates G**:

- The collection becomes six notes, A B C D E F. The seven diatonic triads of A minor are Am,
  B°, C, Dm, Em, F and G. Three contain G: **C** (C E G), **Em** (E G B) and **G** (G B D).
- For the **melody only**, every chord still keeps at least two allowed chord tones (C and E over
  C; E and B over Em; B and D over G), so the pitch planner can always place a chord tone. The
  ban is feasible.
- For **all voices**, the backing could no longer play a full C, Em or G triad. Either the
  harmony planner must avoid those chords (the Minor template's open ending on the degree-5
  chord, Em, would then be impossible) or the ban applies to the character's own line only.
  **Scope** is therefore part of the constraint: "hates G **when it plays**" versus "G never
  sounds while it is on stage".
- A subtler choice: the planner's passing tones move by **collection step**. If the ban removes G
  from the collection, F to A becomes a "step" (as in a six-note scale); if the ban only filters
  candidates, every figure that passes through G (F-G-A) disappears. The first changes the
  vocabulary, the second only the choices.

Proposed feasibility policy, keeping the project's "report the binding constraint" stance
([control-interaction](<Melodic control models/control-interaction.md>), which asks to name "at
most the one or two binding constraints most responsible for the limit"):

1. **Check statically, before any search.** Like `isUnsupportedRhythmSetting` today, a pure
   check on the combined identity: is the allowed collection non-empty, does every chord the
   harmony domain can produce keep at least one allowed chord tone in the window, can every
   template end legally, does every planned motif fit the window? A failure here is a typed
   `identity_conflict` naming the conflicting pair ("A minor's ending chord Em needs G, which
   Mira bans"), found by a QuickXplain-style search over the small set of identity constraints
   (S250). Content authors meet it at build time, in a test over every built-in identity, never
   the player.
2. **Soft weights never fail.** A weight only reorders; the search space is the same as without
   it, so the identity cannot make a feasible request infeasible. (It can make the search slower:
   see [Risks](#risks).)
3. **A declared relaxation ladder for the rest.** When a hard identity constraint that passed
   the static check still makes a particular phrase fail (rare, because of rhythm and contour
   interactions), relax in an order written in the data, never chosen at run time:
   - first drop the **signature motif placement** for this phrase;
   - then demote **identity bans to dislikes** (slot A becomes slot B), lowest-precedence layer
     first;
   - then the session's existing failure ladder applies unchanged
     ([rule_session_generation_failure_ladder](../rule_session_generation_failure_ladder.atom.md)).

   Every step taken is recorded in the phrase's provenance and can be shown ("Mira played G once:
   nothing else fitted this rhythm"). This is a deliberate exception to "never relax a control",
   limited to identity constraints, and would need an owner decision.

4. **The player's controls stay above identities.** An identity never relaxes a named control
   the player chose; if the two cannot both hold, the identity yields (as in constraint
   hierarchies, where required beats preferred, S248).

## Signature motifs and licks

### Precedents

- **Impro-Visor** stores and generates **abstract melodies**: a rhythm plus a note category per
  note (chord tone, colour tone, approach tone, scale tone, arbitrary, rest), instantiated over
  whatever chord is sounding (S253, S165). Its active trading "rectifies" a line by moving each
  note that is not a chord or colour tone to the nearest one, so a borrowed line "will sound
  inside" the progression (S166).
- **GenJam** keeps a population of measures and phrases (its learnt vocabulary) and, while
  trading fours, mutates the human's material with fixed "musically meaningful" operations:
  reverse, rotate, invert, transpose, repeat, "sequence phrase" (S58, S95).
- **Cope's EMI** finds "signatures" by pattern matching across works (S177).
- **Leitmotifs** recur transformed but recognisable
  ([arranging-and-roles: characters](arranging-and-roles.md#characters-themes-and-timbres)).
  Research on melody recognition finds that **contour** (the up-and-down shape) and **rhythm**
  carry much of what makes a transformed melody recognisable (S53, S54, S55).
- **Band-in-a-Box's "riff based"** voice-leading mode keeps a melodic riff's shape when fitting it
  to a new chord (S162).

### Insertion strategies (inference)

| Strategy                 | How it works here                                                                                                                                                                             | Cost                    | Recognisability           |
| ------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------- | ------------------------- |
| **1. Planned placement** | Before the pitch search, reserve a span (a bar, the answer half, the last beats before a rest) and bind the motif's notes there as obligations, like tension's reserved targets               | Low: shrinks the search | Highest                   |
| **2. Abstract motif**    | Store the motif as rhythm plus note categories plus contour (Impro-Visor style); instantiate it over the sounding chord inside the window, honouring bans                                     | Low                     | High (contour and rhythm) |
| **3. Transformed motif** | Apply a transformation from the [mutation catalogue](mutation-catalogue.md#motif-development-transformations) (sequence, inversion, fragmentation, augmentation) to fit the chord or the room | Low to medium           | Medium to high            |
| **4. Lick library**      | A small set of motifs per identity, chosen by seeded weighted pick, each with masks (which chord degrees, which beat, which density), like Band-in-a-Box pattern weights and masks (S162)     | Low                     | High if the set is small  |
| **5. Soft motif bias**   | No placement: boost candidates that continue the motif's interval pattern (an n-gram bonus in slot B or C)                                                                                    | Low                     | Low: "motif-ish" at best  |

- **Rate, not quota.** A signature appears at a seeded rate ("about once every three phrases"),
  decided at phrase level from the phrase seed, never forced; strategy 1 makes the phrase easier
  to find, not harder, when the motif fits.
- **Who plays it.** In the player's line, a signature is something to read and learn (persona
  P1's vocabulary by exposure). In a system voice, it is a calling card: the companion's fill in
  the player's rest (strategy 1 inside the arranger's responding role,
  [accompaniment-systems §8.1](accompaniment-systems.md#81-recommended-family-role-based-rules-over-style-templates)).
- **The gimmick may be rhythmic or ornamental**, not melodic: "loves trills" is a figure-level
  preference (slot C on v3.1's levels, plus ornaments when D216's symbols exist).
- **Register spikes** ("sharp, brief high-pitched notes") are a special motif: one short note,
  far above the register centre, on a weak position, followed by a return. They need the leap and
  recovery rules (a spike is a large leap that owes a recovery) and a per-phrase spike budget.

## Combining identities

### Precedents

- **Products of experts.** Hinton combines several probability models by multiplying their
  distributions and renormalising: each "expert" can veto what it finds unlikely (S255). Johnson,
  Keller and Weintraut used exactly this for jazz melodies in Impro-Visor: an "interval expert"
  (contour) and a "chord expert" (consonance with the chord) each give a distribution over the
  next note, combined by the product-of-experts formula (S254). Pearce's weighted geometric mean of
  viewpoints is the weighted version (S244).
- **Logarithmic opinion pools** are the weighted product: each source's probabilities are raised
  to a weight before multiplying, so adding in log space. Heskes studies how to choose those
  weighting factors (S256).
- **Mixtures** (weighted arithmetic means) behave differently: any one source can make an option
  likely (Conklin's original combination, S244). A product means "all agree"; a mixture means "any of
  them may".
- **Cascades.** CSS resolves conflicting declarations by sorting them on origin and importance,
  context, element-attached styles, **layers**, specificity, then order of appearance;
  `!important` inverts the layer order, so "for important rules the declaration whose cascade
  layer is first wins" (S257).
- **Modifier stacks in games.** Unreal's Gameplay Ability System aggregates attribute modifiers by
  a fixed formula (first add to the base, then multiply and divide, then add a final amount),
  with an `Override` operation that ignores the computation (S258). Because values of one type
  are aggregated first, the result does not depend on the order effects were applied.
- **Game audio middleware.** Wwise maps a continuous game parameter (an RTPC) onto sound
  properties through curves, and uses **states** to switch whole sets of property values, like
  mixer snapshots, with transition times (S259); its music switch containers choose music by game
  state (S181). iMUSE let the game queue changes that took effect only at composer-marked decision
  points (S180).
- **Procedural game music.** _No Man's Sky_'s Pulse is, in its designer's words, "a glorified
  random file player" with the ability to control sets of sounds based on gameplay: an
  "instrument" is a set of sound variations placed in a "canvas" with playback rules (how often,
  pitch, pan, volume), and soundscapes vary between planet, space, wanted and map (S260, S183).
  _Spore_ ran generative music in an embedded Pure Data (S182). Neither composes identity layers
  of notes; both layer **rules over material**, which is what a symbolic generator can do more
  finely ([accompaniment-systems §5.4](accompaniment-systems.md#54-what-a-symbolic-generator-changes-inference)).

### A proposed blend model (inference)

**Layers, from lowest to highest precedence:**

1. **Base**: the player's own settings (ten controls, figure levels, key and mode).
2. **Location**: the place's texture, foundation roles, palette, mode leanings.
3. **Event**: a short-lived overlay (a storm, an ambush), on top of the location (D228).
4. **Speaker**: the identity of whoever owns the line being generated (the player's character
   for the lead line; each companion or antagonist for its own system voice).
5. **Status effects**: temporary modifiers, highest (see next section).

The player's **named controls stay outside the stack**, above everything soft: layers may only
narrow or bias what the controls allow (the rule in the previous section).

**Blend rule per field type:**

| Field type                                  | Rule                                                                                                          | Precedent                                      |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------------------- | ---------------------------------------------- |
| Allowed sets (collections, keys, chords)    | **Intersect** all layers; if empty, the higher layer wins and the lower becomes a preference, reported        | Constraint hierarchy (S248), CSS layers (S257) |
| Banned sets (pitch classes, chords)         | **Union**, then the static feasibility check                                                                  | Any expert can veto (S255)                     |
| Soft weights (degrees, note values, chords) | **Add integer "favour points"** across layers (a log-linear pool), each layer scaled by its strength, clamped | Log opinion pool (S256), PoE (S254, S255)      |
| Scalar targets (register centre, density)   | **Highest-precedence value**, or a strength-weighted mean for gentle blends                                   | CSS cascade, Unreal `Override`                 |
| Categorical choices (timbre, role)          | **Most specific owner wins**: a voice's own identity beats the location                                       | CSS specificity (S257)                         |
| Motif libraries                             | **Union, tagged by owner**; a motif plays only in its owner's voice                                           | Leitmotif per character                        |

**Favour points (inference).** A weight is stored as a small signed integer `p` (for example −3
to +3), meaning "×2 per point" relative to neutral. Combining layers is integer addition, which is
exactly a product of experts done in log space, order-independent and bit-exact; turning points
into the integer weights of slot C is a lookup in a table (`2^p` scaled). A ban is not "−∞
points" but a separate hard set, so the feasibility check can see it.

**Who influences whose line.** Companions shape their **own voices**; whether a companion also
nudges the player's line (a mentor making the player's phrases a little more like theirs) is a
game-design question. A product of the player's character and a companion would let the
companion veto notes in the player's line, which may feel like a penalty (D66).

**Changes happen at phrase boundaries.** As with v2.1's settings changes and adaptive music's
phrase branching (S159), a change of location, event or party takes effect on the next generated
phrase, never mid-phrase, so the phrase on screen stays the phrase played.

## Status effects as modifiers

A status effect in games is "a temporary modification to a character's attributes, abilities,
or conditions", expiring "after a set duration or once a specific condition is met" (S238).
Unreal's Gameplay Effects have three duration policies (instant, infinite, has duration) and
stacking policies (stack count up to a maximum, refreshing or extending the duration, or separate
instances with their own timers) (S258).

The endgame's examples (blindness, tone deaf, pitch scare) are undefined
([endgame](../../specs/vision/endgame.md#status-effects)). Possible readings, all **(inference)**:

| Effect             | Acts on                          | A possible identity form                                                                                                  |
| ------------------ | -------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| Blindness          | Display only                     | A display-effect layer (the endgame's own reading); no generation change                                                  |
| Tone deaf          | Sound layer, or pitch vocabulary | The system voices' tuning or timbre gets "cloudier"; or the lead line narrows to fewer pitch classes (easier, not harder) |
| Pitch scare        | Pitch planner                    | Register spread shrinks, leaps are disfavoured (points), spikes forbidden: the line "hides" in a narrow band              |
| An ally's blessing | Pitch and embellishment          | The ally's favourite figures get +1 point in the player's line for three phrases                                          |

- **Duration in phrases**, not seconds: an effect starts and ends at phrase boundaries, so the
  phrase's request (and its replay key) fully describes it.
- **Status effects sit at the top of the stack** and are the natural place for `Override`.
- **D66 still applies.** An effect may make the music sound different; one that makes the
  player's task harder to read or play is a penalty, which the guiding principle excludes unless
  the owner decides otherwise. "Tone deaf" that simplifies the line fits; one that hides notes
  needs the open win-or-lose discussion.

## Existing style and preset formats

| Format                                  | What a style holds                                                                                                                                                                                                                                                    | Weights and randomness                                                                                      | Sources                                          |
| --------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- | ------------------------------------------------ |
| **Band-in-a-Box styles**                | Short patterns per instrument (8, 4, 2, 1 beats), A and B sub-styles, drum fills; patterns recorded over C7 and transposed; "voice leading" settings including a riff-keeping mode                                                                                    | Weight 1–8 per pattern, plus masks (bars, chord types, chord intervals); random pick on each replay         | S162                                             |
| **Impro-Visor style files**             | Bass, drum and chord patterns in a Lisp-like text format; accompaniment instrument ranges; swing values; chord voicing type. Not specified by the style: meter, instruments                                                                                           | `(weight w)` per pattern: "A pattern with weight w is chosen with probability w/s", s the sum for that span | S141                                             |
| **Impro-Visor grammars**                | A probabilistic grammar producing abstract melodies (note categories and durations) instantiated over chords                                                                                                                                                          | A probability per rule                                                                                      | S253, S165                                       |
| **iReal Pro styles**                    | Recorded performances, not editable; pattern sets by tempo and by first or last chorus; fills into double bar lines "most times rather than every time"                                                                                                               | Fixed                                                                                                       | S164                                             |
| **Yamaha style files (SFF, SFF2)**      | A standard MIDI file plus a proprietary "CASM" chunk holding per-channel tables, note limits, note transposition rules and chord rules; sections include intros, main variations, fills and endings (community documentation; Yamaha publishes no full specification) | None in the format; the keyboard plays sections on demand                                                   | S261                                             |
| **Ableton Live 12 MIDI generators**     | Rhythm, Seed, Shape, Stacks and Euclidean generators; Seed "randomly generates notes within specified pitch, length and velocity ranges", with a density setting; with a clip scale on, pitch parameters "use scale degrees instead of semitones"                     | Random within ranges; some devices have explicit re-roll buttons                                            | S262                                             |
| **Strudel and TidalCycles patterns**    | Live-coded pattern expressions; `wchoose` picks from a list "by giving a probability to each element"; `degradeBy` removes events by an amount; `sometimesBy` applies a function with a probability                                                                   | Tidal's randomness is "deterministic. At a certain cycle time, you will always get the same number"         | S263                                             |
| **MySong**                              | Two beginner sliders, a "happy factor" and a "jazz factor", bias a chord-choosing model                                                                                                                                                                               | Weights exposed as two sliders                                                                              | S174                                             |
| **Infinite Flow v3.1 preset** (planned) | Ten controls, seven figure levels, a key and mode restriction (two halves, each "any" or an ordered list), a name                                                                                                                                                     | Figure levels as seeded integer draws                                                                       | [presets.md](../../specs/archive/v3/presets.md) |

Lessons **(inference)**:

- **Weights plus masks** (Band-in-a-Box) is the proven, legible shape: "how often" and "only
  where". Impro-Visor's `w/s` rule is the plainest possible definition of a weight.
- **Express pitch in scale degrees**, as Ableton does once a scale is set: an identity written in
  degrees ("leans on degree 3, avoids degree 7") transposes to any key for free, while a ban on a
  **named pitch** ("hates G") deliberately does not. Both forms are needed.
- **Randomness keyed to position** (Tidal) is what the project already does with
  `hash(seed, decision, candidate)`.
- **"Most times rather than every time"** (iReal Pro) is the right default for signatures.
- **Sections and variations** (Band-in-a-Box A/B, Yamaha main variations) suggest an identity
  may hold two or three moods ("calm", "fighting") selected by the game, like Wwise states.

## Draft identity schema (inference)

This whole section is the author's sketch, not a spec. It shows the **shape** of an identity as
plain, serialisable data, how each field combines, and what it reuses from v3.1.

### Families

| Family            | Fields (examples)                                                                                                                                     | Hard or soft                                    | Blend rule                                | Reuses                                                                        |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------- | ----------------------------------------- | ----------------------------------------------------------------------------- |
| **meta**          | `id`, `kind` (character, location, event, status, companion), `version`, `strength`, `scope` (own voice, lead line, all voices), `moods`              | n/a                                             | n/a                                       | Preset name and id                                                            |
| **tonal**         | `keys`, `modes` (any or ordered list), `bannedPitchClasses`, `dislikedPitchClasses`, `degreePoints`, `chordPoints`, `bannedChords`, `templatePoints`  | Restriction and bans hard; points soft          | Intersect, union, add points              | v3.1 key and mode restriction; capabilities                                   |
| **rhythm**        | `noteValuePoints` (v4's rhythm ratios), `onsetPoints` (on the beat, off the beat), control ranges for density, syncopation and silence, `rhythmCells` | Ranges hard; points soft                        | Intersect ranges, add points              | Rhythm controls; v3.2 rhythm lock's stored rhythm                             |
| **melodic**       | `registerCentre`, `registerSpread`, `intervalPoints` by size class (step, skip, leap, large leap), `contourPoints`, `spikes` (rate, size, length)     | Soft, inside the hard window and Leapiness caps | Highest precedence, or mean; add points   | Register and window; Leapiness classes; Contour                               |
| **embellishment** | `figureLevels`, `ornamentPoints` (trill, mordent, turn)                                                                                               | Soft                                            | Highest level among layers, or add points | v3.1 figure levels                                                            |
| **motifs**        | `signatures[]`: abstract notes (category, duration, contour step), `placement` mask, `rate`, `allowedTransforms`                                      | Hard once placed; placement soft                | Union, tagged by owner                    | Mutation catalogue transforms                                                 |
| **arrangement**   | `rolePoints` (pad, comping, counter-melody, fill, …), `registerLane`, `patternPoints`, `maxVoices`                                                    | Soft; lane hard for the voice                   | Most specific owner wins                  | Arranger roles ([arranging-and-roles](arranging-and-roles.md#role-catalogue)) |
| **sound**         | `instrument` (a sound-library synth), `brightness`, `articulation`                                                                                    | Not a note constraint                           | Most specific owner wins                  | Instrument profile (range only)                                               |
| **combination**   | `precedence`, `blend` overrides per field, `duration` in phrases and `stacking` (status effects only)                                                 | n/a                                             | n/a                                       | Session's phrase-boundary changes                                             |

### Example (inference)

The owner's two characters (names invented here), written in the sketch format. Points are "×2 per point" relative to
neutral; absent fields mean "no opinion".

```yaml
id: mira
kind: character
version: 1
scope: own-line # applies when Mira's line is generated
tonal:
  keys: [A]
  modes: [Aeolian, Dorian] # "the A scale", made precise
  bannedPitchClasses: [G] # hard: "absolutely hates G"
  degreePoints: { 1: +1, 5: +1 }
embellishment:
  ornamentPoints: { trill: +2 } # "loves trills" (needs D216's ornaments)
motifs:
  signatures:
    - name: mira-call
      notes: [C/8, S/8, C/4] # chord tone, scale tone, chord tone (Impro-Visor categories)
      contour: [up, up]
      placement: { where: last-beats-before-rest, rate: about-1-in-3-phrases }
      allowedTransforms: [sequence, inversion]
---
id: shade
kind: character
version: 1
scope: own-line
melodic:
  registerCentre: low-window-centre
  registerSpread: narrow
  spikes: { rate: about-1-per-phrase, size: large-leap, length: sixteenth-or-eighth }
rhythm:
  noteValuePoints: { half: +1, sixteenth: +1 } # long low notes, short high spikes
sound:
  instrument: dark-fm-bass
```

### How it extends today's preset (inference)

- **A v3.1 preset is an identity with only the base family**: ten control values, seven figure
  levels, a key and mode restriction. Nothing in v3.1 needs to change for identities to arrive
  later; the restriction's "two halves, each any or an ordered list" form is reused as is.
- **Capabilities** (`allowsChromaticApproach`) stay the way a profile switches vocabulary on,
  because planners check capabilities, never names
  ([generator-architecture.md](../../specs/generator-architecture.md#generator-profiles)).
- **Values become ranges plus points.** A preset sets a value ("Contour: Arch"); an identity may
  allow a range ("Arch or Falling") and lean inside it. The player's chosen value always wins.
- **One new kind of data: material** (motifs, rhythm cells), which today's presets cannot hold
  ([preset catalogue](preset-catalogue.md#what-no-setting-can-express-today)).

## Learning identities

- **From a corpus.** Key profiles are the classic example of weights counted from music: Aarden's
  profiles from the Essen folk-song collection, Albrecht and Shanahan's from a large corpus (S65,
  S66). Pearce's IDyOM trains long-term models on a corpus and short-term models on the piece
  being heard (S244). The same counting gives an identity: count pitch classes, degrees, intervals,
  note values and onset positions in a set of melodies, then compare with what the neutral
  generator produces.
- **From the player's own sessions.** The v3.0 review keeps played notes, and v3.2's Jam grows a
  doodle; the same data could seed a "your style" identity, the Continuator idea (S57, S93)
  without its live learning.

A proposed recipe, all **(inference)**:

1. **Count** the feature (a histogram).
2. **Smooth**: add a small pseudocount to every bin, so a value never seen is unlikely rather
   than impossible (additive smoothing, S264). A learnt identity never creates a ban; bans are
   authored.
3. **Compare with neutral**: divide by the neutral generator's own histogram for the same
   settings, measured over a fixed seed matrix. The identity is the **difference** from what the
   app would do anyway; otherwise every learnt identity would mostly re-learn the generator.
4. **Quantise** each ratio to favour points (−3 to +3, a base-2 logarithm rounded), so the result
   is a few small integers a person can read and edit.
5. **Freeze** it as a versioned identity record. Learning is an explicit action ("learn my style
   from these sessions") that produces a visible change, never a drift during a session.

Why it must stay this way: the replay key must reproduce every phrase; tests must be golden;
D66 makes anything adaptive opt-in and visible; and a beginner should be able to read "you use
the fifth degree a lot" rather than a table of probabilities.

## Explaining identities to the player

- **The project already has a template**: state the request, the binding constraint, what was
  applied and its effect, naming "at most the one or two binding constraints"
  ([control-interaction](<Melodic control models/control-interaction.md>)). Google's PAIR guidebook,
  which that note cites, recommends explaining a specific output in response to the user's
  action, with partial explanations focused on what matters (S266).
- **An identity card** in plain words, three to five habits, each one a lexicon term: "Never
  plays G", "Loves trills", "Low, with sudden high notes", "Often ends with its little rising
  call". Frequency words ("often", "sometimes", "never") instead of numbers.
- **Per-phrase reasons**, from provenance the planners already record: "Kept out G (Mira)", "Two
  trills (Mira's favourite)", "Mira's call, bar 4". One line, most important first.
- **A deterministic "what if"** **(inference)**: because the same request and seed give the same
  phrase, the app can generate the **same seed without the identity** and let the player hear
  both. An exact A/B comparison is rare in generative music and is the clearest possible
  explanation of what an identity does.
- **Few identities at once.** Each added layer makes the music harder to explain. Showing only
  the speaker's identity and any status effect, with the location as a background label, keeps it
  legible.
- **Sliders as the beginner model.** MySong showed non-musicians steering a model through two
  named sliders (S174); an identity editor could expose a few named leanings rather than raw
  points.
- Herremans, Chuan and Chew's taxonomy classes generation systems by what they are for (S265);
  for this app the purpose is learning to read and play, so explanations matter more than in
  most generators.

## Testing an identity (inference)

- **Hard parts are invariants.** The independent validator gains checks such as "no banned pitch
  class sounds in this voice" and "every placed signature is complete", rebuilt from the result
  as today's validator does.
- **Soft parts are measured, not asserted per phrase.** Over a fixed seed matrix (as the preset
  catalogue's 100-seed samples), extract histograms (jSymbolic-style features, S205) and check that
  the identity moves them in the intended direction by at least a threshold, compared with the
  same seeds without the identity. This catches **inaudible** weights, the main lesson of the
  preset catalogue ("Jazz chromatic notes were 1.1–1.5 % of all notes",
  [preset catalogue](preset-catalogue.md#todays-chromatic-notes-are-barely-audible)).
- **Static feasibility over every built-in identity and every allowed combination** in CI, so an
  `identity_conflict` is an authoring bug caught before release.
- **Golden replay keys** per identity, and the "empty identity equals today" test.

## Risks

- **Over-constraint and search cost.** Each ban and placed motif shrinks the space, which can make
  the search slower before it fails (the pitch search is the expensive step, ISS-009). Mitigation:
  the static check, and measuring fuel per identity.
- **Inaudible weights.** Weights that only reorder ties change little when ties are rare
  (preset-catalogue finding). Rank levels (slot B) and planned material (slot D) are more
  audible than weighted ties (slot C).
- **Monotony.** Strong weights plus a frequent signature make every phrase of a character sound
  the same; the player's reading practice then drifts toward memorising.
- **Indistinct identities.** Two characters whose differences are all soft may sound alike.
  Distinctiveness should be measured (feature distance between their sample sets).
- **Blend surprises.** A product lets any layer veto; an intersection can be empty; an override
  can hide an identity entirely. Each needs a reported reason.
- **Replay keys grow** if they carry resolved identities; a content hash plus a data version is
  smaller but ties replay to the catalogue.
- **Floating point.** Any weight computed with `Math.log` or `Math.pow` risks different phrases on
  different browsers (S77); integer points avoid it.
- **Penalty by the back door.** Status effects and antagonists can make reading harder, against
  D66.
- **Wrong theory in data.** "The A scale" without a mode is ambiguous; identity authoring needs
  the same theory care as the lexicon.

## Open questions

1. **Scope of a ban**: the identity's own line only, or every voice while it is on stage? (It
   decides whether "hates G" can block chords.)
2. **Does a ban change the collection** (so F to A becomes a step) or only filter candidates?
3. **May identity constraints be relaxed** by a declared ladder, as an exception to "never relax
   a control", or must an infeasible phrase fail like today?
4. **Does a companion influence the player's line**, or only its own voice?
5. **Which slot for each soft field**: strict rank level (B) or weighted order (C)? Listening
   tests decide what is audible.
6. **How the replay key carries identities**: resolved data, or ids plus a data version?
7. **Are learnt identities in scope**, and from what (the player's sessions only, or bundled
   corpora with their licences)?
8. **How many layers** may be active at once, and is there a precedence the player can see?
9. **Moods**: does an identity hold variations ("calm", "fighting") chosen by the game?
10. **Status effects**: which ones change generation, which only display or sound, and how they
    respect D66?
11. **Authoring**: are identities written by hand in data files, edited in the app, or both?

## Lexicon candidates

Merged into the [lexicon](lexicon.md) on 2026-10-11 together with the candidates of the sibling [musical identity](musical-identity.md) note: [Musical identity](lexicon.md#musical-identity), [Register spike](lexicon.md#register-spike) and [Timbre](lexicon.md#timbre). Hard constraint, soft preference, banned and disliked notes, identity layer, status effect, pitch-class histogram, Markov chain and lick library are generation or game-design terms rather than music terms, so they are explained only in this document (see [Terms used here](#terms-used-here)).

## Sources

This document's sources are registered in [research sources](research-sources.md), in the block
[Identity Modelling (endgame)](research-sources.md#identity-modelling-endgame) (merged on
2026-10-11). They are reference only: no text is copied or closely paraphrased beyond the short
quotations marked as such. All URLs were checked on 2026-10-11.

- New for this document: S242–S266.
- Shared with [musical identity](musical-identity.md) and registered in
  [its block](research-sources.md#musical-identity-endgame): S205 (jSymbolic 2.2), S238 (status
  effect) and S240 (Conklin and Witten, multiple viewpoints).
- Already in the register: S53, S54, S55 (melody recognition), S57, S93 (the Continuator), S58,
  S95 (GenJam), S59 (survey), S60, S62, S63, S64, S65, S66 (key profiles and Temperley), S77
  (ECMAScript approximated maths), S141 (Impro-Visor style editor), S159 (adaptive music), S162
  (Band-in-a-Box StyleMaker), S164 (iReal Pro), S165, S166 (Impro-Visor), S174 (MySong), S177
  (Cope), S178, S179 (Pachet and Roy), S180 (iMUSE), S181 (Wwise), S182 (_Spore_) and S183
  (_No Man's Sky_).
