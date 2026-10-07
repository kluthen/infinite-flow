# Decisions

Status: draft v2.59

Append-only record of settled decisions. Earlier logs are archived verbatim:

- D1–D46 (first release): [archive/v1/decisions-D1-D46.md](archive/v1/decisions-D1-D46.md)
- D47–D71 (2026-09-25 persona and vision session):
  [archive/2026-09-25-personas-and-vision/decisions-D47-D71.md](archive/2026-09-25-personas-and-vision/decisions-D47-D71.md)
- D72–D108 (v2 spec consolidated: v2.0–v2.3, from the v1.0 gate close through the rolling-phrase
  spec): [archive/v2/decisions-D72-D108.md](archive/v2/decisions-D72-D108.md)
- D109–D207 (v2 design and build, through the v2.0 release gate):
  [archive/v2/decisions-D109-D207.md](archive/v2/decisions-D109-D207.md)

Archived IDs keep their meaning and may be cited anywhere. Their content is now stated as settled
fact in the live documents (see the [archive index](archive/README.md) and
[archive/v2/README.md](archive/v2/README.md)). Numbering continues from **D231**.

## Decision Log

- **D208 (2026-10-07): the v2.0 release gate is closed; v2's working record is archived.** Build
  plan chunk 21 passed on 2026-10-07. Its evidence is the table in the v2.0 release notes
  (`docs/release/v2.0-release-notes.md`): 57 rows, 48 Verified, 5 hand checks done, 4 hand checks
  that follow the tag as v2.0.x checks (the USB keyboard's two, MuseScore and a MIDI tool, a DAW;
  D193, D199) and 0 not met. ISS-009 and ISS-010 are Resolved. v2.0 is released as version 2.0.0
  in `package.json`; the tag `v2.0.0` waits for the owner's approval. The milestone's working
  record moves to [archive/v2/](archive/v2/README.md), verbatim: decisions D109–D207, the
  register's notes on closed questions, and the status snapshots of the spec index and of the v2
  README. The build plan, the master spec and the v2 README stay in place: the master spec is the
  contract for the running code, and `docs/` and `ui_ux/` link into the build plan. D117, which
  the log alone carried, is now stated in [personas.md](personas.md#who-is-not-a-target). No open
  question was decided; O47–O49, O86, O100–O103 and O107–O111 stay live.

- **D209 (2026-10-07): v3's MIDI-seeded continuation is named Jam and becomes v3's lead feature;
  three candidates are attached to it.** The owner: "I've a doodle in mind, but I'm not good
  enough to iterate on it. I give it to the app, and it generates matching phrases." The core
  (the player's motif feeds the generator its rhythm, contour and interval character) stays v3
  scope, as D53 placed it; "Jam" is a working name, preferred over the owner's other proposal,
  "improvisation", which names what the player does and is already P1's name. Three candidates,
  not committed and not designed, are recorded in
  [v3](versions/v3/README.md#jam-growing-the-players-doodle): (1) a key and mode suggestion the
  player confirms, which **reverses** the earlier "automatic key detection is not planned" (v3
  README; the second deliverable in [product-foundation.md](product-foundation.md) said the
  player's motif would "initially" not trigger it); the player-selected key and mode stay
  authoritative, and the app never switches them on its own; (2) the rhythm candidates of D175
  tied to the doodle (the lock holding its rhythm, mutation as drift from it); (3) learning the
  player's taste from how they play, from positive signals only, with misses counting toward
  difficulty and never against a phrase, opt-in and visible, inside the permanent "no wrong-note
  signal, grading or scoring" constraint. Opened O112–O116. Also recorded here, since D208 was
  written before it happened: the owner approved the tag, and `v2.0.0` was tagged at `f6bcefe`
  and deployed on 2026-10-07.

- **D210 (2026-10-07): embellishment flags and player-made presets are v3 scope; sequence writing
  is a later candidate.** The owner added two features to v3, to be designed in a true spec session
  later. (1) **Embellishment flags**: the player chooses which decorating figures the generator
  may use and how much it favors each; weights are preferences, not quotas ("ish"). This places in
  v3 the "embellishment and style-figure flags" the v2 direction expected "in v2 or v3". Figures
  written as ordinary notes come first; ornaments written as symbols (O47) are the larger piece. A
  researcher prepares a catalogue of embellishments before the spec session. (2) **Presets**: a few
  more built-in presets, and presets the player creates and saves with local persistence. Also
  recorded, as a candidate for v4, v5 or v6: sequence writing with a rhythm grammar whose
  requirements are set before generation (for example, doubling beat 1 of every third measure).
  Recorded in [v3](versions/v3/README.md#embellishment-flags) and the
  [roadmap](roadmap.md#candidates-not-committed). No question was opened; the spec session will
  open them.

- **D211 (2026-10-07): v3 is split into releases; two items move to v4; four are dropped.** The
  owner's plan for v3, at the start of the v3 spec session:
  - **v3.0, storage:** everything related to storage — local persistence, "my instrument",
    review of earlier sessions and favorites. Presets are saved too but are excluded from v3.0.
  - **v3.0.1, quick follow-ups:** pre-generating phrases at Idle (D206), the stray-note filter
    with its export-pruning idea (D196), and keeping sessions (D129). All three were candidates;
    they are now v3 scope.
  - **v3.1:** embellishment flags and presets (D210).
  - **v3.2:** Jam (D209) and, "if that's what I believe it is", the key and mode suggestion
    (O119 checks the description against the owner's intent); with the rhythm lock and a mutation
    option carrying "a list of allowed mutations" (O118), designed with Jam.
  - **v3.x:** learning from positive signals stays for now, "would be great, but probably
    difficult to implement"; it will probably be removed entirely or moved to a later version.
  - **Moved to v4:** the rhythm editor and the rhythm ratios (the "fine tuning of rhythm"), with
    the Custom note density that reaches them (D175); O100–O102 become v4 questions.
  - **Dropped entirely:** the two controller-connection ideas (switching profile from the check,
    D190; the "Bluetooth" checkbox, D192), the review tooling (D128) and the end-of-measure
    chord-fit check (D174; its D108 definition stays in the v2 master spec §9 as the record of a
    design never built). Bluetooth MIDI stays best-effort (D191).

  Consequences recorded with it: the stray-note filter now lands before Jam needs it; learning
  loses the chord-fit check, whose definition gave it its main positive signal; the rhythm lock no
  longer needs the Custom note density (proposed). Opened O117 (v3.0's review of earlier sessions
  before keeping sessions, v3.0.1), O118 and O119. Recorded in [v3](versions/v3/README.md#releases-d211),
  the [v4 folder](versions/v4/README.md) and the [roadmap](roadmap.md).

- **D212 (2026-10-07): v3.0.1 merges into v3.0; the key and mode suggestion is confirmed, with a
  weighted draw; mutations get a researched catalogue; played signal patterns join learning.**
  The owner's answers on the D211 plan:
  - **v3.0.1 merges into v3.0** ("v3.0.1 could very well be just included into v3.0"). v3.0 now
    holds local persistence, "my instrument", review of earlier sessions, favorites, keeping
    sessions, pre-generating phrases at Idle and the stray-note filter. Closes **O117**: keeping
    sessions ships with the review of earlier sessions that needs it.
  - **The key and mode suggestion is what the owner meant** ("we're mostly agreeing"). Closes
    **O119**. One change: when several answers fit, the app no longer stays silent; it rates
    them and "casts a dice", a weighted draw among the most probable ("it's a jam so, in the end
    it's only so much important"). The draw is seeded (proposed) to keep sessions reproducible;
    whether the player still confirms the drawn answer stays in O113.
  - **O118 stays open:** the owner wants a researcher to build the list of mutations, as for the
    embellishments, before deciding.
  - **Learning gains a tie-in: recognising played signal patterns** ("cues"), such as a "now it's
    your turn" or an "I disapprove" figure the player plays and the app recognises. The owner:
    mandatory for the endgame, "but it's maybe too early, so we will see". It stays with learning
    in v3.x. An "I disapprove" cue is a negative signal, which the positive-only proposal did not
    allow; opened **O120**.
  - **The UI/UX todo list will be reworked** against v3's needs once this spec session is
    finished (the owner), which covers the chord-fit presentation unit D211 orphaned.
  - **Where research goes:** music research for v3 lives in `docs/music/`, the project's
    established home for music evidence, with its sources added to
    [research-sources.md](../docs/music/research-sources.md) and new terms to the
    [lexicon](../docs/music/lexicon.md); research into this codebase lives with the version, in
    `specs/versions/v3/`. Launched the same day: the embellishment catalogue, the mutation
    catalogue, key and mode estimation, played-pattern recognition, storage grounding and Jam
    grounding.

- **D213 (2026-10-07): a cue is a specific bar the player plays, never displayed, that triggers an
  effect; an explicit cue may be negative.** Closes **O120**. The owner: the cue is "the player
  playing a specific (not displayed) bar that should trigger an effect on the system", for example
  approval, disapproval, or "that's my contribution, now generate the follow-up". The proposed
  reading stands: implicit signals stay positive-only and a miss never counts; a cue is the player
  deliberately judging or steering, never the app judging the player, so a disapproval cue is
  allowed inside the "no wrong-note signal, grading or scoring" constraint. Placement unchanged:
  v3.x, "maybe not even v3 at all". The hand-off cue would be one way to end a Jam doodle (O112);
  without cues, v3.2's doodle needs another way to end.

- **D214 (2026-10-07): the spec's term for D213's cue is "played signal".** A spec-writer
  terminology call, for the owner's overall review. "Cue" is the musicians' word, but the app
  already uses it for the session cue row, where the app speaks to the player (starting-note line,
  count-in, notices); calling the player's message a cue too would mix the two directions. Found
  by the [played-pattern research](../docs/music/played-pattern-recognition.md), which also
  recommends, for Jam's "your turn" (O112), a natural marker such as a pause or a fixed length
  over a played signal, keeping played signals for meanings music has no marker for, such as "I
  disapprove". It notes that a played signal at Idle could start a session through the starting
  note (v2 master spec §6), a conflict any design must avoid.

- **D215 (2026-10-07): a Jam doodle ends on a silent bar or after four bars of notes; the generator
  gets at least one bar.** Answers the main part of O112. The owner: the most probable signals for
  the Jam generator to start are "either a silent bar or a full phrase completed (so 4 bar of
  notes)", and "we will allow the generator at least one bar worth of time to do its generation
  (hopefully that's enough to begin something)". So a doodle is one to four measures long; it ends
  when the player leaves a whole measure silent, or when four measures have been played; then at
  least one measure passes before the first generated phrase sounds. This replaces spec-writer's
  earlier proposal of one or two measures, and agrees with the played-pattern research (D214): a
  natural marker, not a played signal. Consequences, left open in O112: a "silent bar" needs a
  measure grid while the player doodles, so capture runs over a pulse (a click or the backing) at
  a tempo, which v2's Idle does not have; and one measure is 1 s at 240 BPM, about the time v2's
  ladder keeps for a single standalone attempt (D205), so Jam's first generation has to fit a
  budget that tight, or the wait grows with the tempo.

- **D216 (2026-10-07): the owner approves spec-writer's v3 recommendations as presented.** At the
  overall review promised in D212, spec-writer presented 34 recommendations; the owner: "seems
  pretty straight forward thus presented". What is now settled:
  - **v3.0, saving** ([persistence.md](versions/v3/persistence.md)): IndexedDB behind one storage
    directory, the ban kept everywhere else, nothing sent; what is saved automatically and what is
    not; per-setting fallback to the default on load; persistent storage asked for the first time
    the player keeps something; "Your data" with Delete everything; an outdated tab stops saving.
    **O124 closed:** no full backup file in v3.0; a candidate.
  - **v3.0, kept sessions and favorites** ([kept-sessions.md](versions/v3/kept-sessions.md)): the
    most recent session kept automatically; pinning keeps a session; marking a favorite pins its
    session; only what the review and export read is kept, never acknowledgements; "Keep my
    played notes", off by default and separate from pinning; a session list on every device; a
    comment of at most 500 characters, never exported. **O86 closed** as moot: a new session never
    asks for confirmation.
  - **v3.0, my instrument** ([my-instrument.md](versions/v3/my-instrument.md)): a template plus
    the player's name, range (at least two octaves) and transposition, as a fourth choice; a replay
    key version `ifk2.`. **O122 closed:** the check offers "use this for my instrument" with one
    confirmation (D79's direction, accepted despite its overlap with D190, which D211 dropped), and
    the app remembers the last controller. **O123 closed:** any range the code's rules allow is
    accepted, and the generator's success on narrow and extreme ranges is measured before the
    v3.0 gate.
  - **v3.0, pre-generation** ([pre-generation.md](versions/v3/pre-generation.md)): **O107–O111
    closed** as proposed there.
  - **v3.0, stray notes** ([stray-notes.md](versions/v3/stray-notes.md)): a fixed threshold, to be
    measured, well under 62.5 ms; never applied to acknowledgement; stored raw, filtered on reading;
    the played-notes export leaves them out by default, with an option to include them.
  - **v3.1:** embellishment weights order the search, never quotas; figures written as ordinary
    notes come first. **O47 closed:** ornaments are notated symbols with playback expansion, and
    only the main note is checked for acknowledgement. Presets are still to be drafted.
  - **v3.2, Jam:** **O125 closed:** the doodle is played over the app's pulse at the selected
    tempo, and the phrases after it keep that tempo; inferring the tempo from free playing is a
    later candidate. **O112 closed:** with D215, the silent measure that ends a doodle doubles as
    the generation measure (generation starts when a measure begins with no note sounding, and is
    dropped if the player plays again inside it); when a phrase is not ready, the wait extends
    measure by measure with the pulse going on, and v2's standalone fallback applies; the doodle is
    continued, not repeated. The doodle steers the generator's ranking rather than imposing hard
    constraints (Jam grounding). **O113 closed:** suggest only, the player confirms; at least 5
    pitch classes, 6 notes and 2 beats of sounding time; at most 3 candidates within half of the
    best in a seeded integer draw; nothing suggested when the selection is among them, or when
    under 80 % of the doodle fits the winner; computed in concert pitch, named in written pitch.
  - **v3.2, rhythm lock and mutations:** the lock is its own switch, not under Custom; it holds the
    note starts on beats 1 and 3 and the number of notes in each measure; a bend is one Close
    mutation, or one Near mutation in one measure, dropped at the next phrase (answers part of
    O103). **O118 closed:** both readings, kept apart: Vary settings gets a player-chosen allowed
    list offered as six groups, checked for a legal move before it is accepted; under Jam, a drift
    control with three or four positions unlocks the
    [mutation catalogue](../docs/music/mutation-catalogue.md) up to a distance, closest first.
    **O121 closed:** D209's "never switches the key or mode on its own" governs the suggestion
    only; Vary settings keeps mutating key and mode when the player turns it on.
  - **Still needed at handoff:** v3.0 reverses three STABLE contract guarantees
    (`req_last_session_review`, `rule_optional_midi_privacy`, `rule_same_controller_reattaches`);
    each needs a MAJOR contract version and the owner's explicit confirmation when `documentalist`
    ingests the v3 master spec. This approval is of the spec, not that confirmation.

  Still open: O10 (planner authority, for Jam), O48, O49, O100–O102 (v4), the rest of O103,
  O114, O115 and O116.

- **D217 (2026-10-07): v3.0 is consolidated into a master spec and handed to `documentalist` and
  `ux-writer`; presets are scoped down, with research on built-in ones.** The owner asked for
  `documentalist` to digest v3.0 and for `ux-writer` to design it, both delegating and following
  recommendations, with the owner's full review at the end, and for a v3.0 build plan once the
  design comes back. spec-writer consolidated the approved drafts into the
  [v3.0 master spec](versions/v3/master-spec.md). Calls spec-writer made while consolidating, for
  the owner's final review: the most recent session is saved when it ends, never during it, so a
  session cut short by closing the page is lost as in v2; a setting is saved when it changes; the
  favorites-only scope is unavailable, saying why, when a session has no favorite; "use this for my
  instrument" creates "my instrument" from the selected profile when there is none; deleting "my
  instrument" keeps the remembered controller, Delete everything forgets it. **Presets:** the
  owner: "I might have been hasty here". Player-made presets and a few more built-in ones stay
  v3.1 scope; a researcher proposes the built-in ones. The owner expects most presets to carry
  "gimmicks and more specific rhythm patterns we don't store right now", but those belong to later
  features, along with storing rhythms and "favorites cues" (the owner's words); none is v3
  scope.

- **D218 (2026-10-07): the player's Disconnect also forgets the remembered controller.** A gap
  `documentalist` found while ingesting the v3.0 master spec: v2's Disconnect forgets the
  controller for the page, and the spec did not say what it does to the controller v3.0
  remembers across reloads. spec-writer's call, for the owner's final review: it forgets it too,
  so a reload never reconnects a controller the player chose to disconnect. Master spec v1.1 §7.3
  and done item 18. The intent change set `documentalist` prepared is
  `docs/release/v3.0-intent-change-set.md`: its Part A (three STABLE guarantees narrowed, contract
  1.8 to 2.0) awaits the owner's explicit confirmation.

- **D219 (2026-10-07): the behaviours the v3.0 design settled are written into the master spec.**
  `ux-writer` designed v3.0 (UI/UX commit 29b2ff8) and listed, as ux Q67, behaviours the master
  spec left open that the design is built on. spec-writer checked each against the spec and
  confirms them, for the owner's final review (master spec v1.2): every unpinned session is
  deleted when the next session is saved (ux D183); removing a session's last favorite never
  unpins it (ux D185); switching "Keep my played notes" on while reviewing the session that just
  ended keeps its played notes (ux D191); Delete everything reloads into the first-visit state
  (ux D195); the first phrase waits for the saved settings, and a failed or slow read starts from
  the defaults and saves nothing that visit (ux D197); my instrument keeps its written range when
  its transposition changes (ux D199); the remembered controller is reattached only when MIDI
  access is already allowed, never with a prompt (ux D201), and the starting note needs the
  page's first click, tap or key press after a load (ux D202); Disconnect forgets the remembered
  controller (ux D209, as D218); theme and audio-mix changes made during a session are saved at
  its end (ux D216). ux D214 (my instrument's written range raises the staff's shared height) is
  added to the build plan's open range check. Two items `ux-writer` raised are the owner's, not
  the spec's: ux Q66, a `ux-writer` pass on `src/styles/theme.css` and `components.css`, and a
  stale version-mark line in `ui_ux/flows/generate-phrase/handoff.md`.

- **D220 (2026-10-07): five gaps the v3.0 build plan found, settled in the master spec (v1.3).**
  spec-writer's calls, for the owner's final review. (1) Pre-generation's "same phrases either
  way" contradicted itself where a session's own attempt would fail in time (phrase 2 at 240 BPM):
  a pre-generated phrase equals the session's phrase wherever the session's attempt succeeds, and
  is what a successful attempt would have produced elsewhere. (2) My instrument's transposition is
  chosen by interval name plus octaves and direction, each name fixing semitones and letter-name
  steps, so written notes, key signature and chord symbols are spelled as for the built-in
  profiles; the tritone is spelled as an augmented fourth; the check's semitone offset maps to the
  same names. (3) Vary settings and Tension across phrases discard pre-generated phrases; the tempo
  and Rising tempo do not, since tempo never affects generation. (4) Persistent storage is asked
  for once per visit, on the first keep, unless already granted (the design's choice; the spec
  said "the first time"). (5) An outdated tab saves and deletes nothing and offers no Delete
  everything (the design offered it; the spec wins, so the UI/UX documents need that one change).
  The build plan is [build-plan.md](versions/v3/build-plan.md), draft v1.

- **D221 (2026-10-07): the owner's final review of v3.0: approved, with three explicit answers.**
  (1) **Contract change set, part A: confirmed.** The three STABLE guarantees are narrowed as
  `docs/release/v3.0-intent-change-set.md` words them, and the contract goes from 1.8 to 2.0;
  `documentalist` applies it (the build plan's Gate A). (2) **ux Q66: allowed.** One `ux-writer`
  pass edits `src/styles/theme.css` and `components.css` (build plan chunk 1). (3) **The stale
  `%% end v2 new` line** in `ui_ux/flows/generate-phrase/handoff.md`: remove it. Everything else
  is approved as presented ("otherwise I globally agree"): spec-writer's calls D217–D220, the
  v3.0 design decisions in `ui_ux/decisions.md`, and the
  [v3.0 build plan](versions/v3/build-plan.md), whose per-chunk workflow and waves stand as
  written. The master spec is v1.3, approved.

- **D222 (2026-10-07): two wording fixes from `documentalist`'s chunk 0 re-sync (master spec
  v1.4).** spec-writer's calls, within the approved behaviour; nothing the owner decided changes.
  (1) §7.3 said the remembered controller "does not change v2's audio-unlock rule", while saying
  the starting note waits for any first click, tap or key press. v2 unlocked sound only on a Start
  or Connect controller click; with a remembered controller there is no Connect click, so the rule
  does widen, as the design (`ui_ux/flows/play-session/`, "Before the first click") and the atoms
  already have it. §7.3 and §10 now say so; the rule is not a contract guarantee. (2) Definition
  of done item 6 said a save deletes "the previous unpinned session"; §5.1, the design and the
  atoms say every unpinned kept session, one unpinned earlier included. Item 6 and
  `kept-sessions.md` §1 now match §5.1.

- **D223 (2026-10-07): an outdated tab offers no deletion of any kind (answers ux Q68; master spec
  v1.4).** spec-writer's call, already implied by the approved rule that an outdated tab "saves
  and deletes nothing". The session list's `Delete`, the review's `Delete session` and
  `Delete played notes`, and the offer to delete kept played notes that turning
  "Keep my played notes" off makes are all absent there, as `Delete everything` already is; the
  reload notice is the way forward. Rejected: a deletion that only hides a session for the visit,
  which would show a result the device does not hold. §4.3 and definition of done item 14 now say
  "no deletion of any kind".

- **D224 (2026-10-07): a visit whose saved data could not be read offers Delete everything, and
  no other deletion (master spec v1.4 §4.4).** spec-writer's call, writing down what the approved
  design already does (ux D211, D219): the spec said such a visit saves nothing but not whether it
  may delete. Delete everything is the way out of saved data damaged for good; unlike an outdated
  tab, nothing newer is at risk. Raised by `ux-writer` with Q68 (ux D221).

- **D225 (2026-10-07): a failed read, three gaps closed (master spec v1.4 §4.4).** spec-writer's
  calls, raised by `documentalist`'s v1.4 re-sync. (1) **The player is told** a failed or slow
  read happened, that the visit saves nothing and that reloading may fix it, outside a running
  session: the design's "Unusable data" notice already does; the spec now says so. (2) **A slow
  read is treated like a failed one**, Delete everything included: the player cannot tell the two
  apart, the notice points to reloading first, and Delete everything asks for confirmation; the
  reason is reworded from "damaged for good" to "the way out when reloading does not help".
  (3) **Newer data wins over a failed read:** whenever data written by a newer version is known to
  exist, at load or later in the visit, no deletion of any kind is offered, Delete everything
  included, since it could destroy what the newer version saved. This changes one design rule:
  "Unusable data, set at load, is never replaced" may keep its notice, but its Delete everything
  must go once a newer version is detected (`ux-writer` to apply; which notice shows is its call).

- **D226 (2026-10-07): a failed-read visit offers no deletion in the review either (answers ux
  Q69; master spec v1.4 §4.4).** spec-writer's call, following `ux-writer`'s recommendation. D224
  said Delete everything is the only deletion such a visit offers, but the review of the session
  it holds in memory still offered Delete session and Delete played notes, which touch only
  memory. Both are removed there, as in an outdated tab: one rule for every visit that saves
  nothing, and no deletion that looks permanent while nothing is kept. Rejected: rewording §4.4 to
  "the only deletion of saved data", which would keep two different sets of review controls for
  the two saving-off states.

- **D227 (2026-10-07): definition of done item 14 covers the failed-read visit too (master spec
  v1.4).** Raised by `ux-writer`'s ux-critic pass: no done item tested §4.4's rules (D224–D226).
  Item 14 now adds that such a visit starts from the defaults, tells the player, writes nothing
  (no change retries a save, ux D224), and offers Delete everything and no other deletion, and
  none once newer data is known. The build plan names the tests (chunks 12, 14, 15).

- **D228 (2026-10-07): v3.1 presets are generator configuration, kept modest (closes O126).** The
  owner: presets are "mostly generator configuration", and "a bit cheap" for now, as Neutral and
  Jazz already are. (1) **What a preset holds:** the generation settings only. Instrument, tempo,
  key and mode are out, so **a preset never sets the collection** (the scale or mode control),
  answering O126 against spec-writer's proposal; built-in presets lean on the other settings
  (and, once v3.1 has them, embellishment weights). (2) **Built-ins are ours:** the project
  provides its own configurations for various presets; the player may customize them. (3) **How
  a player makes one:** select a preset, change settings (as with Neutral and Jazz today, which
  shows "Custom"), then save it under a name. (4) **The preset selector becomes a combo box and
  moves higher in the controls** (the owner's direction for `ux-writer`). (5) **Presets do not
  intersect with "my instrument"** at all, for now. (6) **Later, not v3:** presets grow richer
  with gimmicks, preferred rhythm cues, and restrictions on range, notes, key and mode; they
  become integral to the endgame, where each character (protagonist, antagonist), location or
  event has its own preset, including an instrument preference and a tone.

- **D229 (2026-10-07): a key and mode restriction joins v3.1 presets, if it is cheap (amends
  D228).** The owner: "if key and mode restriction are easy to handle for v3.1 then add it (so
  that it preserve current selection)". A preset may carry a restriction on which keys and modes
  are allowed; selecting the preset **never changes the player's current key and mode**. Still a
  preset never *sets* the key or mode (D228). Conditional on a cost check against the code
  (the v3.1 draft does it); if it is not cheap, it stays with the later, richer presets. Read by
  spec-writer as (proposed, to confirm): the restriction bounds what the app itself picks (Vary
  settings' key and mode moves; in v3.2, the key and mode suggestion's candidates); what happens
  when the current selection is already outside the restriction is open (O160).

- **D230 (2026-10-07): a preset may change the current key and mode (amends D228 and D229; closes
  O160).** The owner: "i will allow the preset to change current mode and key". This reverses
  D229's "selecting the preset never changes the player's current key and mode" and D228's "key
  and mode are out" as far as the restriction goes. Read by spec-writer as: when the player
  selects a preset whose key and mode restriction excludes the current selection, the selection
  moves inside the restriction; a restriction to one key and one mode therefore sets them; a
  current selection already inside is kept. Choosing a preset is the player's own act, so this
  does not break the rule that the app never switches key and mode on its own (D209). Which
  allowed key and mode the selection moves to is left to the v3.1 draft (proposed: the preset's
  first listed). Still conditional on D229's cost check.
