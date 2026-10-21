# v3.2 re-scope — Jam as its own mode

Status: draft v3 (2026-10-21), settled; v3 points at Part C v1.2. Opened by the owner's direction of 2026-10-21
(D400–D405) and settled by the owner's answers the same day (D406–D408): every question is
closed. Four answers are provisional until the owner's checks confirm them (D406, §3.1).
Consolidated into [master spec Part C](master-spec.md#part-c--v32) v1.1 on 2026-10-21 (D409);
Part C v1.2, approved by the owner the same day (D410), writes in the seven answers v1.1 proposed
and the design's seven (D411). Part C is the record; where this document differs, Part C wins, and the item numbers this
document cites from Part C §C16 are v1.0's. The three v3.2 drafts
([Jam](jam.md), [key and mode suggestion](key-and-mode-suggestion.md),
[rhythm lock](rhythm-lock.md)) change where this document differs (D405).

Serves P3, the Fledgling Composer, C3 "grow an idea"
([personas](../../personas.md#p3--the-fledgling-composer-secondary-d61)), as Part C's Jam did.
Words: as in [Part C §C4](master-spec.md#c4-words-used-in-this-part). **Doodle** stays the app's
word for the player's [motif](../../../docs/music/lexicon.md#motif); **session mode** is the app as
it is today, **Jam mode** the separate mode D400 adds.

## 1. The owner's direction

The owner, 2026-10-21:

> consider the jam mode something that is distinctly different from usual session (website load on
> start the current session mode, click a button to switch in jam mode). This is important as
> settings related to jam are probably a bit different (the app will follow what has been provided
> and will iterate and mutate over the provided motif). This may reduce initial load cost. moving
> jam as separate from session should prevent much of the colision ui wise. generator wise it's
> something else. we must aim at reducing impact of jam on generator work as much as possible, but
> it is inescapable. tempo as a whole is a complete new jar of problem in jam: should we 'lock' the
> tempo prior starting the jam session or not (capturing a tempo from the motif). I suspect though
> that working at 240 bpm should be considered best effort (leave it for last). aim for 120 to 180
> at maximum. None of our persona are expert at these level. (i'll accept the sacrifice of 240bpm
> should it come up).

Recorded as:

- **Jam is its own mode** (D400). The app always opens in session mode; a button switches to Jam
  mode.
- **Jam has its own settings set** (D401), because in Jam the app follows the doodle and develops
  it.
- **Jam's code loads on demand**, outside the first-load (entry) chunk (D402).
- **One shared generator; Jam's steering at its edges**, its footprint kept as small as possible
  (D403).
- **Jam's tempo target is 120 to 180 BPM**; 240 BPM is best effort, worked on last, and may be
  dropped (D404).

What stays from Part C: the doodle (one to four measures,
captured after a count-in, ended by a silent measure or after four measures), its quantizing, the
generation and read-in measures and the fallback ladder before phrase 1, matching by shape (never
quoting), the doodle's two forms (the quantized doodle travels with the music, the raw notes stay
played notes), the key and mode suggestion after a Jam, and "the player-selected key and mode stay
authoritative".

## 2. Two modes

Settled: D400, D402, D407 and D408.

- **Session mode** is the app as v3.1 ships it, plus v3.2's session features: the rhythm lock,
  its allowed rhythm changes and Vary settings' allowed groups (D406). It is what loads, every
  time, after a reload too.
- **Jam mode** is entered by one button, at Idle only: never while playing (D407), nor while a
  review is shown, as every Idle setting. It has its own screen state: its own settings (§3), its own
  Idle (the staff with the key signature, the starting note named), its own capture and its own
  path to phrase 1. From phrase 1 on, a Jam plays as a session does (rolling phrases,
  acknowledgement, look-ahead, the failure ladder, Stop), through the same session engine.
- **Leaving Jam mode** (a button, at Idle) returns to session mode exactly as it was left: the
  phrase on screen and the pre-generated phrases are kept, since nothing in Jam touches session
  settings. Part C's "turning Jam off leaves the workspace empty" (ux Q70) no longer applies.
- **The mode is not remembered across reloads** (D400: the app opens in session mode). Jam's
  settings are saved (§3); being in Jam mode is not.
- **Jam requires a MIDI controller** (D407): without one, Jam mode opens and its settings can be
  set, but its Start is unavailable, saying why. Part C's rule that a controller
  attaching or leaving switches the mode in and out goes: a mode the player chose by a button does
  not switch by itself.
- **On demand** (D402): the button is the only Jam code in the entry chunk; at the top of the
  app (`App.vue`), the mode picks the session workspace or Jam's, loaded on demand, both over the
  one shared workspace (worker, audio, MIDI, saving). The first press loads
  Jam's chunk (capture, quantizing, Jam's Idle and settings, the path to phrase 1, the suggestion,
  the review's doodle section, the exports' doodle section). The service worker keeps it for
  offline use like every other file (bundle policy: D408).
- **Starting a Jam by the home note stays**, in Jam mode only: no phrase is on screen there, so
  the home note is the hands-free start, as Part C §C5.2 has it. The collision Part C solved with a
  switch (two starts competing for one note) cannot happen across modes. Tap-in (§5) only sets the
  tempo at Idle; it starts nothing.
- **The doodle Jam mode keeps** (D408), replacing Part C's held doodle and its list of changes
  that drop it: after a Jam, Jam mode keeps that Jam's doodle, with its phrase 1 written at Idle
  and pre-generation for it, so Start goes round again without a new capture. It goes when a new
  doodle is captured (an explicit "new doodle" action at Idle, its form `ux-writer`'s), when the
  player leaves Jam mode, or when the kept session it came from is deleted, that session being the
  latest one played on it (D411; Part C §C5.11). A Jam on it that ends
  before phrase 1 keeps it. Memory only: a reload keeps none. "Jam again on this doodle", in a kept
  Jam session's review, opens Jam mode with that doodle kept.

## 3. Jam's settings set

Settled: D401, Jam has its own settings set, and D406, what it holds, provisionally until the
checks of §3.1. A small set, for a player who wants to hear their idea grown, not to tune a
generator:

| Setting | In Jam mode | Why |
| --- | --- | --- |
| Instrument (built-in or my instrument), the controller, the audio mix, the theme | **Shared** with session mode | They describe the player and the room, not the music being made |
| Written key and Collection (the key and mode) | **Jam's own**, starting from the session's values the first time | The suggestion's Use it then changes Jam's key and mode only; session mode never moves under the player |
| Tempo | **Jam's own** (§5) | Jam's range differs (D404); a doodle has its own speed |
| Drift | **Jam's own** (Close, Near, Free) | Jam-only already |
| Rhythm lock and allowed rhythm changes | **Jam's own values**, apart from session mode's (D406) | "Iterate and mutate over the provided motif" is what these two do in Jam |
| Note density, rhythmic variety, syncopation, silence density | **Taken from the doodle** (D406) | "The app will follow what has been provided" |
| Contour, leapiness, register | **Taken from the doodle** where it shows them, else Jam's defaults (D406) | Same |
| Harmonic motion, tension, figure levels | **Jam's own**, few or fixed (D406); settled as harmonic motion and tension with their usual choices and one Embellishments level for all seven figures, arpeggio chaos held at its default (D410, D411; Part C §C5.16) | The doodle says little about them |
| Presets, Vary settings and its allowed groups, Tension across phrases, Rising tempo | **Not in Jam** (D406) | Session tools for steering variety; in Jam the doodle and the drift do that job |

The first values and the doodle-to-controls mapping, with its thresholds, are in
[Part C §C5.16](master-spec.md#c516-jams-settings) and
[§C5.16.1](master-spec.md#c5161-the-doodle-to-controls-mapping) (D410, D411, D415).

Consequences:

- **Saving**: the settings store already keeps one record per setting (`group.field`), so Jam's
  settings are a new `jam.*` group in it: no new store, no database migration, and session mode's
  saved settings untouched.
- **Pre-generation**: Jam's settings no longer enter session mode's pre-generation key, so a
  change in Jam never discards session mode's pre-generated phrases (Part C §C10.5 shrinks).
- **Taking controls from the doodle** happens before the request is built, on Jam's side: the
  doodle is mapped to ordinary control values, which the generator already supports. It costs no
  generator work, and it keeps a doodle "far from everything the settings allow" (Part C §C5.9)
  from happening at all. It changes Part C's "the doodle changes no setting": in Jam, the doodle
  is where those settings come from.

### 3.1 What confirms them

D406 settles four answers on the owner's "will need testing to be sure". Each is confirmed by one
of the owner's checks in the v3.2 plan; a check that fails comes back to the owner as a ruling
(the spec and plan then change by decision), never as a silent change in the build.

| Answer (D406) | Confirmed by | If it fails |
| --- | --- | --- |
| Jam's settings set (closed O247) | The Jam listening check (Part C item 14, gate L1): a handful of doodles at each drift position, lock off and on, "does it sound like my doodle?" | The owner rules which setting comes back into Jam, or goes |
| The doodle sets the rhythm and shape controls (closed O248) | The same listening check, with doodles chosen to test the mapping (a sparse one, a busy one, a leaping one) | The owner rules between a corrected mapping and Part C's "the doodle changes no setting" |
| Tempo set before the doodle, with tap-in (closed O249) | The Jam check on the instrument (Part C's hand check of a Jam on the Travel Sax) at 60, 120 and 180 BPM, with tap-in | Tap-in may slip to later by ruling; set-before stays unless the owner rules otherwise |
| Lock and drift: session lock apart, Jam's own lock, changes and drift (closed O253) | Drift's scale by ear (gate LD), then the Jam listening check | The owner rules on folding them into one "how close to my doodle" control |

## 4. The generator seam

Settled: D403, and the seam below by D408, grounded in the code at v3.1.0.

Code facts, read at v3.1.0 (5ef47a0; the code is unchanged since 55364e7):

- **The generator runs only in the worker**, its own chunk (`generation.worker-`, budget 150 KiB
  in `scripts/verify-boundaries.mjs`). The main thread reaches it through the worker client's
  `generate` and `prewarm`. The request is `GenerationIntent`
  (`src/domain/generation/generation-intent.ts`), checked against an exact key list on arrival
  (`generation-worker-inbound.ts`).
- **Rhythm order**: `generatePhrase` (`orchestration/generation-orchestrator.ts`) calls
  `rankMaterializedRhythmCandidates(grammarVersion, candidates, seed)`, a seeded order only. The
  rhythm-domain memo and the prewarm sit before it and are keyed by the five rhythm controls.
- **Pitch order**: `orderCandidates` (`src/domain/pitch/pitch-ranking.ts`) sorts by `pitchRank`
  (favored figure, chord-tone priority, arpeggio-chaos distance), then the seeded tie key; the
  pitch policy comes from the request's controls and levels (`bindingPitchPolicy`).
- **No ordering hook exists today**: `GenerationOrchestrationOptions` only lets tests swap the
  search policy and the planner functions.
- **The join already exists**: `CarryIn` (last pitch, register window, final harmony, phrase
  number) is what v2's phrases join through.
- **One new request field ripples** to the worker's key list, the replay key (whose tuple is
  permanent once written, so a new `ifk4.`), and the kept-phrase reader's exact intent shape
  (`kept-phrase-parsers.ts`), so kept sessions take a new body data version.
- **The session engine assumes phrase 1 exists before Start**: the `no_phrase` start blocker, the
  starting note taken from phrase 1, the session seed taken from the Idle phrase, phrase 2's
  deadline one measure after the start, and every kept and exported time counted from phrase 1.
- **No router and no top-level mode**: `App.vue` renders one `WorkspaceShell` over one workspace
  (worker, audio, MIDI, saving). Lazy parts load through a memoized `import()` or
  `defineAsyncComponent`, as the review and the presets sheet already do.

The seam, so that the generator learns as little as possible about Jam:

1. **The generator never hears of a doodle, a drift or Jam.** The request gains **one optional
   steering block**, plain data: a target rhythm (note starts per measure, in ticks, laid over the
   four measures) with a band (how far a candidate may be and still count as near), and a list of
   melodic moves (up, down or same; step, skip or leap) with a strength (size and direction,
   direction only, none). Jam's side builds it from the doodle and the drift. With no block, the
   generator is byte for byte v3.1's (Part C item 7).
2. **Two ordering points, nothing else**: a re-ordering of the rhythm candidates right after the
   seeded ranking (the memo and prewarm untouched), and one more preference in the pitch policy,
   read by `pitchRank` below the existing ranks. Both live in one small steering module in the
   worker. The rhythm distance it uses is the rhythm lock's (forced bend, narrow-window step-down),
   which v3.2 needs anyway: shared, not Jam's.
3. **Everything else stays on Jam's side** (Jam's chunk, main thread): capture, quantizing, the
   doodle's analysis, the controls taken from the doodle (D406), the register window holding the
   doodle's last note (passed as today's register input), the join (today's `CarryIn`, "no chord"
   form), the suggestion, the tempo.
4. **The session engine meets Jam at phrase 1**: Jam's chunk runs the count-in, the
   capture and the generation measure itself; once phrase 1 is ready, it starts an ordinary session
   with that phrase on screen, the read-in measure playing the part of v2's count-in, at the
   barline the click has reached. The engine then needs only to accept a start time on a running
   click, so most of its "phrase 1 exists before Start" assumptions hold unchanged. The doodle's
   section is added in front of the review and the exports by Jam's code.
5. **Privacy, to settle with the contract wording (D408)**: the steering block holds rhythm and move classes,
   not the doodle's pitches, apart from the joined last note. If the replay key carries the block
   rather than the quantized doodle, the key holds much less of what the player played, and the
   contract change for the key shrinks. Kept Jam sessions still hold the quantized doodle for the
   review.

Jam's footprint in the worker is then the steering module, the block's check on arrival, and its
slot in `ifk4.`. The rhythm lock's fields (locked bars, allowed rhythm changes, the tenser flag)
are session-mode work that Jam reuses.

## 5. Tempo in Jam

Settled: D404, a target of 120 to 180 BPM, 240 BPM best effort and last. How the tempo is set:
D406, provisionally (§3.1); the range: D408.

Why tempo matters more in Jam: the doodle's end rule (a silent measure), its quantizing (a grid of
sixteenth notes) and the two measures before phrase 1 all need a beat grid. In session mode the
app owns the grid; in Jam the player's doodle has to land on it. The generator itself is
tempo-free: it works in ticks, and the capture tempo is not part of the request (Part C §C11), so
**no tempo option changes the generator**. Tempo changes the time budget and the capture.

One measure (four beats) lasts: 4 s at 60 BPM, 2 s at 120, 1.6 s at 150, 1.33 s at 180, 1 s at
240. v2's standalone reserve is 1.075 s. At 180 BPM the generation measure alone outlasts the
reserve; at 240 it does not, which is why Part C needed the extended wait (C5.7, C5.8).

### Option A — Set before the doodle, with a count-in (Part C as it stands)

Jam's own tempo control; one measure of count-in; the doodle is played over the click.

- **For a beginner**: the easiest to play well. A click to follow is how players practise; a
  steady grid makes the quantized doodle close to what they meant. Cost: they must choose a tempo
  first, and a doodle "in their head" may want another speed.
- **Generator and timing**: nothing new. The budget is known before Start, so it can be checked
  (and the tempo control's range capped) in advance.

### Option B1 — Tap-in: the player sets the tempo by playing it

At Jam's Idle, the player taps four even beats (on the controller, the home note for example, or
on a button); the app sets Jam's tempo from them, rounded to a whole BPM and kept in Jam's range,
then counts in at that tempo.

- **For a beginner**: natural (it is how bands count off), hands-free on the instrument, and it
  finds the speed of the idea they hear. Cost: uneven taps give a tempo they did not mean; the
  app has to show the result and let them re-tap.
- **Generator and timing**: nothing new for the generator. Timing: as Option A once the tempo is
  set. The taps must not start a doodle: they only set the tempo (and may start the count-in).

### Option B2 — Inferred from the doodle, played freely without a click

The player plays the doodle with no click; the app works out the beat and the barlines from the
notes, then starts the click at that tempo for the phrases.

- **For a beginner**: the freest, and the most fragile. A one-to-four-measure line played by a
  beginner often drifts in speed, and its beat is ambiguous: twice or half as fast fits as well,
  and the first note may not be on beat 1. A wrong guess quantizes the doodle into a different
  rhythm, and the phrases then follow that.
- **Generator and timing**: still nothing for the generator, but a new beat-tracking part on
  Jam's side (raw note times, a tempo and phase search, octave errors to resolve), research
  first. The end rule cannot be "a silent measure" (there is no measure yet): it becomes "a pause
  of so many seconds" or a played signal. The click starts only after the doodle, so the generation
  and read-in measures are counted from an inferred barline. Part C kept this out of v3.2
  ([C2](master-spec.md#out-of-v32)).

### Option C — Hybrid: set first, then adjusted from the doodle

Jam's tempo is set (Option A or B1); the doodle is played over the click; the app then nudges the
tempo for the phrases, within a narrow band (say ±10 %), from how the doodle's notes sat against
the click (consistently ahead means "faster").

- **For a beginner**: risky. A beginner ahead of the click is usually rushing, not asking for a
  faster tempo; following them rewards unsteadiness and can run away over several Jams.
- **Generator and timing**: nothing for the generator; the budget must hold at the band's top.

### Settled (D406, D408)

**Option A, with tap-in (B1) as a way of setting Jam's tempo control at Idle**, tap-in in the
design's form: taps count only after the tap button is pressed, then controller notes too
(D410; [Part C §C5.17](master-spec.md#c517-tempo-in-jam-and-tap-in)). The tempo is
locked before the doodle, so capture, quantizing, the end rule and the budget stay as Part C
specified and testable. Tap-in costs little (a few hundred lines on Jam's side, no generator
work), serves the player who hears their idea at a speed, and can slip to after v3.2 without
touching anything else. B2 stays out of v3.2, as Part C has it: it is a research problem, and it
fails worst for the players Jam is for. C is not recommended.

Today's tempo control runs 60 to 240 BPM in steps of 10, default 90 (`TEMPO_VALUES`); tap-in
would round to those steps. With the tempo locked before the doodle, D404 applies as a range:
Jam's tempo control runs from 60 to 180 BPM (D408); the Jam sweep and hand checks run at 60, 120 and 180 BPM;
240 BPM is tried last and, if it costs more than it is worth, Jam's control stops at 180. Rising
tempo is not in Jam (D406).

## 6. Blast radius

What the re-scope changes, against Part C, the three drafts, the code facts, the v3.2 plan and the
v3.2 design. "Session" = session mode only; "Jam" = Jam mode only, in Jam's chunk; "Shared" =
both, one implementation.

### 6.1 Part C and the drafts, item by item

| Part C | Today | After the re-scope (D406–D408) |
| --- | --- | --- |
| C5.1 The Jam switch | A session option, saved, off by default; needs a controller, which switches the mode in and out; Idle in Jam shows no phrase; on/off discards the phrase and pre-generation | **Replaced** by the Jam button and Jam mode (§2). Nothing discarded in session mode; the controller no longer switches modes. ux Q70 moot |
| C5.2 Starting by Start or the home note | The home note starts a Jam when the switch is on | **Jam**, unchanged in substance; tap-in sets the tempo at Idle and starts nothing (D406) |
| C5.3 Count-in and click | One measure; click through to phrase 1 whatever the Click switch says | **Jam**, unchanged: the tempo is set before the doodle (D406) |
| C5.4–C5.5 Capture, quantizing | As drafted | **Jam**, unchanged |
| C5.6–C5.8 Measures before phrase 1, extended wait, budget | Budget sized for 240 BPM | **Jam**; budget sized for 180 BPM, 240 last (D404, D408) |
| C5.9 What the doodle feeds the generator | Orders the candidates the player's controls allow; changes no setting | **Changed**: the doodle also sets Jam's rhythm and shape controls (D406); the ordering goes through the seam (§4, D408) |
| C5.10 Planner authority | No stage revises another | **Unchanged**; the seam keeps it |
| C5.11 Held doodle, "Jam again on this doodle" | Held at Idle in session's workspace, with a long list of changes that drop it | **Simplified**: Jam mode keeps its current doodle until a new one is captured or the player leaves Jam mode (D408). ux Q73 and Q74 become questions about that, mostly moot |
| C5.12 During the Jam | Vary settings, Tension across phrases, Rising tempo count from phrase 1 | **Jam**, without those three (D406) |
| C5.13 Edge cases before phrase 1 | As drafted | **Jam**, unchanged |
| C5.14 The doodle's two forms | Quantized doodle travels with the music | **Unchanged** in substance; the contract wording is confirmed again (D408) |
| C5.15 Review and exports | The review opens with the doodle; both exports open with a Doodle section; the session list marks Jam sessions | **Shared** review and exports, the doodle parts in Jam's chunk, loaded when a Jam session's review opens (D408). One session list, Jam sessions marked |
| C6 Key and mode suggestion | After a Jam, in its review and with a held doodle; Use it sets the session's key and mode | **Jam**; Use it sets Jam's key and mode only (§3); a preset's restriction no longer meets it, since presets are not in Jam (D406) |
| C7 Rhythm lock, allowed rhythm changes | One switch for sessions and Jams; Jam locks the rhythm nearest the doodle | **Session** setting as drafted; in Jam, its own value (D406). The lock's generator work (locked bars, forced bend, changes) is **Shared** and not Jam's footprint |
| C8 Drift | Shown only while Jam is on | **Jam** setting |
| C9 Vary settings' allowed groups ("What may vary") | One more session option | **Session** only (D406) |
| C10.1 Presets | Hold none of v3.2's settings | **Session** only; Jam has none (D406) |
| C10.2 Saving | Jam switch, drift, lock, changes, groups join the saved settings | Lock, changes and groups join session settings; **Jam's settings are their own record** (§3) |
| C10.3 Kept sessions | A Jam session is kept like any, with a new data version | Unchanged (D408) |
| C10.5 Pre-generation | Five new settings discard it; none in Jam without a held doodle | Session: lock, changes and groups discard it. Jam: its settings never touch session pre-generation; Jam pre-generates only for its current doodle (D408) |
| C10.8 Other session rules | Rising tempo starts from the doodle's tempo | Not in Jam (D406) |
| C11 Request, `ifk4.`, kept sessions | Request gains the doodle, drift, lock, changes, tenser flag | Request gains the lock fields (Session and Shared) and **one optional steering block** (§4); `ifk4.` still needed |
| C12 For the interface design | Jam switch in the session options | Redesigned (§8) |
| C13 Contract changes | Confirmed 2026-10-08 (D246) | Wording to confirm again after the re-scope, once (D408) |
| C14 Existing code and risks | Facts at c65152b | Facts-only refresh at v3.1.0 with the plan's rewrite |
| C16 Definition of done | Items for a Jam switch; sweep at 60, 120, 240 BPM | Rewritten for the mode; sweep at 60, 120, 180, 240 last; items 21 and 37 already say Chrome (D399) |
| C2 Out: tempo inferred from a freely played doodle | Later | Option B2 of §5, still recommended out |
| C3 Tension "P2 plays at up to 240 BPM" | Two measures before phrase 1 for 240 | Jam targets 180 (D404); P2 is not Jam's persona |

### 6.2 The v3.2 build plan

Its rewrite waits for this re-scope (D405). The corrections found on 2026-10-21 against v3.1 still
apply: gate R0 is met; the entry budget is 300 KiB (307,200 B) with 265,431 B used, not "224 kB"
(M4); the contract gate needs a MAJOR sign-off like v3.1's gate CS, since the eight
`changes-in-v3.2` atoms are now STABLE (D408); pre-generation's discard goes through the queue key
`settingsKeyOf` in `src/components/workspace/workspace-pregeneration.ts`; kept sessions upgrade at
open only (D376), each record with its own data version (D370); the code facts were checked
against c65152b and need a facts-only refresh; "nine modes" reads "nine collections"; H6 (Edge)
goes (D399). The re-scope adds: chunks 17, 18, 20, 21 and 24 (Jam engine, Jam at Idle, a fresh
Jam, the held doodle) become Jam-mode chunks in Jam's chunk; chunk 19's controls are
session-mode only; chunk 26 (pre-generation) shrinks; M4 gains a check that no Jam module is in
the entry chunk, Jam's chunks under the existing 100 KiB per-chunk budget; H5 runs at 60, 120 and
180 BPM; and the plan splits in two, session-mode work first, then Jam mode (D408). The contract
bump starts from CONTRACT 7.2.0 (`documentalist`'s 5618971) and goes to 8.0.0 (D408).

### 6.3 The v3.2 design (`ui_ux/`, `ux-writer`'s)

Built on the Jam switch: `flows/jam/` (intent and handoff), `screens/phrase-workspace/` (the
switch among the session options, Idle in Jam, the cue row), `flows/play-session/` (Jam's
start), `screens/last-session-review/` and `flows/review-and-export/` (the doodle section, the
suggestion), `screens/session-list/` (the Jam mark), `flows/saved-data/` (the saved Jam switch),
and part 2 of `token-source-v3.1-v3.2.md`. What `ux-writer` redesigns is §8; where its open
questions stand is §8.3.

## 7. Today's review questions after the re-scope

| Question | After the re-scope |
| --- | --- |
| One MAJOR contract bump | **Settled** (D408): one sign-off on the re-scoped wording, CONTRACT 7.2.0 to 8.0.0 |
| Scripted, shorter hand checks | **Settled** (D408): numbered scripts of at most ten minutes; no Edge (D399); Jam's at 60, 120, 180 BPM, 240 only if kept |
| Bundle policy | **Settled** (D402, D408): entry budget 300 KiB unchanged; a boundary check keeps Jam out of the entry chunk; Jam's chunks under the 100 KiB per-chunk budget; kept offline by the service worker |
| Splitting v3.2 | **Settled** (D408): session-mode work first, then Jam mode; version numbers the owner's call |
| ux Q70, Q73–Q75 | §8.3 |

## 8. For the interface design

What `ux-writer` redesigns, from this document as settled (D400–D408). Behaviour only; layout,
placement and wording stay `ux-writer`'s. Where this document and Part C differ, this document
wins until Part C is consolidated from it.

### 8.1 What to design

- **Jam mode as its own screen state**, over the same workspace: how the player always knows which
  mode they are in; Jam's Idle (the empty staff with the key signature and the home note named as
  the starting note; with a kept doodle, its phrase 1 on screen); Jam's cue row through the
  count-in, the doodle's measures (one to four), "writing" in the generation measure and any
  extended wait, and the read-in measure. The live view never shows the doodle's notes.
- **The mode button**: in session mode it enters Jam mode, in Jam mode it returns. At Idle only,
  never while playing, nor while a review is shown (D407). The first press loads Jam's code: what
  shows during that short wait, and if it fails (offline before the files were kept).
- **Jam's settings** (§3): key and mode, tempo (60–180 BPM in steps of 10) with tap-in at Idle,
  drift (Close, Near, Free), the rhythm lock and its allowed rhythm changes (Jam's own values),
  harmonic motion, tension and figure levels (few or fixed); and how the controls taken from the
  doodle (density, variety, syncopation, silence, contour, leapiness, register) show what the app
  took from it. Not in Jam: presets, Vary settings and its allowed groups, Tension across phrases,
  Rising tempo.
- **Tap-in** (§5): the player taps even beats at Idle (on the controller or a button); the tempo
  control shows the result; re-tapping corrects it. It starts nothing.
- **Jam requires a MIDI controller** (D407): without one, Jam mode opens and its settings can be
  set, but Start is unavailable, saying why. A controller arriving or leaving never switches the
  mode.
- **The doodle Jam mode keeps** (§2): after a Jam, Start goes round again on it; an explicit "new
  doodle" action at Idle; it goes on leaving Jam mode or deleting its kept session.
- **The suggestion** (Use it sets Jam's key and mode only; Keep mine) in a Jam's review and at
  Jam's Idle with a kept doodle; **"Jam again on this doodle"** in a kept Jam session's review,
  opening Jam mode.
- **Shared, with Jam's parts**: one session list with Jam sessions marked; one review whose doodle
  section and suggestion load from Jam's code; both exports opening with the doodle section.
- **Session mode gains** the rhythm lock, its allowed rhythm changes and Vary settings' allowed
  groups ("What may vary"), as Part C §C7 and §C9 have them.
- **Removed**: the Jam switch among the session options; the controller switching the mode; Idle
  in Jam inside session mode's workspace; the drift shown in session mode.

### 8.2 Constraints

The context of use (hands and mouth on the instrument, nothing clicked while playing, music-stand
distance); nothing asked or offered while a Jam runs; never grading or naming a wrong note;
`src/styles/` only; the entry chunk carries the mode button and nothing else of Jam's (D402).

### 8.3 The design's open questions (ux Q70, Q73–Q75)

- **Q70** (leaving Jam mode leaves the workspace empty): **moot**. Leaving Jam mode returns
  session mode as it was (§2).
- **Q73** (deleting a Jam session lets go a doodle held from it): **answered yes** by D408: the
  doodle Jam mode keeps goes when its kept session is deleted (§2). `ux-writer` closes it.
- **Q74** (a Jam on a held doodle ending in its count-in keeps it): **answered yes** by D408: a
  Jam on the kept doodle that ends before phrase 1 keeps it (§2). `ux-writer` closes it.
- **Q75** (the "no mode fits" sentence once or in every review): **stands as Part C words it**,
  one sentence in every review of that Jam (C6.3, C12); `ux-writer` closes it as recommended.
- **Still `ux-writer`'s**: how the mode shows, where the mode button sits, the loading and offline
  states of the first press, tap-in's look, how controls taken from the doodle show, the "new
  doodle" action, and every label.

## 9. Open

None. O247–O259 were opened and closed on 2026-10-21 (D400–D408); O260–O266, opened by Part C v1.1
(D409), were closed by the owner's approval (D410). Four answers stay provisional until the checks
of §3.1.
