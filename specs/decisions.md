# Decisions

Status: draft v2.77

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
[archive/v2/README.md](archive/v2/README.md)). Numbering continues from **D262**. D259–D260 are
on branch `v4-accompaniment-research`, not merged yet.

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
  preset never _sets_ the key or mode (D228). Conditional on a cost check against the code
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

- **D231 (2026-10-07): a preset's key and mode restriction guides, never blocks (refines D230).**
  The owner: when a preset restricted to some keys and modes is selected, the key and mode
  controls **highlight** the keys and modes for which the preset is valid; **nothing is
  prevented**, every key and mode stays selectable. Choosing one outside the restriction is
  opting out: the preset is **no longer the selected one**, exactly as today when a change to
  Jazz's settings leaves Jazz ("nothing actually really changed beside the new setting"; the
  selection then reads Custom, every other setting untouched). With D230, selecting the preset
  still moves an outside key and mode inside. The highlight is the owner's direction for
  `ux-writer`. Still conditional on D229's cost check. Proposed by spec-writer, to confirm in the
  v3.1 draft: Vary settings, when it moves key and mode under a restricted preset, stays inside
  the restriction, so the app never opts the player out of their preset by itself.

- **D232 (2026-10-08): the v3.2 rhythm lock is strict, with an optional list of allowed rhythm
  changes, each lasting one phrase (settles O151 and the rest of O103; amends the v3.2 draft's
  tension-driven bends).** The owner checked his reading: the lock fixes the rhythm only, every
  note start and length and so every rest, across the four measures, while the pitches keep
  changing; outside a Jam it locks the rhythm of phrase 1, the phrase on screen at Start; in a Jam
  it locks the rhythm nearest the doodle that the rhythm grammar can write (the exact played rhythm
  needs v4's editor, O102). Rhythm changes under the lock are **the player's option**, not an
  automatic bend: an "allowed rhythm changes" list of small edits from the
  [mutation catalogue](../docs/music/mutation-catalogue.md) (such as split a note, merge two notes,
  add or remove a rest, move a note by a sixteenth); an empty list keeps the lock strict. Each
  change **lasts one phrase**; the next phrase returns to the locked rhythm (spec-writer's
  recommendation, accepted: "that's a good first iteration on mutations"), which keeps D175's
  "a mutation cannot alter the rhythm durably while the lock is set". **Wider mutation options go
  to v4** ([v4](versions/v4/README.md#placed-here-proposed)). Still open: which edits the v3.2
  list offers, and how often a change happens (O157).

- **D233 (2026-10-08): v3.1 drafts approved as proposed (closes O127–O139, O161, O162).** The owner:
  "globally I'm okay with both 3.1 and 3.2, you may proceed". Accepted, as the drafts propose:
  (1) ornaments (trills, grace notes and other symbol figures) are not v3.1; they get a release of
  their own after v3.2, starting with the grace note (O127); (2) seven figures written as ordinary
  notes, each with one four-level setting (Off, As today, Favored, Strongly favored), weights as
  seeded candidate ordering, never quotas, and chromatic figures allowed from any preset, so
  "Neutral is entirely diatonic" becomes Neutral's default rather than a rule (O128, O129, O131);
  levels never remove the Tension control's own figure (O130); the cost guard (O132); a new
  replay-key version for the levels (O133); (3) every preset holds all ten preset-held controls,
  the figure levels and the key and mode restriction, so choosing Neutral or Jazz also sets
  Tension, Leapiness and Arpeggio chaos (O135); (4) Vary settings' Style step moves one figure one
  level, replacing the Neutral/Jazz flip (O134); (5) eight built-ins: Neutral, Jazz, Gentle and
  Speed drill (any key and mode), Reel (Mixolydian or Dorian), Bebop and Pop song (Major), Modal
  (Dorian) (O136); (6) choosing a restricted preset keeps the key when allowed and takes the first
  listed mode (O161); (7) saving a player preset keeps the restriction in force (O162); player
  preset management, Custom and loading, and what records a preset as proposed (O137–O139).
  Details: [embellishment-flags.md](versions/v3/embellishment-flags.md),
  [presets.md](versions/v3/presets.md). The v2 rules and atoms these change (Vary settings'
  profile flip, the Custom state's retained grammar, "Neutral is entirely diatonic") are revised
  through the v3.1 master spec and `documentalist`.

- **D234 (2026-10-08): v3.2 drafts approved as proposed (closes O140–O150, O152 as superseded
  by D232, O153–O157, O10 for v3.2, and O114).** Same approval as D233. Accepted: (8) a Jam is a saved switch needing a controller,
  started by Start or the key's home note; a count-in measure, the doodle, then a generation
  measure and a read-in measure, so two measures before phrase 1, with the wait extending measure
  by measure up to three and v2's standalone phrase last (O140, O141; D215's "at least one" is
  kept); quantising, capture edge cases, drift, sound during capture, review and exports as
  proposed (O142, O143, O146, O147, O155); (9) the doodle quantised to the grid is a generation
  input the player gave on purpose: kept with a kept session, carried by the replay key, engraved
  in the review; the raw notes keep every played-notes rule (O144). This changes the
  declared-intent contract (played-notes privacy, the replay key), so `documentalist` prepares the
  change set and the owner confirms its exact wording at the v3.2 master spec review, as for v3.0;
  (10) the key and mode suggestion appears in the review, with "Use it", "Keep mine" and "Jam again
  on this doodle" (O148), its seed is the quantised doodle alone, and labels and priors as
  proposed (O149, O150); (11) matching is by shape in v3.2, never quoting the doodle (O145);
  planner authority stays as D83 settled it for v2, the doodle only orders candidates (O10, for
  v3.2); the lock holds the doodle's nearest writable rhythm and drift is the mutation ladder
  (O114). The rhythm lock follows D232; O153, O154 and O157 as proposed. Details:
  [jam.md](versions/v3/jam.md), [key-and-mode-suggestion.md](versions/v3/key-and-mode-suggestion.md),
  [rhythm-lock.md](versions/v3/rhythm-lock.md).

- **D235 (2026-10-08): gaps settled while consolidating v3.1 (master spec Part B v1.0).**
  spec-writer's calls, within D233; none changes what the product is. (1) Choosing a preset never
  replaces the phrase on screen, even when it moves the key or mode: a control change at Idle never
  regenerates (only an instrument switch does); the presets draft said otherwise. (2) `ifk3.`
  carries everything `ifk2.` does except the profile name and its Custom flag, plus the seven
  figure levels. (3) Saving or deleting a preset can change the restriction in force, and then
  discards pre-generated phrases; deleting the selected preset, or Custom's base, leaves Custom
  with no base and no restriction. (4) Vary settings' figure step takes the profile flip's single
  place in the draw (setting, then figure, then direction). (5) Tension across phrases never marks
  Custom. (6) Built-in presets have a fixed internal identifier, so their names can change. (7) Name
  uniqueness and the 50-preset limit are checked only on save or rename; duplicates or excess
  arriving otherwise load as they are. (8) Player presets are read in the same start-up read as the
  saved settings; a failure there is a failed-read visit. (9) In a failed-read visit, as in an
  outdated tab, presets made or changed last for the page. (10) A refused preset save keeps the
  preset for the visit and tells the player at once. (11) v3.0 saved settings migrate: the saved
  profile becomes that built-in (or Custom based on it) with its figure levels, then saved values
  win. (12) Sessions kept by v3.0 show their recorded profile as label. (13) Saving a player preset
  (new, or changes) triggers the persistent-storage request; renaming does not. (14) Choosing a
  preset waits while a phrase generates; save, rename and delete do not. (15) If the cost guard
  adopts its fallback (passing and neighbor tone never both Off), the level control refuses the
  second with a reason, Vary settings draws again, and loading raises the neighbor tone to As
  today. (16) Delete everything also removes unreadable preset records. (17) With no restriction in
  force, no Vary settings move is drawn again for a restriction's sake. (18) Terminology:
  "musical profile" and "grammar" leave the player's vocabulary; Part B uses preset, built-in
  preset, player preset, selection, Custom and its base, figure, free figure and Tension's
  scheduled figure, figure level, restriction, restriction in force.
  **Raised for the owner:** four STABLE contract guarantees change (the mutation profile flip is
  removed; the settings that mark Custom grow; the mutation scales gain figure levels; the
  revert-at-session-end wording), so the contract needs a major version and the owner's explicit
  confirmation, as for v3.0; D233 approved the drafts, not that wording.

- **D236 (2026-10-08): gaps settled while settling the v3.2 drafts (draft v2).** spec-writer's
  calls within D232 and D234; none changes what the product is. Each is marked "draft v2" in its
  document. **Rhythm lock** ([rhythm-lock.md](versions/v3/rhythm-lock.md)): the v3.2 allowed
  rhythm changes are five kinds (move a note start by a sixteenth or an eighth, move a rest, split
  a note, merge two notes, add or remove a rest), one change being one edit in one measure, or in
  measure 1 or 2 repeated in 3 or 4, since the grammar copies measures 1–2 into 3–4; a change
  happens in 1 phrase in 4, 1 in 2 on Tension across phrases' tenser phrase, tuned by ear at the
  listening check; changes start at phrase 2, are seeded by the phrase's own seed (so pre-generated
  phrases match), are always measured from the locked rhythm (they never add up), and are never
  shown; no candidate means no change; forced bends happen only on a step down from Build to Lift
  or on the narrow-window step-down, by drift's per-measure distance; the lock, the allowed changes,
  drift and the Jam switch are saved like the session options, set at Idle or in the review, and
  presets never hold them; the term "bend" gives way to "rhythm change" and "forced bend", and
  Vary settings' list becomes its "allowed groups". **Jam** ([jam.md](versions/v3/jam.md)): Jam on
  with no controller behaves as Jam off; a controller lost before phrase 1 sounds ends the Jam with
  no review; "Jam again on this doodle" is offered in every kept Jam session's review, and a held
  doodle lives in memory only; a Jam whose phrase 1 fails at every rung keeps nothing; stray notes
  don't count against the 30 s first-note wait; Rising tempo counts from phrase 1; a Jam session's
  stored shape is a new data version; in an outdated tab or failed-read visit Jam works in memory
  and saves nothing. **Suggestion** ([key-and-mode-suggestion.md](versions/v3/key-and-mode-suggestion.md)):
  a preset's restriction neither bounds nor reweights the candidates, and "Use it" outside it makes
  the selection Custom; a "Keep mine" decline is kept with the kept Jam session. Known limit to show
  the owner: under Strict variety with Straight syncopation the grammar offers almost no allowed
  change (Eighth: add or remove a rest only; Sixteenth: none; Quarter: one rhythm); widening it is
  grammar work, v4. The research note [jam-grounding.md](versions/v3/jam-grounding.md) is refreshed
  (v2), with a measured table of the rhythm domains.

- **D237 (2026-10-08): one term per concept across the v3.1 and v3.2 specs, and two small
  inconsistencies (found by the lexicon update).** spec-writer's calls. Terms: **key** is the
  Written key value (the home note) and **mode** the Collection value (nine options, Major and
  Minor included) everywhere, the suggestion's "plain words" included; Vary settings' v3.1 step is
  the **figure step**, in an allowed group named **Figures** (not "Style"); **allowed groups**
  everywhere (no "allowed list"); **Tension's scheduled figure** (not "bound figure"); the
  app's sound during a Jam's capture is the **click** (the lexicon keeps "pulse" for the beat
  itself); **distance** for the mutation catalogue's scale (not "drift distance"); **rhythm change**
  and **forced bend** (no bare "bend"); US spelling, **quantize**. Drift's positions keep the names
  Close, Near and Free: each unlocks changes up to that distance, so the shared names are meant.
  Inconsistencies: (1) the suggestion's **"Use it" changes the key and mode like a change by hand
  and regenerates nothing on screen** (D235(1)); in Jam mode no phrase shows at Idle, so the next
  Jam simply generates in the new key and mode; (2) **"Use it" keeps the held doodle**, as an
  exception to "a control change at Idle drops the held doodle", since continuing the doodle in
  the suggested key is the point of "Jam again on this doodle".

- **D238 (2026-10-08): gaps settled while consolidating v3.2 (master spec Part C v1.0).**
  spec-writer's calls within D232, D234 and D236. **Refines D237(1):** "Use it" regenerates nothing
  when no doodle is held; with a held doodle it keeps the doodle and regenerates the held doodle's
  phrase 1 from it in the new key and mode, since that phrase must continue the doodle. A held
  doodle's phrase 1 is generated at Idle through the same rungs, with no deadline, and v2's Idle
  rules and pre-generation apply to it. Every change that discards pre-generated phrases drops the
  held doodle, except "Use it" and Regenerate (which makes a new phrase 1 from the doodle); tempo,
  Rising tempo, the mix and the theme keep it; a controller lost at Idle drops it. "Jam again on
  this doodle" turns Jam on, needs a controller, and is not an answer to the suggestion. Phrase 1's
  middle rung is one attempt; Jam phrases 2 onward keep the doodle's preferences on every rung. The
  doodle's join carries its last pitch with no arriving interval; under Varying with no window
  holding it there is no join. Ordering outside a drift band, for "nearest the doodle", the forced
  bend and the narrow-window relock: total edits over four measures, then seeded order. The melody
  move preference orders candidates within each existing rank, never across. The capture tempo is
  kept for review and exports only, never a generation input. The starting note takes the lower
  octave on a tie. Notes between the doodle's end and phrase 1 belong to nothing and are never
  exported. Both scopes of both exports open with the doodle; the MIDI files align (doodle at time
  zero, phrase 1 at the next barline, waiting measures not written); no backing under the doodle.
  Deleting played notes deletes the raw doodle and keeps the quantised one. A kept session's
  suggestion is recomputed against the current selection. Vary settings left with no legal move by
  a change at Idle becomes unavailable and says why, the player's choice kept. The settings that
  discard pre-generated phrases are the union of the drafts' lists. Unreadable saved values for
  the new settings load as defaults. **Favoring the figures found in the doodle is deferred**
  (Part B had placed it in v3.2). Part C also names the STABLE contract guarantees v3.2 changes;
  the owner confirms their wording at the review.

- **D239 (2026-10-08): the owner approves master spec Parts B (v3.1) and C (v3.2), and the
  finishing order.** The owner: "ok agreed", to approving both parts as consolidated (with D235–D238
  and the terms pass) and to the order: (1) `documentalist` ingests Parts B and C and writes the
  exact wording of every contract guarantee they change, v3.1's and v3.2's, as one change set,
  applying nothing to STABLE entries; (2) the owner confirms that wording (as for v3.0, D221);
  (3) `ux-writer` designs v3.1 and v3.2; (4) build plans follow. The approval of the parts is not
  the confirmation of the contract wording.

- **D240 (2026-10-08): the silence timer in a Jam.** spec-writer's call, from `documentalist`'s
  ingestion of Part C. Today the starting note counts as a first note and starts the 30-second
  silence timer; in a Jam started by the home note that timer would run out about a measure before
  the Jam's own 30-second wait, which counts from the end of the count-in. Neither the home note
  that starts a Jam nor the doodle's notes start the silence timer: before phrase 1 sounds only
  Part C's pre-phrase-1 rules end a Jam for silence; from phrase 1 on the timer works as after a
  Start click in v2, waiting for a first note played from phrase 1 on. A Jam on a held doodle
  starts on phrase 1's first note, as in v2. Changes the proposed contract wording of the silence
  timer guarantee.
- **D241 (2026-10-08): a controller lost during a fresh Jam's count-in ends the Jam at once.**
  spec-writer's call, same source: Part C listed the capture, the generation measure, an extended
  wait and the read-in measure, not the count-in, though a capture that follows cannot happen
  without the controller. A Jam on a held doodle keeps v2's 30-second rule from its count-in on;
  Part C's contract summary and done item 16 had wrongly said "before phrase 1 sounds" for every
  Jam. Changes the proposed contract wording of the two controller guarantees.
- **D242 (2026-10-08): "save changes" asks the restriction only when the key or mode lies outside
  the preset's restriction.** spec-writer's call, from `documentalist`'s ingestion and ux Q71
  (§B6.6 and §B10 disagreed). Inside it, nothing is asked and the preset keeps its restriction.
  Outside it (the player opted out), the save-as-new choices are asked, "as now" then meaning any
  key and mode, and the answer replaces the old restriction: keeping it would save a preset whose
  own key and mode lie outside it, loading as Custom after a reload. Matches ux D231.
- **D243 (2026-10-08): leaving Jam mode at Idle leaves the workspace empty.** spec-writer's call,
  from ux Q70: Part C said it "generates a phrase as at first load", but at first load the app
  generates nothing (v2: the player generates a phrase by hand). Turning Jam off, a controller lost
  at Idle, or a held doodle dropped with Jam out of effect gives the empty workspace; nothing is
  generated until the player asks. Keeps v2's rule that at Idle only an instrument switch generates
  by itself. Matches ux D236.
- **D244 (2026-10-08): a Jam played on a held doodle keeps it.** spec-writer's call, from ux Q72:
  Part C's list of what drops a held doodle did not cover the end of the Jam played on it. It stays
  held; after that Jam's review, Idle shows a phrase 1 newly written from it with a fresh seed. A
  doodle captured by a fresh Jam is never held by itself; only "Jam again on this doodle" holds
  one. Matches ux D239. Also fixed the same day, no decision needed: Parts B and C's opening
  paragraphs still said "awaiting the owner's approval" after D239.
- **D245 (2026-10-08): Part C's contract list completed.** spec-writer's call, from
  `documentalist`'s ingestion: C13 now also names the cancelled-attempt guarantee
  (`rule_dropped_attempt_cancelled`, broken by a fresh Jam's phrase 1 cancelled at its deadline)
  and the rhythm lock's locked rhythm reaching later phrases beside the join (with
  `rule_join_carry_in_limited`). Both were already in `documentalist`'s change set; the spec now
  matches it. No behaviour changed.
- **D246 (2026-10-08): the owner confirms the v3.1 and v3.2 contract and vision wording.** The
  owner: "i agree with the wording proposed", answering the plain-words list of the sixteen STABLE
  guarantees v3.1 and v3.2 change (`docs/release/v3.1-v3.2-intent-change-set.md` part A, after
  D240–D245), the single contract bump 2.0 → 3.0 for both releases (part B), and the combined
  vision revision 0.7 → 0.8 made of v3.0's change set part C and this change set's part C. This
  is the confirmation D239 asked for (B11, C13); `documentalist` applies it. Every proposed
  wording holds for today's code, so it is applied now rather than at the first v3.1 merge.
- **D247 (2026-10-08): deleting a kept Jam session drops a doodle held from it.** spec-writer's
  call, from ux Q73: C5.11's list of what drops a held doodle missed it. Deleted data is gone
  (v3.0), so a later Jam must not put the doodle back into a kept session. Matches ux D247.
- **D248 (2026-10-08): a Jam on a held doodle that ends during its count-in keeps the doodle.**
  spec-writer's call, from ux Q74: C5.13's "the doodle is not held" describes a fresh Jam's
  doodle; D244 already keeps a held doodle across the Jam played on it. Idle shows the same phrase
  1 again. Matches ux D251.
- **D249 (2026-10-08): the "no mode fits" note is one plain sentence in every review of that
  Jam.** spec-writer's call, from ux Q75: C6.3's "once" meant said once, not repeated per note;
  showing it only the first time would need a stored flag and leave later reviews of a kept
  session unexplained. Matches ux D251.
- **D250 (2026-10-08): four precisions to Part B for the v3.1 build plan.** spec-writer's calls,
  from the build plan draft's questions (`build-plan-v3.1.md` §10), each the plan's reading:
  (1) a figure level missing from a settings or preset record is Off only when the record's data
  version predates that figure; missing for a figure that existed then, it is an invalid field and
  takes its first-load value (B7). (2) v3.0 kept sessions are migrated when the database opens; if
  that does not fit the start-up read's time limit, each is mapped the same way when read, with no
  difference for the player (B9). (3) `ifk3.` is written for every phrase: a built-in instrument by
  its id, "my instrument" inline (B9). (4) A v3.0 kept session's preset label takes its customized
  form from phrase 1's reproduction inputs, which hold the session's start state (B9). No behaviour
  the owner approved changes.
- **D251 (2026-10-08): five precisions to Part C for the v3.2 build plan.** spec-writer's calls,
  from the build plan draft's questions (`build-plan-v3.2.md` §10), each the plan's reading:
  (1) the request's lock input has three forms: off, on with nothing locked yet (a Jam's phrase 1,
  chosen nearest the doodle), on with the locked bars; `ifk4.` carries it (C11). (2) The phrase
  that re-locks after a narrow-window step-down draws no rhythm change (C7.1, C7.4). (3) Turning a
  note start into a rest start at the same tick is one edit; ties are not starts (C8). (4) A
  candidate that also differs by a tie elsewhere is not "exactly one change" (C7.4). (5) Part C's
  "there is no session seed" was stale against Part A §8's fixed session seeds; reworded (C6.2,
  C14, C15) with no behaviour change: the suggestion is seeded by the doodle alone, the rhythm
  change by each phrase's own seed, and a fresh Jam fixes its session seeds at Start.
- **D252 (2026-10-09): build plans run wave by wave; a chunk checks only its own change.** The
  owner's call, for a better quality-to-cost ratio than the per-chunk workflow v1, v2 and the
  first v3 plans used: the last iterations of that workflow cost a lot. He accepts that the
  chunks of one wave may drift a little apart until the wave gate. It applies to the v3.0, v3.1 and
  v3.2 build plans (§3 of each) and to every later version's build plan. (1) **Wave start:**
  `documentalist` runs one intent preflight for the whole wave, with every architecture capture
  the wave needs, before any code; a chunk runs no preflight of its own. (2) **Chunk:** tests
  first, implement, verify, documents. Verify covers only the chunk's change: its Done when, the
  tests it adds or changes, the existing unit tests related to the files it touches, typecheck,
  lint and format, and a debug run. It runs no full suite, sweep, bundle or timing measurement
  unless that check is the chunk's point (a measurement or performance chunk, or that area's own
  chunk). Generator chunks keep the replay-corpus guard at chunk level, because it tests exactly
  what they change. (3) **Wave gate:** `npm run quality`, the sweep when a wave chunk needs it,
  the bundle figure, the measurements chunks defer to it, then one post-task sync over the wave
  (every chunk's revisions and drift checks). (4) **Order:** wave by wave, number order inside a
  wave, replacing the plans' plan-wide "number order", which interleaved waves in time. A chunk
  still blocked when the rest of its wave is done moves to the next wave. (5) **Branches** (the
  owner's choice among three): each chunk merges into a wave branch without owner approval; the
  wave merges into `main` after its gate, when the owner asks, so `main` only receives gated
  waves. v3.0 wave 0 is the switch-over: chunk 0 stays as merged, and chunk 1's branch merges into
  the wave-0 branch with chunk 2.
- **D253 (2026-10-09): my instrument's transposition is entered in semitones; its interval name is
  derived and shown.** The owner's call, after the v3.0 wave-1 intent preflight (build plan, Wave
  records), which found the design's semitone stepper ("{n} lower / Same / {n} higher") at odds
  with master spec §7.1. It reverses §7.1's "chosen by name from a list" (master spec v1.3, from
  the build plan's review) and the atom's "never as a bare number of semitones": the player enters
  a number of octaves and a semitone count with a sign (negative: a written note sounds lower;
  positive: higher). The interval name is derived from that and shown as the result. §7.1's
  spelling rule stays: each semitone count maps to one name by a fixed table (0 unison, 1 minor
  second, 2 major second, 3 minor third, 4 major third, 5 perfect fourth, 6 augmented fourth, the
  tritone always spelled so, 7 perfect fifth, 8 minor sixth, 9 major sixth, 10 minor seventh, 11
  major seventh, plus octaves), and that name fixes the letter-name steps used to spell written
  notes, the key signature and chord symbols. Spec-writer's reading, to confirm (O163): one
  direction for the whole transposition, octaves from 0, semitones from 0 to 11, the octaves
  bounded only by both range ends sounding inside the MIDI note range, as the design's stepper
  already is; a sign on the semitone count alone could not say which way a whole-octave
  transposition goes. Master spec v1.5 (§7.1, §7.2, item 16, §14); build plan chunk 16 takes the
  octaves and signed semitones as `makeMyInstrument`'s input; `ux-writer` adds the derived name to
  the sheet (ux Q76).
- **D254 (2026-10-09): my instrument has a fixed id, `my-instrument`, apart from its display
  name.** The owner's call, same preflight (it asked for the open id's literal). The id is
  kebab-case like the built-ins' (`c-keyboard`), is stored in saved settings, kept sessions and
  replay keys, and is never renamed. The display name is a separate property the player may change
  at any time; changing it changes nothing stored by id. Master spec v1.5 (§7.1, §12, item 16);
  build plan chunks 6, 9 and 16.
- **D255 (2026-10-09): a session-wide record keeps the session's own facts, its session seed
  among them.** The owner's call, same preflight (chunk 23 asked where the session seed is
  recorded). The session seed is the one seed drawn when a phrase 1 becomes one a session could
  start from; every later phrase's seed, every failure-ladder rung's seed and the settings-mutation
  seed derive from it. The session holds it in a session-wide record from Start, and a kept
  session keeps that record with the session's other facts ("and other information" of that
  kind). Which other facts, and in what form, is left to the owner (O164). Master spec v1.5 (§5.2,
  §8, item 8); build plan chunks 9 and 23. Also corrected the same day, no decision needed: chunk
  23's scope and files, from the same preflight (the generator draws from no named random stream,
  it orders candidates by seeded tie keys and only the settings mutation uses indexed streams; the
  tension arc draws nothing, being a pure function of the phrase number; the Idle-side file
  `src/composables/use-generation-session.ts` added), and chunk 16's stale "flagged to
  `spec-writer`" wording.
- **D256 (2026-10-09): the owner confirms the Part D revision of `rule_ephemeral_session_state`.**
  Its "never stored" clause gets the one-directory wording: storage code only in `src/storage/`
  (`docs/release/v3.0-intent-change-set.md` part D; build plan chunk 3, whose preflight row asked
  for this confirmation at the wave gate). `documentalist` applies it in the wave-1 post-task sync;
  the atom's full revision stays with chunk 7.
- **D257 (2026-10-09): my instrument's transposition has one direction for the whole interval, and
  is entered with one stepper.** Resolves O163. The owner's answer ("ok") accepts spec-writer's
  recommendation, settling what D253 left open. The value is a number of octaves from 0 up, a
  number of semitones from 0 to 11, and one direction (lower, the same or higher) for the whole
  transposition, octaves included: a semitone count of 0 has no sign, so a sign on the semitones
  alone could not say which way a whole-octave transposition goes (an instrument sounding one
  octave lower is 1 octave, 0 semitones, lower). The octaves have no bound of their own; the only
  bound is that both ends of the range sound inside MIDI notes 0 to 127. The player enters it with
  the design's one stepper, which counts semitones across octaves ("14 lower" is 1 octave and 2
  semitones lower, a major ninth lower), not with separate octave and semitone inputs; the
  derived interval name is shown beside the stepper and already carries the octaves. Master spec
  Part A v1.6 (§7.1, §14: the proposed tag and the open point removed); build plan v4 (chunks 16
  and 20, wave 7); `ux-writer` still adds the derived name (ux Q76), but no longer waits on this.
- **D258 (2026-10-09): the session-wide record holds what master spec §5.2 lists, and nothing
  derivable from the session seed.** Resolves O164. The owner adds no other facts to the record
  now ("nothing comes to mind right now"). The record holds what D255 named: the session's own
  facts as §5.2 lists them (start date and time, length, number of phrases, musical profile,
  instrument by its id `my-instrument` or a built-in id, starting and reached tempo, pinned,
  comment, app version) and the session seed. The record stores nothing that can be derived again
  from the session seed: not the later phrases' seeds, the failure-ladder rungs' seeds or the Vary
  settings mutation seed (and the tension arc draws nothing, being a function of the phrase number
  alone). This is about the session-wide record only: each phrase keeps its own seed in its
  reproduction inputs, as §5.2 and §8 already say, so a replay key needs nothing more. Any further
  fact the session's replay turns out to need is settled in build plan chunk 9's architecture
  capture and put to the owner then, as a new question; until the owner answers, nothing is
  added. spec-writer's recommendation to also keep the three "During a session" options as they
  were at Start (Vary settings, Tension across phrases, Rising tempo) is not settled: the owner
  did not take it up. It stays a note for chunk 9 to raise if replay needs it. Master spec Part A v1.6 (§5.2, §14); build plan v4
  (chunk 9, wave 3).
- **D261 (2026-10-12): v3.3, richer chords, opt-in, after a research phase.** The owner's
  request, in their words: "managing higher end chords (optionnal, with flags to be set from the
  front end as to what's allowed and what's not). It will be preceeded by an internal doc/web
  research on chord to ensure we use appropriate data for chord generation." v3.2 (Jam) was the
  last v3 release, so this is a new release, v3.3, after it.
  1. **Opt-in only.** The default stays today's root-position diatonic triads. A player who allows
     nothing richer sees, hears and exports what they do today, and their replay keys, saved
     settings, presets and kept sessions reproduce as before.
  2. **Flags.** The player chooses in the app's interface which chord families the generator may
     use. Seventh chords come first; extended chords (chords with extensions: ninths and beyond)
     possibly later. "Higher end chords" means these two in standard terms. The exact flag set and
     its defaults are not decided (O165).
  3. **Research before any design.** It has two parts: an internal pass over the project's own
     music documents, sources, code and atoms, and a web pass. The web pass covers chord types,
     how each is built from the selected key and mode, how plausible each is in the styles the
     presets aim at, chord symbols, and how melodies treat a seventh. Generation then uses sourced
     data. Findings go to `docs/music/`, sources to `research-sources.md` and terms to the lexicon.
     Every web-research brief forbids personal data in request headers, URLs and payloads.
  4. **Direction only.** Nothing is designed or built. No rule written for triads changes by this
     decision: the three-note arpeggio run cap, figures resolving onto a chord tone, the backing's
     triad (`req_session_backing_track`, STABLE) and the harmony planner's triad vocabulary. A
     change to a contract rule needs the owner's explicit approval.
  5. **v1's decisions.** The "triads only" vocabulary is the harmony planner policy's and the
     generator contract's, not a decision's. Of v1's D11–D13
     ([archived](archive/v1/decisions-D1-D46.md)), v3.3, once built, partially revisits D11
     alone, and only for a player who opts in: Neutral's chord vocabulary widens, while its
     diatonic frame and its exclusion of substitutions and altered dominants stay. D12 is untouched: altered dominants
     and substitutions stay out (O166). D13 is untouched: chords stay generated, and a flag allows
     a chord family but never chooses a progression.
  6. **Style packs.** D259, on branch `v4-accompaniment-research` and not merged, plans style
     packs with no version, as declarative data over the generator's capabilities. Its breadth
     review counts seventh chords as a capability, not a style. v3.3 opens that capability ahead
     of style packs, default-off, without the progression templates and substitutions the style
     atlas pairs it with. It neither schedules style packs nor changes D259. Keeping the flags
     compatible with a later pack layer is O175.

  Opens O165–O175, among them whether the research is v3.3's first work unit or a separate item
  before it (O174, closed the same day by D262). Recorded in
  [v3](versions/v3/README.md#v33--richer-chords-optional) and the
  [roadmap](roadmap.md#2-v3--player-material-and-my-instrument).

- **D262 (2026-10-12): the chord research runs now as its own item; the vision is updated now.**
  The owner's two approvals, relayed the same day after D261:
  1. **The research is a separate, docs-only item before v3.3,** not v3.3's first work unit. It
     started on 2026-10-12 on branch `v3.3-chord-research` and runs while v3.0 is built. It
     touches no code. Its research document, its sources (S412 on) and its lexicon terms reach
     `main` when that branch merges. Closes O174.
  2. **The vision is updated now.** `documentalist` brings the vision's scope, which ends at v3.2,
     up to date with v3.3 as direction, after the commit recording D261 and D262. The other
     intent changes O173 lists wait for v3.3's master spec. Every change to a STABLE wording still
     needs the owner's explicit confirmation (D246).

  Recorded in [v3](versions/v3/README.md#research-first) and the
  [register](open-questions.md#v33-richer-chords-o165).
