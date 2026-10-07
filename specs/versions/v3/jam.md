# v3.2 — Jam

Status: draft v1 (2026-10-07). spec-writer's proposals for the owner's review. Settled items cite
their decision; everything else is `(proposed)`.

Serves P3, the Fledgling Composer: C3 "grow an idea", "I liked that gimmick", played and continued
by the app ([personas](../../personas.md#p3--the-fledgling-composer-secondary-d61)). It also carries
the owner's own words, D209: "I've a doodle in mind, but I'm not good enough to iterate on it. I
give it to the app, and it generates matching phrases." Companions:
[key and mode suggestion](key-and-mode-suggestion.md), [rhythm lock](rhythm-lock.md). Code facts:
[jam-grounding.md](jam-grounding.md), re-checked on 2026-10-07 (§8.6 lists what moved).

Plain words used here:

- **Doodle**: the short idea the player plays for the app to grow. Musicians call it a
  [motif](../../../docs/music/lexicon.md#motif).
- **Pulse**: the app's click, one per beat, at the selected tempo.
- **Quantising**: snapping played notes, which never land exactly on the beat, to the nearest
  sixteenth-note position (the app's [tick](../../../docs/music/lexicon.md#tick)).
- **Generation measure**: the measure in which the app writes the first phrase after the doodle.
- **Read-in measure** (proposed): one measure where that phrase is on screen before it sounds, as
  phrase 1 is during v2's count-in.

## 1. Settled

- **What Jam is** (D209): the player plays a doodle, and the generator continues it. The doodle
  feeds the generator its [rhythm](../../../docs/music/lexicon.md#rhythm),
  [contour](../../../docs/music/lexicon.md#contour) and
  [interval](../../../docs/music/lexicon.md#interval) character. The player-selected key and mode
  stay authoritative; the app never switches them on its own.
- **When the doodle ends** (D215): it is one to four measures long, and ends when the player leaves
  a whole measure silent or when four measures have been played. At least one measure passes before
  the first generated phrase sounds.
- **Tempo** (D216, O125): the doodle is played over the app's pulse at the selected tempo, and the
  phrases after it keep that tempo.
- **The generation measure** (D216, O112): the silent measure that ends a doodle doubles as the
  generation measure. Generation starts when a measure begins with no note sounding, and is dropped
  if the player plays again inside it. When a phrase is not ready, the wait extends measure by
  measure with the pulse going on, and v2's standalone fallback applies. The doodle is continued,
  not repeated.
- **Ranking, not constraints** (D216): the doodle steers the generator's ranking rather than
  imposing hard constraints.
- **Stray notes** (D196, D216): very short notes are filtered out of the doodle
  ([v3.0 master spec §9](master-spec.md#9-stray-notes)).

## 2. Entering a Jam (proposed, O140)

- **Jam is a session mode, switched on at Idle.** A switch named "Jam" (working name), off by
  default, saved like the three "During a session" options
  ([v3.0 master spec §4.2](master-spec.md#42-what-is-saved-automatically)). While it is on, a
  session begins with a doodle instead of the phrase on screen. A mode, not a second Start button,
  because a mode lets a played note start a Jam without the two starts competing for one note.
- **Jam needs a controller attached** (v2 §8's meaning). Without one the switch is unavailable,
  saying why, as Rising tempo is ([v2 master spec §10](../v2/master-spec.md#10-adaptive-tempo)).
- **At Idle in Jam mode, no generated phrase is shown**: nothing is read before the doodle. The
  staff shows the key signature of the selected key and mode. The Idle phrase rules of v2 §4 and §6
  (replacing a phrase that does not fit, the dense-notes notice) and pre-generation
  ([v3.0 §8](master-spec.md#8-pre-generating-phrases-at-idle)) do not run. v2's prewarm still runs:
  the doodle's phrases use the same rhythm domain as the settings. Turning Jam off generates a phrase
  as at first load. Layout is `ux-writer`'s.
- **A Jam starts on a Start click, or on its starting note: the selected key's home note**
  ([tonic](../../../docs/music/lexicon.md#tonic)), in written pitch, in the octave nearest the
  middle of the instrument's written range, named in the cue row as v2 names the starting note. As
  in v2, it only starts the count-in and belongs to no doodle. The conditions under which a session
  can start (v2 §6) apply, apart from "a phrase is on screen" and "no new phrase is being generated".
- **A doodle never starts anything by accident.** Notes played at Idle stay ignored, as in v2: the
  doodle is captured only after the count-in. Playing the home note at Idle starts a Jam, which is
  v2's accepted risk with the starting note, and the cue row names it.
- **A held doodle** (proposed, O148): after a Jam, the review can offer "Jam again on this
  doodle". Idle then holds that doodle: phrase 1 is generated from it at Idle, with no deadline, and
  is on screen; the starting note is phrase 1's first note, as in v2; pre-generation runs; Start
  skips the capture. A control at Idle drops the held doodle. See
  [the key and mode suggestion](key-and-mode-suggestion.md#3-where-and-when-it-is-shown-proposed-o148).

## 3. Capturing the doodle

### 3.1 The pulse (proposed, O155)

- One measure of count-in, as in v2, shown and heard. The pulse then goes on through the capture,
  the generation measure and the read-in measure, **whatever the click switch says**, at the click
  volume: like v2's count-in, it is what sets the measure grid. From phrase 1 on, the click switch
  governs as in v2.
- **No backing during the capture**: the backing follows a phrase's generated harmony (v2 §6), and
  there is none yet. It starts with phrase 1. A tonic drone under the doodle is a later candidate.
- The live view never shows the doodle's notes, as v2 never renders a played note there
  ([v2 master spec §8](../v2/master-spec.md#8-midi-input-and-note-acknowledgement)). The cue row
  counts the doodle's measures (one to four); its look is `ux-writer`'s.

### 3.2 Where the doodle starts and ends

- **Notes are filtered, then snapped, then counted.** The stray-note filter applies first. A note
  belongs to the doodle by its snapped onset, so a note played a little early onto the first beat
  after the count-in is a doodle note.
- **The doodle's first measure** is the measure holding its first note. It may begin with rests:
  a doodle that starts on beat 2 simply starts there.
- **End by silence** (D215, D216): at each barline where no note is sounding, a generation attempt
  starts from the doodle as it stands. If the player plays a note (one that passes the stray filter)
  inside that measure, the attempt is cancelled, as v2 cancels a dropped attempt, and that measure
  becomes part of the doodle. If the measure stays silent, the doodle ended at its start, and it is
  the generation measure.
- **End by length** (D215): when the doodle's fourth measure ends, the doodle ends whatever is
  sounding. A note still held is cut at that barline. The next measure is the generation measure.
  Notes played in it belong to no doodle and no phrase, like notes played during v2's count-in
  (proposed).
- **A held note keeps a measure from being silent**: a measure that begins with a note still
  sounding is not a silent measure, even if the note ends at once.

### 3.3 Quantising (proposed, O142)

- **The grid is the tick, a sixteenth note, at every tempo.** At 240 BPM a sixteenth lasts 62.5 ms,
  so an onset moves at most about 31 ms. The doodle only steers ranking, so a near-miss costs
  little.
- **Onsets and releases snap to the nearest tick**; a note keeps at least one tick.
- **One line only** (the tracker records chords and overlaps): when notes overlap, the later start
  ends the earlier note; when two notes snap onto the same tick, the longer one stays (a grace
  note before a held note is dropped), and on equal length the higher one.
- **What is kept**: the quantised doodle (ticks and concert pitches, plus the tempo it was captured
  at). It is computed once, when the doodle ends, and is what every later step reads. Raw notes stay
  played notes.

### 3.4 Edge cases (proposed, O143)

- **No note after the count-in.** If no doodle note comes within 30 s after the count-in, the Jam
  ends as a session ended during its count-in: back to Idle, no review (v2 §7). This differs from a
  session, whose silence timer starts only after a first note, because a capture has nothing rolling
  to read.
- **Controller lost during the capture or the generation measure**: the Jam ends at once, as above.
  From phrase 1 on, v2's 30-second reconnection rule applies.
- **Stop, a hidden tab, or a staff that can no longer be shown** before phrase 1 sounds: as a
  session ended during its count-in.
- **A doodle of one note** is a doodle. It shapes little, and gives no key and mode suggestion
  ([minimum material](key-and-mode-suggestion.md#2-the-method-settled-and-its-proposed-details)).
- **Notes outside the instrument's range or the register window** stay in the doodle; §5.2 says
  what they do to the join.

## 4. From the doodle to phrase 1 (proposed, O141)

### 4.1 The two measures before phrase 1

- **Generation measure**: the app writes phrase 1 from the doodle. The cue row says so.
- **Read-in measure**: phrase 1 is on screen and its beats are counted, as during v2's count-in.
  Then phrase 1 sounds, with the backing.
- So two measures separate the doodle and phrase 1 (2 s at 240 BPM, 4 s at 120 BPM, 8 s at
  60 BPM). D215 asks for "at least one". The second measure exists because v2 promises at least one measure of
  read-ahead on screen at all times
  ([v2 master spec §4](../v2/master-spec.md#4-look-ahead-and-failure-handling)): with one measure,
  phrase 1 would appear on the barline it starts on, with nothing to read ahead. **Owner decision.**
- Phrase 1 starts with a fresh attack on beat 1, as every phrase does. The gap means Jam needs no
  pickup or tie across the join, which v2 §3 had left for v3 "which already has to solve it for
  player-seeded continuations": it stays unsolved, and nothing in v3.2 needs it.

### 4.2 When phrase 1 is late

- **The wait extends by whole measures** (D216): phrase 1 is shown at the first barline at or after
  it is ready, followed by its read-in measure. The pulse goes on; the cue row keeps saying the app
  is writing.
- **Deadline**: three measures after the generation measure begins, the same span a look-ahead
  phrase gets in v2 (3 s at 240 BPM, 12 s at 60 BPM).
- **The ladder** (v2 §4, adapted): attempts with the doodle's join (§5.2) and its preferences;
  then the doodle's preferences without the join; then v2's standalone phrase, with no doodle at
  all. v2's standalone reserve (1.075 s) is kept before the deadline for that last rung, which is
  the attempt the reserve was measured on. A phrase repeat is impossible (there is no phrase
  before), so the ladder's step 3 does not apply.
- **If every attempt fails** by the deadline, the Jam ends: back to Idle, no review, and the player
  is told the generator could not continue with these settings (proposed; it should be rare, since
  the settings were checked at Start).

### 4.3 The time budget

- At 240 BPM one measure is 1 s (D215). The standalone reserve, 1.075 s, is longer: with a strict
  one-measure deadline the ladder would skip every doodle attempt at 240 BPM, as v2 does for
  phrase 2 (D205). The three-measure deadline above leaves the doodle attempts about 1.9 s at
  240 BPM.
- **Measured today** ([generation latency](../../../docs/generation-latency.md)): a standalone
  attempt in Chromium has a median of 245 ms and a maximum of 618.6 ms on the 43 slowest settings;
  a warm generation of the worst setting 77.3 ms, cold 277.2 ms (v2.0 gate, prewarm on). Carry-in
  successes took at most 280 ms in ISS-009's sweep; failed carry-in searches took seconds before
  that issue's fixes, which is what the reserve guards against.
- **So phrase 1 is normally ready inside the generation measure** at every tempo. The rhythm domain
  is already warm (the settings are known before Start). Ranking up to 1,797 rhythm candidates by
  distance adds work that must be measured.
- **Pre-generation cannot help a fresh doodle**: phrase 1 depends on notes played after Start. It
  helps a held doodle (§2).
- **Phrase 2** is requested as soon as phrase 1 is ready; its deadline is the start of phrase 1's
  last measure, so it has the read-in measure plus three measures, more than v2's phrase 2 gets.
- **To measure before the gate**: a sweep like `npm run test:sweep` over doodles × settings, for
  every rung, at 60, 120 and 240 BPM (the lesson of ISS-009).

## 5. What the doodle feeds the generator (proposed, O145)

### 5.1 Principles

- **The doodle changes no setting.** The controls stay as the player set them; the doodle only
  orders the candidates those controls allow. Every phrase that is possible today stays possible,
  so the failure ladder's evidence still holds (D216; Jam grounding §A.7).
- **The doodle is not quoted.** v3.2's phrases match the doodle's shape: a rhythm close to it, the
  same ups and downs, starting where it ended. Playing the doodle's own notes back inside a phrase,
  or developing them by named operations (moving it higher, turning it upside down), is later work:
  it needs new pitch-planner capability and would reopen planner authority (§6). **Owner
  decision.**
- **The doodle is key-independent**: its rhythm, directions and interval sizes in steps survive a
  key or mode change by Vary settings (O121).

### 5.2 The join into phrase 1

- Phrase 1 continues from the doodle's last note, the way v2 joins two phrases
  ([v2 master spec §3](../v2/master-spec.md#3-the-generation-unit-and-how-phrases-join)): its first
  interval follows the same caps as two notes inside a phrase. Carried: the last pitch, no chord
  (the "no harmony" form a key change already uses) and **no owed leap recovery**, since two
  measures of silence come between.
- **Register**: with Varying, the session resolves the register window holding the doodle's last
  note, the nearest by centre when several do. With Low, Middle or High, the window is the player's.
- **No join** when the last note lies outside that window or the instrument's range: phrase 1 is
  generated without it, as v2's standalone phrase is. The other preferences still apply.
- The doodle has no phrase number; generated phrases are numbered from 1.

### 5.3 Rhythm

- Rhythm candidates are ordered by their distance to the doodle's rhythm, ahead of the seeded
  order. The doodle's measures are laid over the phrase in order and repeated to fill four measures
  (a one-measure doodle four times; two measures twice, matching the phrase's
  [gesture and answer](../../../docs/music/lexicon.md#gesture-and-answer); three as 1, 2, 3, 1).
- The distance and the [drift](rhythm-lock.md#5-the-jam-drift-control-proposed-o146) position decide the
  order: candidates within the drift's distance first, in seeded order so phrases still vary;
  then the rest, closest first. A doodle far from everything the settings allow (sixteenth notes
  under the Quarter density, say) is only approached.
- With the [rhythm lock](rhythm-lock.md) on, the lock decides the rhythm and drift does not.

### 5.4 Melody

- Pitch candidates are ordered to follow the doodle's moves: for each note of the phrase, the
  next move of the doodle (up, down or same; a [step](../../../docs/music/lexicon.md#step),
  [skip](../../../docs/music/lexicon.md#skip) or [leap](../../../docs/music/lexicon.md#leap)),
  cycled in order. Drift decides how much: direction and size, direction only, or nothing.
- The preference sits beside the existing ranking (chord tone first), after the rules the controls
  set (Contour, Leapiness, the register window), which it never overrides.

### 5.5 Phrases 2 onward

Every phrase of a Jam carries the doodle as a generation input, so the whole session keeps its
shape, at the drift chosen. Phrase N+1 joins phrase N as in v2; only phrase 1 joins the doodle.

## 6. Planner authority (O10, proposed)

**Proposal: answer O10 for v3.2 with "no stage revises another", as D83 did for v2.** The
generator's real order (re-checked): the harmony domain is built from the key, collection,
harmonic motion, tension and profile, and takes no rhythm, pitch or seed; the rhythm domain is
looked up; both are ranked by seed; register windows are resolved; then the search walks harmony
by harmony, rhythm by rhythm, each pair's tension bindings, and the pitch search, until one plan
validates. "Backtracking" there only means trying the next candidate; no later stage edits an
earlier one's output.

Jam fits that order without coupling stages:

| Stage | What the doodle does |
| --- | --- |
| Harmony | Nothing. Choosing chords from the doodle's notes is the coupling O10 asks about. |
| Rhythm | Orders its own candidates (distance), inside the stage. |
| Register resolution | With Varying, picks the window holding the doodle's last note: an input, decided before the search. |
| Pitch | Orders its own candidates (moves), after the hard rules; joins from the last note through the existing carry-in. |
| Orchestration | Unchanged, apart from the rhythm lock's order ([rhythm lock §4](rhythm-lock.md#4-how-the-search-holds-it)). |

What would reopen O10: quoting the doodle inside a phrase (its notes pinned, so harmony and the
contour and leap rules must accept notes no planner chose), or picking chords to fit it. Both are
outside v3.2 (§5.1). Proposed register wording: "O10 is answered for v3.2; it reopens with the
first feature that quotes player material", for example v4's rhythm editor or a later Jam.

**One intent conflict to clear first:** the atom `module_ranked_candidate_ordering` says
ranking happens "without scoring or preferring any candidate over another". The doodle's distance
order and the rhythm lock both prefer candidates; the atom needs amending through `documentalist`.

## 7. During and after the Jam

### 7.1 During

- From phrase 1, a Jam runs as a v2 session: rolling phrases, acknowledgement, look-ahead, the
  failure ladder, Vary settings, Tension across phrases, Rising tempo, the silence and controller
  rules, Stop. Vary settings and Tension across phrases count from phrase 1.
- **No re-doodle during a Jam** (proposed). A running session never asks the player for anything
  and offers nothing to click; telling "a new doodle" from "losing my place" would need a
  [played signal](../../../docs/music/lexicon.md#played-signal), which is v3.x (D213, D214). To
  doodle again, the player stops and starts a new Jam.
- **A Jam ends** as any session ends (v2 §7).

### 7.2 The review (proposed, O147)

- **The doodle opens the review**, before phrase 1, as its own labelled section, engraved from the
  quantised doodle in written pitch: what the app heard. It has no phrase number and cannot be a
  favorite; its notes are not expected notes, so nothing in it is ever acknowledged.
- **The `Played notes` lane** covers the doodle's raw notes too, when shown.
- **The key and mode suggestion**, when there is one, shows in the review
  ([suggestion §3](key-and-mode-suggestion.md#3-where-and-when-it-is-shown-proposed-o148)), with "Jam again on
  this doodle" (§2).
- **The session list** marks a Jam session as such.
- **Exports**: the played-notes export holds the doodle's raw notes, placed before phrase 1 with a
  "Doodle" marker (v2 drops every note before phrase 1). The generated-notes export opens with the
  quantised doodle as its own marked section, in both formats and both scopes. Both follow the
  doodle's status, an owner decision (§8.1).

## 8. Conflicts with settled decisions

Surfaced, not resolved; each proposal is spec-writer's.

### 8.1 Privacy (a): the doodle is played notes (O144)

- **Settled:** played notes leave the device only through the played-notes export (v2 §7, v3.0
  §10), and are stored only after "Keep my played notes" (v3.0 §5.3, D216), "because the player's
  own notes are the most private data the app holds, and keeping the music should not imply keeping
  them" (v3.0 §12). The replay key's atom says a key "never holds played notes" and is "never sent
  over a network or stored".
- **What Jam needs:** the doodle is a generation input. Reproducing a Jam phrase (the replay key, a
  kept session's reproduction inputs) needs it; the review and P3's "take it out" want it.
- **Proposal (owner decision):** the **quantised doodle** is a generation input the player gave on
  purpose, and travels with the music: in each Jam phrase's reproduction inputs, the replay key, a
  kept session (without the opt-in), the review's doodle section and the generated-notes export.
  The **raw doodle notes** stay played notes, under every played-notes rule. Deleting a session
  deletes its doodle.
- **The alternative:** the quantised doodle is played notes too. Without the opt-in a kept Jam
  session then loses its doodle after a reload (its timeline still reviews, but its phrases are not
  reproducible from its inputs, and "Jam again" is unavailable), and the replay key cannot
  reproduce a Jam phrase.
- **Either way** the replay key atom, `rule_optional_midi_privacy` and the v2 rule that the
  generated-notes export never carries played notes are amended through `documentalist`, with the
  owner's explicit confirmation where a STABLE guarantee narrows (as D216 required for v3.0).

### 8.2 "A running session never asks the player for anything" (b)

The suggestion is confirmed by the player (D212, D216), and the doodle is known only after the
session started. It cannot be offered during the Jam. Proposal: after the Jam, in the review, and
for a held doodle at Idle ([suggestion §3](key-and-mode-suggestion.md#3-where-and-when-it-is-shown-proposed-o148)).
**Consequence the owner should weigh:** the Jam that produced the doodle is always continued in the
player's selected key; the suggestion serves the next Jam on that doodle.

### 8.3 The generation-time budget (c)

§4.3. One measure at 240 BPM (1 s) is shorter than v2's standalone reserve (1.075 s), so D215's
"at least one measure" alone would leave no doodle-shaped phrase at 240 BPM. D216's
measure-by-measure extension resolves it; the proposal caps it at three measures. Separately, D215's
single measure conflicts with v2 §4's measure of read-ahead (§4.1).

### 8.4 Determinism and the seeded draw (d)

- Every Jam phrase is reproducible from its inputs only if those inputs include the quantised
  doodle, the drift and the rhythm-lock data ([rhythm lock §6](rhythm-lock.md#6-reproducibility)):
  a new replay key version (proposed, O156), every earlier key still decoding. v3.1's draft
  already takes `ifk3.`, so v3.2's is `ifk4.` if both ship in that order.
- The doodle's capture depends on live timing; that is why the quantised doodle, not the raw
  notes, is the input. Quantising uses plain arithmetic, once.
- **There is no session seed** to draw from: each phrase's seed is a fresh random value, and the
  only session-level seed is Vary settings' own. A draw "seeded by the session" could not be
  reproduced from a replay key. The suggestion's draw is therefore seeded from the quantised doodle
  ([suggestion §2](key-and-mode-suggestion.md#2-the-method-settled-and-its-proposed-details)).
- Which ladder rung produced phrase 1 can depend on the machine's speed, as v2 accepts.
- New orderings break ties by the existing seeded key, then by index, in code-unit order (ISS-010).

### 8.5 Smaller conflicts

- **The starting note** (v2 §6: "only one MIDI note can start a session: the note phrase 1 starts
  on"): in Jam mode without a held doodle, the home note starts it (§2).
- **Notes before phrase 1** are never exported in v2 (§7); the doodle's are (§7.2).
- **Quantised played notes** are something v2 refused to engrave ("quantizing it would
  misrepresent what was actually played"); the review's doodle section engraves the quantised doodle
  as what the app used, not as a record of the playing, which the `Played notes` lane keeps.
- **Pre-generation** (v3.0 §8): the Jam switch, the drift and the rhythm lock become settings whose
  change discards pre-generated phrases.

### 8.6 Grounding that moved

`jam-grounding.md` is research and stays as written; on re-checking (2026-10-07) these facts
differ, and this document uses the new ones:

- Latency: the newest browser figures are 277.2 ms cold and 77.3 ms warm for the worst setting, not
  823 ms and 228 ms.
- Generation order comes from hash tie keys, not the named streams, which nothing in production
  uses; per-phrase seeds are fresh random values.
- The rhythm memo key is the grammar version plus five controls, **tension included**, so Tension
  across phrases changes the rhythm domain from phrase to phrase.
- `makeCarryIn` also refuses a missing chord, a malformed chord and a tense note not reached by a
  step.
- A bar's contour checkpoint falls back to its first fresh attack when beats 1 and 3 hold only tie
  continuations.
- The 280 ms carry-in figure comes from the ISS-009 issue, not the latency document.
- The atom `module_ranked_candidate_ordering` forbids preferring candidates (§6).

## 9. Who it serves

| Piece | Goal |
| --- | --- |
| Capture, generation, the join, rhythm and melody preferences | P3.C3, grow an idea |
| The doodle in the review and the exports | P3.C1 review a session, P3.C2 take it out |
| Jam again on this doodle | P3.C3, and D209's "not good enough to iterate on it" |
| Starting by the home note | Context of use: hands on the instrument |
| No re-doodle mid-session, nothing shown live | Context of use: no click while playing |

P1 and P2 are not served by Jam itself; P1.G1 (vocabulary by exposure) gains a little from hearing
an idea of their own developed.

## 10. Definition of done (proposed)

1. A doodle is captured only after a count-in; no note at Idle other than the starting note starts
   anything, in Jam mode or not.
2. The doodle ends on the first measure that begins and stays silent, or after four measures; a
   note played inside the generation measure cancels the attempt and extends the doodle.
3. Very short notes never extend, end or shape a doodle.
4. Quantising follows §3.3, tested on recorded doodles, including early notes onto beat 1, overlaps
   and chords.
5. Phrase 1 is shown with one read-in measure before it sounds; when late, the wait grows by whole
   measures up to the deadline; the last rung is v2's standalone phrase.
6. The doodle changes no setting; every phrase of a Jam obeys every rule its settings impose.
7. With the doodle withheld, a Jam phrase's request and seed give v2's phrase byte for byte.
8. Every Jam phrase replays from its replay key; every earlier key still decodes to the same
   phrase.
9. The sweep over doodles × settings at 60, 120 and 240 BPM is recorded, with the share of phrase 1
   generated with the doodle's join and preferences, and no phrase repeated.
10. A listening check by the owner: phrases at each drift position against a handful of doodles,
    recorded ("does it sound like my doodle?").
11. The review, the exports and the kept session handle the doodle as the owner decides (§8.1).

## 11. Open

- **O10 - Planner authority** _(reopened for v3; D83)_: kept with its register wording.
  Proposed (§6): answered for v3.2, no stage revises another; reopens with the first feature that
  quotes player material.
- **O140 - How a Jam is entered** _(v3.2)_: a session mode or a second start, what Idle shows, and
  which note starts it. Proposed: a "Jam" switch at Idle, saved, needing a controller; no phrase
  shown at Idle in Jam mode; started by Start or by the key's home note in the middle of the
  instrument's written range.
- **O141 - The measures before phrase 1** _(v3.2; D215, D216)_: how long between the doodle and
  phrase 1, and the deadline for a late phrase 1. Proposed: a generation measure then a read-in
  measure with phrase 1 on screen (two in all, for v2's measure of read-ahead); a late phrase 1
  extends the wait by whole measures up to three measures after the generation measure begins, the
  last rung being v2's standalone phrase.
- **O142 - Quantising the doodle** _(v3.2)_: grid, snapping, overlaps, chords, collisions.
  Proposed: sixteenth grid at every tempo; snap onsets and releases; filter, then snap, then
  count; a later start ends an earlier note; on one tick the longer note stays, then the higher.
- **O143 - Capture edge cases** _(v3.2)_: no first note, a lost controller, notes in the generation
  measure. Proposed: 30 s with no doodle note ends the Jam with no review; a controller lost before
  phrase 1 ends it at once; notes in the generation measure after a four-measure doodle belong to
  nothing.
- **O144 - The doodle's status** _(v3.2; D69, D216)_: generation input or played notes, for the
  replay key, kept sessions without the opt-in, the review and the exports. Proposed: the quantised
  doodle is a generation input that travels with the music; the raw notes stay played notes.
  Needs the owner, and the confirmation of any STABLE guarantee it narrows.
- **O145 - What "matching" means in v3.2** _(v3.2; D209, D216)_: shape only, or the doodle's own
  notes. Proposed: shape only (rhythm distance, the doodle's moves, the join from its last note);
  quoting and named motif operations are later and reopen O10.
- **O147 - A Jam's review and exports** _(v3.2)_: how the doodle shows and travels. Proposed: an
  engraved doodle section before phrase 1, no number, never a favorite; the raw notes in the
  `Played notes` lane and the played-notes export with a "Doodle" marker; the quantised doodle
  opening the generated-notes export in every format and scope; a Jam mark in the session list.
- **O155 - Sound during the capture** _(v3.2)_: what plays under the doodle. Proposed: the pulse
  only, whatever the click switch says, at the click volume; the backing from phrase 1; a tonic
  drone is a later candidate.
- **O156 - The replay key for v3.2** _(v3.2)_: what a Jam or locked phrase's key holds. Proposed:
  the next version after v3.1's (`ifk4.` if v3.1 takes `ifk3.`), adding the quantised doodle
  (ticks, concert pitches, tempo), the drift, and the rhythm lock's data;
  every earlier key still decodes. Size about 1 KB at most.

O146, O148–O154 are in the [key and mode suggestion](key-and-mode-suggestion.md#7-open) and the
[rhythm lock](rhythm-lock.md#9-open).
