# Key and Mode Estimation from a Short Melody

Status: research v1 (2026-10-07)

Purpose: prepare the v3 spec session on the [key and mode suggestion](../../specs/versions/v3/README.md#key-and-mode-suggestion)
of v3.2 Jam (D209, amended by D212), and the open details in
[O113](../../specs/open-questions.md#v3-jam-o112). In Jam the player plays a short motif, the
"doodle", and the app continues it. The app also reads the doodle and proposes a
[key](lexicon.md#key) and [mode](lexicon.md#mode); the player's own choice stays authoritative and
the app never switches it alone. The owner (2026-10-07): "the app attempts to find a matching
proposition, maybe we rate the most probable one and cast a dice. It's a jam so, in the end it's
only so much important." This document surveys published methods for finding a key from a melody,
then proposes a concrete way to rate all candidates and make a seeded weighted draw.

Nothing here is decided. Every judgment of this document's own is marked **(proposed)**. Facts cite
a source ID (S60–S79, listed in [Sources](#sources)) or a repository path.

## How this was gathered

- **Repository.** The v3 README sections "Key and mode suggestion", "Jam" and "Stray notes from
  controllers" ([v3](../../specs/versions/v3/README.md)); O112 and O113 in
  [open questions](../../specs/open-questions.md#v3-jam-o112) and D212 in
  [decisions](../../specs/decisions.md); the [lexicon](lexicon.md); the
  [harmony planner policy](harmony-planner-policy.md#collection-and-chord-vocabulary); and the code
  that represents keys, collections and transposition: `src/domain/controls/generation-controls.ts`
  (`PITCH_CLASSES`, `COLLECTIONS`), `src/domain/harmony/collection.ts` (`COLLECTION_OFFSETS`),
  `src/domain/generation/generation-intent.ts` (`writtenToConcertTonalCenter`),
  `src/domain/profile/instrument-profiles.ts` (transposition data), and `src/domain/random/`
  (seeded pseudorandom streams).
- **Literature.** Primary papers were checked through their publisher records (DOIs verified on
  Crossref) and, where open, their full text: Temperley 2008 (S63), the plainchant mode study
  (S71) and the Irish-tune mode study (S72) were read in full; for others the abstract was read and
  the claims below are limited to it.
- **Reference code.** The key-profile values and algorithms were read in the source of music21
  (S74), Essentia (S75) and the Humdrum Extras `keycor` manual (S73, through the Internet Archive,
  as the live site refused connections). Licences were read from each project's licence file.
- **Calculations.** The ambiguity counts and the worked example were computed by this research in
  a throwaway script that is not part of the repository; the method is stated next to each number
  so it can be re-checked.

## The problem in plain words

A doodle is a handful of notes with their timing. The app has to turn it into one of 84 answers:
12 possible home notes (the [tonal center](lexicon.md#tonal-center) or
[tonic](lexicon.md#tonic)) times the 7 modes Ionian to Locrian
(`src/domain/controls/generation-controls.ts`; Major and Minor are other names for Ionian and
Aeolian, [Collection](lexicon.md#collection)). It is two questions of very different difficulty.

### Step 1: which set of notes

First, forget octaves: every C, in any octave, counts as "C". That octave-free note name is called a
**pitch class**; there are 12 of them ([Pitch class](lexicon.md#pitch-class) in the lexicon). The
app's modes all use a seven-note set, a **collection**
([Collection](lexicon.md#collection)), and there are exactly 12 such sets, one for each starting
point of the major-scale pattern (`COLLECTION_OFFSETS` in `src/domain/harmony/collection.ts`).
Step 1 asks: which of the 12 sets contains the doodle's pitch classes?

How quickly this narrows down was counted by this research: take every subset of one diatonic
collection and count how many of the 12 collections contain it.

| Different pitch classes in the doodle | Subsets | Fit exactly 1 set | Fit 2 sets | Fit 3 sets | Fit 4 sets | Fit 5 sets |
| ------------------------------------: | ------: | ----------------: | ---------: | ---------: | ---------: | ---------: |
|                                     3 |      35 |                 5 |          8 |          9 |          8 |          5 |
|                                     4 |      35 |                10 |         12 |          9 |          4 |          — |
|                                     5 |      21 |                10 |          8 |          3 |          — |          — |
|                                     6 |       7 |                 5 |          2 |          — |          — |          — |
|                                     7 |       1 |                 1 |          — |          — |          — |          — |

So with five different pitch classes, slightly fewer than half of the possible note groups pin down
one set; with six, five groups in seven do. Each subset is counted once here, whatever its
likelihood in real melodies. This corrects the v3 README's "a doodle with five or more different
notes usually fits only one of the 12 sets"
([v3](../../specs/versions/v3/README.md#key-and-mode-suggestion)): that holds from six, and only
about half the time at five **(proposed wording for the spec)**. The groups that stay ambiguous are
the ones missing a note of the set's one tritone pair (in the white-key set, B or F): without B or
B-flat, nothing tells the white-key set from the one with B-flat.

### Step 2: which note is home

Each set is shared by seven modes, one per starting note: the white keys are C Ionian, D Dorian, E
Phrygian, F Lydian, G Mixolydian, A Aeolian or B Locrian ([mode](lexicon.md#mode)). Notes alone do
not say which. Musicians call keys that share their notes but not their home note **relative**
(C major and A minor), and keys that share their home note but not their notes **parallel** (C
major and C minor) (S78). Step 2 is a choice between relatives, and in the ambiguous cases of step 1
also between parallels: D Dorian and D Aeolian differ by one note, B against B-flat.

The clues to home are where the melody starts and stops, which notes last longest or come back
most, and which fall on strong beats ([v3](../../specs/versions/v3/README.md#key-and-mode-suggestion)).
The literature below measures several of them.

### Why a short melody is ambiguous

- **Few notes, few clues.** A doodle is planned as "one or two measures" (O112, proposed in
  [open questions](../../specs/open-questions.md#v3-jam-o112)), often fewer than seven different
  pitch classes, so step 1 itself can stay open (table above).
- **Counting notes is not enough even for listeners.** When melodies were generated at random from
  the typical note distribution of a key, listeners named the generating key in only slightly more
  than half of their judgments (S64). Order and structure carry part of the key: reordering the same
  notes changes which home note listeners hear (S68).
- **Home is a style habit, not a rule.** In medieval chant, the mode is told first by the final
  note, and theory alone predicts that the final settles only about half the cases, the rest needing
  the melody's range (S71). A jam doodle may also simply stop wherever the player paused.
- **The app's own phrases never end on the home note** ([tonic](lexicon.md#tonic): "No phrase ever
  ends with the home note as its last note"). If a player copies an app phrase as a doodle, the
  last-note clue points away from home.

## Methods survey

### Key-profile matching (Krumhansl–Schmuckler)

- **Idea.** Listeners rated how well each of the 12 pitch classes "fits" after a passage that set up
  a key; the 12 averaged ratings form a **key profile**, one for major and one for minor (S60). The
  Krumhansl–Schmuckler algorithm adds up how long each pitch class sounds in the music (a 12-bar
  **histogram**), then compares it with the profile rotated to each of the 24 major and minor keys
  using a correlation (a standard similarity score from −1 to +1); the best match wins (S60, S63,
  S73).
- **Inputs.** Pitch classes and their durations. Order is ignored (S73).
- **Profiles available.** All have 12 values per mode, written from the home note upward (scale
  degree 1, raised 1, 2, and so on):

| Profile                                        | Major (C, C#, D … B)                                                    | Minor                                                                   | Source of values     |
| ---------------------------------------------- | ----------------------------------------------------------------------- | ----------------------------------------------------------------------- | -------------------- |
| Krumhansl–Kessler (listener ratings)           | 6.35 2.23 3.48 2.33 4.38 4.09 2.52 5.19 2.39 3.66 2.29 2.88             | 6.33 2.68 3.52 5.38 2.60 3.53 2.54 4.75 3.98 2.69 3.34 3.17             | S60, via S73 and S74 |
| Temperley 1999 (revised by hand)               | 5 2 3.5 2 4.5 4 2 4.5 2 3.5 1.5 4                                       | 5 2 3.5 4.5 2 4 2 4.5 3.5 2 1.5 4                                       | S61, via S75         |
| Aarden–Essen (counted in folk melodies)        | 17.77 0.15 14.93 0.16 19.80 11.36 0.29 22.06 0.15 8.15 0.23 4.95        | 18.26 0.74 14.05 16.86 0.70 14.44 0.70 18.62 4.57 1.93 7.38 1.76        | S65, via S73 and S74 |
| Bellman–Budge (counted in chords)              | 16.80 0.86 12.95 1.41 13.49 11.93 1.25 20.28 1.80 8.04 0.62 10.57       | 18.16 0.69 12.99 13.34 1.07 11.15 1.38 21.07 7.49 1.53 0.92 10.21       | S73, S74             |
| Temperley–Kostka–Payne (counted in a textbook) | 0.748 0.060 0.488 0.082 0.670 0.460 0.096 0.715 0.104 0.366 0.057 0.400 | 0.712 0.084 0.474 0.618 0.049 0.460 0.105 0.747 0.404 0.067 0.133 0.330 | S73, S74, S75        |
| Simple weights (Sapp)                          | 2 0 1 0 1 1 0 2 0 1 0 1                                                 | 2 0 1 1 0 1 0 2 1 0 0.5 0.5                                             | S73, S74             |
| Albrecht–Shanahan (trained on 490 scores)      | values in the paper, not checked here                                   | —                                                                       | S66                  |

- **Known tendencies.** The Humdrum `keycor` manual, which implements five of these profiles, notes
  that Krumhansl–Kessler most strongly favors the tonic and so tends to confuse a key with the key
  a fifth above; Aarden–Essen slightly favors the key a fifth below; Temperley–Kostka–Payne tends to
  name the relative major of a minor key; Bellman–Budge shows no particular confusion; and the simple
  weights get noisier on small stretches of music (S73, repeated in S74). Most models are more
  accurate on major than minor pieces; Albrecht and Shanahan's profile, matched by distance rather
  than correlation, does better on minor, and combining it with Aarden–Essen beat every other model
  they tested (S66).
- **Accuracy on short monophonic input.** The closest published test to a doodle is the set of 48
  fugue subjects (the opening theme of each fugue) of Bach's Well-Tempered Clavier, a few measures
  each and played by one voice. Krumhansl–Schmuckler named the right key for 32 of 48 (66.7%); on
  65 Essen folk songs, whole melodies, it was right for 49 (75.4%) (S63, Table 2, using Temperley's
  own implementation). These tests choose among 24 keys, not 84.
- **Cost.** 24 correlations of 12 values: a few hundred multiplications, far under a millisecond in
  a browser **(proposed estimate)**.
- **Reference code and licences.** music21, Python, BSD 3-Clause, implements all of the above
  except Temperley 1999 and Albrecht–Shanahan, and weights notes by duration (S74). Essentia (C++) and essentia.js (its
  WebAssembly build for browsers) are AGPL-3.0 and take an audio-derived pitch-class profile as
  input (S75). The profiles are short lists of published numbers, and the algorithm is a dozen
  lines, so reimplementing it in TypeScript from the papers is the natural route **(proposed)**;
  bundling AGPL code would bring AGPL terms into an app whose `package.json` declares MIT
  **(proposed: avoid)**.

### Duration and metric weighting

- **Duration.** The standard Krumhansl–Schmuckler input counts each pitch class by how long it
  sounds; `keycor` offers a switch to count attacks only (S73), and music21 counts quarter-note
  lengths (S74). Temperley's 1999 revision replaced durations with "present or absent in each short
  segment" (S61), and his 2008 melody model scores each note once, whatever its length (S63). There
  is therefore no single verdict: long notes do signal importance, but one held note can swamp a
  short doodle **(proposed: count durations, but clamp each note between an eighth and a dotted
  quarter)**.
- **Metric position.** The v3 README lists "notes on strong beats" as a clue
  ([v3](../../specs/versions/v3/README.md#key-and-mode-suggestion)). This research found no
  published measurement of how much strong-beat weighting improves key finding on melodies; it is a
  gap. Weighting needs the doodle's beat grid, which exists only if the doodle is played against a
  known tempo (O112, [open questions](../../specs/open-questions.md#v3-jam-o112)).

### First-note and final-note cues

- **First note.** Longuet-Higgins and Steedman's model for one-voice melodies keeps only the keys
  whose scale contains every note so far; if several remain at the end, it picks the key whose home
  note (or, failing that, fifth degree) is the first note (S69, as described in S63). On the 48
  fugue subjects it was right every time, but only 46 of 65 (70.8%) on the Essen folk songs (S63).
  Bach's subjects are written to state their key at once; folk melodies and doodles are not.
- **Final note.** In chant theory the final note is the main clue to mode (S71). Corpus profiles of
  folk melodies give degree 1 the largest share of notes, 18.4% in major melodies (S63). No study
  found here measures the final-note cue alone on modern short melodies; it is a gap.
- **Combined with profiles.** Vos and Van Geenen's model for one-voice melodies searches scale and
  chord evidence in parallel and gives the first notes extra weight ("primacy"); on the fugue
  subjects it was right for 39 of 48 (81.2%) (S67, S63).

### Probabilistic (Bayesian) key finding

- **Idea.** Treat each key as a dice that "generates" notes with the probabilities of its key
  profile, then ask which key makes the heard notes most likely (Bayes' rule, which turns "how
  likely are these notes in this key" into "how likely is this key given these notes") (S62, S63).
  Temperley's 2008 melody model adds two habits of melodies: they stay in a narrow range, and
  consecutive notes tend to be close in pitch (S63).
- **Inputs.** The note sequence (pitches, in order); durations are not needed (S63).
- **Accuracy on short monophonic input.** Right for 57 of 65 Essen folk songs (87.7%) against 75.4%
  for Krumhansl–Schmuckler, and for 40 of 48 fugue subjects (83.3%), 44 (91.7%) after adjusting the
  minor profile's seventh degree (S63, Table 2). Temperley's earlier segment-based model scored 43
  of 48 (89.6%) (S63).
- **Why it suits the dice.** A probabilistic model already outputs a probability for every key, not
  only a winner, which is exactly what a weighted draw needs **(proposed)**.
- **Cost.** One multiplication per note per key: 84 keys × a 16-note doodle is about 1,300
  operations **(proposed estimate)**. Reference code: no permissively licensed implementation was
  checked; the model is fully specified in S63.

### Beyond major and minor: mode detection

Almost all key-finding work chooses among 24 major and minor keys. Mode work is rarer:

- **Mode profiles.** Huron and Veltman built a pitch-class profile for each of the eight medieval
  church modes from 98 chants and used them to predict each chant's mode; three of the modes had
  very similar profiles (S70). Medieval modes are not the app's modes: they share four home notes
  (D, E, F, G) and split by range (S71).
- **Large plainchant study.** On 20,865 chants, the textbook method (final note, range and first
  note) and the profile method reached 86–90% and a method based on recurring melodic fragments
  93–95% (F1, a combined accuracy measure) (S71).
- **Irish dance tunes, four diatonic modes.** With the home note known, a decision tree on the
  doodle's thirds, sixths and sevenths above it (major or minor third; then sixth or seventh)
  separates Ionian, Mixolydian, Aeolian and Dorian; its labels agreed with 94% of the user-given
  modes on TheSession, and 52% of tunes came out as major (S72). The same authors note that
  estimating home note and mode together "is a non-trivial problem since many key/mode combinations
  share identical pitch class sets" (S72). Template and unsupervised-learning methods for the same
  four modes were compared by Navarro-Cáceres and colleagues (S72; their accuracy figures were not
  checked here).
- **Take-away (proposed).** No published method found here covers all seven modes on short
  melodies. The practical route is a key-profile or probabilistic model whose profiles are built per
  mode, with a home-note emphasis that rotates with the tonic, as in the proposal below.

### Interval-based methods

- **Rare intervals.** The "intervallic rivalry" idea holds that rare intervals in a scale, above
  all the tritone (three whole steps, such as F–B) and the half step, give the key away, and that
  their order matters; Brown, Butler and Jones tested it with listeners and found the order of
  tones changes the heard key (S68).
- **Use here (proposed).** The tritone pair is exactly what step 1 needs (see the table above): it
  is captured automatically by the collection fit, so no separate interval model is proposed.
  Intervals also feed the decision tree of S72 once a home note is assumed.

### Summary

| Method                                      | Needs                           | Short-melody evidence                           | Cost | Code and licence                         |
| ------------------------------------------- | ------------------------------- | ----------------------------------------------- | ---- | ---------------------------------------- |
| Krumhansl–Schmuckler correlation            | pitch classes, durations        | 66.7% fugue subjects, 75.4% folk songs (S63)    | tiny | music21 BSD-3 (S74); Essentia AGPL (S75) |
| Longuet-Higgins–Steedman scale + first note | pitch classes in order          | 100% fugue subjects, 70.8% folk songs (S63)     | tiny | none checked                             |
| Vos–Van Geenen parallel scale/chord         | pitch classes, durations, order | 81.2% fugue subjects (S63, S67)                 | tiny | none checked                             |
| Temperley probabilistic melody model        | pitches in order                | 83.3–91.7% fugue subjects, 87.7% folk (S63)     | tiny | none checked; fully specified in S63     |
| Mode profiles (chant)                       | pitch classes (+ final, range)  | 86–90% on whole chants (S71)                    | tiny | none checked                             |
| Interval decision tree (Irish)              | pitch classes, known home note  | 94% agreement on whole tunes (S72)              | tiny | none checked                             |
| Set lookup (`Scale.detect` in tonal)        | pitch classes                   | step 1 only; home taken as the first note (S76) | tiny | tonal, MIT (S76)                         |

## Ranking and the dice (proposed)

Everything in this section is **(proposed)**. It combines the probabilistic idea (S62, S63) with
per-mode profiles (S70) and the start and final cues (S63, S69, S71).

### Inputs and pitch space

- **The doodle after the stray-note filter**: each note's MIDI number, start and length. Lengths in
  the app's [ticks](lexicon.md#tick) (one sixteenth note; 4 per beat; `src/domain/time/ticks.ts`).
- **Compute in concert pitch, name in written pitch.** The controller sends concert pitch, and the
  generator works in concert pitch (D56 b, `src/domain/generation/generation-intent.ts`). The model
  below treats all 12 tonics alike, so transposing the doodle only renames every candidate's tonic
  and changes no score. So compute in concert pitch, then convert the suggested tonic to written
  pitch for display and for comparing with the selected key: written = concert + the instrument's
  chromatic transposition, modulo 12 (`src/domain/profile/instrument-profile.ts`); for tenor
  saxophone that is +14 semitones, so +2 modulo 12 (`src/domain/profile/instrument-profiles.ts`).
  The selected written key is already converted to concert pitch at request construction
  (`writtenToConcertTonalCenter`), so the "already fits" test below can use it as is. O113's
  proposal "computed in written pitch" gives the same answer; concert pitch just saves one
  conversion.
- **Mode names stay the same** under transposition: concert D Dorian on tenor saxophone is written
  E Dorian.

### Scoring all 84 pairs

For each tonic (12) and mode (7), build a 12-value profile: the chance that a note of a melody in
that key and mode is each pitch class. Notes of the collection get a share by their role, notes
outside it a small one:

| Note's role in the candidate key        | Share of notes | Penalty per beat (−ln share) |
| --------------------------------------- | -------------: | ---------------------------: |
| Degree 1 (home)                         |          0.200 |                         1.61 |
| Degree 5                                |          0.165 |                         1.80 |
| Degree 3                                |          0.145 |                         1.93 |
| Each of the other four collection notes |         0.1175 |                         2.14 |
| Each of the five notes outside          |          0.004 |                         5.52 |

The shares add up to 1. They follow the shape every published profile shows, home first, then the
fifth and third degrees, the other scale notes, and outside notes far below (S60, S63, S73); the
home share is close to the 18.4% found in folk melodies (S63). Being roles rather than measured
values, they rotate to all seven modes. They are a starting point for listening tests, not measured
data.

The **penalty** of a candidate is the sum, over the doodle's notes, of the note's penalty times its
weight, minus two bonuses (smaller penalty = better fit):

- **Weight**: the note's length in beats, clamped between 0.5 (an eighth) and 1.5 (a dotted
  quarter), so a held last note does not decide alone.
- **Final bonus**: −0.69 (that is, ×2 likelihood) when the last note is the candidate's home.
- **First bonus**: −0.41 (×1.5) when the first note is the candidate's home.
- **Strong-beat weight** (optional, only if the doodle has a beat grid): ×1.5 for a note that starts
  on beat 1 or 3, the app's metrical anchor positions (ticks 0 and 8 of a measure,
  [lexicon, Metrical anchor](lexicon.md#metrical-anchor)). Unmeasured, see the gap above.

### From scores to chances

Turn penalties into probabilities with the standard "softmax" step: each candidate's chance is
proportional to e^(−penalty ÷ T), divided by the total over all 84. **T, the temperature**, sets how
adventurous the dice is: T = 1 reads the model literally (this is Bayes' rule with all keys equally
likely beforehand, S62); a larger T flattens the chances, a smaller one sharpens them toward the
best fit. Proposed default: T = 1.

### Who enters the draw

- Keep the candidates whose chance is at least half the best one's. Equivalently: whose penalty is
  within T × 0.69 of the best. Keep at most 3.
- Order the kept candidates by penalty, then by a fixed order (tonic C to B, then the mode order of
  `COLLECTIONS`: Ionian, Dorian, Phrygian, Lydian, Mixolydian, Aeolian, Locrian), so ties are always
  broken the same way.
- Renormalise their chances to add up to 1.

### The seeded draw

- Draw one number u in [0, 1) from a seeded stream and walk the kept list until the running total
  of chances passes u. The likeliest answer comes up most often; a close second sometimes wins,
  which is the owner's "cast a dice" (D212).
- **Seed.** The same doodle in the same session must give the same suggestion
  ([v3](../../specs/versions/v3/README.md#key-and-mode-suggestion)). Proposed: mix the session's
  seed with a hash of the filtered doodle (its pitches, starts and lengths) using the repository's
  FNV-1a hash (`src/domain/random/hash32.ts`), and draw from a new named stream such as
  `key-suggestion`. The stream registry is closed and versioned (`STREAM_LABELS`,
  `STREAM_REGISTRY_VERSION` in `src/domain/random/streams.ts`), so adding a label is a deliberate
  step.
- **Integers only.** JavaScript's `Math.exp` and `Math.log` are "implementation-approximated": two
  browsers may return slightly different results (S77). A last-digit difference could flip a draw
  on another device. The repository's generator already guards against this kind of drift
  (`src/domain/random/prng.ts`). Proposed: store the role penalties as fixed integers (for example
  thousandths: 1609, 1802, 1931, 2141, 5521), weigh notes in ticks, take draw weights from a
  precomputed integer table indexed by the penalty gap, and draw with an integer
  (`nextUint32() % total`). Then no transcendental function runs at all.

### When the doodle already fits the selected key and mode

The strawman says "When the doodle fits the selected key and mode, nothing is suggested"
([v3](../../specs/versions/v3/README.md#key-and-mode-suggestion)). "Fits" needs a definition,
because "all notes belong to the selected set" is not enough: a doodle that rests on D using only
white keys belongs to C Ionian's set, yet clearly is not "at home" on C (worked example below).

- Proposed: the selection fits when it is among the kept candidates. Then nothing is suggested,
  even if it was not the top one: the player's choice wins every close call (D209).
- Optional: give the current selection a head start (a prior ×2, a penalty −0.69) before ranking.
  This keeps the app from proposing a near-equal alternative to what the player chose.
- Otherwise, the drawn candidate is offered; the player confirms or keeps their setting (O113,
  proposed there: yes).

### Minimum material

- At least **5 different pitch classes** after the stray-note filter, as O113 proposes; below that
  the set itself is open in most cases (table in [Step 1](#step-1-which-set-of-notes)).
- At least **6 notes** and **2 beats** of sounding time, so that one or two notes cannot decide.
- With exactly 5 pitch classes, 11 of the 21 possible groups fit 2 or 3 sets, so 14 to 21 candidates
  fit fully; the dice simply has more faces. Because the draw always ends on one answer, no extra
  "too ambiguous" rule is needed, following D212.

### Notes outside every mode

- **Harmonic minor** is natural minor with a raised seventh degree, such as A minor with G-sharp
  ([Minor](lexicon.md#minor)). **Blue notes** are notes bent below the major-scale pitch in blues
  and jazz, often the third, fifth or seventh degree (S78); a MIDI keyboard can only send the
  nearest semitone, so a blue note arrives as a flat third, fifth or seventh. Neither fits any of
  the 12 sets.
- The soft profile handles them: an outside note is costly but not forbidden, so the closest mode
  wins (worked results below: a harmonic-minor doodle gives A Aeolian; a bluesy doodle gives C
  Mixolydian).
- **Fit share.** After ranking, compute the share of the doodle's weighted length that lies inside
  the winner's collection. If it is below **80%**, suggest nothing: the doodle uses a scale the app
  does not offer. This replaces O113's "nothing when no mode fits" with "nothing when no mode fits
  well enough". The Jazz profile's short chromatic notes ([chromatic](lexicon.md#chromatic)) cost
  little, since short notes weigh least.

### Worked example

A doodle on a C MIDI keyboard (no transposition), 8 notes, 6 pitch classes (no B, no B-flat):

| Note   | D   | E   | F   | G   | A   | C   | A   | D (last) |
| ------ | --- | --- | --- | --- | --- | --- | --- | -------- |
| Beats  | 1   | ½   | ½   | 1   | 1   | ½   | ½   | 2        |
| Weight | 1   | 0.5 | 0.5 | 1   | 1   | 0.5 | 0.5 | 1.5      |

The notes fit two sets: the white keys and the set with B-flat. So 14 of the 84 candidates contain
every note.

**Penalty for D Dorian** (D home, F third degree, A fifth degree, E, G and C other notes):
1.61 (D) + 1.07 (E) + 0.97 (F) + 2.14 (G) + 1.80 (A) + 1.07 (C) + 0.90 (A) + 2.41 (D) = 11.98;
minus 0.69 (ends on D) and 0.41 (starts on D) = **10.88**. D Aeolian gives the same roles to the
same notes (its only different note, B-flat, is absent), so it also scores **10.88**.

**Penalty for C Ionian**, the selected setting in this example: every note is in its set, but none
is home except the short C: 2.14 + 0.97 + 1.07 + 1.80 + 2.14 + 0.80 + 1.07 + 3.21 = **13.21**, no
bonus.

Chances at T = 1 over all 84 candidates (computed for this document):

| Candidate    | Penalty | Gap to best | Chance | Kept? |
| ------------ | ------: | ----------: | -----: | ----- |
| D Dorian     |   10.88 |        0.00 |  24.7% | yes   |
| D Aeolian    |   10.88 |        0.00 |  24.7% | yes   |
| G Dorian     |   12.54 |        1.66 |   4.7% | no    |
| G Mixolydian |   12.54 |        1.66 |   4.7% | no    |
| D Phrygian   |   12.57 |        1.69 |   4.6% | no    |
| D Mixolydian |   12.67 |        1.79 |   4.1% | no    |
| A Aeolian    |   12.85 |        1.97 |   3.4% | no    |
| F Ionian     |   13.17 |        2.29 |   2.5% | no    |
| C Ionian     |   13.21 |        2.33 |   2.4% | no    |

- Kept: D Dorian and D Aeolian (gap 0 ≤ 0.69); renormalised to 50% each.
- C Ionian is not kept, so the selection does not "fit" and a suggestion is made. With the optional
  ×2 head start it would reach about 4.7%, still not kept.
- The draw: if the seeded stream gives u = 0.62, the walk passes D Dorian (running total 0.50) and
  stops at D Aeolian (1.00): the app suggests **D Aeolian** (D Minor, if the player's collection
  family is Major/Minor). Another seed could give D Dorian. Both are honest answers: the doodle
  never played the one note, B or B-flat, that tells them apart.
- On tenor saxophone the same concert notes give the same ranking, displayed as written **E
  Dorian** or **E Aeolian** (+2 semitones modulo 12).
- For comparison, the classic 24-key Krumhansl–Schmuckler correlation on the same duration
  histogram gives D minor 0.820 and D major 0.811, almost a tie, although D major's F-sharp is
  absent and F is played; with Aarden–Essen profiles D minor leads (0.779) before G major (0.683)
  (computed for this document with the S73 profiles). Correlation profiles are soft about which notes
  belong; the per-mode collection penalty above is what keeps D major out.

**Variations, same scoring:**

- **Ending on E instead of D** (the last note held 2 beats on E): the final bonus moves to E, and
  the field opens: E Phrygian and E Locrian (gap 0), A Phrygian and A Aeolian (0.39), D Dorian and
  D Aeolian (0.42) are all within 0.69. Six candidates qualify; the cap keeps three, partly by the
  fixed order. A doodle that stops on a passing note gives a wide, honest spread (see the questions
  on Locrian and on the cap).
- **Harmonic minor**, A B C D E F G-sharp A (lengths 1, ½, ½, ½, 1, ½, ½, 2): A Aeolian leads by
  1.65, chance 36.7%, kept alone; fit share 92% (G-sharp is the only outside note), so the app
  suggests A Aeolian (A Minor).
- **Bluesy**, C E F F-sharp G B-flat C (lengths 1, ½, ½, ½, 1, ½, 2): C Mixolydian leads by 1.69,
  chance 32.0%, kept alone; fit share 91% (F-sharp outside).

## Proposed lexicon entries

Merged into the [lexicon](lexicon.md) on 2026-10-07: [Key finding](lexicon.md#key-finding), [Key profile](lexicon.md#key-profile), [Relative keys](lexicon.md#relative-keys), [Parallel keys](lexicon.md#parallel-keys), [Harmonic minor](lexicon.md#harmonic-minor), [Blue note](lexicon.md#blue-note), [Final](lexicon.md#final).

## Sources

IDs S60–S79 are reserved for this research. They are not yet in
[research-sources.md](research-sources.md); the entries below use its format so they can be moved
there.

- **S60 - Krumhansl–Kessler key profiles.** Carol L. Krumhansl and Edward J. Kessler, "Tracing the dynamic changes in perceived tonal organization in a spatial representation of musical keys", Psychological Review 89(4), 334–368 (1982): https://doi.org/10.1037/0033-295X.89.4.334 ; and Carol L. Krumhansl, Cognitive Foundations of Musical Pitch, Oxford University Press (1990; online edition 2001): https://doi.org/10.1093/acprof:oso/9780195148367.001.0001
  - Useful for: the probe-tone key profiles and the Krumhansl–Schmuckler correlation algorithm (described most fully in the 1990 book, per S63).
  - Applied in: the methods survey and the shape of the proposed role profile.
- **S61 - Temperley's revision of Krumhansl–Schmuckler.** David Temperley, "What's Key for Key? The Krumhansl-Schmuckler Key-Finding Algorithm Reconsidered", Music Perception 17(1), 65–100 (1999): https://doi.org/10.2307/40285812
  - Useful for: revised profile values, presence-per-segment instead of summed durations, a modulation penalty; tests on the Bach fugue subjects (abstract read).
  - Applied in: the profile table and the duration-weighting discussion.
- **S62 - Bayesian key finding.** David Temperley, "A Bayesian Approach to Key-Finding", in Music and Artificial Intelligence (ICMAI 2002), Lecture Notes in Computer Science 2445, 195–206: https://doi.org/10.1007/3-540-45722-4_18 ; expanded in David Temperley, Music and Probability, MIT Press (2007).
  - Useful for: framing key finding as choosing the key that makes the notes most probable.
  - Applied in: the probabilistic method and the softmax-at-T=1 reading of the proposal.
- **S63 - Probabilistic model of melody perception.** David Temperley, "A Probabilistic Model of Melody Perception", Cognitive Science 32(2), 418–444 (2008): https://doi.org/10.1080/03640210701864089 (author copy: https://davidtemperley.com/wp-content/uploads/2015/11/temperley-cs08.pdf)
  - Useful for: a key-finding model for single melodies (key profile, range, pitch proximity); Essen profiles (degree 1 = 18.4% of major-melody notes); Table 2 accuracies on 65 Essen songs and 48 Bach fugue subjects for this and four other models; descriptions of the Longuet-Higgins–Steedman and Krumhansl–Schmuckler models. Read in full.
  - Applied in: accuracy figures throughout, the first-note cue, the role-profile shares.
- **S64 - Distribution alone and listeners.** David Temperley and Elizabeth West Marvin, "Pitch-Class Distribution and the Identification of Key", Music Perception 25(3), 193–212 (2008): https://doi.org/10.1525/mp.2008.25.3.193
  - Useful for: listeners matched the generating key in slightly more than half of their judgments on melodies drawn at random from key distributions, so note counts are far from the whole story (abstract, as summarised by the indexing services consulted).
  - Applied in: why short melodies are ambiguous.
- **S65 - Aarden–Essen profiles.** Bret J. Aarden, Dynamic Melodic Expectancy, PhD dissertation, The Ohio State University (2003). Profile values as published in S73 and S74.
  - Useful for: key profiles counted in folk melodies of the Essen collection, the corpus closest to a one-voice doodle.
  - Applied in: the profile table and the worked-example comparison.
- **S66 - Albrecht–Shanahan profiles.** Joshua Albrecht and Daniel Shanahan, "The Use of Large Corpora to Train a New Type of Key-Finding Algorithm: An Improved Treatment of the Minor Mode", Music Perception 31(1), 59–67 (2013): https://doi.org/10.1525/mp.2013.31.1.59
  - Useful for: distance instead of correlation; trained on 490 and tested on 492 pieces; most models do better in major than minor; combined with Aarden–Essen it beat all other models (abstract read; accuracy figures and profile values not checked).
  - Applied in: the profile discussion.
- **S67 - Parallel-processing key finding.** Piet G. Vos and Erwin W. Van Geenen, "A Parallel-Processing Key-Finding Model", Music Perception 14(2), 185–223 (1996): https://doi.org/10.2307/40285717
  - Useful for: a model for single-voiced music using pitch class, duration, scale and chord evidence, and primacy of the first notes (abstract read).
  - Applied in: the first-note cue and the summary table.
- **S68 - Intervallic rivalry and tone order.** Helen Brown, David Butler and Mari Riess Jones, "Musical and Temporal Influences on Key Discovery", Music Perception 11(4), 371–407 (1994): https://doi.org/10.2307/40285632
  - Useful for: the rare-interval hypothesis and listener evidence that the order of the same tones changes the heard key (abstract read).
  - Applied in: interval-based methods and why short melodies are ambiguous.
- **S69 - Scale elimination with a first-note rule.** H. Christopher Longuet-Higgins and Mark J. Steedman, "On Interpreting Bach", Machine Intelligence 6, Edinburgh University Press (1971). Not read directly; its algorithm and results are taken from S63.
  - Useful for: the classic one-voice key finder: drop keys whose scale lacks a played note, then prefer the key whose home is the first note.
  - Applied in: first-note cue, summary table.
- **S70 - Mode profiles for chant.** David Huron and Joshua Veltman, "A Cognitive Approach to Medieval Mode: Evidence for an Historical Antecedent to the Major/Minor System", Empirical Musicology Review 1(1), 33–55 (2006): https://doi.org/10.18061/1811/24072
  - Useful for: per-mode pitch-class profiles built from 98 chants and used to predict mode; three modes with very similar profiles (abstract read).
  - Applied in: mode detection beyond major and minor; per-mode profiles in the proposal.
- **S71 - Mode classification in plainchant.** Bas Cornelissen, Willem Zuidema and John Ashley Burgoyne, "Mode Classification and Natural Units in Plainchant", Proceedings of the 21st ISMIR Conference, 869–875 (2020): https://archives.ismir.net/ismir2020/paper/000232.pdf
  - Useful for: textbook mode determination by final, range and first note; final alone expected near 50%; 86–90% for classical and profile methods, 93–95% F1 for fragment-based vectors on 20,865 chants. Read in full.
  - Applied in: the final-note cue, mode detection, the draft entry Final.
- **S72 - Mode identification in Irish dance tunes.** John M. McBride and W. Tecumseh Fitch, "Contrasting statistical patterns in melodic and molecular evolution reveal distinctive constraints in a culturally evolving system", arXiv:2607.12673 (2026), supplementary section "Mode identification algorithm": https://arxiv.org/abs/2607.12673 ; and Juan José Navarro-Cáceres et al., "Exploring Mode Identification in Irish Folk Music with Unsupervised Machine Learning and Template-Based Techniques", Mathematics and Computation in Music (MCM 2024), LNCS, 412–420: https://doi.org/10.1007/978-3-031-60638-0_34 , with a follow-up in Applied Sciences 15(6), 3162 (2025): https://doi.org/10.3390/app15063162
  - Useful for: a third/sixth/seventh decision tree for Ionian, Mixolydian, Aeolian and Dorian with a known home note (94% agreement with user labels; 52% major); the remark that joint home-and-mode estimation is non-trivial (McBride and Fitch, read in full); the existence of template and unsupervised comparisons (Navarro-Cáceres, metadata only).
  - Applied in: mode detection beyond major and minor.
- **S73 - Humdrum Extras `keycor` manual.** Craig Stuart Sapp, keycor manpage, Humdrum Extras: https://extras.humdrum.org/man/keycor/ (read through https://web.archive.org/web/2023/https://extras.humdrum.org/man/keycor/). The Bellman–Budge profiles it lists come from Héctor Bellmann, "About the Determination of Key of a Musical Excerpt", CMMR 2005, Lecture Notes in Computer Science 3902, 76–91 (2006): https://doi.org/10.1007/11751069_7
  - Useful for: full numeric Krumhansl–Kessler, Aarden–Essen, simple, Bellman–Budge and Temperley–Kostka–Payne profiles; the duration switch; each profile's confusion tendency.
  - Applied in: the profile table, tendencies, the worked-example comparison.
- **S74 - music21 key analysis.** music21 `analysis.discrete` module, documentation and source: https://www.music21.org/music21docs/moduleReference/moduleAnalysisDiscrete.html and https://github.com/cuthbertLab/music21/blob/master/music21/analysis/discrete.py ; licence BSD 3-Clause: https://github.com/cuthbertLab/music21/blob/master/LICENSE
  - Useful for: a reference implementation of five profile sets with duration-weighted histograms and Pearson correlation; licence check.
  - Applied in: the methods survey and licence notes.
- **S75 - Essentia key algorithm.** Essentia `Key` reference: https://essentia.upf.edu/reference/std_Key.html ; source https://github.com/MTG/essentia/blob/master/src/algorithms/tonal/key.cpp ; licence AGPL-3.0: https://github.com/MTG/essentia/blob/master/COPYING.txt ; essentia.js licence AGPL-3.0: https://github.com/MTG/essentia.js/blob/master/LICENSE
  - Useful for: Temperley 1999 and Temperley–Kostka–Payne profile values; input is an audio-derived pitch-class profile; licence check.
  - Applied in: the profile table and licence notes.
- **S76 - tonal (TypeScript music theory library).** tonal, `Scale.detect`: https://github.com/tonaljs/tonal/tree/main/packages/scale ; licence MIT (npm registry metadata for `tonal` 6.5.0).
  - Useful for: a browser-ready set lookup (scales containing given notes), with the first note taken as home unless a tonic is given.
  - Applied in: the summary table.
- **S77 - ECMAScript implementation-approximated maths.** ECMA-262, ECMAScript Language Specification, clause 4.4 "implementation-approximated": https://tc39.es/ecma262/
  - Useful for: "Some mathematical operations, such as Math.exp, are implementation-approximated", so results may differ between engines.
  - Applied in: the integers-only rule for the seeded draw.
- **S78 - General music-theory terms.** Wikipedia articles "Pitch class" https://en.wikipedia.org/wiki/Pitch_class , "Relative key" https://en.wikipedia.org/wiki/Relative_key , "Parallel key" https://en.wikipedia.org/wiki/Parallel_key , "Minor scale" https://en.wikipedia.org/wiki/Minor_scale , "Blue note" https://en.wikipedia.org/wiki/Blue_note
  - Useful for: fact-checking the beginner definitions of pitch class, relative and parallel keys, harmonic minor and blue notes. Reference only; no text copied.
  - Applied in: the problem statement and the proposed lexicon entries.

## Questions for the spec session

1. **Which profile.** The proposal uses role shares (home 0.200, fifth 0.165, third 0.145, others
   0.1175, outside 0.004), not measured data. Accept them as a starting point for listening tests,
   or fit per-mode profiles from a corpus first? (No corpus of all seven modes on short melodies was
   found, S70–S72.)
2. **Cue strengths.** Final ×2, first ×1.5, note lengths clamped to 0.5–1.5 beats: acceptable
   defaults? The "ending on E" variation shows the final cue can move the answer a long way.
3. **Strong beats.** Is the doodle played against a known tempo (O112)? Only then can strong-beat
   weighting apply, and no published measure of its benefit was found.
4. **Temperature and cut-off.** T = 1, keep candidates within half of the best chance, at most 3.
   Should the cap split a tie (the "ending on E" case picks by fixed order), or keep all tied
   candidates?
5. **Mode priors.** Should all seven modes be equally likely beforehand? Locrian is rarely a real
   home and ties with Phrygian when the fifth degree is missing; Irish tunes are about half major
   (S72). A lower prior for Locrian, or a higher one for Ionian and Aeolian, would make suggestions
   less surprising.
6. **What "fits" means.** Selection among the kept candidates (proposed), or only "all notes in the
   selected set" (the strawman's wording, which would stay silent for the D-centred doodle while C
   Ionian is selected)? And the optional ×2 head start for the current selection?
7. **Labels.** When the player's collection is Major or Minor and the answer is Ionian or Aeolian,
   show "Major"/"Minor" (same notes, different chord plans in the app,
   [Collection](lexicon.md#collection))? Proposed: keep the player's family.
8. **Minimum material.** 5 different pitch classes, 6 notes, 2 beats: right thresholds? Note the
   README sentence on "five or more" should be corrected to "six or more, about half the time at
   five".
9. **Outside notes.** Suggest nothing below an 80% fit share: the right threshold? Should the
   message say the doodle uses a scale the app does not offer (harmonic minor, blues)?
10. **Reproducibility.** The draw is reproducible only if the filtered doodle and the session seed
    are kept with the session or its replay key. Is the doodle part of what a Jam replay stores
    (O112)? Is a new named stream `key-suggestion` acceptable in the stream registry?
11. **Show the alternatives?** The strawman mentioned "maybe one or two alternatives". With a draw,
    should the other kept candidates be shown as "also possible", or only the drawn one?
