> **Archived 2026-11-22.** The v3.3 milestone closed: v3.3 is released as version 3.3.0 (tag
> `v3.3.0`, b2a0e3fa). This file holds, moved verbatim from the live register
> `specs/open-questions.md`: the two header paragraphs on open and closed questions as they stood at
> draft v0.91; the introduction of its section "v3.3 richer chords (O165+)", on O165–O175 and O310,
> all closed; O310's note, as it stood in that section at draft v0.90, before D539 closed it (the
> register dropped it at v0.91; recovered from git, commit 76abd651's parent); and the introduction
> of its section "v3.4 structural review (O234+)", whose last sentence records O235's close by
> D536. Both sections stay live in the register, with their open questions (O176 and O230; O234
> and O236–O238). Every question named here is closed except those the live
> [open-questions.md](../../open-questions.md) still lists, which these notes only mention. Where
> each closed question's answer now lives is in
> [archive/v3/README.md](README.md#where-each-closed-v33-question-now-lives). Relative links were
> written from `specs/`; their paths were repaired on 2026-11-22 so they resolve from this folder.

Open on 2026-11-09: O48 and O49 (later and governance), O100–O102 (v4 rhythm ratios and editor),
O115 and O116 (v3.x learning), O176 (style packs and the chord level), O180 (octave signs, later),
O183 (the warm worker lost when pre-generation is cancelled), O190 (a newer version's database
whose read-only reopening fails), O230 (a stale replay-key wording in a STABLE atom, opened with
D351; numbered O177 on branch `plan-migration`, D352), O234–O238 (v3.4's structural review,
D389), O239–O246 (v3.4's lexicon page, D393), and O267, O269 and O271 (v3.2's build, answered by
the checks that follow the `3.2.0` tag, D521). v3.2 is released and none of its other questions
is open. O270, O272–O289 and O292–O305 were never issued; the IDs reserved for v3.0's waves and
left unused stay unused, and O177 stays unused. New IDs come from `doc-ids next spec O`.

Opened on 2026-10-12 with v3.3 (D261): O165–O175, richer chords. D262 closed O174 the same day.
D264–D273 settled the rest the same day in master spec Part D, as proposed for the owner's
approval with Part D; O175's precedence question goes on as O176.

## v3.3 richer chords (O165+)

Opened 2026-10-12 while recording the owner's request for richer chords as v3.3 (D261; recorded
in [v3](../../versions/v3/README.md#v33--richer-chords-optional)). D262 closed O174 (the research is a
separate item). The chord research ([docs/music/chord-research.md](../../../docs/music/chord-research.md))
recommended an answer to each other question, and on 2026-10-12 spec-writer adopted them, settling
the research's open points itself, in [master spec Part D](../../versions/v3/master-spec.md#part-d--v33),
**proposed for the owner's approval with Part D**: O165 by D264 (one Seventh chords level, Off by
default), O166 by D265 (diatonic only), O167 by D266 (runs stay three notes), O168 by D267 (the
seventh a chord tone; endings read the triad until a listening check), O169 by D268 (a seeded
preference per event; the cost guard), O170 by D269 (symbols, exports, the backing plays the
seventh), O171 by D270 (presets, saved settings, Vary settings never moves the level, `ifk5.`),
O172 by D271 (Jam and the suggestion unchanged), O173 by D272 (the STABLE wording changes listed
for the owner) and O175's shape by D273. Their full text is in this register's history in git;
the answers are in the [decisions log](../../decisions.md). If the owner amends Part D, the decision
amended is revised, and no question comes back unless the owner reopens it. D539 closed O310
(what a phrase may end owing once the seventh is a landing note) on 2026-11-17, as proposed.

- **O310 - What a phrase may end owing once the seventh is a landing note** _(D530;
  [build plan chunk 21](../../versions/v3/build-plan-v3.3.md#chunk-21--endings-on-the-seventh-second-option-conditional),
  only if L1 approves the seventh)_: the phrase before checks that what it ends owing (a recovery,
  a tense note) can be settled on a tonic-triad note (`phrase-ending-debt.ts`). It cannot know
  whether the next phrase's first chord takes its seventh form, so counting the seventh there would
  let it owe a debt only a seventh can settle, under a next chord that may be a triad. Proposed:
  that check keeps reading the triad; only the landing itself (`pitch-advance.ts`, `join-rules.ts`)
  admits the seventh when the first chord has it. Needed before chunk 21 starts; blocks nothing
  now.

## v3.4 structural review (O234+)

Opened 2026-10-21 by `spec-writer` with v3.4 (D389). The scoping draft is
[structural-review.md](../../versions/v3/structural-review.md); none of these blocks v3.1, v3.2 or v3.3.
D536 closed O235 (what the first-load budget measures) on 2026-11-14, at v3.3's wave 4 gate.
