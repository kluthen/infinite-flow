# Open Questions

Status: draft v0.53

Only questions that are truly open appear here. IDs are stable. Each question's full text lives in
exactly one place: here, or in the document named. When a question is resolved it leaves this
register and its answer goes to the [decisions log](decisions.md). Resolved questions from earlier
work are recorded in the archived logs:
[D1–D46](archive/v1/decisions-D1-D46.md),
[D47–D71](archive/2026-09-25-personas-and-vision/decisions-D47-D71.md),
[D72–D108](archive/v2/decisions-D72-D108.md) and
[D109–D207](archive/v2/decisions-D109-D207.md). The notes this register kept on the questions
closed during v2 (O24, O50–O99 and O104–O106, apart from O86) are archived verbatim in
[archive/v2/open-questions-history.md](archive/v2/open-questions-history.md), and the
[v2 archive index](archive/v2/README.md) says where each answer now lives.

Open on 2026-10-12: O48 and O49 (later and governance), O100–O102 (v4 rhythm ratios and editor),
O115 and O116 (v3.x learning), and O165–O173 and O175 (v3.3 richer chords, below). D228–D234 closed O10 (for v3.2), O103, O114, O126 and every
question the v3.1 and v3.2 drafts opened (O127–O157, O160–O162); D257 and D258 closed O163 and
O164 the day they were opened. None blocks the v3.0 build.

Opened on 2026-10-12 with v3.3 (D261): O165–O175, richer chords. D262 closed O174 the same day.
The rest block v3.3's design, nothing under way.

## Later and governance (O47–O49)

Registered from the v2 highlights proposal and
[prerequisites §5](versions/prerequisites.md#5-questions-registered-in-open-questions) on
2026-09-25.

- **O48 - Import normalization** _(v4 file seed)_: for non-4/4 meters, tuplets, pickups and polyphony: reject, normalize, or lift the policy?
- **O49 - ATD atom lifecycle** _(v2 onward)_: amend the first-release atoms in place, or scope them to v1 and add v2 atoms beside them?

## v3 rhythm candidates (O100+)

Since D211, the rhythm ratios and the rhythm editor, with the Custom note density, are v4: O100,
O101 and O102 are v4 questions. The rhythm lock is v3.2, designed with Jam; O103 was closed by D232. The
section keeps its name so its links hold.

Opened 2026-10-03 by `spec-writer` while recording the owner's v3 candidates in the rhythm
category (D175): rhythm ratios, the rhythm editor and the rhythm lock, all reached through a new
note-density value, Custom. They are candidates, not committed scope, so none of these blocks
anything planned. Lexicon terms: [note density](../docs/music/lexicon.md#note-density),
[rhythmic variety](../docs/music/lexicon.md#rhythmic-variety),
[syncopation](../docs/music/lexicon.md#syncopation-1),
[silence density](../docs/music/lexicon.md#silence-density),
[unsupported rhythm combination](../docs/music/lexicon.md#unsupported-rhythm-combination).

- **O100 - Custom and the other rhythm settings** _(D175; v4 since D211)_: under Custom, do
  rhythmic variety, syncopation and silence density still apply on top of the custom rhythm,
  apply only to the ratios, or step aside? Which combinations does the rhythm grammar block under
  Custom, since the blocked list is keyed today by a note-density value? And does the narrow-window
  rule (no `Sixteenth` below the tablet-landscape width, D146) cap the sixteenth-note ratio there?
- **O101 - What the rhythm ratios hold, and what a mutation does to them** _(D175, D176; v4
  since D211)_: which note values get a ratio (whole, half, quarter, eighth and sixteenth notes;
  dotted values; rests, or are rests silence density's job), and how finely a ratio is set? What
  is one step of a mutation on the ratios, by analogy with "one grade" (D103)? And can a mutation
  move note density out of Custom, back to a fixed value (D175 only forbids moving into it)?
- **O102 - The rhythm editor's source and limits** _(D175; v4 since D211)_: "one of the bars" of
  which phrase, the one on screen at Idle or one in the last session's review? Is a rhythm one
  bar long, reused for all four bars, or four bars long? Must a rhythm entered by hand or copied
  pass the rhythm grammar's feasibility rules (every measure keeps a note sounding on beat 1 or
  3, no fully silent measure, no rest longer than half a measure), and if it does not, is it
  refused, adjusted, or allowed as the player's own choice?

## v3 Jam (O112+)

Opened 2026-10-07 while recording the owner's Jam insight (D209; recorded in
[v3](versions/v3/README.md#jam-growing-the-players-doodle)). The core is v3 scope; the questions
below are about it and its three candidates, so none of them blocks anything planned. Proposals
are strawmen, not decisions. Only the v3.x learning questions remain; the Jam ones were settled
by D234.

- **O115 - Which signals count as approval** _(D209; v3.x, likely to move or go, D211)_: which positive signals are
  read (a fitting departure as defined by the chord-fit check — dropped by D211, so this signal would
  need that definition back — a repeated fragment, a return to
  the doodle, a favorite), over what span, and what each one changes in generation. Proposed:
  positive signals only, favorites weighted most, each change small and reversible.
- **O116 - Taste, difficulty and visibility** _(D209, D101; v3.x, likely to move or go, D211)_: how misses, late
  notes and silence adjust difficulty without ever counting against taste; whether this is where
  the performance-linked tempo deferred by D101 lands; how the player turns learning on, sees what
  it leans toward, and resets it; whether what it learned is kept across sessions (local
  persistence, opt-in like played notes). Proposed: off by default, one visible switch, a reset,
  and nothing kept across sessions without the player's opt-in.

## v3.0 owner rulings (O163+)

Opened 2026-10-09 by `spec-writer` while writing the owner's rulings after the v3.0 wave-1 intent
preflight (D253–D256) into master spec v1.5. Both questions were answered by the owner the same
day: O163 (my instrument's transposition: where the sign sits, one control or two) by D257, and
O164 (the session-wide record's other facts) by D258. None is open here.

## v3.3 richer chords (O165+)

Opened 2026-10-12 while recording the owner's request for richer chords as v3.3 (D261; recorded
in [v3](versions/v3/README.md#v33--richer-chords-optional)). Settled by D261: richer chords are
opt-in, the default stays root-position diatonic triads, the player chooses the allowed chord
families in the app, and research comes before design. By D262 that research is a separate,
docs-only item, running on branch `v3.3-chord-research`. Proposals below are strawmen, not
decisions. Most of them wait for the research. Lexicon terms:
[triad](../docs/music/lexicon.md#triad), [seventh chord](../docs/music/lexicon.md#seventh-chord),
[chord tone](../docs/music/lexicon.md#chord-tone), [arpeggio](../docs/music/lexicon.md#arpeggio),
[chord symbol](../docs/music/lexicon.md#chord-symbol). Terms the lexicon does not have yet
(extended chord, chord extension, sixth chord, suspended chord, half-diminished, chord inversion,
voicing) are research outputs ([v3](versions/v3/README.md#research-first)); they are glossed in
place below.

- **O165 - The flag set and its defaults** _(D261)_: which chord families get a flag: the seventh
  chords as one flag or one per quality (major seventh, minor seventh, dominant seventh,
  half-diminished, which is a diminished triad plus a seventh, as B–D–F–A); sixth chords (a triad
  plus the sixth above the root, as C6: C–E–G–A) and suspended chords (the third replaced by the
  second or the fourth, as Csus4: C–F–G); extended chords (ninths and beyond). Is a flag a plain
  allowed/not allowed switch, or a level like the embellishment figures (Off to Strongly favored,
  a preference and never a quota)? Can triads ever be switched off? Proposed: one "Seventh
  chords" flag for v3.3, off by default; triads always allowed; any other family gets its own flag
  once the research supports it. Where the flags sit on screen is `ux-writer`'s call.
- **O166 - Diatonic only?** _(D261)_: is every richer chord still built by stacking thirds from the
  selected collection (degrees d, d+2, d+4, d+6), so that its quality comes from the key and mode
  as a triad's does? Proposed: yes for v3.3. Non-diatonic chords stay out: altered dominants and
  substitutions (D11, D12), and borrowed or secondary chords. Consequence: Blues would be only
  partly served. In C Mixolydian, C7 is diatonic but F7 (it needs E♭) is not, so the twelve-bar
  I7–IV7–V7 is out of reach.
- **O167 - The three-note arpeggio run cap** _(D261)_: a recognized run is exactly three chord
  tones of one chord (`rule_leapiness_arpeggio_run_limits`; `wide_chain_too_long` in
  `src/domain/pitch/pitch-motion.ts`), so a full four-note seventh arpeggio is rejected. The
  options are: keep the cap at three, so a seventh chord shows at most three of its notes in one
  run; or allow four only under a four-note chord. The second changes a contract rule, so the
  owner would be asked to approve it explicitly. The Arpeggio chaos control, which picks the next
  chord tone, meets the same question. Proposed: keep three unless the research shows the
  four-note arpeggio is central to the styles served, then ask the owner.
- **O168 - Figures and what a chord tone is** _(D261)_: every figure resolves onto a chord tone
  (`rule_figures_resolve_onto_chord_tones`), the pitch search tries chord tones first, and the
  tension figures land on chord tones. Is the seventh a chord tone for all of these, and is an
  extension (a ninth, say)? Does that depend on the style? In classical practice a seventh is a
  dissonance that resolves down by step; in jazz it is a stable note. The same question reaches
  the open phrase ending (may a phrase end on the seventh, as F over G7?) and the join (does the
  next phrase's tonic-chord landing include a seventh?); see
  [v3](versions/v3/README.md#what-a-fourth-chord-note-meets). Proposed: the research answers per
  style. Then decide whether the seventh counts as a chord tone everywhere, or a figure may not
  resolve onto it.
- **O169 - How the harmony planner picks a richer chord** _(D261)_: with sevenths allowed, does
  every chord of the phrase take its seventh, or only some? If some, are they chosen by degree or
  role (the dominant first, say), by a seeded preference that is never a quota, or by tension?
  The planner policy says Jazz and Neutral expose the same harmony domain for the same harmony
  controls; the flags would become harmony controls of their own. A fourth chord tone also widens
  the pitch search, and generation must still keep up at the fastest tempo. Proposed: a seeded
  preference, in line with D210's "preferences, not quotas"; the spec sets a generation-time check.
- **O170 - What the player sees and hears** _(D261)_: covers chord symbols, the backing and the
  exports.
  - Chord symbols: today only major, minor and diminished. Which spelling for the new ones, for
    example Bm7♭5 or Bø7? They are transposed to written pitch, as today. The spoken score
    description reads each symbol's suffix as words, so it needs the new ones too.
  - The backing: its block chords play a close-position triad at or below E4
    (`req_session_backing_track`, STABLE). Does it play the seventh too, in what voicing (which
    notes it plays, in which octave) and register?
  - The exports: MusicXML writes chord symbols through a fixed kind table.

  Proposed: the backing plays the full chord the planner chose. That changes a STABLE guarantee,
  so the owner confirms the wording.

- **O171 - Presets, saved settings, Vary settings and the replay key** _(D261)_:
  - Presets: do the built-in Jazz, Bebop and Modal (Dorian) presets allow sevenths? v3.1 promises
    that Neutral and Jazz at their defaults sound exactly as before. Do Blues and Bossa become
    built-in presets? They also lack swing and other things.
  - Saved settings: player presets and saved settings store the flags.
  - Vary settings: may it move the flags, and in which allowed group?
  - The replay key: it carries the carry-in, whose final chord is checked as a triad, so a phrase
    with richer chords needs a key version after v3.2's `ifk4.` (D251).
  - Sessions: a chord flag changed mid-session applies at the next phrase boundary, like any
    setting. A carried final chord the new flags no longer allow falls under
    `rule_harmony_change_drops_unfit_harmonic_carry_in` (STABLE), which drops it.

  Proposed: no built-in changes by default, so the v3.1 promise holds. A built-in that allows
  sevenths would be a new preset or an owner's explicit change.

- **O172 - Jam and the key and mode suggestion** _(D261)_: the suggestion scores the doodle's own
  notes against the 84 key and mode pairs, not the generated chords. Proposed: unchanged, to be
  confirmed by the research and the code. A Jam's phrases follow the same chord flags as any
  session. The doodle's preferences meet the chord-tone question (O168).
- **O173 - Declared intent** _(D261)_: which atoms change, and which STABLE guarantees with them.
  Candidates:
  - `module_harmony_candidate_domain` (triads only);
  - `rule_leapiness_arpeggio_run_limits`;
  - `rule_figures_resolve_onto_chord_tones`;
  - `entity_phrase_carry_in` (tonic-triad tones);
  - `rule_open_phrase_ending` (STABLE) and `rule_join_tense_note_resolution` (chord-tone endings
    and landings);
  - `module_phrase_replay_key` and `module_notation_display_convention` (key version, chord
    symbols);
  - `req_session_backing_track` (STABLE);
  - the vision's scope, which ends at v3.2;
  - the contract version.

  Any STABLE change needs the owner's explicit confirmation of its wording, as for v3.1 and v3.2
  (D246). The owner approved updating the vision now (D262); the rest waits for v3.3's master
  spec.

- **O175 - Chord flags and a later style-pack layer** _(D261; D259 on branch
  `v4-accompaniment-research`, not merged)_: the breadth review on that branch would build each
  missing device once, off by default, and let a style pack, as declarative data, switch devices
  on and set preset defaults; its replay key would carry a pack id and version. Should v3.3's
  chord flags be shaped so that such a pack can later set them as data? That means one named
  capability per chord family, stored by value in saved settings, presets and the replay key, and
  no rule tied to a preset's name. And which wins when a player's flag and a pack disagree?
  Proposed: yes to the shape, as v3.1's figure levels are carried by value in `ifk3.`; the
  precedence is decided with style packs, not now.
