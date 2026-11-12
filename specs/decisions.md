# Decisions

Status: draft v2.135

Append-only record of settled decisions. Earlier logs are archived verbatim:

- D1–D46 (first release): [archive/v1/decisions-D1-D46.md](archive/v1/decisions-D1-D46.md)
- D47–D71 (2026-09-25 persona and vision session):
  [archive/2026-09-25-personas-and-vision/decisions-D47-D71.md](archive/2026-09-25-personas-and-vision/decisions-D47-D71.md)
- D72–D108 (v2 spec consolidated: v2.0–v2.3, from the v1.0 gate close through the rolling-phrase
  spec): [archive/v2/decisions-D72-D108.md](archive/v2/decisions-D72-D108.md)
- D109–D207 (v2 design and build, through the v2.0 release gate):
  [archive/v2/decisions-D109-D207.md](archive/v2/decisions-D109-D207.md)
- D208–D227 (the v2.0 release record, v3's direction, and the v3.0 drafts, master spec and
  design): [archive/v3/decisions-D208-D227.md](archive/v3/decisions-D208-D227.md)
- D252–D258 (the wave-level build workflow and the v3.0 wave-1 rulings):
  [archive/v3/decisions-D252-D258.md](archive/v3/decisions-D252-D258.md)
- D290–D343 (the v3.0 build, through the v3.0 release gate):
  [archive/v3/decisions-D290-D343.md](archive/v3/decisions-D290-D343.md)
- D228–D231 (the owner's first rulings on v3.1's presets and their key and mode restriction):
  [archive/v3/decisions-D228-D231.md](archive/v3/decisions-D228-D231.md)
- D353–D388 (the v3.1 build, from the design's approval to the owner's acceptance at wave 5):
  [archive/v3/decisions-D353-D388.md](archive/v3/decisions-D353-D388.md)
- D390–D391 (v3.1's wave-5 sign-offs and hand checks H1 and H2):
  [archive/v3/decisions-D390-D391.md](archive/v3/decisions-D390-D391.md)
- D232–D251 (v3.2's drafts, master spec Part C v1.0 and its approval, with v3.1's last
  precisions): [archive/v3/decisions-D232-D251.md](archive/v3/decisions-D232-D251.md)
- D392 (v3.1's release gate, run without hand checks H3–H5):
  [archive/v3/decisions-D392.md](archive/v3/decisions-D392.md)
- D396–D405 (v3.1's release sync, go, archive and closed hand checks; v3.2's Jam re-scope):
  [archive/v3/decisions-D396-D405.md](archive/v3/decisions-D396-D405.md)
- D407–D509 (the v3.2 build, from the approved Part C v1.2 through wave 7 and the guide playback):
  [archive/v3/decisions-D407-D509.md](archive/v3/decisions-D407-D509.md)

Archived IDs keep their meaning and may be cited anywhere. Their content is now stated as settled
fact in the live documents (see the [archive index](archive/README.md) and each milestone
folder's README, such as [archive/v3/README.md](archive/v3/README.md)). New IDs come from
`doc-ids next spec D`.

Live here: D259–D260 (style packs, planned with no version, and the sound ban; merged from branch
`v4-accompaniment-research`); D261–D288 (v3.3, not built yet; D263–D288 merged from branch
`v3.3-chord-research`); D344–D348 (the v3.0 release and its v3.0.x notes, still open); D349–D352
(the v3.1–v3.3 plan migrations, merged from branch `plan-migration` as D339–D341, kept together
with D351, which shapes the v3.3 plan); D389 and D393–D395 (v3.4 and its lexicon page, the
lexicon API later); D406 (Jam's four answers, provisional until the owner's checks after the
`3.2.0` tag); D511–D520 (v3.3 refreshed against v3.2 as built, and approved); D521–D523 (v3.2's
release as built, its contract as built and its go, whose checks after the tag are still open);
D524 (v3.2 released and archived); and D526–D527 (v3.3's gates I0 and C1, and when A8 applies). D289 and D525 are unused; so are the IDs within the
archived range D407–D509 that its archive notice lists.

## Decision Log

- **D259 (2026-10-11): style packs are recorded as planned, version not yet assigned.** The
  owner's call: keep the style-pack plan and the reasoning behind it in the
  [roadmap](roadmap.md#planned-version-not-yet-assigned--style-packs) for future reference, with
  no version, no scope and no spec yet. The plan groups the generator's settings and new
  capabilities into style packs (dialects such as Folk reel, Bebop, Blues, Baroque), layered style
  → character identity → situation, as declarative data over the one generator (the breadth
  review's option B), in the style atlas's greedy unlock order and tiers. Nothing it would revisit
  (D11–D13, D15, D20, D28, the voice-leading minimum rules, the fixed four-bar phrase) changes
  now. The research behind it is on branch `v4-accompaniment-research`:
  `docs/music/styles/README.md`, `docs/music/generation-breadth-review.md`,
  `docs/music/identity-modelling.md`, `docs/music/README.md` and `docs/sound-library-survey.md`.
- **D260 (2026-10-11): the only sound ban is on samples.** The owner's position, from the v4 sound
  library survey (its open question 1): the one true ban is on samples, recorded audio and audio
  assets. Generated buffers (noise, a reverb impulse response, a wavetable computed in code),
  AudioWorklets, WASM DSP and effect chains are open in principle. The "oscillators and gains
  only" wording of `req_session_backing_track` and of the `verify:boundaries` check (which bans
  `createBufferSource` and `new AudioBuffer(` in authored code) is narrower than this intent; the
  v4 spec rewords both to ban recorded audio and audio assets rather than buffers
  (`documentalist` for the atom). It does not touch the separate no-network rule.
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

- **D344 (2026-10-16): `createSessionMidi` keeps no code link to `service_session_midi`.** The
  owner accepted ("ok") the wave-10 final sync's recommendation: its file,
  `src/components/workspace/workspace-session-midi.ts`, already links ten atoms, the code-health
  cap, so it stays as it is; the atom stays traced through `workspace-session-starting-note.ts`
  and two test files. Stated in
  [v3 README, v3.0.x notes](versions/v3/README.md#v30x-notes-after-the-tag).

- **D345 (2026-10-16): the 17 REVIEW `release-v3.0` atoms are promoted later.** The owner
  accepted ("ok") the final sync's recommendation: 22 STABLE atoms sit under REVIEW parents for
  now, and the 17 are promoted after the tag as v3.0.x notes, for example once H5's
  played-notes-export half and H8 have run. Stated in
  [v3 README, v3.0.x notes](versions/v3/README.md#v30x-notes-after-the-tag).

- **D346 (2026-10-16): ten promoted atoms tagged `changes-in-v3.1` or `changes-in-v3.2` now
  cross the contract gate.** The owner accepted ("ok") the final sync's finding: being STABLE and
  on the surface, their v3.1 and v3.2 revisions each need the contract bump their level requires.
  Stated in [v3 README, v3.0.x notes](versions/v3/README.md#v30x-notes-after-the-tag).

- **D347 (2026-10-16): the CONTRACT's EXPECTATION is trimmed now, at the v3.0 archive.** The owner
  accepted ("ok") keeping it as a version history until archive time, and left the time to the
  archive pass; spec-writer's call: this release's archive is that time, since the notes for
  versions shipped in 2.0.0 and 3.0.0 are release history. `documentalist` applies the trim
  listed in [v3 README, v3.0.x notes](versions/v3/README.md#v30x-notes-after-the-tag).

- **D348 (2026-10-16): v3.0 is released as version 3.0.0; its working record is archived.** The
  release gate (build plan chunk 26) passed; the tag `v3.0.0` is at e288d98, approved by the
  owner, and the app is deployed. The v3.0 decisions (D208–D227, D252–D258, D290–D343), the
  register's notes on closed v3.0 questions, the spec index's status snapshot, the five v3.0
  drafts and the storage grounding move verbatim to [archive/v3/](archive/v3/README.md). The
  master spec, the v3.0 build plan and the v3 README stay in place. Live: D228–D251 (v3.1, v3.2),
  D261–D288 (v3.3) and D344–D347. No question was decided; the v3.0.x notes stay live.

- **D349 (2026-10-16): v3.1's build plan moves to the build-plan model, with one shared v3 build
  workflow and its waves re-formed.** Chunk IDs and Done-when statements are kept; the four
  drifting §3 copies give way to one workflow document, and the eleven waves become six. Why: thin
  waves paid a full preflight and gate each. Numbered D339 on branch `plan-migration` (D352). Now
  in: [build-workflow.md](versions/v3/build-workflow.md),
  [build-plan-v3.1.md](versions/v3/build-plan-v3.1.md#waves).

- **D350 (2026-10-16): v3.2's build plan moves to the build-plan model, under the shared v3 build
  workflow, its waves re-formed.** Chunk IDs and Done-when statements are kept; twelve waves become
  seven, the release gate no wave; chunk 20 now follows chunk 19, whose dependent control it uses.
  Why: thin waves paid a full preflight and gate each, and old wave 3 held the chain 8 → LD → 20.
  Numbered D340 on branch `plan-migration` (D352). Now in:
  [build-plan-v3.2.md](versions/v3/build-plan-v3.2.md#waves).

- **D351 (2026-10-16): v3.3's build plan moves to the build-plan model, under the shared v3 build
  workflow, its waves re-formed.** Eight waves become six; chunk 7 now follows chunks 5 and 6, whose
  chord-tone facts its run rule reads; the owner's four questions become gates A0, C1, R0 and I0
  and [O230](open-questions.md). Why: thin waves, and old wave 2 held 5, 6 and 7 with no path
  between them. Numbered D341 on branch `plan-migration` (D352). Now in:
  [build-plan-v3.3.md](versions/v3/build-plan-v3.3.md#waves).

- **D352 (2026-10-19): branch `plan-migration` is merged, renumbered.** The owner: merge it,
  renumbered. Its D339, D340 and D341 collided with `main`'s v3.0 gate entries and became D349,
  D350 and D351; its O177 became [O230](open-questions.md). `main`'s v3.0 release and archive state
  wins every conflict in the registers and indexes. Not an approval of any of the three plans.

- **D389 (2026-10-21): v3.4, a structural review, is the last v3 milestone, after v3.3 and before
  v4.** The owner asked for "an overall structural analysis of our app" before v4's endgame work:
  soundness for expansion, the 300 KiB entry budget, refactors worth taking, a split into
  libraries. No player-facing behaviour. Asked whether it should run before v3.2 and v3.3: "leave it
  for the last milestone of v3, there is no need to run it prior". Opens O234–O238. Now in:
  [v3.4](versions/v3/README.md#v34--structural-review), [scoping draft](versions/v3/structural-review.md).

- **D393 (2026-10-21): v3.4 also builds a lexicon page, step one of a side project; D389 is
  amended.** The owner: "have a side page to our app reference all words in there, it must allow
  alphabetical exploration, simple search … That's for step one (include it in 3.4)". Lazy-loaded,
  offline, `src/styles/` only, keyboard use; out: editing, word popups, the API. D389's "no
  player-facing behaviour" now describes the structural review only. Opens O239–O246. Now in:
  [lexicon page](versions/v3/lexicon-page.md#2-settled), [v3.4](versions/v3/README.md#the-lexicon-page-d393).

- **D394 (2026-10-21): the lexicon page's only source is `docs/music/lexicon.md`.** The owner: "it
  must use existing md files and not duplicate information". Read at build time; no hand-copied
  list, no second list, no generated file committed; a lexicon edit shows with no other change,
  and a check proves it. Now in: [lexicon page §5](versions/v3/lexicon-page.md#5-the-single-source-d394).

- **D395 (2026-10-21): the lexicon becomes "a proper API" in v4 or v5, the version decided
  later.** The owner: "For later (v4 or v5 depending on how they goes) we will turn this in a
  proper API." Not specced. Now in:
  [roadmap](roadmap.md#planned-v4-or-v5--the-lexicon-api).

- **D406 (2026-10-21): Jam's settings, its controls taken from the doodle, its tempo and its
  rhythm lock are settled as proposed, provisionally until the owner's checks.** The owner: "your
  propositions seem nice, will need testing to be sure." Closes O247, O248, O249 and O253 as
  [Jam mode §3](versions/v3/jam-mode.md#3-jams-settings-set) and [§5](versions/v3/jam-mode.md#5-tempo-in-jam) say, with the check that
  confirms each in [§3.1](versions/v3/jam-mode.md#31-what-confirms-them). A failed check comes back as a ruling for the
  owner; nothing changes silently.

- **D511 (2026-11-09): Part D and the v3.3 build plan are refreshed against v3.2 as built
  (proposed for owner approval with Part D, gate A0).** spec-writer's review, asked for before A0:
  Part D v1.1 and plan v3 predate most of v3.2. Re-checked on `main` d10de742 (Part C v1.24,
  CONTRACT 14.0.0) by `codebase-explorer` and a read-only `documentalist` pass: stale code
  references, tools, budgets and atom versions corrected, and the chord research's code table
  re-checked. The substantive gaps are D512–D518 and O306. Now in:
  [Part D v1.2](versions/v3/master-spec.md#part-d--v33),
  [build plan v3.3, v4](versions/v3/build-plan-v3.3.md),
  [chord research](../docs/music/chord-research.md#where-a-fourth-chord-note-meets-the-code).

- **D512 (2026-11-09): Jam's own level runs through all of Part D, and new chunk 23 builds it
  (proposed with Part D).** D411 gave Jam its own level, but only §D8.4 said so; scope, saving,
  the interface, the definition of done and the plan covered session mode only. Jam's level is
  one more `jam.*` setting, Off first, with no database step. Now in:
  [Part D §D8.4](versions/v3/master-spec.md#d84-pre-generation-jam-and-the-key-and-mode-suggestion),
  [build plan v3.3, chunk 23](versions/v3/build-plan-v3.3.md#chunk-23--jams-own-seventh-chords-level).

- **D513 (2026-11-09): a level change keeps the kept doodle (proposed with Part D; corrects D274's
  point 4).** Since v3.2's wave 7 only New doodle, leaving Jam mode or deleting its session lets the
  doodle go. Session mode's level discards session mode's prepared phrases; Jam's rewrites phrase 1
  from the kept doodle, as any Jam setting but the tempo does. Now in:
  [Part D §D8.4](versions/v3/master-spec.md#d84-pre-generation-jam-and-the-key-and-mode-suggestion),
  [§D15 item 16](versions/v3/master-spec.md#d15-definition-of-done).

- **D514 (2026-11-09): the level rides the generation intent only (proposed with Part D; amends
  D277's placement).** The resolved request holds neither the controls nor the figure levels;
  the level sits beside the figure levels and is read from the intent as they are, so stored
  requests and their parser stay as they are. Now in:
  [Part D §D9](versions/v3/master-spec.md#d9-the-generation-request-the-replay-key-and-kept-sessions),
  [build plan v3.3, chunk 3](versions/v3/build-plan-v3.3.md#chunk-3--the-level-in-the-generation-request).

- **D515 (2026-11-09): data version 5 rewrites the records whose shape changes (proposed with
  Part D; amends D279).** STABLE `module_on_device_database` reads a record below its shape's
  version as unreadable; a step that rewrote nothing would need that rule changed. The step
  rewrites player presets and kept bodies with the level at Off; the levels' settings records
  need no step. Now in: [Part D §D8.2](versions/v3/master-spec.md#d82-saving-on-the-device),
  [build plan v3.3, chunk 17](versions/v3/build-plan-v3.3.md#chunk-17--the-level-on-the-device-data-version-5).

- **D516 (2026-11-09): the rhythm lock's walk, the carried note, and Jam measured at 180 BPM
  (proposed with Part D).** With locked bars the search tries every plan per locked rhythm; each
  plan's two forms stay side by side, measured with the lock on. The carried final note is read
  against the triad. Jam's phrase 1 is measured at 180 BPM, its fastest (D506). Now in:
  [Part D §D5.3](versions/v3/master-spec.md#d53-how-the-planner-applies-it),
  [§D6.3](versions/v3/master-spec.md#d63-phrase-endings-and-the-join-read-the-triad-until-a-listening-check),
  [§D10](versions/v3/master-spec.md#d10-the-cost-guard-generation-time-with-seventh-chords).

- **D517 (2026-11-09): every STABLE wording v3.3 changes is confirmed once and applied wave by
  wave (proposed with Part D; amends D276).** v3.2 promoted many touched atoms to STABLE, so §D12
  lists two meaning changes and seven groups that grow to name the level; `rule_leap_recovery`
  keeps its wording ("chord-tone run"). The owner confirms all at C1; each applies at its wave's
  sync, as D422 did. First bump: 15.0.0 if v3.2's release adds none. Now in:
  [Part D §D12](versions/v3/master-spec.md#d12-contract-changes-needing-owner-confirmation),
  [build plan v3.3, gates](versions/v3/build-plan-v3.3.md#gates).

- **D518 (2026-11-09): the backing beside v3.2's guides (proposed with Part D).** The guides play
  the line and the root, so the backing alone sounds the whole chord; each chord note keeps
  today's loudness, the mix is unchanged, and H2 judges the balance with the guides on and off.
  Now in: [Part D §D7.3](versions/v3/master-spec.md#d73-the-backing-plays-the-seventh),
  [build plan v3.3, hand checks](versions/v3/build-plan-v3.3.md#hand-checks).

- **D519 (2026-11-09): after `Start with this phrase`, phrase 1 keeps its own level (a
  clarification, proposed with Part D).** §D8.3's "never switches" read as if it overrode v3.0's
  rule that phrase 1 keeps every setting it was generated with; the design follows that rule (ux
  D481), and the session's level holds from the next phrase. Now in:
  [Part D §D8.3](versions/v3/master-spec.md#d83-vary-settings-and-the-session).

- **D520 (2026-11-09): the owner approves v3.3: Part D v1.2, its build plan and its design (gates
  A0 and D0).** Asked both at once, the owner: "Approve both". A0: Part D v1.2, D263–D288 and
  D511–D519, every one proposed with Part D now settled, and build plan v3.3 v4. D0: the design,
  ux D252–D264 refreshed by ux D477–D481, recorded by `ux-writer` as ux D482. I0, `documentalist`'s
  ingestion, is next. Now in: [Part D](versions/v3/master-spec.md#part-d--v33),
  [build plan v3.3, gates](versions/v3/build-plan-v3.3.md#gates).

- **D521 (2026-11-09): v3.2 is released as built, before the owner's hand and listening checks,
  which follow the `3.2.0` tag; closes O306.** The owner: "for now let's considere this version 3.2
  worthy of being tagged. the next version doesn't build up "much" on top of current one. if need
  be, we will have corrective measure decided later." This goes further than option B: the
  release gate runs its machine half; L1, L2, L3, H3, H7, H8, HG, the DR recordings and O267
  follow the tag as v3.2.x follow-ups, as v3.1's hand checks did (D397). R0 clears at the tag; a
  later 3.2.x fix re-records v3.3's chunk 1 corpus. Now in:
  [build plan v3.2, chunk 27](versions/v3/build-plan-v3.2.md#chunk-27--v32-release-gate),
  [Part C §C16](versions/v3/master-spec.md#c16-definition-of-done),
  [build plan v3.3, gate R0](versions/v3/build-plan-v3.3.md#gates).

- **D522 (2026-11-09): v3.2's contract stated as built, seven MAJOR bumps to CONTRACT 14.0.0 (a
  clarification).** The release-notes writer found C13 counting three bumps and item 49, C17 and
  chunk 27 naming 8.0.0's one sign-off; the owner signed each of 8.0.0 to 14.0.0 (release notes
  item 49). No ruling changes. Now in:
  [Part C §C13](versions/v3/master-spec.md#c13-what-v32-changes-in-v2-v30-and-v31-guarantees-and-atoms),
  [build plan v3.2, chunk 27](versions/v3/build-plan-v3.2.md#chunk-27--v32-release-gate).

- **D523 (2026-11-09): the owner gives his go; `3.2.0` is tagged on `main` now, its checks after
  the tag (D521, as D397 for v3.1); gate R0 of v3.3 clears.** After the release sync, the owner:
  "Accept all (Recommended)", "Keep all 23 at review (Recommended)", "Merge and tag
  (Recommended)", "Push main + tag". Now in:
  [build plan v3.2, chunk 27](versions/v3/build-plan-v3.2.md#chunk-27--v32-release-gate),
  [build plan v3.3, gates](versions/v3/build-plan-v3.3.md#gates).

- **D524 (2026-11-09): v3.2 is released as version 3.2.0; its working record is archived.** The
  tag `v3.2.0` is on `main` at f93e552d (D523). Moved verbatim to
  [archive/v3/](archive/v3/README.md#v32-release-archived-2026-11-09): D232–D251, D392, D396–D405
  and D407–D509 (v3.1's last closed decisions with them), the register's notes on the questions
  closed during v3.2, the three v3.2 drafts, the Jam grounding, and the former status snapshots
  of the spec index and the v3 README. Master spec Part C, the v3.2 build plan, its wave log and
  the Jam mode draft stay in place. Still live: D406, D521–D523, the checks after the tag and
  O267, O269 and O271 ([v3.2.x notes](versions/v3/README.md#v32x-notes-after-the-tag)). No
  question was decided.

- **D526 (2026-11-10): gate I0 is cleared and the owner confirms C1, the bumps and the vision's
  v3.3 line.** I0: `documentalist`'s ingestion 521359be (in `main` eb28071d). Shown the change
  set's parts A, B and C in plain words, the owner answered "approved" to all three: A1–A11 as
  written (A10 rides 15.0.0 at wave 1; A11 at wave 5, no bump, only if the level sits outside the
  controls), each applied at its building wave's sync (D517); one MAJOR bump per sync, 15.0.0 to
  19.0.0 from 14.1.0; part C as shown (VISION 0.12), its out-of-scope addition included, which part
  C offers as optional and recommends. Chunk 0 applies part C. Now in:
  [Part D §D12](versions/v3/master-spec.md#d12-contract-changes-needing-owner-confirmation),
  [build plan v3.3, gates](versions/v3/build-plan-v3.3.md#gates).

- **D527 (2026-11-10): A8's sentences on the Idle state apply with chunk 16, at wave 3's sync.**
  Found by wave 1's preflight: `module_generative_profile_selection` 1.5's Idle state holding the
  level and the request taking it from those settings, the "current settings" half of
  `rule_choosing_preset_sets_its_settings` and the level's routing in
  `module_profile_control_customization` describe code chunk 16 builds. They apply at wave 3's sync
  under 17.0.0 (any needing the level's control, at chunk 19's); the rest of A8 and 15.0's paragraph hold at the preset domain once chunk 11 merges
  and stay at wave 1. The confirmed wording is unchanged, only its wave moves (D517's rule in
  spirit), so the owner is told but need not re-confirm. Rejected: widening chunk 11 into the Idle
  state, which would pull session code into a wave-1 preset chunk. Now in:
  [build plan v3.3, C1](versions/v3/build-plan-v3.3.md#gates), chunks
  [11](versions/v3/build-plan-v3.3.md#chunk-11--presets-hold-the-level) and
  [16](versions/v3/build-plan-v3.3.md#chunk-16--the-level-in-a-session-and-in-pre-generation).

- **D528 (2026-11-10): a seventh reaches the app only after every writer and reader knows it; no
  interim refusal.** Wave 1 left the `ifk4.` encoder and the data-version-4 body writer accepting a
  carried seventh. Nothing in the app makes a seventh before chunk 19 (D286), so ordering suffices:
  chunks 15 and 17 retire those writers, and chunk 19 depends on 9, 10, 13, 14, 15 and 17. Chunk 13
  moves to wave 4 so 19 does not wait on it in-wave (13 → 19 → 23 would chain three). The ordering
  is load-bearing: after `Start with this phrase` (D519) phrase 2 can carry a seventh at Off. A
  carry-in's seventh is checked for shape, not key, like its triad; fit is judged by the triad
  (§D8.3), so no check is added. Rejected: a refusal in each writer, removed again within two
  waves. Now in: [build plan v3.3](versions/v3/build-plan-v3.3.md#chunk-15--replay-key-ifk5),
  chunks 13, 15, 17 and 19, and the [waves](versions/v3/build-plan-v3.3.md#waves).

- **D529 (2026-11-12): `rule_doodle_only_orders_candidates` is revised with Jam's own level
  (chunk 23), not with the chord tones (chunk 5).** Its change ("the chords' forms come from Jam's
  level, never from the doodle") is built by chunk 23; the atom says nothing about chord tones, so
  chunk 5 leaves its wording as it is. Found by wave 2's preflight; the change set's part E row
  and §D12's grouping of it under §D6.1 read accordingly. Now in:
  [build plan v3.3, chunk 23](versions/v3/build-plan-v3.3.md#chunk-23--jams-own-seventh-chords-level).

- **D530 (2026-11-12): a leap recovery owed across the join is never repaid on the tonic chord's
  seventh; it need not land on a chord tone.** Found by chunk 5: §D6.3's "settles on a note of the
  tonic triad" overstated v3.2, whose recovery could land on a figure's decorating note; requiring a
  triad tone would change phrases at Off. Excluding only the seventh keeps D267's v3.2 landings and
  leaves Off untouched. Built as chunk 5's addendum, mirrored by chunk 6. Now in:
  [Part D §D6.3](versions/v3/master-spec.md#d63-phrase-endings-and-the-join-read-the-triad-until-a-listening-check),
  [build plan v3.3, chunk 5](versions/v3/build-plan-v3.3.md#chunk-5--the-seventh-as-a-chord-tone-in-the-pitch-search).
