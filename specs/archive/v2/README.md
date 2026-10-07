# v2 Archive

Status: archived 2026-09-27 (spec consolidation); the v2.0 release record was added 2026-10-07

The first part of this folder is the working record of the v2 spec's drafting phase (2026-09-26 through 2026-09-27), which
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

Note added 2026-10-07: O77 was closed on 2026-10-03 (D176), and O57, O68, O69 and O71 later
(D185, D194, D195, D191); see the v2.0 release part below. Of the questions named above, only
O47, O48 and O49 are still open.

## Left in place

Nothing needed to stay in `versions/v2/`. Every draft topic document that fed the master spec
moved here; every inbound link across the live tree (`open-questions.md`, `versions/v2/README.md`,
`roadmap.md`, `generator-architecture.md`, `README.md`, `personas/personas.md`,
`versions/prerequisites.md`) was repaired to point either at
[versions/v2/master-spec.md](../../versions/v2/master-spec.md) or at the archived file directly,
as part of this same archiving pass.

## Added at the v2.0 release (2026-10-07)

Status: archived 2026-10-07. The v2.0 release gate, build plan chunk 21, passed on 2026-10-07:
the [release notes](../../../docs/release/v2.0-release-notes.md) hold 57 rows, 48 Verified, 5
hand checks done, 4 hand checks after the tag (v2.0.x) and 0 not met; ISS-009 and ISS-010 are
Resolved. v2.0 is released as version 2.0.0, and the tag `v2.0.0` waits for the owner's approval
(D208). This part holds v2's design and build record, from `ux-writer`'s design kickoff on
2026-09-27 to the gate's last rulings on 2026-10-07.

### Archived here

- [decisions-D109-D207.md](decisions-D109-D207.md): the decision log D109–D207, kept verbatim. It
  is append-only history, so don't edit it. New decisions go in the live
  [decisions log](../../decisions.md), which records this archive as D208 and continues from D209.
- [open-questions-history.md](open-questions-history.md): the notes the live register kept on the
  questions closed during v2 (O24, O50–O99 apart from O86, O104–O106), with its header paragraph
  and its v2 sections, kept verbatim.
- [readme-status-snapshot.md](readme-status-snapshot.md): the spec index's status snapshot
  (`specs/README.md`, draft v0.42), a running record of the v1.0 release and of D109–D207, kept
  verbatim.
- [v2-readme-status-snapshot.md](v2-readme-status-snapshot.md): the v2 README's status snapshot
  and its open-questions section, which listed closed questions only, kept verbatim.

### Where each decision D109–D207 now lives

Section numbers (§) are those of [versions/v2/master-spec.md](../../versions/v2/master-spec.md).
"History" marks a decision that is superseded, or that only recorded an approval, a correction or
a release event; it has no live home.

| Decision(s) | Subject | Now lives in |
| --- | --- | --- |
| D109 | A failure-ladder repeat is not marked in the review | §4, §7 |
| D110, D178 | The multi-phrase tension arc: a visible opt-in, a four-phrase cycle, off at first | §3 |
| D111–D116, D118–D126 | Controller loss and reattachment, the 30 s rule, the starting note, the transposition check, the click that unlocks audio | §6, §7, §8 |
| D117 | Blind and screen-reader users are not a target | [personas.md](../../personas.md#who-is-not-a-target) |
| D127 | Context of use; no iPad in v2; wider browser support at v4 or v5 | [personas.md](../../personas.md#context-of-use), [roadmap](../../roadmap.md#engineering-carry-overs-not-tied-to-one-version) |
| D128 | The phone's Review is the baseline; review candidates | §2, §7; [personas.md](../../personas.md#context-of-use), [v3](../../versions/v3/README.md#later-review-tooling-candidates-not-committed), [v5+](../../versions/v5-plus/README.md#candidates-not-committed), [roadmap](../../roadmap.md#candidates-not-committed) |
| D129, D130 | Export by content, one action each; favorites and keeping sessions in v3 | §2, §7, §11, §13; [v3](../../versions/v3/README.md#favorites-v3-scope-to-be-settled) |
| D131, D132, D134, D187 | Wake lock, asked for again after a drop; the count-in always clicks, at the click volume | §6 |
| D133 | A staff-only session view in v5 | §2; [v5+](../../versions/v5-plus/README.md#settled-direction) |
| D135–D141 | When a session can start and when it ends: generation failure, count-in, landscape, the staff shown and fitting | §4, §6, §7 |
| D142–D156 | The window's size: height fit, re-checks, the room notice, note density by width, retries | §2, §4, §5, §6 |
| D157, D158, D167 | Joins without carry-in; what a phrase may still owe at a join or at the end | §3 |
| D159 | The review shows every phrase that started sounding | §7 |
| D160, D161 | A setting change lands at a phrase boundary; a phrase partly on screen is kept | §5 |
| D163 | The "generator is struggling" notice | §4 |
| D164 | Two alternating staff systems, no mode toggle | §7 |
| D165, D193, D199 | The real-program export checks and the USB keyboard checks follow the tag (v2.0.x) | §11 |
| D168 | The boundary between two close expected notes | §8 |
| D169, D170 | The next session's phrase 1; leave the Review before starting | §4, §6, §7 |
| D171 | The MusicXML export's final barline | §7 |
| D172 | Neutral's gentle harmony and varied first-load arpeggios | [first-release master spec](../../first-release-master-spec.md), [generator architecture](../../generator-architecture.md), [generative process](../../generative-process.md) |
| D174 | The chord-fit check leaves v2, a v3 nice-to-have | §9; [v3](../../versions/v3/README.md#end-of-measure-chord-fit-check-nice-to-have-not-committed) |
| D175 | v3 rhythm candidates under Custom (O100–O103 open) | [v3](../../versions/v3/README.md#rhythm-candidates-custom-note-density-candidates-not-committed) |
| D176, D177, D181, D182 | The settings-mutation flag: cadence, density step, one grade per setting, restored at the end | §5 |
| D179 | Adaptive tempo pauses while the controller is away | §10 |
| D183 | v2.1, v2.2 and v2.4 compacted into one release, v2.0 | §2, §11; [roadmap](../../roadmap.md) |
| D184 | The silence timer around the starting note and a reattachment | §7, §8 |
| D185 | The backing as built; Tone.js an idea for later | §6; [roadmap](../../roadmap.md#candidates-not-committed) |
| D188 | The audio mix as built is final for v2.0 | [personas.md](../../personas.md#context-of-use); `ui_ux/` (ux Q31) |
| D190, D192 | Profile switch from the check; a "Bluetooth" checkbox (candidates) | [v3](../../versions/v3/README.md#controller-connection-candidates-not-committed) |
| D191 | USB tested, Bluetooth MIDI best-effort; Android Chrome still to try | §8, §12 |
| D194, D195, D197 | The machine measurements: main thread, cold latency, the playhead's 20 ms | §11 |
| D196 | Stray controller notes; a pruning candidate | §9; [v3](../../versions/v3/README.md#stray-notes-from-controllers-candidates-not-committed) |
| D198 | The VISION accepted for v2.0; a rewrite later | [roadmap](../../roadmap.md#engineering-carry-overs-not-tied-to-one-version) |
| D200, D203, D205 | The failure ladder: skipped retries, the carry-in allowance, time-aware cancellation, phrase 2 standalone at 240 BPM | §4 |
| D202 | §11 items 4 and 12 aligned with what v2.0 ships | §11 |
| D204 | Locale-independent candidate order (ISS-010, Resolved) | §11 item 3 |
| D206 | Pre-generating phrases at Idle, a v3 candidate (O107–O111 open) | [v3](../../versions/v3/README.md#pre-generating-phrases-at-idle-candidate-not-committed) |
| D162 | v2.0 records played notes without showing them | History: superseded by D183, which ships the played-notes review in v2.0 (§7) |
| D166 | The v2 README's session start follows §6 | History: a correction |
| D173, D180 | The real-hardware checks as a separate release, v2.4 | History: superseded by D183; the checks themselves are in §11 |
| D186, D189, D201, D207 | Atom wording and promotions approved | History: approvals, applied in `docs/` by `documentalist` |

### Where each closed question now lives

The answers are in the decisions named, and stated as settled fact where the table above puts
those decisions.

| Question(s) | Decision(s) | Now lives in |
| --- | --- | --- |
| O24 | D108, D174 | §9 (a v3 nice-to-have) |
| O57 | D185 | §6 |
| O68, O69, O105, O106 | D194, D195, D193, D197 | §11 |
| O71 | D191 | §8 |
| O77, O93 | D176, D177 | §5 |
| O78–O83, O85 | D119–D124, D126 | §6, §7, §8 |
| O84 | D169, D170 | §4, §6, §7 |
| O87, O88 | D187, D134 | §6 |
| O89, O90 | D138, D139 | §6, §7 |
| O91, O92, O94–O96 | D147–D151, D153, D155 | §2, §4, §5, §6 |
| O97, O98 | D167, D178 | §3 |
| O99 | D179 | §10 |
| O104 | D180 | History: superseded by D183 |

O86, O100–O103 and O107–O111, which these notes mention, stay open in the live
[register](../../open-questions.md), as do O47–O49.

### Left in place

These v2 documents stay where they are.

| Document | Role | Referenced from |
| --- | --- | --- |
| [versions/v2/master-spec.md](../../versions/v2/master-spec.md) | v2 master spec: the contract for the running code | `docs/` (release notes, MIDI, controller, audio, lexicon), `issues/`, `ui_ux/`, `specs/` |
| [versions/v2/build-plan.md](../../versions/v2/build-plan.md) | The build plan, complete; chunk 21 is the release gate's record | `docs/export.md`, `docs/generation-latency.md`, `docs/midi-tuning.md`, `docs/release/v2.0-release-notes.md` (by anchor), `docs/audio-transport.md`, `docs/controller-connection.md`, `ui_ux/todo.md`, `ui_ux/decisions.md` |
| `versions/v2/phone-check-2026-09-29/` | Two screenshots of the phone overflow check | the build plan (chunk 3) |
| [versions/v2/README.md](../../versions/v2/README.md) | The version's scope and status | `specs/`, `ui_ux/open-questions.md` |

Release evidence lives in [`docs/release/`](../../../docs/release/), and the hand checks after the
tag are listed there.
