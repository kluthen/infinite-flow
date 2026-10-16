# v3.0 UI/UX Work Record (Archived)

> **Archived 2026-10-16.** v3.0 (Storage) is released as version 3.0.0 (tag `v3.0.0` at e288d98,
> deployed). The live [`todo.md`](../../todo.md) points here. The text below this notice, up to
> "Archiving-pass addendum," is kept verbatim from the live tracker: from `## In Progress`, the
> v3.0 blocks (waves 9, 7, 6 and 2, and the v3.0 design); from `## Remaining`, the v3.0 items, the
> items carried forward from v2 and the dropped old unit 9; from `## Next Unit`, the v3.0
> paragraphs. The v3.1, v3.2 and v3.3 blocks, the standing working rules and the Q16 item stayed
> live. Paths were written from `ui_ux/`; one link path was repaired. A citation like "ux D307" or
> "Q80" refers to this tree's decision log and question register, archived here as
> [decisions-D177-D224.md](decisions-D177-D224.md), [decisions-D280-D322.md](decisions-D280-D322.md)
> and the `open-questions-Q*.md` files; "spec D…" and "spec O…" refer to the spec tree's.

## In Progress

**v3.0 wave 9: small follow-ups** (on branch `v3.0-w9`). Started and done 2026-10-16. Both trees
(recorded corrections to `versions/v3.0/`); cosmetic or wording only, so no `ux-critic` pass.

- **Stale phrase, the musical profile preset:** chunk 24b-2's reading confirmed and written
  exactly (ux D319): the preset's selection, status and summary segment show the player's
  selection at Start, never phrase 1's. No code change.
- **Sheets:** a lone `btn` in a `sheet-section` keeps its own width (ux D320; code change to
  route: the rule in `components.css`); every sheet capped at every breakpoint, 36rem at 844 px
  intended, the phone lines say "up to" the cap (ux D321; no code change).
- **Header build id** written into the workspace handoff and `token-source-v3.md`, newly marked
  `[v3 new]` (ux D322; code change to route: `.brand` and `.build-id` from the component's scoped
  style into `components.css`).

**v3.0 wave 7: before chunk 14** (on branch `v3.0-w7`). Started 2026-10-15.

- **The most recent session after a deletion** (found by documentalist capturing
  `module_kept_session_reach`): the player's own deletion leaves none in that visit; a damaged
  session's deletion hands it at once to the readable kept session that started last, as spec
  D310 says (ux D317, both trees). No build or capture change; spec D310 and chunk 28's scope
  carry the loose clause "as after the player's own deletion", reported to `spec-writer` as
  wording only. Done 2026-10-15.

**v3.0 wave 6: the O210 and Damaged session design gates** (build plan v16 §1), from spec
D310, D311, D315 and spec O210 (master spec Part A v1.15 §5.1, §9), on branch `v3.0-w6`. Started
2026-10-15. Written into `versions/v3.0/` as a recorded correction and at the root (ux D307).
Settled: ux D307-D314; no question for the owner.

- **O210 gate** (before chunk 25): `Export played notes` disabled whenever its file would hold no
  note, its reason naming `Include very short notes` when every played note in the scope is very
  short (ux D308). Files: `flows/review-and-export/`, `screens/last-session-review/`,
  `strategy.md`. Written 2026-10-15.
- **Damaged session design gate** (before chunk 28b): the apology notice, where the player lands
  from `review-link` and from a row, the list aligned (no row for a damaged summary,
  `sessions-link` counting rows, the failed-open note meaning a refusal) (ux D309-D312). Files:
  `flows/saved-data/`, `flows/kept-sessions/` (new section A Damaged Session),
  `screens/session-list/`, `screens/your-data/handoff.md`, `screens/phrase-workspace/handoff.md`,
  `strategy.md`, `versions/v3.0/README.md`. Written 2026-10-15.
- **Validation:** `ux-critic` on both gates: DRIFT, four findings, all fixed (ux D313); recheck:
  two leftovers and a note, fixed (ux D314). Both gates are passed from the design side.
- **Found while building and in the sync:** the lane's minimum bar width reworded (ux D315); a
  Review deletion whose sheet is closed while it runs finishes, as the owner ruled 2026-10-15,
  with its result shown as on confirmation and focus moved only off a removed control (ux D316,
  both trees). Built focus differs in a refusal after close: reported as a build follow-up.
- **For `spec-writer`:** build plan chunk 25's scope says `Include very short notes` is "off at
  every review opening"; the design (ux D193) holds it for the page visit, across reviews, never
  saved. The plan's wording should follow the design, or the question comes back here.

**v3.0 wave 2: the Clef design and Sessions design gates** (build plan v8 §1), from spec
D293-D296 (master spec Part A v1.10), on branch `v3.0-w2`. Started 2026-10-12. Written into
`versions/v3.0/` as a recorded correction and at the root (ux D280). Settled: ux D280-D293; Q76
closed (ux D285); Q80 raised for `spec-writer`, closed 2026-10-16 (ux D318, spec D331).

- **Clef design gate** (before chunk 20): the clef control, the range bound's refusal, the
  staff-reach note in the chosen clef, the clef on screen and in the check note, the interval
  name (ux D281-D285). Written 2026-10-12.
- **Sessions design gate** (before chunk 20c): the erase warning in the sheet and in the check,
  the delete confirmation's count, the landing, the outdated tab's withheld form, the review's
  room for a phrase in another clef (ux D286-D290). Written 2026-10-12.
- **Stale treble-only lines and the token source's sizing comment** (ux D291, D292); chunk 4's
  carry-overs (ux D293). Written 2026-10-12.
- **Validation.** `ux-critic` on both gates: DRIFT, five findings, all fixed (ux D294); recheck: three leftovers,
  fixed (ux D295). The
  gates are passed from the design side; chunk 5's save policy needs the storage port to report
  why a tab became outdated (ux D294), noted with Q80.
- **Stale phrase design gate** (before chunk 24b-2; spec D297, master spec Part A v1.12 §16):
  the out-of-date phrase prompt, `screens/stale-phrase-prompt/` (new), with the play-session,
  workspace, generate-phrase, strategy and motion lines it touches, in both trees (ux
  D296-D304). Written 2026-10-13. Validation: `ux-critic` DRIFT, four findings, all fixed
  (ux D305); recheck: one leftover, fixed (ux D306). The gate is passed from the design side.

**v3.0 (Storage) design**, from `specs/versions/v3/master-spec.md` (v3.0 only; v3.1 and v3.2 are
not specified yet). Started 2026-10-07; the root's v2 marks are cleared (ux D178) and v3's are
marked from the first edit. The owner asked for the whole v3.0 design in one pass and reviews it
once at the end: every settled recommendation is in `decisions.md` (ux D178-D217), and what needs
the owner or `spec-writer` was in `open-questions.md` (Q66, Q67, both closed). **Approved by the
owner on 2026-10-07 (ux D218)**; the outdated tab was then aligned with master spec v1.3 (ux
D219) and v1.4 (ux D221: no deletion of any kind).

- **Unit V0 — Tier 1 and Tier 2.** `strategy.md` (v3 changes), `token-source-v3.md` (new),
  `README.md`. Written.
- Units V1-V4 below: written 2026-10-07 by delegates (details they settled: ux D210-D213).
- All of V0-V4 validated by `ux-critic` on 2026-10-07: DRIFT with five findings, all fixed (ux
  D215, D216), recheck clean (ux D217). Approved by the owner (ux D218).
- **Unit V1 — Kept sessions and the review.** `flows/kept-sessions/` and `screens/session-list/`
  (new); `flows/review-and-export/` and `screens/last-session-review/` (changed: any kept
  session, favorites, export scope, comment, pin and delete, "Keep my played notes", per-session
  played-notes deletion, very short notes, the keep line). Governing decisions: ux D180-D193,
  D196, D204, D205.
- **Unit V2 — Saved data.** `flows/saved-data/` and `screens/your-data/` (new): what is kept
  without asking, loading, the notices, the Your data sheet and its deletions. Governing: ux
  D191, D192, D194-D197.
- **Unit V3 — My instrument and the controller.** `flows/my-instrument/` and
  `screens/my-instrument/` (new); `flows/controller-connection/` and
  `screens/controller-connection/` (changed: "Use this for my instrument", the remembered
  controller). Governing: ux D198-D202, D206.
- **Unit V4 — The workspace.** `screens/phrase-workspace/` (changed: the instrument control's
  fourth choice and its button, the cue row's two links, the notice row, the footer, the load
  wait, the starting-note line before the first click, pre-generation's absence of UI, saved
  settings), `flows/play-session/` and `flows/generate-phrase/` (the save at a session's end, the
  first phrase waiting for saved settings, pre-generation), `motion.md`. Governing: ux D181,
  D194, D196, D197, D198, D202, D203, D206.
- **Validation.** Done (ux D215-D217), the phone staff-height check carried from v2 included:
  that text is unchanged from v2 apart from its cleared tags.

## Remaining

v3.0, after the units above:

- **Token-source pass** (build plan chunk 1, ux D220): applied on branch `v3-c1-token-source`,
  waiting for the owner's merge. After the merge: delete `token-source-v3.md` and point
  `README.md` and the handoffs that cite it (`screens/session-list/`, `your-data/`,
  `my-instrument/`, `last-session-review/`) at the token source alone. The build plan no longer
  links it (spec D223's change), so nothing else waits.
- **Q68:** closed by ux D221 (spec D223): an outdated tab offers no deletion of any kind;
  applied to the kept-sessions, review and saved-data flows and their screens.
- **spec D225** (newer data wins over a failed read): applied by ux D222 to `flows/saved-data/`,
  `screens/your-data/`, `flows/kept-sessions/`, the load lines of `flows/generate-phrase/` and
  `screens/phrase-workspace/`, and `strategy.md`. The narrow `ux-critic` pass on ux D221-D223
  ran on 2026-10-07: DRIFT, one low finding, fixed (ux D224); one build-plan scoping note handed
  to `spec-writer` (chunk 15's tests and done item 14 do not name spec D226's review change).
- **Q69:** closed by ux D223 (spec D226): a visit whose saved data couldn't be read offers no
  deletion in the review either; one "While Saving Is Off" rule for both saving-off visits,
  applied to the kept-sessions, review and saved-data flows, their screens and `strategy.md`.
- **Deferred inside v3.0's spec, no design needed now:** the stray-note threshold and a stricter
  range check for my instrument (master spec §14) are build-plan measurements; a stricter range
  rule, if one comes, only changes the refusal's wording.

Carried forward from v2 (see the addendum of [`archive/v2/todo.md`](../v2/todo.md)):

- **Unit 7's owner confirmation.** The design of the Review's played notes and their export (ux
  D161-D166) was built and passed the v2.0 gate; take the owner's approval of the `v2.0.0` tag
  as the confirmation unless the final v3.0 review says otherwise.
- **The narrow `ux-critic` pass on the phone staff-height edits** (ux D127-D129): done in the
  v3.0 validation, no finding.

Dropped (ux D207): the end-of-measure chord-fit presentation (old unit 9), since master spec §2
drops the check.

## Next Unit

v3.0 wave 6: the O210 and Damaged session gates are passed (ux D307-D314); chunk 25 still waits
for H1, chunk 28b may start. The chunk-25 wording note above waits for `spec-writer`.

v3.0 wave 2: the Clef and Sessions gates are passed (ux D280-D295); Q80 closed 2026-10-16 by
ux D318 (spec D331), no design change.
The Stale phrase design gate is written (ux D296-D304); for `spec-writer`: the lexicon's
**Starting note** and **Count-in** entries still say the starting note starts the count-in, with
no word of the prompt an out-of-date phrase opens first (CONTRACT 5.0). At chunk 19b's calibration, if the bass-clef bound E0-E5 needs more than
24 staff spaces, the bound's figures in the refusal and the Notation Contract come back here.

Still waiting, from v3.0: after the owner merges `v3-c1-token-source`, delete
`token-source-v3.md` and point `README.md` and the four handoffs that cite it at the token source
alone (the build plan no longer links it); the same paths in `versions/v3.0/` are corrected too,
as a recorded correction to match what v3.0 ships.

## Archiving-pass addendum (2026-10-16)

New text, written during the archiving pass. Everything above is unchanged; this records what was
found true when the record was archived.

- **Released.** v3.0 passed its release gate (build plan chunk 26) on 2026-10-16 and shipped as
  version 3.0.0, tag `v3.0.0` at e288d98, deployed (spec D348). Every wave above was merged and
  built.
- **The token-source pass** (`## Remaining`, `## Next Unit`, "Still waiting") was merged with
  build plan chunk 1 and shipped: every token and class `token-source-v3.md` names is in
  `src/styles/`. This pass removed the root copy (frozen in `versions/v3.0/`) and pointed
  `README.md`, `token-source-v3.1-v3.2.md` and the handoffs that cited it at the token source,
  with the same correction in `versions/v3.0/` (ux D323).
- **The chunk-25 wording note** for `spec-writer` (wave 6, `## Next Unit`) is settled: the build
  plan's chunk 25 now says `Include very short notes` is held for the page visit across reviews,
  as the design says.
- **The lexicon's Starting note and Count-in entries** (wave 2, `## Next Unit`) now name the
  prompt an out-of-date phrase opens first.
- **Chunk 19b's calibration** (wave 2, `## Next Unit`): nothing came back; the bass-clef bound
  written E0-E5 shipped as ruled (spec D294).
- **The built focus after a deletion whose sheet was closed** (wave 6, ux D316's build follow-up)
  was placed in build plan chunk 14 (plan v22) and built before the release gate.
- **Unit 7's owner confirmation** (carried forward from v2): the owner approved the `v2.0.0` tag
  and v3.0's final review raised nothing about it; confirmed.
- **Deferred inside v3.0's spec:** the stray-note threshold is settled, 38 ms (spec D321, D322).
  A stricter range check for my instrument (master spec §14, spec O180) is still open; that item
  is carried forward in the live `todo.md`.
- **Open questions:** Q16 stays live; every v3.0 question (Q66-Q69, Q76, Q80) is closed and
  archived here.
