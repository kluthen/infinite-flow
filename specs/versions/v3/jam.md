# v3.2 — Jam

Status: draft v2 (2026-10-08; terms aligned with D237 and D238 the same day, no behaviour changed).
Approved by the owner as proposed (D234), with the rhythm lock reshaped by D232. Every item below is
settled and cites its decision; the gaps closed while settling the draft cite "draft v2". One
wording still waits for the owner: the change to the declared-intent contract that O144 brings
(§8.1), confirmed at the v3.2 master spec review.

Serves P3, the Fledgling Composer: C3 "grow an idea", "I liked that gimmick", played and continued
by the app ([personas](../../personas.md#p3--the-fledgling-composer-secondary-d61)). It also carries
the owner's own words, D209: "I've a doodle in mind, but I'm not good enough to iterate on it. I
give it to the app, and it generates matching phrases." Companions:
[key and mode suggestion](key-and-mode-suggestion.md), [rhythm lock](rhythm-lock.md). Code facts:
[jam-grounding.md](jam-grounding.md), re-checked on 2026-10-08 (§8.6).

Plain words used here, one term per concept in all three v3.2 documents:

- **Doodle**: the short idea, one to four measures, the player plays for the app to grow.
  Musicians call it a [motif](../../../docs/music/lexicon.md#motif); the app says "doodle".
- **Jam**: the session mode in which a session begins with a doodle; also the name of its switch
  (working name). **A Jam** is one session run in that mode.
- **Click**: the app's sound, one per beat, at the selected tempo, from the count-in until phrase 1
  (§3.1); the [lexicon](../../../docs/music/lexicon.md#beat) keeps "pulse" for the beat itself
  (D237).
- **[Count-in](../../../docs/music/lexicon.md#count-in)**: the one measure of click, shown and
  heard, before anything is played, as in v2.
- **Starting note**: the one MIDI note that can start a session from Idle (v2 §6).
- **Quantizing**: snapping played notes, which never land exactly on the beat, to the nearest
  sixteenth-note position (the app's [tick](../../../docs/music/lexicon.md#tick)).
- **Generation measure**: the measure in which the app writes the first phrase after the doodle.
- **Read-in measure**: one measure where that phrase is on screen before it sounds, as phrase 1 is
  during v2's count-in.
- **Drift**: how far a Jam's phrases may wander from the doodle
  ([rhythm lock §6](rhythm-lock.md#6-the-jam-drift-control)).
- **Held doodle**: a doodle kept at Idle so the next Jam continues it without a new capture (§2).

## 1. Settled before the draft

- **What Jam is** (D209): the player plays a doodle, and the generator continues it. The doodle
  feeds the generator its [rhythm](../../../docs/music/lexicon.md#rhythm),
  [contour](../../../docs/music/lexicon.md#contour) and
  [interval](../../../docs/music/lexicon.md#interval) character. The player-selected key and mode
  stay authoritative; the app never switches them on its own.
- **When the doodle ends** (D215): it is one to four measures long, and ends when the player leaves
  a whole measure silent or when four measures have been played. At least one measure passes before
  the first generated phrase sounds.
- **Tempo** (D216, O125): the doodle is played over the app's click at the selected tempo, and the
  phrases after it keep that tempo.
- **The generation measure** (D216, O112): the silent measure that ends a doodle doubles as the
  generation measure. Generation starts when a measure begins with no note sounding, and is dropped
  if the player plays again inside it. When a phrase is not ready, the wait extends measure by
  measure with the click going on, and v2's standalone fallback applies. The doodle is continued,
  not repeated.
- **Ranking, not constraints** (D216): the doodle steers the generator's ranking rather than
  imposing hard constraints.
- **Stray notes** (D196, D216): very short notes are filtered out of the doodle
  ([v3.0 master spec §9](master-spec.md#9-stray-notes)).

## 2. Entering a Jam (D234, O140)

- **Jam is a session mode, switched on at Idle.** The "Jam" switch is off by default and saved
  like the three "During a session" options
  ([v3.0 master spec §4.2](master-spec.md#42-what-is-saved-automatically)). While it is on, a
  session begins with a doodle instead of the phrase on screen. A mode, not a second Start button,
  because a mode lets a played note start a Jam without the two starts competing for one note.
  Presets neither hold nor change it (draft v2; presets hold generation controls only, D228, D233).
- **Jam needs a controller attached** (v2 §8's meaning). Without one the switch is unavailable,
  saying why, as Rising tempo is ([v2 master spec §10](../v2/master-spec.md#10-adaptive-tempo)).
  The player's choice is kept (draft v2): while no controller is attached, Idle and Start behave
  as with Jam off. A controller attaching at Idle puts Jam mode in effect, exactly as turning the
  switch on does; one lost at Idle takes it out, exactly as turning the switch off does.
- **At Idle in Jam mode, no generated phrase is shown**: nothing is read before the doodle. The
  staff shows the key signature of the selected key and mode. The Idle phrase rules of v2 §4 and §6
  (replacing a phrase that does not fit, the dense-notes notice) and pre-generation
  ([v3.0 §8](master-spec.md#8-pre-generating-phrases-at-idle)) do not run. v2's prewarm still runs:
  the doodle's phrases use the same rhythm domain as the settings. Turning Jam off generates a phrase
  as at first load. Layout is `ux-writer`'s.
- **A Jam starts on a Start click, or on its starting note: the selected key, the home note**
  ([tonic](../../../docs/music/lexicon.md#tonic)), in written pitch, in the octave nearest the
  middle of the instrument's written range, named in the cue row as v2 names the starting note. As
  in v2, it only starts the count-in and belongs to no doodle. The conditions under which a session
  can start (v2 §6) apply, apart from "a phrase is on screen" and "no new phrase is being generated";
  settings the generator does not support still block the start.
- **A doodle never starts anything by accident.** Notes played at Idle stay ignored, as in v2: the
  doodle is captured only after the count-in. Playing the home note at Idle starts a Jam, which is
  v2's accepted risk with the starting note, and the cue row names it.
- **A held doodle** (D234, O148): after a Jam, the review offers "Jam again on this doodle", in the
  review of the Jam that just ended and in the review of any kept Jam session (draft v2). Idle then
  holds that doodle: phrase 1 is generated from it at Idle, with no deadline, and is on screen; the
  starting note is phrase 1's first note, as in v2; pre-generation runs; Start skips the capture,
  and the 30-second wait for a first doodle note (§3.4) does not apply. Every change at Idle that
  discards pre-generated phrases drops the held doodle, and its suggestion with it, except two that
  keep it (D238): Regenerate, which writes a new phrase 1 from the doodle, and the suggestion's
  "Use it", which regenerates the held doodle's phrase 1 in the new key and mode. The tempo, Rising
  tempo, the audio mix and the theme keep it; a controller lost at Idle drops it. A held doodle
  lives in memory only: after a reload Idle holds none, and the kept Jam session's review offers it
  again (draft v2). See
  [the key and mode suggestion](key-and-mode-suggestion.md#3-where-and-when-it-is-shown).

## 3. Capturing the doodle

### 3.1 The click (D234, O155)

- One measure of count-in, as in v2, shown and heard. The click then goes on through the capture,
  the generation measure and the read-in measure, **whatever the click switch says**, at the click
  volume: like v2's count-in, it is what sets the measure grid. From phrase 1 on, the click switch
  governs as in v2.
- **No backing during the capture**: the backing follows a phrase's generated harmony (v2 §6), and
  there is none yet. It starts with phrase 1. A tonic drone under the doodle is a later candidate.
- The live view never shows the doodle's notes, as v2 never renders a played note there
  ([v2 master spec §8](../v2/master-spec.md#8-midi-input-and-note-acknowledgement)). The cue row
  counts the doodle's measures (one to four); its look is `ux-writer`'s.

### 3.2 Where the doodle starts and ends (D234)

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
  Notes played in it belong to no doodle and no phrase, like notes played during v2's count-in.
- **A held note keeps a measure from being silent**: a measure that begins with a note still
  sounding is not a silent measure, even if the note ends at once.

### 3.3 Quantizing (D234, O142)

- **The grid is the tick, a sixteenth note, at every tempo.** At 240 BPM a sixteenth lasts 62.5 ms,
  so an onset moves at most about 31 ms. The doodle only steers ranking, so a near-miss costs
  little.
- **Onsets and releases snap to the nearest tick**; a note keeps at least one tick.
- **One line only** (the tracker records chords and overlaps): when notes overlap, the later start
  ends the earlier note; when two notes snap onto the same tick, the longer one stays (a grace
  note before a held note is dropped), and on equal length the higher one.
- **What is kept**: the quantized doodle (ticks and concert pitches, plus the tempo it was captured
  at). It is computed once, when the doodle ends, and is what every later step reads. Raw notes stay
  played notes (§8.1).

### 3.4 Edge cases (D234, O143)

- **No note after the count-in.** If no doodle note comes within 30 s after the count-in, the Jam
  ends as a session ended during its count-in: back to Idle, no review, nothing kept (v2 §7,
  v3.0 §5.1). This differs from a session, whose silence timer starts only after a first note,
  because a capture has nothing rolling to read. Notes the stray filter drops do not count.
- **Controller lost before phrase 1 sounds**, during the capture, the generation measure, a wait
  extended by late generation or the read-in measure: the Jam ends at once, as above (D234 for the
  capture and generation measure; draft v2 extends it to the wait and the read-in measure, which
  have nothing rolling either). From phrase 1 on, v2's 30-second reconnection rule applies. A Jam
  on a held doodle has no capture, so it follows v2's rule from its count-in on.
- **Stop, a hidden tab, or a staff that can no longer be shown** before phrase 1 sounds: as a
  session ended during its count-in.
- **A doodle of one note** is a doodle. It shapes little, and gives no key and mode suggestion
  ([minimum material](key-and-mode-suggestion.md#2-the-method-and-its-details)).
- **Notes outside the instrument's range or the register window** stay in the doodle; §5.2 says
  what they do to the join.

## 4. From the doodle to phrase 1 (D234, O141)

### 4.1 The two measures before phrase 1

- **Generation measure**: the app writes phrase 1 from the doodle. The cue row says so.
- **Read-in measure**: phrase 1 is on screen and its beats are counted, as during v2's count-in.
  Then phrase 1 sounds, with the backing.
- So two measures separate the doodle and phrase 1 (2 s at 240 BPM, 4 s at 120 BPM, 8 s at
  60 BPM). D215 asks for "at least one", and D234 keeps it: the second measure exists because v2
  promises at least one measure of read-ahead on screen at all times
  ([v2 master spec §4](../v2/master-spec.md#4-look-ahead-and-failure-handling)); with one measure,
  phrase 1 would appear on the barline it starts on, with nothing to read ahead.
- Phrase 1 starts with a fresh attack on beat 1, as every phrase does. The gap means Jam needs no
  pickup or tie across the join, which v2 §3 had left for v3 "which already has to solve it for
  player-seeded continuations": it stays unsolved, and nothing in v3.2 needs it.

### 4.2 When phrase 1 is late

- **The wait extends by whole measures** (D216): phrase 1 is shown at the first barline at or after
  it is ready, followed by its read-in measure. The click goes on; the cue row keeps saying the app
  is writing.
- **Deadline**: three measures after the generation measure begins, the same span a look-ahead
  phrase gets in v2 (3 s at 240 BPM, 12 s at 60 BPM).
- **The ladder** (v2 §4, adapted): attempts with the doodle's join (§5.2) and its preferences;
  then the doodle's preferences without the join; then v2's standalone phrase, with no doodle at
  all. v2's standalone reserve (1.075 s) is kept before the deadline for that last rung, which is
  the attempt the reserve was measured on. A phrase repeat is impossible (there is no phrase
  before), so the ladder's step 3 does not apply.
- **If every attempt fails** by the deadline, the Jam ends: back to Idle, no review, nothing kept,
  and the player is told, at Idle, that the generator could not continue with these settings. It
  should be rare, since the settings were checked at Start. The doodle is not held (draft v2).

### 4.3 The time budget

- At 240 BPM one measure is 1 s (D215). The standalone reserve, 1.075 s, is longer: with a strict
  one-measure deadline the ladder would skip every doodle attempt at 240 BPM, as v2 does for
  phrase 2 (D205). The three-measure deadline above leaves the doodle attempts about 1.9 s at
  240 BPM.
- **Measured** ([generation latency](../../../docs/generation-latency.md); re-checked in
  [jam-grounding.md](jam-grounding.md#d-re-check-2026-10-08)): a standalone attempt in Chromium has
  a median of 245 ms and a maximum of 618.6 ms on the 43 slowest settings; a warm generation of the
  worst setting 77.3 ms, cold 277.2 ms (v2.0 gate, prewarm on). Carry-in successes took at most
  280 ms in ISS-009's sweep; failed carry-in searches took seconds before that issue's fixes, which
  is what the reserve guards against.
- **So phrase 1 is normally ready inside the generation measure** at every tempo. The rhythm domain
  is already warm (the settings are known before Start). Ranking up to 2,932 rhythm candidates (the
  largest domain; 1,797 is the slowest to build) by distance adds work that must be measured.
- **Pre-generation cannot help a fresh doodle**: phrase 1 depends on notes played after Start. It
  helps a held doodle (§2).
- **Phrase 2** is requested as soon as phrase 1 is ready; its deadline is the start of phrase 1's
  last measure, so it has the read-in measure plus three measures, more than v2's phrase 2 gets.
- **To measure before the gate**: a sweep like `npm run test:sweep` over doodles × settings, for
  every rung, at 60, 120 and 240 BPM (the lesson of ISS-009), with the rhythm lock on and off.

## 5. What the doodle feeds the generator (D234, O145)

### 5.1 Principles

- **The doodle changes no setting.** The controls stay as the player set them; the doodle only
  orders the candidates those controls allow. Every phrase that is possible today stays possible,
  so the failure ladder's evidence still holds (D216; Jam grounding §A.7).
- **The doodle is not quoted** (D234). v3.2's phrases match the doodle's shape: a rhythm close to
  it, the same ups and downs, starting where it ended. Playing the doodle's own notes back inside a
  phrase, or developing them by named operations (moving it higher, turning it upside down), is
  later work: it needs new pitch-planner capability and would reopen planner authority (§6).
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
- The distance and the [drift](rhythm-lock.md#6-the-jam-drift-control) position decide the
  order: candidates within the drift's distance first, in seeded order so phrases still vary;
  then the rest, closest first. A doodle far from everything the settings allow (sixteenth notes
  under the Quarter density, say) is only approached.
- With the [rhythm lock](rhythm-lock.md) on, phrase 1 takes the rhythm nearest the doodle, the lock
  then holds it, and drift no longer decides rhythm (D232, D234).

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

## 6. Planner authority (O10, D234)

**O10 is answered for v3.2 with "no stage revises another", as D83 did for v2** (D234). The
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
| Orchestration | Unchanged, apart from the rhythm lock's order ([rhythm lock §5](rhythm-lock.md#5-how-the-search-holds-it)). |

What reopens O10: quoting the doodle inside a phrase (its notes pinned, so harmony and the
contour and leap rules must accept notes no planner chose), or picking chords to fit it. Both are
outside v3.2 (§5.1). Register wording: "O10 is answered for v3.2; it reopens with the first
feature that quotes player material", for example v4's rhythm editor or a later Jam.

**One intent change for `documentalist`:** the atom `module_ranked_candidate_ordering` (REVIEW)
describes harmony and rhythm ordering as visiting candidates "without scoring or preferring any
candidate over another", as current policy rather than a prohibition. The doodle's distance order
and the rhythm lock both prefer rhythm candidates, so its wording is amended with the v3.2 master
spec. Pitch ordering already prefers candidates (`pitchRank`) and is not covered by the atom.

## 7. During and after the Jam

### 7.1 During (D234)

- From phrase 1, a Jam runs as a v2 session: rolling phrases, acknowledgement, look-ahead, the
  failure ladder, Vary settings, Tension across phrases, Rising tempo, the silence and controller
  rules, Stop. Vary settings, Tension across phrases and Rising tempo count from phrase 1 (Rising
  tempo: draft v2, as the other two).
- **No re-doodle during a Jam.** A running session never asks the player for anything and offers
  nothing to click; telling "a new doodle" from "losing my place" would need a
  [played signal](../../../docs/music/lexicon.md#played-signal), which is v3.x (D213, D214). To
  doodle again, the player stops and starts a new Jam.
- **A Jam ends** as any session ends (v2 §7).

### 7.2 The review, the exports and kept sessions (D234, O147)

- **The doodle opens the review**, before phrase 1, as its own labelled section, engraved from the
  quantized doodle in written pitch: what the app heard. It has no phrase number and cannot be a
  favorite; its notes are not expected notes, so nothing in it is ever acknowledged.
- **The `Played notes` lane** covers the doodle's raw notes too, when shown.
- **The key and mode suggestion**, when there is one, shows in the review
  ([suggestion §3](key-and-mode-suggestion.md#3-where-and-when-it-is-shown)), with "Jam again on
  this doodle" (§2).
- **The session list** marks a Jam session as such.
- **Exports**: the played-notes export holds the doodle's raw notes, placed before phrase 1 with a
  "Doodle" marker (v2 drops every note before phrase 1). The generated-notes export opens with the
  quantized doodle as its own marked section, in both formats (MusicXML and MIDI) and both scopes
  (the whole session and its favorites). Both follow the doodle's status (§8.1).
- **A kept Jam session** holds the quantized doodle and, with each phrase's reproduction inputs,
  the doodle, the drift and the rhythm-lock data ([rhythm lock §7](rhythm-lock.md#7-reproducibility)),
  without the played-notes opt-in (§8.1). Its raw doodle notes follow "Keep my played notes" like
  every played note. Deleting the session deletes its doodle (D234).
- **Stored shape** (draft v2): these additions are a new data version, migrated on opening as
  [v3.0 master spec §4.3](master-spec.md#43-where-and-how) requires. Sessions kept before v3.2
  have no doodle and open as before.
- **A visit that saves nothing** (draft v2): in an outdated tab or after a failed read
  ([v3.0 master spec §4.3, §4.4](master-spec.md#44-loading-saved-settings)), Jam, its review, the
  suggestion and "Jam again on this doodle" work in memory; nothing is saved, and the visit's
  deletion rules are unchanged. A kept Jam session written by a newer version is listed as such
  and does not open, as any such session.

## 8. What v3.2 changes in settled decisions

Each was surfaced in draft v1 and settled by D234; this records what changes.

### 8.1 Privacy: the doodle's status (D234, O144)

- **Settled before v3.2:** played notes leave the device only through the played-notes export
  (v2 §7, v3.0 §10), and are stored only after "Keep my played notes" (v3.0 §5.3, D216), "because
  the player's own notes are the most private data the app holds, and keeping the music should not
  imply keeping them" (v3.0 §12). The replay key's atom says a key "never holds played notes" and
  is "never sent over a network or stored".
- **Decided (D234):** the **quantized doodle** is a generation input the player gave on purpose,
  and travels with the music: in each Jam phrase's reproduction inputs, the replay key, a kept
  session (without the opt-in), the review's doodle section and the generated-notes export. The
  **raw doodle notes** stay played notes, under every played-notes rule. Deleting a session
  deletes its doodle.
- **Rejected alternative:** the quantized doodle as played notes, which would have left a kept Jam
  session without its doodle after a reload unless opted in, and the replay key unable to
  reproduce a Jam phrase.
- **Still to confirm:** this narrows declared-intent guarantees (the replay key atom,
  `rule_optional_midi_privacy`, and the v2 rule that the generated-notes export never carries
  played notes). `documentalist` prepares the change set, and **the owner confirms its exact
  wording at the v3.2 master spec review**, as for v3.0 (D234).

### 8.2 "A running session never asks the player for anything"

The suggestion is confirmed by the player (D212, D216), and the doodle is known only after the
session started, so it is never offered during the Jam. Decided (D234, O148): after the Jam, in the
review, and for a held doodle at Idle ([suggestion
§3](key-and-mode-suggestion.md#3-where-and-when-it-is-shown)). Accepted consequence: the Jam that
produced the doodle is always continued in the player's selected key and mode; the suggestion serves
the next Jam on that doodle.

### 8.3 The generation-time budget

§4.3. One measure at 240 BPM (1 s) is shorter than v2's standalone reserve (1.075 s), so D215's
"at least one measure" alone would leave no doodle-shaped phrase at 240 BPM. D216's
measure-by-measure extension resolves it, capped at three measures (D234). D215's single measure
would also have broken v2 §4's measure of read-ahead; the read-in measure keeps it (§4.1).

### 8.4 Determinism and the seeded draw

- Every Jam phrase is reproducible from its inputs because those inputs include the quantized
  doodle, the drift and the rhythm-lock data ([rhythm lock §7](rhythm-lock.md#7-reproducibility)):
  a new replay-key version (D234, O156), every earlier key still decoding. v3.1 takes `ifk3.`
  (D233), so v3.2's is `ifk4.`. Its doodle content is part of the contract wording the owner
  confirms (§8.1).
- The doodle's capture depends on live timing; that is why the quantized doodle, not the raw
  notes, is the input. Quantizing uses plain arithmetic, once.
- **There is no session seed** to draw from: each phrase's seed is a fresh random value, and the
  only session-level seed is Vary settings' own. A draw "seeded by the session" could not be
  reproduced from a replay key. The suggestion's draw is therefore seeded from the quantized doodle
  ([suggestion §2](key-and-mode-suggestion.md#2-the-method-and-its-details)), and a rhythm change's
  draw from the phrase's own seed ([rhythm lock §3](rhythm-lock.md#3-allowed-rhythm-changes)).
- Which ladder rung produced phrase 1 can depend on the machine's speed, as v2 accepts.
- New orderings break ties by the existing seeded key, then by index, in code-unit order (ISS-010).

### 8.5 Smaller changes

- **The starting note** (v2 §6: "only one MIDI note can start a session: the note phrase 1 starts
  on"): in Jam mode without a held doodle, the home note starts it (§2).
- **Notes before phrase 1** are never exported in v2 (§7); the doodle's are (§7.2).
- **Quantized played notes** are something v2 refused to engrave ("quantizing it would
  misrepresent what was actually played"); the review's doodle section engraves the quantized doodle
  as what the app used, not as a record of the playing, which the `Played notes` lane keeps.
- **Pre-generation** (v3.0 §8): the Jam switch, the drift, the rhythm lock and its allowed rhythm
  changes become settings whose change discards pre-generated phrases.

### 8.6 Grounding

The code facts this document relies on were re-verified on 2026-10-08; what moved since the
research was written is recorded in
[jam-grounding.md §D](jam-grounding.md#d-re-check-2026-10-08).

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

## 10. Definition of done (D234)

1. A doodle is captured only after a count-in; no note at Idle other than the starting note starts
   anything, in Jam mode or not.
2. The doodle ends on the first measure that begins and stays silent, or after four measures; a
   note played inside the generation measure cancels the attempt and extends the doodle.
3. Very short notes never extend, end or shape a doodle.
4. Quantizing follows §3.3, tested on recorded doodles, including early notes onto beat 1, overlaps
   and chords.
5. Phrase 1 is shown with one read-in measure before it sounds; when late, the wait grows by whole
   measures up to the deadline; the last rung is v2's standalone phrase.
6. The doodle changes no setting; every phrase of a Jam obeys every rule its settings impose.
7. With the doodle withheld, a Jam phrase's request and seed give v2's phrase byte for byte.
8. Every Jam phrase replays from its replay key; every earlier key still decodes to the same
   phrase.
9. The sweep over doodles × settings at 60, 120 and 240 BPM, with the rhythm lock on and off, is
   recorded, with the share of phrase 1 generated with the doodle's join and preferences, and no
   phrase repeated.
10. A listening check by the owner: phrases at each drift position against a handful of doodles,
    recorded ("does it sound like my doodle?").
11. The review, the exports and the kept session handle the doodle as §7.2 and §8.1 say, in the
    contract wording the owner confirmed.
12. Without a controller the Jam switch is unavailable and saying why, Idle and Start behave as
    with Jam off, and the player's choice comes back when a controller attaches (draft v2).
13. A controller lost, Stop, or a hidden tab at any point before phrase 1 sounds ends the Jam with
    no review and nothing kept (draft v2).
14. A held doodle's phrase 1 and pre-generated phrases are the phrases the Jam then plays; after a
    reload, "Jam again on this doodle" from the kept Jam session gives the same phrase 1 for the
    same settings and seed (draft v2).
15. In an outdated tab and after a failed read, a Jam runs and reviews in memory and saves nothing
    (draft v2).

## 11. Open

None: closed by D234 (O10 for v3.2, O140–O145, O147, O155, O156). The contract wording of O144
waits for the owner at the v3.2 master spec review (§8.1). O146 and O148–O154 are recorded in the
[key and mode suggestion](key-and-mode-suggestion.md#7-open) and the
[rhythm lock](rhythm-lock.md#10-open).
