> **Archived 2026-10-16.** The v3.0 milestone closed: v3.0 is released as version 3.0.0 (tag
> `v3.0.0`, e288d98) and deployed. These are the notes on closed questions that the live register
> `specs/open-questions.md` still carried at draft v0.69, moved here verbatim: first the
> paragraph of its header on open and closed questions, then its section "v3.0 owner rulings
> (O163+)", the opening paragraph of its section "v3.0 wave 2 (O180+)", and its sections "v3.0
> wave 5 (O200+)", "v3.0 wave 6 (O210+)" and "v3.0 wave 10 (O220+)", in which no question was
> open. Every question named here is closed except those the live
> [open-questions.md](../../open-questions.md) still lists (O48, O49, O100–O102, O115, O116, O176,
> O180, O183, O190), which these notes only mention. Where each closed question's answer now lives
> is in [archive/v3/README.md](README.md). Relative links were written from `specs/`; their paths
> were repaired on 2026-10-16 so they resolve from this folder.

Open on 2026-10-14: O48 and O49 (later and governance), O100–O102 (v4 rhythm ratios and editor),
O115 and O116 (v3.x learning), O176 (style packs and the chord level, below), O180 (v3.0
wave 2: octave signs, later), O183 (v3.0 wave 2: the warm worker lost when pre-generation is
cancelled, opened with D298), O190 (v3.0 wave 4: a newer version's database whose read-only
reopening fails, opened with D300). The owner closed O201 (a session cut short by reloading or
closing the page: never saved, D309) and O200 (a kept session the app cannot read: deleted, with
an apology, D310) on 2026-10-14, the day they were opened. The owner closed O182 (what Regenerate does in the stale-phrase
prompt) on 2026-10-13, the day it was opened (D297's ruling note). D295 and D296 closed O181 the day it was opened. D228–D234 closed O10 (for v3.2), O103, O114, O126 and every
question the v3.1 and v3.2 drafts opened (O127–O157, O160–O162); D257 and D258 closed O163 and
O164 the day they were opened. None blocks the v3.0 build.

## v3.0 owner rulings (O163+)

Opened 2026-10-09 by `spec-writer` while writing the owner's rulings after the v3.0 wave-1 intent
preflight (D253–D256) into master spec v1.5. Both questions were answered by the owner the same
day: O163 (my instrument's transposition: where the sign sits, one control or two) by D257, and
O164 (the session-wide record's other facts) by D258. None is open here.

## v3.0 wave 2 (O180+)

Opened 2026-10-12 by `spec-writer` while writing the owner's bass clef ruling (D293) into master
spec Part A v1.9. O180–O189 are reserved for v3.0 wave 2. O181 (the shared height under phrases
already made) was closed the same day by D295 and D296: kept sessions belong to their instrument,
a range or transposition change erases them after a warning, a save that changes the shared
height re-checks the pre-generated phrases, and a review never cuts a phrase. Its full text is in
this register's history in git. O180 and O183 block no wave-2 chunk. O182 (opened 2026-10-13 with D297, ISS-011) was closed
the same day by the owner's ruling recorded in D297: Regenerate runs the usual Idle Regenerate
and the app stays at Idle with the new phrase. Its full text is in this register's history in
git.

## v3.0 wave 5 (O200+)

Opened 2026-10-14 by `spec-writer` while writing the wave-5 preflight's corrections and the
wave-5 sync into build plan v13 and v14. O200–O209 are reserved for v3.0 wave 5. Both questions
opened here are closed: O200 by [D310](../../decisions.md) (a kept session the app cannot read
correctly is deleted, with an apology; a read the device refuses deletes nothing; built in chunk
28) and O201 by [D309](../../decisions.md) (a session cut short by reloading or closing the page is
never saved, as §5.1 says; built in chunk 27). O202–O209 stay free.

## v3.0 wave 6 (O210+)

Opened 2026-10-15 by `spec-writer` while writing the wave-6 preflight's corrections into build
plan v16 (D312–D315). O210–O219 are reserved for v3.0 wave 6. O210 is closed: `ux-writer`
answered it in ux D308 (`Export played notes` is disabled, with its reason, whenever its file would
hold no note), recorded in [D319](../../decisions.md). O211 is closed: the owner kept the 38 ms
threshold, a length rule only, accepting the few stray notes it leaves in the lane and the
default export ([D322](../../decisions.md)); hand check H5 counts as passed on his word
([D340](../../decisions.md)), its export half following the tag ([D342](../../decisions.md)). O212–O219 stay free.

## v3.0 wave 10 (O220+)

Opened 2026-10-16 by `spec-writer` while writing the owner's hand-check ruling (D340) into build
plan v28. O220–O229 are reserved for v3.0 wave 10. O220 is closed: H5's played-notes-export half
was not checked and follows the tag as a v3.0.x note beside H8 ([D342](../../decisions.md)).
O221–O229 stay free.
