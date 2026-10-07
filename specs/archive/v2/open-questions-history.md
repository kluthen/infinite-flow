> **Archived 2026-10-07.** The v2 milestone closed: the v2.0 release gate (build plan chunk 21)
> passed, and v2.0 is released as version 2.0.0, its tag pending the owner's approval. These are
> the notes on closed questions that the live register `specs/open-questions.md` still carried at
> draft v0.33, moved here verbatim: first the register's header paragraph, then the history
> paragraph of its section "Registered from the v2 proposal and the prerequisites analysis", then
> its v2 sections, in which no question was open. Every question named here is closed except those
> the live [open-questions.md](../../open-questions.md) still lists (O47–O49, O86, O100–O103,
> O107–O111), which these notes only mention. Where each closed question's answer now lives is in
> [archive/v2/README.md](README.md). Relative links were written from `specs/`; their paths were
> repaired on 2026-10-07 so they resolve from this folder.

O24 was resolved 2026-09-27 (D108): the check is kept, ships in v2.3, and fires only on measures
where the player goes off-script. Six v2 questions (O78–O83) were opened the same day by the
controller-connection answers (D111–D118) and resolved later that day (D119–D124). O84 was opened
while recording them, and resolved 2026-09-30 (D169, from ux D137): a fresh phrase generated at
the session end is the next phrase 1. Its start from the Review was replaced the same day by the
owner (D170): no session starts while the Review shows; the player leaves it first. O85, opened while recording D125, was resolved the
same day (D126). O86 was opened 2026-09-28 by the export-by-content change (D129), and deferred
to v3 the same day, when favorites moved there (D130). O87 and O88 were opened 2026-09-28 while
recording the screen wake lock (D131) and the count-in that always clicks (D132). O88 was
resolved the same day (D134): the count-in plays at the click volume, which never reaches silence.
O87 was resolved 2026-10-05 (D187): a wake lock the browser drops mid-session is asked for again,
silently.
O89 was opened 2026-09-28 while recording the landscape lock and the portrait rule (D137), and
resolved the same day (D138): a session ends whenever the staff can no longer be shown, whether or
not the device was turned. O90 was opened while recording D138, and resolved the same day (D139):
no session starts while the staff is not shown. O91 and O92 were opened 2026-09-28 while
recording the changes to v1 at Idle (D144–D146), and resolved the same day (D147–D150): the
density follows the window's width for the next phrase generated, and a session's density only
steps down (O91); a new phrase is generated when the notice clears (O92). O93 and O94 were opened
while recording them. O94 was resolved the same day (D151): when the notice clears under
unsupported rhythm settings, no phrase is shown and generation stays blocked until the settings
change. O95 was opened while recording what clears the "these notes need more room" notice
(D152), and resolved the same day (D153): a change that lands on unsupported rhythm settings while
that notice shows gives way to no phrase, as D151 does. O96 was opened 2026-09-29 while recording
that a wider window during a round of retries starts nothing (D154), and resolved the same day
(D155): each attempt of a round takes its note density from the window when it is generated, and
a crossing that makes the rhythm combination disallowed stops the round. O97–O99 were opened
2026-09-29 while correcting the gaps `documentalist` found in the v2 master spec (D157–D163). O97
was answered by the owner the same day (D167): the carry-over between phrases is kept, and a
session's last phrase may end with a leap recovery or a tense note's resolution still owed.
On 2026-10-03 the owner answered O77 (D176), O93 (D177) and O98 (D178) with their proposals, or
for O77 with a cadence of 2 to 4 phrases and the flag starting off, and O99 with its alternative
(D179): adaptive tempo pauses while the controller is away. The same day, O100–O103 were opened
by the v3 rhythm candidates (D175), and O104 by moving the real-hardware checks to v2.4 (D173);
O104 was answered the same day (D180). On 2026-10-05 the owner answered O57 (D185): the backing
stays as built. O105 was opened the same day by compacting v2.1, v2.2 and v2.4 into one v2.0
release (D183). On 2026-10-06 the owner answered O71 (D191) and O105 (D193) with their proposals:
USB is the tested path for v2.0 and Bluetooth MIDI is best-effort; the real-program export checks
do not block the v2.0 tag. The same day, the machine measurements of the v2.0 gate answered O68
(D194): engraving never comes near the look-ahead window; and O69 was closed as measured (D195):
the cold worst case is 277 ms, narrowly over its 250 ms goal, which is not a gate. O106 was opened
while recording D194: which moment the playhead's 20 ms check (item 6) is measured to. The owner
answered it the same day with its proposal (D197): the moment the playhead's measure changes, so
item 6 is met. O107–O111 were opened 2026-10-07 by the owner's v3 candidate of pre-generating up
to 4 look-ahead phrases at Idle (D206).

### Registered from the v2 proposal and the prerequisites analysis (2026-09-25)

The original proposal is archived: [v2 highlights proposal](highlights-proposal.md) and
[prerequisites §5](../../versions/prerequisites.md#5-questions-registered-in-open-questions). O32 and
O33 were resolved on 2026-09-26 (D73, D72). O10 was resolved 2026-09-27 (D83). O36, O40 and O43
were resolved 2026-09-27 (D94, D95, D96). O40 stays resolved, but by ux D71's two alternating
staff systems, which supersede D95's two display modes (D164).

## v2 spec questions (O50+)

Raised on 2026-09-26 while drafting the v2 topic documents, since consolidated into
[versions/v2/master-spec.md §12](../../versions/v2/master-spec.md#12-open-questions-carried-forward)
(plain-language form, no IDs) and the archived
[questions-for-user.md](questions-for-user.md) (full working history). O52 was
resolved 2026-09-27 (D97). O24 was resolved 2026-09-27 (D108). O77 was resolved 2026-10-03
(D176). O57 was resolved 2026-10-05 (D185): the backing's voicing, register, attack pattern and
timbre stay as built. O71 was resolved 2026-10-06 (D191): USB is the tested path for v2.0, and
Bluetooth MIDI is best-effort. O68 was resolved the same day (D194): the longest main-thread block
while engraving is about 50 ms, against the 200 ms window. O69 was closed the same day as measured
(D195): the cold worst case is 277 ms in the page, over the 250 ms goal, which is not a gate, and
the look-ahead deadline holds. No question of this section is open.

## v2 controller connection and session start (O78+)

O78–O83 were opened 2026-09-27 by the product owner's answers to ux Q23 and ux Q24 (D111–D118)
and resolved the same day (D119–D124). O85 was resolved the same day too (D126). O84, the last
question of this section, was resolved 2026-09-30 (D169): `ux-writer` settled it as ux D137 under
the owner's delegation of unit 6 (ux D135); the owner replaced its start from the Review the same
day (D170, ux D143). No question of this section is open.

## v2 session behaviour (O87+)

Opened 2026-09-28 by `spec-writer` while recording owner decisions from the `ux-writer` unit-2
session core-loop review, and later that day from `ux-writer`'s play-session decisions. O88 was
resolved the same day (D134), O89 too (D138), and O90 too (D139). O87 was resolved 2026-10-05
(D187): the app asks again, silently, for a wake lock the browser drops while the session runs and
the page is visible. No question of this section is open.

## v2 changes to v1 at Idle (O91+)

Opened 2026-09-28 by `spec-writer` while recording the owner's decisions from `ux-writer` (ux
D107–D109, spec D144–D146). O91 and O92 were resolved the same day (ux D110 and ux D112, spec
D147–D150): O91's defaults (a) and (b) were replaced by D147 (the density follows the window's
width when each phrase is generated, at Idle and in a session) and D148 (a session's density only
steps down); (c) was settled with its proposal (D148), and so was (d) (D150). O92 was settled
against its proposal (D149): the notice always clears to a new phrase. O93 and O94 were opened
while recording those answers. O94 was settled with its proposal the same day (ux D114, spec
D151). O95 was opened while recording ux D116 (spec D152), and settled the same day against its
proposal, with the alternative it named (ux D117, spec D153). O96 was opened 2026-09-29 while
recording ux D118 (spec D154), and settled the same day with its proposal by `ux-writer` under
the owner's delegation of minor calls (ux D120 and ux D119, spec D155). O93 was resolved
2026-10-03 with its proposal (D177). No question of this section is open.

## v2 gaps from the atom ingestion (O97+)

Opened 2026-09-29 by `spec-writer` while correcting the gaps `documentalist` found when it drew
ATD atoms from master spec v1.18 (D157–D163). They are product decisions, left for the owner. O97
was answered by the owner on 2026-09-29 with its proposal (D167). On 2026-10-03 the owner
answered O98 with its proposal (D178) and O99 with its alternative (D179). No question of this
section is open.

## v2.4 real-hardware checks (O104)

O104 was opened 2026-10-03 while recording D173 and answered by the owner the same day with its
proposal (D180): the v2.1 gate's checks in a real DAW and on the reference machine move to v2.4
too. No question of this section is open. Since 2026-10-05 the real-hardware checks are part of
the single v2.0 gate (D183).

## v2.0 release gate (O105+)

O105 was opened 2026-10-05 by `spec-writer` while recording the compaction of v2.1, v2.2 and v2.4
into one v2.0 release (D183). It was answered by the owner on 2026-10-06 with its proposal (D193):
the real-program export checks do not block the v2.0 tag, and are validated later as a v2.0.x
hand-check note. O106 was opened 2026-10-06 by `spec-writer` while recording the machine
measurements (D194); build plan chunk 16 had left it for the owner since 2026-10-01 without a
register entry. The owner answered it the same day with its proposal (D197): item 6's 20 ms is
measured to the moment the playhead band's measure changes, so item 6 is met. No question of this
section is open.
