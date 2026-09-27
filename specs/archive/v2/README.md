# v2 Spec-Consolidation Archive

Status: archived 2026-09-27

This is the working record of the v2 spec's drafting phase (2026-09-26 through 2026-09-27), which
covered the rolling-phrase feature across v2.0, v2.1, v2.2 and v2.3. The single consolidated
deliverable is [versions/v2/master-spec.md](../../versions/v2/master-spec.md).

## Archived here

- [decisions-D72-D108.md](decisions-D72-D108.md): the complete v2-drafting decision log, D72–D108,
  kept verbatim. It is append-only history, so don't edit it. New decisions go in the live
  [decisions log](../../decisions.md), numbered from D109.
- [highlights-proposal.md](highlights-proposal.md): the original 2026-09-26 headline, walk-through,
  ranked highlights and proposed cut line that opened the v2 conversation.
- [rolling-phrase.md](rolling-phrase.md): the generation unit, carry-in across joins, look-ahead
  and failure handling, and control changes during a session.
- [audio-and-backing.md](audio-and-backing.md): the audio clock, autoplay unlock, backing
  renderer, click, count-in and tempo.
- [midi-and-acknowledgement.md](midi-and-acknowledgement.md): Web MIDI input, concert pitch, the
  controller check, expected-note acknowledgement, and the end-of-measure chord-fit check.
- [sessions-review-export.md](sessions-review-export.md): session lifecycle, history, last-session
  review, favorites, MusicXML/MIDI export and privacy.
- [adaptive-tempo.md](adaptive-tempo.md): the opt-in adaptive-tempo rule (a flat schedule).
- [definition-of-done.md](definition-of-done.md): the v2.0–v2.3 cut line and the collected
  definition of done.
- [questions-for-user.md](questions-for-user.md): every v2 question that was put to the user
  during drafting, with its proposed default, grouped by when it needed an answer.

## Where each archived decision now lives

Every decision D72–D108 is reflected as settled fact in
[versions/v2/master-spec.md](../../versions/v2/master-spec.md). The table below gives the section
for the decisions most likely to be looked up individually; the rest are folded into the
surrounding prose of the same sections.

| Decision(s)                    | Subject                                                              | Master spec section |
| ------------------------------- | --------------------------------------------------------------------- | -------------------- |
| D72, D76–D78, D85, D86, D89, D90 | MIDI concert pitch, audio unlock, controller check, count-in, backing, MIDI activity, hidden-tab behavior, single MIDI input | §6, §8               |
| D73                              | ISS-005 capability flags adopted (v1.0 gate)                          | (v1, not v2 scope)   |
| D80–D84                         | Leap recovery, tense-note resolution, register window, planner authority, tempo-as-input | §3                   |
| D87, D88, D93                   | Chromium-only scope; history/review/export defaults; played notes in review | §7                   |
| D91                              | Full settings-UI lock during a session                                | §5                   |
| D92                              | Live-view acknowledgement highlight, no played-pitch rendering         | §8                   |
| D94–D97                         | Look-ahead/failure ladder, rolling display modes, event identity, v1-workspace shape | §4, §12              |
| D99                              | Harmonic horizon: phrase-by-phrase in v2.0, multi-phrase arc noted for v2.2 | §3                   |
| D100                             | Latency calibration stays tuned constants for v2; player calibration moves to v3 | §12                  |
| D101, D102                      | Adaptive tempo: flat +5 BPM/2 phrases, ceiling 240, resets on Stop/Start | §10                  |
| D103, D107                      | Settings-mutation flag: scope, magnitude, invalid-combination rule, release (v2.1) | §5                   |
| D104                             | v2.0–v2.3 cut line                                                     | §2, §11              |
| D105                             | Continuation/carry-in boundary                                        | §3                   |
| D108                             | Chord-fit check: kept, per-measure/pitch-class, off-script-only trigger | §9                   |

## Where each resolved question now lives

| Question | Subject                                    | Master spec section |
| -------- | ------------------------------------------- | -------------------- |
| O24      | What "fits the chord" means                  | §9                    |
| O32, O33 | (v1.0 gate prerequisites)                    | (v1, not v2 scope)    |
| O34      | Continuation/carry-in boundary               | §3                    |
| O35      | Multi-phrase arc direction                   | §3                    |
| O36, O40, O43 | Rolling-phrase mechanics batch          | §3, §4                |
| O39      | Settings-UI lock scope                       | §5                    |
| O41      | Acknowledgement window                       | §8                    |
| O42      | Played pitch in the live view                | §8                    |
| O52      | (2026-09-27 batch)                           | §3–§7                 |
| O54      | Audio unlock                                 | §6, §8                |
| O55      | Controller check                             | §8                    |
| O64      | Played notes in the review                   | §7                    |
| O67, O74 | Adaptive tempo rule and reset behavior       | §10                   |
| O75      | v2.0 cut line                                | §2, §11               |
| O76      | Join resolution / unsupported-rhythm marking | §3, §12               |

O77 (settings-mutation flag) is only partially resolved — its release (v2.1), scope, magnitude
and invalid-combination rule are settled (D103, D107), but its exact cadence and default on/off
state remain open. It stays in the live [open-questions.md](../../open-questions.md) register,
not this table. O47, O48, O49, O57, O68, O69, O71 were never v2-drafting-specific decisions and
also remain in the live register.

## Left in place

Nothing needed to stay in `versions/v2/`. Every draft topic document that fed the master spec
moved here; every inbound link across the live tree (`open-questions.md`, `versions/v2/README.md`,
`roadmap.md`, `generator-architecture.md`, `README.md`, `personas/personas.md`,
`versions/prerequisites.md`) was repaired to point either at
[versions/v2/master-spec.md](../../versions/v2/master-spec.md) or at the archived file directly,
as part of this same archiving pass.
