# Known Deferred Scope

Collected from [`specs/first-release-master-spec.md`](../../specs/first-release-master-spec.md),
[`specs/roadmap.md`](../../specs/roadmap.md), [`specs/open-questions.md`](../../specs/open-questions.md),
[`specs/first_release_plan.md`](../../specs/first_release_plan.md) ("Known Implementation Risks"),
[`ui_ux/todo.md`](../../ui_ux/todo.md), and
[`docs/req_tech_debt_backlog.atom.md`](../req_tech_debt_backlog.atom.md). Every item below cites its
source file; nothing here changes product intent, it only inventories what was already deferred.

## Product features deferred

- **Generated lead-line playback.** Explicitly excluded. Source:
  `specs/first-release-master-spec.md` ("Explicitly Excluded"); listed again under "Later
  Enhancements" in `specs/roadmap.md` §4.
- **Required backing/accompaniment; optional BPM-aligned backing.** Backing is excluded as a
  requirement; an optional, non-blocking, BPM-aligned form "may be added" later, with its limited
  form still undecided. Source: `specs/first-release-master-spec.md` ("Explicitly Excluded");
  `specs/roadmap.md` §4 and "Explicitly Unresolved Decisions" ("Backing role"); `specs/open-questions.md`
  O6.
- **MIDI controller connection, match/mismatch feedback, MIDI-seeded continuation.** Excluded from
  this release; minimal MIDI integration (connection + quiet visual match/mismatch feedback, no
  played-pitch display, no timing evaluation, no scoring) is the immediate next roadmap stage;
  MIDI-seeded continuation (accepting one or two MIDI measures, rolling continuation) is the stage
  after that. Source: `specs/first-release-master-spec.md` ("Explicitly Excluded", "Deferred Work
  and Visible Gaps"); `specs/roadmap.md` §2 ("Minimal MIDI Integration") and §3 ("MIDI-Seeded
  Continuation").
- **Microphone capture, audio-to-note transcription, acoustic pitch detection.** Excluded, no
  scheduled roadmap stage. Source: `specs/first-release-master-spec.md` ("Explicitly Excluded");
  `specs/roadmap.md` §3 ("Continue to defer acoustic microphone pitch capture").
- **Persistence and session export.** Sessions are ephemeral; capture/export of a session is later
  work. Source: `specs/first-release-master-spec.md` ("Explicitly Excluded", "Deferred Work and
  Visible Gaps"); `specs/roadmap.md` §4.
- **Continuous generation, rolling staff, seed-phrase capture, automatic key detection, phrase
  adaptation, long-term personalization.** All explicitly excluded; automatic key detection is
  called out again as not yet defined even once MIDI-seeded continuation lands (it uses supplied
  material for rhythm/contour/interval character "rather than automatic key detection"). Source:
  `specs/first-release-master-spec.md` ("Explicitly Excluded"); `specs/roadmap.md` §3.
- **Scoring, grading, ranking, or pass/fail interpretation of player input.** Explicitly excluded,
  and reaffirmed as a boundary any future MIDI scope must not cross. Source:
  `specs/first-release-master-spec.md` ("Explicitly Excluded", "Deferred Work and Visible Gaps").
- **Tempo variation, meters other than 4/4, pulse-feel controls, direct chord-progression
  authoring, altered dominants, substitutions, modulation, altissimo.** Explicitly excluded from
  first-release player controls and musical behavior. Source: `specs/first-release-master-spec.md`
  ("Explicitly Excluded").
- **Closed tonic ending.** The four-bar phrase always ends open in this release; a closed tonic
  ending is named as "a later option." Source: `specs/first-release-master-spec.md` ("Shared
  Constraints").
- **Additional instrument profiles or player-selected range variants.** Only C MIDI keyboard,
  B-flat tenor saxophone, and E-flat alto saxophone ship; more profiles/range variants are later
  work through the same declarative validation path. Source: `specs/first-release-master-spec.md`
  ("Deferred Work and Visible Gaps"); `specs/roadmap.md` §4.
- **Phrase-end controls, non-scoring descriptive practice feedback.** Named as later, unscheduled
  candidates. Source: `specs/first-release-master-spec.md` ("Deferred Work and Visible Gaps");
  `specs/roadmap.md` §4.
- **MIDI-feedback UI flow and states.** UI/UX has not designed this yet; explicitly deferred until
  the minimal-MIDI roadmap stage is scheduled. Source: `ui_ux/todo.md` ("Remaining").

## Engineering debt

- **Planner-repair authority is undecided.** Whether a later planning stage (e.g. pitch) may revise
  an earlier stage's (e.g. harmony/rhythm) decision to repair voice leading or playability, and how
  that would avoid recoupling the currently decoupled planner stages, remains open. Any future
  repair must preserve today's component boundaries. Source: `specs/first-release-master-spec.md`
  ("Deferred Work and Visible Gaps"); `specs/roadmap.md` "Explicitly Unresolved Decisions" ("Planner
  authority"); `specs/open-questions.md` O10.
- **Six unsupported rhythm settings are a grammar limit, not a musical rule.** These six
  note-density, silence-density, syncopation combinations have no legal rhythm plan under the v1
  grammar for any tension arc: Quarter/Sparse/Active displacement, Quarter/Breath-heavy/Active
  displacement, Sixteenth/Sparse/Active displacement, Sixteenth/Conversational/Active displacement,
  Sixteenth/Breath-heavy/Occasional offbeats, and Sixteenth/Breath-heavy/Active displacement. The
  Sixteenth/Active-displacement cases are known to collide with the documented one-merge-per-gesture
  limit; the others have no identified cause yet. Enumerating every legal answer-transform target
  (not only the first) would unlock Quarter/Sparse/Active displacement but roughly quadruples
  domain-scan cost. A later rhythm-grammar version should either make these playable or confirm them
  permanently unsupported. Source: `specs/roadmap.md` "Explicitly Unresolved Decisions" ("Rhythm
  settings with no legal phrase"); `docs/rule_unsupported_rhythm_settings_block_generation.atom.md`;
  the UI-blocking requirement itself is in `specs/first_release_plan.md` Step 9.
- **Search ceiling is a finite, versioned fuel budget, not a timeout.** Finite search is
  computationally expensive; a search ceiling is explicit and versioned, and reaching it is
  indeterminate — it must never be reported as musical infeasibility (i.e. never conflated with
  `no_legal_pitch_plan`/`no_legal_rhythm_plan`). Source: `specs/first_release_plan.md` "Known
  Implementation Risks"; see also `docs/mechanic_pitch_search_policy.atom.md` and
  `docs/generation-latency.md` for the implemented policy and measured latency.
- **Stable hash/seed encoding needs versioned golden fixtures.** Stable hash encoding, named stream
  labels, candidate identities, and unsigned interpretation require versioned golden fixtures to
  preserve cross-runtime determinism, so a future runtime/engine change does not silently reorder
  or reinterpret seeded output. Source: `specs/first_release_plan.md` "Known Implementation Risks".
- **`req_tech_debt_backlog` anchor.** Any ARCHITECTURE/IMPLEMENTATION ATD atom that cannot yet be
  traced to a real business requirement must declare `req_tech_debt_backlog` as its parent instead
  of shipping untraced, and the team must periodically query and re-parent those atoms toward real
  requirements. As of this writing this is a standing governance mechanism, not a report of which
  atoms currently point to it; run `atd query --field parents --search req_tech_debt_backlog`
  (outside this docs-only task) to see the current count. Source:
  `docs/req_tech_debt_backlog.atom.md`.

- **Step 10 review follow-ups (non-blocking).** These were confirmed at the Step 10 go/no-go review
  and left open:
  - No ATD atom owns the read-only contrast guarantee during an operation (the dashed ring
    replacing opacity dimming). The behavior is covered by `npm run test:a11y`; only the
    traceability is missing.
  - No UI state is defined for a generation-error banner coexisting with the `Retry notation` label.
    This happens when a display-mode redraw fails after a later generation failure. The behavior
    is coherent (see `WorkspaceHeader.vue`), but `ui_ux/` does not describe it.
  - The lazy VexFlow engraver chunk (about 726 KB, about 390 KB gzip) triggers Vite's chunk-size
    warning during `npm run build`. It is lazy-loaded and precached, so the warning is expected.
  - The `module_pitch_planner` and `service_generation_orchestration` atoms are still too broad and
    need a split pass.

## Calibration work

- **Listening-test calibration remains necessary** for harmony-template ordering, attack/rest
  bands, answer similarity, contour strictness, optional ornaments, and perceived spacing among
  controls — none of these numeric/ordering choices are treated as finished musical theory. Source:
  `specs/first_release_plan.md` "Known Implementation Risks".
- **Numerical calibration policies in the implementation-facing musical guides remain "subject to
  listening tests."** This applies to Harmony Planner Policy, Rhythm and Phrase-Structure Policy,
  and Pitch Planner and Validation Policy; explicitly labelled bands should not be presented as
  universal theory ahead of listening-test results. Source: `specs/first_release_plan.md`
  ("Technology and Delivery Decisions"; Steps 5-7 "Documents" clauses).
- **Unresolved musical weights/strictness in pitch planning and validation** are labelled for
  listening tests rather than settled as final values. Source: `specs/first_release_plan.md` Step 7
  ("Documents").
