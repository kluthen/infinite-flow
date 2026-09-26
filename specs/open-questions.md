# Open Questions

Status: draft v0.6

Only questions that are truly open appear here. IDs are stable. Each question's full text lives in
exactly one place: here, or in the document named. When a question is resolved it leaves this
register and its answer goes to the [decisions log](decisions.md). Resolved questions from earlier
work are recorded in the archived logs:
[D1–D46](archive/v1/decisions-v1.md) and
[D47–D71](archive/2026-09-25-decisions-D47-D71.md).

## Active Questions

- **O10 - Planner authority** _(post-v1; matters for v2/v3 continuation)_: may later planning
  stages revise earlier decisions to repair voice leading or playability? If so, what constraints
  stop the stages from becoming coupled again?
- **O24 - What "fits the chord" means for the v2 measure check** _(v2; also defines adaptive
  tempo's "acceptable level")_: full text in [v2](versions/v2/README.md#open-questions).

### Registered from the v2 proposal and the prerequisites analysis (2026-09-25)

The full text lives in the documents linked here: [v2 proposal §7](versions/v2/highlights-proposal.md#7-questions-registered-in-open-questions) and [prerequisites §5](versions/prerequisites.md#5-questions-registered-in-open-questions). O32 and O33 were resolved on 2026-09-26 (D73, D72).

**v2: generation and flow**

- **O34 - Continuation boundary**: does the next phrase see only a boundary state (last chord, pitch, tie), or more of the previous phrase? May it start with a tie or a rest? Linked to O10.
- **O35 - Harmonic and tension horizon**: plan phrase by phrase, or give the flow a longer, multi-phrase arc?
- **O36 - Look-ahead and failure**: how far ahead to generate; what happens if the next phrase isn't ready or generation fails (silent reseed, repeat the previous phrase).
- **O37 - History storage and generator version**: should history store timelines, or seed + context + generator version?
- **O38 - Tempo as a generation input**: does BPM stay transport-only, or should it shape the material?
- **O39 - Control changes mid-session**: apply them at the next phrase boundary, or only between sessions?

**v2: display, MIDI and review**

- **O40 - Rolling display**: advance a phrase at a time or scroll per measure; show a preview of the next phrase; what to do on landscape phones.
- **O41 - Acknowledgement window**: timing and grace period, octave vs pitch class, ties; what to do when a keyboard player plays a chord (the product assumes a monophonic player).
- **O42 - Played pitch in the live view**: does the live view still never show the played pitch (archived D22)?
- **O43 - Event identity**: what stable ID links a displayed, expected and played note to a review mark?
- **O44 - Count-in**: should there be one? How does it fit "the first MIDI note starts the session"?
- **O45 - Backing implementation**: render it from harmony, or generate it as a voice? Synthesized or sampled sound?
- **O46 - Export scope**: whole session, favorites only, or both?
- Proposed defaults for O10, O24 and O34–O46, and the new O50–O76, are in [v2 spec questions (O50+)](#v2-spec-questions-o50) below.

**Later and governance**

- **O47 - Ornament representation** _(v2/v3 embellishment, endgame)_: is a trill or mordent an expanded event figure, or a notated symbol with playback expansion?
- **O48 - Import normalization** _(v4 file seed)_: for non-4/4 meters, tuplets, pickups and polyphony: reject, normalize, or lift the policy?
- **O49 - ATD atom lifecycle** _(v2 onward)_: amend the first-release atoms in place, or scope them to v1 and add v2 atoms beside them?

## v2 spec questions (O50+)

Raised on 2026-09-26 while drafting the v2 topic documents. The full text, with the proposed
default, lives in the document linked from each entry. Every open v2 question, grouped by when
it needs an answer, is in [v2 questions for the user](versions/v2/questions-for-user.md).

**Rolling phrase** ([rolling-phrase.md](versions/v2/rolling-phrase.md#8-open-questions))

- **O50 - Register window across joins**: with `Varying`, resolve once per session or per phrase?
- **O51 - A leap across a join**: carry the recovery obligation into the next phrase, or restrict its first note?
- **O52 - The v1 static workspace inside v2**: keep it outside sessions, with Start using the displayed phrase?
- **O76 - Resolving tense notes at a join**: keep v1's "resolve before the last note" rule at every join, or only where the music stops?

**Audio and backing** ([audio-and-backing.md](versions/v2/audio-and-backing.md#8-open-questions))

- **O53 - Hidden tab during a session**: pause and resume with a count-in, end, or keep running?
- **O54 - Audio unlock and MIDI-started sessions**: is one "connect controller" click that unlocks audio and MIDI acceptable?
- **O57 - Backing voicing and register** _(listening test)_: bass and chord registers, attack pattern.
- **O58 - Click default**: on, count-in only, or off?
- **O68 - Main-thread engraving vs audio scheduling** _(prototype)_: does engraving ever outlast the scheduler look-ahead?

**MIDI and acknowledgement** ([midi-and-acknowledgement.md](versions/v2/midi-and-acknowledgement.md#9-open-questions))

- **O55 - Controller vs template transposition**: ship a controller check that detects a constant offset?
- **O56 - Latency calibration**: tuned constants per connection type, or a player calibration step?
- **O60 - What counts as input activity**: note-ons only, or breath and other CC too?
- **O61 - Several inputs and channels**: merge all, with a picker only for several devices?
- **O70 - Browser scope for v2**: stay Chromium-only (no Web MIDI on iPad/iPhone)?
- **O71 - Bluetooth MIDI** _(research)_: USB tested, BLE best-effort?

**Sessions, review and export** ([sessions-review-export.md](versions/v2/sessions-review-export.md#8-open-questions))

- **O59 - Arming the inactivity timeout**: from the first note-on, or from session start?
- **O62 - Favorite granularity**: whole phrases in v2, bar ranges in v3?
- **O63 - Discarding the last session**: confirm before losing unexported favorites?
- **O64 - Played notes in the review**: hidden by default, unquantized and neutral?
- **O65 - Played notes in export formats**: MIDI only, or also MusicXML?
- **O66 - What else goes into export**: chord symbols in MusicXML, backing in MIDI as an option?
- **O72 - Long sessions**: no cap, with a responsive review?
- **O73 - Trailing silent phrases**: keep or trim the phrases after the last played note?

**Adaptive tempo** ([adaptive-tempo.md](versions/v2/adaptive-tempo.md#4-open-questions))

- **O67 - The adaptive-tempo rule**: expected-note rate or chord fit (O24); thresholds and step size.
- **O74 - Tempo after an adaptive session**: return to the starting tempo, or keep the reached one?

**Definition of done** ([definition-of-done.md](versions/v2/definition-of-done.md#5-open-questions))

- **O69 - Latency after ISS-004** _(measurement)_: re-measure, including cold runs after mid-session control changes.
- **O75 - The v2.0 cut line**: full core loop, or v2.0 without MIDI?
