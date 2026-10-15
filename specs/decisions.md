# Decisions

Status: draft v2.93

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
[archive/v2/README.md](archive/v2/README.md)). Numbering continues from **D319**. D259–D260 are
on branch `v4-accompaniment-research`, not merged yet. D263–D288 are v3.3's richer chords (merged
from `main`); D289 is unused. D290–D299 were reserved for v3.0 wave 2; wave 2 used D290–D298, and
D299 records wave 3. D300 records the wave-4 preflight; D301 and D302 the plan revision after
chunk 7a; D303–D305 the wave-5 preflight (D303 the owner's ruling on the session key); D306–D308 the
wave-5 sync; D309–D311 the owner's rulings on O201 and O200 and the plan revision they bring;
D312–D315 the wave-6 preflight; D316–D318 the wave-6 captures.

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

- **D263 (2026-10-12): the owner confirms the vision 0.9 wording.** The owner, relayed the same
  day: "vision wording confirmed". This confirms the wording of
  `vision_infinite_flow_first_release` version 0.9, which `documentalist` wrote after D262: the
  v3.3 direction paragraph, with its clauses "a flag allows a chord family and never chooses a
  progression" and "altered dominants and harmonic substitutions" out of scope through v3.3. It is
  the confirmation D262 asked for (D246's rule for STABLE wording). `documentalist` records it in
  the atom's notes on `main`; the spec no longer says the vision wording awaits the owner.

- **D264 (2026-10-12): one "Seventh chords" level, Off by default (closes O165, proposed for owner
  approval with Part D).** spec-writer's adoption of the chord research's recommendation
  (`docs/music/chord-research.md`, O165). v3.3 has one chord family, the seventh chords, set by one
  four-step level (working names Off, Sometimes, Favored, Strongly favored), a preference and never
  a quota, Off by default; triads always allowed. The family covers the four qualities the app's
  modes contain (maj7, m7, 7, m7♭5). No level per quality: in a diatonic frame each quality sits on
  fixed degrees, so a per-quality level would mostly choose degrees. Sixth, suspended and extended
  chords are later families with their own levels; a diatonic sixth chord holds the notes of the
  seventh chord two degrees lower, so it adds names, not sounds. Master spec Part D §D2, §D5.

- **D265 (2026-10-12): diatonic only (closes O166, proposed for owner approval with Part D).**
  Research recommendation adopted. A seventh chord stacks degrees d, d+2, d+4, d+6 of the selected
  collection, its quality coming from the key and mode. Altered dominants and substitutions stay out
  (D12, the vision), and so do borrowed and secondary chords and the qualities that need harmonic or
  melodic minor. Blues, Bossa and Bebop are served only partly: the twelve-bar I7–IV7–V7 is out of
  reach. Part D §D5.1.

- **D266 (2026-10-12): the run cap stays three; the seventh may be one of the three (closes O167,
  proposed for owner approval with Part D).** Research recommendation adopted. A recognized run
  stays exactly three chord tones of one chord; over a seventh chord the three may include the
  seventh (E–G–B over Cmaj7). A four-note one-way arpeggio stays rejected, like today's C–E–G–C:
  the cap limits a chain of wide intervals, not the chord's size. Raising it is a later contract
  question, if listening shows the full arpeggio is wanted. `rule_leap_recovery` (STABLE) follows:
  its run may include the seventh, which needs the owner's wording confirmation. Part D §D6.2,
  §D12.

- **D267 (2026-10-12): the seventh is a chord tone inside the phrase; endings and the join read the
  triad until a listening check (closes O168, proposed for owner approval with Part D).** Research
  recommendation adopted. When an event takes its seventh form, the seventh is a chord tone for the
  search order, figure targets, runs, Arpeggio chaos, Tension's scheduled figure and a Jam's ranks;
  extensions are never chord tones in v3.3. spec-writer's precision of "an ending on the seventh
  gets a listening check before it is allowed": until the check, the open ending and the join's
  landing read each chord as its triad, so the allowed final and landing notes are exactly v3.2's
  (the seventh may still be a joined phrase's tense note, resolved by the next phrase). Before the
  gate the owner listens to examples ending and landing on the seventh; if approved, the seventh
  also becomes an ending and landing note under a second wording of `rule_open_phrase_ending`
  (STABLE), confirmed then. Part D §D6.1, §D6.3, §D12.

- **D268 (2026-10-12): a seeded preference per harmony event (closes O169, proposed for owner
  approval with Part D).** Research recommendation adopted, with spec-writer's details. The planner
  builds its candidate plans exactly as before, from triads, modal colour chords measured on the
  triad. For each harmony event a seeded integer draw (seed and event position) says whether its
  seventh form is tried first: about 1 in 4 events at Sometimes, 1 in 2 at Favored, every event at
  Strongly favored (starting values tuned before the gate). Each plan is tried with its drawn
  sevenths, then as triads only, so the triad form stays reachable. No role order (degree 5 first)
  in v3.3. Off draws nothing. The cost guard keeps the search allowance and measures generation time
  on the deadline sweep, a 240 BPM session and a Jam's phrase 1: at most 2 points more fallbacks or
  fewer phrases, no standalone attempt over the 1.075 s reserve. Part D §D5.2–§D5.4, §D10.

- **D269 (2026-10-12): symbols, exports and the backing (closes O170, proposed for owner approval
  with Part D).** Research recommendation adopted for the symbols: letters maj7, m7, 7 and m7♭5,
  MusicXML kinds `major-seventh`, `minor-seventh`, `dominant`, `half-diminished` with the suffix as
  display text, the spoken description reading them as words. The research left the backing to the
  spec; spec-writer's proposal: the block chords play every note of the chord, a seventh chord as
  the highest close-position four-note arrangement with its top at or below E4 (lowest about D3),
  the bass unchanged; the MIDI export's backing follows. Reason: the backing is the only part that
  sounds the harmony. Changes `req_session_backing_track` (STABLE): the owner confirms the wording.
  Part D §D7, §D12.

- **D270 (2026-10-12): presets, saved settings, Vary settings and the replay key (closes O171,
  proposed for owner approval with Part D).** Research recommendation adopted: no built-in changes;
  the level is stored by value in saved settings, player presets and the replay key. spec-writer's
  details: the level is preset-held, every built-in at Off, so choosing a preset sets it and
  changing it makes Custom; records from before v3.3 load at Off. The research left Vary settings
  partly open; spec-writer's proposal: **Vary settings never moves the level**, and it is in no
  allowed group, because seventh chords are opt-in and a player who kept Off but turned Vary
  settings on must not hear them. The replay key is `ifk5.`, after v3.2's `ifk4.` (D251), written
  for every phrase; `ifk1.`–`ifk4.` decode at Off. Part D §D8, §D9.

- **D271 (2026-10-12): Jam and the key and mode suggestion unchanged (closes O172, proposed for
  owner approval with Part D).** Research recommendation adopted: the suggestion scores the doodle's
  notes only, so the level never changes its answer; a Jam's phrases follow the level like any
  session's, the seventh sharing the first rank the doodle orders within. Part D §D8.4.

- **D272 (2026-10-12): the declared-intent changes are listed in Part D (closes O173, proposed for
  owner approval with Part D).** Three STABLE guarantees change, each given in plain words, old and
  new, in Part D §D12 for the owner's explicit wording confirmation (D246):
  `req_session_backing_track`, `rule_open_phrase_ending` (a triad reading now, a second option
  only if the listening check approves the seventh) and `rule_leap_recovery`. Checked with wording
  unchanged: `rule_harmony_change_drops_unfit_harmonic_carry_in` (the carried chord is compared by
  its triad, and the level is fixed for a session), `rule_join_carry_in_limited`,
  `req_last_session_review`, the mutation guarantees, and the vision (0.9, confirmed by D263). The
  REVIEW and DRAFT atoms, the harmony planner policy, the generator contract and the lexicon lines
  follow at the build; `documentalist` proposes the contract bump.

- **D273 (2026-10-12): one named capability per chord family, stored by value (closes O175 for its
  shape, proposed for owner approval with Part D; opens O176).** Research recommendation adopted:
  the level belongs to the capability `seventh-chords` (the v4 branch's atlas id), stored by
  capability name and value in saved settings, player presets, the generation request and the
  replay key, never tied to a preset's name, so a later family or style pack can name it as data.
  Which wins when a player's level and a style pack disagree is decided with style packs: O176.

- **D274 (2026-10-12): gaps settled while consolidating Part D.** spec-writer's calls within
  D264–D273, proposed for owner approval with Part D; none changes what the owner asked for.
  (1) The level's working names and Strongly favored meaning "every event tries its seventh form
  first". (2) The level is a generation setting locked during a session and moved by nothing, so it
  is fixed for a session: the v3 notes' "a chord flag changed mid-session" cannot happen. (3) A
  carried final chord is compared with the next phrase's settings by its triad. (4) Changing the
  level discards pre-generated phrases and so drops a held doodle, like any discarding change
  (D238). (5) Settings, player presets and kept sessions get a new stored data version. (6) Part D
  numbers its sections D1 to D17 and cites them as §D5 so they are not read as decision IDs.

- **D275 (2026-10-12): the triad fallback is per phrase; Strongly favored keeps at least 3 in 4
  chords as sevenths (answers ux Q77; proposed for owner approval with Part D).** spec-writer's
  call. Part D §D5.2 read per chord ("a triad appears only where the seventh form leads to no
  phrase") while §D5.3 fell back per plan. The per-plan fallback stays: each plan is tried with its
  drawn seventh forms, then as triads only, so the candidate list grows by at most one variant per
  plan and the search cost stays bounded; and a phrase that cannot carry its sevenths is heard as
  a plain-triad phrase rather than as one chord oddly missing its seventh. A phrase therefore keeps
  all the sevenths drawn for it or is all triads. §D5.2 now says so. Because `ux-writer` labels the
  top level "Mostly" (ux D254), Strongly favored must reach at least 3 in 4 harmony events in their
  seventh form over the sweep; if it does not, the build adds, before the triads-only variant,
  variants dropping one event's seventh at a time, in a fixed order, within the cost guard, and
  measures again. The share is recorded per level and mode with the share of phrases that fell back
  to triads, and reported to `ux-writer` (Part D §D15 item 5). Master spec Part D v1.1.

- **D276 (2026-10-12): the v3.3 contract is confirmed once, early (proposed for owner approval with
  Part D).** Planning answer for the [v3.3 build plan](versions/v3/build-plan-v3.3.md). The three STABLE wordings of Part D §D12
  (`req_session_backing_track`, `rule_open_phrase_ending`'s first option, `rule_leap_recovery`) are
  confirmed together, after `documentalist`'s ingestion of Part D, and applied at once with one
  MAJOR bump, CONTRACT 3.0 to 4.0, as D246 did: each holds trivially while the level is Off. The
  open ending's second option is a separate confirmation after the listening check, with its own
  bump. A chunk that changes a STABLE rule may be built before its confirmation but merges only
  after it; unconfirmed at its wave's end, it leaves the wave. Plan §1, §3.

- **D277 (2026-10-12): the level's ids (proposed for owner approval with Part D).** The level is
  sent and stored as `chordFamilies: { 'seventh-chords': level }`, beside the controls, never
  inside them, with the level ids `off`, `sometimes`, `favored` and `strongly-favored`: Part D's
  names, never the interface's labels (Off, Sometimes, Often, Mostly), so a label change migrates
  nothing. It is always present inside the app; an input from before v3.3 (a replay key, a kept
  body, a settings or preset record) reads Off where it is decoded. Plan §2.

- **D278 (2026-10-12): the seventh draw's position and shares (proposed for owner approval with
  Part D).** "The event's position in the phrase" (§D5.3) is the harmony event's start, its bar
  index and start beat, so one place draws the same in every candidate plan. The draw is `fnv1a32`
  over `infinite-flow/seventh-chord/v1`, the phrase's seed and that start; the shares are
  numerators over 256, starting at 64 (Sometimes) and 128 (Favored). Strongly favored and Off draw
  nothing. Plan §2, chunk 12.

- **D279 (2026-10-12): data version 5, with an upgrade that rewrites nothing (proposed for owner
  approval with Part D).** v3.3's stored data version is 5, after v3.2's 4. Its upgrade step
  rewrites no record: every codec reads an absent level as Off, and a kept body's harmony with no
  seventh as triads. Plan chunk 17.

- **D280 (2026-10-12): the listening check's examples are rewritten phrases (proposed for owner
  approval with Part D).** §D6.3's examples are phrases generated at Strongly favored, with the
  final note (or the next phrase's first note) moved to the chord's seventh, rendered to MIDI with
  the real backing beside the unaltered phrase. No code for the open ending's second option exists
  before the owner approves it. Plan chunks 4 and 18, hand check H1.

- **D281 (2026-10-12): what the seventh share counts (proposed for owner approval with Part D).**
  §D15 item 5's share counts harmony events (a chord held across a barline once) of the phrases
  generated, over the deadline sweep's 568 rhythm settings × two seeds × the nine modes, with the
  Neutral and Jazz defaults, per level. A fallback is a phrase won by the triads-only variant of a
  plan that drew at least one seventh. The 3 in 4 at Strongly favored is over the whole sweep;
  each mode's share is recorded and reported to `ux-writer`, and a mode under 3 in 4 goes to
  `ux-writer` with the figures without triggering the finer fallback on its own. Plan §4 (M1).

- **D282 (2026-10-12): a listening check of the level and the backing (proposed for owner approval
  with Part D).** §D5.2 tunes the Sometimes and Favored shares "by listening": once the control
  exists, the owner listens to each level with Jazz, Bebop, Modal (Dorian) and Neutral, and to the
  four-note backing; the final share and cost runs follow it. Plan step L2, hand check H2.

- **D283 (2026-10-12): who updates the project documents §D12 names (proposed for owner approval
  with Part D).** The harmony planner policy: the build's chunks 2 and 12. The pitch planner
  validation note: chunks 5–7. The generator contract (`specs/generator-contract.md`):
  `spec-writer`, from chunk 12's report, at that wave's gate. The lexicon's "in Infinite Flow"
  lines: `documentalist`, at the release gate (§D16). Plan §3.

- **D284 (2026-10-12): no token-source chunk for v3.3 (proposed for owner approval with Part D).**
  v3.3 adds no token, class or motion (ux D261), so its plan has no token pass and no owner step
  for one; the owner's approval of the v3.3 design still gates the interface chunks and the three
  preset description sentences. Plan §1.

- **D285 (2026-10-12): the v3.3 change set adds what §D12 missed (proposed for owner approval with
  Part D).** `documentalist`'s read-only preflight of 2026-10-12 found atoms that a seventh chord
  changes and §D12 does not list: `service_generation_result_validation`,
  `module_named_stream_pseudorandomness`, `module_ranked_candidate_ordering`,
  `service_generation_orchestration`, `service_generation_request_resolution`,
  `module_pitch_search_context` (the final notes), `module_pitch_search_transition` (the landing),
  `rule_no_carry_in_output_matches_v1`, `rule_doodle_only_orders_candidates`,
  `rule_preset_load_values_win`, `rule_session_history_keeps_timeline_and_inputs`,
  `rule_earlier_kept_sessions_carried_over`, `module_session_carry_in_after_change`, and the naming
  of `module_musical_profile_capabilities`. None is STABLE. The ingestion's change set revises them
  too, and adds a BUSINESS atom for the chord-symbol vocabulary and its spoken words. Plan §9.

- **D286 (2026-10-12): until the control ships, the app sends Off (proposed for owner approval with
  Part D).** Every v3.3 chunk before the Seventh chords control changes nothing a player can reach,
  since the app always sends Off; no feature switch is built for them and no release is cut
  between waves. Plan §1.

- **D287 (2026-10-12): a Jam's phrase 1 carries the level on every rung (proposed for owner approval
  with Part D).** §D8.4's "a Jam's phrases follow the level like any session's" holds on each rung
  of a fresh Jam's phrase-1 ladder (C5.7), the doodle-free rung included, and on every later
  phrase. Plan chunks 3 and 16.

- **D288 (2026-10-12): the Seventh chords level ids are camelCase (amends D277; proposed for owner
  approval with Part D).** Raised by `ux-writer`'s review of the
  [v3.3 build plan](versions/v3/build-plan-v3.3.md) (ux D264). D277 spelled the top level
  `strongly-favored`; v3.1's figure-level ids, the same four-step shape stored the same way, are
  camelCase (`off`, `asToday`, `favored`, `stronglyFavored`, v3.1 build plan §2). The level values
  are therefore `off`, `sometimes`, `favored` and `stronglyFavored`, in the request, the replay key
  and every saved record. The family key stays `seventh-chords`: a capability name fixed by D273
  (the v4 atlas id), as `my-instrument` is a fixed id (D254). The interface's labels are unchanged:
  `off` Off, `sometimes` Sometimes, `favored` Often, `stronglyFavored` Mostly (ux D254, D264).

- **D290 (2026-10-12): a background pre-generation attempt can be cancelled.** The owner's
  answer ("ok") to the first point the v3.0 wave-2 intent preflight put to him (build plan, Wave
  records, conflict 1; it blocked chunk 24). Master spec §8 has any player request at Idle cancel
  the background attempt in progress through the worker's cancellation, but
  `module_generation_worker_cancellation` (STABLE, on the contract's surface) says a call with no
  signal is never cancelled and the Idle flow passes none. The owner agrees to revise it to: "the
  Idle flow's player requests pass no signal and are never cancelled; a background pre-generation
  attempt passes one, aborted by any player request at Idle". He rules it a **MINOR** contract
  bump, not MAJOR: every guarantee the player relied on still holds, and the change only adds a
  background attempt that gives way to the player. `rule_dropped_attempt_cancelled` stays as
  written. `documentalist` applies the atom and the contract bump. Master spec Part A v1.8 (§8,
  §10, item 23, §14); build plan v6 (chunk 24, unblocked).
- **D291 (2026-10-12): a written key with two spellings takes the one with fewer sharps or flats,
  and the sharp one on a tie.** The owner's answer to the preflight's third point ("less
  accidental the better, sharp in case of tie"), choosing the code's existing rule
  (`spellWrittenKey`, `module_notation_display_convention`) over master spec §7.1's "the interval
  name fixes the letter-name steps used to spell written notes, the key signature and chord
  symbols" (D253). The player chooses the key in written pitch, so the transposition never moves
  the written key; it moves the concert key the phrase is generated in. The written key is
  spelled from the chosen key and collection, with the fewer sharps or flats in its key
  signature, sharps on a tie: an instrument whose written notes sound 6 semitones higher writes
  concert C major as F♯ major, not G♭ major (an augmented fourth would give G♭). Written notes and
  chord symbols (root and slash bass) are spelled in that written key: a note of its scale takes
  the key's spelling; another note takes its own letter on a white key, and on a black key a flat
  when the key signature has flats, a sharp otherwise. This is what the built-in profiles already
  do. The interval name stays derived by §7.1's fixed table and shown; its letter-name steps stay
  in the instrument's data and in a MusicXML file's transposition, and spell nothing in the app.
  Master spec Part A v1.8 (§7.1, §12, item 16); build plan v6 (chunks 16 and 19, §8 item 2);
  `documentalist` revises `rule_my_instrument_transposition_named_interval`, which still says the
  steps spell the written part.
- **D292 (2026-10-12): the staff's shared height follows my instrument's written range.** The
  owner's answer ("ok") to the preflight's point on chunk 19.
  `module_notation_layout_preflight` (REVIEW) says the one system-position size "never depends on
  a phrase or a profile"; it now takes my instrument's written range into account, as the design
  (phrase-workspace handoff, Notation Contract, ux D214) and master spec §14 already have it. The
  size changes only when my instrument is saved or deleted, never from phrase to phrase.
  `documentalist` revises the atom before chunk 19's code. Master spec Part A v1.8 (§7.1 states
  it); build plan v6 (chunk 19).

  Also recorded the same day, no decision number: the coordinator moves build plan chunk 18 to
  wave 5, after chunk 17, since its `ifk2.` decoder rebuilds the intent through chunk 17's
  `rebuildGenerationWorkerIntent` and replay refuses `my-instrument` until chunk 17. The
  preflight's plan corrections are applied to the build plan (chunks 4, 18, 19 and 24, §2, §3,
  M5) and one stale line of [build-plan-v3.2.md](versions/v3/build-plan-v3.2.md);
  `rule_look_ahead_deadline` is revised at chunk 24's sync, with the owner's agreement then.
  Later the same day the coordinator placed chunk 18 in wave 6 instead (Gate A, then chunks 11,
  12, 18, 22 and 25), so the chunks of one wave stay independent; chunk 18 does not need Gate A.

- **D293 (2026-10-12): my instrument gains a clef choice, treble or bass, in v3.0; octave signs
  wait (opens O180 and O181).** Chunk 19 measured how far my instrument's written range may reach
  before the staff's shared height grows (M3, `docs/notation-engraving.md`): in treble clef only an
  exact two-octave range from written B2–B4 up to E4–E6 keeps 16 staff spaces, and a low range
  costs most (C2–C4 19, C2–C7 24). Asked for the range ruling, the owner answered, verbatim: "bass
  clef option for v3.0, and keep in mind 8va/8vb/15ma etc for a later version should the need
  arise." Written into master spec Part A v1.9:
  1. **The clef.** My instrument is written in treble or bass clef, as the player chooses; the
     built-in profiles stay in treble clef. A new my instrument starts in treble clef, every
     template's clef (proposed default, for `ux-writer` to confirm with the clef control). The
     clef is a field of my instrument, apart from what the generator reads.
  2. **Display only.** The clef changes neither the written pitch nor the transposition, and
     nothing generated. It follows the phrase: the staff at Idle and in a session, the check's
     note while my instrument is selected, the review of the last session and of kept sessions
     (each phrase in the clef it was played in, kept with its instrument, §5.2), the score's
     description, and the MusicXML export (`<clef>` F on line 4). Changing only the clef keeps
     the phrase on screen, redrawn, and discards no pre-generated phrase.
  3. **Not in the replay key.** The `ifk2.` key reproduces generation, which the clef does not
     touch, so two phrases differing only by clef have the same key; the replay tool shows no
     staff. This also keeps `ifk3.` and `ifk4.`, which carry my instrument as `ifk2.` does, free of
     display data.
  4. **The shared height** (D292) reads my instrument's written range placed in its own clef.
  5. **The range ruling, per clef, is proposed, not decided:** written C2 to C7 in treble clef and
     E0 to E5 in bass clef (the same lines and spaces on each staff), keeping the shared height at
     most 24 staff spaces; the bass-clef figure is measured in the build (build plan chunk 19b).
     The alternative is a bound on the height itself. It stays with the owner (§14).
  6. **Octave signs later.** Octave signs (8va, 8vb, 15ma) and octave clefs are deferred,
     registered as O180 with spec-writer's advice against automatic ottava lines inside a
     phrase.
  7. **A gap D292 already had, made common by the clef:** a kept session played with a my
     instrument that needed more height than the current one, and phrases pre-generated before a
     save that changes the height. Registered as O181.

  No guarantee on the contract states the clef; the REVIEW and DRAFT atoms that say "treble"
  are revised by `documentalist`. Build plan v7 adds chunk 19b (bass clef for my instrument) in
  wave 2, moves the range ruling after it, and adds a clef design gate for `ux-writer` before
  chunk 20.

- **D294 (2026-10-12): my instrument's written range must lie within written C2 to C7 in treble
  clef and written E0 to E5 in bass clef.** The owner's answer ("ok") to the range bound proposed
  in D293. Both ends are included (C2 is MIDI note 36, C7 96, E0 16, E5 76, middle C being C4,
  note 60). A range outside the bound for its clef is refused live in my instrument's sheet, with
  the reason given in note names, like a range under two octaves; changing the clef checks the
  range again. The two-octave minimum and the MIDI note range still apply. The bound is a
  validity rule of my instrument, so it sits beside the two-octave rule. The owner chose it over
  a bound on the staff's height, which is exact but harder to explain. Build plan chunk 19b still
  measures the bass-clef bound and confirms that it keeps the shared height at most 24 staff
  spaces, as the treble one does; if it does not, the figure goes back to the owner. Chunk 20
  enforces the bound. Master spec Part A v1.10 (§7.1, §12, item 16, §14); the build plan's
  "Range ruling" gate is settled.
- **D295 (2026-10-12): every kept session belongs to the instrument it was played with; deleting
  my instrument deletes its sessions, and a range or transposition change erases them after a
  warning (closes O181 with D296).** The owner, verbatim: "nevermind old session they're
  inexistant. session should probably tied to instrument selected (hence reviewing an old session
  should use the old instrument (if it still exists), sessions bound to a deleted instrument
  should be deleted as well). Altering an instrument is a tough choice. i'd say: should the
  alteration changes the range indicate that this will erase all known stored session of this
  instrument. if the change is cosmetic it's okay." "Tied to instrument selected" is read as the
  instrument selected when the session was played; the session list is not filtered by the
  instrument selected now.
  1. **Belonging.** Every kept session, the most recent one and the pinned ones alike, belongs to
     the instrument named by its id in its session-wide record (master spec §5.2). Only my
     instrument can be changed or deleted, so only its sessions are ever touched.
  2. **Deleting my instrument** deletes every kept session played with it, with their favorites,
     comments and played notes; its confirmation says so and how many go.
  3. **Saving a change to my instrument's written range or transposition** first warns that it
     erases all the kept sessions of my instrument, and how many; on confirmation it saves and
     erases them; on cancel nothing changes. This holds in the sheet and through the transposition
     check's "use this for my instrument". While my instrument has no kept session, no warning is
     shown, since nothing is erased.
  4. **The session that just ended goes too** when it was played with my instrument: it leaves
     memory, its review closes, and "Review last session" goes, exactly as when the player deletes
     that session from its review (already designed: `ui_ux/flows/review-and-export/intent.md`).
     My instrument's sheet and the check are reachable while a review shows, so this happens.
  5. **A visit that saves nothing erases nothing.** An outdated tab offers neither deleting my
     instrument nor saving a range or transposition change while my instrument has kept
     sessions, as it offers no other deletion (master spec §4.3). A visit whose saved data could
     not be read has read no kept session and no my instrument, so changing or deleting a my
     instrument made during it erases nothing, and its session held in memory keeps its review.
  6. **No migration:** v3.0 is unreleased and no v3.0 session data exists.
  7. **The review still shows each phrase exactly as it was displayed.** As the coordinator
     recommended, and spec-writer agrees: D293's clef stays stored with each phrase, so the
     only changes that keep sessions (name and clef) never alter a review's engraving; the list
     keeps the name the session was played under (build plan chunk 9 stores it). A range or
     transposition change erases sessions instead of redrawing them. So the STABLE
     `req_last_session_review`'s "engraved exactly as it was displayed" holds unchanged.
  8. **One contract wording changes, PROPOSED for the owner.** `req_last_session_review`
     (STABLE, contract surface) promises the review "stays reachable until the next session
     starts". The player can now end it sooner by deleting its session, through my instrument as
     above, and already through v3.0's own Delete session (master spec §5.4), which that sentence
     never covered. Proposed wording: add "or until the player deletes its session". By the
     contract's rule this removes cases from a listed guarantee, a MAJOR version (CONTRACT 3.1 to
     4.0); the owner may rule it MINOR, as for D290, since only the player's own confirmed action
     ends the review. `documentalist` applies nothing before the owner confirms. The two pending
     part-B texts (`docs/release/v3.0-intent-change-set.md`) gain a clause each:
     `rule_instrument_profile_range` (B1) the bound per clef, `rule_controller_transposition_check`
     (B2) the warning before the check's action erases my instrument's sessions; neither weakens a
     guarantee.

  Master spec Part A v1.10 (§2, §4.1, §4.3, §4.4, §5.1, §5.4, §6, §7.1, §7.2, §10, §12, items 6,
  14, 16, 17 and 23, §14). Build plan v8 adds chunk 20c (my instrument's sessions) and a design
  gate for it.
- **D296 (2026-10-12): what each change of my instrument does, and phrases made before a save
  that changes the shared height (closes O181 with D295).** Proposed by the coordinator and agreed
  by the owner the same day:
  1. **A transposition change counts like a range change:** the erase warning (D295).
  2. **A name or clef change is cosmetic:** no warning, sessions kept; the phrase on screen is
     kept (redrawn in the new clef), and no pre-generated phrase is discarded for it.
  3. **O181(b), yes:** a save of my instrument that changes the staff's shared height without
     discarding the pre-generated phrases (a clef change, or a range change while another profile
     is selected) checks them again against the new layout, as a change of window size does: one
     that no longer fits is discarded with every phrase after it.

  **O181(a) narrows to the clef.** With D295, a kept session never holds a range my instrument no
  longer has. A clef change keeps the sessions, each phrase in the clef it was played in, and
  that clef can need more height than the shared height now has: written C2 to C4 needs 19 staff
  spaces in treble clef and 16 in bass clef. Settled as behaviour: **a review never cuts a
  phrase**; when a session's phrases need more height than the shared height, its review makes
  room for them. How is `ux-writer`'s, in the design gate before chunk 20c (proposed, as in
  O181: the review's staff takes the larger of the shared height and the height its own session
  needs). Master spec Part A v1.10 (§7.1, §8, item 16); build plan v8 (chunks 20 and 20c).
- **D297 (2026-10-13): a stale phrase 1 at Start: the app says so and asks, Regenerate or Use it
  (ISS-011, planned for the end of v3.0).** ISS-011, reproduced on v2.0.0 on 2026-10-12: at Idle,
  ordinary edits never regenerate, so after a change of Written key, Collection or Register (and
  sometimes Harmonic motion) the phrase on screen was made under other settings. Start takes it
  as phrase 1 but takes the current controls as the session's settings, and the session assumes
  phrase 1 was made under them. Phrase 2's join is then built from a phrase in the old key, the
  carry-in check throws `CarryInError`, and nothing starts (60 to 220 BPM; at 230 and 240 BPM
  phrase 2 starts standalone, so the session starts). The owner, 2026-10-13: "it's not urgent.
  plan it for the end of v3.0" (no v2 hotfix), and "i'd say regenerate prior starting session
  (more like: when starting session says the current phrase is stale and ask either to
  regenerate or use it)".
  1. **Stale.** Phrase 1 is stale when a setting the generation reads has a different value now
     than when phrase 1 was generated. Values are compared, not edits: a setting changed and
     changed back is no difference. What counts: every generation control except the tempo
     (Written key, Collection, Harmonic motion, Tension, Note density as the player chose it,
     Rhythmic variety, Syncopation, Silence density, Contour, Register, Leapiness, Arpeggio
     chaos), the musical profile (Neutral or Jazz; its customized mark alone is not read), and the
     instrument as the generation reads it (its id and, for my instrument, its range and
     transposition). From v3.1, every setting the generation request gains (embellishment figure
     levels, the chord level in v3.3) counts the same way. Some of these never caused the
     error (Tension, Contour, Note density); they count all the same, because phrase 1 then is not
     what the player's settings make. **Never stale:** the tempo and Rising tempo (the tempo never
     affects generation), Vary settings and Tension across phrases (neither acts on phrase 1), the
     audio mix, the theme, my instrument's clef and display name, and the window's width (the
     note density a narrow window gives is not a setting; v2 already starts sessions from a
     phrase made at another width, and the existing layout checks stay as they are). **The
     instrument never makes phrase 1 stale in practice:** an instrument switch regenerates the
     phrase, and saving my instrument's range or transposition while it is selected replaces it
     (master spec §7.1), so the check is there only for completeness.
  2. **When it asks.** On Start (the button, or the starting note, see 8), once every start
     condition holds, and before anything starts: no sound, no screen lock, no count-in. A Start
     blocked by a start condition stays blocked as today; the prompt is not a start condition and
     never replaces one. When phrase 1 is not stale, Start works as today and nothing is asked.
  3. **Use it.** The session starts from that choice, exactly as Start does (the choice is the
     start click: it unlocks the sound and asks for the screen locks), the start conditions
     checked again at that moment. Phrase 1 is the phrase on screen, unchanged: same request,
     seed and replay key, shown, reviewed, kept and exported with what it was generated with. The
     session's settings are the current ones: phrase 2 on is generated under them, Vary settings
     moves from them and returns to them at the end, and the session-wide record names them.
     **Phrase 2 joins phrase 1 as after a settings change applied at the boundary between phrase 1
     and phrase 2 during a session:** the existing carry-in rules adapt the join
     (`rule_setting_change_rechecks_pitch_carry_in`, `rule_key_change_drops_harmonic_carry_in`,
     `rule_harmony_change_drops_unfit_harmonic_carry_in`, `rule_register_change_replaces_carried_window`),
     so no `CarryInError` can occur at any tempo. No new carry-in rule is needed. The read-only
     controls show the settings phrase 1 was generated with during the count-in and phrase 1
     (they show the settings of the music on screen, and phrase 1's first measure is on screen
     through the count-in), then the session's settings from phrase 2, as at any change. In v3.2,
     the rhythm lock still locks phrase 1's rhythm (Part C §C7.1 holds as written).
  4. **Regenerate (proposed, O182).** It runs the Idle Regenerate exactly (current settings, a
     fresh seed, the usual fit run) and the app stays at Idle with the new phrase on screen;
     nothing starts. The player presses Start, or plays the new starting note, when ready, and is
     not asked again, since the new phrase is not stale. A failed regeneration shows the usual
     failure banner. Reasons: it is the existing action with no new state; the player sees phrase
     1 before playing it, as `rule_phrase_one_is_idle_phrase` intends; the starting note changes
     with the phrase, so a player at the instrument needs to see the new one; and it avoids a
     start that waits for a generation (wait, failure, conditions changing meanwhile). The
     alternative, starting as soon as the new phrase is on screen, is the owner's to choose.
  5. **Dismissing** the prompt without choosing changes nothing and starts nothing. How it is
     dismissed is `ux-writer`'s.
  6. **While the prompt shows,** the app is still at Idle: no MIDI note starts anything, the
     starting note included; pre-generation goes on, since its phrases are the ones Use it plays.
     Whether other controls can be used meanwhile is `ux-writer`'s (proposed: the prompt is
     answered or dismissed first).
  7. **Pre-generation (chunk 24) builds the phrases Use it plays.** While phrase 1 is stale it
     keeps running: phrase 2 is planned from phrase 1 under phrase 1's own settings, joined as in
     3, and the phrases after it follow as today. Its keys stay as they are: phrase 1 and the
     current settings, so any change discards and restarts it (master spec §8), and Regenerate
     discards it by replacing phrase 1. Use it takes the ready phrases as Start does. Chunk 24's
     quiet stop on `CarryInError` goes. The rule that a pre-generated phrase is exactly the
     session's phrase at that place holds, since both are built the same way.
  8. **The starting note asks too.** With a stale phrase 1, playing the starting note opens the
     same prompt and starts nothing; the count-in starts only on Use it. This changes the STABLE
     `rule_midi_starting_note` on the contract surface, **proposed for the owner** (master spec
     §10): today playing the starting note "starts the count-in". By the contract's rule a
     guarantee losing a case is a MAJOR version (CONTRACT 4.0 to 5.0), as the owner ruled for
     D295; he may rule it MINOR. The alternative that changes no contract wording, the starting
     note counting as Use it without asking, would never tell the player at the instrument that
     the phrase is out of date, which is the point of the ruling, so it is not recommended.
  9. **A running session still never asks for anything.** The prompt comes before Start; once
     Use it starts the session, nothing is asked until it ends. The count-in starts only after
     Use it, so `rule_count_in_shown_on_screen` is unchanged.
  10. **Other atoms.** The four STABLE carry-in atoms and `rule_join_carry_in_limited` hold as
     written: the change applies at a phrase boundary during the session, the one between phrase
     1 and phrase 2. `rule_phrase_one_is_idle_phrase` (REVIEW) holds, phrase 1 being still the
     phrase on screen, unchanged; it gains a sentence. Revised before code by `documentalist`:
     `rule_session_start_conditions`, `module_session_shown_settings`,
     `module_session_pregeneration_plan`, `rule_pregenerated_phrase_matches_session`, the engine
     and workspace atoms that say phrase 1 was generated under the start settings, and a new rule
     for the prompt.

  Recorded with it: the owner confirmed `req_last_session_review`'s reachability wording (D295)
  as a MAJOR change on 2026-10-12 ("1. ok, major"), applied as CONTRACT 4.0; master spec §10 and
  §14 and the build plan's **Review reachability** step now say so. Master spec Part A v1.11 (§2,
  §10, §11, §12, item 23, new item 24, §14, new §16); build plan v9 adds chunk 24b in wave 9 with
  a **Stale phrase design** gate and the owner step **Starting-note wording**; ISS-011 updated.

  **Ruling note (2026-10-13, later the same day).** The owner ruled on both proposals, relayed by
  the coordinator:
  - **Regenerate (point 4) as recommended, closing O182:** it runs the usual Idle Regenerate and
    the app stays at Idle with the new phrase on screen; nothing starts, and the player presses
    Start again (or plays the new starting note), with no prompt since the phrase is fresh.
    Starting at once after regenerating is not done.
  - **The starting note's wording (point 8) accepted as proposed, ruled MAJOR:** the STABLE
    `rule_midi_starting_note` gains the sentence "When the phrase on screen is out of date (made
    under settings that differ from the current ones), the starting note first asks, as the
    Start button does, whether to make a new phrase or use this one, and the count-in starts only
    if the player uses it; while it is asking, no note starts anything." CONTRACT 4.0 to 5.0.
    `documentalist` applies the atom and the contract bump.

  Master spec Part A v1.12 (§10, items 23 and 24, §14, §16); build plan v9's owner steps **O182**
  and **Starting-note wording** are done, and the **Stale phrase design** gate can start.

- **D298 (2026-10-13): pre-generation runs after the prewarm is posted, not after it finishes;
  O183 opened.** At the v3.0 wave-2 intent sync, `documentalist` asked what master spec §8's
  "Pre-generation runs after v2's prewarm" means, against `rule_pregeneration_yields_to_player`'s
  "runs only after the generator has warmed up". Chunk 24's code (`create-workspace-session.ts`,
  `workspace-pregeneration.ts`, `generation-worker-client.ts`) posts the prewarm when the
  workspace session is built and after each rhythm-setting change; pre-generation posts its first
  attempt later, once phrase 1 is on screen, to the same worker, which answers a request between
  prewarm slices as v2 already does for the player's. Ruling, by `spec-writer` as a wording
  clarification: the spec means **after the prewarm is posted**, and the code matches the intent.
  Why: the player is protected by the cancellation (any player request at Idle aborts the
  background attempt in flight), not by when pre-generation starts; the page has no signal for a
  finished prewarm (see `docs/generation-latency.md`), so "finished" was never an observable
  condition; and pre-generation starts only with phrase 1 on screen, whose own generation has
  already built its rhythm setting's domain in the same memo the prewarm fills. No behaviour
  changes. Master spec Part A v1.13 (§8) says so; the atom's wording is `documentalist`'s to
  align. While checking this, `spec-writer` found a consequence the spec had not traced, opened as
  [O183](open-questions.md#v30-wave-2-o180): cancelling a background attempt replaces the worker,
  and with it the rhythm-domain memo the prewarm and phrase 1 warmed.

- **D299 (2026-10-14): the kept-session size is the build's measurement; v3.0 wave 3 recorded and
  its plan corrections applied (build plan v10).** At the v3.0 wave-3 gate, chunk 9 measured a
  30-minute session at 240 BPM in Jazz with `Sixteenth` density, the largest case: 4.07 MB for
  the summary and the body (timeline 2.2 MB, harmony 0.83 MB, intent 0.77 MB, stored request
  0.27 MB), against the earlier estimate of 0.8 to 3.4 MB, which counted neither the stored
  request nor each phrase's number, start, repeated phrase and clef. Played notes, when kept, add
  about 1.5 MB at one played note per shown note (the earlier 0.25 MB assumed 2 notes a second).
  Decided by the wave driver, the owner told: the estimate becomes the measurement, the size guard
  test sits at 4.25 MB, and no compact encoding is built. Why: nothing in the spec caps a kept
  session's size, the spec keeps no limit on pinned sessions and shows the space used in Your data,
  and a compact encoding would add a codec for no behaviour the player sees. No behaviour changes.
  Master spec Part A v1.14 (§5.2) and `kept-sessions.md` draft v3 say so.

  Recorded with it, no ruling needed (build plan v10): wave 3 is done (chunks 5 and 9 merged into
  `v3.0-w3`, the gate green on fcabf7f); the wave-3 preflight's corrections to chunks 5 and 9
  written in as built; and what the two chunks leave to later chunks. Chunk 8: the save policy also
  reports a change of refusal kind within a run, so the save-problem notice can switch to the
  latest cause's wording as the design says (chunk 5 reports a run once). Chunk 10: the session's
  own save is marked as such, so only storage full raises a notice for it, never Save failed; it
  encodes with `encodeKeptSession` and saves in one batch with the deletion of unpinned sessions.
  Chunk 11: played notes and the summary's `playedNotesKept` change in one batch. Chunk 17: the
  history record gains the clef, the body encoder takes it and the review reads it, the stored
  shape unchanged. Chunk 24b-1 gains the wave-2 gate's pre-generation test points. ISS-012 (the
  review host cannot name my instrument) is filed and assigned in the plan.

- **D300 (2026-10-14): an outdated tab shows the newer version's wording after another tab's
  Delete everything; the port's outdated report gets no cause in v3.0. The wave-4 preflight's
  corrections applied (build plan v11).** The saved-data design gives the outdated-tab notice its
  own wording when `Delete everything` ran in another tab, and says that telling it from a newer
  version needs the storage port to say why it became outdated; until it can, the newer version's
  wording is shown. `documentalist`'s wave-4 preflight found that the port's report carries no
  cause (`module_on_device_database`, `onOutdated(listener: () => void)`, as chunk 4 built it).
  Decided by the wave driver, under the owner's delegation of minor design calls: chunk 8 ships
  the design's own fallback, the newer version's wording, and no cause is added to the port. Why:
  the reload the notice asks for is the cure in both cases, the fallback is already the designed
  behaviour, and a cause would revise a REVIEW architecture atom and chunk 4's merged port for a
  wording only. The deletion wording stays in the design for a later version; the port change
  would come first.

  Recorded with it, no ruling needed (build plan v11): the wave-4 preflight (from `main`
  261984a) and its corrections to chunks 7 and 8. Chunk 7 adds the governing atoms
  `rule_first_phrase_waits_for_saved_settings` and, at the sync, `service_session_controller`;
  loads a saved `Rising tempo` `On` with no controller attached by giving the loaded flags to the
  session controller at its creation, since `setAdaptiveTempo(on)` refuses `On` then; exposes the
  load's outcome (saved data read, or started from the defaults), which chunk 8's outdated-tab
  wording reads and the saving state alone cannot carry; saves from the player's change handlers
  only; its file list follows the real code; and its 7a/7b split is stated by file and by "Done
  when" line. Chunk 8 adds `rule_failed_read_told_to_player`, reads the load outcome, and revises
  `module_save_policy` to 0.2 (a change of refusal kind reported again), pending the owner's
  sign-off. While checking the corrections, `spec-writer` found that the design's "read-only
  reopening fails" case is not what chunk 4's port does, opened as
  [O190](open-questions.md#v30-wave-4-o190).

- **D301 (2026-10-14): `review-privacy`'s storage half is narrowed in steps, not left red until
  chunk 11: chunk 7b allows the app's database and its settings records only, chunk 10 adds the
  kept session, chunk 11 makes the final rewrite; the other tests that assumed no database are
  fixed in 7b.** Chunk 7a opens IndexedDB at every load, so the test's spy (which bans
  `indexedDB.open`) and its end state ("no IndexedDB database") fail from wave 4, while
  [build plan §2](versions/v3/build-plan.md#2-read-first-what-v30-undoes-in-v2) gave the storage
  half to chunk 11, in wave 6: the wave-4 and wave-5 gates would run `npm run quality` red.
  Recommended by the wave driver and adopted by `spec-writer` under the owner's delegation of
  minor calls. Chunk 7b's interim keeps a real guarantee: the spy allows `indexedDB.open` and no
  other storage call, and at the end the only database is the app's, the session, body and
  played-notes stores are empty and every settings record is one the settings codec reads back,
  so no session, phrase, review or played-notes data reaches storage; the network half is
  unchanged. Chunk 10, whose kept session would break that interim, widens it to the kept
  session's summary and body, still with no played note. Chunk 11's rewrite starts from there
  and allows the `instrument` and `controller` stores that chunks 20 and 22 write. Why in steps:
  dropping the storage half until chunk 11 would leave two waves with no storage privacy check
  while the app starts writing. Found with it, by a full e2e run on `v3.0-w4` (5ae353d) and a
  search of `tests/`: `pregeneration`'s 'pre-generation writes nothing to storage' (chunk 24's)
  fails on "no database" too, and becomes "pre-generation writes no record"; `offline-and-fonts`'
  'offline after the first load…' races the start-up wait after its reload (passes alone, fails
  under the full suite) and waits for the first draw. Both go to chunk 7b. No other test asserts
  "no storage" in a way 7a or 7b breaks: `session-history-export`'s storage trap covers the
  history and export modules, which stay storage-free; `review-navigation` (chunk 10),
  `controller-status` (chunk 22) and `theme` (chunk 7) check only what their own chunks change.
  Build plan v12.

- **D302 (2026-10-14): a saved preset selection, not custom, whose seven profile-controlled values
  are not all that preset's after loading, loads as custom with that preset's grammar.** Chunk 6's
  settings codec decodes the selection and the seven values each on its own (master spec §4.4),
  so a saved "Jazz, not custom" whose `Register` record is invalid loads `Register` at its
  default, Neutral's `Middle`, with `Jazz` still checked: a state no player action reaches, since
  choosing a preset applies its whole bundle and any change to one of its values makes it custom
  (phrase-workspace design, preset customization). Decided by `spec-writer` under the owner's
  delegation of minor design calls, with no design answer needed: the load takes the state the
  design already defines for a changed value ("Custom configuration - Jazz grammar retained"),
  silently, as §4.4 wants every fallback; every value keeps what §4.4 gives it, and only the
  derived "not custom" mark yields. The test is equality with the preset's bundle, so it also
  covers an unreadable selection (it falls back to Neutral, not custom, and Jazz's values then
  make it custom with the Neutral grammar). Built in chunk 7b, in the codec, with unit tests.
  Rejected: accepting the incoherent state (the preset status would name a preset the values do
  not match), and re-applying the preset's bundle (it would replace the fallen-back value by the
  preset's, against §4.4's "falls back to that setting's default"). Build plan v12.

- **D303 (2026-10-14): a kept session's key is read with its record, through a keyed read of the
  port; the loader hands the kept sessions' summaries with their keys.** The owner's ruling ("go
  with option (a) for the session key"), on the question the wave-5 preflight raised for chunk 10:
  `StoragePort.readAll` gives values without their keys (`src/storage/storage-port.ts`,
  `src/storage/database.ts`), no kept-session record holds its key (`entity_kept_session_record`,
  `docs/storage.md`, Kept sessions), and the loader's `keptSessionSummaries` are bare values, so
  after a reload the session's save could not name the unpinned sessions to delete and
  `Review last session` could not read the body of the summary it shows. The port gains a keyed
  read of a whole store: every entry as its key and its raw value, in key order, in one read-only
  transaction, refused as `readAll` is; an entry whose key is not a string was not written by the
  app and is left out, never thrown on. `readAll` stays for the settings and the controller. The
  loader's `keptSessionSummaries` become those keyed entries, decoded by their callers as before.
  "The key is in no record" stays true. The key's form is `spec-writer`'s call under the owner's
  delegation of minor technical calls: the session's save mints it once, as
  `session-{startedAt}-{sessionSeed}` in decimal (the session's wall-clock start in epoch
  milliseconds and its 32-bit session seed, both already in the session-wide record), so tests
  fix it with the clock and the seed they already control; no code reads a fact back from a key.
  Rejected: (b) a key rebuilt from the summary's facts, which needs a readable summary to find a
  session at all (an unreadable one could then be neither deleted nor opened by key) and ties
  every key to a field a later migration might change; a random key, which adds a dependency for
  no gain. Revises `module_on_device_database` and `module_saved_data_loader`, and adds the key's
  form to `entity_kept_session_record`, as chunk 10's architecture capture, before its code.
  Build plan v13.

- **D304 (2026-10-14): how chunk 10's save at a session's end runs, and which session is the most
  recent one.** Settled by `spec-writer` under the owner's delegation of minor technical calls,
  from the kept-sessions design (`flows/kept-sessions/handoff.md`, Keeping at a Session's End;
  `screens/last-session-review/handoff.md`), checked against `src/storage/save-policy.ts`:
  - **Two transactions, not one.** `release()` flushes the settings changed during the session in
    a transaction of their own, and only when there are some. The session's save follows in one
    batch of its own. Merging the two into one batch was rejected: a storage-full refusal of the
    session (up to 4.25 MB) would then lose the player's setting changes too, and a failure could
    no longer be told apart as the session's own (keep line only, or the storage-full notice) or a
    setting's (the Save failed notice), which the design keeps apart.
  - **The deletions are read at the save.** Just before its batch, the save reads the summaries
    with the keyed read (D303) and deletes, in the same batch as the new session's write, the
    summary, body and played notes of every readable kept session that is not pinned. Reading
    then, not trusting the load's list, keeps the rule true when another tab saved a session
    meanwhile. A refused read still saves the new session and deletes nothing. A summary that
    cannot be read is left in place (whether it is pinned is unknown); that default is put to the
    owner as [O200](open-questions.md#v30-wave-5-o200).
  - **Saving off.** In an outdated tab, or a visit started from the defaults, the end reads,
    saves and deletes nothing; the session is held in memory and its keep line reads "Not saved
    on this device: export it to keep it.", as the design says.
  - **The most recent session.** In the visit it ended in, the last session that ended with a
    review, saved or held in memory; after a reload, the readable kept session with the latest
    start. That is the design's "the session that was saved last" in every case a single tab
    makes, since one tab's sessions never overlap; the record holds no time of saving to do
    better with overlapping sessions in two tabs. So after the player deletes the most recent
    session and reloads, the pinned session that started last becomes the most recent one.
  - **The most recent session stays in memory across the next Start** until the next session
    ends with a review, as the design says ("until the next session ends with a review or the
    page closes"), so a session ended in its count-in changes nothing and `review-link` returns
    by its rules, for a saved session and one held in memory alike. Master spec §4.4 says the
    session a visit holds in memory "keeps its review until the next session starts, as in v2";
    read as the least it promises, not a removal, since §5.1 says a count-in end changes nothing.
    The wording is aligned at the next Part A revision.
  Build plan v13.

- **D305 (2026-10-14): wave 5's file assignment between chunks 10 and 17, chunk 17's split, and
  the Idle-side my-instrument paths given to chunk 20.** Settled by `spec-writer` under the
  owner's delegation of minor technical calls, from the wave-5 preflight's file pass and the
  code on `v3.0-w5` (112c9ff). Chunks 10 and 17 have no path between them, so they must not
  change the same source file. `src/components/workspace/workspace-session-start.ts` goes to
  chunk 17, which must change it (the session's settings, lines 71–74, gain the profile from
  phrase 1's intent; the history, line 94, gains the clef from the written phrase); chunk 10
  leaves it alone, keeping its `state.review = null` (line 70), and holds the most recent session
  in a slot of the controller state that Start does not clear (`workspace-session-ends.ts`,
  `session-review-state.ts`, `workspace-session-controller.ts`,
  `workspace-session-controller-types.ts`). The kept-session record files
  (`kept-session-body.ts`, `kept-session-record.ts`) are chunk 17's; chunk 10 calls
  `encodeKeptSession`, `decodeKeptSession` and `decodeKeptSessionSummary` as chunk 9 built them,
  and chunk 17 leaves `encodeKeptSession`'s signature unchanged, taking the clef from the history
  record. Chunk 17 takes the session engine, as chunk 16's record and `entity_my_instrument`
  assign it (the attempt intents, `src/session/session-intents.ts`; `SessionSettings`,
  `src/session/session-types.ts`; the carry-in receiver, `src/session/carry-in-adaptation.ts`),
  and so splits: 17a, the worker and the session engine; 17b, the clef through the history, the
  kept-session body and the review. The Idle side, which only chunk 20 can feed (the profile
  exists as data only once my instrument's record is loaded), is chunk 20's: the Idle intent
  (`src/composables/use-generation-session.ts`), the rhythm prewarm's intent
  (`src/composables/generation-session-prewarm.ts`), the connection sheet's profile
  (`src/components/workspace/WorkspaceShell.vue`) and the instrument control's
  (`src/components/controls/FoundationControls.vue`, already chunk 20's). Chunk 10 needs more
  than five source files after D303, so it gets a split rule too (10a the save, 10b the reach).
  Build plan v13.

- **D306 (2026-10-14): chunk 20 carries my instrument whole on the Idle side, and the worker's
  check stays free of the clef bound.** Settled by `spec-writer` under the owner's delegation of
  minor technical calls, from chunk 17's records and the code on `v3.0-w5` (27a4da2). Three gaps
  chunk 17 reported or that its code shows, each added to chunk 20's Files, Scope and "Done when":
  - **Idle pre-generation's settings.** `startOf` in
    `src/components/workspace/workspace-pregeneration.ts` builds them as
    `{ controls, musicalProfile }`, without my instrument's profile; it uses
    `sessionSettingsAtStart(…, phraseOne.intent)` as Start does, so a pre-generated phrase is
    built with the profile the session plays.
  - **The clef of the written phrase.** Idle's written phrase
    (`src/composables/use-notation-coordinator.ts`, `writtenPhraseOf`) and the session staff's
    (`session-staff-fixed-parts.ts`, `held-layout-fit.ts`) still use `BUILT_IN_INSTRUMENT_CLEF`;
    they take my instrument's clef, which Start then records in the history unchanged (17b).
  - **The worker's derivation.** `derivedMyInstrumentProfile`
    (`src/generation-worker/generation-worker-inbound.ts`) rebuilds the profile with
    `makeMyInstrument` and a stand-in `clef: 'treble'`. Once chunk 20 adds the per-clef bound
    (D294) to my instrument's validity rules, the worker would refuse a valid bass-clef my
    instrument written below C2. Passing the clef was rejected: it would put display data into
    the worker's intent, which D293 and chunk 17b keep out. So the worker's derivation applies
    every rule except the clef bound, which is checked where my instrument is built with its
    clef (the sheet and the record's load).
  Build plan v14.

- **D307 (2026-10-14): a failed read behind `review-link` after a reload, and the test that a
  session not saved is gone after a reload, both go to chunk 14.** Settled by `spec-writer`
  under the owner's delegation of minor design issues. The kept-sessions design already defines
  the path (`flows/kept-sessions/handoff.md`, `review-link` activation: "if it cannot be read,
  the mode shows the list instead, that session's row in its failed-to-open state, focus on the
  list's title"), so no `ux-writer` item is needed; it needs the list, which chunk 14 builds.
  Until then (chunk 10b's interim) the failure shows nothing and the link comes back enabled:
  accepted, since only a damaged body read fails there. No test yet checks that a session whose
  save was refused, or that ended with saving off, is gone after a reload; the behaviour holds
  by construction (a refused batch writes nothing; saving off writes nothing, which chunk 10's
  write spy checks), so it is not a gate fix now. Chunk 14 adds both as "Done when" lines, the
  list being the clearest witness, and gains a split rule (14a the list, 14b the links and the
  failed read) since it now names six source files. Build plan v14.

- **D308 (2026-10-14): a session cut short by reloading or closing the page: owner question
  O201, and chunk 27 inserted for its fix.** Settled by `spec-writer` from the wave-5 sync's
  drift report and the code on `v3.0-w5` (27a4da2). A reload or close of a visible page fires
  `pagehide`, then `visibilitychange` to hidden (HTML "unload a document"; Chromium, Gecko and
  WebKit alike, checked 2026-10-14); the hidden-tab watcher then ends the session and its save
  starts. An unfinished IndexedDB transaction is aborted when the page goes, but a page kept in
  the back-forward cache is only frozen and its save commits if the player returns; so whether
  such a session is saved, deleting the previous unpinned one, is not determined, against §5.1's
  "lost". The choice between keeping §5.1 (never saved, abandoned on `pagehide`) and amending it
  (saved when the save completes, best effort) changes what the player keeps, so it goes to the
  owner as [O201](open-questions.md#v30-wave-5-o200); proposed: keep §5.1. No later chunk owns
  the session's end and save (`workspace-session-ends.ts`, `workspace-session-save.ts`, the end
  watchers, the page-visibility port), so a small chunk 27 is inserted for the fix and its
  end-to-end test, in wave 7: it depends only on chunk 10, and wave 6's chunk 11 may touch the
  session's save for played notes, so wave 7 keeps them apart; no wave-7 chunk touches its files.
  Build plan v14.

- **D309 (2026-10-14): a session cut short by reloading or closing the page is never saved
  (closes O201, answer (a)).** The owner's ruling, verbatim: "O201: option A of course." Master
  spec §5.1 stands as written: a session cut short by reloading or closing the page is lost; it
  is never saved, and the kept sessions stay exactly as they were, every time. Switching to
  another tab or app still ends the session, opens its review and saves it. Chunk 27 builds it as
  its scope already states (a `pagehide` flag the session's save checks before each of its
  transactions, abandoning itself with nothing written; a page brought back from the
  back-forward cache shows that review as not saved); it no longer waits for a ruling, only for
  chunk 10, merged. Part M2's item 2 of the intent change set (`req_rolling_practice_session`)
  stands as the owner signed it. No master spec change. Build plan v15.

- **D310 (2026-10-14): a kept session the app cannot read correctly is deleted, with an
  apology; a read the device refuses deletes nothing (closes O200).** The owner's ruling,
  verbatim: "O200: damaged session are removed (unability to load correctly a session =
  destruction with an apology message)." It answers O200 the other way from the proposed default
  chunk 10 built (left in place, D304), and reaches beyond the save: it holds wherever the app
  reads a kept session. Settled by `spec-writer` under the owner's delegation of minor technical
  calls, from the kept-session codec (`src/storage/records/kept-reading.ts`,
  `kept-session-record.ts`) and the save (`workspace-session-save.ts`, `save-policy.ts`) on
  `v3.0-w5` (a073edd):
  - **Damaged is the codec's `unreadable` verdict on records the device returned:** an envelope
    that cannot be read, content this version's rules refuse, records of one session that
    disagree, or a summary whose body, or whose played notes it says are kept, is missing. The
    whole session goes, its summary, body and played notes, pinned or not, with its favorites and
    comment: the codec reads a session whole or not at all, so nothing of it can be opened or
    exported.
  - **Not damaged, never deleted:** a record a newer version wrote (`newer`): the outdated-tab
    rule wins (§4.3), no deletion of any kind; and every refusal by the device (storage
    unavailable, a read refused or failing, the whole load failing or too slow), which says
    nothing about the records: deleting then would destroy sessions that may be fine, against
    §4.4's "a failed read never overwrites what is kept". A session whose records are all absent
    when opened was deleted meanwhile, by another tab; nothing is left to delete, and it is
    handled as a failed open. So damage is judged only from what the device actually returned.
  - **Only while the visit saves.** An outdated tab and a visit started from the defaults delete
    nothing; a damaged session stays until a visit that saves finds it. In an outdated tab a
    damaged summary has no row in the session list, and a damaged body read shows the design's
    failed-open row ("This session couldn't be opened. Try again.").
  - **When.** At load, once the summaries are read: one batch deletes every kept session whose
    summary is damaged, through the save policy (held like any save while a session runs). At a
    session's save: the same batch as the new session also deletes every kept session whose
    summary is damaged (chunk 10 leaves them; changed in chunk 28). At an opening (`review-link`
    after a reload, a row of the list): a damaged body deletes that session at once; the most
    recent session then becomes the readable kept session that started last, as after the
    player's own deletion (D304). The refused read at the save (D304) stays: the new session is
    saved and nothing deleted, the older unpinned ones going at the next save.
  - **The apology** is a notice in the notice row, shown once the deletion has committed and
    outside a running session (held during one, as every notice is), saying how many sessions
    went. Its wording, its dismissal and its place among the notices are `ux-writer`'s, under
    the owner's delegation of minor design issues. A deletion the device refuses shows no
    apology: it raises the notice any refused save raises, the session stays unlisted for the
    visit, and the next load tries again.
  - **Consequences.** "Only one session is ever kept without the player asking" (§5.1) holds again
    as worded, so `req_kept_sessions` loses O200's carve-out; part M2's items 5(b) and 6 are
    rewritten to the ruling; item 7 (`rule_failed_read_offers_only_delete_everything`) is not
    affected, since a visit whose read failed reads no kept session and deletes nothing on its
    own. The session list no longer needs a row for a session whose summary cannot be read, the
    design gap O200 named: such a session has no row. Since the codec's verdict now destroys
    data, a session this version saves must never read as damaged; chunk 28 tests the round trip.
  Master spec Part A v1.15 (§5.1, §13 item 6). Build plan v15.

- **D311 (2026-10-14): chunk 28 inserted in wave 8 for D310; chunk 14's failed reads are the
  device's refusals; a design gate for the apology.** Settled by `spec-writer` under the owner's
  delegation of minor technical calls. No wave-5 code is rebuilt: chunk 10's save, merged,
  keeps damaged summaries until chunk 28. The code D310 needs sits in files chunks 14 and 27 own
  in wave 7 (`use-review-navigation.ts`, `use-kept-sessions.ts`, `workspace-session-save.ts`,
  `workspace-session-ends.ts`), and neither can take it without passing about five source files
  or sharing a file with the other, so a new chunk 28, after both, joins wave 8 beside chunks 15
  and 21, whose files it does not name (it reaches the notices without `WorkspaceShell.vue`,
  chunk 15's); wave 8's file pass checks `use-kept-sessions.ts` against chunk 15's Delete every
  session. It splits 28a (the deletions: load, save, opening) and 28b (the apology and where the
  player lands). Its damaged-summary check runs in the session controller's chunk, where the
  summaries are already decoded, never in the entry chunk, which has 8,181 B of headroom. Chunk
  14 keeps D307's failed-read path for a refusal by the device, its tests injecting refusals
  rather than damaged records, and lists no row for a session whose summary cannot be read. The
  apology and the landings are a new **Damaged session design** gate for `ux-writer`, before
  28b. Build plan v15.

- **D312 (2026-10-15): wave 6 keeps chunks 11, 12 and 25 and shares their files in a stated
  order; Gate A is shown done.** Settled by `spec-writer` under the owner's delegation of minor
  technical calls, from the wave-6 preflight (`documentalist`, 62d3eb5 on `v3.0-w6`) and the code
  on that branch. The preflight found chunks 11, 12 and 25 not file-independent: all three need
  `use-review-host.ts`, `ReviewPanel.vue` and `ScorePanel.vue` (which passes the review host's state
  to the panel), and chunks 11 and 12 also `workspace-session-save.ts` (which hardcodes
  `playedNotesKept: false` and an empty pin, favorites and comment) and the session controller's
  types and module (`ReviewedSession` and the most recent session hold no favorites, comment,
  played-notes flag or delete path). Giving each file to one chunk, as D305 did, would make one
  chunk build another's slice; moving chunk 12 out would put chunks 13, 14, 15 and 28 a wave later
  on the critical path; moving 25 out changes nothing, since its review edit meets 11's and 12's
  in the next wave too (it may still leave at the wave's end if H1 has not come). Since wave 6
  runs one chunk at a time (κ=1), each chunk's branch cut from the wave branch after the previous
  chunk merged, sharing in sequence brings no conflicting edits: the chunks run 11 → 12 → 18 → 22 →
  25, the plan names per shared file the order and what each adds, and a later chunk adds its part
  without reshaping an earlier one's. Chunk 12 depends on chunk 11's change path (D313), the one
  in-wave edge, fixed by chunk 11's capture and two chunks long, as the build-plan model allows.
  Chunk 11 builds the shared confirmation sheet (it needs two confirmations first; 12, 14, 15 and
  20 reuse it). Chunks 11, 12, 22 and 25 gain split rules at about five source files.
  Gate A was applied on 2026-10-07 (54025fa; CONTRACT 2.0, now 5.0) and is shown done. Build plan
  v16.

- **D313 (2026-10-15): how a kept session changes after its save, chunk 11's architecture
  capture.** Settled by `spec-writer` from master spec §5.1, §5.3, §4.3 and §4.4, the review-and-
  export and kept-sessions designs (Saving the Session, Played Notes, While Saving Is Off) and
  D303–D304. `module_kept_session_save` covers only the save at the session's end; chunk 11 builds
  the changes after it (played notes kept or deleted for one session, every kept played note
  deleted) and chunk 12 reuses them (favorite, pin, unpin, comment, Delete session, the retry of a
  failed save), so `documentalist` records them before chunk 11's code. Every such change is one
  port `apply` batch through the save policy (held during a session, refused in an outdated tab,
  checked against `meta`). The summary is always rewritten; the `playedNotes` record is written or
  deleted in the same batch; the body only for a favorite mark; Delete session deletes all three;
  deleting every kept played note is one batch over every readable summary that said they were
  kept, an unreadable one left to chunk 28. The session is named by the key its save minted; a
  change made while that save runs waits for it. With saving off a change holds for the visit and
  nothing is read, written or deleted. A refused change stays in memory and the notice row tells it
  at Idle, unlike the session's own save. A session whose own save failed is changed only by
  chunk 12's retry: its next favorite, pin, unpin or comment runs the session's own save again with
  the facts as they are then, the same batch, its deletions read at the retry. Chunk 11's Done when
  gains the design's `Delete them` path (`rule_kept_played_notes_deletable`) and the saving-off
  switch; chunk 11's drift check adds `specification_ephemeral_state_verification`; chunk 12's
  Atoms add `req_kept_session_list` and `rule_failed_save_never_disturbs_session`, its Part D
  `module_kept_session_save` and `specification_ephemeral_state_verification`. Build plan v16.

- **D314 (2026-10-15): remembering the controller is a seventh contract change, major, for the
  owner; chunk 22 waits for it.** Found by the wave-6 preflight; the wording checked and the
  consequences settled by `spec-writer`. Two STABLE contract atoms still state v2's behaviour:
  `specification_browser_only_operation_verification` rejects a release that "starts audio or
  requests MIDI access before the player clicks Start or "Connect controller"", and
  `rule_midi_starting_note` says the starting note, with a controller attached at Idle, starts the
  count-in. Chunk 22 requests access at load to reselect the remembered controller (only when the
  browser already allows it, master spec §7.3), and after a load the starting note starts nothing
  before the page's first click, tap or key press. Master spec §10 called the audio-unlock
  widening "not a contract guarantee", true of `rule_audio_unlocked_by_player_click` (REVIEW) but
  not of these two; Part A v1.16 corrects it and states the change as §10's seventh, with the
  proposed wordings. They differ from the preflight's proposal in three points: the audio clause
  reads "before the player has either clicked Start or "Connect controller" or played the starting
  note after the page's first click, tap or key press", since "or plays the starting note after a
  first click" in the list of rejections read as rejecting that very case; the MIDI clause keeps
  v2's "Start or "Connect controller"" and adds only the exception, so nothing but the exception
  changes; and "(a note played on the controller does not count)" makes plain that a MIDI key is
  not the key press meant. Both wordings hold for v2.0 (a controller attaches there only after a
  Connect controller click; nothing is requested at load) and both lose cases, so the change is
  major, CONTRACT 5.0 → 6.0: a new owner gate, the **Remembered-controller wording**, before chunk
  22 merges; `documentalist` writes the change-set part and applies it once the owner confirms, as
  for parts I1 and J1. For the tighter audio wording to hold, the page's first gesture creates no
  audio context by itself: the starting note's callback, which already unlocks the audio
  (`workspace-session-start.ts`), makes it, as Chromium allows after that gesture, so the v2 test
  that no interaction other than Start and Connect controller creates an audio context stays
  unchanged; if Chromium refuses, chunk 22 stops and reports. Chunk 22 gains an architecture
  capture: the record holds the input port's `id`, the one identity v2 matches a returning device
  on, with its name and manufacturer for display only; hand check H4 confirms the `id` survives a
  reload, and if it does not the finding goes to the owner, never a silent match by name. Its
  Atoms add `rule_starting_note_waits_for_first_gesture` and `rule_disconnect_forgets_controller`;
  `rule_audio_unlocked_by_player_click` (REVIEW, `changes-in-v3.0`) and
  `rule_controller_connects_between_sessions` move to its Part D; its Files add the wiring of the
  loaded record and its saver (`WorkspaceShell.vue`, beside chunk 20's later `profile` change
  there, and the visit's saves) and the starting note's wait. The Delete everything half of its
  reload test is chunk 15's, since chunk 15 builds Delete everything in wave 8. Build plan v16.

- **D315 (2026-10-15): chunk 25's lane scale leaves out very short notes; a session whose every
  played note is very short goes to `ux-writer` (O210).** Settled by `spec-writer` from master spec
  §9 (very short notes are filtered when read, for the lane and, by default, the played-notes
  export) and ux D210 ("holds a played note" counts very short ones). The lane's session-wide pitch
  scale (`playedNotesPitchScale`, computed in `ReviewPanel.vue`) is part of the lane, so it is
  computed from the notes the lane shows: a very short note never widens it. When every played note
  of a session is very short, `review-view` and `Export played notes` still show (ux D210) and the
  lane shows no bar, but with `Include very short notes` off the played-notes file would hold no
  note, which its encoder refuses with a typed error that would show the export error: what the
  review offers there is a design matter, opened as O210 for `ux-writer` and a gate before chunk
  25, which waits for H1 anyway. Chunk 25's Files add the review files it shares with chunks 11 and
  12 (D312) and `review-export.ts`; its Part D adds `module_review_export_pipeline`. Build plan v16.

- **D316 (2026-10-15): a change to a kept session after its save reads what is stored at the
  change.** Settled by `spec-writer` under the owner's delegation of minor technical calls, from
  `documentalist`'s capture `module_kept_session_changes` (384cecf), which was silent on it, and the
  save policy on `v3.0-w6`: its plain `save(changes)` reads nothing, and only `saveSession` reads
  the kept summaries, at the save. Built from the summaries read at load and the visit's own
  sessions, a change would miss played notes another tab kept since the load (short of
  `rule_kept_played_notes_deletable`'s "every session's") and could rewrite a summary from stale
  facts, for example unpinning a session another tab pinned, which the next save then deletes
  (against `rule_pinned_session_kept`). So, as the session's own save does (D304), each change reads
  what it rewrites at the change, through the save policy, once no session holds the saves and no
  flush runs, queued with the session saves: the session's summary by its key, and its body for a
  favorite mark; for deleting every kept played note, the keys of every stored `playedNotes`
  record and every summary with its key. The batch applies only the player's change to what was
  read, never facts held in memory. A change whose summary is gone (another tab deleted the
  session) or cannot be read writes nothing and recreates nothing, the change holding in memory for
  the visit; a refused read applies nothing and is told as a refused change. Whether there are
  played notes to delete, which decides whether turning `Keep my played notes` off opens its
  confirmation, is read at the switch the same way. The read and the batch are separate
  transactions, the same narrow window the session's own save accepts. Chunk 11's Files gain
  `src/storage/save-policy.ts` (and, if needed, `save-policy-requests.ts` and a keys-only read in
  `storage-port.ts` and `database.ts`, so that deleting every played note never reads them all),
  chunk 11 alone in wave 6; its Part D gains `module_save_policy` (and `module_on_device_database`
  with a keys-only read). Build plan v17.

- **D317 (2026-10-15): deleting every kept played note deletes every stored played-notes record,
  an unreadable session's included.** Corrects D313's "one batch over every readable summary that
  said they were kept", which would have left the played notes of a session whose summary cannot be
  read. The player asked to delete every kept played note, and §5.3 and
  `rule_kept_played_notes_deletable` say every session's; played notes are the most private data
  the app keeps, so the wider reading wins. The batch deletes every `playedNotes` record read at the
  change and rewrites every readable summary that said they were kept; an unreadable summary and
  its body are left as they are, for chunk 28's deletion of damaged sessions. `documentalist`'s
  capture records this; its sentence that an unreadable session's "played notes" are left as they
  are contradicts it and goes. Build plan v17.

- **D318 (2026-10-15): a visit that saves nothing neither remembers nor forgets the controller.**
  Settled by `spec-writer` from master spec §4.3 and §4.4: an outdated tab "saves and deletes
  nothing", and a visit started from the defaults "saves nothing for the rest of that visit, so a
  failed read never overwrites what is kept". Clearing the remembered-controller record at
  `Disconnect` is a deletion such a visit may not make, and §4.4's reason applies directly: a visit
  started from the defaults has not even read the record. So in such a visit, connecting a
  controller does not remember it, and `Disconnect` forgets the controller for that visit only; the
  next load that reads the saved data reselects the controller remembered before. This is an
  exception to `rule_last_controller_remembered`'s "after the player's Disconnect, a reload
  reselects nothing", worded into §7.3 and item 18 (master spec Part A v1.17). Not a design
  question: the visit already tells the player that it saves nothing and asks for a reload, and no
  screen changes. No contract wording changes: neither atom is on the contract, and the
  Remembered-controller wording (D314) says nothing of Disconnect. Chunk 22's capture and Done when
  carry it. Build plan v17.
