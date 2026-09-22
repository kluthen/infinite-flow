# Melodic Control Interaction: Inspectable Policy and Bounded Tension

## What interaction patterns make generative music controls inspectable and predictable?

### Takeaway
Use a small, stable set of user-facing controls whose scopes do not overlap, classify each as a hard constraint or a preference, and disclose the applied policy at generation time. For this product, a generation is an explicitly requested, complete four-measure phrase, so the interaction can explain the result once per request rather than implying real-time adaptation, playback evaluation, or persistent learning.

### Cited Findings
- Amershi et al. propose 18 human-AI interaction guidelines and report validation through iterative evaluations, including a study with 49 design practitioners evaluating the guidelines against 20 AI-infused products. The guidelines are intended as a practitioner resource across interaction scenarios. — [Microsoft Research: Guidelines for Human-AI Interaction](https://www.microsoft.com/en-us/research/publication/guidelines-for-human-ai-interaction/)
- Google PAIR advises tying explanations to a user's action because an immediate response makes cause and effect easier to identify; it also distinguishes general system explanations from explanations of a specific output. — [People + AI Guidebook: Explainability + Trust](https://pair.withgoogle.com/guidebook-v2/chapters/explainability-trust/)
- PAIR recommends partial explanations that expose the aspects that affect trust or decisions, with progressive disclosure for people who want more detail, rather than attempting to explain every internal calculation. — [People + AI Guidebook: Explainability + Trust](https://pair.withgoogle.com/guidebook-v2/chapters/explainability-trust/)
- PAIR's feedback-and-control guidance says creative vision and hard-to-communicate personal preferences are situations in which people prefer to retain control; it recommends editability and a way to adjust or reset user-specified preferences. — [People + AI Guidebook: Feedback + Control](https://pair.withgoogle.com/guidebook-v2/chapters/feedback-controls/)
- Magenta's Coconet demonstrates an interaction in which user-provided notes are retained while the system fills missing material, and describes repeated infill as a way to explore variations. — [Magenta: Coconet](https://magenta.tensorflow.org/coconet)
- The Music Transformer work identifies music as structured across multiple time scales, including motifs and phrases, and reports coherent continuation/elaboration of a supplied motif. — [Huang et al., Music Transformer](https://arxiv.org/abs/1809.04281)

### Inferences
- Present a fixed "Phrase request" panel with three visually distinct groups, not a single mood panel: **Hard boundaries** (profile, contour, register), **Rhythm/spacing** (note density, silence density, syncopation), and **Motion/colour** (leapiness, arpeggio chaos, tension). The grouping teaches what each control can and cannot affect.
- Give every control an inspectable one-line scope. Example: `Leapiness: probability and size of non-stepwise moves`; `Syncopation: onset placement against the beat`; `Tension: preference among already-valid options, not permission to break boundaries.` This avoids treating multiple controls as unnamed variants of "more active."
- Make values inspectable before generation with a compact policy preview, for example: `4 measures | Profile: lyrical | Contour: arch | Register: C4-A5 | Rhythm: medium density, low silence, off-beat accents | Motion: mostly stepwise | Tension: high within these limits.` The preview is the general explanation; the result notice identifies any policy that was actually limited.
- Keep control changes local to the next explicit Generate request. Do not describe controls as learning, scoring, automatic continuation, playback behaviour, or saved preferences, because those capabilities are outside the product scope.
- Offer a "Why this setting?" disclosure that maps each control to its policy field and shows the precedence order. Do not expose a false numerical confidence score: PAIR warns numeric confidence can be misunderstood and should be shown only when it supports an action.

### Gaps
- The reviewed sources support transparency, user control, and constraint-based musical interaction, but do not establish a universal perceptual scale for terms such as "tension" or "chaos." Validate labels, defaults, and the mapping with target musicians using short phrase-request tasks.
- No source reviewed establishes that users can reliably infer musical output from nine simultaneous sliders without an inspectable preview; this is a product usability question requiring testing.

## How should high-level expressive controls be composed with explicit lower-level controls?

### Takeaway
Treat profile, contour, and register as explicit feasibility constraints; treat density, silence, syncopation, leapiness, and arpeggio chaos as independently targeted feature ranges; and make tension a bounded selector within that feasible set. Tension may change the weighting of alternatives, but must neither widen a hard range nor replace a more specific setting.

### Cited Findings
- The Coconet documentation says its model accepts incomplete scores and fills missing material from context; its interface supports retaining desired material and requesting different infill variations. This is a concrete generative-music example of conditioning on supplied musical constraints instead of discarding them. — [Magenta: Coconet](https://magenta.tensorflow.org/coconet)
- Music Transformer reports that a sequence-to-sequence formulation can generate accompaniments conditioned on melodies, demonstrating that a broad generative model can be conditioned by more specific musical input. — [Huang et al., Music Transformer](https://arxiv.org/abs/1809.04281)
- PAIR says feedback/control mechanisms should align what users expect to influence with what the model can actually use, and warns that a mismatch between an apparent control and the actual tuning effect creates confusion and frustration. — [People + AI Guidebook: Feedback + Control](https://pair.withgoogle.com/guidebook-v2/chapters/feedback-controls/)
- PAIR advises that automation should be balanced with user control and notes that people with a creative vision often want to keep control over the result. — [People + AI Guidebook: Feedback + Control](https://pair.withgoogle.com/guidebook-v2/chapters/feedback-controls/)

### Inferences
- Use this compact policy mapping for each four-measure phrase:

| Control | Policy field | Type and precedence |
| --- | --- | --- |
| Profile | vocabulary/distribution of idioms, cadence shape, and permitted ornament/arpeggio character | Hard style envelope; highest precedence alongside contour and register |
| Contour | permitted phrase-level direction and turning points across measures | Hard shape envelope; candidate phrases outside it are rejected |
| Register | absolute pitch floor/ceiling and preferred centre | Hard pitch envelope; never widened by tension |
| Note density | target count/range of sounding note events per measure | Explicit soft target; independent from pitch motion |
| Silence density | target count/range of rests or unoccupied rhythmic slots | Explicit soft target; budgeted jointly with note density so their targets cannot both demand the same slot |
| Syncopation | target share/strength of off-beat or tied-across-beat attacks | Explicit rhythmic-placement target; does not increase note count by itself |
| Leapiness | target probability and size distribution of melodic intervals | Explicit motion target; register and contour still reject impossible leaps |
| Arpeggio chaos | target irregularity in arpeggiated ordering, direction changes, omissions, and rhythmic variation | Explicit local-pattern target; only active where profile permits arpeggiated material |
| Tension | bounded preference for candidate choices with greater contrast, instability, delayed resolution, accent displacement, or directed motion | Meta-preference only; lowest precedence |

- Build the candidate policy in this order: (1) hard feasibility: four measures plus profile, contour, and register; (2) allocate a rhythm grid that jointly satisfies note-density and silence-density ranges; (3) select onset placement for syncopation; (4) select intervals and arpeggio behaviour for leapiness and chaos; (5) rank only the surviving candidates using tension. This order makes the parameter separation implementable and explainable.
- Define tension as a value from 0 to 1 that interpolates only *within per-control safe envelopes*. At high tension it may prefer: larger intervals only up to the requested leapiness cap and remaining register headroom; syncopated placements only up to the requested syncopation range; less immediate resolution only if the selected profile allows it; and denser local activity only if both density budgets still permit it. It may not add notes, remove rests, reverse contour, exceed register, or invoke an arpeggio pattern disallowed by the profile.
- Use a lexicographic rule rather than hidden weighted averaging: **hard constraints > explicit feature ranges > profile-specific compatibility > tension ranking > deterministic tie-break or seeded variation**. Weighted averaging is unsuitable here because it can silently trade a named setting against a vague one.
- If an explicit control is unavailable under a profile, disable it with its reason rather than accepting input and ignoring it. Example: `Arpeggio chaos is unavailable in Cantabile profile; this profile uses single-line motion.` If product requirements require the control to remain visible, show `No effect in this profile` before Generate.
- Define tension in user language as `How strongly the phrase seeks contrast and unresolved momentum within your other settings.` Avoid labels such as `intensity` or `complexity`, which overlap density, syncopation, leapiness, and chaos.

### Gaps
- The sources do not prescribe feature definitions for "tension," "leapiness," or "arpeggio chaos." The concrete fields above are a design recommendation and need musical-domain calibration, especially for each profile.
- There is no evidence here for a single numeric weight set. A production implementation should choose measurable feature ranges per profile and test whether users can correctly predict changes from one control at a time.

## What transparent feedback or wording is suitable when a hard range, contour, or profile constraint limits a requested setting?

### Takeaway
State the requested setting, the limiting named constraint, what the generator applied instead, and the effect on the current four-measure request. Use neutral language such as "limited" or "kept within," not "fixed," "ignored," or unexplained silent clamping; offer a direct adjustment only when it exists.

### Cited Findings
- PAIR recommends communicating a system's capabilities and limitations early to set expectations, and says explanations should be shown in response to user actions when cause and effect matter. — [People + AI Guidebook: Explainability + Trust](https://pair.withgoogle.com/guidebook-v2/chapters/explainability-trust/)
- PAIR distinguishes explanations of the whole system from explanations of a specific output and recommends partial explanations focused on the information relevant to trust and decisions. — [People + AI Guidebook: Explainability + Trust](https://pair.withgoogle.com/guidebook-v2/chapters/explainability-trust/)
- PAIR advises making the scope and timing of an effect clear; it specifically warns that controls that appear to tune a model but actually filter output can create mismatched expectations. — [People + AI Guidebook: Feedback + Control](https://pair.withgoogle.com/guidebook-v2/chapters/feedback-controls/)
- Coconet describes preserving chosen musical material while generating missing material, which supports wording that identifies preserved constraints rather than framing a constrained result as a generator failure. — [Magenta: Coconet](https://magenta.tensorflow.org/coconet)

### Inferences
- Use this message template after the explicit Generate request: `Requested: {control/value}. Limited by: {constraint/value}. Applied: {actual bounded policy}. Effect: {specific feature affected} in this 4-measure phrase.` Put the reason in the first sentence or two, not behind a generic warning icon.
- Suitable examples:
  - `High tension kept leap sizes mostly stepwise because Leapiness is Low. Tension will use stronger rhythmic contrast and delayed resolution where the profile allows.`
  - `Requested high leapiness is limited by Register C4-A5 and Descending contour. The phrase uses the largest downward intervals that fit both constraints.`
  - `High tension cannot add attacks because Note density is Low and Silence density is High. It changes harmonic/melodic emphasis only within the available events.`
  - `Arpeggio chaos is not used: Lyrical profile permits single-line motion only. Choose an arpeggiated profile to enable this control.`
  - `Requested syncopation is reduced to fit the remaining attack slots after the note and silence budgets were applied.`
- When a user change has no effect, say so before Generate where possible: `Tension has limited room at this combination: low leapiness, low syncopation, low note density, and high silence density.` This makes the interaction predictable without claiming a failure.
- Do not say `tension overridden` when a hard constraint wins. Prefer `Tension is applied after contour, register, profile, and explicit motion/rhythm settings.` The wording communicates intended policy, not an exceptional conflict.
- The explanation should name at most the one or two binding constraints most responsible for the limit. A disclosure such as `View applied policy` can list every active constraint and target range for users who need a full audit.

### Gaps
- The optimal phrasing, number of reasons shown, and whether users prefer pre-generation versus post-generation notices are untested for this product. Test comprehension with users asked to predict the next four-measure request from the policy preview and limitation message.
- No playback, scoring, persistence, direct progression entry, or automated generation is assumed in these recommendations; no wording should imply that any of those capabilities exists.
