# Jam — grounding research

Status: research v1 (2026-10-07)

Prepared by a grounding researcher for the v3.2 spec session on
[Jam](README.md#jam-growing-the-players-doodle), the
[rhythm lock and mutation](README.md#rhythm-lock-and-mutation) and the open questions O112, O114
and O118 ([register](../../open-questions.md#v3-jam-o112)), plus O10 (planner authority). It
reports facts and options. **Nothing here is decided.** Section C's shapes are proposals for the
session to weigh.

Plain words used below:

- **Motif**: a short musical idea, a few notes with their own rhythm and shape. The player's
  "doodle" is a motif. "Developing" a motif means reusing it with changes: repeating it, moving it
  to other notes, turning it upside down, stretching its rhythm. The motif-development techniques
  themselves are being catalogued in parallel in `docs/music/mutation-catalogue.md` (not yet
  published when this was written).
- **Quantising**: snapping played notes, which never land exactly on the beat, to the nearest
  position of a rhythmic grid. The app's grid is the [tick](../../../docs/music/lexicon.md#tick),
  one sixteenth note.
- **[Contour](../../../docs/music/lexicon.md#contour)**: the up-and-down shape of a melody.
  **[Interval](../../../docs/music/lexicon.md#interval)** character: which distances between
  neighbouring notes a melody uses ([steps](../../../docs/music/lexicon.md#step),
  [skips](../../../docs/music/lexicon.md#skip), [leaps](../../../docs/music/lexicon.md#leap)).
- **Trading fours** (in jazz): two players take turns, four measures each, each answering the
  other. "Call and response" is the general name for that answering.

## Contents

- [Summary: what matters most](#summary-what-matters-most)
- [A. What the code has today](#a-what-the-code-has-today)
- [B. Precedent](#b-precedent)
- [C. Options for the spec session (proposed)](#c-options-for-the-spec-session-proposed)
- [Gaps and follow-ups noticed](#gaps-and-follow-ups-noticed)

## Summary: what matters most

1. **Continuation already exists, but carries only one note.** v2's carry-in hands four items
   across a join: the last pitch with its leap state, the register window, the final chord (which
   may already be `null`) and the phrase number. Nothing about rhythm, contour or intervals
   crosses. A doodle can reuse the carry-in for "where to start from", but not for "what to sound
   like" ([A.2](#a2-continuation-today-the-carry-in)).
2. **Nothing in the generator repeats or develops melody today.** The rhythm grammar already
   builds every phrase as a two-bar gesture (bars 1–2) and a varied answer (bars 3–4), so rhythmic
   motif development exists in a fixed form. The pitch planner never reuses earlier pitches or
   intervals: it picks each note from a ranked list of candidates
   ([A.3](#a3-the-planner-stages-and-where-a-doodle-could-enter)).
3. **The generator can only produce rhythms its grammar can build.** Every rhythm is one of a
   pre-enumerated, seed-independent list per rhythm setting (up to 1,797), and the validator
   checks each against its own grammar provenance. A played rhythm cannot simply be imposed; it can
   be matched (pick the nearest candidates) or the grammar must learn a new "given gesture" path
   ([A.4](#a4-rhythm-generation-could-a-given-rhythm-be-imposed)).
4. **Nothing records or quantises a doodle today, and Idle has no pulse.** At Idle, MIDI is heard
   only to catch the starting note, which starts a session. A doodle played at Idle would start the
   session if its first note were that note. No click plays at Idle, and no code snaps played
   notes to the tick grid ([A.5](#a5-midi-capture-what-is-recorded-and-what-is-not)).
5. **Constraints cost time; preferences do not change feasibility.** The pitch search is the most
   expensive step (ISS-009). A doodle that only reorders candidates keeps every phrase feasible
   that is feasible today; a doodle that removes candidates can make searches fail and fall to the
   standalone rung, which must then not carry the doodle constraint
   ([A.7](#a7-performance-budget)).

## A. What the code has today

### A.1 The generation request and result contract

- **Two request types.** `GenerationIntent` (`src/domain/generation/generation-intent.ts`) is the
  player-facing request: id, seed, four measures, 4/4, the controls, the written tonal center, the
  musical profile, the instrument profile, the register intent and an optional `carryIn`.
  `GenerationRequest` (`generation-request.ts`) is the resolved core: id, seed,
  `measureCount: 4`, meter, active concert range, register, register window and optional
  `carryIn`.
- **Closed by construction.** `parseGenerationRequest` rejects any unknown field as a typed
  `GenerationRequestError` ([generator contract](../../generator-contract.md#generation-requests)).
  A doodle field is therefore not an "optional extension": it is a contract amendment on both
  types, the worker protocol (`rebuildGenerationWorkerIntent` in
  `src/generation-worker/generation-worker-inbound.ts`) and the replay key.
- **The result.** `GenerationResult` holds only the id, the seed and a `ConcertEventTimeline` of
  exactly four measures (a fixed 4-tuple in `src/domain/events/timeline.ts`). Harmony, rhythm and
  tension binding travel beside it as `GenerationProvenance`. Each note and rest has an empty,
  reserved `annotations` slot; no producer writes it.
- **The seams for evolving generators.** The
  [generator architecture](../../generator-architecture.md#candidate-musical-seams) lists a
  **phrase transformer** seam: "optionally derives material from a seed phrase. It is absent in the
  first deliverable and is added for MIDI continuation without replacing harmony, rhythm, or pitch
  planning." It is still absent. The rule is that the orchestration layer
  (`src/domain/generation/orchestration/generation-orchestrator.ts`, `generatePhrase`) connects
  planners; planners never call each other.
- **Four measures only.** `PHRASE_MEASURE_COUNT = 4`, and the timeline type refuses any other
  count. A one- or two-measure doodle cannot be a `ConcertEventTimeline` as it stands; it needs its
  own type (or padding, which would misrepresent it).

### A.2 Continuation today: the carry-in

v2 continues "from the app's own material"; Jam extends that to the player's material. The
mechanism is described in the
[generator architecture](../../generator-architecture.md#delivered-generator-continuation-v2) and
lives in `src/domain/generation/carry-in/`.

- **What crosses a join** (`CarryIn` in `carry-in.ts`): `lastPitch` (concert MIDI, the
  `arrivingInterval` that reached it, and whether a large leap's recovery is still owed),
  `registerWindow`, `finalHarmony` (chord and role with its endpoint class, **or `null`**) and
  `phraseNumber`.
- **The `null` harmony is already a supported form.** It was added for a key or collection change
  mid-session (`rule_key_change_drops_harmonic_carry_in`). With `null`, the carried pitch is "a
  tone of no chord", nothing is tense, and the whole harmony domain stays open
  (`harmonyCandidatesAfterCarryIn`). A doodle has no chord the app chose, so this form fits it
  without new machinery.
- **How a carry-in is built.** `deriveCarryIn` (`carry-in-derivation.ts`) replays a finished
  phrase's sounding notes through the pitch planner's own leap-state reducer. The same replay could
  run over a doodle's notes.
- **What the constructor refuses** (`makeCarryIn`): a last pitch outside the carried window; an
  arriving interval larger than an octave; an owed recovery not backed by a skip or leap; a phrase
  number that is not a positive whole number. A doodle can break all of these: it may end outside
  the register window, leap more than an octave, and has no session phrase number (phrase 0 is
  refused).
- **How the next phrase uses it.** `carriedMotionState` (`src/domain/pitch/pitch-carry-in.ts`)
  seeds the pitch search with the carried pitch as "the note before beat 1": the first interval
  obeys the same caps and leap budget as two notes inside a phrase, and an owed recovery falls due
  on the first note.
- **What a phrase may end owing.** `phraseEndingDebtAllowance` (`phrase-ending-debt.ts`) is the
  single place that decides it; the validator reads the same function.
- **Only forward.** No stage of phrase N+1 revises phrase N (D83). The entity atom
  `entity_phrase_carry_in` states "exactly four items"; adding motif data to the carry-in would
  amend it.

### A.3 The planner stages and where a doodle could enter

`generatePhrase` builds the harmony domain, looks up the rhythm domain, ranks both with the seed,
resolves the register window(s), then `searchWindow` (`window-search.ts`) walks harmony ×
rhythm pairs, each pair's tension bindings, and runs the pitch search for each binding until one
plan validates.

| Stage                                                                           | What it decides today                                      | Its inputs                                                                                           | Where the doodle's **rhythm / contour / intervals** could enter                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| ------------------------------------------------------------------------------- | ---------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Harmony (`src/domain/harmony/harmony-planner.ts`, `makeHarmonyCandidateDomain`) | Chord events per quarter, phrase roles, endpoint class     | Tonal center, collection, harmonic motion, tension, profile. No seed, no rhythm, no pitch            | Not naturally. Choosing chords to fit the doodle's pitches would let pitch facts shape an earlier stage: the O10 coupling. Ranking harmony candidates by fit to the doodle's notes is possible but is still "pitch informing harmony"                                                                                                                                                                                                                                                                      |
| Rhythm (`src/domain/rhythm/rhythm-planner.ts`)                                  | Every onset, duration, rest and tie                        | Note density, rhythmic variety, silence density, syncopation, tension arc                            | **Rhythm**: rank candidates by closeness to the doodle's rhythm (soft), filter them (hard), or add a "given gesture" path to the grammar (new grammar version) — see A.4                                                                                                                                                                                                                                                                                                                                   |
| Tension binding (`makeTensionBindingDomain`)                                    | Where the tension the harmony asks for lands on the rhythm | Harmony × rhythm                                                                                     | Indirect only                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| Pitch (`src/domain/pitch/`, `searchPitchPlan`)                                  | Every concert pitch                                        | Harmony, rhythm, binding, window, contour, leapiness, arpeggio chaos, profile capabilities, carry-in | **Contour**: the contour check works on four checkpoints, one per bar (`pitch-contour.ts`); a doodle's shape could pick one of the four named contours, or a new contour kind with its own checkpoint pattern. **Intervals**: `LEAPINESS_LIMITS` (`pitch-motion.ts`) sets the largest interval and leap budgets; a doodle's widest interval could select a level. Interval _preference_ could enter candidate ordering (`pitchRank` in `pitch-ranking.ts`, `orderCandidates`) without touching feasibility |
| Orchestration (`window-search.ts`, `timeline-assembly.ts`)                      | Order of search; assembly                                  | Ranked domains                                                                                       | A "phrase transformer" step (A.1) that derives material from the doodle, or pins the doodle's own notes                                                                                                                                                                                                                                                                                                                                                                                                    |

Facts that shape the choice:

- **The rhythm grammar already develops a motif.** Bars 1–2 are gesture A: bar 2 recurs a one-beat
  cell of bar 1, exactly or with one substitution. Bars 3–4 start as copies of bars 1–2 and receive
  one answer transform (Settled or Lift tension) or one or two (Build or Edge): move a rest, displace
  an attack, redistribute a note pair, or swap the final pattern. At least half of the gesture's
  attack positions must survive. See
  [rhythm policy, "Four-bar gesture and answer"](../../../docs/music/rhythm-phrase-structure.md#four-bar-gesture-and-answer)
  and the lexicon's [gesture and answer](../../../docs/music/lexicon.md#gesture-and-answer). A
  two-measure doodle maps naturally onto gesture A, and the tension arc already sets "how much the
  answer changes", which is close to what a mutation amount would mean.
- **The melody has no motif memory.** The rhythm candidate carries a `recurrence` witness, and the
  rhythm policy says pitch planning "may use the witness to relate melodic material", but no pitch
  or validation code reads it (`grep recurrence src/domain/pitch src/domain/validation` finds
  nothing). Repeating or sequencing the doodle's pitches is new pitch-planner behaviour.
- **Contour is coarse.** Only checkpoint pitches count (each bar's first fresh attack on beat 1 or
  3); decorative notes may move against it
  ([pitch policy, "Contour checkpoints"](../../../docs/music/pitch-planner-validation.md#contour-checkpoints)).
  A one-bar doodle has a single checkpoint, so its own "contour" in this sense is undefined; its
  note-to-note directions are the usable shape.
- **O10, planner authority.** O10 asks whether a later planner stage may revise an earlier one
  without re-coupling the stages. D83 (archived in
  [decisions D72–D108](../../archive/v2/decisions-D72-D108.md)) settled it for v2 by deferring it
  to v3: carry-in only flows forward. For Jam it matters in two places: (1) letting the doodle's
  pitches pick or bias the chords, and (2) "quoting" the doodle inside a generated phrase, where
  the pinned notes come from outside and harmony, contour and leap rules must accept them instead
  of producing them. Shapes that feed the doodle only into rhythm ranking and pitch ordering keep
  the stages decoupled and do not reopen O10.

### A.4 Rhythm generation: could a given rhythm be imposed?

- **A finite, enumerated domain.** For each of the five rhythm controls the grammar
  (`rhythm-mvp-v2`) enumerates every legal four-bar rhythm once, seed-independently, in a fixed
  order. The canonical memo (`canonical-rhythm-domain.ts`, `SHARED_CANONICAL_RHYTHM_DOMAIN_MEMO`) is
  keyed on those five controls only; the Idle prewarm (`rhythm-domain-prewarm.ts`) fills it in
  ~8 ms slices. The worst domain has 1,797 candidates and took 823 ms cold, 228 ms warm, in the
  browser ([generation latency](../../../docs/generation-latency.md)).
- **Order today is pure seed.** `rankMaterializedRhythmCandidates` (`candidate-ranking.ts`) sorts
  candidates by a seeded hash, ties by index. There is no musical ranking of rhythms, so a
  "closeness to the doodle" key could be added in front of the seed key, per request, over at most
  1,797 candidates.
- **Hard rules every rhythm must pass** (`validateRhythmCandidate`, `rhythm-validator.ts`): each
  bar tiles 16 ticks; no all-rest bar; a note sounding on beat 1 or 3 in every bar (metrical
  anchor); the phrase opens with a fresh attack on bar 1, beat 1 (`rule_phrase_starts_on_downbeat`);
  attacks per bar inside the density's band; phrase rest total inside the silence band; no rest
  over 8 ticks; syncopation counts; and **grammar provenance** (`hasValidNominalProvenance`,
  `hasRenderedTransformAlgebra`): every event must trace back to the grammar's beat cells and
  transforms.
- **What this means for a played rhythm.**
  - A doodle rhythm is generally **not** in the domain: its note values may not be in the current
    density's beat-cell catalog, it may open with a rest or a pickup, hold a rest longer than half a
    bar, or have more or fewer attacks than the density band allows.
  - **Imposing it** needs a new grammar path that accepts given bars 1–2 with their own provenance
    kind, and a validator change; that is a new grammar version and new golden fixtures.
  - **Matching it** (rank or filter the existing domain by distance to the doodle) needs no
    grammar change. Filtering can empty the domain (`no_legal_rhythm_plan`).
  - The rhythm lock (O103, O114) faces the same choice: hold "a candidate of the domain" (cheap)
    or "any rhythm" (grammar work).
- **Six to zero settings have no legal rhythm** depending on rhythmic variety
  (`rule_unsupported_rhythm_settings_block_generation`); a doodle-derived setting must not land on
  one of them.

### A.5 MIDI capture: what is recorded, and what is not

- **Per played note** (`src/midi/played-note-tracker.ts`, `RecordedPlayedNote` in
  `src/session/session-history.ts`): concert pitch, velocity (1–127), `onsetAt` and `releaseAt`
  in audio-clock seconds. Input is omni; the channel is never used. A new note-on for a pitch still
  held ends the earlier one. Several different pitches can be held at once: the tracker is not
  monophonic, so a doodle would need a rule for overlaps (legato playing) and chords.
- **Clock and latency.** `midiTimestampToAudioTime` (`src/midi/midi-clock-mapping.ts`) maps the
  Web MIDI timestamp onto the audio clock. `compensatePlayedNote`
  (`src/domain/acknowledgement/played-onset-latency.ts`) then removes output latency
  (`OUTPUT_LATENCY_SECONDS = 0`) and connection latency (USB 0; the Bluetooth LE entry is unused).
  The session history stores compensated times.
- **At Idle.** `createSessionMidi` (`src/components/workspace/workspace-session-midi.ts`) hears
  every note, but `onIdleNote` acts only on the **starting note** (phrase 1's first attacked note,
  exact pitch, `src/session/starting-note.ts`), and that note starts the session. Every other note
  at Idle "does nothing at all": it is neither recorded nor shown. **Consequence for O112's
  proposal (doodle played at Idle):** a doodle whose first note equals the starting note would
  start a session today; a doodle-recording state must switch the starting note off, or the
  doodle is captured some other way.
- **The audio clock at Idle.** The one `AudioContext` is created by `unlock()` inside a click
  (Start, or "Connect controller"); a MIDI note cannot unlock it
  ([audio transport](../../../docs/audio-transport.md)). A player who connected a controller has
  an unlocked clock at Idle, so onsets have audio times. **No pulse plays at Idle**: the click and
  the one-measure count-in exist only in a session (`click-track.ts` has the beat grid, `beatAt`).
- **No quantisation anywhere.** Played notes are kept unquantised on purpose: the review lane and
  the played-notes export place them by their exact times
  (`rule_played_notes_export_unquantized_timing`, `src/export/midi/played-notes-placement.ts`),
  and MusicXML never holds played notes because "quantizing it would misrepresent what was actually
  played". Jam is the first place that must turn played notes into ticks.
- **What Jam needs to put a doodle on the grid:**
  1. a time origin and a tempo: a count-in and click while recording (the tempo control already
     exists at Idle), or tempo and downbeat inference from free playing (much harder, and a short
     doodle often does not decide it);
  2. the stray-note filter, a minimum duration for a note to count (v3.0.1, threshold not
     decided; [stray notes](README.md#stray-notes-from-controllers));
  3. a monophonic reduction rule for overlaps and chords;
  4. snapping onsets and releases to ticks (a sixteenth is 62.5 ms at 240 BPM, 250 ms at 60 BPM),
     with a rule for notes that collide on one tick;
  5. a rule for a doodle that breaks the grammar's hard rules (pickup, long rest, no anchor):
     refuse, adjust, or accept as the player's own (this is O102's question, which moved to v4
     with the rhythm editor, coming back through Jam).
- **Transposition.** The controller sends concert pitch (D72); the key is chosen in written pitch.
  The generator works in concert pitch, so the doodle's pitches can enter as they arrive.

### A.6 Determinism and the phrase replay key

- **Determinism.** The same intent and seed give the same phrase byte for byte
  (`rule_seeded_phrase_reproduction`); randomness comes from named streams of one seed
  (`module_named_stream_pseudorandomness`); every sort uses code-unit order since ISS-010.
- **The replay key** ([`module_phrase_replay_key`](../../../docs/module_phrase_replay_key.atom.md);
  `src/generation-worker/phrase-replay-key.ts`, `phrase-replay-key-decode.ts`): `ifk1.` + base64url
  of a 7-tuple (request id, seed, the 14 controls, profile, custom flag, phrase number, carry-in or
  null). The atom says the key "holds no played notes". It is printed to the console only, never
  sent or stored.
- **What a reproducible Jam session needs.** A doodle is a generation input, so every phrase it
  shapes must carry it, and the key must too: either an 8th slot (a new `ifk2.` version; the atom
  allows a version bump, and every `ifk1.` key must still decode) or the doodle inside the
  carry-in. Store the **quantised** doodle (ticks, concert pitches, maybe the tempo it was
  quantised at), not raw seconds: floats from the audio clock are not a stable key, and
  re-quantising would tie replay to the quantiser's version. Anything derived from it (rhythm
  distance, interval profile, chosen contour) should be computed inside generation, purely, so a
  key replays without the app state.
- **Size.** A two-measure doodle at sixteenth density is at most 32 attacks; a few hundred bytes of
  JSON. No problem for a console line.
- **Privacy.** v2 promises played notes never leave the device without the player's export, and
  are not kept across sessions without opt-in (D69, `rule_session_data_never_sent_or_stored`). A
  doodle in the replay key puts played notes in the console line; harmless locally, but it
  contradicts the key atom's "no played notes" wording, which would need amending. Keeping a doodle
  across sessions (v3.0 persistence) would fall under the same opt-in as played notes.

### A.7 Performance budget

- **Deadlines.** Phrase 2 is due one measure after Start (the count-in); phrase N+1 is due three
  measures after phrase N starts: 3 s at 240 BPM, 12 s at 60 BPM ([session engine](../../../docs/session-engine.md)).
- **The failure ladder** (`src/session/failure-ladder.ts`, `rule_session_generation_failure_ladder`):
  a carry-in attempt, carry-in retries, then a standalone attempt; if nothing is ready at the
  deadline, the phrase before repeats. Since D203 the ladder is time-aware: carry-in retries give
  way when less than the **standalone reserve, 1.075 s** (0.95 s budget + 0.125 s worker respawn),
  is left, and a dropped attempt is cancelled on the worker
  ([reserve constants](../../../docs/generation-latency.md#failure-ladder-reserve-constants-2026-10-07)).
  At 240 BPM, phrase 2 is therefore always generated standalone (owner ruling for v2.0).
- **Fuel.** The search is metered by fuel units, not time: 250,000 per window standalone and at
  Idle (`DEFAULT_WINDOW_SEARCH_FUEL`), 160,000 with carry-in (`CARRY_IN_WINDOW_SEARCH_FUEL`), in
  `search-ledger.ts`. One unit costs 2–51 µs, so fuel does not bound time by itself.
- **ISS-009** ([issue](../../../issues/Ref_20261006_failed_carry_in_attempts_slow.md)): failed
  carry-in searches took 6–13 s (one 28 s) and were retried identically; successes took 280 ms at
  most. Fixed by a faster search, the smaller carry-in allowance, skipping retries after an
  exhausted search, and the time-aware ladder: 0 of 568 sweep cases now repeat a phrase.
  **The lesson for Jam:** a constraint that makes searches fail is expensive, and failures are what
  the published latency figures do not show. Any Jam shape needs a real-cost sweep like
  `npm run test:sweep`, over doodles as well as settings.
- **ISS-010** ([issue](../../../issues/Ref_20261007_locale_dependent_candidate_order.md)): sort
  order used locale collation; now code-unit order. Any new doodle-based ranking must sort the
  same way.
- **What a motif constraint could cost in the pitch search:**
  - _Ordering only_ (prefer candidates whose interval from the previous note matches the doodle's
    interval at that position, or its interval profile): the candidate domains and every rule are
    unchanged, so feasibility is exactly today's. The first plan found changes, and fuel used may
    go up or down, still capped. The orderings memo in `searchPitchPlan` keys on (attack, required
    MIDI, prior MIDI); a position-dependent preference stays inside that key, an "interval profile
    so far" preference would not and would cost memo hits.
  - _Hard filtering_ (only intervals the doodle uses, or pinned pitches): smaller domains make the
    search cheaper when it succeeds and much more likely to be exhausted when it does not. Each
    exhausted search falls to the next rung. If the doodle constraint sits in the intent (not in
    the carry-in), the **standalone rung keeps it**, so the session's safety net would carry the
    risk too; the shape needs a doodle-free last rung or must put the constraint where the
    standalone rung drops it.
  - _Rhythm filtering_: shrinks harmony × rhythm pairs; a filtered-out domain fails before any
    pitch work (`no_legal_rhythm_plan`), which is cheap but leaves nothing to play.
  - _A doodle-specific rhythm domain_ (new grammar path): a memo miss per doodle, a cold build up
    to ~0.8 s in the browser for the worst setting; it could be prewarmed when the doodle is
    accepted, at Idle, before Start.
- **Pre-generation at Idle** (v3.0.1, [O107–O111](../../decisions.md))
  would remove deadline pressure from the first Jam phrases: a doodle recorded at Idle could be
  continued with no deadline before Start.

## B. Precedent

| #   | System                                                    | Approach                                                                                                                                | Latency / timing                                                                                                      | Runs in a browser?         | Uses the player's rhythm?                                                              |
| --- | --------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- | -------------------------- | -------------------------------------------------------------------------------------- |
| J1  | Continuator (Pachet, Sony CSL)                            | Learns variable-order Markov models of what the player plays, continues in that style                                                   | Detects a phrase end after a silence of about 400 ms, then answers "immediately"; answer usually as long as the input | No (desktop, 2002–2003)    | Yes, unquantised: rhythm is learnt with the notes                                      |
| J2  | GenJam, interactive (Biles)                               | Genetic algorithm; in trading fours it maps the human's four bars onto its own chromosome representation and applies mutation operators | Mutations applied "in the last 1/32 note (roughly)" of the human's four                                               | No                         | Yes, quantised to an eighth-note grid                                                  |
| J3  | Impro-Visor active trading (Keller et al.)                | Rule- and grammar-based response modes on the user's bars                                                                               | Live MIDI at 160 BPM in the paper's example, trades of 1+ bars                                                        | No (Java desktop)          | Yes                                                                                    |
| J4  | Magenta AI Duet / Magenta.js MusicRNN                     | Neural network (LSTM) continues a sequence                                                                                              | AI Duet sends MIDI to a server; Magenta.js runs in the browser (TensorFlow.js)                                        | Magenta.js yes; AI Duet no | Yes, input "must be quantized"                                                         |
| J5  | Band-in-a-Box Soloist (PG Music)                          | Generates solos over a song's chords from soloist profiles; has a "Trade 4s" option                                                     | Offline generation for a song                                                                                         | No (desktop)               | Not shown in the sources found: it generates over the chords, not from the user's bars |
| J6  | OMax (IRCAM)                                              | Factor oracle learnt live from the musician, "stylistic reinjection"                                                                    | Live co-improvisation                                                                                                 | No                         | Yes                                                                                    |
| J7  | Rule-based motif development (Computoser; Jacob's nebula) | Seed motifs varied by transposition, inversion, retrograde, rests, then sequenced                                                       | Offline                                                                                                               | No                         | Their own motifs                                                                       |

### J1 — The Continuator

- Pachet, F., "The Continuator: Musical Interaction With Style", _Journal of New Music Research_
  32(3), 2003, 333–341. <https://www.francoispachet.fr/?p=4360>. Supports: variable-order Markov
  models learnt from the player; real-time stylistic continuation; "extending the player's ideas
  without merely copying them".
- Addessi, A. R. and Pachet, F., "Experiments with a musical machine: musical style replication in
  3–5-year-old children", _British Journal of Music Education_ 22(1), 2005.
  <https://www.francoispachet.fr/wp-content/uploads/2021/01/pachet-04j.pdf>. Supports: phrase end
  detected by "a (dynamic) temporal threshold (typically about 400 milliseconds)"; the answer's
  length "set to be the same as the duration of the last input phrase"; priority to the user (the
  system stops when the player plays); output shown "without rhythmic quantisation".
- **Transfers:** the turn-taking rules (silence ends the doodle; answer length tied to the
  doodle's) are a ready answer to O112's "until they stop". **Does not transfer:** a learnt
  statistical model is not rule-based, and it continues style, not key: it has no notion of the
  player's chosen key and mode staying authoritative (D209) or of the app's grammar and validator.

### J2 — GenJam (interactive)

- Biles, J. A., "Interactive GenJam: Integrating Real-Time Performance with a Genetic Algorithm",
  ICMC 1998. <https://genjam.org/wp-content/uploads/2019/07/bilesicmc98.pdf>. Supports: it
  "listens to the human's last four measures, maps what it hears to its chromosome representation,
  mutates the chromosomes, and plays the result as its next four"; it "quantizes each measure into
  8 eighth-note-length windows"; pitches are matched to the nearest degree of the chord's scale;
  three event kinds per window (new note, hold, rest); measure mutations reverse, rotate, invert,
  transpose; phrase mutations reverse, rotate, repeat, and "sequence phrase" (start with the
  human's final measure, repeat it, fill the rest).
- **Transfers best of all the sources.** It is the closest model of "doodle → quantise onto the
  app's grid → develop by named operations", it is deterministic if its random choices come from a
  seed, and its operators are cheap. Its scale-degree representation is close to how the app
  could describe a doodle independently of key (see C1). Its "mutation" is literally a list of
  allowed operators, one reading of O118.

### J3 — Impro-Visor active trading

- Kondak, Z., Konst, M., Lessard, C., Siah, D. and Keller, R. M., "Active Trading with
  Impro-Visor", Proceedings of the Fourth International Workshop on Musical Metacreation (MUME), 2016. <http://musicalmetacreation.org/mume2016/proceedings/Kondak_Impro_Visor.pdf>. Supports:
  response modes on the user's bars: **repeat and rectify** (repeat, moving each note that is not
  a chord or color tone to the nearest one, so it "will sound 'inside'"); **modify and rectify**
  ("inversion, reversal, and time dilation or compression, then rectifies the result" for
  "modest, but recognizable uses of the melody"); **abstract melody** (notes replaced by their
  category, chord tone or color tone, "while retaining durations", plus "slopes" giving "lines
  shaped like the original, but not necessarily identical to it", re-instantiated over the
  harmony); **transform** (grammar-specified transformations such as passing tones, turns,
  neighbour tones); **chop and memorize** (keep segments for later reuse); and a trade length of
  "any integral number of bars, from a single bar on up".
- Impro-Visor papers index: <https://www.cs.hmc.edu/~keller/jazz/improvisor/papers.html>, which
  also lists Putman and Keller, "A Transformational Grammar Framework for Improvisation" (2015).
- **Transfers:** "abstract melody" is a worked example of the doodle as rhythm + contour slopes +
  note categories, instantiated by a rule-based generator over its own chords (C1). "Rectify" is a
  worked example of fitting a quoted motif to the app's harmony (C3). Their transformations overlap
  the embellishment flags (v3.1).

### J4 — Magenta AI Duet and Magenta.js

- "A.I. Duet" experiment, Google Creative Lab, 2017:
  <https://magenta.tensorflow.org/2017/02/16/ai-duet>; source and architecture:
  <https://github.com/googlecreativelab/aiexperiments-ai-duet>. Supports: "The front-end client
  creates short MIDI files using the players's input which is sent to a Flask server. The server
  takes that MIDI input and 'continues' it using Magenta and TensorFlow."
- Magenta.js `MusicRNN.continueSequence`:
  <https://magenta.github.io/magenta-js/music/classes/_music_rnn_model_.musicrnn.html>. Supports:
  the input sequence "Must be quantized"; optional `temperature` (randomness), argmax otherwise;
  optional chord-progression conditioning.
- **Transfers:** even an ML continuation in the browser quantises its input first, as Jam must.
  **Does not transfer:** a neural model breaks the rule-based, versioned, golden-tested generator;
  its output does not pass the app's grammar and validator; model weights are a large download.

### J5 — Band-in-a-Box Soloist

- Wikipedia, "Band-in-a-Box": <https://en.wikipedia.org/wiki/Band-in-a-Box>. Supports: the
  soloist feature (late 1997) generates solos over a song's chords in the manner of chosen
  players.
- PG Music, MIDI Soloist sets: <https://www.pgmusic.com/addons.soloists.php>. Supports: solos
  generated "to go with your song" from soloist profiles. A "Trade 4s" option is mentioned in a
  user tutorial found by search, but no source found shows it continuing the user's own bars.
- **Transfers:** little for Jam itself: it is the "generate over chords" model the app already
  has. Its style profiles parallel v3.1 presets.

### J6 — OMax

- Assayag, G., Bloch, G. et al., OMax at IRCAM; overview in Assayag, "Improvising in Creative
  Symbolic Interaction" (RMPD 2006):
  <https://archive.grame.fr/Recherche/Rencontres/Ressources/RMPD/RMPD2006/pdf2006/assayag.pdf>;
  OMax 5 tutorials: <https://forum.ircam.fr/article/detail/omax5-tutorials/>. Supports: a factor
  oracle learnt live from the musician; "stylistic reinjection" of recombined material.
- **Transfers:** the idea of _recombining fragments of the player's own material_. Like J1 it is
  learnt and recombinative, not rule-based over a chosen key.

### J7 — Rule-based motif development

- Bozhanov, B., "Computoser — rule-based, probability-driven algorithmic music composition", 2014. <https://arxiv.org/pdf/1412.3079>. Supports: variations by transposition, inversion,
  retrograde, replacing notes with rests.
- Jacob, B. L., "Theme development in algorithmic composition" (nebula):
  <https://user.eng.umd.edu/~blj/algorithmic_composition/nebula.html>. Supports: phrases built from
  seed motives varied by simple transformations, then sequenced.
- **Transfers:** these are the operator vocabulary of the mutation catalogue
  (`docs/music/mutation-catalogue.md`). Each operator is cheap and deterministic, but its output
  must still pass the app's rules (leap budget, contour, register window, harmony), which is where
  the cost lands (A.7).

### What transfers to this app, in one list

- **Quantise first** (J2, J4); keep the grid coarse enough for the doodle's tempo (J2 uses
  eighths).
- **Describe the doodle relative to the key and the chords** (J2's scale degrees, J3's note
  categories), so it can be re-instantiated in the player's key and mode, which stay authoritative.
- **Keep rhythm and shape separate from exact pitches** (J3's abstract melody): this is what the
  product foundation asked for ("rhythm, contour, and interval character").
- **Fit quoted material to the harmony** ("rectify", J3) rather than choosing harmony from the
  doodle (avoids O10).
- **Mutation as a list of named operators** (J2, J3, J7), drawn with the seed.
- **End of the doodle by silence** (J1) is proven and simple, but needs a pulse to quantise
  against (A.5).

## C. Options for the spec session (proposed)

Three shapes. They are not exclusive: C2 can be combined with C1 or C3. Costs are rough sizes in
this codebase (S, M, L, as in [prerequisites](../prerequisites.md)).

### C1 — The doodle as a profile (rhythm template + contour + interval profile)

**What it is.** The quantised doodle is reduced to a small, key-independent profile: its rhythm
template (onset and rest positions in ticks, per bar), its note-to-note directions and its
interval sizes in scale steps. The profile rides in the intent. Generation uses it as
**preferences**: rhythm candidates are ranked by distance to the doodle's rhythm before the seed
key; pitch candidates are ordered to favour the doodle's interval at that position; the contour
and leapiness controls in effect may be derived from the doodle (or shown as a suggestion, like the
key and mode suggestion). Mutation could be the weight of the preference, or how many phrases
before it fades. Close to J3's "abstract melody".

- **What it changes.** `GenerationIntent` and `GenerationRequest` gain a field (contract amendment,
  worker protocol, `ifk2.` replay key); `rankMaterializedRhythmCandidates` gains a distance key;
  `orderCandidates`/`pitchRank` gain a preference term. No grammar change, no new validator rule.
- **Cost: M.** **Risk: low for performance**: feasibility is unchanged, so the failure ladder and
  ISS-009's evidence still hold; fuel used per success may shift and needs a re-sweep.
- **Risk: musical.** Phrases may only _resemble_ the doodle: if its rhythm is not in the current
  setting's domain, the nearest candidate may be far from it, and nothing quotes its pitches. "Does
  it sound like my doodle?" needs listening tests. The rhythm lock (O114) maps simply onto it: hold
  the nearest candidate's rhythm across phrases.
- **O10:** not touched.

### C2 — The doodle as phrase 0, carried into phrase 1

**What it is.** The doodle is treated as "the phrase before phrase 1": a carry-in is derived from
it (its last pitch, the leap state that arrived there, the register window, `finalHarmony: null`),
and phrase 1 continues from it exactly as v2 continues from its own phrases. This is the literal
reading of "continued rather than repeated" in O112's proposal.

- **What it changes.** A carry-in derivation from played notes (reusing `deriveCarryIn`'s
  reducer); rules for a doodle the carry-in constructor refuses (last note outside the register
  window, a leap over an octave); a decision on the phrase number (the constructor refuses 0;
  number the doodle 1 and generated phrases from 2, or amend the rule). The replay key already
  holds a carry-in, so the format may not change at all.
- **Cost: S.** **Risk: low** (it is the v2 path, whose cost is measured).
- **Risk: musical.** It continues _from_ the doodle's last note but carries none of its rhythm,
  contour or intervals; on its own it does not meet "generated phrases match it". It also says
  nothing about phrases 2 onward, which only see the previous generated phrase. Best as the "join"
  half of C1 or C3.
- **O10:** not touched (only forward).

### C3 — The doodle quoted, then developed

**What it is.** Phrase 1 opens with the doodle itself as gesture A (bars 1–2, quantised and fitted
to the app's grammar and harmony, J3's "rectify"), and the generator writes the answer (bars 3–4)
with its existing answer transforms. Later phrases develop it with named operators from the
mutation catalogue (sequence it to other scale degrees, invert its contour, augment or diminish its
rhythm), drawn with the seed; mutation is the list of allowed operators and how many apply (O118).
This is the closest match to "the generator continues and develops it", and to GenJam (J2).

- **What it changes.** A "given gesture" path in the rhythm grammar (new grammar version, new
  provenance kind, validator changes, new goldens); pinned pitches in the pitch search (a domain of
  one for each quoted note); a rule for doodle notes that break phrase rules (leap budget, contour
  checkpoints, register window, a non-chord tone on beat 1): refuse, rectify, or exempt quoted
  notes from the validator; the replay key carries the doodle; and the phrase transformer seam
  (A.1) is built for the first time.
- **Cost: L.** **Risk: high.**
  - _Performance:_ pinned notes and transformed rhythms shrink the search space; exhausted
    searches become likely for some doodle × setting pairs; the standalone rung must drop the
    quote, or the session repeats phrases. Needs a sweep over doodles.
  - _Musical:_ the harmony was chosen without the doodle, so the quoted notes may clash; fixing it
    by choosing chords from the doodle is the O10 coupling, and fixing it by rectifying changes the
    player's notes.
  - _Contract:_ it amends `rule_phrase_starts_on_downbeat` if the doodle has a pickup, and the
    "exactly four items" carry-in atom if development state crosses joins.
- **O10:** touched. Pitch facts (the doodle) would shape harmony and rhythm, or the validator would
  have to accept notes no planner chose.

### Choices every shape needs (for the session)

- **Capture (O112):** at Idle with a count-in and click while recording (needs the starting note
  switched off during recording), or in a session (the session already has a pulse, and the doodle
  could be played over the backing; but a running session never asks the player for input, per the
  owner's design rule). Length: one or two measures fits gesture A; "until they stop" needs J1's
  silence rule and a cap.
- **Quantisation:** grid (sixteenth, or the selected note density's grid), tie-breaking, overlap
  and chord reduction, stray-note threshold.
- **Out-of-rule doodles:** refuse with a reason, adjust, or accept.
- **Reproducibility:** the quantised doodle is a generation input and goes in the replay key.
- **Fallback:** the last rung of the failure ladder must still produce a phrase without the doodle
  constraint.

## Gaps and follow-ups noticed

- **O10 is not in the live register.** The [v3 README](README.md#depends-on) and the
  [roadmap](../../roadmap.md) send readers to the register for O10, but O10 was resolved by D83
  ("deferred to v3") and now lives only in the archive. If v3 needs the question again, it needs
  re-opening (as O10 or a new id).
- **"Motif" is not in the lexicon.** Nor are quantise, sequence (the melodic technique), inversion,
  retrograde, augmentation or call and response. The mutation catalogue may add some.
- **Two "mutations".** v2's settings-mutation flag (`src/session/settings-mutation.ts`, changes a
  setting at phrase boundaries) and Jam's "mutation" (how far phrases drift from the doodle) share a
  name; O118 already asks which is meant.
- **The tension arc already sets how much the answer changes** (one answer transform for Settled
  or Lift, one or two for Build or Edge); a Jam mutation amount could reuse or collide with it.
