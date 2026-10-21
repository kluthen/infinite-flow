# v3 — Player Material and "My Instrument"

Status: v3.0 released as version 3.0.0 on 2026-10-16 (tag `v3.0.0` at e288d98, deployed;
D348); v3.1 released as version 3.1.0 on 2026-10-21 (tag `v3.1.0` at 55364e7; D397), its hand
checks after the tag closed (D399; [v3.1.x notes](#v31x-notes-after-the-tag)); v3.2 consolidated as
master spec Part C v1.0, approved (D239), re-scoped with Jam as its own mode (D400–D408;
[draft](jam-mode.md), settled) and consolidated from it as Part C v1.1 (D409), approved as v1.2
(D410), its design approved (D412) and its build plan v4 written, awaiting approval (D416); v3.3 in master spec
Part D, awaiting owner approval (D264–D275), its build plan not approved (D276–D288, D351); v3.4,
a structural review before v4, opened as a scoping draft (D389), with a lexicon page added as its
one player-facing item (D393); v3.x direction only. The Status paragraphs this README kept until
the v3.0 and v3.1 releases are archived verbatim in
[archive/v3/v3-readme-status.md](../../archive/v3/v3-readme-status.md) and
[archive/v3/v3-readme-status-v3.1.md](../../archive/v3/v3-readme-status-v3.1.md).

**Serves:** P3, the Fledgling Composer: "I liked that gimmick, I play it, and see where it goes."
Also every tester on an instrument v1 doesn't ship. See [personas](../../personas.md).

## Releases (D211)

| Release  | Theme                           | Scope                                                                                                                                                                                                                                                                                                                                   |
| -------- | ------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **v3.0** | Storage, and follow-ups (D212)  | [Local persistence](#local-persistence), ["my instrument"](#my-instrument), [review of earlier sessions](#review-of-earlier-sessions), [favorites](#favorites), [keeping sessions](#keeping-sessions); [pre-generating phrases at Idle](#pre-generating-phrases-at-idle), [stray notes from controllers](#stray-notes-from-controllers) |
| **v3.1** | Generation choices              | [Embellishment flags](#embellishment-flags), [presets](#presets)                                                                                                                                                                                                                                                                        |
| **v3.2** | Jam                             | [Jam](#jam-growing-the-players-doodle), the [key and mode suggestion](#key-and-mode-suggestion), the [rhythm lock and mutation](#rhythm-lock-and-mutation)                                                                                                                                                                              |
| **v3.3** | Richer chords (optional) (D261) | [Richer chords](#v33--richer-chords-optional), opt-in, after a [research phase](#research-first) (D262)                                                                                                                                                                                                                                 |
| **v3.4** | Structural review (D389)        | [Structural review](#v34--structural-review): a clear view of the code before v4, no player-facing change ([scoping draft](structural-review.md)); the [lexicon page](#the-lexicon-page-d393), every lexicon word A–Z and by search (D393; [scoping draft](lexicon-page.md))                                                            |
| **v3.x** | Kept, likely to move or go      | [Learning from positive signals](#v3x--learning-from-positive-signals)                                                                                                                                                                                                                                                                  |

- **v3.0 master spec:** [master-spec.md](master-spec.md) (D217), consolidated from the approved
  drafts; built from the [v3.0 build plan](build-plan.md) and released as version 3.0.0 on
  2026-10-16 (D348). What follows the tag is in [v3.0.x notes](#v30x-notes-after-the-tag).
- **v3.0 drafts** (2026-10-07, draft v2, approved at the owner's overall review, D216), archived at
  the v3.0 release: [persistence](../../archive/v3/persistence.md),
  [kept sessions and favorites](../../archive/v3/kept-sessions.md),
  [my instrument](../../archive/v3/my-instrument.md),
  [pre-generation at Idle](../../archive/v3/pre-generation.md),
  [stray notes](../../archive/v3/stray-notes.md).
- **v3.1 master spec:** [Part B](master-spec.md#part-b--v31) (D239), consolidated from the
  approved drafts; built from the [v3.1 build plan](build-plan-v3.1.md) and released as version
  3.1.0 on 2026-10-21 (D397). What follows the tag is in
  [v3.1.x notes](#v31x-notes-after-the-tag).
- **v3.1 drafts** (2026-10-08, draft v3, approved as proposed, D233), archived at the v3.1
  release: [embellishment flags](../../archive/v3/embellishment-flags.md),
  [presets](../../archive/v3/presets.md).
- **Research:** [storage grounding](../../archive/v3/storage-grounding.md) (archived), [Jam grounding](jam-grounding.md);
  music research in `docs/music/`: [embellishment catalogue](../../../docs/music/embellishment-catalogue.md),
  [mutation catalogue](../../../docs/music/mutation-catalogue.md),
  [played-pattern recognition](../../../docs/music/played-pattern-recognition.md),
  [key and mode estimation](../../../docs/music/key-and-mode-estimation.md); their sources and
  terms are merged into `research-sources.md` and the lexicon.
- **Moved to v4:** the [rhythm ratios and the rhythm editor](#moved-to-v4-rhythm-ratios-and-the-rhythm-editor).
- **Dropped:** the [two controller-connection ideas](#controller-connection-ideas),
  [review tooling](#review-tooling) and the
  [end-of-measure chord-fit check](#end-of-measure-chord-fit-check). See [Dropped](#dropped-d211).
- **v3.3 is added after v3.2** (D261), which was the last v3 release until then: richer chords,
  opt-in, preceded by research, a separate item running on branch `v3.3-chord-research` (D262),
  whose [chord research](../../../docs/music/chord-research.md) is done.
- **v3.3 master spec: [Part D](master-spec.md#part-d--v33), awaiting owner approval** (D264–D274,
  2026-10-12): one Seventh chords level, Off by default; its contract wording changes wait for the
  owner's confirmation. O176 (style packs and the level) stays open for later.
- **v3.3 build plan:** [build-plan-v3.3.md](build-plan-v3.3.md), v3 (2026-10-16), not
  approved; depends on owner approval of Part D. Planning answers D276–D288.
- **v3.4 is added after v3.3** (D389), the owner's request of 2026-10-21: an overall structural
  review of the app before v4's endgame work, with no player-facing change. It is the last v3
  milestone, after v3.3; the owner sees no need to run it earlier (D389). Scoping draft:
  [structural-review.md](structural-review.md).
- **v3.4 also builds a lexicon page** (D393), the owner's side project of 2026-10-21: a page
  listing every lexicon word, A–Z and by search, read from the lexicon file alone (D394). It is
  v3.4's one player-facing item, so D389's "no player-facing change" now holds for the review only.
  Scoping draft: [lexicon-page.md](lexicon-page.md). Its second step, an API, is v4 or v5 (D395).
- **v3.0.1 is merged into v3.0** (D212), the owner: "v3.0.1 could very well be just included
  into v3.0". This also settles where keeping sessions goes: with the review of earlier sessions
  that needs it.

## v3.0 — Storage

**Released as version 3.0.0 on 2026-10-16** (D348). What v3.0 does is stated in
[master spec Part A](master-spec.md#part-a--v30); the subsections below are the direction
recorded before it was specced, and where they leave a point open, Part A settles it.

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
- **Settled by D216** ([kept-sessions.md](../../archive/v3/kept-sessions.md)): marking a favorite pins its session,
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
- **Settled by D216** (O107–O111 closed): [pre-generation.md](../../archive/v3/pre-generation.md).

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

### v3.0.x notes (after the tag)

These follow the v3.0.0 tag, as v2.0's real-program checks did. The hand checks are recorded in
`HARDWARE-CHECKLIST.md`, v3.0 part, and in the
[release notes](../../../docs/release/v3.0-release-notes.md) when they run.

- **H8, favorites-only files in real programs** (D340): open a favorites-only MusicXML file in
  MuseScore and both MIDI files in a MIDI tool; the phrase numbers and markers match the session.
  No file has been opened in an outside program yet.
- **H5, its played-notes-export half** (D342): export the played notes with
  `Include very short notes` off and then on, and check what each file holds. H5's lane half
  passed. Until this runs, item 21's export clause rests on its automated tests.
- **H7, for information only** (D340): recorded as not run; Chrome decides silently.
- **The 17 REVIEW `release-v3.0` atoms are promoted later** (D345), by `documentalist` with the
  owner, for example once H5's played-notes-export half and H8 have run. Until then 22 STABLE
  atoms sit under REVIEW parents.
- **The CONTRACT's EXPECTATION is trimmed** (D347), by `documentalist`; no guarantee changes, and
  the version level is its call. In `contract_infinite_flow_first_release`, EXPECTATION:
  1. Keep its first two sentences: the contract is singular, and the MAJOR and MINOR rule.
  2. Remove the notes for versions 1.2 to 1.8, the sentence "None of these versions weakens or
     removes a guarantee.", and the notes for versions 2.0, 3.1, 4.0, 5.0, 6.0, 6.1 and 6.2.
     They describe versions shipped in 2.0.0 and 3.0.0; each change stays stated in its atoms.
     This also removes the one decision ID any atom cites ("spec D184 to D186", in the 1.2 note).
  3. Keep the 3.0 note: it explains the guarantee wordings changed ahead of the v3.1 and v3.2
     build. Trim it when v3.2 is archived.
  4. Keep the 6.3 note, the current version's.

  Done: the CONTRACT is now version 6.3.1, a PATCH bump, as no guarantee changed.

Settled at the release, nothing to do:

- `createSessionMidi`, in `src/components/workspace/workspace-session-midi.ts`, keeps no code link
  to `service_session_midi` (D344): the file already links ten atoms, the code-health cap. The
  atom stays traced through `workspace-session-starting-note.ts` and two test files.
- Ten STABLE atoms tagged `changes-in-v3.1` or `changes-in-v3.2` now cross the contract gate
  (D346): when v3.1 or v3.2 revises them, each revision takes the contract bump its level
  requires, a MAJOR one with the owner's explicit confirmation.

## v3.1 — Embellishment flags and presets

**Released as version 3.1.0 on 2026-10-21** (D397). What v3.1 does is stated in
[master spec Part B](master-spec.md#part-b--v31), consolidated from the drafts the owner approved
as proposed (D233), [embellishment flags](../../archive/v3/embellishment-flags.md) and
[presets](../../archive/v3/presets.md), archived at the release (D398). The subsections below are
the direction recorded before it was specced; where they leave a point open, Part B settles it.

**Build plan:** [build-plan-v3.1.md](build-plan-v3.1.md), v23, complete; chunk 21 is the release
gate's record. 21 chunks in six waves, then the release gate, under the shared
[v3 build workflow](build-workflow.md) (D349); the wave driver's [wave log](wave-log-v3.1.md)
records each wave. What follows the tag is in the [v3.1.x notes](#v31x-notes-after-the-tag).

### Embellishment flags

Recorded 2026-10-07 (D210), the owner's request: "embellishments flags for generators … many ways
to support or alter in minor ways what's expected to be played", for example passing notes,
"spiked notes" (most likely [neighbor tones](../../../docs/music/lexicon.md#neighbor-tone), or
[appoggiaturas](../../../docs/music/lexicon.md#appoggiatura)) and surrounding a note with one note
above and one below (an [enclosure](../../../docs/music/lexicon.md#enclosure)). It was already
expected "in v2 or v3" ([v2 direction](../v2/README.md#direction-not-yet-scoped)). **Drafted in
[embellishment-flags.md](../../archive/v3/embellishment-flags.md)** (draft v3, approved by D233, which closed
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
Placed with the embellishment flags in v3.1 (D211). **Drafted in [presets.md](../../archive/v3/presets.md)** (draft v3,
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
- **Settled by D228 or proposed in [presets.md](../../archive/v3/presets.md):** what a preset holds (the generation settings only, or also
  tempo, the audio mix, embellishment flags and weights, the instrument); whether built-in presets
  can be edited or only copied; renaming and deleting; how a player preset is exported or shared,
  if at all; and how presets meet [my instrument](#my-instrument), which is saved separately.

### v3.1.x notes (after the tag)

These follow the `3.1.0` tag (D397). The checks are written in the v3.1 build plan's
[hand checks](build-plan-v3.1.md#hand-checks) and in `HARDWARE-CHECKLIST.md`, v3.1 part. All
three are closed (D399):

- **v3.1 H3, the same phrase in Edge:** waived. Chrome is the one supported browser; Edge, like
  any other Chromium-based browser, is not tested. Item 7 promises the same phrase in Chrome.
- **v3.1 H4, Vary settings under a preset:** passed on the owner's word.
- **v3.1 H5, v3.0 data carried over:** waived. v3.0 had no live users, so carrying v3.0's data
  over is not checked by hand; the upgrade code and its automated tests stay.
- **The waiting promotions** (D396, D397, D399): 11 REVIEW→STABLE and 2 DRAFT→REVIEW atoms, are
  applied (5618971, CONTRACT 7.2.0), the atoms that promised the same result "in Chrome and Edge"
  reworded to Chrome.

## v3.2 — Jam and the rhythm lock

**Re-scope opened 2026-10-21 (D400–D405): [Jam as its own mode](jam-mode.md)**, draft v1. Jam
leaves the session options for a mode of its own, entered by a button, with its own settings, its
code loaded on demand, its steering kept at the generator's edges, and a tempo target of 120 to
180 BPM. Settled the same day (D406–D408; four answers provisional until the owner's checks):
Jam's own settings with the rhythm and shape controls taken from the doodle, the tempo set before
the doodle with tap-in, the mode switched only at Idle, a MIDI controller required, and v3.2 split
into session-mode work first, then Jam mode. Consolidated into Part C v1.1 on 2026-10-21 (D409),
approved as v1.2 the same day (D410); the build plan is rewritten as v4 (D416).

**Consolidated: [master spec, Part C](master-spec.md#part-c--v32).** v1.0 (2026-10-08) was approved
by the owner on 2026-10-08, with the contract wording it lists confirmed the same day (D239).
v1.1 (2026-10-21) was rebuilt from the re-scope (D409). **v1.2 (2026-10-21) is approved by the
owner** (D410): v1.1's seven proposed answers (O260–O266), the design's behaviour answers (D411),
the doodle-to-controls thresholds (D415) and "the kept doodle" (D413) written in. One sign-off on
its re-scoped contract wording (CONTRACT 7.2.0 to 8.0.0) is still to come, as the build plan's
gate CS. v1.3 (2026-10-21) settles the three findings of the build's intent re-sync (D418–D420): a
fresh Jam's seeds, and two atoms and a vision line more for that sign-off.

**Build plan:** [build-plan-v3.2.md](build-plan-v3.2.md), **v8 (2026-10-21)**, from v6, **approved
by the owner** (D416, D417; hand check H9 waived), with wave 0's corrections (v7) and chunk 0's
findings (v8, D418–D420), from Part C v1.3 and the approved design (gate D0, D412). It plans
v3.2 on top of the [v3.1](build-plan-v3.1.md) build plan on the build-plan model: 32 chunks in eight
waves, the session-mode half first (waves 0–3), then Jam mode (waves 4–7), one release, then the
release gate, under the shared [v3 build workflow](build-workflow.md).

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

## v3.3 — Richer chords (optional)

Recorded 2026-10-12 (D261), the owner's request, in their words: "managing higher end chords
(optionnal, with flags to be set from the front end as to what's allowed and what's not). It will
be preceeded by an internal doc/web research on chord to ensure we use appropriate data for chord
generation." v3.2 was the last v3 release; v3.3 follows it. Specced on 2026-10-12 as
[master spec Part D](master-spec.md#part-d--v33), awaiting the owner's approval (D264–D274);
nothing built. The text below is the direction as recorded before the research; where it and
Part D differ, Part D wins.

**Build plan:** [build-plan-v3.3.md](build-plan-v3.3.md), v3 (2026-10-16), not approved; depends
on owner approval of Part D. It plans v3.3 on top of the [v3.0](build-plan.md),
[v3.1](build-plan-v3.1.md) and [v3.2](build-plan-v3.2.md) build plans on the build-plan model: 22
chunks in six waves, then the release gate, under the shared [v3 build workflow](build-workflow.md)
(D351), with contract sign-offs on the three STABLE changes and the owner's listening check on
endings before the conditional second ending rule. Its planning answers are D276–D288.

In standard terms, "higher end chords" are **seventh chords** and **extended chords**. An extended
chord stacks **chord extensions** (the ninth, the eleventh, the thirteenth) on top of a seventh
chord. This section says "richer chords" for any chord beyond a triad.

- **Today.** The app's only chords are root-position diatonic
  [triads](../../../docs/music/lexicon.md#triad). Each is built from every other note of the
  selected [collection](../../../docs/music/lexicon.md#collection), so its
  [quality](../../../docs/music/lexicon.md#chord-quality) comes from the key and mode. Sevenths,
  inversions, suspensions and every other sonority are outside the
  [harmony planner policy](../../../docs/music/harmony-planner-policy.md#collection-and-chord-vocabulary),
  even under Jazz ([lexicon: seventh chord](../../../docs/music/lexicon.md#seventh-chord)). That
  "triads only" vocabulary is written in the policy and in the
  [generator contract](../../generator-contract.md) ("seven root-position diatonic triads"), not
  in a decision. v1's decisions D11–D13 frame it
  ([archived](../../archive/v1/decisions-D1-D46.md)); how v3.3 stands toward each is
  [below](#relation-to-v1s-decisions-and-to-style-packs). The
  [preset catalogue](../../../docs/music/preset-catalogue.md#what-no-setting-can-express-today) and
  [presets §3.3](../../archive/v3/presets.md#33-what-the-list-is-not) list richer chords among what Blues, Bebop,
  Modal jazz and Bossa lack.
- **What it is.** The generator may use chords richer than triads, but only those the player
  allows. [Seventh chords](../../../docs/music/lexicon.md#seventh-chord), which add a fourth note
  a seventh above the root, come first. Extended chords may come later.
- **Opt-in only (D261).** The default stays today's triads. A player who allows nothing richer
  sees, hears and exports what they do today. Their replay keys, saved settings, presets and kept
  sessions reproduce as before.
- **Flags set in the app (D261).** The player chooses in the app's interface which chord families
  the generator may use. The exact flags, how fine-grained they are and their defaults are open
  (O165). Whether every chord stays built from the selected key and mode is open too (O166).
  Whether a later style pack can set the same flags is O175.
- **Serves (proposed):** P1's G1, vocabulary by exposure: hearing and playing the sound of
  seventh chords under the phrase
  ([personas](../../personas.md#p1--the-curious-improviser-primary-d48)). It also brings the
  jazz-flavoured presets closer to their styles (O171), though not all the way
  ([below](#relation-to-v1s-decisions-and-to-style-packs)).
- **Settled, pending the owner's approval of Part D:** O165–O173 and O175's shape, by D264–D273
  ([register](../../open-questions.md#v33-richer-chords-o165)). D262 closed O174: the research is
  a separate item before v3.3. O176 (which wins between the player's level and a later style pack)
  stays open.

### Relation to v1's decisions and to style packs

**v1's decisions (D261).** None of D11–D13 says "triads only" in its own words; the harmony planner
policy's vocabulary implements them.

- **D11, the Neutral grammar, is partially revisited, opt-in only.** Its chord vocabulary, as the
  policy implements it, widens only when a player allows richer chords. Its diatonic frame and its
  exclusion of substitutions and altered dominants stay (O166). Its "chord tones" may gain a
  fourth note (O168).
- **D12 is untouched.** Altered dominants and harmonic substitutions stay out (O166).
- **D13 is untouched.** The chords stay generated. A flag allows a chord family; it never chooses a
  chord progression.

The [style atlas](../../../docs/music/styles/README.md) (merged from branch
`v4-accompaniment-research` on 2026-10-19) cites D12 for "triads only". The rule is in fact the
policy's, under D11; the research and the v3.3 spec cite the policy.

**Style packs (D259, merged from branch `v4-accompaniment-research` on 2026-10-19).** D259 records
style packs as planned, with no version: the generator's capabilities grouped into dialects (Folk
reel, Bebop, Blues, Baroque...), as declarative data over the one generator, in the style atlas's
greedy unlock order. The
[breadth review](../../../docs/music/generation-breadth-review.md) treats each missing
device, seventh chords among them, as a _capability, not a style_. Each capability is built once,
off by default, with its own invariant, and a pack later becomes a named bundle that switches
capabilities on. It asks which version opens the first device.

- **v3.3 opens the seventh-chord capability ahead of style packs** (D261). Style packs stay
  planned with no version; v3.3 neither schedules them nor changes D259.
- **In the atlas, `seventh-chords` is tier 2,** "cheap vocabulary": medium cost, with no
  prerequisite. Its greedy order adds it at step 6, together with progression templates and
  substitution rules. v3.3 takes it alone, since D13 and D12 stay.
- **So v3.3 serves the sound of sevenths, not a full style.** By the atlas's own inference, a
  style becomes recognisable with sevenths only alongside chosen progressions (Bebop) and, for
  most styles, v4's accompaniment voices.
- **Extended and altered chords depend on seventh chords** in the atlas. A later extended-chord
  flag builds on v3.3's.
- **The flags are the player's switch for the capability.** Keeping them compatible with a later
  declarative style-pack layer is O175.

### Research first

D261 makes a research phase mandatory before any design. Generation must then use sourced data,
not recollection. The research is a separate, docs-only item before v3.3, not v3.3's first work
unit (D262, closing O174). It started on 2026-10-12 on branch `v3.3-chord-research` and runs while
v3.0 is built.

1. **Internal.** The research first collects what the project already holds:
   - the [harmony planner policy](../../../docs/music/harmony-planner-policy.md);
   - the lexicon entries [triad](../../../docs/music/lexicon.md#triad),
     [seventh chord](../../../docs/music/lexicon.md#seventh-chord),
     [chord tone](../../../docs/music/lexicon.md#chord-tone),
     [chord symbol](../../../docs/music/lexicon.md#chord-symbol) and
     [arpeggio](../../../docs/music/lexicon.md#arpeggio);
   - the [preset catalogue's](../../../docs/music/preset-catalogue.md#what-no-setting-can-express-today)
     gaps and the [embellishment catalogue's](../../../docs/music/embellishment-catalogue.md)
     harmonic rules;
   - sources S14, S15, S101, S103 and S112 in
     [research sources](../../../docs/music/research-sources.md);
   - the code and atoms that assume a three-note chord ([below](#what-a-fourth-chord-note-meets)).

   The research merged from branch `v4-accompaniment-research` on 2026-10-19 (3861edc) is an
   input too: the [breadth review](../../../docs/music/generation-breadth-review.md) and the
   [style atlas](../../../docs/music/styles/README.md), which count seventh chords as one
   capability, and its lexicon entries [chord inversion](../../../docs/music/lexicon.md#chord-inversion),
   [voicing](../../../docs/music/lexicon.md#voicing), [guide tone](../../../docs/music/lexicon.md#guide-tone)
   and [two-five-one](../../../docs/music/lexicon.md#two-five-one).

2. **Web.** The web research covers five subjects:
   - **Chord types:** the seventh-chord qualities; sixth and suspended chords; ninths, elevenths
     and thirteenths; altered chords.
   - **Construction:** how each type is built from a selected key and mode, that is, which chord
     each degree of each of the app's seven modes carries.
   - **Style plausibility:** which types sound right in the styles the presets aim at: Jazz,
     Bebop, Blues, Bossa, Modal (Dorian), Pop song and folk.
   - **Chord symbols:** how each type is written as a chord symbol.
   - **Melodies:** how a melody treats a seventh or an extension, whether it resolves it or rests
     on it.
3. **Output.** The research produces three things, all on its branch:
   - a research document in `docs/music/`, where every fact the generator will rely on cites a
     source;
   - its sources, merged into [research sources](../../../docs/music/research-sources.md) under
     new S numbers above the highest on any branch (S452 on `main` today, both research branches
     merged);
   - new terms, added to the [lexicon](../../../docs/music/lexicon.md). The v3.3 questions rely on
     these terms, which the lexicon on `main` does not have yet, so this spec glosses them in
     place and links only entries that exist:
     - **extended chord** and **chord extension**;
     - **sixth chord**;
     - **suspended chord**, kept apart from the melodic
       [suspension](../../../docs/music/lexicon.md#suspension) the lexicon already has;
     - **half-diminished seventh chord**, today named only inside
       [seventh chord](../../../docs/music/lexicon.md#seventh-chord);
     - **chord inversion** and **root position**, today only inside
       [root](../../../docs/music/lexicon.md#root);
     - **voicing**, with close and open position.

     `chord-inversion` and `voicing` are in the lexicon since the `v4-accompaniment-research`
     merge. The research reuses those entries rather than writing a second definition.
4. **Privacy.** Every brief for a web-research agent forbids putting the owner's name, email or
   any other personal data into request headers (User-Agent included), URLs or payloads. When an
   API asks for contact details, the agent sends a generic User-Agent or skips that API.

### What a fourth chord note meets

The rules and code below were written for triads. They were checked on 2026-10-12, and D261
changes none of them. Each one is an open question.

- **The arpeggio run cap (O167).** A recognized run is exactly three chord tones of one chord
  ([`rule_leapiness_arpeggio_run_limits`](../../../docs/rule_leapiness_arpeggio_run_limits.atom.md)).
  The pitch search rejects a chain of three same-direction wide intervals as
  `wide_chain_too_long` (`src/domain/pitch/pitch-motion.ts`). So a full four-note seventh
  arpeggio upward, C–E–G–B, is rejected. Allowing sevenths does not raise the cap by itself.
  Raising it to four would change a contract rule, which needs the owner's explicit approval.
- **Figures and "chord tone" (O168).** Every figure resolves onto a chord tone
  ([`rule_figures_resolve_onto_chord_tones`](../../../docs/rule_figures_resolve_onto_chord_tones.atom.md)).
  The pitch search tries chord tones first, ranks them before every other note, and the Arpeggio
  chaos control acts on chord tones only (`pitch-candidates.ts`, `pitch-ranking.ts`,
  `pitch-advance.ts`, `validation/phrase-facts.ts`). All of them assume three chord tones.
- **Phrase endings (O168).** The open ending
  ([`rule_open_phrase_ending`](../../../docs/rule_open_phrase_ending.atom.md), STABLE) ends a
  phrase on a chord tone of the degree-5 chord (tonal plans that move), on scale degree 5 (tonal
  static plans) or on a chord tone other than the home note (modal plans) (`pitch-context.ts`,
  `validation/contour-endpoint-rules.ts`). If a
  seventh counts as a chord tone, a phrase may end on it: F over G7, B over Cmaj7. Whether that
  still sounds open, or like a tension left hanging, is part of O168.
- **The carry-in and the join (O168, O171).** The carry-in holds the previous phrase's final chord
  as a triad. `carry-in.ts` checks its quality against major, minor and diminished, and
  `harmony-join.ts` compares two chords by degree, notes and quality. The next phrase opens over
  the tonic triad. An owed leap recovery or a tense final note must settle on a tonic-triad tone
  (`phrase-ending-debt.ts`,
  [`rule_join_tense_note_resolution`](../../../docs/rule_join_tense_note_resolution.atom.md)). A
  chord flag changed mid-session applies at the next phrase boundary, like any setting.
- **The harmony planner (O169).** It builds the triad on degree d from collection degrees d,
  d+2 and d+4 (`harmony-planner.ts`, `collection.ts`). Jazz and Neutral expose the same harmony
  domain for the same harmony controls.
- **What the player sees and hears (O170).** Chord symbols show major, minor and diminished only:
  their suffix comes from a table with one entry per triad quality (`notation-input.ts`), and the
  spoken score description reads it as words (`score-description.ts`). The backing's block chords
  play a close-position triad (`req_session_backing_track`, STABLE). MusicXML exports write the
  chord symbols through a fixed kind table.
- **Presets, saved settings, Vary settings and the replay key (O171).** v3.1 promises that
  Neutral and Jazz at their defaults sound exactly as before. The replay key carries the carry-in,
  so no key up to v3.2's `ifk4.` can hold a richer final chord. The replay tool lists each chord's
  triad quality (`phrase-replay-bars.ts`, `phrase-replay-names.ts`).
- **Generation time (O169).** A fourth chord tone widens the pitch search. Generation must still
  keep up at the fastest tempo.
- **Jam and the key and mode suggestion (O172).**
- **Declared intent (O173).** The atoms above, `module_harmony_candidate_domain`,
  `entity_phrase_carry_in`, `module_phrase_replay_key`, and the vision's scope, which lists every
  release through v3.2. The owner approved updating the vision now (D262); it is at 0.9, its
  wording confirmed (D263).

## v3.4 — Structural review

Recorded 2026-10-21 (D389), the owner's request, in their words: "objective there is to do an
overall structural analysis of our app, are we still sound for expansion? can/should we reduce our
initial footprint (currently set to a max of 300kb), do we have refactoring opportunities that are
worth taking. starting v4 we truly begin working on endgame and it's got a lot to do, we might even
consider splitting the app in multiple libs. this "milestone" is meant to have a clear view of our
current setup."

No player-facing behaviour. Its scope, the questions it must answer, its deliverables and who does
what are in the scoping draft, [structural-review.md](structural-review.md). It is the last v3
milestone, after v3.3 and before v4; the owner: "leave it for the last milestone of v3, there is no
need to run it prior" (D389). Open: O234–O238 ([register](../../open-questions.md#v34-structural-review-o234)).

### The lexicon page (D393)

Recorded 2026-10-21 (D393), the owner's side project, in their words: "shape a side project that
shouldn't be too onerous: we have a lexicon that sits mostly idle here, have a side page to our
app reference all words in there, it must allow alphabetical exploration, simple search. Note it
must use existing md files and not duplicate information. That's for step one (include it in 3.4).
For later (v4 or v5 depending on how they goes) we will turn this in a proper API."

v3.4's one player-facing item, independent of the structural review (D393 amends D389). Its only
source is [`docs/music/lexicon.md`](../../../docs/music/lexicon.md), read when the app is built
(D394). Its scope, what the code requires of it, and who does what are in its own scoping draft,
[lexicon-page.md](lexicon-page.md), kept apart from the review's draft because it is built, not
analysed. The API is v4 or v5 (D395). Open: O239–O246
([register](../../open-questions.md#v34-lexicon-page-o239)).

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
