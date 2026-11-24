# v4.0 — Accompaniment with Roles

Status: draft v1 (2026-11-24), consolidated into the [master spec](master-spec.md) v1.0 the same day (D595); the master spec wins where they differ, and the (proposed) tags here were ruled there (D585–D594). What the player hears and controls. How it is built is in
[arranger](arranger.md); the sound is in [sound library](sound-library.md). Settled items are
stated as fact; tentative ones are tagged (proposed). Open questions are cited by their register
ID ([open questions](../../open-questions.md#v40-accompaniment-with-roles-o317)).

Music terms follow the [lexicon](../../../docs/music/lexicon.md). The research behind this draft:
[arranging and roles](../../../docs/music/arranging-and-roles.md),
[accompaniment systems](../../../docs/music/accompaniment-systems.md) and the
[style atlas](../../../docs/music/styles/README.md).

## 1. Concept

- **Scope** (D553): v4.0 is accompaniment with roles and a software sound library, nothing else.
  It is most probably this app's last update (D552).
- **The player plays the lead only** (D580). The lead is the phrase on the staff, the line the
  player reads and plays. Every other line is a **system voice**: the app plays it, always, and the
  player never takes it over.
- **System voices have roles.** The owner's words are highlighting, contrasting and responding
  (D70). The lexicon's [accompaniment role](../../../docs/music/lexicon.md#accompaniment-role)
  groups roles in four families: **foundation** (bass, chords, groove), **highlighting**
  (reinforcing the lead), **contrasting** (a second, independent line) and **responding** (answering
  the lead in its gaps). Today's backing is the foundation family.
- **The lead is the authority.** No system voice changes the phrase, its timing or what is
  acknowledged. Where a voice cannot fit, it rests: a rest is always a legal accompaniment.
- **Guiding principle kept:** nothing compares the player with a system voice, nothing scores.

## 2. Terms (D582)

The spec uses the lexicon's terms: [accompaniment](../../../docs/music/lexicon.md#accompaniment),
[accompaniment role](../../../docs/music/lexicon.md#accompaniment-role) (named by technique:
doubling, counter-melody, fill…), [voice](../../../docs/music/lexicon.md#voice) and
[system voice](../../../docs/music/lexicon.md#system-voice). "Lead" means the player's line. The
owner's "tracks" are system voices, each heard through a **mix channel** (an on/off switch and a
volume); "track" is kept for the MIDI export's tracks.

## 3. Today, as built (D581)

Four sounds besides the player's own, each with an on/off switch in the score toolbar and a
slider in the one `Volume` panel:

| Sound        | What it plays                                                    | Default | Drawn on screen                                       |
| ------------ | ---------------------------------------------------------------- | ------- | ----------------------------------------------------- |
| Backing      | Bass and block chords, at every chord change and downbeat        | On      | Its harmony as chord symbols over the staff           |
| Click        | The beat; the count-in always sounds, at the click's volume      | On      | The count-in's beat marks in the cue row              |
| Melody guide | The phrase's own notes                                           | Off     | Its notes are the lead's, already on the staff        |
| Rhythm guide | The phrase's rhythm on each chord's root                         | Off     | Nothing of its own                                    |

Bass and chords share the one `Backing` switch and slider. No sound can be chosen; no system
voice is drawn as notes. Sources: `src/components/workspace/MixControls.vue`,
`MixVolumePanel.vue`, `src/audio/sound-roles.ts`, `src/audio/audio-mix.ts`;
[play session intent](../../../ui_ux/versions/v3.4/flows/play-session/intent.md#the-audio-mix).

## 4. Roles (proposed; O317)

Each family has several techniques. The table names the candidate for each and what it costs.

| Family       | Technique (candidate)                                             | In one plain line                                                                 | Reads                     | Cost       |
| ------------ | ----------------------------------------------------------------- | --------------------------------------------------------------------------------- | ------------------------- | ---------- |
| Foundation   | Bass and block chords (today's backing)                           | The low notes and chords that set the harmony                                     | Harmony                   | Built      |
| Highlighting | [Parallel thirds and sixths](../../../docs/music/lexicon.md#parallel-thirds-and-sixths), on the lead's long and accented notes | A second instrument plays along with some of your notes, a third or sixth below | Lead, harmony             | Small      |
| Contrasting  | [Counter-melody](../../../docs/music/lexicon.md#counter-melody), slow form: about one note per chord, built on [guide tones](../../../docs/music/lexicon.md#guide-tone) | A second, slower tune that moves when you hold a note and holds when you move | Lead, harmony             | Medium     |
| Responding   | [Fill](../../../docs/music/lexicon.md#fill)                       | A short answer played in the gaps your phrase leaves                              | Lead's rests, harmony     | Medium     |
| Foundation   | Drums: a [groove](../../../docs/music/lexicon.md#groove) (O319)   | Kick, snare and hi-hat keeping the beat                                           | Meter, tempo              | Medium     |

Recommended for v4.0 (proposed): the foundation as today, plus one technique per relation family,
each in the simplest form above. Smaller: foundation plus fills only (the research's smallest
useful step). Larger: add [imitation](../../../docs/music/lexicon.md#imitation) (echo),
[comping](../../../docs/music/lexicon.md#comping) or a
[walking bass](../../../docs/music/lexicon.md#walking-bass).

A full counter-melody (an independent tune with its own rhythm, under the voice-leading rules of
§7) is the hardest role here; the slow form keeps the role's point (contrary motion, its own
register, moving when the lead holds) at a fraction of the work.

## 5. Choosing and combining (proposed; O318)

- **The player turns each system voice on or off and sets its volume,** as the guides today: one
  switch and one slider per voice. The app decides every note.
- **Defaults:** the backing on, as today; every new voice off, as the guides are.
- **Density.** Listeners follow about three simultaneous voices well
  ([arranging §Balance](../../../docs/music/arranging-and-roles.md#balance-and-density)). With every
  voice on, the arranger keeps the texture readable: fills play only in the lead's gaps, the
  doubling only on long or accented notes, and the counter-melody rests while a fill plays. So at
  most two relation voices sound at once beside the lead and the backing.
- **Where the controls go** is `ux-writer`'s: seven switches may not fit the toolbar as four do.
- **Both modes.** The voices play in a plain session and in Jam, from phrase 1's first beat, like
  the guides: never in the count-in, nor in a fresh Jam's capture, writing or read-in measures.
- **Turned on or off mid-session** a voice behaves like a guide: silent at once, or joining at its
  next note. Nothing changes acknowledgement, timing or the generated phrase.

## 6. Display (O320)

Today no system voice is drawn as notes (D581). Whether v4.0 keeps that is open. The options and
what each costs:

| Option                                               | Notation work                                       | Layout                                                        | Design scope                    |
| ---------------------------------------------------- | --------------------------------------------------- | ------------------------------------------------------------- | ------------------------------- |
| A. Heard only; switch and volume per voice (proposed) | None                                                | Toolbar and `Volume` panel grow                               | Small                           |
| B. A small "who is playing" mark per voice, no notes  | None                                                | A row or the switches themselves light                         | Small                           |
| C. Cue notes in the lead's staff                     | VexFlow 5 has no cue size; a spike                  | Fits today's checks; crowds the lead                          | Medium                          |
| D. A second staff for the system voices              | A multi-stave system; spacing across staves         | About twice the height; no fit on a phone; `notation_no_room` more often | Large; a new score design |

Why A (inference, from the research §7.3): the player is sight-reading under time pressure (P1
G2), play-along apps and rhythm games show only the player's part, and the chord symbols already
show the harmony. C serves a call the player must answer, which no proposed role has.

## 7. Rules every system voice keeps (proposed)

From the research's minimum set
([arranging, voice-leading](../../../docs/music/arranging-and-roles.md#a-minimum-rule-set-for-a-rule-based-generator-inference-built-on-the-sources)),
for voices meant to be independent of the lead (doubling is the deliberate exception to 2–4):

1. Never cross the lead: stay above or below its current note.
2. Keep out of its way: never the lead's pitch, nor a step from it, at the same onset.
3. No parallel fifths or octaves with the lead or the bass.
4. Prefer contrary and oblique motion against the lead.
5. Move by step where possible.
6. Respect the lead's tension: no voice sounds the resolution of a non-chord tone the lead holds.
7. Stay in the voice's register lane and inside a playable range.
8. Read the chord as written: a seventh when the Seventh chords level put one there (v3.3),
   the triad otherwise.

**Register lanes** (proposed; set by ear at the listening check): bass below the lead's window as
today; doubling just below the lead; the counter-melody on the side of the lead with more room;
fills near the lead, in its gaps only. Today's chord top, E4 (64), sits inside every built-in
lead window; whether it moves down is a listening question, not a rule change.

## 8. Responding to what (O321)

The owner's D580 has a consequence for "responding": the line a system voice can answer is either
the **generated lead**, known before it sounds, or the **notes the player actually played**. The
player plays the lead, so the generated lead is what they are asked to play; answering it is
deterministic, free of latency and needs no new input. Answering the played notes means reading
them live, answering wrong notes too, and putting played notes into the replay. Proposed: the
generated lead in v4.0; live answers are the game's turn-based exchanges (D551).

## 9. Persona trace (proposed)

- **P1 G1, vocabulary by exposure:** hearing how a line is doubled, countered and answered is
  exposure to arranging ideas, on demand.
- **P1 G2, real-time reading:** served by keeping the screen as it is (§6, A) and every new voice
  off by default.
- **P2 S1, fresh material:** neutral; the voices are off unless asked for.
- **P3 C1 and C2, review and take it out:** the system voices can reach the exports
  ([arranger §5](arranger.md#5-exports)).
