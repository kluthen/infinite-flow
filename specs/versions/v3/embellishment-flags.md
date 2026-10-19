# v3.1 — Embellishment Flags

Status: draft v3 (2026-10-08; terms aligned with D237 and D238 the same day, no behaviour changed).
Approved by the owner as proposed (D233). Consolidated for building into the [v3 master spec, Part
B](master-spec.md#part-b--v31); where the two differ, the master spec wins.

**Changes from draft v1.** The owner approved every proposal (D233), so each is now stated as
settled. spec-writer's consolidation pass added four precisions, written in where they belong:
the `ifk3.` key carries no preset name or Custom flag (§5, as [presets.md](presets.md) §6.3 has
it); Vary settings' figure step takes the one place in the draw the profile flip had (§7.1);
Tension across phrases never marks Custom (§7.2); and what the cost guard's fallback means for
the controls, Vary settings and loading, if the measurement adopts it (§6). (There was no draft
v2 of this document; the number follows [presets.md](presets.md), so the two v3.1 drafts share
one.)

The owner's request (D210): let the player choose which decorating figures the generator may use,
and how much it favors each, "many ways to support or alter in minor ways what's expected to be
played". Settled so far: weights are preferences, not quotas ("ish", D210); figures written as
ordinary notes come first (D210, D216); ornaments are notated symbols with playback expansion, and
only their main note is checked for acknowledgement (D216, closing O47). Background:
[v3 README](README.md#embellishment-flags). Research:
[embellishment catalogue](../../../docs/music/embellishment-catalogue.md) (31 figures). Presets,
which carry these settings, are in [presets.md](presets.md).

An **embellishment** (also called a decoration) is a note, or a small group of notes, that
decorates a more important note without changing the chord underneath
([lexicon](../../../docs/music/lexicon.md#embellishment)). This document calls each kind a
**figure**, and the player's setting for a figure its **figure level**.

## 1. What the code does today

Checked in the code on 2026-10-07 (paths relative to the repository root):

> **As of 2026-10-07, before v3.0 was built.** Line numbers and the "not built yet" statements below
> (storage, `ifk2.`, pre-generation) are out of date: v3.0 built them. The code facts v3.1 is built
> on were checked again on 2026-10-19 (`main` d007b27) and live in the
> [v3.1 build plan](build-plan-v3.1.md); where the two differ, the plan follows the code (D356).

- **Chord tones are always tried first.** At each note the pitch search orders its candidates by
  a rank that puts chord tones before every decorating note
  (`src/domain/pitch/pitch-ranking.ts:14-31, 48-78`), and searches depth-first in that order
  (`src/domain/pitch/pitch-search.ts:81-93`). Decorating notes all share one rank; their order
  among themselves is the phrase seed's tie order only. So a decorating note appears only when the
  chord-tone path runs into a dead end: in about 5,200 sampled phrases, free passing tones were in
  1–6 % of phrases and Jazz chromatic approaches in 4–20 %
  ([catalogue](../../../docs/music/embellishment-catalogue.md#how-often-figures-appear-today)).
  "Allowed" is not "favored".
- **The appoggiatura never appeared** in that sample. It exists only as the Tension control's
  one scheduled figure, tried after the "no figure" choice under Settled and Lift and after
  passing and neighbor tones under Edge (`src/domain/pitch/pitch-policy.ts:169-197`).
- **Two decorating notes in a row are rejected** unless they belong to one written figure: a free
  decorating note must be resolved by the very next note (`src/domain/pitch/pitch-figures.ts:81-89,
  160-176`). This blocks the diatonic enclosure, the double neighbor and scale runs. The enclosure
  path also skips the case where both outer notes are in the key
  (`src/domain/pitch/pitch-candidates.ts:188`).
- **One switch separates Neutral from Jazz**: the capability `allowsChromaticApproach`
  (`src/domain/controls/profile-selection.ts:40-45`), looked up from the profile **name**
  wherever it is needed (`src/domain/pitch/pitch-policy.ts:60`,
  `src/domain/generation/orchestration/window-search.ts:96`,
  `src/domain/validation/generation-result-validator.ts:141`).
- **The Tension control schedules at most one figure** of its own, Tension's scheduled figure
  (`src/domain/harmony/harmony-planner.ts:93-140`): optional under Settled and Lift (passing,
  neighbor or appoggiatura), required under Build (a two-note diatonic approach) and Edge
  (passing, neighbor or appoggiatura). Each candidate placement runs a whole pitch search of its
  own (`src/domain/generation/orchestration/window-search.ts:154-206`).
- **The search allowance** is 250,000 units for a standalone or Idle phrase and 160,000 for an
  attempt that joins the previous phrase
  (`src/domain/generation/orchestration/search-ledger.ts:13, 43`). ISS-009, failed joining
  attempts that took seconds, is resolved (2026-10-07); its price is that at 240 BPM phrase 2 is
  always generated without the join
  ([issue](../../../issues/Ref_20261006_failed_carry_in_attempts_slow.md)), which v3.0's
  pre-generation repairs ([v3.0 master spec §8](master-spec.md#8-pre-generating-phrases-at-idle)).

## 2. Which figures v3.1 exposes

### 2.1 Family 1 only (D233)

v3.1 exposes **figures written as ordinary notes** (family 1) and no ornament written as a symbol
(family 2: grace notes, mordents, trills, turns, jazz articulations). Family 2 becomes a release
of its own, after v3.2.

Why, from cost. A family-1 figure changes one place, the pitch search, and is notated, played back,
exported and acknowledged exactly like any other note. A family-2 ornament, even with D216's
settled representation, touches six: a new field in the note event
(`src/domain/events/measure-event-parser.ts:96` allows none today), notation (VexFlow 5 can draw
them), playback expansion in the backing and the preview, both exports (MusicXML has native
elements; MIDI needs the expansion), and a main-note-only acknowledgement rule with its own risks
(a trill's upper note acknowledging the next expected note early). It costs almost nothing in the
search, but it is a feature of its own size, and it is not what makes figures audible: weights are.
When it comes, the grace note is the cheapest first ornament
([catalogue, entry 23](../../../docs/music/embellishment-catalogue.md#23-grace-note-acciaccatura)).

This narrows the v3 README's "two families" (both under v3.1) to one; it does not contradict D216,
which settled how ornaments are represented, not when they ship.

### 2.2 The seven v3.1 figures (D233)

| # | Figure | What it is, plainly | Today | Change in v3.1 | Rhythm it needs |
| --- | --- | --- | --- | --- | --- |
| 1 | [Passing tone](../../../docs/music/lexicon.md#passing-tone) | a scale note outside the chord that fills a gap between two notes, moving by step in one direction | Neutral + Jazz, free | a level | three notes in a row |
| 2 | [Accented passing tone](../../../docs/music/lexicon.md#accented-passing-tone) | the same, but on beat 1 or 3, so the clash lands where the ear expects calm | Neutral + Jazz, never aimed for | its own level: it sounds much tenser than #1 | an outside note on beat 1 or 3 |
| 3 | [Neighbor tone](../../../docs/music/lexicon.md#neighbor-tone) | a step away from a chord tone and straight back, upper or lower | Neutral + Jazz, free | a level (one for both directions) | three notes |
| 4 | [Appoggiatura](../../../docs/music/lexicon.md#appoggiatura) | an outside note reached by a leap, on a strong beat, that resolves by step | Tension's figure only; never heard | **new as a free figure** (entered by a leap of 3 semitones or more, on beat 1 or 3, resolved by one scale step onto a chord tone) | a strong beat and a note before it |
| 5 | [Diatonic enclosure](../../../docs/music/lexicon.md#enclosure) (also the [double neighbor](../../../docs/music/lexicon.md#double-neighbor)) | the scale notes above and below a target, then the target: the owner's "surrounding a note" | no | **new path shape**: two outside notes in a row, allowed inside this figure only | three back-to-back notes under one chord |
| 6 | [Chromatic approach](../../../docs/music/lexicon.md#chromatic-approach) | one note from outside the key, a half step above or below, just before a chord tone | Jazz | a level, available in any preset (D233) | two back-to-back notes |
| 7 | Chromatic enclosure ([enclosure](../../../docs/music/lexicon.md#enclosure)) | a half step above and below a target, at least one outside the key, then the target | Jazz | a level, available in any preset (D233) | three back-to-back notes |

Choices behind the list (D233):

- **One level per figure, not per direction.** The catalogue suggests splitting upper and lower
  neighbors, and chromatic approaches from above and below; seven levels is already a lot for a
  beginner, and the split is cheap to add later.
- **The chromatic approach covers its neighbors.** What theory calls a chromatic passing tone
  (F–F♯–G) or a chromatic neighbor (G–F♯–G) is, in this generator, a chromatic approach seen from
  the note before it
  ([catalogue, entries 3 and 5](../../../docs/music/embellishment-catalogue.md#3-chromatic-passing-tone)).
  The lexicon entry should say so.
- **Not in v3.1:** the diatonic approach as a free figure (it stays Tension's Build figure),
  mixed and longer enclosures, the double chromatic approach (each enlarges every search), and the
  figures that look across a chord change or chain outside notes (escape tone, anticipation,
  suspension, retardation, scale run, bebop-scale passing tone, held blue note, octave
  displacement): they touch the rhythm planner, the tie rules or the free-tone rule, not only the
  ranking. The arpeggiated figure is the chord-tone baseline itself, so it has no level.

## 3. The control: one level per figure

### 3.1 Four levels (D233)

D210 asks for "allowed or not, plus a weight". v3.1 folds both into **one level per figure**,
four steps (names are `ux-writer`'s; the meanings are fixed here):

| Level | Allowed | What the search does |
| --- | --- | --- |
| **Off** | no | never writes the figure as a free figure (see §4 for Tension's figure) |
| **As today** | yes | tries it after the chord tones, exactly as today: it appears only when the chord-tone path fails |
| **Favored** | yes | at about **1 in 4** of the notes where the figure could start, tries it **before** the chord tones |
| **Strongly favored** | yes | the same at about **1 in 2** of those notes |

- **A weight orders the search; it never sets a quota** (D210, D216). No phrase is rejected or
  retried for lacking a figure. A favored figure that leads to a dead end is backed out of, as any
  candidate is, and the chord tones are tried next.
- **"About 1 in 4" and "about 1 in 2" are starting values**, tuned by listening and by the
  measurement in §6 before the gate: a named measurement, not an open question. What is fixed is
  the order: each step up never makes the figure rarer.
- **Which notes are drawn** is decided from the phrase seed and the note's position, with
  integer arithmetic only, so every browser draws the same (the key and mode research found
  floating-point functions can differ between browsers). At a note where several figures are
  drawn, the higher level goes first, then the seed's tie order.
- **"As today" consumes no draw.** A phrase whose figure levels are all As today or Off must be
  searched in exactly today's order, so that today's phrases, and every existing replay key,
  reproduce note for note (§5).
- **The rhythm decides where a figure can go.** A level cannot add a note: an enclosure needs
  three back-to-back notes under one chord, so at Quarter density it stays rare whatever its
  level. The level's description should say so (a `ux-writer` matter).

### 3.2 Where the levels sit

The seven figure levels are generation settings, saved like the 14 controls
([v3.0 master spec §4.2](master-spec.md#42-what-is-saved-automatically)), held by every preset
([presets.md](presets.md) §2), and carried in every phrase's generation request (§5). Their
first-load values are Neutral's (§3.3). They are settings of the Idle screen: like every
generation control, they are locked while a session runs
([v2 master spec §5](../v2/master-spec.md#5-control-changes-during-a-session)).

### 3.3 Neutral and Jazz sound as today

| Figure | Neutral | Jazz |
| --- | --- | --- |
| Passing tone | As today | As today |
| Accented passing tone | As today | As today |
| Neighbor tone | As today | As today |
| Appoggiatura (free) | Off | Off |
| Diatonic enclosure | Off | Off |
| Chromatic approach | Off | As today |
| Chromatic enclosure | Off | As today |

The rule behind it: **every figure a profile writes today is As today; every figure new in v3.1
is Off.** The free appoggiatura and the diatonic enclosure must be Off, not As today: adding a
candidate changes what the search finds whenever it backs up past the chord tones, so "As today"
for a new figure would already change today's phrases. With this table, Neutral and Jazz at their
v3.1 defaults generate exactly what v2 and v3.0 generate from the same request.

Consequence: Neutral and Jazz still sound nearly free of decorations, as today. Hearing the
figures takes a raised level, a preset that raises them (Bebop, Speed drill in
[presets.md](presets.md) §3), or Vary settings (§7.1).

## 4. Figure levels and the Tension control (D233)

Tension's one scheduled figure is a separate mechanism with its own meaning, chosen by its own
control. Settled (D233): **figure levels govern free figures only; Tension keeps its scheduled
figure whatever the levels.** Turning the passing tone Off means "no extra passing tones"; Edge still
places its one required passing or neighbor tone or appoggiatura, and Build its two-note approach.

- Why: otherwise Off on the passing and neighbor tones and the appoggiatura makes Edge
  impossible, and the player gets no phrase, or a Tension that silently does nothing. The project
  policy that "explicit controls outrank tension"
  ([pitch-planner-validation.md](../../../docs/music/pitch-planner-validation.md#authority-and-ownership))
  does not decide it, since both are explicit controls.
- The levels do not reorder Tension's choices either: the scheduled appoggiatura stays
  as rare as today; raising the appoggiatura's level adds free appoggiaturas.
- Rejected: levels filter Tension's figure too, and a Tension level
  whose figures are all Off is refused with a reason at Idle.

## 5. Determinism, the replay key and kept sessions (D233)

Every figure level enters the **generation intent**, so a phrase reproduces from its inputs, the
pre-generated phrases equal the session's (v3.0 §8), and a kept session's inputs say how each
phrase was made.

- **Today's key, `ifk1.`**, stores the request number, seed, the 14 controls, the profile **name**
  and its Custom flag, the phrase number and the join, as JSON behind the prefix
  (`src/generation-worker/phrase-replay-key.ts:15, 112-128`). The decoder refuses any other
  prefix (`src/generation-worker/phrase-replay-key-decode.ts:124-137`).
- **`ifk2.`** is v3.0's, to carry "my instrument" inline
  ([v3.0 master spec §7.4](master-spec.md#74-phrase-replay-key)). It is specified but not built
  yet.
- **A new key version, `ifk3.`** (D233), which carries the seven figure levels explicitly, by
  figure, and everything `ifk2.` carries except the profile name and its Custom flag, which the
  levels replace ([presets.md](presets.md) §6.3). v3.1 writes `ifk3.` for every phrase.
  - Why a new version rather than an extension of `ifk2.`: a v3.0 decoder that met an extended
    `ifk2.` key would either refuse it or ignore the levels and replay a different phrase without
    saying so. A new prefix makes an older app refuse the key instead of misreplaying it.
  - The levels are stored by figure, not by preset name: a player preset can be renamed, changed
    or deleted, and a built-in preset may be retuned by a later version.
- **Older keys keep decoding.** An `ifk1.` or `ifk2.` key's profile name maps to that profile's
  §3.3 levels (Neutral or Jazz), whatever its Custom flag, since Custom never changed the figures
  before v3.1. Every `ifk1.` and `ifk2.` key decodes to the same phrase as in the version that
  wrote it.
- **A key from a later version** naming a figure v3.1 does not know is refused, with the reason,
  rather than replayed without it.
- **Kept sessions.** Each kept phrase's reproduction inputs gain the figure levels. A session
  saved by v3.0 is migrated when the database opens (v3.0 §4.3): its phrases' profile names map to
  the §3.3 levels. Its generated timeline is kept as it is either way.
- **The replay tool** (`npm run replay:phrase`) decodes all three versions.

## 6. The cost guard (D233)

The pitch search is the generator's most expensive step, and its failures are the slow case
(ISS-009). Each part of this design costs differently
([catalogue](../../../docs/music/embellishment-catalogue.md#pitch-search-cost)):

- **Levels as ordering** add nothing to a search that must fail: they do not change which phrases
  are legal. They can slow a search that succeeds, when a favored outside note opens an obligation
  that dead-ends and the search backs out.
- **New shapes** (the free appoggiatura, the diatonic enclosure) enlarge every search where they
  are allowed, so a setting with no legal phrase takes longer to give up. Being Off by default, they
  cost nothing unless the player turns them on.
- **Off can create failures.** Free passing and neighbor tones are how the search escapes the dead
  ends that leaps create: the sample found them most often at high Leapiness. With them Off, some
  settings that succeed today may find no phrase, or find it slower.

The guard, part of the definition of done (§9):

- The **search allowance is not raised** (250,000 and 160,000 units stay).
- Before the gate, the ISS-009 sweep settings and a 240 BPM session run are measured at three
  figure settings: the Neutral and Jazz defaults (the baseline), every figure Strongly favored,
  and every diatonic figure Off. For each: the share of phrases generated, the slowest and the
  95th-percentile generation time, and at 240 BPM the share of phrases that fall back to being
  generated without the join.
- **Acceptance:** against the baseline, no more than 2 percentage points more
  fallbacks at 240 BPM and no more than 2 percentage points fewer phrases generated at any swept
  setting. A level whose cost exceeds this is tuned down (a lower share) before the gate.
- **If "every diatonic figure Off" fails that test,** v3.1 keeps one escape route instead of
  refusing the player's choice: the neighbor tone cannot be set below As today while the passing
  tone is Off (a fallback the measurement decides). If it is adopted, "passing tone Off and
  neighbor tone Off" is an unsupported figure combination, handled like an unsupported rhythm
  combination: the level control refuses the second of the two, saying why; a Vary settings step
  that would land on it is drawn again; and a saved setting or preset holding it loads with the
  neighbor tone at As today (spec-writer's call at consolidation).
- Pre-generation (v3.0 §8) helps only phrases 2–5 of a session; the look-ahead deadlines after
  them are v2's, so the 240 BPM measurement is what matters.

## 7. How it meets the other settings

### 7.1 Vary settings (D233)

Today Vary settings may flip the profile's name between Neutral and Jazz, keeping every control
and marking the selection Custom (`src/session/settings-mutation-scales.ts:255-262`). That flip
switches the chromatic figures on or off, the only thing a profile name changes in generation.

v3.1 (D233): **the profile flip becomes the figure step, "one figure moves one level"**, up or
down, never past Off or Strongly favored, the figure drawn among the seven from the session's
seeded source, as every other step is. The seven levels together take the one place in the draw
the profile had: the draw picks the setting, then (for this setting) the figure, then the
direction, so every other setting is drawn as often as before (spec-writer's call at
consolidation). It replaces the name flip, which has no meaning once figures are settings.
It marks the selection Custom for the session, and every level returns to the player's own when
the session ends, as every mutated setting does today
([v2 master spec §5](../v2/master-spec.md#5-control-changes-during-a-session)). A figure step never
lands on an unsupported rhythm combination, since levels do not affect rhythm.

This changes a v2 rule and two declared-intent atoms
(`rule_mutation_profile_flip_keeps_controls`, `rule_mutation_marks_profile_customized`): see §10.
In v3.2, the player-chosen allowed groups hold this step in a group named **Figures** (D216, D237).

### 7.2 Tension across phrases

It changes only the Tension value of each phrase's request
(`src/session/tension-arc-cycle.ts:81-95`). Figure levels are not modulated by it: a tenser
phrase gets Tension's tenser figure, not more free figures. Its step never reaches the settings,
so, although Tension is now held by every preset ([presets.md](presets.md) §2.1), it never marks
Custom (spec-writer's call at consolidation). Nothing to change.

### 7.3 Acknowledgement

**A decorating note is an expected note like any other.** It lights when the player plays its
exact pitch inside its window, as every family-1 note does today
(`src/domain/acknowledgement/note-matching.ts`); nothing in acknowledgement changes. A chromatic
note is harder to read than a scale note, which is the point for P1 and P2. The permanent rule
holds: no grading, scoring or wrong-note signal, so a missed decoration is never marked.

### 7.4 The rest

- **Pre-generation:** a change of any figure level is a change of a setting phrases are generated
  from, so it discards the pre-generated phrases (v3.0 §8).
- **Exports:** unchanged. Family-1 figures are ordinary notes in MusicXML and MIDI.
- **Phone width:** unchanged. Below the tablet-landscape width Sixteenth generates as Eighth, which
  leaves enclosures fewer places to go; levels are kept as chosen.
- **Jam:** figures found in the player's doodle could be favored for the phrases that continue it
  ([v3 README](README.md#embellishment-flags)). First placed in v3.2, it is deferred beyond v3.2
  (D238).

## 8. Personas served

| Piece | Goal served ([personas](../../personas.md)) | How |
| --- | --- | --- |
| Levels that make figures audible | **P1.G1**, vocabulary by exposure | The player hears and plays passing tones, appoggiaturas and enclosures on purpose, instead of in 1 phrase out of 100. |
| Chromatic figures in any preset | **P1.G2**, real-time reading; **P2.S1**, fresh material | Accidentals to read at speed; more kinds of shape, so the material is harder to memorize (D59). |
| Off and As today | **P1.G1** | A beginner can keep lines plain while learning, then add one figure at a time. |
| Vary settings' figure step | **P2.S1** | A long session drifts in vocabulary as well as in rhythm and key. |
| Family 2, later | P1.G1, P3.C3 | Not served in v3.1. |

No goal of P3's is served directly by v3.1's flags; P3.C3 waits for Jam (v3.2).

## 9. Definition of done

1. **Seven figure levels**, each Off, As today, Favored or Strongly favored, set at Idle, saved and
   restored like the controls, held by every preset.
2. **Today reproduces.** With Neutral's or Jazz's §3.3 levels, the generator produces, for the same
   request, exactly the phrase v3.0 produces; every `ifk1.` and `ifk2.` key decodes to the same
   phrase as before.
3. **Levels are audible and ordered.** On a fixed seed sweep, the share of phrases containing a
   figure rises from As today to Favored to Strongly favored wherever its rhythm needs are met, and
   is zero at Off apart from Tension's scheduled figure.
4. **No quota.** No phrase is rejected or retried for lacking a favored figure.
5. **New figures exist.** The free appoggiatura and the diatonic enclosure appear when favored,
   and never break the existing figure rules (one resolution, chord-tone target, no figure across a
   chord change).
6. **Tension.** Each Tension level keeps its scheduled figure whatever the levels.
7. **Deterministic.** The same `ifk3.` key gives the same phrase in Chrome and Edge, on any
   machine; pre-generated phrases equal the session's with any levels.
8. **The cost guard** of §6 is measured, recorded, and met.
9. **Vary settings** moves one figure one level, marks Custom for the session, and restores every
   level at the session's end.
10. **Acknowledgement and exports unchanged** for every figure.

## 10. What v3.1's flags change in earlier rules

For `documentalist`, when v3.1 is consolidated:

- **"Neutral is entirely diatonic"** (project policy,
  [pitch-planner-validation.md](../../../docs/music/pitch-planner-validation.md#authority-and-ownership))
  becomes a property of Neutral's defaults, not a rule: a player may turn chromatic figures on
  from Neutral (D233).
- **The profile's grammar** (`module_musical_profile_capabilities`, the "grammar retained" status
  line of the Custom state, `rule_profile_control_customization`): the hidden grammar a Custom
  setup keeps is replaced by visible figure levels; there is nothing left to retain.
- **Vary settings' profile flip** (v2 master spec §5; `rule_mutation_profile_flip_keeps_controls`,
  `rule_mutation_marks_profile_customized`) becomes the figure step of §7.1.
- **The lexicon:** the appoggiatura's "Both presets use it" is true of the rules, not of the output
  (the catalogue asks for the correction), and the musical profile preset, grammar and Vary
  settings entries change with this document.

## 11. Open

None: closed by D233. The starting shares of §3.1 and the cost guard of §6 are measurements
made before the gate, not open questions.
