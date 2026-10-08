# v3.2 — Rhythm Lock, Allowed Rhythm Changes, Vary Settings' Allowed Groups and Jam's Drift

Status: draft v2 (2026-10-08). Approved by the owner: the lock and its allowed rhythm changes by
D232, everything else as proposed by D234. Every item below is settled and cites its decision; the
gaps closed while settling the draft cite "draft v2".

Serves:

- **The rhythm lock**: P3.C3 (hold a doodle's rhythm while the melody grows), and P1.G2 (real-time
  reading): with the rhythm settled, the eyes go to the pitches
  ([personas](../../personas.md)).
- **Allowed rhythm changes**: P1.G1 (vocabulary by exposure: hearing a rhythm varied by one small,
  named edit) and P3.C3 (the doodle's rhythm, lightly developed), at the player's choice.
- **Vary settings' allowed groups**: P1.G1 and P2.S1, variety the player can steer.
- **Drift**: P3.C3, how far a Jam's phrases wander from the doodle.

Research: [mutation catalogue](../../../docs/music/mutation-catalogue.md). Code facts:
[jam-grounding.md](jam-grounding.md), re-checked on 2026-10-08
([§D](jam-grounding.md#d-re-check-2026-10-08)).

Plain words used here, one term per concept in all three v3.2 documents:

- **Note start** (attack): the moment a note begins. **Beats 1 and 3** are the measure's strong
  beats; every generated measure has a note starting on one of them (the
  [metrical anchor](../../../docs/music/lexicon.md#metrical-anchor)).
- **Rhythm lock**: the switch that makes every phrase of a session repeat one rhythm. **The locked
  rhythm** is that rhythm: every note start and length, and so every rest, of the four measures.
- **Allowed rhythm changes**: the player's list of small edits a phrase may make to the locked
  rhythm. **A rhythm change** is one such edit, lasting one phrase.
- **Forced bend**: the search's fallback when the locked rhythm cannot make a phrase. Not a player
  option, and not a rhythm change.
- **Vary settings' allowed groups**: which groups of settings Vary settings may mutate (D216 calls
  it "an allowed list"; renamed here so it is never confused with the allowed rhythm changes).
- **Drift**: in a Jam, how far phrases may wander from the doodle.
- **Distance**: how different two rhythms sound, on the catalogue's
  [scale](../../../docs/music/mutation-catalogue.md#the-distance-scale-proposed): Same, Close
  (one small edit inside a beat), Near (one edit on or next to a strong beat, or two small ones),
  then Related and Loose.

## 1. Settled

- **The lock is strict** (D232). It fixes every note start and length, and so every rest, across
  the four measures; the pitches keep changing. This replaces D216's "what it holds" (the note
  starts on beats 1 and 3 and the number of notes in each measure), which draft v1 had found
  inconsistent with D216's bends: D232 settles it as the exact lock (O151).
- **What is locked** (D232): outside a Jam, the rhythm of phrase 1, the phrase on screen at Start;
  in a Jam, the rhythm nearest the doodle that the rhythm grammar can write. Locking the exact
  played rhythm needs v4's rhythm editor (O102).
- **No automatic bends** (D232). Draft v1's tension-driven bends (a phrase bending when its tension
  rose) are removed; O152 is superseded. D175's "generation may bend it a little for tension and
  release" now lives on only as the player's option below.
- **Allowed rhythm changes are the player's option** (D232): a list of small edits from the
  [mutation catalogue](../../../docs/music/mutation-catalogue.md), **empty by default**, so the
  lock is strict by default (D234, O157). Each change **lasts one phrase**; the next phrase returns
  to the locked rhythm. This keeps D175's "while the lock is set, a mutation cannot alter the
  rhythm durably".
- **How often** (D234, O157): at most one change per phrase, in a seeded share of phrases,
  somewhat more often on a tenser phrase when Tension across phrases is on. **A change is never
  shown.**
- **The forced bend stays** as the search's fallback, kept from draft v1's O152 proposal when D232
  superseded the rest of it (D234): §4.
- **Wider mutation options are v4** (D232): changes that stay, the catalogue's larger mutations,
  and mutations under the rhythm editor's own rhythm
  ([v4](../v4/README.md#placed-here-proposed)).
- **A switch of its own**, not reached through the Custom note density (D216). Custom and O100 are
  v4 (D211).
- **Two kinds of mutation, kept apart** (D216, closing O118): Vary settings gets the player-chosen
  allowed groups (§8); under Jam, the drift control (§6).
- **Vary settings keeps mutating key and mode** when the player turns it on, in Jam too (O121,
  D216).

## 2. What is locked (D232; D234 for O153)

- **Outside a Jam, the locked rhythm is phrase 1's**: the phrase on screen at Start. Regenerating
  at Idle changes it. The lock lasts for the session. At its end the locked rhythm itself is not
  kept as a setting; a kept session keeps it only inside its phrases' reproduction inputs (§7).
- **In a Jam, phrase 1 is the rhythm nearest the doodle** (D232, D234 closing O114). With the lock
  on, phrase 1's rhythm candidates are ordered by distance to the doodle only, closest first,
  whatever the drift, and the rhythm chosen is locked. A held doodle's phrase 1, generated at Idle,
  is chosen the same way (draft v2).
- **Phrase 1 never takes a rhythm change** (draft v2): it is the locked rhythm. Changes may start
  with phrase 2.
- **Narrow windows** (D234, O153). When a session steps note density down to `Eighth` under v2's
  narrow-window rule ([v2 master spec §5](../v2/master-spec.md#5-control-changes-during-a-session))
  and the locked rhythm uses sixteenth notes, the first phrase generated with `Eighth` takes the
  nearest `Eighth` rhythm (the distance of §6), and that rhythm becomes the locked one for the rest
  of the session.

## 3. Allowed rhythm changes

### 3.1 The option (D232, D234)

- **A list of edit kinds, each on or off**, all off by default (§3.2 lists them). Set at Idle or in
  the review, like every setting, and saved like the three "During a session" options
  ([v3.0 master spec §4.2](master-spec.md#42-what-is-saved-automatically)) (draft v2).
- **It acts only while the lock is on** (draft v2). With the lock off, the list is kept and does
  nothing; how that shows is `ux-writer`'s.
- **Presets neither hold nor change it**, nor the lock or the drift (draft v2): v3.1 presets hold
  generation controls, figure levels and a key and mode restriction only (D228, D233). Richer
  presets with rhythm cues are later (D228).

### 3.2 The v3.2 list (D234, O157)

What one change is (D232's "small edit", made precise in draft v2 from the grammar's structure,
[jam-grounding §D.2](jam-grounding.md#d2-what-the-rhythm-domain-offers-a-locked-rhythm)): **one
edit of an allowed kind, made in one measure, or made in a gesture measure (1 or 2) and repeated in
its answer measure (3 or 4)**. The second form is needed because the rhythm grammar builds measures
3–4 as a varied copy of measures 1–2: a split, a merge or a note turned into a rest in the gesture
always comes back in the answer, and the grammar cannot write it alone. Repeated that way, the
change keeps the phrase's [gesture and answer](../../../docs/music/lexicon.md#gesture-and-answer)
and stays, measure by measure, a Close or Near edit on the catalogue's scale. Comparison is by the
written bars: every note start and length, every rest and every tie.

The list offers five kinds, each a Close or Near entry of the
[mutation catalogue](../../../docs/music/mutation-catalogue.md#rhythm-mutations) that the grammar
can express as a domain candidate. Shares below are the measured share of locked rhythms that have
at least one such change available, over all supported settings.

| Kind | Catalogue entries | Distance | Where the grammar offers it | Why it is in the list |
| --- | --- | --- | --- | --- |
| **Move a note start** by a sixteenth or an eighth | Displace a note; Dot or undot | Close (Near on beat 1 or 3) | In one measure: from a second answer transform (Build, Edge) and from Occasional offbeats' templates; repeated in measures k and k+2 under most settings. Widest of the five: 11–93 % depending on settings | The commonest gentle rhythm variation (a dotted or pushed note); it keeps the note count, so the eye still finds the same notes. One kind for both catalogue entries, since both move one boundary between two notes |
| **Move a rest** | Move a rest | Close (Near off the density's grid) | In one measure under Occasional offbeats and Active displacement, and at Build and Edge; repeated in k and k+2 under Active displacement | The rest's length and the phrase's silence stay, only its place moves: the smallest change a player can hear in the space of a phrase |
| **Split a note** | Split a note | Close (Near on beat 3) | Only repeated in k and k+2, undoing the gesture's one merge; never under Strict variety. Common where it exists (about 70 % of locked rhythms under Straight with Slightly or Heavily varied) | D232 names it; it is the catalogue's commonest variation in folk, pop and jazz heads |
| **Merge two notes** | Merge two notes | Close (Near when the removed start was on beat 1 or 3) | Only repeated in k and k+2, adding the gesture's one merge; never under Strict variety (7–19 %) | D232 names it; the calming counterpart of a split |
| **Add or remove a rest** | Add or remove a rest | Close (Near on beat 1 or 3) | Only repeated in measures 2 and 4 (the gesture's recurrence substitution) or 1 and 3; 5–18 %, the only kind Eighth with Strict and Straight offers | D232 names it; space is a strong device in jazz and funk |

Left out, with the reason:

- **A tie added or removed**: it changes how a rhythm is written, not how it sounds. Nothing for the
  ear, and a cost for the eye.
- **A note and the rest beside it trading places**: not a catalogue entry of its own, rare (at most
  9 %), and offered in measure 2 only.
- **Density step on one beat, regroup into 3 + 3 + 2, anticipation as a held push**: the grammar
  cannot write them as one edit (a beat's cells recur in every measure; a held push needs a tie the
  grammar refuses). Wider options are v4 (D232).
- **Repeat with a changed ending**: every phrase already does it between measures 2 and 4.
- **Related and Loose entries** (shift the whole motif, augmentation, diminution, fragmentation,
  retrograde): far beyond "small", and mostly not writable; v4 (D232).

**What the player should know** (draft v2): which changes exist depends on the rhythm settings.
Strict variety offers no split or merge; Strict variety with Straight syncopation offers almost
nothing (Eighth: add or remove a rest only; Sixteenth: none); Quarter with Strict variety and
Straight syncopation has a single rhythm, so nothing to change to. A list that finds nothing simply
leaves the lock strict (§3.3). How the list's description says so is `ux-writer`'s.

### 3.3 When a phrase changes (D234, O157)

- **At most one change per phrase**, never on phrase 1.
- **A seeded share of phrases** (concrete figures: draft v2, to tune at the listening check):
  each phrase from phrase 2 on draws whether it changes, **1 in 4** normally and **1 in 2** on a
  tenser phrase. A tenser phrase is one Tension across phrases generates one step above the
  tension in effect (the second phrase of each group of four, unless the tension is already Edge).
  A tension step by Vary settings is a setting change, not a tenser phrase (draft v2).
- **The draw is seeded by the phrase's own seed**, through a hash tie key
  (`infinite-flow/rhythm-change/v1`), inside generation: the generator stays a pure function of its
  intent, and a pre-generated phrase draws exactly as the session would (draft v2).
- **Which change**: among the phrase domain's candidates whose bars differ from the locked bars by
  exactly one change of an allowed kind (§3.2, in one measure or repeated in its answer), in
  seeded order; every allowed kind is pooled, so a kind with more candidates comes up more often.
  A change is always measured from the locked rhythm, never from the previous phrase, so changes
  never add up.
- **No candidate, no change** (draft v2): when the domain holds no candidate for any allowed kind,
  the phrase keeps the locked rhythm; nothing is shown, and the session history records it.
- **A change is never shown** (D234): nothing in the live view, the review or the exports marks it.
  The player reads the notes as written; v2 likewise never marks a repeated phrase or an automatic
  setting change ([v2 master spec §5](../v2/master-spec.md#5-control-changes-during-a-session)).
- **The next phrase returns** to the locked rhythm (D232), or draws afresh.

## 4. The forced bend (D234)

- **When**: the locked bars are not in the phrase's domain (a tension step by Tension across
  phrases or Vary settings changes the rhythm domain, [§5](#5-how-the-search-holds-it)), or no
  phrase can be found with them on the rung being tried.
- **What**: the phrase takes the nearest rhythm in its domain that makes a phrase, nearest by the
  per-measure distance of §6, then seeded order (a rhythm that sounds the same but is written with
  other ties is at distance 0, so it comes first). It is recorded in the session history only, never
  shown, and the next phrase tries the locked rhythm again.
- **Not a player option**: it cannot be turned off, and it happens with an empty list too. It is
  what lets a strict lock meet Tension across phrases without ever failing a phrase because of the
  lock.

## 5. How the search holds it

Code facts that shape this (re-checked 2026-10-08,
[jam-grounding §D](jam-grounding.md#d-re-check-2026-10-08)):

- **Each rhythm candidate has a stable index and identity**, independent of the seed.
- **Tension is part of the rhythm domain's key.** Settled and Lift rhythms have exactly one answer
  transform in measures 3–4, Build and Edge one or two. Tension across phrases changes the domain
  on phrases 2 and 4 of each group of four.
- **Measured** ([jam-grounding §D.2](jam-grounding.md#d2-what-the-rhythm-domain-offers-a-locked-rhythm)):
  Settled and Lift hold the same rhythms, and so do Build and Edge; every Settled or Lift rhythm is
  also in the Build and Edge domains. Only a step **down from Build to Lift** can lose the locked
  rhythm: 58 % of Build and Edge rhythms (those with two answer transforms) are missing at Lift,
  pooled over the settings. So forced bends come from Tension across phrases only when the chosen
  tension is Build (its fourth phrase of each group), from Vary settings' Tension step from Build
  down to Lift, and from the narrow-window step-down.
- **No existing key compares bars.** A candidate's identity holds its provenance and its tension,
  and identical rhythms carry different identities. Matching by bars needs a small bar key (code
  gap), cheap to build: about 10 ms once per domain, then well under a millisecond per phrase in
  Node.
- **The search tries rhythms inside each harmony**: harmony 1 with every rhythm, then harmony 2. A
  locked rhythm merely placed first would give way to another rhythm on harmony 1 before being
  tried on harmony 2.

Rules (D234):

- **The locked rhythm is matched by its bars**, the note starts and lengths of its four measures,
  not by its index or identity, in the domain of the phrase's own settings.
- **Under the lock, the search tries the phrase's rhythm with every harmony before any other
  rhythm**: the drawn change's candidates first when the phrase changes, then the locked bars, then
  the forced bend's order. This is an order inside the rhythm stage and the orchestration, not a
  constraint: every phrase possible today stays possible, and no stage revises another
  ([Jam §6](jam.md#6-planner-authority-o10-d234)).
- **Every rung of the failure ladder keeps the lock**, the standalone phrase included, since it only
  orders candidates. Whether that slows the standalone attempt past its measured reserve is part of
  the sweep (§9.3).
- **Cost at 240 BPM**: matching bars and finding one-change neighbours scans a domain of at most
  2,932 candidates (the largest; 1,797 is the slowest to build), outside the pitch search: about
  10 ms to key a domain once, then under a millisecond per phrase (Node figures). The browser
  sweep confirms it against the standalone reserve (1.075 s) and the phrase deadlines, unchanged.

### What the lock meets

| It meets | Rule |
| --- | --- |
| Note density, rhythmic variety, syncopation, silence density | Locked for the session as every setting is (v2 §5). Vary settings may not change them while the lock is on (§8). The locked rhythm came from their domain, so it fits their bands. |
| Tension | Still changes each phrase's melody, harmony and tension figure. A phrase whose domain lacks the locked bars takes a forced bend (§4). |
| Tension across phrases | As Tension. With allowed rhythm changes, its tenser phrases draw a change more often (§3.3). |
| Vary settings | The Rhythm group is ineligible while the lock is on; every other allowed group works as before. A Tension step is matched like Tension across phrases' (forced bend when the bars are missing); Style steps (figure levels, D233) never touch rhythm. |
| Narrow-window step-down | §2. |
| Pre-generation | Pre-generated phrases follow the lock and its draws, as the session would (v3.0 §8). Switching the lock, or changing the allowed rhythm changes, at Idle discards them. |
| Jam | Phrase 1 is the rhythm nearest the doodle; then the lock, not drift, decides rhythm. Drift still shapes the melody. |
| Replay key and kept sessions | §7. |

## 6. The Jam drift control

Settled by D234 (O146).

- **Three positions, closest first**: **Close**, **Near** (default), **Free**. Shown only while Jam
  is on; saved like the session options. D216 allowed three or four; a fourth, Related, would rest
  on operations the generator cannot do yet (shifting the whole motif, augmentation), so it waits
  for them.
- **What each position does** ([Jam §5](jam.md#5-what-the-doodle-feeds-the-generator-d234-o145)):

  | Position | Rhythm | Melody |
  | --- | --- | --- |
  | Close | Candidates with every measure Same or Close to the doodle's come first | Follows the doodle's moves: direction and size (step, skip, leap) |
  | Near | Every measure at most Near | Follows the doodle's directions only |
  | Free | Seeded order, as today | No preference; only the join from the doodle's last note |

  With the rhythm lock on, the Rhythm column applies to phrase 1 only through "nearest the doodle"
  (§2); the Melody column applies to every phrase.
- **The distance per measure**: compare the candidate's measure with the doodle's measure laid over
  it, as two lists of note starts and rest starts in ticks. An edit adds one, removes one, or moves
  one by at most an eighth note. No edit is Same; one edit away from ticks 0 and 8 is Close; one
  edit touching tick 0 or 8, or two Close edits, is Near; anything more is beyond. Within a
  position's band, candidates keep their seeded order, so phrases still vary; outside it, the
  closest come first, so a doodle far from everything the settings allow is still approached. The
  same distance orders the forced bend (§4) and the narrow-window step-down (§2).
- **The catalogue's mutations, as unlocked here.** In v3.2, a Close or Near mutation is reached by
  choosing a domain rhythm at that distance from the doodle, not by an operator applied to the
  doodle. The catalogue's Close and Near rhythm entries that the grammar can write are covered that
  way; those it cannot write and the pitch-keeping motif entries (sequence, interval expansion,
  fragmentation) are later.
- **Listening check before the gate** (catalogue question 10): the owner ranks a handful of
  examples by ear before the scale drives the control.

## 7. Reproducibility

- A locked phrase depends on phrase 1's rhythm, and a change on the allowed list and the phrase's
  share. So the generation intent carries the locked bars, the allowed rhythm changes, and whether
  the phrase is a tenser one; the generator stays a pure function of its intent. A Jam phrase also
  carries the quantised doodle and the drift.
- The replay key gains these in v3.2's version, `ifk4.` after v3.1's `ifk3.`
  ([Jam §8.4](jam.md#84-determinism-and-the-seeded-draw)); every earlier key still decodes. The
  quantised doodle in the key is part of the contract change the owner confirms at the v3.2 master
  spec review ([Jam §8.1](jam.md#81-privacy-the-doodles-status-d234-o144)).
- A kept session's reproduction inputs gain the same data for each phrase (draft v2), under a new
  data version ([Jam §7.2](jam.md#72-the-review-the-exports-and-kept-sessions-d234-o147)).
- New orderings break ties by the existing seeded key, then by index, in code-unit order (ISS-010).

## 8. Vary settings' allowed groups (D216, D234 closing O154)

- **Six groups**, each switching its settings on or off together
  ([catalogue](../../../docs/music/mutation-catalogue.md#which-settings-it-touches)):
  - **Key and mode**: written key, collection.
  - **Harmony**: harmonic motion.
  - **Tension**: tension.
  - **Rhythm**: note density, rhythmic variety, syncopation, silence density.
  - **Melody shape**: contour, register, leapiness, arpeggio chaos.
  - **Style**: since v3.1, one embellishment figure's level, one step (D233), replacing v2's
    Neutral and Jazz flip.
- **Default: all six on**, which is Vary settings as it stands. The groups are saved with the
  option, and set only at Idle or in the review, like every setting.
- **Under a v3.1 preset with a key and mode restriction**, the Key and mode group's moves stay
  inside it, as the [v3.1 presets draft](presets.md) settles (D231, D233).
- **The legal-move check** (D216). When Vary settings is on, the allowed groups must offer at least
  one move from the current settings onto a supported combination. If they do not, Vary settings
  cannot be turned on with those groups, and the app says why. The Rhythm group does not count
  while the lock is on. Today the engine throws an error in this case; with every group allowed it
  never arises.
- **During a session** a reached setting can always step back to where it came from, so a dead end
  can only appear after the narrow-window rule changed what is supported. Then that mutation is
  skipped and recorded in the session history, and the next one is drawn as usual. This is a
  narrow exception to v2's "the mutation cycle is never silently skipped" (v2 §5).
- **Code gap**: the engine has no way today to exclude a setting at run time; the allowed groups
  need one.

## 9. Conflicts, who it serves, and done

### 9.1 What changes in settled decisions

- **D216's "what it holds"** is replaced by D232's strict lock (§1).
- **D175's "generation may bend it a little"** becomes the player's allowed rhythm changes (D232).
- **The atom `module_ranked_candidate_ordering`** describes harmony and rhythm order as preferring
  no candidate; the lock's order and drift's distance prefer some. Amended through `documentalist`
  with the v3.2 master spec ([Jam §6](jam.md#6-planner-authority-o10-d234)).
- **v2 §5, "never silently skipped"**: a narrow exception (§8).
- **Tension across phrases changes the rhythm domain** on phrases 2 and 4 of each group, so "the
  rhythm does not change" holds by matching bars, with forced bends where the bars do not exist
  (§4, §5).
- **v3.0 §8**: the lock switch, the allowed rhythm changes, the allowed groups and drift become
  settings whose change discards pre-generated phrases.

### 9.2 Who it serves

| Piece | Goal |
| --- | --- |
| Lock from phrase 1 | P1.G2 real-time reading |
| Lock from the doodle | P3.C3 grow an idea |
| Allowed rhythm changes | P1.G1 vocabulary (a rhythm varied by one named edit), P3.C3 |
| Vary settings' allowed groups | P1.G1, P2.S1: variety the player steers |
| Drift | P3.C3 |

### 9.3 Definition of done (D232, D234)

1. With the lock on and the allowed rhythm changes empty, every phrase of a session has phrase 1's
   rhythm exactly (every note start and length, every rest), apart from forced bends, whose rate
   over the sweep is measured and recorded.
2. With allowed rhythm changes, no phrase makes more than one change, every change is of an
   allowed kind and measured from the locked rhythm, phrase 1 never changes, and the phrase after
   a change returns to the locked rhythm; over the sweep the share of changed phrases is near 1 in
   4, and near 1 in 2 on Tension across phrases' tenser phrases, and the share of drawn changes
   with no candidate is recorded.
3. No change and no forced bend is marked anywhere: live view, review, exports.
4. Under the lock, the phrase's rhythm is tried with every harmony before any other rhythm.
5. Every phrase under the lock obeys every rule of its settings; no phrase repeats because of the
   lock in the sweep at 60, 120 and 240 BPM, and the standalone attempt stays within its reserve.
6. In a Jam with the lock on, phrase 1's rhythm is the candidate nearest the doodle.
7. After a narrow-window step-down, the first `Eighth` phrase's rhythm is locked for the rest of
   the session.
8. Pre-generated phrases under the lock, changes included, are the phrases the session plays.
9. Drift's three positions order candidates as §6 says; the owner's listening check is recorded.
10. Vary settings' allowed groups: all six reproduce today's behaviour byte for byte; groups with
    no legal move cannot be turned on and say why; a mid-session dead end skips one mutation and
    never throws.
11. Locked, changed, forced-bend and drifted phrases replay from their keys.
12. The owner's listening check of the allowed rhythm changes, each kind on a handful of locked
    rhythms, is recorded.

## 10. Open

None: closed by D232 (O103, O151) and D234 (O114, O146, O152 as superseded by D232, O153, O154,
O157).
