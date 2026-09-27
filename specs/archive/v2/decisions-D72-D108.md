> **Archived 2026-09-27.** Closed range for the v2 spec-consolidation milestone (v2.0–v2.3
> consolidated into [versions/v2/master-spec.md](../../versions/v2/master-spec.md)). Archived IDs
> keep their meaning and may be cited anywhere; this range's content is now stated as settled fact
> in the live documents — see the "where it now lives" table in
> [archive/v2/README.md](README.md). Relative links in the entries below were written from
> `specs/decisions.md`; their paths were repaired on 2026-09-27 so they resolve from this folder
> (the v2 draft topic documents they cite are archived alongside this file).

## Decision Log (D72–D108)

- **D108 - O24 is settled: the chord-fit check is kept, ships in v2.3 (not v2.1), fires only
  when the player deviates from the written script, and accepts that "blue"/passing chromatic
  notes that don't resolve onto a chord tone get no signal.** Settled 2026-09-27; resolves O24,
  closing the three decision points D106 returned to the owner.
  - **Keep, not discard.** D52's "embellishment welcome as long as it suits the chord" stands
    unchanged.
  - **Release: v2.3, not v2.1.** This splits the earlier "v2.1 = chord-fit + played-note review"
    grouping in two: v2.1 now carries only played-note review/export (S2) and the O77
    settings-mutation flag (D107); chord-fit acknowledgement (S1) is its own v2.3.
  - **Trigger: off-script only.** A measure that fits gets the chord-fit acknowledgement **only
    when the player's notes in that measure differ from the written phrase** — i.e. they
    embellished or improvised rather than playing it exactly. A measure played exactly as
    written gets only the per-note highlight (D92), never both signals on the same bar.
  - **Accepted trade-off.** "Blue" notes that don't resolve onto a chord tone (e.g. a ♭3 or ♭5
    over a major chord) and bebop-style chromatic passing tones that land on a scale note rather
    than a chord tone get no acknowledgement under this rule. This is intended, not a bug.
  - The rest of D106's recommended definition (per-measure, pitch-class, sixteenth-grid rounding,
    resolves within two notes possibly across the barline) stands as written. See
    [midi-and-acknowledgement.md §6](midi-and-acknowledgement.md) and
    [definition-of-done.md §1](definition-of-done.md).

- **D107 - The settings-mutation flag (O77) ships in v2.1.** Settled 2026-09-27; confirms the
  proposed default. v2.1 now carries O77 and played-note review/export (S2); chord-fit
  acknowledgement moves to v2.3 (D108). See
  [definition-of-done.md §1](definition-of-done.md).

- **D106 - O24's dedicated research pass (D98) is complete; three decision points return to the
  owner rather than being settled by the research itself.** Settled 2026-09-27 (as "research
  delivered", not as an O24 resolution). `principal-advisor` grounded a recommendation in the
  actual generator code: harmony never leaves the phrase's own scale, and every chromatic note
  the generator itself ever writes is an approach/enclosure one semitone from a chord tone (which
  may legally resolve across a barline). Recommendation: **keep** the chord-fit check (discarding
  it would quietly reverse part of D52's "embellishment welcome as long as notes suit the chord"),
  judged **per measure, by pitch class**, fitting when at least one played note is a chord tone
  and every other note is in-scale or a chromatic note that resolves onto a chord tone within the
  next two played notes (possibly in the next measure); a note's measure is decided by rounding
  its onset to the nearest sixteenth, not a fixed millisecond grace. Three points are **explicitly
  left to the owner**, not decided here: (1) keep vs. discard the check entirely; (2) accepting
  that "blue"/passing chromatic notes that don't resolve onto a chord tone get no acknowledgement
  under this rule; (3) whether chord-fit should fire on every fitting measure or only when the
  player played something other than the exact script. See
  [midi-and-acknowledgement.md §6](midi-and-acknowledgement.md) and
  [questions-for-user.md §B](questions-for-user.md).

- **D105 - Carry-in is limited to four items, and every join starts with a fresh attack on beat
  1.** Settled 2026-09-27; resolves O34. _(Renumbered 2026-09-27 from a mistaken re-use of D75 —
  D75 already names the 2026-09-26 v1.0 gate closure. No other citation of this entry used the
  old number before the renumbering, so nothing else needs to change.)_ Phrase N+1 receives only:
  the last sounding concert pitch of N with its leap/recovery state, N's resolved register
  window, N's final harmony event (triad and endpoint class), and the phrase ordinal. No tie or
  rest crosses a join in v2.0; every continuation phrase starts with a fresh attack on beat 1.
  This keeps `rule_phrase_starts_on_downbeat`, the measure-0 notation rule and the rhythm grammar
  untouched. A tie/pickup across a join is left for v3, where seeded pickups arrive anyway. See
  [rolling-phrase.md §3](rolling-phrase.md).

- **D104 - v2.0 is the full core loop, MIDI included.** Settled 2026-09-27; resolves O75.
  _(Renumbered 2026-09-27 from a mistaken re-use of D74 — D74 already names the 2026-09-26
  ISS-004 feasibility adoption. No other citation of this entry used the old number before the
  renumbering, so nothing else needs to change.)_ v2.0 ships rolling phrase with carry-in,
  backing/click/count-in, sessions, MIDI expected-note acknowledgement and the controller check,
  last-session review with favorites, and MusicXML/MIDI export of generated material. Chord-fit
  acknowledgement and played notes in the review/export move to v2.1; adaptive tempo and the
  multi-phrase arc move to v2.2. This confirms the proposed cut line already reflected in
  [definition-of-done.md §1](definition-of-done.md#1-cut-line-d104) and keeps every
  MIDI question (O41, O54, O55, O60, O61, O70, O71, etc.) in the must-answer-before-consolidation
  group.

- **D103 - The settings-mutation flag (O77): scope, magnitude and the invalid-combination rule.**
  Settled 2026-09-27. Eligible settings are **all settings except instrument selection and tempo**
  (tempo has its own flag, adaptive tempo, D101/D102). Each mutation shifts an eligible setting by
  **at most one grade** in either direction along its own ordered scale (never more than one step,
  never several settings at once beyond what "at most a grade" allows). If a mutation would land
  on a setting combination the generator does not support, the flag **re-mutates** — rerolls again
  — until it finds a supported combination, rather than applying the invalid one or skipping the
  cycle. This narrows O77 considerably but does not close it: the exact **cadence** ("every few
  phrases" — how many, and whether it is fixed or randomized within a range) and the flag's
  **default on/off state** are still open. See
  [rolling-phrase.md §5](rolling-phrase.md).

- **D102 - Adaptive tempo resets to the starting tempo on Stop or the next Start.** Settled
  2026-09-27; resolves O74. The review still shows the tempo actually reached during the
  session; only the transport control resets. See
  [adaptive-tempo.md §3](adaptive-tempo.md).

- **D101 - Adaptive tempo (v2.2) raises tempo by a flat +5 BPM every 2 phrases.** Settled
  2026-09-27; replaces the proposed "80% of expected notes matched adds 2 BPM" rule for O67. This
  is a simpler, unconditional schedule rather than a performance-linked one; a more elaborate,
  performance-sensitive version is left for v3+. The ceiling stays 240 BPM and tempo never drops
  automatically. See [adaptive-tempo.md §3](adaptive-tempo.md).

- **D100 - Latency calibration stays tuned constants for v2; a player-facing calibration step is
  v3, not a v2.1 candidate.** Settled 2026-09-27; resolves O56, narrowing the proposed default
  (which left the calibration step as a possible v2.1 add-on). See
  [midi-and-acknowledgement.md §9](midi-and-acknowledgement.md).

- **D99 - Harmonic/tension horizon stays phrase-by-phrase in v2.0; a flag allowing a
  multi-phrase rise-and-fall arc is confirmed as v2.2, not urgent scope.** Settled 2026-09-27;
  resolves O35, confirming the proposed default and its v2.2 placement (the "N3" idea from the
  highlights proposal). See [rolling-phrase.md §8](rolling-phrase.md).

- **D98 - O24 needs a dedicated research pass; the user is not confident enough in music
  theory to settle it directly, and discarding the chord-fit check altogether is a live
  alternative.** Settled (as "not yet answerable directly") 2026-09-27; O24 stays open, but the
  register now also carries "discard the check entirely" as a candidate resolution, alongside
  the existing proposed default. Needs `web-researcher` or `principal-advisor` input, or a
  listening-test session, before it can be settled. See
  [midi-and-acknowledgement.md §6](midi-and-acknowledgement.md).

- **D97 - The v1 workspace stays outside sessions, largely unchanged in kind, with a short list
  of additions.** Settled 2026-09-27; resolves O52. Confirms the proposed default: Start uses
  the displayed phrase as phrase 1. Adds, without changing the core layout: volume controls,
  the Start/Stop transport, and a few more generation flags (O77, adaptive tempo, etc). The
  music sheet stays the dominant, most immediately visible element; everything else is
  secondary. See [rolling-phrase.md §8](rolling-phrase.md).

- **D96 - Event identity uses the proposed default (phrase ordinal + measure + event index, plus
  a played-note sequence number), confirmed without further discussion.** Settled 2026-09-27;
  resolves O43. If it needs correcting, that will surface once a release candidate exists. See
  [midi-and-acknowledgement.md §7](midi-and-acknowledgement.md).

- **D95 - The rolling display ships two candidate behaviours, selectable by a toggle, rather
  than picking one now.** Settled 2026-09-27; resolves O40. Mode A ("fixed", the current v1-style
  layout): the past fades to disappearing and the next phrase sets in place, eyes track
  left-to-right. Mode B ("scrolling"): the whole display moves, with actively played notes kept
  on a fixed second bar and the first bar becoming "the past". Both are considered valid; the
  toggle lets the app be tried both ways before settling on one. The concrete layout, animation
  and toggle placement are `ux-writer`'s decision — this only settles that both must exist and be
  switchable in v2.0. See [rolling-phrase.md §6](rolling-phrase.md).

- **D94 - Look-ahead and failure ladder use the proposed default as written.** Settled
  2026-09-27; resolves O36 (one phrase of look-ahead; on failure, 3 silent retries, then 1
  retry without carry-in, then repeat the previous phrase, with a non-blocking notice after 2
  consecutive repeats; never an alert). See [rolling-phrase.md §4](rolling-phrase.md).

- **D93 - The review always shows the generated notes; played notes (and their matches) are
  optional, shown on a toggle.** Settled 2026-09-27; resolves O64. The generated line was already
  always shown; this confirms played notes stay behind an opt-in toggle, per the original
  proposed default, rather than shown by default. When shown, they may indicate which notes
  matched the script — this is an appreciation of following the script, not a score, so it stays
  positive-only (no wrong/missed colouring). See
  [sessions-review-export.md §5](sessions-review-export.md).

- **D92 - The live view highlights an expected note once it has been successfully matched; it
  never renders the played pitch.** Settled 2026-09-27; resolves O42. On a caught note, the
  expected note's notehead (or a similar minimal marker) lights up in a theme-adapted colour
  (e.g. green), with no other decoration — no sound, no animation, no pitch label. A note that
  isn't matched shows nothing: this preserves the "no mismatch hint" principle (D22/D52), because
  only positive catches are ever marked, never misses. See
  [midi-and-acknowledgement.md §5](midi-and-acknowledgement.md).

- **D91 - Settings UI is locked during a session; only automatic changes apply, reflected
  quietly.** Settled 2026-09-27; modifies the plan for O39. The player is playing an instrument
  and cannot reach the keyboard/mouse mid-session, so manual control edits are not expected
  during a session and the settings UI is aggressively locked while a session runs (Idle/Review
  is when controls are editable). The only changes that occur mid-session come from automatic
  sources: a control's own scheduled shift (the new settings-mutation flag, O77) or the adaptive
  tempo shift (O67, v2.2). When these occur, the change is reflected in the settings UI (so it
  stays truthful) but **without** any visual emphasis: no highlight, no scroll, no screen shift.
  This narrows O39's scope: v2.0 does not need a manual mid-session-edit interaction at all. The
  lock is scoped to **generation** settings only — transport (Stop) and the audio mix (backing
  and click mute/volume) are not generation settings and stay reachable mid-session. See
  [rolling-phrase.md §5](rolling-phrase.md).

- **D90 - v2.0 expects a single MIDI input; if more than one is connected, the player is asked
  to pick one.** Settled 2026-09-27; resolves O61, replacing the proposed "merge all inputs"
  default. Only channels on the chosen input are read (still omni across channels). This is
  simpler to reason about than merged multi-device input, and matches the expected one-player,
  one-controller setup. See [midi-and-acknowledgement.md §3](midi-and-acknowledgement.md).

- **D89 - The page being hidden ends the session immediately (no pause/resume).** Settled
  2026-09-27; resolves O53, replacing the proposed "pause and resume with a count-in" default.
  Switching tabs during a session counts as an immediate Stop; the review opens as it would from
  a manual Stop. See [audio-and-backing.md §3](audio-and-backing.md).

- **D88 - Review and export follow every proposed default, except O64.** Settled 2026-09-27;
  resolves O37 (history stores both the timeline and the reproduction inputs, plus a
  generator-version stamp), O46 (export scope is both whole-session and favorites-only), O62 (a
  favorite marks a whole phrase; bar ranges are v3), O63 (a confirmation is asked only when a new
  session would discard unexported favorites), O65 (played notes are exported in MIDI only, never
  MusicXML), O66 (chord symbols always in MusicXML; backing in MIDI as an off-by-default option)
  and O72 (no cap on session length; the review must stay responsive). **O64 (played notes in the
  review) stays open**: the user's O42 answer ("keep mostly this information for review") may
  push against the proposed "hidden by default" toward "shown by default," pending the O42
  follow-up. See [sessions-review-export.md §§4-8](sessions-review-export.md).

- **D87 - v2 stays Chromium-only.** Settled 2026-09-27; resolves O70. Web MIDI has no iPad/iPhone
  support and Firefox needs a site-permission add-on; this changes nothing from v1's own
  Chromium-only scope. See [midi-and-acknowledgement.md §9](midi-and-acknowledgement.md).

- **D86 - Only note-on counts as MIDI activity.** Settled 2026-09-27; resolves O60. Breath and
  other CC messages are ignored for starting a session, the inactivity timeout and
  acknowledgement, because they are not accurate enough to use as signal. See
  [midi-and-acknowledgement.md §3](midi-and-acknowledgement.md).

- **D85 - The rest of the audio/session defaults hold as proposed.** Settled 2026-09-27; resolves
  O44 (one-bar count-in for both kinds of session start), O45 (backing is a pure renderer from
  harmony, synthesized, no samples), O58 (click on by default), O59 (the inactivity timeout arms
  on the first note played, not on session start) and O73 (trailing silent phrases after a
  timeout stay in the history and export). See
  [audio-and-backing.md](audio-and-backing.md) and
  [sessions-review-export.md §3](sessions-review-export.md).

- **D84 - Tempo shapes only the clock, never the generated material.** Settled 2026-09-27;
  resolves O38. A player choosing sixteenths at 240 BPM is a playability consequence they chose,
  not something v2.0 guards against. See [audio-and-backing.md §7](audio-and-backing.md).

- **D83 - Planner authority is deferred to v3.** Settled 2026-09-27; resolves O10. Carry-in only
  flows forward; no stage of a new phrase revises anything already generated for an earlier one,
  consistent with "phrases stay mostly independent, we only smooth the join." See
  [rolling-phrase.md §3](rolling-phrase.md).

- **D82 - `Varying` resolves its register window once per session.** Settled 2026-09-27; resolves
  O50. See [rolling-phrase.md §3](rolling-phrase.md).

- **D81 - A tense note at a join may resolve onto the join's last note; full resolution is
  required only where the music really stops.** Settled 2026-09-27; resolves O76. Resolving
  across the join into the next phrase is not in v2.0. See
  [rolling-phrase.md §8](rolling-phrase.md).

- **D80 - A leap across a join carries its recovery obligation into the next phrase.** Settled
  2026-09-27; resolves O51. See [rolling-phrase.md §8](rolling-phrase.md).

- **D79 - v2's controller-check offset (D77) stays session-only; v3's "my instrument" inherits
  it.** Settled 2026-09-27. v2.0 keeps no persistence, so the controller check's detected offset
  — octave, semitone, or any other constant delta — is redetected each session and not saved.
  Once v3's "my instrument" configuration exists, the same check's result should populate or
  update that saved template automatically, so the player is not asked to redo the check every
  session once their instrument is on file. This is a forward note on v3 scope, not a v2 change.
  See [v3/README.md](../../versions/v3/README.md).

- **D78 - Acknowledgement matches exact concert pitch, within a 150/200 ms window, ties counted
  once, chords matched on the expected note.** Settled 2026-09-27; resolves O41. Pitch-class-only
  (octave-free) matching was rejected: it would hide a real octave-reading mistake, or an octave
  offset the controller check (D77) didn't catch. The window opens 150 ms before the attack's
  onset and closes at the later of 200 ms after onset or the note's sounding end. A tied note
  acknowledges once, at its attack. On a keyboard chord, the note matching the expected pitch
  counts; extra notes are recorded only, never penalized. The window's exact millisecond values
  are still tuned on real hardware later (O56). See
  [midi-and-acknowledgement.md §5](midi-and-acknowledgement.md).

- **D77 - v2.0 ships the controller check.** Settled 2026-09-27; resolves O55. On connecting (and
  re-runnable any time), the app shows one written note from the selected template's range, asks
  the player to play it, and reports a match, a constant octave offset, or a constant semitone
  offset with a suggested fix. Whether D72's optional input-offset field is also added stays
  contingent on the Travel Sax 2 verification (tracked separately, not a new question ID): it is
  added only if the device cannot be set to match the template. See
  [midi-and-acknowledgement.md §4](midi-and-acknowledgement.md).

- **D76 - One "connect controller" click unlocks audio and MIDI together.** Settled 2026-09-27;
  resolves O54. Before that click, a MIDI note cannot start a session (browsers give no other way
  to unlock audio from a MIDI message — see the HTML Standard's activation-triggering input event
  list, which excludes MIDI). If audio can't start, the session doesn't start and the player is
  asked to click to enable sound. See
  [audio-and-backing.md §4](audio-and-backing.md).

- **D72 - MIDI input is read as concert pitch; no input transposition for now.** Settled 2026-09-26; resolves O33. The user believes the Travel Sax 2 sends concert pitch. From v2, played MIDI note numbers are compared as concert pitch against the concert expected notes. v1.0's instrument template gets **no** input-transposition field. The belief must be verified on the device early in v2. A controller that sends written pitch would get an optional template field then, which D57's open-data template makes easy to add.
- **D73 - Planner behavior is driven by profile capability flags, never by profile name.** Settled 2026-09-26; resolves O32. The user: "it shouldn't have checked for profile name, so a flag why not." Two checks in the pitch planner currently gate chromatic figures on `profile !== 'Jazz'`: `src/domain/pitch/validation/figure-rules.ts:168` and `src/domain/pitch/pitch-candidates.ts:172`. They become a named capability declared by the musical profile (proposed name: chromatic approach and enclosure figures allowed). Generated output must not change. This is v1.0 work, tracked as ISS-005 (filed 2026-09-26) next to ISS-003 and ISS-004, and is the first step toward character presets (endgame).
- **D74 - ISS-004 feasibility review adopted: `Strict` is by nominal value, dominance is nominal attack share of q, and the blocked set is per-variety.** Settled 2026-09-26; adopts the recommended readings for R1 and R2 in `specs/archive/v1/iss004-feasibility-review.md`, resolving the review's two open stops. **R1 (`Strict`):** `Strict` applies to each attack's nominal value (its value before syncopation displacement); rendered values that syncopation displacement produces, plus the rests and ties from silence density and syncopation, are exempt. No new blocked setting follows from this reading. **R2 (dominance):** dominance is measured as the selected density value's nominal share of attacks per phrase, with a floor of 1.0 under `Strict`, 0.75 under `Slightly varied`, and 0.5 under `Heavily varied`; at the `Heavily varied` floor, a 50% tie is allowed only when the tied value is shorter than the selected density. **Rare values:** the review's value sets (§1) are kept as written, including Eighth `Slightly varied`'s rare `[3n,1n]` cell — no simplification. The review's value sets per density × level (§1), the per-variety blocked set (Strict = today's six, Slightly varied = four, Heavily varied = none; §4), rhythmic variety as a hard filter in the tie-break priority's budgets tier (§5), and the latency finding (§6: the whole-catalog budget holds; Sixteenth × `Heavily varied` has a cold p90 of about 950 ms, a reduced worst-case headroom against the 2 s stop condition, noted for implementation) are all adopted. Goldens change for every density, including Quarter `Slightly varied`, because although the candidate set there equals v1, the rhythm identity now includes variety and a bumped grammar version. Master spec updated at lines 44-45, 60, 114, and 149 (`specs/first-release-master-spec.md`, draft v2.1); gate report §4.2 acceptance line corrected to match (`specs/archive/v1/gate-execution-report.md`).
- **D75 - The v1.0 gate is closed; v1.0 is released.** Settled 2026-09-26. ISS-003, ISS-004 (D74)
  and ISS-005 (D73) are all implemented, merged and marked Resolved in `issues/README.md`, so the
  gate ("no open issue in `issues/`") holds. `npm run quality` is green on `main`. The gate's
  working documents (`gate-execution-report.md`, `iss004-feasibility-review.md`) are archived to
  `specs/archive/v1/` verbatim. `v1.0-rc1` = `2418069` is now history; the `v1.0` tag lands on the
  merge commit that closes this bookkeeping, per the user.
