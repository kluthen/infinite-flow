> **Archived 2026-11-22.** Closed range for the v3.3 milestone: v3.3 is released as version
> 3.3.0 (tag `v3.3.0`, b2a0e3fa). These decisions are v3.3's direction, the chord research as its
> own item, master spec Part D's answers to O165–O175 and its planning answers, all approved with
> Part D (D520). D289 was never issued. D259–D260 (style packs and the sound ban) stay live.
> Archived IDs keep their meaning and may be cited anywhere; each decision's content is now stated
> as settled fact in a live document, or is history, as the "where it now lives" table in
> [archive/v3/README.md](README.md#v33-release-archived-2026-11-22) records. Relative links were
> written from `specs/`; their paths were repaired on 2026-11-22 so they resolve from this folder.

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
     ([archived](../v1/decisions-D1-D46.md)), v3.3, once built, partially revisits D11
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
  [v3](../../versions/v3/README.md#v33--richer-chords-optional) and the
  [roadmap](../../roadmap.md#2-v3--player-material-and-my-instrument).

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

  Recorded in [v3](../../versions/v3/README.md#research-first) and the
  [register](../../open-questions.md#v33-richer-chords-o165).

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
  Part D).** Planning answer for the [v3.3 build plan](../../versions/v3/build-plan-v3.3.md). The three STABLE wordings of Part D §D12
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
  [v3.3 build plan](../../versions/v3/build-plan-v3.3.md) (ux D264). D277 spelled the top level
  `strongly-favored`; v3.1's figure-level ids, the same four-step shape stored the same way, are
  camelCase (`off`, `asToday`, `favored`, `stronglyFavored`, v3.1 build plan §2). The level values
  are therefore `off`, `sometimes`, `favored` and `stronglyFavored`, in the request, the replay key
  and every saved record. The family key stays `seventh-chords`: a capability name fixed by D273
  (the v4 atlas id), as `my-instrument` is a fixed id (D254). The interface's labels are unchanged:
  `off` Off, `sometimes` Sometimes, `favored` Often, `stronglyFavored` Mostly (ux D254, D264).
