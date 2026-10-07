# Mutation Catalogue

Status: research v1 (2026-10-07)

## Purpose

v3.2 brings **Jam**: the player plays a short idea, a "doodle", and the generator continues and
develops it. Musicians call such an idea a **motif** (the smallest melodic idea you can recognize,
S40) and building on it **motivic development**. With Jam come a **rhythm lock** (the rhythm stays
stable across the session, bent only a little for tension and release) and a **mutation option
"with a list of allowed mutations"** (the owner's words, D211;
[v3 README](../../specs/versions/v3/README.md#rhythm-lock-and-mutation)).

[O118](../../specs/decisions.md) asks what that list lists: (a) which
settings v2's settings-mutation flag may change, or (b) which kinds of rhythm change are allowed
while the rhythm lock holds. This catalogue serves both readings and adds a third family, the
motif-development transformations, since Jam develops the player's motif:

1. [What mutates today](#what-mutates-today): reading (a), the settings the flag already changes.
2. [Rhythm mutations](#rhythm-mutations): reading (b), changes to a rhythm that keep it
   recognizable.
3. [Motif-development transformations](#motif-development-transformations): pitch and rhythm
   together, the composer's toolbox for growing an idea.

It ends with a [proposed first list](#a-proposed-list-for-the-app-proposed),
[proposed lexicon entries](#proposed-lexicon-entries), [sources](#sources) and
[questions for the spec session](#questions-for-the-spec-session). Nothing here is decided;
everything marked "(proposed)" is this researcher's judgment for the spec session to accept,
change or drop.

## How this was gathered

- **Repository.** The settings-mutation engine
  ([settings-mutation.ts](../../src/session/settings-mutation.ts),
  [settings-mutation-scales.ts](../../src/session/settings-mutation-scales.ts),
  [session-mutation-step.ts](../../src/session/session-mutation-step.ts)), its atoms, the
  [v2 master spec §5](../../specs/versions/v2/master-spec.md#5-control-changes-during-a-session),
  the rhythm grammar ([rhythm-phrase-structure.md](rhythm-phrase-structure.md),
  [transform-descriptors.ts](../../src/domain/rhythm/transform-descriptors.ts)), the
  [lexicon](lexicon.md) and the v3 spec notes.
- **Music theory.** Two open textbooks already used by the project (Music Theory for the
  21st-Century Classroom, "MT21C", and Open Music Theory, "OMT"), Schoenberg's composition manual
  as commonly referenced, and three Wikipedia articles for standard term definitions.
- **Perception.** Four studies on how listeners recognize a changed melody or rhythm (S53–S56).
  They are the evidence behind the "how recognizable" field and the distance scale.
- **Algorithmic composition.** Three systems or surveys that use "mutation" or "continuation" in
  the sense Jam needs (S57–S59).
- **Notation used in examples.** Durations are in the app's **ticks**, one sixteenth note each
  ([lexicon: Tick](lexicon.md#tick)): a quarter note ♩ is `4`, an eighth note ♪ is `2`, a
  sixteenth is `1`, a dotted quarter is `6`, a half note is `8`. A rest is written `r4`, a tie
  (one note held across a written boundary) `~`, a bar line `|`. One 4/4 measure is 16 ticks.
  Example: ♩ ♩ ♪♪ ♩ is `4 4 2 2 4`.

## What mutates today

### The v2 settings-mutation flag, as built

The flag is called **Vary settings** in the interface ([lexicon](lexicon.md#vary-settings)) and the
"settings-mutation flag" in the specs. It shipped in v2.1. What the code does:

- **When.** Mutation number k lands on a phrase fixed in advance: the gap before it is 2 to 4
  phrases, drawn from a seeded stream of (seed, k) alone, so a session's mutations replay from its
  stored inputs (`mutationGap`, `mutationPhrase`, `MUTATION_GAP_MIN`/`MAX` in
  [settings-mutation.ts](../../src/session/settings-mutation.ts); the streams `settings-mutation`
  and `settings-mutation-gap` in [streams.ts](../../src/domain/random/streams.ts)). It starts off
  (D176).
- **What.** Exactly one setting changes, by one grade, either way. The draw first picks one
  setting uniformly among those that have a neighbour value, then one of its neighbours uniformly,
  and draws again from the same stream while the result lands on a combination the generator does
  not support (`drawMutation`; atoms
  [rule_mutation_draws_setting_then_direction](../rule_mutation_draws_setting_then_direction.atom.md)
  and [rule_mutation_rerolls_unsupported_combination](../rule_mutation_rerolls_unsupported_combination.atom.md)).
- **Where it lands.** At the next phrase not yet sounding
  ([session-mutation-step.ts](../../src/session/session-mutation-step.ts),
  [master spec §5](../../specs/versions/v2/master-spec.md#5-control-changes-during-a-session)).
- **For how long.** Only the session: at its end every mutated setting returns to the player's
  choice ([rule_mutation_reverts_at_session_end](../rule_mutation_reverts_at_session_end.atom.md)).

### Which settings it touches

`MUTABLE_SETTINGS` in [settings-mutation-scales.ts](../../src/session/settings-mutation-scales.ts)
lists 13: every generation control except **tempo** (it has its own adaptive-tempo flag) and the
**instrument**, plus the musical profile's name. What "one grade" means for each is data in
`MUTATION_SCALES` ([rule_mutation_setting_scales](../rule_mutation_setting_scales.atom.md)):

| Group (proposed) | Setting (code name)                  | One grade means                                                                 |
| ---------------- | ------------------------------------ | ------------------------------------------------------------------------------- |
| Key and mode     | Written key (`tonalCenter`)          | one place round the circle of fifths, wrapping (one sharp or flat more or less) |
| Key and mode     | Collection (`collection`)            | Major ↔ Minor, or one mode along Lydian … Locrian by brightness; never between  |
| Harmony          | Harmonic motion (`harmonicMotion`)   | one place along Static, Gentle diatonic, Active diatonic, no wrap               |
| Tension          | Tension (`tension`)                  | one place along Settled, Lift, Build, Edge                                      |
| Rhythm           | Note density (`noteDensity`)         | Quarter ↔ Eighth ↔ Sixteenth, from the density actually generated with (D177)   |
| Rhythm           | Rhythmic variety (`rhythmicVariety`) | Strict ↔ Slightly varied ↔ Heavily varied                                       |
| Rhythm           | Syncopation (`syncopation`)          | Straight ↔ Occasional offbeats ↔ Active displacement                            |
| Rhythm           | Silence density (`silenceDensity`)   | Sparse ↔ Conversational ↔ Breath-heavy                                          |
| Melody shape     | Contour (`contour`)                  | any other shape (Rising, Falling, Arch, Wandering have no order)                |
| Melody shape     | Register (`register`)                | Low ↔ Middle ↔ High, never Varying                                              |
| Melody shape     | Leapiness (`leapiness`)              | one place along Smooth, Shaped, Leaping, Angular                                |
| Melody shape     | Arpeggio chaos (`arpeggioChaos`)     | one place along Predictable, Varied, Chaotic                                    |
| Style            | Musical profile (`musicalProfile`)   | Neutral ↔ Jazz as a name only; every control is kept                            |

The flag never changes a phrase's rhythm or pitches directly: it changes a setting, and the next
phrase is generated from scratch with it. A rhythm-setting mutation therefore produces a phrase
whose rhythm has nothing in common with the last one beyond the shared settings. That is the
opposite of what a rhythm lock wants, which is why D175 already says a mutation cannot alter a
locked rhythm durably ([v3 README](../../specs/versions/v3/README.md#rhythm-lock-and-mutation)).

### How a player-chosen allowed list would map onto it (reading a)

The engine is ready for it in shape: `drawMutation` already builds its `eligible` list by
filtering `MUTABLE_SETTINGS`, so an allowed list is one more filter on that list
([settings-mutation.ts](../../src/session/settings-mutation.ts)). Four things need a decision:

1. **Granularity (proposed).** Thirteen checkboxes is a lot for a beginner. The six groups in the
   table above (Key and mode, Harmony, Tension, Rhythm, Melody shape, Style) are a more readable
   list; each group switches its settings on or off together.
2. **A restricted list can run out of legal moves, which today crashes.** `drawMutation` throws
   `SettingsMutationError` when no candidate is supported. Today this cannot happen: the
   musical-profile flip keeps every control, so it is always supported once `mutateSettings` has
   checked the starting settings. With a restricted list it can. Example: Eighth note density,
   Strict variety, Sparse rests, Active displacement, and only note density allowed: both
   neighbours, Quarter and Sixteenth, land on blocked combinations (Quarter + Sparse + Active
   displacement and Sixteenth + Sparse + Active displacement are blocked under Strict;
   [unsupported-rhythm-settings.ts](../../src/domain/controls/unsupported-rhythm-settings.ts),
   [lexicon](lexicon.md#unsupported-rhythm-combination)). The spec says the cycle is "never
   silently skipped" ([master spec §5](../../specs/versions/v2/master-spec.md#5-control-changes-during-a-session)),
   so the spec session must choose: skip this one visibly, refuse such a list at Idle, or widen
   the draw.
3. **The rhythm lock removes the Rhythm group.** While the lock is set, a durable change of note
   density, variety, syncopation or silence density would contradict D175. Proposed: the Rhythm
   group is ineligible while the lock is set, and the lock's own bends (next section) replace it.
4. **Jam and the key.** D209 says the player-selected key and mode stay authoritative and "the
   app never switches them on its own". Today the flag does exactly that when Key and mode is
   eligible. Whether D209 covers only the key suggestion or also mutation in Jam is a question for
   the spec session; proposed: Key and mode is off by default in Jam.

## Rhythm mutations

Reading (b). Each entry is a change to a rhythm that keeps it recognizable to some degree.

### The distance scale (proposed)

To order mutations "from close variations to looser ones" (D209), this catalogue uses a five-step
**drift distance**. It rests on two findings: the number of small edits (insert, delete, change
one value) between two rhythms predicts how different listeners hear them, and the same edit
matters more or less depending on where in the measure it falls (S56). Edits that touch a strong
beat are therefore counted as larger.

| Distance | Name    | Rhythm meaning (proposed)                                                                                   | Holds the lock? |
| -------- | ------- | ----------------------------------------------------------------------------------------------------------- | --------------- |
| 0        | Same    | identical                                                                                                   | yes             |
| 1        | Close   | one local edit inside a beat; every note start on beats 1 and 3 kept; attack count changes by at most 1     | yes, as a bend  |
| 2        | Near    | one edit that moves, adds or removes a note start next to or on a strong beat, or two Close edits           | short bend only |
| 3        | Related | a whole-pattern operation that keeps proportions or order but moves everything (doubling, shifting, a part) | no              |
| 4        | Loose   | an operation that reverses order or swaps notes and rests; recognizable mainly by reasoning, not by ear     | no              |

"Holds the lock" is the proposed answer to part of
[O103](../../specs/open-questions.md#v3-rhythm-candidates-o100) (how far a bend goes): a bend is
distance 1, or distance 2 for one measure, and the next phrase returns to the locked rhythm.

### Rules every rhythm mutation must still obey

From [rhythm-phrase-structure.md](rhythm-phrase-structure.md) and the
[lexicon](lexicon.md#metrical-anchor), a generated rhythm must still:

- tile each measure exactly, 16 ticks, on the sixteenth grid: no triplets, nothing shorter than
  a sixteenth ([exact time model](rhythm-phrase-structure.md#exact-time-model-and-grids));
- keep a note on beat 1 or beat 3 of every measure, tick 0 or 8 (the
  [metrical anchor](rhythm-phrase-structure.md#metrical-anchors)). The code counts a note event
  that **starts** there, a fresh start or a tie segment; a long note merely passing through tick 8
  does not count (`lacksMetricalAnchor` in
  [rhythm-invariants.ts](../../src/domain/rhythm/rhythm-invariants.ts));
- have no fully silent measure and no rest longer than 8 ticks, half a measure, and keep the
  phrase's total rest ticks inside the silence setting's band
  ([silence budgets](rhythm-phrase-structure.md#silence-budgets-and-interaction));
- keep each measure's number of note starts inside the note-density band (for example 4–8 for
  Eighth under Strict), and keep note lengths legal for the density and rhythmic variety;
- start the phrase with a note on tick 0 of measure 1
  ([rule_phrase_starts_on_downbeat](../rule_phrase_starts_on_downbeat.atom.md)).

A further rule matters for cost: **the grammar is versioned and frozen**; any new production or
transform needs a new grammar version
([normalization and identity](rhythm-phrase-structure.md#normalization-equivalence-and-identity)).
Several mutations below already exist as the grammar's **answer transforms**, the small changes
that turn measures 1–2 (the gesture) into measures 3–4 (the answer)
([gesture and answer](rhythm-phrase-structure.md#four-bar-gesture-and-answer)). Those are cheap
to reuse; the others are not.

Cost scale used below (proposed): **Low**, reuses an existing transform; **Medium**, a new
transform inside the current grammar model (new grammar version, validator codes, tests);
**High**, changes the phrase model or needs new planner capability.

### Split a note

- **Definition.** One note becomes two shorter notes of the same total length, so a new note
  start appears inside it. Schoenberg lists changing note lengths and multiplying notes among the
  ways to vary a motif's rhythm (S49); MT21C calls a partial change of rhythmic values "rhythmic
  change" (S41).
- **Example.** ♩ ♩ ♪♪ ♩ → ♩ ♪♪ ♪♪ ♩: `4 4 2 2 4` → `4 2 2 2 2 4`.
- **Distance.** 1 when the new start falls inside a beat; 2 when it falls on beat 3.
- **Grammar and feasibility.** Adds one note start: the measure must stay inside its density
  band. Under Quarter density with Strict variety, note lengths must be multiples of 4, so a
  quarter cannot split; Heavily varied admits eighths inside Quarter
  ([lexicon: Rhythmic variety](lexicon.md#rhythmic-variety)). A one-tick note cannot split.
  Pitch: the new note needs its own pitch, usually a repeat or a step (a choice for the pitch
  planner).
- **Styles.** Everywhere; the commonest variation in folk, pop and jazz heads.
- **Cost.** Medium: the grammar's only note-count-changing substitution today is note ↔ rest
  (below); a split is a new transform.

### Merge two notes

- **Definition.** Two neighbouring notes become one long note; the second start disappears.
- **Example.** ♩ ♪♪ ♩ ♩ → ♩ ♩ ♩ ♩: `4 2 2 4 4` → `4 4 4 4`.
- **Distance.** 1 inside a beat; 2 when the removed start was on beat 1 or 3.
- **Grammar and feasibility.** Exists: the grammar's merge plan removes one shared boundary
  between two notes in the gesture ([versioned grammar](rhythm-phrase-structure.md#versioned-mvp-construction-grammar)).
  Removes one note start: watch the density band's lower edge. A merge that removes the start on
  tick 8 leaves the measure's anchor to its note on tick 0, since a held note passing through
  tick 8 does not count.
- **Styles.** Everywhere; makes a line calmer.
- **Cost.** Low (the merge exists, limited to one per gesture in v1).

### Dot or undot (long-short ↔ even)

- **Definition.** Two neighbouring notes trade length without changing their sum: even notes
  become long-short (a dotted rhythm), or the reverse ([lexicon: Dotted note](lexicon.md#dotted-note)).
- **Example.** ♩ ♩ → ♩. ♪: `4 4` → `6 2`; or ♪♪ → ♪. 𝅘𝅥𝅯: `2 2` → `3 1`.
- **Distance.** 1: the note count stays, one start moves inside the pair.
- **Grammar and feasibility.** Exists as `redistribute_note_pair`: it moves the boundary by one
  grid step of the density, keeping both notes positive and on the density's grid
  ([versioned grammar](rhythm-phrase-structure.md#versioned-mvp-construction-grammar)). Under
  Quarter density the step is 4 ticks, so `4 4` cannot become `6 2`; `4 8` ↔ `8 4` can.
- **Styles.** Classical and folk dotted rhythms, march; in swing jazz the written even eighths
  are already played long-short, so this reads differently there.
- **Cost.** Low.

### Add or remove a rest

- **Definition.** A note is replaced by a rest of the same length, or a rest by a note. The
  rhythm's outline stays; one start disappears or appears.
- **Example.** ♩ ♩ ♩ ♩ → ♩ 𝄽 ♩ ♩: `4 4 4 4` → `4 r4 4 4`.
- **Distance.** 1 on beats 2 and 4 or inside a beat; 2 on beat 1 or 3.
- **Grammar and feasibility.** Exists twice: the recurrence substitution (`N(d)` ↔ `R(d)` in
  measure 2) and `swap_final_pattern` (a note and a rest of equal length swap in measure 4)
  ([versioned grammar](rhythm-phrase-structure.md#versioned-mvp-construction-grammar)). The
  phrase's rest total must stay in the silence band (Sparse 4–8 ticks, Conversational 12–20,
  Breath-heavy 24–32); no rest over 8 ticks, so a rest next to another rest may join into one
  that is too long; a rest on tick 0 or 8 must leave the other anchor sounding.
- **Styles.** Everywhere; space is a strong jazz and funk device.
- **Cost.** Low.

### Move a rest

- **Definition.** A rest between two notes slides earlier or later; the note before it grows,
  the note after it shrinks.
- **Example.** `4 r4 4 4` → `6 r4 2 4` (♩. 𝄽 ♪ ♩).
- **Distance.** 1, or 2 when the moved note start leaves the grid of the density (an off-beat).
- **Grammar and feasibility.** Exists as `translate_interior_rest`
  ([versioned grammar](rhythm-phrase-structure.md#versioned-mvp-construction-grammar)); the rest
  total is unchanged by construction.
- **Styles.** Everywhere.
- **Cost.** Low.

### Displace a note by a sixteenth or an eighth

- **Definition.** One note starts a little later or earlier; its neighbour absorbs the
  difference. Starting off the beat is what the app calls syncopation
  ([lexicon](lexicon.md#syncopation); S8).
- **Example.** ♩ ♩ ♩ ♩ → ♩. ♪ ♩ ♩: `4 4 4 4` → `6 2 4 4` (the second note starts an eighth late);
  by a sixteenth, `4 4 4 4` → `5 3 4 4`.
- **Distance.** 1 for a note start that is not on beat 1 or 3; 2 if it is (the start leaves the
  strong beat).
- **Grammar and feasibility.** Exists as `displace_attack`: Occasional offbeats moves by +2 only,
  Active displacement by −2, −1, +1 or +2, Straight does not displace
  ([syncopation and ties](rhythm-phrase-structure.md#syncopation-and-ties)). A one-tick move needs
  Active displacement. Moving the note on tick 0 or 8 away breaks the anchor unless another note sounds there.
- **Styles.** Jazz, funk, Latin, pop; gentle in folk.
- **Cost.** Low within the syncopation setting; Medium if the lock allows displacement beyond
  what the syncopation setting allows.

### Anticipation (a "push")

- **Definition.** A note that belongs on a strong beat starts just before it, an eighth or a
  sixteenth early, and is held through the beat. OMT presents shifting notes early by half their
  length as a basic pop syncopation (S46). Do not confuse it with the harmony term **anticipation**, a
  melody note that arrives before the chord it belongs to (S44); they often happen together.
- **Example.** ♩ ♩ ♩ ♩ → ♩ ♪ ♪~♩ ♩: `4 4 4 4` → `4 2 2~4 4` (the third note starts at tick 6
  and is held through beat 3).
- **Distance.** 2: the strong-beat start moves, but the note still sounds on the beat.
- **Grammar and feasibility.** Inside a measure, the grammar can move the beat-3 note earlier
  (`displace_attack`, delta −2, Active displacement only) but cannot then write it as tied through
  beat 3: a tied sustain may only split a note no other transform has touched
  ([syncopation and ties](rhythm-phrase-structure.md#syncopation-and-ties)). The measure then
  keeps its anchor only through its note on tick 0. **The most idiomatic push,
  into beat 1 of the next measure, is not expressible**: every transform must keep its boundaries
  inside the measure ([syncopation and ties](rhythm-phrase-structure.md#syncopation-and-ties)),
  and a phrase cannot push into its own first downbeat
  ([rule_phrase_starts_on_downbeat](../rule_phrase_starts_on_downbeat.atom.md)).
- **Styles.** Pop, rock, funk, Latin, jazz.
- **Cost.** Low for the bare early start; Medium to write it as a held push (displacement plus
  tie); High across a bar line (ties across measures are a new grammar capability).

### Shift the whole motif (metric displacement)

- **Definition.** The whole rhythm moves later by the same amount, so every note lands on a
  different part of the beat. OMT calls the amount the displacement index, for example "+1
  eighth" (S47).
- **Example.** ♩ ♩ ♩ ♩ → 𝄾 ♩ ♩ ♩ ♪: `4 4 4 4` → `r2 4 4 4 2`.
- **Distance.** 3: every note changes metric position, so the rhythm feels new even though its
  gaps are the same (S56 reports that metric placement changes how big an edit sounds).
- **Grammar and feasibility.** Illegal as is: in the example no note starts on tick 0 or 8, so
  the anchor rule fails, and in measure 1 the phrase no longer opens with a note on tick 0. It
  only works with a tie segment added on tick 8, or applied to a measure that keeps another note
  there. Off-grid for Quarter density.
- **Styles.** Jazz and contemporary composition; a known device for surprise.
- **Cost.** Medium.

### Regroup into 3 + 3 + 2

- **Definition.** Even notes are regrouped into long-long-short units of 3, 3 and 2 parts, the
  "tresillo" rhythm. OMT describes it as a near-triplet that keeps the simple beat division (S46).
- **Example.** ♪♪♪♪ → ♪. ♪. ♪: `2 2 2 2` → `3 3 2`; over a measure, `4 4 4 4` → `6 6 4`.
- **Distance.** 2 inside one beat pair, 3 over a whole measure.
- **Grammar and feasibility.** Needs 3-tick or 6-tick notes, so the sixteenth grid or variety
  levels that allow dotted values. The note on tick 8 moves to tick 6 in the measure version:
  check the anchor (tick 0 still sounds, so it holds).
- **Styles.** Latin, pop, rock, funk, Afro-Cuban.
- **Cost.** Medium.

### Augmentation (double every length)

- **Definition.** Every note and rest lasts twice as long; the motif keeps its proportions and
  takes twice the time (S41, S51).
- **Example.** ♩ ♩ ♪♪ ♩ (one measure) → 𝅗𝅥 𝅗𝅥 ♩ ♩ 𝅗𝅥 (two measures): `4 4 2 2 4` → `8 8 | 4 4 8`.
- **Distance.** 3: same pattern, half the speed; it also feels calmer.
- **Grammar and feasibility.** Halves the note starts per measure, which almost always leaves the
  current density band (5 starts in one measure become 2–3 per measure; Eighth needs 4–8). It
  needs a density step at the same time. A two-measure doodle augmented fills the whole
  four-measure phrase, leaving no room for anything else.
- **Styles.** Classical (fugue, theme and variations), film music; rare in jazz improvisation.
- **Cost.** Medium for rhythm; it interacts with the note-density setting.

### Diminution (halve every length)

- **Definition.** Every length is halved; the motif goes twice as fast (S41, S51).
- **Example.** `4 4 8` (♩ ♩ 𝅗𝅥) → `2 2 4` (♪ ♪ ♩), then something else for the free 8 ticks.
- **Distance.** 3.
- **Grammar and feasibility.** Doubles the starts per measure: likely over the density band; a
  one-tick note cannot halve (no 32nd notes); an odd length (3 ticks) cannot halve on the grid.
- **Styles.** Classical; the "faster units" of a continuation (S45).
- **Cost.** Medium.

### Fragmentation (reuse a part)

- **Definition.** Only part of the motif, often its first beat or its last beat, is repeated on
  its own, making shorter units. OMT names this as a trait of a phrase's continuation (S45);
  MT21C calls the parts fragments (S42).
- **Example.** One-measure motif `4 2 2 4 4` → its first two beats (`4 2 2`) twice, filling the
  measure: `4 2 2 4 2 2`.
- **Distance.** 3 (2 when the fragment is the motif's opening, which listeners know best,
  proposed).
- **Grammar and feasibility.** Fits the grammar's beat-cell model well: the recurrence witness
  already copies one beat of measure 1 into measure 2
  ([versioned grammar](rhythm-phrase-structure.md#versioned-mvp-construction-grammar)). Repeating
  short fragments raises note density: check the band.
- **Styles.** Classical sentence form, jazz riffs, pop hooks.
- **Cost.** Medium.

### Repeat with a changed ending

- **Definition.** The rhythm comes back unchanged except its last beat or two.
- **Example.** `4 4 2 2 4` → `4 4 2 2 r2 2` (♩ ♩ ♪♪ 𝄾 ♪).
- **Distance.** 1.
- **Grammar and feasibility.** This is the grammar's gesture and answer rule: measure 4 must end
  differently from measure 2 ([lexicon](lexicon.md#gesture-and-answer)).
- **Styles.** Everywhere; the backbone of blues and song form (AAB).
- **Cost.** Low.

### Density step on one beat

- **Definition.** One beat moves one level finer or coarser: a quarter becomes two eighths, two
  eighths become four sixteenths, or the reverse. It is the local version of the Note density
  setting.
- **Example.** `4 4 4 4` → `4 2 2 4 4` (finer on beat 2).
- **Distance.** 1 on one weak beat; 2 on a strong beat or two beats; a whole measure is 3, and
  every measure at once is what a note-density mutation does, which regenerates the rhythm.
- **Grammar and feasibility.** Allowed only if the density and variety admit the finer value
  ([lexicon: Rhythmic variety](lexicon.md#rhythmic-variety)); the band still applies.
- **Styles.** Everywhere; a natural "build" for tension (proposed: the lock's bend for Build and
  Edge tension).
- **Cost.** Medium.

### Rhythmic retrograde (play the durations backwards)

- **Definition.** The lengths come in reverse order.
- **Example.** `4 2 2 8` → `8 2 2 4`.
- **Distance.** 4: even for melodies, backwards order is hard to recognize by ear (S53); no
  source found for rhythm alone.
- **Grammar and feasibility.** The measure stays full. Whether a start still falls on tick 0 or
  8 depends on the pattern (in the example both do), and a rest that ended the measure now opens
  it, which breaks the downbeat-start rule in measure 1.
- **Styles.** Twentieth-century composition; GenJam's "reverse" mutation does this to a
  measure (S58).
- **Cost.** Medium.

### Rhythmic "inversion" (swap long and short, or notes and rests)

- **Definition.** No settled meaning: the sources consulted define inversion for pitch only
  (S41, S48). Two readings are in use: swapping long and short values, or swapping notes and
  rests (filling the silences and silencing the notes).
- **Example.** Notes ↔ rests: `4 r4 2 r2 4` → `r4 4 r2 2 r4`.
- **Distance.** 4.
- **Grammar and feasibility.** The notes ↔ rests reading breaks most rules at once: a rest on
  tick 0, the phrase's downbeat start, the silence band. Not recommended (proposed).
- **Styles.** Experimental.
- **Cost.** Medium, and low value.

### Rotation

- **Definition.** The pattern slides round inside its own span: what falls off the end comes back
  at the start. GenJam uses "rotate right" as a mutation (S58).
- **Example.** `4 2 2 8` rotated by one note → `8 4 2 2`.
- **Distance.** 3 to 4.
- **Grammar and feasibility.** Keeps the measure filled exactly, but moves every start: anchor
  check needed.
- **Styles.** Minimalism, African and Afro-Cuban timeline patterns.
- **Cost.** Medium.

### Accent shift

- **Definition.** The same notes, with the stress moved to a different one.
- **Example.** ♩ ♩ ♩ ♩ with the stress on beat 1 → the same notes with the stress on beat 2.
- **Distance.** 1 to 2.
- **Grammar and feasibility.** **Not representable today**: the phrase events in `src/domain` carry
  no accent or loudness field (a search of `src/domain` for "accent" and "velocity" finds none).
  The nearest available tool is a longer note, which the ear also hears as stressed.
- **Styles.** Everywhere, especially funk and Latin.
- **Cost.** High (a new event attribute, notation and playback).

## Motif-development transformations

Pitch and rhythm together. MT21C groups these as "melodic alteration": inversion, intervallic
change, augmentation and diminution, rhythmic change, ornamentation, extension and retrograde, and
treats moving a motif to another pitch, sequence, as too common to count as an alteration (S41).
Schoenberg's principle frames them all: keep the motif's important features and change the less
important ones, or the music loses its coherence (S49).

**What makes a changed motif recognizable to a beginner's ear.** For short new melodies, listeners
remember mostly the **contour**, the pattern of ups and downs, rather than the exact intervals
(S54; [lexicon: Contour](lexicon.md#contour)). For familiar tunes, the pitch pattern is a much
stronger cue than the rhythm alone (S55). Upside-down and backwards versions can be recognized
better than chance in easy conditions, with inversion the easiest, then retrograde, then
retrograde inversion (S53). So (proposed): transformations that keep the contour stay
recognizable; those that flip or reverse it are recognized mainly by reasoning, not by ear.

**What the app does today.** The four-measure gesture and answer is a rhythm rule only; the pitch
planner does not use the rhythm's recurrence annotations to repeat melodic material (a search of
`src/domain/pitch` for "recurrence" and "witness" finds nothing;
[gesture and answer](rhythm-phrase-structure.md#four-bar-gesture-and-answer)). Every entry below
that keeps pitches from the doodle is therefore new pitch-planner capability unless noted.

Common constraints for pitch: the phrase stays inside one register window of 13 pitches
([lexicon: Register window](lexicon.md#register-window)); intervals obey the Leapiness caps and
large leaps need a recovery ([lexicon: Leapiness](lexicon.md#leapiness),
[Recovery](lexicon.md#recovery)); notes must suit the chords (non-chord tones only as passing,
neighbor and similar figures, [lexicon](lexicon.md#non-chord-tone)); Neutral is fully diatonic and
Jazz adds only bounded chromatic approaches ([lexicon: Grammar](lexicon.md#grammar)).

### Repetition

- **Definition.** The motif comes back as it was. In a sentence, the opening idea is "repeated or
  sequenced" (S43).
- **Example.** Doodle C D E G (♩ ♩ ♪♪ ♩) → the same again in measure 2.
- **Distance.** 0. **Recognizability:** total.
- **App fit.** Rhythm: legal if the doodle is. Pitch: the chord under the repeat may have changed,
  turning chord tones into notes that clash; the harmony planner or a pitch check must allow it.
  O112 proposes that the first phrase continues the doodle rather than repeating it.
- **Styles.** All; riffs and hooks rely on it.
- **Cost.** Medium (fixed pitches are new input for the pitch planner).

### Sequence (diatonic or real)

- **Definition.** The motif is restated higher or lower. In a **diatonic** (tonal) sequence it
  stays in the key, so interval sizes adjust a little; in a **real** sequence every interval is
  copied exactly, which brings in notes from outside the key (S50). Sequences usually run two or
  three segments, rarely more than four, in one direction (S50); OMT lists them as a continuation
  trait (S45).
- **Example.** C D E (step, step) → D E F (diatonic: whole step then half step) or D E F♯ (real).
- **Distance.** 2. **Recognizability:** high; the contour is kept (S54).
- **App fit.** Diatonic fits both profiles. Real sequence brings chromatic notes that the Neutral
  profile never uses; under Jazz only approach-type chromatic notes are allowed, so real sequence
  is mostly unavailable (proposed: diatonic only). Two upward steps of a motif spanning a fifth
  can leave the 13-pitch window: limit the count or alternate direction.
- **Styles.** Baroque and classical, jazz lines, pop bridges.
- **Cost.** Medium to High (needs a pitch target per segment).

### Inversion

- **Definition.** The motif upside down: each step up becomes the same step down. Like sequence,
  it can be **real** (exact sizes) or **tonal** (kept in the key) (S41). Twelve-tone music uses
  it as one of four basic forms (S48).
- **Example.** C D E G (step up, step up, skip up) → G F E C, inverted inside the key (step
  down, step down, skip down).
- **Distance.** 3. **Recognizability:** moderate; the easiest of the three mirror forms (S53).
- **App fit.** Interval sizes are kept, so Leapiness is unaffected; the contour flips, so it
  conflicts with a Rising or Falling Contour setting (Arch becomes a valley, which no setting
  names).
- **Styles.** Fugue and counterpoint; jazz soloists use it occasionally.
- **Cost.** High.

### Retrograde

- **Definition.** The notes in reverse order; MT21C notes it is rare in tonal music (S41).
- **Example.** C D E G → G E D C (with the original rhythm, or with the rhythm reversed too).
- **Distance.** 4. **Recognizability:** low; harder than inversion (S53).
- **App fit.** Reversing ends the phrase where the doodle began, often on a stable note, which
  works against the app's open ending ([lexicon: Open ending](lexicon.md#open-ending))
  (proposed).
- **Styles.** Twentieth-century and twelve-tone music; puzzle canons.
- **Cost.** High.

### Retrograde inversion

- **Definition.** Upside down and backwards (S48).
- **Example.** C D E G → C E F G diatonically (the inversion G F E C read backwards: C E F G).
- **Distance.** 4. **Recognizability:** the hardest of the three (S53).
- **App fit.** As retrograde.
- **Styles.** Twelve-tone music.
- **Cost.** High; low value for beginners (proposed).

### Interval expansion or contraction

- **Definition.** Same rhythm and same ups and downs, with some intervals made wider or narrower;
  MT21C calls it "intervallic change" (S41).
- **Example.** C D E G (step, step, skip) → C E G C (skip, skip, leap): wider, same direction.
- **Distance.** 2. **Recognizability:** high when the contour is kept (S53, S54).
- **App fit.** Natural link to Leapiness: expansion is "one Leapiness grade wider for this motif".
  Must respect the caps and the recovery after a large leap; contraction is always safe.
- **Styles.** All; a classical development staple.
- **Cost.** High (contour-following pitch choice is new).

### Truncation and fragmentation

- **Definition.** Only part of the motif is used, cut from its end (truncation) or taken as a
  piece and repeated (fragmentation; S42, S45).
- **Example.** C D E G (♩ ♩ ♪♪ ♩) → C D, C D, E G (the first two notes twice, then the tail).
- **Distance.** 2 for the opening fragment, 3 for a later one (proposed).
- **App fit.** As the rhythm entry; the pitch fragment can be sequenced, which is the classic
  continuation.
- **Styles.** Classical sentence form, jazz, riffs.
- **Cost.** Medium to High.

### Extension

- **Definition.** The motif comes back with something added at its end (S41).
- **Example.** C D E G → C D E G A G.
- **Distance.** 1 to 2. **Recognizability:** high: the beginning, which the ear latches on to, is
  unchanged.
- **App fit.** Good match to Jam: the doodle plus a continuation is an extension. The added notes
  are ordinary generated notes.
- **Styles.** All.
- **Cost.** Medium.

### Ornamentation

- **Definition.** The motif's notes are decorated with passing tones, neighbor tones and other
  non-chord tones (S41; [lexicon: Non-chord tone](lexicon.md#non-chord-tone)).
- **Example.** C E G → C D E F G (passing tones filling the skips).
- **Distance.** 1 to 2. **Recognizability:** high when the original notes stay on the strong
  beats (proposed).
- **App fit.** The embellishment catalogue being written for v3.1,
  `docs/music/embellishment-catalogue.md`, holds the per-figure detail; Jam would reuse its flags.
  Adding notes adds note starts: the density band applies.
- **Styles.** All; jazz enclosures, classical turns.
- **Cost.** Medium once the embellishment flags exist.

### Rhythmic variation, same pitches

- **Definition.** The pitches stay, in the same order; the rhythm changes by any of the
  [rhythm mutations](#rhythm-mutations) (S41 "rhythmic change").
- **Example.** C D E G as `4 4 2 2 4` → C D E G as `6 2 4 4`.
- **Distance.** As the rhythm mutation used. **Recognizability:** high, since the pitch pattern
  is the stronger cue (S55).
- **App fit.** This is the natural "mutation" when the lock is off and the doodle's pitches are
  kept.
- **Styles.** All.
- **Cost.** Medium (fixed pitches, as for repetition).

### Pitch variation, same rhythm

- **Definition.** The rhythm stays; new pitches are chosen, with or without the doodle's contour.
- **Example.** `4 4 2 2 4` on C D E G → the same rhythm on E D C D.
- **Distance.** 1 to 2 with the contour kept; 3 without it (S54).
- **App fit.** **Largely exists:** the pitch planner already assigns pitches to a given rhythm
  ([pitch-planner-validation.md](pitch-planner-validation.md)), so the rhythm lock plus ordinary
  generation already gives "same rhythm, new pitches". Keeping the doodle's contour on top is new.
- **Styles.** All; the blues "same rhythm, new words" feel.
- **Cost.** Low without contour; High with contour following.

### Call and response (the answer)

- **Definition.** Two phrases that work like a conversation: one states, the other answers,
  often by completing an unfinished phrase. It runs through African and African-American music,
  blues, gospel and jazz, and is called antiphony in classical music (S52).
- **Example.** Doodle C D E G (ends rising) → answer G F E D (falls back, stopping short of home,
  since the app's phrases end open).
- **Distance.** 2 to 3: related by place and character rather than by copied notes.
- **App fit.** Jam's core already is this: the player's doodle is the call, the generated phrase
  the answer, as in the Continuator, which generates continuations of what a musician just played
  (S57). The app's gesture and answer has the same shape inside one phrase, measures 1–2 then 3–4
  ([lexicon](lexicon.md#gesture-and-answer)); a one- or two-measure doodle, as O112 proposes,
  fits the gesture's length.
- **Styles.** Blues, gospel, jazz trading, folk.
- **Cost.** Low to Medium as a framing; it is how Jam is presented more than a separate operation.

### Augmentation and diminution with pitches

- **Definition.** The rhythm entries above, applied with the pitches kept (S41).
- **Distance.** 3. **Recognizability:** good at moderate speed changes (proposed; not measured in
  the sources found).
- **App fit.** Same density-band problem as the rhythm entries.
- **Cost.** Medium to High.

## A proposed list for the app (proposed)

The owner's earlier idea is that mutation could become **how far phrases drift from the doodle**
(D209). The distance scale above turns that into one control: a **drift** setting with three or
four positions, where each position allows every mutation up to its distance. The player does not
need to know the names; the catalogue below is what each position unlocks, ordered closest first.
This also answers O118 by keeping reading (a) and reading (b) apart: the settings filter stays
with Vary settings, and the kinds of change belong to drift and to the lock's bends.

### Close (distance 0–1): the first list, and the lock's bends

| Mutation                     | Kind   | Exists today?                               |
| ---------------------------- | ------ | ------------------------------------------- |
| Repetition                   | motif  | no (fixed pitches are new)                  |
| Repeat with a changed ending | rhythm | yes, answer rule                            |
| Dot or undot                 | rhythm | yes, `redistribute_note_pair`               |
| Merge two notes              | rhythm | yes, merge plan                             |
| Add or remove a rest         | rhythm | yes, recurrence substitution and final swap |
| Move a rest                  | rhythm | yes, `translate_interior_rest`              |
| Split a note (inside a beat) | rhythm | no                                          |
| Pitch variation, same rhythm | motif  | yes, without the contour                    |
| Extension                    | motif  | partly: continuation is what Jam does       |
| Ornamentation                | motif  | with v3.1's embellishment flags             |

### Near (distance 2)

| Mutation                                    | Kind   | Exists today?                        |
| ------------------------------------------- | ------ | ------------------------------------ |
| Displace a note by a sixteenth or an eighth | rhythm | yes, within the syncopation setting  |
| Anticipation inside a measure               | rhythm | partly: the early start, not the tie |
| Density step on one beat                    | rhythm | no                                   |
| Diatonic sequence                           | motif  | no                                   |
| Interval expansion or contraction           | motif  | no                                   |
| Fragmentation of the opening                | both   | no                                   |
| Rhythmic variation, same pitches            | motif  | no                                   |
| Call and response                           | motif  | as Jam's framing                     |

### Related (distance 3)

Shift the whole motif, regroup into 3 + 3 + 2, augmentation, diminution, fragmentation of a later
part, inversion. Proposed for a later release, apart from fragmentation and 3 + 3 + 2, which are
cheap enough once the Near list exists.

### Not in the first list

Rhythmic retrograde, rhythmic "inversion", rotation, melodic retrograde and retrograde inversion
(distance 4: listeners struggle to hear them, S53), real sequence (chromatic notes the profiles do
not allow), accent shift (not representable), anticipation across a bar line (the grammar keeps
transforms inside a measure).

### How it fits the rhythm lock (proposed)

- The lock holds the **note starts on beats 1 and 3 and the attack count of each measure**, so
  that a Close bend can never make the rhythm unrecognizable.
- A bend is one Close mutation, or one Near mutation in one measure, applied for tension (Build
  and Edge) and dropped at the next phrase.
- With the lock set and Vary settings on, the Rhythm group is ineligible for the settings flag
  (D175 forbids a durable change); the bends are the only rhythm latitude, which keeps O103's
  "is a mutation's bend the same as generation's own bend" simple: it is the same mechanism.

## Proposed lexicon entries

Merged into the [lexicon](lexicon.md) on 2026-10-07: [Motif](lexicon.md#motif), [Motivic development](lexicon.md#motivic-development), [Sequence](lexicon.md#sequence), [Melodic inversion](lexicon.md#melodic-inversion), [Retrograde](lexicon.md#retrograde), [Retrograde inversion](lexicon.md#retrograde-inversion), [Fragmentation](lexicon.md#fragmentation), [Transposition](lexicon.md#transposition), [Anticipation](lexicon.md#anticipation), [Augmentation](lexicon.md#augmentation), [Diminution](lexicon.md#diminution), [Metric displacement](lexicon.md#metric-displacement), [Call and response](lexicon.md#call-and-response).

## Sources

New block S40–S59, in the format of [research-sources.md](research-sources.md), for adding there
by its owner. Reference only: no text is copied or closely paraphrased.

### Motif and its development

- **S40 - Motive.** University of Puget Sound, Music Theory for the 21st-Century Classroom: https://musictheory.pugetsound.edu/mt21c/MotiveSection.html
  - Useful for: the definition of a motive as the smallest identifiable melodic idea.
  - Applied in: the purpose, the motif lexicon draft.
- **S41 - Melodic alteration.** University of Puget Sound, Music Theory for the 21st-Century Classroom: https://musictheory.pugetsound.edu/mt21c/MelodicAlteration.html
  - Useful for: the standard list of motif changes (inversion real and tonal, intervallic change, augmentation and diminution, rhythmic change, ornamentation, extension, retrograde) and the note that sequence is too common to count as one.
  - Applied in: most motif-development entries.
- **S42 - Fragment.** University of Puget Sound, Music Theory for the 21st-Century Classroom: https://musictheory.pugetsound.edu/mt21c/FragmentSection.html
  - Useful for: splitting a compound motive into fragments developed separately.
  - Applied in: fragmentation entries.
- **S43 - The sentence.** University of Puget Sound, Music Theory for the 21st-Century Classroom: https://musictheory.pugetsound.edu/mt21c/SentenceStructure.html
  - Useful for: a phrase whose opening idea is repeated or sequenced before the music moves on.
  - Applied in: repetition and sequence.
- **S44 - Anticipation (non-chord tone).** University of Puget Sound, Music Theory for the 21st-Century Classroom: https://musictheory.pugetsound.edu/mt21c/Anticipation.html
  - Useful for: the harmony meaning of anticipation, distinct from the rhythmic push.
  - Applied in: the anticipation entry and lexicon draft.
- **S45 - Phrase archetypes.** Open Music Theory, "The Phrase, Archetypes, and Unique Forms": https://viva.pressbooks.pub/openmusictheory/chapter/phrase-archetypes-unique-forms/
  - Useful for: the sentence's continuation traits: fragmentation, faster durations, sequence, faster harmonic rhythm.
  - Applied in: fragmentation, diminution, sequence.

### Rhythm

- **S46 - Rhythm and meter in pop music.** Open Music Theory 2e (Gotham et al.), LibreTexts mirror: https://human.libretexts.org/Bookshelves/Music/Music_Theory/Open_Music_Theory_2e_(Gotham_et_al.)/07%3A_Popular_Music/7.01%3A_Rhythm_and_Meter_in_Pop_Music
  - Useful for: syncopation made by shifting notes early by half their length, and the 3 + 3 + 2 tresillo.
  - Applied in: anticipation, regrouping.
- **S47 - Metrical dissonance.** Open Music Theory 2e (Gotham et al.), LibreTexts mirror: https://human.libretexts.org/Bookshelves/Music/Music_Theory/Open_Music_Theory_2e_(Gotham_et_al.)/11%3A_Rhythm_and_Meter/11.06%3A_Metrical_Dissonance
  - Useful for: displacement dissonance and the displacement index.
  - Applied in: whole-motif displacement, metric displacement draft.
- **S48 - Basics of twelve-tone theory.** Open Music Theory: https://viva.pressbooks.pub/openmusictheory/chapter/basics-of-twelve-tone-theory/
  - Useful for: the four row forms (prime, inversion, retrograde, retrograde inversion) as exact operations.
  - Applied in: inversion, retrograde, retrograde inversion; the note that "rhythmic inversion" has no settled meaning.

### Composition pedagogy and terms

- **S49 - Schoenberg, _Fundamentals of Musical Composition_.** Arnold Schoenberg, ed. Gerald Strang and Leonard Stein, Faber and Faber, 1967. As commonly referenced; not read in full for this catalogue.
  - Useful for: varying a motif by changing its rhythm and intervals while preserving its important features, and the loss of coherence when too much changes.
  - Applied in: the motif-development frame, split a note, the distance scale's intent.
- **S50 - Sequence (music).** Wikipedia: https://en.wikipedia.org/wiki/Sequence_(music)
  - Useful for: real versus tonal sequence, typical length of two to four segments, one direction.
  - Applied in: sequence entry and lexicon draft.
- **S51 - Augmentation (music).** Wikipedia: https://en.wikipedia.org/wiki/Augmentation_(music)
  - Useful for: rhythmic augmentation and diminution as lengthening or shortening every value.
  - Applied in: augmentation and diminution.
- **S52 - Call and response (music).** Wikipedia: https://en.wikipedia.org/wiki/Call_and_response_(music)
  - Useful for: the definition, its African and African-American roots, antiphony, the question-and-answer form.
  - Applied in: call and response.

### Perception

- **S53 - Dowling, recognition of melodic transformations.** W. J. Dowling, "Recognition of melodic transformations: Inversion, retrograde, and retrograde inversion", _Perception & Psychophysics_ 12(5), 1972, 417 ff.: https://labs.utdallas.edu/mpac/files/2021/03/1972.pdf
  - Useful for: all three recognized above chance in easier conditions, difficulty rising from inversion to retrograde to retrograde inversion; no distinction between exact and contour-only versions.
  - Applied in: recognizability fields, the "not in the first list" group.
- **S54 - Dowling, scale and contour.** W. J. Dowling, "Scale and contour: Two components of a theory of memory for melodies", _Psychological Review_ 85(4), 1978, 341–354: https://doi.org/10.1037/0033-295X.85.4.341
  - Useful for: contour as the main thing remembered of a short new melody.
  - Applied in: recognizability, sequence, interval change.
- **S55 - Hébert and Peretz, melodic and temporal patterns.** S. Hébert and I. Peretz, "Recognition of music in long-term memory: Are melodic and temporal patterns equal partners?", _Memory & Cognition_ 25(4), 1997: https://link.springer.com/article/10.3758/BF03195003
  - Useful for: familiar tunes are named far more often from their pitches alone than from their rhythm alone.
  - Applied in: recognizability; the lock as a matter of feel more than recognition.
- **S56 - Post and Toussaint, edit distance and rhythm similarity.** O. Post and G. Toussaint, "The edit distance as a measure of perceived rhythmic similarity", _Empirical Musicology Review_ 6(3), 2011: https://doaj.org/article/02173439e1c24e4cb83f2e9d3be90081
  - Useful for: the count of insert/delete/substitute edits predicts perceived rhythmic difference (r = 0.87 in the first experiment), and metric placement affects an edit's salience.
  - Applied in: the distance scale.

### Algorithmic composition

- **S57 - Pachet, the Continuator.** F. Pachet, "The Continuator: Musical interaction with style", _Journal of New Music Research_ 32(3), 2003, 333–341: https://www.francoispachet.fr/?p=4360
  - Useful for: a system that continues what a musician just played, in their style; the nearest prior art to Jam.
  - Applied in: call and response, Jam framing.
- **S58 - Biles, GenJam.** J. A. Biles, "GenJam: A genetic algorithm for generating jazz solos", _Proceedings of the International Computer Music Conference_, 1994; papers list: https://genjam.org/al-biles/genjam-the-genetic-jammer/genjam-papers/
  - Useful for: "musically meaningful" mutation operators on measures (reverse, rotate, invert, sort, transpose), designed not to destroy musical structure.
  - Applied in: rhythmic retrograde, rotation; the idea of a curated mutation list.
- **S59 - Fernández and Vico, survey.** J. D. Fernández and F. Vico, "AI methods in algorithmic composition: A comprehensive survey", _Journal of Artificial Intelligence Research_ 48, 2013: https://arxiv.org/abs/1402.0585
  - Useful for: independent description of GenJam's measure mutations and of musically meaningful operators in evolutionary composition.
  - Applied in: cross-check of S58.

## Questions for the spec session

1. **O118, the two readings.** Proposed: both exist and stay separate. Reading (a) is a filter on
   Vary settings, in six groups; reading (b) is the drift ladder and the lock's bends. Does the
   owner want a checkbox list of mutation kinds at all, or one drift control that unlocks a
   curated list (this catalogue's proposal for a beginner)?
2. **Empty or dead-end lists.** A restricted settings list can leave no legal move, which today
   crashes (`SettingsMutationError`). Skip visibly, refuse the list at Idle, or widen the draw?
3. **Key and mode in Jam.** Does D209's "the app never switches them on its own" forbid Vary
   settings from changing the key and collection during a Jam session?
4. **What the lock holds (O103).** Proposed: note starts on beats 1 and 3 plus each measure's
   attack count; a bend is one Close change, or one Near change in one measure, gone at the next
   phrase. Is that "a little bending"?
5. **The doodle's rhythm versus the grammar.** A played doodle can be off the sixteenth grid,
   swung, start before the beat or hold a rest longer than half a measure. Is it snapped to the
   grid (quantized), refused, or held as the player's own rhythm outside the rules (as O102 asks
   for v4's editor)?
6. **Rhythm settings under the lock.** With the lock set, do note density, variety, syncopation
   and silence density still mean anything, or does the locked rhythm replace them for the
   session?
7. **Pitch memory.** Every motif transformation that keeps the doodle's pitches is new
   pitch-planner capability (fixed or contour-following pitches). Is Jam v3.2's first cut
   "same rhythm, new pitches" (cheap, largely exists) with pitch-keeping development later?
8. **Push across the bar line.** The most idiomatic anticipation crosses into the next measure,
   which the grammar cannot express. Worth a grammar version in v3.2, or later?
9. **Lexicon.** Accept the thirteen drafts above (motif, motivic development, sequence, melodic
   inversion, retrograde, retrograde inversion, fragmentation, transposition, anticipation,
   augmentation, diminution, metric displacement, call and response), and should "doodle" be the
   player-facing word or "motif"?
10. **Listening tests.** The distance scale is a hypothesis built from S56 and S53–S55. Should the
    owner rank a handful of examples by ear before the scale drives a control?
