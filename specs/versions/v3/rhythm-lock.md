# v3.2 — Rhythm Lock, Vary Settings' Allowed List and Jam's Drift

Status: draft v1 (2026-10-07). spec-writer's proposals for the owner's review. Settled items cite
their decision; everything else is `(proposed)`.

Serves:

- **The rhythm lock**: P3.C3 (hold a doodle's rhythm while the melody grows), and P1.G2 (real-time
  reading): with the rhythm settled, the eyes go to the pitches
  ([personas](../../personas.md)).
- **The allowed list for Vary settings**: P1.G1 and P2.S1, variety the player can steer.
- **Drift**: P3.C3, how far a Jam's phrases wander from the doodle.

Research: [mutation catalogue](../../../docs/music/mutation-catalogue.md). Code facts:
[jam-grounding.md](jam-grounding.md), re-checked ([Jam §8.6](jam.md#86-grounding-that-moved)).

Plain words used here:

- **Note start** (attack): the moment a note begins. **Beats 1 and 3** are the measure's strong
  beats; every generated measure has a note starting on one of them (the
  [metrical anchor](../../../docs/music/lexicon.md#metrical-anchor)).
- **Bend**: a small, one-phrase change to a locked rhythm.
- **Distance**: how different two rhythms sound, on the catalogue's
  [scale](../../../docs/music/mutation-catalogue.md#the-distance-scale-proposed): Same, Close
  (one small edit inside a beat), Near (one edit on or next to a strong beat, or two small ones),
  then Related and Loose.

## 1. Settled

- **When set, the rhythm does not change** across the session; generation may bend it a little for
  [tension and resolution](../../../docs/music/lexicon.md#tension-and-resolution) (D175).
- **What it holds** (D216): the note starts on beats 1 and 3 and the number of notes in each
  measure. **A bend** is one Close mutation, or one Near mutation in one measure, dropped at the
  next phrase. The bend is the same mechanism as a mutation's (D216, part of O103).
- **A switch of its own**, not reached through the Custom note density (D216). Custom and O100 are
  v4 (D211).
- **While the lock is set, a mutation cannot alter the rhythm durably** (D175).
- **Two kinds of mutation, kept apart** (D216, closing O118): Vary settings gets a player-chosen
  allowed list, offered as six groups and checked for a legal move before it is accepted; under
  Jam, a drift control with three or four positions unlocks the catalogue's mutations up to a
  distance, closest first.
- **Vary settings keeps mutating key and mode** when the player turns it on, in Jam too (O121,
  D216).

## 2. What is locked (proposed, O151)

- **The locked rhythm is phrase 1's**: the phrase on screen at Start, or in a Jam the first phrase
  after the doodle. Regenerating at Idle changes it. The lock lasts for the session; at its end,
  nothing is kept.
- **In a Jam, phrase 1 is the rhythm nearest the doodle** (answers O114, first part). With the lock
  on, rhythm candidates are ordered by distance to the doodle only, closest first, whatever the
  drift. The lock therefore holds the doodle's rhythm as closely as the rhythm grammar allows. Holding
  the doodle's exact rhythm, when the grammar cannot write it, is the v4 rhythm editor's question
  (O102): imposing a rhythm needs a new grammar version.
- **An inconsistency in D216 to settle.** "The lock holds the note starts on beats 1 and 3 and the
  number of notes in each measure" does not sit with "a bend is one Close mutation, or one Near
  mutation in one measure": a Close edit may change a measure's note count by one, and a Near edit
  may move a start on beat 1 or 3. Two readings:
  - **Exact lock (proposed):** every phrase repeats the locked rhythm note for note; a bend
    changes it by one Close edit, or one Near edit inside one measure. D216's "what it holds"
    then means what a bent phrase still keeps everywhere outside its one edit. This matches "the
    rhythm does not change" (D175) and is the cheaper search (one rhythm, plus a handful of bends).
  - **Skeleton lock:** each phrase draws a new rhythm that shares the locked one's starts on beats
    1 and 3 and its note count per measure; a bend departs from that skeleton. Phrases vary more,
    and the rhythm is recognisable rather than identical.
  
  **Owner decision.**

## 3. Bends (proposed, O152 and O103)

- **When a phrase bends.** A phrase bends when it is generated with a tension above the one the
  player chose: Tension across phrases' second phrase in each group of four, or a Vary settings
  step up. That is the owner's "bend a little to create tension and release": the rhythm moves when
  tension rises and comes back when it falls. With neither option on, the lock is exact for the
  whole session.
- **Which bend.** Among the domain's candidates at Close distance from the locked rhythm, or at
  Near distance inside one measure, in seeded order. A bent phrase still obeys every rule its
  settings impose.
- **Dropped at the next phrase** (D216): the next phrase returns to the locked rhythm, or bends
  afresh if it too is tenser.
- **A bend is not shown** (answers the rest of O103). Nothing in the live view or the review marks
  it: the player reads the notes as written, and v2 likewise never marks a repeated phrase or an
  automatic setting change ([v2 master spec §5](../v2/master-spec.md#5-control-changes-during-a-session)).
- **A forced bend.** When the locked rhythm cannot make a phrase (§4), the phrase takes the nearest
  rhythm that can, recorded in the session history only, and the next phrase tries the locked rhythm
  again.

## 4. How the search holds it

Code facts that shape this (re-checked 2026-10-07):

- **Each rhythm candidate has a stable index and identity**, independent of the seed, so the next
  phrase can re-pick it while the settings are unchanged.
- **Tension is part of the rhythm domain's key.** Settled and Lift rhythms have exactly one answer
  transform in bars 3–4, Build and Edge one or two. A rhythm locked at Build or Edge may have no
  counterpart at Settled or Lift, and Tension across phrases changes tension from phrase to phrase.
- **The search tries rhythms inside each harmony**: harmony 1 with every rhythm, then harmony 2. A
  locked rhythm placed first would give way to another rhythm on harmony 1 before being tried on
  harmony 2.

Proposed rules:

- **The locked rhythm is matched by its bars**, the note starts and lengths of its four measures,
  not by its index or identity, in the domain of the phrase's own settings.
- **Under the lock, the search tries the phrase's rhythm (the locked bars, or its bends) with every
  harmony before any other rhythm.** Other rhythms follow, closest first. This is an order inside the
  rhythm stage and the orchestration, not a constraint: every phrase possible today stays possible,
  and no stage revises another ([Jam §6](jam.md#6-planner-authority-o10-proposed)).
- **When the locked bars are not in the phrase's domain** (a Build rhythm on a Lift phrase), the
  nearest candidate is used: a forced bend (§3).
- **Every rung of the failure ladder keeps the lock**, the standalone phrase included, since it only
  orders candidates. Whether that slows the standalone attempt past its measured reserve is part of
  the sweep (§8.3).
- **Narrow windows** (proposed, O153). When a session steps note density down to `Eighth` under v2's
  narrow-window rule ([v2 master spec §5](../v2/master-spec.md#5-control-changes-during-a-session))
  and the locked rhythm uses sixteenth notes, the first phrase generated with `Eighth` takes the
  nearest `Eighth` rhythm, and that rhythm becomes the locked one for the rest of the session.

### What the lock meets

| It meets | Proposed rule |
| --- | --- |
| Note density, rhythmic variety, syncopation, silence density | Locked for the session as every setting is (v2 §5). Vary settings may not change them while the lock is on (§7). The locked rhythm came from their domain, so it fits their bands. |
| Tension and Tension across phrases | Still change each phrase's melody, harmony and tension figure. A tenser phrase bends (§3); a phrase whose domain lacks the locked bars takes a forced bend. |
| Vary settings | The Rhythm group is ineligible while the lock is on; every other allowed group works as before. |
| Pre-generation | Pre-generated phrases follow the lock, as the session would (v3.0 §8). Switching the lock at Idle discards them. |
| Jam | Phrase 1 is the rhythm nearest the doodle; then the lock, not drift, decides rhythm. Drift still shapes the melody. |
| Replay key | §6. |

## 5. The Jam drift control (proposed, O146)

- **Three positions, closest first**: **Close**, **Near** (default), **Free**. Shown only while Jam
  is on; saved like the session options. D216 allowed three or four; a fourth, Related, would rest
  on operations the generator cannot do yet (shifting the whole motif, augmentation), so it waits
  for them.
- **What each position does** ([Jam §5](jam.md#5-what-the-doodle-feeds-the-generator-proposed-o145)):

  | Position | Rhythm | Melody |
  | --- | --- | --- |
  | Close | Candidates with every measure Same or Close to the doodle's come first | Follows the doodle's moves: direction and size (step, skip, leap) |
  | Near | Every measure at most Near | Follows the doodle's directions only |
  | Free | Seeded order, as today | No preference; only the join from the doodle's last note |

- **The distance per measure** (proposed): compare the candidate's measure with the doodle's
  measure laid over it, as two lists of note starts and rest starts in ticks. An edit adds one,
  removes one, or moves one by at most an eighth note. No edit is Same; one edit away from ticks 0
  and 8 is Close; one edit touching tick 0 or 8, or two Close edits, is Near; anything more is
  beyond. Within a position's band, candidates keep their seeded order, so phrases still vary;
  outside it, the closest come first, so a doodle far from everything the settings allow is still
  approached.
- **The catalogue's mutations, as unlocked here.** In v3.2, a Close or Near mutation is reached by
  choosing a domain rhythm at that distance from the doodle, not by an operator applied to the
  doodle. The catalogue's Close and Near rhythm entries that the grammar can write are covered that
  way; those it cannot write (splitting a note inside a beat, a density step on one beat) and the
  pitch-keeping motif entries (sequence, interval expansion, fragmentation) are later.
- **Listening check before the gate** (catalogue question 10): the owner ranks a handful of
  examples by ear before the scale drives the control.

## 6. Reproducibility

- A locked phrase depends on phrase 1's rhythm, and a bend on the session's chosen tension. So the
  generation intent carries the locked bars and whether the phrase may bend; the generator stays a
  pure function of its intent. A Jam phrase also carries the quantised doodle and the drift.
- The replay key gains these in its next version (`ifk4.` after v3.1's `ifk3.`,
  [Jam O156](jam.md#11-open)); every earlier key still decodes.
- New orderings break ties by the existing seeded key, then by index, in code-unit order (ISS-010).

## 7. Vary settings' allowed list (proposed, O154)

- **Six groups**, each switching its settings on or off together
  ([catalogue](../../../docs/music/mutation-catalogue.md#which-settings-it-touches)):
  - **Key and mode**: written key, collection.
  - **Harmony**: harmonic motion.
  - **Tension**: tension.
  - **Rhythm**: note density, rhythmic variety, syncopation, silence density.
  - **Melody shape**: contour, register, leapiness, arpeggio chaos.
  - **Style**: the musical profile's name.
- **Default: all six on**, which is v2's Vary settings exactly. The list is saved with the option,
  and set only at Idle or in the review, like every setting.
- **The legal-move check** (D216). When Vary settings is on, the allowed groups must offer at least
  one move from the current settings onto a supported combination. If they do not, Vary settings
  cannot be turned on with that list, and the app says why. The Rhythm group does not count while
  the lock is on. Today the engine throws an error in this case; with every group allowed it never
  arises.
- **During a session** a reached setting can always step back to where it came from, so a dead end
  can only appear after the narrow-window rule changed what is supported. Then that mutation is
  skipped and recorded in the session history, and the next one is drawn as usual. This is a
  narrow exception to v2's "the mutation cycle is never silently skipped" (v2 §5).
- **Code gap**: the engine has no way today to exclude a setting at run time; the allowed list needs
  one.
- **The Style group and v3.1 presets**: today Style flips Neutral and Jazz as a name only. With
  v3.1's presets (D228) the meaning of that flip needs aligning with the v3.1 draft.

## 8. Conflicts, who it serves, and done

### 8.1 Conflicts with settled decisions

- **D216's wording** (§2): "what it holds" against what a bend may change.
- **The atom `module_ranked_candidate_ordering`** says ranking prefers no candidate; the lock's order
  and drift's distance prefer some. To amend through `documentalist`.
- **v2 §5, "never silently skipped"**: a narrow exception (§7).
- **Tension across phrases changes the rhythm domain** every phrase, so "the rhythm does not change"
  can only hold by matching bars, with forced bends where the bars do not exist (§4).
- **v3.0 §8**: the lock switch, the allowed list and drift become settings whose change discards
  pre-generated phrases.

### 8.2 Who it serves

| Piece | Goal |
| --- | --- |
| Lock from phrase 1 | P1.G2 real-time reading |
| Lock from the doodle | P3.C3 grow an idea |
| Bends with rising tension | P1.G1 vocabulary (tension and release heard in rhythm) |
| Allowed list | P1.G1, P2.S1: variety the player steers |
| Drift | P3.C3 |

### 8.3 Definition of done (proposed)

1. With the lock on and no tension option, every phrase of a session has phrase 1's rhythm, apart
   from forced bends, whose rate over the sweep is measured and recorded.
2. With Tension across phrases on, exactly the tenser phrases may bend, each by one Close edit or
   one Near edit inside one measure, and the next phrase returns.
3. No bend is marked anywhere.
4. Under the lock, the locked rhythm is tried with every harmony before any other rhythm.
5. Every phrase under the lock obeys every rule of its settings; no phrase repeats because of the
   lock in the sweep at 60, 120 and 240 BPM, and the standalone attempt stays within its reserve.
6. In a Jam with the lock on, phrase 1's rhythm is the candidate nearest the doodle.
7. Drift's three positions order candidates as §5 says; the owner's listening check is recorded.
8. The allowed list: all six groups reproduce v2's behaviour byte for byte; a list with no legal
   move cannot be turned on and says why; a mid-session dead end skips one mutation and never
   throws.
9. Locked, bent and drifted phrases replay from their keys.

## 9. Open

- **O103 - What the rhythm lock holds, and how far it bends** _(v3.2; D175, D176, D211, D216)_:
  the rest. Proposed: a bend is not shown; it happens when a phrase's tension is above the
  player's choice; "this rhythm" is phrase 1's (in a Jam, the nearest to the doodle); a mutation's
  bend and generation's bend are one mechanism (D216).
- **O114 - Jam and the rhythm controls** _(v3.2; D209, D175, D211)_: Proposed: yes, the lock
  holds the doodle's rhythm as the grammar's nearest candidate (the exact rhythm is v4, O102); drift
  is the catalogue's mutation ladder under Jam, settled by D216, and gives way to the lock for
  rhythm. Proposed to close.
- **O146 - Drift's positions and distance** _(v3.2; D216)_: how many positions and how distance is
  measured. Proposed: Close, Near (default) and Free; per-measure edit counting on note and rest
  starts, an edit touching beat 1 or 3 counting as Near; checked by the owner's ear before the gate.
- **O151 - Exact or skeleton lock** _(v3.2; D175, D216)_: whether phrases repeat the locked rhythm
  note for note or only keep its starts on beats 1 and 3 and its note counts. Proposed: exact, with
  D216's "what it holds" read as what a bent phrase keeps. Needs the owner.
- **O152 - When a phrase bends** _(v3.2; D175, D216)_: tension-driven or otherwise, and what
  happens when the locked rhythm cannot make a phrase. Proposed: a phrase bends when its tension is
  above the player's choice; locked bars missing from the phrase's domain, or no phrase found with
  them, give a forced bend to the nearest rhythm, recorded internally.
- **O153 - The lock and the narrow-window step-down** _(v3.2; D146)_: Proposed: the first `Eighth`
  phrase takes the nearest `Eighth` rhythm, which becomes the locked rhythm.
- **O154 - The allowed list's dead ends and defaults** _(v3.2; D216)_: Proposed: all six groups on
  by default; a list with no legal move cannot be turned on, saying why; a mid-session dead end
  (only after a step-down) skips that mutation, recorded; the Style group to align with v3.1 presets.
