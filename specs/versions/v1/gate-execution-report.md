# v1.0 Gate — Execution Report (ISS-003, ISS-004, ISS-005)

Status: v1.0 (2026-09-26). Handoff document for **coordination-leader**.

This report is self-contained. The authoritative behavior is
[first-release-master-spec.md](../../first-release-master-spec.md) **draft v2.0**, which was amended
for this gate. Where this report and the master spec disagree, the master spec wins. Report the
disagreement back to spec-writer.

The v1.0 gate is "no open issue in [`issues/`](../../../issues/README.md)". Three issues remain,
and all three have settled semantics. **Do not tag v1.0 without asking the user.**

---

## 1. What changes, in one paragraph each

### ISS-003 — The key is chosen in written pitch; transposition is instrument data

Issue: [`issues/Ref_20260925_tonal_center_in_written_key.md`](../../../issues/Ref_20260925_tonal_center_in_written_key.md). Decisions: D56 a–d and D57 (archive `specs/archive/2026-09-25-decisions-D47-D71.md`).

- **Transposition moves onto the instrument profile.** Each profile carries a chromatic and a
  diatonic interval as open integers, validated as a consistent pair:
  - C MIDI keyboard `+0/+0`;
  - B♭ tenor `+14/+8`;
  - E♭ alto `+9/+5`.
- **The notation-display selector is removed.** There is no Concert override in v1.0.
- **The player picks the tonal center and collection in their instrument's written pitch.**
  - The request constructor (`createGenerationIntent`) converts it to concert pitch:
    `concert pc = (written pc − chromatic) mod 12`.
  - The generator stays concert-only.
  - The written key signature is spelled **from the player's selection**; it is not re-derived
    from concert pitch.
- **Switching instrument keeps the written key and collection** and regenerates all four measures
  with a fresh seed. It never keeps or transposes the old phrase. With no phrase shown, the switch
  only changes the selection. Under a blocked rhythm setting, it clears the phrase.
- **Adding a preset must be one data entry.** No new type members, enum edits or UI branches.

### ISS-004 — Rhythmic variety; Mixed retired

Issue: [`issues/Ref_20260925_note_density_variety_setting.md`](../../../issues/Ref_20260925_note_density_variety_setting.md). Decisions: D59, D60.

- **A new preset-controlled control, "rhythmic variety"** (the canonical term; ux-writer picks
  the label). Levels:
  - `Strict`: only the selected density's value, plus the rests and ties from silence density and
    syncopation;
  - `Slightly varied`: the default; today's Quarter-mode feel;
  - `Heavily varied`: other values are common, but the selected value stays dominant.
- **Variety is the chance of appearance of both shorter and longer values.** At Sixteenth only
  longer values are possible.
- **Both presets set `Slightly varied`**, so preset bundles grow from 6 to **7** controls.
- **Note density becomes `Quarter | Eighth | Sixteenth`.** `Mixed` is retired and rejected as an
  unknown value by control construction and by the worker's boundary parser.
- **Gated by a feasibility review** (§3, step 4). The exact value set and weighting per level and
  density, the dominance measure, variety's tie-break position and any change to the blocked set
  are **fixed by the review and confirmed by the user before implementation.**

### ISS-005 — Capability flags instead of profile-name checks

Issue: [`issues/Ref_20260926_profile_capability_flags.md`](../../../issues/Ref_20260926_profile_capability_flags.md). Decision: D73 (`specs/decisions.md`).

- The musical profile (neutral/jazz) declares named capabilities. The first one is **"chromatic
  approach and enclosure figures allowed"**: jazz has it, neutral doesn't.
- It replaces the two name checks, `src/domain/pitch/pitch-candidates.ts:172` and
  `src/domain/pitch/validation/figure-rules.ts:168` (`profile !== 'Jazz'`).
- A sweep of `src/domain` found no other name branches. `harmony-planner.ts:80` only validates
  membership.
- **Output must be byte-identical.**

### Terminology (one term per concept)

| Term                   | Meaning                                                                               | Code today                           |
| ---------------------- | ------------------------------------------------------------------------------------- | ------------------------------------ |
| instrument profile     | range, register windows and (new) transposition; the "instrument template" of D56/D57 | `InstrumentProfile`                  |
| musical profile        | neutral / jazz style policy                                                           | `MusicalProfile`, `MUSICAL_PROFILES` |
| musical profile preset | the 7-control bundle a musical profile applies                                        | `profile-selection.ts`               |
| capability             | a named flag declared by a musical profile                                            | (new)                                |
| written tonal center   | the player's selection, in the instrument's written pitch                             | (new meaning of the control)         |
| concert tonal center   | what the generator receives                                                           | intent field                         |
| rhythmic variety       | the new control                                                                       | (new)                                |

"Notation mode" and "display convention" disappear as player-facing concepts.

---

## 2. Where it lives in the master spec (draft v2.0)

| Decision      | Master-spec sections                                                                                                                                                                |
| ------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D56 (ISS-003) | Scope / Included; Player Controls → Tonal context; Shared Constraints; Architecture and Boundaries; Application State; Notation; Notation → Enharmonic Spelling; Definition of Done |
| D57 (ISS-003) | Architecture and Boundaries; Definition of Done ("Open transposition")                                                                                                              |
| D59 (ISS-004) | Player Controls → Rhythmic variety, Musical profile preset; Shared Constraints; Tension Arc; Definition of Done                                                                     |
| D60 (ISS-004) | Player Controls → Note density; Definition of Done                                                                                                                                  |
| D73 (ISS-005) | Musical Behavior → Jazz Profile; Architecture and Boundaries; Definition of Done                                                                                                    |

`specs/generator-contract.md` and `specs/generator-architecture.md` (v1.0) carry an amendment note.
Their "delivered Step 2-9" text describes the pre-gate code; the master spec is authoritative.

---

## 3. Recommended sequencing

Each unit follows the project workflow: its own worktree, one commit plus a `--no-ff` merge, and
`npm run quality` green.

1. **Done before handoff:** the ATD atoms were synced to the amended spec by the documentalist (§6).
   The code now lags the atoms on these points, by design.
2. **ISS-005 first** (smallest, pure refactor, independent).
   - It must land **separately from ISS-004**, so byte-identical goldens prove it changes nothing.
   - It can run in parallel with step 3.
3. **ux-writer: `ui_ux/` control docs for ISS-003 and ISS-004.**
   - ISS-003: remove the display selector and label the key picker in written pitch.
   - ISS-004: add the variety control and remove `Mixed` from note density.
   - Files: `ui_ux/flows/generate-phrase/intent.md`, `ui_ux/screens/phrase-workspace/handoff.md`
     (e.g. the segmented "notation mode" control, the notation-status announcement list mentioning
     "display-mode switch", `staff-content` "selected display convention", chord symbols "follow
     the selected display mode"), `ui_ux/mockups/phrase-workspace.html`, `ui_ux/decisions.md`,
     `ui_ux/strategy.md`, `ui_ux/index.md` and `ui_ux/todo.md`.
   - Forward the master spec only. The variety control's shape is designable now; only its
     musical value sets wait for step 5.
4. **ISS-004 feasibility review** (read-only analysis). It can start in parallel with steps 2–3.
   - Deliverable: a short document that settles the items in §4.2.
   - **Bring it to the user and get confirmation before step 6.**
   - If the review finds that a level must block, or that dominance can't be kept, stop and route
     the issue back to spec-writer. Do not decide it in execution.
5. **ISS-003 implementation** (after step 3).
6. **ISS-004 implementation** (after steps 3 and 4 are confirmed, and preferably after step 5 so
   the goldens change once per concern).
7. **Documentalist post-implementation pass.** Verify the atoms changed in §6 against the code,
   fix the `@spec-link` placement (directly above the function or test, never at file top), and
   advance the atom statuses.
8. **Gate check:** `issues --status open` is empty. Then ask the user about tagging v1.0.

---

## 4. Scope and acceptance per issue

### 4.1 ISS-003

**Code touched (verified by reading):**

- `src/domain/notation/notation-mode.ts`: the closed `NotationMode` union, the literal
  `DisplayTransposition` (`0 | 9 | 14`, `0 | 5 | 8`) and `DISPLAY_TRANSPOSITIONS`. Remove them, or
  fold them into a transposition value type with integer fields.
- `src/domain/profile/instrument-profiles.ts`: add transposition to each profile and to the
  profile validator.
- Consumers of `NotationMode`:
  - `src/components/workspace/WorkspaceHeader.vue` (the selector, `setNotationMode`);
  - `src/composables/use-generation-session.ts`;
  - `src/composables/use-notation-coordinator.ts`;
  - `src/domain/notation/written-phrase.ts`;
  - `src/domain/notation/written-phrase-types.ts`.
- `src/domain/generation/generation-intent.ts`: the written → concert conversion.
- `src/domain/notation/pitch-spelling.ts` (`spellWrittenKey`, `ionianTonic`): spell from the
  written selection.
- `src/notation/vexflow-engraver.ts` (`addKeySignature`).
- `src/composables/generation-session-profile-switch.ts` and
  `src/domain/generation/profile-switch.ts`: the keep-if-it-fits policy is replaced by "keep the
  written key, regenerate".
- There is no persistence in v1 (`persistence-absence.spec.ts`), so there is no stored-state
  migration.

**Tests likely to change:**

- Unit: `WorkspaceHeader.spec.ts`, `ScorePanel.spec.ts`, `WorkspaceShell.spec.ts`, `App.spec.ts`,
  `generation-session-notation.spec.ts`, `generation-session-workspace.spec.ts`,
  `use-generation-session.spec.ts`, and profile-switch specs.
- End-to-end: `tests/e2e/release/notation-modes.spec.ts` (rewrite as a written-key spec),
  `profile-switch.spec.ts`, `defaults-and-controls.spec.ts`, `deterministic-replay.spec.ts`,
  `notation-status-and-recovery.spec.ts`, and the notation harness fixtures.

**Acceptance (from the master spec's Definition of Done):**

- First load: written C Ionian on B♭ tenor shows an **empty key signature**, and the request
  carries concert pitch class **10** (B♭).
- E♭ alto, written C Ionian: empty signature; concert pitch class **3** (E♭).
- C keyboard: written equals concert; the concert case is unchanged.
- Written D Dorian on tenor → concert C Dorian.
- A **test-only instrument profile with an unusual transposition** (e.g. `+2/+1` or `+21/+12`)
  passes through request construction, spelling and engraving with no code change outside the
  test.
- A switch between each pair of profiles keeps the written key, recomputes the concert center and
  uses a fresh seed. A switch with no phrase shown only changes the selection. A switch under a
  blocked rhythm setting clears the phrase and doesn't generate.
- Chord symbols, roots and slash bass show in the instrument's written pitch, as the B♭ and E♭
  displays already do today.
- The generator's seeded output for a given **concert** request is unchanged. The goldens are
  keyed on concert requests and should not move. If they do, stop and investigate.
- The latency budget still holds: warm p95 ≤ 250 ms, cold p90 ≤ 500 ms
  (`tests/e2e/workspace/generation-latency.spec.ts`).

**Visible behavior change to expect:** the default tenor view today shows written D major (two
sharps) for concert C. After this change it shows written C (no sharps) and **sounds concert B♭**.
That is the point of the issue.

### 4.2 ISS-004

**Feasibility review must settle** (these are acceptance inputs, not implementation choices):

1. The value set per density × level: which shorter and longer values, dotted values and ties
   across beats are allowed.
2. The weighting per level, and **how "dominant" is measured**, for example the share of attacks
   or of beat coverage.
3. That the four-beat fill, the **prefilter soundness** (`rhythm-prefilter-soundness-*.spec.ts`,
   `rhythm-prefilter-oracle.ts`) and determinism still hold.
4. The blocked set: today there are six blocked density/silence/syncopation settings. The goal is
   **no new blocked setting, and `Heavily varied` never blocks.**
5. Variety's place in the tie-break priority (master spec, Shared Constraints).
6. The latency impact, measured and not estimated, at the three densities × three levels.
7. Whether `Slightly varied` at Quarter reproduces today's Quarter outputs exactly (so the goldens
   stay put there) or only approximately. Either is acceptable; say which.
8. For v2 planning: whether the grammar could let a phrase start off beat 1. Just note it; do not
   build it. See `specs/versions/prerequisites.md`.

**Code touched:**

- `src/domain/controls/generation-controls.ts` (`NOTE_DENSITIES`, new variety levels) and
  `src/domain/controls/profile-selection.ts` (7-control bundles).
- `src/components/controls/control-options.ts`.
- The worker protocol parser in `src/generation-worker/`.
- `src/domain/rhythm/{rhythm-skeleton,rhythm-planner,rhythm-invariants,syncopation,rhythm-validator}.ts`.

**Fixtures:**

- Mixed appears in `tests/unit/domain/rhythm/fixtures/rhythm-mvp-v1-manifest.json` (36 entries),
  `generation-outcome-golden.v2.ts` (4 entries) and `generation-seed-matrix.spec.ts`.
- `rhythm-prefilter-soundness-mixed.spec.ts` goes away.
- **The goldens change on purpose.** Regenerate them as a new version (for example
  `generation-outcome-golden.v3.ts`) and document why. Never regenerate goldens silently in the
  ISS-003 or ISS-005 commits.

**Acceptance:**

- Exactly three levels exist, the default is `Slightly varied`, and both presets set it.
- Changing variety after picking a preset gives the custom state.
- Under `Strict`, every attack uses the selected density's value, apart from rests and ties.
- Each level produces exactly the value set fixed by the review, and dominance holds under the
  review's measure, across the seed matrix for every density.
- Note density offers exactly `Quarter`, `Eighth` and `Sixteenth`, and `Mixed` is rejected by
  `makeGenerationControls` and by the worker parser.
- The blocked set equals the review's set.
- The latency budget holds.

### 4.3 ISS-005

Impact research on 2026-09-26 (codebase-explorer, spot-checked by spec-writer).

**Blast radius: small.**

| Location                                                                                               | What it is                                                | Action                                      |
| ------------------------------------------------------------------------------------------------------ | --------------------------------------------------------- | ------------------------------------------- |
| `src/domain/pitch/pitch-candidates.ts:172` (`jazzPaths`)                                               | behavior branch on name                                   | read the capability                         |
| `src/domain/pitch/validation/figure-rules.ts:168`                                                      | behavior branch on name (`out_of_collection` unless Jazz) | read the capability                         |
| `src/domain/controls/profile-selection.ts:30` (`PROFILE_BUNDLES`)                                      | data table keyed by profile                               | leave; the capability table goes next to it |
| `src/domain/harmony/harmony-planner.ts:80`, `src/generation-worker/generation-worker-protocol.ts:129`  | membership validation                                     | leave                                       |
| neutral diatonic rules (`pitch-figures.ts`, `pitch-candidates.ts:79/280`, `harmony-planner.ts:43/142`) | enforced through the collection, not the name             | leave                                       |

**How the profile reaches the checks:** `use-generation-session.ts` →
`intent.musicalProfile {musicalProfile, isCustom}` (the worker protocol) →
`parseGenerationWorkerIntent` → `makeGenerationIntent` → `bindingPitchPolicy`
(`window-search.ts:93-103`) → `makePitchPolicy` (`pitch-policy.ts`) → `PitchPolicy.profile`
(`pitch-types.ts:38`) → the two checks.

**Recommended shape (proposed; the implementer may refine it):**

1. Put a capability table next to `PROFILE_BUNDLES` in `domain/controls/profile-selection.ts`:
   `MUSICAL_PROFILE_CAPABILITIES: Record<MusicalProfile, {allowsChromaticApproach: boolean}>`
   (the field name is illustrative).
2. `makePitchPolicy` resolves the profile's capabilities once, onto a new frozen
   `PitchPolicy.capabilities` field.
   - Its `input` should also accept an **optional capabilities override**, so tests can inject a
     capability set without a new profile name.
   - `MusicalProfile` is a closed union, so a truly "test-only profile name" is impossible without
     widening types, and that is out of scope.
3. Replace the two checks with a read of `policy.capabilities`. Renaming `jazzPaths` (e.g.
   `chromaticApproachPaths`) is optional.
4. **The worker protocol does not change.** Capabilities are derived inside the domain after
   parsing. The boundary rules allow it: `domain/pitch` already imports types from
   `domain/controls`.

**Byte-identity proof (do this in order):**

1. **Before touching code, confirm the baseline actually exercises chromatic figures.**
   - Jazz goldens exist (`generation-outcome-golden.v2.ts`: `eighth-occasional-conversational-jazz`
     and `quarter-occasional-breath-heavy-jazz-edge`), and `pitch-search-equivalence.spec.ts` has
     Jazz seeds.
   - Nobody has yet verified that any of them **selects** an approach or enclosure.
   - If none does, first add a pinned case whose outcome contains one, recording its hash from the
     unchanged code. It goes in the same unit, but its baseline must come from the unchanged code.
2. Apply the refactor.
3. These must pass unchanged:
   - `generation-outcome-golden.spec.ts` (the hash is `fnv1a32(JSON.stringify(outcome))`; the
     outcome carries only `searchPolicyVersion`, not the policy object, so the new field should not
     move hashes, and if it does, stop);
   - `pitch-search-equivalence.spec.ts`;
   - `generation-seed-matrix.spec.ts`;
   - `pitch-candidates.spec.ts:116-129` (`@test-link [[rule_jazz_chromatic_resolution]]`);
   - `figure-rules.spec.ts:37-70`.
4. New tests use the override:
   - Neutral **with** the capability gets chromatic candidates and passes validation;
   - Jazz **without** it gets none, and chromatic pitches fail as `out_of_collection`.
     This proves the gate reads the capability, not the name.
5. `grep "'Jazz'" src/domain` matches only data tables and labels.

**Performance:** a property read replaces a string compare, once per planner input. The difference
is well under a millisecond per generation, against the 250 ms warm p95 budget.

**Conflict hotspots:**

- `profile-selection.ts` is shared with ISS-004 (seven-control bundles). This is a **medium**
  conflict risk, so **land ISS-005 before ISS-004**.
- No file overlap with ISS-003. Both pass through `generation-intent.ts` and `window-search.ts`
  without editing the same lines. That is a low risk, and either order works.

**ATD:** see §6 (ISS-005 addendum) for the architecture atom and the `@spec-link` placement.

**Acceptance:**

- `grep "'Jazz'"` in `src/domain` matches only the musical-profile data tables and labels.
- A capability-override test shows behavior follows the capability, not the name (step 4 above).
- All goldens and seeded outputs are **byte-identical**, and the baseline demonstrably exercises
  a chromatic figure (step 1).
- The worker protocol is unchanged.
- `rule_jazz_chromatic_resolution` and the capability architecture atom describe the code, and
  their `@spec-link` tags are placed directly above the functions that carry them.

---

## 5. Risks

- **Silent golden drift:** mixing ISS-005 and ISS-004 in one change would hide a refactor
  regression behind intended changes. Hence the separate units, in that order.
- **Enharmonic spelling of the written key:** the picker offers pitch classes such as
  `C-sharp/D-flat` with "lowest-accidental, sharps on a tie" spelling. That rule now applies to
  the **written** key, and the concert key is only a pitch class to the generator. Check the
  spelling of written keys whose concert counterpart would spell differently (for example written
  F♯ on tenor is concert E).
- **Range feasibility:** the concert center moves by the transposition, and ranges are concert
  ranges. The generator already handles every concert center, so this should be neutral. The
  seed matrix across profiles × written keys confirms it cheaply.
- **Blocked rhythm settings under a switch:** the new switch rule has three branches (phrase
  shown, no phrase, blocked). Cover all three in unit and end-to-end tests.
- **ux-writer dependency:** implementing ISS-003 or ISS-004 UI before `ui_ux/` is updated would
  make coding-leader invent design. Don't.
- **`atd audit` saturates the local Ollama instance** and causes spurious Vitest timeouts. Never
  run it alongside tests.

---

## 6. ATD atom state after the pre-handoff sync

The documentalist ingested master spec draft v2.0 on 2026-09-26. `atd lint` and `atd check --full`
pass, with 81 atoms and no broken links. `atd audit` was not run.

- **Rewritten to the new behavior, now DRAFT:** most were REVIEW before; the three noted "(already
  DRAFT)" kept that status.
  - `module_notation_display_convention`: now describes written pitch from the instrument
    profile's own transposition, with no selector.
  - `rule_notation_display_preserves_phrase`.
  - `rule_profile_switch_validates_phrase`: now "keep the written key, always regenerate". The id's
    word "validates" is stale; a rename is possible later, with human approval.
  - `user_story_controlled_phrase_generation`.
  - `module_generation_control_catalog`, `module_generative_profile_selection` and
    `module_profile_control_customization`: seven-control bundles.
  - `rule_unsupported_rhythm_settings_block_generation`.
  - `module_phrase_generation_profile_policy`, `rule_seeded_phrase_reproduction` and
    `rule_profile_presets_apply_defined_controls` (already DRAFT).
  - `rule_jazz_chromatic_resolution` (already DRAFT): the capability gate.
  - `entity_instrument_profile` (already DRAFT): gains the transposition field.
- **Amendment note only:** `api_rhythm_domain_expansion` stays REVIEW because it still describes the
  shipped grammar. It notes that Mixed is retired and that a successor grammar version waits on the
  ISS-004 review.
- **Wording only:** `module_register_intent_boundary`,
  `module_register_window_resolution_primitives`, `module_generation_request_construction` and
  `module_notation_layout_preflight`.
- **Contract:** `contract_infinite_flow_first_release` goes from v1.0 to **v1.1**, as the user
  authorized. "notation display transposition never alters those source events or generation
  constraints" becomes "the selected instrument profile's concert-to-written transposition, used
  only by notation and by request construction's written-to-concert tonal-center conversion, never
  alters those source events or generation constraints".
- **`rule_instrument_profile_range`** (STABLE, BUSINESS): the wording was updated on 2026-09-26
  with the user's approval (`atd update --force`), and the atom stays STABLE. The guarantee is
  unchanged. Its LOGIC and EXPECTATION now say "the instrument profile's own concert-to-written
  transposition, used only by notation and by the request's written-to-concert tonal-center
  conversion, never changes the active concert range or the source events".
- **Vision atom:** not touched. It still mentions "notation display-mode selection". This will be
  fixed during the vision rework.

**`@spec-link` tags to revisit during implementation.** The numbers are current implementation
links:

| Atom                                                | Links |
| --------------------------------------------------- | ----- |
| `module_notation_display_convention`                | 37    |
| `module_generation_control_catalog`                 | 20    |
| `module_register_window_resolution_primitives`      | 19    |
| `module_notation_layout_preflight`                  | 16    |
| `rule_unsupported_rhythm_settings_block_generation` | 9     |
| `entity_instrument_profile`                         | 9     |
| `module_generation_request_construction`            | 8     |
| `rule_profile_switch_validates_phrase`              | 6     |
| `module_register_intent_boundary`                   | 6     |
| `rule_instrument_profile_range`                     | 6     |
| `api_rhythm_domain_expansion`                       | 5     |
| `module_generative_profile_selection`               | 3     |
| `module_profile_control_customization`              | 3     |
| `rule_notation_display_preserves_phrase`            | 2     |
| `module_phrase_generation_profile_policy`           | 1     |
| `rule_seeded_phrase_reproduction`                   | 1     |
| `user_story_controlled_phrase_generation`           | 1     |
| `rule_profile_presets_apply_defined_controls`       | 1     |
| `rule_jazz_chromatic_resolution`                    | 1     |

Code now lags these DRAFT atoms by design. The step-7 documentalist pass verifies them and
advances their statuses once the code lands.

---

### ISS-005 addendum (2026-09-26)

- **New ARCHITECTURE atom `module_musical_profile_capabilities`** (DRAFT). It covers capabilities
  as data, gating by capability and never by name, the first-release capability, and output left
  unchanged.
  - Parent: `rule_jazz_chromatic_resolution`.
  - Dependents: `module_phrase_generation_profile_policy` and `module_harmony_candidate_domain`.
  - It deliberately does not fix the implementation shape.
- `rule_jazz_chromatic_resolution` already gates on the capability. `atd weave` added the
  reciprocal link. The neutral diatonic rules were reviewed and left unchanged.
- **`@spec-link` placement during ISS-005.** These tags are additive: keep the existing
  `[[rule_jazz_chromatic_resolution]]` link on `jazzPaths`. Place
  `@spec-link [[module_musical_profile_capabilities]]` directly above:
  - the capability table definition, wherever it lands (§4.3 proposes `profile-selection.ts`);
  - the `PitchPolicy` capability field (`pitch-types.ts`) and its assembly in `makePitchPolicy`
    (`pitch-policy.ts`);
  - the two call sites that now read the capability (`pitch-candidates.ts`, `figure-rules.ts`).

---

## 7. Carried-forward notes (not blocking the gate)

- **D72 (for v2):** MIDI input is read as concert pitch, and there is no input-transposition field
  in v1.0. Nothing to do for the gate.
- **Confirmed by the user on 2026-09-26:**
  - Negative transpositions (instruments written below sounding pitch) are allowed, since the spec
    says "integer". No v1 preset needs one, and a test with a negative value is optional.
  - Switching between two instruments with the same transposition mod 12 still regenerates, as
    D56c reads.
  - Rhythmic variety is preset-controlled, so editing it gives the custom state.
  - First load is written C on tenor, which sounds concert B♭.
