# Controllable Melodic-Leapiness Research

> Historical research note. The interval evidence and adopted leap budgets remain relevant. References to a tenor-only concert range `45-58` are superseded by the adopted declarative profiles and whole-phrase windows in [Saxophone Profile Ranges](../saxophone-profile-ranges.md).

## What do music theory, melodic practice, and algorithmic-composition research say about steps, leaps, recovery, and arpeggios?

### Takeaway
Traditional melodic-writing practice treats stepwise motion as the default connective material and treats leaps as directional, structural events that normally resolve by contrary stepwise motion. An algorithm should preserve that rule outside an explicitly recognised chord-tone arpeggiation, then make the end of that arpeggiation pay the recovery obligation.

### Cited Findings
- The counterpoint chapter in Open Music Theory presents rules for melodic writing as part of species-counterpoint practice, including a distinct discussion of motion types and cantus-firmus composition; these are style-specific pedagogical conventions, not universal laws of jazz improvisation. [Open Music Theory: Introduction to Species Counterpoint](https://viva.pressbooks.pub/openmusictheory/chapter/species-counterpoint/)
- Open Music Theory distinguishes passing and neighbour tones, which move by step, from appoggiaturas and escape tones, which involve a leap. This supports treating steps and leaps as different melodic roles rather than merely different distances. [Open Music Theory: Embellishing Tones](https://viva.pressbooks.pub/openmusictheory/chapter/embellishing-tones/)
- The same text treats diatonic sequences as a phrase-middle resource. A repeated, directed chord-tone pattern can therefore be evaluated as one recognisable gesture rather than as unrelated consecutive errors. [Open Music Theory: Diatonic Sequences in Middles](https://viva.pressbooks.pub/openmusictheory/chapter/diatonic-sequences/)
- Pachet and Roy describe a constraint-based method for steering Markov sequence generation. Their result supports applying explicit melodic constraints during generation, rather than hoping a random or learned next-note distribution happens to satisfy a user-selected character. [Pachet and Roy, "Markov Constraints: Steerable Generation of Markov Sequences"](https://doi.org/10.1016/j.jc.2010.07.004)
- Tenor saxophone is a B-flat transposing instrument; Yamaha explains that a written C on tenor produces B-flat concert pitch. The user interface may use concert MIDI internally, but a saxophonist-facing preview should show the corresponding transposed part. [Yamaha: The saxophone is a transposing instrument](https://www.yamaha.com/en/musical_instrument_guide/saxophone/play/play003.html)

### Inferences
- Retain the existing post-large-leap rule as a hard validation constraint: after a **large leap** (defined below), the next sounding note must be an opposite-direction step (1-2 semitones) or a short contrary move (3-4 semitones). Do not let probability override it.
- A recognised arpeggio is an exception to *per-note* recovery, not an exception to recovery altogether. Define it as 2-3 consecutive sounding chord-tone notes connected by 1-2 adjacent same-direction skip/leap intervals under one harmony; two same-direction leaps require the complete three-note run. Apply recovery after the final note and reject a run that would leave the allowed register or cross a contour goal.
- Treat an unrecognised same-direction chain of two leaps as a generation failure, not as an arpeggio by accident. This prevents the familiar "random staircase of thirds" effect.
- Let phrase structure make recovery readable: avoid starting a recovery obligation on the final sounding event of measure 4; give it a place in the current or following beat instead.

### Gaps
- I found no high-quality, saxophone-specific empirical source that sets a universal maximum melodic interval for a short tenor-sax phrase. The recommended limits below are product and notation choices within the deliberately narrow supplied register, not claims about a tenor saxophone's full technical capability.
- Classical counterpoint's leap-compensation conventions do not automatically describe all jazz, pop, or contemporary idioms. The first-release policy should therefore present them as a selectable "melodic character" constraint, not as a claim of stylistic correctness in every genre.

## What bounded interval policy fits the adopted whole-phrase profile windows, and how should it interact with contour, register, and arpeggio chaos?

### Takeaway
Use the selected profile's inclusive active range and resolved Low, Middle, or High whole-phrase window with a small set of interval classes, then vary counts and permitted maxima by level. Make range/window and contour feasibility filters run before leapiness; make arpeggio chaos a lower-priority selector that cannot spend around those constraints.

### Cited Findings
- The obsolete `45-58` prototype range is retained only as historical context. First release adopts keyboard `48-72`, tenor `46-70`, and alto `51-75`, each narrowed by one 13-pitch Low/Middle/High window for the complete phrase. [Current policy](../saxophone-profile-ranges.md)
- Open Music Theory describes a phrase as an organised level of musical structure and distinguishes phrase beginnings, middles, and endings. This supports budgeting leap events over the whole four-measure phrase rather than independently randomising every note. [Open Music Theory: Foundational Concepts for Phrase-Level Forms](https://viva.pressbooks.pub/openmusictheory/chapter/foundational-concepts/)
- Constraint-based sequence generation is an established approach for steering output under user requirements. A bounded interval policy, contour targets, and range are therefore compatible constraints rather than mutually exclusive generation modes. [Pachet and Roy, "Markov Constraints: Steerable Generation of Markov Sequences"](https://doi.org/10.1016/j.jc.2010.07.004)

### Inferences
- Use these **implementation definitions** in semitones, measured between adjacent sounding notes: `step = 1-2`, `skip = 3-4`, `leap = 5-6`, `large leap = 7-12`. Never generate an interval larger than 12, even where the active profile/window could support one; that keeps the control legible and avoids a one-jump traversal of almost all available register.
- Enforce both the selected profile's inclusive active range and resolved whole-phrase register window as non-negotiable candidate and final-result filters.
- **Recommended four-level policy** (counts are maximums per four-measure phrase, not quotas):

  | UI label | Interval policy | Phrase budget | Recovery and arpeggio treatment |
  | --- | --- | --- | --- |
  | **Smooth** | Steps and skips only; maximum 4 semitones. | No leaps. | No recovery debt; arpeggio chaos cannot create a leap. |
  | **Shaped** (default) | Maximum perfect fifth, 7 semitones. | At most 2 leaps, at most 1 large leap. | Every large leap recovers immediately; one 2-note chord-tone skip pair may be recognised as an arpeggio. |
  | **Leaping** | Maximum minor seventh, 10 semitones. | At most 4 leaps, at most 2 large leaps. | Recovery is required after each large leap or after a recognised run of at most 3 chord tones. |
  | **Angular** | Maximum octave, 12 semitones. | At most 6 leaps, at most 3 large leaps. | Same recovery rule; allow at most one 3-note arpeggio run per measure and no more than two runs per phrase. |

- The word **budget** is intentional: a level authorises opportunities for leaps but must not force the generator to use all of them. This makes a contour or cadence that needs stepwise motion remain musical at a high setting.
- Apply controls in this priority order: `register hard limit` -> `required recovery` -> `contour direction / target feasibility` -> `harmonic and scale validity` -> `leapiness level and remaining budget` -> `arpeggio-chaos preference` -> random tie-break. This keeps chaos expressive without allowing it to negate musician-visible controls.
- Have contour reserve enough remaining range to reach its next target before accepting an outward leap. For example, a rising contour may accept an upward fifth only if a subsequent mandated contrary step still leaves a viable upward route; otherwise choose a smaller upward interval or defer the leap.
- Let arpeggio chaos choose *which eligible chord-tone path* wins, not whether an otherwise forbidden leap occurs. At Smooth, it can still vary chord-tone selection via steps/skips; at the other levels it can consume the arpeggio allowance and must then yield to recovery.

### Gaps
- The proposed per-phrase budgets are intentionally deterministic product recommendations. They should be audition-tested with saxophonists and adjusted after observing whether generated phrases sound too mannered or too flat at the phrase's actual note density and tempo.
- The supplied range and duration do not specify harmonic rhythm, note density, style, or contour representation. Those choices affect how often a budget is perceptually noticed, so the policy should be validated against representative presets rather than treated as tempo-independent.

## What vocabulary best communicates the control to a saxophone player?

### Takeaway
Use four concrete character labels, with **Shaped** as the default: **Smooth, Shaped, Leaping, Angular**. Show a short interval example and a one-line behavioural promise instead of raw probabilities; a player can hear and predict these terms without learning the generator's internal threshold.

### Cited Findings
- Open Music Theory uses interval and melodic-motion terminology to distinguish musical behaviour, while its melodic examples are situated in particular styles. That supports a UI that names audible behaviour but avoids implying that one label is a universal quality ranking. [Open Music Theory: Intervals](https://viva.pressbooks.pub/openmusictheory/chapter/intervals/)
- Yamaha notes that tenor parts and concert pitch differ because tenor is a transposing instrument. A saxophonist-facing interface should therefore name intervals musically (for example, "up a fifth") and label pitch displays explicitly as concert or written. [Yamaha: The saxophone is a transposing instrument](https://www.yamaha.com/en/musical_instrument_guide/saxophone/play/play003.html)
- Constraint-based generation research supports expressing controllable high-level requirements separately from the mechanism that fulfils them. A discrete musical-character control is thus preferable to exposing raw weights such as a "leap probability" when the system also has recovery and contour constraints. [Pachet and Roy, "Markov Constraints: Steerable Generation of Markov Sequences"](https://doi.org/10.1016/j.jc.2010.07.004)

### Inferences
- Use this control copy:
  - **Smooth**: "Mostly next-door notes; no big jumps."
  - **Shaped**: "A singable line with an occasional fifth." **Default.**
  - **Leaping**: "More skips and jumps, always settling back."
  - **Angular**: "Bold interval shapes and brief chord-tone runs."
- Prefer **Shaped** to "Medium" or "Normal": it describes a phrase a musician expects to hear, does not imply the other settings are defective, and reflects the intended mix of stepwise continuity plus occasional structural leap.
- In the expanded control state, expose the policy without implementation jargon: `largest jump: fifth`, `up to 2 jumps`, and `big jumps turn back by step`. At higher levels, show `brief arpeggio runs allowed`. Avoid displaying semitone counts as the primary language, but retain them in an accessible detail/tooltip for precision.
- Keep "chaos" separate from this label. Leapiness means interval size and frequency; arpeggio chaos means how freely eligible chord tones are selected. Combining them would make the player's setting unpredictable, especially when contour or the register filter has to veto candidates.

### Gaps
- I found no user study comparing labels such as "Shaped," "Balanced," "Leaping," and "Angular" with saxophonists. Test the wording in a small musician review, particularly whether "Angular" is perceived as desirable in the target styles and whether "Shaped" needs a short explanatory subtitle.
