# v3.2 UI/UX Work Record (Archived)

> **Archived 2026-11-09.** v3.2 (Jam) is released as version 3.2.0 (tag `v3.2.0` at f93e552d, 2026-11-09). The live [`todo.md`](../../todo.md) points here.
> The text below this notice, up to "Archiving-pass addendum," is kept verbatim from the live
> tracker: from `## In Progress`, the v3.1 and v3.2 block (its v3.1-only items were archived
> with v3.1) and the v3.2 re-scope block; from `## Next Unit`, the v3.2 paragraph. The v3.3
> work, the standing working rules and the items still pending stayed live. Paths were written
> from `ui_ux/`; one link path was repaired. A citation like "ux D347" or "Q81" refers to this
> tree's decision log and question register, archived here as
> [decisions-D225-D251.md](decisions-D225-D251.md),
> [decisions-D327-D475.md](decisions-D327-D475.md),
> [open-questions-Q70-Q75.md](open-questions-Q70-Q75.md) and
> [open-questions-Q81-Q87.md](open-questions-Q81-Q87.md), or live in
> [`decisions.md`](../../decisions.md); "spec D…" refers to the spec tree's.

## In Progress

**v3.1 (presets and embellishment figures) and v3.2 (Jam) design**, from master spec Parts B and C
(approved 2026-10-08). Started 2026-10-08; v3.0's approved design was frozen in `versions/v3.0/`
first, and the root keeps v3.0's marks with v3.1's and v3.2's layered on them (ux D225). Owner's
standing delegation: settle and record; one full review at the end. Implementation is paused: no
`src/` edits; tokens in `token-source-v3.1-v3.2.md` (ux D226). Settled decisions: ux D225-D245;
spec gaps for `spec-writer`: Q70-Q73, all since closed (ux D249, D341). v3.1 shipped as version
3.1.0 on 2026-10-21; its own items (unit P, its approval, its token-source pass, its release gate)
are archived in [`archive/v3.1/todo.md`](../v3.1/todo.md). The items below are shared with
v3.2 or are v3.2's.

- **Unit W0 — Tier 1 and Tier 2, the registers.** `strategy.md`, `motion.md`, `README.md`,
  `token-source-v3.1-v3.2.md` (new), `versions/v3.0/` (new). Written.
- **Unit R — the review side, both releases** (delegated, alongside P):
  `screens/last-session-review/`, `flows/review-and-export/`, `screens/session-list/`,
  `flows/kept-sessions/`, `flows/saved-data/`, `screens/your-data/`. Governing: ux D231 (the
  refused-save notice), D233, D234, D239-D241. Written 2026-10-08 (details: ux D246, D247).
- **Unit J — v3.2 core** (delegated, after P): `flows/jam/` (new); `screens/phrase-workspace/`,
  `flows/play-session/` and `flows/generate-phrase/` for v3.2. Governing: ux D235-D244, D246, D247. Written 2026-10-08 (details: ux D248).
- **Validation.** `ux-critic` on v3.1 and on v3.2: DRIFT both, findings fixed (ux D249, D250); recheck: two small slips, fixed (ux D251). Validated for the owner's review.

**v3.2 re-scope: Jam as its own mode** (2026-10-21), from `specs/versions/v3/jam-mode.md` (spec
D400–D408; §8 is the brief), which wins over master spec Part C until Part C is rebuilt from it.
The v3.2 design above is reworked in place under its `v3.2` marks (ux D328). Settled decisions:
ux D328–D346. Q70 moot, Q73–Q75 closed (ux D341); behaviour gaps Q81–Q87, designed on their
recommended answers, closed by spec D411 as recommended (ux D347). No `src/` edits here.

- **Tier 1, Tier 2 and the registers.** `strategy.md`, `motion.md`, `README.md`,
  `token-source-v3.1-v3.2.md` part 2, `decisions.md`, `open-questions.md`; spec D399's browser
  cleanup (ux D343). Written 2026-10-21.
- **Unit A** (delegated): `flows/jam/`, `screens/phrase-workspace/`. Written 2026-10-21.
- **Unit B** (delegated, after A): `flows/play-session/`, `flows/generate-phrase/`,
  `screens/stale-phrase-prompt/`, `flows/presets/`, `flows/controller-connection/`. Written
  2026-10-21.
- **Unit C** (delegated, after A): `screens/last-session-review/`, `flows/review-and-export/`,
  `screens/session-list/`, `flows/kept-sessions/`, `flows/saved-data/`, `screens/your-data/`.
  Written 2026-10-21. Details settled while writing A, B and C: ux D345.
- **Validation.** `ux-critic` on the re-scope: DRIFT, five findings, all fixed (ux D346), Q87
  logged for `spec-writer`; recheck: one stale diagram label, fixed. Validated for the owner's
  review.
- **Owner's approval** (2026-10-21): design gate D0 granted and token pass T2 allowed (spec D412,
  ux D347); master spec Part C is v1.2, approved. "The kept doodle" is the spec's term too (spec
  D413); phones a third-rate client, now in `strategy.md` (spec D414, ux D348).

## Next Unit

v3.2: approved (gate D0 granted, T2 allowed; ux D347). The token-source pass is done (build plan
v3.2's chunk 1, ux D349): D342's classes are in `src/styles/components.css` under `v3.2 new`, and
`token-source-v3.1-v3.2.md` is deleted. Questions from the build are settled as they come:
wave 3's chunk 19 (ux D350); wave 4's chunk 20, the empty system's name and opening line, the
score title in Jam mode, and what stays live while Jam's code loads (ux D351-D354); wave 6's chunk 21, the read-in's cross-fade, a portrait end's focus and the note start's jump (ux D450-D452). Wave 7's chunk 24 (the kept doodle): the bar's suggestion offered again at Idle, its buttons disabled during Loading, its focus fallback, Jam's too-many-notes sentence, the phone's scroll and the laptop's cue-row band, and `Jam again on this doodle` in the review after a Jam (ux D464-D470; D465 and D467 need code changes). Then the bar's focus when its buttons are disabled (ux D471), the header phrase action's focus through its own Loading (ux D474, needs a code change) and chunk 40's `Volume` popover on a landscape phone, confirmed as is (ux D475). Gate GD,
the guide playback's controls (master spec C19.3), is written (ux D459-D462): the two guide switches
after `Click`, full labels and the mix's wrap, the popover's four sliders and the four guide tokens
in `src/styles/theme.css`; `ux-critic`: DRIFT, four findings, all fixed (ux D463); recheck ALIGNED. The owner hears it at hand check v3.2 HG. `versions/v3.2/` was taken on
2026-11-09 from the root without its v3.3 parts (ux D480). Its release gate's design part is done
(2026-11-09, ux D483, chunk 27): no handoff names a class missing from `src/styles/`, no chunk
recorded a phone reduction, and `versions/v3.2/` needed no correction. What remains for v3.2 is
the tag, the owner's checks after it (spec D521; a finding that changes the design corrects the
copy and the root alike, recorded), and then its milestone archive.

## Archiving-pass addendum (2026-11-09)

New text, written during the archiving pass. Everything above is unchanged; this records what was
found true when the record was archived.

- **Released.** v3.2 passed its release gate's machine half (build plan v3.2's chunk 27) and
  shipped as version 3.2.0, tag `v3.2.0` at f93e552d, on 2026-11-09 (spec D521, D523). "What
  remains for v3.2 is the tag" is done.
- **"D465 and D467 need code changes," "ux D474, needs a code change":** made in wave 7 and
  released with 3.2.0. So was D452's missing jump on a note start.
- **Still owed after the tag:** the owner's hand checks v3.2 H3, H4-H8 and HG (spec D521). The
  live `todo.md` carries them, with where their design is.
