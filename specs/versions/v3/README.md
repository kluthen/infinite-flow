# v3 — Player Material and "My Instrument"

Status: direction, split into releases (2026-10-07, D211; v3.0.1 merged into v3.0, D212). Not yet specced. The items and
candidates gathered here from 2026-09-25 on are recorded in the decisions log: D128–D130, D146,
D174, D175, D190, D192, D196, D206, D209 and D210. D211 places each of them in a release, moves
two to v4 and drops four. D212 merges v3.0.1 into v3.0. D216 approves spec-writer's
recommendations at the owner's overall review: v3.0 is drafted, and Jam's main questions are settled.

**Serves:** P3, the Fledgling Composer: "I liked that gimmick, I play it, and see where it goes."
Also every tester on an instrument v1 doesn't ship. See [personas](../../personas.md).

## Releases (D211)

| Release    | Theme                         | Scope                                                                                                                                                      |
| ---------- | ----------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **v3.0**   | Storage, and follow-ups (D212) | [Local persistence](#local-persistence), ["my instrument"](#my-instrument), [review of earlier sessions](#review-of-earlier-sessions), [favorites](#favorites), [keeping sessions](#keeping-sessions); [pre-generating phrases at Idle](#pre-generating-phrases-at-idle), [stray notes from controllers](#stray-notes-from-controllers) |
| **v3.1**   | Generation choices            | [Embellishment flags](#embellishment-flags), [presets](#presets)                                                                                           |
| **v3.2**   | Jam                           | [Jam](#jam-growing-the-players-doodle), the [key and mode suggestion](#key-and-mode-suggestion), the [rhythm lock and mutation](#rhythm-lock-and-mutation) |
| **v3.x**   | Kept, likely to move or go    | [Learning from positive signals](#v3x--learning-from-positive-signals)                                                                                          |

- **v3.0 master spec:** [master-spec.md](master-spec.md) (D217), consolidated from the approved
  drafts; handed to `documentalist` and `ux-writer`, a build plan to follow the design.
- **v3.0 drafts** (2026-10-07, draft v2, approved at the owner's overall review, D216): [persistence](persistence.md), [kept sessions and favorites](kept-sessions.md),
  [my instrument](my-instrument.md), [pre-generation at Idle](pre-generation.md),
  [stray notes](stray-notes.md).
- **Research:** [storage grounding](storage-grounding.md), [Jam grounding](jam-grounding.md);
  music research in `docs/music/`: [embellishment catalogue](../../../docs/music/embellishment-catalogue.md),
  [mutation catalogue](../../../docs/music/mutation-catalogue.md),
  [played-pattern recognition](../../../docs/music/played-pattern-recognition.md),
  [key and mode estimation](../../../docs/music/key-and-mode-estimation.md); their sources and
  terms are merged into `research-sources.md` and the lexicon.
- **Moved to v4:** the [rhythm ratios and the rhythm editor](#moved-to-v4-rhythm-ratios-and-the-rhythm-editor).
- **Dropped:** the [two controller-connection ideas](#controller-connection-ideas),
  [review tooling](#review-tooling) and the
  [end-of-measure chord-fit check](#end-of-measure-chord-fit-check). See [Dropped](#dropped-d211).
- **v3.0.1 is merged into v3.0** (D212), the owner: "v3.0.1 could very well be just included
  into v3.0". This also settles where keeping sessions goes: with the review of earlier sessions
  that needs it.

## v3.0 — Storage

Everything that needs the app to keep something on the player's device. Presets are excluded,
though they are saved too: they ship with the embellishment flags in v3.1.

### Local persistence

- The first thing in the product that survives a page reload. This deliberately departs from v1's
  and v2's ephemeral sessions.
- Data stays on the player's system: local storage, or a file export the player triggers.
- **Feeds from v2's narrow-window density rule (D146):** below the tablet-landscape width, v2
  generates with `Eighth` while keeping a `Sixteenth` the player chose, in memory only. If v3
  saves settings, it saves the chosen value, not the one generated with.

### My instrument

- A small interface lets the player describe their instrument: the input kind (MIDI controller
  now; the microphone much later, see [v5+](../v5-plus/README.md)), the expected range and the
  transposition.
- It builds on v1.0's instrument templates, where transposition is open data.
- **Feeds from v2's controller check (D79):** v2.0's controller check (D77) detects a constant
  pitch offset between the controller and the selected template — octave, semitone, or any other
  constant delta — but only for the session (D77: no persistence in v2). Once "my instrument"
  exists, the same check's result should populate or update the saved template automatically,
  instead of asking the player to redo or re-enter it every session.
- The instrument will eventually belong to a user profile. Switching instrument is expected to be
  rare.
- A Concert-display override, absent from v1.0, may return here if someone needs it.

### Review of earlier sessions

- This extends v2's last-session review through persistence.
- Keeping played notes across sessions requires the player's explicit opt-in and a way to delete
  them.
- Reviewing an earlier session needs it to be kept: [keeping sessions](#keeping-sessions) ships
  in the same release (D212).

### Favorites

Moved here from v2 on 2026-09-28 (D130, from ux D69); in v3.0 since D211. v2's review has no
favorites, every v2 export covers the whole session, and starting a new session from the v2
review asks no confirmation
([v2 master spec §7](../v2/master-spec.md#7-sessions-review-export-and-privacy)).

- **Serves P3's C1 and C2** ([personas](../../personas.md#p3--the-fledgling-composer-secondary-d61)):
  marking the parts the player liked, and exporting the marked material. v2 serves C1 by looking
  back at the last session, and C2 by exporting the whole session.
- **Starting point, not binding.** What v2's spec had settled before the move (D88, D129): a
  favorite marks a whole phrase; the export offers a favorites-only scope, in session order, each
  phrase keeping its session phrase number; played notes exported with favorites are those of the
  favorite phrases, and a note held past a favorite phrase stops at its end when the next phrase
  is not exported; starting a new session asks for confirmation when the review holds unexported
  favorites. Marking a bar range instead of a whole phrase was already noted as a v3 idea, tied to
  seeding a continuation.
- **Settled by D216** ([kept-sessions.md](kept-sessions.md)): marking a favorite pins its session,
  so a new session never asks for confirmation and O86 is closed as moot.

### Follow-ups merged into v3.0

D211 placed the next three items in a v3.0.1 of "quick fixes"; D212 merges them into v3.0. All
three were candidates before D211.

### Pre-generating phrases at Idle

Recorded 2026-10-07 (D206), the owner's proposal, in their words: "while start session isn't
pushed have background generate a few phrases in advance (no more than 4) that give us some time
ahead." Not designed.

- **What it is.** While the app is Idle, before Start, the app generates in the background up to 4
  look-ahead phrases following the phrase on screen, so a session starts with time in hand.
- **Why.** In v2 the failure ladder keeps 1.075 s for the standalone attempt, more than one
  measure at 240 BPM, so at 240 BPM phrase 2 is always generated standalone and its join to phrase
  1 is never smoothed; the owner keeps that for v2 (D205). Generated before Start, with no
  deadline, phrase 2 could carry in from phrase 1 again at fast tempos. It serves P2, the Speed
  Builder, who reads and plays at the fastest tempos ([personas](../../personas.md)).
- **What it changes in v2.** Idle has no deadline and generates no phrase with carry-in (D203);
  pre-generated phrases would be phrases with carry-in, generated at Idle.
- **Not v2's prewarm.** The prewarm (`module_generation_prewarm`) only warms the generator's
  rhythm memo for the current settings on the one generation worker, and produces no phrase.
- **Settled by D216** (O107–O111 closed): [pre-generation.md](pre-generation.md).

### Stray notes from controllers

Recorded 2026-10-06 (D196), the owner's ruling after the hardware sitting; in v3.0 since D211 and D212.

A controller can send short "stray" notes while the fingers change position: in-between notes a
real instrument would swallow. The reference breath controller sends them often, at in-between
pitches, often in pairs at velocity 127. The owner's ruling: this is a **generic controller
matter**, so nothing is built for one device.

- **What they cost today.** Played notes are bloated with notes the player never meant: stray
  notes show in the review's played notes and go into the played-notes MIDI export.
- **What they do not cost: acknowledgement.** An expected note lights only when a played note has
  exactly its pitch inside its window, and a note that does not match changes nothing on screen
  (v2 master spec §8). Stray notes, being in-between pitches, normally light nothing. Do not add a
  filter there for them.
- **What they would cost later:** [Jam](#jam-growing-the-players-doodle) (v3.2) reads the doodle's
  notes, and the [key and mode suggestion](#key-and-mode-suggestion) reads its pitch classes; a
  stray note distorts both. The owner's idea: a note that does not last "long enough" would not be
  considered; the threshold is not decided. Placing the filter in v3.0 means it exists before
  Jam needs it.
- **Prune short notes from the played-notes export** (part of the D196 idea). An option on the
  played-notes export that removes notes shorter than a threshold. Whether the threshold is fixed
  or set by the player, and whether the review's played notes follow the same option, are not
  decided.

### Keeping sessions

Recorded 2026-09-28 (D129, from ux D67) as candidates; in v3.0 since D211 and D212. v2 stays ephemeral:
nothing survives a reload
([v2 master spec §7](../v2/master-spec.md#7-sessions-review-export-and-privacy)).

- **Store more than one session only when the player asks for it**, for example by pinning a
  session.
  - Pinning answers a question [local persistence](#local-persistence) leaves open: whether
    sessions are kept automatically or only on request. Pinning is "only on request".
  - It fits the opt-in already required for keeping played notes across sessions. Whether pinning
    a session also counts as that opt-in, or the two stay separate choices, is not decided.
  - A pinned session needs a way to unpin and delete it, as v3 already requires for played notes.
- **Suitable access to older sessions.** It meets [review of earlier sessions](#review-of-earlier-sessions):
  how the player finds and opens a kept session.
- **An optional comment on a session.** New player-written data stored with a kept session. It
  lives only where the session lives: on the player's system. Whether a comment travels in an
  export is not decided.

v2 already stores each phrase's generated timeline and reproduction inputs in memory, which is what
a kept session would need
([v2 master spec §7](../v2/master-spec.md#7-sessions-review-export-and-privacy)).

## v3.1 — Embellishment flags and presets

**Consolidated 2026-10-08: [master spec, Part B](master-spec.md#part-b--v31)** (master spec v1.0,
awaiting the owner's approval of the consolidation), from the drafts the owner approved as
proposed (D233): [embellishment flags](embellishment-flags.md) and [presets](presets.md), both
draft v3 (2026-10-08). Settled: ornaments written as symbols wait for a release of their own after
v3.2; seven figures written as ordinary notes, each with one four-step level, as preferences,
never quotas; a new replay key version `ifk3.`; eight built-in presets (Neutral, Jazz, Gentle,
Speed drill, Reel, Bebop, Pop song, Modal (Dorian)) holding ten controls, the figure levels and a
key and mode restriction (D229–D231); and player presets saved with v3.0's storage. Nothing is
open; the figure shares and the cost guard are measured before the gate. The notes below are the
background those drafts started from.

**Build plan:** [build-plan-v3.1.md](build-plan-v3.1.md), draft v1 (2026-10-08), not approved;
written while implementation is paused, for the owner to review with the v3.1 design. It plans
v3.1 on top of the [v3.0 build plan](build-plan.md) and lists four questions for `spec-writer`.

### Embellishment flags

Recorded 2026-10-07 (D210), the owner's request: "embellishments flags for generators … many ways
to support or alter in minor ways what's expected to be played", for example passing notes,
"spiked notes" (most likely [neighbor tones](../../../docs/music/lexicon.md#neighbor-tone), or
[appoggiaturas](../../../docs/music/lexicon.md#appoggiatura)) and surrounding a note with one note
above and one below (an [enclosure](../../../docs/music/lexicon.md#enclosure)). It was already
expected "in v2 or v3" ([v2 direction](../v2/README.md#direction-not-yet-scoped)). **Drafted in
[embellishment-flags.md](embellishment-flags.md)** (draft v3, approved by D233, which closed
O127–O134), consolidated in [master spec Part B](master-spec.md#b5-embellishment-figures-and-their-levels).

- **What exists today.** The generator already writes
  [passing tones](../../../docs/music/lexicon.md#passing-tone), neighbor tones and appoggiaturas
  in every profile, and [chromatic approaches](../../../docs/music/lexicon.md#chromatic-approach)
  and enclosures in the Jazz profile (`src/domain/pitch/pitch-figures.ts`). They are allowed, not
  weighted: the player cannot switch one off or ask for more of it. The feature exposes that
  control and extends the set.
- **The shape.** Per figure: allowed or not, and a weight for how often it appears. **Weights are
  preferences, not quotas** ("ish", the owner's word): the generator tries a favored figure first
  rather than having to reach a share of them. A quota can make a phrase impossible or slow to
  find; the pitch search is the generator's most expensive step (ISS-009).
- **Two families, very different costs.**
  1. **Figures written as ordinary notes** (passing and neighbor tones, appoggiaturas, enclosures,
     chromatic approaches, and others the catalogue finds). They fit the current rhythm grid and
     notation, and are acknowledged like any expected note. Proposed first.
  2. **Ornaments written as symbols or small notes** (grace notes, mordents, trills, turns). They
     do not fit the quarter, eighth and sixteenth grid, need new notation, have no
     acknowledgement rule, and touch both exports. This was open question O47 (ornament
     representation); settled by D216: ornaments are notated symbols with playback expansion,
     and only the main note is checked for acknowledgement. The owner accepts the clash with the
     rhythm representation as not an issue in itself; it makes this family the larger piece.
- **A catalogue first.** Before the spec session, a researcher prepares a catalogue of
  embellishments: one entry per figure with its name and plain definition, a small staff example,
  the styles it is typical of, its family (notes or symbol), what it needs from the rhythm, its
  harmonic rule (where it starts and must land), what a player would play for it to be
  acknowledged, and whether the generator has it today. New terms go to the
  [lexicon](../../../docs/music/lexicon.md). **Done 2026-10-07:**
  [embellishment catalogue](../../../docs/music/embellishment-catalogue.md), 31 figures (22
  written as ordinary notes, 9 ornaments). What it found in the generator:
  - **"Allowed" is not "favored" today.** The pitch search tries chord tones first, so a decorating
    note appears only when the chord-tone path fails: in about 5,200 sampled phrases, free passing
    tones were in 1–6 % of phrases and Jazz chromatic approaches in 4–20 %. Weights are what would
    make figures audible.
  - **The appoggiatura never appeared** in the sample, though the rules allow it.
  - **Two decorating notes in a row are rejected** unless they form one written figure, which
    blocks diatonic enclosures, double neighbors and scale runs today.
  - **Weights as ordering** (the order the search tries candidates in) keep the cost close to
    today's; each new figure enlarges every search, and quotas would add whole searches (the
    ISS-009 risk). This supports "weights are preferences, not quotas".
- **Ties.**
  - [Presets](#presets): Neutral and Jazz are, in effect, two fixed figure sets; a preset would
    carry a starting set of flags and weights.
  - [Jam](#jam-growing-the-players-doodle): figures found in the doodle could be favored; first
    placed in v3.2, deferred beyond it (D238).
  - The settings-mutation flag could shift weights a little during a session.
- **Later, not v3:** writing whole sequences with a rhythm grammar set up front, with specific
  requirements such as doubling beat 1 of every third measure; the owner expects it in v4, v5 or
  v6 ([roadmap](../../roadmap.md#candidates-not-committed)).

### Presets

Recorded 2026-10-07 (D210), the owner: "Presets! that's the last but not least feature of v3."
Placed with the embellishment flags in v3.1 (D211). **Drafted in [presets.md](presets.md)** (draft v3,
approved by D233, which closed O135–O139, O161 and O162), within D228's frame as amended by
D229–D231; consolidated in [master spec Part B](master-spec.md#b6-presets).

- **Today.** The [musical profile preset](../../../docs/music/lexicon.md#musical-profile-preset)
  has two fixed values, Neutral and Jazz. Each sets the note vocabulary (which figures are
  allowed) and seven other controls; changing one of those seven afterward shows "Custom".
  Nothing is saved.
- **v3.1.**
  - **A few more built-in presets.** Which ones is open; the embellishment catalogue may suggest
    styles.
  - **Presets the player creates**, saved with v3.0's local persistence: the player names a set of
    settings and gets it back later. Today's "Custom" state is a natural starting point: save it
    as a preset.
- **Scoped down (D217).** The owner: "I might have been hasty here". Player-made presets and a
  few more built-in ones stay; a researcher proposes the built-in ones. Most presets would later
  carry gimmicks and specific rhythm patterns the app does not store today; those, storing
  rhythms and "favorites cues" are later features, not v3.
- **Research done:** [preset catalogue](../../../docs/music/preset-catalogue.md), nine candidates,
  all feasible with today's settings and rhythm grammar. Proposed short list: Gentle, Speed drill,
  Folk reel, Pop song, Modal (Dorian); Bebop once embellishment weights exist; Blues, Bossa and
  Baroque later (no swing, seventh chords, pentatonic scale or harmonic minor today). Main
  finding: a style mostly needs a **collection** (the scale or mode), which no preset can set
  today; without it only Gentle and Speed drill keep their character (O126, closed by D228: a preset never sets the collection). And until weights
  exist, Jazz-grammar chromatic notes are only about 1–1.5 % of notes, so jazz-flavoured presets
  sound nearly diatonic.
- **Settled by D228 or proposed in [presets.md](presets.md):** what a preset holds (the generation settings only, or also
  tempo, the audio mix, embellishment flags and weights, the instrument); whether built-in presets
  can be edited or only copied; renaming and deleting; how a player preset is exported or shared,
  if at all; and how presets meet [my instrument](#my-instrument), which is saved separately.

## v3.2 — Jam and the rhythm lock

**Consolidated 2026-10-08: [master spec, Part C](master-spec.md#part-c--v32)** (master spec v1.0,
awaiting the owner's approval of the consolidation and the owner's confirmation of the contract
wording it lists).

**Drafts** (2026-10-08, draft v2, approved by the owner: D232 for the rhythm lock, D234 for the
rest): [Jam](jam.md), [key and mode suggestion](key-and-mode-suggestion.md),
[rhythm lock, allowed rhythm changes, Vary settings' allowed groups and Jam's drift](rhythm-lock.md).
D234 closes O10 (for v3.2), O114 and O140–O157; D232 closes O103 and O151. No question stays open
in them. One wording waits for the owner: the declared-intent contract change O144 brings (the
quantized doodle travels with the music, in the replay key and kept sessions), confirmed at the
v3.2 master spec review ([Jam §8.1](jam.md#81-privacy-the-doodles-status-d234-o144)). Code facts:
[Jam grounding](jam-grounding.md), re-checked 2026-10-08. The sections below are the record the
drafts started from.

### Jam: growing the player's doodle

Recorded 2026-10-07 (D209), the owner's insight, in their words: "I've a doodle in mind, but I'm
not good enough to iterate on it. I give it to the app, and it generates matching phrases." This
is MIDI-seeded continuation (D53), named and given its purpose: v3's most complex part.

- **Name.** "Jam" (working name), proposed by the owner along with "improvisation". Jam is
  preferred: in music, improvisation means the player inventing on the spot, while here the app
  develops the player's idea; and "the Curious Improviser" is already P1's name
  ([personas](../../personas.md)). Musicians call the doodle a **motif**, and building on it
  (repeating, varying, moving it to other notes, changing its rhythm) **developing a motif**.
- **The core.** The player plays a motif, and the generator continues it. This extends v2's
  continuation from the app's own material to material the player plays. The doodle feeds the
  generator its [rhythm](../../../docs/music/lexicon.md#rhythm), its
  [contour](../../../docs/music/lexicon.md#contour) and its
  [interval](../../../docs/music/lexicon.md#interval) character, as the
  [product foundation](../../product-foundation.md) planned for the second deliverable; the
  generated phrases match it. It serves P3's C3, "grow an idea"
  ([personas](../../personas.md#p3--the-fledgling-composer-secondary-d61)).
- **The player-selected key and mode stay authoritative.** The app never switches them on its own
  (D209).
- **Prerequisite: stray notes.** A stray note from the controller would distort the doodle, so a
  minimum duration for a played note to count is needed first; it ships in v3.0
  ([stray notes](#stray-notes-from-controllers)).
- **When the generator starts** (D215). The doodle is one to four measures: it ends when the
  player leaves a whole measure silent, or when four measures have been played. At least one
  measure then passes before the first generated phrase sounds ("hopefully that's enough to begin
  something", the owner). A silent measure needs a measure grid, so the doodle is played over a
  click; at 240 BPM one measure is 1 s, a tight budget for the first generation.
- **Tempo** (O125, raised by the owner; settled by D216): the doodle is played over the app's
  click at the selected tempo, and the phrases after it keep that tempo. Working the tempo out
  from a freely played doodle is a later candidate.
- **The rest of the doodle** (O112, settled by D216): the silent measure that ends a doodle
  doubles as the generation measure (generation starts when a measure begins with no note
  sounding, and is dropped if the player plays again inside it); when a phrase is not ready, the
  wait extends measure by measure with the click going on, and v2's standalone fallback applies;
  the doodle is continued, not repeated. It steers the generator's ranking rather than imposing
  hard constraints ([Jam grounding](jam-grounding.md)).

### Key and mode suggestion

The owner's proposal (D209), aware that "it's highly possible to have multiple valid replies
depending on the size and content of the snippet". It reverses the earlier "automatic key
detection is not planned". **Placed in v3.2 (D211); the owner confirmed it is what they had in mind
(D212), with one change: when several answers fit, the app picks one by a weighted draw instead
of staying silent.**

- **Why several answers are valid.** The app's seven modes (Ionian to Locrian, with Major and
  Minor as other names for Ionian and Aeolian) share the same seven notes, each starting on a
  different one. Detection has two steps of very different difficulty:
  1. **Which set of notes.** Easier, but less than first thought: with five different notes, only
     10 of the 21 possible note groups fit a single set; with six, 5 of 7 do
     ([research](../../../docs/music/key-and-mode-estimation.md#step-1-which-set-of-notes)).
  2. **Which note is home** (the [tonic](../../../docs/music/lexicon.md#tonic), which decides the
     [mode](../../../docs/music/lexicon.md#mode)). Hard: the same notes are C Ionian or D Dorian
     depending on where the doodle settles. The clues are the first and last notes, the longest
     notes and the notes on strong beats, and a short doodle often doesn't decide.
- **Shape** (settled by D212 and D216):
  - The app suggests a key and mode, maybe with one or two alternatives; the player confirms or
    keeps their setting. The player's choice stays authoritative.
  - When the doodle fits the selected key and mode, nothing is suggested.
  - **Amended by D212.** When several answers fit, the app rates them and "casts a dice": a
    weighted draw among the most probable, so the likeliest answer comes up most often. The
    owner: "it's a jam so, in the end it's only so much important." The draw is seeded by the
    quantized doodle alone, so the same doodle always gives the same suggestion, across sessions
    too (D234, O149). The player confirms the drawn answer (D216).
  - Very short notes are ignored (the stray-notes filter, v3.0).
  - The suggestion changes no phrase until the player confirms it, and a confirmed suggestion is
    recorded as the key and mode settings it set, so no replay key carries it (D234). The earlier
    reason given here ("so a phrase replay key still reproduces a session") did not hold.
  - It is shown after the Jam, in its review and at Idle with a held doodle, never during the Jam
    (D234, O148): see the [draft](key-and-mode-suggestion.md#3-where-and-when-it-is-shown).
- **Research done:** [key and mode estimation](../../../docs/music/key-and-mode-estimation.md).
  No published method covers all seven modes on short melodies; the best on short single lines
  (Temperley's probabilistic model) picks among 24 major and minor keys. The method (D216,
  closing O113): score all 84 key and mode pairs from note roles weighted by length, with a bonus
  for a home first or last note; keep at most 3 candidates within half of the best; draw among
  them with a seeded draw in integers only (`Math.exp` can differ between browsers); compute in
  concert pitch and name the answer in written pitch. Reimplemented in TypeScript: Essentia is
  AGPL, music21 is Python. At least 5 pitch classes, 6 notes and 2 beats of sounding time are
  needed; nothing is suggested when the selection is among the candidates, or when under 80 % of
  the doodle fits the winner.

### Rhythm lock and mutation

Recorded 2026-10-03 (D175) as candidates reached through a new note-density value, Custom. D211
splits them: **the rhythm lock and its mutation option are v3.2**, designed with Jam, as the owner
expected them to "heavily link" (D209); the rhythm ratios and the rhythm editor, the "fine tuning
of rhythm", [move to v4](#moved-to-v4-rhythm-ratios-and-the-rhythm-editor). Settled by D232 and
D234; detail in the [rhythm lock draft](rhythm-lock.md).

- **Rhythm lock** (D232). When set, the rhythm does not change: the lock is strict, fixing every
  note start and length, and so every rest, across the four measures, while the pitches keep
  changing. Outside a Jam it locks phrase 1's rhythm, the phrase on screen at Start; in a Jam, the
  rhythm nearest the doodle that the rhythm grammar can write (the exact played rhythm needs v4's
  editor, O102). It is a switch of its own, not reached through the Custom note density (D216).
  D232 replaces D216's "what it holds" (the starts on beats 1 and 3 and the note counts) and
  removes the automatic, tension-driven rhythm changes of the first draft.
- **Allowed rhythm changes** (D232, D234). D175's "generation may bend it a little to create
  [tension and release](../../../docs/music/lexicon.md#tension-and-resolution)" becomes the
  player's option: a list of small edits from the
  [mutation catalogue](../../../docs/music/mutation-catalogue.md), empty by default so the lock is
  strict by default. Each change lasts one phrase; at most one per phrase, in a seeded share of
  phrases, somewhat more often on a tenser phrase when Tension across phrases is on; never shown.
  The v3.2 list and its reasons: [rhythm lock §3](rhythm-lock.md#3-allowed-rhythm-changes).
  **Wider mutation options are v4** ([v4](../v4/README.md#placed-here-proposed)).
- **Forced bend.** When the locked rhythm cannot make a phrase (Tension across phrases moves the
  phrase into a rhythm domain without it, say), the phrase takes the nearest rhythm that can, and
  the next phrase tries the locked one again. It is the search's fallback, not a player option.
- **Mutation, with a list of allowed mutations** (D211, the owner's words: "rhythm lock/mutation
  option (with a list of allowed mutations)"). Settled by D216 (O118) from the
  [mutation catalogue](../../../docs/music/mutation-catalogue.md): both readings, kept apart.
  Vary settings gets player-chosen **allowed groups** (six groups, checked for a legal move before
  they are accepted); under Jam, a **drift** control with three positions (Close, Near, Free;
  D234) orders the catalogue's mutations up to a distance, closest first. Vary settings keeps
  mutating key and mode when the player turns it on; D209's rule governs the suggestion only
  (O121).
- **Already settled with the settings-mutation flag** (D175; the flag is v2's, master spec §5):
  while the lock is set, a mutation cannot alter the rhythm durably. D232 keeps it: a rhythm
  change lasts one phrase.
- **Open:** nothing; D232 and D234 closed O103 and O114.

## v3.x — Learning from positive signals

The owner (D211): "would be great, but probably difficult to implement". It stays in v3 for now,
and will probably be removed entirely or moved to a later version. Not committed and not designed.

The owner's idea (D209): infer "silent approval" from how the player follows, or leaves, the
phrases the app provides. The owner's own caveat: players may "simply fail at following the
phrase". The personas sharpen it: P1 "can already play" and is a beginner at improvisation, but
struggles to read and play at speed
([personas](../../personas.md#p1--the-curious-improviser-primary-d48)), so a miss most likely
means "too fast or too hard to read", not "I don't like it".

- **Proposed rule (strawman, not decided): learn taste from positive signals only; a miss never
  counts against a phrase.**
  - **Positive: a deliberate departure that still fits.** The player leaves the written line but
    stays in the scale, fits the chords and keeps the pulse. This borrowed the definition of the
    end-of-measure chord-fit check, which D211 drops; learning would need that definition back
    (it stays in [v2 master spec §9](../v2/master-spec.md#9-the-end-of-measure-chord-fit-check)).
  - **Positive: the player repeats a fragment of a phrase, or comes back to their doodle.**
  - **Explicit: a [favorite](#favorites)** is a clean "more like this". It is marked after the
    session, since a running session never asks the player for anything.
  - **Difficulty, not taste: misses, late notes, silence on dense passages.** These could only
    ever adjust difficulty (tempo, density), never taste. The tempo that reacts to how the player
    plays was deferred from v2 to v3+ (D101; see [personas](../../personas.md)).
- **Tie-in: recognising played signals** (D212, D213, D214). The owner: "recognising specific
  pattern (we could very well have a 'now it's your turn' pattern or 'i disapprove' pattern that
  could be played and recognised)". Defined by D213: the player plays a specific bar, never
  displayed, and the app reads it as a message, not as notes of the phrase. It triggers an effect:
  approval, disapproval, or "that's my contribution, now generate the follow-up". Musicians call such a figure a **cue**; the spec
  says **played signal**, since the app already has a session cue row where the app speaks to the
  player (D214). A back-and-forth of "your turn" exchanges is **call and response**.
  - **Mandatory for the [endgame](../../vision/endgame.md)**, whose fights are call-and-response
    exchanges; "but it's maybe too early": v3.x, "maybe not even v3 at all" (D213).
  - **It refines the positive-only rule** (D213). Implicit signals stay positive-only and a miss
    never counts; a played signal is the player deliberately judging or steering, never the app
    judging the player, so a disapproval signal is allowed.
  - **Meets Jam.** The hand-off signal is one way to end a doodle (O112); without played signals,
    v3.2 needs another. The research recommends a pause or a fixed length there anyway (D214).
  - **Must not start a session:** at Idle, the starting note starts one (v2 master spec §6).
  - Research: [played-pattern recognition](../../../docs/music/played-pattern-recognition.md).
- **Bounds.** The guiding principle holds: acknowledge, never score; adaptation is opt-in and
  visible ([far vision](../../vision/far-vision.md)). Learning would be switched on by the player,
  show what it leans toward, and never reshape a jam because of mistakes. The permanent constraint
  of no wrong-note signal, grading or scoring
  ([v2 master spec §2](../v2/master-spec.md#2-scope)) applies.
- **Open:** O115, O116 ([register](../../open-questions.md#v3-jam-o112)).

## Moved to v4: rhythm ratios and the rhythm editor

D211 moves them to [v4](../v4/README.md#placed-here-proposed), with the Custom note density that
reaches them. Their content, as recorded in D175:

- **Rhythm ratios.** The player sets how likely each note value is to appear, from the
  [whole note](../../../docs/music/lexicon.md#whole-note) down to the
  [sixteenth note](../../../docs/music/lexicon.md#sixteenth-note).
- **Rhythm editor.** Two ways to give the rhythm: copy the rhythm of one of the bars, or enter a
  rhythm by hand.
- **Custom** (working name), a new [note density](../../../docs/music/lexicon.md#note-density)
  value, reached only through these; a mutation can never move note density into Custom, and
  while Custom is set a mutation may alter the ratios.
- **Open:** O100, O101, O102, now v4 questions.

## Dropped (D211)

The owner dropped these entirely on 2026-10-07. They are kept here so their old links still say
what happened to them.

### Controller connection ideas

Both from the 2026-10-06 hardware sitting. Bluetooth MIDI stays best-effort (D191).

- **Switch profile from the check** (D190): one control in the transposition check that switches
  to the instrument profile the controller matches.
- **A voluntary "Bluetooth" checkbox** (D192) in the connection sheet, giving played notes a little
  more timing tolerance over Bluetooth. The code's per-connection latency constants
  (`CONNECTION_LATENCY_SECONDS` in `src/domain/acknowledgement/played-onset-latency.ts`) stay as
  they are.

### Review tooling

From D128 (ux D64): selecting a passage to replay (which would also have meant adding review
playback), and showing what the phrase expected next to what the player played. The review stays
as v2 built it, extended to earlier sessions in v3.0.

### End-of-measure chord-fit check

Moved from v2 to v3 as a nice-to-have (D174); dropped by D211. Its definition (D108) and its
acceptance criterion stay in [v2 master spec §9](../v2/master-spec.md#9-the-end-of-measure-chord-fit-check)
and its build notes in the v2 build plan (chunks 32–34), as the record of a design that was never
built. The [learning candidate](#v3x--learning-from-positive-signals) borrowed its definition.

## Depends on

- v2's session model, played-note tracking, review and export.
- v2's continuation mechanism.
- **O10 (planner authority)**, before any change that couples planner stages; settled for v2
  only by D83 and reopened for Jam. See the [register](../../open-questions.md#v3-jam-o112).
- Code grounding for Jam: [jam-grounding.md](jam-grounding.md).
- Early building blocks: [prerequisites.md](../prerequisites.md), being drafted.
