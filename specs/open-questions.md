# Open Questions

Status: draft v0.75

Only questions that are truly open appear here. IDs are stable. Each question's full text lives in
exactly one place: here, or in the document named. When a question is resolved it leaves this
register and its answer goes to the [decisions log](decisions.md). Resolved questions from earlier
work are recorded in the archived logs:
[D1–D46](archive/v1/decisions-D1-D46.md),
[D47–D71](archive/2026-09-25-personas-and-vision/decisions-D47-D71.md),
[D72–D108](archive/v2/decisions-D72-D108.md),
[D109–D207](archive/v2/decisions-D109-D207.md),
[D208–D227](archive/v3/decisions-D208-D227.md),
[D252–D258](archive/v3/decisions-D252-D258.md) and
[D290–D343](archive/v3/decisions-D290-D343.md). The notes this register kept on the questions
closed during v2 (O24, O50–O99 and O104–O106, apart from O86) are archived verbatim in
[archive/v2/open-questions-history.md](archive/v2/open-questions-history.md), and those on the
questions closed during v3.0 (O163, O164, O181, O182, O200, O201, O210, O211 and O220) in
[archive/v3/open-questions-history.md](archive/v3/open-questions-history.md); each archive's
README says where each answer now lives.

Open on 2026-10-19: O48 and O49 (later and governance), O100–O102 (v4 rhythm ratios and editor),
O115 and O116 (v3.x learning), O176 (style packs and the chord level), O180 (octave signs, later),
O183 (the warm worker lost when pre-generation is cancelled), O190 (a newer version's database
whose read-only reopening fails), O230 (a stale replay-key wording in a STABLE atom, opened with
D351; numbered O177 on branch `plan-migration`, D352). D359 closed O231 (v3.1's entry-chunk
budget, opened with D358) the same day. New questions take IDs from **O232**; the IDs
reserved for v3.0's waves and left unused stay unused, and O177 stays unused.

Opened on 2026-10-12 with v3.3 (D261): O165–O175, richer chords. D262 closed O174 the same day.
D264–D273 settled the rest the same day in master spec Part D, as proposed for the owner's
approval with Part D; O175's precedence question goes on as O176.

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

## v3.3 richer chords (O165+)

Opened 2026-10-12 while recording the owner's request for richer chords as v3.3 (D261; recorded
in [v3](versions/v3/README.md#v33--richer-chords-optional)). D262 closed O174 (the research is a
separate item). The chord research ([docs/music/chord-research.md](../docs/music/chord-research.md))
recommended an answer to each other question, and on 2026-10-12 spec-writer adopted them, settling
the research's open points itself, in [master spec Part D](versions/v3/master-spec.md#part-d--v33),
**proposed for the owner's approval with Part D**: O165 by D264 (one Seventh chords level, Off by
default), O166 by D265 (diatonic only), O167 by D266 (runs stay three notes), O168 by D267 (the
seventh a chord tone; endings read the triad until a listening check), O169 by D268 (a seeded
preference per event; the cost guard), O170 by D269 (symbols, exports, the backing plays the
seventh), O171 by D270 (presets, saved settings, Vary settings never moves the level, `ifk5.`),
O172 by D271 (Jam and the suggestion unchanged), O173 by D272 (the STABLE wording changes listed
for the owner) and O175's shape by D273. Their full text is in this register's history in git;
the answers are in the [decisions log](decisions.md). If the owner amends Part D, the decision
amended is revised, and no question comes back unless the owner reopens it.

- **O176 - Style packs and the chord level: which wins** _(D273, from O175; with style packs, no
  version)_: when a later style pack sets the `seventh-chords` capability as data and the player's
  Seventh chords level says otherwise, which applies, and how the player sees it? Not needed
  before style packs (D259, merged from branch `v4-accompaniment-research` on 2026-10-19).
  Proposed: decided with style packs.

- **O230 - A stale replay-key wording in `module_tension_arc_cycle`** _(D351; from the v3.3 build
  plan's owner questions; outside v3.3)_: the STABLE atom `module_tension_arc_cycle` (outside the
  contract surface) still says a session phrase's replay key keeps "the unchanged `ifk1.` format",
  which v3.0's `ifk2.` already breaks and neither earlier intent change set lists. The plan had
  proposed correcting it at v3.0 chunk 18's capture; that chunk is merged and the wording stands.
  Open: who corrects it, and when? Proposed: a wording-only revision (no guarantee changes) that
  names no key version, confirmed by the owner and applied by `documentalist` at the next intent
  pass that touches it, I0 at the latest; v3.3's
  [chunk 15](versions/v3/build-plan-v3.3.md#chunk-15--replay-key-ifk5) must not repeat it for
  `ifk5.`. It blocks no chunk.

## v3.0 wave 2 (O180+)

Opened 2026-10-12 by `spec-writer` during the v3.0 build (wave 2). O180 and O183 are still open;
the notes on the questions this section closed are in the
[v3.0 archive](archive/v3/open-questions-history.md).

- **O180 - Octave signs and octave clefs for my instrument** _(D293; later version, should the
  need arise)_: the owner, 2026-10-12: "keep in mind 8va/8vb/15ma etc for a later version should
  the need arise". An octave sign is a dashed line over or under notes, marked 8va (play an
  octave higher than written), 8vb (an octave lower) or 15ma (two octaves higher), which saves
  ledger lines; an octave clef is a clef with a small 8 above or below it, meaning the same.
  Background: automatic ottava lines inside a phrase are advised against for now. They start and
  stop in the middle of a phrase and are hard to sight-read at tempo, and they touch the staff
  height check, the rolling session display and the MusicXML export (`<octave-shift>`). The
  existing octave transposition already covers instruments conventionally written an octave from
  their sound (guitar, piccolo), and the bass clef (D293) covers low instruments. Open: is a need
  shown (a range that neither clef nor a transposition serves), and if so, a per-instrument
  octave clef, a fixed octave sign over a whole phrase, or ottava lines placed automatically?
  Proposed: not before a player's range shows the need; an octave clef on my instrument first,
  since it moves nothing within a phrase.
- **O183 - A player request that cancels pre-generation loses the warm worker** _(D298, master
  spec §8; opened 2026-10-13 at the wave-2 intent sync)_: a player request at Idle cancels the
  background attempt in flight the way a dropped session attempt is cancelled, by replacing the
  generation worker (D290). The rhythm-domain memo lives in the worker, so it goes with it: the
  domain phrase 1 and the prewarm built is lost, and the fresh worker is prewarmed with the
  cancelled attempt's settings only. Pre-generation runs up to four attempts right after each
  phrase 1 appears, so a player who presses Regenerate again soon after will often land on one.
  In v2 that Regenerate, with unchanged settings, was a memo hit; in v3.0 it can pay the worker
  respawn (median 49 ms in Chromium on the reference machine) plus a cold rhythm-domain build
  (under 1 s in Chromium there, more on the tablet). That is not "waiting behind" the background
  attempt, which is gone, but it is a wait the background work causes, against §8's "the player
  never waits behind it". Not measured yet: no M or H check covers a player request during
  pre-generation. Open: is this cost acceptable, and if not, should the background attempt be
  stopped without losing the memo (for example, let it finish when its settings match the
  player's, or have the worker drop it between steps rather than be replaced)? Proposed: measure
  it first (Regenerate twice in quick succession, pre-generation on and off, on the reference
  machine and the tablet), then put the figure to the owner. It blocks no wave-2 chunk; the code
  as built matches §8 and D290.

## v3.0 wave 4 (O190+)

Opened 2026-10-14 by `spec-writer` while writing the wave-4 preflight's corrections into build
plan v11 (D300). O190–O199 are reserved for v3.0 wave 4. O190 blocks no wave-4 chunk.
It was still open at the v3.0 release (D348) and is carried forward: it matters from the first
version that upgrades the saved data.

- **O190 - A newer version's database whose read-only reopening fails** _(D300; saved-data design,
  Load; `module_on_device_database`)_: the saved-data design (`flows/saved-data/handoff.md`,
  "Newer data with a failed read at load") says a read can fail and still make a newer version
  known, "for example when the read-only reopening above then fails": the visit starts from the
  defaults and is an outdated tab from its first frame, with no deletion anywhere and the
  outdated-tab notice in its defaults wording. Chunk 4's port does otherwise. When opening finds
  the database upgraded by a newer version, `openDatabase` (`src/storage/database.ts`) reopens it
  without a version for reading; if that reopening fails, the error leaves `openDatabase` and
  `openStoragePort` gives an `unavailable` port, so the save policy starts `off-unreadable`: the
  unusable-data notice shows and `Delete everything` stays offered, where the design offers no
  deletion. `module_on_device_database` (REVIEW) says a database a newer app wrote gives an
  outdated port, which fits the design better than the code. It cannot happen in v3.0 itself,
  since only a later version with data version 2 can upgrade the database. Open: should the port
  be outdated whenever opening met a newer version, its reads then reopening on demand, or is the
  unusable-data notice acceptable there? Proposed: make the port outdated (a small change in
  `src/storage/database.ts` and `src/storage/storage-port.ts`, with a unit test), in a chunk of the
  wave driver's choosing before the v3.0 gate; chunk 8 needs nothing more, since it shows the
  notice from the saving state and the load outcome.

## v3.1 build (O231+)

Opened 2026-10-19 by `spec-writer` when master spec B12 was checked against v3.0's code (D358).

- O231 (v3.1's entry-chunk budget) was closed by [D359](decisions.md) on 2026-10-19: the budget is
  300 KiB.

- O232 (does a figure level reach the tense note a joined phrase may end on?) was closed by
  [D368](decisions.md) on 2026-10-19: it follows the levels like a free scale note.
