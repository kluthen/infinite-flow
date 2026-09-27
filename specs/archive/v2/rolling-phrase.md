# v2 — Rolling Phrase

> **Archived 2026-09-27.** Consolidated into the v2 master spec. Live summary:
> [versions/v2/master-spec.md §3–§5](../../versions/v2/master-spec.md).

Status: draft v0.1 (2026-09-26)

**Scope of this document.** How phrases follow one another during a session: the generation
unit, what one phrase hands to the next, look-ahead and failure, control changes during a
session, and the behaviour the rolling display has to support. Audio and the clock are in
[audio-and-backing.md](audio-and-backing.md). The session lifecycle is in
[sessions-review-export.md](sessions-review-export.md).

Anything the user has settled is written as fact and cites its decision. Everything else is
tagged `(proposed)`. Question IDs point to the [register](../../open-questions.md). **O77** (the
settings-mutation flag's cadence and default) is still open in this document, narrowed by D103;
its full text is in [§8](#8-open-questions).

## 1. Settled inputs

- The finite phrase becomes a rolling one, and the app keeps generating the next item (D51).
- v2 continues from the app's **own** generated material only. Player-seeded continuation is v3
  (D53, D65).
- The pressure is mild. While a MIDI player is silent the phrase keeps scrolling (D67).
- The instrument template carries its own transposition, and the key is chosen in written pitch
  (D56, D57; ISS-003, v1.0 gate). Rhythmic variety replaces Mixed (D59, D60; ISS-004).
  Profile behaviour comes from capability flags, not from the profile name (D73). This document
  assumes all three have landed.

## 2. What v1 gives us (checked in code, 2026-09-26)

- **The generation unit is exactly four measures by type.**
  - `PHRASE_MEASURE_COUNT = 4`, and `ConcertEventTimeline.measures` is a 4-tuple
    (`src/domain/events/timeline.ts`).
  - `HarmonyEvent.barIndex` is `0|1|2|3` and `startBeat` is `0|2`
    (`src/domain/harmony/harmony-types.ts`).
  - `GenerationRequest` is closed. It holds identity, seed, four measures, 4/4, range, register
    and window, and `parseGenerationRequest` rejects unknown fields
    (`src/domain/generation/generation-request.ts`). The worker protocol applies the same closure
    (`src/generation-worker/generation-worker-protocol.ts`).
- **No planner sees an earlier phrase.**
  - The pitch search starts from `initialPitchSearchState`, which has no `prior` note and an
    initial motion state (`src/domain/pitch/pitch-advance.ts`).
  - Leap, recovery and arpeggio state are threaded through `state.prior` from the second attack
    onward (`pitch-motion.ts`, `pitch-search.ts`).
  - The architecture names the missing input as "a recent phrase when available" and the
    **phrase transformer** seam (`specs/generator-architecture.md`).
- **The first attack is always a chord tone.** `ordinaryCandidates` returns only chord tones for
  `attackIndex === 0` and for the final attack (`src/domain/pitch/pitch-candidates.ts`).
- **Every phrase ends open on a degree-5 endpoint** (`HarmonyEndpoint`), so a following phrase
  that opens on the tonic reads as a resolution across the join.
- **The phrase starts on the downbeat, and measure 0 may not open with a tie.** See the
  validation code `first_note_off_downbeat` (atom `rule_phrase_starts_on_downbeat`), and
  `assertCrossMeasureTieResolvable` in `src/domain/notation/written-phrase.ts`, which rejects a
  tie continuation in measure 0.
- **Varying resolves one register window per phrase**, evaluating every window before choosing
  (`src/domain/generation/orchestration/generation-orchestrator.ts`, `request-resolution.ts`).
- **The session is modal, one phrase at a time.** `GenerationSessionState` holds a single
  `result`, one `latestIntent` and `operation: 'idle' | 'generating' | 'notating'`. Control
  edits are suppressed while an operation runs (`src/composables/use-generation-session.ts`;
  generator contract §Session Ownership).
- **Latency.** Warm end-to-end regeneration in Chromium takes about 70–86 ms. In Node, cold
  generation has p95 316 ms and max 690 ms, and the slowest settings were all Mixed
  (`docs/generation-latency.md`). Mixed is retired by D60, but ISS-004 reworks the rhythm grammar,
  so these numbers must be re-measured afterwards (**O69**).

## 3. The generation unit and the join (settled, D105)

- **The four-bar phrase stays the generation unit.** A session is an ordered sequence of phrases.
  The timeline type is not widened, and every phrase is still a valid v1 result on its own.
  - Reasoning: every v1 guarantee (range contract, exact tiling, seeded reproduction, notation
    rules) stays per phrase. Widening the 4-tuple would ripple through harmony, rhythm, pitch,
    notation and layout.
- **A join** is the boundary between phrase _N_ and phrase _N+1_.
- **Carry-in context** is the read-only data phrase _N+1_ receives about phrase _N_ (settled,
  D105):
  1. the **last sounding concert pitch** of _N_, together with its leap and recovery state at
     the end of _N_;
  2. the **resolved register window** of _N_;
  3. the **final harmony event** of _N_ (triad and role) and its endpoint class;
  4. the **phrase ordinal** within the session.

  Nothing else from _N_ is visible.

- **How carry-in enters generation**:
  - It is a new optional field in the resolved request, `carryIn`. This is a deliberate,
    versioned contract change: `parseGenerationRequest` and the worker parser must accept it.
    The first phrase of a session and every v1 static generation have no `carryIn` and behave
    exactly as today.
  - The pitch search seeds its initial `prior` note and motion state from carry-in item 1, so the
    **interval across the join is judged by the same leapiness, leap-recovery and arpeggio rules
    as an interval inside a phrase**.
  - **A leap across a join carries its recovery obligation into the next phrase (settled, D80,
    resolves O51).** If phrase _N_ ends mid-leap (the recovery step that a large interval owes
    hasn't happened yet by _N_'s last note), phrase _N+1_ inherits that obligation exactly as if
    the leap had happened inside a single phrase — the same rule an interior leap already follows,
    just carried across the boundary.
  - **A tense note at a join may resolve onto the join's last note (settled, D81, resolves O76).**
    v1's "resolve before the last note" rule (a tense scale tone must resolve before the phrase's
    final attack) applies in full only where the music really stops — at Stop or session end. At
    an ordinary join, a tense note left at the end of _N_ may instead resolve onto _N+1_'s first
    note. Resolving forward across the join into the next phrase's own material is not attempted
    in v2.0 — only this one-note carry-over.
  - The harmony planner is unchanged. It still opens on its template's first event. The
    degree-5 open ending of _N_ followed by a tonic opening of _N+1_ gives a natural V→I or
    modal equivalent across the join.
- **Every continuation phrase still starts with a fresh attack on beat 1** (settled, D105). There
  is no tie or rest across a join in v2.0.
  - This keeps `rule_phrase_starts_on_downbeat`, the notation measure-0 rule and the rhythm
    grammar untouched.
  - A tie or pickup across the join is left for v3, where seeds arrive with pickups anyway. The
    ISS-004 feasibility review already records whether the new grammar could accept a
    non-downbeat start (prerequisites §3 item 3).
- **O10 (planner authority) is settled (D83): deferred to v3.** Carry-in only flows forward. No
  stage of _N+1_ revises anything in _N_, which is already displayed and possibly played, matching
  "phrases stay mostly independent; we only smooth the join."
- **Register across joins (settled, D82).** `Varying` resolves once per session, for phrase 1, and
  the window stays fixed until a control change (§5). A fixed register choice (Low, Middle, High)
  behaves as in v1.
- **Harmonic/tension horizon stays phrase-by-phrase in v2.0 (settled, D99, resolves O35).** Each
  phrase's own tension arc (build and release within its own four bars) is unaffected by carry-in;
  v2.0 does not plan a tension shape that spans multiple phrases. A flag that lets tension rise
  and fall across a longer, multi-phrase arc is confirmed as v2.2 scope (the highlights proposal's
  "N3"), not urgent.

## 4. Look-ahead and failure (settled, D94)

- **Look-ahead depth: one phrase.**
  - Phrase _N+1_ is requested as soon as phrase _N_ starts sounding. It must be generated **and
    engraved** before its **deadline**, the start of the last bar of _N_. That leaves one bar for
    the display to show it as read-ahead (§6).
  - At session start, phrase 1 is already the phrase displayed in the workspace before Start was
    pressed (D97); phrase 2 is generated during the count-in, before it ends (see O44).
  - Reasoning: at 240 BPM a phrase lasts 4 s, so the deadline leaves 3 s against a measured
    cold worst case under 0.7 s (Node), which is at least 4× headroom. A deeper queue would
    delay control changes (§5) without buying safety.
- **Failure ladder.** Generation fails explicitly with a typed failure (generator contract).
  During a session, a failure never surfaces as the v1 alert and retry
  (`src/composables/generation-failure-alert.ts`). Instead:
  1. retry silently with a fresh seed and the same carry-in, up to 3 attempts while the
     deadline allows;
  2. then retry once **without** carry-in, as a standalone phrase. The join is not smoothed,
     but the phrase is valid;
  3. if the deadline passes anyway, **repeat phrase _N_** as the next phrase, and mark the repeat
     in the session history;
  4. after 2 consecutive repeats, show a non-blocking notice ("The generator is struggling
     with these settings") without stopping the session.
- **Why not stop the session:** stopping would be a penalty the player didn't cause. Repeating a
  phrase is musically harmless.

## 5. Control changes during a session (settled, D91; see also O77)

- **The settings UI is locked for the whole session** (Idle and Review are the only states where
  controls are editable), not just the instrument selector. The player is playing an instrument
  and cannot reach the keyboard or mouse mid-session, so v2.0 does not need a manual
  mid-session-edit interaction at all. This replaces the earlier "every control stays editable,
  applying at the next boundary" proposal.
  - **What D91's lock does not cover:** transport (Stop) and the audio mix (backing/click
    mute and volume, [audio-and-backing.md §5](audio-and-backing.md)) are not **generation**
    settings — they change nothing about what's generated — and stay reachable during a session,
    same as a physical mixer would. The lock is about settings that would otherwise change the
    next phrase's generation request.
- **What can still change mid-session** comes only from **automatic** sources:
  - the **settings-mutation flag** (**O77**, scope/magnitude settled D103; cadence and default
    still open): an opt-in that lets eligible settings drift slightly every few phrases.
    - **Eligible settings:** everything **except instrument selection and tempo** (tempo has its
      own flag, adaptive tempo — see below). This includes density, syncopation, profile, key or
      collection, register and any other generation-affecting control.
    - **Magnitude:** each mutation shifts an eligible setting by **at most one grade**, in either
      direction, along that setting's own ordered scale. It never jumps more than one step.
    - **Invalid combinations:** if a mutation would land on a setting combination the generator
      does not support (see `rule_unsupported_rhythm_settings_block_generation` below), the flag
      **re-mutates** — rerolls again — until it finds a supported combination. It never applies
      the unsupported one and never silently skips the cycle.
    - **Still open:** the cadence ("every few phrases" — exactly how many, fixed or randomized)
      and whether the flag defaults on or off.
  - the **adaptive-tempo** shift (O67, v2.2), which has its own flag, separate from the
    settings-mutation flag above.

  Both still take effect at a **phrase boundary** exactly as the original proposal described:

  - The change applies to the first phrase that has **not yet started sounding**.
  - If the look-ahead phrase is already generated, it is **discarded and regenerated** with the
    new controls, provided at least one bar remains before its deadline. Otherwise the change
    applies one phrase later.
  - A key or collection change drops the harmony part of carry-in. The pitch part still applies
    and is re-checked against the new range and window.
  - A register change re-resolves `Varying` (D82).
- **The instrument template is still locked** for the whole session regardless (never mutates):
  D56's instrument switch regenerates and keeps the written key, and the user expects instrument
  changes to be rare.
- **When an automatic change lands, it is reflected but never announced:** the settings UI
  updates to stay truthful, but with **no highlight, no scroll, and no screen shift** — the
  player's attention stays on what's coming, not on what just changed.
- **A rhythm setting that v1 blocks** (`rule_unsupported_rhythm_settings_block_generation`, if
  any remain after ISS-004) can never be **landed on** by the mutation flag: per D103, a mutation
  that would land there re-mutates and rerolls again until it finds a supported combination. It
  is never applied, and the cycle is never silently skipped.
- **Tempo** is transport-only (D84; see [audio-and-backing.md](audio-and-backing.md)). An
  automatic tempo shift (adaptive tempo only, since manual edits are locked out) applies at the
  next phrase boundary, so a phrase is never played at two tempos.
- **Reasoning:** "suppress edits while an operation runs", as v1's modal session does, does not
  scale to a session that is generating all the time — but the reason to reach for it was moot
  anyway, since the player's hands aren't free during a session. Locking the UI outright is
  simpler than boundary-gated live editing, and automatic changes still land cleanly at
  boundaries for the same reproducibility reasons.

## 6. Behaviour the rolling display must support (settled, D95)

This section states **behavioural requirements only**. The layout, animation and screen design
belong to `ux-writer`, which takes them from the master spec.

- **Two candidate display modes ship, switchable by a toggle (D95).** The user sees both as
  valid and wants to compare them in practice before committing to one:
  - **Mode A — fixed.** The layout the workspace already uses (four bars on one line, or two
    bars on two lines depending on the screen). While playing, the past fades to disappearing
    and the next phrase sets in place; the eyes keep tracking left-to-right.
  - **Mode B — scrolling.** The whole display moves. Actively played notes stay on a fixed
    second bar; the first bar becomes "the past" as the display rolls forward.
  - Which mode is the toggle's default, and its exact placement/copy, is `ux-writer`'s call.
- **Read-ahead:** at every moment of a session, at least **one bar beyond the current bar** is
  visible and final. Near the end of a phrase, that means the first bar of the next phrase. This
  holds in both modes.
- **Position:** the player can always tell which beat is sounding (the playhead). The playhead
  follows the audio clock, not wall time (see [audio-and-backing.md](audio-and-backing.md)).
- **Stability:** a note that is already visible never changes pitch, rhythm or spelling. This
  follows from the forward-only carry-in and the regenerate-only-before-display rule in §5.
- **Notation continuity:** each phrase keeps its own engraving, including clef, key signature
  and chord symbols, as in v1. There is no cross-phrase beaming or tying (§3).
- **Phones in landscape**, where one phrase already takes two systems of two bars (D46;
  `src/notation/notation-layout-policy.ts`): the read-ahead requirement still holds. One way to
  meet it, in Mode A, is to replace the system that has already been played with the next
  phrase's first two bars (a "half-page turn"). This is a suggestion for ux-writer, not a
  requirement.
- **Reduced motion:** the requirement is "position is always identifiable". Smooth scrolling
  (Mode B) is one option, not the only one — Mode A's fade-and-replace also satisfies it. That
  lets ux-writer honour `prefers-reduced-motion`, potentially by defaulting to Mode A when it is
  set.
- **Outside a session (settled, D97):** the v1 static workspace stays mostly unchanged in kind. A
  Start click uses the phrase already displayed as phrase 1 of the new session — there is no
  separate "generate phrase 1" step. Beyond the core v1 layout, v2 adds volume controls, the
  Start/Stop transport, and a few more generation flags (O77's mutation flag, adaptive tempo). The
  music sheet stays the dominant, most immediately visible element; everything else is secondary.

## 7. Acceptance criteria (proposed; also in [definition-of-done.md](definition-of-done.md))

1. **No gaps.** For every seed × supported-settings combination in the existing matrix, and at
   60, 120 and 240 BPM, every phrase after the first is generated and engraved before its
   deadline (the start of the last bar of the phrase before it).
2. **Joins obey phrase rules.** For every join, the interval between the last pitch of _N_ and
   the first pitch of _N+1_ passes the same leapiness and leap-recovery validation as an interior
   interval (D80).
3. **Register is stable.** With `Varying`, the resolved window does not change within a session
   unless a control changed (D82).
4. **Reproducibility.** Every phrase in a session history, regenerated from its stored intent,
   seed and carry-in with the same generator version, is identical to the phrase that was
   displayed.
5. **Standalone phrases are unchanged.** With no carry-in (the first phrase of a session and the
   v1 static workspace), output is byte-identical to v1.0 for the golden fixtures.
6. **Failure ladder.** With an injected generator that always fails, the session keeps running,
   repeats the previous phrase, and shows the non-blocking notice after 2 repeats. No alert
   dialog appears.
7. **Control changes.** A control changed mid-phrase takes effect on the first phrase that has
   not started sounding. No visible note ever changes.

## 8. Open questions

**Settled here:** O34, O10, O50, O51, O76, O39, O36, O40, O52, O35 (D105, D83, D82, D80, D81, D91,
D94, D95, D97, D99, all above). **O77** is narrowed (D103) but not fully closed.

- **O77 - The settings-mutation flag's cadence and default** (2026-09-27; scope, magnitude and
  the invalid-combination rule settled, D103 — see §5). What's left: the exact **cadence**
  ("every few phrases" — how many, fixed or randomized within a range) and whether the flag
  defaults **on or off**. See D91 for how a landed mutation is reflected in the UI.
