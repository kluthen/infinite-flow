# Product Foundation

Status: draft v0.1

## Product Intent

Infinite Flow is a browser-based, client-side practice partner for a monophonic musician. It proposes a harmonic context and a playable arpeggio or melodic response. Generated material should create and release tension, remain aligned to the user-selected tempo in the first deliverable, and may bend outside the current chord briefly when that supports a clear arrival in profiles that permit it.

The experience is collaborative rather than evaluative. It does not assign a performance score. The first deliverable provides only a gentle MIDI match or mismatch indication; any later practice feedback must remain descriptive and non-scoring.

## Confirmed Product Constraints

- The deliverable is a web application, with generation and playback primarily on the client.
- The app accepts live performance input and works with a monophonic musical line.
- It presents both a chord proposal and an arpeggio proposal.
- The user controls note density, silence density, and arpeggio chaos.
- Generated tempo normally stays near the detected or selected BPM; controlled variation remains in scope.
- Longer-term adaptation to the player's habits and backing-tone adaptation are deferred.

## Delivery Stages

### First Deliverable

The first deliverable generates a coherent, finite four-measure note proposal. The player adjusts controls for pulse, harmony, rhythm, pitch behavior, note density, silence density, and arpeggio chaos, then explicitly regenerates the complete four-measure set. It is intentionally a finite generator rather than a live listener or an infinite stream.

The required output is the proposed notes. The first deliverable does not need to play back the generated lead line. (proposed) It may generate BPM-aligned backing or accompaniment from the generated harmony when this does not delay the core generator; backing is an optional enhancement rather than a completion condition. MIDI integration is deliberately minimal at this stage: a matching proposed note may highlight, while a non-match receives a gentle mismatch hint without displaying the incoming pitch. It is not yet a timing or pitch evaluator. It does not promise audio-to-note transcription from an acoustic microphone, automatic mode recognition in every musical style, persistent personalization, or an emulation-quality saxophone synthesizer.

The default musical profile is style-neutral. A separate jazz-oriented profile is included early to exercise the generator seams with additional melodic vocabulary; it is not the default identity of the product.

The style-neutral grammar uses a selected key and major, minor, or modal scale. It favors diatonic chord movement; pitches are chord tones with scale passing tones. It creates tension through non-chord scale tones, rhythmic displacement, contour, and silence rather than substitutions, altered dominants, or chromatic enclosures.

The initial jazz profile may add chromatic approaches and enclosures around target tones. Altered dominants and harmonic substitutions are deferred to later profiles or profile revisions.

The first deliverable does not ask the player to choose a chord progression. Instead, the user selects the tonal center and scale or mode, then controls generated harmony with two policies: harmonic motion ranges from static to gentle or active diatonic movement, and tension ranges from settled material through color and passing tones to stronger rhythmic and melodic pull.

Pitch behavior begins with three independent controls: contour (rising, falling, arch, or wandering), register (low, middle, or high), and leapiness (stepwise through wide intervals). This is intentionally a starting vocabulary that can be refined after listening to generated phrases.

The first deliverable uses fixed 4/4 meter and a user-selected, stable BPM. Rhythm policy determines subdivision, syncopation, and silence within that meter. Other meters, deliberate BPM changes, and pulse-feel controls are deferred.

The initial rhythm controls are subdivision (quarters, eighths, sixteenths, or mixed), syncopation (straight through occasional offbeats to active displacement), and silence density (sparse rests through conversational space to breath-heavy phrasing).

Note density is the player-facing name for the subdivision choice. Arpeggio chaos controls how predictably pitches trace active chord tones: low chaos favors nearby chord tones in a stable order; higher chaos permits more reordered chord tones and interval contrast while still honoring the selected profile, register, leapiness, contour, and resolution rules. It never permits arbitrary out-of-profile pitches.

Regenerating preserves the current controls and creates a new phrase variation. Each result retains the random seed used to create it, so the same request can be reproduced internally for testing, inspection, or a later phrase-retention feature.

The initial four-measure phrase is open-ended: its final harmonic arrival remains suitable for continuing to play rather than signaling a final stop. Closed phrase endings may be added later as an explicit option.

The four-measure proposal is displayed in standard staff notation for saxophone. The initial playability policy targets a tenor saxophone using the conservative written range `B3` through `C5`; its corresponding concert-pitch range is MIDI 45 through 58 when MIDI 60 is middle C. In the second deliverable, the same notation model becomes a rolling staff as new measures are generated. The player may switch notation transposition at will between Concert, B-flat, and E-flat. This changes the written display only; generated harmony, concert pitches, and active tenor range retain their original values.

### Second Deliverable

The second deliverable receives one or two measures from a MIDI controller, uses that material to seed generation, and maintains a rolling staff by generating further measures periodically. The player-selected tonal center and scale or mode remain authoritative; the MIDI phrase initially contributes rhythm, contour, and interval character rather than triggering automatic key detection. It introduces MIDI input capture and continuation, but not necessarily long-term personalization. Acoustic-microphone pitch capture is explicitly deferred because reliable browser-side detection would add latency and uncertainty to the core interaction.

Sessions are ephemeral in the first deliverable. A later feature may capture and export a session, including generated material and relevant MIDI events.

## Generator Direction

The generator should be modeled as separable musical decisions, not as one random phrase function:

- **Pulse:** select a stable beat grid and only introduce tempo or rhythmic displacement intentionally.
- **Harmony:** retain an active chord and a planned local tension level; decide when to stay inside, approach, alter, or resolve.
- **Rhythm and space:** allocate playable note events and breath-friendly rests from the density controls.
- **Pitch path:** choose chord tones, scale tones, approach notes, enclosures, and leaps according to a target contour and tension budget.
- **Phrase memory:** preserve enough recent player and generated material to avoid unrelated random output and eventually support adaptation.

This decomposition is a design direction, not an implementation architecture. The default theory rules, chord vocabulary, phrase length, and resolution behavior remain open questions.

## Precursor Review

The precursor correctly emphasizes the musical loop: procedural continuation, controllable space and density, tension/release, MIDI support, and an audio-clock-based visual timeline. Those are valuable source ideas.

It currently treats several optional solutions as requirements. In particular, a continuously scrolling engraved staff, dual written/concert notation, a full internal saxophone model, specific jazz vocabulary tiers, named pitch-class analysis, and fixed audio-latency/drift targets would substantially expand the first release without proving that the generator is helpful. They remain candidates rather than commitments.

Two concepts also need separating before implementation:

- A chord/arpeggio proposal can be a practice target without requiring the app to synthesize a saxophone lead voice.
- MIDI note input and microphone pitch detection have very different reliability, latency, and browser-permission characteristics. The product intentionally starts with MIDI only; microphone pitch detection is a later candidate.

## Risks Worth Resolving Early
