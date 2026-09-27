# Far Vision

Status: draft v0.4

This is the long-term direction of Infinite Flow and the principles every version follows. It will
reshape the vision atom and the product foundation when the vision is consolidated. The
first-release contract describes the current version and may be amended for v1.0.

Scope per version is in [versions/](../versions/README.md), and the order is in the
[roadmap](../roadmap.md). This document owns no open question. The decisions behind it (D47–D71)
are in the [2026-09-25 archive](../archive/2026-09-25-personas-and-vision/decisions-D47-D71.md).

## Where it is going

Infinite Flow starts as a practice partner that proposes phrases to play. v1 generates one finite
four-bar phrase. It grows into an endless, rolling flow the player plays along with (v2). Then it
continues the player's own material (v3). It gains accompanying voices with roles (v4), and a
library of seeds and microphone input (v5+). In the far future it becomes the **music factory
behind a rhythm RPG** in the style of _Final Fantasy Theatrhythm_: phrases to complete, companions
and antagonists as system voices, characters as restrictive musical presets, and fights as
exchanges of short phrases. The user's first preview of it listed team and character management,
skills, items, exploration, battle scenes and character progression. See [endgame](endgame.md).

The people it serves are described in [personas](../personas.md): P1, the Curious
Improviser (primary), P2, the Speed Builder, and P3, the Fledgling Composer.

## Guiding principles

- **Acknowledge and encourage; never penalize.** "Infinite Flow acknowledges and encourages; it
  never penalizes, grades, ranks or scores the player. Anything that adapts to how you play is
  opt-in and visible." This replaces the v1-era "never evaluates" wording. Positive
  acknowledgements (v2) and opt-in adaptive tempo fit within it.
- **What the player plays is private.**
  - Played notes belong to the player. They stay on the player's own system (local storage) or
    leave it only through a file export the player triggers, and are never sent anywhere else.
  - Keeping them across sessions is opt-in and deletable.
  - An export includes them only if the player chooses.
- **Instrument-agnostic, and easy to extend.**
  - No persona is tied to one instrument.
  - Instrument templates are declarative data, including transposition, so adding a preset MUST
    stay easy.
  - Tenor saxophone and Travel Sax 2 remain practical design constraints.
- **The player reads in their own instrument's pitch.** A key choice means that key on _their_
  instrument.
- **Not a professional tool.**
  - Infinite Flow is not a DAW.
  - Material can be reviewed, marked, exported and selected as a seed.
  - Editing, cutting and splicing, arranging and multitrack stay out.
- **"Game player" is an attitude first.** The audience is curious and playful. Game mechanics
  belong to the endgame horizon, not the near-term versions.
