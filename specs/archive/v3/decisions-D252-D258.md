> **Archived 2026-10-16.** Closed range for the v3.0 milestone: v3.0 is released as version
> 3.0.0 (tag `v3.0.0`, e288d98) and deployed. These decisions are the wave-level build
> workflow (D252) and the owner's rulings after the v3.0 wave-1 intent preflight (D253–D258).
> D259 and D260 are on branch `v4-accompaniment-research`; D261–D288 (v3.3) stay in the live
> [decisions log](../../decisions.md).
> Archived IDs keep their meaning and may be cited anywhere; each decision's content is now
> stated as settled fact in a live document, or is history, as the "where it now lives" table in
> [archive/v3/README.md](README.md) records. Relative links were written from `specs/`; their
> paths were repaired on 2026-10-16 so they resolve from this folder.

- **D252 (2026-10-09): build plans run wave by wave; a chunk checks only its own change.** The
  owner's call, for a better quality-to-cost ratio than the per-chunk workflow v1, v2 and the
  first v3 plans used: the last iterations of that workflow cost a lot. He accepts that the
  chunks of one wave may drift a little apart until the wave gate. It applies to the v3.0, v3.1 and
  v3.2 build plans (§3 of each) and to every later version's build plan. (1) **Wave start:**
  `documentalist` runs one intent preflight for the whole wave, with every architecture capture
  the wave needs, before any code; a chunk runs no preflight of its own. (2) **Chunk:** tests
  first, implement, verify, documents. Verify covers only the chunk's change: its Done when, the
  tests it adds or changes, the existing unit tests related to the files it touches, typecheck,
  lint and format, and a debug run. It runs no full suite, sweep, bundle or timing measurement
  unless that check is the chunk's point (a measurement or performance chunk, or that area's own
  chunk). Generator chunks keep the replay-corpus guard at chunk level, because it tests exactly
  what they change. (3) **Wave gate:** `npm run quality`, the sweep when a wave chunk needs it,
  the bundle figure, the measurements chunks defer to it, then one post-task sync over the wave
  (every chunk's revisions and drift checks). (4) **Order:** wave by wave, number order inside a
  wave, replacing the plans' plan-wide "number order", which interleaved waves in time. A chunk
  still blocked when the rest of its wave is done moves to the next wave. (5) **Branches** (the
  owner's choice among three): each chunk merges into a wave branch without owner approval; the
  wave merges into `main` after its gate, when the owner asks, so `main` only receives gated
  waves. v3.0 wave 0 is the switch-over: chunk 0 stays as merged, and chunk 1's branch merges into
  the wave-0 branch with chunk 2.
- **D253 (2026-10-09): my instrument's transposition is entered in semitones; its interval name is
  derived and shown.** The owner's call, after the v3.0 wave-1 intent preflight (build plan, Wave
  records), which found the design's semitone stepper ("{n} lower / Same / {n} higher") at odds
  with master spec §7.1. It reverses §7.1's "chosen by name from a list" (master spec v1.3, from
  the build plan's review) and the atom's "never as a bare number of semitones": the player enters
  a number of octaves and a semitone count with a sign (negative: a written note sounds lower;
  positive: higher). The interval name is derived from that and shown as the result. §7.1's
  spelling rule stays: each semitone count maps to one name by a fixed table (0 unison, 1 minor
  second, 2 major second, 3 minor third, 4 major third, 5 perfect fourth, 6 augmented fourth, the
  tritone always spelled so, 7 perfect fifth, 8 minor sixth, 9 major sixth, 10 minor seventh, 11
  major seventh, plus octaves), and that name fixes the letter-name steps used to spell written
  notes, the key signature and chord symbols. Spec-writer's reading, to confirm (O163): one
  direction for the whole transposition, octaves from 0, semitones from 0 to 11, the octaves
  bounded only by both range ends sounding inside the MIDI note range, as the design's stepper
  already is; a sign on the semitone count alone could not say which way a whole-octave
  transposition goes. Master spec v1.5 (§7.1, §7.2, item 16, §14); build plan chunk 16 takes the
  octaves and signed semitones as `makeMyInstrument`'s input; `ux-writer` adds the derived name to
  the sheet (ux Q76).
- **D254 (2026-10-09): my instrument has a fixed id, `my-instrument`, apart from its display
  name.** The owner's call, same preflight (it asked for the open id's literal). The id is
  kebab-case like the built-ins' (`c-keyboard`), is stored in saved settings, kept sessions and
  replay keys, and is never renamed. The display name is a separate property the player may change
  at any time; changing it changes nothing stored by id. Master spec v1.5 (§7.1, §12, item 16);
  build plan chunks 6, 9 and 16.
- **D255 (2026-10-09): a session-wide record keeps the session's own facts, its session seed
  among them.** The owner's call, same preflight (chunk 23 asked where the session seed is
  recorded). The session seed is the one seed drawn when a phrase 1 becomes one a session could
  start from; every later phrase's seed, every failure-ladder rung's seed and the settings-mutation
  seed derive from it. The session holds it in a session-wide record from Start, and a kept
  session keeps that record with the session's other facts ("and other information" of that
  kind). Which other facts, and in what form, is left to the owner (O164). Master spec v1.5 (§5.2,
  §8, item 8); build plan chunks 9 and 23. Also corrected the same day, no decision needed: chunk
  23's scope and files, from the same preflight (the generator draws from no named random stream,
  it orders candidates by seeded tie keys and only the settings mutation uses indexed streams; the
  tension arc draws nothing, being a pure function of the phrase number; the Idle-side file
  `src/composables/use-generation-session.ts` added), and chunk 16's stale "flagged to
  `spec-writer`" wording.
- **D256 (2026-10-09): the owner confirms the Part D revision of `rule_ephemeral_session_state`.**
  Its "never stored" clause gets the one-directory wording: storage code only in `src/storage/`
  (`docs/release/v3.0-intent-change-set.md` part D; build plan chunk 3, whose preflight row asked
  for this confirmation at the wave gate). `documentalist` applies it in the wave-1 post-task sync;
  the atom's full revision stays with chunk 7.
- **D257 (2026-10-09): my instrument's transposition has one direction for the whole interval, and
  is entered with one stepper.** Resolves O163. The owner's answer ("ok") accepts spec-writer's
  recommendation, settling what D253 left open. The value is a number of octaves from 0 up, a
  number of semitones from 0 to 11, and one direction (lower, the same or higher) for the whole
  transposition, octaves included: a semitone count of 0 has no sign, so a sign on the semitones
  alone could not say which way a whole-octave transposition goes (an instrument sounding one
  octave lower is 1 octave, 0 semitones, lower). The octaves have no bound of their own; the only
  bound is that both ends of the range sound inside MIDI notes 0 to 127. The player enters it with
  the design's one stepper, which counts semitones across octaves ("14 lower" is 1 octave and 2
  semitones lower, a major ninth lower), not with separate octave and semitone inputs; the
  derived interval name is shown beside the stepper and already carries the octaves. Master spec
  Part A v1.6 (§7.1, §14: the proposed tag and the open point removed); build plan v4 (chunks 16
  and 20, wave 7); `ux-writer` still adds the derived name (ux Q76), but no longer waits on this.
- **D258 (2026-10-09): the session-wide record holds what master spec §5.2 lists, and nothing
  derivable from the session seed.** Resolves O164. The owner adds no other facts to the record
  now ("nothing comes to mind right now"). The record holds what D255 named: the session's own
  facts as §5.2 lists them (start date and time, length, number of phrases, musical profile,
  instrument by its id `my-instrument` or a built-in id, starting and reached tempo, pinned,
  comment, app version) and the session seed. The record stores nothing that can be derived again
  from the session seed: not the later phrases' seeds, the failure-ladder rungs' seeds or the Vary
  settings mutation seed (and the tension arc draws nothing, being a function of the phrase number
  alone). This is about the session-wide record only: each phrase keeps its own seed in its
  reproduction inputs, as §5.2 and §8 already say, so a replay key needs nothing more. Any further
  fact the session's replay turns out to need is settled in build plan chunk 9's architecture
  capture and put to the owner then, as a new question; until the owner answers, nothing is
  added. spec-writer's recommendation to also keep the three "During a session" options as they
  were at Start (Vary settings, Tension across phrases, Rising tempo) is not settled: the owner
  did not take it up. It stays a note for chunk 9 to raise if replay needs it. Master spec Part A v1.6 (§5.2, §14); build plan v4
  (chunk 9, wave 3).
